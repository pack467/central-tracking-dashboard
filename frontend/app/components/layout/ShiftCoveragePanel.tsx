"use client";

import { useMemo, useState } from "react";
import { Users, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useActiveShift } from "@/app/hooks/useLiveClock";
import {
  defaultRosterMembers,
  resolveCanonicalStatus,
  PanelHeader,
  CoverageDonutChart,
  StatsRow,
  StatusFilterTabs,
  MemberList,
  PanelFooter,
  type TeamMemberItem,
  type StatusCounts,
  type FilterTabOption,
} from "@/app/components/dashboard/ShiftCoverageCard";

interface ShiftCoveragePanelProps {
  isOpen: boolean;
  onToggle: () => void;
  onNavigateToRoster?: () => void;
}

export function ShiftCoveragePanel({
  isOpen,
  onToggle,
  onNavigateToRoster,
}: ShiftCoveragePanelProps) {
  const activeShift = useActiveShift();
  const [activeTab, setActiveTab] = useState<FilterTabOption>("Semua");

  const rosterMembers: TeamMemberItem[] = useMemo(() => {
    return defaultRosterMembers;
  }, []);

  const counts: StatusCounts = useMemo(() => {
    let onDuty = 0;
    let standby = 0;
    let offline = 0;

    for (const m of rosterMembers) {
      if (m.status === "On Duty") onDuty++;
      else if (m.status === "Standby") standby++;
      else offline++;
    }

    return {
      total: rosterMembers.length,
      onDuty,
      standby,
      offline,
      bertugas: onDuty,
    };
  }, [rosterMembers]);

  const filteredMembers = useMemo(() => {
    if (activeTab === "Semua") return rosterMembers;
    if (activeTab === "Offline" || (activeTab as string) === "Out of Reach") {
      return rosterMembers.filter((m) => m.status === "Offline");
    }
    return rosterMembers.filter((m) => m.status === activeTab);
  }, [rosterMembers, activeTab]);

  return (
    <>
      {/* ── Toggle Tab Handle (always visible on right edge, GPU-transformed) ── */}
      <button
        type="button"
        className={`shift-panel-toggle-tab fixed right-0 top-1/2 z-[80] flex flex-col items-center gap-[6px] p-[12px_6px] max-[660px]:p-[10px_5px] rounded-l-[10px] cursor-pointer bg-[var(--panel-bg,#1e293b)] border border-[var(--line,rgba(255,255,255,0.08))] text-[var(--ink-muted,#94a3b8)] font-['Plus_Jakarta_Sans',sans-serif] text-[10px] font-semibold will-change-transform [transition:transform_0.35s_cubic-bezier(0.16,_1,_0.3,_1),_background_0.2s_ease,_color_0.2s_ease,_border-color_0.2s_ease] [box-shadow:-2px_0_12px_rgba(0,_0,_0,_0.15)] hover:bg-[var(--panel-bg-hover,#283548)] hover:text-[var(--ink-primary,#e2e8f0)] hover:pr-[10px] focus-visible:outline-2 focus-visible:outline-[var(--accent-blue,#38bdf8)] focus-visible:outline-offset-2 ${
          isOpen
            ? "shift-panel-toggle-active [transform:translate3d(-300px,_-50%,_0)] max-[940px]:[transform:translate3d(-280px,_-50%,_0)] max-[660px]:[transform:translate3d(-260px,_-50%,_0)]"
            : "[transform:translate3d(0,_-50%,_0)]"
        }`}
        onClick={onToggle}
        aria-label={isOpen ? "Tutup panel roster tim" : "Buka panel roster tim"}
        title={isOpen ? "Tutup Roster Tim" : "Buka Roster Tim"}
      >
        <Users size={16} strokeWidth={2} />
        <span className="shift-panel-toggle-badge flex items-center justify-center w-[20px] h-[20px] max-[660px]:w-[18px] max-[660px]:h-[18px] rounded-[50%] bg-[linear-gradient(135deg,#22c55e,#16a34a)] text-[#ffffff] text-[10px] max-[660px]:text-[9px] font-bold leading-none [box-shadow:0_2px_6px_rgba(34,_197,_94,_0.3)]">{counts.onDuty}</span>
        {isOpen ? (
          <ChevronRight size={12} className="shift-panel-toggle-chevron opacity-50 [transition:opacity_0.2s] hover:opacity-100" />
        ) : (
          <ChevronLeft size={12} className="shift-panel-toggle-chevron opacity-50 [transition:opacity_0.2s] hover:opacity-100" />
        )}
      </button>

      {/* ── Overlay Backdrop (frosted glass / efek berembun & dismiss on outside click) ── */}
      {isOpen && (
        <div
          className="shift-panel-backdrop fixed inset-0 z-[74] bg-[rgba(10,15,29,0.45)] backdrop-blur-[4px] [-webkit-backdrop-filter:blur(4px)] animate-[shift-backdrop-in_0.25s_ease] cursor-pointer"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* ── Panel ── */}
      <aside
        className={`shift-coverage-panel fixed top-0 right-0 bottom-0 w-[300px] max-[940px]:w-[280px] z-[75] flex flex-col bg-[var(--panel-bg,#1e293b)] [border-left:1px_solid_var(--line,rgba(255,255,255,0.08))] [box-shadow:-6px_0_32px_rgba(0,_0,_0,_0.35)] will-change-transform [backface-visibility:hidden] [transition:transform_0.35s_cubic-bezier(0.16,_1,_0.3,_1)] overflow-hidden ${
          isOpen ? "shift-panel-open [transform:translateX(0)]" : "shift-panel-closed [transform:translateX(100%)] pointer-events-none"
        }`}
        aria-label="Panel Roster Tim & Shift Coverage"
        role="complementary"
      >
        {/* Panel Header */}
        <div className="shift-panel-header shift-coverage-header flex flex-col items-center justify-center text-center p-[16px_20px_14px] [border-bottom:1px_solid_var(--line)] bg-[var(--panel-bg)] shrink-0">
          <div className="shift-panel-header-text flex flex-col items-center gap-[3px]">
            <h3 className="shift-panel-title text-[15px] font-bold text-[var(--ink-primary,#e2e8f0)] m-0 tracking-[0.01em]">Roster Tim</h3>
            <span className="shift-panel-subtitle text-[11.5px] font-semibold text-[var(--ink-muted,#94a3b8)] uppercase tracking-[0.08em]">Shift Coverage</span>
          </div>
        </div>

        {/* Panel Content (Flex container with fixed top & scrollable user list) */}
        <div className="shift-panel-content flex-1 min-h-0 flex flex-col overflow-hidden p-[12px_14px_8px] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-[rgba(255,255,255,0.1)] [&::-webkit-scrollbar-thumb]:rounded-[10px] [&::-webkit-scrollbar-track]:bg-transparent">
          {/* Top Fixed Section: Donut Chart, Stats, Filter Tabs */}
          <div className="shift-panel-top-controls shrink-0 flex flex-col">
            <CoverageDonutChart counts={counts} />
            <StatsRow counts={counts} />
            <StatusFilterTabs
              activeTab={activeTab}
              onSelectTab={setActiveTab}
              counts={counts}
            />
          </div>

          {/* Dedicated Scrollable User List Section */}
          <div className="shift-panel-user-list-scroll flex-1 min-h-0 overflow-y-auto overflow-x-hidden mt-[8px] pr-[2px] [scrollbar-width:thin] [scrollbar-color:rgba(56,189,248,0.35)_rgba(255,255,255,0.03)] [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-track]:bg-[rgba(255,255,255,0.02)] [&::-webkit-scrollbar-track]:rounded-[4px] [&::-webkit-scrollbar-thumb]:bg-[rgba(56,189,248,0.3)] [&::-webkit-scrollbar-thumb]:rounded-[4px] [&::-webkit-scrollbar-thumb:hover]:bg-[rgba(56,189,248,0.55)]">
            <MemberList
              members={filteredMembers}
              activeTab={activeTab}
            />
          </div>
        </div>

        {/* Panel Footer */}
        <div className="shift-panel-footer shift-coverage-footer p-[12px_14px_14px] [border-top:1px_solid_var(--line,rgba(255,255,255,0.08))] shrink-0 box-border w-full">
          <button
            type="button"
            className="full-width-button flex items-center justify-center gap-[8px] w-full h-auto min-h-[38px] m-0 p-[10px_14px] box-border border border-[rgba(99,102,241,0.35)] rounded-[10px] cursor-pointer bg-[linear-gradient(135deg,rgba(99,102,241,0.22),rgba(139,92,246,0.16))] text-[#c7d2fe] font-['Plus_Jakarta_Sans',sans-serif] text-[12.5px] font-semibold text-center [transition:background_0.2s_ease,_border-color_0.2s_ease,_color_0.2s_ease] [box-shadow:none] [transform:none] hover:bg-[linear-gradient(135deg,rgba(99,102,241,0.32),rgba(139,92,246,0.25))] hover:text-[#ffffff] hover:border-[rgba(99,102,241,0.55)] active:bg-[rgba(99,102,241,0.28)]"
            onClick={() => {
              if (onNavigateToRoster) {
                onNavigateToRoster();
              }
              if (typeof window !== "undefined" && window.innerWidth <= 940) {
                onToggle();
              }
            }}
          >
            <span>Lihat jadwal shift roster</span>
            <span className="shift-panel-btn-arrow text-[14px] inline-block [transform:none]" aria-hidden="true">→</span>
          </button>
        </div>
      </aside>
    </>
  );
}
