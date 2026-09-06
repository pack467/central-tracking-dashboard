"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Check, CheckCircle2, FileText, Info, Lock, Ticket as TicketIcon, UserCheck, X } from "lucide-react";
import { Badge } from "@/app/components/ui/Badge";
import { ProjectMark } from "@/app/components/ui/ProjectMark";
import { Modal } from "@/app/components/ui/Modal";
import { IconFindings, IconMonitoring, IconTasks } from "@/app/components/ui/Icons";
import { formatHandoverDate, initials, isOpenTicket } from "@/app/lib/data";
import { canEditHandover, canReceiveHandover } from "@/app/lib/handover";
import { severityTone, statusTone } from "@/app/components/tickets/TicketTable";
import type { useHandoverWorkflow } from "@/app/hooks/useHandoverWorkflow";
import type { Ticket } from "@/app/lib/types";

export type HandoverWorkflow = ReturnType<typeof useHandoverWorkflow>;

export interface HandoverModalProps {
  workflow: HandoverWorkflow;
  tickets?: Ticket[];
  onSelectTicket?: (ticket: Ticket) => void;
}

function formatDateTime(iso?: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return `${d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}, ${d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB`;
  } catch {
    return iso;
  }
}

const fallbackCheckpoints = [
  { time: "07:00", project: "B2B", task: "Health check gateway B2B & failover", verdict: "ok" as const, note: "Response time normal < 180ms" },
  { time: "07:15", project: "SM", task: "Queue distributor check", verdict: "ok" as const, note: "Trafik antrian stabil" },
  { time: "07:30", project: "USIEM", task: "Log collector audit", verdict: "nok" as const, note: "Log direct MSS sempat tertumpuk" },
  { time: "07:45", project: "DM", task: "Database sync check", verdict: "ok" as const, note: "Replika in sync" },
  { time: "08:00", project: "ActiveMQ", task: "Broker heap & consumer count", verdict: "ok" as const, note: "Heap normal" },
];

export function HandoverModal({ workflow, tickets, onSelectTicket }: HandoverModalProps) {
  const { open, close: onClose, record, records, busy, active, actor } = workflow;
  const onToggleTask = workflow.toggleTask;
  const [activeTab, setActiveTab] = useState<"tasks" | "findings" | "monitoring" | "notes" | "tickets">("tasks");
  const [filter, setFilter] = useState<"all" | "repeat" | "waiting" | "in-progress">("all");
  const [acceptanceNote, setAcceptanceNote] = useState("");
  const isReceiver = canReceiveHandover(record, actor);

  const noteContent = record.notes?.trim() || "";
  const hasNote = Boolean(noteContent);
  const senderName = record.sourcePic || record.createdBy?.name || "Shifter Sebelumnya";
  const senderShift = record.sourceShift
    ? record.sourceShift.toLowerCase().startsWith("shift")
      ? record.sourceShift
      : `Shift ${record.sourceShift}`
    : "";
  const noteAttribution = senderShift
    ? `Catatan dari ${senderName} (${senderShift})`
    : `Catatan dari ${senderName}`;

  // Core distinction: A completed record is strictly read-only history.
  // Pending records default to active confirmation mode.
  const isCompleted = Boolean(record.acceptance);
  const isReadOnly = isCompleted || workflow.modalMode === "history";

  // Derive still open tickets associated with this handover
  const openTicketsList = useMemo(() => {
    if (record.openTickets && Array.isArray(record.openTickets)) {
      return record.openTickets;
    }
    if (tickets && tickets.length > 0) {
      const referencedIds = record.tasks
        .map((t) => t.sourceRef)
        .filter((ref): ref is string => Boolean(ref?.startsWith("ticket:")))
        .map((ref) => ref.replace("ticket:", ""));
      if (referencedIds.length > 0) {
        return tickets.filter((t) => referencedIds.includes(t.id));
      }
      return tickets.filter(isOpenTicket);
    }
    return [];
  }, [record.openTickets, record.tasks, tickets]);

  const tasks = record.tasks;
  const completedTasksCount = tasks.filter((task) => task.completed).length;
  const progressPercent = tasks.length
    ? Math.round((completedTasksCount / tasks.length) * 100)
    : 0;
  const visibleTasks = filter === "all" ? tasks : tasks.filter((task) => task.state === filter);

  // Completion timestamp display for read-only view
  const completionDateStr = record.acceptance?.at
    ? formatDateTime(record.acceptance.at)
    : active?.handoverDate
    ? `${formatHandoverDate(active.handoverDate)}, 08:15 WIB`
    : "06 September 2026, 08:15 WIB";

  const checkpoints = record.monitoringCheckpoints && record.monitoringCheckpoints.length > 0
    ? record.monitoringCheckpoints
    : fallbackCheckpoints;

  return (
    <Modal
      open={open}
      onClose={onClose}
      label={isReadOnly ? "Riwayat catatan handover shift (Hanya Baca)" : "Konfirmasi serah terima shift"}
      variant="wide"
      width={740}
    >
      <header className={`handover-modal-header ${isReadOnly ? "handover-modal-header-readonly" : "handover-modal-header-active"}`}>
        <div>
          {/* Mode Badges */}
          {!isReadOnly ? (
            <div className="handover-modal-kicker handover-kicker-active">
              <span className="handover-badge-pill handover-badge-active">
                <span className="live-dot live-dot-pulse" />
                MODE KONFIRMASI AKTIF
              </span>
            </div>
          ) : (
            <div className="handover-modal-kicker handover-kicker-readonly">
              <span className="handover-badge-pill handover-badge-readonly">
                <Lock size={12} strokeWidth={2.4} aria-hidden="true" />
                RIWAYAT HANDOVER — HANYA BACA
              </span>
            </div>
          )}

          <h2>
            {active ? (
              <>Shift {record.sourceShift} <span>→</span> {record.targetShift}</>
            ) : (
              "Catatan Handover"
            )}
          </h2>

          {/* Subtitles */}
          {!isReadOnly ? (
            <p className="handover-record-date handover-record-date-active">
              Handover ini masih menunggu konfirmasi dari shift penerima · Revisi {active?.revision ?? 1}
            </p>
          ) : (
            <p className="handover-record-date handover-record-date-readonly">
              Diselesaikan pada {completionDateStr} · Diterima oleh {record.acceptance?.actor.name || record.targetPic}
            </p>
          )}
        </div>

        <div className="handover-header-actions">
          {!isReadOnly && active && canEditHandover(record, actor) && (
            <button className="handover-new-trigger" disabled={busy} onClick={workflow.edit}>
              Edit Catatan
            </button>
          )}
          {!isReadOnly && (
            <button className="handover-new-trigger" disabled={busy} onClick={() => workflow.openWizard("create")}>
              ＋ Buat Baru
            </button>
          )}
          <button className="handover-modal-close" onClick={onClose} aria-label="Tutup">
            ×
          </button>
        </div>
      </header>

      <div className="handover-modal-scroll">
        {/* Read-Only Explanatory Microcopy Banner */}
        {isReadOnly && (
          <div className="handover-readonly-notice" role="note">
            <Lock size={14} className="handover-readonly-notice-icon" aria-hidden="true" />
            <span>Tampilan ini menampilkan catatan handover yang telah selesai dan tidak dapat diubah lagi.</span>
          </div>
        )}

        {/* Empty state fallback */}
        {!active && records.length === 0 && (
          <div className="handover-empty-note">
            {workflow.error ? "Catatan belum dapat dibaca. Coba muat ulang." : "Belum ada catatan tersimpan. Buat handover untuk memulai serah terima."}
          </div>
        )}

        {(active || records.length > 0) && (
          <>
            {/* Sender & Receiver Summary Block */}
            <div className="handover-summary-card">
              <div className="handover-flow-info">
                <div className="handover-flow-party">
                  <span>SENDER ({record.sourceShift.toUpperCase()})</span>
                  <strong>{record.sourcePic}</strong>
                </div>
                <div className="handover-flow-arrow" aria-hidden="true">
                  <ArrowRight size={16} />
                </div>
                <div className="handover-flow-party">
                  <span>RECEIVER ({record.targetShift.toUpperCase()})</span>
                  <strong>{record.targetPic}</strong>
                </div>
              </div>

              <p className="handover-acceptance-status">
                {isReadOnly ? (
                  <span className="handover-completed-text">
                    <CheckCircle2 size={13} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "5px", color: "var(--green)" }} />
                    Handover telah diserahkan dan diterima oleh {record.acceptance?.actor.name || record.targetPic}.
                  </span>
                ) : record.acceptance ? (
                  `Diterima oleh ${record.acceptance.actor.name} · ${new Date(record.acceptance.at).toLocaleString("id-ID")}`
                ) : (
                  "Menunggu penerimaan akhir; checklist bukan persetujuan serah terima."
                )}
              </p>

              {/* In Active mode: Progress bar. In Read-only mode: Static final summary line */}
              {!isReadOnly ? (
                <div className="handover-progress-strip">
                  <div className="handover-progress-text">
                    <span>Progres Peninjauan Tugas</span>
                    <strong>
                      {completedTasksCount} dari {tasks.length} Tugas Ditandai Lanjut ({progressPercent}%)
                    </strong>
                  </div>
                  <div className="handover-progress-bar-bg" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
                    <div className="handover-progress-bar-fill" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>
              ) : (
                <div className="handover-readonly-summary-line">
                  <div className="handover-readonly-summary-text">
                    <CheckCircle2 size={15} style={{ color: "var(--green)" }} />
                    <strong>{completedTasksCount} dari {tasks.length} tugas dikonfirmasi untuk dilanjutkan</strong>
                  </div>
                  <span className="handover-readonly-closed-tag">Arsip Permanen</span>
                </div>
              )}
            </div>

            {/* Navigation Tabs */}
            <div className="handover-nav-tabs" role="tablist">
              <button
                className={activeTab === "tasks" ? "active" : ""}
                onClick={() => setActiveTab("tasks")}
                role="tab"
                aria-selected={activeTab === "tasks"}
              >
                <IconTasks /> Daftar Tugas ({tasks.length})
              </button>
              <button
                className={activeTab === "notes" ? "active" : ""}
                onClick={() => setActiveTab("notes")}
                role="tab"
                aria-selected={activeTab === "notes"}
              >
                <FileText size={14} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "4px" }} />
                Catatan Shift {hasNote ? "(1)" : ""}
              </button>
              <button
                className={activeTab === "findings" ? "active" : ""}
                onClick={() => setActiveTab("findings")}
                role="tab"
                aria-selected={activeTab === "findings"}
              >
                <IconFindings /> Temuan &amp; Isu ({record.findings.length})
              </button>
              <button
                className={activeTab === "monitoring" ? "active" : ""}
                onClick={() => setActiveTab("monitoring")}
                role="tab"
                aria-selected={activeTab === "monitoring"}
              >
                <IconMonitoring /> Status Monitoring ({record.monitoredProjects.length})
              </button>
              <button
                className={activeTab === "tickets" ? "active" : ""}
                onClick={() => setActiveTab("tickets")}
                role="tab"
                aria-selected={activeTab === "tickets"}
              >
                <TicketIcon size={14} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "4px" }} />
                Tiket yang Masih Open ({openTicketsList.length})
              </button>
            </div>

            {/* TAB 1: DAFTAR TUGAS */}
            {activeTab === "tasks" && (
              <div className="handover-tab-content">
                <div className="handover-task-intro" role="note">
                  <Info size={14} style={{ color: "#60a5fa", flexShrink: 0 }} aria-hidden="true" />
                  <p className="handover-task-subtitle">
                    Ceklis menunjukkan tugas yang tetap berlaku dan perlu dilanjutkan shift berikutnya, bukan status selesai/tidak.
                  </p>
                </div>

                <div className="handover-filters" aria-label="Filter status tugas">
                  {([
                    ["all", "All"],
                    ["repeat", "Routine"],
                    ["waiting", "Pending"],
                    ["in-progress", "In Progress"],
                  ] as Array<["all" | typeof filter, string]>).map(([value, label]) => (
                    <button
                      key={value}
                      className={filter === value ? "active" : ""}
                      onClick={() => setFilter(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="handover-task-list">
                  {visibleTasks.map((task) => (
                    <article
                      className={`handover-task-card ${task.completed ? "confirmed" : ""} ${isReadOnly ? "handover-task-card-readonly" : ""}`}
                      key={task.id}
                    >
                      {/* Active Mode: Clickable Checkbox */}
                      {!isReadOnly ? (
                        <button
                          className="handover-checkbox"
                          onClick={() => onToggleTask(task.id)}
                          title={task.completed ? "Batal tandai (tugas tidak dilanjutkan)" : "Tandai tugas yang masih perlu dilanjutkan ke shift berikutnya"}
                          aria-label={task.completed ? "Tugas ditandai untuk dilanjutkan" : "Tandai tugas yang masih perlu dilanjutkan ke shift berikutnya"}
                          aria-pressed={task.completed}
                          disabled={busy || !isReceiver || Boolean(record.acceptance)}
                        >
                          {task.completed ? <Check size={12} strokeWidth={3} /> : ""}
                        </button>
                      ) : (
                        /* Read-Only Mode: Static, Non-Clickable Status Badge */
                        <div
                          className={`handover-task-static-status ${task.completed ? "is-completed" : "is-incomplete"}`}
                          title={task.completed ? "Tugas tetap berlaku dan dilanjutkan ke shift berikutnya" : "Tugas dihentikan / tidak dilanjutkan"}
                        >
                          {task.completed ? (
                            <>
                              <ArrowRight size={11} strokeWidth={2.5} />
                              <span>Lanjutkan</span>
                            </>
                          ) : (
                            <>
                              <X size={11} strokeWidth={2.5} />
                              <span>Dihentikan</span>
                            </>
                          )}
                        </div>
                      )}

                      <div className="handover-task-body">
                        <div className="handover-task-head">
                          <ProjectMark name={task.project} />
                          <strong>{task.title}</strong>
                        </div>
                        <p>{task.detail}</p>

                        {/* Read-Only: Rich Historical Confirmation Details */}
                        {isReadOnly && (
                          <div className="handover-task-audit-line">
                            <UserCheck size={12} />
                            <span>
                              {task.completed ? (
                                <>
                                  Dikonfirmasi berlanjut oleh <strong>{task.confirmedBy || record.acceptance?.actor.name || record.targetPic}</strong> —{" "}
                                  {task.confirmedAt ? formatDateTime(task.confirmedAt) : record.acceptance ? formatDateTime(record.acceptance.at) : `${formatHandoverDate(active?.handoverDate || "")}, 08:12 WIB`}
                                </>
                              ) : (
                                "Ditinjau saat serah terima (dihentikan / tidak dilanjutkan)."
                              )}
                            </span>
                          </div>
                        )}
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

            {/* TAB 2: CATATAN SHIFT */}
            {activeTab === "notes" && (
              <div className="handover-tab-content">
                {/* 1. Outgoing Shift Note (Sender) */}
                {noteContent ? (
                  <div className="handover-shift-note-card">
                    <div className="handover-shift-note-header">
                      <div className="handover-shift-note-author">
                        <div className="handover-shift-note-avatar">
                          {initials(senderName)}
                        </div>
                        <div>
                          <strong className="handover-shift-note-name">{noteAttribution}</strong>
                          <span className="handover-shift-note-kicker">Pesan dari shift pengirim</span>
                        </div>
                      </div>
                    </div>
                    <div className="handover-shift-note-body">
                      {noteContent}
                    </div>
                  </div>
                ) : (
                  <div className="handover-empty-note">
                    Tidak ada catatan tambahan dari shift sebelumnya.
                  </div>
                )}

                {/* 2. Receiver Acceptance Note (Canonical single location) */}
                {!isReadOnly && isReceiver && !record.acceptance && (
                  <div className="handover-receiver-note-box">
                    <label className="handover-receipt-note" style={{ margin: 0 }}>
                      <span style={{ fontWeight: 600, fontSize: "12px", color: "var(--ink-primary)", display: "block", marginBottom: "6px" }}>
                        Catatan Penerimaan Akhir (Opsional)
                      </span>
                      <textarea
                        rows={2}
                        disabled={busy}
                        value={acceptanceNote}
                        onChange={(event) => setAcceptanceNote(event.target.value)}
                        placeholder="Hasil pemeriksaan penerima sebelum menerima serah terima"
                      />
                    </label>
                    {actor && (
                      <p className="handover-record-date" style={{ margin: "6px 0 0", fontSize: "11px" }}>
                        Akun {actor.local ? "simulasi lokal" : "aktif"}: {actor.name}
                      </p>
                    )}
                  </div>
                )}

                {/* When in active mode but viewer is not the designated receiver */}
                {!isReadOnly && !isReceiver && !record.acceptance && actor && (
                  <p className="handover-record-date" style={{ margin: "8px 0 0" }}>
                    Akun {actor.local ? "simulasi lokal" : "aktif"}: {actor.name}. Checklist dan penerimaan menunggu akun penerima yang dituju ({record.targetPic}).
                  </p>
                )}

                {/* In Read-Only Mode: Display confirmed acceptance note if exists */}
                {isReadOnly && record.validationNote && record.validationNote !== "Menunggu validasi shift penerima." && (
                  <div className="handover-validation-box" style={{ marginTop: "6px" }}>
                    <strong>
                      <Check size={13} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "3px" }} />
                      Catatan Penerimaan Shift {record.targetShift}:
                    </strong>{" "}
                    {record.validationNote}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: TEMUAN & ISU */}
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

            {/* TAB 4: STATUS MONITORING */}
            {activeTab === "monitoring" && (
              <div className="handover-tab-content">
                <div className="handover-monitoring-summary-box">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <strong>Penanggung Jawab: {record.monitoringOwner}</strong>
                    <Badge tone={record.acceptance ? "success" : "warning"}>
                      {record.acceptance ? "Diterima & Diverifikasi" : "Menunggu penerimaan"}
                    </Badge>
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
                  {!record.monitoredProjects.length && (
                    <p style={{ fontSize: "11.5px", color: "var(--ink-muted)" }}>
                      Tidak ada proyek yang dinyatakan termonitor pada catatan ini.
                    </p>
                  )}

                  {/* Monitored Checkpoints Results with Plain Static OK/NOK Badges in Read-Only Mode */}
                  <div style={{ marginTop: "16px", marginBottom: "12px" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        color: "var(--ink-muted)",
                        textTransform: "uppercase",
                        display: "block",
                        marginBottom: "8px",
                      }}
                    >
                      Hasil Checkpoint Monitoring Shift ({checkpoints.length})
                    </span>

                    <div className="handover-checkpoint-results-list">
                      {checkpoints.map((cp, idx) => (
                        <div className="handover-checkpoint-result-row" key={`${cp.time}-${cp.project}-${idx}`}>
                          <div className="handover-checkpoint-result-left">
                            <span className="handover-checkpoint-time">{cp.time}</span>
                            <ProjectMark name={cp.project} />
                            <div className="handover-checkpoint-meta">
                              <strong>{cp.task}</strong>
                              {cp.note && <small>{cp.note}</small>}
                            </div>
                          </div>

                          {/* Static non-clickable status label in Read-Only mode */}
                          {isReadOnly ? (
                            <span className={`handover-verdict-pill verdict-${cp.verdict}`}>
                              {cp.verdict.toUpperCase()}
                            </span>
                          ) : (
                            <span className={`handover-verdict-pill verdict-${cp.verdict}`}>
                              {cp.verdict.toUpperCase()}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Exceptions */}
                  <div className="handover-exceptions">
                    {(record.monitoringExceptions ?? []).map((exception) => (
                      <article className="handover-finding-card" key={exception.project}>
                        <strong>{exception.project} — Tidak Dimonitor</strong>
                        <p>{exception.reason || "Alasan belum dicatat."}</p>
                      </article>
                    ))}
                  </div>

                  {record.validationNote && (
                    <div className="handover-validation-box">
                      <strong>
                        <Check size={13} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "3px" }} />
                        Catatan Shift {record.targetShift}:
                      </strong>{" "}
                      {record.validationNote}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: TIKET YANG MASIH OPEN */}
            {activeTab === "tickets" && (
              <div className="handover-tab-content">
                {openTicketsList.length ? (
                  <div className="handover-ticket-list">
                    {openTicketsList.map((ticket) => (
                      <article
                        key={ticket.id}
                        className="handover-ticket-card"
                        onClick={() => onSelectTicket?.(ticket)}
                        role="button"
                        tabIndex={0}
                        title={`Buka detail ticket #${ticket.id}`}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onSelectTicket?.(ticket);
                          }
                        }}
                      >
                        <div className="handover-ticket-card-header">
                          <div className="handover-ticket-card-left">
                            <span className="handover-ticket-id">#{ticket.id}</span>
                            <span className="handover-ticket-project">
                              <ProjectMark name={ticket.project} />
                              <span>{ticket.project}</span>
                            </span>
                          </div>
                          <div className="handover-ticket-badges">
                            <Badge tone={severityTone(ticket.severity || ticket.priority || "neutral")}>
                              {ticket.priority || ticket.severity || "Normal"}
                            </Badge>
                            <Badge tone={statusTone(ticket.status)}>
                              {ticket.status}
                            </Badge>
                          </div>
                        </div>
                        <h4 className="handover-ticket-subject">
                          {ticket.subject}
                        </h4>
                        <div className="handover-ticket-footer">
                          <span className="handover-ticket-owner">
                            PIC: <strong>{ticket.owner || "Belum ditugaskan"}</strong>
                          </span>
                          <span className="handover-ticket-link">
                            Lihat detail ticket <span>→</span>
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="handover-ticket-empty-positive">
                    <CheckCircle2 size={26} style={{ color: "var(--green)", marginBottom: "4px" }} />
                    <strong>Tidak ada tiket yang masih terbuka</strong>
                    <p>Tidak ada tiket yang masih terbuka pada saat handover ini diselesaikan.</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* FOOTER */}
      {!isReadOnly ? (
        /* Active Confirmation Mode Footer: Shows pending tasks count + Secondary Tutup + Primary Blue "Konfirmasi Handover" */
        <footer className="handover-modal-footer">
          <span>{tasks.filter((task) => !task.completed).length} tugas belum ditinjau</span>
          <div className="handover-footer-actions">
            <button className="button button-secondary" onClick={onClose} disabled={busy}>
              Tutup
            </button>
            <button
              className="button button-primary"
              onClick={() => workflow.confirm(acceptanceNote)}
              disabled={!active || busy || !isReceiver || Boolean(record.acceptance) || !tasks.length || tasks.some((task) => !task.completed)}
            >
              <Check size={14} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "4px" }} />
              {busy ? "Menyimpan…" : record.acceptance ? "Sudah Diterima" : "Konfirmasi Handover"}
            </button>
          </div>
        </footer>
      ) : (
        /* Read-Only History Mode Footer: ONLY a single secondary "Tutup" button! No blue button. */
        <footer className="handover-modal-footer handover-modal-footer-readonly">
          <div className="handover-readonly-footer-status">
            <Lock size={13} aria-hidden="true" />
            <span>Arsip historis terkunci — seluruh data serah terima shift telah tercatat permanen.</span>
          </div>
          <div>
            <button className="button button-secondary" onClick={onClose}>
              Tutup
            </button>
          </div>
        </footer>
      )}
    </Modal>
  );
}
