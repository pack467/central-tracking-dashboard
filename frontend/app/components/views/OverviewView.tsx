"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { Layers, Clock, ChevronDown, Check } from "lucide-react";
import { ClientStatusGrid } from "@/app/components/dashboard/ClientStatusGrid";
import { HandoverQuickCard } from "@/app/components/dashboard/HandoverQuickCard";
import { HealthStrip } from "@/app/components/dashboard/HealthStrip";
import { MetricCards } from "@/app/components/dashboard/MetricCards";
import { MonitoringSchedule } from "@/app/components/dashboard/MonitoringSchedule";
import { ShiftCoverageCard } from "@/app/components/dashboard/ShiftCoverageCard";
import { TicketTable } from "@/app/components/tickets/TicketTable";
import type { CheckpointAssessment, HandoverRecordData, Ticket } from "@/app/lib/types";
import { useActiveShift } from "@/app/hooks/useLiveClock";
import { useNotifications } from "@/app/context/NotificationContext";
import { useClient } from "@/app/context/ClientContext";
import { getClientProjects, getClientMonitoringSchedule } from "@/app/lib/clientData";

interface OverviewViewProps {
  tickets: Ticket[];
  allTickets?: Ticket[];
  assessments: Record<string, CheckpointAssessment>;
  acknowledged?: string[];
  onAcknowledge?: (title: string) => void;
  onUnacknowledge?: (title: string) => void;
  currentHour: string;
  handoverRecord: HandoverRecordData;
  handoverPendingCount: number;
  handoverProgressPercent: number;
  handoverSavedLabel: string | null;
  onAssess: (key: string, verdict: "ok" | "nok" | "adequate" | "not-adequate" | null) => void;
  onRequestNote: (key: string) => void;
  onOpenGuide: () => void;
  onGoToTickets: () => void;
  onGoToMonitoring: () => void;
  onGoToNotifications?: () => void;
  onSelectTicket: (ticket: Ticket) => void;
  onNewTicket: () => void;
  onExportReport: () => void;
  onOpenHandover: () => void;
  onCreateHandover: () => void;
}

export function getTicketShift(ticket: Ticket): "Subuh" | "Pagi" | "Malam" {
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

interface OverviewFilterOption {
  name: string;
  count: number;
  val?: string;
}

interface OverviewFilterDropdownProps {
  id: string;
  icon: React.ReactNode;
  label: string;
  allLabel: string;
  totalCount: number;
  selectedValue: string | null;
  options: OverviewFilterOption[];
  onSelect: (val: string | null) => void;
}

function OverviewFilterDropdown({
  id,
  icon,
  label,
  allLabel,
  totalCount,
  selectedValue,
  options,
  onSelect,
}: OverviewFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const activeOption = options.find((opt) => (opt.val ?? opt.name) === selectedValue);
  const displayLabel = selectedValue
    ? `${activeOption?.name ?? selectedValue} (${activeOption?.count ?? 0})`
    : `${allLabel} (${totalCount})`;

  return (
    <div className="schedule-filter-dropdown-wrap" ref={containerRef} id={id}>
      <button
        type="button"
        className={`schedule-filter-dropdown-btn ${isOpen ? "open" : ""} ${selectedValue ? "has-value" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Filter ${label}: ${displayLabel}`}
        title={`Filter ${label}: ${displayLabel}`}
      >
        <span className="sched-dropdown-icon">{icon}</span>
        <span className="sched-dropdown-label">{displayLabel}</span>
        <ChevronDown size={12} className={`sched-dropdown-chevron ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div
          className="schedule-filter-popover"
          role="listbox"
          aria-label={`Pilihan filter ${label}`}
        >
          <div className="sched-popover-header">
            <span className="sched-popover-title">PILIH {label.toUpperCase()}</span>
          </div>

          <div className="sched-popover-list">
            {/* "Semua" Option */}
            <button
              type="button"
              role="option"
              aria-selected={!selectedValue}
              className={`sched-popover-item ${!selectedValue ? "selected" : ""}`}
              onClick={() => {
                onSelect(null);
                setIsOpen(false);
              }}
            >
              <div className="sched-item-main">
                <span className="sched-item-name">{allLabel}</span>
              </div>
              <span className="sched-item-count">{totalCount}</span>
              {!selectedValue && <Check size={13} className="sched-item-check" />}
            </button>

            <div className="sched-popover-divider" />

            {/* Individual Options */}
            {options.map((opt) => {
              const optKey = opt.val ?? opt.name;
              const isSelected = selectedValue === optKey;
              return (
                <button
                  key={optKey}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`sched-popover-item ${isSelected ? "selected" : ""} ${opt.count === 0 ? "is-zero" : ""}`}
                  onClick={() => {
                    onSelect(optKey);
                    setIsOpen(false);
                  }}
                >
                  <div className="sched-item-main">
                    <span className="sched-item-name">{opt.name}</span>
                  </div>
                  <span className={`sched-item-count ${opt.count === 0 ? "count-zero" : ""}`}>
                    {opt.count}
                  </span>
                  {isSelected && <Check size={13} className="sched-item-check" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function OverviewView(props: OverviewViewProps) {
  const { activeClient, activeClientId } = useClient();
  const activeShift = useActiveShift();
  const { getClientNotifications } = useNotifications();

  const clientProjects = useMemo(() => getClientProjects(activeClientId), [activeClientId]);
  const clientSchedule = useMemo(() => getClientMonitoringSchedule(activeClientId), [activeClientId]);
  const overviewEntries = useMemo(() => clientSchedule.filter((entry) => entry.overview), [clientSchedule]);
  const pendingTasks = props.handoverRecord.tasks.filter((task) => !task.completed);

  const clientNotifications = useMemo(
    () => getClientNotifications(activeClientId),
    [getClientNotifications, activeClientId]
  );

  // Synchronized unread attention items count
  const attentionCount = useMemo(() => {
    return clientNotifications.filter((n) => {
      const isUrgent = n.severity === "warning" || n.severity === "critical";
      const isAlertCategory = ["Monitoring", "Ticket", "Temuan", "SLA", "Queue", "Kafka", "Tickets", "API", "Cache"].includes(n.category);
      return n.unread && (isUrgent || isAlertCategory || Boolean(n.project));
    }).length;
  }, [clientNotifications]);

  // ── Ticket Terbaru Filter & Pagination States ──
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [shiftFilter, setShiftFilter] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset pagination to page 1 whenever any filter or tenant changes
  useEffect(() => {
    setCurrentPage(1);
  }, [projectFilter, shiftFilter, activeClientId]);

  // Dynamic distinct project options from current client's tickets
  const projectOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    props.tickets.forEach((t) => {
      if (t.project) {
        counts[t.project] = (counts[t.project] || 0) + 1;
      }
    });
    return Object.keys(counts)
      .sort()
      .map((name) => ({
        name,
        count: counts[name],
      }));
  }, [props.tickets]);

  // Dynamic distinct shift options from current client's tickets
  const shiftOptions = useMemo(() => {
    const counts: Record<string, number> = {
      Subuh: 0,
      Pagi: 0,
      Malam: 0,
    };
    props.tickets.forEach((t) => {
      const s = getTicketShift(t);
      if (counts[s] !== undefined) counts[s]++;
    });
    return [
      { name: "Shift Subuh", count: counts.Subuh, val: "Subuh" },
      { name: "Shift Pagi", count: counts.Pagi, val: "Pagi" },
      { name: "Shift Malam", count: counts.Malam, val: "Malam" },
    ];
  }, [props.tickets]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return props.tickets.filter((t) => {
      // 1. Project filter
      if (projectFilter && t.project !== projectFilter) {
        return false;
      }
      // 2. Shift filter
      if (shiftFilter) {
        const s = getTicketShift(t);
        if (s !== shiftFilter) return false;
      }
      return true;
    });
  }, [props.tickets, projectFilter, shiftFilter]);

  // Pagination calculations
  const totalFilteredCount = filteredTickets.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIdx = (safeCurrentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalFilteredCount);
  const paginatedTickets = useMemo(
    () => filteredTickets.slice(startIdx, endIdx),
    [filteredTickets, startIdx, endIdx]
  );

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

  return (
    <>
      <section className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="live-dot live-dot-pulse" /> ALL SYSTEMS NOMINAL · {activeClient.code} · {activeShift.name.toUpperCase()}
          </div>
          <h1>Operation Dashboard — {activeClient.shortName}</h1>
          <p>Status sistem {activeClient.name}, monitoring layanan, queue ticket, dan ringkasan handover shift.</p>
        </div>
        <div className="page-actions">
          <button className="button button-secondary" onClick={props.onExportReport}>
            <span>↓</span> Export Summary
          </button>
          <button className="button button-primary" onClick={props.onNewTicket}>
            <span>＋</span> New Ticket
          </button>
        </div>
      </section>

      {/* ── Status per Klien / Tenant Card Grid (Cross-Client Overview) ── */}
      <ClientStatusGrid
        allTickets={props.allTickets}
        assessments={props.assessments}
        onNavigateToMonitoring={props.onGoToMonitoring}
        activeHandoverTasks={props.handoverRecord?.tasks}
      />

      <HealthStrip
        entries={clientProjects}
        allTickets={props.allTickets || props.tickets}
        schedules={clientSchedule}
        assessments={props.assessments}
        activeHandoverTasks={props.handoverRecord?.tasks}
        onSelectTicket={(ticketId) => {
          const found = (props.allTickets || props.tickets).find((t) => t.id === ticketId);
          if (found) {
            props.onSelectTicket(found);
          } else {
            props.onGoToTickets();
          }
        }}
        onViewAllTickets={props.onGoToTickets}
        onViewAllTasks={props.onGoToMonitoring}
      />

      <MetricCards
        tickets={props.tickets}
        attentionCount={attentionCount}
        onGoToTickets={props.onGoToTickets}
        onGoToNotifications={props.onGoToNotifications}
      />

      <section className="dashboard-grid">
        <div className="main-column">
          <MonitoringSchedule
            entries={overviewEntries}
            assessments={props.assessments}
            onAssess={props.onAssess}
            onRequestNote={props.onRequestNote}
            currentHour={props.currentHour}
            footer={
              <div className="schedule-panel-footer">
                <button className="guide-trigger-btn" onClick={props.onOpenGuide}>
                  Panduan Penilaian (Guide)
                </button>
                <button className="schedule-more-button" onClick={props.onGoToMonitoring}>
                  Buka jadwal monitoring lengkap <span>→</span>
                </button>
              </div>
            }
          />
        </div>

        <aside className="side-column">
          <ShiftCoverageCard />
          <HandoverQuickCard
            pendingCount={pendingTasks.length}
            progressPercent={props.handoverProgressPercent}
            accepted={Boolean(props.handoverRecord.acceptance)}
            savedLabel={
              props.handoverSavedLabel
                ? `${props.handoverRecord.sourceShift} ke ${props.handoverRecord.targetShift}`
                : null
            }
            onOpen={props.onOpenHandover}
            onCreate={props.onCreateHandover}
          />
        </aside>
      </section>

      {/* 5. Ticket Terbaru with Project/Shift Filters & Pagination */}
      <article className="panel tickets-panel">
        <div className="panel-heading recent-tickets-heading">
          <div className="panel-heading-left">
            <div className="panel-title">Ticket Terbaru</div>
            <span className="recent-tickets-counter-badge" title="Jumlah tiket yang sesuai kriteria">
              {totalFilteredCount} Tiket
            </span>
          </div>

          <div className="recent-tickets-controls">
            {/* Project Filter Dropdown */}
            <OverviewFilterDropdown
              id="overview-ticket-project-filter"
              icon={<Layers size={13} className="sched-select-icon" />}
              label="Proyek"
              allLabel="Semua Proyek"
              totalCount={props.tickets.length}
              selectedValue={projectFilter}
              options={projectOptions}
              onSelect={setProjectFilter}
            />

            {/* Shift Filter Dropdown */}
            <OverviewFilterDropdown
              id="overview-ticket-shift-filter"
              icon={<Clock size={13} className="sched-select-icon" />}
              label="Shift"
              allLabel="Semua Shift"
              totalCount={props.tickets.length}
              selectedValue={shiftFilter}
              options={shiftOptions}
              onSelect={setShiftFilter}
            />

            {/* Reset Filters button */}
            {(projectFilter || shiftFilter) && (
              <button
                type="button"
                className="recent-tickets-reset-btn"
                onClick={() => {
                  setProjectFilter(null);
                  setShiftFilter(null);
                }}
                title="Reset semua filter proyek & shift"
              >
                Reset Filter
              </button>
            )}

            <button
              type="button"
              className="text-button recent-tickets-see-all"
              onClick={props.onGoToTickets}
              title="Buka halaman penuh Manajemen Tiket dengan antrean lengkap dan analisis"
            >
              Lihat semua <span>→</span>
            </button>
          </div>
        </div>

        {/* Paginated Ticket Table */}
        <TicketTable tickets={paginatedTickets} onSelect={props.onSelectTicket} />

        {/* Pagination Bar */}
        {totalFilteredCount > 0 && (
          <div className="roster-pagination-bar ticket-pagination-bar recent-tickets-pagination">
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
                {(projectFilter || shiftFilter) && (
                  <span className="recent-tickets-filtered-hint">
                    {" "}(difilter dari total {props.tickets.length})
                  </span>
                )}
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
                  )
                )}
              </div>

              <button
                type="button"
                className="roster-page-btn roster-page-nav"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages}
                aria-label="Halaman berikutnya"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </article>
    </>
  );
}
