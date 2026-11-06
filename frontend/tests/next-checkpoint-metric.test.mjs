import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Card 4 is TUGAS SAAT INI and has no checkpoint references", () => {
  const source = readFileSync("app/components/dashboard/MetricCards.tsx", "utf8");
  assert.ok(source.includes("TUGAS SAAT INI"), "Contains 'TUGAS SAAT INI'");
  assert.ok(source.includes("Perlu Dikerjakan"), "Contains the task status badge");
  assert.ok(source.includes("tugas operasional shift saat ini"), "Contains operational tasks phrasing");
  assert.ok(!source.includes("NEXT CHECKPOINT"), "Must not contain 'NEXT CHECKPOINT'");
  assert.ok(!source.includes("Tinjauan kesiapan shift malam dan handover log final terjadwal."), "Must not contain old nextCheckpointDesc");
});
