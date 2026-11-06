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
  assert.ok(tsx.includes("openedTodayTickets") && tsx.includes("stillOpenTickets"), "The live ops lists (opened today / still open) are separate from the analytics filters");
  assert.ok(!tsx.includes("rawActiveDate"), "Live ops no longer treats the newest ticket day as today");
  assert.ok(!tsx.includes("Menyaring grafik volume proyek"), "Subtitle text must be removed");
  
  // The date filter defaults to today and offers 'Semua Waktu' as an explicit choice (lib/date-filter.ts)
  const analyticsSectionContent = tsx.slice(filterIndex, primaryChartIndex);
  assert.ok(!analyticsSectionContent.includes("showAllTimePreset={false}"), "Analytics DatePicker offers the 'Semua Waktu' preset");
  assert.ok(analyticsSectionContent.includes('placeholder="Semua Waktu"'), "An empty analytics date means all time, and says so");

  // 5. Downstream integration
  assert.ok(tsx.includes("for (const t of analyticsTickets)"), "volumeByDate must iterate over analyticsTickets");
  assert.ok(tsx.includes("analyticsTickets.filter("), "userSummaries must filter from analyticsTickets");
});

test("Analytics Filter Toolbar keeps its class hooks in the component (the styles moved from CSS to Tailwind)", () => {
  const tsx = fs.readFileSync(path.resolve(__dirname, "../app/components/tickets/TicketReportView.tsx"), "utf-8");
  for (const name of ["analytics-filter-section", "analytics-filter-header", "analytics-filter-grid", "analytics-shifter-trigger", "analytics-shifter-popover", "analytics-shifter-item"]) {
    assert.ok(tsx.includes(name), `Must render .${name}`);
  }
});
