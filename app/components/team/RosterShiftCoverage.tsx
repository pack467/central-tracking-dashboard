"use client";

import { initials } from "@/app/lib/data";
import { Clock } from "lucide-react";
import type { RosterMember } from "@/app/lib/types";

interface RosterShiftCoverageProps {
  members: RosterMember[];
  onSelectMember: (member: RosterMember) => void;
}

export function RosterShiftCoverage({ members, onSelectMember }: RosterShiftCoverageProps) {
  const activeMembers = members.filter((m) => m.status === "Active" || m.status === "On Break");
  const percentage = Math.round((activeMembers.length / (members.length || 1)) * 100);

  return (
    <article className="panel coverage-panel">
      <div className="panel-title">Current Shift Coverage</div>
      <div className="coverage-subtitle">
        <Clock size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px", color: "var(--accent-blue)" }} />
        Shift Sore 13:00 – 22:59 WIB · Lead: Pangondion K.
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

      <div className="coverage-stats">
        <span>● Active: <strong>{activeMembers.length}</strong></span>
        <span>○ Standby/Off: <strong>{members.length - activeMembers.length}</strong></span>
      </div>

      <div className="coverage-team">
        {members.map((member) => {
          const isLive = member.status === "Active";
          const isOnBreak = member.status === "On Break";
          const isOff = member.status === "Off Duty" || member.status === "On Leave";

          return (
            <button
              key={member.id}
              onClick={() => onSelectMember(member)}
              title={`Buka detail profil ${member.name}`}
              className="roster-coverage-member-btn"
            >
              <span
                className={`avatar avatar-status-ring avatar-ring-${isLive ? "active" : isOnBreak ? "break" : "off"}`}
                style={{
                  background: member.avatarBg ?? "var(--accent-blue)",
                  position: "relative",
                  flexShrink: 0,
                }}
              >
                {initials(member.name)}
              </span>
              <span style={{ minWidth: 0, overflow: "hidden" }}>
                <strong
                  style={{
                    display: "block",
                    fontSize: "12px",
                    color: "var(--ink-primary)",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                  }}
                >
                  {member.name}
                </strong>
                <small style={{ display: "block", color: "var(--ink-muted)", fontSize: "10px" }}>
                  {member.role} · {member.status}
                </small>
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: "10px",
                  fontWeight: "600",
                  fontFamily: "var(--font-mono)",
                  color: isLive ? "var(--green)" : isOnBreak ? "var(--orange)" : "var(--ink-muted)",
                }}
              >
                {isLive ? "ON DUTY" : isOnBreak ? "BREAK" : isOff ? "OFF" : member.status}
              </span>
            </button>
          );
        })}
      </div>
    </article>
  );
}
