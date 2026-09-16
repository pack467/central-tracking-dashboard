import test from "node:test";
import assert from "node:assert/strict";

test("Sidebar profile renders circular avatar, status ring wrapper, and status options", async () => {
  const res = await fetch("http://localhost:3000");
  assert.equal(res.status, 200);
  const html = await res.text();

  // 1. Check profile avatar ring wrapper exists and is rendered
  assert.ok(
    html.includes("profile-avatar-ring-wrapper"),
    "Renders .profile-avatar-ring-wrapper around the circular avatar"
  );

  // 2. Check avatar has circular shape class
  assert.ok(
    html.includes("ui-avatar-circle"),
    "Avatar utilizes circular class .ui-avatar-circle"
  );

  // 3. Check status badge element
  assert.ok(
    html.includes("profile-status-badge"),
    "Renders .profile-status-badge dot element"
  );

  // 4. Check presence status indicator and text
  assert.ok(
    html.includes("profile-status-indicator-dot"),
    "Renders .profile-status-indicator-dot in operator info"
  );
  assert.ok(
    html.includes("Operator NOC"),
    "Displays Operator NOC role"
  );

  // 5. Verify Sidebar.tsx source code contains all required status definitions
  const fs = await import("node:fs");
  const path = await import("node:path");
  const sidebarCode = fs.readFileSync(path.resolve("app/components/layout/Sidebar.tsx"), "utf8");

  assert.ok(sidebarCode.includes("USER_STATUS_CONFIG"), "Sidebar has USER_STATUS_CONFIG");
  assert.ok(sidebarCode.includes("profile-status-picker-section"), "Sidebar has status picker section");

  const requiredStatuses = ["Online", "Busy", "On Break", "AFK"];
  for (const status of requiredStatuses) {
    assert.ok(sidebarCode.includes(`"${status}"`), `Sidebar contains status: ${status}`);
  }

  // 6. Verify On Leave and Offline are removed from presence status choices
  assert.ok(!sidebarCode.includes(`USER_STATUS_CONFIG["On Leave"]`), "On Leave is removed from status options");
  assert.ok(!sidebarCode.includes(`USER_STATUS_CONFIG["Offline"]`), "Offline is removed from status options");
  assert.ok(sidebarCode.includes("Away From Keyboard"), "Contains AFK description (Away From Keyboard)");
});
