"use client";

import { memo, useCallback } from "react";
import { initials } from "@/app/lib/data";
import { Avatar } from "@/app/components/ui/Avatar";
import { StatusIndicator } from "@/app/components/ui/StatusIndicator";
import { Clock } from "lucide-react";
import { useActiveShift } from "@/app/hooks/useLiveClock";
import { useUserStatus, getStatusRingStyle } from "@/app/hooks/useUserStatus";
import type { RosterMember } from "@/app/lib/types";

interface RosterShiftCoverageProps {
  members: RosterMember[];
  onSelectMember: (member: RosterMember) => void;
  matchedHeight?: number;
}

/* ─── Memoized individual member row in the coverage list ──────────────── */

interface CoverageMemberRowProps {
  member: RosterMember;
  onSelect: (m: RosterMember) => void;
}

const CoverageMemberRow = memo(function CoverageMemberRow({ member, onSelect }: CoverageMemberRowProps) {
  const { userStatus } = useUserStatus();
  const isCurrentUser = member.name.toLowerCase().includes("galih");
  const ringStyle = getStatusRingStyle(member.status, isCurrentUser, userStatus);
  const ringColor = (ringStyle as any)["--status-ring-color"] || "#22c55e";

  const isLive = isCurrentUser ? userStatus === "Online" : member.status === "Active";
  const isOnBreak = isCurrentUser ? userStatus === "On Break" : member.status === "On Break";
  const isBusy = isCurrentUser && userStatus === "Busy";
  const displayStatus = isCurrentUser ? userStatus : member.status;
  const indicatorStatus = isLive ? "bertugas" : isBusy ? "critical" : isOnBreak ? "online" : "offline";
  const indicatorLabel = isCurrentUser ? userStatus : isLive ? "Bertugas" : isOnBreak ? "Online" : "Offline";

  const handleClick = useCallback(() => onSelect(member), [member, onSelect]);

  return (
    <button
      className="roster-coverage-member-btn"
      onClick={handleClick}
      title={`Buka detail profil ${member.name}`}
    >
      <div
        className="coverage-avatar-ring-wrapper"
        style={ringStyle as React.CSSProperties}
        title={`${member.name} (${displayStatus})`}
      >
        <Avatar
          size="md"
          name={member.name}
          className="coverage-member-avatar"
        />
        <span
          className="coverage-avatar-status-badge"
          style={{ backgroundColor: ringColor }}
        />
      </div>
      <span className="coverage-member-info">
        <strong className="coverage-member-name">{member.name}</strong>
        <small className="coverage-member-role">{member.role} · {displayStatus}</small>
      </span>
      <StatusIndicator
        status={indicatorStatus}
        label={indicatorLabel}
      />
    </button>
  );
},
(prev, next) => prev.member === next.member && prev.onSelect === next.onSelect);

/* ─── Main RosterShiftCoverage component ──────────────────────────────── */

export function RosterShiftCoverage({ members, onSelectMember, matchedHeight }: RosterShiftCoverageProps) {
  const activeShift = useActiveShift();
  const activeMembers = members.filter((m) => m.status === "Active" || m.status === "On Break");
  const percentage = Math.round((activeMembers.length / (members.length || 1)) * 100);

  const leadMember = members.find((m) => (m.status === "Active" || m.status === "On Break") && (m.role === "Shift Lead" || m.role === "Incident Coordinator")) ||
    members.find((m) => (m.status === "Active" || m.status === "On Break")) ||
    members.find((m) => m.role === "Shift Lead");
  const leadName = leadMember
    ? leadMember.name.split(" ").length > 1
      ? `${leadMember.name.split(" ")[0]} ${leadMember.name.split(" ")[1][0]}.`
      : leadMember.name
    : "Pangondion K.";

  // Stable callback ref so CoverageMemberRow.memo comparison passes
  const handleSelect = useCallback((m: RosterMember) => onSelectMember(m), [onSelectMember]);

  return (
    <article
      className="panel coverage-panel roster-coverage-panel"
      style={matchedHeight ? { height: `${matchedHeight}px` } : undefined}
    >
      <div className="panel-title">Current Shift Coverage</div>
      <div className="coverage-subtitle">
        <Clock size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px", color: activeShift.color }} />
        {activeShift.label} {activeShift.period} · Lead: {leadName}
      </div>

      <div
        className="coverage-ring"
        style={{
          background: `conic-gradient(var(--green) 0 ${percentage}%, var(--line) ${percentage}% 100%)`,
        }}
      >
        <div>
          <strong>{percentage}%</strong>
          <span>ON SHIFT</span>
        </div>
      </div>

      <div className="coverage-stats roster-coverage-stats">
        <span className="roster-coverage-pill roster-coverage-pill-active" title="Jumlah anggota aktif on duty / on break">
          <span className="coverage-pill-dot dot-active" aria-hidden="true" />
          <span className="coverage-pill-label">Active</span>
          <strong className="coverage-pill-count">{activeMembers.length}</strong>
        </span>
        <span className="roster-coverage-pill roster-coverage-pill-standby" title="Jumlah anggota standby, off duty, atau cuti">
          <span className="coverage-pill-dot dot-standby" aria-hidden="true" />
          <span className="coverage-pill-label">Standby/Off</span>
          <strong className="coverage-pill-count">{members.length - activeMembers.length}</strong>
        </span>
      </div>

      <div className="coverage-team roster-coverage-team-list">
        {members.map((member) => (
          <CoverageMemberRow
            key={member.id}
            member={member}
            onSelect={handleSelect}
          />
        ))}
      </div>
    </article>
  );
}
