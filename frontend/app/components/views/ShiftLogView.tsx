"use client";

import { useMemo, useState } from "react";
import {
  History,
  Calendar,
  ArrowRight,
  Eye,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CheckSquare,
  FileText,
  Ticket as TicketIcon,
} from "lucide-react";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { useToast } from "@/app/components/ui/Toast";
import { formatHandoverDate, initials } from "@/app/lib/data";
import type { HandoverRecordData, StoredHandoverRecord } from "@/app/lib/types";
import { canEditHandover, parseHandoverContent } from "@/app/lib/handover";
import {
  HandoverHistoryControls,
  HandoverHistoryMore,
  type HandoverWorkflow,
} from "@/app/components/handover/HandoverHistoryControls";

function parseContent(record: StoredHandoverRecord): HandoverRecordData | null {
  try {
    return parseHandoverContent(record.content);
  } catch {
    return null;
  }
}

const AVATAR_PALETTES = [
  { bg: "rgba(56, 189, 248, 0.18)", text: "#38bdf8", border: "rgba(56, 189, 248, 0.4)" },
  { bg: "rgba(168, 85, 247, 0.18)", text: "#c084fc", border: "rgba(168, 85, 247, 0.4)" },
  { bg: "rgba(16, 185, 129, 0.18)", text: "#34d399", border: "rgba(16, 185, 129, 0.4)" },
  { bg: "rgba(245, 158, 11, 0.18)", text: "#fbbf24", border: "rgba(245, 158, 11, 0.4)" },
  { bg: "rgba(244, 63, 94, 0.18)", text: "#fb7185", border: "rgba(244, 63, 94, 0.4)" },
  { bg: "rgba(99, 102, 241, 0.18)", text: "#818cf8", border: "rgba(99, 102, 241, 0.4)" },
  { bg: "rgba(20, 184, 166, 0.18)", text: "#2dd4bf", border: "rgba(20, 184, 166, 0.4)" },
];

function getAvatarPalette(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
}

function parsePicNames(picString: string): string[] {
  if (!picString) return [];
  return picString
    .split(/[,;&]|\s+dan\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function ShiftLogView({ workflow }: { workflow: HandoverWorkflow }) {
  const { records, loading, openStored: onOpenRecord, remove: onDeleteRecord } = workflow;
  const visibleRecords = records;
  const notify = useToast();
  const [pendingDelete, setPendingDelete] = useState<StoredHandoverRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const stats = useMemo(() => {
    let pendingCount = 0;
    let acceptedCount = 0;
    let totalFindings = 0;
    let totalTasks = 0;

    for (const record of visibleRecords) {
      const content = parseContent(record);
      if (!content) continue;
      if (content.acceptance) {
        acceptedCount++;
      } else {
        pendingCount++;
      }
      totalFindings += content.findings?.length ?? 0;
      totalTasks += content.tasks?.length ?? 0;
    }

    return {
      totalRecords: workflow.total || visibleRecords.length,
      acceptedCount,
      pendingCount,
      totalFindings,
      totalTasks,
    };
  }, [visibleRecords, workflow.total]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await onDeleteRecord(pendingDelete.id);
      notify.success("Catatan handover dihapus.", { id: `handover-delete-${pendingDelete.id}` });
      setPendingDelete(null);
    } catch {
      notify.critical("Catatan belum dapat dihapus. Coba lagi.", { id: `handover-delete-${pendingDelete.id}` });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <section className="page-heading shift-log-heading">
        <div>
          <div className="eyebrow">
            <span className="live-dot live-dot-pulse" /> RIWAYAT SERAH TERIMA
          </div>
          <div className="shift-log-title-row">
            <span className="shift-log-title-icon">
              <History size={18} />
            </span>
            <h1 style={{ margin: 0 }}>Log Shift</h1>
          </div>
          <p style={{ margin: 0 }}>Timeline catatan handover historis yang tersimpan pada database Cloudflare D1.</p>
        </div>

        {/* Top summary stat cards */}
        <div className="shift-log-stats-row">
          <div className="shift-log-stat-card">
            <span className="shift-log-stat-icon is-total">
              <FileText size={17} />
            </span>
            <div className="shift-log-stat-meta">
              <span className="shift-log-stat-val">{stats.totalRecords}</span>
              <span className="shift-log-stat-lbl">Handover Tercatat</span>
            </div>
          </div>

          <div className="shift-log-stat-card">
            <span className="shift-log-stat-icon is-completed">
              <CheckCircle2 size={17} />
            </span>
            <div className="shift-log-stat-meta">
              <span className="shift-log-stat-val">{stats.acceptedCount}</span>
              <span className="shift-log-stat-lbl">Selesai Diterima</span>
            </div>
          </div>

          <div className="shift-log-stat-card">
            <span className="shift-log-stat-icon is-pending">
              <Clock size={17} />
            </span>
            <div className="shift-log-stat-meta">
              <span className="shift-log-stat-val">{stats.pendingCount}</span>
              <span className="shift-log-stat-lbl">Menunggu Penerimaan</span>
            </div>
          </div>

          <div className="shift-log-stat-card">
            <span className="shift-log-stat-icon is-findings">
              <AlertTriangle size={17} />
            </span>
            <div className="shift-log-stat-meta">
              <span className="shift-log-stat-val">{stats.totalFindings}</span>
              <span className="shift-log-stat-lbl">Temuan Dicatat</span>
            </div>
          </div>
        </div>
      </section>

      <article className="panel view-panel">
        <HandoverHistoryControls workflow={workflow} />

        {loading ? (
          <div className="log-loading">Memuat riwayat handover…</div>
        ) : visibleRecords.length ? (
          <ol className="shift-timeline">
            {visibleRecords.map((record) => {
              const content = parseContent(record);
              const done = content?.tasks.filter((task) => task.completed).length ?? 0;
              const total = content?.tasks.length ?? 0;
              const percent = total ? Math.round((done / total) * 100) : 0;
              const isAccepted = Boolean(content?.acceptance);
              const isEditable = Boolean(content && canEditHandover(content, workflow.actor));

              return (
                <li className="timeline-item" key={record.id}>
                  {/* Polished timeline marker node */}
                  <span
                    className={`timeline-marker ${isAccepted ? "marker-accepted" : "marker-pending"}`}
                    title={isAccepted ? "Handover Selesai Diterima" : "Menunggu Penerimaan"}
                  >
                    {isAccepted ? <CheckCircle2 size={15} /> : <Clock size={15} />}
                  </span>

                  <article className="timeline-card">
                    <header className="timeline-head">
                      <div className="timeline-head-left">
                        <div className="timeline-status-row">
                          <span className={`timeline-status-pill ${isAccepted ? "status-accepted" : "status-pending"}`}>
                            {isAccepted ? (
                              <>
                                <CheckCircle2 size={12} />
                                Selesai Diterima
                              </>
                            ) : (
                              <>
                                <Clock size={12} />
                                Menunggu Penerimaan
                              </>
                            )}
                          </span>
                          <span className="timeline-date-chip">
                            <Calendar size={12} />
                            {formatHandoverDate(record.handoverDate)}
                          </span>
                        </div>
                        <h3 className="timeline-title">{record.title}</h3>
                      </div>

                      <div className="timeline-actions">
                        <button
                          type="button"
                          className="timeline-action-btn timeline-btn-open"
                          disabled={workflow.busy}
                          onClick={() => void onOpenRecord(record)}
                        >
                          <Eye size={13} />
                          Buka detail
                        </button>
                        <button
                          type="button"
                          className="timeline-action-btn timeline-btn-delete"
                          disabled={workflow.busy || !isEditable}
                          title={
                            !isEditable
                              ? "Hanya pembuat atau personil terkait yang dapat menghapus"
                              : "Hapus catatan handover"
                          }
                          onClick={() => setPendingDelete(record)}
                        >
                          <Trash2 size={13} />
                          Hapus
                        </button>
                      </div>
                    </header>

                    {content ? (
                      <>
                        {/* Sender → Receiver Flow with Avatars */}
                        <div className="timeline-flow-container">
                          <div className="shift-flow-card">
                            <div className="shift-flow-role">
                              <span className="shift-role-badge">DARI</span>
                              <span className="shift-name-tag">{content.sourceShift}</span>
                            </div>
                            <div className="shift-flow-people">
                              {parsePicNames(content.sourcePic).map((person) => {
                                const palette = getAvatarPalette(person);
                                return (
                                  <span className="shift-person-pill" key={person} title={person}>
                                    <span
                                      className="shift-person-avatar"
                                      style={{
                                        background: palette.bg,
                                        color: palette.text,
                                        borderColor: palette.border,
                                      }}
                                    >
                                      {initials(person)}
                                    </span>
                                    <span className="shift-person-name">{person}</span>
                                  </span>
                                );
                              })}
                            </div>
                          </div>

                          <div className="timeline-flow-arrow" title="Diserahkan kepada">
                            <ArrowRight size={14} />
                          </div>

                          <div className="shift-flow-card">
                            <div className="shift-flow-role">
                              <span className="shift-role-badge">KEPADA</span>
                              <span className="shift-name-tag">{content.targetShift}</span>
                            </div>
                            <div className="shift-flow-people">
                              {parsePicNames(content.targetPic).map((person) => {
                                const palette = getAvatarPalette(person);
                                return (
                                  <span className="shift-person-pill" key={person} title={person}>
                                    <span
                                      className="shift-person-avatar"
                                      style={{
                                        background: palette.bg,
                                        color: palette.text,
                                        borderColor: palette.border,
                                      }}
                                    >
                                      {initials(person)}
                                    </span>
                                    <span className="shift-person-name">{person}</span>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Bottom Progress & Stat Badges */}
                        <div className="timeline-bottom-row">
                          <div className="timeline-progress-section">
                            <div className="timeline-progress-labels">
                              <span className="timeline-progress-title">
                                Checklist: <strong>{percent}%</strong>
                              </span>
                              <span className="timeline-progress-counts">
                                ({done}/{total} tugas selesai)
                              </span>
                            </div>
                            <div className="timeline-progress-bar-wrap">
                              <div
                                className={`timeline-progress-bar-fill ${isAccepted ? "is-accepted" : ""}`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            {content.acceptance && (
                              <span className="timeline-accepted-note">
                                ✓ Diterima oleh {content.acceptance.actor.name}
                              </span>
                            )}
                          </div>

                          <div className="timeline-badges-section">
                            <span
                              className={`timeline-stat-badge ${
                                content.findings.length > 0 ? "badge-warning" : "badge-neutral"
                              }`}
                            >
                              <AlertTriangle size={12} />
                              {content.findings.length} Temuan
                            </span>

                            <span className="timeline-stat-badge badge-tasks">
                              <CheckSquare size={12} />
                              {total} Tugas
                            </span>

                            {Boolean(content.openTickets && content.openTickets.length > 0) && (
                              <span className="timeline-stat-badge badge-tickets">
                                <TicketIcon size={12} />
                                {content.openTickets!.length} Tiket Open
                              </span>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="timeline-meta" style={{ margin: "8px 0 0", color: "var(--red)" }}>
                        Konten catatan tidak dapat dibaca atau rusak.
                      </p>
                    )}
                  </article>
                </li>
              );
            })}
          </ol>
        ) : (
          <EmptyState
            icon="≡"
            title={
              workflow.error
                ? "Catatan belum dapat dimuat"
                : workflow.filters.date || workflow.filters.pic
                ? "Tidak ada catatan yang cocok"
                : "Belum ada catatan handover"
            }
            message="Buat catatan handover pertama dari dashboard untuk mulai mengisi riwayat serah-terima shift."
          />
        )}

        <HandoverHistoryMore workflow={workflow} />
      </article>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        danger
        title="Hapus catatan handover ini?"
        message={
          pendingDelete
            ? `${pendingDelete.title} · ${formatHandoverDate(pendingDelete.handoverDate)} akan dihapus permanen dari database.`
            : ""
        }
        confirmLabel={deleting ? "Menghapus…" : "Ya, hapus"}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}

