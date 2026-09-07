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

  // Dimas Anggoro is on Shift Pagi -> must be Active
  const dimas = seedRosterMembers.find((m) => m.name === "Dimas Anggoro");
  assert.ok(dimas, "Dimas Anggoro exists in roster");
  assert.equal(getDerivedMemberStatus(dimas, activeShift), "Active");

  // Sarah Wijaya is on Shift Pagi -> must be Active
  const sarah = seedRosterMembers.find((m) => m.name === "Sarah Wijaya");
  assert.ok(sarah, "Sarah Wijaya exists in roster");
  assert.equal(getDerivedMemberStatus(sarah, activeShift), "Active");

  // Galih Khairi is on Shift Malam -> must be Off Duty
  const galih = seedRosterMembers.find((m) => m.name === "Galih Khairi");
  assert.ok(galih, "Galih Khairi exists in roster");
  assert.equal(getDerivedMemberStatus(galih, activeShift), "Off Duty");

  // Pangondion Kurniawan is on Shift Malam -> must be Off Duty
  const pangondion = seedRosterMembers.find((m) => m.name === "Pangondion Kurniawan");
  assert.ok(pangondion, "Pangondion Kurniawan exists in roster");
  assert.equal(getDerivedMemberStatus(pangondion, activeShift), "Off Duty");

  // Bagas Pratama is on Shift Subuh -> must be Off Duty
  const bagas = seedRosterMembers.find((m) => m.name === "Bagas Pratama");
  assert.ok(bagas, "Bagas Pratama exists in roster");
  assert.equal(getDerivedMemberStatus(bagas, activeShift), "Off Duty");

  // Annisa Rahmawati is On Leave -> must remain On Leave
  const annisa = seedRosterMembers.find((m) => m.name === "Annisa Rahmawati");
  assert.ok(annisa, "Annisa Rahmawati exists in roster");
  assert.equal(getDerivedMemberStatus(annisa, activeShift), "On Leave");
});

test("Staff shift status during Shift Malam (e.g. 18:00 WIB)", () => {
  const activeShift = shiftDefinitions.malam;

  // Galih Khairi is on Shift Malam -> must be Active
  const galih = seedRosterMembers.find((m) => m.name === "Galih Khairi");
  assert.equal(getDerivedMemberStatus(galih, activeShift), "Active");

  // Pangondion Kurniawan is on Shift Malam -> must be Active
  const pangondion = seedRosterMembers.find((m) => m.name === "Pangondion Kurniawan");
  assert.equal(getDerivedMemberStatus(pangondion, activeShift), "Active");

  // Kurnia Meidiyansyah is on Shift Malam -> must be Active
  const kurnia = seedRosterMembers.find((m) => m.name === "Kurnia Meidiyansyah");
  assert.equal(getDerivedMemberStatus(kurnia, activeShift), "Active");

  // Muhammad Iqbal is on Shift Malam with manual status On Break -> must remain On Break
  const iqbal = seedRosterMembers.find((m) => m.name === "Muhammad Iqbal");
  assert.equal(getDerivedMemberStatus(iqbal, activeShift), "On Break");

  // Dimas Anggoro is on Shift Pagi -> must be Off Duty
  const dimas = seedRosterMembers.find((m) => m.name === "Dimas Anggoro");
  assert.equal(getDerivedMemberStatus(dimas, activeShift), "Off Duty");

  // Sarah Wijaya is on Shift Pagi -> must be Off Duty
  const sarah = seedRosterMembers.find((m) => m.name === "Sarah Wijaya");
  assert.equal(getDerivedMemberStatus(sarah, activeShift), "Off Duty");

  // Bagas Pratama is on Shift Subuh -> must be Off Duty
  const bagas = seedRosterMembers.find((m) => m.name === "Bagas Pratama");
  assert.equal(getDerivedMemberStatus(bagas, activeShift), "Off Duty");

  // Annisa Rahmawati is On Leave -> must remain On Leave
  const annisa = seedRosterMembers.find((m) => m.name === "Annisa Rahmawati");
  assert.equal(getDerivedMemberStatus(annisa, activeShift), "On Leave");
});

test("Staff shift status during Shift Subuh (e.g. 04:00 WIB)", () => {
  const activeShift = shiftDefinitions.subuh;

  // Bagas Pratama is on Shift Subuh -> must be Active
  const bagas = seedRosterMembers.find((m) => m.name === "Bagas Pratama");
  assert.equal(getDerivedMemberStatus(bagas, activeShift), "Active");

  // Dimas Anggoro is on Shift Pagi -> must be Off Duty
  const dimas = seedRosterMembers.find((m) => m.name === "Dimas Anggoro");
  assert.equal(getDerivedMemberStatus(dimas, activeShift), "Off Duty");

  // Galih Khairi is on Shift Malam -> must be Off Duty
  const galih = seedRosterMembers.find((m) => m.name === "Galih Khairi");
  assert.equal(getDerivedMemberStatus(galih, activeShift), "Off Duty");

  // Annisa Rahmawati is On Leave -> must remain On Leave
  const annisa = seedRosterMembers.find((m) => m.name === "Annisa Rahmawati");
  assert.equal(getDerivedMemberStatus(annisa, activeShift), "On Leave");
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
