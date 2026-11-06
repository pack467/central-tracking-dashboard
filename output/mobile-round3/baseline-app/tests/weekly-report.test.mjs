import assert from "node:assert/strict";
import test from "node:test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { buildWeeklyReport, reportCsv, reportFilename, periodError, validDate, jakartaDate, mergeReportMonitoring, ticketClosedDate, reportWeek, formatReportDate, formatReportDateRange, weekPeriod, normalizeMonitoringProject, monitoringReportRows, ticketReportRows, DEFAULT_REPORT_CONFIG, REPORT_MONITORING_COLUMNS, REPORT_TICKET_COLUMNS } from "../app/lib/weekly-report.ts";
import { createWeeklyReportPdf } from "../app/lib/weekly-report-pdf.ts";
import { reportDurationColumns } from "../app/lib/weekly-report.ts";

const period = { start: "2026-08-25", end: "2026-08-31" };
const tickets = [
  { id: "1", subject: "Line; one\nSecond line", project: "SM", severity: "Low", category: "Incident", owner: "Galih", status: "Closed", created: "23:50", date: "2026-08-25", completionTime: "00:20", resolutionMinutes: 30, responseMinutes: 15 },
  { id: "2", subject: "Second", project: "MB", severity: "High", owner: "Agnes", status: "Active", created: "12:00", date: "2026-08-31", responseMinutes: 30 },
  { id: "3", subject: "Outside period", project: "SM", severity: "Low", owner: "Galih", status: "Closed", created: "12:00", date: "2026-08-24", responseMinutes: 1 },
  { id: "4", subject: "Other client", project: "Core Banking", severity: "Low", owner: "Galih", status: "Closed", created: "12:00", date: "2026-08-25", clientId: "bni" },
  { id: "5", subject: "No measurement", project: "SM", severity: "Low", owner: "Galih", status: "Closed", created: "12:00", date: "2026-08-31" },
];
const monitoring = [{ id: "monitor-1", date: "2026-08-25", time: "13:00", project: "SM", task: "Queue", owner: "Galih", verdict: "ok", note: "Stabil", clientId: "tritronik" }];
const identity = { clientId: "tritronik", clientName: "Tritronik", clientCode: "TTN", author: "Galih Khairi", authorRole: "Jr. Engineer", approver: "", approverRole: "IT Services Lead", date: "2026-08-31" };
const loadAsset = async (path) => new Uint8Array(await readFile(new URL(`../public${path}`, import.meta.url)));

test("filters inclusive dates and client/project consistently across tables and totals", () => {
  const report = buildWeeklyReport(tickets, monitoring, period, "tritronik");
  assert.equal(report.total, 3); assert.equal(report.closed, 2); assert.equal(report.open, 1);
  assert.equal(report.projects.reduce((sum, row) => sum + row.total, 0), report.total);
  assert.equal(report.categories.reduce((sum, row) => sum + row.total, 0), report.total);
  assert.equal(report.days.length, 7); assert.equal(report.slaPercent, 50);
  assert.equal(report.responseCount, 2); assert.equal(report.averageMinutes, 30);
  const sm = buildWeeklyReport(tickets, monitoring, period, "tritronik", "SM");
  assert.equal(sm.total, 2); assert.equal(sm.monitoring.length, 1); assert.equal(sm.slaPercent, 100);
  assert.equal(buildWeeklyReport(tickets, monitoring, period, "bni").total, 1);
});

test("rejects impossible/reversed/oversized periods and handles empty data without NaN", () => {
  assert.equal(validDate("2026-02-30"), false);
  assert.ok(periodError({ start: "2026-08-31", end: "2026-08-25" }));
  assert.ok(periodError({ start: "2026-01-01", end: "2026-12-31" }));
  const empty = buildWeeklyReport([], [], period, "tritronik");
  assert.equal(empty.total, 0); assert.equal(empty.slaPercent, null); assert.equal(empty.averageMinutes, null);
  assert.equal(jakartaDate(new Date("2026-10-05T18:00:00Z")), "2026-10-06");
});

test("checkpoint changes override their matching record without duplicating it", () => {
  const schedule = [{ time: "13:00", project: "SM", task: "Queue", owner: "Galih" }];
  const merged = mergeReportMonitoring(monitoring, schedule, { "13:00-SM-Queue": { verdict: "nok", note: "Periksa queue" } }, "tritronik", "2026-08-25");
  assert.equal(merged.length, 1); assert.equal(merged[0].verdict, "nok");
});

test("CSV quotes multiline fields, neutralizes formulas, and marks unknown closure accurately", () => {
  const report = buildWeeklyReport([{ ...tickets[0], subject: '=HYPERLINK("example")' }], [], period, "tritronik");
  assert.match(reportCsv(report), /"'=HYPERLINK\(""example""\)"/);
  assert.equal(ticketClosedDate(tickets[0]), "26/08/2026 00:20");
  assert.equal(ticketClosedDate(tickets[4]), "—");
  assert.ok(reportFilename(report, "TTN").endsWith("2026-08-25_2026-08-31.pdf"));
});

test("scope follows the selected application and remains available for empty periods", () => {
  const emptyPeriod = { start: "2026-10-05", end: "2026-10-11" };
  assert.deepEqual(buildWeeklyReport(tickets, monitoring, emptyPeriod, "tritronik", "SM").scope, ["Single Mediation"]);
  assert.equal(buildWeeklyReport([], [], emptyPeriod, "tritronik").scope.length, 8);
  assert.deepEqual(buildWeeklyReport([], [], emptyPeriod, "bni", "all", ["Core Banking", "QRIS"]).scope, ["Core Banking", "QRIS"]);
  assert.deepEqual(reportWeek("2021-01-01"), { week: 53, year: 2020 });
});

test("ticket and monitoring CSV exports keep independent exact schemas and empty records", () => {
  const report = buildWeeklyReport(tickets, [{ ...monitoring[0], note: 'First; "quoted"\nSecond line' }], period, "tritronik");
  const csvHeader = (columns) => columns.map((value) => `"${value}"`).join(";");
  assert.equal(reportCsv(report).split("\r\n")[0], `\uFEFF${csvHeader(REPORT_TICKET_COLUMNS)}`);
  const monitoringCsv = reportCsv(report, "monitoring");
  assert.equal(monitoringCsv.split("\r\n")[0], `\uFEFF${csvHeader(REPORT_MONITORING_COLUMNS)}`);
  assert.match(monitoringCsv, /First; ""quoted""\nSecond line/);
  assert.ok(!monitoringCsv.includes("Line; one"));
  const empty = buildWeeklyReport([], [], period, "tritronik");
  for (const kind of ["tickets", "monitoring"]) assert.match(reportCsv(empty, kind), /"Tidak ada data pada periode ini\.";"—"/);
});

test("Indonesian date ranges use complete month names and keep both years when necessary", () => {
  assert.equal(formatReportDateRange("2026-09-05", "2026-09-11"), "5 – 11 September 2026");
  assert.equal(formatReportDateRange("2026-09-27", "2026-10-03"), "27 September – 3 Oktober 2026");
  assert.equal(formatReportDateRange("2026-12-27", "2027-01-02"), "27 Desember 2026 – 2 Januari 2027");
  assert.equal(formatReportDateRange("2026-10-05", "2026-10-05"), "5 Oktober 2026");
  assert.equal(formatReportDateRange("2026-02-30", "2026-03-01"), "—");
  assert.equal(formatReportDateRange("2026-10-05", "2026-10-01"), "—");
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  for (const [index, month] of months.entries()) assert.equal(formatReportDate(`2026-${String(index + 1).padStart(2, "0")}-01`), `1 ${month} 2026`);
});

test("Sunday presets follow the confirmed convention without snapping explicit report periods", () => {
  assert.equal(DEFAULT_REPORT_CONFIG.week_start_day, 0);
  assert.deepEqual(weekPeriod("2026-10-07"), { start: "2026-10-04", end: "2026-10-10" });
  assert.deepEqual(weekPeriod("2026-09-27"), { start: "2026-09-27", end: "2026-10-03" });
  assert.deepEqual(weekPeriod("2026-10-07", 1), { start: "2026-10-05", end: "2026-10-11" });
  assert.deepEqual(weekPeriod("2026-10-07", 6), { start: "2026-10-03", end: "2026-10-09" });
  assert.throws(() => weekPeriod("2026-10-07", 7), RangeError);
  const explicit = { start: "2026-09-05", end: "2026-09-11" };
  const report = buildWeeklyReport([], [], explicit, "tritronik");
  assert.deepEqual(report.period, explicit);
  assert.equal(report.days[0], explicit.start); assert.equal(report.days.at(-1), explicit.end);
});

test("category matrix merges Medium/Med labels and aliases while retaining agent rows and unknown projects", () => {
  const source = [
    { ...tickets[0], id: "same-id", project: "ERICA", severity: "Medium", category: "Validate End-to-End Process Flow", owner: "First agent" },
    { ...tickets[0], id: "same-id", project: "EPC Tools", severity: "Med", category: "Validate End-to-End Process Flow", owner: "Second agent" },
    { ...tickets[0], project: "Activity - APH", severity: "medium", category: "Validate End-to-End Process Flow" },
    { ...tickets[0], project: "New project", severity: "Low", category: "Ad-hoc Request" },
  ];
  const report = buildWeeklyReport(source, [], period, "tritronik");
  assert.deepEqual(report.projects.map((row) => row.project), ["APH", "EPC Tools", "New project"]);
  assert.equal(report.total, 4); assert.equal(report.tickets.filter((ticket) => ticket.id === "same-id").length, 2);
  assert.deepEqual(report.categories.find((row) => row.category.startsWith("Med -")), { category: "Med - Validate End-to-End Process Flow", counts: [1, 2, 0], total: 3 });
  for (const category of report.categories) assert.equal(category.counts.reduce((a, b) => a + b, 0), category.total);
  assert.equal(report.categories.reduce((total, row) => total + row.total, 0), report.total);
  for (const [index, project] of report.projects.entries()) assert.equal(report.categories.reduce((total, row) => total + row.counts[index], 0), project.total);
  assert.ok(ticketReportRows(report).some((row) => row[3] === "ERICA"));
  assert.equal(buildWeeklyReport(source, [], period, "tritronik", "EPC Tools").total, 2);
  const all = buildWeeklyReport(source, [], period, "tritronik", "all", [], { config: { show_empty_projects: true } });
  assert.deepEqual(all.projects.map((row) => row.project), [...DEFAULT_REPORT_CONFIG.master_projects, "New project"]);
  assert.equal(all.projects.find((row) => row.project === "DM").total, 0);
  assert.equal(all.projects.reduce((total, row) => total + row.total, 0), report.total);
});

test("monitoring groups normalize complete project labels, preserve original results, and sort checkpoint rows", () => {
  const entries = [
    { ...monitoring[0], id: "later", project: "DM - grafana", time: "15:00", resultText: "", newUpdate: "" },
    { ...monitoring[0], id: "other", project: "DM - Server DM", time: "08:00", resultText: "Masih dalam pemeriksaan", newUpdate: "08:30", verdict: undefined },
    { ...monitoring[0], id: "early", project: "dm - Grafana", time: "08:00" },
    { ...monitoring[0], id: "outside", project: "DM - Grafana", date: "2026-08-24" },
  ];
  const report = buildWeeklyReport([], entries, period, "tritronik");
  assert.deepEqual(report.monitoringCounts, [{ project: "DM - Grafana", count: 2 }, { project: "DM - Server DM", count: 1 }]);
  assert.deepEqual(report.monitoring.map((row) => row.id), ["early", "other", "later"]);
  assert.equal(report.monitoringCounts.reduce((total, row) => total + row.count, 0), report.monitoring.length);
  assert.equal(buildWeeklyReport([], entries, period, "tritronik", "DM").monitoring.length, 3);
  assert.equal(buildWeeklyReport([], entries, period, "tritronik", "DM - Grafana").monitoring.length, 2);
  assert.equal(normalizeMonitoringProject("SM - ActiveMQ 228"), "SM - ActiveMQ 228");
  assert.equal(normalizeMonitoringProject("CDR-LUADR - Monitoring Alert"), "CDR-LUADR - Monitoring Alert");
  const rows = monitoringReportRows(report);
  assert.equal(rows[0][0], "25/08/2026"); assert.equal(rows[1][5], "Masih dalam pemeriksaan"); assert.equal(rows[1][6], "08:30");
  assert.equal(rows[2][5], ""); assert.equal(rows[2][6], "");
});

test("ClickUp adapter distinguishes measured zero from unavailable and avoids a misleading partial total", () => {
  const make = (clickup_counts, config) => buildWeeklyReport(tickets, [], period, "tritronik", "all", [], { clickup_counts, config });
  const missing = make();
  assert.equal(missing.clickupTotal, null); assert.ok(missing.projects.every((row) => row.clickupCount === null));
  const zeros = make({ MB: 0, SM: 0 });
  assert.equal(zeros.clickupTotal, 0); assert.ok(zeros.projects.every((row) => row.clickupCount === 0));
  assert.equal(make({ MB: 3, SM: 4, APH: 99 }).clickupTotal, 7);
  const partial = make({ MB: 3 });
  assert.equal(partial.projects.find((row) => row.project === "MB").clickupCount, 3); assert.equal(partial.clickupTotal, null);
  const invalid = make({ MB: -1, SM: Number.NaN });
  assert.equal(invalid.clickupTotal, null); assert.ok(invalid.projects.every((row) => row.clickupCount === null));
});

test("actual Word Week 39 preserves 138 source ticket rows and aggregates all 864 monitoring rows", async (context) => {
  let fixture;
  try { fixture = JSON.parse(await readFile(new URL("../.report-qa/word-week39.json", import.meta.url), "utf8")); }
  catch (error) { if (error.code === "ENOENT") return context.skip("Local user-provided Word QA fixture is not present."); throw error; }
  const report = buildWeeklyReport(fixture.tickets, fixture.monitoring, fixture.period, "tritronik");
  assert.equal(report.total, 138); assert.equal(report.monitoring.length, 864);
  assert.deepEqual(report.projects.map(({ project, total }) => [project, total]), [["APH", 1], ["B2B", 2], ["EPC Core", 8], ["EPC Tools", 30], ["MB", 62], ["SM", 17], ["USIEM", 18]]);
  assert.equal(report.categories.reduce((total, row) => total + row.total, 0), 138);
  assert.equal(report.projects.flatMap((row) => row.days).reduce((sum, value) => sum + value, 0), 138);
  assert.equal(report.categories.filter((row) => row.category === "Med - Validate End-to-End Process Flow").length, 1);
  for (const [index, project] of report.projects.entries()) assert.equal(report.categories.reduce((total, row) => total + row.counts[index], 0), project.total);
  assert.equal(report.monitoringCounts.reduce((total, row) => total + row.count, 0), 864);
  assert.equal(report.monitoringCounts.find((row) => row.project === "DM - Grafana").count, 28);
  assert.equal(report.monitoringCounts.find((row) => row.project === "APH - Grafana").count, 35);
  assert.equal(report.monitoringCounts.find((row) => row.project === "SM - SGSN Roamware").count, 120);
  assert.deepEqual(report.tickets.map((row) => row.id).sort(), fixture.tickets.map((row) => row.id).sort());
  assert.ok(report.monitoring.some((row) => row.verdict === "unknown"));
});

test("combined Hutabyte/client totals are used as supplied without adding local tickets twice", () => {
  const report = buildWeeklyReport(tickets, [], period, "tritronik", "all", [], {
    combined_ticket_counts: { MB: 4, SM: 6 }, clickup_counts: { MB: 99, SM: 99 },
  });
  assert.equal(report.total, 3);
  assert.equal(report.clickupTotal, 10);
  assert.deepEqual(report.projects.map((row) => row.clickupCount), [4, 6]);
  assert.equal(reportDurationColumns().at(-1), "Total Ticket Hutabyte x Tritronik");
  assert.equal(reportDurationColumns("BNI").at(-1), "Total Ticket Hutabyte x BNI");
});

test("exports a readable A4 PDF with the Word template and all records", async () => {
  const sourceTickets = tickets.map((ticket, index) => index === 0 ? { ...ticket, id: "REQ-2812\n " } : ticket);
  const report = buildWeeklyReport(sourceTickets, monitoring, period, "tritronik");
  const bytes = await createWeeklyReportPdf(report, identity, loadAsset);
  assert.equal(report.tickets[0].id, "REQ-2812\n ");
  const pdf = await PDFDocument.load(bytes);
  assert.ok(pdf.getPageCount() >= 1);
  for (const page of pdf.getPages()) { assert.equal(page.getWidth(), 595.44); assert.equal(page.getHeight(), 841.68); }
  assert.equal(pdf.getTitle(), "Laporan Serah Terima Kerja Mingguan");
  await mkdir(new URL("../.report-qa/", import.meta.url), { recursive: true });
  await writeFile(new URL("../.report-qa/sample.pdf", import.meta.url), bytes);
  const empty = await createWeeklyReportPdf(buildWeeklyReport([], [], period, "tritronik"), { ...identity, date: "2026-12-25" }, loadAsset);
  assert.ok((await PDFDocument.load(empty)).getPageCount() >= 1);
  await writeFile(new URL("../.report-qa/empty.pdf", import.meta.url), empty);
  await writeFile(new URL("../.report-qa/ticket-log.csv", import.meta.url), reportCsv(report));
  await writeFile(new URL("../.report-qa/monitoring-log.csv", import.meta.url), reportCsv(report, "monitoring"));
  const filtered = await createWeeklyReportPdf(buildWeeklyReport(tickets, monitoring, period, "tritronik", "SM"), identity, loadAsset);
  await writeFile(new URL("../.report-qa/filtered.pdf", import.meta.url), filtered);
});

test("long unbroken descriptions paginate without clipping or missing records", async () => {
  const long = { ...tickets[0], description: "VeryLongText".repeat(650) };
  const bytes = await createWeeklyReportPdf(buildWeeklyReport([long], monitoring, period, "tritronik"), identity, loadAsset);
  assert.ok((await PDFDocument.load(bytes)).getPageCount() > 5);
  await writeFile(new URL("../.report-qa/long-note.pdf", import.meta.url), bytes);
});
