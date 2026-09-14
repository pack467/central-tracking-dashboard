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
  FileText,
  ShieldAlert,
} from "lucide-react";
import { TicketTable } from "@/app/components/tickets/TicketTable";
import { TicketReportView } from "@/app/components/tickets/TicketReportView";
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

type MainViewTab = "queue" | "escalations" | "report";

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

const PRIORITY_OPTIONS = ["All Priorities", "Critical", "High", "Medium", "Low"] as const;

const SHIFT_OPTIONS = ["Semua Shift", "Shift Subuh", "Shift Pagi", "Shift Malam"] as const;

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
  const [priorityFilter, setPriorityFilter] = useState<string>("All Priorities");
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
    () => ["All Projects", ...Array.from(new Set(tickets.map((ticket) => ticket.project)))],
    [tickets],
  );

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
        const ticketDate = ticket.date || getTodayWIB();
        if (dateFilter.includes("..")) {
          const [start, end] = dateFilter.split("..");
          if (start && ticketDate < start) return false;
          if (end && ticketDate > end) return false;
        } else {
          if (ticketDate !== dateFilter) return false;
        }
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
    priorityFilter !== "All Priorities" ||
    projectFilter !== "All Projects" ||
    shiftFilter !== "Semua Shift";

  const clearAllFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setDateFilter("");
    setTypeFilter("All Types");
    setPriorityFilter("All Priorities");
    setProjectFilter("All Projects");
    setShiftFilter("Semua Shift");
    setCurrentPage(1);
  };

  const selectedRangeLabel = useMemo(() => {
    if (!dateFilter) return "All Time";
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
      <div className="roster-pagination-bar ticket-pagination-bar">
        <div className="roster-pagination-left">
          <div className="roster-rows-per-page">
            <span className="roster-pagination-label">Rows per page:</span>
            <select
              className="roster-filter-select roster-page-size-select"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              aria-label="Jumlah tiket per halaman"
            >
              <option value="10">10</option>
              <option value="30">30</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>

          <span className="roster-pagination-info">
            Menampilkan <strong>{totalFilteredCount === 0 ? 0 : startIdx + 1}–{endIdx}</strong> dari{" "}
            <strong>{totalFilteredCount}</strong> tiket
          </span>
        </div>

        <div className="roster-pagination-actions">
          <button
            type="button"
            className="roster-page-btn roster-page-nav"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safeCurrentPage <= 1}
            aria-label="Halaman sebelumnya"
          >
            Prev
          </button>

          <div className="roster-page-numbers">
            {pageNumbers.map((p, idx) =>
              p === "..." ? (
                <span key={`ellipsis-${idx}`} className="roster-page-ellipsis">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  className={`roster-page-btn roster-page-num ${p === safeCurrentPage ? "active" : ""}`}
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
            className="roster-page-btn roster-page-nav"
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
    <div className="tickets-page-container anim-fade">
      {/* ── Page Header ── */}
      <section className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="live-dot live-dot-pulse" /> QUEUE TICKET · {activeClient.name.toUpperCase()}
          </div>
          <h1>Queue Ticket — {activeClient.shortName}</h1>
          <p>Kelola antrean tiket, eskalasi insiden, dan analisis performa operasional untuk klien {activeClient.name}.</p>
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

      {/* ── 2. Sub-Navigation Switcher (Daftar Tiket / Escalations / Ticket Report) ── */}
      <div className="ticket-view-switcher" role="tablist" aria-label="Navigasi view tiket">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "queue"}
          className={`view-switcher-tab ${activeTab === "queue" ? "active" : ""}`}
          onClick={() => setActiveTab("queue")}
        >
          <Layers size={14} />
          <span>Daftar Tiket</span>
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
                {[
                  dateFilter !== "",
                  typeFilter !== "All Types",
                  priorityFilter !== "All Priorities",
                  projectFilter !== "All Projects",
                  shiftFilter !== "Semua Shift",
                ].filter(Boolean).length}
              </span>
            )}
          </button>

          {/* Filter Controls (hidden on mobile unless open) */}
          <div className={`ticket-filter-controls${mobileFiltersOpen ? " filters-open" : ""}`}>
            {/* Date Range Picker (replaces All Time dropdown) */}
            <div className="ticket-date-filter-wrap">
              <DatePicker
                value={dateFilter}
                onChange={setDateFilter}
                placeholder="Semua Waktu"
                aria-label="Filter rentang waktu tiket"
              />
            </div>

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

            {/* Shift Filter */}
            <div className="filter-select-wrap">
              <Clock size={13} className="select-icon" />
              <select
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value)}
                aria-label="Filter shift tiket"
                data-active={shiftFilter !== "Semua Shift" ? "true" : undefined}
              >
                {SHIFT_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
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
            {dateFilter !== "" && (
              <span className="filter-chip">
                {selectedRangeLabel}
                <button
                  type="button"
                  className="filter-chip-remove"
                  onClick={() => setDateFilter("")}
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
            {shiftFilter !== "Semua Shift" && (
              <span className="filter-chip">
                {shiftFilter}
                <button
                  type="button"
                  className="filter-chip-remove"
                  onClick={() => setShiftFilter("Semua Shift")}
                  aria-label="Remove shift filter"
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
              <>
                <TicketTable tickets={paginatedTickets} onSelect={onSelectTicket} />
                {renderPagination()}
              </>
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
              <>
                <TicketTable
                  tickets={paginatedTickets}
                  onSelect={onSelectTicket}
                  showEscalationDetails
                />
                {renderPagination()}
              </>
            ) : (
              <div className="escalations-empty-wrap">
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
