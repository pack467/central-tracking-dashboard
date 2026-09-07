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
  showEscalationDetails?: boolean;
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
  if (normalized === "escalated" || normalized === "eskalasi" || normalized === "re-open") return "critical";
  if (normalized === "meeting") return "info";
  return "neutral";
}

function agingTone(hours: number = 0): { tone: "success" | "warning" | "critical"; label: string } {
  if (hours <= 2) return { tone: "success", label: `${hours.toFixed(1)}h (Normal)` };
  if (hours <= 4) return { tone: "warning", label: `${hours.toFixed(1)}h (Aging)` };
  return { tone: "critical", label: `${hours.toFixed(1)}h (Overdue)` };
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
        {showEscalationDetails && <span className="th-aging">AGING</span>}
        <span className="th-priority">PRIORITY</span>
        <span className="th-status">STATUS</span>
        <span className="th-created">CREATED</span>
      </div>

      {/* Table Rows (Desktop) & Cards (Mobile) */}
      <div className="ticket-rows-wrap">
        {rows.map((ticket) => {
          const typeLabel = ticket.type || ticket.category || "Incident";
          const aging = ticket.agingHours ? agingTone(ticket.agingHours) : null;

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
                <strong className="ticket-subject-text">{ticket.subject}</strong>
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
              <div className="ticket-cell ticket-cell-owner">
                <span className="ticket-cell-label">Assignee:</span>
                <span className="ticket-owner-wrap">
                  <span className="mini-avatar" aria-hidden="true">
                    {initials(ticket.owner || "Unassigned")}
                  </span>
                  <span className="owner-name">{ticket.owner || "Unassigned"}</span>
                </span>
              </div>

              {/* Escalation Level & Escalated To (Conditional) */}
              {showEscalationDetails && (
                <div className="ticket-cell ticket-cell-escalation">
                  <span className="ticket-cell-label">Escalated To:</span>
                  <div className="escalation-target-wrap">
                    <strong className="escalated-person">{ticket.escalatedTo || "L2 Support"}</strong>
                    <small className="escalated-tier">{ticket.escalationLevel || "Level 2"}</small>
                  </div>
                </div>
              )}

              {/* Aging Indicator (Conditional) */}
              {showEscalationDetails && (
                <div className="ticket-cell ticket-cell-aging">
                  <span className="ticket-cell-label">Aging:</span>
                  {aging ? (
                    <span className={`ticket-aging-badge aging-${aging.tone}`}>
                      <span className={`aging-dot aging-dot-${aging.tone}`} />
                      <span>{aging.label}</span>
                    </span>
                  ) : (
                    <span className="ticket-aging-badge aging-neutral">
                      <span className="aging-dot" />
                      <span>&lt; 1h</span>
                    </span>
                  )}
                </div>
              )}

              {/* Priority */}
              <div className="ticket-cell ticket-cell-priority">
                <span className="ticket-cell-label">Priority:</span>
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
