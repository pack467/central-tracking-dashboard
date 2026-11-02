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

  // 3. Subview Switcher
  assert.ok(content.includes("mom-subview-toggle-bar"), "Has subview toggle bar");
  assert.ok(content.includes("Tren Trajectory"), "Has toggle for 'Tren Trajectory'");
  assert.ok(content.includes("Komparasi per Sistem"), "Has toggle for 'Komparasi per Sistem'");

  // 4. Data memo computation
  assert.ok(content.includes("momData"), "Computes momData memoization");
  assert.ok(content.includes("trajectoryPoints"), "Calculates trajectoryPoints comparison");
  assert.ok(content.includes("projectComparison"), "Calculates projectComparison breakdown");

  // 5. Interactive Popover Card
  assert.ok(content.includes("selectedMomItem"), "Supports selectedMomItem interactive selection");
  assert.ok(content.includes("Selisih (MoM):"), "Displays Selisih (MoM) in interactive popover");
});

function getTicketsEnhancementsCss() {
  const p1 = path.resolve("app/styles/tailwind/tickets-enhancements.css");
  const p2 = path.resolve("app/styles/tickets-enhancements.css");
  return fs.existsSync(p1) ? fs.readFileSync(p1, "utf8") : fs.readFileSync(p2, "utf8");
}

test("CSS rules for Month-over-Month comparison are styled cleanly in tickets-enhancements.css", async () => {
  const css = getTicketsEnhancementsCss();

  assert.ok(css.includes(".mom-metrics-strip"), "Contains .mom-metrics-strip");
  assert.ok(css.includes(".mom-metric-card"), "Contains .mom-metric-card");
  assert.ok(css.includes(".mom-val-current"), "Contains .mom-val-current styling");
  assert.ok(css.includes(".mom-val-prev"), "Contains .mom-val-prev styling");
  assert.ok(css.includes(".mom-subview-toggle-bar"), "Contains .mom-subview-toggle-bar");
  assert.ok(css.includes(".mom-toggle-btn"), "Contains .mom-toggle-btn");
});

test("user-summary-list expands to fill full height of the adjacent chart card", async () => {
  const css = getTicketsEnhancementsCss();

  // Verify user-summary-list doesn't have artificial max-height cap and uses flex stretch
  const listBlockMatch = css.match(/\.user-summary-list\s*\{([^}]+)\}/);
  assert.ok(listBlockMatch, ".user-summary-list CSS rule exists");
  const listCss = listBlockMatch[1];
  assert.ok(!listCss.includes("max-height"), ".user-summary-list does NOT have max-height restriction");
  assert.ok(listCss.includes("flex: 1") || listCss.includes("flex:1"), ".user-summary-list has flex: 1 to fill height");
  assert.ok(css.includes(".user-summary-wrapper"), ".user-summary-wrapper CSS rule exists");
  assert.ok(css.includes("justify-content: flex-start") || css.includes("justify-content:flex-start"), "Chart panels use justify-content: flex-start to prevent pushed down charts");
});

test("engineer-workload-list expands dynamically to fill ops-engineer-panel without empty void", async () => {
  const css = getTicketsEnhancementsCss();

  const tsxPath = path.resolve("app/components/tickets/TicketReportView.tsx");
  const tsx = fs.readFileSync(tsxPath, "utf8");

  // Verify engineer-workload-list does not have artificial max-height cap
  const engListMatch = css.match(/\.engineer-workload-list\s*\{([^}]+)\}/);
  assert.ok(engListMatch, ".engineer-workload-list CSS rule exists");
  const engListCss = engListMatch[1];
  assert.ok(!engListCss.includes("max-height: 180px") && !engListCss.includes("max-height:180px"), ".engineer-workload-list does NOT have max-height: 180px cap");
  assert.ok(engListCss.includes("flex: 1 1 0%") || engListCss.includes("flex:1_1_0%"), ".engineer-workload-list has flex: 1 1 0% to fill height dynamically");

  // Verify ops-engineer-panel and report-panel-body have flex setup
  assert.ok(css.includes(".ops-engineer-panel"), "Contains .ops-engineer-panel");
  assert.ok(css.includes(".engineer-workload-footer"), "Contains .engineer-workload-footer");
  assert.ok(css.includes(".engineer-workload-stats"), "Contains .engineer-workload-stats");

  // Verify JSX renders engineer-workload-footer with total and average metrics
  assert.ok(tsx.includes("engineer-workload-footer"), "TicketReportView renders .engineer-workload-footer");
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

  const css = getTicketsEnhancementsCss();

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
  assert.ok(css.includes(".shift-traffic-y-axis"), "CSS includes .shift-traffic-y-axis");
  assert.ok(css.includes(".shift-traffic-y-label"), "CSS includes .shift-traffic-y-label");
  assert.ok(css.includes(".shift-traffic-x-axis"), "CSS includes .shift-traffic-x-axis");
  assert.ok(css.includes(".shift-traffic-x-label"), "CSS includes .shift-traffic-x-label");

  // Verify CSS styles
  assert.ok(css.includes(".shift-traffic-chart-container"), "CSS includes .shift-traffic-chart-container");
  assert.ok(css.includes(".shift-traffic-tooltip"), "CSS includes .shift-traffic-tooltip");
  assert.ok(css.includes(".shift-traffic-metrics-strip"), "CSS includes .shift-traffic-metrics-strip");
});

