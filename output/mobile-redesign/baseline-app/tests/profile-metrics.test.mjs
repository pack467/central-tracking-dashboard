import test from "node:test";
import assert from "node:assert/strict";

test("Profile page renders updated all-time operational metrics and summary grid", async () => {
  const res = await fetch("http://localhost:3000/profile");
  assert.equal(res.status, 200);
  const html = await res.text();

  // 1. Header & Subtitle of the section
  assert.ok(html.includes("Aktivitas Operasional Terbaru"), "Contains section title 'Aktivitas Operasional Terbaru'");
  assert.ok(
    html.includes("Referensi catatan kontribusi pribadi (bukan pemeringkatan)"),
    "Contains clarifying subtitle 'Referensi catatan kontribusi pribadi (bukan pemeringkatan)'"
  );

  // 2. Primary 4-card row: All-time Total Tiket
  assert.ok(
    html.includes("Total Tiket"),
    "Has 'Total Tiket' (updated from monthly to all-time)"
  );
  assert.ok(
    !html.includes("Tiket Ditangani (Bulan Ini)"),
    "Does NOT contain old monthly label 'Tiket Ditangani (Bulan Ini)'"
  );
  assert.ok(html.includes("341"), "Reflects all-time ticket count (341)");

  // 3. Preserved cards: Serah Terima & Ketepatan Waktu
  assert.ok(html.includes("142"), "Preserves 142 handover count");
  assert.ok(html.includes("Serah Terima Diselesaikan"), "Has 'Serah Terima Diselesaikan'");
  assert.ok(html.includes("98.5%"), "Preserves 98.5% on-time rate");
  assert.ok(html.includes("Ketepatan Waktu Shift (On-Time)"), "Has 'Ketepatan Waktu Shift (On-Time)'");

  // 4. 4th card: New SLA Metric
  assert.ok(html.includes("Kepatuhan SLA Tiket"), "Has new 4th card 'Kepatuhan SLA Tiket'");
  assert.ok(html.includes("98.2%"), "Has SLA compliance rate 98.2%");

  // 5. Additional Operational Summary Metrics Grid (Replaces Activity Log)
  assert.ok(html.includes("profile-metrics-grid"), "Has .profile-metrics-grid container");
  assert.ok(html.includes("Checkpoint Dievaluasi"), "Has 'Checkpoint Dievaluasi' metric");
  assert.ok(html.includes("312"), "Has '312' checkpoints evaluated");

  assert.ok(html.includes("Total Eskalasi"), "Has 'Total Eskalasi' metric");
  assert.ok(html.includes("9"), "Has '9' escalations handled");

  assert.ok(html.includes("Total Temuan"), "Has 'Total Temuan' metric");
  assert.ok(html.includes("5"), "Has '5' findings recorded");

  assert.ok(html.includes("Rata-rata Respon Tiket"), "Has 'Rata-rata Respon Tiket' metric");
  assert.ok(html.includes("8.4m"), "Has '8.4m' average response time");

  // 6. Additional Grid 2: Shift Hours & Overall Operational Activity
  assert.ok(html.includes("Total Jam Shift"), "Has 'Total Jam Shift' metric");
  assert.ok(html.includes("1.184 Jam"), "Has '1.184 Jam' shift hours");

  assert.ok(html.includes("Jam Kerja di Luar Shift"), "Has 'Jam Kerja di Luar Shift' metric");
  assert.ok(html.includes("46.5 Jam"), "Has '46.5 Jam' overtime hours");

  assert.ok(html.includes("Tugas Diselesaikan"), "Has 'Tugas Diselesaikan' metric");
  assert.ok(html.includes("512"), "Has '512' completed tasks");

  assert.ok(html.includes("Total Activity"), "Has 'Total Activity' metric");
  assert.ok(html.includes("864"), "Has '864' total activities");

  // 7. Chronological log entries are replaced and no longer rendered
  assert.ok(
    !html.includes("Serah Terima Shift Subuh → Pagi selesai divalidasi"),
    "Old timeline log entry 1 is removed"
  );
  assert.ok(
    !html.includes("Menutup tiket #86d40dm01: [DM] Polling SNMP Over-Threshold"),
    "Old timeline log entry 2 is removed"
  );
  assert.ok(
    !html.includes("Eskalasi tiket #86d40usc1 [USIEM] Latency Spike ke Tier-2 SIEM"),
    "Old timeline log entry 3 is removed"
  );
  assert.ok(
    !html.includes("15/15 Checkpoint Monitoring Tritronik Shift Subuh dievaluasi"),
    "Old timeline log entry 4 is removed"
  );
});
