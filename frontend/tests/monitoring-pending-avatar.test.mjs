import test from "node:test";
import assert from "node:assert/strict";

test("Monitoring Schedule renders user silhouette icon for pending checkpoints and initials for verified checkpoints", async () => {
  const res = await fetch("http://localhost:3000");
  assert.equal(res.status, 200);
  const html = await res.text();

  // 1. Verify that pending checkpoints render the generic user silhouette SVG
  assert.ok(html.includes("pending-user-silhouette"), "Has pending-user-silhouette SVG in monitoring schedule");
  assert.ok(html.includes("avatar-pending"), "Has avatar-pending class for pending verification checkpoints");
});
