"use client";

import { useToast } from "@/app/components/ui/Toast";
import { initials } from "@/app/lib/data";
import { Avatar } from "@/app/components/ui/Avatar";
import { StatusIndicator } from "@/app/components/ui/StatusIndicator";
import { useActiveShift } from "@/app/hooks/useLiveClock";
import { useUserStatus, getStatusRingStyle } from "@/app/hooks/useUserStatus";
import { ShiftInfo } from "@/app/lib/shifts";
import { useMemo, useState } from "react";
import { Moon, Sun, Sunset } from "lucide-react";

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
    name: "Galih Khairi",
    role: "Operator NOC",
    initials: "GK",
    status: "On Duty",
  },
  {
    id: "mem-2",
    name: "Pangondion Kurniawan",
    role: "Shift Lead",
    initials: "PK",
    status: "On Duty",
  },
  {
    id: "mem-3",
    name: "Kurnia Meidiyansyah",
    role: "Operator NOC",
    initials: "KM",
    status: "On Duty",
  },
  {
    id: "mem-4",
    name: "Muhammad Iqbal",
    role: "L2 Specialist",
    initials: "MI",
    status: "Standby",
  },
  {
    id: "mem-18",
    name: "Tiara Andini",
    role: "Operator NOC",
    initials: "TA",
    status: "Standby",
  },
  {
    id: "mem-5",
    name: "Sarah Wijaya",
    role: "Incident Coordinator",
    initials: "SW",
    status: "Offline",
  },
  {
    id: "mem-6",
    name: "Bagas Pratama",
    role: "Operator NOC",
    initials: "BP",
    status: "Offline",
  },
  {
    id: "mem-7",
    name: "Dimas Anggoro",
    role: "Infrastructure Engineer",
    initials: "DA",
    status: "Offline",
  },
  {
    id: "mem-8",
    name: "Annisa Rahmawati",
    role: "Operator NOC",
    initials: "AR",
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
    <div className="shift-coverage-header">
      {/* Line 1: Main Title */}
      <h2 className="panel-title shift-coverage-title">Roster Tim</h2>

      {/* Line 2: Subtitle */}
      <span className="shift-coverage-subtitle">Shift Coverage</span>

      {/* Line 3: Shift Badge */}
      <div className="shift-coverage-badge-row">
        <div
          className={`topbar-shift-badge ${shift.badgeClass}`}
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
          className="donut-segment"
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
          className="donut-segment"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      );
    });
  };

  return (
    <div className="shift-coverage-donut-section">
      <div className="donut-chart-wrap shift-coverage-donut-wrap">
        <svg
          className="donut-svg"
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
        <div className="donut-center-content">
          <span className="donut-total-num">{counts.total}</span>
          <span className="donut-total-label">TOTAL</span>
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
    <div className="shift-coverage-stats-row" aria-label="Ringkasan status roster">
      <span
        className="coverage-stat-pill coverage-stat-on-duty coverage-stat-bertugas"
        title="Jumlah anggota On Duty"
      >
        <span className="coverage-stat-dot dot-bertugas" aria-hidden="true" />
        <span className="coverage-stat-text">{counts.onDuty} On Duty</span>
      </span>
      <span
        className="coverage-stat-pill coverage-stat-standby"
        title="Jumlah anggota Standby"
      >
        <span className="coverage-stat-dot dot-standby" aria-hidden="true" />
        <span className="coverage-stat-text">{counts.standby} Standby</span>
      </span>
      <span
        className="coverage-stat-pill coverage-stat-offline"
        title="Jumlah anggota Out of Reach"
      >
        <span className="coverage-stat-dot dot-offline" aria-hidden="true" />
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
  const tabs: { id: FilterTabOption; label: string; count: number }[] = [
    { id: "Semua", label: "Semua", count: counts.total },
    { id: "On Duty", label: "On Duty", count: counts.onDuty },
    { id: "Standby", label: "Standby", count: counts.standby },
    { id: "Offline", label: "Out of Reach", count: counts.offline },
  ];

  return (
    <div className="roster-filter-tabs-wrapper">
      <div
        className="filter-tabs roster-filter-tabs"
        role="tablist"
        aria-label="Filter status anggota roster"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? "selected" : ""}
            onClick={() => onSelectTab(tab.id)}
          >
            <span className="tab-label">{tab.label}</span>
            <span className="tab-count-badge">{tab.count}</span>
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
      className="roster-member-row"
      onClick={() => onClick(member)}
    >
      <div className="roster-member-left">
        <div
          className="roster-avatar-ring-wrapper"
          style={ringStyle as React.CSSProperties}
          title={`${member.name} (${displayStatusLabel})`}
        >
          <Avatar size="sm" name={member.name} className="shift-coverage-avatar" />
          <span
            className="roster-avatar-status-badge"
            style={{ backgroundColor: ringColor }}
          />
        </div>
        <div className="roster-member-info">
          <span className="roster-member-name" title={member.name}>
            {member.name}
          </span>
          <small className="roster-member-role">{member.role}</small>
        </div>
      </div>
      <div className="roster-member-right">
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
      <div className="coverage-team shift-coverage-team-list roster-empty-container">
        <div className="roster-empty-state">
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="coverage-team shift-coverage-team-list">
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
    <div className="shift-coverage-footer">
      <button type="button" className="full-width-button" onClick={handleClick}>
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
    <article className="panel shift-coverage-card">
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
