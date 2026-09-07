"use client";

import { useToast } from "@/app/components/ui/Toast";
import { initials, seedRosterMembers } from "@/app/lib/data";
import { useActiveShift } from "@/app/hooks/useLiveClock";
import { getDerivedMemberStatus } from "@/app/lib/shifts";
import { useMemo } from "react";

interface ShiftCoverageCardProps {
  members?: { name: string; role: string }[];
}

export function ShiftCoverageCard({ members }: ShiftCoverageCardProps) {
  const notify = useToast();
  const activeShift = useActiveShift();

  const activeRosterMembers = useMemo(() => {
    if (members) return members;
    return seedRosterMembers
      .filter((m) => {
        const status = getDerivedMemberStatus(m, activeShift);
        return status === "Active" || status === "On Break";
      })
      .map((m) => ({ name: m.name, role: m.role }));
  }, [members, activeShift]);

  const activeCount = activeRosterMembers.length;

  return (
    <article className="panel coverage-panel">
      <div className="panel-title">Shift Coverage</div>
      <p className="coverage-subtitle">{activeShift.label} · {activeShift.period}</p>
      <div className="coverage-ring">
        <div>
          <strong>{activeCount}</strong>
          <span>ACTIVE</span>
        </div>
      </div>
      <div className="coverage-stats">
        <span>
          <i className="status-dot success" /> {activeCount} aktif
        </span>
        <span>
          <i className="status-dot neutral" /> 0 istirahat
        </span>
      </div>
      <div className="coverage-team">
        {activeRosterMembers.map((member, index) => (
          <button
            key={member.name}
            onClick={() =>
              notify.info(`${member.name}: detail anggota shift dimuat.`, {
                id: `team-member-${member.name.toLowerCase().replace(/\s+/g, "-")}`,
              })
            }
          >
            <span className={`avatar avatar-${index % 5}`}>
              {initials(member.name)}
            </span>
            <span>
              {member.name}
              <small>{member.role}</small>
            </span>
            <i className="status-dot success" />
          </button>
        ))}
      </div>
      <button
        className="full-width-button"
        onClick={() => notify.info("Jadwal shift roster dibuka.", { id: "view-shift-list" })}
      >
        Lihat jadwal shift roster <span>→</span>
      </button>
    </article>
  );
}
