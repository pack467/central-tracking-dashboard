"use client";

import { useState } from "react";
import { Badge } from "@/app/components/ui/Badge";
import { ProjectMark } from "@/app/components/ui/ProjectMark";
import { Modal } from "@/app/components/ui/Modal";
import { useToast } from "@/app/components/ui/Toast";
import { IconFindings, IconMonitoring, IconTasks } from "@/app/components/ui/Icons";
import { formatHandoverDate } from "@/app/lib/data";
import type { HandoverRecordData, StoredHandoverRecord } from "@/app/lib/types";

interface HandoverModalProps {
  open: boolean;
  onClose: () => void;
  record: HandoverRecordData;
  records: StoredHandoverRecord[];
  loading: boolean;
  activeRecordId: number | null;
  onOpenStored: (record: StoredHandoverRecord) => void;
  onToggleTask: (id: number) => void;
  onCreateNew: () => void;
}

export function HandoverModal({
  open,
  onClose,
  record,
  records,
  loading,
  activeRecordId,
  onOpenStored,
  onToggleTask,
  onCreateNew,
}: HandoverModalProps) {
  const notify = useToast();
  const [activeTab, setActiveTab] = useState<"tasks" | "findings" | "monitoring">("tasks");
  const [filter, setFilter] = useState<"all" | "repeat" | "waiting" | "in-progress">("all");

  const tasks = record.tasks;
  const progressPercent = tasks.length
    ? Math.round((tasks.filter((task) => task.completed).length / tasks.length) * 100)
    : 0;
  const visibleTasks = filter === "all" ? tasks : tasks.filter((task) => task.state === filter);

  return (
    <Modal open={open} onClose={onClose} label="Catatan handover shift" variant="wide" width={720}>
      <header className="handover-modal-header">
        <div>
          <div className="handover-modal-kicker">
            <span className="live-dot live-dot-pulse" /> CATATAN SERAH TERIMA SHIFT
          </div>
          <h2>
            Shift {record.sourceShift} <span>→</span> {record.targetShift}
          </h2>
        </div>
        <div className="handover-header-actions">
          <button className="handover-new-trigger" onClick={onCreateNew}>
            ＋ Buat Baru
          </button>
          <button className="handover-modal-close" onClick={onClose} aria-label="Tutup">
            ×
          </button>
        </div>
      </header>

      <div className="handover-modal-scroll">
        <div className="handover-records-bar">
          <span>HANDOVER HISTORY</span>
          <div>
            {loading ? (
              <small>Memuat catatan…</small>
            ) : records.length ? (
              records.slice(0, 4).map((stored) => (
                <button
                  className={activeRecordId === stored.id ? "active" : ""}
                  key={stored.id}
                  onClick={() => {
                    setActiveTab("tasks");
                    setFilter("all");
                    onOpenStored(stored);
                  }}
                >
                  {formatHandoverDate(stored.handoverDate)}
                </button>
              ))
            ) : (
              <small>Belum ada catatan tersimpan.</small>
            )}
          </div>
        </div>

        <div className="handover-summary-card">
          <div className="handover-flow-info">
            <div className="handover-flow-party">
              <span>SENDER ({record.sourceShift.toUpperCase()})</span>
              <strong>{record.sourcePic}</strong>
            </div>
            <div className="handover-flow-arrow">➔</div>
            <div className="handover-flow-party">
              <span>RECEIVER ({record.targetShift.toUpperCase()})</span>
              <strong>{record.targetPic}</strong>
            </div>
          </div>

          <div className="handover-progress-strip">
            <div className="handover-progress-text">
              <span>Progres Konfirmasi</span>
              <strong>
                {tasks.filter((task) => task.completed).length} dari {tasks.length} Tugas ({progressPercent}%)
              </strong>
            </div>
            <div className="handover-progress-bar-bg">
              <div className="handover-progress-bar-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>

        <div className="handover-nav-tabs" role="tablist">
          <button className={activeTab === "tasks" ? "active" : ""} onClick={() => setActiveTab("tasks")} role="tab">
            <IconTasks /> Daftar Tugas ({tasks.length})
          </button>
          <button
            className={activeTab === "findings" ? "active" : ""}
            onClick={() => setActiveTab("findings")}
            role="tab"
          >
            <IconFindings /> Temuan &amp; Isu ({record.findings.length})
          </button>
          <button
            className={activeTab === "monitoring" ? "active" : ""}
            onClick={() => setActiveTab("monitoring")}
            role="tab"
          >
            <IconMonitoring /> Status Monitoring ({record.monitoredProjects.length})
          </button>
        </div>

        {activeTab === "tasks" && (
          <div className="handover-tab-content">
            <div className="handover-filters" aria-label="Filter status tugas">
              {([
                ["all", "All"],
                ["repeat", "Routine"],
                ["waiting", "Pending"],
                ["in-progress", "In Progress"],
              ] as Array<["all" | typeof filter, string]>).map(([value, label]) => (
                <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>
                  {label}
                </button>
              ))}
            </div>

            <div className="handover-task-list">
              {visibleTasks.map((task) => (
                <article className={`handover-task-card ${task.completed ? "confirmed" : ""}`} key={task.id}>
                  <button
                    className="handover-checkbox"
                    onClick={() => onToggleTask(task.id)}
                    title={task.completed ? "Batal konfirmasi" : "Konfirmasi tugas ini"}
                    aria-pressed={task.completed}
                  >
                    {task.completed ? "✓" : ""}
                  </button>
                  <div className="handover-task-body">
                    <div className="handover-task-head">
                      <ProjectMark name={task.project} />
                      <strong>{task.title}</strong>
                    </div>
                    <p>{task.detail}</p>
                  </div>
                  <span className={`handover-status handover-status-${task.state}`}>
                    {task.state === "repeat" ? "Routine" : task.state === "waiting" ? "Pending" : "In Progress"}
                  </span>
                </article>
              ))}
              {visibleTasks.length === 0 && (
                <div className="handover-empty-note">Tidak ada tugas pada filter ini.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === "findings" && (
          <div className="handover-tab-content">
            {record.findings.length ? (
              <div className="handover-finding-grid">
                {record.findings.map((finding, index) => (
                  <article className="handover-finding-card" key={`${finding.title}-${index}`}>
                    <div className="handover-finding-head">
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <ProjectMark name={finding.project || "NOC"} />
                        <strong>{finding.project || "NOC"}</strong>
                      </div>
                      <span className={`handover-status handover-status-${finding.state}`}>
                        {finding.state === "waiting" ? "Dipantau" : "On Follow Up"}
                      </span>
                    </div>
                    <h4 style={{ margin: "8px 0 4px", fontSize: "13px", color: "var(--ink-primary)" }}>
                      {finding.title || "Temuan tanpa judul"}
                    </h4>
                    <p style={{ margin: 0, fontSize: "11.5px", color: "var(--ink-secondary)", lineHeight: 1.4 }}>
                      {finding.detail || "Belum ada rincian."}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="handover-empty-note">
                Tidak ada temuan khusus yang memerlukan tindak lanjut pada shift ini.
              </div>
            )}
          </div>
        )}

        {activeTab === "monitoring" && (
          <div className="handover-tab-content">
            <div className="handover-monitoring-summary-box">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <strong>Penanggung Jawab: {record.monitoringOwner}</strong>
                <Badge tone="success">Tervalidasi</Badge>
              </div>
              <p style={{ margin: "0 0 12px", fontSize: "12px", color: "var(--ink-secondary)" }}>
                {record.monitoringSummary}
              </p>

              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "var(--ink-muted)",
                  textTransform: "uppercase",
                  display: "block",
                  marginBottom: "6px",
                }}
              >
                Proyek yang Dimonitor ({record.monitoredProjects.length})
              </span>
              <div className="handover-project-chips">
                {record.monitoredProjects.map((project) => (
                  <span key={project} className="handover-project-chip">
                    <ProjectMark name={project} /> {project}
                  </span>
                ))}
              </div>

              {record.validationNote && (
                <div className="handover-validation-box">
                  <strong>✓ Validasi Shift {record.targetShift}:</strong> {record.validationNote}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <footer className="handover-modal-footer">
        <span>{tasks.filter((task) => !task.completed).length} tugas belum dikonfirmasi</span>
        <div>
          <button
            className="button button-secondary"
            onClick={() => {
              onClose();
              notify.info("Catatan handover ditutup.", { id: "handover-modal-action" });
            }}
          >
            Tutup
          </button>
          <button
            className="button button-primary"
            onClick={() => {
              onClose();
              notify.success(`Handover ${record.sourceShift} → ${record.targetShift} dikonfirmasi.`, {
                id: "handover-modal-action",
              });
            }}
          >
            ✓ Konfirmasi Handover
          </button>
        </div>
      </footer>
    </Modal>
  );
}
