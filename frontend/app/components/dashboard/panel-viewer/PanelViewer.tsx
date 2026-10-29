"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  X,
  BarChart3,
  Table,
  SlidersHorizontal,
  TrendingUp,
} from "lucide-react";
import type { PanelId } from "@/app/lib/query-state";
import { TicketVolumeView } from "./TicketVolumeView";
import { TicketMomView } from "./TicketMomView";
import { UserRecapView } from "./UserRecapView";
import { CategoryDistributionView } from "./CategoryDistributionView";
import { SeverityDistributionView } from "./SeverityDistributionView";
import { ShiftTrafficView } from "./ShiftTrafficView";
import { ResolutionTrendView } from "./ResolutionTrendView";
import type { TicketSeverity } from "@/app/lib/types";
import { useNarrowTouchLayout } from "@/app/hooks/useMobileLayout";

interface ActiveFilterItem {
  label: string;
  value: string;
}

interface PanelViewerProps {
  panelId: PanelId | null;
  mode: "chart" | "table";
  onModeChange: (mode: "chart" | "table") => void;
  onClose: () => void;
  onNavigatePanel: (nextPanel: PanelId) => void;

  // Active filters info
  activeFilters: ActiveFilterItem[];
  analyticsTicketCount: number;
  totalTicketCount: number;

  // Shared Data Sources
  volumeByDate: any[];
  allProjects: string[];
  projectColors: Record<string, string>;
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;

  momData: any;
  userSummaries: any[];
  onSelectUserDetail: (user: any) => void;

  typeCounts: [string, number][];
  totalTickets: number;
  renderDonutSlices: any;

  priorityCounts: { Critical: number; High: number; Medium: number; Low: number };
  priorityColors: Record<TicketSeverity, string>;
  severityStyles: Record<TicketSeverity, { borderLeft: string; dot: string; bar: string }>;

  shiftTrafficData: any;
  activeShiftLineFilter: "all" | "Pagi" | "Malam" | "Subuh";
  onShiftLineFilterChange: (filter: "all" | "Pagi" | "Malam" | "Subuh") => void;
}

const PANEL_METADATA: Record<
  PanelId,
  { title: string; subtitle: string; allowTable: boolean }
> = {
  "ticket-volume": {
    title: "Ticket Volume per Project",
    subtitle: "Tiket / hari",
    allowTable: true,
  },
  "ticket-mom": {
    title: "Perbandingan Tiket MoM",
    subtitle: "Agu vs Sep",
    allowTable: true,
  },
  "user-recap": {
    title: "Rekap Tiket per User",
    subtitle: "14 staf",
    allowTable: false, // user-recap is table-first
  },
  "category-distribution": {
    title: "Distribusi Kategori Tiket",
    subtitle: "Rasio kategori",
    allowTable: false, // has donut + table inline
  },
  "severity-distribution": {
    title: "Distribusi Berdasarkan Severity",
    subtitle: "Rasio severity",
    allowTable: false, // has donut + 2x2 cards + table inline
  },
  "shift-traffic": {
    title: "Tren Trafik Beban per Shift",
    subtitle: "Beban shift",
    allowTable: true,
  },
  "resolution-trend": {
    title: "Tren Durasi Penyelesaian",
    subtitle: "Menit / hari",
    allowTable: true,
  },
};

export function PanelViewer({
  panelId,
  mode,
  onModeChange,
  onClose,
  onNavigatePanel,
  activeFilters,
  analyticsTicketCount,
  totalTicketCount,
  volumeByDate,
  allProjects,
  projectColors,
  selectedDate,
  onSelectDate,
  momData,
  userSummaries,
  onSelectUserDetail,
  typeCounts,
  totalTickets,
  renderDonutSlices,
  priorityCounts,
  priorityColors,
  severityStyles,
  shiftTrafficData,
  activeShiftLineFilter,
  onShiftLineFilterChange,
}: PanelViewerProps) {
  const narrow = useNarrowTouchLayout();
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  // Focus trap, trigger restoration, and Escape key (ZERO JS SCROLL LOCKING LEAK)
  useEffect(() => {
    if (!panelId) return;

    triggerRef.current = (document.activeElement as HTMLElement) || null;
    const frame = requestAnimationFrame(() => {
      if (panelId === "user-recap" || panelId === "category-distribution" || panelId === "severity-distribution") modalRef.current?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.querySelector('[data-user-modal="true"]')) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeRef.current();
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusables = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0 && getComputedStyle(el).visibility !== "hidden" && !el.closest('[inert], [aria-hidden="true"]'));

        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || !modalRef.current.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !modalRef.current.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", handleKeyDown);
      triggerRef.current?.focus?.({ preventScroll: true });
    };
  }, [panelId]);

  if (!panelId || typeof document === "undefined") return null;

  const meta = PANEL_METADATA[panelId] || {
    title: "Detail Panel",
    subtitle: "",
    allowTable: false,
  };

  const hasCustomFilters = activeFilters.length > 0;
  const isDistribution = panelId === "category-distribution" || panelId === "severity-distribution";
  const smallRecap = panelId === "user-recap" && narrow;

  return createPortal(
    <div
      ref={modalRef}
      data-panel-viewer
      role="dialog"
      aria-modal="true"
      aria-labelledby="panel-viewer-title"
      className="fixed inset-0 z-[100] flex flex-col bg-[#0f172a] text-[#f8fafc] overflow-hidden select-none sm:select-auto panel-viewer-modal"
    >
      {/* ── 1. Top Header Bar (56px) ── */}
      <header className={`${smallRecap ? "h-[52px] min-h-[52px]" : "h-14 min-h-14"} px-3 sm:px-6 flex items-center justify-between border-b border-[#334155] bg-slate-900/95 sticky top-0 z-30 shrink-0 ${isDistribution || smallRecap ? "max-lg:[&_button]:min-h-11 max-lg:[&_button]:min-w-11" : ""}`}>
        {/* Left: Back Button + Title + Subtitle + Default Filter Badge */}
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-lg text-xs font-semibold bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/80 transition-colors cursor-pointer shrink-0"
            aria-label="Kembali ke Dashboard"
          >
            <ArrowLeft size={15} />
            <span className={smallRecap ? "hidden" : "hidden sm:inline"}>Dashboard</span>
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <h1 id="panel-viewer-title" title={meta.title} className="text-sm sm:text-base lg:text-[17px] font-bold text-white truncate">
              {smallRecap ? "Rekap per User" : meta.title}
            </h1>
            <span className={`${smallRecap ? "hidden" : "hidden md:inline-block"} px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-sky-500/10 border border-sky-500/25 text-sky-400 shrink-0`}>
              {meta.subtitle}
            </span>
            {!hasCustomFilters && (
              <span className="hidden lg:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-slate-800/80 border border-slate-700/70 text-slate-400 shrink-0">
                Semua data · <strong className="text-sky-400">{analyticsTicketCount} tiket</strong>
              </span>
            )}
          </div>
        </div>

        {/* Right: Controls + Mode Segmented Control + Close */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Tab Switcher for Volume vs MoM */}
          {(panelId === "ticket-volume" || panelId === "ticket-mom") && (
            <div className="hidden sm:flex items-center p-0.5 bg-slate-800/80 border border-slate-700/80 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => onNavigatePanel("ticket-volume")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  panelId === "ticket-volume"
                    ? "bg-sky-500 text-slate-950 font-bold shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Volume per Project
              </button>
              <button
                type="button"
                onClick={() => onNavigatePanel("ticket-mom")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  panelId === "ticket-mom"
                    ? "bg-sky-500 text-slate-950 font-bold shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <TrendingUp size={12} /> MoM
              </button>
            </div>
          )}

          {/* Segmented Control: Grafik | Tabel */}
          {meta.allowTable && (
            <div className="flex items-center p-0.5 bg-slate-800/80 border border-slate-700/80 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => onModeChange("chart")}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  mode === "chart"
                    ? "bg-sky-500 text-slate-950 font-bold shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Tampilkan grafik"
              >
                <BarChart3 size={13} />
                <span className="hidden sm:inline">Grafik</span>
              </button>
              <button
                type="button"
                onClick={() => onModeChange("table")}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  mode === "table"
                    ? "bg-sky-500 text-slate-950 font-bold shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Tampilkan tabel data"
              >
                <Table size={13} />
                <span className="hidden sm:inline">Tabel</span>
              </button>
            </div>
          )}

          {/* Close button (X) */}
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Tutup Tampilan Penuh"
            title="Tutup (Esc)"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* ── 2. Slim Filter Bar (Only if non-default filter is active) ── */}
      {hasCustomFilters && (
        <div className="px-3 sm:px-6 py-1.5 bg-slate-950/80 border-b border-[#334155]/60 flex items-center justify-between flex-wrap gap-2 text-xs shrink-0 max-h-9">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-slate-400 flex items-center gap-1 text-[11px] mr-1">
              <SlidersHorizontal size={11} className="text-sky-400" />
              Filter:
            </span>
            {activeFilters.map((f, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10.5px] bg-slate-800/80 border border-slate-700/80 text-slate-300"
              >
                <span className="text-slate-400">{f.label}:</span>
                <strong className="text-sky-400">{f.value}</strong>
              </span>
            ))}
            <span className="text-slate-500 font-mono text-[10.5px] ml-1.5">
              ({analyticsTicketCount}/{totalTicketCount} tiket)
            </span>
          </div>
        </div>
      )}

      {/* ── 3. Main Viewer Body (Full width up to 1920px, no dead side space) ── */}
      <main className={`flex-1 min-h-0 min-w-0 ${smallRecap ? "p-0" : "p-3 sm:p-5"} flex flex-col max-w-[1920px] w-full mx-auto ${isDistribution ? "overflow-y-auto overscroll-contain lg:overflow-hidden" : "overflow-hidden"}`}>
        {panelId === "ticket-volume" && (
          <TicketVolumeView
            volumeByDate={volumeByDate}
            allProjects={allProjects}
            mode={mode}
            projectColors={projectColors}
            selectedDate={selectedDate}
            onSelectDate={onSelectDate}
          />
        )}

        {panelId === "ticket-mom" && (
          <TicketMomView momData={momData} mode={mode} />
        )}

        {panelId === "user-recap" && (
          <UserRecapView
            userSummaries={userSummaries}
            onSelectUserDetail={onSelectUserDetail}
            projectColors={projectColors}
          />
        )}

        {panelId === "category-distribution" && (
          <CategoryDistributionView
            typeCounts={typeCounts}
            total={totalTickets}
            renderDonutSlices={renderDonutSlices}
          />
        )}

        {panelId === "severity-distribution" && (
          <SeverityDistributionView
            priorityCounts={priorityCounts}
            total={totalTickets}
            priorityColors={priorityColors}
            severityStyles={severityStyles}
            renderDonutSlices={renderDonutSlices}
          />
        )}

        {panelId === "shift-traffic" && (
          <ShiftTrafficView
            shiftTrafficData={shiftTrafficData}
            activeLineFilter={activeShiftLineFilter}
            onLineFilterChange={onShiftLineFilterChange}
            mode={mode}
          />
        )}

        {panelId === "resolution-trend" && (
          <ResolutionTrendView volumeByDate={volumeByDate} mode={mode} />
        )}
      </main>
    </div>,
    document.body
  );
}
