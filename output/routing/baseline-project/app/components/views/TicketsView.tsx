"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Ticket as TicketIcon,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Search,
  X,
  Layers,
  SlidersHorizontal,
  Tag,
  BarChart2,
  FolderOpen,
  Clock,
  ArrowUpDown,
  ShieldAlert,
} from "lucide-react";
import { TicketTable } from "@/app/components/tickets/TicketTable";
import { StatCard } from "@/app/components/ui/StatCard";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { DatePicker } from "@/app/components/ui/DatePicker";
import type { Ticket } from "@/app/lib/types";
import { getTodayWIB } from "@/app/lib/data";
import { useClient } from "@/app/context/ClientContext";
import { getTicketShift } from "@/app/components/views/OverviewView";

interface TicketsViewProps {
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
  onNewTicket: () => void;
}

type MainViewTab = "queue" | "escalations";

const STATUS_OPTIONS = ["All", "Active", "Closed", "Pending", "Escalated"] as const;

const TICKET_TYPES = [
  "All Types",
  "Incident",
  "Ad-hoc Request",
  "Change Request",
  "Maintenance",
  "Monitoring Alert",
  "Escalation",
  "Other",
] as const;

const PRIORITY_OPTIONS = ["All Severities", "Critical", "High", "Medium", "Low"] as const;

const SHIFT_OPTIONS = ["Semua Shift", "Shift Subuh", "Shift Pagi", "Shift Malam"] as const;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "priority", label: "Highest Severity" },
  { value: "aging", label: "Longest Aging" },
] as const;

const priorityRank = (severity: string) => {
  const s = severity.toLowerCase();
  if (s === "critical" || s === "kritis") return 0;
  if (s === "high" || s === "tinggi") return 1;
  if (s === "medium" || s === "sedang") return 2;
  return 3;
};

const normalizeStatus = (status: string) => {
  const s = status.toLowerCase();
  if (s === "aktivitas" || s === "activity" || s === "active" || s === "open") return "active";
  if (s === "ditutup" || s === "closed") return "closed";
  if (s === "menunggu" || s === "pending") return "pending";
  if (s === "escalated" || s === "eskalasi" || s === "re-open") return "escalated";
  return s;
};

const normalizePriority = (p: string) => {
  const s = p.toLowerCase();
  if (s === "critical" || s === "kritis") return 0;
  if (s === "high" || s === "tinggi") return 1;
  if (s === "medium" || s === "sedang") return 2;
  if (s === "low" || s === "rendah") return 3;
  return s;
};

export function TicketsView({ tickets, onSelectTicket, onNewTicket }: TicketsViewProps) {
  const { activeClient } = useClient();
  // Main view tab (queue, escalations, report)
  const [activeTab, setActiveTab] = useState<MainViewTab>("queue");

  // Search & Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("All Types");
  const [priorityFilter, setPriorityFilter] = useState<string>("All Severities");
  const [projectFilter, setProjectFilter] = useState<string>("All Projects");
  const [shiftFilter, setShiftFilter] = useState<string>("Semua Shift");
  const [sort, setSort] = useState<string>("newest");

  // Pagination state (default: 10 rows per page)
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Mobile filter panel open/closed
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Dynamic project options
  const projectOptions = useMemo(
    () => ["All Projects", ...Array.from(new Set(tickets.map((ticket) => ticket.project))).filter((p) => p && p !== "L2")],
    [tickets],
  );

  const handleTabChange = (tab: MainViewTab) => {
    setActiveTab(tab);
  };

  // Reset pagination to page 1 whenever any filter, search, sort, or tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, dateFilter, typeFilter, priorityFilter, projectFilter, shiftFilter, sort, activeTab]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    const needle = search.trim().toLowerCase();

    const result = tickets.filter((ticket) => {
      // 1. Tab-level constraint
      if (activeTab === "escalations") {
        const isEscalated =
          normalizeStatus(ticket.status) === "escalated" ||
          ticket.type === "Escalation" ||
          ticket.category === "Escalation Handling";
        if (!isEscalated) return false;
      }

      // 2. Status filter
      if (statusFilter !== "All" && statusFilter !== "Semua") {
        if (normalizeStatus(ticket.status) !== normalizeStatus(statusFilter)) return false;
      }

      // 3. Date Filter (Single date or Range)
      if (dateFilter) {
        const todayStr = getTodayWIB();
        const ticketDate = ticket.date || todayStr;
        if (dateFilter.includes("..")) {
          const [start, end] = dateFilter.split("..");
          if (start && ticketDate < start) return false;
          if (end && ticketDate > end) return false;
        } else if (dateFilter === todayStr || dateFilter === "today") {
          // In queue view, show active tickets or tickets created today
          const isToday = ticketDate === todayStr || normalizeStatus(ticket.status) === "active" || normalizeStatus(ticket.status) === "escalated" || normalizeStatus(ticket.status) === "pending";
          if (!isToday) return false;
        } else {
          if (ticketDate !== dateFilter) return false;
        }
      }

      // 4. Ticket Type / Category
      if (typeFilter !== "All Types") {
        const tType = ticket.type || ticket.category || "Incident";
        if (tType !== typeFilter) return false;
      }

      // 5. Severity
      if (
        priorityFilter !== "All Severities" &&
        priorityFilter !== "All Priorities" &&
        priorityFilter !== "Semua"
      ) {
        if (normalizePriority(ticket.severity) !== normalizePriority(priorityFilter)) return false;
      }

      // 6. Project
      if (projectFilter !== "All Projects" && projectFilter !== "Semua" && ticket.project !== projectFilter) {
        return false;
      }

      // 7. Shift Filter
      if (shiftFilter !== "Semua Shift" && shiftFilter !== "All Shifts") {
        const ticketShift = getTicketShift(ticket);
        const targetShift = shiftFilter.replace(/^Shift\s+/, "");
        if (ticketShift !== targetShift) return false;
      }

      // 8. Search keyword
      if (!needle) return true;
      return Object.values(ticket).some(
        (value) => typeof value === "string" && value.toLowerCase().includes(needle),
      );
    });

    // Sorting
    return result.sort((a, b) => {
      if (sort === "priority") return priorityRank(a.severity) - priorityRank(b.severity);
      if (sort === "aging") return (b.agingHours || 0) - (a.agingHours || 0);
      if (sort === "oldest") return (a.date || "") + a.created > (b.date || "") + b.created ? 1 : -1;
      return (b.date || "") + b.created > (a.date || "") + a.created ? 1 : -1;
    });
  }, [
    tickets,
    activeTab,
    search,
    statusFilter,
    dateFilter,
    typeFilter,
    priorityFilter,
    projectFilter,
    shiftFilter,
    sort,
  ]);



  // Pagination calculations (applied to filtered result set)
  const totalFilteredCount = filteredTickets.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIdx = (safeCurrentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalFilteredCount);
  const paginatedTickets = filteredTickets.slice(startIdx, endIdx);

  const pageNumbers = useMemo(() => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) pages.push("...");
      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(totalPages - 1, safeCurrentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safeCurrentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, safeCurrentPage]);

  // Overall metric counts (unfiltered context for stat cards)
  const totalCount = tickets.length;
  const activeCount = tickets.filter((t) => normalizeStatus(t.status) === "active").length;
  const closedCount = tickets.filter((t) => normalizeStatus(t.status) === "closed").length;
  const pendingCount = tickets.filter((t) => normalizeStatus(t.status) === "pending").length;
  const highPriorityCount = tickets.filter((t) => {
    const s = t.severity.toLowerCase();
    return s === "critical" || s === "kritis" || s === "high" || s === "tinggi";
  }).length;
  const escalatedCount = tickets.filter(
    (t) =>
      normalizeStatus(t.status) === "escalated" ||
      t.type === "Escalation" ||
      t.category === "Escalation Handling",
  ).length;

  const activePct = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;
  const closedPct = totalCount > 0 ? Math.round((closedCount / totalCount) * 100) : 0;

  // Active filters count for reset and chip list
  const hasActiveFilters =
    search.trim() !== "" ||
    statusFilter !== "All" ||
    dateFilter !== "" ||
    typeFilter !== "All Types" ||
    (priorityFilter !== "All Severities" && priorityFilter !== "All Priorities") ||
    projectFilter !== "All Projects" ||
    shiftFilter !== "Semua Shift";

  const clearAllFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setDateFilter("");
    setTypeFilter("All Types");
    setPriorityFilter("All Severities");
    setProjectFilter("All Projects");
    setShiftFilter("Semua Shift");
    setCurrentPage(1);
  };

  const selectedRangeLabel = useMemo(() => {
    if (!dateFilter) return "Semua Waktu";
    if (dateFilter === getTodayWIB() || dateFilter === "today") return "Hari Ini";
    if (dateFilter.includes("..")) {
      const [start, end] = dateFilter.split("..");
      if (start && end) return `${start} – ${end}`;
    }
    return dateFilter;
  }, [dateFilter]);

  // Shared Pagination Bar component
  const renderPagination = () => {
    if (totalFilteredCount === 0) return null;

    return (
      <div className="flex items-center justify-between flex-wrap gap-4 px-[18px] py-3 border-t border-[#334155] rounded-b-[8px] bg-[#1e293b] max-[640px]:flex-col max-[640px]:items-start max-[640px]:gap-3">
        <div className="flex items-center flex-wrap gap-4 max-[640px]:flex-col max-[640px]:items-start max-[640px]:gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11.5px] text-[#94a3b8] font-medium whitespace-nowrap">Rows per page:</span>
            <select
              className="h-[30px] pl-[9px] pr-[24px] text-[11.5px] font-medium border border-[#334155] rounded-[6px] bg-[#0f172a] text-[#f8fafc] cursor-pointer outline-hidden [color-scheme:dark] transition-all duration-150 hover:border-[#94a3b8]/35 focus:border-[#38bdf8] focus:shadow-[0_0_0_3px_rgba(56,189,248,0.12)]"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              aria-label="Jumlah tiket per halaman"
            >
              <option value="10" className="bg-[#0f172a] text-[#f8fafc]">10</option>
              <option value="30" className="bg-[#0f172a] text-[#f8fafc]">30</option>
              <option value="50" className="bg-[#0f172a] text-[#f8fafc]">50</option>
              <option value="100" className="bg-[#0f172a] text-[#f8fafc]">100</option>
            </select>
          </div>

          <span className="text-[11.5px] text-[#94a3b8] font-sans whitespace-nowrap">
            Menampilkan <strong className="text-[#f8fafc] font-mono font-semibold">{totalFilteredCount === 0 ? 0 : startIdx + 1}–{endIdx}</strong> dari{" "}
            <strong className="text-[#f8fafc] font-mono font-semibold">{totalFilteredCount}</strong> tiket
          </span>
        </div>

        <div className="flex items-center gap-[5px]">
          <button
            type="button"
            className={`inline-flex items-center justify-center px-2.5 py-1 rounded-[6px] text-[11px] font-semibold font-mono border select-none transition-all duration-150 ${
              safeCurrentPage <= 1
                ? "border-[rgba(148,163,184,0.08)] bg-[rgba(148,163,184,0.03)] text-[#94a3b8] opacity-35 cursor-not-allowed"
                : "border-[rgba(148,163,184,0.15)] bg-[rgba(148,163,184,0.06)] text-[#cbd5e1] hover:bg-[rgba(56,189,248,0.12)] hover:border-[rgba(56,189,248,0.35)] hover:text-[#38bdf8] cursor-pointer"
            }`}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safeCurrentPage <= 1}
            aria-label="Halaman sebelumnya"
          >
            Prev
          </button>

          <div className="flex items-center gap-[3px]">
            {pageNumbers.map((p, idx) =>
              p === "..." ? (
                <span key={`ellipsis-${idx}`} className="px-1 text-[#94a3b8] text-[12px]">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  className={`inline-flex items-center justify-center min-w-[26px] h-[26px] p-0 rounded-[6px] text-[11px] font-mono border select-none transition-all duration-150 ${
                    p === safeCurrentPage
                      ? "border-[rgba(56,189,248,0.5)] bg-[rgba(56,189,248,0.18)] text-[#38bdf8] font-bold cursor-pointer"
                      : "border-[rgba(148,163,184,0.15)] bg-[rgba(148,163,184,0.06)] text-[#cbd5e1] font-semibold hover:bg-[rgba(56,189,248,0.12)] hover:border-[rgba(56,189,248,0.35)] hover:text-[#38bdf8] cursor-pointer"
                  }`}
                  onClick={() => setCurrentPage(Number(p))}
                  aria-label={`Halaman ${p}`}
                  aria-current={p === safeCurrentPage ? "page" : undefined}
                >
                  {p}
                </button>
              ),
            )}
          </div>

          <button
            type="button"
            className={`inline-flex items-center justify-center px-2.5 py-1 rounded-[6px] text-[11px] font-semibold font-mono border select-none transition-all duration-150 ${
              safeCurrentPage >= totalPages || totalPages <= 1
                ? "border-[rgba(148,163,184,0.08)] bg-[rgba(148,163,184,0.03)] text-[#94a3b8] opacity-35 cursor-not-allowed"
                : "border-[rgba(148,163,184,0.15)] bg-[rgba(148,163,184,0.06)] text-[#cbd5e1] hover:bg-[rgba(56,189,248,0.12)] hover:border-[rgba(56,189,248,0.35)] hover:text-[#38bdf8] cursor-pointer"
            }`}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safeCurrentPage >= totalPages || totalPages <= 1}
            aria-label="Halaman berikutnya"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* ── Page Header ── */}
      <section className="flex justify-between items-end mb-[22px] max-[768px]:flex-col max-[768px]:items-start max-[768px]:gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono font-bold tracking-[1px] text-[#94a3b8] uppercase">
            <span className="w-[7px] h-[7px] rounded-full bg-[#4ade80] animate-pulse shrink-0" /> TICKETS · {activeClient.code}
          </div>
          <h1 className="text-[24px] font-bold text-[#f8fafc] leading-[1.2] tracking-[-0.4px] mt-[6px] mb-[4px]">Tickets</h1>
        </div>
        <div className="flex gap-[9px]">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-[7px] h-[36px] px-[15px] rounded-[7px] text-[12px] font-semibold text-white bg-[#38bdf8] shadow-[0_1px_2px_0_rgba(0,0,0,0.2)] cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all"
            onClick={onNewTicket}
          >
            <span>＋</span> New Ticket
          </button>
        </div>
      </section>

      {/* ── 1. Top Summary Stat Cards ── */}
      <section className="grid grid-cols-4 max-[1140px]:grid-cols-2 max-[640px]:grid-cols-2 gap-[14px] mb-[20px]" aria-label="Ringkasan statistik tiket">
        {/* Total Ticket */}
        <StatCard
          label="TOTAL TICKETS"
          value={totalCount}
          accentColor="blue"
          icon={<TicketIcon size={15} strokeWidth={2} />}
          subtitle={`${activeCount} Active · ${pendingCount} Pending · ${closedCount} Closed`}
          badgeText="Semua Tiket"
          badgeTone="blue"
        />

        {/* Active Queue */}
        <StatCard
          label="ACTIVE ON QUEUE"
          value={activeCount}
          accentColor="green"
          icon={<Activity size={15} strokeWidth={2} />}
          subtitle={`${activePct}% dari total antrean`}
          progress={{ value: activePct, color: "#4ade80" }}
          badgeText={activeCount > 0 ? `${activeCount} In Progress` : "Queue Clear"}
          badgeTone="green"
        />

        {/* Closed Tickets */}
        <StatCard
          label="RESOLVED / CLOSED"
          value={closedCount}
          accentColor="blue"
          icon={<CheckCircle2 size={15} strokeWidth={2} />}
          subtitle={`${closedPct}% Resolution rate`}
          progress={{ value: closedPct, color: "#38bdf8" }}
          badgeText={`${closedPct}% Resolution`}
          badgeTone="blue"
        />

        {/* High Severity & Critical */}
        <StatCard
          label="HIGH SEVERITY / ESCALATED"
          value={highPriorityCount + escalatedCount}
          accentColor={highPriorityCount + escalatedCount > 0 ? "rose" : "gray"}
          icon={<AlertTriangle size={15} strokeWidth={2} />}
          subtitle={`${highPriorityCount} Critical/High · ${escalatedCount} Escalated`}
          badgeText={
            highPriorityCount + escalatedCount > 0 ? "Needs Attention" : "All Nominal"
          }
          badgeTone={highPriorityCount + escalatedCount > 0 ? "rose" : "gray"}
        />
      </section>

      {/* ── 2. Sub-Navigation Switcher (Daftar Tiket / Escalations / Ticket Report) ── */}
      <div className="flex gap-2 mb-4 border-b border-[#334155] pb-2.5" role="tablist" aria-label="Navigasi view tiket">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "queue"}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-[8px] border text-[12.5px] cursor-pointer select-none transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f172a] ${
            activeTab === "queue"
              ? "border-[#334155] bg-[#1e293b] text-[#38bdf8] font-bold shadow-[0_1px_2px_0_rgba(0,0,0,0.2)]"
              : "border-transparent bg-transparent text-[#cbd5e1] hover:bg-[#243044] hover:text-[#f8fafc] font-semibold"
          }`}
          onClick={() => handleTabChange("queue")}
        >
          <Layers size={14} />
          <span>Daftar Tiket</span>
          <span className="inline-flex items-center px-1.5 py-[1px] rounded-full text-[10px] font-mono font-bold bg-[rgba(148,163,184,0.15)] text-[#94a3b8]">
            {tickets.length}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "escalations"}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-[8px] border text-[12.5px] cursor-pointer select-none transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f172a] ${
            activeTab === "escalations"
              ? "border-[#334155] bg-[#1e293b] text-[#38bdf8] font-bold shadow-[0_1px_2px_0_rgba(0,0,0,0.2)]"
              : "border-transparent bg-transparent text-[#cbd5e1] hover:bg-[#243044] hover:text-[#f8fafc] font-semibold"
          }`}
          onClick={() => handleTabChange("escalations")}
        >
          <ShieldAlert size={14} />
          <span>Escalations</span>
          <span
            className={`inline-flex items-center px-1.5 py-[1px] rounded-full text-[10px] font-mono font-bold ${
              escalatedCount > 0
                ? "bg-[rgba(248,113,113,0.15)] text-[#f87171] border border-[rgba(248,113,113,0.3)]"
                : "bg-[rgba(148,163,184,0.08)] text-[#94a3b8] opacity-75"
            }`}
          >
            {escalatedCount}
          </span>
        </button>
      </div>

      {/* ── 3. Main Content Panel ── */}
      <article className="bg-[#1e293b] border border-[#334155] rounded-[10px] shadow-[0_4px_12px_0_rgba(0,0,0,0.25)] overflow-hidden mb-5">
        {/* Multi-Dimensional Filter Toolbar */}
        <div className="flex flex-wrap gap-2 items-center px-5 py-3.5 border-b border-[#334155] max-[900px]:flex-col max-[900px]:items-stretch">
          {/* Search Field */}
          <div className="relative flex items-center flex-[1_1_200px] min-w-[160px] h-[34px] px-2.5 border border-[#334155] rounded-[8px] bg-[#0f172a] gap-2 transition-[border-color,box-shadow] duration-150 focus-within:border-[#38bdf8] focus-within:shadow-[0_0_0_3px_rgba(56,189,248,0.12)] max-[900px]:w-full max-[900px]:flex-none group/search">
            <Search size={14} className="text-[#94a3b8] group-focus-within/search:text-[#38bdf8] shrink-0 transition-colors duration-150" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari ID, subjek, proyek, atau PIC…"
              aria-label="Cari tiket"
              className="flex-1 min-w-0 h-full border-0 outline-hidden bg-transparent text-[#f8fafc] text-[12px] placeholder:text-[#94a3b8]"
            />
            {search && (
              <button
                type="button"
                className="inline-flex items-center justify-center w-[18px] h-[18px] min-w-[18px] rounded-full border-0 bg-transparent text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[rgba(148,163,184,0.15)] cursor-pointer p-0 transition-colors duration-150"
                onClick={() => setSearch("")}
                aria-label="Bersihkan pencarian"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Mobile Filters Toggle */}
          <button
            type="button"
            className="hidden max-[900px]:inline-flex items-center gap-1.5 h-[34px] px-3 border border-[#334155] rounded-[8px] bg-[#0f172a] text-[#cbd5e1] text-[12px] font-semibold cursor-pointer hover:border-[#38bdf8] hover:text-[#38bdf8] transition-all duration-150"
            onClick={() => setMobileFiltersOpen((v) => !v)}
            aria-expanded={mobileFiltersOpen}
            aria-label="Toggle filter panel"
          >
            <SlidersHorizontal size={13} />
            Filters
            {hasActiveFilters && (
              <span className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-[#38bdf8] text-white text-[9.5px] font-mono font-bold leading-none">
                {[
                  dateFilter !== "",
                  typeFilter !== "All Types",
                  priorityFilter !== "All Severities" && priorityFilter !== "All Priorities",
                  projectFilter !== "All Projects",
                  shiftFilter !== "Semua Shift",
                ].filter(Boolean).length}
              </span>
            )}
          </button>

          {/* Filter Controls (hidden on mobile unless open) */}
          <div className={`flex items-center gap-2 flex-wrap max-[900px]:w-full max-[900px]:flex-col max-[900px]:gap-2 max-[900px]:pt-2 max-[900px]:border-t max-[900px]:border-[#334155] ${mobileFiltersOpen ? "max-[900px]:flex" : "max-[900px]:hidden"}`}>
            {/* Date Range Picker: "Semua Waktu" is present on Queue & Escalations, but excluded only in Ticket Report & Analytics */}
            <div className="flex items-center min-w-[140px] h-[34px] [&_.custom-datepicker-trigger]:!h-[34px] [&_.custom-datepicker-trigger]:!bg-[#0f172a] [&_.custom-datepicker-trigger]:!border-[#334155] [&_.custom-datepicker-trigger]:!text-[11.5px] [&_.custom-datepicker-trigger]:!rounded-[8px]">
              <DatePicker
                value={dateFilter}
                onChange={setDateFilter}
                placeholder="Semua Waktu"
                showAllTimePreset
                aria-label="Filter rentang tanggal tiket"
              />
            </div>

            {/* Ticket Type / Category Filter */}
            <div className="relative flex items-center group/select">
              <Tag size={13} className="pointer-events-none absolute left-[9px] text-[#94a3b8] transition-colors duration-150 z-1 group-has-[select[data-active=true]]/select:text-[#38bdf8]" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                aria-label="Filter kategori tiket"
                data-active={typeFilter !== "All Types" ? "true" : undefined}
                className="h-[34px] pl-7 pr-7 border border-[#334155] rounded-[8px] bg-[#0f172a] text-[#f8fafc] text-[11.5px] cursor-pointer appearance-none outline-hidden hover:border-[rgba(56,189,248,0.3)] focus:border-[#38bdf8] focus:shadow-[0_0_0_3px_rgba(56,189,248,0.12)] data-[active=true]:border-[#38bdf8] data-[active=true]:bg-[rgba(56,189,248,0.06)] data-[active=true]:text-[#38bdf8] data-[active=true]:font-semibold transition-[border-color,box-shadow,color,background-color] duration-150"
              >
                {TICKET_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Severity Filter */}
            <div className="relative flex items-center group/select">
              <BarChart2 size={13} className="pointer-events-none absolute left-[9px] text-[#94a3b8] transition-colors duration-150 z-1 group-has-[select[data-active=true]]/select:text-[#38bdf8]" />
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                aria-label="Filter severity"
                data-active={
                  priorityFilter !== "All Severities" && priorityFilter !== "All Priorities"
                    ? "true"
                    : undefined
                }
                className="h-[34px] pl-7 pr-7 border border-[#334155] rounded-[8px] bg-[#0f172a] text-[#f8fafc] text-[11.5px] cursor-pointer appearance-none outline-hidden hover:border-[rgba(56,189,248,0.3)] focus:border-[#38bdf8] focus:shadow-[0_0_0_3px_rgba(56,189,248,0.12)] data-[active=true]:border-[#38bdf8] data-[active=true]:bg-[rgba(56,189,248,0.06)] data-[active=true]:text-[#38bdf8] data-[active=true]:font-semibold transition-[border-color,box-shadow,color,background-color] duration-150"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Project Filter */}
            <div className="relative flex items-center group/select">
              <FolderOpen size={13} className="pointer-events-none absolute left-[9px] text-[#94a3b8] transition-colors duration-150 z-1 group-has-[select[data-active=true]]/select:text-[#38bdf8]" />
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                aria-label="Filter proyek"
                data-active={projectFilter !== "All Projects" ? "true" : undefined}
                className="h-[34px] pl-7 pr-7 border border-[#334155] rounded-[8px] bg-[#0f172a] text-[#f8fafc] text-[11.5px] cursor-pointer appearance-none outline-hidden hover:border-[rgba(56,189,248,0.3)] focus:border-[#38bdf8] focus:shadow-[0_0_0_3px_rgba(56,189,248,0.12)] data-[active=true]:border-[#38bdf8] data-[active=true]:bg-[rgba(56,189,248,0.06)] data-[active=true]:text-[#38bdf8] data-[active=true]:font-semibold transition-[border-color,box-shadow,color,background-color] duration-150"
              >
                {projectOptions.map((proj) => (
                  <option key={proj} value={proj}>
                    {proj}
                  </option>
                ))}
              </select>
            </div>

            {/* Shift Filter */}
            <div className="relative flex items-center group/select">
              <Clock size={13} className="pointer-events-none absolute left-[9px] text-[#94a3b8] transition-colors duration-150 z-1 group-has-[select[data-active=true]]/select:text-[#38bdf8]" />
              <select
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value)}
                aria-label="Filter shift tiket"
                data-active={shiftFilter !== "Semua Shift" ? "true" : undefined}
                className="h-[34px] pl-7 pr-7 border border-[#334155] rounded-[8px] bg-[#0f172a] text-[#f8fafc] text-[11.5px] cursor-pointer appearance-none outline-hidden hover:border-[rgba(56,189,248,0.3)] focus:border-[#38bdf8] focus:shadow-[0_0_0_3px_rgba(56,189,248,0.12)] data-[active=true]:border-[#38bdf8] data-[active=true]:bg-[rgba(56,189,248,0.06)] data-[active=true]:text-[#38bdf8] data-[active=true]:font-semibold transition-[border-color,box-shadow,color,background-color] duration-150"
              >
                {SHIFT_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Divider + Sort Control */}
            <div className="w-[1px] h-[22px] bg-[#334155] mx-1 max-[900px]:hidden" aria-hidden="true" />

            {/* Sort Order */}
            <div className="relative flex items-center group/select">
              <ArrowUpDown size={13} className="pointer-events-none absolute left-[9px] text-[#94a3b8] transition-colors duration-150 z-1" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                aria-label="Urutkan tiket"
                className="h-[34px] pl-7 pr-7 border border-[#334155] rounded-[8px] bg-[#0f172a] text-[#f8fafc] text-[11.5px] cursor-pointer appearance-none outline-hidden hover:border-[rgba(56,189,248,0.3)] focus:border-[#38bdf8] focus:shadow-[0_0_0_3px_rgba(56,189,248,0.12)] transition-[border-color,box-shadow] duration-150"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Status Tabs Bar */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-[#334155] gap-3">
          <div className="flex gap-[3px] p-[3px] rounded-[6px] bg-[#0f172a] border border-[#334155] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Filter status tiket" role="tablist">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={statusFilter === option}
                className={`flex items-center px-2.5 py-1 rounded-[4px] border border-transparent text-[10.5px] cursor-pointer select-none transition-all ${
                  statusFilter === option
                    ? "bg-[#1e293b] text-[#38bdf8] font-bold shadow-[0_1px_2px_0_rgba(0,0,0,0.2)]"
                    : "bg-transparent text-[#94a3b8] hover:text-[#f8fafc] font-semibold"
                }`}
                onClick={() => setStatusFilter(option)}
              >
                {option}
              </button>
            ))}
          </div>
          <div className="text-[11px] text-[#94a3b8] [&>strong]:text-[#f8fafc] [&>strong]:font-semibold" aria-live="polite">
            {totalFilteredCount > 0 ? (
              <>
                Menampilkan <strong>{startIdx + 1}–{endIdx}</strong> dari{" "}
                <strong>{totalFilteredCount}</strong> tiket
              </>
            ) : (
              <>
                Menampilkan <strong>0</strong> dari <strong>0</strong> tiket
              </>
            )}
          </div>
        </div>

        {/* ── Active Filter Chips Row — only renders when filters are active ── */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-1.5 items-center px-5 py-2 bg-[rgba(56,189,248,0.02)] border-b border-[#334155]" aria-label="Active filters">
            <span className="text-[10.5px] font-bold text-[#94a3b8] uppercase tracking-[0.5px] whitespace-nowrap shrink-0">Filters:</span>
            {search && (
              <span className="inline-flex items-center gap-[5px] pl-[9px] pr-[7px] py-[3px] rounded-[6px] bg-[rgba(56,189,248,0.08)] border border-[rgba(56,189,248,0.25)] text-[#38bdf8] text-[11px] font-medium">
                &ldquo;{search}&rdquo;
                <button
                  type="button"
                  className="inline-grid place-items-center w-4 h-4 min-w-[16px] min-h-[16px] rounded-full border-0 bg-transparent text-current cursor-pointer opacity-70 hover:opacity-100 hover:bg-[rgba(248,113,113,0.2)] hover:text-[#f87171] transition-all p-0 m-0 leading-none"
                  onClick={() => setSearch("")}
                  aria-label="Remove search filter"
                >
                  <X size={10} strokeWidth={2.4} aria-hidden="true" />
                </button>
              </span>
            )}
            {statusFilter !== "All" && (
              <span className="inline-flex items-center gap-[5px] pl-[9px] pr-[7px] py-[3px] rounded-[6px] bg-[rgba(56,189,248,0.08)] border border-[rgba(56,189,248,0.25)] text-[#38bdf8] text-[11px] font-medium">
                {statusFilter}
                <button
                  type="button"
                  className="inline-grid place-items-center w-4 h-4 min-w-[16px] min-h-[16px] rounded-full border-0 bg-transparent text-current cursor-pointer opacity-70 hover:opacity-100 hover:bg-[rgba(248,113,113,0.2)] hover:text-[#f87171] transition-all p-0 m-0 leading-none"
                  onClick={() => setStatusFilter("All")}
                  aria-label="Remove status filter"
                >
                  <X size={10} strokeWidth={2.4} aria-hidden="true" />
                </button>
              </span>
            )}
            {dateFilter !== "" && (
              <span className="inline-flex items-center gap-[5px] pl-[9px] pr-[7px] py-[3px] rounded-[6px] bg-[rgba(56,189,248,0.08)] border border-[rgba(56,189,248,0.25)] text-[#38bdf8] text-[11px] font-medium">
                {selectedRangeLabel}
                <button
                  type="button"
                  className="inline-grid place-items-center w-4 h-4 min-w-[16px] min-h-[16px] rounded-full border-0 bg-transparent text-current cursor-pointer opacity-70 hover:opacity-100 hover:bg-[rgba(248,113,113,0.2)] hover:text-[#f87171] transition-all p-0 m-0 leading-none"
                  onClick={() => setDateFilter("")}
                  aria-label="Hapus filter tanggal"
                >
                  <X size={10} strokeWidth={2.4} aria-hidden="true" />
                </button>
              </span>
            )}
            {typeFilter !== "All Types" && (
              <span className="inline-flex items-center gap-[5px] pl-[9px] pr-[7px] py-[3px] rounded-[6px] bg-[rgba(56,189,248,0.08)] border border-[rgba(56,189,248,0.25)] text-[#38bdf8] text-[11px] font-medium">
                {typeFilter}
                <button
                  type="button"
                  className="inline-grid place-items-center w-4 h-4 min-w-[16px] min-h-[16px] rounded-full border-0 bg-transparent text-current cursor-pointer opacity-70 hover:opacity-100 hover:bg-[rgba(248,113,113,0.2)] hover:text-[#f87171] transition-all p-0 m-0 leading-none"
                  onClick={() => setTypeFilter("All Types")}
                  aria-label="Remove type filter"
                >
                  <X size={10} strokeWidth={2.4} aria-hidden="true" />
                </button>
              </span>
            )}
            {priorityFilter !== "All Severities" && priorityFilter !== "All Priorities" && (
              <span className="inline-flex items-center gap-[5px] pl-[9px] pr-[7px] py-[3px] rounded-[6px] bg-[rgba(56,189,248,0.08)] border border-[rgba(56,189,248,0.25)] text-[#38bdf8] text-[11px] font-medium">
                {priorityFilter}
                <button
                  type="button"
                  className="inline-grid place-items-center w-4 h-4 min-w-[16px] min-h-[16px] rounded-full border-0 bg-transparent text-current cursor-pointer opacity-70 hover:opacity-100 hover:bg-[rgba(248,113,113,0.2)] hover:text-[#f87171] transition-all p-0 m-0 leading-none"
                  onClick={() => setPriorityFilter("All Severities")}
                  aria-label="Remove severity filter"
                >
                  <X size={10} strokeWidth={2.4} aria-hidden="true" />
                </button>
              </span>
            )}
            {projectFilter !== "All Projects" && (
              <span className="inline-flex items-center gap-[5px] pl-[9px] pr-[7px] py-[3px] rounded-[6px] bg-[rgba(56,189,248,0.08)] border border-[rgba(56,189,248,0.25)] text-[#38bdf8] text-[11px] font-medium">
                {projectFilter}
                <button
                  type="button"
                  className="inline-grid place-items-center w-4 h-4 min-w-[16px] min-h-[16px] rounded-full border-0 bg-transparent text-current cursor-pointer opacity-70 hover:opacity-100 hover:bg-[rgba(248,113,113,0.2)] hover:text-[#f87171] transition-all p-0 m-0 leading-none"
                  onClick={() => setProjectFilter("All Projects")}
                  aria-label="Remove project filter"
                >
                  <X size={10} strokeWidth={2.4} aria-hidden="true" />
                </button>
              </span>
            )}
            {shiftFilter !== "Semua Shift" && (
              <span className="inline-flex items-center gap-[5px] pl-[9px] pr-[7px] py-[3px] rounded-[6px] bg-[rgba(56,189,248,0.08)] border border-[rgba(56,189,248,0.25)] text-[#38bdf8] text-[11px] font-medium">
                {shiftFilter}
                <button
                  type="button"
                  className="inline-grid place-items-center w-4 h-4 min-w-[16px] min-h-[16px] rounded-full border-0 bg-transparent text-current cursor-pointer opacity-70 hover:opacity-100 hover:bg-[rgba(248,113,113,0.2)] hover:text-[#f87171] transition-all p-0 m-0 leading-none"
                  onClick={() => setShiftFilter("Semua Shift")}
                  aria-label="Remove shift filter"
                >
                  <X size={10} strokeWidth={2.4} aria-hidden="true" />
                </button>
              </span>
            )}
            <button
              type="button"
              className="bg-transparent border-0 px-1.5 py-[3px] text-[#94a3b8] text-[11px] font-semibold cursor-pointer ml-auto hover:text-[#f87171] hover:underline transition-colors rounded-[4px]"
              onClick={clearAllFilters}
              aria-label="Clear all active filters"
            >
              Clear all
            </button>
          </div>
        )}

        {/* ── Tab Views Rendering with Smooth CSS Transition ── */}
        {activeTab === "queue" && (
          <div className="animate-tab-fade" key="queue-tab">
            {filteredTickets.length > 0 ? (
              <>
                <TicketTable tickets={paginatedTickets} onSelect={onSelectTicket} />
                {renderPagination()}
              </>
            ) : (
              <div className="px-5 py-6">
                <EmptyState
                  icon="◫"
                  title="Tidak ada ticket yang cocok"
                  message="Coba sesuaikan kata kunci pencarian atau reset opsi filter untuk menemukan data ticket."
                  actionLabel="Reset semua filter"
                  onAction={clearAllFilters}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === "escalations" && (
          <div className="animate-tab-fade" key="escalations-tab">
            {filteredTickets.length > 0 ? (
              <>
                <TicketTable
                  tickets={paginatedTickets}
                  onSelect={onSelectTicket}
                  showEscalationDetails
                />
                {renderPagination()}
              </>
            ) : (
              <div className="px-5 pt-9 pb-12">
                <EmptyState
                  icon={<CheckCircle2 size={24} />}
                  tone="success"
                  title="Tidak ada tiket eskalasi aktif"
                  message="Semua eskalasi tiket telah tertangani dengan baik atau tidak ada antrean eskalasi pada filter ini."
                  actionLabel="Kembali ke daftar tiket"
                  onAction={() => {
                    clearAllFilters();
                    setActiveTab("queue");
                  }}
                />
              </div>
            )}
          </div>
        )}
      </article>
    </div>
  );
}
