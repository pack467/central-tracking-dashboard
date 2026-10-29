"use client";

import React from "react";
import { Maximize2 } from "lucide-react";

interface PanelViewButtonProps {
  panelTitle?: string;
  ariaLabel?: string;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}

export function PanelViewButton({
  panelTitle = "",
  ariaLabel,
  onClick,
  className = "",
  disabled = false,
}: PanelViewButtonProps) {
  const fullLabel = ariaLabel || (panelTitle ? `Lihat ${panelTitle} dalam tampilan penuh` : "Lihat panel dalam tampilan penuh");

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      aria-label={fullLabel}
      aria-disabled={disabled ? "true" : undefined}
      disabled={disabled}
      title={disabled ? "Memuat..." : fullLabel}
      className={`inline-flex items-center justify-center gap-1.5 h-[28px] min-h-[28px] min-w-[32px] sm:min-w-fit px-2 sm:px-2.5 rounded-[8px] border border-[#334155] ${
        disabled
          ? "bg-slate-900/40 text-[#64748b] opacity-50 cursor-wait"
          : "bg-slate-900/60 hover:bg-[#243044] text-[#cbd5e1] hover:text-[#f8fafc] cursor-pointer"
      } text-[11.5px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900 shrink-0 select-none panel-view-action-btn ${className}`}
    >
      <Maximize2 size={13} className={`shrink-0 ${disabled ? "text-slate-500" : "text-sky-400 group-hover:text-sky-300"}`} />
      <span className="hidden sm:inline leading-none">View</span>
    </button>
  );
}

