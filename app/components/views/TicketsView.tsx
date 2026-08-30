"use client";

import { useMemo, useState } from "react";
import { TicketTable } from "@/app/components/tickets/TicketTable";
import { EmptyState } from "@/app/components/ui/EmptyState";
import type { Ticket } from "@/app/lib/types";

interface TicketsViewProps {
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
  onNewTicket: () => void;
}

const STATUS_OPTIONS = ["All", "Active", "Closed", "Pending"];
const PRIORITY_OPTIONS = ["All Priorities", "Critical", "High", "Medium", "Low"];
const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "priority", label: "Highest Priority" },
];

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

export function TicketsView({ tickets, onSelectTicket, onNewTicket }: TicketsViewProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All Priorities");
  const [projectFilter, setProjectFilter] = useState("All Projects");
  const [sort, setSort] = useState("newest");

  const projectOptions = useMemo(
    () => ["All Projects", ...Array.from(new Set(tickets.map((ticket) => ticket.project)))],
    [tickets],
  );

  const visibleTickets = useMemo(() => {
    const needle = search.trim().toLowerCase();
    let result = tickets.filter((ticket) => {
      if (statusFilter !== "All" && statusFilter !== "Semua") {
        if (normalizeStatus(ticket.status) !== normalizeStatus(statusFilter)) return false;
      }
      if (priorityFilter !== "All Priorities" && priorityFilter !== "Semua") {
        if (normalizePriority(ticket.severity) !== normalizePriority(priorityFilter)) return false;
      }
      if (projectFilter !== "All Projects" && projectFilter !== "Semua" && ticket.project !== projectFilter) return false;
      if (!needle) return true;
      return Object.values(ticket).some(
        (value) =>
          typeof value === "string" && value.toLowerCase().includes(needle),
      );
    });
    result = [...result].sort((a, b) => {
      if (sort === "priority") return priorityRank(a.severity) - priorityRank(b.severity);
      if (sort === "oldest") return a.created.localeCompare(b.created);
      return b.created.localeCompare(a.created);
    });
    return result;
  }, [tickets, search, statusFilter, priorityFilter, projectFilter, sort]);

  const activeCount = tickets.filter((ticket) => normalizeStatus(ticket.status) === "active").length;
  const closedCount = tickets.filter((ticket) => normalizeStatus(ticket.status) === "closed").length;
  const highPriorityCount = tickets.filter((t) => {
    const p = normalizePriority(t.severity);
    return p === "critical" || p === "high";
  }).length;

  return (
    <>
      <section className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="live-dot live-dot-pulse" /> MANAJEMEN TIKET
          </div>
          <h1>Queue Ticket</h1>
          <p>Cari, filter, dan tindak lanjuti seluruh ticket operasional lintas proyek.</p>
        </div>
        <div className="page-actions">
          <button className="button button-primary" onClick={onNewTicket}>
            <span>＋</span> New Ticket
          </button>
        </div>
      </section>

      <section className="ticket-stats">
        <article className="stat-chip">
          <strong>{tickets.length}</strong>
          <span>Total ticket</span>
        </article>
        <article className="stat-chip stat-warning">
          <strong>{activeCount}</strong>
          <span>Active</span>
        </article>
        <article className="stat-chip stat-success">
          <strong>{closedCount}</strong>
          <span>Closed</span>
        </article>
        <article className="stat-chip stat-critical">
          <strong>{highPriorityCount}</strong>
          <span>High Priority</span>
        </article>
      </section>

      <article className="panel view-panel">
        <div className="view-toolbar">
          <div className="search-field">
            <span>⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari ID, subjek, atau penanggung jawab…"
              aria-label="Cari ticket"
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch("")} aria-label="Bersihkan pencarian">
                ×
              </button>
            )}
          </div>
          <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Urutkan">
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value)}
            aria-label="Filter prioritas"
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <select
            value={projectFilter}
            onChange={(event) => setProjectFilter(event.target.value)}
            aria-label="Filter proyek"
          >
            {projectOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>

        <div className="view-filter-bar">
          <div className="filter-tabs" aria-label="Filter status tiket">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option}
                className={statusFilter === option ? "selected" : ""}
                onClick={() => setStatusFilter(option)}
              >
                {option}
              </button>
            ))}
          </div>
          <div className="filter-count">
            Menampilkan <strong>{visibleTickets.length}</strong> dari {tickets.length} ticket
          </div>
        </div>

        {visibleTickets.length > 0 ? (
          <TicketTable tickets={visibleTickets} onSelect={onSelectTicket} />
        ) : (
          <EmptyState
            icon="◫"
            title="Tidak ada ticket yang cocok"
            message="Coba sesuaikan kata kunci pencarian atau opsi filter status untuk menemukan data ticket."
            actionLabel="Reset filter"
            onAction={() => {
              setSearch("");
              setStatusFilter("All");
              setPriorityFilter("All Priorities");
              setProjectFilter("All Projects");
            }}
          />
        )}
      </article>
    </>
  );
}
