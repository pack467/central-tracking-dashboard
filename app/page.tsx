"use client";

import { useEffect, useMemo, useState } from "react";

type Tone = "critical" | "warning" | "success" | "neutral" | "info";

interface CheckpointAssessment {
  verdict: "adequate" | "not-adequate";
  note: string;
}

interface Ticket {
  id: string;
  subject: string;
  project: string;
  severity: string;
  owner: string;
  status: string;
  created: string;
  description?: string;
  history?: Array<{ time: string; action: string; author: string }>;
}

type HandoverState = "repeat" | "waiting" | "in-progress";

interface HandoverTask {
  id: number;
  title: string;
  project: string;
  detail: string;
  state: HandoverState;
  completed: boolean;
}

interface HandoverRecordData {
  sourceShift: string;
  targetShift: string;
  sourcePic: string;
  targetPic: string;
  monitoringSummary: string;
  monitoringOwner: string;
  monitoredProjects: string[];
  validationNote: string;
  findings: Array<{ project: string; title: string; detail: string; state: "waiting" | "in-progress" }>;
  tasks: HandoverTask[];
}

interface StoredHandoverRecord {
  id: number;
  title: string;
  handoverDate: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

type HandoverDraft = {
  date: string;
  sourceShift: string;
  targetShift: string;
  sourcePic: string;
  targetPic: string;
  monitoringOwner: string;
  monitoredProjects: string;
  monitoringSummary: string;
  validationNote: string;
  findings: Array<{ project: string; title: string; detail: string; state: "waiting" | "in-progress" }>;
  tasks: HandoverTask[];
};

const projects = [
  { name: "SM", status: "perlu perhatian", detail: "1 pengecualian", tone: "warning" as Tone },
  { name: "B2B", status: "perlu perhatian", detail: "Pemeriksaan Kafka", tone: "warning" as Tone },
  { name: "USIEM", status: "sehat", detail: "Semua pemeriksaan lulus", tone: "success" as Tone },
  { name: "MB", status: "sehat", detail: "Semua pemeriksaan lulus", tone: "success" as Tone },
  { name: "EPC", status: "sehat", detail: "Semua pemeriksaan lulus", tone: "success" as Tone },
  { name: "DM", status: "sehat", detail: "Semua pemeriksaan lulus", tone: "success" as Tone },
  { name: "UNEM", status: "sehat", detail: "Semua pemeriksaan lulus", tone: "success" as Tone },
];

const attentionItems = [
  {
    project: "SM",
    title: "Queue ActiveMQ 228 memerlukan validasi",
    note: "Penumpukan queue dilaporkan pada checkpoint 18:00. Belum ada konfirmasi dari penanggung jawab.",
    time: "4 jam lalu",
    tone: "warning" as Tone,
    tag: "Queue",
  },
  {
    project: "B2B",
    title: "Aliran pesan tidak ada pada topik b2b-f…",
    note: "Terdeteksi saat validasi Kafka UI. Periksa kesehatan producer sebelum checkpoint berikutnya.",
    time: "4 jam lalu",
    tone: "warning" as Tone,
    tag: "Kafka",
  },
  {
    project: "EPC Tools",
    title: "Satu permintaan ad-hoc masih berlangsung",
    note: "Tinjau tugas approval entities sebelum handover shift.",
    time: "1 jam lalu",
    tone: "info" as Tone,
    tag: "Ticket",
  },
];

const monitoring = [
  { time: "21:00", project: "B2B", task: "Traffic topik Kafka", owner: "M. Ihsanul Arifin", state: "Perlu perhatian", tone: "warning" as Tone },
  { time: "21:00", project: "DM", task: "Utilisasi CPU Grafana", owner: "M. Ihsanul Arifin", state: "Selesai", tone: "success" as Tone },
  { time: "22:00", project: "SM", task: "Queue ActiveMQ 228 · 71 · 68", owner: "M. Ihsanul Arifin", state: "Perlu perhatian", tone: "warning" as Tone },
  { time: "22:00", project: "USIEM", task: "Graylog & Dashboard SIEM", owner: "M. Ihsanul Arifin", state: "Selesai", tone: "success" as Tone },
  { time: "22:00", project: "EPC Core", task: "Status layanan Catalog", owner: "M. Ihsanul Arifin", state: "Selesai", tone: "success" as Tone },
  { time: "22:00", project: "UNEM", task: "Layanan & alert Grafana", owner: "M. Ihsanul Arifin", state: "Selesai", tone: "success" as Tone },
  { time: "23:00", project: "Handover", task: "Tinjauan kesiapan shift malam", owner: "Shift malam", state: "Mendatang", tone: "neutral" as Tone },
];

const tickets: Ticket[] = [
  {
    id: "86d4054rh",
    subject: "[EPC Tools] Tambah parameter baru untuk FMC",
    project: "EPC Tools",
    severity: "Rendah",
    owner: "Pangondion Kurniawan",
    status: "Aktivitas",
    created: "21:00",
    description: "Permintaan konfigurasi parameter ambang FMC tambahan untuk mesin validasi EPC.",
    history: [
      { time: "21:00", action: "Ticket dibuat oleh operator", author: "Pangondion Kurniawan" },
      { time: "21:15", action: "Status diperbarui menjadi Aktivitas", author: "Pangondion Kurniawan" }
    ]
  },
  {
    id: "86d40eqn1",
    subject: "[EPC Tools] Validasi approval entities",
    project: "EPC Tools",
    severity: "Rendah",
    owner: "Pangondion Kurniawan",
    status: "Ditutup",
    created: "20:08",
    description: "Validasi selesai untuk seluruh endpoint approval entities.",
    history: [
      { time: "20:08", action: "Ticket dibuat", author: "Pangondion Kurniawan" },
      { time: "20:45", action: "Masalah diselesaikan dan ditutup", author: "Pangondion Kurniawan" }
    ]
  },
  {
    id: "86d40cxuk",
    subject: "[SM] Transfer file buffer LTE",
    project: "SM",
    severity: "Rendah",
    owner: "Mhd. Galih Khairi",
    status: "Ditutup",
    created: "18:20",
    description: "File buffer log LTE ditransfer ke node arsip sekunder.",
    history: [
      { time: "18:20", action: "Ticket dibuat", author: "Mhd. Galih Khairi" },
      { time: "19:00", action: "Transfer selesai dan checksum tervalidasi", author: "Mhd. Galih Khairi" }
    ]
  },
  {
    id: "86d40b9yh",
    subject: "[USIEM] Restart gateway log SIEM",
    project: "USIEM",
    severity: "Rendah",
    owner: "Mhd. Galih Khairi",
    status: "Ditutup",
    created: "16:29",
    description: "Restart gateway rutin setelah akumulasi memori socket minor.",
    history: [
      { time: "16:29", action: "Gateway berhasil di-restart", author: "Mhd. Galih Khairi" }
    ]
  },
  {
    id: "86d40bebu",
    subject: "[MB] Kirim event notifikasi",
    project: "MB",
    severity: "Rendah",
    owner: "Mhd. Galih Khairi",
    status: "Ditutup",
    created: "16:21",
    description: "Laju queue pengiriman push notification mobile terverifikasi.",
    history: [
      { time: "16:21", action: "Kondisi queue nominal terverifikasi", author: "Mhd. Galih Khairi" }
    ]
  },
];

const initialHandoverTasks: HandoverTask[] = [
  {
    id: 1,
    title: "Pemantauan Dump Automation EPC Tools",
    project: "EPC Tools",
    detail: "Perketat pemantauan Dump Automation. Pengecekan dapat menggunakan akun Teresa rosikin2011_x.",
    state: "repeat",
    completed: true,
  },
  {
    id: 2,
    title: "Pengecekan Email L2 Support di akhir shift",
    project: "L2",
    detail: "Pastikan seluruh folder sudah dibaca dan tidak ada request yang terlewat.",
    state: "repeat",
    completed: true,
  },
  {
    id: 3,
    title: "Monitoring penumpukan fulldecode SM",
    project: "SM",
    detail: "Pantau queue fulldecode pada ActiveMQ 228 dan direktori output smng109.",
    state: "repeat",
    completed: true,
  },
  {
    id: 4,
    title: "Monitoring disk usage B2B Prod",
    project: "B2B",
    detail: "Pantau /apps pada pv-bbsvsoe1-ctl08-20:9100; informasikan ke Mas Alfiant apabila mencapai 98%.",
    state: "repeat",
    completed: true,
  },
  {
    id: 5,
    title: "Monitoring performa APH per jam",
    project: "APH",
    detail: "Pantau Output Rate, APH Consumer Rate, serta Egress Listener F5 CGNAT Area 1 per PoP dan laporkan ke Teams APH.",
    state: "repeat",
    completed: true,
  },
  {
    id: 6,
    title: "Report Repsoses file Excel SM",
    project: "SM",
    detail: "Kirim report hasil Repsoses dari tim Solusi ke grup WA SM-MB Support Tritronik pada pagi dan malam hari.",
    state: "repeat",
    completed: true,
  },
  {
    id: 7,
    title: "Volume Roamware dan Backup SM",
    project: "SM",
    detail: "Lakukan pengisian di akhir shift serta monitoring total volume Huawei SGW.",
    state: "repeat",
    completed: true,
  },
  {
    id: 8,
    title: "Dashboard LintasArta DM",
    project: "DM",
    detail: "Perhatikan all device quota / over quota usage; eskalasi langsung jika setelah pukul 01.00 data masih kosong.",
    state: "repeat",
    completed: true,
  },
  {
    id: 9,
    title: "Perhitungan volume output data APH",
    project: "APH",
    detail: "Rekap output GGSN Ericsson, Huawei, ZTE dan UFP Huawei 5GC dalam volume serta events per hari.",
    state: "waiting",
    completed: false,
  },
  {
    id: 10,
    title: "Report SM MonthlyHealth-SMMB",
    project: "SM",
    detail: "Pengerjaan materi Presentation MonthlyHealth-SMMB masih berlangsung.",
    state: "in-progress",
    completed: false,
  },
];

const initialHandoverRecord: HandoverRecordData = {
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

function toDateInputValue(date = new Date()) {
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function formatHandoverDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(parsed);
}

function createHandoverDraft(record: HandoverRecordData = initialHandoverRecord, date = toDateInputValue()): HandoverDraft {
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

const navItems = [
  ["⌂", "Utama"],
  ["◫", "Ticket"],
  ["◷", "Monitoring"],
  ["≡", "Log shift"],
  ["▦", "Laporan"],
];

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: Tone }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function ProjectMark({ name }: { name: string }) {
  const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2);
  return <span className={`project-mark project-${name.toLowerCase().replace(/[^a-z]/g, "")}`}>{initials}</span>;
}

function Sparkline({ color = "#10b981", points = "0,25 20,20 40,22 60,15 80,18 100,10 120,12 140,5 160,8" }: { color?: string; points?: string }) {
  return (
    <svg className="metric-sparkline" viewBox="0 0 160 32" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sparkGrad-${color.replace(/[^a-z0-9]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <polygon points={`0,32 ${points} 160,32`} fill={`url(#sparkGrad-${color.replace(/[^a-z0-9]/gi, '')})`} />
      <polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

function IconBell({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function IconSun({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function IconMoon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}

export default function Home() {
  const [activeNav, setActiveNav] = useState("Utama");
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("Semua pemeriksaan");
  const [acknowledged, setAcknowledged] = useState<string[]>([]);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [handoverRecord, setHandoverRecord] = useState<HandoverRecordData>(initialHandoverRecord);
  const [handoverDate, setHandoverDate] = useState("2026-08-10");
  const [handoverRecordId, setHandoverRecordId] = useState<number | null>(null);
  const [handoverRecords, setHandoverRecords] = useState<StoredHandoverRecord[]>([]);
  const [handoverDraftOpen, setHandoverDraftOpen] = useState(false);
  const [handoverDraft, setHandoverDraft] = useState<HandoverDraft>(() => createHandoverDraft());
  const [handoverSaving, setHandoverSaving] = useState(false);
  const [handoverLoading, setHandoverLoading] = useState(true);
  const [handoverFilter, setHandoverFilter] = useState<"all" | HandoverState>("all");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [currentTime, setCurrentTime] = useState<string>("");
  // Checkpoint assessment state
  const [checkpointAssessments, setCheckpointAssessments] = useState<Record<string, CheckpointAssessment>>({});
  const [pendingAssessmentKey, setPendingAssessmentKey] = useState<string | null>(null);
  const [assessmentNote, setAssessmentNote] = useState("");
  const [showAdequacyGuide, setShowAdequacyGuide] = useState(false);

  const handoverTasks = handoverRecord.tasks;

  // Live ticking clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      setCurrentTime(`${hours}:${minutes}:${seconds} WIB`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync theme with DOM
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const loadHandovers = async () => {
      try {
        const response = await fetch("/api/handovers");
        if (!response.ok) throw new Error("Tidak dapat memuat catatan");
        const payload = (await response.json()) as { notes: StoredHandoverRecord[] };
        setHandoverRecords(payload.notes);
      } catch {
        announce("Catatan handover belum dapat dimuat. Anda tetap dapat membuat catatan baru.");
      } finally {
        setHandoverLoading(false);
      }
    };
    void loadHandovers();
  }, []);

  // Global hotkeys
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setTicketOpen(false);
        setSelectedTicket(null);
        setHandoverOpen(false);
        setHandoverDraftOpen(false);
        setNotificationsOpen(false);
        setPendingAssessmentKey(null);
        setAssessmentNote("");
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  const visibleMonitoring = useMemo(() => {
    if (selectedFilter === "Perlu perhatian") return monitoring.filter((item) => item.tone === "warning");
    if (selectedFilter === "Mendatang") return monitoring.filter((item) => item.state === "Mendatang");
    return monitoring;
  }, [selectedFilter]);

  const filteredTickets = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return tickets;
    return tickets.filter((ticket) => Object.values(ticket).some((value) => typeof value === 'string' && value.toLowerCase().includes(needle)));
  }, [search]);

  const handoverProgressPercent = useMemo(() => {
    const done = handoverTasks.filter((t) => t.completed).length;
    return Math.round((done / handoverTasks.length) * 100);
  }, [handoverTasks]);

  const visibleHandoverTasks = useMemo(() => {
    if (handoverFilter === "all") return handoverTasks;
    return handoverTasks.filter((task) => task.state === handoverFilter);
  }, [handoverFilter, handoverTasks]);

  const updateActiveHandover = (record: HandoverRecordData, date = handoverDate) => {
    setHandoverRecord(record);
    setHandoverDate(date);
  };

  const saveActiveHandover = async (record: HandoverRecordData) => {
    if (!handoverRecordId) return;
    const title = `Handover Shift ${record.sourceShift} → ${record.targetShift}`;
    try {
      const response = await fetch(`/api/handovers/${handoverRecordId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, handoverDate, content: JSON.stringify(record) }),
      });
      const payload = (await response.json()) as { note?: StoredHandoverRecord };
      if (!response.ok || !payload.note) throw new Error("Tidak dapat menyimpan konfirmasi");
      setHandoverRecords((previous) => previous.map((note) => (note.id === payload.note!.id ? payload.note! : note)));
    } catch {
      announce("Perubahan konfirmasi belum tersimpan. Coba lagi.");
    }
  };

  const toggleHandoverTask = (id: number) => {
    const next = {
      ...handoverRecord,
      tasks: handoverRecord.tasks.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item)),
    };
    setHandoverRecord(next);
    void saveActiveHandover(next);
  };

  const openNewHandoverDraft = () => {
    setHandoverDraft(createHandoverDraft({ ...initialHandoverRecord, tasks: initialHandoverTasks }, toDateInputValue()));
    setHandoverDraftOpen(true);
  };

  const openStoredHandover = (record: StoredHandoverRecord) => {
    try {
      const content = JSON.parse(record.content) as HandoverRecordData;
      updateActiveHandover(content, record.handoverDate);
      setHandoverRecordId(record.id);
      setHandoverFilter("all");
      setHandoverOpen(true);
    } catch {
      announce("Catatan handover ini tidak dapat dibuka.");
    }
  };

  const updateDraftTask = (taskId: number, change: Partial<HandoverTask>) => {
    setHandoverDraft((previous) => ({
      ...previous,
      tasks: previous.tasks.map((task) => (task.id === taskId ? { ...task, ...change } : task)),
    }));
  };

  const updateDraftFinding = (findingIndex: number, change: Partial<HandoverDraft["findings"][number]>) => {
    setHandoverDraft((previous) => ({
      ...previous,
      findings: previous.findings.map((finding, index) => (index === findingIndex ? { ...finding, ...change } : finding)),
    }));
  };

  const addDraftTask = () => {
    setHandoverDraft((previous) => ({
      ...previous,
      tasks: [
        ...previous.tasks,
        { id: Date.now(), title: "", project: "NOC", detail: "", state: "repeat", completed: false },
      ],
    }));
  };

  const removeDraftTask = (taskId: number) => {
    setHandoverDraft((previous) => ({ ...previous, tasks: previous.tasks.filter((task) => task.id !== taskId) }));
  };

  const addDraftFinding = () => {
    setHandoverDraft((previous) => ({
      ...previous,
      findings: [...previous.findings, { project: "NOC", title: "", detail: "", state: "waiting" }],
    }));
  };

  const removeDraftFinding = (findingIndex: number) => {
    setHandoverDraft((previous) => ({ ...previous, findings: previous.findings.filter((_, index) => index !== findingIndex) }));
  };

  const saveHandoverDraft = async () => {
    const tasks = handoverDraft.tasks.filter((task) => task.title.trim());
    const findings = handoverDraft.findings.filter((finding) => finding.title.trim() || finding.detail.trim());
    const record: HandoverRecordData = {
      sourceShift: handoverDraft.sourceShift.trim() || "Shift sebelumnya",
      targetShift: handoverDraft.targetShift.trim() || "Shift berikutnya",
      sourcePic: handoverDraft.sourcePic.trim() || "Belum diisi",
      targetPic: handoverDraft.targetPic.trim() || "Belum diisi",
      monitoringSummary: handoverDraft.monitoringSummary.trim() || "Monitoring belum dicatat.",
      monitoringOwner: handoverDraft.monitoringOwner.trim() || handoverDraft.sourcePic.trim() || "Belum diisi",
      monitoredProjects: handoverDraft.monitoredProjects.split(",").map((project) => project.trim()).filter(Boolean),
      validationNote: handoverDraft.validationNote.trim() || "Menunggu validasi shift penerima.",
      findings,
      tasks,
    };

    if (!handoverDraft.date || !record.sourcePic || !record.targetPic || !tasks.length) {
      announce("Isi tanggal, PIC pengirim, PIC penerima, dan minimal satu tugas handover.");
      return;
    }

    const title = `Handover Shift ${record.sourceShift} → ${record.targetShift}`;
    setHandoverSaving(true);
    try {
      const response = await fetch("/api/handovers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, handoverDate: handoverDraft.date, content: JSON.stringify(record) }),
      });
      const payload = (await response.json()) as { note?: StoredHandoverRecord; error?: string };
      if (!response.ok || !payload.note) throw new Error(payload.error || "Gagal menyimpan");

      setHandoverRecords((previous) => [payload.note!, ...previous]);
      setHandoverRecordId(payload.note.id);
      updateActiveHandover(record, handoverDraft.date);
      setHandoverFilter("all");
      setHandoverDraftOpen(false);
      setHandoverOpen(true);
      announce("Catatan handover baru berhasil disimpan dan siap dikonfirmasi.");
    } catch (error) {
      announce(error instanceof Error ? error.message : "Catatan handover belum dapat disimpan.");
    } finally {
      setHandoverSaving(false);
    }
  };

  const announce = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3400);
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    announce(`Mode tema diubah menjadi ${nextTheme === "dark" ? "gelap" : "terang"}.`);
  };

  // Checkpoint assessment helpers
  const assessCheckpoint = (key: string, verdict: "adequate" | "not-adequate", note = "") => {
    setCheckpointAssessments((prev) => ({ ...prev, [key]: { verdict, note } }));
    if (verdict === "adequate") announce("Checkpoint ditandai sebagai Memadai.");
    else announce("Checkpoint ditandai sebagai Tidak Memadai — catatan disimpan.");
  };

  const openNotAdequateModal = (key: string) => {
    setAssessmentNote("");
    setPendingAssessmentKey(key);
  };

  const submitNotAdequate = () => {
    if (!pendingAssessmentKey) return;
    assessCheckpoint(pendingAssessmentKey, "not-adequate", assessmentNote.trim());
    setPendingAssessmentKey(null);
    setAssessmentNote("");
  };

  return (
    <main className="app-shell">
      {/* Sidebar Navigation */}
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand-lockup">
          <span className="brand-symbol">
            <i />
            <i />
            <i />
          </span>
          <span>
            <strong>Central</strong>
            <small>TRACKING DASHBOARD</small>
          </span>
        </div>

        <div className="sidebar-label">RUANG KERJA</div>
        <nav className="nav-list">
          {navItems.map(([icon, label]) => (
            <button
              className={`nav-item ${activeNav === label ? "active" : ""}`}
              key={label}
              onClick={() => {
                setActiveNav(label);
                if (label !== "Utama") announce(`Ruang kerja ${label.toLowerCase()} siap digunakan.`);
              }}
            >
              <span className="nav-icon">{icon}</span>
              {label}
              {label === "Ticket" && <span className="nav-count">1</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-label sidebar-label-lower">OPERASI</div>
        <nav className="nav-list">
          <button className="nav-item" onClick={() => announce("Matriks eskalasi dimuat.")}>
            <span className="nav-icon">↗</span>Eskalasi
          </button>
          <button className="nav-item" onClick={() => announce("Runbook prosedur standar dimuat.")}>
            <span className="nav-icon">◇</span>Runbooks
          </button>
          <button className="nav-item" onClick={() => announce("Daftar tim shift ditampilkan.")}>
            <span className="nav-icon">◎</span>Daftar tim
          </button>
        </nav>

        <section className="shift-card">
          <div className="shift-card-top">
            <span className="live-dot" /> SHIFT AKTIF
          </div>
          <strong>Shift sore</strong>
          <p>13:00 – 22:59 WIB</p>
          <div className="shift-people">
            <span>GK</span>
            <span>KM</span>
            <span>MI</span>
            <span className="more">+2</span>
          </div>
          <button onClick={() => setHandoverOpen(true)}>
            Siapkan handover <span>→</span>
          </button>
        </section>

        <button className="profile" onClick={() => announce("Profil Operator NOC aktif.")}>
          <span className="profile-avatar">GK</span>
          <span>
            <strong>Galih Khairi</strong>
            <small>Operator NOC</small>
          </span>
          <span className="profile-more">•••</span>
        </button>
      </aside>

      {/* Main Workspace Area */}
      <section className="workspace">
        {/* Topbar Header */}
        <header className="topbar">
          <div className="breadcrumbs">
            <span>Operasi</span>
            <b>/</b>
            <strong>Pusat Komando</strong>
          </div>

          <div className="topbar-actions">
            {currentTime && (
              <div className="live-clock-badge" title="Waktu sistem langsung">
                <span className="live-dot" />
                {currentTime}
              </div>
            )}

            <button className="command-button" onClick={() => setSearchOpen(true)} aria-label="Cari dashboard">
              <span>⌕</span>
              <em>Cari atau lompat ke…</em>
              <kbd>⌘ K</kbd>
            </button>

            <button
              className="icon-button notification-button"
              onClick={() => setNotificationsOpen(true)}
              aria-label="Notifikasi"
              title="Notifikasi sistem aktif"
            >
              <IconBell /><i>3</i>
            </button>

            <button
              className="theme-toggle-button"
              onClick={toggleTheme}
              title={`Ubah ke mode ${theme === "dark" ? "terang" : "gelap"}`}
              aria-label={`Ubah ke mode ${theme === "dark" ? "terang" : "gelap"}`}
            >
              {theme === "dark" ? <IconSun /> : <IconMoon />}
            </button>
          </div>
        </header>

        {/* Dashboard Main Content */}
        <div className="page-content">
          {/* Page Title & Main Actions */}
          <section className="page-heading">
            <div>
              <div className="eyebrow">
                <span className="live-dot" /> SISTEM NOMINAL · SHIFT SORE
              </div>
              <h1>Operation Dashboard</h1>
              <p>Status sistem, monitoring layanan, queue ticket, dan ringkasan handover shift.</p>
            </div>
            <div className="page-actions">
              <button className="button button-secondary" onClick={() => announce("Laporan operasional harian diekspor sebagai PDF.")}>
                <span>↓</span> Ekspor ringkasan
              </button>
              <button className="button button-primary" onClick={() => setTicketOpen(true)}>
                <span>＋</span> Ticket baru
              </button>
            </div>
          </section>

          {/* Project Health Strip */}
          <section className="health-strip" aria-label="Kesehatan layanan per proyek">
            <div className="health-intro">
              <span className="health-title">Kesehatan layanan</span>
              <Badge tone="success">5 sehat</Badge>
              <Badge tone="warning">2 perlu perhatian</Badge>
            </div>
            <div className="project-pills">
              {projects.map((project) => (
                <button
                  className="project-pill"
                  key={project.name}
                  onClick={() => announce(`${project.name}: Status ${project.status.toUpperCase()} (${project.detail})`)}
                >
                  <ProjectMark name={project.name} />
                  <span>
                    <strong>{project.name}</strong>
                    <small>{project.detail}</small>
                  </span>
                  <i className={`status-dot ${project.tone}`} />
                </button>
              ))}
            </div>
          </section>

          {/* Key Metric Snapshot Cards with SVG Sparklines */}
          <section className="metrics-grid" aria-label="Metrik operasional">
            <article className="metric-card">
              <div className="metric-top">
                <span>TINGKAT KEBERHASILAN CHECKPOINT</span>
                <Badge tone="success">+2,1% vs kemarin</Badge>
              </div>
              <div className="metric-number">
                94<span>%</span>
              </div>
              <p>128 dari 136 pemeriksaan monitoring terjadwal selesai dengan baik.</p>
              <div className="progress-line">
                <i style={{ width: "94%" }} />
              </div>
              <Sparkline color="#22d3a0" points="0,28 20,22 40,25 60,18 80,20 100,12 120,15 140,8 160,5" />
            </article>

            <article className="metric-card">
              <div className="metric-top">
                <span>TICKET TERBUKA</span>
                <button onClick={() => setActiveNav("Ticket")}>Lihat queue →</button>
              </div>
              <div className="metric-number">1</div>
              <p>1 ticket dalam tahap penanganan aktif, 4 ticket selesai hari ini.</p>
              <div className="metric-foot">
                <Badge tone="warning">1 aktif</Badge>
                <span>4 ditutup hari ini</span>
              </div>
              <Sparkline color="#38bdf8" points="0,15 20,25 40,10 60,20 80,12 100,18 120,8 140,14 160,10" />
            </article>

            <article className="metric-card">
              <div className="metric-top">
                <span>PERLU PERHATIAN</span>
                <Badge tone="warning">Perlu ditinjau</Badge>
              </div>
              <div className="metric-number">3</div>
              <p>2 pengecualian queue dan 1 tugas ad-hoc yang memerlukan sign-off.</p>
              <div className="metric-foot">
                <span className="status-dot warning" />
                <span>2 pengecualian monitoring</span>
              </div>
              <Sparkline color="#fbbf24" points="0,20 20,12 40,28 60,15 80,22 100,10 120,18 140,12 160,8" />
            </article>

            <article className="metric-card">
              <div className="metric-top">
                <span>CHECKPOINT BERIKUTNYA</span>
                <button onClick={() => announce("Jadwal shift lengkap dibuka.")}>Jadwal →</button>
              </div>
              <div className="metric-time">
                23:00 <small>WIB</small>
              </div>
              <p>Tinjauan kesiapan shift malam dan handover log final terjadwal.</p>
              <div className="metric-foot">
                <span className="status-dot success" />
                <span>Tinjauan kesiapan shift malam</span>
              </div>
              <Sparkline color="#a78bfa" points="0,10 20,15 40,12 60,22 80,18 100,25 120,20 140,28 160,30" />
            </article>
          </section>

          {/* Main Dashboard Grid */}
          <section className="dashboard-grid">
            <div className="main-column">
              {/* Requires Attention Panel */}
              <article className="panel attention-panel">
                <div className="panel-heading">
                  <div>
                    <div className="panel-title">
                      <span className="attention-icon">!</span> Perlu perhatian <Badge tone="warning">3</Badge>
                    </div>
                    <p>Pengecualian aktif dan item yang memerlukan konfirmasi operator sebelum shift berakhir.</p>
                  </div>
                  <button className="text-button" onClick={() => announce("Seluruh pengecualian sistem aktif ditampilkan.")}>
                    Lihat semua <span>→</span>
                  </button>
                </div>
                <div className="attention-list">
                  {attentionItems.map((item) => {
                    const isAcknowledged = acknowledged.includes(item.title);
                    return (
                      <div className={`attention-row ${isAcknowledged ? "resolved" : ""}`} key={item.title}>
                        <ProjectMark name={item.project} />
                        <div className="attention-copy">
                          <div>
                            <Badge tone={item.tone}>{item.tag}</Badge>
                            <span className="attention-time">{item.time}</span>
                          </div>
                          <strong>{item.title}</strong>
                          <p>{isAcknowledged ? "Dikonfirmasi — menunggu validasi berikutnya." : item.note}</p>
                        </div>
                        <button
                          className="ack-button"
                          onClick={() => {
                            if (!isAcknowledged) {
                              setAcknowledged((curr) => [...curr, item.title]);
                              announce(`Dikonfirmasi: ${item.title}`);
                            }
                          }}
                        >
                          {isAcknowledged ? "✓ Dikonfirmasi" : "Konfirmasi"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </article>

              {/* Monitoring Schedule Panel */}
              <article className="panel schedule-panel">
                <div className="panel-heading schedule-heading">
                  <div>
                    <div className="panel-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      Jadwal monitoring
                      <button
                        className="guide-trigger-btn"
                        onClick={() => setShowAdequacyGuide(true)}
                        title="Klik untuk melihat kriteria dan panduan kecukupan checkpoint"
                      >
                        ⓘ Panduan penilaian
                      </button>
                    </div>
                    <p>Checkpoint monitoring hari ini yang selesai, aktif, dan mendatang.</p>
                  </div>
                  <div className="filter-tabs" aria-label="Filter monitoring">
                    {["Semua pemeriksaan", "Perlu perhatian", "Mendatang"].map((filter) => (
                      <button
                        key={filter}
                        className={selectedFilter === filter ? "selected" : ""}
                        onClick={() => setSelectedFilter(filter)}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="schedule-table" role="table" aria-label="Jadwal monitoring">
                  <div className="schedule-header" role="row">
                    <span>WAKTU</span>
                    <span>CHECKPOINT</span>
                    <span>DITUGASKAN KEPADA</span>
                    <span>STATUS / PENILAIAN</span>
                  </div>
                  {visibleMonitoring.map((item) => {
                    const rowKey = `${item.time}-${item.project}-${item.task}`;
                    const assessment = checkpointAssessments[rowKey];
                    const canAssess = item.state !== "Mendatang";
                    return (
                      <div
                        className={`schedule-row ${item.time === "22:00" ? "current-hour" : ""}`}
                        role="row"
                        key={rowKey}
                      >
                        <span className="schedule-time">
                          {item.time}
                          {item.time === "22:00" && <small>SEKARANG</small>}
                        </span>
                        <span className="schedule-check">
                          <ProjectMark name={item.project} />
                          <span>
                            <strong>{item.project}</strong>
                            <small>{item.task}</small>
                            {assessment?.verdict === "not-adequate" && assessment.note && (
                              <small className="checkpoint-note">📝 {assessment.note}</small>
                            )}
                          </span>
                        </span>
                        <span className="schedule-owner">
                          <span className="mini-avatar">
                            {item.owner.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                          </span>
                          {item.owner}
                        </span>
                        <span className="schedule-assessment-cell">
                          {assessment ? (
                            <span className={`assessment-verdict assessment-${assessment.verdict}`}>
                              {assessment.verdict === "adequate" ? "✓ Memadai" : "✗ Tidak memadai"}
                            </span>
                          ) : canAssess ? (
                            <span className="assessment-actions">
                              <button
                                className="assess-btn assess-ok"
                                title="Tandai checkpoint ini sebagai Memadai"
                                onClick={() => assessCheckpoint(rowKey, "adequate")}
                              >
                                Memadai
                              </button>
                              <button
                                className="assess-btn assess-fail"
                                title="Tandai sebagai Tidak Memadai dan tambahkan catatan"
                                onClick={() => openNotAdequateModal(rowKey)}
                              >
                                Tidak memadai
                              </button>
                            </span>
                          ) : (
                            <Badge tone={item.tone}>{item.state}</Badge>
                          )}
                        </span>
                      </div>
                    );
                  })}
                  {visibleMonitoring.length === 0 && <div className="schedule-empty">Tidak ada checkpoint yang cocok dengan filter ini.</div>}
                </div>
                <button className="full-width-button" onClick={() => announce("Jadwal monitoring lengkap diperluas.")}>
                  Buka jadwal monitoring lengkap <span>→</span>
                </button>
              </article>
            </div>

            {/* Side Column: Shift Coverage & Handover */}
            <aside className="side-column">
              <article className="panel coverage-panel">
                <div className="panel-title">Cakupan shift</div>
                <p className="coverage-subtitle">Shift sore · 13:00 – 22:59 WIB</p>
                <div className="coverage-ring">
                  <div>
                    <strong>5</strong>
                    <span>AKTIF</span>
                  </div>
                </div>
                <div className="coverage-stats">
                  <span>
                    <i className="status-dot success" /> 5 aktif
                  </span>
                  <span>
                    <i className="status-dot neutral" /> 1 istirahat
                  </span>
                </div>
                <div className="coverage-team">
                  {["Mhd. Galih Khairi", "Kristina Marbun", "M. Ihsanul Arifin"].map((member, index) => (
                    <button key={member} onClick={() => announce(`${member}: detail anggota shift dimuat.`)}>
                      <span className={`avatar avatar-${index}`}>
                        {member.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                      </span>
                      <span>
                        {member}
                        <small>{index === 0 ? "Koordinator" : "Operator"}</small>
                      </span>
                      <i className="status-dot success" />
                    </button>
                  ))}
                </div>
                <button className="full-width-button" onClick={() => announce("Daftar shift dibuka.")}>
                  Lihat daftar shift <span>→</span>
                </button>
              </article>

              <article className="panel handover-panel">
                <div className="handover-label">
                  <span>⊙</span> KESIAPAN HANDOVER
                </div>
                <strong>{handoverTasks.filter((t) => !t.completed).length} tugas perlu tindak lanjut</strong>
                <p>{handoverRecordId ? `Handover ${handoverRecord.sourceShift} ke ${handoverRecord.targetShift} tersimpan dan siap dikonfirmasi.` : "Buat catatan baru untuk mendokumentasikan proses serah-terima shift."}</p>
                <div className="handover-progress">
                  <span>{handoverProgressPercent}% diterima</span>
                  <i>
                    <b style={{ width: `${handoverProgressPercent}%` }} />
                  </i>
                </div>
                <button onClick={() => setHandoverOpen(true)}>
                  Buka catatan handover <span>→</span>
                </button>
                <button className="handover-create-button" onClick={openNewHandoverDraft}>
                  <span>＋</span> Buat handover baru
                </button>
              </article>
            </aside>
          </section>

          {/* Recent Ticket Activity Section */}
          <article className="panel tickets-panel">
            <div className="panel-heading">
              <div>
                <div className="panel-title">Aktivitas ticket terbaru</div>
                <p>Tugas penanganan, permintaan, dan insiden operasional terbaru dari shift hari ini.</p>
              </div>
              <button className="text-button" onClick={() => setActiveNav("Ticket")}>
                Buka queue ticket <span>→</span>
              </button>
            </div>
            <div className="ticket-table" role="table" aria-label="Aktivitas ticket terbaru">
              <div className="ticket-header" role="row">
                <span>TICKET</span>
                <span>PROYEK</span>
                <span>DITUGASKAN KEPADA</span>
                <span>PRIORITAS</span>
                <span>STATUS</span>
                <span>DIBUAT</span>
              </div>
              {tickets.map((ticket) => (
                <button
                  className="ticket-row"
                  role="row"
                  onClick={() => setSelectedTicket(ticket)}
                  key={ticket.id}
                >
                  <span className="ticket-subject">
                    <strong>{ticket.subject}</strong>
                    <small>#{ticket.id}</small>
                  </span>
                  <span>
                    <ProjectMark name={ticket.project} /> {ticket.project}
                  </span>
                  <span className="ticket-owner">
                    <span className="mini-avatar">
                      {ticket.owner.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                    </span>
                    {ticket.owner}
                  </span>
                  <span>
                    <Badge tone={ticket.severity === "Tinggi" ? "critical" : ticket.severity === "Sedang" ? "warning" : "neutral"}>
                      {ticket.severity}
                    </Badge>
                  </span>
                  <span>
                    <Badge tone={ticket.status === "Ditutup" ? "success" : "info"}>{ticket.status}</Badge>
                  </span>
                  <span className="created-time">{ticket.created}</span>
                </button>
              ))}
            </div>
          </article>
        </div>
      </section>

      {/* Toast Notification Banner */}
      {notice && (
        <div className="toast" role="status">
          <span>✓</span> {notice}
        </div>
      )}

      {/* Command Palette Search Modal (⌘K) */}
      {searchOpen && (
        <div className="modal-backdrop" onMouseDown={() => setSearchOpen(false)}>
          <section
            className="command-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Cari dashboard"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="command-input">
              <span>⌕</span>
              <input
                autoFocus
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari ticket, pemeriksaan proyek, atau anggota tim…"
              />
              <kbd>ESC</kbd>
            </div>
            <div className="command-section-label">TICKET TERBARU YANG COCOK</div>
            <div className="command-results">
              {filteredTickets.slice(0, 4).map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => {
                    setSearchOpen(false);
                    setSelectedTicket(ticket);
                  }}
                >
                  <ProjectMark name={ticket.project} />
                  <span>
                    <strong>{ticket.subject}</strong>
                    <small>#{ticket.id} · Ditugaskan kepada {ticket.owner}</small>
                  </span>
                  <Badge tone={ticket.status === "Ditutup" ? "success" : "info"}>{ticket.status}</Badge>
                </button>
              ))}
              {filteredTickets.length === 0 && (
                <div style={{ padding: "16px", color: "var(--ink-muted)", textAlign: "center", fontSize: "12px" }}>
                  Tidak ada item yang cocok dengan "{search}"
                </div>
              )}
            </div>
            <div className="command-footer">
              <span><kbd>↵</kbd> Buka detail</span>
              <span><kbd>↑↓</kbd> Navigasi</span>
              <span><kbd>ESC</kbd> Tutup</span>
            </div>
          </section>
        </div>
      )}

      {/* Ticket Creation Modal */}
      {ticketOpen && (
        <div className="modal-backdrop" onMouseDown={() => setTicketOpen(false)}>
          <section
            className="ticket-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Buat ticket baru"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-title">
              <div>
                <strong>Buat Ticket NOC Baru</strong>
                <small>Catat tugas operasional, permintaan, atau pemeriksaan insiden.</small>
              </div>
              <button onClick={() => setTicketOpen(false)} aria-label="Tutup">×</button>
            </div>
            <label>
              Subjek
              <input placeholder="Judul singkat pekerjaan atau observasi" />
            </label>
            <div className="two-inputs">
              <label>
                Proyek
                <select defaultValue="SM">
                  <option>SM</option>
                  <option>B2B</option>
                  <option>USIEM</option>
                  <option>MB</option>
                  <option>EPC Tools</option>
                  <option>DM</option>
                  <option>UNEM</option>
                </select>
              </label>
              <label>
                Tingkat prioritas
                <select defaultValue="Rendah">
                  <option>Rendah</option>
                  <option>Sedang</option>
                  <option>Tinggi</option>
                  <option>Kritis</option>
                </select>
              </label>
            </div>
            <label>
              Catatan operasional
              <textarea placeholder="Masukkan observasi rinci, kode error, dan tindakan yang diperlukan..." rows={4} />
            </label>
            <div className="modal-actions">
              <button className="button button-secondary" onClick={() => setTicketOpen(false)}>
                Batal
              </button>
              <button
                className="button button-primary"
                onClick={() => {
                  setTicketOpen(false);
                  announce("Ticket baru berhasil dibuat dan dicatat.");
                }}
              >
                Kirim ticket
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Ticket Detail Drawer */}
      {selectedTicket && (
        <div className="drawer-backdrop" onMouseDown={() => setSelectedTicket(null)}>
          <div
            className="drawer-body"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="drawer-header">
              <div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                  <Badge tone={selectedTicket.severity === "Tinggi" ? "critical" : "info"}>
                    Prioritas {selectedTicket.severity}
                  </Badge>
                  <Badge tone={selectedTicket.status === "Ditutup" ? "success" : "warning"}>
                    {selectedTicket.status}
                  </Badge>
                </div>
                <h2 style={{ fontSize: "18px", fontWeight: "700", margin: "0", color: "var(--ink-primary)" }}>
                  {selectedTicket.subject}
                </h2>
                <span style={{ fontSize: "11px", color: "var(--ink-muted)", fontFamily: "var(--font-mono)" }}>
                  ID Ticket: #{selectedTicket.id} · Dibuat pukul {selectedTicket.created}
                </span>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "6px",
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "var(--ink-muted)",
                  fontSize: "18px"
                }}
              >
                ×
              </button>
            </div>

            <div className="drawer-content-inner">
              <div style={{ marginBottom: "20px" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--ink-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
                  Proyek & penanggung jawab
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "8px" }}>
                  <ProjectMark name={selectedTicket.project} />
                  <div>
                    <strong style={{ display: "block", fontSize: "13px", color: "var(--ink-primary)" }}>
                      {selectedTicket.project}
                    </strong>
                    <span style={{ fontSize: "11px", color: "var(--ink-secondary)" }}>
                      Ditugaskan kepada {selectedTicket.owner}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--ink-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
                  Deskripsi
                </span>
                <p style={{ margin: "8px 0 0", color: "var(--ink-secondary)", fontSize: "13px", lineHeight: "1.5" }}>
                  {selectedTicket.description || "Item aktivitas operasional yang memerlukan pemeriksaan dan konfirmasi rutin."}
                </p>
              </div>

              <div>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--ink-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
                  Riwayat aktivitas
                </span>
                <div style={{ marginTop: "12px", display: "grid", gap: "12px" }}>
                  {selectedTicket.history ? (
                    selectedTicket.history.map((h, i) => (
                      <div key={i} style={{ display: "flex", gap: "10px", fontSize: "12px", padding: "10px", background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--line)", borderRadius: "8px" }}>
                        <span style={{ color: "var(--accent-blue)", fontFamily: "var(--font-mono)", fontWeight: "600" }}>{h.time}</span>
                        <div style={{ flex: 1 }}>
                          <strong style={{ display: "block", color: "var(--ink-primary)" }}>{h.action}</strong>
                          <span style={{ color: "var(--ink-muted)", fontSize: "11px" }}>oleh {h.author}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: "var(--ink-muted)", fontSize: "12px" }}>Belum ada riwayat aktivitas yang tercatat.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="drawer-footer">
              <button
                className="button button-secondary"
                onClick={() => {
                  announce(`Ticket #${selectedTicket.id} dieskalasikan ke Lead Operator.`);
                  setSelectedTicket(null);
                }}
              >
                Eskalasi
              </button>
              <button
                className="button button-primary"
                onClick={() => {
                  announce(`Ticket #${selectedTicket.id} ditandai selesai.`);
                  setSelectedTicket(null);
                }}
              >
                Tandai selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Handover operational record */}
      {handoverOpen && (
        <div className="modal-backdrop" onMouseDown={() => setHandoverOpen(false)}>
          <section
            className="handover-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Catatan handover shift Subuh ke Pagi"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="handover-modal-header">
              <div>
                <div className="handover-modal-kicker"><span className="live-dot" /> CATATAN HANDOVER · {formatHandoverDate(handoverDate).toUpperCase()}</div>
                <h2>Handover Shift {handoverRecord.sourceShift} <span>→</span> {handoverRecord.targetShift}</h2>
                <p>Catatan operasional, temuan, dan tugas lanjutan yang telah diterima oleh tim shift {handoverRecord.targetShift.toLowerCase()}.</p>
              </div>
              <div className="handover-header-actions">
                <button className="handover-new-trigger" onClick={openNewHandoverDraft}>＋ Buat baru</button>
                <button className="handover-modal-close" onClick={() => setHandoverOpen(false)} aria-label="Tutup catatan handover">×</button>
              </div>
            </header>

            <div className="handover-modal-scroll">
              <div className="handover-records-bar">
                <span>CATATAN TERSIMPAN</span>
                <div>
                  {handoverLoading ? <small>Memuat catatan…</small> : handoverRecords.length ? handoverRecords.slice(0, 4).map((record) => (
                    <button className={handoverRecordId === record.id ? "active" : ""} key={record.id} onClick={() => openStoredHandover(record)}>
                      {formatHandoverDate(record.handoverDate)}
                    </button>
                  )) : <small>Belum ada catatan handover tersimpan.</small>}
                </div>
              </div>
              <section className="handover-meta" aria-label="Informasi shift">
                <div className="handover-meta-item">
                  <span>TANGGAL</span>
                  <strong>{formatHandoverDate(handoverDate)}</strong>
                </div>
                <div className="handover-meta-item">
                  <span>PIC SHIFT {handoverRecord.sourceShift.toUpperCase()}</span>
                  <strong>{handoverRecord.sourcePic}</strong>
                </div>
                <div className="handover-meta-item">
                  <span>PIC SHIFT {handoverRecord.targetShift.toUpperCase()}</span>
                  <strong>{handoverRecord.targetPic}</strong>
                </div>
              </section>

              <section className="handover-section handover-monitoring-card">
                <div className="handover-section-heading">
                  <div>
                    <span>01</span>
                    <h3>Monitoring &amp; Report Telegram</h3>
                  </div>
                  <Badge tone="success">Tervalidasi</Badge>
                </div>
                <p className="handover-section-copy">{handoverRecord.monitoringSummary}</p>
                <div className="handover-assignment">
                  <div className="handover-person">
                    <span className="avatar avatar-2">{handoverRecord.monitoringOwner.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span>
                    <div><small>PENANGGUNG JAWAB MONITORING</small><strong>{handoverRecord.monitoringOwner} · {handoverRecord.monitoredProjects.length} project</strong></div>
                  </div>
                  <div className="handover-project-list" aria-label="Daftar proyek yang dimonitor">
                    {handoverRecord.monitoredProjects.map((project) => <span key={project}>{project}</span>)}
                  </div>
                </div>
                <div className="handover-validation-note">
                  <b>✓</b>
                  <span><strong>Validasi Shift {handoverRecord.targetShift} baik dan sesuai.</strong> {handoverRecord.validationNote}</span>
                </div>
              </section>

              <section className="handover-section">
                <div className="handover-section-heading">
                  <div>
                    <span>02</span>
                    <h3>Temuan dari Shift Subuh</h3>
                  </div>
                  <Badge tone="warning">{handoverRecord.findings.length} tindak lanjut</Badge>
                </div>
                <div className="handover-finding-list">
                  {handoverRecord.findings.length ? handoverRecord.findings.map((finding, index) => (
                    <article className="handover-finding" key={`${finding.title}-${index}`}>
                      <div className="handover-finding-top"><ProjectMark name={finding.project || "NOC"} /><span className={`handover-status handover-status-${finding.state}`}>{finding.state === "waiting" ? "Dipantau" : "On follow up"}</span></div>
                      <strong>{finding.title || "Temuan tanpa judul"}</strong>
                      <p>{finding.detail || "Belum ada keterangan temuan."}</p>
                    </article>
                  )) : <div className="handover-empty-note">Tidak ada temuan yang perlu ditindaklanjuti pada handover ini.</div>}
                </div>
              </section>

              <section className="handover-section handover-task-section">
                <div className="handover-section-heading handover-task-heading">
                  <div>
                    <span>03</span>
                    <h3>Hasil Handover Shift {handoverRecord.sourceShift} → {handoverRecord.targetShift}</h3>
                  </div>
                  <div className="handover-task-progress">
                    <span>{handoverTasks.filter((task) => task.completed).length} dari {handoverTasks.length} diterima</span>
                    <i><b style={{ width: `${handoverProgressPercent}%` }} /></i>
                  </div>
                </div>

                <div className="handover-filters" aria-label="Filter status tugas handover">
                  {([
                    ["all", "Semua"],
                    ["repeat", "Berulang"],
                    ["waiting", "Menunggu konfirmasi"],
                    ["in-progress", "On progress"],
                  ] as Array<["all" | HandoverState, string]>).map(([value, label]) => (
                    <button key={value} className={handoverFilter === value ? "active" : ""} onClick={() => setHandoverFilter(value)}>{label}</button>
                  ))}
                </div>

                <div className="handover-task-list">
                  {visibleHandoverTasks.map((task) => (
                    <article className={`handover-task ${task.completed ? "confirmed" : ""}`} key={task.id}>
                      <button
                        className="handover-task-toggle"
                        onClick={() => toggleHandoverTask(task.id)}
                        aria-label={`${task.completed ? "Batalkan konfirmasi" : "Konfirmasi penerimaan"} tugas ${task.title}`}
                        title={task.completed ? "Terkonfirmasi oleh shift pagi" : "Konfirmasi penerimaan tugas"}
                      >
                        {task.completed ? "✓" : ""}
                      </button>
                      <div className="handover-task-content">
                        <div className="handover-task-title"><ProjectMark name={task.project} /><strong>{task.title}</strong></div>
                        <p>{task.detail}</p>
                      </div>
                      <span className={`handover-status handover-status-${task.state}`}>
                        {task.state === "repeat" ? "Berulang" : task.state === "waiting" ? "Menunggu konfirmasi" : "On progress"}
                      </span>
                    </article>
                  ))}
                </div>
              </section>
            </div>

            <footer className="handover-modal-footer">
              <span><b>●</b> {handoverTasks.filter((task) => !task.completed).length} item prioritas masih memerlukan tindak lanjut.</span>
              <div>
                <button className="button button-secondary" onClick={() => { setHandoverOpen(false); announce("Catatan handover ditutup. Perubahan konfirmasi tersimpan pada catatan aktif."); }}>Tutup catatan</button>
                <button className="button button-primary" onClick={() => { setHandoverOpen(false); announce(`Handover Shift ${handoverRecord.sourceShift} ke ${handoverRecord.targetShift} telah dikonfirmasi.`); }}>Konfirmasi handover</button>
              </div>
            </footer>
          </section>
        </div>
      )}

      {/* New handover form */}
      {handoverDraftOpen && (
        <div className="modal-backdrop" onMouseDown={() => setHandoverDraftOpen(false)}>
          <section className="handover-form-modal" role="dialog" aria-modal="true" aria-label="Buat catatan handover baru" onMouseDown={(event) => event.stopPropagation()}>
            <header className="handover-modal-header">
              <div>
                <div className="handover-modal-kicker"><span className="live-dot" /> CATATAN BARU</div>
                <h2>Buat handover baru</h2>
                <p>Lengkapi informasi serah-terima untuk membuat catatan yang dapat dibuka dan dikonfirmasi oleh shift berikutnya.</p>
              </div>
              <button className="handover-modal-close" onClick={() => setHandoverDraftOpen(false)} aria-label="Tutup formulir handover">×</button>
            </header>

            <div className="handover-form-scroll">
              <section className="handover-form-section">
                <div className="handover-form-section-title"><span>01</span><div><h3>Identitas handover</h3><p>Siapa yang menyerahkan dan menerima shift.</p></div></div>
                <div className="handover-form-grid handover-form-grid-three">
                  <label>Tanggal<input type="date" value={handoverDraft.date} onChange={(event) => setHandoverDraft((previous) => ({ ...previous, date: event.target.value }))} required /></label>
                  <label>Shift pengirim<input value={handoverDraft.sourceShift} onChange={(event) => setHandoverDraft((previous) => ({ ...previous, sourceShift: event.target.value }))} placeholder="Contoh: Subuh" required /></label>
                  <label>Shift penerima<input value={handoverDraft.targetShift} onChange={(event) => setHandoverDraft((previous) => ({ ...previous, targetShift: event.target.value }))} placeholder="Contoh: Pagi" required /></label>
                  <label>PIC shift pengirim<input value={handoverDraft.sourcePic} onChange={(event) => setHandoverDraft((previous) => ({ ...previous, sourcePic: event.target.value }))} placeholder="Contoh: Agnes" required /></label>
                  <label className="handover-form-wide">PIC shift penerima<input value={handoverDraft.targetPic} onChange={(event) => setHandoverDraft((previous) => ({ ...previous, targetPic: event.target.value }))} placeholder="Pisahkan beberapa nama dengan koma" required /></label>
                </div>
              </section>

              <section className="handover-form-section">
                <div className="handover-form-section-title"><span>02</span><div><h3>Monitoring &amp; validasi</h3><p>Ringkasan kegiatan yang telah dilakukan pada shift pengirim.</p></div></div>
                <div className="handover-form-grid handover-form-grid-two">
                  <label>Penanggung jawab monitoring<input value={handoverDraft.monitoringOwner} onChange={(event) => setHandoverDraft((previous) => ({ ...previous, monitoringOwner: event.target.value }))} placeholder="Nama PIC monitoring" /></label>
                  <label>Project yang dimonitor<input value={handoverDraft.monitoredProjects} onChange={(event) => setHandoverDraft((previous) => ({ ...previous, monitoredProjects: event.target.value }))} placeholder="B2B, DM, EPC, ..." /></label>
                </div>
                <label>Ringkasan monitoring<textarea rows={3} value={handoverDraft.monitoringSummary} onChange={(event) => setHandoverDraft((previous) => ({ ...previous, monitoringSummary: event.target.value }))} placeholder="Jelaskan monitoring dan report yang telah dilakukan." /></label>
                <label>Catatan validasi shift penerima<textarea rows={2} value={handoverDraft.validationNote} onChange={(event) => setHandoverDraft((previous) => ({ ...previous, validationNote: event.target.value }))} placeholder="Hasil validasi saat sesi handover." /></label>
              </section>

              <section className="handover-form-section">
                <div className="handover-form-section-title handover-form-title-action">
                  <div><span>03</span><div><h3>Temuan</h3><p>Tambahkan pengecualian atau isu yang harus ditindaklanjuti.</p></div></div>
                  <button type="button" className="handover-inline-add" onClick={addDraftFinding}>＋ Tambah temuan</button>
                </div>
                <div className="handover-form-repeat-list">
                  {handoverDraft.findings.length ? handoverDraft.findings.map((finding, index) => (
                    <article className="handover-form-repeat" key={`finding-${index}`}>
                      <div className="handover-form-repeat-head"><strong>Temuan {index + 1}</strong><button type="button" onClick={() => removeDraftFinding(index)} aria-label={`Hapus temuan ${index + 1}`}>Hapus</button></div>
                      <div className="handover-form-grid handover-form-grid-three">
                        <label>Project<input value={finding.project} onChange={(event) => updateDraftFinding(index, { project: event.target.value })} placeholder="USIEM" /></label>
                        <label className="handover-form-wide">Judul temuan<input value={finding.title} onChange={(event) => updateDraftFinding(index, { title: event.target.value })} placeholder="Ringkasan masalah" /></label>
                        <label>Status<select value={finding.state} onChange={(event) => updateDraftFinding(index, { state: event.target.value as "waiting" | "in-progress" })}><option value="waiting">Dipantau</option><option value="in-progress">On follow up</option></select></label>
                      </div>
                      <label>Detail temuan<textarea rows={2} value={finding.detail} onChange={(event) => updateDraftFinding(index, { detail: event.target.value })} placeholder="Kondisi terakhir dan langkah tindak lanjut." /></label>
                    </article>
                  )) : <div className="handover-form-empty">Tidak ada temuan. Tambahkan hanya jika ada isu yang perlu diteruskan.</div>}
                </div>
              </section>

              <section className="handover-form-section">
                <div className="handover-form-section-title handover-form-title-action">
                  <div><span>04</span><div><h3>Tugas handover</h3><p>Gunakan ceklis hanya setelah PIC shift penerima mengonfirmasi tugas tersebut.</p></div></div>
                  <button type="button" className="handover-inline-add" onClick={addDraftTask}>＋ Tambah tugas</button>
                </div>
                <div className="handover-form-repeat-list">
                  {handoverDraft.tasks.map((task, index) => (
                    <article className="handover-form-repeat handover-task-editor" key={task.id}>
                      <div className="handover-form-repeat-head"><strong>Tugas {index + 1}</strong><button type="button" onClick={() => removeDraftTask(task.id)} aria-label={`Hapus tugas ${index + 1}`}>Hapus</button></div>
                      <div className="handover-form-grid handover-form-grid-three">
                        <label>Project<input value={task.project} onChange={(event) => updateDraftTask(task.id, { project: event.target.value })} placeholder="SM" /></label>
                        <label className="handover-form-wide">Judul tugas<input value={task.title} onChange={(event) => updateDraftTask(task.id, { title: event.target.value })} placeholder="Tugas yang diteruskan" required /></label>
                        <label>Status<select value={task.state} onChange={(event) => updateDraftTask(task.id, { state: event.target.value as HandoverState })}><option value="repeat">Berulang</option><option value="waiting">Menunggu konfirmasi</option><option value="in-progress">On progress</option></select></label>
                      </div>
                      <label>Instruksi / detail<textarea rows={2} value={task.detail} onChange={(event) => updateDraftTask(task.id, { detail: event.target.value })} placeholder="Jelaskan hal yang perlu dipantau atau dikerjakan." /></label>
                    </article>
                  ))}
                </div>
              </section>
            </div>

            <footer className="handover-modal-footer handover-form-footer">
              <span>Catatan disimpan sebagai rekam handover dan dapat dibuka kembali dari dashboard.</span>
              <div>
                <button className="button button-secondary" onClick={() => setHandoverDraftOpen(false)} disabled={handoverSaving}>Batal</button>
                <button className="button button-primary" onClick={() => void saveHandoverDraft()} disabled={handoverSaving}>{handoverSaving ? "Menyimpan…" : "Simpan & buka handover"}</button>
              </div>
            </footer>
          </section>
        </div>
      )}

      {/* Notifications Popover Modal */}
      {notificationsOpen && (
        <div className="modal-backdrop" onMouseDown={() => setNotificationsOpen(false)}>
          <section
            className="command-modal"
            role="dialog"
            aria-label="Notifikasi aktif"
            onMouseDown={(e) => e.stopPropagation()}
            style={{ width: "min(500px, calc(100vw - 32px))" }}
          >
            <div className="command-input" style={{ justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className="notification-modal-icon"><IconBell size={18} /></span>
                <strong style={{ fontSize: "14px" }}>Alert operasional (3)</strong>
              </div>
              <button onClick={() => setNotificationsOpen(false)} style={{ background: "transparent", color: "var(--ink-muted)", fontSize: "18px" }}>×</button>
            </div>
            <div className="command-results" style={{ padding: "14px" }}>
              <div className="checklist-item" style={{ marginBottom: "10px" }}>
                <span className="status-dot warning" style={{ marginTop: "4px" }} />
                <div>
                  <strong style={{ fontSize: "12px", color: "var(--ink-primary)" }}>Penumpukan Queue ActiveMQ 228</strong>
                  <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--ink-secondary)" }}>Dilaporkan pada checkpoint 18:00 WIB. Memerlukan validasi.</p>
                  <span style={{ fontSize: "9.5px", color: "var(--ink-muted)", fontFamily: "var(--font-mono)" }}>10 menit lalu</span>
                </div>
              </div>
              <div className="checklist-item" style={{ marginBottom: "10px" }}>
                <span className="status-dot warning" style={{ marginTop: "4px" }} />
                <div>
                  <strong style={{ fontSize: "12px", color: "var(--ink-primary)" }}>Peringatan Aliran Pesan B2B</strong>
                  <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--ink-secondary)" }}>Tidak ada pesan yang terdeteksi pada topik b2b-f...</p>
                  <span style={{ fontSize: "9.5px", color: "var(--ink-muted)", fontFamily: "var(--font-mono)" }}>25 menit lalu</span>
                </div>
              </div>
              <div className="checklist-item">
                <span className="status-dot success" style={{ marginTop: "4px" }} />
                <div>
                  <strong style={{ fontSize: "12px", color: "var(--ink-primary)" }}>Pemulihan Otomatis Gateway SIEM</strong>
                  <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--ink-secondary)" }}>Uji kesehatan gateway log USIEM berhasil.</p>
                  <span style={{ fontSize: "9.5px", color: "var(--ink-muted)", fontFamily: "var(--font-mono)" }}>1 jam lalu</span>
                </div>
              </div>
            </div>
            <div className="command-footer" style={{ justifyContent: "flex-end" }}>
              <button
                className="button button-secondary"
                onClick={() => {
                  setNotificationsOpen(false);
                  announce("Semua notifikasi dibersihkan.");
                }}
                style={{ height: "28px", fontSize: "11px" }}
              >
                Bersihkan semua
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Not Adequate Reason / Notes Modal */}
      {pendingAssessmentKey && (
        <div className="modal-backdrop" onMouseDown={() => setPendingAssessmentKey(null)}>
          <section
            className="ticket-modal"
            role="dialog"
            aria-label="Tambah catatan pengecualian checkpoint"
            onMouseDown={(e) => e.stopPropagation()}
            style={{ width: "min(520px, calc(100vw - 32px))" }}
          >
            <div className="modal-title">
              <div>
                <strong style={{ color: "var(--red)" }}>Tandai Checkpoint sebagai Tidak Memadai</strong>
                <small>Masukkan penjelasan atau observasi untuk log handover shift</small>
              </div>
              <button onClick={() => setPendingAssessmentKey(null)}>×</button>
            </div>

            <div style={{ marginBottom: "14px", background: "var(--red-soft)", border: "1px solid var(--red-border)", borderRadius: "8px", padding: "10px 12px", fontSize: "12px", color: "var(--red)" }}>
              <strong>Format wajib:</strong> Jelaskan gejala yang terlihat (misalnya queue menumpuk, aliran pesan hilang, CPU tinggi), komponen terdampak, dan tindakan berikutnya yang direkomendasikan.
            </div>

            <label>
              Alasan pengecualian & catatan tindakan:
              <textarea
                rows={4}
                value={assessmentNote}
                onChange={(e) => setAssessmentNote(e.target.value)}
                placeholder="Contoh: Queue ActiveMQ 228 menumpuk 4.200 pesan. Proses consumer di-restart pukul 22:05; pantau laju pengurangan queue."
                autoFocus
              />
            </label>

            <div className="modal-actions">
              <button className="button button-secondary" onClick={() => setPendingAssessmentKey(null)}>
                Batal
              </button>
              <button
                className="button button-primary"
                style={{ background: "var(--red)", borderColor: "var(--red-border)" }}
                onClick={submitNotAdequate}
              >
                Simpan catatan Tidak Memadai
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Assessment Guidelines Modal */}
      {showAdequacyGuide && (
        <div className="modal-backdrop" onMouseDown={() => setShowAdequacyGuide(false)}>
          <section
            className="ticket-modal"
            role="dialog"
            aria-label="Panduan kecukupan checkpoint"
            onMouseDown={(e) => e.stopPropagation()}
            style={{ width: "min(620px, calc(100vw - 32px))" }}
          >
            <div className="modal-title">
              <div>
                <strong>Cara menentukan kecukupan checkpoint</strong>
                <small>Panduan prosedur operasi standar NOC untuk checkpoint monitoring</small>
              </div>
              <button onClick={() => setShowAdequacyGuide(false)}>×</button>
            </div>

            <div style={{ display: "grid", gap: "14px", fontSize: "12.5px", color: "var(--ink-primary)", lineHeight: 1.5 }}>
              <div style={{ padding: "12px", background: "var(--green-soft)", border: "1px solid var(--green-border)", borderRadius: "8px" }}>
                <strong style={{ color: "var(--green)", fontSize: "13px" }}>✓ Kriteria Memadai (LULUS)</strong>
                <ul style={{ margin: "6px 0 0", paddingLeft: "18px", color: "var(--ink-secondary)" }}>
                  <li><strong>Metrik sesuai SLA:</strong> Utilisasi CPU di bawah 85%, memori stabil, dan latensi respons dalam baseline normal.</li>
                  <li><strong>Aliran pesan aktif:</strong> Topik Kafka aktif mengonsumsi dan menghasilkan pesan tanpa lag tak terduga.</li>
                  <li><strong>Queue nominal:</strong> Kedalaman queue ActiveMQ/RabbitMQ dalam parameter operasi normal.</li>
                  <li><strong>Log & stream:</strong> Stream log Graylog/SIEM terus diperbarui tanpa rangkaian error yang tidak tertangani.</li>
                </ul>
              </div>

              <div style={{ padding: "12px", background: "var(--red-soft)", border: "1px solid var(--red-border)", borderRadius: "8px" }}>
                <strong style={{ color: "var(--red)", fontSize: "13px" }}>✗ Kriteria Tidak Memadai (GAGAL / MEMERLUKAN CATATAN)</strong>
                <ul style={{ margin: "6px 0 0", paddingLeft: "18px", color: "var(--ink-secondary)" }}>
                  <li><strong>Penumpukan queue:</strong> Penumpukan pesan pending atau deadlock terdeteksi pada queue layanan.</li>
                  <li><strong>Traffic hilang:</strong> Tidak ada produksi pesan pada topik Kafka aktif atau stream socket terputus.</li>
                  <li><strong>Alert sumber daya:</strong> Lonjakan CPU atau memori berkelanjutan melebihi ambang alert.</li>
                  <li><strong>Error belum selesai:</strong> Respons error sistem berulang tanpa pemulihan otomatis.</li>
                </ul>
              </div>

              <div style={{ padding: "12px", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "8px" }}>
                <strong style={{ fontSize: "12.5px" }}>📝 Cara memberi catatan saat Tidak Memadai:</strong>
                <ol style={{ margin: "6px 0 0", paddingLeft: "18px", color: "var(--ink-secondary)" }}>
                  <li>Klik <strong>"Tidak memadai"</strong> pada baris checkpoint di jadwal.</li>
                  <li>Di modal, masukkan 3 elemen utama: <strong>Gejala</strong>, <strong>Komponen terdampak</strong>, dan <strong>Tindakan saat ini</strong> (atau ID ticket terbuka).</li>
                  <li>Kirim catatan agar tampil langsung di baris dashboard dan masuk ke laporan handover shift.</li>
                </ol>
              </div>
            </div>

            <div className="modal-actions">
              <button className="button button-primary" onClick={() => setShowAdequacyGuide(false)}>
                Mengerti, tutup panduan
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
