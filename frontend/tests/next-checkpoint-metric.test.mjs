import test from "node:test";
import assert from "node:assert/strict";

test("Card 4 renders as TUGAS SAAT INI and has no checkpoint references", async () => {
  const res = await fetch("http://localhost:3000");
  assert.equal(res.status, 200);
  const html = await res.text();

  // 1. Assert Card 4 header is TUGAS SAAT INI
  assert.ok(html.includes("TUGAS SAAT INI"), "Contains 'TUGAS SAAT INI'");

  // 2. Assert no NEXT CHECKPOINT, 23:00, or handover log description in Card 4
  assert.ok(!html.includes("NEXT CHECKPOINT"), "Must not contain 'NEXT CHECKPOINT'");
  assert.ok(
    !html.includes("Tinjauan kesiapan shift malam dan handover log final terjadwal."),
    "Must not contain old nextCheckpointDesc"
  );

  // 3. Assert task status badges and text are present
  assert.ok(
    html.includes("Perlu Dikerjakan") || html.includes("Semua Selesai"),
    "Contains task status badge"
  );
  assert.ok(
    html.includes("tugas operasional shift saat ini"),
    "Contains operational tasks phrasing"
  );

  // 4. Assert old truncated text is gone
  assert.ok(!html.includes("handov..."), "Must not contain truncated 'handov...'");
});

test("Monitoring schedule contains scrollable schedule-body container and responsive height rules", async () => {
  const res = await fetch("http://localhost:3000");
  assert.equal(res.status, 200);
  const html = await res.text();

  assert.ok(html.includes('class="schedule-body"'), "Contains 'schedule-body' container");
  assert.ok(html.includes('class="schedule-header"'), "Contains 'schedule-header' container");

  // Verify dashboard-panels.css has resolved premature scrollbar rules
  const fs = await import("node:fs/promises");
  const css = await fs.readFile(
    "f:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/styles/dashboard-panels.css",
    "utf-8"
  );
  assert.ok(!css.includes("max-height: 420px"), "Must NOT contain artificial max-height: 420px");
  assert.ok(css.includes(".dashboard-grid .schedule-body"), "Contains .dashboard-grid .schedule-body");
  assert.ok(css.includes(".dashboard-grid .schedule-row-wrapper"), "Contains .dashboard-grid .schedule-row-wrapper");
});

