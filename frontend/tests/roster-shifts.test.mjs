import assert from "node:assert/strict";
import test from "node:test";
import { getShiftInfoForMinutes, getDerivedMemberStatus, isShiftActiveForMember, shiftDefinitions } from "../app/lib/shifts.ts";
import { seedRosterMembers } from "../app/lib/data.ts";

test("Shift determination across 24-hour cycle", () => {
  // Subuh: 00:00 - 08:00 (active precedence)
  assert.equal(getShiftInfoForMinutes(0).id, "subuh");
  assert.equal(getShiftInfoForMinutes(3 * 60).id, "subuh");
  assert.equal(getShiftInfoForMinutes(7 * 60 + 59).id, "subuh");

  // Pagi: 08:00 - 16:00 (active precedence)
  assert.equal(getShiftInfoForMinutes(8 * 60).id, "pagi");
  assert.equal(getShiftInfoForMinutes(15 * 60 + 19).id, "pagi"); // User's observed time 15:19 WIB
  assert.equal(getShiftInfoForMinutes(15 * 60 + 59).id, "pagi");

  // Malam: 16:00 - 24:00 (active precedence)
  assert.equal(getShiftInfoForMinutes(16 * 60).id, "malam");
  assert.equal(getShiftInfoForMinutes(20 * 60).id, "malam");
  assert.equal(getShiftInfoForMinutes(23 * 60 + 59).id, "malam");
});

test("Staff shift status during Shift Pagi (e.g. 15:19 WIB)", () => {
  const activeShift = shiftDefinitions.pagi;

  // Tahan Julianus Nadeak is on Shift Pagi -> must be Active
  const tahan = seedRosterMembers.find((m) => m.name === "Tahan Julianus Nadeak");
  assert.ok(tahan, "Tahan Julianus Nadeak exists in roster");
  assert.equal(getDerivedMemberStatus(tahan, activeShift), "Active");

  // Agnes Siahaan is on Shift Pagi -> must be Active
  const agnes = seedRosterMembers.find((m) => m.name === "Agnes Siahaan");
  assert.ok(agnes, "Agnes Siahaan exists in roster");
  assert.equal(getDerivedMemberStatus(agnes, activeShift), "Active");

  // Mhd. Galih Khairi is on Shift Malam -> must be Off Duty
  const galih = seedRosterMembers.find((m) => m.name === "Mhd. Galih Khairi");
  assert.ok(galih, "Mhd. Galih Khairi exists in roster");
  assert.equal(getDerivedMemberStatus(galih, activeShift), "Off Duty");

  // Pangondion Kurniawan Naibaho is on Shift Malam -> must be Off Duty
  const pangondion = seedRosterMembers.find((m) => m.name === "Pangondion Kurniawan Naibaho");
  assert.ok(pangondion, "Pangondion Kurniawan Naibaho exists in roster");
  assert.equal(getDerivedMemberStatus(pangondion, activeShift), "Off Duty");

  // Natanael Tambun is on Shift Subuh -> must be Off Duty
  const natanael = seedRosterMembers.find((m) => m.name === "Natanael Tambun");
  assert.ok(natanael, "Natanael Tambun exists in roster");
  assert.equal(getDerivedMemberStatus(natanael, activeShift), "Off Duty");

  // Tennov Pakpahan is On Leave -> must remain On Leave
  const tennov = seedRosterMembers.find((m) => m.name === "Tennov Pakpahan");
  assert.ok(tennov, "Tennov Pakpahan exists in roster");
  assert.equal(getDerivedMemberStatus(tennov, activeShift), "On Leave");
});

test("Staff shift status during Shift Malam (e.g. 18:00 WIB)", () => {
  const activeShift = shiftDefinitions.malam;

  // Mhd. Galih Khairi is on Shift Malam -> must be Active
  const galih = seedRosterMembers.find((m) => m.name === "Mhd. Galih Khairi");
  assert.equal(getDerivedMemberStatus(galih, activeShift), "Active");

  // Pangondion Kurniawan Naibaho is on Shift Malam -> must be Active
  const pangondion = seedRosterMembers.find((m) => m.name === "Pangondion Kurniawan Naibaho");
  assert.equal(getDerivedMemberStatus(pangondion, activeShift), "Active");

  // Muhammad Ihsanul Arifin is on Shift Malam -> must be Active
  const ihsanul = seedRosterMembers.find((m) => m.name === "Muhammad Ihsanul Arifin");
  assert.equal(getDerivedMemberStatus(ihsanul, activeShift), "Active");

  // Kristina Marbun is on Shift Malam with manual status On Break -> must remain On Break
  const kristina = seedRosterMembers.find((m) => m.name === "Kristina Marbun");
  assert.equal(getDerivedMemberStatus(kristina, activeShift), "On Break");

  // Tahan Julianus Nadeak is on Shift Pagi -> must be Off Duty
  const tahan = seedRosterMembers.find((m) => m.name === "Tahan Julianus Nadeak");
  assert.equal(getDerivedMemberStatus(tahan, activeShift), "Off Duty");

  // Agnes Siahaan is on Shift Pagi -> must be Off Duty
  const agnes = seedRosterMembers.find((m) => m.name === "Agnes Siahaan");
  assert.equal(getDerivedMemberStatus(agnes, activeShift), "Off Duty");

  // Natanael Tambun is on Shift Subuh -> must be Off Duty
  const natanael = seedRosterMembers.find((m) => m.name === "Natanael Tambun");
  assert.equal(getDerivedMemberStatus(natanael, activeShift), "Off Duty");

  // Tennov Pakpahan is On Leave -> must remain On Leave
  const tennov = seedRosterMembers.find((m) => m.name === "Tennov Pakpahan");
  assert.equal(getDerivedMemberStatus(tennov, activeShift), "On Leave");
});

test("Staff shift status during Shift Subuh (e.g. 04:00 WIB)", () => {
  const activeShift = shiftDefinitions.subuh;

  // Natanael Tambun is on Shift Subuh -> must be Active
  const natanael = seedRosterMembers.find((m) => m.name === "Natanael Tambun");
  assert.equal(getDerivedMemberStatus(natanael, activeShift), "Active");

  // Tahan Julianus Nadeak is on Shift Pagi -> must be Off Duty
  const tahan = seedRosterMembers.find((m) => m.name === "Tahan Julianus Nadeak");
  assert.equal(getDerivedMemberStatus(tahan, activeShift), "Off Duty");

  // Mhd. Galih Khairi is on Shift Malam -> must be Off Duty
  const galih = seedRosterMembers.find((m) => m.name === "Mhd. Galih Khairi");
  assert.equal(getDerivedMemberStatus(galih, activeShift), "Off Duty");

  // Tennov Pakpahan is On Leave -> must remain On Leave
  const tennov = seedRosterMembers.find((m) => m.name === "Tennov Pakpahan");
  assert.equal(getDerivedMemberStatus(tennov, activeShift), "On Leave");
});

test("Manual status overrides are respected", () => {
  const activeShift = shiftDefinitions.pagi;

  // Member assigned to Shift Pagi but manually marked On Leave -> must stay On Leave
  const manualLeaveMember = {
    currentShift: "Shift Pagi (08:00–16:30 WIB)",
    status: "On Leave",
  };
  assert.equal(getDerivedMemberStatus(manualLeaveMember, activeShift), "On Leave");

  // Member assigned to Shift Pagi but manually marked On Break -> must stay On Break during active shift
  const manualBreakMember = {
    currentShift: "Shift Pagi (08:00–16:30 WIB)",
    status: "On Break",
  };
  assert.equal(getDerivedMemberStatus(manualBreakMember, activeShift), "On Break");

  // If shift is NOT active, a previously On Break member becomes Off Duty
  assert.equal(getDerivedMemberStatus(manualBreakMember, shiftDefinitions.malam), "Off Duty");
});
