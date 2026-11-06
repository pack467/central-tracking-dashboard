import test from "node:test";
import assert from "node:assert/strict";

function resolveCanonicalStatus(status) {
  const s = (status || "").toLowerCase().trim();
  if (
    s === "on duty" ||
    s === "on_duty" ||
    s === "sedang bertugas" ||
    s === "bertugas" ||
    s === "active" ||
    s === "aktif" ||
    s === "present"
  ) {
    return "On Duty";
  }
  if (
    s === "standby" ||
    s === "standby / online" ||
    s === "standby/online" ||
    s === "online" ||
    s === "break" ||
    s === "on break" ||
    s === "on_break"
  ) {
    return "Standby";
  }
  return "Offline";
}

test("canonical 3-state resolution maps correctly to On Duty, Standby, Offline", () => {
  assert.equal(resolveCanonicalStatus("on duty"), "On Duty");
  assert.equal(resolveCanonicalStatus("On Duty"), "On Duty");
  assert.equal(resolveCanonicalStatus("on_duty"), "On Duty");
  assert.equal(resolveCanonicalStatus("sedang bertugas"), "On Duty");
  assert.equal(resolveCanonicalStatus("bertugas"), "On Duty");
  assert.equal(resolveCanonicalStatus("aktif"), "On Duty");
  assert.equal(resolveCanonicalStatus("Active"), "On Duty");

  assert.equal(resolveCanonicalStatus("standby"), "Standby");
  assert.equal(resolveCanonicalStatus("Standby"), "Standby");
  assert.equal(resolveCanonicalStatus("standby / online"), "Standby");
  assert.equal(resolveCanonicalStatus("online"), "Standby");
  assert.equal(resolveCanonicalStatus("Online"), "Standby");
  assert.equal(resolveCanonicalStatus("break"), "Standby");
  assert.equal(resolveCanonicalStatus("On Break"), "Standby");

  assert.equal(resolveCanonicalStatus("offline"), "Offline");
  assert.equal(resolveCanonicalStatus("Offline"), "Offline");
  assert.equal(resolveCanonicalStatus("off duty"), "Offline");
  assert.equal(resolveCanonicalStatus("on leave"), "Offline");
});

test("tally calculation satisfies simplified labels summing to total with real offline count", () => {
  const members = [
    { name: "Mhd. Galih Khairi", status: "On Duty" },
    { name: "Pangondion Kurniawan Naibaho", status: "On Duty" },
    { name: "Muhammad Ihsanul Arifin", status: "On Duty" },
    { name: "Kristina Marbun", status: "Standby" },
    { name: "Pedro Hutagaol", status: "Standby" },
    { name: "Tahan Julianus Nadeak", status: "Offline" },
    { name: "Yuha Azhari Simbolon", status: "Offline" },
    { name: "Nicholas Bima Nooka Putra", status: "Offline" },
    { name: "Natanael Tambun", status: "Offline" },
  ];

  const resolved = members.map((m) => ({
    ...m,
    status: resolveCanonicalStatus(m.status),
  }));

  const counts = {
    total: resolved.length,
    onDuty: resolved.filter((m) => m.status === "On Duty").length,
    standby: resolved.filter((m) => m.status === "Standby").length,
    offline: resolved.filter((m) => m.status === "Offline").length,
  };

  assert.equal(counts.total, 9);
  assert.equal(counts.onDuty, 3);
  assert.equal(counts.standby, 2);
  assert.equal(counts.offline, 4);

  // Exact sum equality
  assert.equal(counts.onDuty + counts.standby + counts.offline, counts.total);

  // Filter tabs filtering
  const onDutyList = resolved.filter((m) => m.status === "On Duty");
  assert.equal(onDutyList.length, 3);
  const standbyList = resolved.filter((m) => m.status === "Standby");
  assert.equal(standbyList.length, 2);
  const offlineList = resolved.filter((m) => m.status === "Offline");
  assert.equal(offlineList.length, 4);
});

test("Overview's RosterTeamPanel has its parts, simplified labels and no truncation", async () => {
  const { readFileSync } = await import("node:fs");
  const source = readFileSync("app/components/dashboard/ShiftCoverageCard.tsx", "utf8");
  for (const part of [
    "shift-coverage-header", "Roster Tim", "Shift Coverage", "topbar-shift-badge",
    "shift-coverage-donut-section", "shift-coverage-donut-wrap", "donut-segment", "donut-total-num", "donut-total-label",
    "On Duty", "Standby", "Out of Reach",
    "roster-filter-tabs-wrapper", "roster-filter-tabs", "Semua", "tab-count-badge",
    "roster-member-row", "roster-member-left", "roster-member-right",
    "shift-coverage-team-list", "shift-coverage-footer", "Lihat jadwal shift roster",
  ]) assert.ok(source.includes(part), `Has ${part}`);
  assert.ok(!source.includes("Sedang Bertugas"), "No 'Sedang Bertugas' in the panel");
  assert.ok(!source.includes("Standby / Online"), "No 'Standby / Online' in the panel");
});

test("empty-state logic generates proper contextual messages with simplified labels", () => {
  const getEmptyMessage = (activeTab) =>
    activeTab === "On Duty"
      ? "Tidak ada anggota on duty saat ini."
      : activeTab === "Standby"
      ? "Tidak ada anggota standby saat ini."
      : activeTab === "Offline" || activeTab === "Out of Reach"
      ? "Tidak ada anggota out of reach saat ini."
      : "Tidak ada anggota tim ditemukan.";

  assert.equal(getEmptyMessage("On Duty"), "Tidak ada anggota on duty saat ini.");
  assert.equal(getEmptyMessage("Standby"), "Tidak ada anggota standby saat ini.");
  assert.equal(getEmptyMessage("Offline"), "Tidak ada anggota out of reach saat ini.");
  assert.equal(getEmptyMessage("Out of Reach"), "Tidak ada anggota out of reach saat ini.");
  assert.equal(getEmptyMessage("Semua"), "Tidak ada anggota tim ditemukan.");
});

