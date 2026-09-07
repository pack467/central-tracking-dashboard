"use client";

import { useMemo, useState } from "react";
import {
  Ticket as TicketIcon,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Search,
  X,
  Calendar,
  Layers,
  SlidersHorizontal,
  Tag,
  BarChart2,
  FolderOpen,
  ArrowUpDown,
  FileText,
  ShieldAlert,
  ListFilter,
  Check,
} from "lucide-react";
import { TicketTable } from "@/app/components/tickets/TicketTable";
import { TicketReportView } from "@/app/components/tickets/TicketReportView";
import { StatCard } from "@/app/components/ui/StatCard";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { DatePicker } from "@/app/components/ui/DatePicker";
import type { Ticket } from "@/app/lib/types";
import {
  getTodayWIB,
  getYesterdayWIB,
  getStartOfWeekWIB,
  getStartOfLastWeekWIB,
  getEndOfLastWeekWIB,
  getLastMonthPrefixWIB,
} from "@/app/lib/data";

interface TicketsViewProps {
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
  onNewTicket: () => void;
}

type MainViewTab = "queue" | "escalations" | "report";

const STATUS_OPTIONS = ["All", "Active", "Closed", "Pending", "Escalated"] as const;

const TIME_RANGE_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "shift_subuh", label: "Shift Subuh (00:00–08:30)" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This Week" },
  { value: "last_week", label: "Last Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "custom", label: "Custom Range" },
] as const;

const TICKET_TYPES = [
  "All Types",
  "Incident",
  "Ad-hoc Request",
  "Maintenance",
  "Change Request",
  "Escalation",
  "Monitoring Alert",
  "Other",
] as const;

const PRIORITY_OPTIONS = ["All Priorities", "Critical", "High", "Medium", "Low"] as const;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "priority", label: "Highest Priority" },
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
  if (s === "critical" || s === "kritis") return "critical";
  if (s === "high" || s === "tinggi") return "high";
  if (s === "medium" || s === "sedang") return "medium";
  if (s === "low" || s === "rendah") return "low";
  return s;
};

// Date range matching helper
function matchesTimeRange(
  ticket: Ticket,
  range: string,
  customStart: string,
  customEnd: string,
): boolean {
  if (range === "all") return true;

  const ticketDate = ticket.date || getTodayWIB();

  const today = getTodayWIB();
  const yesterday = getYesterdayWIB();

  switch (range) {
    case "today":
      return ticketDate === today;

    case "shift_subuh":
      return ticket.shift === "Subuh";

    case "yesterday":
      return ticketDate === yesterday;

    case "this_week":
      return ticketDate >= getStartOfWeekWIB() && ticketDate <= today;

    case "last_week":
      return ticketDate >= getStartOfLastWeekWIB() && ticketDate <= getEndOfLastWeekWIB();

    case "this_month":
      return ticketDate.startsWith(today.slice(0, 7));

    case "last_month":
      return ticketDate.startsWith(getLastMonthPrefixWIB());

    case "custom":
      if (customStart && ticketDate < customStart) return false;
      if (customEnd && ticketDate > customEnd) return false;
      return true;

    default:
      return true;
  }
}

export function TicketsView({ tickets, onSelectTicket, onNewTicket }: TicketsViewProps) {
  // Main view tab (queue, escalations, report)
  const [activeTab, setActiveTab] = useState<MainViewTab>("queue");

  // Search & Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [timeRange, setTimeRange] = useState<string>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("All Types");
  const [priorityFilter, setPriorityFilter] = useState<string>("All Priorities");
  const [projectFilter, setProjectFilter] = useState<string>("All Projects");
  const [sort, setSort] = useState<string>("newest");

  // Mobile filter panel open/closed
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Dynamic project options
  const projectOptions = useMemo(
    () => ["All Projects", ...Array.from(new Set(tickets.map((ticket) => ticket.project)))],
    [tickets],
  );

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

      // 3. Time Range
      if (!matchesTimeRange(ticket, timeRange, customStart, customEnd)) {
        return false;
      }

      // 4. Ticket Type / Category
      if (typeFilter !== "All Types") {
        const tType = ticket.type || ticket.category || "Incident";
        if (tType !== typeFilter) return false;
      }

      // 5. Priority
      if (priorityFilter !== "All Priorities" && priorityFilter !== "Semua") {
        if (normalizePriority(ticket.severity) !== normalizePriority(priorityFilter)) return false;
      }

      // 6. Project
      if (projectFilter !== "All Projects" && projectFilter !== "Semua" && ticket.project !== projectFilter) {
        return false;
      }

      // 7. Search keyword
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
    timeRange,
    customStart,
    customEnd,
    typeFilter,
    priorityFilter,
    projectFilter,
    sort,
  ]);

  // Overall metric counts (unfiltered context for stat cards)
  const totalCount = tickets.length;
  const activeCount = tickets.filter((t) => normalizeStatus(t.status) === "active").length;
  const closedCount = tickets.filter((t) => normalizeStatus(t.status) === "closed").length;
  const pendingCount = tickets.filter((t) => normalizeStatus(t.status) === "pending").length;
  const highPriorityCount = tickets.filter((t) => {
    const p = normalizePriority(t.severity);
    return p === "critical" || p === "high";
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
    timeRange !== "all" ||
    typeFilter !== "All Types" ||
    priorityFilter !== "All Priorities" ||
    projectFilter !== "All Projects";

  const clearAllFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setTimeRange("all");
    setCustomStart("");
    setCustomEnd("");
    setTypeFilter("All Types");
    setPriorityFilter("All Priorities");
    setProjectFilter("All Projects");
  };

  const selectedRangeLabel =
    TIME_RANGE_OPTIONS.find((r) => r.value === timeRange)?.label || "Selected Period";

  return (
    <div className="tickets-page-container anim-fade">
      {/* ── Page Header ── */}
      <section className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="live-dot live-dot-pulse" /> QUEUE TICKET &amp; OPERATIONS
          </div>
          <h1>Queue Ticket</h1>
          <p>Kelola antrean tiket, eskalasi insiden, dan analisis performa operasional.</p>
        </div>
        <div className="page-actions">
          <button className="button button-primary" onClick={onNewTicket}>
            <span>＋</span> New Ticket
          </button>
        </div>
      </section>

      {/* ── 1. Top Summary Stat Cards ── */}
      <section className="roster-metrics-grid" aria-label="Ringkasan statistik tiket">
        {/* Total Ticket */}
        <StatCard
          label="TOTAL TICKETS"
          value={totalCount}
          accentColor="blue"
          icon={<TicketIcon size={15} strokeWidth={2} />}
          subtitle={`${activeCount} Active · ${pendingCount} Pending · ${closedCount} Closed`}
          badgeText="All Queue Items"
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

        {/* High Priority & Critical */}
        <StatCard
          label="HIGH PRIORITY / ESCALATED"
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

      {/* ── 2. Sub-Navigation Switcher (Queue / Escalations / Ticket Report) ── */}
      <div className="ticket-view-switcher" role="tablist" aria-label="Navigasi view tiket">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "queue"}
          className={`view-switcher-tab ${activeTab === "queue" ? "active" : ""}`}
          onClick={() => setActiveTab("queue")}
        >
          <Layers size={14} />
          <span>Queue Table</span>
          <span className="tab-badge">{tickets.length}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "escalations"}
          className={`view-switcher-tab ${activeTab === "escalations" ? "active" : ""}`}
          onClick={() => setActiveTab("escalations")}
        >
          <ShieldAlert size={14} />
          <span>Escalations</span>
          <span className={`tab-badge ${escalatedCount > 0 ? "tab-badge-rose" : "tab-badge-muted"}`}>
            {escalatedCount}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "report"}
          className={`view-switcher-tab ${activeTab === "report" ? "active" : ""}`}
          onClick={() => setActiveTab("report")}
        >
          <FileText size={14} />
          <span>Ticket Report &amp; Analytics</span>
        </button>
      </div>

      {/* ── 3. Main Content Panel ── */}
      <article className="panel view-panel ticket-main-panel">
        {/* Multi-Dimensional Filter Toolbar */}
        <div className="ticket-toolbar-grid">
          {/* Search Field */}
          <div className="ticket-search-field">
            <Search size={14} className="search-icon" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari ID, subjek, proyek, atau PIC…"
              aria-label="Cari tiket"
            />
            {search && (
              <button
                className="search-clear"
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
            className="mobile-filter-toggle"
            onClick={() => setMobileFiltersOpen((v) => !v)}
            aria-expanded={mobileFiltersOpen}
            aria-label="Toggle filter panel"
          >
            <SlidersHorizontal size={13} />
            Filters
            {hasActiveFilters && (
              <span className="mobile-filter-badge">
                {[timeRange !== "all", typeFilter !== "All Types", priorityFilter !== "All Priorities", projectFilter !== "All Projects"].filter(Boolean).length}
              </span>
            )}
          </button>

          {/* Filter Controls (hidden on mobile unless open) */}
          <div className={`ticket-filter-controls${mobileFiltersOpen ? " filters-open" : ""}`}>
            {/* Time Range Filter */}
            <div className="filter-select-wrap">
              <Calendar size={13} className="select-icon" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                aria-label="Filter rentang waktu"
                data-active={timeRange !== "all" ? "true" : undefined}
              >
                {TIME_RANGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Date Pickers */}
            {timeRange === "custom" && (
              <div className="custom-date-inputs" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "145px" }}>
                  <DatePicker
                    value={customStart}
                    onChange={(val) => setCustomStart(val)}
                    placeholder="Mulai..."
                  />
                </div>
                <span className="date-sep" style={{ color: "var(--ink-muted)", fontSize: "12px" }}>ke</span>
                <div style={{ width: "145px" }}>
                  <DatePicker
                    value={customEnd}
                    onChange={(val) => setCustomEnd(val)}
                    placeholder="Selesai..."
                  />
                </div>
              </div>
            )}

            {/* Ticket Type / Category Filter */}
            <div className="filter-select-wrap">
              <Tag size={13} className="select-icon" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                aria-label="Filter kategori tiket"
                data-active={typeFilter !== "All Types" ? "true" : undefined}
              >
                {TICKET_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Filter */}
            <div className="filter-select-wrap">
              <BarChart2 size={13} className="select-icon" />
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                aria-label="Filter prioritas"
                data-active={priorityFilter !== "All Priorities" ? "true" : undefined}
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Project Filter */}
            <div className="filter-select-wrap">
              <FolderOpen size={13} className="select-icon" />
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                aria-label="Filter proyek"
                data-active={projectFilter !== "All Projects" ? "true" : undefined}
              >
                {projectOptions.map((proj) => (
                  <option key={proj} value={proj}>
                    {proj}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Divider + Sort Control */}
            <div className="filter-sort-divider" aria-hidden="true" />

            {/* Sort Order */}
            <div className="filter-select-wrap">
              <ArrowUpDown size={13} className="select-icon" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                aria-label="Urutkan tiket"
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
        {activeTab !== "report" && (
          <div className="view-filter-bar">
            <div className="filter-tabs" aria-label="Filter status tiket" role="tablist">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === option}
                  className={statusFilter === option ? "selected" : ""}
                  onClick={() => setStatusFilter(option)}
                >
                  {option}
                </button>
              ))}
            </div>
            <div className="filter-count" aria-live="polite">
              <strong>{filteredTickets.length}</strong> / {tickets.length} tickets
            </div>
          </div>
        )}

        {/* ── Active Filter Chips Row — only renders when filters are active ── */}
        {hasActiveFilters && (
          <div className="active-filter-chips-row" aria-label="Active filters">
            <span className="chips-label">Filters:</span>
            {search && (
              <span className="filter-chip">
                &ldquo;{search}&rdquo;
                <button
                  type="button"
                  className="filter-chip-remove"
                  onClick={() => setSearch("")}
                  aria-label="Remove search filter"
                >
                  ×
                </button>
              </span>
            )}
            {statusFilter !== "All" && (
              <span className="filter-chip">
                {statusFilter}
                <button
                  type="button"
                  className="filter-chip-remove"
                  onClick={() => setStatusFilter("All")}
                  aria-label="Remove status filter"
                >
                  ×
                </button>
              </span>
            )}
            {timeRange !== "all" && (
              <span className="filter-chip">
                {selectedRangeLabel}
                <button
                  type="button"
                  className="filter-chip-remove"
                  onClick={() => setTimeRange("all")}
                  aria-label="Remove time filter"
                >
                  ×
                </button>
              </span>
            )}
            {typeFilter !== "All Types" && (
              <span className="filter-chip">
                {typeFilter}
                <button
                  type="button"
                  className="filter-chip-remove"
                  onClick={() => setTypeFilter("All Types")}
                  aria-label="Remove type filter"
                >
                  ×
                </button>
              </span>
            )}
            {priorityFilter !== "All Priorities" && (
              <span className="filter-chip">
                {priorityFilter}
                <button
                  type="button"
                  className="filter-chip-remove"
                  onClick={() => setPriorityFilter("All Priorities")}
                  aria-label="Remove priority filter"
                >
                  ×
                </button>
              </span>
            )}
            {projectFilter !== "All Projects" && (
              <span className="filter-chip">
                {projectFilter}
                <button
                  type="button"
                  className="filter-chip-remove"
                  onClick={() => setProjectFilter("All Projects")}
                  aria-label="Remove project filter"
                >
                  ×
                </button>
              </span>
            )}
            <button
              type="button"
              className="clear-all-filters-btn"
              onClick={clearAllFilters}
              aria-label="Clear all active filters"
            >
              Clear all
            </button>
          </div>
        )}

        {/* ── Tab Views Rendering with Smooth CSS Transition ── */}
        {activeTab === "queue" && (
          <div className="ticket-view-content anim-tab-fade" key="queue-tab">
            {filteredTickets.length > 0 ? (
              <TicketTable tickets={filteredTickets} onSelect={onSelectTicket} />
            ) : (
              <div className="tickets-empty-container">
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
          <div className="ticket-view-content anim-tab-fade" key="escalations-tab">
            <div className="escalation-info-banner">
              <ShieldAlert size={15} className="text-rose-400 flex-shrink-0" />
              <span>
                Menampilkan antrean tiket eskalasi aktif yang memerlukan tindak lanjut tim Level-2 / Incident Coordinator.
              </span>
            </div>
            {filteredTickets.length > 0 ? (
              <TicketTable
                tickets={filteredTickets}
                onSelect={onSelectTicket}
                showEscalationDetails
              />
            ) : (
              <div className="escalations-empty-wrap">
                <EmptyState
                  icon={<CheckCircle2 size={24} />}
                  tone="success"
                  title="Tidak ada tiket eskalasi aktif"
                  message="Semua eskalasi tiket telah tertangani dengan baik atau tidak ada antrean eskalasi pada filter ini."
                  actionLabel="Kembali ke antrean utama"
                  onAction={() => {
                    clearAllFilters();
                    setActiveTab("queue");
                  }}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === "report" && (
          <div className="ticket-view-content anim-tab-fade" key="report-tab">
            <TicketReportView
              tickets={filteredTickets}
              dateRangeLabel={selectedRangeLabel}
            />
          </div>
        )}
      </article>
    </div>
  );
}
