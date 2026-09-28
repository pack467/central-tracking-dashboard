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
      className={`ticket-table-container [width:100%] [overflow-x:auto] [-webkit-overflow-scrolling:touch] ${showEscalationDetails ? "ticket-table-escalation" : ""}`}
      role="table"
      aria-label="Daftar ticket"
    >
      {/* Table Header (Desktop) */}
      <div className="ticket-header [display:grid] [grid-template-columns:minmax(240px,_2.2fr)_minmax(95px,_0.9fr)_minmax(150px,_1.4fr)_85px_95px_75px] [gap:12px] [align-items:center] [padding:0_20px] [height:38px] [color:var(--ink-muted)] [font-size:9.5px] [font-weight:700] [font-family:var(--font-mono)] [letter-spacing:0.8px] [border-bottom:1px_solid_var(--line)] [min-width:780px]" role="row">
        <span className="th-ticket [overflow:hidden] [text-overflow:ellipsis] [white-space:nowrap]">TICKET &amp; TYPE</span>
        <span className="th-project [overflow:hidden] [text-overflow:ellipsis] [white-space:nowrap]">PROJECT</span>
        <span className="th-assignee [overflow:hidden] [text-overflow:ellipsis] [white-space:nowrap]">ASSIGNEE</span>
        {showEscalationDetails && <span className="th-escalation [overflow:hidden] [text-overflow:ellipsis] [white-space:nowrap]">ESCALATED TO</span>}
        <span className="th-priority [overflow:hidden] [text-overflow:ellipsis] [white-space:nowrap]">SEVERITY</span>
        <span className="th-status [overflow:hidden] [text-overflow:ellipsis] [white-space:nowrap]">STATUS</span>
        <span className="th-created [overflow:hidden] [text-overflow:ellipsis] [white-space:nowrap]">CREATED</span>
      </div>

      {/* Table Rows (Desktop) & Cards (Mobile) */}
      <div className="ticket-rows-wrap">
        {rows.map((ticket) => {
          const typeLabel = ticket.type || ticket.category || "Incident";

          return (
            <button
              type="button"
              className="ticket-row [display:grid] [grid-template-columns:minmax(240px,_2.2fr)_minmax(95px,_0.9fr)_minmax(150px,_1.4fr)_85px_95px_75px] [gap:12px] [align-items:center] [width:100%] [min-height:56px] [padding:10px_20px] [border:none] [border-bottom:1px_solid_var(--line)] [background:transparent] [text-align:left] [cursor:pointer] [transition:background_0.15s_ease] [min-width:780px]"
              role="row"
              onClick={() => onSelect(ticket)}
              key={ticket.id}
              aria-label={`Buka detail ticket ${ticket.subject}`}
            >
              {/* Ticket Code, Subject & Type Tag */}
              <div className="ticket-cell ticket-cell-subject [min-width:0] [overflow:hidden]">
                <div className="ticket-title-line [display:flex] [align-items:center] [gap:8px] [margin-bottom:3px] [flex-wrap:wrap] [min-width:0]">
                  <span className="ticket-code [font-family:var(--font-mono)] [font-size:10.5px] [font-weight:600] [color:var(--accent-blue)] [flex-shrink:0]">#{ticket.id}</span>
                  <span className="ticket-type-tag [display:inline-flex] [align-items:center] [padding:1.5px_6px] [border-radius:4px] [border:1px_solid_var(--line)] [background:rgba(148,_163,_184,_0.08)] [color:var(--ink-secondary)] [font-size:9px] [font-weight:600] [font-family:var(--font-mono)] [letter-spacing:0.3px] [text-transform:uppercase] [flex-shrink:0]">{typeLabel}</span>
                </div>
                <strong className="ticket-subject-text [display:block] [font-size:12.5px] [font-weight:600] [color:var(--ink-primary)] [line-height:1.35] [overflow:hidden] [text-overflow:ellipsis] [white-space:nowrap] [min-width:0]" title={ticket.subject}>{ticket.subject}</strong>
              </div>

              {/* Project */}
              <div className="ticket-cell ticket-cell-project [min-width:0] [overflow:hidden]">
                <span className="ticket-cell-label [display:none]">Project:</span>
                <span className="ticket-project-wrap [display:inline-flex] [align-items:center] [gap:7px] [font-size:11.5px] [color:var(--ink-primary)] [min-width:0] [max-width:100%]">
                  <ProjectMark name={ticket.project} />
                  <span>{ticket.project}</span>
                </span>
              </div>

              {/* Assignee */}
              <div className="ticket-cell ticket-cell-owner [min-width:0] [overflow:hidden]" title={ticket.owner ? `Assignee: ${ticket.owner}` : "Unassigned"}>
                <span className="ticket-cell-label [display:none]">Assignee:</span>
                <span className="ticket-owner-wrap [display:inline-flex] [align-items:center] [gap:7px] [font-size:11.5px] [color:var(--ink-primary)] [min-width:0] [max-width:100%]">
                  <Avatar size="sm" name={ticket.owner || "Unassigned"} className="mini-avatar" />
                  <span className="owner-name [min-width:0] [overflow:hidden] [text-overflow:ellipsis] [white-space:nowrap]">{ticket.owner || "Unassigned"}</span>
                </span>
              </div>

              {/* Escalation Level & Escalated To (Conditional) */}
              {showEscalationDetails && (
                <div
                  className="ticket-cell ticket-cell-escalation [min-width:0] [overflow:hidden]"
                  title={ticket.escalatedTo ? `Eskalasi ke: ${ticket.escalatedTo} (${ticket.escalationLevel || "Level 2"})` : undefined}
                >
                  <span className="ticket-cell-label [display:none]">Escalated To:</span>
                  <div className="escalation-target-wrap [display:flex] [flex-direction:column] [min-width:0] [max-width:100%]">
                    <strong className="escalated-person [font-weight:600] [color:var(--ink-primary)] [min-width:0] [overflow:hidden] [text-overflow:ellipsis] [white-space:nowrap]">{ticket.escalatedTo || "L2 Support"}</strong>
                    <small className="escalated-tier [font-size:9.5px] [color:var(--ink-muted)] [font-family:var(--font-mono)] [min-width:0] [overflow:hidden] [text-overflow:ellipsis] [white-space:nowrap]">{ticket.escalationLevel || "Level 2"}</small>
                  </div>
                </div>
              )}

              {/* Priority / Severity */}
              <div className="ticket-cell ticket-cell-priority [min-width:0] [overflow:hidden]">
                <span className="ticket-cell-label [display:none]">Severity:</span>
                <Badge tone={severityTone(ticket.severity)}>{ticket.severity}</Badge>
              </div>

              {/* Status */}
              <div className="ticket-cell ticket-cell-status [min-width:0] [overflow:hidden]">
                <span className="ticket-cell-label [display:none]">Status:</span>
                <Badge tone={statusTone(ticket.status)}>{ticket.status}</Badge>
              </div>

              {/* Created Time & Date */}
              <div className="ticket-cell ticket-cell-time [min-width:0] [overflow:hidden]">
                <span className="created-time [font-size:11px] [font-family:var(--font-mono)] [color:var(--ink-primary)] [display:block]">{ticket.created}</span>
                {ticket.date && <small className="created-date [font-size:9.5px] [font-family:var(--font-mono)] [color:var(--ink-muted)] [display:block]">{ticket.date}</small>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
