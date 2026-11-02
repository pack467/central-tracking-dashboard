import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

test("HandoverHistoryControls contains Clock leading icon, ChevronDown, and DatePicker without label collision", async () => {
  const filePath = path.join(ROOT, "app", "components", "handover", "HandoverHistoryControls.tsx");
  const content = await fs.readFile(filePath, "utf-8");

  // 1. Label does not wrap DatePicker (preventing click bubbling collapse)
  assert.ok(!content.includes("<label className={HISTORY_CONTROL_LABEL_CLASS}>\n          <span className={HISTORY_CONTROL_LABEL_TEXT_CLASS}>Tanggal</span>\n          <div className=\"[width:100%]\">\n            <DatePicker"), "DatePicker must not be wrapped directly in a label element");

  // 2. DatePicker is configured properly
  assert.ok(content.includes('placeholder="Semua Waktu"'), "DatePicker has 'Semua Waktu' placeholder");
  assert.ok(content.includes("clearable"), "DatePicker has clearable prop");
  assert.ok(content.includes("showAllTimePreset"), "DatePicker has showAllTimePreset prop");
  assert.ok(content.includes('referenceDate="2026-09-06"'), "DatePicker has referenceDate prop anchored to Sept 2026");

  // 3. Shift select has leading Clock icon and trailing ChevronDown
  assert.ok(content.includes("<Clock"), "Shift select has leading Clock icon");
  assert.ok(content.includes("<ChevronDown"), "Shift select has trailing ChevronDown arrow");
  assert.ok(content.includes("[padding:8px_30px_8px_32px]"), "Shift select has padding for leading and trailing icons");

  // 4. Shifter PIC is a direct filter (ShifterMultiSelect) supporting multiple selections
  assert.ok(content.includes("<ShifterMultiSelect"), "Shifter PIC uses direct ShifterMultiSelect filter");
  assert.ok(content.includes("<Users"), "Shifter filter has Users icon");
  assert.ok(!content.includes('list="shifter-suggestions"'), "No longer uses free-text search input with datalist");

  // 5. Muat ulang button is removed
  assert.ok(!content.includes("Muat ulang"), "Muat ulang button must be removed from Shift Log controls");
});

test("API route handles multi-shifter filtering with OR logic", async () => {
  const routePath = path.join(ROOT, "app", "api", "handovers", "route.ts");
  const routeContent = await fs.readFile(routePath, "utf-8");

  assert.ok(routeContent.includes("split(/[,|]/)"), "Parses comma or pipe-separated multiple shifters");
  assert.ok(routeContent.includes("picClause"), "Builds dynamic OR clause for multiple shifters");
});

test("API route handles single date, range, partial range, and reversed range properly", async () => {
  const routePath = path.join(ROOT, "app", "api", "handovers", "route.ts");
  const routeContent = await fs.readFile(routePath, "utf-8");

  assert.ok(routeContent.includes("startDate && !endDate"), "Handles partial range with start but no end");
  assert.ok(routeContent.includes("startDate > endDate"), "Handles inverted date range");
});
