"use client";

import { useMemo, useState, useCallback } from "react";
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
      className="panel flex flex-col h-full box-border p-0 overflow-hidden bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-[10px] shadow-[var(--shadow-panel)]"
      style={matchedHeight ? { height: `${matchedHeight}px` } : undefined}
    >
      {/* ── Header: Title, Subtitle, Shift Badge ── */}
      <div className="flex flex-col items-center text-center p-[16px_20px_14px] border-b border-[var(--line)] bg-[var(--panel-bg)]">
        <h2 className="m-0 text-[var(--ink-primary)] text-[15px] font-bold leading-[1.2] justify-center text-center">Status Kehadiran Anggota</h2>
        <span className="block mt-[3px] text-[var(--ink-secondary)] text-[11.5px] font-medium leading-[1.2] text-center">Ketersediaan Pegawai</span>
        <div className="flex items-center justify-center mt-[8px]">
          <div
            className={`topbar-shift-badge inline-flex items-center gap-[6px] px-[12px] py-[4px] rounded-[999px] text-[11px] leading-[1.2] shadow-[0_1px_3px_rgba(0,0,0,0.25)] ${activeShift.badgeClass}`}
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
      <div className="flex justify-center items-center my-[14px_12px]">
        <div className="w-[124px] h-[124px] relative">
          <svg
            className="w-full h-full overflow-visible pointer-events-none"
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
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[26px] font-extrabold font-mono text-white leading-none">{counts.total}</span>
            <span className="text-[9px] font-bold font-mono tracking-[1.5px] text-[var(--ink-muted)] mt-[4px]">TOTAL</span>
          </div>
        </div>
      </div>

      {/* ── 3-State Stats Summary Row (On Duty · Online · Offline) ── */}
      <div className="flex flex-wrap items-center justify-center gap-[8px] mt-[6px] mx-[16px] mb-0" aria-label="Ringkasan status roster">
        <span
          className="inline-flex items-center gap-[6px] px-[10px] py-[4px] h-[24px] box-border rounded-[999px] text-[11px] font-semibold leading-none select-none whitespace-nowrap text-[#4ade80] bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.25)]"
          title="Jumlah anggota On Duty"
        >
          <span className="w-[6px] h-[6px] rounded-[50%] bg-[#22c55e] shadow-[0_0_5px_rgba(34,197,94,0.6)]" aria-hidden="true" />
          <span>{counts.onDuty} On Duty</span>
        </span>
        <span
          className="inline-flex items-center gap-[6px] px-[10px] py-[4px] h-[24px] box-border rounded-[999px] text-[11px] font-semibold leading-none select-none whitespace-nowrap text-[#38bdf8] bg-[rgba(56,189,248,0.1)] border border-[rgba(56,189,248,0.25)]"
          title="Jumlah anggota Online"
        >
          <span className="w-[6px] h-[6px] rounded-[50%] bg-[#38bdf8] shadow-[0_0_5px_rgba(56,189,248,0.6)]" aria-hidden="true" />
          <span>{counts.online} Online</span>
        </span>
        <span
          className="inline-flex items-center gap-[6px] px-[10px] py-[4px] h-[24px] box-border rounded-[999px] text-[11px] font-semibold leading-none select-none whitespace-nowrap text-[#94a3b8] bg-[rgba(148,163,184,0.08)] border border-[rgba(148,163,184,0.2)]"
          title="Jumlah anggota Offline"
        >
          <span className="w-[6px] h-[6px] rounded-[50%] bg-[#64748b]" aria-hidden="true" />
          <span>{counts.offline} Offline</span>
        </span>
      </div>

      {/* ── Status Filter Tabs: On Duty, Online, Offline ── */}
      <div className="p-[10px_12px_6px] border-t border-[var(--line)] mt-[12px] w-full box-border">
        <div
          className="filter-tabs grid grid-cols-[repeat(4,minmax(0,1fr))] gap-[4px] p-[3px] rounded-[7px] bg-[var(--bg)] border border-[var(--line)] w-full box-border"
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
              className={`min-w-0 p-[6px_3px] rounded-[5px] text-[10.5px] font-semibold inline-flex items-center justify-center gap-[4px] whitespace-nowrap cursor-pointer transition-all duration-150 border ${
                activeTab === tab.id
                  ? "text-[var(--accent-blue)] bg-[var(--panel-bg)] border-[rgba(96,165,250,0.25)] shadow-[var(--shadow-sm)]"
                  : "text-[var(--ink-muted)] bg-transparent border-transparent hover:text-[var(--ink-primary)] hover:bg-[rgba(255,255,255,0.04)]"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.label}</span>
              <span className={`inline-flex items-center justify-center min-w-[16px] h-[16px] px-[4px] rounded-[99px] text-[9.5px] font-mono font-bold shrink-0 ${
                activeTab === tab.id
                  ? "bg-[rgba(96,165,250,0.2)] text-[var(--accent-blue)]"
                  : "bg-[rgba(148,163,184,0.18)] text-inherit"
              }`}>{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Scrollable Member List ── */}
      <div className="p-[8px_16px_16px] flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(56,189,248,0.25)_transparent] [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-track]:bg-[rgba(148,163,184,0.05)] [&::-webkit-scrollbar-track]:rounded-[4px] [&::-webkit-scrollbar-thumb]:bg-[rgba(56,189,248,0.25)] [&::-webkit-scrollbar-thumb]:rounded-[4px] [&::-webkit-scrollbar-thumb:hover]:bg-[rgba(56,189,248,0.45)]">
        {filteredMembers.length === 0 ? (
          <div className="flex items-center justify-center min-h-[120px]">
            <div className="p-[24px_16px] text-center text-[var(--ink-muted)] text-[11.5px] leading-[1.4]">
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
                className="flex items-center justify-between w-full gap-[12px] p-[8px] m-0 text-[var(--ink-primary)] text-left bg-transparent border-0 border-b border-[var(--line)] last:border-b-0 cursor-pointer rounded-[6px] transition-colors duration-150 box-border hover:bg-[rgba(148,163,184,0.08)]"
                onClick={() => handleSelectMember(member)}
                title={`Buka detail profil ${member.name}`}
              >
                <div className="flex items-center gap-[10px] flex-1 min-w-0">
                  <div
                    className="coverage-avatar-ring-wrapper"
                    style={ringStyle as React.CSSProperties}
                    title={`${member.name} (${indicatorLabel})`}
                  >
                    <Avatar size="sm" name={member.name} className="shrink-0" />
                    <span
                      className="roster-avatar-status-badge"
                      style={{ backgroundColor: ringColor }}
                    />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0 gap-[2px]">
                    <span className="text-[11.5px] font-semibold text-[var(--ink-primary)] whitespace-nowrap overflow-hidden text-ellipsis leading-[1.3]" title={member.name}>
                      {member.name}
                    </span>
                    <small className="text-[10px] text-[var(--ink-muted)] font-normal whitespace-nowrap overflow-hidden text-ellipsis mt-[1px] leading-[1.2]">{member.role}</small>
                  </div>
                </div>
                <div className="shrink-0 whitespace-nowrap flex items-center">
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
