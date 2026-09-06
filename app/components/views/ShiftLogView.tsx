"use client";

import { useState } from "react";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { useToast } from "@/app/components/ui/Toast";
import { formatHandoverDate } from "@/app/lib/data";
import type { HandoverRecordData, StoredHandoverRecord } from "@/app/lib/types";
import { canEditHandover, parseHandoverContent } from "@/app/lib/handover";
import { HandoverHistoryControls, HandoverHistoryMore, type HandoverWorkflow } from "@/app/components/handover/HandoverHistoryControls";

function parseContent(record: StoredHandoverRecord): HandoverRecordData | null {
  try {
    return parseHandoverContent(record.content);
  } catch {
    return null;
  }
}

export function ShiftLogView({ workflow }: { workflow: HandoverWorkflow }) {
  const { records, loading, openStored: onOpenRecord, remove: onDeleteRecord } = workflow;
  const visibleRecords = records;
  const notify = useToast();
  const [pendingDelete, setPendingDelete] = useState<StoredHandoverRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

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
          <h1>Log Shift</h1>
          <p>Timeline catatan handover historis yang tersimpan pada database Cloudflare D1.</p>
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
              return (
                <li className="timeline-item" key={record.id}>
                  <span className="timeline-dot" />
                  <article className="timeline-card">
                    <header className="timeline-head">
                      <div>
                        <strong>{record.title}</strong>
                        <small>{formatHandoverDate(record.handoverDate)}</small>
                      </div>
                      <div className="timeline-actions">
                        <button className="text-button" disabled={workflow.busy} onClick={() => void onOpenRecord(record)}>
                          Buka detail →
                        </button>
                        <button className="text-button text-danger" disabled={workflow.busy || !content || !canEditHandover(content, workflow.actor)} onClick={() => setPendingDelete(record)}>
                          Hapus
                        </button>
                      </div>
                    </header>
                    {content ? (
                      <>
                        <p className="timeline-meta">
                          <span>
                            {content.sourceShift} ({content.sourcePic}) → {content.targetShift} ({content.targetPic})
                          </span>
                          <span>
                            {content.findings.length} temuan · {total} tugas
                          </span>
                        </p>
                        <div className="timeline-progress">
                          <i>
                            <b style={{ width: `${percent}%` }} />
                          </i>
                          <span>{percent}% checklist · {content.acceptance ? "Handover diterima" : "Menunggu penerimaan"}</span>
                        </div>
                      </>
                    ) : (
                      <p className="timeline-meta">Konten catatan tidak dapat dibaca.</p>
                    )}
                  </article>
                </li>
              );
            })}
          </ol>
        ) : (
          <EmptyState
            icon="≡"
            title={workflow.error ? "Catatan belum dapat dimuat" : workflow.filters.date || workflow.filters.pic ? "Tidak ada catatan yang cocok" : "Belum ada catatan handover"}
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
