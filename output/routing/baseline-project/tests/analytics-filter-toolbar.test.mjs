import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test("Analytics Filter Toolbar is placed directly above Primary Charts and controls downstream data while isolating Live Ops View", () => {
  const tsxPath = path.resolve(__dirname, "../app/components/tickets/TicketReportView.tsx");
  const tsx = fs.readFileSync(tsxPath, "utf-8");

  // 1. Structural placement: ops-focus-section < analytics-filter-section < report-primary-chart-grid
  const opsIndex = tsx.indexOf('className="ops-focus-section"');
  const filterIndex = tsx.indexOf('className="analytics-filter-section"');
  const primaryChartIndex = tsx.indexOf('className="report-primary-chart-grid"');

  assert.ok(opsIndex !== -1, "ops-focus-section must exist");
  assert.ok(filterIndex !== -1, "analytics-filter-section must exist");
  assert.ok(primaryChartIndex !== -1, "report-primary-chart-grid must exist");
  assert.ok(opsIndex < filterIndex, "Live Ops View must be above the Analytics Filter Toolbar");
  assert.ok(filterIndex < primaryChartIndex, "Analytics Filter Toolbar must be directly above Ticket Volume per Project & Rekap Tiket");

  // 2. All 6 filters are present in the toolbar
  assert.ok(tsx.includes("Rentang Tanggal"), "Must contain Rentang Tanggal filter label");
  assert.ok(tsx.includes("analyticsDateFilter"), "Must bind analyticsDateFilter");
  assert.ok(tsx.includes("analyticsProjectFilter"), "Must bind analyticsProjectFilter");
  assert.ok(tsx.includes("analyticsShiftFilter"), "Must bind analyticsShiftFilter");
  assert.ok(tsx.includes("AnalyticsShifterMultiSelect"), "Must render AnalyticsShifterMultiSelect");
  assert.ok(tsx.includes("analyticsStatusFilter"), "Must bind analyticsStatusFilter");
  assert.ok(tsx.includes("analyticsSeverityFilter"), "Must bind analyticsSeverityFilter");

  // 3. Counter and reset button
  assert.ok(tsx.includes("analytics-filter-counter-badge"), "Must render counter badge");
  assert.ok(tsx.includes("analytics-filter-reset-action-btn"), "Must render reset button");

  // 4. Live Ops View isolation & excluded filters
  assert.ok(tsx.includes("rawActiveDate"), "Must maintain rawActiveDate independent of analytics date filter");
  assert.ok(!tsx.includes("Menyaring grafik volume proyek"), "Subtitle text must be removed");
  
  // Exclude 'Semua Waktu' from Analytics Filter Toolbar
  const analyticsSectionContent = tsx.slice(filterIndex, primaryChartIndex);
  assert.ok(analyticsSectionContent.includes("showAllTimePreset={false}"), "Analytics DatePicker must explicitly set showAllTimePreset={false}");
  assert.ok(!analyticsSectionContent.includes('placeholder="Semua Waktu"'), "Analytics DatePicker placeholder must not be 'Semua Waktu'");

  // 5. Downstream integration
  assert.ok(tsx.includes("for (const t of analyticsTickets)"), "volumeByDate must iterate over analyticsTickets");
  assert.ok(tsx.includes("analyticsTickets.filter("), "userSummaries must filter from analyticsTickets");
});

test("CSS rules for Analytics Filter Toolbar exist and are styled properly", () => {
  const cssPath = path.resolve(__dirname, "../app/styles/tailwind/tickets-enhancements.css");
  const css = fs.readFileSync(cssPath, "utf-8");

  assert.ok(css.includes(".analytics-filter-section"), "CSS must contain .analytics-filter-section");
  assert.ok(css.includes(".analytics-filter-header"), "CSS must contain .analytics-filter-header");
  assert.ok(css.includes(".analytics-filter-grid"), "CSS must contain .analytics-filter-grid");
  assert.ok(css.includes(".analytics-shifter-trigger"), "CSS must contain .analytics-shifter-trigger");
  assert.ok(css.includes(".analytics-shifter-popover"), "CSS must contain .analytics-shifter-popover");
  assert.ok(css.includes(".analytics-shifter-item"), "CSS must contain .analytics-shifter-item");
});
