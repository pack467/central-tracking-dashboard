"use client";

import { useMemo } from "react";
import { MonitoringSchedule, rowKey } from "@/app/components/dashboard/MonitoringSchedule";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { monitoringSchedule, monitoringSystems } from "@/app/lib/data";
import type { CheckpointAssessment } from "@/app/lib/types";

interface MonitoringViewProps {
  assessments: Record<string, CheckpointAssessment>;
  onAssess: (key: string, verdict: "ok" | "nok" | "adequate" | "not-adequate" | null) => void;
  onRequestNote: (key: string) => void;
  onOpenGuide: () => void;
  currentHour: string;
}

export function MonitoringView({ assessments, onAssess, onRequestNote, onOpenGuide, currentHour }: MonitoringViewProps) {
  const assessedEntries = useMemo(
    () =>
      Object.entries(assessments)
        .map(([key, assessment]) => ({ key, assessment, entry: monitoringSchedule.find((item) => rowKey(item) === key) }))
        .filter((item): item is { key: string; assessment: CheckpointAssessment; entry: (typeof monitoringSchedule)[number] } =>
          Boolean(item.entry),
        )
        .reverse(),
    [assessments],
  );

  const systemStats = useMemo(
    () =>
      monitoringSystems.map((system) => ({
        system,
        total: monitoringSchedule.filter((item) => matchesSystem(item.task + " " + item.project, system)).length,
      })),
    [],
  );

  const adequateCount = assessedEntries.filter(
    (item) => item.assessment.verdict === "ok" || item.assessment.verdict === "adequate",
  ).length;
  const notAdequateCount = assessedEntries.length - adequateCount;

  const hours = useMemo(() => Array.from(new Set(monitoringSchedule.map((item) => item.time))), []);

  return (
    <>
      <section className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="live-dot live-dot-pulse" /> CHECKPOINT &amp; PEMERIKSAAN
          </div>
          <h1>Monitoring</h1>
          <p>Matriks pemeriksaan per jam, evaluasi status OK / NOK, dan catatan insiden.</p>
        </div>
        <div className="page-actions">
          <button className="button button-secondary" onClick={onOpenGuide}>
            Panduan Penilaian (Guide)
          </button>
        </div>
      </section>

      <section className="ticket-stats">
        <article className="stat-chip stat-success">
          <strong>{adequateCount}</strong>
          <span>OK</span>
        </article>
        <article className="stat-chip stat-critical">
          <strong>{notAdequateCount}</strong>
          <span>NOK</span>
        </article>
        <article className="stat-chip">
          <strong>{monitoringSchedule.length}</strong>
          <span>Checkpoint hari ini</span>
        </article>
        <article className="stat-chip stat-info">
          <strong>{hours.length}</strong>
          <span>Jam pemeriksaan</span>
        </article>
      </section>

      <section className="system-strip" aria-label="Cakupan sistem">
        {systemStats.map(({ system, total }) => (
          <div className="system-chip" key={system}>
            <strong>{total}</strong>
            <span>{system}</span>
          </div>
        ))}
      </section>

      <MonitoringSchedule
        entries={monitoringSchedule}
        assessments={assessments}
        onAssess={onAssess}
        onRequestNote={onRequestNote}
        currentHour={currentHour}
      />

      <article className="panel view-panel">
        <div className="panel-heading">
          <div className="panel-title">Riwayat asesmen checkpoint</div>
        </div>
        {assessedEntries.length ? (
          <div className="assessment-history">
            {assessedEntries.map(({ key, assessment, entry }) => (
              <div className={`assessment-history-row ${assessment.verdict}`} key={key}>
                <span className="schedule-time">{entry.time}</span>
                <ProjectCell project={entry.project} task={entry.task} />
                <span
                  className={`assessment-verdict assessment-${assessment.verdict === "ok" || assessment.verdict === "adequate" ? "ok" : "nok"}`}
                >
                  {assessment.verdict === "ok" || assessment.verdict === "adequate" ? "✓ OK" : "✗ NOK"}
                </span>
                <span className="assessment-history-note">
                  {assessment.note || "Tanpa catatan tambahan."}
                  <small>Pemeriksa oleh {entry.owner}</small>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="◷"
            title="Belum ada asesmen hari ini"
            message="Tandai checkpoint pada jadwal di atas sebagai OK atau NOK untuk mulai merekam riwayat."
          />
        )}
      </article>
    </>
  );
}

function ProjectCell({ project, task }: { project: string; task: string }) {
  return (
    <span className="schedule-check">
      <span>
        <strong>{project}</strong>
        <small>{task}</small>
      </span>
    </span>
  );
}

function matchesSystem(text: string, system: string) {
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
