import test from "node:test";
import assert from "node:assert/strict";

test("Status ring wrapper is rendered across all profile surfaces", async () => {
  // 1. Fetch Profile Page (/profile)
  const profileRes = await fetch("http://localhost:3000/profile");
  assert.equal(profileRes.status, 200);
  const profileHtml = await profileRes.text();

  assert.ok(
    profileHtml.includes("profile-avatar-large-wrapper"),
    "Profile Page renders .profile-avatar-large-wrapper for hero profile avatar"
  );
  assert.ok(
    profileHtml.includes("profile-large-status-badge"),
    "Profile Page renders .profile-large-status-badge for hero profile badge"
  );

  // 2. Fetch Overview Page (/)
  const overviewRes = await fetch("http://localhost:3000");
  assert.equal(overviewRes.status, 200);
  const overviewHtml = await overviewRes.text();

  // Sidebar profile & active shift
  assert.ok(
    overviewHtml.includes("profile-avatar-ring-wrapper"),
    "Sidebar renders .profile-avatar-ring-wrapper"
  );
  assert.ok(
    overviewHtml.includes("shift-people-ring-wrapper"),
    "Sidebar Active Shift card renders .shift-people-ring-wrapper around GK"
  );

  // Overview Roster Tim panel
  assert.ok(
    overviewHtml.includes("roster-avatar-ring-wrapper"),
    "Overview Roster Tim panel renders .roster-avatar-ring-wrapper"
  );
  assert.ok(
    overviewHtml.includes("roster-avatar-status-badge"),
    "Overview Roster Tim panel renders .roster-avatar-status-badge"
  );

  // 3. Verify component implementations contain the status ring wrappers
  const fs = await import("node:fs");
  const path = await import("node:path");

  const rosterTableCode = fs.readFileSync(path.resolve("app/components/team/RosterTable.tsx"), "utf8");
  assert.ok(
    rosterTableCode.includes("roster-table-avatar-ring-wrapper"),
    "RosterTable.tsx wraps avatars with .roster-table-avatar-ring-wrapper"
  );
  assert.ok(
    rosterTableCode.includes("roster-table-status-badge"),
    "RosterTable.tsx includes .roster-table-status-badge"
  );

  const rosterCoverageCode = fs.readFileSync(path.resolve("app/components/team/RosterShiftCoverage.tsx"), "utf8");
  assert.ok(
    rosterCoverageCode.includes("coverage-avatar-ring-wrapper"),
    "RosterShiftCoverage.tsx wraps avatars with .coverage-avatar-ring-wrapper"
  );
  assert.ok(
    rosterCoverageCode.includes("coverage-avatar-status-badge"),
    "RosterShiftCoverage.tsx includes .coverage-avatar-status-badge"
  );

  const drawerCode = fs.readFileSync(path.resolve("app/components/team/MemberDetailDrawer.tsx"), "utf8");
  assert.ok(
    drawerCode.includes("drawer-avatar-ring-wrapper"),
    "MemberDetailDrawer.tsx wraps avatar with .drawer-avatar-ring-wrapper"
  );

  const layoutCss = fs.readFileSync(path.resolve("app/styles/layout.css"), "utf8");
  assert.ok(
    layoutCss.includes("Universal Concentric Avatar Status Ring Wrappers"),
    "layout.css uses universal concentric avatar status ring system"
  );
  assert.ok(
    !layoutCss.includes("inset: -1.5px"),
    "layout.css no longer uses fractional inset: -1.5px that caused subpixel ring skewing"
  );
});

