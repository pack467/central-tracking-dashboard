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
export const REPORT_TABLE_COLOR = "#145F82"; // Sampled from the reference Word table's OOXML.
function color(hex: string): RGB {
  return /^#[0-9a-f]{6}$/i.test(hex)
    ? rgb(parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255)
    : color(REPORT_TABLE_COLOR);
}

type Alignment = "left" | "center" | "right";
interface TableOptions {
  widths?: number[];
  size?: number;
  x?: number;
  width?: number;
  total?: boolean;
  keepTogether?: boolean;
  align?: Alignment[];
  monoColumn?: number;
  closedColumn?: number;
  emptyMessage?: string;
  heading?: string;
  headingX?: number;
}
interface CellLayout { lines: string[]; font: PDFFont; size: number; align: Alignment; color: RGB }
interface RowLayout { cells: CellLayout[]; height: number; lines: number }

/** A4 vector layout with measured rows, repeated headers, and source-derived branding. */
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
  ].map(assetLoader));
  // Disable substitutions so fontkit's glyph layout and PDF Unicode maps agree.
  const fontOptions = { features: { liga: false, clig: false, calt: false, rlig: false, kern: false } };
  const [regular, bold] = await Promise.all(assets.slice(1).map((bytes) => pdf.embedFont(bytes, fontOptions)));
  const [italic, boldItalic, mono] = await Promise.all([
    pdf.embedFont(StandardFonts.HelveticaOblique),
    pdf.embedFont(StandardFonts.HelveticaBoldOblique),
    pdf.embedFont(StandardFonts.Courier),
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

  const W = 595.44, H = 841.68;
  const LEFT = 48, WIDTH = W - 96, RIGHT = LEFT + WIDTH;
  const BODY_TOP = 165, BOTTOM = 792, CAPACITY = BOTTOM - BODY_TOP;
  const TEAL = color(REPORT_TABLE_COLOR);
  const ROW_TINT = rgb(.97, .98, .985);
  const TOTAL_TINT = rgb(.90, .95, .97);
  let page!: PDFPage;
  let y = BODY_TOP;
  const characterSets = new Map<PDFFont, Set<number>>();

  function clean(text: string, font = regular) {
    let supported = characterSets.get(font);
    if (!supported) { supported = new Set(font.getCharacterSet()); characterSets.set(font, supported); }
    return Array.from(String(text)).map((letter) => /[\r\t]/.test(letter) ? " " : letter === "\n" || supported.has(letter.codePointAt(0)!) ? letter : "?").join("");
  }
  function textWidth(text: string, size: number, font = regular) { return font.widthOfTextAtSize(clean(text, font), size); }
  function draw(text: string, x: number, top: number, size = 10, font = regular, ink = BLACK) {
    page.drawText(clean(text, font), { x, y: H - top - size, size, font, color: ink });
  }
  function line(x1: number, top: number, x2: number, thickness = .5, ink = BLACK) {
    page.drawLine({ start: { x: x1, y: H - top }, end: { x: x2, y: H - top }, thickness, color: ink });
  }
  function box(x: number, top: number, width: number, height: number, fill = WHITE, border = BLACK, thickness = .5) {
    page.drawRectangle({ x, y: H - top - height, width, height, color: fill, borderColor: border, borderWidth: thickness });
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
  function centered(text: string, x: number, top: number, width: number, size = 10, font = regular, ink = BLACK) {
    const fitted = fit(text, width - 8, size, font);
    draw(text, x + (width - textWidth(text, fitted, font)) / 2, top, fitted, font, ink);
  }
  function newPage() {
    page = pdf.addPage([W, H]);
    const top = 42, height = 110, titleHeight = 29, projectHeight = 38;
    const logoWidth = 94, detailsWidth = WIDTH - logoWidth, revisionWidth = 174;
    box(LEFT, top, WIDTH, height);
    line(LEFT, top + titleHeight, LEFT + detailsWidth);
    line(LEFT, top + titleHeight + projectHeight, LEFT + detailsWidth);
    page.drawLine({ start: { x: LEFT + detailsWidth, y: H - top }, end: { x: LEFT + detailsWidth, y: H - top - height }, thickness: .5, color: BLACK });
    page.drawLine({ start: { x: LEFT + revisionWidth, y: H - top - titleHeight }, end: { x: LEFT + revisionWidth, y: H - top - height }, thickness: .5, color: BLACK });
    centered("LAPORAN SERAH TERIMA KERJA HARIAN", LEFT, top + 7, detailsWidth, 13.4, bold);
    centered("Status Revisi: 00", LEFT, top + 43, revisionWidth, 9.5, bold);
    centered("Project IT Maintenance Support", LEFT + revisionWidth, top + 35, detailsWidth - revisionWidth, 9.4, boldItalic);
    const client = identity.clientId === "tritronik" ? "PT Tricada Intronik (Tritronik)" : identity.clientName;
    centered("untuk " + client, LEFT + revisionWidth, top + 49, detailsWidth - revisionWidth, 9.4, bold);
    const week = reportWeek(report.period.start);
    centered("Tanggal Aktivitas:", LEFT, top + 70, revisionWidth, 9.3, bold);
    centered("Week " + String(week.week).padStart(2, "0") + " – " + week.year, LEFT, top + 83, revisionWidth, 9.2);
    centered(formatReportDateRange(report.period.start, report.period.end), LEFT, top + 96, revisionWidth, 8.9);
    centered("Departemen : IT Managed Services", LEFT + revisionWidth, top + 85, detailsWidth - revisionWidth, 9.3);
    const logoSize = logoWidth - 12;
    page.drawImage(logo, { x: RIGHT - logoWidth + 6, y: H - top - (height + logoSize) / 2, width: logoSize, height: logoSize });
    line(LEFT + 45, 805, RIGHT);
    box(RIGHT - 42, 805, 42, 19, color("#943634"), color("#943634"), 0);
    centered(String(pdf.getPageCount()), RIGHT - 42, 808, 42, 10, regular, WHITE);
    if (report.config.show_footer_period) {
      draw("Week " + week.week + " – " + week.year + " | " + formatReportDateRange(report.period.start, report.period.end), LEFT + 45, 810, 7);
    }
    y = BODY_TOP;
  }
  function ensure(height: number) { if (y + height > BOTTOM && y > BODY_TOP) newPage(); }
  function paragraph(text: string, x = LEFT, width = RIGHT - x, size = 10, font = regular, gap = 8) {
    const lines = wrap(text, width, size, font);
    for (const value of lines) { ensure(size + 3); draw(value, x, y, size, font); y += size + 3; }
    y += gap;
  }
  function headingHeight(text: string, x = LEFT) { return wrap(text, RIGHT - x, 10, bold).length * 13 + 7; }
  function heading(text: string, x = LEFT, following = 24) {
    ensure(headingHeight(text, x) + following);
    paragraph(text, x, RIGHT - x, 10, bold, 7);
  }
  function purpose() {
    const parts = [
      { text: "Dokumen ini disusun dalam rangka pemenuhan layanan ", font: regular },
      { text: "IT Maintenance Support", font: italic },
      { text: " 24/7 sesuai kebutuhan yang telah dibahas antara ", font: regular },
      { text: identity.clientName, font: bold }, { text: " dan ", font: regular },
      { text: "Hutabyte", font: bold }, { text: ".", font: regular },
    ];
    let x = LEFT + 12;
    const start = x;
    for (const part of parts) {
      for (const word of part.text.split(/(\s+)/).filter(Boolean)) {
        const width = textWidth(word, 10, part.font);
        if (x + width > RIGHT && x > start) { y += 13; x = start; }
        if (x === start && /^\s+$/.test(word)) continue;
        draw(word, x, y, 10, part.font); x += width;
      }
    }
    y += 23;
  }

  function table(headers: string[], rows: string[][], options: TableOptions = {}) {
    const x = options.x ?? LEFT, width = options.width ?? WIDTH, size = options.size ?? 8.5;
    const weights = options.widths ?? headers.map(() => 1);
    const weightSum = weights.reduce((sum, value) => sum + value, 0);
    const widths = weights.map((weight) => width * weight / weightSum);
    const rowLine = size + 3, padding = 4, verticalPadding = 6, minimumRowHeight = 23;
    function layout(values: string[], isHeader = false, isTotal = false): RowLayout {
      const cells = values.map((rawValue, column): CellLayout => {
        // Source Word cells can carry a trailing paragraph break after an ID.
        // Preserve the identifier itself while keeping its display on one line.
        const value = options.monoColumn === column && !isHeader ? rawValue.replace(/\s+/g, " ").trim() : rawValue;
        const font = isHeader || isTotal ? bold : options.monoColumn === column ? mono : regular;
        let cellSize = options.monoColumn === column && !isHeader ? Math.min(7.4, size) : size;
        const cellWidth = widths[column] - padding * 2;
        if (options.monoColumn === column && !isHeader) cellSize = fit(value, cellWidth, cellSize, font);
        // Fit normal words whole; only long technical identifiers use wrap's safe fallback.
        if (!isHeader && options.monoColumn !== column) {
          const normalWords = value.split(/\s+/).filter((word) => /^[\p{L}]+$/u.test(word));
          const widest = Math.max(1, ...normalWords.map((word) => textWidth(word, cellSize, font)));
          if (widest > cellWidth) cellSize = Math.max(7.1, cellSize * cellWidth / widest);
        }
        return {
          lines: options.monoColumn === column && !isHeader ? [clean(value, font)] : wrap(value, cellWidth, cellSize, font),
          font, size: cellSize,
          align: isHeader ? "center" : options.align?.[column] ?? (column === 0 ? "left" : "center"),
          color: isHeader ? WHITE : options.closedColumn === column && /^closed$/i.test(value.trim()) ? color("#18743A") : BLACK,
        };
      });
      const lines = Math.max(1, ...cells.map((cell) => cell.lines.length));
      return { cells, lines, height: Math.max(minimumRowHeight, lines * rowLine + verticalPadding * 2) };
    }
    const head = layout(headers, true);
    const body = rows.map((row, index) => layout(row, false, Boolean(options.total && index === rows.length - 1)));
    const emptyHeight = 32;
    const tableHeight = head.height + (body.length ? body.reduce((sum, row) => sum + row.height, 0) : emptyHeight);
    const titleHeight = options.heading ? headingHeight(options.heading, options.headingX ?? LEFT + 12) : 0;
    const firstHeight = body.length ? Math.min(body[0].height, CAPACITY - head.height - titleHeight) : emptyHeight;
    if (options.keepTogether && titleHeight + tableHeight <= CAPACITY) ensure(titleHeight + tableHeight);
    else ensure(titleHeight + head.height + Math.max(rowLine * 2 + padding * 2, firstHeight));
    if (options.heading) paragraph(options.heading, options.headingX ?? LEFT + 12, RIGHT - (options.headingX ?? LEFT + 12), 10, bold, 7);

    function paint(row: RowLayout, isHeader: boolean, offset = 0, count = row.lines, fill = WHITE) {
      const height = Math.max(minimumRowHeight, count * rowLine + verticalPadding * 2);
      let left = x;
      row.cells.forEach((cell, column) => {
        box(left, y, widths[column], height, isHeader ? TEAL : fill, BLACK, .4);
        const visible = cell.lines.slice(offset, offset + count);
        const top = y + (height - visible.length * rowLine) / 2;
        visible.forEach((value, index) => {
          const measured = textWidth(value, cell.size, cell.font);
          const inset = cell.align === "left" ? padding : cell.align === "right" ? widths[column] - measured - padding : (widths[column] - measured) / 2;
          draw(value, left + inset, top + index * rowLine, cell.size, cell.font, cell.color);
        });
        left += widths[column];
      });
      y += height;
    }
    paint(head, true);
    if (!body.length) {
      box(x, y, width, emptyHeight);
      centered(options.emptyMessage || "Tidak ada data pada periode ini.", x, y + 11, width, 9);
      y += emptyHeight;
    }
    for (const [index, row] of body.entries()) {
      const fill = options.total && index === body.length - 1 ? TOTAL_TINT : index % 2 === 1 ? ROW_TINT : WHITE;
      if (row.height <= CAPACITY - head.height) {
        if (y + row.height > BOTTOM) { newPage(); paint(head, true); }
        paint(row, false, 0, row.lines, fill);
      } else {
        let offset = 0;
        while (offset < row.lines) {
          const available = Math.floor((BOTTOM - y - verticalPadding * 2) / rowLine);
          if (available < 1) { newPage(); paint(head, true); continue; }
          const count = Math.min(available, row.lines - offset);
          paint(row, false, offset, count, fill);
          offset += count;
          if (offset < row.lines) { newPage(); paint(head, true); }
        }
      }
    }
    y += 12;
  }

  function chartScale(max: number) {
    const target = Math.max(1, max) / 4;
    const magnitude = 10 ** Math.floor(Math.log10(target));
    const step = [1, 2, 5, 10].map((factor) => factor * magnitude).find((value) => value >= target) || magnitude * 10;
    const integerStep = Math.max(1, step);
    const paddedMaximum = Math.max(1, max) + Math.max(1, max * .12);
    const ceiling = Math.max(integerStep, Math.ceil(paddedMaximum / integerStep) * integerStep);
    return { step: integerStep, ceiling };
  }
  function plotAxes(x: number, top: number, width: number, height: number, maximum: number) {
    const scale = chartScale(maximum);
    for (let value = 0; value <= scale.ceiling; value += scale.step) {
      const rowY = top + height * (1 - value / scale.ceiling);
      line(x, rowY, x + width, .3, rgb(.84, .84, .84));
      const label = String(value);
      draw(label, x - textWidth(label, 8) - 8, rowY - 4, 8, regular, rgb(.35, .35, .35));
    }
    return scale.ceiling;
  }
  function projectChart() {
    const height = 215;
    ensure(height);
    centered("Total Ticket", LEFT, y + 2, WIDTH, 12);
    const px = LEFT + 31, pt = y + 31, pw = WIDTH - 44, ph = 150;
    const ceiling = plotAxes(px, pt, pw, ph, Math.max(0, ...report.projects.map((project) => project.total)));
    const group = pw / Math.max(1, report.projects.length);
    report.projects.forEach((project, index) => {
      const bw = Math.min(34, group * .55), bh = project.total / ceiling * ph;
      const bx = px + index * group + (group - bw) / 2;
      if (bh) page.drawRectangle({ x: bx, y: H - pt - ph, width: bw, height: bh, color: TEAL });
      centered(String(project.total), bx - 4, pt + ph - bh - 16, bw + 8, 9, bold);
      const label = wrap(project.project, group - 4, 8.5);
      label.forEach((value, i) => centered(value, px + index * group, pt + ph + 8 + i * 11, group, 8.5));
    });
    if (!report.total) centered("Tidak ada tiket pada periode ini", px, pt + ph / 2, pw, 10);
    y += height;
  }
  function dailyLayout(days: string[]) {
    const activeProjects = report.projects.filter((p) => p.total > 0);
    const projects = activeProjects.length > 0 ? activeProjects : report.projects;
    const cardX = LEFT, cardW = WIDTH;
    const labelWidth = 84, dateRowHeight = 18, rowHeight = 16, plotHeight = 135;
    const legendLineH = 14;
    const legendItems = projects.map((p) => ({
      project: p.project,
      width: 10 + textWidth(p.project, 8) + 12,
    }));
    const totalLegendW = legendItems.reduce((sum, item, idx) => sum + item.width - (idx === legendItems.length - 1 ? 12 : 0), 0);
    const legendLinesCount = totalLegendW <= cardW - 16 ? 1 : Math.ceil(totalLegendW / (cardW - 16));
    const cardHeight = 14 + plotHeight + dateRowHeight + projects.length * rowHeight + 10 + legendLinesCount * legendLineH + 8;
    return { cardX, cardW, labelWidth, dateRowHeight, rowHeight, plotHeight, legendLineH, cardHeight, height: cardHeight + 14, days, projects };
  }
  function dailyChart(days: string[], offset: number) {
    const layout = dailyLayout(days);
    const { cardX, cardW, labelWidth, dateRowHeight, rowHeight, plotHeight, legendLineH, cardHeight, projects } = layout;
    ensure(layout.height);
    const top = y;
    const px = cardX + labelWidth, pw = cardW - labelWidth - 8;
    const pt = top + 14, ph = plotHeight;
    const baselineY = pt + ph;

    // Draw outer container card with subtle light-gray border
    const BORDER_COLOR = rgb(0.85, 0.85, 0.85);
    box(cardX, top, cardW, cardHeight, WHITE, BORDER_COLOR, 0.5);

    // Calculate maximum across visible days for active projects
    const maxVal = Math.max(0, ...projects.flatMap((project) => days.map((_, index) => project.days[offset + index] || 0)));
    const scale = chartScale(maxVal);
    const ceiling = scale.ceiling;

    // Horizontal grid lines and Y-axis scale
    for (let value = 0; value <= ceiling; value += scale.step) {
      const rowY = pt + ph * (1 - value / ceiling);
      line(px, rowY, px + pw, 0.35, BORDER_COLOR);
      const label = String(value);
      draw(label, px - textWidth(label, 8) - 5, rowY - 3.5, 8, regular, rgb(0.35, 0.35, 0.35));
    }

    // Chart Clustered Column Bars
    const colW = pw / days.length;
    const clusterW = colW * 0.76;
    const clusterPad = (colW - clusterW) / 2;
    const slotW = clusterW / Math.max(1, projects.length);
    const barW = Math.max(2.5, slotW * 0.88);
    const barPad = (slotW - barW) / 2;

    days.forEach((day, index) => {
      const dayX = px + index * colW;
      projects.forEach((project, pIndex) => {
        const value = project.days[offset + index] || 0;
        if (!value) return;
        const barH = (value / ceiling) * ph;
        const bx = dayX + clusterPad + pIndex * slotW + barPad;
        page.drawRectangle({
          x: bx,
          y: H - baselineY,
          width: barW,
          height: barH,
          color: color(report.config.project_colors[project.project] || REPORT_TABLE_COLOR),
        });
      });
    });

    if (!report.total) centered("Tidak ada tiket pada periode ini", px, pt + ph / 2, pw, 9.5);

    // Integrated Excel-style Data Table directly attached below baseline
    const tableTop = baselineY;

    // 1. Date Header Row
    box(cardX, tableTop, labelWidth, dateRowHeight, WHITE, BORDER_COLOR, 0.4);
    days.forEach((day, index) => {
      const dx = px + index * colW;
      box(dx, tableTop, colW, dateRowHeight, WHITE, BORDER_COLOR, 0.4);
      centered(numericDate(day), dx, tableTop + (dateRowHeight - 8) / 2 - 1, colW, 8, regular, rgb(0.2, 0.2, 0.2));
    });

    // 2. Project Rows
    projects.forEach((project, pIndex) => {
      const ry = tableTop + dateRowHeight + pIndex * rowHeight;
      // Project name cell with small colored square
      box(cardX, ry, labelWidth, rowHeight, WHITE, BORDER_COLOR, 0.4);
      const sqSize = 6;
      const sqX = cardX + 6;
      const sqY = ry + (rowHeight - sqSize) / 2;
      const pColor = color(report.config.project_colors[project.project] || REPORT_TABLE_COLOR);
      page.drawRectangle({ x: sqX, y: H - sqY - sqSize, width: sqSize, height: sqSize, color: pColor });
      draw(project.project, cardX + 16, ry + (rowHeight - 8) / 2 - 1, 8, regular, rgb(0.15, 0.15, 0.15));

      // Day count cells
      days.forEach((_, index) => {
        const dx = px + index * colW;
        box(dx, ry, colW, rowHeight, WHITE, BORDER_COLOR, 0.4);
        const value = project.days[offset + index] || 0;
        if (value) centered(String(value), dx, ry + (rowHeight - 8) / 2 - 1, colW, 8, regular, rgb(0.15, 0.15, 0.15));
      });
    });

    // 3. Legend at the bottom
    const tableBottom = tableTop + dateRowHeight + projects.length * rowHeight;
    const legendY = tableBottom + 10;
    const legendItems = projects.map((p) => ({
      project: p.project,
      width: 10 + textWidth(p.project, 8) + 12,
      color: color(report.config.project_colors[p.project] || REPORT_TABLE_COLOR),
    }));

    const totalLegendW = legendItems.reduce((sum, item, idx) => sum + item.width - (idx === legendItems.length - 1 ? 12 : 0), 0);
    const legendLines: (typeof legendItems)[] = [];
    if (totalLegendW <= cardW - 16) {
      legendLines.push(legendItems);
    } else {
      let currentLine: typeof legendItems = [];
      let currentW = 0;
      for (const item of legendItems) {
        if (currentLine.length > 0 && currentW + item.width > cardW - 16) {
          legendLines.push(currentLine);
          currentLine = [];
          currentW = 0;
        }
        currentLine.push(item);
        currentW += item.width;
      }
      if (currentLine.length > 0) legendLines.push(currentLine);
    }

    legendLines.forEach((lineItems, lineIdx) => {
      const lineW = lineItems.reduce((sum, item, idx) => sum + item.width - (idx === lineItems.length - 1 ? 12 : 0), 0);
      let lx = cardX + (cardW - lineW) / 2;
      const ly = legendY + lineIdx * legendLineH;
      lineItems.forEach((item) => {
        page.drawRectangle({ x: lx, y: H - ly - 6, width: 6, height: 6, color: item.color });
        draw(item.project, lx + 10, ly - 1, 8, regular, rgb(0.2, 0.2, 0.2));
        lx += item.width;
      });
    });

    y = top + layout.height;
  }
  function approval() {
    const nameLines = signatories.map((person) => wrap(person.name || "—", WIDTH / 2 - 24, 10));
    const titleLines = signatories.map((person) => wrap(person.title, WIDTH / 2 - 24, 10));
    const namesHeight = Math.max(...nameLines.map((rows) => rows.length)) * 13;
    const titlesHeight = Math.max(...titleLines.map((rows) => rows.length)) * 13;
    const headerHeight = 25, signatureHeight = 25 * 72 / 25.4;
    const height = headerHeight + 12 + namesHeight + 8 + signatureHeight + 10 + titlesHeight + 9 + 13 + 12;
    ensure(height + 4);
    const top = y, columnWidth = WIDTH / 2;
    for (let index = 0; index < 2; index++) {
      const x = LEFT + columnWidth * index;
      box(x, top, columnWidth, height);
      box(x, top, columnWidth, headerHeight, rgb(.949, .949, .949));
      centered(index === 0 ? "DISUSUN OLEH" : "DISETUJUI OLEH", x, top + 7, columnWidth, 10, bold);
      nameLines[index].forEach((value, lineIndex) => draw(value, x + 12, top + headerHeight + 12 + lineIndex * 13, 10));
      const signatureTop = top + headerHeight + 12 + namesHeight + 8;
      const image = signatures[index];
      const availableWidth = (columnWidth - 24) * .6;
      if (image) {
        const scale = Math.min(availableWidth / image.width, signatureHeight / image.height);
        const iw = image.width * scale, ih = image.height * scale;
        page.drawImage(image, { x: x + 12, y: H - signatureTop - (signatureHeight + ih) / 2, width: iw, height: ih });
      } else line(x + 12, signatureTop + signatureHeight, x + 12 + availableWidth, .45);
      const titleTop = signatureTop + signatureHeight + 10;
      titleLines[index].forEach((value, lineIndex) => draw(value, x + 12, titleTop + lineIndex * 13, 10));
      draw(formatReportDate(signatories[index].date || creationDate), x + 12, titleTop + titlesHeight + 9, 10);
    }
    y += height;
  }

  newPage();
  heading("A. TUJUAN");
  purpose();
  heading("B. RUANG LINGKUP PEKERJAAN");
  paragraph("Pemberian layanan IT Maintenance Support untuk " + (report.scope.length === 8 ? "8 (delapan)" : report.scope.length) + " aplikasi dari proyek yang meliputi:", LEFT + 12, WIDTH - 12, 10, regular, 3);
  report.scope.forEach((name, index) => paragraph(String(index + 1) + ". " + name, LEFT + 22, WIDTH - 22, 10, regular, 0));
  y += 9;
  heading("C. RINGKASAN AKTIVITAS", LEFT, 13 + 20 + 20 + 13 + 215);
  heading("1. Overview", LEFT + 12, 20 + 13 + 215);
  heading("a. Tiket minggu ini berdasarkan project", LEFT + 24, 13 + 215);
  paragraph("Total tiket minggu ini : " + report.total, LEFT + 24, WIDTH - 24, 10, regular, 2);
  projectChart();
  const dailyHeight = dailyLayout(report.days.slice(0, 7)).height;
  heading("b. Tiket minggu ini hari per hari berdasarkan project", LEFT + 24, dailyHeight);
  for (let offset = 0; offset < report.days.length; offset += 7) dailyChart(report.days.slice(offset, offset + 7), offset);
  const durationRows = [
    ...report.projects.map((project) => [project.project, formatDuration(project.averageMinutes), project.slaPercent === null ? "—" : project.slaPercent + "%", String(project.total), project.clickupCount === null ? "—" : String(project.clickupCount)]),
    ["Grand Total", formatDuration(report.averageMinutes), report.slaPercent === null ? "—" : report.slaPercent + "%", String(report.total), report.clickupTotal === null ? "—" : String(report.clickupTotal)],
  ];
  table(reportDurationColumns(identity.clientName), durationRows, { widths: [1.2, 1.55, 1.1, 1.3, 1.3], total: true, keepTogether: true, heading: "c. Rata-rata durasi pemerosesan tiket berdasarkan project", headingX: LEFT + 24 });
  if (report.config.show_footnotes) paragraph(REPORT_DURATION_NOTE, LEFT, WIDTH, 8, regular, 10);
  const matrixProjects = report.projects.map((project, index) => ({ ...project, index })).filter((project) => project.total > 0);
  table(
    ["Severity - Category", ...matrixProjects.map((project) => project.project), "Grand Total"],
    [...report.categories.map((category) => [category.category, ...matrixProjects.map((project) => category.counts[project.index] ? String(category.counts[project.index]) : ""), String(category.total)]),
      ["Grand Total", ...matrixProjects.map((project) => String(project.total)), String(report.total)]],
    { widths: [4.8, ...matrixProjects.map(() => 1), 1.35], total: true, keepTogether: true, heading: "d. Tiket minggu ini berdasarkan kategori di setiap project", headingX: LEFT + 24, size: 8.5 },
  );
  table(["Project", "Count of Agent"],
    [...report.monitoringCounts.map((row) => [row.project, String(row.count)]), ["Grand Total", String(report.monitoring.length)]],
    { widths: [3.5, 1], total: true, keepTogether: report.monitoringCounts.length <= 12, heading: "e. Total tiket monitoring hari per hari dalam minggu ini berdasarkan project", headingX: LEFT + 24 },
  );
  table(REPORT_TICKET_COLUMNS, ticketReportRows(report), {
    widths: [53, 53, 72, 39, 84, 53, 43, 53, 49], size: 8, monoColumn: 0, closedColumn: 6,
    align: ["center", "center", "left", "center", "left", "center", "center", "center", "center"],
    heading: "2. Ticket log / Tiket di minggu ini",
  });
  table(REPORT_MONITORING_COLUMNS, monitoringReportRows(report), {
    widths: [51, 68, 40, 66, 121, 105, 48], size: 8,
    align: ["center", "left", "center", "center", "left", "left", "center"],
    heading: "3. Monitoring Log",
  });
  approval();
  pdf.setTitle("Laporan Serah Terima Kerja Mingguan");
  pdf.setAuthor(signatories[0].name || identity.clientName);
  pdf.setSubject(identity.clientName + " | " + report.period.start + " - " + report.period.end);
  pdf.setCreator("Central Tracking Dashboard");
  pdf.setLanguage("id-ID");
  return pdf.save();
}
