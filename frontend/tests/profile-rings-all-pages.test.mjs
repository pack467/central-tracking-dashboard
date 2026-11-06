import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

test("Status ring wrapper is rendered across the surfaces that show a person's status", () => {
  const sidebar = read("app/components/layout/Sidebar.tsx");
  assert.ok(sidebar.includes("profile-avatar-ring-wrapper"), "Sidebar renders .profile-avatar-ring-wrapper");
  assert.ok(sidebar.includes("shift-people-ring-wrapper"), "Sidebar Active Shift card renders .shift-people-ring-wrapper");

  const coverageCard = read("app/components/dashboard/ShiftCoverageCard.tsx");
  assert.ok(coverageCard.includes("roster-avatar-ring-wrapper"), "Overview Roster Tim panel renders .roster-avatar-ring-wrapper");
  assert.ok(coverageCard.includes("roster-avatar-status-badge"), "Overview Roster Tim panel renders .roster-avatar-status-badge");

  const rosterCoverage = read("app/components/team/RosterShiftCoverage.tsx");
  assert.ok(rosterCoverage.includes("coverage-avatar-ring-wrapper"), "RosterShiftCoverage.tsx wraps avatars with .coverage-avatar-ring-wrapper");
  assert.ok(rosterCoverage.includes("roster-avatar-status-badge"), "RosterShiftCoverage.tsx includes the status badge");

  const layoutCss = read("app/styles/tailwind/layout.css");
  assert.ok(layoutCss.includes("profile-avatar-ring-wrapper"), "layout.css styles the ring wrappers");
  assert.ok(!layoutCss.includes("inset: -1.5px"), "layout.css no longer uses fractional inset: -1.5px that caused subpixel ring skewing");
});

test("Team Roster shows the same ring and dot in the table, the calendar and the detail panel, for the person really logged in", () => {
  const avatar = read("app/components/team/MemberAvatar.tsx");
  assert.ok(avatar.includes("ring-wrapper") && avatar.includes("data-member-dot"));
  for (const file of ["RosterTable", "RosterCalendarView", "MemberDetailDrawer"]) {
    const source = read(`app/components/team/${file}.tsx`);
    assert.ok(source.includes("<MemberAvatar"), `${file} uses the shared avatar`);
    assert.ok(!source.toLowerCase().includes('includes("galih")'), `${file} does not decide who is logged in from a name`);
    assert.ok(!source.includes("statusRing="), `${file} has no second kind of ring`);
  }
});
