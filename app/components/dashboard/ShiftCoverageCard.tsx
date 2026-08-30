"use client";

import { useToast } from "@/app/components/ui/Toast";
import { teamMembers } from "@/app/lib/data";

export function ShiftCoverageCard() {
  const notify = useToast();

  return (
    <article className="panel coverage-panel">
      <div className="panel-title">Shift Coverage</div>
      <p className="coverage-subtitle">Shift sore · 13:00 – 22:59 WIB</p>
      <div className="coverage-ring">
        <div>
          <strong>5</strong>
          <span>ACTIVE</span>
        </div>
      </div>
      <div className="coverage-stats">
        <span>
          <i className="status-dot success" /> 5 aktif
        </span>
        <span>
          <i className="status-dot neutral" /> 1 istirahat
        </span>
      </div>
      <div className="coverage-team">
        {teamMembers.map((member, index) => (
          <button
            key={member.name}
            onClick={() =>
              notify.info(`${member.name}: detail anggota shift dimuat.`, {
                id: `team-member-${member.name.toLowerCase().replace(/\s+/g, "-")}`,
              })
            }
          >
            <span className={`avatar avatar-${index}`}>
              {member.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
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
