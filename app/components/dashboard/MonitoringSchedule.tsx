"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/app/components/ui/Badge";
import { ProjectMark } from "@/app/components/ui/ProjectMark";
import { useToast } from "@/app/components/ui/Toast";
import { initials } from "@/app/lib/data";
import type { CheckpointAssessment, MonitoringEntry } from "@/app/lib/types";

interface MonitoringScheduleProps {
  entries: MonitoringEntry[];
  assessments: Record<string, CheckpointAssessment>;
  onAssess: (key: string, verdict: "ok" | "nok" | "adequate" | "not-adequate" | null) => void;
  onRequestNote: (key: string) => void;
  currentHour?: string | null;
  showFilter?: boolean;
}

const FILTERS = ["Semua", "Needs Attention", "Upcoming"] as const;

export function rowKey(entry: MonitoringEntry) {
  return `${entry.time}-${entry.project}-${entry.task}`;
}

export function MonitoringSchedule({
  entries,
  assessments,
  onAssess,
  onRequestNote,
  currentHour = null,
  showFilter = true,
}: MonitoringScheduleProps) {
  const notify = useToast();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Semua");

  const visibleEntries = useMemo(() => {
    if (filter === "Needs Attention") return entries.filter((item) => item.tone === "warning");
    if (filter === "Upcoming") return entries.filter((item) => item.state === "Upcoming" || item.state === "Mendatang");
    return entries;
  }, [entries, filter]);

  return (
    <article className="panel schedule-panel">
      <div className="panel-heading schedule-heading">
        <div className="panel-title">Monitoring Schedule</div>
        {showFilter && (
          <div className="filter-tabs" aria-label="Filter monitoring">
            {FILTERS.map((option) => (
              <button
                key={option}
                className={filter === option ? "selected" : ""}
                onClick={() => setFilter(option)}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="schedule-table" role="table" aria-label="Jadwal monitoring">
        <div className="schedule-header" role="row">
          <span>TIME</span>
          <span>CHECKPOINT</span>
          <span>CHECKED BY</span>
          <span>STATUS / VERDICT</span>
        </div>
        {visibleEntries.map((item) => {
          const key = rowKey(item);
          const assessment = assessments[key];
          const canAssess = item.state !== "Upcoming" && item.state !== "Mendatang";
          const isOk = assessment?.verdict === "ok" || assessment?.verdict === "adequate";
          const isNok = assessment?.verdict === "nok" || assessment?.verdict === "not-adequate";
          const hasVerdict = Boolean(assessment?.verdict);

          return (
            <div
              className={`schedule-row ${currentHour === item.time ? "current-hour" : ""}`}
              role="row"
              key={key}
            >
              <span className="schedule-time">
                {item.time}
                {currentHour === item.time && <small>LIVE</small>}
              </span>
              <span className="schedule-check">
                <ProjectMark name={item.project} />
                <span>
                  <strong>{item.project}</strong>
                  <small>{item.task}</small>
                  {assessment && isNok && assessment.note && (
                    <small className="checkpoint-note">📝 {assessment.note}</small>
                  )}
                </span>
              </span>

              {/* Checked By column: Name only revealed after verdict (OK/NOK) is selected */}
              <span className="schedule-owner">
                <span
                  className={`mini-avatar ${hasVerdict ? "avatar-verified" : "avatar-pending"}`}
                  aria-hidden="true"
                >
                  {initials(item.owner)}
                </span>
                {hasVerdict ? (
                  <span
                    className="checked-by-name anim-reveal-name"
                    title={`Diverifikasi oleh ${item.owner}`}
                  >
                    {item.owner}
                  </span>
                ) : (
                  <span
                    className="checked-by-placeholder"
                    title="Menunggu penilaian status OK/NOK untuk menampilkan pemeriksa"
                  >
                    Pending verification
                  </span>
                )}
              </span>

              <span className="schedule-assessment-cell">
                {canAssess ? (
                  <span className="assessment-actions">
                    <button
                      className={`assess-btn assess-ok ${isOk ? "active-verdict" : ""}`}
                      title={isOk ? "Klik lagi untuk membatalkan (Undo OK)" : "Tandai checkpoint ini sebagai OK"}
                      onClick={() => {
                        if (isOk) {
                          onAssess(key, null);
                          notify.info("Penilaian OK dibatalkan.", { id: `checkpoint-${key}` });
                        } else {
                          onAssess(key, "ok");
                          notify.success("Checkpoint ditandai OK.", {
                            id: `checkpoint-${key}`,
                            duration: 6500,
                            action: {
                              label: "Undo",
                              onClick: () => {
                                onAssess(key, null);
                                notify.info("Penilaian OK dibatalkan.", { id: `checkpoint-${key}` });
                              },
                            },
                          });
                        }
                      }}
                    >
                      {isOk ? "✓ OK" : "OK"}
                    </button>
                    <button
                      className={`assess-btn assess-fail ${isNok ? "active-verdict" : ""}`}
                      title={isNok ? "Klik lagi untuk membatalkan (Undo NOK)" : "Tandai sebagai NOK dan tambahkan catatan"}
                      onClick={() => {
                        if (isNok) {
                          onAssess(key, null);
                          notify.info("Penilaian NOK dibatalkan.", { id: `checkpoint-${key}` });
                        } else {
                          onRequestNote(key);
                        }
                      }}
                    >
                      {isNok ? "✗ NOK" : "NOK"}
                    </button>
                  </span>
                ) : (
                  <Badge tone={item.tone}>{item.state}</Badge>
                )}
              </span>
            </div>
          );
        })}
        {visibleEntries.length === 0 && (
          <div className="schedule-empty">Tidak ada checkpoint yang cocok dengan filter ini.</div>
        )}
      </div>
    </article>
  );
}
