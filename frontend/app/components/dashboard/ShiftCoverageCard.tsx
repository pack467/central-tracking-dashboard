"use client";

import { useToast } from "@/app/components/ui/Toast";
import { initials } from "@/app/lib/data";
import { Avatar } from "@/app/components/ui/Avatar";
import { StatusIndicator } from "@/app/components/ui/StatusIndicator";
import { useActiveShift } from "@/app/hooks/useLiveClock";
import { useUserStatus, getStatusRingStyle } from "@/app/hooks/useUserStatus";
import { ShiftInfo } from "@/app/lib/shifts";
import { useMemo, useState } from "react";
import { Moon, Sun, Sunset, Users, UserCheck, Clock, UserX } from "lucide-react";

export type CanonicalStatus = "On Duty" | "Standby" | "Offline";

export interface TeamMemberItem {
  id?: string;
  name: string;
  role: string;
  initials?: string;
  status: CanonicalStatus;
}

export interface StatusCounts {
  total: number;
  onDuty: number;
  standby: number;
  offline: number;
  bertugas?: number; // backwards compatibility alias for onDuty
}

export type FilterTabOption = "Semua" | "On Duty" | "Standby" | "Offline" | "Out of Reach";

/**
 * Resolves any raw status string to one of three canonical states:
 * 1. "On Duty" (Active shift work)
 * 2. "Standby" (Logged in, available, between tasks / on break)
 * 3. "Offline" (Disconnected / off shift / on leave)
 */
export function resolveCanonicalStatus(rawStatus?: string): CanonicalStatus {
  const s = (rawStatus || "").toLowerCase().trim();
  if (
    s === "on duty" ||
    s === "on_duty" ||
    s === "sedang bertugas" ||
    s === "bertugas" ||
    s === "active" ||
    s === "aktif" ||
    s === "present"
  ) {
    return "On Duty";
  }
  if (
    s === "standby" ||
    s === "standby / online" ||
    s === "standby/online" ||
    s === "online" ||
    s === "break" ||
    s === "on break" ||
    s === "on_break"
  ) {
    return "Standby";
  }
  return "Offline";
}

/**
 * Default team roster member dataset with representation in all three states:
 * - 3 members On Duty (actively working shift)
 * - 2 members Standby (available, not actively on shift duty)
 * - 4 members Offline (off shift / disconnected / leave)
 */
export const defaultRosterMembers: TeamMemberItem[] = [
  {
    id: "mem-1",
    name: "Mhd. Galih Khairi",
    role: "Operator NOC",
    initials: "GK",
    status: "On Duty",
  },
  {
    id: "mem-2",
    name: "Pangondion Kurniawan Naibaho",
    role: "Shift Lead",
    initials: "PK",
    status: "On Duty",
  },
  {
    id: "mem-3",
    name: "Muhammad Ihsanul Arifin",
    role: "L2 Specialist",
    initials: "MI",
    status: "On Duty",
  },
  {
    id: "mem-4",
    name: "Kristina Marbun",
    role: "Operator NOC",
    initials: "KM",
    status: "Standby",
  },
  {
    id: "mem-5",
    name: "Pedro Hutagaol",
    role: "Incident Coordinator",
    initials: "PH",
    status: "Standby",
  },
  {
    id: "mem-7",
    name: "Tahan Julianus Nadeak",
    role: "Incident Coordinator",
    initials: "TN",
    status: "Offline",
  },
  {
    id: "mem-8",
    name: "Yuha Azhari Simbolon",
    role: "Operator NOC",
    initials: "YS",
    status: "Offline",
  },
  {
    id: "mem-9",
    name: "Nicholas Bima Nooka Putra",
    role: "Infrastructure Engineer",
    initials: "NP",
    status: "Offline",
  },
  {
    id: "mem-11",
    name: "Natanael Tambun",
    role: "Shift Lead",
    initials: "NT",
    status: "Offline",
  },
];

/* ─────────────────────────────────────────────────────────────
   1. PanelHeader: Title, Subtitle, and Shift Badge
───────────────────────────────────────────────────────────── */
export interface PanelHeaderProps {
  shift: ShiftInfo;
}

export function PanelHeader({ shift }: PanelHeaderProps) {
  const ShiftIcon =
    shift.id === "subuh" ? Moon : shift.id === "pagi" ? Sun : Sunset;

  return (
    <div className="shift-coverage-header flex flex-col items-center text-center p-[16px_20px_14px] border-b border-[var(--line)] bg-[var(--panel-bg)]">
      {/* Line 1: Main Title */}
      <h2 className="panel-title shift-coverage-title m-0 text-[var(--ink-primary)] text-[15px] font-bold leading-[1.2] justify-center text-center">Roster Tim</h2>

      {/* Line 2: Subtitle */}
      <span className="shift-coverage-subtitle block mt-[3px] text-[var(--ink-secondary)] text-[11.5px] font-medium leading-[1.2] text-center">Shift Coverage</span>

      {/* Line 3: Shift Badge */}
      <div className="shift-coverage-badge-row flex items-center justify-center mt-[8px]">
        <div
          className={`topbar-shift-badge inline-flex items-center gap-[6px] px-[12px] py-[4px] rounded-[999px] text-[11px] leading-[1.2] shadow-[0_1px_3px_rgba(0,0,0,0.25)] ${shift.badgeClass}`}
          title={`Shift Aktif: ${shift.name}`}
          aria-label={`Shift aktif ${shift.name}`}
        >
          <ShiftIcon size={12} className="shift-badge-icon" />
          <span className="shift-badge-label">
            <strong>{shift.label}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   2. CoverageDonutChart: Proportional Visual Status Distribution
───────────────────────────────────────────────────────────── */
export interface CoverageDonutChartProps {
  counts: StatusCounts;
}

export function CoverageDonutChart({ counts }: CoverageDonutChartProps) {
  const chartData = useMemo(
    () => [
      {
        label: "On Duty",
        count: counts.onDuty,
        color: "#22c55e",
        gradientId: "donut-grad-onduty",
      },
      {
        label: "Standby",
        count: counts.standby,
        color: "#38bdf8",
        gradientId: "donut-grad-standby",
      },
      {
        label: "Out of Reach",
        count: counts.offline,
        color: "#64748b",
        gradientId: "donut-grad-offline",
      },
    ],
    [counts]
  );

  // Bold & substantial stroke width (up from 6.5px to 11.5px)
  const radius = 45;
  const strokeWidth = 11.5;
  const cx = 60;
  const cy = 60;

  const renderDonutSlices = () => {
    const totalVal = chartData.reduce((acc, curr) => acc + curr.count, 0);
    if (totalVal === 0) {
      return null;
    }

    const circumference = 2 * Math.PI * radius;
    const activeSlices = chartData.filter((item) => item.count > 0);

    if (activeSlices.length === 1) {
      const item = activeSlices[0];
      return (
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={`url(#${item.gradientId})`}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={0}
          strokeLinecap="butt"
          className="coverage-donut-segment pointer-events-none [transform:none] [transition:none] [cursor:default]"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      );
    }

    // With strokeLinecap="round", each cap adds strokeWidth / 2 on both ends (total = strokeWidth).
    // Adding 4px visual spacing gives clean separation between rounded pills:
    const totalGap = strokeWidth + 4;
    let accumulatedAngle = 0;

    return activeSlices.map((item, idx) => {
      const slicePct = item.count / totalVal;
      const rawLength = slicePct * circumference;
      const visibleLength = Math.max(0.1, rawLength - totalGap);
      const strokeDasharray = `${visibleLength} ${circumference - visibleLength}`;
      const strokeDashoffset = -(
        accumulatedAngle * circumference +
        totalGap / 2
      );
      accumulatedAngle += slicePct;

      return (
        <circle
          key={`${item.label}-${idx}`}
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={`url(#${item.gradientId})`}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="coverage-donut-segment pointer-events-none [transform:none] [transition:none] [cursor:default]"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      );
    });
  };

  return (
    <div className="shift-coverage-donut-section flex justify-center items-center my-[14px_12px]">
      <div className="donut-chart-wrap shift-coverage-donut-wrap w-[124px] h-[124px] relative">
        <svg
          className="coverage-donut-svg w-full h-full overflow-visible pointer-events-none"
          viewBox="0 0 120 120"
          aria-label={`Distribusi status roster: ${counts.onDuty} On Duty, ${counts.standby} Standby, ${counts.offline} Out of Reach`}
        >
          <defs>
            <linearGradient id="donut-grad-onduty" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>
            <linearGradient id="donut-grad-standby" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
            <linearGradient id="donut-grad-offline" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
          </defs>

          {/* Outer high-tech dotted calibration ring */}
          <circle
            cx={cx}
            cy={cy}
            r={radius + strokeWidth / 2 + 2.5}
            fill="none"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth={1}
            strokeDasharray="2 3"
          />

          {/* Background track groove */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.06)"
            strokeWidth={strokeWidth}
          />

          {/* Inner dial plate */}
          <circle
            cx={cx}
            cy={cy}
            r={radius - strokeWidth / 2 - 1.5}
            fill="rgba(15, 23, 42, 0.55)"
            stroke="rgba(255, 255, 255, 0.04)"
            strokeWidth={1}
          />

          {renderDonutSlices()}
        </svg>
        <div className="coverage-donut-center absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="coverage-donut-total-num text-[26px] font-extrabold font-mono text-white leading-none">{counts.total}</span>
          <span className="coverage-donut-total-label text-[9px] font-bold font-mono tracking-[1.5px] text-[var(--ink-muted)] mt-[4px]">TOTAL</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   3. StatsRow: 3-State Summary (On Duty · Standby · Offline)
───────────────────────────────────────────────────────────── */
export interface StatsRowProps {
  counts: StatusCounts;
}

export function StatsRow({ counts }: StatsRowProps) {
  return (
    <div className="shift-coverage-stats-row flex flex-wrap items-center justify-center gap-[8px] mt-[6px] mx-[16px] mb-0" aria-label="Ringkasan status roster">
      <span
        className="coverage-stat-pill coverage-stat-on-duty coverage-stat-bertugas inline-flex items-center gap-[6px] px-[10px] py-[4px] h-[24px] box-border rounded-[999px] text-[11px] font-semibold leading-none select-none whitespace-nowrap text-[#4ade80] bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.25)]"
        title="Jumlah anggota On Duty"
      >
        <span className="coverage-stat-dot dot-bertugas w-[6px] h-[6px] rounded-[50%] bg-[#22c55e] [box-shadow:0_0_5px_rgba(34,197,94,0.6)]" aria-hidden="true" />
        <span className="coverage-stat-text">{counts.onDuty} On Duty</span>
      </span>
      <span
        className="coverage-stat-pill coverage-stat-standby inline-flex items-center gap-[6px] px-[10px] py-[4px] h-[24px] box-border rounded-[999px] text-[11px] font-semibold leading-none select-none whitespace-nowrap text-[#38bdf8] bg-[rgba(56,189,248,0.1)] border border-[rgba(56,189,248,0.25)]"
        title="Jumlah anggota Standby"
      >
        <span className="coverage-stat-dot dot-standby w-[6px] h-[6px] rounded-[50%] bg-[#38bdf8] [box-shadow:0_0_5px_rgba(56,189,248,0.6)]" aria-hidden="true" />
        <span className="coverage-stat-text">{counts.standby} Standby</span>
      </span>
      <span
        className="coverage-stat-pill coverage-stat-offline inline-flex items-center gap-[6px] px-[10px] py-[4px] h-[24px] box-border rounded-[999px] text-[11px] font-semibold leading-none select-none whitespace-nowrap text-[#94a3b8] bg-[rgba(148,163,184,0.08)] border border-[rgba(148,163,184,0.2)]"
        title="Jumlah anggota Out of Reach"
      >
        <span className="coverage-stat-dot dot-offline w-[6px] h-[6px] rounded-[50%] bg-[#64748b]" aria-hidden="true" />
        <span className="coverage-stat-text">{counts.offline} Out of Reach</span>
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   4. StatusFilterTabs: Clickable Filter Control (Semua, On Duty, Standby, Out of Reach)
   Container: flex, gap: 8px, overflow-x: auto, overflow-y: hidden
   Buttons: flex-shrink: 0, white-space: nowrap
───────────────────────────────────────────────────────────── */
export interface StatusFilterTabsProps {
  activeTab: FilterTabOption;
  onSelectTab: (tab: FilterTabOption) => void;
  counts: StatusCounts;
}

export function StatusFilterTabs({
  activeTab,
  onSelectTab,
  counts,
}: StatusFilterTabsProps) {
  const getTabIcon = (id: string, isSelected: boolean) => {
    const base = "tab-icon w-[14px] h-[14px] shrink-0 [transition:all] group-hover:opacity-100";
    const op = isSelected ? "opacity-100" : "opacity-85";
    if (id === "Semua") return <Users size={14} className={`${base} ${op}`} aria-hidden="true" />;
    if (id === "On Duty") return <UserCheck size={14} className={`tab-icon-onduty ${base} ${op} ${isSelected ? "text-[#22c55e]" : ""}`} aria-hidden="true" />;
    if (id === "Standby") return <Clock size={14} className={`tab-icon-standby ${base} ${op} ${isSelected ? "text-[#0ea5e9]" : ""}`} aria-hidden="true" />;
    return <UserX size={14} className={`tab-icon-offline ${base} ${op} ${isSelected ? "text-[#94a3b8]" : ""}`} aria-hidden="true" />;
  };

  const tabs: {
    id: FilterTabOption;
    label: string;
    count: number;
  }[] = [
    { id: "Semua", label: "Semua", count: counts.total },
    { id: "On Duty", label: "On Duty", count: counts.onDuty },
    { id: "Standby", label: "Standby", count: counts.standby },
    { id: "Offline", label: "Out of Reach", count: counts.offline },
  ];

  return (
    <div className="roster-filter-tabs-wrapper w-full box-border mt-[12px] p-[10px_12px_6px] [border-top:1px_solid_var(--line)] [.shift-panel-content_&]:p-0 [.shift-panel-content_&]:[border-top:none] [.shift-panel-content_&]:mb-[10px]">
      <div
        className="filter-tabs roster-filter-tabs grid grid-cols-[repeat(4,minmax(0,1fr))] gap-[4px] p-[3px] rounded-[7px] [.shift-panel-content_&]:rounded-[8px] bg-[var(--bg)] border border-[var(--line)] w-full box-border"
        role="tablist"
        aria-label="Filter status anggota roster"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`group min-w-0 p-[6px_3px] [.shift-panel-content_&]:p-[6px_4px] rounded-[5px] text-[10.5px] [.shift-panel-content_&]:text-[11px] font-semibold inline-flex items-center justify-center gap-[4px] whitespace-nowrap cursor-pointer [transition:all_0.15s_ease] border ${
              activeTab === tab.id
                ? "selected text-[var(--accent-blue)] bg-[var(--panel-bg)] border-[rgba(96,165,250,0.25)] [box-shadow:var(--shadow-sm)]"
                : "text-[var(--ink-muted)] bg-transparent border-transparent hover:text-[var(--ink-primary)] hover:bg-[rgba(255,255,255,0.04)]"
            }`}
            onClick={() => onSelectTab(tab.id)}
            title={`${tab.label} (${tab.count})`}
            aria-label={`${tab.label} (${tab.count})`}
          >
            {getTabIcon(tab.id, activeTab === tab.id)}
            <span className={`tab-count-badge inline-flex items-center justify-center min-w-[16px] h-[16px] px-[4px] rounded-[99px] text-[9.5px] font-mono font-bold shrink-0 ${
              activeTab === tab.id
                ? "bg-[rgba(96,165,250,0.2)] text-[var(--accent-blue)]"
                : "bg-[rgba(148,163,184,0.18)] text-inherit"
            }`}>{tab.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   5. RosterMemberRow: Two-Column Flex Layout
      Left: Avatar + Name + Role (flex: 1, min-width: 0)
      Right: StatusIndicator pill (flex-shrink: 0, white-space: nowrap)
───────────────────────────────────────────────────────────── */
export interface RosterMemberRowProps {
  member: TeamMemberItem;
  onClick: (member: TeamMemberItem) => void;
}

export function RosterMemberRow({ member, onClick }: RosterMemberRowProps) {
  const { userStatus } = useUserStatus();
  const isCurrentUser = member.name.toLowerCase().includes("galih");
  const ringStyle = getStatusRingStyle(member.status, isCurrentUser, userStatus);
  const ringColor = (ringStyle as any)["--status-ring-color"] || "#22c55e";

  const indicatorStatus = isCurrentUser
    ? userStatus === "Online"
      ? "bertugas"
      : userStatus === "Busy"
      ? "critical"
      : userStatus === "On Break"
      ? "online"
      : "offline"
    : member.status === "On Duty"
    ? "bertugas"
    : member.status === "Standby"
    ? "online"
    : "offline";

  const displayStatusLabel = isCurrentUser
    ? userStatus
    : member.status === "Offline"
    ? "Out of Reach"
    : member.status;

  return (
    <button
      type="button"
      className="roster-member-row flex items-center [.shift-coverage-card_&]:justify-between w-full gap-[12px] p-[7px_8px] [.shift-coverage-card_&]:p-[8px] m-0 text-[var(--ink-primary)] text-left bg-transparent border-none [.shift-coverage-card_&]:border-b [.shift-coverage-card_&]:border-solid [.shift-coverage-card_&]:border-[var(--line)] [.shift-coverage-card_&]:last:border-b-0 cursor-pointer rounded-[8px] [.shift-coverage-card_&]:rounded-[6px] [transition:background_0.15s_ease] box-border hover:bg-[rgba(148,163,184,0.08)]"
      onClick={() => onClick(member)}
    >
      <div className="roster-member-left flex items-center gap-[10px] flex-1 min-w-0">
        <div
          className="roster-avatar-ring-wrapper"
          style={ringStyle as React.CSSProperties}
          title={`${member.name} (${displayStatusLabel})`}
        >
          <Avatar size="sm" name={member.name} className="shift-coverage-avatar shrink-0" />
          <span
            className="roster-avatar-status-badge"
            style={{ backgroundColor: ringColor }}
          />
        </div>
        <div className="flex flex-col flex-1 min-w-0 gap-[2px]">
          <span className="roster-member-name text-[12.5px] [.shift-coverage-card_&]:text-[11.5px] font-semibold text-[var(--ink-primary)] whitespace-nowrap overflow-hidden text-ellipsis leading-[1.3]" title={member.name}>
            {member.name}
          </span>
          <small className="roster-member-role text-[10.5px] [.shift-coverage-card_&]:text-[10px] text-[var(--ink-muted)] font-normal whitespace-nowrap overflow-hidden text-ellipsis mt-[1px] leading-[1.2]">{member.role}</small>
        </div>
      </div>
      <div className="roster-member-right shrink-0 whitespace-nowrap flex items-center">
        <StatusIndicator status={indicatorStatus} label={displayStatusLabel} size="sm" />
      </div>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   6. MemberList: Scrollable List with Empty-State Handling
───────────────────────────────────────────────────────────── */
export interface MemberListProps {
  members: TeamMemberItem[];
  activeTab: FilterTabOption;
  onSelectMember?: (member: TeamMemberItem) => void;
}

export function MemberList({
  members,
  activeTab,
  onSelectMember,
}: MemberListProps) {
  const notify = useToast();

  const handleMemberClick = (member: TeamMemberItem) => {
    if (onSelectMember) {
      onSelectMember(member);
    } else {
      notify.info(`${member.name}: detail anggota shift dimuat.`, {
        id: `team-member-${member.name.toLowerCase().replace(/\s+/g, "-")}`,
      });
    }
  };

  if (members.length === 0) {
    const emptyMessage =
      activeTab === "On Duty"
        ? "Tidak ada anggota on duty saat ini."
        : activeTab === "Standby"
        ? "Tidak ada anggota standby saat ini."
        : activeTab === "Offline" || (activeTab as string) === "Out of Reach"
        ? "Tidak ada anggota out of reach saat ini."
        : "Tidak ada anggota tim ditemukan.";

    return (
      <div className="coverage-team shift-coverage-team-list flex items-center justify-center min-h-[120px]">
        <div className="p-[24px_16px] text-center text-[var(--ink-muted)] text-[11.5px] leading-[1.4] flex flex-col items-center justify-center">
          <p className="m-0 text-[11.5px] text-[var(--ink-muted)]">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="coverage-team shift-coverage-team-list [.shift-coverage-card_&]:p-[8px_16px] [.shift-coverage-card_&]:flex [.shift-coverage-card_&]:flex-col [.shift-coverage-card_&]:max-h-[320px] [.shift-coverage-card_&]:overflow-y-auto [.shift-coverage-card_&]:[scrollbar-width:thin] [.shift-coverage-card_&]:[scrollbar-color:rgba(56,189,248,0.25)_transparent] [.shift-coverage-card_&]:[&::-webkit-scrollbar]:w-[4px] [.shift-coverage-card_&]:[&::-webkit-scrollbar-track]:bg-[rgba(148,163,184,0.05)] [.shift-coverage-card_&]:[&::-webkit-scrollbar-track]:rounded-[4px] [.shift-coverage-card_&]:[&::-webkit-scrollbar-thumb]:bg-[rgba(56,189,248,0.25)] [.shift-coverage-card_&]:[&::-webkit-scrollbar-thumb]:rounded-[4px] [.shift-coverage-card_&]:[&::-webkit-scrollbar-thumb:hover]:bg-[rgba(56,189,248,0.45)]">
      {members.map((member) => (
        <RosterMemberRow
          key={member.id || member.name}
          member={member}
          onClick={handleMemberClick}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   7. PanelFooter: Fixed Action Button Anchor
───────────────────────────────────────────────────────────── */
export interface PanelFooterProps {
  onViewSchedule?: () => void;
}

export function PanelFooter({ onViewSchedule }: PanelFooterProps) {
  const notify = useToast();

  const handleClick = () => {
    if (onViewSchedule) {
      onViewSchedule();
    } else {
      notify.info("Jadwal shift roster dibuka.", { id: "view-shift-list" });
    }
  };

  return (
    <div className="shift-coverage-footer p-[12px_16px_16px] border-t border-[var(--line)] bg-[var(--panel-bg)]">
      <button type="button" className="full-width-button flex items-center justify-center w-full px-[14px] py-[9px] rounded-[7px] text-[12px] font-semibold text-[var(--accent-blue)] bg-[var(--accent-blue-soft)] border border-[var(--accent-blue-border)] cursor-pointer transition-all duration-150 no-underline hover:bg-[rgba(56,189,248,0.2)] hover:border-[var(--accent-blue)]" onClick={handleClick}>
        Lihat jadwal shift roster <span>→</span>
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main Export: RosterTeamPanel (with ShiftCoverageCard alias)
───────────────────────────────────────────────────────────── */
export interface ShiftCoverageCardProps {
  members?: { name: string; role: string; status?: string; initials?: string }[];
  onSelectMember?: (member: TeamMemberItem) => void;
  onViewSchedule?: () => void;
}

export function RosterTeamPanel({
  members,
  onSelectMember,
  onViewSchedule,
}: ShiftCoverageCardProps) {
  const activeShift = useActiveShift();
  const [activeTab, setActiveTab] = useState<FilterTabOption>("Semua");

  const rosterMembers: TeamMemberItem[] = useMemo(() => {
    if (members && members.length > 0) {
      return members.map((m) => ({
        id: (m as any).id || m.name,
        name: m.name,
        role: m.role,
        initials: m.initials || initials(m.name),
        status: resolveCanonicalStatus(m.status),
      }));
    }

    return defaultRosterMembers;
  }, [members]);

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
    <article className="panel shift-coverage-card flex flex-col bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-[10px] overflow-hidden shadow-[var(--shadow-panel)]">
      <PanelHeader shift={activeShift} />
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
        onSelectMember={onSelectMember}
      />
      <PanelFooter onViewSchedule={onViewSchedule} />
    </article>
  );
}

export const ShiftCoverageCard = RosterTeamPanel;

export const RosterCoverageDonut = CoverageDonutChart;
export const RosterStatsRow = StatsRow;
export const RosterStatusFilterTabs = StatusFilterTabs;
export const RosterMemberList = MemberList;
export const RosterPanelFooter = PanelFooter;
export const RosterPanelHeader = PanelHeader;
