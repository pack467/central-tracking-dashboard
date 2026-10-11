"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { routes } from "@/app/lib/routes";

import { Badge } from "@/app/components/ui/Badge";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { ProjectMark } from "@/app/components/ui/ProjectMark";
import { Avatar } from "@/app/components/ui/Avatar";
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
  compact = false,
  showEscalationDetails = false,
}: TicketTableProps) {
  const pathname = usePathname();
  const query = useSearchParams().toString();
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
      className="w-full overflow-x-auto [-webkit-overflow-scrolling:touch]"
      role="table"
      aria-label="Daftar ticket"
    >
      {/* Table Header (Desktop) */}
      <div
        className={`grid ${
          showEscalationDetails
            ? "grid-cols-[minmax(220px,2.2fr)_minmax(80px,0.7fr)_minmax(150px,1.3fr)_minmax(160px,1.4fr)_80px_90px_70px] min-w-[860px]"
            : "grid-cols-[minmax(240px,2.2fr)_minmax(95px,0.9fr)_minmax(150px,1.4fr)_85px_95px_75px] min-w-[780px]"
        } gap-3 items-center px-5 h-[38px] text-[#94a3b8] text-[9.5px] font-bold font-mono tracking-[0.8px] border-b border-[#334155] max-[769px]:hidden`}
        role="row"
      >
        <span className="overflow-hidden text-ellipsis whitespace-nowrap">TICKET &amp; TYPE</span>
        <span className="overflow-hidden text-ellipsis whitespace-nowrap">PROJECT</span>
        <span className="overflow-hidden text-ellipsis whitespace-nowrap">ASSIGNEE</span>
        {showEscalationDetails && <span className="overflow-hidden text-ellipsis whitespace-nowrap">ESCALATED TO</span>}
        <span className="overflow-hidden text-ellipsis whitespace-nowrap">SEVERITY</span>
        <span className="overflow-hidden text-ellipsis whitespace-nowrap">STATUS</span>
        <span className="overflow-hidden text-ellipsis whitespace-nowrap">CREATED</span>
      </div>

      {/* Table Rows (Desktop) & Cards (Mobile) */}
      <div>
        {rows.map((ticket) => {
          const typeLabel = ticket.type || ticket.category || "Incident";

          return (
            <Link href={routes.ticketFromList(ticket.id, pathname, query)} scroll={false}
              className={`grid ${
                showEscalationDetails
                  ? "grid-cols-[minmax(220px,2.2fr)_minmax(80px,0.7fr)_minmax(150px,1.3fr)_minmax(160px,1.4fr)_80px_90px_70px] min-w-[860px]"
                  : "grid-cols-[minmax(240px,2.2fr)_minmax(95px,0.9fr)_minmax(150px,1.4fr)_85px_95px_75px] min-w-[780px]"
              } gap-3 items-center w-full min-h-[56px] my-1 rounded-lg px-5 py-2.5 border-0 border-b border-[#334155] last:border-b-0 bg-transparent text-left cursor-pointer transition-colors duration-150 hover:bg-[#243044] text-[#cbd5e1] max-[769px]:flex max-[769px]:flex-col max-[769px]:items-start max-[769px]:gap-2 max-[769px]:min-w-0 max-[769px]:w-[calc(100%-28px)] max-[769px]:p-[14px_16px] max-[769px]:m-[10px_14px] max-[769px]:bg-[#1e293b] max-[769px]:border max-[769px]:border-[#334155] max-[769px]:rounded-[10px]`}
              role="row"
              key={ticket.id}
              aria-label={`Buka detail ticket ${ticket.subject}`}
            >
              {/* Ticket Code, Subject & Type Tag */}
              <div className="min-w-0 overflow-hidden max-[769px]:flex max-[769px]:flex-col max-[769px]:items-start max-[769px]:gap-1 max-[769px]:w-full max-[769px]:pb-1.5 max-[769px]:border-b max-[769px]:border-[#334155]">
                <div className="flex items-center gap-2 mb-[3px] flex-wrap min-w-0">
                  <span className="font-mono text-[10.5px] font-semibold text-[#38bdf8] shrink-0">#{ticket.id}</span>
                  <span className="inline-flex items-center px-1.5 py-[1.5px] rounded-[4px] border border-[#334155] bg-[rgba(148,163,184,0.08)] text-[#cbd5e1] text-[9.5px] font-semibold font-mono tracking-[0.2px] uppercase shrink-0">{typeLabel}</span>
                </div>
                <strong className="block text-[12.5px] font-semibold text-[#f8fafc] leading-[1.35] overflow-hidden text-ellipsis whitespace-nowrap min-w-0 max-[769px]:whitespace-normal" title={ticket.subject}>{ticket.subject}</strong>
              </div>

              {/* Project */}
              <div className="min-w-0 overflow-hidden max-[769px]:flex max-[769px]:items-center max-[769px]:w-full">
                <span className="hidden max-[769px]:inline-block text-[10.5px] font-semibold text-[#94a3b8] font-mono min-w-[80px] shrink-0">Project:</span>
                <span className="inline-flex items-center gap-[7px] text-[11.5px] text-[#f8fafc] min-w-0 max-w-full">
                  <ProjectMark name={ticket.project} />
                  <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{ticket.project}</span>
                </span>
              </div>

              {/* Assignee */}
              <div className="min-w-0 overflow-hidden max-[769px]:flex max-[769px]:items-center max-[769px]:w-full" title={ticket.owner ? `Assignee: ${ticket.owner}` : "Unassigned"}>
                <span className="hidden max-[769px]:inline-block text-[10.5px] font-semibold text-[#94a3b8] font-mono min-w-[80px] shrink-0">Assignee:</span>
                <span className="inline-flex items-center gap-[7px] text-[11.5px] text-[#f8fafc] min-w-0 max-w-full">
                  <Avatar size="sm" name={ticket.owner || "Unassigned"} className="shrink-0" />
                  <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{ticket.owner || "Unassigned"}</span>
                </span>
              </div>

              {/* Escalation Level & Escalated To (Conditional) */}
              {showEscalationDetails && (
                <div
                  className="min-w-0 overflow-hidden max-[769px]:flex max-[769px]:items-center max-[769px]:w-full"
                  title={ticket.escalatedTo ? `Eskalasi ke: ${ticket.escalatedTo} (${ticket.escalationLevel || "Level 2"})` : undefined}
                >
                  <span className="hidden max-[769px]:inline-block text-[10.5px] font-semibold text-[#94a3b8] font-mono min-w-[80px] shrink-0">Escalated To:</span>
                  <div className="flex flex-col min-w-0 max-w-full">
                    <strong className="font-semibold text-[#f8fafc] text-[11px] min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{ticket.escalatedTo || "L2 Support"}</strong>
                    <small className="text-[9.5px] text-[#94a3b8] font-mono min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{ticket.escalationLevel || "Level 2"}</small>
                  </div>
                </div>
              )}

              {/* Priority / Severity */}
              <div className="min-w-0 overflow-hidden max-[769px]:flex max-[769px]:items-center max-[769px]:w-full">
                <span className="hidden max-[769px]:inline-block text-[10.5px] font-semibold text-[#94a3b8] font-mono min-w-[80px] shrink-0">Severity:</span>
                <Badge tone={severityTone(ticket.severity)}>{ticket.severity}</Badge>
              </div>

              {/* Status */}
              <div className="min-w-0 overflow-hidden max-[769px]:flex max-[769px]:items-center max-[769px]:w-full">
                <span className="hidden max-[769px]:inline-block text-[10.5px] font-semibold text-[#94a3b8] font-mono min-w-[80px] shrink-0">Status:</span>
                <Badge tone={statusTone(ticket.status)}>{ticket.status}</Badge>
              </div>

              {/* Created Time & Date */}
              <div className="min-w-0 overflow-hidden max-[769px]:flex max-[769px]:items-center max-[769px]:gap-2 max-[769px]:w-full">
                <span className="text-[11px] font-mono text-[#f8fafc] block">{ticket.created}</span>
                {ticket.date && <small className="text-[9.5px] font-mono text-[#94a3b8] block">{ticket.date}</small>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
