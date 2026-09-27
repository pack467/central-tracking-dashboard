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
      {/* ── Toggle Tab Handle (always visible on right edge) ── */}
      <button
        type="button"
        className={`shift-panel-toggle-tab ${isOpen ? "shift-panel-toggle-active" : ""}`}
        onClick={onToggle}
        aria-label={isOpen ? "Tutup panel roster tim" : "Buka panel roster tim"}
        title={isOpen ? "Tutup Roster Tim" : "Buka Roster Tim"}
      >
        <Users size={16} strokeWidth={2} />
        <span className="shift-panel-toggle-badge">{counts.onDuty}</span>
        {isOpen ? (
          <ChevronRight size={12} className="shift-panel-toggle-chevron" />
        ) : (
          <ChevronLeft size={12} className="shift-panel-toggle-chevron" />
        )}
      </button>

      {/* ── Mobile Backdrop ── */}
      {isOpen && (
        <div
          className="shift-panel-backdrop"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* ── Panel ── */}
      <aside
        className={`shift-coverage-panel ${isOpen ? "shift-panel-open" : "shift-panel-closed"}`}
        aria-label="Panel Roster Tim & Shift Coverage"
        role="complementary"
      >
        {/* Panel Header */}
        <div className="shift-panel-header shift-coverage-header">
          <div className="shift-panel-header-text">
            <h3 className="shift-panel-title">Roster Tim</h3>
            <span className="shift-panel-subtitle">Shift Coverage</span>
          </div>
        </div>

        {/* Panel Content */}
        <div className="shift-panel-content">
          <CoverageDonutChart counts={counts} />
          <StatsRow counts={counts} />
          <StatusFilterTabs
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            counts={counts}
          />
          <MemberList
            members={filteredMembers}
            activeTab={activeTab}
          />
        </div>

        {/* Panel Footer */}
        <div className="shift-panel-footer shift-coverage-footer">
          <button
            type="button"
            className="full-width-button"
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
            <span className="shift-panel-btn-arrow" aria-hidden="true">→</span>
          </button>
        </div>
      </aside>
    </>
  );
}
