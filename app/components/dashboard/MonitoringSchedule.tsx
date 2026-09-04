"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Clock, Check, X, Filter, ChevronDown } from "lucide-react";
import { Badge } from "@/app/components/ui/Badge";
import { ProjectMark } from "@/app/components/ui/ProjectMark";
import { useToast } from "@/app/components/ui/Toast";
import { getOwnerRole, initials, monitoringSystems } from "@/app/lib/data";
import type { CheckpointAssessment, MonitoringEntry } from "@/app/lib/types";

export function matchesSystem(text: string, system: string) {
  const aliases: Record<string, string[]> = {
    ActiveMQ: ["activemq", "queue"],
    Kafka: ["kafka", "topik", "topic"],
    Grafana: ["grafana", "cpu"],
    Graylog: ["graylog", "siem"],
    "Disk Usage": ["disk", "/apps"],
  };
  const haystack = text.toLowerCase();
  return (aliases[system] ?? [system.toLowerCase()]).some((alias) => haystack.includes(alias));
}

interface MonitoringScheduleProps {
  entries: MonitoringEntry[];
  assessments: Record<string, CheckpointAssessment>;
  onAssess: (key: string, verdict: "ok" | "nok" | "adequate" | "not-adequate" | null) => void;
  onRequestNote: (key: string) => void;
  currentHour?: string | null;
  showFilter?: boolean;
  selectedSystem?: string | null;
  onSelectSystem?: (system: string | null) => void;
  footer?: React.ReactNode;
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
  selectedSystem = null,
  onSelectSystem,
  footer,
}: MonitoringScheduleProps) {
  const notify = useToast();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Semua");
  const [activeSystemFilter, setActiveSystemFilter] = useState<string | null>(selectedSystem);

  // Sync external selectedSystem if controlled
  const effectiveSystemFilter = selectedSystem !== undefined ? selectedSystem : activeSystemFilter;
  const setSystemFilter = onSelectSystem ?? setActiveSystemFilter;

  // Counts for tabs
  const counts = useMemo(() => {
    const total = entries.length;
    const needsAttention = entries.filter((item) => {
      const key = rowKey(item);
      const isNok = assessments[key]?.verdict === "nok" || assessments[key]?.verdict === "not-adequate";
      return item.tone === "warning" || isNok;
    }).length;
    const upcoming = entries.filter((item) => item.state === "Upcoming" || item.state === "Mendatang").length;
    return { total, needsAttention, upcoming };
  }, [entries, assessments]);

  const visibleEntries = useMemo(() => {
    let result = entries;

    // Filter by tab
    if (filter === "Needs Attention") {
      result = result.filter((item) => {
        const key = rowKey(item);
        const isNok = assessments[key]?.verdict === "nok" || assessments[key]?.verdict === "not-adequate";
        return item.tone === "warning" || isNok;
      });
    } else if (filter === "Upcoming") {
      result = result.filter((item) => item.state === "Upcoming" || item.state === "Mendatang");
    }

    // Filter by system (Quick filter)
    if (effectiveSystemFilter) {
      result = result.filter((item) => matchesSystem(`${item.task} ${item.project}`, effectiveSystemFilter));
    }

    return result;
  }, [entries, filter, effectiveSystemFilter, assessments]);


  return (
    <article className="panel schedule-panel">
      <div className="panel-heading schedule-heading">
        <div className="schedule-title-wrap">
          <div className="panel-title">Monitoring Schedule</div>
          {effectiveSystemFilter && (
            <span className="system-active-filter-badge">
              Filter: <strong>{effectiveSystemFilter}</strong>
              <button
                type="button"
                className="clear-system-filter-btn"
                onClick={() => setSystemFilter(null)}
                title="Hapus filter sistem"
                aria-label="Hapus filter sistem"
              >
                ×
              </button>
            </span>
          )}
        </div>

        {showFilter && (
          <div className="schedule-controls-row">
            {/* System Quick-Filter Dropdown (Requirement 5c) */}
            <div className="schedule-system-select-wrap">
              <label htmlFor="schedule-system-filter" className="sr-only">Filter Sistem</label>
              <select
                id="schedule-system-filter"
                className="schedule-system-select"
                value={effectiveSystemFilter || ""}
                onChange={(e) => setSystemFilter(e.target.value ? e.target.value : null)}
              >
                <option value="">Semua Sistem ({entries.length})</option>
                {monitoringSystems.map((sys) => {
                  const count = entries.filter((item) => matchesSystem(`${item.task} ${item.project}`, sys)).length;
                  return (
                    <option key={sys} value={sys}>
                      {sys} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Standard Pill Segmented Tabs with item counts */}
            <div className="filter-tabs" aria-label="Filter monitoring">
              <button
                className={filter === "Semua" ? "selected" : ""}
                onClick={() => setFilter("Semua")}
              >
                Semua <span className="tab-count-badge">{counts.total}</span>
              </button>
              <button
                className={filter === "Needs Attention" ? "selected" : ""}
                onClick={() => setFilter("Needs Attention")}
              >
                Needs Attention <span className="tab-count-badge warn">{counts.needsAttention}</span>
              </button>
              <button
                className={filter === "Upcoming" ? "selected" : ""}
                onClick={() => setFilter("Upcoming")}
              >
                Upcoming <span className="tab-count-badge">{counts.upcoming}</span>
              </button>
            </div>
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
          const isCurrentHour = currentHour === item.time;

          // Overdue calculation: if not yet assessed and time has passed currentHour
          const isOverdue = canAssess && !hasVerdict && currentHour && item.time < currentHour;
          const ownerRole = getOwnerRole(item.owner);

          return (
            <div
              className={[
                "schedule-row-wrapper",
                isOverdue ? "row-overdue" : "",
                isCurrentHour ? "row-current" : "",
                hasVerdict ? "row-assessed" : "row-pending",
              ].filter(Boolean).join(" ")}
              key={key}
            >
              <div
                className={`schedule-row ${isCurrentHour ? "current-hour" : ""} ${isOverdue ? "overdue-hour" : ""}`}
                role="row"
              >
                {/* 1. Time Column with Overdue / LIVE badge */}
                <span className="schedule-time">
                  <strong>{item.time}</strong>
                  {isCurrentHour && <small className="badge-live-tag">LIVE</small>}
                  {isOverdue && !isCurrentHour && (
                    <small className="badge-overdue-tag" title="Checkpoint ini belum dinilai dan telah melewati jadwal">
                      OVERDUE
                    </small>
                  )}
                </span>

                {/* 2. Checkpoint Details */}
                <span className="schedule-check">
                  <ProjectMark name={item.project} />
                  <span className="schedule-check-text">
                    <span className="schedule-check-heading">
                      <strong>{item.project}</strong>
                      {item.tone === "warning" && (
                        <span className="warn-indicator-dot" title="Perlu perhatian khusus">⚠️</span>
                      )}
                    </span>
                    <small className="schedule-task-desc">{item.task}</small>
                    {assessment && isNok && assessment.note && (
                      <small className="checkpoint-note">
                        📝 {assessment.note}
                      </small>
                    )}
                  </span>
                </span>

                {/* 3. Checked By column: Name with role tooltip */}
                <span className="schedule-owner">
                  <div className="avatar-tooltip-container">
                    <span
                      className={`mini-avatar ${hasVerdict ? "avatar-verified" : "avatar-pending"}`}
                      aria-hidden="true"
                    >
                      {initials(item.owner)}
                    </span>
                    <div className="avatar-tooltip-card" role="tooltip">
                      <strong>{item.owner}</strong>
                      <span>{ownerRole}</span>
                    </div>
                  </div>

                  {hasVerdict ? (
                    <span
                      className="checked-by-name anim-reveal-name"
                      title={`${item.owner} (${ownerRole})`}
                    >
                      {item.owner}
                    </span>
                  ) : (
                    <span
                      className={`checked-by-placeholder ${isOverdue ? "placeholder-overdue" : ""}`}
                      title="Menunggu verifikasi penilaian OK/NOK"
                    >
                      {isOverdue ? "Belum diverifikasi (Overdue)" : "Pending verification"}
                    </span>
                  )}
                </span>

                {/* 4. Verdict / Status Actions Cell */}
                <span className="schedule-assessment-cell">
                  {canAssess ? (
                    <div className="verdict-cell-inner">
                      {hasVerdict ? (
                        /* De-emphasized state for already resolved checkpoint */
                        <div className="assessed-verdict-display">
                          <span
                            className={`verdict-pill-solid ${isOk ? "verdict-pill-ok" : "verdict-pill-nok"}`}
                            title={`Status ${isOk ? "OK" : "NOK"} tercatat.`}
                          >
                            {isOk ? <Check size={12} strokeWidth={2.5} /> : <X size={12} strokeWidth={2.5} />}
                            <span>{isOk ? "OK" : "NOK"}</span>
                          </span>

                          <button
                            type="button"
                            className="ubah-btn"
                            onClick={() => {
                              onAssess(key, null);
                              notify.info("Penilaian checkpoint dibatalkan.", { id: `checkpoint-${key}` });
                            }}
                            title="Batalkan penilaian dan ubah verdict"
                          >
                            Ubah
                          </button>
                        </div>
                      ) : (
                        /* Clearly prominent dual buttons for unassessed checkpoint */
                        <span className="assessment-actions">
                          <button
                            type="button"
                            className="assess-btn assess-ok"
                            title="Tandai checkpoint ini sebagai OK"
                            onClick={() => {
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
                            }}
                          >
                            ✓ OK
                          </button>
                          <button
                            type="button"
                            className="assess-btn assess-fail"
                            title="Tandai sebagai NOK dan tambahkan catatan"
                            onClick={() => {
                              onRequestNote(key);
                            }}
                          >
                            ✗ NOK
                          </button>
                        </span>
                      )}
                    </div>
                  ) : (
                    <Badge tone={item.tone}>{item.state}</Badge>
                  )}
                </span>
              </div>


            </div>
          );
        })}

        {visibleEntries.length === 0 && (
          <div className="schedule-empty">Tidak ada checkpoint yang cocok dengan filter ini.</div>
        )}
      </div>

      {footer}
    </article>
  );
}

