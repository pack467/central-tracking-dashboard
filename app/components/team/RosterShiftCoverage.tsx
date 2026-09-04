"use client";

import { memo, useCallback } from "react";
import { initials } from "@/app/lib/data";
import { Clock } from "lucide-react";
import { useActiveShift } from "@/app/hooks/useLiveClock";
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
  const isLive = member.status === "Active";
  const isOnBreak = member.status === "On Break";
  const ringClass = isLive ? "active" : isOnBreak ? "break" : "off";
  const statusLabel = isLive ? "ON DUTY" : isOnBreak ? "BREAK" : "OFF";
  const statusClass = isLive ? "coverage-status-live" : isOnBreak ? "coverage-status-break" : "coverage-status-off";

  const handleClick = useCallback(() => onSelect(member), [member, onSelect]);

  return (
    <button
      className="roster-coverage-member-btn"
      onClick={handleClick}
      title={`Buka detail profil ${member.name}`}
    >
      <span
        className={`avatar avatar-status-ring avatar-ring-${ringClass} coverage-member-avatar`}
        style={{ background: member.avatarBg ?? "var(--accent-blue)" }}
        aria-hidden="true"
      >
        {initials(member.name)}
      </span>
      <span className="coverage-member-info">
        <strong className="coverage-member-name">{member.name}</strong>
        <small className="coverage-member-role">{member.role} · {member.status}</small>
      </span>
      <span className={`coverage-member-status ${statusClass}`}>
        {statusLabel}
      </span>
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
