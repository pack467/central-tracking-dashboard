"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  StickyNote,
  X,
  Copy,
  Plus,
  RotateCcw,
  Check,
} from "lucide-react";

interface MemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  memo: string;
  onMemoChange: (value: string) => void;
  onAddBullet?: () => void;
  onCopyMemo: (text?: string) => void;
  memoCopied: boolean;
  onResetMemo: () => void;
  defaultMemo?: string;
}

// Delay before the typed text is pushed to the parent / localStorage.
const COMMIT_DELAY_MS = 350;

export function MemoModal({
  isOpen,
  onClose,
  memo,
  onMemoChange,
  onAddBullet,
  onCopyMemo,
  memoCopied,
  onResetMemo,
  defaultMemo = "",
}: MemoModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Local draft: typing only re-renders this small modal, never the parent.
  const [draft, setDraft] = useState(memo);
  const draftRef = useRef(memo);
  const committedRef = useRef(memo);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onMemoChangeRef = useRef(onMemoChange);
  onMemoChangeRef.current = onMemoChange;

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (draftRef.current !== committedRef.current) {
      committedRef.current = draftRef.current;
      onMemoChangeRef.current(draftRef.current);
    }
  }, []);

  const updateDraft = useCallback(
    (value: string) => {
      draftRef.current = value;
      setDraft(value);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, COMMIT_DELAY_MS);
    },
    [flush]
  );

  // Accept external changes (e.g. loaded from localStorage) when nothing is pending.
  useEffect(() => {
    if (timerRef.current) return;
    if (memo !== draftRef.current) {
      draftRef.current = memo;
      setDraft(memo);
    }
    committedRef.current = memo;
  }, [memo]);

  // Commit pending text when the modal closes or unmounts.
  useEffect(() => {
    if (!isOpen) flush();
  }, [isOpen, flush]);
  useEffect(() => flush, [flush]);

  const handleAddBullet = () => {
    const current = draftRef.current;
    updateDraft(current.trimEnd() + (current.trim() ? "\n• " : "• "));
    textareaRef.current?.focus();
    onAddBullet?.();
  };

  const handleCopy = () => {
    flush();
    onCopyMemo(draftRef.current);
  };

  const handleReset = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    draftRef.current = defaultMemo;
    committedRef.current = defaultMemo;
    setDraft(defaultMemo);
    onResetMemo();
  };

  // Focus trap, escape handler, and body overflow lock
  useEffect(() => {
    if (!isOpen) return;

    triggerRef.current = (document.activeElement as HTMLElement) || null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const timer = setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusables = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);

        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || !modalRef.current.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !modalRef.current.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      triggerRef.current?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  const bulletCount = draft.split("\n").filter((l) => l.trim().length > 0).length;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="memo-modal-title"
        className="flex flex-col w-full sm:w-[min(920px,calc(100vw-2rem))] h-full sm:h-[min(80dvh,720px)] sm:rounded-2xl bg-[#0f172a] border-0 sm:border sm:border-[#334155] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] text-[#f8fafc] overflow-hidden memo-modal-card"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#334155] bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <StickyNote size={18} />
            </div>
            <div className="flex items-center gap-2.5 flex-wrap min-w-0">
              <h2 id="memo-modal-title" className="text-base sm:text-lg font-bold text-[#f8fafc] truncate">
                Memo &amp; Catatan Shift
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#94a3b8] hover:text-[#f8fafc] hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar: Kontrol yang dipindahkan dari panel */}
        <div className="flex items-center justify-between flex-wrap gap-2 px-5 sm:px-6 py-2.5 border-b border-[#334155]/80 bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleAddBullet}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/80 border border-slate-700 hover:bg-sky-500/15 hover:border-sky-500/35 hover:text-sky-300 text-[#cbd5e1] transition-all cursor-pointer"
              title="Tambah butir catatan baru (bullet point)"
            >
              <Plus size={13} /> Poin Catatan
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/80 border border-slate-700 hover:bg-sky-500/15 hover:border-sky-500/35 hover:text-sky-300 text-[#cbd5e1] transition-all cursor-pointer"
              title="Salin isi memo ke clipboard"
            >
              {memoCopied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              {memoCopied ? "Tersalin!" : "Salin"}
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/80 border border-slate-700 hover:bg-rose-500/15 hover:border-rose-500/35 hover:text-rose-300 text-[#cbd5e1] transition-all cursor-pointer"
              title="Kembalikan ke catatan awal default"
            >
              <RotateCcw size={13} /> Reset
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-[#94a3b8]">
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px]" title="Catatan tersimpan otomatis di browser">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Tersimpan
            </span>
            <span className="font-mono text-[11px] text-slate-400 border-l border-slate-700 pl-3">
              {bulletCount} butir catatan
            </span>
          </div>
        </div>

        {/* Textarea Body */}
        <div className="flex-1 min-h-0 p-5 sm:p-6 bg-slate-950/60 relative flex flex-col">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => updateDraft(e.target.value)}
            spellCheck={false}
            placeholder="Tulis catatan operasional shift, instruksi serah terima, atau pengingat di sini..."
            className="w-full flex-1 min-h-0 bg-transparent border-0 outline-none resize-none text-[#f8fafc] text-sm sm:text-[14.5px] leading-[1.7] p-2 font-sans placeholder:text-[#64748b] placeholder:italic bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[length:100%_28px] focus:ring-0"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-t border-[#334155] bg-slate-900/90 shrink-0">
          <span className="text-xs text-[#94a3b8]">
            Perubahan langsung tersimpan ke dashboard dan perangkat.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-xs font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-md shadow-sky-500/20 transition-all cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
