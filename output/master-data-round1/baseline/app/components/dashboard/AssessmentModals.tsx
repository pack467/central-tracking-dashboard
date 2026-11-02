"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Check, FileText, AlertTriangle, Trash2 } from "lucide-react";
import { Modal } from "@/app/components/ui/Modal";
import { ModalCloseButton } from "@/app/components/ui/ModalCloseButton";
import { ProjectMark } from "@/app/components/ui/ProjectMark";
import type { MonitoringEntry } from "@/app/lib/types";

export interface NotAdequateModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (note: string) => void;
  onDeleteNote?: () => void;
  mode?: "alasan-nok-wajib" | "catatan";
  entry?: MonitoringEntry | null;
  checkpointName?: string;
  projectName?: string;
  time?: string;
  verdict?: "ok" | "nok" | "adequate" | "not-adequate" | null;
  initialNote?: string;
}

export function NotAdequateModal({
  open,
  onClose,
  onSubmit,
  onDeleteNote,
  mode = "alasan-nok-wajib",
  entry,
  checkpointName,
  projectName,
  time,
  verdict,
  initialNote = "",
}: NotAdequateModalProps) {
  const [note, setNote] = useState(initialNote);
  const [mounted, setMounted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const displayProject = entry?.project || projectName || "Checkpoint";
  const displayTask = entry?.task || checkpointName || "Observasi monitoring operasional";
  const displayTime = entry?.time || time || "";
  const isNokMode = mode === "alasan-nok-wajib" || verdict === "nok" || verdict === "not-adequate";
  const isNoteMode = mode === "catatan";
  const isOkVerdict = verdict === "ok" || verdict === "adequate";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setNote(initialNote);
      triggerRef.current = (document.activeElement as HTMLElement) || null;
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);

      return () => {
        clearTimeout(timer);
        document.body.style.overflow = prevOverflow;
        triggerRef.current?.focus?.();
      };
    }
  }, [open, initialNote]);

  const isDirty = note.trim() !== initialNote.trim();
  const canSubmit = isNokMode
    ? note.trim().length > 0 && (isDirty || mode === "alasan-nok-wajib")
    : isDirty;

  const handleSave = () => {
    if (!canSubmit) return;
    onSubmit(note.trim());
    onClose();
  };

  const handleDelete = () => {
    if (onDeleteNote) {
      onDeleteNote();
    } else {
      onSubmit("");
    }
    onClose();
  };

  // Keyboard navigation & accessibility
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (canSubmit) {
          handleSave();
        }
      } else if (e.key === "Tab" && modalRef.current) {
        const focusables = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => el.offsetParent !== null);

        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, canSubmit, note, initialNote]);

  if (!open || !mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="presentation"
      onMouseDown={(e) => {
        // Prevent accidental closing if user has typed unsaved changes
        if (e.target === e.currentTarget && !isDirty) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkpoint-dialog-title"
        aria-describedby="checkpoint-dialog-desc"
        className="w-full max-w-[480px] rounded-2xl bg-[#1e293b] border border-[#334155] shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden max-sm:fixed max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:max-w-full max-sm:rounded-b-none max-sm:rounded-t-2xl max-sm:max-h-[90dvh] max-sm:pb-[calc(16px+env(safe-area-inset-bottom,0px))] animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#334155] flex items-start justify-between gap-3 bg-slate-900/40">
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <ProjectMark name={displayProject} />
              <strong className="text-xs font-bold text-[#f8fafc] truncate max-w-[140px]">
                {displayProject}
              </strong>
              {displayTime && (
                <span className="font-mono text-[11px] font-bold text-[#38bdf8] bg-[rgba(56,189,248,0.12)] border border-[rgba(56,189,248,0.3)] px-1.5 py-0.5 rounded-[4px] leading-none shrink-0">
                  {displayTime}
                </span>
              )}
              {isOkVerdict && (
                <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-bold font-mono bg-[#22c55e] text-[#052e16] shadow-sm leading-none shrink-0">
                  <Check size={11} strokeWidth={2.5} />
                  <span>OK</span>
                </span>
              )}
              {isNokMode && (
                <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-bold font-mono bg-[#dc2626] text-white shadow-sm leading-none shrink-0">
                  <X size={11} strokeWidth={2.5} />
                  <span>NOK</span>
                </span>
              )}
            </div>
            <h2 id="checkpoint-dialog-title" className="text-sm font-semibold text-[#f8fafc] mt-2 line-clamp-2 leading-snug">
              {displayTask}
            </h2>
          </div>

          <button
            type="button"
            className="text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#334155] p-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
            onClick={onClose}
            aria-label="Tutup dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 flex flex-col gap-3.5 overflow-y-auto">
          {isNokMode ? (
            <div
              id="checkpoint-dialog-desc"
              className="bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.25)] rounded-lg p-2.5 text-xs text-[#f87171] leading-relaxed flex items-start gap-2"
            >
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <span>
                <strong>Format anomali:</strong> Jelaskan gejala (queue, CPU, latensi), komponen terdampak, dan tindakan / ID ticket terkait.
              </span>
            </div>
          ) : (
            <div
              id="checkpoint-dialog-desc"
              className="bg-[rgba(56,189,248,0.08)] border border-[rgba(56,189,248,0.2)] rounded-lg p-2.5 text-xs text-[#cbd5e1] leading-relaxed flex items-start gap-2"
            >
              <FileText size={15} className="shrink-0 text-[#38bdf8] mt-0.5" />
              <span>
                Catatan ini akan tersimpan pada jadwal checkpoint dan terangkum otomatis pada handover shift.
              </span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-[#cbd5e1] mb-1.5">
              <label htmlFor="checkpoint-note-input" className="cursor-pointer">
                {isNokMode ? "Alasan NOK & Catatan Tindakan *" : "Catatan / Update Operasional"}
              </label>
              <span className={`font-mono text-[11px] ${note.length >= 500 ? "text-[#f87171] font-bold" : "text-[#94a3b8]"}`}>
                {note.length}/500
              </span>
            </div>

            <textarea
              id="checkpoint-note-input"
              ref={textareaRef}
              rows={4}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                isNokMode
                  ? "Contoh: Queue ActiveMQ menumpuk 4.200 pesan. Service di-restart pukul 20:15; pantau laju draining."
                  : "Tambahkan catatan atau update operasional mengenai checkpoint ini (opsional)..."
              }
              className="w-full min-h-[96px] max-h-[220px] rounded-xl bg-[#0f172a] border border-[#334155] p-3 text-xs text-[#f8fafc] placeholder:text-[#64748b] focus:border-[#38bdf8] focus:ring-2 focus:ring-[#38bdf8]/20 focus:outline-none transition-all resize-y font-sans leading-relaxed"
            />

            <div className="flex items-center justify-between mt-1 text-[11px] text-[#64748b]">
              <span>Tekan Ctrl+Enter untuk menyimpan</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[#334155] bg-slate-900/30 flex items-center justify-between gap-3 max-sm:flex-col-reverse">
          <div>
            {isNoteMode && isOkVerdict && initialNote && (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#f87171] hover:text-[#fca5a5] hover:bg-[#f87171]/10 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                onClick={handleDelete}
                title="Hapus catatan pada checkpoint ini"
              >
                <Trash2 size={13} />
                <span>Hapus catatan</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 max-sm:w-full">
            <button
              type="button"
              className="px-3.5 py-2 rounded-xl border border-[#334155] bg-transparent hover:bg-[#243044] text-[#cbd5e1] hover:text-[#f8fafc] text-xs font-semibold transition-colors cursor-pointer max-sm:flex-1 max-sm:h-11"
              onClick={onClose}
            >
              Batal
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-[#38bdf8] hover:bg-[#0284c7] disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 text-xs font-bold transition-all shadow-[0_2px_8px_rgba(56,189,248,0.25)] cursor-pointer max-sm:flex-1 max-sm:h-11 flex items-center justify-center gap-1.5"
            >
              <span>Simpan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : null;
}


export function AdequacyGuideModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} label="Panduan penilaian checkpoint (OK / NOK)" width={620}>
      <div className="modal-title">
        <div>
          <strong>Panduan Penilaian Checkpoint (OK / NOK)</strong>
          <small>SOP dan kriteria evaluasi kesehatan monitoring layanan NOC</small>
        </div>
        <ModalCloseButton onClose={onClose} />
      </div>

      <div className="[display:grid]! [gap:14px]! [font-size:12.5px]! [color:var(--ink-primary)]! [line-height:1.5]!">
        <div className="[padding:12px]! [background:var(--green-soft)]! [border:1px_solid_var(--green-border)]! [border-radius:8px]!">
          <strong className="[color:var(--green)]! [font-size:13px]! [display:inline-flex]! [align-items:center]! [gap:6px]!">
            <Check size={14} /> Kriteria OK (Passed / Normal)
          </strong>
          <ul className="[margin:6px_0_0]! [padding-left:18px]! [color:var(--ink-secondary)]!">
            <li><strong>Metrik sesuai SLA:</strong> Utilisasi CPU di bawah 85%, memori stabil, dan latensi respons dalam baseline normal.</li>
            <li><strong>Aliran pesan aktif:</strong> Topik Kafka aktif mengonsumsi dan menghasilkan pesan tanpa lag tak terduga.</li>
            <li><strong>Queue nominal:</strong> Kedalaman queue ActiveMQ/RabbitMQ dalam parameter operasi normal.</li>
            <li><strong>Log &amp; stream:</strong> Stream log Graylog/SIEM terus diperbarui tanpa rangkaian error yang tidak tertangani.</li>
          </ul>
        </div>

        <div className="[padding:12px]! [background:var(--red-soft)]! [border:1px_solid_var(--red-border)]! [border-radius:8px]!">
          <strong className="[color:var(--red)]! [font-size:13px]! [display:inline-flex]! [align-items:center]! [gap:6px]!">
            <X size={14} /> Kriteria NOK (Failed / Action Required)
          </strong>
          <ul className="[margin:6px_0_0]! [padding-left:18px]! [color:var(--ink-secondary)]!">
            <li><strong>Penumpukan queue:</strong> Penumpukan pesan pending atau deadlock terdeteksi pada queue layanan.</li>
            <li><strong>Traffic hilang:</strong> Tidak ada produksi pesan pada topik Kafka aktif atau stream socket terputus.</li>
            <li><strong>Alert sumber daya:</strong> Lonjakan CPU atau memori berkelanjutan melebihi ambang alert.</li>
            <li><strong>Error belum selesai:</strong> Respons error sistem berulang tanpa pemulihan otomatis.</li>
          </ul>
        </div>

        <div className="[padding:12px]! [background:var(--bg)]! [border:1px_solid_var(--line)]! [border-radius:8px]!">
          <strong className="[font-size:12.5px]! [display:inline-flex]! [align-items:center]! [gap:6px]!">
            <FileText size={13} className="[color:var(--accent-blue)]" /> Prosedur pencatatan saat status NOK:
          </strong>
          <ol className="[margin:6px_0_0]! [padding-left:18px]! [color:var(--ink-secondary)]!">
            <li>Klik tombol <strong>&quot;NOK&quot;</strong> pada baris checkpoint di jadwal monitoring.</li>
            <li>
              Di modal, masukkan 3 elemen utama: <strong>Gejala</strong>, <strong>Komponen terdampak</strong>, dan{" "}
              <strong>Tindakan penanganan</strong> (atau ID ticket terkait).
            </li>
            <li>Simpan catatan agar tampil langsung di baris monitoring dan terangkum otomatis pada handover shift.</li>
          </ol>
        </div>
      </div>

      <div className="modal-actions">
        <button className="button button-primary" onClick={onClose}>
          Mengerti, tutup panduan
        </button>
      </div>
    </Modal>
  );
}
