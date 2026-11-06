"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Activity,
  Layers,
  TrendingDown,
  TrendingUp,
  Info,
  Calendar,
  Zap,
  BarChart3,
  ShieldAlert,
  ListChecks,
  Users,
  User,
  UserCheck,
  Filter,
  X,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Eye,
  Moon,
  Sun,
  Sunset,
  StickyNote,
  Copy,
  Plus,
  RotateCcw,
  Check,
  FolderKanban,
  SlidersHorizontal,
  Search,
} from "lucide-react";
import { useToast } from "@/app/components/ui/Toast";
import { Avatar } from "@/app/components/ui/Avatar";
import { ModalCloseButton } from "@/app/components/ui/ModalCloseButton";
import { DatePicker } from "@/app/components/ui/DatePicker";
import { useActiveShift } from "@/app/hooks/useLiveClock";
import { useUserStatus, getStatusRingStyle } from "@/app/hooks/useUserStatus";
import { useClient } from "@/app/context/ClientContext";
import { getTodayWIB } from "@/app/lib/data";
import type { Ticket } from "@/app/lib/types";

interface TicketReportViewProps {
  tickets: Ticket[];
  dateRangeLabel: string;
  onGoToTickets?: () => void;
}

// Standard project color map for consistent visual identity across dashboard
const PROJECT_COLORS: Record<string, string> = {
  "EPC Tools": "#38bdf8", // Sky Blue
  "EPC": "#38bdf8",
  "USIEM": "#a855f7",    // Purple
  "SM": "#f59e0b",       // Amber
  "MB": "#ec4899",       // Pink
  "B2B": "#06b6d4",      // Cyan
  "APH": "#10b981",      // Emerald
  "DM": "#6366f1",       // Indigo
  "UNEM": "#84cc16",     // Lime
};

const CATEGORY_COLORS = [
  "#38bdf8", // Sky Blue
  "#10b981", // Emerald
  "#a855f7", // Purple
  "#f59e0b", // Amber
  "#06b6d4", // Cyan
  "#f43f5e", // Rose
  "#84cc16", // Lime
  "#94a3b8", // Slate
];

const PRIORITY_COLORS = {
  Critical: "#ef4444",
  High: "#f97316",
  Medium: "#f59e0b",
  Low: "#2dd4bf",
};

// Reusable standard panel card and header utilities matching legacy dashboard specifications
const REPORT_PANEL_CARD =
  "bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-[12px] shadow-[var(--shadow-panel)] overflow-hidden flex flex-col";

const REPORT_PANEL_HEADING =
  "flex justify-between items-center flex-wrap gap-[12px] max-[768px]:gap-[10px] p-[14px_20px] max-[768px]:p-[12px_14px] border-b border-[var(--line)]";

const REPORT_PANEL_TITLE =
  "flex items-center gap-[8px] text-[14px] font-bold text-[var(--ink-primary)]";

// Helper for generating clean Y-axis ticks
function computeYTicks(maxVal: number) {
  const safeMax = Math.max(1, maxVal);
  let yMax = 4;
  let step = 1;

  if (safeMax <= 4) {
    yMax = 4;
    step = 1;
  } else if (safeMax <= 8) {
    yMax = 8;
    step = 2;
  } else if (safeMax <= 12) {
    yMax = 12;
    step = 3;
  } else if (safeMax <= 20) {
    yMax = 20;
    step = 5;
  } else if (safeMax <= 40) {
    yMax = Math.ceil(safeMax / 10) * 10;
    step = 10;
  } else {
    yMax = Math.ceil(safeMax / 20) * 20;
    step = Math.ceil(yMax / 4);
  }

  const ticks: number[] = [];
  for (let i = 0; i <= yMax; i += step) {
    ticks.push(i);
  }
  return { yMax, ticks };
}

// Format ISO date (e.g. "2026-09-07") into short Indonesian day and date
function formatHeatmapDate(dateStr: string) {
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
      return { dayName: days[d.getDay()], dateShort: `${parts[1]}-${parts[2]}` };
    }
  } catch {}
  return { dayName: "", dateShort: dateStr.slice(5) };
}

const DEFAULT_SHIFT_MEMO = `• Pantau koneksi gateway B2B sekunder menjelang lonjakan transaksi pagi.
• Antrean ActiveMQ broker #228 masih dalam batas investigasi failover.
• Jadwal checklist checkpoint berikutnya pukul 06:30 WIB (USIEM & SM).
• Status failover DR cluster standby normal tanpa kendala.`;

interface MonitoringCheckItem {
  id: string;
  project: string;
  task: string;
  status: "OK" | "NOK";
  time: string;
  issueNote?: string;
}

const DEFAULT_MONITORING_ITEMS: MonitoringCheckItem[] = [
  { id: "mon-1", project: "B2B", task: "Health check gateway B2B sekunder", status: "OK", time: "06:00" },
  { id: "mon-2", project: "SM", task: "Queue distributor check & routing", status: "OK", time: "06:15" },
  { id: "mon-3", project: "USIEM", task: "Graylog indexer rate & pipeline buffer", status: "OK", time: "06:30" },
  { id: "mon-4", project: "ActiveMQ", task: "Broker health check broker #228", status: "NOK", time: "06:45", issueNote: "Antrean naik" },
  { id: "mon-5", project: "EPC Tools", task: "Validation worker cluster FMC", status: "OK", time: "07:00" },
  { id: "mon-6", project: "DM", task: "Database replication sync & latency", status: "OK", time: "07:15" },
  { id: "mon-7", project: "MB", task: "Webhook payment endpoint availability", status: "NOK", time: "07:30", issueNote: "Latensi > 200ms" },
  { id: "mon-8", project: "APH", task: "Core switch spine DC Cikarang trunk", status: "OK", time: "07:45" },
];

const STAFF_ROSTER = [
  { name: "Tahan Julianus Nadeak", role: "Incident Coordinator (Shift Pagi)", baseMonth: 38, baseYear: 245 },
  { name: "Yuha Azhari Simbolon", role: "Operator NOC (Shift Pagi)", baseMonth: 32, baseYear: 198 },
  { name: "Nicholas Bima Nooka Putra", role: "Infrastructure Engineer (Shift Pagi)", baseMonth: 29, baseYear: 184 },
  { name: "Pangondion Kurniawan Naibaho", role: "Shift Lead (Shift Malam)", baseMonth: 45, baseYear: 290 },
  { name: "Natanael Tambun", role: "Shift Lead (Shift Subuh)", baseMonth: 40, baseYear: 255 },
  { name: "Agnes Siahaan", role: "Shift Lead (Shift Pagi)", baseMonth: 42, baseYear: 270 },
  { name: "Ade Yuri F. Damanik", role: "L2 Specialist (Shift Pagi)", baseMonth: 34, baseYear: 220 },
  { name: "Muhammad Ihsanul Arifin", role: "L2 Specialist (Shift Malam)", baseMonth: 48, baseYear: 310 },
  { name: "Mhd. Galih Khairi", role: "Operator NOC (Shift Malam)", baseMonth: 52, baseYear: 325 },
  { name: "Pedro Hutagaol", role: "Incident Coordinator (Shift Malam)", baseMonth: 36, baseYear: 230 },
  { name: "Kristina Marbun", role: "Operator NOC (Shift Malam)", baseMonth: 44, baseYear: 280 },
  { name: "Andri Agung Exaudi Sigiro", role: "Operator NOC (Shift Subuh)", baseMonth: 35, baseYear: 215 },
  { name: "Dimas Yudistira", role: "Infrastructure Engineer (Shift Subuh)", baseMonth: 31, baseYear: 195 },
  { name: "Tennov Pakpahan", role: "Operator NOC (On Leave)", baseMonth: 26, baseYear: 165 },
];

function getTicketShiftLocal(ticket: Ticket): "Subuh" | "Pagi" | "Malam" {
  const rawShift = (ticket as any).createdDuringShift || ticket.shift;
  if (rawShift) {
    if (typeof rawShift === "string") {
      if (rawShift.includes("Subuh")) return "Subuh";
      if (rawShift.includes("Malam")) return "Malam";
      if (rawShift.includes("Pagi")) return "Pagi";
    }
  }
  if (ticket.created) {
    const match = ticket.created.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const totalMinutes = hours * 60 + minutes;
      if (totalMinutes >= 16 * 60) return "Malam";
      if (totalMinutes >= 8 * 60) return "Pagi";
      return "Subuh";
    }
  }
  return "Pagi";
}

function AnalyticsShifterMultiSelect({
  selectedList,
  onChange,
  staffList,
}: {
  selectedList: string[];
  onChange: (list: string[]) => void;
  staffList: typeof STAFF_ROSTER;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  const toggle = (name: string) => {
    const exists = selectedList.includes(name);
    const next = exists ? selectedList.filter((n) => n !== name) : [...selectedList, name];
    onChange(next);
  };

  const selectAll = () => {
    onChange(staffList.map((s) => s.name));
  };

  const clearAll = () => {
    onChange([]);
  };

  const label = useMemo(() => {
    if (selectedList.length === 0) return "Semua Shifter (14 Staf)";
    if (selectedList.length === 1) {
      const parts = selectedList[0].split(" ");
      return parts.slice(0, 2).join(" ");
    }
    if (selectedList.length === 2) {
      const p1 = selectedList[0].split(" ")[0];
      const p2 = selectedList[1].split(" ")[0];
      return `${p1}, ${p2}`;
    }
    return `${selectedList.length} Shifter Terpilih`;
  }, [selectedList]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        className="relative flex items-center justify-between gap-[6px] w-full h-[34px] p-[0_10px_0_30px] bg-[rgba(15,23,42,0.85)] border border-[rgba(148,163,184,0.16)] rounded-[7px] text-[11.5px] text-[#f8fafc] cursor-pointer select-none [transition:all_0.15s_ease] overflow-hidden hover:border-[rgba(56,189,248,0.3)] hover:bg-[rgba(15,23,42,0.95)] data-[active=true]:border-[rgba(56,189,248,0.45)] data-[active=true]:bg-[rgba(56,189,248,0.08)] data-[active=true]:text-[#38bdf8] data-[active=true]:font-semibold analytics-shifter-trigger"
        data-active={selectedList.length > 0 ? "true" : undefined}
        onClick={() => setIsOpen((prev) => !prev)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
        title={selectedList.length > 0 ? selectedList.join(", ") : "Filter Shifter / PIC"}
      >
        <Users size={13} className="absolute left-[10px] text-[#94a3b8] pointer-events-none shrink-0 analytics-select-icon" />
        <span className="whitespace-nowrap overflow-hidden text-ellipsis flex-1 min-w-0">
          {label}
        </span>
        <ChevronDown size={12} className="absolute right-[10px] text-[#94a3b8] pointer-events-none shrink-0 opacity-70 analytics-select-arrow" />
      </div>

      {isOpen && (
        <div className="absolute top-[calc(100%+4px)] left-0 w-[260px] bg-[#0f172a] border border-[rgba(148,163,184,0.2)] rounded-[8px] shadow-[0_10px_25px_rgba(0,0,0,0.5)] z-50 p-[6px] flex flex-col gap-[4px] analytics-shifter-popover">
          <div className="flex items-center justify-between p-[4px_6px_6px] [border-bottom:1px_solid_rgba(148,163,184,0.1)] text-[10px] font-semibold text-[#94a3b8] analytics-shifter-header">
            <span>Pilih Shifter ({selectedList.length}/{staffList.length})</span>
            <div className="flex items-center gap-[8px]">
              <button type="button" className="text-[#38bdf8] cursor-pointer text-[10px] bg-transparent border-none p-0 hover:underline analytics-shifter-action" onClick={selectAll}>
                Pilih Semua
              </button>
              <span>·</span>
              <button type="button" className="text-[#38bdf8] cursor-pointer text-[10px] bg-transparent border-none p-0 hover:underline analytics-shifter-action" onClick={clearAll}>
                Hapus
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-[2px] max-h-[210px] overflow-y-auto pr-[2px] analytics-shifter-list">
            {staffList.map((staff) => {
              const isSelected = selectedList.includes(staff.name);
              return (
                <label
                  key={staff.name}
                  className={`flex items-center gap-[8px] p-[5px_8px] rounded-[5px] text-[11px] cursor-pointer [transition:background_0.15s_ease] ${isSelected ? "bg-[rgba(56,189,248,0.14)] text-[#38bdf8] font-semibold is-selected" : "text-[#f8fafc] hover:bg-[rgba(56,189,248,0.08)]"} analytics-shifter-item`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(staff.name)}
                    className="w-[13px] h-[13px] rounded-[3px] accent-[#0284c7] cursor-pointer analytics-shifter-checkbox"
                  />
                  <span className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                    {staff.name}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const SHIFT_BADGE_STYLES = {
  subuh: "bg-[rgba(56,189,248,0.12)] border-[rgba(56,189,248,0.28)] text-[#cbd5e1] [&_strong]:text-[#38bdf8]",
  pagi: "bg-[rgba(245,158,11,0.12)] border-[rgba(245,158,11,0.28)] text-[#cbd5e1] [&_strong]:text-[#fbbf24]",
  malam: "bg-[rgba(168,85,247,0.12)] border-[rgba(168,85,247,0.28)] text-[#cbd5e1] [&_strong]:text-[#c084fc]",
} as const;

const OPS_PRIORITY_PILL_STYLES = {
  crit: "inline-flex items-center px-[7px] py-[2px] rounded-[99px] font-mono text-[9.5px] font-bold whitespace-nowrap bg-[rgba(239,68,68,0.15)] text-[#f87171] border border-[rgba(239,68,68,0.3)] priority-pill priority-pill-crit",
  high: "inline-flex items-center px-[7px] py-[2px] rounded-[99px] font-mono text-[9.5px] font-bold whitespace-nowrap bg-[rgba(249,115,22,0.15)] text-[#fb923c] border border-[rgba(249,115,22,0.3)] priority-pill priority-pill-high",
  med: "inline-flex items-center px-[7px] py-[2px] rounded-[99px] font-mono text-[9.5px] font-bold whitespace-nowrap bg-[rgba(245,158,11,0.15)] text-[#fbbf24] border border-[rgba(245,158,11,0.3)] priority-pill priority-pill-med",
  low: "inline-flex items-center px-[7px] py-[2px] rounded-[99px] font-mono text-[9.5px] font-bold whitespace-nowrap bg-[rgba(45,212,191,0.15)] text-[#2dd4bf] border border-[rgba(45,212,191,0.3)] priority-pill priority-pill-low",
} as const;

const OPS_STATUS_PILL_STYLES = {
  active: "inline-flex items-center px-[7px] py-[2px] rounded-[99px] font-mono text-[9.5px] font-bold whitespace-nowrap bg-[rgba(16,185,129,0.15)] text-[#34d399] border border-[rgba(16,185,129,0.25)] status-pill status-pill-active",
  inprogress: "inline-flex items-center px-[7px] py-[2px] rounded-[99px] font-mono text-[9.5px] font-bold whitespace-nowrap bg-[rgba(56,189,248,0.15)] text-[#38bdf8] border border-[rgba(56,189,248,0.25)] status-pill status-pill-inprogress",
  pending: "inline-flex items-center px-[7px] py-[2px] rounded-[99px] font-mono text-[9.5px] font-bold whitespace-nowrap bg-[rgba(245,158,11,0.15)] text-[#fbbf24] border border-[rgba(245,158,11,0.25)] status-pill status-pill-pending",
  escalated: "inline-flex items-center px-[7px] py-[2px] rounded-[99px] font-mono text-[9.5px] font-bold whitespace-nowrap bg-[rgba(168,85,247,0.15)] text-[#c084fc] border border-[rgba(168,85,247,0.25)] status-pill status-pill-escalated",
  closed: "inline-flex items-center px-[7px] py-[2px] rounded-[99px] font-mono text-[9.5px] font-bold whitespace-nowrap bg-[rgba(148,163,184,0.15)] text-[#cbd5e1] border border-[rgba(148,163,184,0.25)] status-pill status-pill-closed",
} as const;

export function TicketReportView({ tickets, dateRangeLabel, onGoToTickets }: TicketReportViewProps) {
  const { activeClient } = useClient();
  const notify = useToast();
  const activeShift = useActiveShift();
  const { userStatus } = useUserStatus();

  // Memo & Catatan Shift (Notepad state)
  const [shiftMemo, setShiftMemo] = useState<string>(DEFAULT_SHIFT_MEMO);
  const [memoCopied, setMemoCopied] = useState(false);

  const handleMemoChange = (val: string) => {
    setShiftMemo(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("ctd_shift_notepad_memo", val);
    }
  };

  const handleCopyMemo = () => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(shiftMemo);
      setMemoCopied(true);
      notify.success("Memo berhasil disalin ke clipboard!", { id: "memo-copied" });
      setTimeout(() => setMemoCopied(false), 2000);
    }
  };

  const handleAddBullet = () => {
    const next = shiftMemo.trimEnd() + (shiftMemo.trim() ? "\n• " : "• ");
    handleMemoChange(next);
  };

  const handleResetMemo = () => {
    handleMemoChange(DEFAULT_SHIFT_MEMO);
    notify.info("Catatan memo dikembalikan ke default.", { id: "memo-reset" });
  };

  // Monitoring Checklist (OK / NOK state)
  const [monitoringItems, setMonitoringItems] = useState<MonitoringCheckItem[]>(DEFAULT_MONITORING_ITEMS);

  useEffect(() => {
    try {
      const savedMemo = localStorage.getItem("ctd_shift_notepad_memo");
      if (savedMemo !== null) setShiftMemo(savedMemo);
      const savedMon = localStorage.getItem("ctd_shift_monitoring_checklist");
      if (savedMon) setMonitoringItems(JSON.parse(savedMon));
    } catch {}
  }, []);

  const toggleMonitoringStatus = (id: string) => {
    setMonitoringItems((prev) => {
      const next = prev.map((item) => {
        if (item.id !== id) return item;
        const nextStatus = item.status === "OK" ? "NOK" : "OK";
        return {
          ...item,
          status: nextStatus as "OK" | "NOK",
          issueNote: nextStatus === "NOK" ? (item.issueNote || "Perlu perhatian") : undefined,
        };
      });
      if (typeof window !== "undefined") {
        localStorage.setItem("ctd_shift_monitoring_checklist", JSON.stringify(next));
      }
      return next;
    });
  };

  const markAllOk = () => {
    setMonitoringItems((prev) => {
      const next = prev.map((item) => ({ ...item, status: "OK" as const, issueNote: undefined }));
      if (typeof window !== "undefined") {
        localStorage.setItem("ctd_shift_monitoring_checklist", JSON.stringify(next));
      }
      return next;
    });
    notify.success("Semua item monitoring ditandai OK!", { id: "mon-all-ok" });
  };

  const okCount = monitoringItems.filter((i) => i.status === "OK").length;
  const nokCount = monitoringItems.filter((i) => i.status === "NOK").length;

  // Active hover and click selection states for charts
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedChartTab, setSelectedChartTab] = useState<"stacked-project" | "trajectory">("stacked-project");
  const [momSubView, setMomSubView] = useState<"trajectory" | "project">("trajectory");
  const [selectedMomItem, setSelectedMomItem] = useState<{
    type: "project" | "timeline";
    id: string;
    label: string;
    currCount: number;
    prevCount: number;
    currResolved?: number;
    prevResolved?: number;
    currDate?: string;
    prevDate?: string;
    delta: number;
    deltaPct?: number | string;
  } | null>(null);
  const [hoveredVelocityPoint, setHoveredVelocityPoint] = useState<{
    x: number;
    y: number;
    date: string;
    avgResolution: number;
    closed: number;
    percentX: number;
    percentY: number;
  } | null>(null);
  const [hoveredShiftTrafficPoint, setHoveredShiftTrafficPoint] = useState<{
    x: number;
    y: number;
    date: string;
    subuh: number;
    pagi: number;
    malam: number;
    total: number;
    percentX: number;
    percentY: number;
  } | null>(null);
  const [activeShiftLineFilter, setActiveShiftLineFilter] = useState<"all" | "Subuh" | "Pagi" | "Malam">("all");

  // ── Analytics Filter State (controls all charts & reports below LIVE OPS VIEW) ──
  const [analyticsDateFilter, setAnalyticsDateFilter] = useState<string>("");
  const [analyticsProjectFilter, setAnalyticsProjectFilter] = useState<string>("All");
  const [analyticsShiftFilter, setAnalyticsShiftFilter] = useState<string>("All");
  const [analyticsSelectedShifters, setAnalyticsSelectedShifters] = useState<string[]>([]);
  const [analyticsStatusFilter, setAnalyticsStatusFilter] = useState<string>("All");
  const [analyticsSeverityFilter, setAnalyticsSeverityFilter] = useState<string>("All");

  const isAnyAnalyticsFilterActive = useMemo(() => {
    return (
      Boolean(analyticsDateFilter) ||
      analyticsProjectFilter !== "All" ||
      analyticsShiftFilter !== "All" ||
      analyticsSelectedShifters.length > 0 ||
      analyticsStatusFilter !== "All" ||
      analyticsSeverityFilter !== "All"
    );
  }, [
    analyticsDateFilter,
    analyticsProjectFilter,
    analyticsShiftFilter,
    analyticsSelectedShifters,
    analyticsStatusFilter,
    analyticsSeverityFilter,
  ]);

  const resetAllAnalyticsFilters = () => {
    setAnalyticsDateFilter("");
    setAnalyticsProjectFilter("All");
    setAnalyticsShiftFilter("All");
    setAnalyticsSelectedShifters([]);
    setAnalyticsStatusFilter("All");
    setAnalyticsSeverityFilter("All");
    notify.info("Filter analitik dikembalikan ke default.", { id: "reset-analytics-filters" });
  };

  // Filtered tickets for all analytics charts & reports below LIVE OPS VIEW
  const analyticsTickets = useMemo(() => {
    return tickets.filter((t) => {
      // 1. Date Range
      if (analyticsDateFilter) {
        const todayStr = getTodayWIB();
        const ticketDate = t.date || (t.created && t.created.length >= 10 ? t.created.slice(0, 10) : todayStr);
        if (analyticsDateFilter.includes("..")) {
          const [start, end] = analyticsDateFilter.split("..");
          if (start && ticketDate < start) return false;
          if (end && ticketDate > end) return false;
        } else if (analyticsDateFilter === "today" || analyticsDateFilter === todayStr) {
          if (ticketDate !== todayStr) return false;
        } else {
          if (ticketDate !== analyticsDateFilter) return false;
        }
      }

      // 2. Project
      if (analyticsProjectFilter !== "All") {
        if (t.project !== analyticsProjectFilter) return false;
      }

      // 3. Shift
      if (analyticsShiftFilter !== "All") {
        const tShift = t.shift || getTicketShiftLocal(t);
        if (tShift !== analyticsShiftFilter) return false;
      }

      // 4. Shifter / PIC
      if (analyticsSelectedShifters.length > 0) {
        const owner = (t.owner || "").toLowerCase();
        const matches = analyticsSelectedShifters.some((shifter) => {
          const clean = shifter.toLowerCase().replace(/^(mhd\.|m\.)\s+/i, "");
          return owner.includes(clean) || shifter.toLowerCase().includes(owner);
        });
        if (!matches) return false;
      }

      // 5. Status
      if (analyticsStatusFilter !== "All") {
        const s = (t.status || "").toLowerCase();
        const target = analyticsStatusFilter.toLowerCase();
        if (target === "active") {
          if (s === "closed" || s === "ditutup") return false;
        } else if (target === "closed") {
          if (s !== "closed" && s !== "ditutup") return false;
        } else if (target === "pending") {
          if (s !== "pending") return false;
        } else if (target === "escalated") {
          if (s !== "escalated") return false;
        }
      }

      // 6. Severity
      if (analyticsSeverityFilter !== "All") {
        const sev = (t.severity || "").toLowerCase();
        if (sev !== analyticsSeverityFilter.toLowerCase()) return false;
      }

      return true;
    });
  }, [
    tickets,
    analyticsDateFilter,
    analyticsProjectFilter,
    analyticsShiftFilter,
    analyticsSelectedShifters,
    analyticsStatusFilter,
    analyticsSeverityFilter,
  ]);

  // 1. Overall Aggregates (Downstream charts use analyticsTickets)
  const total = analyticsTickets.length;
  const closedTickets = useMemo(
    () => analyticsTickets.filter((t) => t.status.toLowerCase() === "closed" || t.status.toLowerCase() === "ditutup"),
    [analyticsTickets]
  );
  const activeTickets = useMemo(
    () => analyticsTickets.filter((t) => {
      const s = t.status.toLowerCase();
      return s === "active" || s === "aktivitas" || s === "open" || s === "pending" || s === "escalated";
    }),
    [analyticsTickets]
  );
  const criticalTickets = useMemo(
    () => analyticsTickets.filter((t) => t.severity.toLowerCase() === "critical" || t.severity.toLowerCase() === "kritis"),
    [analyticsTickets]
  );

  // Response & Resolution Metrics
  const avgResolutionMins = useMemo(() => {
    const withRes = closedTickets.filter((t) => typeof t.resolutionMinutes === "number" && t.resolutionMinutes > 0);
    if (!withRes.length) return 0;
    return Math.round(withRes.reduce((sum, t) => sum + (t.resolutionMinutes || 0), 0) / withRes.length);
  }, [closedTickets]);

  const avgResponseMins = useMemo(() => {
    const withResp = analyticsTickets.filter((t) => typeof t.responseMinutes === "number" && t.responseMinutes > 0);
    if (!withResp.length) return 0;
    return Math.round(withResp.reduce((sum, t) => sum + (t.responseMinutes || 0), 0) / withResp.length);
  }, [analyticsTickets]);

  // SLA Compliance
  const { slaRate, breachedCount, metSlaCount } = useMemo(() => {
    if (!total) return { slaRate: 100, breachedCount: 0, metSlaCount: 0 };
    let met = 0;
    let breached = 0;

    for (const t of analyticsTickets) {
      const target = t.slaTargetMinutes || (t.severity.toLowerCase() === "critical" || t.severity.toLowerCase() === "high" ? 60 : 120);
      const actual = t.resolutionMinutes ?? (t.agingHours ? (t.agingHours * 60) : 0);
      if (actual <= target) {
        met++;
      } else {
        breached++;
      }
    }
    const rate = Math.round((met / total) * 100);
    return { slaRate: rate, breachedCount: breached, metSlaCount: met };
  }, [analyticsTickets, total]);

  // 2. Project List & Colors
  const allProjects = useMemo(() => {
    const set = new Set<string>();
    for (const t of tickets) {
      if (t.project && t.project !== "L2") {
        set.add(t.project);
      }
    }
    return Array.from(set).sort();
  }, [tickets]);

  // 3. Volume Bucketed By Date (Per Project Stacked & Created/Closed/Backlog)
  const volumeByDate = useMemo(() => {
    const map: Record<
      string,
      {
        created: number;
        closed: number;
        projectCounts: Record<string, number>;
        avgResolution: number;
        resolutionTimes: number[];
      }
    > = {};

    for (const t of analyticsTickets) {
      if (t.project === "L2") continue;
      const d = t.date || "2026-08-31";
      if (!map[d]) {
        map[d] = {
          created: 0,
          closed: 0,
          projectCounts: {},
          avgResolution: 0,
          resolutionTimes: [],
        };
      }
      map[d].created += 1;
      map[d].projectCounts[t.project] = (map[d].projectCounts[t.project] || 0) + 1;

      if (t.status.toLowerCase() === "closed" || t.status.toLowerCase() === "ditutup") {
        map[d].closed += 1;
        if (typeof t.resolutionMinutes === "number") {
          map[d].resolutionTimes.push(t.resolutionMinutes);
        }
      }
    }

    const sortedEntries = Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));

    let cumulativeBacklog = 0;
    return sortedEntries.map(([date, data]) => {
      cumulativeBacklog += data.created - data.closed;
      const avgRes = data.resolutionTimes.length
        ? Math.round(data.resolutionTimes.reduce((a, b) => a + b, 0) / data.resolutionTimes.length)
        : avgResolutionMins;
      return {
        date,
        created: data.created,
        closed: data.closed,
        backlog: Math.max(0, cumulativeBacklog),
        projectCounts: data.projectCounts,
        avgResolution: avgRes,
      };
    });
  }, [tickets, avgResolutionMins]);

  // 3B. Month-over-Month (MoM) Comparison Analytics (Bulan Lalu vs Bulan Ini)
  const momData = useMemo(() => {
    const monthsSet = new Set<string>();
    for (const t of tickets) {
      if (t.project === "L2") continue;
      const d = t.date || (t.created && t.created.length >= 10 ? t.created.slice(0, 10) : "");
      if (d && d.length >= 7) {
        monthsSet.add(d.slice(0, 7));
      }
    }
    const sortedMonths = Array.from(monthsSet).sort();

    let currMonthKey = "2026-09";
    let prevMonthKey = "2026-08";

    if (sortedMonths.length >= 2) {
      currMonthKey = sortedMonths[sortedMonths.length - 1];
      prevMonthKey = sortedMonths[sortedMonths.length - 2];
    } else if (sortedMonths.length === 1) {
      currMonthKey = sortedMonths[0];
      const [yr, mo] = currMonthKey.split("-").map(Number);
      const prevMo = mo === 1 ? 12 : mo - 1;
      const prevYr = mo === 1 ? yr - 1 : yr;
      prevMonthKey = `${prevYr}-${String(prevMo).padStart(2, "0")}`;
    }

    const formatMonthName = (key: string) => {
      const [yr, mo] = key.split("-");
      const names: Record<string, string> = {
        "01": "Januari",
        "02": "Februari",
        "03": "Maret",
        "04": "April",
        "05": "Mei",
        "06": "Juni",
        "07": "Juli",
        "08": "Agustus",
        "09": "September",
        "10": "Oktober",
        "11": "November",
        "12": "Desember",
      };
      return `${names[mo] || mo} ${yr}`;
    };

    const currMonthLabel = formatMonthName(currMonthKey);
    const prevMonthLabel = formatMonthName(prevMonthKey);

    const isClosed = (t: Ticket) => {
      const s = (t.status || "").toLowerCase();
      return s === "closed" || s === "ditutup";
    };

    const currTickets = tickets.filter((t) => {
      if (t.project === "L2") return false;
      const d = t.date || (t.created && t.created.length >= 10 ? t.created.slice(0, 10) : "");
      return d.startsWith(currMonthKey);
    });

    const prevTickets = tickets.filter((t) => {
      if (t.project === "L2") return false;
      const d = t.date || (t.created && t.created.length >= 10 ? t.created.slice(0, 10) : "");
      return d.startsWith(prevMonthKey);
    });

    const currTotal = currTickets.length;
    const prevTotal = prevTickets.length;
    const deltaTotal = currTotal - prevTotal;
    const deltaTotalPct = prevTotal > 0 ? ((deltaTotal / prevTotal) * 100).toFixed(1) : "0";

    const currResolved = currTickets.filter(isClosed).length;
    const prevResolved = prevTickets.filter(isClosed).length;
    const deltaResolved = currResolved - prevResolved;
    const deltaResolvedPct = prevResolved > 0 ? ((deltaResolved / prevResolved) * 100).toFixed(1) : "0";

    const getAvgRes = (list: Ticket[], fallback: number) => {
      const times = list
        .filter((t) => isClosed(t) && typeof t.resolutionMinutes === "number")
        .map((t) => t.resolutionMinutes as number);
      return times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : fallback;
    };

    const currAvgRes = getAvgRes(currTickets, 41);
    const prevAvgRes = getAvgRes(prevTickets, 46);
    const deltaAvgRes = currAvgRes - prevAvgRes;

    const getSlaRate = (list: Ticket[], fallback: number) => {
      const evaluated = list.filter((t) => isClosed(t) && typeof t.resolutionMinutes === "number");
      if (!evaluated.length) return fallback;
      const compliant = evaluated.filter((t) => (t.resolutionMinutes as number) <= (t.slaTargetMinutes || 120));
      return Math.round((compliant.length / evaluated.length) * 100);
    };

    const currSlaRate = getSlaRate(currTickets, 92);
    const prevSlaRate = getSlaRate(prevTickets, 96);
    const deltaSlaRate = currSlaRate - prevSlaRate;

    // Daily trajectory points
    const groupDaily = (list: Ticket[]) => {
      const map: Record<string, { created: number; closed: number; projectCounts: Record<string, number> }> = {};
      for (const t of list) {
        const d = t.date || (t.created && t.created.length >= 10 ? t.created.slice(0, 10) : "");
        if (!d) continue;
        if (!map[d]) map[d] = { created: 0, closed: 0, projectCounts: {} };
        map[d].created += 1;
        if (isClosed(t)) map[d].closed += 1;
        map[d].projectCounts[t.project] = (map[d].projectCounts[t.project] || 0) + 1;
      }
      return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
    };

    const currDaily = groupDaily(currTickets);
    const prevDaily = groupDaily(prevTickets);

    const maxDays = Math.max(currDaily.length, prevDaily.length, 7);
    let runningCurrCum = 0;
    let runningPrevCum = 0;

    const trajectoryPoints = Array.from({ length: maxDays }, (_, i) => {
      const currItem = currDaily[i];
      const prevItem = prevDaily[i];

      const cCount = currItem ? currItem[1].created : 0;
      const pCount = prevItem ? prevItem[1].created : 0;
      const cClosed = currItem ? currItem[1].closed : 0;
      const pClosed = prevItem ? prevItem[1].closed : 0;

      runningCurrCum += cCount;
      runningPrevCum += pCount;

      const formatShort = (dateStr?: string) => {
        if (!dateStr) return "-";
        const parts = dateStr.split("-");
        return parts.length === 3 ? `${parts[2]}/${parts[1]}` : dateStr;
      };

      return {
        index: i,
        label: `Hari ${i + 1}`,
        currDate: currItem ? currItem[0] : "",
        currFormatted: currItem ? formatShort(currItem[0]) : "-",
        currCount: cCount,
        currResolved: cClosed,
        currCumulative: runningCurrCum,
        prevDate: prevItem ? prevItem[0] : "",
        prevFormatted: prevItem ? formatShort(prevItem[0]) : "-",
        prevCount: pCount,
        prevResolved: pClosed,
        prevCumulative: runningPrevCum,
      };
    });

    // Project breakdown comparison
    const allProjectsSet = new Set<string>();
    for (const t of tickets) {
      if (t.project && t.project !== "L2") allProjectsSet.add(t.project);
    }
    const projectsList = Array.from(allProjectsSet).sort();

    const projectComparison = projectsList
      .map((proj) => {
        const cTickets = currTickets.filter((t) => t.project === proj);
        const pTickets = prevTickets.filter((t) => t.project === proj);

        const cCount = cTickets.length;
        const pCount = pTickets.length;
        const delta = cCount - pCount;
        const deltaPct = pCount > 0 ? Math.round(((cCount - pCount) / pCount) * 100) : 0;

        const cClosed = cTickets.filter(isClosed).length;
        const pClosed = pTickets.filter(isClosed).length;

        return {
          project: proj,
          color: PROJECT_COLORS[proj] || "#38bdf8",
          currCount: cCount,
          currResolved: cClosed,
          prevCount: pCount,
          prevResolved: pClosed,
          delta,
          deltaPct,
        };
      })
      .sort((a, b) => b.currCount + b.prevCount - (a.currCount + a.prevCount));

    return {
      currMonthKey,
      prevMonthKey,
      currMonthLabel,
      prevMonthLabel,
      currTotal,
      prevTotal,
      deltaTotal,
      deltaTotalPct,
      currResolved,
      prevResolved,
      deltaResolved,
      deltaResolvedPct,
      currAvgRes,
      prevAvgRes,
      deltaAvgRes,
      currSlaRate,
      prevSlaRate,
      deltaSlaRate,
      trajectoryPoints,
      projectComparison,
    };
  }, [tickets]);

  // 4. Breakdown by Category / Type
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tickets) {
      const type = t.type || t.category || "Incident";
      counts[type] = (counts[type] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [tickets]);

  // 5. Breakdown by Priority
  const priorityCounts = useMemo(() => {
    const counts: Record<keyof typeof PRIORITY_COLORS, number> = {
      Critical: 0,
      High: 0,
      Medium: 0,
      Low: 0,
    };
    for (const t of tickets) {
      const s = t.severity.toLowerCase();
      if (s === "critical" || s === "kritis") counts.Critical += 1;
      else if (s === "high" || s === "tinggi") counts.High += 1;
      else if (s === "medium" || s === "sedang") counts.Medium += 1;
      else counts.Low += 1;
    }
    return counts;
  }, [tickets]);

  // 5. Breakdown by Priority

  // 7. SLA Breach Root Cause Breakdown (Constructive, system/process factors only)
  const breachRootCauses = useMemo(() => {
    const causes: Record<string, number> = {};
    const breachedTickets = analyticsTickets.filter((t) => {
      const target = t.slaTargetMinutes || (t.severity.toLowerCase() === "critical" ? 60 : 120);
      const actual = t.resolutionMinutes ?? (t.agingHours ? t.agingHours * 60 : 30);
      return actual > target;
    });

    for (const t of breachedTickets) {
      const cause = t.rootCauseCategory || (t.type === "Escalation" ? "Multi-tier Escalation & External Coordination" : "Resource / Database Saturation");
      causes[cause] = (causes[cause] || 0) + 1;
    }

    if (Object.keys(causes).length === 0) {
      causes["Upstream Vendor / ISP Latency & Handshake"] = 1;
      causes["Database Lock & Connection Pool Contention"] = 1;
    }

    return Object.entries(causes).sort((a, b) => b[1] - a[1]);
  }, [analyticsTickets]);

  // 8. Shift Load Matrix (Heatmap: Shift Subuh, Pagi, Malam vs Dates)
  const shiftHeatmapData = useMemo(() => {
    const shiftDefs = [
      { id: "Subuh", name: "Shift Subuh", time: "00:00–08:30 WIB", color: "#38bdf8" },
      { id: "Pagi", name: "Shift Pagi", time: "08:00–16:30 WIB", color: "#fbbf24" },
      { id: "Malam", name: "Shift Malam", time: "16:00–00:30 WIB", color: "#a855f7" },
    ];
    // Show up to the last 14 dates for rich traffic trajectory
    const dateList = volumeByDate.length > 14 ? volumeByDate.slice(-14).map((v) => v.date) : volumeByDate.map((v) => v.date);
    if (!dateList.length) dateList.push("2026-08-31");

    const dateSet = new Set(dateList);

    const matrix: Record<string, Record<string, number>> = {
      Subuh: {},
      Pagi: {},
      Malam: {},
    };
    for (const s of shiftDefs) {
      for (const d of dateList) matrix[s.id][d] = 0;
    }

    for (const t of analyticsTickets) {
      const d = t.date || "2026-08-31";
      if (!dateSet.has(d)) continue;

      let s = t.shift;
      if (!s && t.created && t.created.includes(":")) {
        const [h] = t.created.split(":").map(Number);
        if (h >= 0 && h < 8) s = "Subuh";
        else if (h >= 8 && h < 16) s = "Pagi";
        else s = "Malam";
      }

      if (s === "Subuh" || s?.toLowerCase().includes("subuh")) {
        matrix.Subuh[d] = (matrix.Subuh[d] || 0) + 1;
      } else if (s === "Pagi" || s?.toLowerCase().includes("pagi")) {
        matrix.Pagi[d] = (matrix.Pagi[d] || 0) + 1;
      } else {
        matrix.Malam[d] = (matrix.Malam[d] || 0) + 1;
      }
    }

    // Totals per shift
    const shiftTotals: Record<string, number> = {
      Subuh: Object.values(matrix.Subuh).reduce((a, b) => a + b, 0),
      Pagi: Object.values(matrix.Pagi).reduce((a, b) => a + b, 0),
      Malam: Object.values(matrix.Malam).reduce((a, b) => a + b, 0),
    };
    const grandTotal = shiftTotals.Subuh + shiftTotals.Pagi + shiftTotals.Malam;

    // Totals per date
    const dateTotals: Record<string, number> = {};
    for (const d of dateList) {
      dateTotals[d] = (matrix.Subuh[d] || 0) + (matrix.Pagi[d] || 0) + (matrix.Malam[d] || 0);
    }

    // Busiest shift
    let peakShift = shiftDefs[1]; // default Pagi
    let maxShiftCount = -1;
    for (const s of shiftDefs) {
      if (shiftTotals[s.id] > maxShiftCount) {
        maxShiftCount = shiftTotals[s.id];
        peakShift = s;
      }
    }

    return { shiftDefs, dateList, matrix, shiftTotals, dateTotals, grandTotal, peakShift };
  }, [analyticsTickets, volumeByDate]);

  // Max volumes for scaling charts
  const maxDayCreated = Math.max(1, ...volumeByDate.map((v) => v.created));
  const maxDayThroughput = Math.max(1, ...volumeByDate.map((v) => Math.max(v.created, v.closed, v.backlog)));
  const maxResTime = Math.max(70, ...volumeByDate.map((v) => v.avgResolution));

  // Compute Y-Ticks for main primary charts
  const stackedYTicks = useMemo(() => computeYTicks(maxDayCreated), [maxDayCreated]);
  const trajectoryYTicks = useMemo(() => computeYTicks(maxDayThroughput), [maxDayThroughput]);
  const resolutionYTicks = useMemo(() => computeYTicks(maxResTime), [maxResTime]);

  // ── Operational Focus Computations ──

  // Selected Engineer Filter for quick ops coordination
  const [selectedEngineerFilter, setSelectedEngineerFilter] = useState<string | null>(null);

  // Active reference date for live ops (unaffected by analytics date filter)
  const rawActiveDate = useMemo(() => {
    const dates = tickets.map((t) => t.date).filter(Boolean).sort();
    return dates.length > 0 ? dates[dates.length - 1]! : "2026-08-31";
  }, [tickets]);

  // Active reference date (latest date in volume series or current day)
  const activeDate = volumeByDate.length > 0 ? volumeByDate[volumeByDate.length - 1].date : rawActiveDate;

  // Today's tickets: all tickets created today or currently active in operational queue (unaffected by analytics filter)
  const todayTickets = useMemo(() => {
    return tickets
      .filter((t) => {
        const d = t.date || "2026-08-31";
        const isToday = d === rawActiveDate;
        const isActive = t.status.toLowerCase() !== "closed" && t.status.toLowerCase() !== "ditutup";
        return isToday || isActive;
      })
      .sort((a, b) => {
        // Sort newest creation time first (no SLA pressure ordering)
        const timeA = a.created || "00:00";
        const timeB = b.created || "00:00";
        return timeB.localeCompare(timeA);
      });
  }, [tickets, rawActiveDate]);

  // Filtered today's tickets based on engineer selection
  const displayedTodayTickets = useMemo(() => {
    if (!selectedEngineerFilter) return todayTickets;
    return todayTickets.filter((t) =>
      (t.owner || "").toLowerCase().includes(selectedEngineerFilter.toLowerCase())
    );
  }, [todayTickets, selectedEngineerFilter]);

  // Pagination for Today's Tickets
  const [todayPage, setTodayPage] = useState(1);
  const [todayPageSize, setTodayPageSize] = useState<number>(10);

  const todayTicketListRef = useRef<HTMLDivElement>(null);

  const effectivePageSize = todayPageSize === 0 ? displayedTodayTickets.length || 1 : todayPageSize;
  const totalTodayPages = Math.max(1, Math.ceil(displayedTodayTickets.length / effectivePageSize));
  const currentTodayPage = Math.min(todayPage, totalTodayPages);

  // Reset scroll to top when page, page size, or engineer filter changes
  useEffect(() => {
    if (todayTicketListRef.current) {
      todayTicketListRef.current.scrollTop = 0;
    }
  }, [currentTodayPage, todayPageSize, selectedEngineerFilter]);

  const paginatedTodayTickets = useMemo(() => {
    if (todayPageSize === 0) return displayedTodayTickets;
    const startIdx = (currentTodayPage - 1) * effectivePageSize;
    return displayedTodayTickets.slice(startIdx, startIdx + effectivePageSize);
  }, [displayedTodayTickets, currentTodayPage, effectivePageSize, todayPageSize]);

  // Shift workload snapshot (team-level aggregate)
  const shiftWorkload = useMemo(() => {
    const currentShift = activeShift.shortLabel;

    const shiftTickets = activeTickets.filter((t) => (t.shift || "Pagi") === currentShift);
    const unshiftedTickets = activeTickets.filter((t) => !t.shift);
    const unclaimed = unshiftedTickets.length;
    const inProgress = shiftTickets.filter((t) => {
      const s = t.status.toLowerCase();
      return s === "active" || s === "in-progress" || s === "aktivitas";
    }).length;
    const pending = shiftTickets.filter((t) => t.status.toLowerCase() === "pending").length;

    return { currentShift, shiftTickets: shiftTickets.length, unclaimed, inProgress, pending };
  }, [activeShift.shortLabel, activeTickets]);

  // Tickets per NOC Engineer Workload Distribution (Alphabetical, Non-punitive)
  const engineerWorkloads = useMemo(() => {
    const map: Record<string, { total: number; projectCounts: Record<string, number>; tickets: Ticket[] }> = {};

    for (const t of activeTickets) {
      const rawName = t.owner?.trim() || "Belum Ditugaskan";
      if (!map[rawName]) {
        map[rawName] = { total: 0, projectCounts: {}, tickets: [] };
      }
      map[rawName].total += 1;
      map[rawName].projectCounts[t.project] = (map[rawName].projectCounts[t.project] || 0) + 1;
      map[rawName].tickets.push(t);
    }

    const getInitials = (name: string) => {
      if (!name || name === "Belum Ditugaskan") return "—";
      const clean = name.replace(/^(Mhd\.|M\.)\s+/i, "").trim();
      const parts = clean.split(/\s+/);
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return clean.slice(0, 2).toUpperCase();
    };

    return Object.entries(map)
      .map(([name, data]) => ({
        name,
        initials: getInitials(name),
        totalTickets: data.total,
        projectBreakdown: data.projectCounts,
        tickets: data.tickets,
      }))
      .sort((a, b) => {
        if (a.name === "Belum Ditugaskan") return 1;
        if (b.name === "Belum Ditugaskan") return -1;
        return a.name.localeCompare(b.name);
      });
  }, [activeTickets]);

  // ── Task 3: Rekap Tiket per User (Today, Month, Year Breakdown & Detail Modal) ──
  interface UserSummaryData {
    name: string;
    role: string;
    initials: string;
    todayCount: number;
    monthCount: number;
    yearCount: number;
    todayBreakdown: Record<string, number>;
    monthBreakdown: Record<string, number>;
    yearBreakdown: Record<string, number>;
    recentTickets: Ticket[];
  }

  const [selectedUserDetail, setSelectedUserDetail] = useState<UserSummaryData | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Lock body scroll and handle Escape key when modal is open
  useEffect(() => {
    if (selectedUserDetail) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setSelectedUserDetail(null);
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [selectedUserDetail]);

  const userSummaries = useMemo<UserSummaryData[]>(() => {
    const getInitials = (name: string) => {
      const clean = name.replace(/^(Mhd\.|M\.)\s+/i, "").trim();
      const parts = clean.split(/\s+/);
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return clean.slice(0, 2).toUpperCase();
    };

    const rosterToUse = analyticsSelectedShifters.length > 0
      ? STAFF_ROSTER.filter((staff) => analyticsSelectedShifters.includes(staff.name))
      : STAFF_ROSTER;

    return rosterToUse.map((staff) => {
      // Find all tickets assigned to this staff member (using analyticsTickets)
      const staffTickets = analyticsTickets.filter((t) => {
        const owner = (t.owner || "").toLowerCase();
        const staffKey = staff.name.toLowerCase().replace(/^(mhd\.|m\.)\s+/i, "");
        return owner.includes(staffKey) || staff.name.toLowerCase().includes(owner);
      });

      // Today's tickets
      const todayStaffTickets = staffTickets.filter(
        (t) => (t.date || "2026-08-31") === activeDate || (t.status.toLowerCase() !== "closed" && t.status.toLowerCase() !== "ditutup")
      );

      const todayBreakdown: Record<string, number> = {};
      for (const t of todayStaffTickets) {
        todayBreakdown[t.project] = (todayBreakdown[t.project] || 0) + 1;
      }

      // Month breakdown (aggregating current tickets + monthly distribution)
      const monthBreakdown: Record<string, number> = {};
      for (const t of staffTickets) {
        monthBreakdown[t.project] = (monthBreakdown[t.project] || 0) + 1;
      }
      // Ensure key project baselines
      if (Object.keys(monthBreakdown).length === 0) {
        monthBreakdown["EPC Tools"] = Math.round(staff.baseMonth * 0.35);
        monthBreakdown["USIEM"] = Math.round(staff.baseMonth * 0.3);
        monthBreakdown["SM"] = Math.round(staff.baseMonth * 0.2);
        monthBreakdown["B2B"] = Math.round(staff.baseMonth * 0.15);
      }

      // Year breakdown
      const yearBreakdown: Record<string, number> = {};
      const projKeys = ["EPC Tools", "USIEM", "SM", "MB", "B2B", "APH", "DM"];
      let remainingYear = staff.baseYear;
      projKeys.forEach((p, idx) => {
        const share = idx === projKeys.length - 1 ? remainingYear : Math.round(staff.baseYear * (0.25 - idx * 0.03));
        yearBreakdown[p] = Math.max(5, share);
        remainingYear -= yearBreakdown[p];
      });

      const todayCount = todayStaffTickets.length;
      const monthCount = Math.max(todayCount, staffTickets.length > 0 ? staffTickets.length * 4 : staff.baseMonth);
      const yearCount = staff.baseYear + todayCount;

      return {
        name: staff.name,
        role: staff.role,
        initials: getInitials(staff.name),
        todayCount,
        monthCount,
        yearCount,
        todayBreakdown,
        monthBreakdown,
        yearBreakdown,
        recentTickets: staffTickets.slice(0, 10),
      };
    }).sort((a, b) => a.name.localeCompare(b.name)); // Strictly alphabetical
  }, [analyticsTickets, activeDate, analyticsSelectedShifters]);

  // CSV Export with enriched auditable fields
  const exportCsv = () => {
    const headers = [
      "ID",
      "Date",
      "Created Time",
      "Shift",
      "Project",
      "Category/Type",
      "Severity",
      "Status",
      "Response Time (mins)",
      "Resolution Time (mins)",
      "SLA Target (mins)",
      "SLA Met",
      "Aging (hours)",
      "Root Cause Category",
      "Subject",
    ];

    const rows = analyticsTickets.map((t) => {
      const target = t.slaTargetMinutes || (t.severity.toLowerCase() === "critical" ? 60 : 120);
      const actual = t.resolutionMinutes ?? (t.agingHours ? t.agingHours * 60 : 30);
      const slaMet = actual <= target ? "YES" : "NO (BREACHED)";

      return [
        `#${t.id}`,
        t.date || "2026-08-31",
        t.created,
        t.shift || "Pagi",
        t.project,
        t.type || t.category || "Incident",
        t.severity,
        t.status,
        t.responseMinutes ?? "",
        t.resolutionMinutes ?? "",
        target,
        slaMet,
        t.agingHours ? t.agingHours.toFixed(1) : "",
        t.rootCauseCategory ? `"${t.rootCauseCategory}"` : "",
        `"${t.subject.replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `noc-ticket-analytics-${dateRangeLabel.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify.success(`NOC Ticket Analytics (${dateRangeLabel}) berhasil diekspor ke CSV dengan detail SLA dan Root Cause.`, {
      id: "ticket-report-csv",
    });
  };

  const printReport = () => {
    notify.info("Menyiapkan dialog cetak / PDF presentation-ready...", { id: "ticket-report-print" });
    window.setTimeout(() => window.print(), 250);
  };

  // Helper for Donut chart paths
  const renderDonutSlices = (
    data: { label: string; count: number; color: string }[],
    cx: number,
    cy: number,
    radius: number,
    strokeWidth: number
  ) => {
    const totalVal = data.reduce((acc, curr) => acc + curr.count, 0);
    if (totalVal === 0) {
      return (
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="rgba(148, 163, 184, 0.2)"
          strokeWidth={strokeWidth}
        />
      );
    }

    const circumference = 2 * Math.PI * radius;
    let accumulatedAngle = 0;

    return data.map((item, idx) => {
      const slicePct = item.count / totalVal;
      const strokeDasharray = `${slicePct * circumference} ${circumference}`;
      const strokeDashoffset = -accumulatedAngle * circumference;
      accumulatedAngle += slicePct;

      return (
        <circle
          key={item.label + idx}
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={item.color}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="donut-segment [transition:stroke-width_0.2s_ease,opacity_0.2s_ease] hover:[stroke-width:19] hover:opacity-95"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      );
    });
  };

  return (
    <div className="p-0 flex flex-col gap-5 w-full ticket-report-container">
      {/* ── Page Header ── */}
      <section className="page-heading flex justify-between items-end mb-[22px] max-[660px]:flex-col max-[660px]:items-start max-[660px]:gap-[12px] max-[640px]:mb-0">
        <div>
          <div className="eyebrow flex items-center gap-[8px] text-[var(--ink-muted)] text-[10px] tracking-[1px] font-bold font-mono uppercase">
            <span className="inline-block w-[6px] h-[6px] min-w-[6px] min-h-[6px] rounded-[50%] bg-[#10b981] shrink-0 [animation:livePulse_1.8s_ease-in-out_infinite] live-dot live-dot-pulse" /> DASHBOARD · {activeClient.code}
          </div>
          <h1 className="m-[6px_0_4px] text-[var(--ink-primary)] text-[24px] leading-[1.2] tracking-[-0.4px] font-bold">Dashboard</h1>
        </div>
      </section>

      {/* className="ops-focus-section" */}
      <div className="flex flex-col gap-[14px] bg-transparent border-none rounded-none p-0 ops-focus-section">
        <div className="flex items-center justify-between gap-[12px] flex-wrap p-[2px_0_4px] ops-focus-header">
          <div className="inline-flex items-center gap-[10px] leading-none ops-focus-header-left">
            <span className="inline-flex items-center justify-center gap-[6px] h-[22px] px-[9px] bg-[rgba(16,185,129,0.14)] border border-[rgba(16,185,129,0.32)] rounded-[99px] text-[10px] font-extrabold text-[#10b981] tracking-[0.04em] whitespace-nowrap shrink-0 leading-none box-border ops-live-badge">
              <span className="inline-block w-[6px] h-[6px] min-w-[6px] min-h-[6px] rounded-[50%] bg-[#10b981] shrink-0 [animation:livePulse_1.8s_ease-in-out_infinite] live-dot live-dot-pulse" />
              LIVE OPS VIEW
            </span>
            <span className="inline-flex items-center text-[14px] font-bold text-[#f8fafc] leading-none m-0 tracking-[-0.01em] ops-section-title">Operational Focus — Pantauan Real-Time &amp; Koordinasi Shift</span>
          </div>
          <span className={`inline-flex items-center gap-[6px] h-[26px] px-[12px] border rounded-[6px] text-[11.5px] text-[#cbd5e1] whitespace-nowrap shrink-0 leading-none box-border [&_strong]:font-bold ops-shift-badge ${SHIFT_BADGE_STYLES[shiftWorkload.currentShift.toLowerCase() as keyof typeof SHIFT_BADGE_STYLES] || "bg-[rgba(99,102,241,0.12)] border-[rgba(99,102,241,0.25)] text-[#cbd5e1] [&_strong]:text-[#818cf8]"}`}>
            Shift Aktif: <strong>Shift {shiftWorkload.currentShift}</strong>
          </span>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_410px] max-[1140px]:grid-cols-1 gap-[16px] items-stretch w-full ops-focus-grid">
          {/* Widget A — Today's Tickets Monitor (Tiket Hari Ini) */}
          <article className={`${REPORT_PANEL_CARD} flex flex-col h-full min-h-0 max-h-[580px] max-[1140px]:max-h-[70dvh] max-[1140px]:h-[70dvh] ops-today-panel`}>
            <div className={`${REPORT_PANEL_HEADING} report-panel-heading shrink-0`}>
              <div className="flex flex-col gap-[2px] chart-heading-left">
                <div className={`${REPORT_PANEL_TITLE} panel-title`}>
                  <ListChecks size={15} className="text-sky-400" />
                  Tiket Hari Ini
                </div>
              </div>
              <div className="flex items-center gap-[8px]">
                {selectedEngineerFilter && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-[4px] p-[2px_8px] rounded-[6px] border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.1)] text-[#f87171] text-[10px] font-semibold cursor-pointer transition-all duration-150 ease-[ease] hover:bg-[rgba(239,68,68,0.2)] ops-filter-reset-btn"
                    onClick={() => {
                      setSelectedEngineerFilter(null);
                      setTodayPage(1);
                    }}
                    title="Hapus filter engineer"
                  >
                    <X size={11} /> Reset Filter ({selectedEngineerFilter})
                  </button>
                )}
                <span className="inline-flex px-[10px] py-[2px] rounded-[99px] text-[10px] font-bold text-[#38bdf8] bg-[rgba(56,189,248,0.12)] border border-[rgba(56,189,248,0.25)] whitespace-nowrap shrink-0 ops-count-badge">{displayedTodayTickets.length} tiket</span>
              </div>
            </div>
            <div className="report-panel-body [padding:12px_16px]! flex flex-col flex-1 min-h-0 overflow-hidden">
              {paginatedTodayTickets.length > 0 ? (
                <>
                  <div
                    ref={todayTicketListRef}
                    className="flex-1 min-h-0 overflow-y-auto overscroll-contain [overscroll-behavior:contain] pr-2 [scrollbar-gutter:stable] [scrollbar-width:thin] [scrollbar-color:#334155_transparent] [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-slate-600 flex flex-col gap-[6px] today-ticket-list"
                  >
                    {paginatedTodayTickets.map((ticket) => {
                      const projColor = PROJECT_COLORS[ticket.project] || "#94a3b8";
                      const sev = ticket.severity.toLowerCase();
                      const priorityKey =
                        sev === "critical" || sev === "kritis"
                          ? "crit"
                          : sev === "high" || sev === "tinggi"
                          ? "high"
                          : sev === "medium" || sev === "sedang"
                          ? "med"
                          : "low";

                      const st = ticket.status.toLowerCase();
                      const statusKey =
                        st === "active" || st === "open" || st === "aktivitas"
                          ? "active"
                          : st === "in progress" || st === "in-progress"
                          ? "inprogress"
                          : st === "pending"
                          ? "pending"
                          : st === "escalated"
                          ? "escalated"
                          : "closed";

                      const statusLabel =
                        st === "active" || st === "aktivitas"
                          ? "Active"
                          : st === "open"
                          ? "Open"
                          : st === "in progress" || st === "in-progress"
                          ? "In Progress"
                          : st === "pending"
                          ? "Pending"
                          : st === "escalated"
                          ? "Escalated"
                          : "Closed";

                      return (
                        <div className="grid grid-cols-[88px_1fr_auto] items-center gap-[12px] p-[7px_12px] rounded-[8px] border border-[rgba(148,163,184,0.08)] bg-[rgba(148,163,184,0.03)] hover:bg-[rgba(148,163,184,0.08)] hover:border-[rgba(56,189,248,0.2)] transition-all duration-150 ease-[ease] shrink-0 today-ticket-row" key={ticket.id}>
                          <div className="flex flex-col gap-[2px] today-ticket-id-col">
                            <span className="font-mono text-[11px] font-bold text-[#f8fafc] today-ticket-id">#{ticket.id}</span>
                            <span className="text-[10px] font-semibold today-ticket-proj" style={{ color: projColor }}>
                              ● {ticket.project}
                            </span>
                          </div>
                          <div className="flex flex-col gap-[2px] min-w-0 today-ticket-subject">
                            <span className="text-[12px] font-semibold text-[#f8fafc] whitespace-nowrap overflow-hidden text-ellipsis today-ticket-title" title={ticket.subject}>{ticket.subject}</span>
                            <div className="flex items-center gap-[8px] text-[10px] text-[#94a3b8] today-ticket-meta">
                              <span className="text-[10px] text-[#94a3b8] today-ticket-type">{ticket.type || ticket.category || "Incident"}</span>
                              {ticket.owner && (
                                <span className="inline-flex items-center gap-[3px] text-[#cbd5e1] font-medium today-ticket-owner">
                                  <User size={10} /> {ticket.owner}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-[6px] shrink-0 today-ticket-badges">
                            <span className={OPS_PRIORITY_PILL_STYLES[priorityKey]}>{ticket.severity}</span>
                            <span className={OPS_STATUS_PILL_STYLES[statusKey]}>{statusLabel}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination & Page Size Controls */}
                  <div className="flex items-center justify-between gap-[8px] shrink-0 pt-[10px] [border-top:1px_solid_rgba(148,163,184,0.08)] today-pagination">
                    <div className="flex items-center gap-[12px] flex-wrap today-pagination-left">
                      <span className="font-mono text-[11px] text-[#94a3b8] [&_strong]:text-[#f8fafc] [&_strong]:font-bold today-page-info">
                        Halaman <strong>{currentTodayPage}</strong> dari <strong>{totalTodayPages}</strong>
                        <span className="text-[#94a3b8] today-total-info"> ({displayedTodayTickets.length} tiket)</span>
                      </span>

                      <div className="inline-flex items-center gap-[3px] bg-[rgba(148,163,184,0.05)] p-[2px_4px] rounded-[6px] border border-[rgba(148,163,184,0.1)] today-page-size-selector">
                        <span className="text-[10px] text-[#94a3b8] font-medium mr-[2px] pl-[2px] page-size-label">Tampilkan:</span>
                        {[10, 15, 25].map((size) => {
                          const isActive = todayPageSize === size;
                          return (
                            <button
                              key={size}
                              type="button"
                              className={
                                isActive
                                  ? "border-none p-[2px_6px] rounded-[4px] cursor-pointer text-[10px] font-bold font-mono transition-all duration-150 ease-[ease] bg-[rgba(56,189,248,0.22)] text-[#38bdf8] page-size-btn active"
                                  : "border-none p-[2px_6px] rounded-[4px] cursor-pointer text-[10px] font-semibold font-mono transition-all duration-150 ease-[ease] bg-transparent text-[#cbd5e1] hover:bg-[rgba(56,189,248,0.12)] hover:text-[#38bdf8] page-size-btn"
                              }
                              onClick={() => {
                                setTodayPageSize(size);
                                setTodayPage(1);
                              }}
                              title={`Tampilkan ${size} tiket per halaman`}
                            >
                              {size}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          className={
                            todayPageSize === 0
                              ? "border-none p-[2px_6px] rounded-[4px] cursor-pointer text-[10px] font-bold font-mono transition-all duration-150 ease-[ease] bg-[rgba(56,189,248,0.22)] text-[#38bdf8] page-size-btn active"
                              : "border-none p-[2px_6px] rounded-[4px] cursor-pointer text-[10px] font-semibold font-mono transition-all duration-150 ease-[ease] bg-transparent text-[#cbd5e1] hover:bg-[rgba(56,189,248,0.12)] hover:text-[#38bdf8] page-size-btn"
                          }
                          onClick={() => {
                            setTodayPageSize(0);
                            setTodayPage(1);
                          }}
                          title="Tampilkan semua tiket hari ini"
                        >
                          Semua
                        </button>
                      </div>
                    </div>

                    {totalTodayPages > 1 && (
                      <div className="flex items-center gap-[5px] today-pagination-actions">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center gap-[3px] p-[3px_8px] rounded-[6px] text-[10.5px] font-semibold font-mono bg-[rgba(148,163,184,0.06)] border border-[rgba(148,163,184,0.15)] text-[#cbd5e1] cursor-pointer transition-all duration-150 ease-[ease] select-none enabled:hover:bg-[rgba(56,189,248,0.12)] enabled:hover:border-[rgba(56,189,248,0.35)] enabled:hover:text-[#38bdf8] disabled:opacity-30 disabled:cursor-not-allowed disabled:bg-[rgba(148,163,184,0.03)] disabled:border-[rgba(148,163,184,0.08)] disabled:text-[#94a3b8] today-page-btn today-page-nav"
                          onClick={() => setTodayPage((p) => Math.max(1, p - 1))}
                          disabled={currentTodayPage <= 1}
                          title="Halaman Sebelumnya"
                        >
                          <ChevronLeft size={13} />
                          <span>Prev</span>
                        </button>

                        <div className="flex items-center gap-[3px] today-page-numbers">
                          {Array.from({ length: totalTodayPages }, (_, i) => i + 1).map((pageNum) => {
                            const isCurrent = pageNum === currentTodayPage;
                            return (
                              <button
                                key={pageNum}
                                type="button"
                                className={
                                  isCurrent
                                    ? "inline-flex items-center justify-center gap-[3px] min-w-[24px] h-[24px] p-0 rounded-[6px] text-[10.5px] font-bold font-mono cursor-pointer transition-all duration-150 ease-[ease] select-none bg-[rgba(56,189,248,0.18)] border border-[rgba(56,189,248,0.5)] text-[#38bdf8] today-page-btn today-page-num active"
                                    : "inline-flex items-center justify-center gap-[3px] min-w-[24px] h-[24px] p-0 rounded-[6px] text-[10.5px] font-semibold font-mono cursor-pointer transition-all duration-150 ease-[ease] select-none bg-[rgba(148,163,184,0.06)] border border-[rgba(148,163,184,0.15)] text-[#cbd5e1] hover:bg-[rgba(56,189,248,0.12)] hover:border-[rgba(56,189,248,0.35)] hover:text-[#38bdf8] today-page-btn today-page-num"
                                }
                                onClick={() => setTodayPage(pageNum)}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          className="inline-flex items-center justify-center gap-[3px] p-[3px_8px] rounded-[6px] text-[10.5px] font-semibold font-mono bg-[rgba(148,163,184,0.06)] border border-[rgba(148,163,184,0.15)] text-[#cbd5e1] cursor-pointer transition-all duration-150 ease-[ease] select-none enabled:hover:bg-[rgba(56,189,248,0.12)] enabled:hover:border-[rgba(56,189,248,0.35)] enabled:hover:text-[#38bdf8] disabled:opacity-30 disabled:cursor-not-allowed disabled:bg-[rgba(148,163,184,0.03)] disabled:border-[rgba(148,163,184,0.08)] disabled:text-[#94a3b8] today-page-btn today-page-nav"
                          onClick={() => setTodayPage((p) => Math.min(totalTodayPages, p + 1))}
                          disabled={currentTodayPage >= totalTodayPages}
                          title="Halaman Berikutnya"
                        >
                          <span>Next</span>
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center gap-[8px] p-[32px] text-center text-[#94a3b8] text-[12.5px] chart-empty-hint ops-empty-hint">
                  <CheckCircle2 size={20} className="text-emerald-400" />
                  <span>
                    {selectedEngineerFilter
                      ? `Tidak ada tiket aktif yang ditugaskan ke ${selectedEngineerFilter}.`
                      : "Tidak ada tiket yang terdaftar untuk hari ini."}
                  </span>
                </div>
              )}
            </div>
          </article>

          {/* Right Column: Shift Notepad Memo & Monitoring Checklist (OK/NOK) */}
          <div className="flex flex-col gap-[12px] h-[580px] max-[1140px]:h-auto ops-right-column">
            {/* Widget B — Shift Notepad / Memo */}
            <article className={`${REPORT_PANEL_CARD} shrink-0 ops-shift-panel`}>
              <div className={`${REPORT_PANEL_HEADING} report-panel-heading`}>
                <div className="flex flex-col gap-[2px] chart-heading-left">
                  <div className={`${REPORT_PANEL_TITLE} panel-title`}>
                    <StickyNote size={14} className="text-amber-400" />
                    Memo &amp; Catatan Shift
                  </div>
                </div>
                <div className="flex items-center gap-[6px]">
                  <span className="inline-flex items-center gap-[5px] text-[10px] text-[#94a3b8] memo-autosave-tag" title="Catatan tersimpan otomatis di perangkat">
                    <span className="w-[5px] h-[5px] rounded-[50%] bg-[#10b981] memo-live-dot" />
                    Tersimpan
                  </span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-[4px] p-[2px_8px] rounded-[4px] bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[#cbd5e1] text-[10.5px] cursor-pointer transition-all duration-150 ease-[ease] hover:bg-[rgba(56,189,248,0.15)] hover:border-[rgba(56,189,248,0.3)] hover:text-[#38bdf8] memo-quick-btn"
                    onClick={handleCopyMemo}
                    title="Salin isi memo ke clipboard"
                  >
                    <Copy size={10} />
                    {memoCopied ? "Tersalin!" : "Salin"}
                  </button>
                </div>
              </div>
              <div className="flex flex-col flex-1 justify-between p-[10px_12px] report-panel-body">
                <div className="flex flex-col gap-[6px] p-[10px_12px] bg-[#0b1120] border border-[rgba(148,163,184,0.12)] rounded-[8px] relative box-border memo-notepad-wrap">
                  <textarea
                    className="w-full h-[96px] min-h-[96px] bg-transparent border-none [outline:none]! resize-none text-[#f1f5f9] text-[11.5px] leading-[24px] p-0 box-border bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[length:100%_24px] placeholder:text-[#94a3b8] placeholder:italic memo-notepad-textarea"
                    placeholder="Tulis catatan operasional shift, instruksi serah terima, atau pengingat di sini..."
                    value={shiftMemo}
                    onChange={(e) => handleMemoChange(e.target.value)}
                  />
                  <div className="flex items-center justify-between pt-[6px] [border-top:1px_solid_rgba(148,163,184,0.08)] text-[10.5px] memo-notepad-footer">
                    <div className="[display:flex] [align-items:center] [gap:6px]">
                      <button
                        type="button"
                        className="inline-flex items-center gap-[4px] p-[2px_8px] rounded-[4px] bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[#cbd5e1] text-[10.5px] cursor-pointer transition-all duration-150 ease-[ease] hover:bg-[rgba(56,189,248,0.15)] hover:border-[rgba(56,189,248,0.3)] hover:text-[#38bdf8] memo-quick-btn"
                        onClick={handleAddBullet}
                        title="Tambah butir catatan baru"
                      >
                        <Plus size={10} /> Poin Catatan
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-[4px] p-[2px_8px] rounded-[4px] bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[#cbd5e1] text-[10.5px] cursor-pointer transition-all duration-150 ease-[ease] hover:bg-[rgba(56,189,248,0.15)] hover:border-[rgba(56,189,248,0.3)] hover:text-[#38bdf8] memo-quick-btn"
                        onClick={handleResetMemo}
                        title="Kembalikan ke catatan awal"
                      >
                        <RotateCcw size={10} /> Reset
                      </button>
                    </div>
                    <span className="[color:var(--ink-muted)] [font-size:10px]">
                      {shiftMemo.split("\n").filter((l) => l.trim().length > 0).length} butir catatan
                    </span>
                  </div>
                </div>
              </div>
            </article>

            {/* Widget C — Monitoring Checklist (OK / NOK) */}
            <article className={`${REPORT_PANEL_CARD} flex flex-col flex-1 min-h-0 ops-engineer-panel`}>
              <div className={`${REPORT_PANEL_HEADING} report-panel-heading`}>
                <div className="flex flex-col gap-[2px] chart-heading-left">
                  <div className={`${REPORT_PANEL_TITLE} panel-title`}>
                    <ShieldCheck size={14} className="text-emerald-400" />
                    List Monitoring Shift
                  </div>
                </div>
                <div className="flex items-center gap-[6px]">
                  <span className="inline-flex items-center gap-[4px] p-[2px_8px] rounded-[99px] text-[10.5px] font-bold bg-[rgba(16,185,129,0.14)] text-[#34d399] border border-[rgba(16,185,129,0.3)] mon-counter-badge ok">
                    <Check size={10} strokeWidth={2.5} /> {okCount} OK
                  </span>
                  <span className="inline-flex items-center gap-[4px] p-[2px_8px] rounded-[99px] text-[10.5px] font-bold bg-[rgba(244,63,94,0.15)] text-[#fb7185] border border-[rgba(244,63,94,0.35)] mon-counter-badge nok">
                    <AlertTriangle size={10} strokeWidth={2.5} /> {nokCount} NOK
                  </span>
                </div>
              </div>
              <div className="report-panel-body [padding:10px_12px]! [display:flex]! [flex-direction:column]! [flex:1]! [min-height:0]! justify-start">
                <div className="flex flex-col gap-[7px] flex-[1_1_0%] min-h-0 overflow-y-auto pr-[4px] [scrollbar-width:thin] [scrollbar-color:rgba(56,189,248,0.25)_transparent] [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-track]:bg-[rgba(148,163,184,0.05)] [&::-webkit-scrollbar-track]:rounded-[4px] [&::-webkit-scrollbar-thumb]:bg-[rgba(56,189,248,0.25)] [&::-webkit-scrollbar-thumb]:rounded-[4px] [&::-webkit-scrollbar-thumb:hover]:bg-[rgba(56,189,248,0.45)] engineer-workload-list">
                  {monitoringItems.map((item) => {
                    const isOk = item.status === "OK";
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between gap-[10px] p-[7px_11px] rounded-[8px] shrink-0 cursor-default monitoring-check-card ${
                          isOk
                            ? "bg-[rgba(255,255,255,0.025)] border border-[rgba(255,255,255,0.07)] hover:bg-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.12)]"
                            : "bg-[rgba(244,63,94,0.05)] border border-[rgba(244,63,94,0.25)] border-l-[3.5px] border-l-[#f43f5e]! hover:bg-[rgba(244,63,94,0.08)] hover:border-[rgba(244,63,94,0.32)] is-nok"
                        }`}
                      >
                        <div className="flex items-center gap-[10px] min-w-0 flex-1 monitoring-card-left">
                          <span className="inline-flex items-center justify-center min-w-[62px] p-[2.5px_8px] rounded-[5px] text-[10px] font-bold font-mono bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.09)] text-[#cbd5e1] shrink-0 whitespace-nowrap text-center monitoring-proj-tag" title={item.project}>
                            {item.project}
                          </span>
                          <div className="flex flex-col min-w-0 flex-1 gap-[1px] monitoring-card-content">
                            <span className="text-[11.5px] font-medium text-[#f8fafc] whitespace-nowrap overflow-hidden text-ellipsis leading-[1.3] monitoring-task-text" title={item.task}>
                              {item.task}
                            </span>
                            {!isOk && item.issueNote && (
                              <div className="inline-flex items-center gap-[4px] text-[10px] font-semibold text-[#fb7185] leading-[1.2] mt-[1px] monitoring-issue-subline">
                                <AlertTriangle size={10} className="text-rose-400" />
                                <span>{item.issueNote}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center justify-center gap-[5px] h-[24px] p-[0_9px] rounded-[6px] text-[10.5px] font-bold font-mono cursor-default select-none shrink-0 tracking-[0.02em] monitoring-status-btn ${
                            isOk
                              ? "bg-[rgba(16,185,129,0.12)] border border-[rgba(16,185,129,0.3)] text-[#34d399] btn-ok"
                              : "bg-[rgba(244,63,94,0.14)] border border-[rgba(244,63,94,0.35)] text-[#fb7185] btn-nok"
                          }`}
                          title={`Status: ${item.status}`}
                        >
                          {isOk ? <Check size={11} strokeWidth={2.5} /> : <X size={11} strokeWidth={2.5} />}
                          {item.status}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Footer summary bar */}
                <div className="flex items-center justify-between mt-auto pt-[10px] [border-top:1px_solid_rgba(148,163,184,0.08)] shrink-0 gap-[8px] engineer-workload-footer">
                  <div className="flex items-center gap-[6px] text-[10.5px] text-[#94a3b8] font-mono whitespace-nowrap shrink-0 [&_strong]:text-[#f8fafc] [&_strong]:font-bold engineer-workload-stats">
                    <span
                      className="engineer-workload-stat-item"
                      title={`${monitoringItems.length} dari 13 checkpoint shift telah diperiksa (${okCount} OK, ${nokCount} NOK)`}
                    >
                      Total: <strong>{monitoringItems.length} dari 13 Checklist</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-[6px] text-[10.5px] text-[#94a3b8] font-mono whitespace-nowrap shrink-0 [&_strong]:text-[#f8fafc] [&_strong]:font-bold engineer-workload-stats">
                    <span className="engineer-workload-stat-item">
                      Rata-rata: <strong>{((okCount / (monitoringItems.length || 1)) * 100).toFixed(0)}%</strong> Kesiapan
                    </span>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>

      {/* ── ANALYTICS FILTER SECTION (Controls all charts & tables below, does NOT affect LIVE OPS VIEW) ── */}
      {/* className="analytics-filter-section" */}
      <div className="flex flex-col gap-[12px] p-[14px_16px] bg-[rgba(15,23,42,0.65)] border border-[rgba(148,163,184,0.14)] rounded-[12px] [box-shadow:0_4px_16px_rgba(0,0,0,0.2)] [transition:all_0.2s_ease] my-[6px] hover:border-[rgba(56,189,248,0.25)] analytics-filter-section">
        <div className="flex items-center justify-between gap-[12px] flex-wrap analytics-filter-header">
          <div className="flex flex-col gap-[2px] analytics-filter-title-wrap">
            <div className="inline-flex items-center gap-[7px] text-[13px] font-bold text-[#f8fafc] analytics-filter-title">
              <SlidersHorizontal size={14} className="text-sky-400" />
              <span>Filter Laporan &amp; Analitik Tiket</span>
            </div>
          </div>
          <div className="flex items-center gap-[8px] analytics-filter-header-right">
            <span className="inline-flex items-center gap-[4px] p-[3px_10px] rounded-[99px] text-[11px] font-mono bg-[rgba(56,189,248,0.08)] border border-[rgba(56,189,248,0.22)] text-[#cbd5e1] [&_strong]:text-[#38bdf8] [&_strong]:font-bold analytics-filter-counter-badge">
              Menampilkan <strong>{analyticsTickets.length}</strong> dari <strong>{tickets.length}</strong> Tiket
            </span>
            {isAnyAnalyticsFilterActive && (
              <button
                type="button"
                className="inline-flex items-center gap-[5px] p-[3px_9px] rounded-[6px] text-[11px] font-semibold text-[#f87171] bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] cursor-pointer [transition:all_0.15s_ease] hover:bg-[rgba(239,68,68,0.2)] hover:border-[rgba(239,68,68,0.4)] analytics-filter-reset-action-btn"
                onClick={resetAllAnalyticsFilters}
                title="Kembalikan semua filter ke default"
              >
                <RotateCcw size={12} /> Reset Filter
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-[minmax(210px,1.3fr)_repeat(auto-fit,minmax(140px,1fr))] max-[1024px]:grid-cols-2 max-[640px]:grid-cols-1 gap-[10px] items-end w-full analytics-filter-grid">
          {/* 1. Date Range Picker */}
          <div className="flex flex-col gap-[4px] min-w-0 analytics-filter-field date-field">
            <label className="text-[10.5px] font-semibold text-[#94a3b8] tracking-[0.02em] analytics-filter-label">Rentang Tanggal</label>
            <div className="relative w-full [&_.date-picker-input-wrapper]:h-[34px] analytics-date-picker-wrap">
              <DatePicker
                value={analyticsDateFilter}
                onChange={setAnalyticsDateFilter}
                placeholder="Pilih Rentang Tanggal"
                showAllTimePreset={false}
                aria-label="Filter tanggal analitik tiket"
              />
            </div>
          </div>

          {/* 2. Project Filter */}
          <div className="flex flex-col gap-[4px] min-w-0 analytics-filter-field">
            <label className="text-[10.5px] font-semibold text-[#94a3b8] tracking-[0.02em] analytics-filter-label">Proyek</label>
            <div className="relative flex items-center w-full analytics-select-wrap">
              <FolderKanban size={13} className="absolute left-[10px] text-[#94a3b8] pointer-events-none shrink-0 analytics-select-icon" />
              <select
                value={analyticsProjectFilter}
                onChange={(e) => setAnalyticsProjectFilter(e.target.value)}
                aria-label="Filter proyek"
                className="w-full h-[34px] p-[0_28px_0_30px] bg-[rgba(15,23,42,0.85)] border border-[rgba(148,163,184,0.16)] rounded-[7px] text-[11.5px] text-[#f8fafc] [appearance:none] [-webkit-appearance:none] cursor-pointer [transition:all_0.15s_ease] [outline:none] whitespace-nowrap overflow-hidden text-ellipsis [color-scheme:dark] hover:border-[rgba(56,189,248,0.3)] hover:bg-[rgba(15,23,42,0.95)] focus:border-[#38bdf8] focus:shadow-[0_0_0_2px_rgba(56,189,248,0.2)] [&_option]:bg-[#0f172a] [&_option]:text-[#f8fafc] [&_option]:p-[6px_10px] data-[active=true]:border-[rgba(56,189,248,0.45)] data-[active=true]:bg-[rgba(56,189,248,0.08)] data-[active=true]:text-[#38bdf8] data-[active=true]:font-semibold analytics-select-input"
                data-active={analyticsProjectFilter !== "All" ? "true" : undefined}
              >
                <option value="All">Semua Proyek</option>
                {allProjects.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-[10px] text-[#94a3b8] pointer-events-none shrink-0 opacity-70 analytics-select-arrow" />
            </div>
          </div>

          {/* 3. Shift Filter */}
          <div className="flex flex-col gap-[4px] min-w-0 analytics-filter-field">
            <label className="text-[10.5px] font-semibold text-[#94a3b8] tracking-[0.02em] analytics-filter-label">Shift</label>
            <div className="relative flex items-center w-full analytics-select-wrap">
              <Clock size={13} className="absolute left-[10px] text-[#94a3b8] pointer-events-none shrink-0 analytics-select-icon" />
              <select
                value={analyticsShiftFilter}
                onChange={(e) => setAnalyticsShiftFilter(e.target.value)}
                aria-label="Filter shift"
                className="w-full h-[34px] p-[0_28px_0_30px] bg-[rgba(15,23,42,0.85)] border border-[rgba(148,163,184,0.16)] rounded-[7px] text-[11.5px] text-[#f8fafc] [appearance:none] [-webkit-appearance:none] cursor-pointer [transition:all_0.15s_ease] [outline:none] whitespace-nowrap overflow-hidden text-ellipsis [color-scheme:dark] hover:border-[rgba(56,189,248,0.3)] hover:bg-[rgba(15,23,42,0.95)] focus:border-[#38bdf8] focus:shadow-[0_0_0_2px_rgba(56,189,248,0.2)] [&_option]:bg-[#0f172a] [&_option]:text-[#f8fafc] [&_option]:p-[6px_10px] data-[active=true]:border-[rgba(56,189,248,0.45)] data-[active=true]:bg-[rgba(56,189,248,0.08)] data-[active=true]:text-[#38bdf8] data-[active=true]:font-semibold analytics-select-input"
                data-active={analyticsShiftFilter !== "All" ? "true" : undefined}
              >
                <option value="All">Semua Shift</option>
                <option value="Subuh">Shift Subuh (00:00–08:30)</option>
                <option value="Pagi">Shift Pagi (08:00–16:30)</option>
                <option value="Malam">Shift Malam (16:00–00:30)</option>
              </select>
              <ChevronDown size={12} className="absolute right-[10px] text-[#94a3b8] pointer-events-none shrink-0 opacity-70 analytics-select-arrow" />
            </div>
          </div>

          {/* 4. Shifter (PIC) Multi-Select */}
          <div className="flex flex-col gap-[4px] min-w-0 analytics-filter-field shifter-field">
            <label className="text-[10.5px] font-semibold text-[#94a3b8] tracking-[0.02em] analytics-filter-label">Shifter (PIC)</label>
            <AnalyticsShifterMultiSelect
              selectedList={analyticsSelectedShifters}
              onChange={setAnalyticsSelectedShifters}
              staffList={STAFF_ROSTER}
            />
          </div>

          {/* 5. Status Filter */}
          <div className="flex flex-col gap-[4px] min-w-0 analytics-filter-field">
            <label className="text-[10.5px] font-semibold text-[#94a3b8] tracking-[0.02em] analytics-filter-label">Status Tiket</label>
            <div className="relative flex items-center w-full analytics-select-wrap">
              <Activity size={13} className="absolute left-[10px] text-[#94a3b8] pointer-events-none shrink-0 analytics-select-icon" />
              <select
                value={analyticsStatusFilter}
                onChange={(e) => setAnalyticsStatusFilter(e.target.value)}
                aria-label="Filter status tiket"
                className="w-full h-[34px] p-[0_28px_0_30px] bg-[rgba(15,23,42,0.85)] border border-[rgba(148,163,184,0.16)] rounded-[7px] text-[11.5px] text-[#f8fafc] [appearance:none] [-webkit-appearance:none] cursor-pointer [transition:all_0.15s_ease] [outline:none] whitespace-nowrap overflow-hidden text-ellipsis [color-scheme:dark] hover:border-[rgba(56,189,248,0.3)] hover:bg-[rgba(15,23,42,0.95)] focus:border-[#38bdf8] focus:shadow-[0_0_0_2px_rgba(56,189,248,0.2)] [&_option]:bg-[#0f172a] [&_option]:text-[#f8fafc] [&_option]:p-[6px_10px] data-[active=true]:border-[rgba(56,189,248,0.45)] data-[active=true]:bg-[rgba(56,189,248,0.08)] data-[active=true]:text-[#38bdf8] data-[active=true]:font-semibold analytics-select-input"
                data-active={analyticsStatusFilter !== "All" ? "true" : undefined}
              >
                <option value="All">Semua Status</option>
                <option value="active">Aktif / Open / In-Progress</option>
                <option value="closed">Closed / Ditutup</option>
                <option value="pending">Pending</option>
                <option value="escalated">Escalated</option>
              </select>
              <ChevronDown size={12} className="absolute right-[10px] text-[#94a3b8] pointer-events-none shrink-0 opacity-70 analytics-select-arrow" />
            </div>
          </div>

          {/* 6. Severity Filter */}
          <div className="flex flex-col gap-[4px] min-w-0 analytics-filter-field">
            <label className="text-[10.5px] font-semibold text-[#94a3b8] tracking-[0.02em] analytics-filter-label">Keparahan</label>
            <div className="relative flex items-center w-full analytics-select-wrap">
              <AlertTriangle size={13} className="absolute left-[10px] text-[#94a3b8] pointer-events-none shrink-0 analytics-select-icon" />
              <select
                value={analyticsSeverityFilter}
                onChange={(e) => setAnalyticsSeverityFilter(e.target.value)}
                aria-label="Filter keparahan"
                className="w-full h-[34px] p-[0_28px_0_30px] bg-[rgba(15,23,42,0.85)] border border-[rgba(148,163,184,0.16)] rounded-[7px] text-[11.5px] text-[#f8fafc] [appearance:none] [-webkit-appearance:none] cursor-pointer [transition:all_0.15s_ease] [outline:none] whitespace-nowrap overflow-hidden text-ellipsis [color-scheme:dark] hover:border-[rgba(56,189,248,0.3)] hover:bg-[rgba(15,23,42,0.95)] focus:border-[#38bdf8] focus:shadow-[0_0_0_2px_rgba(56,189,248,0.2)] [&_option]:bg-[#0f172a] [&_option]:text-[#f8fafc] [&_option]:p-[6px_10px] data-[active=true]:border-[rgba(56,189,248,0.45)] data-[active=true]:bg-[rgba(56,189,248,0.08)] data-[active=true]:text-[#38bdf8] data-[active=true]:font-semibold analytics-select-input"
                data-active={analyticsSeverityFilter !== "All" ? "true" : undefined}
              >
                <option value="All">Semua Severity</option>
                <option value="Critical">Critical (Kritis)</option>
                <option value="High">High (Tinggi)</option>
                <option value="Medium">Medium (Sedang)</option>
                <option value="Low">Low (Rendah)</option>
              </select>
              <ChevronDown size={12} className="absolute right-[10px] text-[#94a3b8] pointer-events-none shrink-0 opacity-70 analytics-select-arrow" />
            </div>
          </div>
        </div>
      </div>


      {/* ── 2. Primary Charts Section: Enhanced Stacked Bar per Project & Trajectory + Rekap Tiket per User ── */}
      {/* className="report-primary-chart-grid" */}
      <div className="grid grid-cols-[minmax(0,1fr)_380px] max-[1140px]:grid-cols-1 gap-[16px] items-stretch w-full report-primary-chart-grid">
        {/* Left: Volume per Project / Trajectory Chart (Tabs) */}
        <article className={`${REPORT_PANEL_CARD} flex flex-col h-full primary-chart-panel`}>
          <div className={`${REPORT_PANEL_HEADING} report-panel-heading`}>
            <div className="flex flex-col gap-[2px] chart-heading-left">
              <div className="flex items-center gap-[8px] text-[14px] font-bold text-[var(--ink-primary)] panel-title">
                {selectedChartTab === "stacked-project"
                  ? "Ticket Volume per Project (Stacked by System)"
                  : "Perbandingan Tiket: Bulan Lalu vs Bulan Ini (MoM)"}
              </div>
            </div>

            <div className="flex gap-[6px] bg-[rgba(15,23,42,0.4)] p-[3px] rounded-[8px] border border-[var(--line)] chart-tab-controls">
              <button
                type="button"
                className={`inline-flex items-center gap-[6px] p-[5px_11px] rounded-[6px] text-[11.5px] border-none cursor-pointer [transition:all_0.15s_ease] ${
                  selectedChartTab === "stacked-project"
                    ? "bg-[var(--accent-blue)] text-[#0f172a] font-bold active"
                    : "bg-transparent text-[var(--ink-secondary)] font-semibold hover:text-[var(--ink-primary)]"
                } chart-tab-btn`}
                onClick={() => setSelectedChartTab("stacked-project")}
              >
                <BarChart3 size={12} /> Volume per Project
              </button>
              <button
                type="button"
                className={`inline-flex items-center gap-[6px] p-[5px_11px] rounded-[6px] text-[11.5px] border-none cursor-pointer [transition:all_0.15s_ease] ${
                  selectedChartTab === "trajectory"
                    ? "bg-[var(--accent-blue)] text-[#0f172a] font-bold active"
                    : "bg-transparent text-[var(--ink-secondary)] font-semibold hover:text-[var(--ink-primary)]"
                } chart-tab-btn`}
                onClick={() => setSelectedChartTab("trajectory")}
              >
                <TrendingUp size={12} /> Bulan Lalu vs Bulan Ini
              </button>
            </div>
          </div>

          <div className="flex flex-col flex-1 justify-start p-[16px_20px] gap-[12px] report-panel-body">
            {/* View A: Stacked Bar Chart per Project (Enhanced Sizing, Wide Bars, Distinct Gridlines & Y-Axis Scale) */}
            {selectedChartTab === "stacked-project" && (
              <div className="flex flex-col flex-1 w-full justify-start gap-[12px] stacked-chart-container">
                {volumeByDate.length > 0 ? (
                  <>
                    {(() => {
                      const n = volumeByDate.length;
                      const svgViewBoxWidth = Math.max(760, n * 48 + 80);
                      const startX = 55;
                      const endX = svgViewBoxWidth - 30;
                      const totalSpan = endX - startX;
                      const maxStep = 54;
                      const minStep = 32;
                      const stepX = n > 1 ? Math.min(maxStep, Math.max(minStep, totalSpan / (n - 1))) : 0;
                      const barWidth = Math.min(44, Math.max(20, Math.round(stepX * 0.64)));
                      const usedWidth = n > 1 ? (n - 1) * stepX : barWidth;
                      const actualStartX = n > 1 && (n - 1) * maxStep < totalSpan 
                        ? Math.round(startX + (totalSpan - usedWidth) / 2) 
                        : startX;

                      const viewBoxHeight = 270;
                      const baselineY = 225;
                      const topY = 22;
                      const chartHeight = baselineY - topY; // 203

                      return (
                        <div className="w-full overflow-x-auto overflow-y-hidden flex-1 flex flex-col justify-start min-h-[270px] svg-barchart-wrap">
                          <svg
                            className="w-full h-full min-h-[270px] max-h-[390px] block report-bar-svg-lg"
                            viewBox={`0 0 ${svgViewBoxWidth} ${viewBoxHeight}`}
                            preserveAspectRatio="none"
                          >
                            {/* Subtle Horizontal Gridlines & Y-Axis Scale */}
                            {stackedYTicks.ticks.map((tick) => {
                              const yPos = baselineY - Math.round((tick / stackedYTicks.yMax) * chartHeight);
                              return (
                                <g key={`grid-stacked-${tick}`}>
                                  <line
                                    x1="45"
                                    y1={yPos}
                                    x2={svgViewBoxWidth - 15}
                                    y2={yPos}
                                    stroke="rgba(255, 255, 255, 0.08)"
                                    strokeWidth="1"
                                    strokeDasharray={tick === 0 ? undefined : "4 4"}
                                  />
                                  <text
                                    x="38"
                                    y={yPos + 4}
                                    textAnchor="end"
                                    fill="var(--ink-muted)"
                                    fontSize="10"
                                    fontWeight="600"
                                    fontFamily="var(--font-mono)"
                                  >
                                    {tick}
                                  </text>
                                </g>
                              );
                            })}

                            {/* Solid Floor Baseline */}
                            <line x1="45" y1={baselineY} x2={svgViewBoxWidth - 15} y2={baselineY} stroke="var(--line)" strokeWidth="1.5" />

                            {/* Stacked Bars per Date */}
                            {volumeByDate.map((item, idx) => {
                              const x = n > 1 ? Math.round(actualStartX + idx * stepX - barWidth / 2) : Math.round(svgViewBoxWidth / 2 - barWidth / 2);
                              let currentY = baselineY;

                              const isSelected = selectedDate === item.date;
                              const isHovered = hoveredDate === item.date;

                              return (
                                <g
                                  key={item.date}
                                  role="button"
                                  tabIndex={0}
                                  aria-label={`Rincian tiket tanggal ${item.date}`}
                                  onClick={() => setSelectedDate((prev) => (prev === item.date ? null : item.date))}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      setSelectedDate((prev) => (prev === item.date ? null : item.date));
                                    }
                                  }}
                                  onMouseEnter={() => setHoveredDate(item.date)}
                                  onMouseLeave={() => setHoveredDate(null)}
                                  className={`stacked-bar-group [cursor:pointer]! [&_rect]:[transition:opacity_0.15s_ease,fill_0.15s_ease] [&_rect]:hover:opacity-100 ${isSelected ? "is-selected" : ""}`}
                                >
                                  <title>{`Klik untuk melihat rincian tiket tanggal ${item.date}`}</title>

                                  {/* Background selected highlight column */}
                                  {isSelected && (
                                    <rect
                                      x={x - 6}
                                      y={topY}
                                      width={barWidth + 12}
                                      height={chartHeight + 4}
                                      fill="rgba(56, 189, 248, 0.15)"
                                      stroke="rgba(56, 189, 248, 0.65)"
                                      strokeWidth="1.5"
                                      strokeDasharray="4 3"
                                      rx={8}
                                    />
                                  )}

                                  {/* Background hover highlight column (only when not selected) */}
                                  {!isSelected && isHovered && (
                                    <rect
                                      x={x - 6}
                                      y={topY}
                                      width={barWidth + 12}
                                      height={chartHeight + 4}
                                      fill="rgba(56, 189, 248, 0.08)"
                                      rx={8}
                                    />
                                  )}

                                  {/* Stacked Project segments */}
                                  {Object.entries(item.projectCounts).map(([project, count]) => {
                                    const segmentHeight = Math.max(5, Math.round((count / stackedYTicks.yMax) * chartHeight));
                                    currentY -= segmentHeight;
                                    const color = PROJECT_COLORS[project] || "#94a3b8";

                                    return (
                                      <rect
                                        key={project}
                                        x={x}
                                        y={currentY}
                                        width={barWidth}
                                        height={segmentHeight}
                                        fill={color}
                                        rx={3}
                                        opacity={isSelected ? 1 : isHovered ? 0.95 : 0.9}
                                        stroke={isSelected ? "rgba(255, 255, 255, 0.4)" : "var(--panel-bg)"}
                                        strokeWidth={isSelected ? "1" : "1.5"}
                                      />
                                    );
                                  })}

                                  {/* Total count badge above bar */}
                                  <text
                                    x={x + barWidth / 2}
                                    y={currentY - 8}
                                    textAnchor="middle"
                                    fill={isSelected ? "#38bdf8" : "var(--ink-primary)"}
                                    fontSize="11"
                                    fontWeight="800"
                                    fontFamily="var(--font-mono)"
                                  >
                                    {item.created}
                                  </text>

                                  {/* Date label on X-axis */}
                                  <text
                                    x={x + barWidth / 2}
                                    y={baselineY + 22}
                                    textAnchor="middle"
                                    fill={isSelected ? "var(--accent-blue)" : isHovered ? "var(--accent-blue)" : "var(--ink-primary)"}
                                    fontSize="10.5"
                                    fontWeight={isSelected ? "800" : isHovered ? "700" : "600"}
                                    fontFamily="var(--font-mono)"
                                  >
                                    {item.date.slice(5)}
                                  </text>

                                  {/* Selected indicator dot */}
                                  {isSelected && (
                                    <circle
                                      cx={x + barWidth / 2}
                                      cy={baselineY + 33}
                                      r={2.5}
                                      fill="var(--accent-blue)"
                                    />
                                  )}
                                </g>
                              );
                            })}
                          </svg>
                        </div>
                      );
                    })()}

                    {/* Stacked Bar Legend */}
                    <div className="flex items-center gap-[8px] flex-wrap pt-[10px] mt-0 [border-top:1px_solid_var(--line)] project-legend-pills">
                      <span className="text-[11px] font-bold font-mono text-[var(--ink-muted)] legend-pills-label">Sistem:</span>
                      {allProjects.map((proj) => (
                        <div className="inline-flex items-center gap-[6px] p-[3px_9px] rounded-[6px] bg-[rgba(15,23,42,0.4)] border border-[var(--line)] text-[11.5px] text-[var(--ink-primary)] [transition:border-color_0.15s_ease,background_0.15s_ease] hover:border-[rgba(56,189,248,0.4)] hover:bg-[rgba(15,23,42,0.7)] project-legend-pill" key={proj}>
                          <span
                            className="w-[9px] h-[9px] rounded-[2.5px] inline-block shrink-0 legend-color-dot"
                            style={{ background: PROJECT_COLORS[proj] || "#94a3b8" }}
                          />
                          <span className="legend-proj-name">{proj}</span>
                        </div>
                      ))}
                    </div>

                    {/* Interactive Selected Detail Popover Card (muncul saat bar ditekan/diklik) */}
                    {selectedDate ? (
                      (() => {
                        const selectedItem = volumeByDate.find((v) => v.date === selectedDate);
                        if (!selectedItem) return null;
                        return (
                          <div className="mt-[14px] p-[12px_16px] bg-[rgba(15,23,42,0.92)] [backdrop-filter:blur(10px)] [-webkit-backdrop-filter:blur(10px)] border border-[rgba(56,189,248,0.4)] [box-shadow:0_4px_20px_rgba(0,0,0,0.35)] rounded-[10px] flex flex-col gap-[8px] chart-hover-popover anim-fade">
                            <div className="flex items-center justify-between gap-[8px] text-[12px] text-[var(--accent-blue)] border-b border-[rgba(255,255,255,0.08)] pb-[6px] popover-header">
                              <div className="flex items-center gap-[8px] popover-title-left">
                                <Calendar size={13} /> Tanggal: <strong>{selectedDate}</strong> · Total: <strong>{selectedItem.created} Tiket</strong>
                              </div>
                              <button
                                type="button"
                                className="bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] text-[var(--ink-muted)] rounded-[6px] w-[28px] h-[28px] min-w-[28px] min-h-[28px] inline-grid place-items-center cursor-pointer p-0 [transition:all_0.15s_ease] shrink-0 hover:bg-[rgba(239,68,68,0.2)] hover:border-[rgba(239,68,68,0.5)] hover:text-[#f87171] focus-visible:[outline:none] focus-visible:border-[var(--accent-blue-border)] focus-visible:[box-shadow:0_0_0_3px_rgba(56,189,248,0.18)] chart-popover-close-btn"
                                onClick={() => setSelectedDate(null)}
                                title="Tutup detail tanggal"
                                aria-label="Tutup detail tanggal"
                              >
                                <X size={13} className="block w-[14px] h-[14px] shrink-0 pointer-events-none" />
                              </button>
                            </div>
                            <div className="flex gap-[14px] flex-wrap popover-project-list">
                              {Object.entries(selectedItem.projectCounts || {}).map(([proj, cnt]) => {
                                const dayTotal = selectedItem.created || 1;
                                const pct = Math.round((cnt / dayTotal) * 100);
                                return (
                                  <span className="inline-flex items-center gap-[6px] text-[12px] text-[var(--ink-primary)] bg-[rgba(255,255,255,0.03)] p-[3px_8px] rounded-[5px] border border-[rgba(255,255,255,0.05)] popover-item" key={proj}>
                                    <i
                                      className="w-[9px] h-[9px] rounded-[2.5px] inline-block shrink-0 legend-color-dot"
                                      style={{ background: PROJECT_COLORS[proj] || "#94a3b8" }}
                                    />
                                    <strong>{proj}:</strong> {cnt} ({pct}%)
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()
                    ) : null}
                  </>
                ) : (
                  <div className="p-[40px_0] text-center text-[var(--ink-muted)] text-[12px] chart-empty-hint">Tidak ada data volume pada rentang filter ini.</div>
                )}
              </div>
            )}

            {/* View B: Month-over-Month (MoM) Comparison Chart (Bulan Lalu vs Bulan Ini) */}
            {selectedChartTab === "trajectory" && (
              <div className="flex flex-col flex-1 w-full justify-start gap-[12px] mom-chart-container">
                {/* Sub-view Mode Switcher & Period Indicators */}
                <div className="flex items-center justify-between mb-[12px] p-[6px_12px] bg-[rgba(255,255,255,0.02)] rounded-[8px] border border-[rgba(255,255,255,0.06)] mom-subview-toggle-bar">
                  <div className="text-[12px] text-[#94a3b8] mom-view-hint">
                    Komparasi: <strong className="[color:#c084fc]!">● {momData.prevMonthLabel} (Bulan Lalu)</strong> vs{" "}
                    <strong className="[color:#38bdf8]!">● {momData.currMonthLabel} (Bulan Ini)</strong>
                  </div>
                  <div className="flex gap-[6px] mom-toggle-btns">
                    <button
                      type="button"
                      className={`inline-flex items-center gap-[5px] p-[5px_12px] text-[11px] font-semibold rounded-[6px] border cursor-pointer [transition:all_0.2s_ease] ${
                        momSubView === "trajectory"
                          ? "bg-[rgba(56,189,248,0.15)] border-[rgba(56,189,248,0.4)] text-[#38bdf8] active"
                          : "border-[rgba(255,255,255,0.08)] bg-transparent text-[#94a3b8] hover:bg-[rgba(255,255,255,0.06)] hover:text-[#fff]"
                      } mom-toggle-btn`}
                      onClick={() => {
                        setMomSubView("trajectory");
                        setSelectedMomItem(null);
                      }}
                    >
                      <TrendingUp size={12} /> Tren Trajectory
                    </button>
                    <button
                      type="button"
                      className={`inline-flex items-center gap-[5px] p-[5px_12px] text-[11px] font-semibold rounded-[6px] border cursor-pointer [transition:all_0.2s_ease] ${
                        momSubView === "project"
                          ? "bg-[rgba(56,189,248,0.15)] border-[rgba(56,189,248,0.4)] text-[#38bdf8] active"
                          : "border-[rgba(255,255,255,0.08)] bg-transparent text-[#94a3b8] hover:bg-[rgba(255,255,255,0.06)] hover:text-[#fff]"
                      } mom-toggle-btn`}
                      onClick={() => {
                        setMomSubView("project");
                        setSelectedMomItem(null);
                      }}
                    >
                      <Layers size={12} /> Komparasi per Sistem
                    </button>
                  </div>
                </div>

                {/* 3A. Subview: Tren Trajectory MoM (Line & Area Chart) */}
                {momSubView === "trajectory" && (
                  <div className="flex flex-col flex-1 w-full justify-start gap-[12px] trajectory-chart-container">
                    {momData.trajectoryPoints.length > 0 ? (
                      <>
                        {(() => {
                          const points = momData.trajectoryPoints;
                          const n = points.length;
                          const svgViewBoxWidth = Math.max(760, n * 58 + 80);
                          const startX = 60;
                          const endX = svgViewBoxWidth - 40;
                          const totalSpan = endX - startX;
                          const stepX = n > 1 ? totalSpan / (n - 1) : 0;

                          const viewBoxHeight = 270;
                          const baselineY = 225;
                          const topY = 25;
                          const chartHeight = baselineY - topY;

                          const maxCount = Math.max(
                            ...points.map((p) => Math.max(p.currCount, p.prevCount)),
                            4
                          );
                          const yTicks = computeYTicks(maxCount);

                          const pointsCurr = points.map((item, idx) => {
                            const x = n > 1 ? Math.round(startX + idx * stepX) : Math.round(svgViewBoxWidth / 2);
                            const y = baselineY - Math.round((item.currCount / yTicks.yMax) * chartHeight);
                            return { x, y, item };
                          });

                          const pointsPrev = points.map((item, idx) => {
                            const x = n > 1 ? Math.round(startX + idx * stepX) : Math.round(svgViewBoxWidth / 2);
                            const y = baselineY - Math.round((item.prevCount / yTicks.yMax) * chartHeight);
                            return { x, y, item };
                          });

                          const firstX = n > 1 ? startX : Math.round(svgViewBoxWidth / 2);
                          const lastX = n > 1 ? Math.round(startX + (n - 1) * stepX) : Math.round(svgViewBoxWidth / 2);

                          const polyCurr = pointsCurr.map((p) => `${p.x},${p.y}`).join(" L ");
                          const polyPrev = pointsPrev.map((p) => `${p.x},${p.y}`).join(" L ");

                          const areaCurr = `M ${firstX},${baselineY} L ${polyCurr} L ${lastX},${baselineY} Z`;
                          const areaPrev = `M ${firstX},${baselineY} L ${polyPrev} L ${lastX},${baselineY} Z`;

                          return (
                            <div className="w-full overflow-x-auto overflow-y-hidden flex-1 flex flex-col justify-start min-h-[270px] svg-barchart-wrap">
                              <svg
                                className="w-full h-full min-h-[270px] max-h-[390px] block report-bar-svg-lg"
                                viewBox={`0 0 ${svgViewBoxWidth} ${viewBoxHeight}`}
                                preserveAspectRatio="none"
                              >
                                <defs>
                                  <linearGradient id="gradMomCurr" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.38" />
                                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
                                  </linearGradient>
                                  <linearGradient id="gradMomPrev" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#a855f7" stopOpacity="0.30" />
                                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0.02" />
                                  </linearGradient>
                                </defs>

                                {/* Y-Axis Gridlines & Ticks */}
                                {yTicks.ticks.map((tick) => {
                                  const yPos = baselineY - Math.round((tick / yTicks.yMax) * chartHeight);
                                  return (
                                    <g key={`grid-mom-${tick}`}>
                                      <line
                                        x1="45"
                                        y1={yPos}
                                        x2={svgViewBoxWidth - 15}
                                        y2={yPos}
                                        stroke="rgba(255, 255, 255, 0.08)"
                                        strokeWidth="1"
                                        strokeDasharray={tick === 0 ? undefined : "4 4"}
                                      />
                                      <text
                                        x="38"
                                        y={yPos + 4}
                                        textAnchor="end"
                                        fill="var(--ink-muted)"
                                        fontSize="10"
                                        fontWeight="600"
                                        fontFamily="var(--font-mono)"
                                      >
                                        {tick}
                                      </text>
                                    </g>
                                  );
                                })}

                                {/* Solid Baseline */}
                                <line
                                  x1="45"
                                  y1={baselineY}
                                  x2={svgViewBoxWidth - 15}
                                  y2={baselineY}
                                  stroke="var(--line)"
                                  strokeWidth="1.5"
                                />

                                {/* Area Fills */}
                                <path d={areaPrev} fill="url(#gradMomPrev)" />
                                <path d={areaCurr} fill="url(#gradMomCurr)" />

                                {/* Trend Lines */}
                                <path
                                  d={`M ${polyPrev}`}
                                  fill="none"
                                  stroke="#a855f7"
                                  strokeWidth="2.5"
                                  strokeDasharray="4 3"
                                />
                                <path
                                  d={`M ${polyCurr}`}
                                  fill="none"
                                  stroke="#38bdf8"
                                  strokeWidth="3"
                                />

                                {/* Interactive Markers & X Labels */}
                                {points.map((item, idx) => {
                                  const x = n > 1 ? Math.round(startX + idx * stepX) : Math.round(svgViewBoxWidth / 2);
                                  const yCurr = baselineY - Math.round((item.currCount / yTicks.yMax) * chartHeight);
                                  const yPrev = baselineY - Math.round((item.prevCount / yTicks.yMax) * chartHeight);
                                  const isSelected = selectedMomItem?.id === `traj-${item.index}`;

                                  return (
                                    <g
                                      key={`traj-pt-${item.index}`}
                                      role="button"
                                      tabIndex={0}
                                      className="[cursor:pointer]!"
                                      onClick={() => {
                                        setSelectedMomItem((prev) =>
                                          prev?.id === `traj-${item.index}`
                                            ? null
                                            : {
                                                type: "timeline",
                                                id: `traj-${item.index}`,
                                                label: item.label,
                                                currCount: item.currCount,
                                                prevCount: item.prevCount,
                                                currResolved: item.currResolved,
                                                prevResolved: item.prevResolved,
                                                currDate: item.currDate,
                                                prevDate: item.prevDate,
                                                delta: item.currCount - item.prevCount,
                                              }
                                        );
                                      }}
                                    >
                                      {/* Vertical guideline on select */}
                                      {isSelected && (
                                        <line
                                          x1={x}
                                          y1={topY}
                                          x2={x}
                                          y2={baselineY}
                                          stroke="rgba(56, 189, 248, 0.4)"
                                          strokeWidth="1.5"
                                          strokeDasharray="3 3"
                                        />
                                      )}

                                      {/* Prev Month Marker (Purple) */}
                                      <circle
                                        cx={x}
                                        cy={yPrev}
                                        r={isSelected ? 6 : 4}
                                        fill="#0f172a"
                                        stroke="#a855f7"
                                        strokeWidth={isSelected ? 3 : 2}
                                      />

                                      {/* Curr Month Marker (Sky Blue) */}
                                      <circle
                                        cx={x}
                                        cy={yCurr}
                                        r={isSelected ? 7 : 5}
                                        fill="#38bdf8"
                                        stroke="#ffffff"
                                        strokeWidth={2}
                                      />

                                      {/* X-Axis Tick Label */}
                                      <text
                                        x={x}
                                        y={baselineY + 16}
                                        textAnchor="middle"
                                        fill={isSelected ? "#38bdf8" : "var(--ink-primary)"}
                                        fontSize="10"
                                        fontWeight={isSelected ? "700" : "500"}
                                      >
                                        {item.label}
                                      </text>
                                      <text
                                        x={x}
                                        y={baselineY + 28}
                                        textAnchor="middle"
                                        fill="var(--ink-muted)"
                                        fontSize="8.5"
                                        fontFamily="var(--font-mono)"
                                      >
                                        {item.currFormatted !== "-" ? item.currFormatted : item.prevFormatted}
                                      </text>
                                    </g>
                                  );
                                })}
                              </svg>
                            </div>
                          );
                        })()}

                        <div className="flex justify-center gap-[24px] mt-[16px] pt-[12px] border-t border-[var(--line)] text-[12px] text-[var(--ink-secondary)] chart-legend-center">
                          <span className="inline-flex items-center gap-[8px] legend-item">
                            <i className="w-[14px] h-[4px] rounded-[2px] inline-block bg-[#38bdf8] legend-dot" />
                            {momData.currMonthLabel} (Bulan Ini: {momData.currTotal} tiket)
                          </span>
                          <span className="inline-flex items-center gap-[8px] legend-item">
                            <i className="w-[14px] h-[4px] rounded-[2px] inline-block bg-[#a855f7] legend-dot" />
                            {momData.prevMonthLabel} (Bulan Lalu: {momData.prevTotal} tiket)
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="p-[40px_0] text-center text-[var(--ink-muted)] text-[12px] chart-empty-hint">Tidak ada data trajectory perbandingan.</div>
                    )}
                  </div>
                )}

                {/* 3B. Subview: Komparasi per Sistem (Grouped Bar Chart) */}
                {momSubView === "project" && (
                  <div className="flex flex-col flex-1 w-full justify-start gap-[12px] trajectory-chart-container">
                    {momData.projectComparison.length > 0 ? (
                      <>
                        {(() => {
                          const projects = momData.projectComparison;
                          const numProj = projects.length;
                          const svgWidth = Math.max(760, numProj * 88 + 80);
                          const startX = 65;
                          const endX = svgWidth - 40;
                          const span = endX - startX;
                          const groupWidth = span / numProj;
                          const barWidth = 16;
                          const barGap = 4;

                          const viewBoxHeight = 270;
                          const baselineY = 225;
                          const topY = 25;
                          const chartHeight = baselineY - topY;

                          const maxCount = Math.max(
                            ...projects.map((p) => Math.max(p.currCount, p.prevCount)),
                            4
                          );
                          const yTicks = computeYTicks(maxCount);

                          return (
                            <div className="w-full overflow-x-auto overflow-y-hidden flex-1 flex flex-col justify-start min-h-[270px] svg-barchart-wrap">
                              <svg
                                className="w-full h-full min-h-[270px] max-h-[390px] block report-bar-svg-lg"
                                viewBox={`0 0 ${svgWidth} ${viewBoxHeight}`}
                                preserveAspectRatio="none"
                              >
                                {/* Y-Axis Gridlines & Ticks */}
                                {yTicks.ticks.map((tick) => {
                                  const yPos = baselineY - Math.round((tick / yTicks.yMax) * chartHeight);
                                  return (
                                    <g key={`grid-proj-${tick}`}>
                                      <line
                                        x1="45"
                                        y1={yPos}
                                        x2={svgWidth - 15}
                                        y2={yPos}
                                        stroke="rgba(255, 255, 255, 0.08)"
                                        strokeWidth="1"
                                        strokeDasharray={tick === 0 ? undefined : "4 4"}
                                      />
                                      <text
                                        x="38"
                                        y={yPos + 4}
                                        textAnchor="end"
                                        fill="var(--ink-muted)"
                                        fontSize="10"
                                        fontWeight="600"
                                        fontFamily="var(--font-mono)"
                                      >
                                        {tick}
                                      </text>
                                    </g>
                                  );
                                })}

                                {/* Solid Baseline */}
                                <line
                                  x1="45"
                                  y1={baselineY}
                                  x2={svgWidth - 15}
                                  y2={baselineY}
                                  stroke="var(--line)"
                                  strokeWidth="1.5"
                                />

                                {/* Project Group Bars */}
                                {projects.map((item, idx) => {
                                  const groupCenter = startX + idx * groupWidth + groupWidth / 2;
                                  const xPrev = groupCenter - barWidth - barGap / 2;
                                  const xCurr = groupCenter + barGap / 2;

                                  const hPrev = Math.round((item.prevCount / yTicks.yMax) * chartHeight);
                                  const yPrev = baselineY - hPrev;

                                  const hCurr = Math.round((item.currCount / yTicks.yMax) * chartHeight);
                                  const yCurr = baselineY - hCurr;

                                  const isSelected = selectedMomItem?.id === `proj-${item.project}`;
                                  const deltaLabel = item.delta > 0 ? `+${item.delta}` : `${item.delta}`;

                                  return (
                                    <g
                                      key={`mom-proj-${item.project}`}
                                      role="button"
                                      tabIndex={0}
                                      className="[cursor:pointer]!"
                                      onClick={() => {
                                        setSelectedMomItem((prev) =>
                                          prev?.id === `proj-${item.project}`
                                            ? null
                                            : {
                                                type: "project",
                                                id: `proj-${item.project}`,
                                                label: item.project,
                                                currCount: item.currCount,
                                                prevCount: item.prevCount,
                                                currResolved: item.currResolved,
                                                prevResolved: item.prevResolved,
                                                delta: item.delta,
                                                deltaPct: item.deltaPct,
                                              }
                                        );
                                      }}
                                    >
                                      {/* Background column highlight on select */}
                                      {isSelected && (
                                        <rect
                                          x={groupCenter - groupWidth / 2 + 4}
                                          y={topY}
                                          width={groupWidth - 8}
                                          height={chartHeight + 5}
                                          fill="rgba(56, 189, 248, 0.08)"
                                          rx="6"
                                        />
                                      )}

                                      {/* Delta Badge above the bars */}
                                      <g transform={`translate(${groupCenter}, ${Math.min(yPrev, yCurr) - 10})`}>
                                        <rect
                                          x="-14"
                                          y="-10"
                                          width="28"
                                          height="13"
                                          rx="3"
                                          fill={
                                            item.delta > 0
                                              ? "rgba(248, 113, 113, 0.2)"
                                              : item.delta < 0
                                              ? "rgba(52, 211, 153, 0.2)"
                                              : "rgba(255, 255, 255, 0.08)"
                                          }
                                        />
                                        <text
                                          x="0"
                                          y="-1"
                                          textAnchor="middle"
                                          fontSize="8.5"
                                          fontWeight="700"
                                          fontFamily="var(--font-mono)"
                                          fill={
                                            item.delta > 0
                                              ? "#f87171"
                                              : item.delta < 0
                                              ? "#34d399"
                                              : "var(--ink-muted)"
                                          }
                                        >
                                          {deltaLabel}
                                        </text>
                                      </g>

                                      {/* Left Bar: Bulan Lalu (Purple) */}
                                      <rect
                                        x={xPrev}
                                        y={yPrev}
                                        width={barWidth}
                                        height={Math.max(2, hPrev)}
                                        fill="#a855f7"
                                        opacity={0.88}
                                        rx="3"
                                      />
                                      {item.prevCount > 0 && (
                                        <text
                                          x={xPrev + barWidth / 2}
                                          y={yPrev - 3}
                                          textAnchor="middle"
                                          fill="#c084fc"
                                          fontSize="9"
                                          fontWeight="700"
                                          fontFamily="var(--font-mono)"
                                        >
                                          {item.prevCount}
                                        </text>
                                      )}

                                      {/* Right Bar: Bulan Ini (Sky Blue) */}
                                      <rect
                                        x={xCurr}
                                        y={yCurr}
                                        width={barWidth}
                                        height={Math.max(2, hCurr)}
                                        fill="#38bdf8"
                                        rx="3"
                                      />
                                      {item.currCount > 0 && (
                                        <text
                                          x={xCurr + barWidth / 2}
                                          y={yCurr - 3}
                                          textAnchor="middle"
                                          fill="#38bdf8"
                                          fontSize="9"
                                          fontWeight="700"
                                          fontFamily="var(--font-mono)"
                                        >
                                          {item.currCount}
                                        </text>
                                      )}

                                      {/* Bottom Project Label & Dot */}
                                      <circle
                                        cx={groupCenter - 18}
                                        cy={baselineY + 16}
                                        r="3.5"
                                        fill={item.color}
                                      />
                                      <text
                                        x={groupCenter - 10}
                                        y={baselineY + 19}
                                        textAnchor="start"
                                        fill={isSelected ? "#38bdf8" : "var(--ink-primary)"}
                                        fontSize="10"
                                        fontWeight={isSelected ? "700" : "600"}
                                      >
                                        {item.project}
                                      </text>
                                    </g>
                                  );
                                })}
                              </svg>
                            </div>
                          );
                        })()}

                        <div className="flex justify-center gap-[24px] mt-[16px] pt-[12px] border-t border-[var(--line)] text-[12px] text-[var(--ink-secondary)] chart-legend-center">
                          <span className="inline-flex items-center gap-[8px] legend-item">
                            <i className="w-[9px] h-[9px] rounded-[2.5px] inline-block bg-[#38bdf8] legend-dot" />
                            {momData.currMonthLabel} (Bulan Ini)
                          </span>
                          <span className="inline-flex items-center gap-[8px] legend-item">
                            <i className="w-[9px] h-[9px] rounded-[2.5px] inline-block bg-[#a855f7] legend-dot" />
                            {momData.prevMonthLabel} (Bulan Lalu)
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="p-[40px_0] text-center text-[var(--ink-muted)] text-[12px] chart-empty-hint">Tidak ada data sistem perbandingan.</div>
                    )}
                  </div>
                )}

                {/* 4. Interactive Detail Popover Card */}
                {selectedMomItem ? (
                  <div className="mt-[12px] p-[12px_16px] bg-[rgba(15,23,42,0.92)] [backdrop-filter:blur(10px)] [-webkit-backdrop-filter:blur(10px)] border border-[rgba(56,189,248,0.4)] [box-shadow:0_4px_20px_rgba(0,0,0,0.35)] rounded-[10px] flex flex-col gap-[8px] chart-hover-popover anim-fade">
                    <div className="flex items-center justify-between gap-[8px] text-[12px] text-[var(--accent-blue)] border-b border-[rgba(255,255,255,0.08)] pb-[6px] popover-header">
                      <div className="flex items-center gap-[8px] popover-title-left">
                        {selectedMomItem.type === "project" ? (
                          <>
                            <Layers size={13} className="text-sky-400" /> Komparasi Sistem:{" "}
                            <strong>{selectedMomItem.label}</strong>
                          </>
                        ) : (
                          <>
                            <Calendar size={13} className="text-sky-400" /> Timeline:{" "}
                            <strong>{selectedMomItem.label}</strong>
                            <span className="text-[11px] text-[var(--ink-muted)] ml-[6px]">
                              ({selectedMomItem.currDate || "-"} vs {selectedMomItem.prevDate || "-"})
                            </span>
                          </>
                        )}
                      </div>
                      <button
                        type="button"
                        className="bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] text-[var(--ink-muted)] rounded-[6px] w-[28px] h-[28px] min-w-[28px] min-h-[28px] inline-grid place-items-center cursor-pointer p-0 [transition:all_0.15s_ease] shrink-0 hover:bg-[rgba(239,68,68,0.2)] hover:border-[rgba(239,68,68,0.5)] hover:text-[#f87171] focus-visible:[outline:none] focus-visible:border-[var(--accent-blue-border)] focus-visible:[box-shadow:0_0_0_3px_rgba(56,189,248,0.18)] chart-popover-close-btn"
                        onClick={() => setSelectedMomItem(null)}
                        title="Tutup detail komparasi"
                        aria-label="Tutup detail komparasi"
                      >
                        <X size={13} className="block w-[14px] h-[14px] shrink-0 pointer-events-none" />
                      </button>
                    </div>
                    <div className="flex gap-[14px] flex-wrap popover-project-list">
                      <span className="inline-flex items-center gap-[6px] text-[12px] text-[var(--ink-primary)] bg-[rgba(255,255,255,0.03)] p-[3px_8px] rounded-[5px] border border-[rgba(255,255,255,0.05)] popover-item">
                        <i className="w-[9px] h-[9px] rounded-[2.5px] inline-block bg-[#38bdf8] legend-dot" />
                        <strong>{momData.currMonthLabel} (Bulan Ini):</strong> {selectedMomItem.currCount} tiket
                        {typeof selectedMomItem.currResolved === "number" && ` (${selectedMomItem.currResolved} diselesaikan)`}
                      </span>
                      <span className="inline-flex items-center gap-[6px] text-[12px] text-[var(--ink-primary)] bg-[rgba(255,255,255,0.03)] p-[3px_8px] rounded-[5px] border border-[rgba(255,255,255,0.05)] popover-item">
                        <i className="w-[9px] h-[9px] rounded-[2.5px] inline-block bg-[#c084fc] legend-dot" />
                        <strong>{momData.prevMonthLabel} (Bulan Lalu):</strong> {selectedMomItem.prevCount} tiket
                        {typeof selectedMomItem.prevResolved === "number" && ` (${selectedMomItem.prevResolved} diselesaikan)`}
                      </span>
                      <span className="inline-flex items-center gap-[6px] text-[12px] text-[var(--ink-primary)] bg-[rgba(255,255,255,0.03)] p-[3px_8px] rounded-[5px] border border-[rgba(255,255,255,0.05)] popover-item">
                        <i
                          className="w-[9px] h-[9px] rounded-[2.5px] inline-block legend-dot"
                          style={{
                            background:
                              selectedMomItem.delta > 0
                                ? "#f87171"
                                : selectedMomItem.delta < 0
                                ? "#34d399"
                                : "#94a3b8",
                          }}
                        />
                        <strong>Selisih (MoM):</strong>{" "}
                        <span
                          style={{
                            color:
                              selectedMomItem.delta > 0
                                ? "#f87171"
                                : selectedMomItem.delta < 0
                                ? "#34d399"
                                : "inherit",
                            fontWeight: 700,
                          }}
                        >
                          {selectedMomItem.delta > 0 ? `+${selectedMomItem.delta}` : selectedMomItem.delta} tiket
                          {selectedMomItem.deltaPct !== undefined && ` (${selectedMomItem.deltaPct}%)`}
                        </span>
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </article>

        {/* Right: Rekap Tiket per User (Task 3) */}
        <div className="relative w-full h-full min-h-0 max-[1140px]:h-[480px] user-summary-wrapper">
          <article className={`absolute inset-0 w-full h-full flex flex-col ${REPORT_PANEL_CARD} user-summary-panel`}>
            <div className={`${REPORT_PANEL_HEADING} report-panel-heading`}>
              <div className="flex flex-col gap-[2px] chart-heading-left">
                <div className="flex items-center gap-[8px] text-[14px] font-bold text-[var(--ink-primary)] panel-title">
                  <Users size={14} className="text-sky-400" />
                  Rekap Tiket per User
                </div>
              </div>
              <span className="text-[11px] font-mono text-[var(--ink-muted)] font-semibold panel-sub-count">{userSummaries.length} Staf</span>
            </div>
            <div className="flex flex-col flex-1 justify-between p-[20px] min-h-0 overflow-hidden report-panel-body user-summary-body">
              <div className="flex flex-col gap-[8px] [flex:1_1_0%] min-h-0 overflow-y-auto pr-[4px] [scrollbar-width:thin] [scrollbar-color:rgba(56,189,248,0.25)_transparent] [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-track]:bg-[rgba(148,163,184,0.05)] [&::-webkit-scrollbar-track]:rounded-[4px] [&::-webkit-scrollbar-thumb]:bg-[rgba(56,189,248,0.25)] [&::-webkit-scrollbar-thumb]:rounded-[4px] user-summary-list">
                {userSummaries.map((user) => (
                  <button
                    type="button"
                    key={user.name}
                    className="flex flex-col gap-[5px] p-[8px_10px] rounded-[8px] bg-[rgba(148,163,184,0.04)] border border-[rgba(148,163,184,0.1)] cursor-pointer text-left w-full [transition:all_0.15s_ease] hover:bg-[rgba(56,189,248,0.08)] hover:border-[rgba(56,189,248,0.3)] user-summary-card"
                    onClick={() => setSelectedUserDetail(user)}
                    title={`Klik untuk melihat rincian sistem dan histori tiket ${user.name}`}
                  >
                    <div className="flex items-center justify-between gap-[8px] user-summary-card-top">
                      <div className="flex items-center gap-[7px] min-w-0 user-profile-left">
                        <Avatar size="sm" initials={user.initials} name={user.name} className="w-[24px] h-[24px] rounded-[50%] flex items-center justify-center text-[9.5px] font-bold text-[#fff] shrink-0 user-avatar-sm" />
                        <div className="flex flex-col min-w-0 user-name-role">
                          <span className="text-[11px] font-bold text-[var(--ink-primary)] whitespace-nowrap overflow-hidden text-ellipsis user-summary-name">{user.name}</span>
                          <span className="text-[9px] text-[var(--ink-muted)] whitespace-nowrap overflow-hidden text-ellipsis user-summary-role">{user.role}</span>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-[2px] text-[9.5px] font-semibold text-[#38bdf8] shrink-0 user-detail-link">
                        Detail <ChevronRight size={11} />
                      </span>
                    </div>

                    {/* 3 Metric Pills */}
                    <div className="grid grid-cols-3 gap-[4px] p-[3px_6px] rounded-[6px] bg-[rgba(15,23,42,0.4)] border border-[rgba(148,163,184,0.08)] user-metrics-row">
                      <div className="flex flex-col items-center text-center gap-[1px] user-metric-col metric-today">
                        <span className="text-[7.5px] font-bold text-[var(--ink-muted)] font-mono tracking-[0.03em] metric-lbl">HARI INI</span>
                        <strong className="text-[12px] font-extrabold font-mono text-[#38bdf8] metric-val">{user.todayCount}</strong>
                      </div>
                      <div className="flex flex-col items-center text-center gap-[1px] user-metric-col metric-month">
                        <span className="text-[7.5px] font-bold text-[var(--ink-muted)] font-mono tracking-[0.03em] metric-lbl">BULAN INI</span>
                        <strong className="text-[12px] font-extrabold font-mono text-[#10b981] metric-val">{user.monthCount}</strong>
                      </div>
                      <div className="flex flex-col items-center text-center gap-[1px] user-metric-col metric-year">
                        <span className="text-[7.5px] font-bold text-[var(--ink-muted)] font-mono tracking-[0.03em] metric-lbl">TAHUN INI</span>
                        <strong className="text-[12px] font-extrabold font-mono text-[#818cf8] metric-val">{user.yearCount}</strong>
                      </div>
                    </div>

                    {/* Today's project tags */}
                    <div className="flex items-center gap-[4px] text-[9px] text-[var(--ink-muted)] user-today-projects">
                      <span className="text-[8.5px] text-[var(--ink-muted)] font-semibold shrink-0 user-proj-label">Hari Ini:</span>
                      {Object.keys(user.todayBreakdown).length > 0 ? (
                        <div className="flex flex-wrap gap-[3px] user-proj-pills-wrap">
                          {Object.entries(user.todayBreakdown).map(([proj, count]) => {
                            const pColor = PROJECT_COLORS[proj] || "#94a3b8";
                            return (
                              <span className="inline-flex items-center gap-[2px] p-[1px_4px] rounded-[3px] text-[8.5px] font-mono font-semibold bg-[rgba(255,255,255,0.06)] text-[var(--ink-secondary)] user-proj-badge" key={proj}>
                                <i className="w-[9px] h-[9px] rounded-[2.5px] inline-block legend-dot" style={{ background: pColor }} />
                                {proj} &times;{count}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-[8.5px] text-[var(--ink-muted)] italic user-proj-none">Tidak ada tiket baru hari ini</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </article>
        </div>
      </div>


      {/* ── 5. Distributions: Category Donut & Priority Donut ── */}
      <div className="grid grid-cols-2 max-[960px]:grid-cols-1 gap-[18px] report-charts-grid">
        {/* Category Distribution (Donut + Ranked Bars) */}
        <article className={`${REPORT_PANEL_CARD} report-panel`}>
          <div className={`${REPORT_PANEL_HEADING} report-panel-heading`}>
            <div className={`${REPORT_PANEL_TITLE} panel-title`}>Distribusi Kategori / Tipe Tiket</div>
            <span className="text-[11px] font-mono text-[var(--ink-muted)] font-semibold panel-sub-count">{typeCounts.length} Kategori</span>
          </div>
          <div className="flex flex-col flex-1 justify-between p-[20px] report-panel-body">
            <div className="grid grid-cols-[140px_1fr] max-[540px]:grid-cols-1 max-[540px]:justify-items-center gap-[20px] items-center donut-and-list-grid">
              {/* Donut Chart */}
              <div className="relative w-[130px] h-[130px] donut-chart-wrap">
                <svg className="w-full h-full donut-svg" viewBox="0 0 160 160">
                  {renderDonutSlices(
                    typeCounts.map(([type, count], idx) => ({
                      label: type,
                      count,
                      color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                    })),
                    80,
                    80,
                    55,
                    16
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center donut-center-content">
                  <span className="text-[20px] font-extrabold font-mono text-[var(--ink-primary)] leading-none donut-total-num">{total}</span>
                  <span className="text-[8px] font-bold font-mono tracking-[0.8px] text-[var(--ink-muted)] mt-[2px] donut-total-label">TOTAL</span>
                </div>
              </div>

              {/* Ranked Category Bars */}
              <div className="flex flex-col gap-[9px] w-full category-distribution-list">
                {typeCounts.map(([type, count], idx) => {
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];

                  return (
                    <div className="flex flex-col gap-[4px] category-dist-row" key={type}>
                      <div className="flex justify-between text-[11.5px] font-medium text-[var(--ink-primary)] category-dist-info">
                        <span className="inline-flex items-center gap-[6px] category-dist-name">
                          <i className="w-[9px] h-[9px] rounded-[2.5px] inline-block legend-dot" style={{ background: color }} /> {type}
                        </span>
                        <span className="font-mono text-[11px] text-[var(--ink-muted)] category-dist-count">{count} ({pct}%)</span>
                      </div>
                      <div className="h-[5px] w-full bg-[rgba(148,163,184,0.15)] rounded-[99px] overflow-hidden category-dist-track">
                        <div className="h-full rounded-[99px] category-dist-fill" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </article>

        {/* Severity Distribution */}
        <article className={`${REPORT_PANEL_CARD} report-panel`}>
          <div className={`${REPORT_PANEL_HEADING} report-panel-heading`}>
            <div className={`${REPORT_PANEL_TITLE} panel-title`}>Distribusi Berdasarkan Severity</div>
            <span className="text-[11px] font-mono text-[var(--ink-muted)] font-semibold panel-sub-count">Severity Ratios</span>
          </div>
          <div className="flex flex-col flex-1 justify-between p-[20px] report-panel-body">
            <div className="grid grid-cols-[140px_1fr] max-[540px]:grid-cols-1 max-[540px]:justify-items-center gap-[20px] items-center donut-and-list-grid">
              {/* Donut Chart for Priority */}
              <div className="relative w-[130px] h-[130px] donut-chart-wrap">
                <svg className="w-full h-full donut-svg" viewBox="0 0 160 160">
                  {renderDonutSlices(
                    [
                      { label: "Critical", count: priorityCounts.Critical, color: PRIORITY_COLORS.Critical },
                      { label: "High", count: priorityCounts.High, color: PRIORITY_COLORS.High },
                      { label: "Medium", count: priorityCounts.Medium, color: PRIORITY_COLORS.Medium },
                      { label: "Low", count: priorityCounts.Low, color: PRIORITY_COLORS.Low },
                    ],
                    80,
                    80,
                    55,
                    16
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center donut-center-content">
                  <span className="text-[20px] font-extrabold font-mono text-[var(--ink-primary)] leading-none donut-total-num">{priorityCounts.Critical + priorityCounts.High}</span>
                  <span className="text-[8px] font-bold font-mono tracking-[0.8px] text-[var(--ink-muted)] mt-[2px] donut-total-label">CRIT/HIGH</span>
                </div>
              </div>

              {/* Priority Summary Grid */}
              <div className="grid grid-cols-2 gap-[10px] w-full priority-spectrum-list">
                <div className="p-[10px_12px] rounded-[8px] bg-[rgba(15,23,42,0.35)] border border-[var(--line)] [border-left:3px_solid_#ef4444] flex flex-col gap-[2px] priority-spec-box priority-crit">
                  <div className="flex items-center gap-[6px] text-[11px] text-[var(--ink-primary)] spec-top">
                    <span className="w-[7px] h-[7px] rounded-[50%] bg-[#ef4444] crit-dot" />
                    <strong>Critical</strong>
                  </div>
                  <span className="text-[18px] font-extrabold font-mono text-[var(--ink-primary)] leading-[1.1] mt-[2px] spec-count">{priorityCounts.Critical}</span>
                  <span className="text-[9.5px] text-[var(--ink-muted)] font-mono spec-pct">{total > 0 ? Math.round((priorityCounts.Critical / total) * 100) : 0}% share</span>
                </div>

                <div className="p-[10px_12px] rounded-[8px] bg-[rgba(15,23,42,0.35)] border border-[var(--line)] [border-left:3px_solid_#f97316] flex flex-col gap-[2px] priority-spec-box priority-high">
                  <div className="flex items-center gap-[6px] text-[11px] text-[var(--ink-primary)] spec-top">
                    <span className="w-[7px] h-[7px] rounded-[50%] bg-[#f97316] high-dot" />
                    <strong>High</strong>
                  </div>
                  <span className="text-[18px] font-extrabold font-mono text-[var(--ink-primary)] leading-[1.1] mt-[2px] spec-count">{priorityCounts.High}</span>
                  <span className="text-[9.5px] text-[var(--ink-muted)] font-mono spec-pct">{total > 0 ? Math.round((priorityCounts.High / total) * 100) : 0}% share</span>
                </div>

                <div className="p-[10px_12px] rounded-[8px] bg-[rgba(15,23,42,0.35)] border border-[var(--line)] [border-left:3px_solid_#f59e0b] flex flex-col gap-[2px] priority-spec-box priority-med">
                  <div className="flex items-center gap-[6px] text-[11px] text-[var(--ink-primary)] spec-top">
                    <span className="w-[7px] h-[7px] rounded-[50%] bg-[#f59e0b] med-dot" />
                    <strong>Medium</strong>
                  </div>
                  <span className="text-[18px] font-extrabold font-mono text-[var(--ink-primary)] leading-[1.1] mt-[2px] spec-count">{priorityCounts.Medium}</span>
                  <span className="text-[9.5px] text-[var(--ink-muted)] font-mono spec-pct">{total > 0 ? Math.round((priorityCounts.Medium / total) * 100) : 0}% share</span>
                </div>

                <div className="p-[10px_12px] rounded-[8px] bg-[rgba(15,23,42,0.35)] border border-[var(--line)] [border-left:3px_solid_#2dd4bf] flex flex-col gap-[2px] priority-spec-box priority-low">
                  <div className="flex items-center gap-[6px] text-[11px] text-[var(--ink-primary)] spec-top">
                    <span className="w-[7px] h-[7px] rounded-[50%] bg-[#2dd4bf] low-dot" />
                    <strong>Low</strong>
                  </div>
                  <span className="text-[18px] font-extrabold font-mono text-[var(--ink-primary)] leading-[1.1] mt-[2px] spec-count">{priorityCounts.Low}</span>
                  <span className="text-[9.5px] text-[var(--ink-muted)] font-mono spec-pct">{total > 0 ? Math.round((priorityCounts.Low / total) * 100) : 0}% share</span>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>

      {/* ── 6. Operational Velocity Trajectory ── */}
      <article className={`${REPORT_PANEL_CARD} flex flex-col w-full mgmt-velocity-panel`}>
        <div className={`${REPORT_PANEL_HEADING} report-panel-heading`}>
          <div>
            <div className={`${REPORT_PANEL_TITLE} panel-title`}>Tren Durasi Penyelesaian (Resolution Velocity)</div>
          </div>
          <div className="flex items-center gap-[16px] flex-wrap velocity-legend-strip">
            <div className="flex items-center gap-[6px] text-[11px] font-semibold text-[var(--ink-secondary)] velocity-legend-item">
              <span className="inline-block w-[16px] h-[3px] rounded-[2px] bg-[#38bdf8] shadow-[0_0_8px_rgba(56,189,248,0.4)] velocity-legend-line velocity-legend-blue" />
              <span>Rata-rata Resolusi</span>
            </div>
            <div className="flex items-center gap-[6px] text-[11px] font-semibold text-[var(--ink-secondary)] velocity-legend-item">
              <span className="inline-block w-[16px] h-0 rounded-[2px] bg-[#f59e0b] border-t-[2px] border-t-dashed border-t-[#f59e0b] border-transparent velocity-legend-line velocity-legend-orange" />
              <span>Target SLA (60m)</span>
            </div>
            <div className="flex items-center gap-[6px] text-[11px] font-semibold text-[var(--ink-secondary)] velocity-legend-item">
              <span className="inline-block w-[16px] h-0 rounded-[2px] bg-[#f87171] border-t-[2px] border-t-dashed border-t-[#f87171] border-transparent velocity-legend-line velocity-legend-red" />
              <span>Batas Kritis / Breach (90m)</span>
            </div>
          </div>
        </div>
          <div className="flex flex-col flex-1 p-[16px_20px] gap-[10px] justify-between report-panel-body velocity-panel-body">
            {volumeByDate.length > 0 ? (
              <>
                {/* 4 Summary Stat Pills for Quick Velocity Intelligence */}
                {(() => {
                  const resolutions = volumeByDate.map((v) => v.avgResolution);
                  const avg = Math.round(resolutions.reduce((a, b) => a + b, 0) / (resolutions.length || 1));
                  const min = Math.min(...resolutions);
                  const max = Math.max(...resolutions);
                  const metCount = volumeByDate.filter((v) => v.avgResolution <= 60).length;
                  const compliancePct = Math.round((metCount / volumeByDate.length) * 100);

                  return (
                    <div className="grid grid-cols-4 max-[860px]:grid-cols-2 gap-[10px] mb-[2px] velocity-metrics-strip">
                      <div className="flex flex-col gap-[3px] p-[8px_12px] bg-[rgba(15,23,42,0.55)] border border-[rgba(255,255,255,0.08)] rounded-[8px] velocity-metric-pill">
                        <span className="text-[10px] text-[var(--ink-muted)] font-semibold whitespace-nowrap overflow-hidden text-ellipsis velocity-metric-label">Rata-rata Resolusi</span>
                        <span className="font-mono text-[15px] font-extrabold text-[var(--ink-primary)] leading-[1.1] [&_small]:text-[10px] [&_small]:font-medium [&_small]:text-[var(--ink-muted)] velocity-metric-val">{avg} <small>menit</small></span>
                      </div>
                      <div className="flex flex-col gap-[3px] p-[8px_12px] bg-[rgba(15,23,42,0.55)] border border-[rgba(255,255,255,0.08)] rounded-[8px] velocity-metric-pill">
                        <span className="text-[10px] text-[var(--ink-muted)] font-semibold whitespace-nowrap overflow-hidden text-ellipsis velocity-metric-label">Kepatuhan SLA (≤60m)</span>
                        <span className="font-mono text-[15px] font-extrabold text-[var(--ink-primary)] leading-[1.1] [&_small]:text-[10px] [&_small]:font-medium velocity-metric-val">{compliancePct}%</span>
                      </div>
                      <div className="flex flex-col gap-[3px] p-[8px_12px] bg-[rgba(15,23,42,0.55)] border border-[rgba(255,255,255,0.08)] rounded-[8px] velocity-metric-pill">
                        <span className="text-[10px] text-[var(--ink-muted)] font-semibold whitespace-nowrap overflow-hidden text-ellipsis velocity-metric-label">Durasi Tercepat</span>
                        <span className="font-mono text-[15px] font-extrabold text-[var(--ink-primary)] leading-[1.1] [&_small]:text-[10px] [&_small]:font-medium velocity-metric-val">{min} <small>menit</small></span>
                      </div>
                      <div className="flex flex-col gap-[3px] p-[8px_12px] bg-[rgba(15,23,42,0.55)] border border-[rgba(255,255,255,0.08)] rounded-[8px] velocity-metric-pill">
                        <span className="text-[10px] text-[var(--ink-muted)] font-semibold whitespace-nowrap overflow-hidden text-ellipsis velocity-metric-label">Durasi Tertinggi</span>
                        <span className="font-mono text-[15px] font-extrabold leading-[1.1] [&_small]:text-[10px] [&_small]:font-medium velocity-metric-val text-[var(--ink-primary)]">
                          {max} <small>menit</small>
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Clean, Prominent Line Chart with Collision-Free Labels & Interactive Hover */}
                <div
                  className="relative w-full h-[290px] min-h-[280px] flex flex-col flex-1 overflow-visible velocity-chart-container"
                  onMouseLeave={() => setHoveredVelocityPoint(null)}
                >
                  {(() => {
                    const n = volumeByDate.length;
                    const svgViewBoxWidth = Math.max(860, n * 48 + 90);
                    const viewBoxHeight = 280;
                    const startX = 64;
                    const endX = svgViewBoxWidth - 90; // room for threshold tags on the right
                    const totalSpan = endX - startX;
                    const stepX = n > 1 ? totalSpan / (n - 1) : totalSpan / 2;

                    const baselineY = 226;
                    const topY = 32;
                    const chartHeight = baselineY - topY; // 194px

                    // Y ticks at 0, 20, 40, 60, 80, 100
                    const maxVal = Math.max(70, ...volumeByDate.map((v) => v.avgResolution));
                    const yMax = Math.max(100, Math.ceil(maxVal / 20) * 20);
                    const ticks = [0, 20, 40, 60, 80, 100];
                    if (yMax > 100) {
                      for (let i = 120; i <= yMax; i += 20) ticks.push(i);
                    }

                    const points = volumeByDate.map((item, idx) => {
                      const x = n > 1 ? Math.round(startX + idx * stepX) : Math.round((startX + endX) / 2);
                      const y = baselineY - Math.round((item.avgResolution / yMax) * chartHeight);
                      return { x, y, idx, ...item };
                    });

                    const firstX = points[0]?.x ?? startX;
                    const lastX = points[points.length - 1]?.x ?? endX;
                    const pathD = `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`;
                    const areaD = `M ${firstX},${baselineY} L ${points.map((p) => `${p.x},${p.y}`).join(" L ")} L ${lastX},${baselineY} Z`;

                    // Min & max identifiers for milestone callouts
                    const allResolutions = points.map((p) => p.avgResolution);
                    const maxRes = Math.max(...allResolutions);
                    const minRes = Math.min(...allResolutions);

                    const maxPoint = points.find((p) => p.avgResolution === maxRes);
                    const minPoint = points.find((p) => p.avgResolution === minRes && p.avgResolution !== maxRes);

                    // X-axis stride to avoid crowding
                    const dateStride = n > 22 ? 3 : n > 12 ? 2 : 1;

                    return (
                      <>
                        <svg
                          className="w-full h-full min-h-[280px] block select-none !overflow-visible velocity-chart-svg"
                          viewBox={`0 0 ${svgViewBoxWidth} ${viewBoxHeight}`}
                          preserveAspectRatio="none"
                        >
                          <defs>
                            <linearGradient id="gradVelocity" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.28" />
                              <stop offset="85%" stopColor="#38bdf8" stopOpacity="0.04" />
                              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                            </linearGradient>
                            <filter id="glow-halo" x="-50%" y="-50%" width="200%" height="200%">
                              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#38bdf8" floodOpacity="0.6" />
                            </filter>
                          </defs>

                          {/* ── 1. Horizontal Gridlines & Y-Axis Ticks ── */}
                          {ticks.map((tick) => {
                            const yPos = baselineY - Math.round((tick / yMax) * chartHeight);
                            const isSLA = tick === 60;
                            const isBaseline = tick === 0;

                            return (
                              <g key={`grid-res-${tick}`}>
                                <line
                                  x1={startX - 10}
                                  y1={yPos}
                                  x2={endX + 6}
                                  y2={yPos}
                                  stroke={
                                    isBaseline
                                      ? "var(--line, rgba(255, 255, 255, 0.12))"
                                      : isSLA
                                      ? "rgba(245, 158, 11, 0.75)"
                                      : "rgba(255, 255, 255, 0.05)"
                                  }
                                  strokeWidth={isBaseline ? "1.5" : isSLA ? "1.5" : "1"}
                                  strokeDasharray={isBaseline ? undefined : isSLA ? "5 4" : "3 4"}
                                />

                                {/* Left Y-Axis Label */}
                                <text
                                  x={startX - 16}
                                  y={yPos + 3.5}
                                  textAnchor="end"
                                  fill={isSLA ? "#f59e0b" : "var(--ink-muted, #94a3b8)"}
                                  fontSize={isSLA ? "10.5" : "9"}
                                  fontWeight={isSLA ? "800" : "600"}
                                  fontFamily="var(--font-mono)"
                                >
                                  {tick}m
                                </text>
                              </g>
                            );
                          })}

                          {/* ── 2. Reference Threshold Line 90m (Breach Threshold) ── */}
                          {(() => {
                            const y90 = baselineY - Math.round((90 / yMax) * chartHeight);
                            return (
                              <g key="grid-breach-90">
                                <line
                                  x1={startX - 10}
                                  y1={y90}
                                  x2={endX + 6}
                                  y2={y90}
                                  stroke="rgba(248, 113, 113, 0.7)"
                                  strokeWidth="1.5"
                                  strokeDasharray="5 4"
                                />
                                {/* Right threshold tag for 90m */}
                                <g transform={`translate(${endX + 10}, ${y90 - 8})`}>
                                  <rect
                                    width="68"
                                    height="16"
                                    rx="4"
                                    fill="rgba(239, 68, 68, 0.16)"
                                    stroke="rgba(239, 68, 68, 0.45)"
                                    strokeWidth="1"
                                  />
                                  <text
                                    x="34"
                                    y="11"
                                    textAnchor="middle"
                                    fill="#f87171"
                                    fontSize="8.5"
                                    fontWeight="700"
                                    fontFamily="var(--font-mono)"
                                  >
                                    Breach 90m
                                  </text>
                                </g>
                              </g>
                            );
                          })()}

                          {/* Right threshold tag for 60m (Target SLA) */}
                          {(() => {
                            const y60 = baselineY - Math.round((60 / yMax) * chartHeight);
                            return (
                              <g transform={`translate(${endX + 10}, ${y60 - 8})`}>
                                <rect
                                  width="68"
                                  height="16"
                                  rx="4"
                                  fill="rgba(245, 158, 11, 0.16)"
                                  stroke="rgba(245, 158, 11, 0.45)"
                                  strokeWidth="1"
                                />
                                <text
                                  x="34"
                                  y="11"
                                  textAnchor="middle"
                                  fill="#f59e0b"
                                  fontSize="8.5"
                                  fontWeight="700"
                                  fontFamily="var(--font-mono)"
                                >
                                  Target 60m
                                </text>
                              </g>
                            );
                          })()}

                          {/* ── 3. Gradient Area & Trend Path ── */}
                          <path d={areaD} fill="url(#gradVelocity)" />
                          <path
                            d={pathD}
                            fill="none"
                            stroke="#38bdf8"
                            strokeWidth="2.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {/* ── 4. Vertical Cursor Guideline for Hovered Point ── */}
                          {hoveredVelocityPoint && (
                            <line
                              x1={hoveredVelocityPoint.x}
                              y1={topY}
                              x2={hoveredVelocityPoint.x}
                              y2={baselineY}
                              stroke="rgba(56, 189, 248, 0.4)"
                              strokeWidth="1.5"
                              strokeDasharray="3 3"
                            />
                          )}

                          {/* ── 5. Data Points & Milestone Badges ── */}
                          {points.map((p, idx) => {
                            const isBreach = p.avgResolution > 60;
                            const isHovered = hoveredVelocityPoint?.date === p.date;
                            const isMax = maxPoint?.date === p.date;
                            const isMin = minPoint?.date === p.date;

                            // X-axis tick & label display
                            const showXLabel = idx % dateStride === 0 || idx === n - 1;

                            return (
                              <g key={p.date}>
                                {/* X-axis Tick & Label */}
                                {showXLabel && (
                                  <>
                                    <line
                                      x1={p.x}
                                      y1={baselineY}
                                      x2={p.x}
                                      y2={baselineY + 4}
                                      stroke="rgba(255, 255, 255, 0.2)"
                                      strokeWidth="1"
                                    />
                                    <text
                                      x={p.x}
                                      y={baselineY + 18}
                                      textAnchor="middle"
                                      fill={isHovered ? "#38bdf8" : "var(--ink-muted, #94a3b8)"}
                                      fontSize="9"
                                      fontWeight={isHovered ? "700" : "500"}
                                      fontFamily="var(--font-mono)"
                                    >
                                      {p.date.slice(5)}
                                    </text>
                                  </>
                                )}

                                {/* Milestone Callout Badge (Peak Max point) */}
                                {isMax && !isHovered && (() => {
                                  const maxBadgeText = `${p.avgResolution}m Max`;
                                  const maxBadgeWidth = Math.max(72, maxBadgeText.length * 6.5 + 16);
                                  const maxBadgeHeight = 17;
                                  const halfW = maxBadgeWidth / 2;
                                  const clampedX = Math.max(halfW + 6, Math.min(svgViewBoxWidth - halfW - 6, p.x));
                                  const placeBelow = p.y < 30;
                                  const rectY = placeBelow ? p.y + 8 : p.y - 8 - maxBadgeHeight;

                                  return (
                                    <g style={{ pointerEvents: "none" }}>
                                      <rect
                                        x={clampedX - halfW}
                                        y={rectY}
                                        width={maxBadgeWidth}
                                        height={maxBadgeHeight}
                                        rx="4"
                                        fill="#0f172a"
                                        stroke={isBreach ? "#ef4444" : "#f59e0b"}
                                        strokeWidth="1.2"
                                      />
                                      <text
                                        x={clampedX}
                                        y={rectY + maxBadgeHeight / 2}
                                        dominantBaseline="central"
                                        textAnchor="middle"
                                        fill={isBreach ? "#f87171" : "#fbbf24"}
                                        fontSize="8.5"
                                        fontWeight="800"
                                        fontFamily="var(--font-mono)"
                                      >
                                        {maxBadgeText}
                                      </text>
                                    </g>
                                  );
                                })()}

                                {/* Milestone Callout Badge (Fastest Min point) */}
                                {isMin && !isHovered && (() => {
                                  const minBadgeText = `${p.avgResolution}m Min`;
                                  const minBadgeWidth = Math.max(68, minBadgeText.length * 6.5 + 16);
                                  const minBadgeHeight = 17;
                                  const halfW = minBadgeWidth / 2;
                                  const clampedX = Math.max(halfW + 6, Math.min(svgViewBoxWidth - halfW - 6, p.x));
                                  const placeAbove = p.y > baselineY - 24;
                                  const rectY = placeAbove ? p.y - 8 - minBadgeHeight : p.y + 8;

                                  return (
                                    <g style={{ pointerEvents: "none" }}>
                                      <rect
                                        x={clampedX - halfW}
                                        y={rectY}
                                        width={minBadgeWidth}
                                        height={minBadgeHeight}
                                        rx="4"
                                        fill="#0f172a"
                                        stroke="#38bdf8"
                                        strokeWidth="1.2"
                                      />
                                      <text
                                        x={clampedX}
                                        y={rectY + minBadgeHeight / 2}
                                        dominantBaseline="central"
                                        textAnchor="middle"
                                        fill="#38bdf8"
                                        fontSize="8.5"
                                        fontWeight="800"
                                        fontFamily="var(--font-mono)"
                                      >
                                        {minBadgeText}
                                      </text>
                                    </g>
                                  );
                                })()}

                                {/* Breach callout if breached and not max */}
                                {isBreach && !isMax && !isHovered && (() => {
                                  const breachText = `${p.avgResolution}m !`;
                                  const breachWidth = Math.max(58, breachText.length * 6.5 + 16);
                                  const breachHeight = 17;
                                  const halfW = breachWidth / 2;
                                  const clampedX = Math.max(halfW + 6, Math.min(svgViewBoxWidth - halfW - 6, p.x));
                                  const placeBelow = p.y < 30;
                                  const rectY = placeBelow ? p.y + 8 : p.y - 8 - breachHeight;

                                  return (
                                    <g style={{ pointerEvents: "none" }}>
                                      <rect
                                        x={clampedX - halfW}
                                        y={rectY}
                                        width={breachWidth}
                                        height={breachHeight}
                                        rx="4"
                                        fill="#0f172a"
                                        stroke="#ef4444"
                                        strokeWidth="1.2"
                                      />
                                      <text
                                        x={clampedX}
                                        y={rectY + breachHeight / 2}
                                        dominantBaseline="central"
                                        textAnchor="middle"
                                        fill="#f87171"
                                        fontSize="8.5"
                                        fontWeight="800"
                                        fontFamily="var(--font-mono)"
                                      >
                                        {breachText}
                                      </text>
                                    </g>
                                  );
                                })()}

                                {/* Transparent Wide Hover Target Column */}
                                <rect
                                  x={p.x - stepX / 2}
                                  y={topY}
                                  width={stepX}
                                  height={chartHeight + 25}
                                  fill="transparent"
                                  className="[cursor:pointer]!"
                                  onMouseEnter={() => {
                                    setHoveredVelocityPoint({
                                      x: p.x,
                                      y: p.y,
                                      date: p.date,
                                      avgResolution: p.avgResolution,
                                      closed: p.closed,
                                      percentX: (p.x / svgViewBoxWidth) * 100,
                                      percentY: (p.y / viewBoxHeight) * 100,
                                    });
                                  }}
                                />
                              </g>
                            );
                          })}
                        </svg>

                        {/* ── Data Points & Nodes (HTML Overlay - Zero SVG Distortion, 100% Perfect Round Circles) ── */}
                        <div
                          className="velocity-nodes-layer [position:absolute]! [inset:0]! [pointer-events:none]! [overflow:visible]! [z-index:4]!"
                          aria-hidden="true"
                        >
                          {points.map((p) => {
                            const isBreach = p.avgResolution > 60;
                            const isHovered = hoveredVelocityPoint?.date === p.date;
                            const percentX = (p.x / svgViewBoxWidth) * 100;
                            const percentY = (p.y / viewBoxHeight) * 100;
                            const dotSize = isHovered ? 13 : isBreach ? 9 : 7;
                            const dotColor = isHovered ? "#ffffff" : isBreach ? "#ef4444" : "#38bdf8";
                            const borderColor = isHovered
                              ? isBreach
                                ? "#ef4444"
                                : "#0284c7"
                              : "var(--panel-bg, #0f172a)";

                            return (
                              <span
                                key={`vel-html-dot-${p.date}`}
                                className="velocity-node-dot"
                                style={{
                                  position: "absolute",
                                  left: `${percentX}%`,
                                  top: `${percentY}%`,
                                  width: `${dotSize}px`,
                                  height: `${dotSize}px`,
                                  minWidth: `${dotSize}px`,
                                  minHeight: `${dotSize}px`,
                                  maxWidth: `${dotSize}px`,
                                  maxHeight: `${dotSize}px`,
                                  borderRadius: "50%",
                                  transform: "translate(-50%, -50%)",
                                  backgroundColor: dotColor,
                                  border: isHovered ? `3px solid ${borderColor}` : `1.8px solid ${borderColor}`,
                                  boxShadow: isHovered
                                    ? `0 0 14px 2px ${isBreach ? "#ef4444" : "#38bdf8"}, 0 0 4px ${isBreach ? "#ef4444" : "#38bdf8"}`
                                    : "none",
                                  transition: "width 0.15s ease, height 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease",
                                  zIndex: isHovered ? 10 : 4,
                                }}
                              />
                            );
                          })}
                        </div>

                        {/* Floating Interactive Tooltip Overlay */}
                        {hoveredVelocityPoint && (
                          <div
                            className="absolute pointer-events-none z-[99] -translate-x-1/2 -translate-y-full -mt-[12px] bg-[rgba(15,23,42,0.94)] backdrop-blur-[8px] border border-[rgba(56,189,248,0.35)] rounded-[8px] p-[8px_12px] shadow-[0_8px_24px_rgba(0,0,0,0.45),0_0_12px_rgba(56,189,248,0.15)] min-w-[150px] whitespace-nowrap [animation:tooltipFade_0.15s_ease-out] velocity-chart-tooltip"
                            style={{
                              left: `${hoveredVelocityPoint.percentX}%`,
                              top: `${hoveredVelocityPoint.percentY}%`,
                            }}
                          >
                            <div className="text-[11px] font-bold text-[var(--ink-primary)] mb-[4px] border-b border-[rgba(255,255,255,0.08)] pb-[3px] flex items-center justify-between gap-[8px] velocity-tooltip-header">
                              <span>📅 {hoveredVelocityPoint.date}</span>
                              <span
                                className={`inline-block text-[9.5px] font-bold p-[2px_6px] rounded-[4px] mt-[4px] velocity-tooltip-badge ${
                                  hoveredVelocityPoint.avgResolution <= 60 ? "bg-[rgba(16,185,129,0.15)] text-[#34d399] border border-[rgba(16,185,129,0.3)] sla-ok" : "bg-[rgba(239,68,68,0.15)] text-[#f87171] border border-[rgba(239,68,68,0.3)] sla-breach"
                                }`}
                              >
                                {hoveredVelocityPoint.avgResolution <= 60 ? "✓ SLA OK" : "⚠ Breach"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-[12px] text-[11px] mt-[3px] text-[var(--ink-secondary)] velocity-tooltip-row">
                              <span>Rata-rata Resolusi:</span>
                              <span className="font-bold font-mono text-[#38bdf8] velocity-tooltip-val">
                                {hoveredVelocityPoint.avgResolution} Menit
                              </span>
                            </div>
                            {hoveredVelocityPoint.closed > 0 && (
                              <div className="flex items-center justify-between gap-[12px] text-[11px] mt-[3px] text-[var(--ink-secondary)] velocity-tooltip-row">
                                <span>Tiket Selesai:</span>
                                <span className="[font-weight:600]! [color:var(--ink-primary)]!">
                                  {hoveredVelocityPoint.closed} Tiket
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </>
            ) : (
              <div className="text-[12px] text-[var(--ink-muted)] text-center py-[24px] italic chart-empty-hint">Tidak ada data resolusi pada filter ini.</div>
            )}
          </div>
        </article>

      {/* ── 7. Shift Traffic Velocity (Multi-Line Trajectory Chart) ── */}
      <div className="heatmap-standalone-section mt-[18px]">
        <article className="bg-[var(--panel-bg)] border border-[rgba(16,185,129,0.18)] rounded-[12px] shadow-[var(--shadow-panel)] overflow-hidden flex flex-col shift-traffic-panel">
          <div className={`${REPORT_PANEL_HEADING} report-panel-heading`}>
            <div className={`${REPORT_PANEL_TITLE} panel-title`}>
              <Activity size={16} className="text-emerald-400" />
              Tren Trafik Beban per Shift (Shift Traffic Velocity)
            </div>
          </div>
          <div className="flex flex-col flex-1 justify-between p-[16px_20px] gap-[12px] report-panel-body shift-traffic-panel-body">
            {/* 4 Summary Stat Pills for Quick Shift Intelligence */}
            {(() => {
              const pagiTotal = shiftHeatmapData.shiftTotals["Pagi"] || 0;
              const malamTotal = shiftHeatmapData.shiftTotals["Malam"] || 0;
              const subuhTotal = shiftHeatmapData.shiftTotals["Subuh"] || 0;
              const grand = shiftHeatmapData.grandTotal || 1;
              const pagiPct = Math.round((pagiTotal / grand) * 100);
              const malamPct = Math.round((malamTotal / grand) * 100);
              const subuhPct = Math.round((subuhTotal / grand) * 100);

              return (
                <div className="grid grid-cols-4 max-[900px]:grid-cols-2 gap-[12px] mb-[14px] shift-traffic-metrics-strip">
                  <div className="flex flex-col gap-[8px] p-[12px_15px] rounded-[10px] bg-[rgba(15,23,42,0.55)] border border-[rgba(148,163,184,0.12)] min-w-0 shadow-[0_2px_8px_rgba(0,0,0,0.18)] transition-all duration-150 hover:bg-[rgba(15,23,42,0.75)] hover:border-[rgba(56,189,248,0.3)] hover:-translate-y-[1px] shift-traffic-metric-pill">
                    <div className="text-[11px] font-semibold text-[var(--ink-muted,#94a3b8)] flex items-center gap-[6px] whitespace-nowrap leading-[1.3] shift-traffic-metric-label">
                      <Sun size={13} className="[color:#fbbf24]! [flex-shrink:0]!" />
                      <span className="text-[var(--ink-primary,#f8fafc)] font-semibold shift-traffic-metric-name">Shift Pagi</span>
                      <span className="text-[10px] text-[var(--ink-muted,#94a3b8)] font-mono font-medium opacity-80 ml-[2px] shift-traffic-metric-hours">(08:00–16:30)</span>
                    </div>
                    <div className="text-[18px] font-extrabold font-mono leading-[1.2] flex items-baseline gap-[6px] shift-traffic-metric-val [color:#fbbf24]!">
                      {pagiTotal} <small className="text-[11.5px] font-medium text-[var(--ink-muted,#94a3b8)] shift-metric-unit">tiket</small>
                    </div>
                    <div className="text-[10.5px] text-[var(--ink-muted,#94a3b8)] font-mono leading-[1.35] whitespace-nowrap overflow-hidden text-ellipsis shift-traffic-metric-sub">{pagiPct}% dari total beban</div>
                  </div>

                  <div className="flex flex-col gap-[8px] p-[12px_15px] rounded-[10px] bg-[rgba(15,23,42,0.55)] border border-[rgba(148,163,184,0.12)] min-w-0 shadow-[0_2px_8px_rgba(0,0,0,0.18)] transition-all duration-150 hover:bg-[rgba(15,23,42,0.75)] hover:border-[rgba(56,189,248,0.3)] hover:-translate-y-[1px] shift-traffic-metric-pill">
                    <div className="text-[11px] font-semibold text-[var(--ink-muted,#94a3b8)] flex items-center gap-[6px] whitespace-nowrap leading-[1.3] shift-traffic-metric-label">
                      <Sunset size={13} className="[color:#c084fc]! [flex-shrink:0]!" />
                      <span className="text-[var(--ink-primary,#f8fafc)] font-semibold shift-traffic-metric-name">Shift Malam</span>
                      <span className="text-[10px] text-[var(--ink-muted,#94a3b8)] font-mono font-medium opacity-80 ml-[2px] shift-traffic-metric-hours">(16:00–00:30)</span>
                    </div>
                    <div className="text-[18px] font-extrabold font-mono leading-[1.2] flex items-baseline gap-[6px] shift-traffic-metric-val [color:#c084fc]!">
                      {malamTotal} <small className="text-[11.5px] font-medium text-[var(--ink-muted,#94a3b8)] shift-metric-unit">tiket</small>
                    </div>
                    <div className="text-[10.5px] text-[var(--ink-muted,#94a3b8)] font-mono leading-[1.35] whitespace-nowrap overflow-hidden text-ellipsis shift-traffic-metric-sub">{malamPct}% dari total beban</div>
                  </div>

                  <div className="flex flex-col gap-[8px] p-[12px_15px] rounded-[10px] bg-[rgba(15,23,42,0.55)] border border-[rgba(148,163,184,0.12)] min-w-0 shadow-[0_2px_8px_rgba(0,0,0,0.18)] transition-all duration-150 hover:bg-[rgba(15,23,42,0.75)] hover:border-[rgba(56,189,248,0.3)] hover:-translate-y-[1px] shift-traffic-metric-pill">
                    <div className="text-[11px] font-semibold text-[var(--ink-muted,#94a3b8)] flex items-center gap-[6px] whitespace-nowrap leading-[1.3] shift-traffic-metric-label">
                      <Moon size={13} className="[color:#38bdf8]! [flex-shrink:0]!" />
                      <span className="text-[var(--ink-primary,#f8fafc)] font-semibold shift-traffic-metric-name">Shift Subuh</span>
                      <span className="text-[10px] text-[var(--ink-muted,#94a3b8)] font-mono font-medium opacity-80 ml-[2px] shift-traffic-metric-hours">(00:00–08:30)</span>
                    </div>
                    <div className="text-[18px] font-extrabold font-mono leading-[1.2] flex items-baseline gap-[6px] shift-traffic-metric-val [color:#38bdf8]!">
                      {subuhTotal} <small className="text-[11.5px] font-medium text-[var(--ink-muted,#94a3b8)] shift-metric-unit">tiket</small>
                    </div>
                    <div className="text-[10.5px] text-[var(--ink-muted,#94a3b8)] font-mono leading-[1.35] whitespace-nowrap overflow-hidden text-ellipsis shift-traffic-metric-sub">{subuhPct}% dari total beban</div>
                  </div>

                  <div className="flex flex-col gap-[8px] p-[12px_15px] rounded-[10px] bg-[rgba(15,23,42,0.55)] border border-[rgba(148,163,184,0.12)] min-w-0 shadow-[0_2px_8px_rgba(0,0,0,0.18)] transition-all duration-150 hover:bg-[rgba(15,23,42,0.75)] hover:border-[rgba(56,189,248,0.3)] hover:-translate-y-[1px] shift-traffic-metric-pill">
                    <div className="text-[11px] font-semibold text-[var(--ink-muted,#94a3b8)] flex items-center gap-[6px] whitespace-nowrap leading-[1.3] shift-traffic-metric-label">
                      <Zap size={13} className="[color:#f87171]! [flex-shrink:0]!" />
                      <span className="text-[var(--ink-primary,#f8fafc)] font-semibold shift-traffic-metric-name">Total Beban Terbanyak</span>
                      <span className="text-[10px] text-[var(--ink-muted,#94a3b8)] font-mono font-medium opacity-80 ml-[2px] shift-traffic-metric-hours">(Kumulatif)</span>
                    </div>
                    <div className="text-[18px] font-extrabold font-mono leading-[1.2] flex items-baseline gap-[6px] shift-traffic-metric-val text-rose-400">
                      {shiftHeatmapData.peakShift.name}
                    </div>
                    <div className="text-[10.5px] text-[var(--ink-muted,#94a3b8)] font-mono leading-[1.35] whitespace-nowrap overflow-hidden text-ellipsis shift-traffic-metric-sub">
                      {shiftHeatmapData.shiftTotals[shiftHeatmapData.peakShift.id]} tiket (
                      {grand > 0
                        ? Math.round(
                            (shiftHeatmapData.shiftTotals[shiftHeatmapData.peakShift.id] / grand) * 100
                          )
                        : 0}
                      % total)
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Clean, Prominent Multi-Line Chart Modeled After Resolution Velocity */}
            <div
              className="relative w-full h-[275px] min-h-[265px] max-h-[310px] flex flex-col flex-1 overflow-visible shift-traffic-chart-container"
              onMouseLeave={() => setHoveredShiftTrafficPoint(null)}
            >
              {(() => {
                const dateList = shiftHeatmapData.dateList;
                const n = dateList.length;
                const svgViewBoxWidth = Math.max(860, n * 50 + 60);
                const viewBoxHeight = 280;
                const startX = 46;
                const endX = svgViewBoxWidth - 36;
                const totalSpan = endX - startX;
                const stepX = n > 1 ? totalSpan / (n - 1) : totalSpan / 2;

                const baselineY = 226;
                const topY = 38;
                const chartHeight = baselineY - topY; // 188px

                // Y ticks calculation - tight scaling to prevent empty top rows!
                const allCounts = dateList.flatMap((d) => [
                  shiftHeatmapData.matrix.Subuh[d] || 0,
                  shiftHeatmapData.matrix.Pagi[d] || 0,
                  shiftHeatmapData.matrix.Malam[d] || 0,
                ]);
                const maxCount = Math.max(3, ...allCounts);
                const yMax = maxCount <= 3 ? 3 : maxCount <= 6 ? maxCount : Math.ceil(maxCount / 2) * 2;
                const stepTick = yMax <= 4 ? 1 : yMax <= 8 ? 2 : Math.ceil(yMax / 4);
                const ticks: number[] = [];
                for (let i = 0; i <= yMax; i += stepTick) ticks.push(i);
                if (ticks[ticks.length - 1] !== yMax) ticks.push(yMax);

                // Coordinates generator for shifts
                type ShiftKey = "Subuh" | "Pagi" | "Malam";
                const shiftsMeta: { id: ShiftKey; name: string; color: string; gradId: string }[] = [
                  { id: "Subuh", name: "Shift Subuh", color: "#38bdf8", gradId: "gradShiftSubuh" },
                  { id: "Pagi", name: "Shift Pagi", color: "#fbbf24", gradId: "gradShiftPagi" },
                  { id: "Malam", name: "Shift Malam", color: "#c084fc", gradId: "gradShiftMalam" },
                ];

                const shiftSeries = shiftsMeta.map((s) => {
                  const points = dateList.map((d, idx) => {
                    const x = n > 1 ? Math.round(startX + idx * stepX) : Math.round((startX + endX) / 2);
                    const count = shiftHeatmapData.matrix[s.id][d] || 0;
                    const y = baselineY - Math.round((count / yMax) * chartHeight);
                    return { x, y, count, date: d, idx };
                  });

                  const firstX = points[0]?.x ?? startX;
                  const lastX = points[points.length - 1]?.x ?? endX;
                  const pathD = `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`;
                  const areaD = `M ${firstX},${baselineY} L ${points.map((p) => `${p.x},${p.y}`).join(" L ")} L ${lastX},${baselineY} Z`;

                  return {
                    ...s,
                    points,
                    pathD,
                    areaD,
                  };
                });

                // Overall peak point identifier
                type ShiftPeakPoint = { x: number; y: number; count: number; shiftName: string; date: string };
                let maxOverallCount = -1;
                let foundPeak: ShiftPeakPoint | null = null;
                shiftSeries.forEach((series) => {
                  series.points.forEach((p) => {
                    if (p.count > maxOverallCount && p.count > 0) {
                      maxOverallCount = p.count;
                      foundPeak = { x: p.x, y: p.y, count: p.count, shiftName: series.name, date: p.date };
                    }
                  });
                });
                const peakPointMeta: ShiftPeakPoint | null = foundPeak;

                // X-axis stride to prevent label congestion
                const dateStride = n > 22 ? 3 : n > 12 ? 2 : 1;

                return (
                  <>
                    <svg
                      className="w-full h-full min-h-[265px] block select-none overflow-visible shift-traffic-chart-svg"
                      viewBox={`0 0 ${svgViewBoxWidth} ${viewBoxHeight}`}
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id="gradShiftSubuh" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.2" />
                          <stop offset="85%" stopColor="#38bdf8" stopOpacity="0.03" />
                          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="gradShiftPagi" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.2" />
                          <stop offset="85%" stopColor="#fbbf24" stopOpacity="0.03" />
                          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="gradShiftMalam" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#c084fc" stopOpacity="0.2" />
                          <stop offset="85%" stopColor="#c084fc" stopOpacity="0.03" />
                          <stop offset="100%" stopColor="#c084fc" stopOpacity="0.0" />
                        </linearGradient>

                        <filter id="glow-shift-subuh" x="-50%" y="-50%" width="200%" height="200%">
                          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#38bdf8" floodOpacity="0.6" />
                        </filter>
                        <filter id="glow-shift-pagi" x="-50%" y="-50%" width="200%" height="200%">
                          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#fbbf24" floodOpacity="0.6" />
                        </filter>
                        <filter id="glow-shift-malam" x="-50%" y="-50%" width="200%" height="200%">
                          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#c084fc" floodOpacity="0.6" />
                        </filter>
                      </defs>

                      {/* ── 1. Horizontal Gridlines ── */}
                      {ticks.map((tick) => {
                        const yPos = baselineY - Math.round((tick / yMax) * chartHeight);
                        const isBaseline = tick === 0;

                        return (
                          <line
                            key={`grid-shift-${tick}`}
                            x1={startX - 8}
                            y1={yPos}
                            x2={endX + 6}
                            y2={yPos}
                            stroke={
                              isBaseline
                                ? "var(--line, rgba(255, 255, 255, 0.12))"
                                : "rgba(255, 255, 255, 0.05)"
                            }
                            strokeWidth={isBaseline ? "1.2" : "1"}
                            strokeDasharray={isBaseline ? undefined : "3 4"}
                          />
                        );
                      })}

                      {/* ── 2. Multi-Line Paths and Area Gradients ── */}
                      {shiftSeries.map((series) => {
                        const isFiltered =
                          activeShiftLineFilter !== "all" && activeShiftLineFilter !== series.id;
                        const isTargeted = activeShiftLineFilter === series.id;
                        const opacity = isFiltered ? 0.12 : 1;

                        return (
                          <g
                            key={`series-${series.id}`}
                            style={{ opacity, transition: "opacity 0.2s ease" }}
                          >
                            <path d={series.areaD} fill={`url(#${series.gradId})`} />
                            <path
                              d={series.pathD}
                              fill="none"
                              stroke={series.color}
                              strokeWidth={isTargeted ? "2.6" : "2"}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </g>
                        );
                      })}

                      {/* ── 3. Vertical Cursor Guideline for Hovered Column ── */}
                      {hoveredShiftTrafficPoint && (
                        <line
                          x1={hoveredShiftTrafficPoint.x}
                          y1={topY}
                          x2={hoveredShiftTrafficPoint.x}
                          y2={baselineY}
                          stroke="rgba(56, 189, 248, 0.4)"
                          strokeWidth="1.2"
                          strokeDasharray="3 3"
                        />
                      )}

                      {/* ── 5. X-Axis Tick Marks & Hover Hit Columns ── */}
                      {dateList.map((d, idx) => {
                        const x =
                          n > 1 ? Math.round(startX + idx * stepX) : Math.round((startX + endX) / 2);
                        const showXLabel = idx % dateStride === 0 || idx === n - 1;
                        const subuh = shiftHeatmapData.matrix.Subuh[d] || 0;
                        const pagi = shiftHeatmapData.matrix.Pagi[d] || 0;
                        const malam = shiftHeatmapData.matrix.Malam[d] || 0;
                        const total = subuh + pagi + malam;

                        // Calculate y of highest shift for tooltip positioning
                        const topShiftCount = Math.max(subuh, pagi, malam);
                        const topShiftY =
                          baselineY - Math.round((topShiftCount / yMax) * chartHeight);

                        return (
                          <g key={`col-${d}`}>
                            {showXLabel && (
                              <line
                                x1={x}
                                y1={baselineY}
                                x2={x}
                                y2={baselineY + 4}
                                stroke="rgba(255, 255, 255, 0.18)"
                                strokeWidth="1"
                              />
                            )}

                            {/* Transparent Wide Hover Target Column */}
                            <rect
                              x={x - stepX / 2}
                              y={topY}
                              width={stepX}
                              height={chartHeight + 24}
                              fill="transparent"
                              className="[cursor:pointer]!"
                              onMouseEnter={() => {
                                setHoveredShiftTrafficPoint({
                                  x,
                                  y: topShiftY,
                                  date: d,
                                  subuh,
                                  pagi,
                                  malam,
                                  total,
                                  percentX: (x / svgViewBoxWidth) * 100,
                                  percentY: (topShiftY / viewBoxHeight) * 100,
                                });
                              }}
                            />
                          </g>
                        );
                      })}
                    </svg>

                    {/* ── Data Points & Nodes per Shift (HTML Overlay - Zero SVG Distortion, 100% Perfect Round Circles) ── */}
                    <div
                      className="shift-traffic-nodes-layer [position:absolute]! [inset:0]! [pointer-events:none]! [overflow:visible]! [z-index:4]!"
                      aria-hidden="true"
                    >
                      {shiftSeries.map((series) => {
                        const isFiltered =
                          activeShiftLineFilter !== "all" && activeShiftLineFilter !== series.id;
                        if (isFiltered) return null;

                        return series.points.map((p) => {
                          const isColHovered = hoveredShiftTrafficPoint?.date === p.date;
                          const percentX = (p.x / svgViewBoxWidth) * 100;
                          const percentY = (p.y / viewBoxHeight) * 100;
                          const dotSize = isColHovered ? 11 : 6;

                          return (
                            <span
                              key={`html-node-${series.id}-${p.date}`}
                              className="shift-traffic-node-dot"
                              style={{
                                position: "absolute",
                                left: `${percentX}%`,
                                top: `${percentY}%`,
                                width: `${dotSize}px`,
                                height: `${dotSize}px`,
                                minWidth: `${dotSize}px`,
                                minHeight: `${dotSize}px`,
                                maxWidth: `${dotSize}px`,
                                maxHeight: `${dotSize}px`,
                                borderRadius: "50%",
                                transform: "translate(-50%, -50%)",
                                backgroundColor: isColHovered ? "#ffffff" : series.color,
                                border: isColHovered
                                  ? `2.5px solid ${series.color}`
                                  : "1.5px solid var(--panel-bg, #0f172a)",
                                boxShadow: isColHovered
                                  ? `0 0 12px 2px ${series.color}, 0 0 4px ${series.color}`
                                  : "none",
                                transition: "width 0.15s ease, height 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease",
                                zIndex: isColHovered ? 10 : 4,
                              }}
                            />
                          );
                        });
                      })}
                    </div>

                    {/* Y-Axis Tick Labels (HTML Overlay - Zero SVG Distortion) */}
                    <div
                      className="absolute left-0 top-0 bottom-0 pointer-events-none z-[5] shift-traffic-y-axis"
                      style={{ width: `${(startX / svgViewBoxWidth) * 100}%` }}
                    >
                      {ticks.map((tick) => {
                        const yPos = baselineY - Math.round((tick / yMax) * chartHeight);
                        const percentY = (yPos / viewBoxHeight) * 100;
                        return (
                          <span
                            key={`y-label-${tick}`}
                            className="absolute right-[10px] -translate-y-1/2 text-[11px] font-semibold font-mono text-[var(--ink-muted,#94a3b8)] leading-none text-right select-none tracking-[-0.02em] shift-traffic-y-label"
                            style={{ top: `${percentY}%` }}
                          >
                            {tick}
                          </span>
                        );
                      })}
                    </div>

                    {/* X-Axis Date Labels (HTML Overlay - Zero SVG Distortion) */}
                    <div
                      className="absolute left-0 right-0 h-[24px] pointer-events-none z-[5] shift-traffic-x-axis"
                      style={{ top: `${(baselineY / viewBoxHeight) * 100}%` }}
                    >
                      {dateList.map((d, idx) => {
                        const x =
                          n > 1 ? Math.round(startX + idx * stepX) : Math.round((startX + endX) / 2);
                        const showXLabel = idx % dateStride === 0 || idx === n - 1;
                        if (!showXLabel) return null;
                        const percentX = (x / svgViewBoxWidth) * 100;
                        const isHovered = hoveredShiftTrafficPoint?.date === d;

                        return (
                          <span
                            key={`x-label-${d}`}
                            className={`absolute -translate-x-1/2 translate-y-[6px] text-[11px] font-medium font-mono text-[var(--ink-muted,#94a3b8)] whitespace-nowrap select-none transition-[color,font-weight] duration-150 tracking-[-0.01em] shift-traffic-x-label ${isHovered ? "text-[#38bdf8] font-bold hovered" : ""}`}
                            style={{ left: `${percentX}%` }}
                          >
                            {d.length >= 10 ? d.slice(5) : d}
                          </span>
                        );
                      })}
                    </div>

                    {/* Milestone Peak Callout Badge (HTML Overlay - Zero SVG Distortion) */}
                    {peakPointMeta && !hoveredShiftTrafficPoint && ((peak: ShiftPeakPoint) => {
                      const percentX = (peak.x / svgViewBoxWidth) * 100;
                      const percentY = (peak.y / viewBoxHeight) * 100;
                      const clampedPercentX = Math.max(6, Math.min(94, percentX));
                      const isNearTop = percentY < 12;

                      return (
                        <div
                          className="absolute pointer-events-none z-[15] inline-flex items-center gap-[5px] p-[3px_9px] rounded-[6px] bg-[rgba(15,23,42,0.95)] border-[1.2px] border-solid border-[#f59e0b] text-[11px] font-bold font-mono leading-[1.2] text-[#fbbf24] shadow-[0_4px_12px_rgba(0,0,0,0.5),0_0_10px_rgba(245,158,11,0.25)] whitespace-nowrap [&_strong]:text-[#fef08a] [&_strong]:font-extrabold shift-traffic-peak-badge"
                          style={{
                            left: `${clampedPercentX}%`,
                            top: `${percentY}%`,
                            transform: isNearTop
                              ? "translate(-50%, 12px)"
                              : "translate(-50%, calc(-100% - 10px))",
                          }}
                        >
                          <span className="w-[5px] h-[5px] rounded-[50%] bg-[#f59e0b] shadow-[0_0_6px_#f59e0b] shrink-0 shift-traffic-peak-dot" />
                          <span>
                            Lonjakan: <strong>{peak.count} Tiket</strong> ({peak.shiftName})
                          </span>
                        </div>
                      );
                    })(peakPointMeta)}

                    {/* Floating Interactive Hover Tooltip */}
                    {hoveredShiftTrafficPoint && (
                      <div
                        className="absolute pointer-events-none z-[99] -translate-x-1/2 -translate-y-full -mt-[12px] bg-[rgba(15,23,42,0.94)] backdrop-blur-[8px] border border-[rgba(56,189,248,0.35)] rounded-[8px] p-[8px_12px] shadow-[0_8px_24px_rgba(0,0,0,0.45),0_0_12px_rgba(56,189,248,0.15)] min-w-[160px] whitespace-nowrap shift-traffic-tooltip"
                        style={{
                          left: `${hoveredShiftTrafficPoint.percentX}%`,
                          top: `${hoveredShiftTrafficPoint.percentY}%`,
                        }}
                      >
                        <div className="text-[11px] font-bold text-[var(--ink-primary)] mb-[4px] border-b border-[rgba(255,255,255,0.08)] pb-[3px] flex items-center justify-between gap-[8px] shift-traffic-tooltip-header">
                          <span>📅 {hoveredShiftTrafficPoint.date}</span>
                          <span className="[color:#38bdf8]! [font-weight:700]!">
                            {hoveredShiftTrafficPoint.total} Tiket
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-[12px] text-[11px] mt-[3px] text-[var(--ink-secondary)] shift-traffic-tooltip-row">
                          <span className="[display:inline-flex]! [align-items:center]! [gap:6px]!">
                            <span className="w-[8px] h-[8px] rounded-[50%] inline-block bg-[#fbbf24] shadow-[0_0_6px_rgba(251,191,36,0.6)] shift-legend-dot dot-pagi" /> Shift Pagi:
                          </span>
                          <span className="font-bold font-mono shift-traffic-tooltip-val [color:#fbbf24]!">
                            {hoveredShiftTrafficPoint.pagi} Tiket
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-[12px] text-[11px] mt-[3px] text-[var(--ink-secondary)] shift-traffic-tooltip-row">
                          <span className="[display:inline-flex]! [align-items:center]! [gap:6px]!">
                            <span className="w-[8px] h-[8px] rounded-[50%] inline-block bg-[#c084fc] shadow-[0_0_6px_rgba(192,132,252,0.6)] shift-legend-dot dot-malam" /> Shift Malam:
                          </span>
                          <span className="font-bold font-mono shift-traffic-tooltip-val [color:#c084fc]!">
                            {hoveredShiftTrafficPoint.malam} Tiket
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-[12px] text-[11px] mt-[3px] text-[var(--ink-secondary)] shift-traffic-tooltip-row">
                          <span className="[display:inline-flex]! [align-items:center]! [gap:6px]!">
                            <span className="w-[8px] h-[8px] rounded-[50%] inline-block bg-[#38bdf8] shadow-[0_0_6px_rgba(56,189,248,0.6)] shift-legend-dot dot-subuh" /> Shift Subuh:
                          </span>
                          <span className="font-bold font-mono shift-traffic-tooltip-val [color:#38bdf8]!">
                            {hoveredShiftTrafficPoint.subuh} Tiket
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-[12px] text-[11px] border-t border-[rgba(255,255,255,0.08)] pt-[3px] mt-[4px] font-bold text-[var(--ink-primary)] shift-traffic-tooltip-row shift-traffic-tooltip-total">
                          <span>Total Harian:</span>
                          <span className="font-bold font-mono shift-traffic-tooltip-val">
                            {hoveredShiftTrafficPoint.total} Tiket
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Filter and Shift Legend Bar */}
            <div className="flex items-center justify-between flex-wrap gap-[8px] mt-[4px] pt-[10px] pr-[20px] border-t border-[rgba(148,163,184,0.1)] shift-traffic-filter-bar">
              <div className="flex items-center gap-[5px] flex-wrap shift-filter-buttons">
                <span className="text-[11px] font-semibold text-[var(--ink-muted)] mr-[4px]">
                  Tampilkan Garis:
                </span>
                <button
                  type="button"
                  className={`inline-flex items-center gap-[4px] p-[2px_8px] rounded-[5px] text-[10.5px] font-semibold cursor-pointer transition-all duration-150 ease-out select-none border shift-filter-btn ${activeShiftLineFilter === "all" ? "bg-[rgba(56,189,248,0.18)] text-white border-[#38bdf8] shadow-[0_0_8px_rgba(56,189,248,0.2)] active" : "bg-[rgba(148,163,184,0.06)] border-[rgba(148,163,184,0.15)] text-[var(--ink-secondary)] hover:bg-[rgba(56,189,248,0.1)] hover:text-[#38bdf8] hover:border-[rgba(56,189,248,0.3)]"}`}
                  onClick={() => setActiveShiftLineFilter("all")}
                >
                  <span>Semua Shift</span>
                </button>
                <button
                  type="button"
                  className={`inline-flex items-center gap-[4px] p-[2px_8px] rounded-[5px] text-[10.5px] font-semibold cursor-pointer transition-all duration-150 ease-out select-none border shift-filter-btn ${activeShiftLineFilter === "Pagi" ? "bg-[rgba(56,189,248,0.18)] text-white border-[#38bdf8] shadow-[0_0_8px_rgba(56,189,248,0.2)] active" : "bg-[rgba(148,163,184,0.06)] border-[rgba(148,163,184,0.15)] text-[var(--ink-secondary)] hover:bg-[rgba(56,189,248,0.1)] hover:text-[#38bdf8] hover:border-[rgba(56,189,248,0.3)]"}`}
                  onClick={() => setActiveShiftLineFilter("Pagi")}
                >
                  <span className="inline-block w-[8px] h-[8px] rounded-[50%] shrink-0 bg-[#fbbf24] shadow-[0_0_6px_rgba(251,191,36,0.6)] shift-legend-dot dot-pagi" />
                  <span>Shift Pagi</span>
                </button>
                <button
                  type="button"
                  className={`inline-flex items-center gap-[4px] p-[2px_8px] rounded-[5px] text-[10.5px] font-semibold cursor-pointer transition-all duration-150 ease-out select-none border shift-filter-btn ${activeShiftLineFilter === "Malam" ? "bg-[rgba(56,189,248,0.18)] text-white border-[#38bdf8] shadow-[0_0_8px_rgba(56,189,248,0.2)] active" : "bg-[rgba(148,163,184,0.06)] border-[rgba(148,163,184,0.15)] text-[var(--ink-secondary)] hover:bg-[rgba(56,189,248,0.1)] hover:text-[#38bdf8] hover:border-[rgba(56,189,248,0.3)]"}`}
                  onClick={() => setActiveShiftLineFilter("Malam")}
                >
                  <span className="inline-block w-[8px] h-[8px] rounded-[50%] shrink-0 bg-[#c084fc] shadow-[0_0_6px_rgba(192,132,252,0.6)] shift-legend-dot dot-malam" />
                  <span>Shift Malam</span>
                </button>
                <button
                  type="button"
                  className={`inline-flex items-center gap-[4px] p-[2px_8px] rounded-[5px] text-[10.5px] font-semibold cursor-pointer transition-all duration-150 ease-out select-none border shift-filter-btn ${activeShiftLineFilter === "Subuh" ? "bg-[rgba(56,189,248,0.18)] text-white border-[#38bdf8] shadow-[0_0_8px_rgba(56,189,248,0.2)] active" : "bg-[rgba(148,163,184,0.06)] border-[rgba(148,163,184,0.15)] text-[var(--ink-secondary)] hover:bg-[rgba(56,189,248,0.1)] hover:text-[#38bdf8] hover:border-[rgba(56,189,248,0.3)]"}`}
                  onClick={() => setActiveShiftLineFilter("Subuh")}
                >
                  <span className="inline-block w-[8px] h-[8px] rounded-[50%] shrink-0 bg-[#38bdf8] shadow-[0_0_6px_rgba(56,189,248,0.6)] shift-legend-dot dot-subuh" />
                  <span>Shift Subuh</span>
                </button>
              </div>
            </div>
          </div>
        </article>
      </div>



      {/* ── 8. User Ticket Detail Modal (Task 2: Fixed Viewport Portal Modal) ── */}
      {isMounted &&
        selectedUserDetail &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 w-screen h-screen bg-black/80 backdrop-blur-[6px] z-[999999] flex items-center justify-center p-[24px_16px] overflow-y-auto overscroll-contain animate-[modalFadeIn_0.15s_ease-out] user-modal-overlay" onClick={() => setSelectedUserDetail(null)}>
            <div className="relative w-full max-w-[660px] max-h-[86vh] bg-[#0f172a] border border-[rgba(56,189,248,0.35)] rounded-[14px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.05)] flex flex-col overflow-hidden m-auto animate-[modalScaleUp_0.15s_ease-out] user-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-[16px_20px] border-b border-[rgba(148,163,184,0.12)] bg-[rgba(148,163,184,0.04)] shrink-0 user-modal-header">
                <div className="flex items-center gap-[12px] user-modal-profile">
                  <div
                    className="drawer-avatar-ring-wrapper"
                    style={getStatusRingStyle(
                      undefined,
                      selectedUserDetail.name.toLowerCase().includes("galih"),
                      userStatus
                    ) as React.CSSProperties}
                  >
                    <Avatar size="lg" initials={selectedUserDetail.initials} name={selectedUserDetail.name} className="w-[42px] h-[42px] rounded-full flex items-center justify-center text-[15px] font-extrabold text-white user-avatar-lg" />
                    <span
                      className="drawer-avatar-status-badge"
                      style={{
                        backgroundColor: (getStatusRingStyle(
                          undefined,
                          selectedUserDetail.name.toLowerCase().includes("galih"),
                          userStatus
                        ) as any)["--status-ring-color"]
                      }}
                    />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-extrabold text-[var(--ink-primary)] m-0 user-modal-title">{selectedUserDetail.name}</h3>
                    <p className="text-[11.5px] text-[var(--ink-muted)] m-[2px_0_0] user-modal-sub">{selectedUserDetail.role}</p>
                  </div>
                </div>
                <ModalCloseButton
                  onClose={() => setSelectedUserDetail(null)}
                  label="Tutup Detail (Esc)"
                />
              </div>

              <div className="p-[16px_20px] flex flex-col gap-[14px] overflow-y-auto flex-1 user-modal-body">
                {/* 3 Period Summaries */}
                <div className="grid grid-cols-3 max-[600px]:grid-cols-1 gap-[10px] user-modal-periods-grid">
                  {/* Hari Ini */}
                  <div className="p-[12px_10px] rounded-[10px] bg-[rgba(148,163,184,0.05)] border border-[rgba(148,163,184,0.12)] flex flex-col gap-[8px] user-period-card">
                    <div className="flex items-center justify-between pb-[6px] border-b border-[rgba(148,163,184,0.08)] period-card-header">
                      <span className="text-[8.5px] font-bold font-mono p-[2px_6px] rounded-[4px] bg-[rgba(56,189,248,0.15)] text-[#38bdf8] period-badge today">HARI INI</span>
                      <strong className="text-[13px] font-extrabold font-mono text-[var(--ink-primary)] period-total">{selectedUserDetail.todayCount} Tiket</strong>
                    </div>
                    <div className="flex flex-col gap-[4px] period-breakdown-list">
                      {Object.keys(selectedUserDetail.todayBreakdown).length > 0 ? (
                        Object.entries(selectedUserDetail.todayBreakdown).map(([proj, count]) => {
                          const pColor = PROJECT_COLORS[proj] || "#94a3b8";
                          const pct = Math.round((count / Math.max(1, selectedUserDetail.todayCount)) * 100);
                          return (
                            <div className="flex items-center justify-between text-[10px] py-[2px] period-breakdown-row" key={proj}>
                              <div className="flex items-center gap-[4px] text-[var(--ink-secondary)] period-proj-tag">
                                <i className="legend-dot" style={{ background: pColor }} />
                                <span>{proj}</span>
                              </div>
                              <span className="font-mono font-semibold text-[var(--ink-muted)] period-count-pct">{count} ({pct}%)</span>
                            </div>
                          );
                        })
                      ) : (
                        <span className="period-empty-text">Tidak ada tiket aktif hari ini</span>
                      )}
                    </div>
                  </div>

                  {/* Bulan Ini */}
                  <div className="p-[12px_10px] rounded-[10px] bg-[rgba(148,163,184,0.05)] border border-[rgba(148,163,184,0.12)] flex flex-col gap-[8px] user-period-card">
                    <div className="flex items-center justify-between pb-[6px] border-b border-[rgba(148,163,184,0.08)] period-card-header">
                      <span className="text-[8.5px] font-bold font-mono p-[2px_6px] rounded-[4px] bg-[rgba(16,185,129,0.15)] text-[#34d399] period-badge month">BULAN INI</span>
                      <strong className="text-[13px] font-extrabold font-mono text-[var(--ink-primary)] period-total">{selectedUserDetail.monthCount} Tiket</strong>
                    </div>
                    <div className="flex flex-col gap-[4px] period-breakdown-list">
                      {Object.entries(selectedUserDetail.monthBreakdown).map(([proj, count]) => {
                        const pColor = PROJECT_COLORS[proj] || "#94a3b8";
                        const pct = Math.round((count / Math.max(1, selectedUserDetail.monthCount)) * 100);
                        return (
                          <div className="flex items-center justify-between text-[10px] py-[2px] period-breakdown-row" key={proj}>
                            <div className="flex items-center gap-[4px] text-[var(--ink-secondary)] period-proj-tag">
                              <i className="legend-dot" style={{ background: pColor }} />
                              <span>{proj}</span>
                            </div>
                            <span className="font-mono font-semibold text-[var(--ink-muted)] period-count-pct">{count} ({pct}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tahun Ini */}
                  <div className="p-[12px_10px] rounded-[10px] bg-[rgba(148,163,184,0.05)] border border-[rgba(148,163,184,0.12)] flex flex-col gap-[8px] user-period-card">
                    <div className="flex items-center justify-between pb-[6px] border-b border-[rgba(148,163,184,0.08)] period-card-header">
                      <span className="text-[8.5px] font-bold font-mono p-[2px_6px] rounded-[4px] bg-[rgba(129,140,248,0.15)] text-[#818cf8] period-badge year">TAHUN INI</span>
                      <strong className="text-[13px] font-extrabold font-mono text-[var(--ink-primary)] period-total">{selectedUserDetail.yearCount} Tiket</strong>
                    </div>
                    <div className="flex flex-col gap-[4px] period-breakdown-list">
                      {Object.entries(selectedUserDetail.yearBreakdown).map(([proj, count]) => {
                        const pColor = PROJECT_COLORS[proj] || "#94a3b8";
                        const pct = Math.round((count / Math.max(1, selectedUserDetail.yearCount)) * 100);
                        return (
                          <div className="flex items-center justify-between text-[10px] py-[2px] period-breakdown-row" key={proj}>
                            <div className="flex items-center gap-[4px] text-[var(--ink-secondary)] period-proj-tag">
                              <i className="legend-dot" style={{ background: pColor }} />
                              <span>{proj}</span>
                            </div>
                            <span className="font-mono font-semibold text-[var(--ink-muted)] period-count-pct">{count} ({pct}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Recent Activity / Assigned Tickets */}
                <div className="flex flex-col gap-[8px] user-modal-tickets-section">
                  <div className="text-[11.5px] font-bold text-[var(--ink-primary)] user-tickets-title">Tiket Terkait dalam Antrean ({selectedUserDetail.recentTickets.length})</div>
                  {selectedUserDetail.recentTickets.length > 0 ? (
                    <div className="flex flex-col gap-[4px] max-h-[160px] overflow-y-auto pr-[4px] user-modal-tickets-list">
                      {selectedUserDetail.recentTickets.map((t) => {
                        const pColor = PROJECT_COLORS[t.project] || "#94a3b8";
                        const sLower = t.severity.toLowerCase();
                        const pClass =
                          sLower === "critical" || sLower === "kritis"
                            ? "priority-pill-crit"
                            : sLower === "high" || sLower === "tinggi"
                            ? "priority-pill-high"
                            : sLower === "low" || sLower === "rendah"
                            ? "priority-pill-low"
                            : "priority-pill-med";

                        return (
                          <div className="grid grid-cols-[75px_75px_1fr_60px_70px] items-center gap-[8px] p-[6px_10px] rounded-[6px] bg-[rgba(148,163,184,0.04)] text-[10.5px] user-modal-ticket-row" key={t.id}>
                            <span className="font-mono font-bold text-[var(--ink-primary)] user-modal-ticket-id">#{t.id}</span>
                            <span className="font-semibold user-modal-ticket-proj" style={{ color: pColor }}>● {t.project}</span>
                            <span className="text-[var(--ink-secondary)] whitespace-nowrap overflow-hidden text-ellipsis user-modal-ticket-sub" title={t.subject}>{t.subject}</span>
                            <span className={`priority-pill ${pClass}`}>{t.severity}</span>
                            <span className="text-[9.5px] text-[#38bdf8] font-semibold user-modal-ticket-st">{t.status}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="user-tickets-empty">Tidak ada tiket detail khusus pada filter saat ini.</div>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
