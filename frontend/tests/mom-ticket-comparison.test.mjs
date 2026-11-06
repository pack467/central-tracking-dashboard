import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("Month-over-Month (MoM) ticket comparison is properly implemented in TicketReportView", async () => {
  const filePath = path.resolve("app/components/tickets/TicketReportView.tsx");
  const content = fs.readFileSync(filePath, "utf8");

  // 1. Tab Button and Title are updated from Throughput Trajectory to MoM comparison
  assert.ok(
    content.includes("Bulan Lalu vs Bulan Ini"),
    "Tab button contains 'Bulan Lalu vs Bulan Ini'"
  );
  assert.ok(
    content.includes("Perbandingan Tiket: Bulan Lalu vs Bulan Ini (MoM)"),
    "Panel title contains 'Perbandingan Tiket: Bulan Lalu vs Bulan Ini (MoM)'"
  );
  assert.ok(
    !content.includes("Throughput & Backlog Trajectory (Created vs Resolved vs Backlog)"),
    "Old Throughput & Backlog Trajectory title is replaced"
  );

  // 2. Executive MoM Summary Metrics Strip was removed per user request
  assert.ok(!content.includes("mom-metrics-strip"), "Does NOT render .mom-metrics-strip container");

  // 3. One shared component (dashboard card and expanded panel), built from lib/mom-comparison.ts
  assert.ok(content.includes("<MomComparison") && content.includes("buildMomComparison"), "Uses the shared MomComparison component and its data builder");
  const component = fs.readFileSync(path.resolve("app/components/dashboard/MomComparison.tsx"), "utf8");
  assert.ok(component.includes("mom-subview-toggle-bar"), "Has subview toggle bar");
  assert.ok(component.includes('"Tren"') && component.includes("Per Sistem"), "Has the trend and the per-system views");
  assert.ok(component.includes("Kumulatif") && component.includes("Harian"), "The trend can show running totals or daily counts");
  const data = fs.readFileSync(path.resolve("app/lib/mom-comparison.ts"), "utf8");
  assert.ok(data.includes("throughDay"), "Compares the same days of both months");
  const viewer = fs.readFileSync(path.resolve("app/components/dashboard/panel-viewer/TicketMomView.tsx"), "utf8");
  assert.ok(viewer.includes("<MomComparison") && viewer.includes('variant="full"'), "The expanded panel uses the same component");
});

const readTsx = () => fs.readFileSync(path.resolve("app/components/tickets/TicketReportView.tsx"), "utf8");
const classLine = (tsx, name) => tsx.split("\n").find((line) => line.includes(name));

test("Month-over-Month controls keep their class hooks in the shared component", () => {
  const component = fs.readFileSync(path.resolve("app/components/dashboard/MomComparison.tsx"), "utf8");
  assert.ok(component.includes("mom-subview-toggle-bar"), "Has .mom-subview-toggle-bar");
  assert.ok(component.includes("mom-toggle-btn"), "Has .mom-toggle-btn");
  const responsive = fs.readFileSync(path.resolve("app/styles/tailwind/responsive.css"), "utf8");
  assert.ok(responsive.includes(".mom-subview-toggle-bar"), "The phone layout still targets the toggle bar");
});

test("user-summary-list expands to fill full height of the adjacent chart card", () => {
  const tsx = readTsx();
  const line = classLine(tsx, "user-summary-list");
  assert.ok(line, ".user-summary-list is rendered");
  assert.ok(!/max-h-/.test(line), ".user-summary-list does NOT have a max-height restriction");
  assert.ok(line.includes("flex-1"), ".user-summary-list grows to fill the height");
  assert.ok(tsx.includes("user-summary-wrapper"), ".user-summary-wrapper is rendered");
});

test("engineer-workload-list expands dynamically to fill ops-engineer-panel without empty void", () => {
  const tsx = readTsx();
  const line = classLine(tsx, "engineer-workload-list");
  assert.ok(line, ".engineer-workload-list is rendered");
  assert.ok(!line.includes("max-h-[180px]"), ".engineer-workload-list does NOT have the old 180px cap");
  assert.ok(line.includes("flex-1"), ".engineer-workload-list grows to fill the height");
  assert.ok(tsx.includes("ops-engineer-panel"), "Renders .ops-engineer-panel");
  assert.ok(tsx.includes("engineer-workload-footer"), "TicketReportView renders .engineer-workload-footer");
  assert.ok(tsx.includes("engineer-workload-stats"), "TicketReportView renders .engineer-workload-stats");
  assert.ok(tsx.includes("Total:"), "TicketReportView footer displays total tickets");
  assert.ok(tsx.includes("Rata-rata:"), "TicketReportView footer displays average workload per staff");
});

test("LIVE OPS VIEW (Operational Focus, Kondisi Shift Aktif, Tiket per NOC Engineer) is positioned at the very top", async () => {
  const tsxPath = path.resolve("app/components/tickets/TicketReportView.tsx");
  const tsx = fs.readFileSync(tsxPath, "utf8");

  const opsIndex = tsx.indexOf('className="ops-focus-section"');
  const primaryChartIndex = tsx.indexOf('className="report-primary-chart-grid"');

  assert.ok(opsIndex !== -1, "ops-focus-section is present in TicketReportView");
  assert.ok(primaryChartIndex !== -1, "report-primary-chart-grid is present in TicketReportView");
  assert.ok(
    opsIndex < primaryChartIndex,
    "LIVE OPS VIEW (ops-focus-section) must be positioned before report-primary-chart-grid at the top"
  );
});

test("Shift Traffic is rendered as clean interactive Multi-Line Trajectory Chart without legacy matrix and redundant text", async () => {
  const tsxPath = path.resolve("app/components/tickets/TicketReportView.tsx");
  const tsx = fs.readFileSync(tsxPath, "utf8");

  // Verify multi-line chart structure & elements
  assert.ok(tsx.includes("shift-traffic-panel"), "Renders .shift-traffic-panel container");
  assert.ok(tsx.includes("shift-traffic-chart-container"), "Renders .shift-traffic-chart-container for SVG chart");
  assert.ok(tsx.includes("shift-traffic-chart-svg"), "Renders SVG line chart element");
  assert.ok(tsx.includes("shift-traffic-metrics-strip"), "Renders top KPI metric strip");
  assert.ok(tsx.includes("shift-traffic-metric-pill"), "Renders metric pills for each shift");
  assert.ok(tsx.includes("shift-traffic-tooltip"), "Renders interactive floating hover tooltip");
  assert.ok(tsx.includes("shift-traffic-filter-bar"), "Renders filter bar for individual line toggling");

  // Verify removed elements are no longer present
  assert.ok(!tsx.includes("Capacity Planning"), "Capacity Planning badge is removed");
  assert.ok(!tsx.includes("Live Traffic"), "Live Traffic badge is removed");
  assert.ok(!tsx.includes("Tabel Matriks"), "Tabel Matriks option is removed");
  assert.ok(!tsx.includes("Indikator Kepadatan Traffic (Traffic Signal RAG)"), "Traffic Signal RAG legend is removed");
  assert.ok(!tsx.includes("Grafik garis komparasi traffic tiket harian antar shift"), "Subtitle text is removed");
  assert.ok(!tsx.includes("Distribusi beban tiket per shift dihitung otomatis"), "Footer summary text is removed");

  // Verify HTML-based axis labels (zero SVG stretching / gepeng)
  assert.ok(tsx.includes("shift-traffic-y-axis"), "Renders HTML Y-axis overlay");
  assert.ok(tsx.includes("shift-traffic-y-label"), "Renders HTML Y-axis label numbers");
  assert.ok(tsx.includes("shift-traffic-x-axis"), "Renders HTML X-axis overlay");
  assert.ok(tsx.includes("shift-traffic-x-label"), "Renders HTML X-axis date labels");

});

