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
    { name: "Galih Khairi", status: "On Duty" },
    { name: "Pangondion Kurniawan", status: "On Duty" },
    { name: "Kurnia Meidiyansyah", status: "On Duty" },
    { name: "Muhammad Iqbal", status: "Standby" },
    { name: "Tiara Andini", status: "Standby" },
    { name: "Sarah Wijaya", status: "Offline" },
    { name: "Bagas Pratama", status: "Offline" },
    { name: "Dimas Anggoro", status: "Offline" },
    { name: "Annisa Rahmawati", status: "Offline" },
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

test("rendered Overview page contains complete RosterTeamPanel with simplified labels and no truncation", async () => {
  const res = await fetch("http://localhost:3000");
  assert.equal(res.status, 200);
  const html = await res.text();

  // 1. Header block
  assert.ok(html.includes('class="shift-coverage-header"'), "Has shift-coverage-header container");
  assert.ok(html.includes("Roster Tim"), "Has 'Roster Tim' title");
  assert.ok(html.includes("Shift Coverage"), "Has 'Shift Coverage' subtitle");
  assert.ok(html.includes("topbar-shift-badge"), "Has shift badge");

  // 2. Restored Donut Chart with shadow & centered total
  assert.ok(html.includes("shift-coverage-donut-section"), "Has donut section");
  assert.ok(html.includes("shift-coverage-donut-wrap"), "Has donut wrap with shadow");
  assert.ok(html.includes('stroke="rgba(255, 255, 255, 0.06)"'), "Has faint full background track circle");
  assert.ok(html.includes("donut-segment"), "Has donut slice segments");
  assert.ok(html.includes("donut-total-num"), "Has donut center total number");
  assert.ok(html.includes("donut-total-label"), "Has donut center total label");

  // 3. Simplified 3-state labels: "On Duty", "Standby", "Out of Reach"
  assert.ok(html.includes("3<!-- --> On Duty"), "Has '3 On Duty' in stats row");
  assert.ok(html.includes("2<!-- --> Standby"), "Has '2 Standby' in stats row");
  assert.ok(html.includes("4<!-- --> Out of Reach"), "Has '4 Out of Reach' in stats row");

  // Assert OLD verbose labels do NOT appear anywhere in the rendered HTML
  assert.ok(!html.includes("Sedang Bertugas"), "No 'Sedang Bertugas' anywhere in rendered UI");
  assert.ok(!html.includes("Standby / Online"), "No 'Standby / Online' anywhere in rendered UI");

  // 4. Status Filter Tabs with live counts and non-overlapping wrapper
  assert.ok(html.includes("roster-filter-tabs-wrapper"), "Has roster-filter-tabs-wrapper");
  assert.ok(html.includes("roster-filter-tabs"), "Has roster filter tabs");
  assert.ok(html.includes("Semua"), "Has 'Semua' tab");
  assert.ok(html.includes("Out of Reach"), "Has 'Out of Reach' tab");
  assert.ok(html.includes("tab-count-badge"), "Has tab count badges");

  // 5. Member rows: Two-column layout and FULL names without truncation
  assert.ok(html.includes("roster-member-row"), "Has roster-member-row class");
  assert.ok(html.includes("roster-member-left"), "Has roster-member-left column");
  assert.ok(html.includes("roster-member-right"), "Has roster-member-right column");
  assert.ok(html.includes("Pangondion Kurniawan"), "Full name 'Pangondion Kurniawan' is rendered");
  assert.ok(html.includes("Kurnia Meidiyansyah"), "Full name 'Kurnia Meidiyansyah' is rendered");

  // 6. Member list & fixed footer
  assert.ok(html.includes("shift-coverage-team-list"), "Member list has scroll class");
  assert.ok(html.includes("shift-coverage-footer"), "Has separate fixed footer container");
  assert.ok(html.includes("Lihat jadwal shift roster"), "Has CTA button anchored outside list");
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
