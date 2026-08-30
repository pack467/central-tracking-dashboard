import type {
  HandoverDraft,
  HandoverRecordData,
  HandoverTask,
  MonitoringEntry,
  ProjectHealthEntry,
  RosterMember,
  ShiftSwapRequest,
  Ticket,
} from "./types";

export const projects: ProjectHealthEntry[] = [
  { name: "SM", status: "Needs Attention", detail: "1 pengecualian", tone: "warning" },
  { name: "B2B", status: "Needs Attention", detail: "Pemeriksaan Kafka", tone: "warning" },
  { name: "USIEM", status: "Healthy", detail: "Semua pemeriksaan lulus", tone: "success" },
  { name: "MB", status: "Healthy", detail: "Semua pemeriksaan lulus", tone: "success" },
  { name: "EPC", status: "Healthy", detail: "Semua pemeriksaan lulus", tone: "success" },
  { name: "DM", status: "Healthy", detail: "Semua pemeriksaan lulus", tone: "success" },
  { name: "UNEM", status: "Healthy", detail: "Semua pemeriksaan lulus", tone: "success" },
];

export const attentionItems = [
  {
    project: "SM",
    title: "Queue ActiveMQ 228 memerlukan validasi",
    note: "Penumpukan queue dilaporkan pada checkpoint 18:00. Belum ada konfirmasi dari penanggung jawab.",
    time: "4 jam lalu",
    tone: "warning" as const,
    tag: "Queue",
  },
  {
    project: "B2B",
    title: "Aliran pesan tidak ada pada topik b2b-f…",
    note: "Terdeteksi saat validasi Kafka UI. Periksa kesehatan producer sebelum checkpoint berikutnya.",
    time: "4 jam lalu",
    tone: "warning" as const,
    tag: "Kafka",
  },
  {
    project: "EPC Tools",
    title: "Satu permintaan ad-hoc masih berlangsung",
    note: "Tinjau tugas approval entities sebelum handover shift.",
    time: "1 jam lalu",
    tone: "info" as const,
    tag: "Ticket",
  },
];

export const monitoringSchedule: MonitoringEntry[] = [
  { time: "13:00", project: "EPC Core", task: "Status layanan Catalog & Order", owner: "Mhd. Galih Khairi", state: "Done", tone: "success" },
  { time: "14:00", project: "APH", task: "Output Rate & Consumer Rate per PoP", owner: "Kristina Marbun", state: "Done", tone: "success" },
  { time: "15:00", project: "DM", task: "Device quota LintasArta", owner: "Kristina Marbun", state: "Done", tone: "success" },
  { time: "16:00", project: "UNEM", task: "Layanan & alert Grafana", owner: "M. Ihsanul Arifin", state: "Done", tone: "success" },
  { time: "17:00", project: "SM/ActiveMQ", task: "Queue fulldecode smng109", owner: "M. Ihsanul Arifin", state: "Needs Attention", tone: "warning" },
  { time: "18:00", project: "B2B", task: "Disk usage /apps pv-bbsvsoe1", owner: "M. Ihsanul Arifin", state: "Needs Attention", tone: "warning" },
  { time: "19:00", project: "USIEM", task: "Graylog input SIEM stream", owner: "Agnes", state: "Done", tone: "success" },
  { time: "20:00", project: "MB", task: "Push notification queue", owner: "Agnes", state: "Done", tone: "success" },
  { time: "21:00", project: "B2B", task: "Traffic topik Kafka", owner: "M. Ihsanul Arifin", state: "Needs Attention", tone: "warning", overview: true },
  { time: "21:00", project: "DM", task: "Utilisasi CPU Grafana", owner: "M. Ihsanul Arifin", state: "Done", tone: "success", overview: true },
  { time: "22:00", project: "SM", task: "Queue ActiveMQ 228 · 71 · 68", owner: "M. Ihsanul Arifin", state: "Needs Attention", tone: "warning", overview: true },
  { time: "22:00", project: "USIEM", task: "Graylog & Dashboard SIEM", owner: "M. Ihsanul Arifin", state: "Done", tone: "success", overview: true },
  { time: "22:00", project: "EPC Core", task: "Status layanan Catalog", owner: "M. Ihsanul Arifin", state: "Done", tone: "success", overview: true },
  { time: "22:00", project: "UNEM", task: "Layanan & alert Grafana", owner: "M. Ihsanul Arifin", state: "Done", tone: "success", overview: true },
  { time: "23:00", project: "Handover", task: "Tinjauan kesiapan shift malam", owner: "Shift malam", state: "Upcoming", tone: "neutral", overview: true },
];

export const monitoringSystems = ["ActiveMQ", "Kafka", "Grafana", "Graylog", "Disk Usage"] as const;

export const seedTickets: Ticket[] = [
  {
    id: "86d4054rh",
    subject: "[EPC Tools] Tambah parameter baru untuk FMC",
    project: "EPC Tools",
    severity: "Low",
    owner: "Pangondion Kurniawan",
    status: "Active",
    created: "21:00",
    description: "Permintaan konfigurasi parameter ambang FMC tambahan untuk mesin validasi EPC.",
    history: [
      { time: "21:00", action: "Ticket dibuat oleh operator", author: "Pangondion Kurniawan" },
      { time: "21:15", action: "Status diperbarui menjadi Active", author: "Pangondion Kurniawan" },
    ],
  },
  {
    id: "86d40eqn1",
    subject: "[EPC Tools] Validasi approval entities",
    project: "EPC Tools",
    severity: "Low",
    owner: "Pangondion Kurniawan",
    status: "Closed",
    created: "20:08",
    description: "Validasi selesai untuk seluruh endpoint approval entities.",
    history: [
      { time: "20:08", action: "Ticket dibuat", author: "Pangondion Kurniawan" },
      { time: "20:45", action: "Masalah diselesaikan dan ditutup", author: "Pangondion Kurniawan" },
    ],
  },
  {
    id: "86d40cxuk",
    subject: "[SM] Transfer file buffer LTE",
    project: "SM",
    severity: "Low",
    owner: "Mhd. Galih Khairi",
    status: "Closed",
    created: "18:20",
    description: "File buffer log LTE ditransfer ke node arsip sekunder.",
    history: [
      { time: "18:20", action: "Ticket dibuat", author: "Mhd. Galih Khairi" },
      { time: "19:00", action: "Transfer selesai dan checksum tervalidasi", author: "Mhd. Galih Khairi" },
    ],
  },
  {
    id: "86d40b9yh",
    subject: "[USIEM] Restart gateway log SIEM",
    project: "USIEM",
    severity: "Low",
    owner: "Mhd. Galih Khairi",
    status: "Closed",
    created: "16:29",
    description: "Restart gateway rutin setelah akumulasi memori socket minor.",
    history: [{ time: "16:29", action: "Gateway berhasil di-restart", author: "Mhd. Galih Khairi" }],
  },
  {
    id: "86d40bebu",
    subject: "[MB] Kirim event notifikasi",
    project: "MB",
    severity: "Low",
    owner: "Mhd. Galih Khairi",
    status: "Closed",
    created: "16:21",
    description: "Laju queue pengiriman push notification mobile terverifikasi.",
    history: [{ time: "16:21", action: "Kondisi queue nominal terverifikasi", author: "Mhd. Galih Khairi" }],
  },
];

export const initialHandoverTasks: HandoverTask[] = [
  { id: 1, title: "Pemantauan Dump Automation EPC Tools", project: "EPC Tools", detail: "Perketat pemantauan Dump Automation. Pengecekan dapat menggunakan akun Teresa rosikin2011_x.", state: "repeat", completed: true },
  { id: 2, title: "Pengecekan Email L2 Support di akhir shift", project: "L2", detail: "Pastikan seluruh folder sudah dibaca dan tidak ada request yang terlewat.", state: "repeat", completed: true },
  { id: 3, title: "Monitoring penumpukan fulldecode SM", project: "SM", detail: "Pantau queue fulldecode pada ActiveMQ 228 dan direktori output smng109.", state: "repeat", completed: true },
  { id: 4, title: "Monitoring disk usage B2B Prod", project: "B2B", detail: "Pantau /apps pada pv-bbsvsoe1-ctl08-20:9100; informasikan ke Mas Alfiant apabila mencapai 98%.", state: "repeat", completed: true },
  { id: 5, title: "Monitoring performa APH per jam", project: "APH", detail: "Pantau Output Rate, APH Consumer Rate, serta Egress Listener F5 CGNAT Area 1 per PoP dan laporkan ke Teams APH.", state: "repeat", completed: true },
  { id: 6, title: "Report Repsoses file Excel SM", project: "SM", detail: "Kirim report hasil Repsoses dari tim Solusi ke grup WA SM-MB Support Tritronik pada pagi dan malam hari.", state: "repeat", completed: true },
  { id: 7, title: "Volume Roamware dan Backup SM", project: "SM", detail: "Lakukan pengisian di akhir shift serta monitoring total volume Huawei SGW.", state: "repeat", completed: true },
  { id: 8, title: "Dashboard LintasArta DM", project: "DM", detail: "Perhatikan all device quota / over quota usage; eskalasi langsung jika setelah pukul 01.00 data masih kosong.", state: "repeat", completed: true },
  { id: 9, title: "Perhitungan volume output data APH", project: "APH", detail: "Rekap output GGSN Ericsson, Huawei, ZTE dan UFP Huawei 5GC dalam volume serta events per hari.", state: "waiting", completed: false },
  { id: 10, title: "Report SM MonthlyHealth-SMMB", project: "SM", detail: "Pengerjaan materi Presentation MonthlyHealth-SMMB masih berlangsung.", state: "in-progress", completed: false },
];

export const initialHandoverRecord: HandoverRecordData = {
  sourceShift: "Subuh",
  targetShift: "Pagi",
  sourcePic: "Agnes",
  targetPic: "Galih, Natanael, Pangondion",
  monitoringSummary: "Pengecekan dan monitoring telah dilakukan serta dilaporkan di grup Telegram sesuai checkpoint yang ditentukan.",
  monitoringOwner: "Agnes",
  monitoredProjects: ["B2B", "DM", "EPC", "APH", "SM/ActiveMQ", "USIEM", "MB", "UNEM"],
  validationNote: "Galih, Natanael, dan Pangondion telah memeriksa hasil monitoring pada sesi handover.",
  findings: [
    {
      project: "USIEM",
      title: "Log direct MSS belum tampil",
      detail: "Log MSS Eric dan MSS Nokia sempat tertumpuk pada log distributor. Layanan telah di-restart dan tren penumpukan mulai menurun.",
      state: "waiting",
    },
    {
      project: "USIEM",
      title: "Input Graylog tidak menerima data",
      detail: "Input siem-fw-diameter-event, siem-fw-ss7-event, dan siem-fw-gtp-event tidak menerima data; sedang ditindaklanjuti di grup USIEM DevOps.",
      state: "in-progress",
    },
  ],
  tasks: initialHandoverTasks,
};

export const teamMembers = [
  { name: "Mhd. Galih Khairi", role: "Koordinator" },
  { name: "Kristina Marbun", role: "Operator" },
  { name: "M. Ihsanul Arifin", role: "Operator" },
];

export const projectHealthWeekly = [
  { project: "SM", days: [96, 94, 92, 98, 95, 90, 93] },
  { project: "B2B", days: [97, 95, 99, 94, 92, 96, 91] },
  { project: "USIEM", days: [100, 99, 100, 98, 100, 99, 100] },
  { project: "MB", days: [100, 100, 98, 100, 99, 100, 100] },
  { project: "EPC Tools", days: [99, 100, 100, 97, 100, 100, 99] },
  { project: "DM", days: [98, 100, 99, 100, 97, 100, 100] },
  { project: "UNEM", days: [100, 98, 100, 100, 99, 100, 100] },
];

export function toDateInputValue(date = new Date()) {
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

export function formatHandoverDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(parsed);
}

export function nowClockLabel() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export function makeTicketId() {
  return `86d4${Math.random().toString(36).slice(2, 7)}`;
}

export function createHandoverDraft(
  record: HandoverRecordData = initialHandoverRecord,
  date = toDateInputValue(),
): HandoverDraft {
  return {
    date,
    sourceShift: record.sourceShift,
    targetShift: record.targetShift,
    sourcePic: record.sourcePic,
    targetPic: record.targetPic,
    monitoringOwner: record.monitoringOwner,
    monitoredProjects: record.monitoredProjects.join(", "),
    monitoringSummary: record.monitoringSummary,
    validationNote: record.validationNote,
    findings: record.findings.map((finding) => ({ ...finding })),
    tasks: record.tasks.map((task) => ({ ...task })),
  };
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export const seedRosterMembers: RosterMember[] = [
  {
    id: "mem-1",
    name: "Galih Khairi",
    role: "Operator NOC",
    employeeId: "EMP-1048",
    email: "galih.khairi@company.id",
    phone: "+62 812-3456-7890",
    currentShift: "Shift Sore (13:00–22:59 WIB)",
    status: "Active",
    joinDate: "15 Jan 2024",
    avatarBg: "#2563eb",
    weeklySchedule: [
      { day: "Sen", date: "24 Aug", shift: "Sore", hours: "13:00–22:59" },
      { day: "Sel", date: "25 Aug", shift: "Sore", hours: "13:00–22:59" },
      { day: "Rab", date: "26 Aug", shift: "Sore", hours: "13:00–22:59" },
      { day: "Kam", date: "27 Aug", shift: "Sore", hours: "13:00–22:59" },
      { day: "Jum", date: "28 Aug", shift: "Sore", hours: "13:00–22:59" },
      { day: "Sab", date: "29 Aug", shift: "Off", hours: "Libur" },
      { day: "Min", date: "30 Aug", shift: "Off", hours: "Libur" },
    ],
    stats: {
      onTimePercentage: 98.5,
      shiftsCompleted: 142,
      handoverScore: 99.2,
    },
    history: [
      { date: "28 Aug", shift: "Shift Sore", status: "Present", note: "On-time check-in, lead NOC console" },
      { date: "27 Aug", shift: "Shift Sore", status: "Present", note: "Handover smoothly confirmed" },
      { date: "26 Aug", shift: "Shift Sore", status: "Present" },
      { date: "25 Aug", shift: "Shift Sore", status: "Present" },
      { date: "24 Aug", shift: "Shift Sore", status: "Present" },
    ],
  },
  {
    id: "mem-2",
    name: "Pangondion Kurniawan",
    role: "Shift Lead",
    employeeId: "EMP-1012",
    email: "pangondion.k@company.id",
    phone: "+62 813-8877-6655",
    currentShift: "Shift Sore (13:00–22:59 WIB)",
    status: "Active",
    joinDate: "01 Mar 2023",
    avatarBg: "#7c3aed",
    weeklySchedule: [
      { day: "Sen", date: "24 Aug", shift: "Sore", hours: "13:00–22:59" },
      { day: "Sel", date: "25 Aug", shift: "Sore", hours: "13:00–22:59" },
      { day: "Rab", date: "26 Aug", shift: "Sore", hours: "13:00–22:59" },
      { day: "Kam", date: "27 Aug", shift: "Sore", hours: "13:00–22:59" },
      { day: "Jum", date: "28 Aug", shift: "Sore", hours: "13:00–22:59" },
      { day: "Sab", date: "29 Aug", shift: "Off", hours: "Libur" },
      { day: "Min", date: "30 Aug", shift: "Off", hours: "Libur" },
    ],
    stats: {
      onTimePercentage: 100,
      shiftsCompleted: 218,
      handoverScore: 99.8,
    },
    history: [
      { date: "28 Aug", shift: "Shift Sore", status: "Present", note: "Shift supervisor & escalation handler" },
      { date: "27 Aug", shift: "Shift Sore", status: "Present" },
      { date: "26 Aug", shift: "Shift Sore", status: "Present" },
    ],
  },
  {
    id: "mem-3",
    name: "Kurnia Meidiyansyah",
    role: "Operator NOC",
    employeeId: "EMP-1055",
    email: "kurnia.m@company.id",
    phone: "+62 819-9011-2233",
    currentShift: "Shift Sore (13:00–22:59 WIB)",
    status: "Active",
    joinDate: "10 Feb 2024",
    avatarBg: "#059669",
    weeklySchedule: [
      { day: "Sen", date: "24 Aug", shift: "Sore", hours: "13:00–22:59" },
      { day: "Sel", date: "25 Aug", shift: "Sore", hours: "13:00–22:59" },
      { day: "Rab", date: "26 Aug", shift: "Sore", hours: "13:00–22:59" },
      { day: "Kam", date: "27 Aug", shift: "Sore", hours: "13:00–22:59" },
      { day: "Jum", date: "28 Aug", shift: "Sore", hours: "13:00–22:59" },
      { day: "Sab", date: "29 Aug", shift: "Pagi", hours: "07:00–15:59" },
      { day: "Min", date: "30 Aug", shift: "Off", hours: "Libur" },
    ],
    stats: {
      onTimePercentage: 96.8,
      shiftsCompleted: 110,
      handoverScore: 97.5,
    },
    history: [
      { date: "28 Aug", shift: "Shift Sore", status: "Present" },
      { date: "27 Aug", shift: "Shift Sore", status: "Present" },
    ],
  },
  {
    id: "mem-4",
    name: "Muhammad Iqbal",
    role: "L2 Specialist",
    employeeId: "EMP-1029",
    email: "m.iqbal@company.id",
    phone: "+62 856-1122-3344",
    currentShift: "Shift Sore (13:00–22:59 WIB)",
    status: "On Break",
    joinDate: "20 Jun 2023",
    avatarBg: "#d97706",
    weeklySchedule: [
      { day: "Sen", date: "24 Aug", shift: "Sore", hours: "13:00–22:59" },
      { day: "Sel", date: "25 Aug", shift: "Sore", hours: "13:00–22:59" },
      { day: "Rab", date: "26 Aug", shift: "Sore", hours: "13:00–22:59" },
      { day: "Kam", date: "27 Aug", shift: "Sore", hours: "13:00–22:59" },
      { day: "Jum", date: "28 Aug", shift: "Sore", hours: "13:00–22:59" },
      { day: "Sab", date: "29 Aug", shift: "Off", hours: "Libur" },
      { day: "Min", date: "30 Aug", shift: "Off", hours: "Libur" },
    ],
    stats: {
      onTimePercentage: 97.0,
      shiftsCompleted: 165,
      handoverScore: 98.4,
    },
    history: [
      { date: "28 Aug", shift: "Shift Sore", status: "Present", note: "Break scheduled 19:30–20:15" },
      { date: "27 Aug", shift: "Shift Sore", status: "Present" },
    ],
  },
  {
    id: "mem-5",
    name: "Sarah Wijaya",
    role: "Incident Coordinator",
    employeeId: "EMP-1008",
    email: "sarah.w@company.id",
    phone: "+62 811-2233-4455",
    currentShift: "Shift Sore (13:00–22:59 WIB)",
    status: "Active",
    joinDate: "12 Oct 2022",
    avatarBg: "#db2777",
    weeklySchedule: [
      { day: "Sen", date: "24 Aug", shift: "Sore", hours: "13:00–22:59" },
      { day: "Sel", date: "25 Aug", shift: "Sore", hours: "13:00–22:59" },
      { day: "Rab", date: "26 Aug", shift: "Sore", hours: "13:00–22:59" },
      { day: "Kam", date: "27 Aug", shift: "Sore", hours: "13:00–22:59" },
      { day: "Jum", date: "28 Aug", shift: "Sore", hours: "13:00–22:59" },
      { day: "Sab", date: "29 Aug", shift: "Off", hours: "Libur" },
      { day: "Min", date: "30 Aug", shift: "Off", hours: "Libur" },
    ],
    stats: {
      onTimePercentage: 99.1,
      shiftsCompleted: 240,
      handoverScore: 99.5,
    },
    history: [
      { date: "28 Aug", shift: "Shift Sore", status: "Present", note: "Incident bridge commander" },
    ],
  },
  {
    id: "mem-6",
    name: "Bagas Pratama",
    role: "Operator NOC",
    employeeId: "EMP-1062",
    email: "bagas.p@company.id",
    phone: "+62 817-4455-6677",
    currentShift: "Shift Malam (23:00–06:59 WIB)",
    status: "Off Duty",
    joinDate: "05 May 2024",
    avatarBg: "#4f46e5",
    weeklySchedule: [
      { day: "Sen", date: "24 Aug", shift: "Off", hours: "Libur" },
      { day: "Sel", date: "25 Aug", shift: "Malam", hours: "23:00–06:59" },
      { day: "Rab", date: "26 Aug", shift: "Malam", hours: "23:00–06:59" },
      { day: "Kam", date: "27 Aug", shift: "Malam", hours: "23:00–06:59" },
      { day: "Jum", date: "28 Aug", shift: "Malam", hours: "23:00–06:59" },
      { day: "Sab", date: "29 Aug", shift: "Malam", hours: "23:00–06:59" },
      { day: "Min", date: "30 Aug", shift: "Off", hours: "Libur" },
    ],
    stats: {
      onTimePercentage: 95.0,
      shiftsCompleted: 88,
      handoverScore: 96.0,
    },
    history: [
      { date: "27 Aug", shift: "Shift Malam", status: "Present" },
    ],
  },
  {
    id: "mem-7",
    name: "Dimas Anggoro",
    role: "Infrastructure Engineer",
    employeeId: "EMP-1033",
    email: "dimas.a@company.id",
    phone: "+62 821-3344-5566",
    currentShift: "Shift Pagi (07:00–15:59 WIB)",
    status: "Off Duty",
    joinDate: "18 Aug 2023",
    avatarBg: "#0891b2",
    weeklySchedule: [
      { day: "Sen", date: "24 Aug", shift: "Pagi", hours: "07:00–15:59" },
      { day: "Sel", date: "25 Aug", shift: "Pagi", hours: "07:00–15:59" },
      { day: "Rab", date: "26 Aug", shift: "Pagi", hours: "07:00–15:59" },
      { day: "Kam", date: "27 Aug", shift: "Pagi", hours: "07:00–15:59" },
      { day: "Jum", date: "28 Aug", shift: "Pagi", hours: "07:00–15:59" },
      { day: "Sab", date: "29 Aug", shift: "Off", hours: "Libur" },
      { day: "Min", date: "30 Aug", shift: "Off", hours: "Libur" },
    ],
    stats: {
      onTimePercentage: 98.0,
      shiftsCompleted: 175,
      handoverScore: 98.9,
    },
    history: [
      { date: "28 Aug", shift: "Shift Pagi", status: "Present", note: "Completed morning DC routine" },
    ],
  },
  {
    id: "mem-8",
    name: "Annisa Rahmawati",
    role: "Operator NOC",
    employeeId: "EMP-1070",
    email: "annisa.r@company.id",
    phone: "+62 857-7788-9900",
    currentShift: "Cuti Tahunan (On Leave)",
    status: "On Leave",
    joinDate: "01 Jul 2024",
    avatarBg: "#ea580c",
    weeklySchedule: [
      { day: "Sen", date: "24 Aug", shift: "Leave", hours: "Cuti" },
      { day: "Sel", date: "25 Aug", shift: "Leave", hours: "Cuti" },
      { day: "Rab", date: "26 Aug", shift: "Leave", hours: "Cuti" },
      { day: "Kam", date: "27 Aug", shift: "Leave", hours: "Cuti" },
      { day: "Jum", date: "28 Aug", shift: "Leave", hours: "Cuti" },
      { day: "Sab", date: "29 Aug", shift: "Off", hours: "Libur" },
      { day: "Min", date: "30 Aug", shift: "Off", hours: "Libur" },
    ],
    stats: {
      onTimePercentage: 96.0,
      shiftsCompleted: 45,
      handoverScore: 97.0,
    },
    history: [
      { date: "28 Aug", shift: "Annual Leave", status: "Leave", note: "Approved annual leave" },
    ],
  },
];

export const seedSwapRequests: ShiftSwapRequest[] = [
  {
    id: "swap-1",
    requesterId: "mem-6",
    requesterName: "Bagas Pratama",
    targetMemberId: "mem-3",
    targetMemberName: "Kurnia Meidiyansyah",
    requestedDate: "29 Aug 2026",
    currentShift: "Shift Malam (23:00–06:59)",
    targetShift: "Shift Pagi (07:00–15:59)",
    reason: "Ada keperluan keluarga mendesak di pagi hari.",
    status: "Pending",
    createdAt: "28 Aug 18:40",
  },
  {
    id: "swap-2",
    requesterId: "mem-1",
    requesterName: "Galih Khairi",
    targetMemberId: "mem-7",
    targetMemberName: "Dimas Anggoro",
    requestedDate: "22 Aug 2026",
    currentShift: "Shift Pagi",
    targetShift: "Shift Sore",
    reason: "Penyesuaian jadwal maintenance datacenter.",
    status: "Approved",
    createdAt: "21 Aug 10:15",
  },
];

