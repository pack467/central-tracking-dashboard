import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Monitoring Schedule shows a silhouette, not a person, for a checkpoint nobody has checked yet", () => {
  const source = readFileSync("app/components/dashboard/MonitoringSchedule.tsx", "utf8");
  assert.ok(source.includes("export function PendingUserSilhouette"), "Has the silhouette component");
  assert.ok(source.includes("<PendingUserSilhouette"), "Renders it in the schedule");
  assert.ok(source.includes('aria-label="Belum ada pemeriksa"'), "Says what it means to a screen reader");
});
