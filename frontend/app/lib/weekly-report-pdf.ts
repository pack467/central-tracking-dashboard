import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage, type RGB } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import {
  reportDurationColumns, REPORT_DURATION_NOTE, REPORT_MONITORING_COLUMNS, REPORT_TICKET_COLUMNS,
  formatDuration, formatReportDate, formatReportDateRange, jakartaDate, monitoringReportRows,
  numericDate, periodError, reportWeek, ticketReportRows, validDate,
  type ReportIdentity, type SignatoryConfig, type WeeklyReport,
} from "./weekly-report";

export type ReportAssetLoader = (path: string) => Promise<ArrayBuffer | Uint8Array>;
const fetchAsset: ReportAssetLoader = async (path) => {
  const response = await fetch(path, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error("Aset laporan tidak dapat dimuat. Silakan coba kembali.");
  return response.arrayBuffer();
};
const BLACK = rgb(0, 0, 0);
const WHITE = rgb(1, 1, 1);
const GREY_TEXT = rgb(0.35, 0.35, 0.35);
const CHART_BORDER = rgb(0.85, 0.85, 0.85);
export const REPORT_TABLE_COLOR = "#145F82"; // Sampled from the reference Word table's OOXML.
/** Ticket and monitoring logs use Word's yellow header shading in the reference document. */
const LOG_HEADER = rgb(1, 1, 0);
function color(hex: string): RGB {
  return /^#[0-9a-f]{6}$/i.test(hex)
    ? rgb(parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255)
    : color(REPORT_TABLE_COLOR);
}

type Alignment = "left" | "center" | "right";
interface TableOptions {
  /** Column widths in points; scaled to `width` when they do not add up. Omit to size columns to their content (Word "autofit"). */
  widths?: number[];
  size?: number;
  x?: number;
  width?: number;
  total?: boolean;
  keepTogether?: boolean;
  align?: Alignment[];
  headerAlign?: Alignment[];
  headerFill?: RGB;
  headerInk?: RGB;
  headerBottom?: boolean;
  padding?: number;
  minRowHeight?: number;
  closedColumn?: number;
  emptyMessage?: string;
  heading?: Heading;
}
interface Heading { number: string; text: string; level: 0 | 1 | 2 }
interface CellLayout { lines: string[]; font: PDFFont; size: number; align: Alignment; color: RGB }
interface RowLayout { cells: CellLayout[]; height: number; lines: number }

/**
 * A4 vector layout that follows the reference Word document ("[2026-39] Laporan Serah Terima Kerja Mingguan"):
 * page margins and the 3-column header from the template's OOXML, Arial 10 pt body with 13.2 pt lines,
 * Calibri-metric (Carlito) tables, teal summary headers, yellow log headers and the red page-number tab.
 */
export async function createWeeklyReportPdf(
  report: WeeklyReport,
  identity: ReportIdentity,
  assetLoader: ReportAssetLoader = fetchAsset,
): Promise<Uint8Array> {
  const invalid = periodError(report.period);
  if (invalid) throw new Error(invalid);
  if (report.clickupTotal === null) console.warn("[Weekly report] combined_ticket_counts (Hutabyte x klien) tidak tersedia atau belum lengkap; nilai yang tidak tersedia ditampilkan sebagai —.");
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const assets = await Promise.all([
    "/reports/hutabyte-logo.png",
    "/reports/fonts/Arial-compatible.ttf",
    "/reports/fonts/Arial-compatible-Bold.ttf",
    "/reports/fonts/Carlito-Regular.ttf",
    "/reports/fonts/Carlito-Bold.ttf",
  ].map(assetLoader));
  // Disable substitutions so fontkit's glyph layout and PDF Unicode maps agree.
  const fontOptions = { features: { liga: false, clig: false, calt: false, rlig: false, kern: false } };
  const [regular, bold, tableRegular, tableBold] = await Promise.all(assets.slice(1).map((bytes) => pdf.embedFont(bytes, fontOptions)));
  const [italic, boldItalic, pageNumberFont] = await Promise.all([
    pdf.embedFont(StandardFonts.HelveticaOblique),
    pdf.embedFont(StandardFonts.HelveticaBoldOblique),
    pdf.embedFont(StandardFonts.TimesRoman),
  ]);
  const logo = await pdf.embedPng(assets[0]);
  const creationDate = jakartaDate();
  function signatory(kind: "prepared" | "approved"): SignatoryConfig {
    const configured = kind === "prepared" ? identity.prepared_by : identity.approved_by;
    if (configured) return { ...configured, date: validDate(configured.date || "") ? configured.date : creationDate };
    return {
      name: kind === "prepared" ? identity.author : identity.approver,
      title: kind === "prepared" ? identity.authorRole || "Jr. Engineer" : identity.approverRole || "IT Services Lead",
      signature_image_path: null,
      date: validDate(identity.date || "") ? identity.date : creationDate,
    };
  }
  const signatories = [signatory("prepared"), signatory("approved")];
  const signatures = await Promise.all(signatories.map(async (person): Promise<PDFImage | null> => {
    if (!person.signature_image_path) return null;
    try { return await pdf.embedPng(await assetLoader(person.signature_image_path)); }
    catch { throw new Error("Gambar tanda tangan " + (person.name || "yang dipilih") + " tidak dapat dibaca. Gunakan PNG yang valid."); }
  }));

  // ── Page geometry (points), taken from the Word template: A4, left 2160 tw, right 992 tw, header table indented -1026 tw.
  const W = 595.44, H = 841.68;
  const HEADER_X = 56.7, HEADER_W = 510.3;
  const RIGHT = W - 49.6; // 545.8: right text margin
  const CONTENT_X = 108.3; // left text margin, where full-width tables start
  const CONTENT_W = RIGHT - CONTENT_X;
  // Numbered headings hang into the margin: number column / text column per outline level.
  const LEVELS = [{ number: 58.5, text: 76.5 }, { number: 85.5, text: 103.5 }, { number: 126, text: 144 }] as const;
  const BODY_SIZE = 10, LINE = 13.2; // Arial 10 pt, Word line height
  const BODY_TOP = 175.7 - BODY_SIZE; // first baseline under the header at 175.7 pt
  const BOTTOM = 795;
  const CAPACITY = BOTTOM - BODY_TOP;
  const TEAL = color(REPORT_TABLE_COLOR);
  let page!: PDFPage;
  let y = BODY_TOP;
  const characterSets = new Map<PDFFont, Set<number>>();

  function clean(text: string, font = regular) {
    let supported = characterSets.get(font);
    if (!supported) { supported = new Set(font.getCharacterSet()); characterSets.set(font, supported); }
    return Array.from(String(text)).map((letter) => /[\r\t]/.test(letter) ? " " : letter === "\n" || supported.has(letter.codePointAt(0)!) ? letter : "?").join("");
  }
  function textWidth(text: string, size: number, font = regular) { return font.widthOfTextAtSize(clean(text, font), size); }
  /** `top` is the top of the em box: the baseline sits at `top + size`. */
  function draw(text: string, x: number, top: number, size = BODY_SIZE, font = regular, ink = BLACK) {
    page.drawText(clean(text, font), { x, y: H - top - size, size, font, color: ink });
  }
  function line(x1: number, top: number, x2: number, thickness = .5, ink = BLACK) {
    page.drawLine({ start: { x: x1, y: H - top }, end: { x: x2, y: H - top }, thickness, color: ink });
  }
  function vline(x: number, top: number, bottom: number, thickness = .5, ink = BLACK) {
    page.drawLine({ start: { x, y: H - top }, end: { x, y: H - bottom }, thickness, color: ink });
  }
  function box(x: number, top: number, width: number, height: number, fill: RGB | undefined = WHITE, border: RGB | undefined = BLACK, thickness = .5) {
    // A 0-width stroke still paints a hairline in PDF viewers, so leave the border out entirely when there is none.
    page.drawRectangle({ x, y: H - top - height, width, height, color: fill, ...(border ? { borderColor: border, borderWidth: thickness } : {}) });
  }
  function wrap(text: string, width: number, size: number, font = regular): string[] {
    const result: string[] = [];
    for (const paragraph of clean(text, font).split("\n")) {
      let current = "";
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        const candidate = current ? current + " " + word : word;
        if (textWidth(candidate, size, font) <= width) { current = candidate; continue; }
        if (current) { result.push(current); current = ""; }
        // Prefer token boundaries in technical identifiers before splitting long tokens.
        const pieces = word.split(/(?<=[/_-])/u).filter(Boolean);
        for (const piece of pieces) {
          if (textWidth(current + piece, size, font) <= width) { current += piece; continue; }
          if (current) { result.push(current); current = ""; }
          for (const character of piece) {
            if (current && textWidth(current + character, size, font) > width) { result.push(current); current = ""; }
            current += character;
          }
        }
      }
      result.push(current);
    }
    return result.length ? result : [""];
  }
  function fit(text: string, width: number, size: number, font = regular) {
    return Math.min(size, size * width / Math.max(1, textWidth(text, size, font)));
  }
  function centered(text: string, x: number, top: number, width: number, size = BODY_SIZE, font = regular, ink = BLACK) {
    const fitted = fit(text, width - 8, size, font);
    draw(text, x + (width - textWidth(text, fitted, font)) / 2, top, fitted, font, ink);
  }
  /** Mixed-font runs centred as one line, e.g. bold "Status Revisi" + regular ": 00". */
  function centeredRuns(runs: { text: string; font: PDFFont }[], x: number, top: number, width: number, size = BODY_SIZE) {
    const total = runs.reduce((sum, run) => sum + textWidth(run.text, size, run.font), 0);
    let left = x + (width - total) / 2;
    for (const run of runs) { draw(run.text, left, top, size, run.font); left += textWidth(run.text, size, run.font); }
  }

  function newPage() {
    page = pdf.addPage([W, H]);
    // Header table: columns 3525 / 4809 / 1872 tw, rows 584 / 802 / ~848 tw; the logo cell spans all rows.
    const top = 43.3, rows = [29.2, 40.1, 42.4], height = rows[0] + rows[1] + rows[2];
    const col1 = 176.25, col2 = 240.45, logoW = HEADER_W - col1 - col2;
    const detailsW = col1 + col2, logoX = HEADER_X + detailsW;
    box(HEADER_X, top, HEADER_W, height, undefined);
    line(HEADER_X, top + rows[0], logoX);
    line(HEADER_X, top + rows[0] + rows[1], logoX);
    vline(logoX, top, top + height);
    vline(HEADER_X + col1, top + rows[0], top + height);
    centered("LAPORAN SERAH TERIMA KERJA HARIAN", HEADER_X, 62.3 - 15, detailsW, 15, bold);
    centeredRuns([{ text: "Status Revisi", font: bold }, { text: ": 00", font: regular }], HEADER_X, 96.4 - 10, col1);
    const client = identity.clientId === "tritronik" ? "PT Tricada Intronik (Tritronik)" : identity.clientName;
    centered("Project IT Maintenance Support", HEADER_X + col1, 89.8 - 10, col2, 10, boldItalic);
    centered("untuk " + client, HEADER_X + col1, 103 - 10, col2, 10, bold);
    const week = reportWeek(report.period.start);
    centeredRuns([{ text: "Tanggal Aktivitas", font: bold }, { text: ":", font: regular }], HEADER_X, 123.7 - 10, col1);
    centered("Week " + String(week.week).padStart(2, "0") + " – " + week.year, HEADER_X, 137.1 - 10, col1);
    centered(formatReportDateRange(report.period.start, report.period.end), HEADER_X, 150.3 - 10, col1);
    centered("Departemen : IT Managed Services", HEADER_X + col1, 137.1 - 10, col2);
    const logoSize = 82;
    page.drawImage(logo, { x: logoX + (logoW - logoSize) / 2, y: H - top - (height + logoSize) / 2, width: logoSize, height: logoSize });
    // Footer: thin rule from the text margin and the red page-number tab at the right margin.
    line(CONTENT_X, 804, RIGHT, .75, rgb(.5, .5, .5));
    box(RIGHT - 43.3, 804, 43.3, 19, color("#943634"), undefined);
    draw(String(pdf.getPageCount()), RIGHT - 43.3 + 5.4, 817.4 - 10, 10, pageNumberFont, WHITE);
    if (report.config.show_footer_period) {
      draw("Week " + week.week + " – " + week.year + " | " + formatReportDateRange(report.period.start, report.period.end), CONTENT_X, 811, 7, regular, GREY_TEXT);
    }
    y = BODY_TOP;
  }
  function ensure(height: number) { if (y + height > BOTTOM && y > BODY_TOP) newPage(); }
  function blank(lines = 1) { y += LINE * lines; }
  function paragraph(text: string, x: number, size = BODY_SIZE, font = regular) {
    for (const value of wrap(text, RIGHT - x, size, font)) { ensure(LINE); draw(value, x, y, size, font); y += LINE; }
  }
  function headingHeight(item: Heading) { return wrap(item.text, RIGHT - LEVELS[item.level].text, BODY_SIZE, bold).length * LINE; }
  /** Numbered heading ("A.", "1.", "a.") with a hanging indent, kept on the page with `following` points of content. */
  function heading(item: Heading, following = LINE) {
    ensure(headingHeight(item) + following);
    const level = LEVELS[item.level];
    draw(item.number, level.number, y, BODY_SIZE, bold);
    paragraph(item.text, level.text, BODY_SIZE, bold);
  }
  function purpose() {
    const parts = [
      { text: "Dokumen ini disusun dalam rangka pemenuhan layanan ", font: regular },
      { text: "IT Maintenance Support", font: italic },
      { text: " 24/7 sesuai kebutuhan yang telah dibahas antara ", font: regular },
      { text: identity.clientName, font: bold }, { text: " dan ", font: regular },
      { text: "Hutabyte", font: bold }, { text: ".", font: regular },
    ];
    const start = LEVELS[0].text;
    let x = start;
    for (const part of parts) {
      for (const word of part.text.split(/(\s+)/).filter(Boolean)) {
        const width = textWidth(word, BODY_SIZE, part.font);
        if (x + width > RIGHT && x > start) { y += LINE; x = start; }
        if (x === start && /^\s+$/.test(word)) continue;
        draw(word, x, y, BODY_SIZE, part.font); x += width;
      }
    }
    y += LINE;
  }

  function table(headers: string[], rows: string[][], options: TableOptions = {}) {
    const x = options.x ?? CONTENT_X, width = options.width ?? RIGHT - x, size = options.size ?? 11;
    const padding = options.padding ?? 5.4, rowLine = size * 1.22, verticalPadding = size < 10 ? 3 : 1.4;
    const minimumRowHeight = Math.max(options.minRowHeight ?? 0, rowLine + verticalPadding * 2);
    let widths: number[];
    if (options.widths) {
      const sum = options.widths.reduce((total, value) => total + value, 0);
      widths = options.widths.map((value) => value * width / sum);
    } else {
      // Autofit: every column but the first gets its widest value; the first takes the rest and wraps.
      const fitted = headers.map((header, column) => column === 0 ? 0 : Math.max(
        textWidth(header, size, tableBold),
        ...rows.map((row) => textWidth(row[column] ?? "", size, tableBold)),
      ) + padding * 2 + 2);
      const rest = width - fitted.reduce((total, value) => total + value, 0);
      widths = rest >= 110 ? [rest, ...fitted.slice(1)] : headers.map((_, column) => column === 0 ? width * .32 : width * .68 / (headers.length - 1));
    }
    function layout(values: string[], isHeader = false, isTotal = false): RowLayout {
      const cells = values.map((value, column): CellLayout => {
        const font = isHeader || isTotal ? tableBold : tableRegular;
        let cellSize = size;
        const cellWidth = widths[column] - padding * 2;
        // Fit ordinary words whole when the column is narrow; identifiers still wrap safely.
        // Only ordinary words (up to 14 letters) shrink the font; longer tokens wrap at the letter like Word does.
        const normalWords = value.split(/\s+/).filter((word) => /^[\p{L}]{1,14}$/u.test(word));
        const widest = Math.max(1, ...normalWords.map((word) => textWidth(word, cellSize, font)));
        // 3 % headroom so a word shrunk to the exact width does not wrap on rounding.
        if (widest > cellWidth * .97) cellSize = Math.max(size * .75, cellSize * cellWidth * .97 / widest);
        return {
          lines: wrap(value, cellWidth, cellSize, font),
          font, size: cellSize,
          align: (isHeader ? options.headerAlign?.[column] : options.align?.[column]) ?? (column === 0 ? "left" : "center"),
          color: isHeader ? options.headerInk ?? WHITE : options.closedColumn === column && /^closed$/i.test(value.trim()) ? color("#18743A") : BLACK,
        };
      });
      const lines = Math.max(1, ...cells.map((cell) => cell.lines.length));
      return { cells, lines, height: Math.max(minimumRowHeight, lines * rowLine + verticalPadding * 2) };
    }
    const head = layout(headers, true);
    const body = rows.map((row, index) => layout(row, false, Boolean(options.total && index === rows.length - 1)));
    const emptyHeight = 22;
    const tableHeight = head.height + (body.length ? body.reduce((sum, row) => sum + row.height, 0) : emptyHeight);
    const titleHeight = options.heading ? headingHeight(options.heading) + 2 : 0;
    const firstHeight = body.length ? Math.min(body[0].height, CAPACITY - head.height - titleHeight) : emptyHeight;
    if (options.keepTogether && titleHeight + tableHeight <= CAPACITY) ensure(titleHeight + tableHeight);
    else ensure(titleHeight + head.height + firstHeight);
    if (options.heading) { heading(options.heading, 0); y += 2; }

    function paint(row: RowLayout, isHeader: boolean, offset = 0, count = row.lines) {
      const height = Math.max(minimumRowHeight, count * rowLine + verticalPadding * 2);
      let left = x;
      row.cells.forEach((cell, column) => {
        box(left, y, widths[column], height, isHeader ? options.headerFill ?? TEAL : WHITE, BLACK, .5);
        const visible = cell.lines.slice(offset, offset + count);
        const blockTop = isHeader && options.headerBottom
          ? y + height - verticalPadding - visible.length * rowLine
          : y + (height - visible.length * rowLine) / 2;
        visible.forEach((value, index) => {
          const measured = textWidth(value, cell.size, cell.font);
          const inset = cell.align === "left" ? padding : cell.align === "right" ? widths[column] - measured - padding : (widths[column] - measured) / 2;
          // Centre the glyphs inside their line: Calibri's cap height sits ~0.22 em below the line top.
          draw(value, left + inset, blockTop + index * rowLine + (rowLine - cell.size) * .55, cell.size, cell.font, cell.color);
        });
        left += widths[column];
      });
      y += height;
    }
    paint(head, true);
    if (!body.length) {
      box(x, y, width, emptyHeight);
      centered(options.emptyMessage || "Tidak ada data pada periode ini.", x, y + 6, width, 9, tableRegular);
      y += emptyHeight;
    }
    for (const row of body) {
      if (row.height <= CAPACITY - head.height) {
        if (y + row.height > BOTTOM) { newPage(); paint(head, true); }
        paint(row, false);
      } else {
        let offset = 0;
        while (offset < row.lines) {
          const available = Math.floor((BOTTOM - y - verticalPadding * 2) / rowLine);
          if (available < 1) { newPage(); paint(head, true); continue; }
          const count = Math.min(available, row.lines - offset);
          paint(row, false, offset, count);
          offset += count;
          if (offset < row.lines) { newPage(); paint(head, true); }
        }
      }
    }
    y += LINE * 2;
  }

  /** Excel-like axis: about eight major units of 1, 2 or 5 × 10ⁿ with headroom above the tallest bar. */
  function chartScale(max: number) {
    const target = Math.max(1, max) / 8;
    const magnitude = 10 ** Math.floor(Math.log10(target));
    const step = Math.max(1, [1, 2, 5, 10].map((factor) => factor * magnitude).find((value) => value >= target) || magnitude * 10);
    const paddedMaximum = Math.max(1, max) + Math.max(1, max * .12);
    const ceiling = Math.max(step, Math.ceil(paddedMaximum / step) * step);
    return { step, ceiling };
  }
  const PROJECT_CHART_HEIGHT = 244;
  function projectChart() {
    const cardX = LEVELS[2].number + 20, cardW = RIGHT - cardX, top = y + 2.3;
    ensure(PROJECT_CHART_HEIGHT + 2.3);
    box(cardX, top, cardW, PROJECT_CHART_HEIGHT, WHITE, CHART_BORDER, .75);
    centered("Total Ticket", cardX, top + 8, cardW, 14, regular, GREY_TEXT);
    const px = cardX + 26, pt = top + 36, pw = cardW - 40, ph = 182;
    const scale = chartScale(Math.max(0, ...report.projects.map((project) => project.total)));
    for (let value = 0; value <= scale.ceiling; value += scale.step) {
      const label = String(value);
      draw(label, px - textWidth(label, 8) - 8, pt + ph * (1 - value / scale.ceiling) - 4.5, 8, regular, GREY_TEXT);
    }
    line(px, pt + ph, px + pw, .5, CHART_BORDER);
    const group = pw / Math.max(1, report.projects.length);
    report.projects.forEach((project, index) => {
      const bw = Math.min(18, group * .45), bh = project.total / scale.ceiling * ph;
      const bx = px + index * group + (group - bw) / 2;
      if (bh) page.drawRectangle({ x: bx, y: H - pt - ph, width: bw, height: bh, color: TEAL });
      centered(String(project.total), bx - 10, pt + ph - bh - 14, bw + 20, 9, regular, GREY_TEXT);
      wrap(project.project, group - 4, 8).forEach((value, i) => centered(value, px + index * group, pt + ph + 6 + i * 10, group, 8, regular, GREY_TEXT));
    });
    if (!report.total) centered("Tidak ada tiket pada periode ini", px, pt + ph / 2, pw, 10);
    y = top + PROJECT_CHART_HEIGHT;
  }
  function dailyLayout(days: string[]) {
    const activeProjects = report.projects.filter((p) => p.total > 0);
    const projects = activeProjects.length > 0 ? activeProjects : report.projects;
    const cardX = CONTENT_X, cardW = CONTENT_W;
    const labelWidth = 50, dateRowHeight = 12, rowHeight = 11, plotHeight = 150;
    const legendLineH = 11;
    const legendItems = projects.map((p) => ({ project: p.project, width: 8 + textWidth(p.project, 6.5) + 10 }));
    const totalLegendW = legendItems.reduce((sum, item, idx) => sum + item.width - (idx === legendItems.length - 1 ? 10 : 0), 0);
    const legendLinesCount = totalLegendW <= cardW - 16 ? 1 : Math.ceil(totalLegendW / (cardW - 16));
    const cardHeight = 12 + plotHeight + dateRowHeight + projects.length * rowHeight + 8 + legendLinesCount * legendLineH + 6;
    return { cardX, cardW, labelWidth, dateRowHeight, rowHeight, plotHeight, legendLineH, cardHeight, height: cardHeight + 4, days, projects };
  }
  function dailyChart(days: string[], offset: number) {
    const layout = dailyLayout(days);
    const { cardX, cardW, labelWidth, dateRowHeight, rowHeight, plotHeight, legendLineH, cardHeight, projects } = layout;
    ensure(layout.height);
    const top = y + 4;
    const px = cardX + labelWidth, pw = cardW - labelWidth - 8;
    const pt = top + 12, ph = plotHeight;
    const baselineY = pt + ph;
    box(cardX, top, cardW, cardHeight, WHITE, CHART_BORDER, .75);

    const maxVal = Math.max(0, ...projects.flatMap((project) => days.map((_, index) => project.days[offset + index] || 0)));
    const scale = chartScale(maxVal);

    const colW = pw / days.length;
    const clusterW = colW * 0.76;
    const clusterPad = (colW - clusterW) / 2;
    const slotW = clusterW / Math.max(1, projects.length);
    const barW = Math.max(2.5, slotW * 0.8);
    const barPad = (slotW - barW) / 2;
    days.forEach((_, index) => {
      const dayX = px + index * colW;
      projects.forEach((project, pIndex) => {
        const value = project.days[offset + index] || 0;
        if (!value) return;
        page.drawRectangle({
          x: dayX + clusterPad + pIndex * slotW + barPad,
          y: H - baselineY,
          width: barW,
          height: (value / scale.ceiling) * ph,
          color: color(report.config.project_colors[project.project] || REPORT_TABLE_COLOR),
        });
      });
    });
    if (!report.total) centered("Tidak ada tiket pada periode ini", px, pt + ph / 2, pw, 9.5);

    // Excel-style data table attached under the plot.
    const tableTop = baselineY;
    box(cardX, tableTop, labelWidth, dateRowHeight, WHITE, CHART_BORDER, .4);
    days.forEach((day, index) => {
      const dx = px + index * colW;
      box(dx, tableTop, colW, dateRowHeight, WHITE, CHART_BORDER, .4);
      centered(numericDate(day), dx, tableTop + 3, colW, 6.5, regular, GREY_TEXT);
    });
    projects.forEach((project, pIndex) => {
      const ry = tableTop + dateRowHeight + pIndex * rowHeight;
      box(cardX, ry, labelWidth, rowHeight, WHITE, CHART_BORDER, .4);
      const pColor = color(report.config.project_colors[project.project] || REPORT_TABLE_COLOR);
      page.drawRectangle({ x: cardX + 3, y: H - ry - (rowHeight + 4) / 2, width: 4, height: 4, color: pColor });
      draw(project.project, cardX + 9, ry + 2.5, fit(project.project, labelWidth - 11, 6.5), regular, GREY_TEXT);
      days.forEach((_, index) => {
        const dx = px + index * colW;
        box(dx, ry, colW, rowHeight, WHITE, CHART_BORDER, .4);
        const value = project.days[offset + index] || 0;
        if (value) centered(String(value), dx, ry + 2.5, colW, 6.5, regular, GREY_TEXT);
      });
    });

    // Axis labels after the data table so "0" is not painted over by the date row.
    for (let value = 0; value <= scale.ceiling; value += scale.step) {
      const label = String(value);
      draw(label, px - textWidth(label, 6.5) - 6, pt + ph * (1 - value / scale.ceiling) - (value ? 3.5 : 6), 6.5, regular, GREY_TEXT);
    }

    const legendY = tableTop + dateRowHeight + projects.length * rowHeight + 8;
    const legendItems = projects.map((p) => ({
      project: p.project,
      width: 8 + textWidth(p.project, 6.5) + 10,
      color: color(report.config.project_colors[p.project] || REPORT_TABLE_COLOR),
    }));
    const legendLines: (typeof legendItems)[] = [];
    let currentLine: typeof legendItems = [];
    let currentW = 0;
    for (const item of legendItems) {
      if (currentLine.length > 0 && currentW + item.width > cardW - 16) { legendLines.push(currentLine); currentLine = []; currentW = 0; }
      currentLine.push(item);
      currentW += item.width;
    }
    if (currentLine.length > 0) legendLines.push(currentLine);
    legendLines.forEach((lineItems, lineIdx) => {
      const lineW = lineItems.reduce((sum, item, idx) => sum + item.width - (idx === lineItems.length - 1 ? 10 : 0), 0);
      let lx = cardX + (cardW - lineW) / 2;
      const ly = legendY + lineIdx * legendLineH;
      lineItems.forEach((item) => {
        page.drawRectangle({ x: lx, y: H - ly - 5, width: 4, height: 4, color: item.color });
        draw(item.project, lx + 7, ly - .5, 6.5, regular, GREY_TEXT);
        lx += item.width;
      });
    });
    y = top + cardHeight;
  }
  function approval() {
    const x0 = HEADER_X, totalW = RIGHT - HEADER_X, columnWidth = totalW / 2, inset = 5.8;
    const nameLines = signatories.map((person) => wrap(person.name || "—", columnWidth - inset * 2, 10));
    const titleLines = signatories.map((person) => wrap(person.title, columnWidth - inset * 2, 10));
    const namesHeight = Math.max(...nameLines.map((rows) => rows.length)) * LINE;
    const titlesHeight = Math.max(...titleLines.map((rows) => rows.length)) * LINE;
    const headerHeight = 25.8, signatureHeight = 25 * 72 / 25.4;
    const height = headerHeight + 6 + namesHeight + 4 + signatureHeight + 6 + titlesHeight + LINE + 10 + 10;
    ensure(height + 4);
    const top = y;
    for (let index = 0; index < 2; index++) {
      const x = x0 + columnWidth * index;
      box(x, top, columnWidth, height, WHITE);
      box(x, top, columnWidth, headerHeight, rgb(.949, .949, .949));
      centered(index === 0 ? "DISUSUN OLEH" : "DISETUJUI OLEH", x, top + 5, columnWidth, 10, bold);
      nameLines[index].forEach((value, lineIndex) => draw(value, x + inset, top + headerHeight + 6 + lineIndex * LINE, 10));
      const signatureTop = top + headerHeight + 6 + namesHeight + 4;
      const image = signatures[index];
      const availableWidth = (columnWidth - inset * 2) * .6;
      if (image) {
        const scale = Math.min(availableWidth / image.width, signatureHeight / image.height);
        const iw = image.width * scale, ih = image.height * scale;
        page.drawImage(image, { x: x + inset, y: H - signatureTop - (signatureHeight + ih) / 2, width: iw, height: ih });
      } else line(x + inset, signatureTop + signatureHeight, x + inset + availableWidth, .45);
      const titleTop = signatureTop + signatureHeight + 6;
      titleLines[index].forEach((value, lineIndex) => draw(value, x + inset, titleTop + lineIndex * LINE, 10));
      draw(formatReportDate(signatories[index].date || creationDate), x + inset, titleTop + titlesHeight + LINE, 10);
    }
    y += height;
  }

  newPage();
  heading({ number: "A.", text: "TUJUAN", level: 0 }, LINE * 2);
  purpose();
  blank();
  heading({ number: "B.", text: "RUANG LINGKUP PEKERJAAN", level: 0 }, LINE * 2);
  paragraph("Pemberian layanan IT Maintenance Support untuk " + (report.scope.length === 8 ? "8 (delapan)" : report.scope.length) + " aplikasi dari proyek yang meliputi:", LEVELS[0].text);
  report.scope.forEach((name, index) => {
    ensure(LINE);
    draw(String(index + 1) + ".", LEVELS[1].number, y);
    paragraph(name, LEVELS[1].text);
  });
  blank();
  heading({ number: "C.", text: "RINGKASAN AKTIVITAS", level: 0 }, LINE * 6 + PROJECT_CHART_HEIGHT);
  blank();
  heading({ number: "1.", text: "Overview", level: 1 }, LINE * 4 + PROJECT_CHART_HEIGHT);
  blank();
  heading({ number: "a.", text: "Tiket minggu ini berdasarkan project", level: 2 }, LINE + PROJECT_CHART_HEIGHT);
  paragraph("Total tiket minggu ini : " + report.total, LEVELS[2].text);
  projectChart();
  blank(2);
  const dailyHeight = dailyLayout(report.days.slice(0, 7)).height;
  heading({ number: "b.", text: "Tiket minggu ini hari per hari berdasarkan project", level: 2 }, dailyHeight);
  for (let offset = 0; offset < report.days.length; offset += 7) dailyChart(report.days.slice(offset, offset + 7), offset);
  blank(2);
  const durationRows = [
    ...report.projects.map((project) => [project.project, formatDuration(project.averageMinutes), project.slaPercent === null ? "—" : project.slaPercent + "%", String(project.total), project.clickupCount === null ? "—" : String(project.clickupCount)]),
    ["Grand Total", formatDuration(report.averageMinutes), report.slaPercent === null ? "—" : report.slaPercent + "%", String(report.total), report.clickupTotal === null ? "—" : String(report.clickupTotal)],
  ];
  table(reportDurationColumns(identity.clientName), durationRows, {
    x: 72.5, width: 460.8, widths: [90, 93.3, 79.2, 77.5, 120.8], total: true, keepTogether: true,
    heading: { number: "c.", text: "Rata-rata durasi pemerosesan tiket berdasarkan project", level: 2 },
  });
  if (report.config.show_footnotes) { y -= LINE; paragraph(REPORT_DURATION_NOTE, LEVELS[2].text, 8); blank(); }
  const matrixProjects = report.projects.map((project, index) => ({ ...project, index })).filter((project) => project.total > 0);
  table(
    ["Severity - Category", ...matrixProjects.map((project) => project.project), "Grand Total"],
    [...report.categories.map((category) => [category.category, ...matrixProjects.map((project) => category.counts[project.index] ? String(category.counts[project.index]) : ""), String(category.total)]),
      ["Grand Total", ...matrixProjects.map((project) => String(project.total)), String(report.total)]],
    {
      x: 72.5, width: 465, total: true, keepTogether: true,
      align: ["left", ...matrixProjects.map((): Alignment => "right"), "right"],
      headerAlign: ["left", ...matrixProjects.map((): Alignment => "center"), "center"],
      heading: { number: "d.", text: "Tiket minggu ini berdasarkan kategori di setiap project", level: 2 },
    },
  );
  table(["Project", "Count of Agent"],
    [...report.monitoringCounts.map((row) => [row.project, String(row.count)]), ["Grand Total", String(report.monitoring.length)]],
    {
      x: CONTENT_X, width: 300, widths: [198.6, 101.4], total: true, keepTogether: report.monitoringCounts.length <= 12,
      minRowHeight: 17.25, align: ["left", "right"], headerAlign: ["left", "left"],
      heading: { number: "e.", text: "Total tiket monitoring hari per hari dalam minggu ini berdasarkan project", level: 2 },
    },
  );
  table(REPORT_TICKET_COLUMNS, ticketReportRows(report), {
    widths: [36, 34, 110, 30, 79, 34, 30, 38, 46.5], size: 9, padding: 2.5, closedColumn: 6,
    headerFill: LOG_HEADER, headerInk: BLACK, headerBottom: true,
    align: ["center", "center", "left", "center", "left", "center", "center", "center", "center"],
    headerAlign: ["center", "center", "left", "center", "left", "center", "center", "center", "center"],
    heading: { number: "2.", text: "Ticket log / Tiket di minggu ini", level: 1 },
  });
  table(REPORT_MONITORING_COLUMNS, monitoringReportRows(report), {
    widths: [38, 38, 36, 43, 135, 78, 69], size: 9, padding: 2.5,
    headerFill: LOG_HEADER, headerInk: BLACK, headerBottom: true,
    align: ["left", "left", "center", "left", "left", "left", "center"],
    headerAlign: ["left", "center", "center", "center", "center", "center", "center"],
    heading: { number: "3.", text: "Monitoring Log", level: 1 },
  });
  approval();
  pdf.setTitle("Laporan Serah Terima Kerja Mingguan");
  pdf.setAuthor(signatories[0].name || identity.clientName);
  pdf.setSubject(identity.clientName + " | " + report.period.start + " - " + report.period.end);
  pdf.setCreator("Central Tracking Dashboard");
  pdf.setLanguage("id-ID");
  return pdf.save();
}
