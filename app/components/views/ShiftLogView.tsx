"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { useToast } from "@/app/components/ui/Toast";
import { formatHandoverDate } from "@/app/lib/data";
import type { HandoverRecordData, StoredHandoverRecord } from "@/app/lib/types";

interface ShiftLogViewProps {
  records: StoredHandoverRecord[];
  loading: boolean;
  onOpenRecord: (record: StoredHandoverRecord) => void;
  onDeleteRecord: (id: number) => Promise<void>;
}

function parseContent(record: StoredHandoverRecord): HandoverRecordData | null {
  try {
    return JSON.parse(record.content) as HandoverRecordData;
  } catch {
    return null;
  }
}

export function ShiftLogView({ records, loading, onOpenRecord, onDeleteRecord }: ShiftLogViewProps) {
  const notify = useToast();
  const [dateFilter, setDateFilter] = useState("");
  const [picFilter, setPicFilter] = useState("Semua");
  const [pendingDelete, setPendingDelete] = useState<StoredHandoverRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const picOptions = useMemo(() => {
    const pics = new Set<string>();
    for (const record of records) {
      const content = parseContent(record);
      if (content?.sourcePic) pics.add(content.sourcePic);
    }
    return ["Semua", ...Array.from(pics)];
  }, [records]);

  const visibleRecords = useMemo(
    () =>
      records.filter((record) => {
        if (dateFilter && record.handoverDate !== dateFilter) return false;
        if (picFilter !== "Semua") {
          const content = parseContent(record);
          if (content?.sourcePic !== picFilter) return false;
        }
        return true;
      }),
    [records, dateFilter, picFilter],
  );

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
        <div className="view-toolbar">
          <label className="toolbar-label">
            Tanggal
            <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
          </label>
          <label className="toolbar-label">
            PIC pengirim
            <select value={picFilter} onChange={(event) => setPicFilter(event.target.value)}>
              {picOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          {(dateFilter || picFilter !== "Semua") && (
            <button
              className="button button-secondary"
              onClick={() => {
                setDateFilter("");
                setPicFilter("Semua");
              }}
            >
              Reset filter
            </button>
          )}
        </div>

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
                        <button className="text-button" onClick={() => onOpenRecord(record)}>
                          Buka detail →
                        </button>
                        <button className="text-button text-danger" onClick={() => setPendingDelete(record)}>
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
                          <span>{percent}% dikonfirmasi</span>
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
            title="Belum ada catatan handover"
            message="Buat catatan handover pertama dari dashboard untuk mulai mengisi riwayat serah-terima shift."
          />
        )}

        {!loading && visibleRecords.length === 0 && records.length > 0 && (
          <EmptyState
            icon="⌕"
            title="Tidak ada catatan yang cocok"
            message="Ubah filter tanggal atau PIC untuk melihat catatan lain."
          />
        )}
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
