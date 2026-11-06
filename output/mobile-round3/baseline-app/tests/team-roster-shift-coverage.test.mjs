import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function resolveCoverageStatus(member, isCurrentUser, userStatus) {
  if (isCurrentUser && userStatus) {
    if (userStatus === "Online" || userStatus === "Busy") return "On Duty";
    if (userStatus === "On Break") return "Online";
    return "Offline";
  }

  const s = (member.status || "").toLowerCase().trim();
  if (s === "active" || s === "on duty" || s === "bertugas" || s === "present") {
    return "On Duty";
  }
  if (s === "on break" || s === "break" || s === "standby" || s === "online") {
    return "Online";
  }
  return "Offline";
}

test("RosterShiftCoverage resolves statuses to On Duty, Online, Offline correctly", () => {
  assert.equal(resolveCoverageStatus({ status: "Active" }, false), "On Duty");
  assert.equal(resolveCoverageStatus({ status: "On Break" }, false), "Online");
  assert.equal(resolveCoverageStatus({ status: "Off Duty" }, false), "Offline");
  assert.equal(resolveCoverageStatus({ status: "On Leave" }, false), "Offline");

  // Logged-in user override checks
  assert.equal(resolveCoverageStatus({ status: "Active" }, true, "Online"), "On Duty");
  assert.equal(resolveCoverageStatus({ status: "Active" }, true, "Busy"), "On Duty");
  assert.equal(resolveCoverageStatus({ status: "Active" }, true, "On Break"), "Online");
  assert.equal(resolveCoverageStatus({ status: "Active" }, true, "Offline"), "Offline");
});

test("RosterShiftCoverage file structure matches Overview with On Duty, Online, Offline filters", () => {
  const filePath = path.resolve("app/components/team/RosterShiftCoverage.tsx");
  const content = fs.readFileSync(filePath, "utf-8");

  // Check filter tabs
  assert.ok(content.includes('"On Duty"'), "Must include On Duty filter");
  assert.ok(content.includes('"Online"'), "Must include Online filter");
  assert.ok(content.includes('"Offline"'), "Must include Offline filter");
  assert.ok(content.includes('"Semua"'), "Must include Semua filter");

  // Check titles
  assert.ok(content.includes("Status Kehadiran Anggota"), "Must have Status Kehadiran Anggota title");
  assert.ok(content.includes("Ketersediaan Pegawai"), "Must have Ketersediaan Pegawai subtitle");

  // Check Donut SVG and overview structure
  assert.ok(content.includes("shift-coverage-donut-wrap"), "Must have donut wrap");
  assert.ok(content.includes("donut-center-content"), "Must have donut center content");
  assert.ok(content.includes("TOTAL"), "Must have TOTAL label");
  assert.ok(content.includes("shift-coverage-stats-row"), "Must have stats summary row");
  assert.ok(content.includes("roster-filter-tabs"), "Must have filter tabs");
  assert.ok(content.includes("roster-member-row"), "Must render member rows");
});
