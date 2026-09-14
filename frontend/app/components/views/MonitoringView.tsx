"use client";

import { useMemo, useState, useEffect } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Layers,
  Clock,
  Activity,
  Server,
  HardDrive,
  Radio,
  Cpu,
  BookOpen,
  Check,
  X,
} from "lucide-react";
import { MonitoringSchedule, rowKey, matchesProject } from "@/app/components/dashboard/MonitoringSchedule";
import { MonitoringHistorySection } from "@/app/components/monitoring/MonitoringHistorySection";
import { StatCard, type StatAccentColor } from "@/app/components/ui/StatCard";
import { useActiveShift } from "@/app/hooks/useLiveClock";
import type { CheckpointAssessment } from "@/app/lib/types";
import { useClient } from "@/app/context/ClientContext";
import { getClientMonitoringSchedule, getClientProjects } from "@/app/lib/clientData";

interface MonitoringViewProps {
  assessments: Record<string, CheckpointAssessment>;
  onAssess: (key: string, verdict: "ok" | "nok" | "adequate" | "not-adequate" | null) => void;
  onRequestNote: (key: string) => void;
  onOpenGuide: () => void;
  currentHour: string;
}

export function MonitoringView({
  assessments,
  onAssess,
  onRequestNote,
  onOpenGuide,
  currentHour,
}: MonitoringViewProps) {
  const { activeClient, activeClientId } = useClient();
  const schedule = useMemo(() => getClientMonitoringSchedule(activeClientId), [activeClientId]);
  const projects = useMemo(() => getClientProjects(activeClientId), [activeClientId]);

  const activeShift = useActiveShift();
  const shiftAccent: StatAccentColor = activeShift.id === "subuh" ? "blue" : activeShift.id === "pagi" ? "amber" : "purple";
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  // Auto-reset project filter when active client changes
  useEffect(() => {
    setSelectedProject(null);
  }, [activeClientId]);

  // Assessed entries list
  const assessedEntries = useMemo(
    () =>
      Object.entries(assessments)
        .map(([key, assessment]) => ({
          key,
          assessment,
          entry: schedule.find((item) => rowKey(item) === key),
        }))
        .filter(
          (item): item is { key: string; assessment: CheckpointAssessment; entry: (typeof schedule)[number] } =>
            Boolean(item.entry),
        )
        .reverse(),
    [assessments, schedule],
  );

  // Summary Metrics
  const totalCheckpoints = schedule.length;
  const adequateCount = assessedEntries.filter(
    (item) => item.assessment.verdict === "ok" || item.assessment.verdict === "adequate",
  ).length;
  const notAdequateCount = assessedEntries.filter(
    (item) => item.assessment.verdict === "nok" || item.assessment.verdict === "not-adequate",
  ).length;
  const totalAssessed = adequateCount + notAdequateCount;

  // Percentage & proportion calculations
  const okRate = totalAssessed > 0 ? Math.round((adequateCount / totalAssessed) * 100) : 100;
  const nokRate = totalAssessed > 0 ? Math.round((notAdequateCount / totalAssessed) * 100) : 0;
  const completedPct = Math.round((totalAssessed / totalCheckpoints) * 100);

  const hours = useMemo(() => Array.from(new Set(schedule.map((item) => item.time))), [schedule]);

  // Project breakdown stats with health and OK/NOK breakdown
  const projectStats = useMemo(() => {
    return projects.map((projEntry) => {
      const projectName = projEntry.name;
      const items = schedule.filter((item) => matchesProject(item.project, projectName));
      const total = items.length;

      let okCount = 0;
      let nokCount = 0;

      items.forEach((item) => {
        const key = rowKey(item);
        const a = assessments[key];
        if (a) {
          if (a.verdict === "ok" || a.verdict === "adequate") okCount++;
          if (a.verdict === "nok" || a.verdict === "not-adequate") nokCount++;
        } else if (item.tone === "warning") {
          // If unassessed but scheduled as warning in base data
          nokCount++;
        }
      });

      const hasNok = nokCount > 0;

      return {
        project: projectName,
        detail: projEntry.detail,
        total,
        okCount,
        nokCount,
        hasNok,
      };
    });
  }, [projects, schedule, assessments]);

  // Project icon helper
  const getProjectIcon = (name: string) => {
    switch (name) {
      case "Core Banking":
      case "OCS Billing":
      case "SM":
        return <Server size={14} />;
      case "Switching ATM":
      case "SMSC Core":
      case "B2B":
        return <Radio size={14} />;
      case "BNI Mobile":
      case "MyTelkomsel":
      case "MB":
        return <Activity size={14} />;
      case "Fraud Shield":
      case "5G Edge":
      case "USIEM":
        return <Cpu size={14} />;
      case "Card Mgmt":
      case "HLR/HSS":
      case "DM":
        return <HardDrive size={14} />;
      default:
        return <Layers size={14} />;
    }
  };

  return (
    <>
      {/* ── Page Header ── */}
      <section className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="live-dot live-dot-pulse" /> CHECKPOINT &amp; PEMERIKSAAN · {activeClient.name.toUpperCase()} · {activeShift.label.toUpperCase()}
          </div>
          <h1>Monitoring — {activeClient.shortName}</h1>
          <p>Matriks pemeriksaan per jam, evaluasi status OK / NOK, dan riwayat anomali untuk sistem {activeClient.name}.</p>
        </div>
        <div className="page-actions">
          <button className="button button-secondary" onClick={onOpenGuide}>
            <BookOpen size={14} /> Panduan Penilaian (Guide)
          </button>
        </div>
      </section>

      {/* ── 1. Top Stat Cards (OK / NOK / Checkpoint Hari Ini / Jam Pemeriksaan) ── */}
      <section className="monitoring-stat-cards-grid" aria-label="Statistik pemeriksaan monitoring">
        {/* Card 1: STATUS OK */}
        <StatCard
          label="STATUS OK"
          value={adequateCount}
          accentColor="green"
          icon={<CheckCircle2 size={15} strokeWidth={2} />}
          subtitle={`${okRate}% compliance rate (${adequateCount} of ${totalAssessed || totalCheckpoints})`}
          progress={{
            value: okRate,
            segments: totalAssessed > 0 ? [
              { label: "OK", percentage: okRate, color: "#4ade80" },
              { label: "NOK", percentage: nokRate, color: "#f87171" },
            ] : [{ label: "OK Baseline", percentage: 100, color: "#4ade80" }],
          }}
          badgeText={adequateCount > 0 ? `${adequateCount} Passed Normal` : "Baseline OK"}
          badgeTone="green"
        />

        {/* Card 2: STATUS NOK (Persistent visual emphasis if NOK > 0 + Trend indicator) */}
        <StatCard
          label="STATUS NOK (ANOMALI)"
          value={notAdequateCount}
          accentColor={notAdequateCount > 0 ? "rose" : "green"}
          icon={<AlertTriangle size={15} strokeWidth={2} />}
          subtitle={
            notAdequateCount > 0
              ? "↓ 1 fewer NOK vs yesterday (30 Aug)"
              : "0 anomali aktif terdeteksi hari ini"
          }
          progress={{
            value: nokRate,
            segments: totalAssessed > 0 ? [
              { label: "NOK", percentage: nokRate, color: "#f87171" },
              { label: "OK", percentage: okRate, color: "#4ade80" },
            ] : undefined,
          }}
          badgeText={notAdequateCount > 0 ? `${notAdequateCount} Needs Investigation` : "All Systems Nominal"}
          badgeTone={notAdequateCount > 0 ? "rose" : "green"}
          className={notAdequateCount > 0 ? "sc-alert-nok" : ""}
        />

        {/* Card 3: CHECKPOINT HARI INI (With Completion Progress Bar) */}
        <StatCard
          label="CHECKPOINT HARI INI"
          value={totalCheckpoints}
          accentColor="blue"
          icon={<Layers size={15} strokeWidth={2} />}
          subtitle={`${totalAssessed} of ${totalCheckpoints} evaluated (${completedPct}%)`}
          progress={{
            value: completedPct,
            color: "#38bdf8",
          }}
          badgeText={`${totalAssessed}/${totalCheckpoints} Selesai`}
          badgeTone="blue"
        />

        {/* Card 4: JAM PEMERIKSAAN */}
        <StatCard
          label="JAM PEMERIKSAAN"
          value={hours.length}
          unit="Slots"
          accentColor={shiftAccent}
          icon={<Clock size={15} strokeWidth={2} />}
          subtitle={`Slot ${activeShift.period} (${activeShift.label})`}
          badgeText={`${activeShift.label} Active`}
          badgeTone={shiftAccent}
        />
      </section>

      {/* ── 2. Project / Service Breakdown Row ── */}
      <section className="system-breakdown-section" aria-label="Cakupan proyek dan layanan monitoring">
        <div className="system-breakdown-header">
          <span className="system-breakdown-title">
            Status Berdasarkan Proyek/Layanan ({projects.length} Terpantau)
          </span>
          <span className="system-breakdown-hint">
            {selectedProject
              ? `Memfilter jadwal: ${selectedProject} (Klik lagi untuk reset)`
              : "Klik proyek untuk memfilter tabel jadwal di bawah"}
          </span>
        </div>

        <div className="system-cards-grid">
          {projectStats.map(({ project, total, okCount, nokCount, hasNok }) => {
            const isSelected = selectedProject?.toLowerCase() === project.toLowerCase();

            return (
              <button
                type="button"
                key={project}
                className={[
                  "system-compact-card",
                  hasNok ? "system-has-nok" : "system-all-ok",
                  isSelected ? "system-card-selected" : "",
                ].filter(Boolean).join(" ")}
                onClick={() => setSelectedProject(isSelected ? null : project)}
                aria-pressed={isSelected}
                title={`Klik untuk memfilter checkpoint proyek ${project}`}
              >
                <div className="system-card-top">
                  <span className={`system-status-dot ${hasNok ? "dot-nok" : "dot-ok"}`} aria-hidden="true" />
                  <span className="system-card-icon">{getProjectIcon(project)}</span>
                  <span className="system-card-name">{project}</span>
                  {isSelected && <span className="system-card-active-pill">Active</span>}
                </div>

                <div className="system-card-count-row">
                  <strong className="system-card-count">{total}</strong>
                  <span className="system-card-unit">checkpoints</span>
                </div>

                <div className="system-card-footer">
                  <span className={`system-health-tag ${hasNok ? "tag-nok" : "tag-ok"}`}>
                    {hasNok ? (
                      <>
                        <AlertTriangle size={11} className="health-tag-icon" />
                        <span>{nokCount} NOK</span>
                      </>
                    ) : (
                      <>
                        <Check size={11} className="health-tag-icon" />
                        <span>{okCount || total} OK</span>
                      </>
                    )}
                  </span>
                  <span className="system-card-sub">
                    {hasNok ? "Perlu mitigasi" : "All Normal"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── 3. Monitoring Schedule Table ── */}
      <MonitoringSchedule
        entries={schedule}
        assessments={assessments}
        onAssess={onAssess}
        onRequestNote={onRequestNote}
        currentHour={currentHour}
        selectedProject={selectedProject}
        onSelectProject={setSelectedProject}
      />

      {/* ── 4. Riwayat Asesmen Checkpoint (History Section) ── */}
      <MonitoringHistorySection
        todayEntries={schedule}
        todayAssessments={assessments}
      />
    </>
  );
}
