"use client";

import React, { useId } from "react";
import { AlertTriangle, Archive, RefreshCw, X } from "lucide-react";
import { Modal } from "@/app/components/ui/Modal";

interface ConfirmArchiveDialogProps {
  open: boolean;
  title: string;
  itemName: string;
  itemType: "klien" | "proyek" | "sistem";
  action: "archive" | "restore" | "deactivate";
  activeTicketsCount?: number;
  activeCheckpointsCount?: number;
  subItemsCount?: number;
  subItemLabel?: string;
  consequenceText?: string;
  onConfirm: () => void;
  onClose: () => void;
  isLoading?: boolean;
}

export function ConfirmArchiveDialog({
  open,
  title,
  itemName,
  itemType,
  action,
  activeTicketsCount = 0,
  activeCheckpointsCount = 0,
  subItemsCount = 0,
  subItemLabel = "proyek",
  consequenceText,
  onConfirm,
  onClose,
  isLoading = false,
}: ConfirmArchiveDialogProps) {
  const descId = useId();
  const isArchive = action === "archive" || action === "deactivate";
  const hasImpact = activeTicketsCount > 0 || activeCheckpointsCount > 0 || subItemsCount > 0;

  return (
    <Modal open={open} onClose={onClose} label={title} variant="centered" width={480}>
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <span
              className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${
                isArchive
                  ? "bg-rose-500/15 border border-rose-500/30 text-rose-400"
                  : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
              }`}
            >
              {isArchive ? <AlertTriangle size={18} /> : <RefreshCw size={18} />}
            </span>
            <div>
              <h3 className="text-[15px] font-bold text-slate-100 leading-snug">{title}</h3>
              <p className="text-[12px] text-slate-400">
                Konfirmasi perubahan status {itemType}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors cursor-pointer"
            aria-label="Batal dan tutup"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex flex-col gap-3 text-[13px] text-slate-300" id={descId}>
          <p>
            Apakah Anda yakin ingin {isArchive ? "mengarsipkan" : "mengaktifkan kembali"}{" "}
            <strong className="text-slate-100 font-semibold">{itemName}</strong>?
          </p>

          {isArchive && hasImpact && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 flex flex-col gap-1.5 text-[12px]">
              <div className="flex items-center gap-1.5 font-bold text-rose-400">
                <AlertTriangle size={14} className="shrink-0" />
                <span>Peringatan Entitas Terkait:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
                {subItemsCount > 0 && (
                  <li>
                    Terdapat <strong className="text-amber-300">{subItemsCount} {subItemLabel}</strong> di bawah klien ini yang akan ikut disembunyikan dari pemilih.
                  </li>
                )}
                {activeTicketsCount > 0 && (
                  <li>
                    Terdapat <strong className="text-rose-300">{activeTicketsCount} tiket aktif</strong> yang masih merujuk ke entitas ini.
                  </li>
                )}
                {activeCheckpointsCount > 0 && (
                  <li>
                    Terdapat <strong className="text-amber-300">{activeCheckpointsCount} checkpoint jadwal shift</strong> terkait.
                  </li>
                )}
              </ul>
              <p className="text-[11.5px] text-slate-400 mt-1 italic">
                {consequenceText || "Entitas tidak akan dihapus permanen. Data historis, tiket lama, dan log audit tetap tersimpan utuh berlabel 'Arsip'."}
              </p>
            </div>
          )}

          {!isArchive && (
            <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-[12px] text-slate-300">
              {itemType.toUpperCase()} ini akan kembali aktif dan langsung muncul di pemilih header, filter tiket, serta modul monitoring.
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-700/60 mt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-lg text-[12.5px] font-semibold text-slate-300 bg-slate-800/80 border border-slate-700 hover:bg-slate-700 hover:text-white transition-all cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12.5px] font-bold text-white transition-all cursor-pointer ${
              isArchive
                ? "bg-rose-600 hover:bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.3)]"
                : "bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isArchive ? <Archive size={14} /> : <RefreshCw size={14} />}
            <span>{isLoading ? "Memproses..." : isArchive ? "Ya, Arsipkan" : "Ya, Aktifkan"}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
