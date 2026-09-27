"use client";

import { Badge } from "@/app/components/ui/Badge";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { ProjectMark } from "@/app/components/ui/ProjectMark";
import { Avatar } from "@/app/components/ui/Avatar";
import { initials } from "@/app/lib/data";
import type { Ticket, Tone } from "@/app/lib/types";

interface TicketTableProps {
  tickets: Ticket[];
  onSelect: (ticket: Ticket) => void;
  compact?: boolean;
  showEscalationDetails?: boolean;
}

export function severityTone(severity: string): Tone {
  const s = severity.toLowerCase();
  if (s === "critical" || s === "kritis") return "critical";
  if (s === "high" || s === "tinggi") return "high";
  if (s === "medium" || s === "sedang") return "warning";
  if (s === "low" || s === "rendah") return "low";
  return "neutral";
}

export function statusTone(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "closed" || normalized === "ditutup") return "success";
  if (normalized === "activity" || normalized === "active" || normalized === "aktivitas" || normalized === "open") return "info";
  if (normalized === "pending" || normalized === "menunggu") return "warning";
  if (normalized === "escalated" || normalized === "eskalasi" || normalized === "re-open") return "critical";
  if (normalized === "meeting") return "info";
  return "neutral";
}

export function TicketTable({
  tickets,
  onSelect,
  compact = false,
  showEscalationDetails = false,
}: TicketTableProps) {
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
    <div
      className={`ticket-table-container ${showEscalationDetails ? "ticket-table-escalation" : ""}`}
      role="table"
      aria-label="Daftar ticket"
    >
      {/* Table Header (Desktop) */}
      <div className="ticket-header" role="row">
        <span className="th-ticket">TICKET &amp; TYPE</span>
        <span className="th-project">PROJECT</span>
        <span className="th-assignee">ASSIGNEE</span>
        {showEscalationDetails && <span className="th-escalation">ESCALATED TO</span>}
        <span className="th-priority">SEVERITY</span>
        <span className="th-status">STATUS</span>
        <span className="th-created">CREATED</span>
      </div>

      {/* Table Rows (Desktop) & Cards (Mobile) */}
      <div className="ticket-rows-wrap">
        {rows.map((ticket) => {
          const typeLabel = ticket.type || ticket.category || "Incident";

          return (
            <button
              type="button"
              className="ticket-row"
              role="row"
              onClick={() => onSelect(ticket)}
              key={ticket.id}
              aria-label={`Buka detail ticket ${ticket.subject}`}
            >
              {/* Ticket Code, Subject & Type Tag */}
              <div className="ticket-cell ticket-cell-subject">
                <div className="ticket-title-line">
                  <span className="ticket-code">#{ticket.id}</span>
                  <span className="ticket-type-tag">{typeLabel}</span>
                </div>
                <strong className="ticket-subject-text" title={ticket.subject}>{ticket.subject}</strong>
              </div>

              {/* Project */}
              <div className="ticket-cell ticket-cell-project">
                <span className="ticket-cell-label">Project:</span>
                <span className="ticket-project-wrap">
                  <ProjectMark name={ticket.project} />
                  <span>{ticket.project}</span>
                </span>
              </div>

              {/* Assignee */}
              <div className="ticket-cell ticket-cell-owner" title={ticket.owner ? `Assignee: ${ticket.owner}` : "Unassigned"}>
                <span className="ticket-cell-label">Assignee:</span>
                <span className="ticket-owner-wrap">
                  <Avatar size="sm" name={ticket.owner || "Unassigned"} className="mini-avatar" />
                  <span className="owner-name">{ticket.owner || "Unassigned"}</span>
                </span>
              </div>

              {/* Escalation Level & Escalated To (Conditional) */}
              {showEscalationDetails && (
                <div
                  className="ticket-cell ticket-cell-escalation"
                  title={ticket.escalatedTo ? `Eskalasi ke: ${ticket.escalatedTo} (${ticket.escalationLevel || "Level 2"})` : undefined}
                >
                  <span className="ticket-cell-label">Escalated To:</span>
                  <div className="escalation-target-wrap">
                    <strong className="escalated-person">{ticket.escalatedTo || "L2 Support"}</strong>
                    <small className="escalated-tier">{ticket.escalationLevel || "Level 2"}</small>
                  </div>
                </div>
              )}

              {/* Priority / Severity */}
              <div className="ticket-cell ticket-cell-priority">
                <span className="ticket-cell-label">Severity:</span>
                <Badge tone={severityTone(ticket.severity)}>{ticket.severity}</Badge>
              </div>

              {/* Status */}
              <div className="ticket-cell ticket-cell-status">
                <span className="ticket-cell-label">Status:</span>
                <Badge tone={statusTone(ticket.status)}>{ticket.status}</Badge>
              </div>

              {/* Created Time & Date */}
              <div className="ticket-cell ticket-cell-time">
                <span className="created-time">{ticket.created}</span>
                {ticket.date && <small className="created-date">{ticket.date}</small>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
