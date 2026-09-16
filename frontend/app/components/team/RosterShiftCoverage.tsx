"use client";

import { useMemo, useState, useCallback, memo } from "react";
import { Avatar } from "@/app/components/ui/Avatar";
import { StatusIndicator } from "@/app/components/ui/StatusIndicator";
import { Moon, Sun, Sunset } from "lucide-react";
import { useActiveShift } from "@/app/hooks/useLiveClock";
import { useUserStatus, getStatusRingStyle } from "@/app/hooks/useUserStatus";
import type { RosterMember } from "@/app/lib/types";

export type CoverageFilterTab = "Semua" | "On Duty" | "Online" | "Offline";

export interface RosterShiftCoverageProps {
  members: RosterMember[];
  onSelectMember: (member: RosterMember) => void;
  matchedHeight?: number;
}

/**
 * Resolves a roster member's status into 3 canonical coverage states:
 * - "On Duty": Actively on duty during the current shift
 * - "Online": Standby, online, or on break
 * - "Offline": Off duty or on leave
 */
export function resolveCoverageStatus(
  member: RosterMember,
  isCurrentUser: boolean,
  userStatus?: string
): "On Duty" | "Online" | "Offline" {
  if (isCurrentUser && userStatus) {
    if (userStatus === "Online" || userStatus === "Busy") return "On Duty";
    if (userStatus === "On Break") return "Online";
    return "Offline";
  }

  const s = (member.status || "").toLowerCase().trim();
  if (s === "active" || s === "on duty" || s === "bertugas" || s === "present") {
    return "On Duty";
  }
  if (s === "on break" || s === "break" || s === "standby" || s === "online") {
    return "Online";
  }
  return "Offline";
}

export function RosterShiftCoverage({
  members,
  onSelectMember,
  matchedHeight,
}: RosterShiftCoverageProps) {
  const activeShift = useActiveShift();
  const { userStatus } = useUserStatus();
  const [activeTab, setActiveTab] = useState<CoverageFilterTab>("Semua");

  const ShiftIcon =
    activeShift.id === "subuh" ? Moon : activeShift.id === "pagi" ? Sun : Sunset;

  // 1. Tally counts for On Duty, Online, Offline
  const counts = useMemo(() => {
    let onDuty = 0;
    let online = 0;
    let offline = 0;

    for (const m of members) {
      const isCurrent = m.name.toLowerCase().includes("galih");
      const status = resolveCoverageStatus(m, isCurrent, userStatus);
      if (status === "On Duty") onDuty++;
      else if (status === "Online") online++;
      else offline++;
    }

    return {
      total: members.length,
      onDuty,
      online,
      offline,
    };
  }, [members, userStatus]);

  // 2. Data for SVG Donut Chart (identical to Overview)
  const chartData = useMemo(
    () => [
      {
        label: "On Duty",
        count: counts.onDuty,
        color: "#22c55e",
        gradientId: "coverage-donut-grad-onduty",
      },
      {
        label: "Online",
        count: counts.online,
        color: "#38bdf8",
        gradientId: "coverage-donut-grad-online",
      },
      {
        label: "Offline",
        count: counts.offline,
        color: "#64748b",
        gradientId: "coverage-donut-grad-offline",
      },
    ],
    [counts]
  );

  const radius = 45;
  const strokeWidth = 11.5;
  const cx = 60;
  const cy = 60;

  const renderDonutSlices = () => {
    const totalVal = chartData.reduce((acc, curr) => acc + curr.count, 0);
    if (totalVal === 0) return null;

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

  // 3. Filter members based on active tab
  const filteredMembers = useMemo(() => {
    if (activeTab === "Semua") return members;

    return members.filter((m) => {
      const isCurrent = m.name.toLowerCase().includes("galih");
      const status = resolveCoverageStatus(m, isCurrent, userStatus);
      return status === activeTab;
    });
  }, [members, activeTab, userStatus]);

  const handleSelectMember = useCallback(
    (member: RosterMember) => {
      onSelectMember(member);
    },
    [onSelectMember]
  );

  return (
    <article
      className="panel shift-coverage-card roster-coverage-panel"
      style={matchedHeight ? { height: `${matchedHeight}px` } : undefined}
    >
      {/* ── Header: Title, Subtitle, Shift Badge ── */}
      <div className="shift-coverage-header">
        <h2 className="panel-title shift-coverage-title">Status Kehadiran Anggota</h2>
        <span className="shift-coverage-subtitle">Ketersediaan Pegawai</span>
        <div className="shift-coverage-badge-row">
          <div
            className={`topbar-shift-badge ${activeShift.badgeClass}`}
            title={`Shift Aktif: ${activeShift.name}`}
            aria-label={`Shift aktif ${activeShift.name}`}
          >
            <ShiftIcon size={12} className="shift-badge-icon" />
            <span className="shift-badge-label">
              <strong>{activeShift.label}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* ── Donut Chart (Overview shape & styling) ── */}
      <div className="shift-coverage-donut-section">
        <div className="donut-chart-wrap shift-coverage-donut-wrap">
          <svg
            className="donut-svg"
            viewBox="0 0 120 120"
            aria-label={`Distribusi status roster: ${counts.onDuty} On Duty, ${counts.online} Online, ${counts.offline} Offline`}
          >
            <defs>
              <linearGradient id="coverage-donut-grad-onduty" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4ade80" />
                <stop offset="100%" stopColor="#16a34a" />
              </linearGradient>
              <linearGradient id="coverage-donut-grad-online" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
              <linearGradient id="coverage-donut-grad-offline" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#64748b" />
                <stop offset="100%" stopColor="#334155" />
              </linearGradient>
            </defs>

            {/* Dotted calibration ring */}
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

      {/* ── 3-State Stats Summary Row (On Duty · Online · Offline) ── */}
      <div className="shift-coverage-stats-row" aria-label="Ringkasan status roster">
        <span
          className="coverage-stat-pill coverage-stat-on-duty"
          title="Jumlah anggota On Duty"
        >
          <span className="coverage-stat-dot dot-bertugas" aria-hidden="true" />
          <span className="coverage-stat-text">{counts.onDuty} On Duty</span>
        </span>
        <span
          className="coverage-stat-pill coverage-stat-online"
          title="Jumlah anggota Online"
        >
          <span className="coverage-stat-dot dot-standby" aria-hidden="true" />
          <span className="coverage-stat-text">{counts.online} Online</span>
        </span>
        <span
          className="coverage-stat-pill coverage-stat-offline"
          title="Jumlah anggota Offline"
        >
          <span className="coverage-stat-dot dot-offline" aria-hidden="true" />
          <span className="coverage-stat-text">{counts.offline} Offline</span>
        </span>
      </div>

      {/* ── Status Filter Tabs: On Duty, Online, Offline ── */}
      <div className="roster-filter-tabs-wrapper">
        <div
          className="filter-tabs roster-filter-tabs"
          role="tablist"
          aria-label="Filter status anggota roster"
        >
          {[
            { id: "Semua" as const, label: "Semua", count: counts.total },
            { id: "On Duty" as const, label: "On Duty", count: counts.onDuty },
            { id: "Online" as const, label: "Online", count: counts.online },
            { id: "Offline" as const, label: "Offline", count: counts.offline },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={activeTab === tab.id ? "selected" : ""}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-label">{tab.label}</span>
              <span className="tab-count-badge">{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Scrollable Member List ── */}
      <div className="coverage-team shift-coverage-team-list roster-coverage-team-list">
        {filteredMembers.length === 0 ? (
          <div className="roster-empty-container">
            <div className="roster-empty-state">
              <p>Tidak ada anggota {activeTab.toLowerCase()} saat ini.</p>
            </div>
          </div>
        ) : (
          filteredMembers.map((member) => {
            const isCurrentUser = member.name.toLowerCase().includes("galih");
            const canonical = resolveCoverageStatus(member, isCurrentUser, userStatus);
            const ringStyle = getStatusRingStyle(
              canonical === "On Duty" ? "On Duty" : canonical === "Online" ? "Standby" : "Offline",
              isCurrentUser,
              userStatus
            );
            const ringColor = (ringStyle as any)["--status-ring-color"] || "#22c55e";

            const indicatorStatus =
              canonical === "On Duty" ? "bertugas" : canonical === "Online" ? "online" : "offline";
            const indicatorLabel = canonical;

            return (
              <button
                key={member.id}
                type="button"
                className="roster-member-row"
                onClick={() => handleSelectMember(member)}
                title={`Buka detail profil ${member.name}`}
              >
                <div className="roster-member-left">
                  <div
                    className="coverage-avatar-ring-wrapper"
                    style={ringStyle as React.CSSProperties}
                    title={`${member.name} (${indicatorLabel})`}
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
                  <StatusIndicator
                    status={indicatorStatus}
                    label={indicatorLabel}
                    size="sm"
                  />
                </div>
              </button>
            );
          })
        )}
      </div>
    </article>
  );
}
