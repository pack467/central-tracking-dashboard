"use client";

import { ArrowDownToLine, ChevronDown, ClipboardList, ShieldCheck } from "lucide-react";
import { useRef } from "react";
import type { ReportLogKind } from "@/app/lib/weekly-report";
import { reportButtonClass } from "./report-styles";

export function ReportCsvExport({ disabled, onExport }: { disabled: boolean; onExport: (kind: ReportLogKind) => void }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  function choose(kind: ReportLogKind) {
    if (detailsRef.current) detailsRef.current.open = false;
    onExport(kind);
  }
  return (
    <details ref={detailsRef} className="group relative">
      <summary
        className={`${reportButtonClass} cursor-pointer list-none [&::-webkit-details-marker]:hidden ${disabled ? "cursor-not-allowed opacity-45 pointer-events-none" : ""}`}
        aria-label="Ekspor CSV"
        aria-disabled={disabled}
        onClick={(event) => {
          if (disabled) event.preventDefault();
        }}
      >
        <ArrowDownToLine size={14} className="text-[#38bdf8]" />
        <span>Ekspor CSV</span>
        <ChevronDown size={13} className="text-[#94a3b8] transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="absolute left-0 top-full z-40 mt-1.5 w-64 rounded-[10px] border border-[#334155] bg-[#1e293b] p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.45)] sm:left-auto sm:right-0">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-[8px] px-3 py-2.5 text-left text-xs text-[#cbd5e1] transition-colors duration-150 hover:bg-[#243044] hover:text-[#38bdf8] cursor-pointer"
          disabled={disabled}
          onClick={() => choose("tickets")}
        >
          <ClipboardList size={16} className="shrink-0 text-[#38bdf8]" />
          <span className="flex flex-col gap-0.5">
            <strong className="font-semibold text-[#f8fafc]">Ticket log (.csv)</strong>
            <span className="text-[11px] text-[#94a3b8]">9 kolom sesuai format dokumen</span>
          </span>
        </button>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-[8px] px-3 py-2.5 text-left text-xs text-[#cbd5e1] transition-colors duration-150 hover:bg-[#243044] hover:text-[#38bdf8] cursor-pointer"
          disabled={disabled}
          onClick={() => choose("monitoring")}
        >
          <ShieldCheck size={16} className="shrink-0 text-[#4ade80]" />
          <span className="flex flex-col gap-0.5">
            <strong className="font-semibold text-[#f8fafc]">Monitoring log (.csv)</strong>
            <span className="text-[11px] text-[#94a3b8]">7 kolom sesuai format dokumen</span>
          </span>
        </button>
      </div>
    </details>
  );
}
