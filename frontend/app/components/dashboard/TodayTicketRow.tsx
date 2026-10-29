"use client";
import { MasterProjectName } from "@/app/components/ui/MasterProjectName";

import { User } from "lucide-react";
import type { Ticket } from "@/app/lib/types";

interface TodayTicketRowProps {
  ticket: Ticket;
  projectColor: string;
  priorityStyle: string;
  statusStyle: string;
  statusLabel: string;
  previewVisible: boolean;
  lastVisible: boolean;
  mobile: boolean;
}
const projectTextContrast: Record<string, string> = {
  DM: "max-lg:brightness-[1.35]",
  USIEM: "max-lg:brightness-125",
  MB: "max-lg:brightness-125",
};
// Utility lookup for the hues supplied by the dashboard's PROJECT_COLORS map.
const projectColorClasses: Record<string, string> = {
  "#38bdf8": "text-[#38bdf8]",
  "#a855f7": "text-[#a855f7]",
  "#f59e0b": "text-[#f59e0b]",
  "#ec4899": "text-[#ec4899]",
  "#06b6d4": "text-[#06b6d4]",
  "#10b981": "text-[#10b981]",
  "#6366f1": "text-[#6366f1]",
  "#84cc16": "text-[#84cc16]",
  "#94a3b8": "text-[#94a3b8]",
};

/** One row DOM: desktop columns become three ordered lines on narrow screens. */
export function TodayTicketRow({ ticket, projectColor, priorityStyle, statusStyle, statusLabel, previewVisible, lastVisible, mobile }: TodayTicketRowProps) {
  return <div role="listitem" data-today-ticket={ticket.id} aria-label={`${ticket.subject}, ${ticket.severity}, ${statusLabel}`} aria-hidden={mobile && !previewVisible || undefined} className={`grid grid-cols-[88px_1fr_auto] items-center gap-[12px] p-[7px_12px] rounded-[8px] border border-[rgba(148,163,184,0.08)] bg-[rgba(148,163,184,0.03)] hover:bg-[rgba(148,163,184,0.08)] hover:border-[rgba(56,189,248,0.2)] transition-all duration-150 ease-[ease] shrink-0 compact-today-ticket-row max-lg:flex max-lg:flex-wrap max-lg:content-start max-lg:gap-x-2 max-lg:gap-y-2 max-lg:rounded-none max-lg:border-x-0 max-lg:border-t-0 max-lg:border-b-[#334155]/45 max-lg:bg-transparent max-lg:px-4 max-lg:overflow-hidden max-lg:[container-type:inline-size] max-lg:hover:bg-transparent max-lg:hover:border-[#334155]/45 max-lg:transition-[height,padding,border-width,opacity] max-lg:duration-200 motion-reduce:transition-none ${previewVisible ? "max-lg:h-[129.5px] max-lg:py-3.5 max-lg:opacity-100" : "max-lg:h-0 max-lg:py-0 max-lg:opacity-0 max-lg:border-b-0 max-lg:pointer-events-none"} ${lastVisible ? "max-lg:border-b-0" : ""}`}>
    <div className="flex flex-col gap-[2px] compact-today-ticket-id-col max-lg:contents">
      <span className="font-mono text-[11px] font-bold text-[#f8fafc] today-ticket-id max-lg:order-2 max-lg:min-w-0 max-lg:flex-1 max-lg:basis-0 max-lg:truncate max-lg:text-right max-lg:font-normal max-lg:text-[#94a3b8]" title={`#${ticket.id}`}>#{ticket.id}</span>
      <span className={`text-[10px] max-lg:text-[12px] font-semibold today-ticket-proj max-lg:order-4 max-lg:inline-flex max-lg:h-[22px] max-lg:max-w-[90px] max-lg:items-center max-lg:gap-1.5 max-lg:font-mono max-lg:leading-[22px] ${projectColorClasses[projectColor] || "text-[#94a3b8]"}`} title={ticket.project}>
        <span className="max-lg:hidden">● </span><span aria-hidden="true" className="hidden size-1.5 shrink-0 rounded-full bg-current max-lg:inline-block" /><span className={`max-lg:truncate ${projectTextContrast[ticket.project] || ""}`}><MasterProjectName value={ticket.project} historical /></span>
      </span>
    </div>
    <div className="flex flex-col gap-[2px] min-w-0 compact-today-ticket-subject max-lg:contents">
      <span className="text-[12px] font-semibold text-[#f8fafc] whitespace-nowrap overflow-hidden text-ellipsis today-ticket-title max-lg:order-3 max-lg:h-[40.5px] max-lg:w-full max-lg:flex-none max-lg:basis-full max-lg:whitespace-normal max-lg:line-clamp-2 max-lg:text-[15px] max-lg:leading-[1.35]" title={ticket.subject}>{ticket.subject}</span>
      <div data-today-meta className="flex items-center gap-[8px] text-[10px] text-[#94a3b8] max-lg:order-5 max-lg:h-[22px] max-lg:min-w-0 max-lg:flex-1 max-lg:basis-0 max-lg:gap-2 max-lg:text-[12px] max-lg:leading-[22px] max-lg:whitespace-nowrap" title={`${ticket.type || ticket.category || "Incident"} · ${ticket.owner || ""}`}>
        <span className="text-[10px] text-[#94a3b8] today-ticket-type max-lg:flex max-lg:min-w-0 max-lg:flex-1 max-lg:items-center max-lg:gap-2 max-lg:text-[12px] max-[359px]:[&.today-ticket-type]:hidden"><span aria-hidden="true" className="hidden max-lg:inline">·</span><span className="max-lg:truncate" title={ticket.type || ticket.category || "Incident"}>{ticket.type || ticket.category || "Incident"}</span></span>
        {ticket.owner && <span className="inline-flex items-center gap-[3px] text-[#cbd5e1] font-medium compact-today-ticket-owner max-lg:ml-auto max-lg:min-w-0 max-lg:max-w-[45cqw] max-lg:gap-1.5 max-lg:text-[#94a3b8]" title={ticket.owner}>
          <User size={10} className="max-lg:hidden" /><span aria-hidden="true" className="hidden size-[22px] shrink-0 items-center justify-center rounded-full bg-sky-400/15 text-[11px] font-semibold text-sky-200 max-lg:inline-flex">{ticket.owner.split(/\s+/).filter(Boolean).map(part => part[0]).slice(0, 2).join("")}</span><span className="truncate">{ticket.owner}</span>
        </span>}
      </div>
    </div>
    <div className="flex items-center gap-[6px] shrink-0 compact-today-ticket-badges max-lg:order-1 max-lg:max-w-[calc(100%-28px)]">
      <span className={priorityStyle}><span aria-hidden="true" className="hidden size-1.5 shrink-0 rounded-full bg-current max-lg:mr-1.5 max-lg:inline-block" /><span className="max-lg:brightness-125">{ticket.severity}</span></span>
      <span className={statusStyle}><span className="max-lg:brightness-125">{statusLabel}</span></span>
    </div>
  </div>;
}
