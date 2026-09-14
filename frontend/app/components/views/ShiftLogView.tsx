"use client";

import { useEffect, useMemo, useState } from "react";
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
  TicketCheck,
  ClipboardList,
  Ticket as TicketIcon,
} from "lucide-react";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { useToast } from "@/app/components/ui/Toast";
import { formatHandoverDate, initials, isOpenTicket } from "@/app/lib/data";
import type { HandoverRecordData, StoredHandoverRecord } from "@/app/lib/types";
import { canEditHandover, getTaskIdentity, isNewlyAddedTask, parseHandoverContent } from "@/app/lib/handover";
import {
  HandoverHistoryControls,
  type HandoverWorkflow,
} from "@/app/components/handover/HandoverHistoryControls";

function parseContent(record: StoredHandoverRecord): HandoverRecordData | null {
  try {
    return parseHandoverContent(record.content);
  } catch {
    return null;
  }
}

/**
 * Builds a lookup map linking each shift record to the previous shift's total task count
 * along its rotation/lineage chain.
 */
function buildShiftLineageMap(records: StoredHandoverRecord[]): Map<number, number> {
  const map = new Map<number, number>();
  const chronological = [...records].sort((a, b) => {
    const dateComp = a.handoverDate.localeCompare(b.handoverDate);
    if (dateComp !== 0) return dateComp;
    return a.id - b.id;
  });

  for (let i = 0; i < chronological.length; i++) {
    const current = chronological[i];
    const currentContent = parseContent(current);
    const currentTasks = currentContent?.tasks.length ?? 0;
    const currentNewTasks = currentContent?.tasks.filter(isNewlyAddedTask).length ?? 0;

    // Look back for preceding shift transition (candidate.targetShift === current.sourceShift)
    let prevRecord: StoredHandoverRecord | null = null;
    for (let j = i - 1; j >= 0; j--) {
      const candidate = chronological[j];
      const candContent = parseContent(candidate);
      if (candContent && candContent.targetShift === currentContent?.sourceShift) {
        prevRecord = candidate;
        break;
      }
    }

    // Fallback to chronologically preceding record if no exact rotation match
    if (!prevRecord && i > 0) {
      prevRecord = chronological[i - 1];
    }

    if (prevRecord) {
      const prevContent = parseContent(prevRecord);
      map.set(current.id, prevContent?.tasks.length ?? Math.max(0, currentTasks - currentNewTasks));
    } else {
      // Starting baseline for the very first record in history
      const baseline = Math.max(0, currentTasks - currentNewTasks);
      map.set(current.id, baseline);
    }
  }

  return map;
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

  // Pagination state (default: 10 rows per page)
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [workflow.filters.date, workflow.filters.pic]);

  const lineageMap = useMemo(() => buildShiftLineageMap(visibleRecords), [visibleRecords]);

  const totalCount = visibleRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIdx = (safeCurrentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalCount);
  const paginatedRecords = visibleRecords.slice(startIdx, endIdx);

  const pageNumbers = useMemo(() => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) pages.push("...");
      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(totalPages - 1, safeCurrentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safeCurrentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, safeCurrentPage]);

  const stats = useMemo(() => {
    let completedShiftsCount = 0; // "Total Shift Selesai"
    let totalFindings = 0;        // "Jumlah Temuan"
    let closedTicketsCount = 0;   // "Total Tiket Selesai"
    const uniqueTaskSet = new Set<string>(); // "Total Tugas Dikerjakan" (deduplicated)

    for (const record of visibleRecords) {
      const content = parseContent(record);
      if (!content) continue;

      // a. "Total Shift Selesai": count of handover records where status = fully completed/received
      if (content.acceptance) {
        completedShiftsCount++;
      }

      // b. "Jumlah Temuan": sum of findings across all logged handovers
      totalFindings += content.findings?.length ?? 0;

      // c. "Total Tiket Selesai": total count of tickets closed/resolved during logged shifts,
      // explicitly EXCLUDING any tickets still marked "Open".
      const shiftClosedTicketIds = new Set<string>();
      if (content.closedTickets && Array.isArray(content.closedTickets)) {
        for (const ticket of content.closedTickets) {
          if (!isOpenTicket(ticket) || ["closed", "selesai", "resolved"].includes(ticket.status?.toLowerCase())) {
            shiftClosedTicketIds.add(ticket.id);
          }
        }
      }
      if (content.openTickets && Array.isArray(content.openTickets)) {
        for (const ticket of content.openTickets) {
          if (!isOpenTicket(ticket) || ["closed", "selesai", "resolved"].includes(ticket.status?.toLowerCase())) {
            shiftClosedTicketIds.add(ticket.id);
          }
        }
      }
      if (content.tasks && Array.isArray(content.tasks)) {
        for (const task of content.tasks) {
          if (task.completed && task.sourceRef?.startsWith("ticket:")) {
            shiftClosedTicketIds.add(task.sourceRef.replace("ticket:", ""));
          }
        }
      }
      closedTicketsCount += shiftClosedTicketIds.size;

      // d. "Total Tugas Dikerjakan": count of DISTINCT/UNIQUE tasks worked on across all shifts
      if (content.tasks && Array.isArray(content.tasks)) {
        for (const task of content.tasks) {
          const taskKey = getTaskIdentity(task);
          uniqueTaskSet.add(taskKey);
        }
      }
    }

    return {
      totalRecords: workflow.total || visibleRecords.length,
      completedShiftsCount,
      totalFindings,
      closedTicketsCount,
      totalUniqueTasks: uniqueTaskSet.size,
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
      <section className="page-heading">
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
      </section>

      {/* Top summary stat cards */}
      <section className="shift-log-stats-row" aria-label="Ringkasan statistik log shift">
        {/* Card a: Total Shift Selesai */}
        <div className="shift-log-stat-card">
          <span className="shift-log-stat-icon is-completed">
            <CheckCircle2 size={17} />
          </span>
          <div className="shift-log-stat-meta">
            <span className="shift-log-stat-val">{stats.completedShiftsCount}</span>
            <span className="shift-log-stat-lbl">Total Shift Selesai</span>
          </div>
        </div>

        {/* Card b: Jumlah Temuan */}
        <div className="shift-log-stat-card">
          <span className="shift-log-stat-icon is-findings">
            <AlertTriangle size={17} />
          </span>
          <div className="shift-log-stat-meta">
            <span className="shift-log-stat-val">{stats.totalFindings}</span>
            <span className="shift-log-stat-lbl">Jumlah Temuan</span>
          </div>
        </div>

        {/* Card c: Total Tiket Selesai */}
        <div className="shift-log-stat-card">
          <span className="shift-log-stat-icon is-tickets-closed">
            <TicketCheck size={17} />
          </span>
          <div className="shift-log-stat-meta">
            <span className="shift-log-stat-val">{stats.closedTicketsCount}</span>
            <span className="shift-log-stat-lbl">Total Tiket Selesai</span>
          </div>
        </div>

        {/* Card d: Total Tugas Dikerjakan */}
        <div className="shift-log-stat-card">
          <span className="shift-log-stat-icon is-tasks-unique">
            <ClipboardList size={17} />
          </span>
          <div className="shift-log-stat-meta">
            <span className="shift-log-stat-val">{stats.totalUniqueTasks}</span>
            <span className="shift-log-stat-lbl">Total Tugas Dikerjakan</span>
          </div>
        </div>
      </section>

      <article className="panel view-panel shift-log-panel">
        <HandoverHistoryControls workflow={workflow} />

        <div className="shift-log-body">
          {loading ? (
            <div className="log-loading">Memuat riwayat handover…</div>
          ) : visibleRecords.length ? (
            <ol className="shift-timeline">
              {paginatedRecords.map((record) => {
                const content = parseContent(record);
                const total = content?.tasks.length ?? 0;
                const done = content?.tasks.filter((task) => task.completed).length ?? 0;
                const newCount = content?.tasks.filter((task) => isNewlyAddedTask(task)).length ?? 0;
                const prevTasks = lineageMap.get(record.id) ?? Math.max(0, total - newCount);
                const currTasks = total;
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
                            <div className="shift-flow-card shift-flow-source">
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
                              <ArrowRight size={13} />
                            </div>

                            <div className="shift-flow-card shift-flow-target">
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
                              <div className="timeline-task-breakdown">
                                <span className="breakdown-item breakdown-done" title="Tugas selesai pada shift ini">
                                  <strong className="breakdown-num">{done}</strong> Selesai
                                </span>
                                <span className="breakdown-dot">·</span>
                                <span className="breakdown-item breakdown-new" title="Tugas baru ditambahkan pada shift ini">
                                  <strong className="breakdown-num">{newCount}</strong> Baru Ditambahkan
                                </span>
                                <span className="breakdown-dot">·</span>
                                <span className="breakdown-item breakdown-transition" title="Transisi jumlah tugas dari shift sebelumnya ke shift ini">
                                  <strong className="breakdown-num">{prevTasks}</strong> Tugas Sebelumnya
                                  <span className="breakdown-arrow">→</span>
                                  <strong className="breakdown-num">{currTasks}</strong> Tugas Selanjutnya
                                </span>
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

          {/* Pagination Bar */}
          {visibleRecords.length > 0 && (
            <div className="roster-pagination-bar shift-log-pagination-bar">
              <div className="roster-pagination-left">
                <div className="roster-rows-per-page">
                  <span className="roster-pagination-label">Rows per page:</span>
                  <select
                    className="roster-filter-select roster-page-size-select"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    aria-label="Jumlah catatan per halaman"
                  >
                    <option value="10">10</option>
                    <option value="30">30</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>

                <span className="roster-pagination-info">
                  Menampilkan <strong>{totalCount === 0 ? 0 : startIdx + 1}–{endIdx}</strong> dari <strong>{totalCount}</strong> catatan
                </span>
              </div>

              <div className="roster-pagination-actions">
                <button
                  type="button"
                  className="roster-page-btn roster-page-nav"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage <= 1}
                  aria-label="Halaman sebelumnya"
                >
                  Prev
                </button>

                <div className="roster-page-numbers">
                  {pageNumbers.map((p, idx) =>
                    p === "..." ? (
                      <span key={`ellipsis-${idx}`} className="roster-page-ellipsis">…</span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        className={`roster-page-btn roster-page-num ${p === safeCurrentPage ? "active" : ""}`}
                        onClick={() => setCurrentPage(Number(p))}
                        aria-label={`Halaman ${p}`}
                        aria-current={p === safeCurrentPage ? "page" : undefined}
                      >
                        {p}
                      </button>
                    )
                  )}
                </div>

                <button
                  type="button"
                  className="roster-page-btn roster-page-nav"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage >= totalPages || totalPages <= 1}
                  aria-label="Halaman berikutnya"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
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

