/**
 * Configuration for timeline fields (start, response, completion) customized
 * by ticket category (Incident, Activity, Maintenance, Ad-hoc, etc.).
 */

export interface TimelineConfig {
  badgeTitle: string;
  badgeSub: string;
  fieldCount: 2 | 3;
  firstLabel: string;
  firstHint: string;
  secondLabel?: string;
  secondHint?: string;
  completionLabel: string;
}

export function getTimelineConfig(categoryName?: string): TimelineConfig {
  const norm = (categoryName || "").toLowerCase().trim();

  // 1. Ad-hoc Request: 3 fields (Request, Response, Completion)
  if (norm.includes("ad-hoc") || norm.includes("adhoc")) {
    return {
      badgeTitle: "Timeline Permintaan Ad-hoc",
      badgeSub: "Waktu masuk, respon, dan estimasi selesai pekerjaan.",
      fieldCount: 3,
      firstLabel: "REQUEST TIME",
      firstHint: "Waktu masuk permintaan",
      secondLabel: "RESPONSE TIME",
      secondHint: "Waktu respon awal",
      completionLabel: "COMPLETION TIME",
    };
  }

  // 2. Incident & Issue Handling / Incident: 2 fields (Penemuan Masalah, Selesai Mengatasinya)
  if (norm.includes("incident") || norm.includes("gangguan") || norm.includes("issue")) {
    return {
      badgeTitle: "Timeline Penanganan Insiden",
      badgeSub: "Waktu penemuan masalah dan penyelesaian penanganan insiden.",
      fieldCount: 2,
      firstLabel: "PENEMUAN MASALAH",
      firstHint: "Waktu masalah pertama kali ditemukan",
      completionLabel: "SELESAI MENGATASINYA",
    };
  }

  // 3. Activity / Daily Activity: 2 fields (Mulai Activity, Selesai Activity)
  if (norm.includes("activity") || norm.includes("aktivitas") || norm.includes("harian")) {
    return {
      badgeTitle: "Timeline Aktivitas Operasional",
      badgeSub: "Waktu mulai pelaksanaan dan selesai aktivitas.",
      fieldCount: 2,
      firstLabel: "MULAI AKTIVITAS",
      firstHint: "Waktu pelaksanaan aktivitas dimulai",
      completionLabel: "SELESAI AKTIVITAS",
    };
  }

  // 4. Maintenance / Scheduled Maintenance: 2 fields (Mulai Maintenance, Selesai Maintenance)
  if (norm.includes("maintenance") || norm.includes("pemeliharaan")) {
    return {
      badgeTitle: "Timeline Pemeliharaan Sistem",
      badgeSub: "Waktu mulai pekerjaan dan selesai maintenance.",
      fieldCount: 2,
      firstLabel: "MULAI MAINTENANCE",
      firstHint: "Waktu pemeliharaan sistem dimulai",
      completionLabel: "SELESAI MAINTENANCE",
    };
  }

  // 5. Change Request / Validate Process Flow: 2 fields (Mulai Validasi, Selesai Validasi)
  if (norm.includes("change") || norm.includes("validate") || norm.includes("flow") || norm.includes("e2e")) {
    return {
      badgeTitle: "Timeline Validasi & Perubahan",
      badgeSub: "Waktu mulai eksekusi dan selesai pengujian/validasi.",
      fieldCount: 2,
      firstLabel: "MULAI VALIDASI",
      firstHint: "Waktu mulai eksekusi/validasi alur",
      completionLabel: "SELESAI VALIDASI",
    };
  }

  // 6. Monitoring / Alert: 2 fields (Waktu Deteksi, Selesai Normalisasi)
  if (norm.includes("monitoring") || norm.includes("alert")) {
    return {
      badgeTitle: "Timeline Monitoring & Alert",
      badgeSub: "Waktu alert terdeteksi dan selesai normalisasi.",
      fieldCount: 2,
      firstLabel: "WAKTU DETEKSI",
      firstHint: "Waktu anomali atau alert terdeteksi",
      completionLabel: "SELESAI NORMALISASI",
    };
  }

  // 7. Escalation / Escalation Handling: 2 fields (Waktu Eskalasi, Selesai Penanganan)
  if (norm.includes("escalat") || norm.includes("eskalasi")) {
    return {
      badgeTitle: "Timeline Eskalasi",
      badgeSub: "Waktu eskalasi diajukan dan selesai penanganan.",
      fieldCount: 2,
      firstLabel: "WAKTU ESKALASI",
      firstHint: "Waktu tiket mulai dieskalasikan",
      completionLabel: "SELESAI PENANGANAN",
    };
  }

  // 8. Knowledge Management & Documentation: 2 fields (Mulai Dokumentasi, Selesai Dokumentasi)
  if (norm.includes("knowledge") || norm.includes("document") || norm.includes("dokumen")) {
    return {
      badgeTitle: "Timeline Dokumentasi",
      badgeSub: "Waktu mulai penyusunan dan selesai dokumentasi.",
      fieldCount: 2,
      firstLabel: "MULAI DOKUMENTASI",
      firstHint: "Waktu penyusunan dokumen dimulai",
      completionLabel: "SELESAI DOKUMENTASI",
    };
  }

  // 9. Default Fallback: 2 fields (Waktu Mulai, Waktu Selesai)
  return {
    badgeTitle: "Timeline Pekerjaan",
    badgeSub: "Waktu mulai pekerjaan dan selesai penanganan.",
    fieldCount: 2,
    firstLabel: "WAKTU MULAI",
    firstHint: "Waktu pelaksanaan pekerjaan dimulai",
    completionLabel: "WAKTU SELESAI",
  };
}

