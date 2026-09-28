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
        className={`shift-panel-toggle-tab [position:fixed] [right:0] [top:50%] [z-index:80] [display:flex] [flex-direction:column] [align-items:center] [gap:6px] [padding:12px_6px] [border-radius:10px_0_0_10px] [cursor:pointer] [background:var(--panel-bg,_#1e293b)]! [border:1px_solid_var(--line,_rgba(255,_255,_255,_0.08))]! [border-right:none]! [color:var(--ink-muted,_#94a3b8)] [font-family:var(--font-primary,_'Plus_Jakarta_Sans',_sans-serif)]! [font-size:10px]! [font-weight:600] [will-change:transform] [transition:transform_0.35s_cubic-bezier(0.16,_1,_0.3,_1),_background_0.2s_ease,_color_0.2s_ease,_border-color_0.2s_ease] [box-shadow:-2px_0_12px_rgba(0,_0,_0,_0.15)] [@media(max-width:660px)]:[padding:10px_5px] [&:hover]:[background:var(--panel-bg-hover,_#283548)]! [&:hover]:[color:var(--ink-primary,_#e2e8f0)] [&:hover]:[padding-right:10px] ${
          isOpen
            ? "shift-panel-toggle-active [background:var(--panel-bg,_#1e293b)]! [color:var(--ink-muted,_#94a3b8)] [border-color:var(--line,_rgba(255,_255,_255,_0.08))]! [transform:translate3d(-300px,_-50%,_0)]! [@media(max-width:940px)]:[transform:translate3d(-280px,_-50%,_0)]! [@media(max-width:660px)]:[transform:translate3d(-260px,_-50%,_0)]!"
            : "[transform:translate3d(0,_-50%,_0)]"
        }`}
        onClick={onToggle}
        aria-label={isOpen ? "Tutup panel roster tim" : "Buka panel roster tim"}
        title={isOpen ? "Tutup Roster Tim" : "Buka Roster Tim"}
      >
        <Users size={16} strokeWidth={2} />
        <span className="shift-panel-toggle-badge [display:flex] [align-items:center] [justify-content:center] [width:20px] [height:20px] [border-radius:50%] [background:linear-gradient(135deg,_#22c55e,_#16a34a)] [color:#fff] [font-size:10px] [font-weight:700] [line-height:1] [box-shadow:0_2px_6px_rgba(34,_197,_94,_0.3)] [@media(max-width:660px)]:[width:18px] [@media(max-width:660px)]:[height:18px] [@media(max-width:660px)]:[font-size:9px]">{counts.onDuty}</span>
        {isOpen ? (
          <ChevronRight size={12} className="shift-panel-toggle-chevron [opacity:0.5] [transition:opacity_0.2s]" />
        ) : (
          <ChevronLeft size={12} className="shift-panel-toggle-chevron [opacity:0.5] [transition:opacity_0.2s]" />
        )}
      </button>

      {/* ── Overlay Backdrop (frosted glass / efek berembun & dismiss on outside click) ── */}
      {isOpen && (
        <div
          className="shift-panel-backdrop [position:fixed] [inset:0] [z-index:74] [background:rgba(10,_15,_29,_0.45)] [backdrop-filter:blur(4px)] [-webkit-backdrop-filter:blur(4px)] [animation:shift-backdrop-in_0.25s_ease] [cursor:pointer]"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* ── Panel ── */}
      <aside
        className={`shift-coverage-panel [position:fixed] [top:0] [right:0] [bottom:0] [width:300px] [z-index:75] [display:flex] [flex-direction:column] [background:var(--panel-bg,_#1e293b)] [border-left:1px_solid_var(--line,_rgba(255,_255,_255,_0.08))] [box-shadow:-6px_0_32px_rgba(0,_0,_0,_0.35)] [transform:translateX(100%)] [will-change:transform] [backface-visibility:hidden] [transition:transform_0.35s_cubic-bezier(0.16,_1,_0.3,_1)] [overflow:hidden] [@media(max-width:940px)]:[width:280px] [@media(max-width:660px)]:[width:260px] ${isOpen ? "shift-panel-open [transform:translateX(0)]!" : "shift-panel-closed [transform:translateX(100%)]! [pointer-events:none]!"}`}
        aria-label="Panel Roster Tim & Shift Coverage"
        role="complementary"
      >
        {/* Panel Header */}
        <div className="shift-panel-header shift-coverage-header [display:flex] [align-items:center] [justify-content:center] [padding:18px_18px_14px] [border-bottom:1px_solid_var(--line,_rgba(255,_255,_255,_0.08))] [flex-shrink:0] [text-align:center]">
          <div className="shift-panel-header-text [display:flex] [flex-direction:column] [align-items:center] [gap:3px]">
            <h3 className="shift-panel-title [font-size:15px] [font-weight:700] [color:var(--ink-primary,_#e2e8f0)] [margin:0] [letter-spacing:0.01em]">Roster Tim</h3>
            <span className="shift-panel-subtitle [font-size:11.5px] [font-weight:600] [color:var(--ink-muted,_#94a3b8)] [text-transform:uppercase] [letter-spacing:0.08em]">Shift Coverage</span>
          </div>
        </div>

        {/* Panel Content (Flex container with fixed top & scrollable user list) */}
        <div className="shift-panel-content [flex:1] [min-height:0] [display:flex] [flex-direction:column] [overflow:hidden] [padding:12px_14px_8px]">
          {/* Top Fixed Section: Donut Chart, Stats, Filter Tabs */}
          <div className="shift-panel-top-controls [flex-shrink:0] [display:flex] [flex-direction:column]">
            <CoverageDonutChart counts={counts} />
            <StatsRow counts={counts} />
            <StatusFilterTabs
              activeTab={activeTab}
              onSelectTab={setActiveTab}
              counts={counts}
            />
          </div>

          {/* Dedicated Scrollable User List Section */}
          <div className="shift-panel-user-list-scroll [flex:1] [min-height:0] [overflow-y:auto] [overflow-x:hidden] [margin-top:8px] [padding-right:2px] [scrollbar-width:thin] [scrollbar-color:rgba(56,_189,_248,_0.35)_rgba(255,_255,_255,_0.03)]">
            <MemberList
              members={filteredMembers}
              activeTab={activeTab}
            />
          </div>
        </div>

        {/* Panel Footer */}
        <div className="shift-panel-footer shift-coverage-footer [padding:12px_14px_14px] [border-top:1px_solid_var(--line,_rgba(255,_255,_255,_0.08))] [flex-shrink:0] [box-sizing:border-box] [width:100%]">
          <button
            type="button"
            className="full-width-button [display:flex] [align-items:center] [justify-content:center]! [gap:8px] [width:100%]! [height:auto]! [min-height:38px] [margin:0]! [padding:10px_14px]! [box-sizing:border-box] [border:1px_solid_rgba(99,_102,_241,_0.35)]! [border-radius:10px]! [cursor:pointer] [background:linear-gradient(135deg,_rgba(99,_102,_241,_0.22),_rgba(139,_92,_246,_0.16))]! [color:#c7d2fe]! [font-family:var(--font-primary,_'Plus_Jakarta_Sans',_sans-serif)]! [font-size:12.5px]! [font-weight:600] [text-align:center] [transition:background_0.2s_ease,_border-color_0.2s_ease,_color_0.2s_ease]! [box-shadow:none] [transform:none] [&:hover]:[background:linear-gradient(135deg,_rgba(99,_102,_241,_0.32),_rgba(139,_92,_246,_0.25))]! [&:hover]:[color:#ffffff] [&:hover]:[border-color:rgba(99,_102,_241,_0.55)]! [&:active]:[background:rgba(99,_102,_241,_0.28)]!"
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
            <span className="shift-panel-btn-arrow [font-size:14px] [display:inline-block] [transform:none]" aria-hidden="true">→</span>
          </button>
        </div>
      </aside>
    </>
  );
}
