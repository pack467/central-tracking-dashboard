"use client";

import { Badge } from "@/app/components/ui/Badge";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { ProjectMark } from "@/app/components/ui/ProjectMark";
import { initials } from "@/app/lib/data";
import type { Ticket } from "@/app/lib/types";

interface TicketTableProps {
  tickets: Ticket[];
  onSelect: (ticket: Ticket) => void;
  compact?: boolean;
}

export function severityTone(severity: string) {
  const s = severity.toLowerCase();
  return s === "critical" || s === "kritis" || s === "high" || s === "tinggi"
    ? "critical"
    : s === "medium" || s === "sedang"
      ? "warning"
      : "neutral";
}

export function statusTone(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "closed" || normalized === "ditutup") return "success";
  if (normalized === "activity" || normalized === "active" || normalized === "aktivitas" || normalized === "open") return "info";
  if (normalized === "pending" || normalized === "menunggu") return "warning";
  if (normalized === "re-open") return "critical";
  if (normalized === "meeting") return "info";
  return "neutral";
}

export function TicketTable({ tickets, onSelect, compact = false }: TicketTableProps) {
  if (!tickets.length) {
    return (
      <EmptyState
        icon="◫"
        title="Belum ada ticket yang cocok"
        message="Coba ubah kata kunci pencarian atau filter status untuk menemukan ticket lain."
      />
    );
  }

  const rows = compact ? tickets.slice(0, 6) : tickets;

  return (
    <div className="ticket-table" role="table" aria-label="Daftar ticket">
      <div className="ticket-header" role="row">
        <span>TICKET</span>
        <span>PROJECT</span>
        <span>ASSIGNEE</span>
        <span>PRIORITY</span>
        <span>STATUS</span>
        <span>CREATED</span>
      </div>
      {rows.map((ticket) => (
        <button className="ticket-row" role="row" onClick={() => onSelect(ticket)} key={ticket.id}>
          <span className="ticket-subject">
            <strong>{ticket.subject}</strong>
            <small>#{ticket.id}</small>
          </span>
          <span>
            <ProjectMark name={ticket.project} /> {ticket.project}
          </span>
          <span className="ticket-owner">
            <span className="mini-avatar">{initials(ticket.owner)}</span>
            {ticket.owner}
          </span>
          <span>
            <Badge tone={severityTone(ticket.severity)}>{ticket.severity}</Badge>
          </span>
          <span>
            <Badge tone={statusTone(ticket.status)}>{ticket.status}</Badge>
          </span>
          <span className="created-time">{ticket.created}</span>
        </button>
      ))}
    </div>
  );
}
