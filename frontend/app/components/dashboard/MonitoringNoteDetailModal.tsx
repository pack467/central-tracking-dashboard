"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Check,
  Clock,
  Lock,
  Moon,
  Sun,
  Sunset,
  Copy,
  CheckCheck,
  MessageSquare,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Info,
} from "lucide-react";
import { useIsClient } from "@/app/hooks/useIsClient";
import { Avatar } from "@/app/components/ui/Avatar";
import { ProjectTile } from "@/app/components/monitoring/ProjectTile";
import { getOwnerRole } from "@/app/lib/data";
import { getShiftInfoForMinutes, getShiftType } from "@/app/lib/shifts";
import type { CheckpointAssessment, MonitoringEntry } from "@/app/lib/types";

export interface MonitoringNoteDetailModalProps {
  open: boolean;
  onClose: () => void;
  entry: MonitoringEntry;
  assessment?: CheckpointAssessment | null;
  status: "OK" | "NOK" | "Belum";
  note?: string;
  onGoToMonitoring?: () => void;
}

function resolveShiftLabel(shiftProp?: string, timeStr?: string): string {
  if (shiftProp && shiftProp.trim()) {
    const trimmed = shiftProp.trim();
    return /^shift\s+/i.test(trimmed) ? trimmed : `Shift ${trimmed}`;
  }
  const match = /^(\d{1,2}):(\d{2})/.exec((timeStr || "").trim());
  if (match) {
    const mins = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
    return getShiftInfoForMinutes(mins).label;
  }
  return "Shift Operasional";
}

function getShiftBadgeStyle(shiftLabel: string) {
  const type = getShiftType(shiftLabel);
  if (type === "subuh") {
    return {
      Icon: Moon,
      label: "Shift Subuh",
      timeRange: "00:00 – 08:30 WIB",
      className: "text-[#38bdf8] bg-[rgba(56,189,248,0.14)] border-[rgba(56,189,248,0.35)]",
    };
  }
  if (type === "pagi") {
    return {
      Icon: Sun,
      label: "Shift Pagi",
      timeRange: "08:00 – 16:30 WIB",
      className: "text-[#fbbf24] bg-[rgba(245,158,11,0.14)] border-[rgba(245,158,11,0.35)]",
    };
  }
  if (type === "malam") {
    return {
      Icon: Sunset,
      label: "Shift Malam",
      timeRange: "16:00 – 00:30 WIB",
      className: "text-[#c084fc] bg-[rgba(168,85,247,0.14)] border-[rgba(168,85,247,0.35)]",
    };
  }
  return {
    Icon: Clock,
    label: shiftLabel || "Shift Operasional",
    timeRange: "Jadwal Harian",
    className: "text-[#94a3b8] bg-[rgba(148,163,184,0.14)] border-[rgba(148,163,184,0.3)]",
  };
}

export function MonitoringNoteDetailModal({
  open,
  onClose,
  entry,
  assessment,
  status,
  note = "",
  onGoToMonitoring,
}: MonitoringNoteDetailModalProps) {
  const mounted = useIsClient();
  const modalRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const displayProject = entry.project || "Checkpoint";
  const displayTask = entry.task || "Pemeriksaan Checklist Monitoring";
  const displayTime = entry.time || "";
  const displayShift = resolveShiftLabel(undefined, displayTime);
  const displayOwner = entry.owner || "Petugas Shift";
  const ownerRole = getOwnerRole(displayOwner);
  const shiftStyle = getShiftBadgeStyle(displayShift);
  const ShiftBadgeIcon = shiftStyle.Icon;

  const noteText = (note || assessment?.note || "").trim();
  const isOk = status === "OK";
  const isNok = status === "NOK";
  const isPending = status === "Belum";

  const handleCopy = useCallback(async () => {
    if (!noteText) return;
    try {
      await navigator.clipboard.writeText(noteText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is restricted
      const textarea = document.createElement("textarea");
      textarea.value = noteText;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [noteText]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-150"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="monitoring-detail-title"
        aria-describedby="monitoring-detail-desc"
        className="w-full max-w-[540px] rounded-2xl bg-gradient-to-b from-[#1e293b] via-[#162032] to-[#0f172a] border border-slate-700/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden max-sm:fixed max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:max-w-full max-sm:rounded-b-none max-sm:rounded-t-2xl max-sm:max-h-[92dvh] max-sm:pb-[calc(16px+env(safe-area-inset-bottom,0px))] animate-in zoom-in-95 duration-150"
      >
        {/* Mobile Drag Indicator */}
        <div className="hidden max-sm:flex items-center justify-center pt-2.5 pb-1">
          <div className="w-10 h-1.5 rounded-full bg-slate-600/70" />
        </div>

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-700/80 bg-slate-900/50 flex items-start justify-between gap-3">
          <div className="flex flex-col min-w-0 flex-1 gap-1.5">
            {/* Meta Tags Row */}
            <div className="flex items-center gap-2 flex-wrap">
              <ProjectTile name={displayProject} clientId={entry.clientId} size="xs" />
              <strong className="text-xs font-bold text-slate-100 truncate max-w-[150px]">
                {displayProject}
              </strong>
              {displayTime && (
                <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-[#38bdf8] bg-[rgba(56,189,248,0.12)] border border-[rgba(56,189,248,0.3)] px-2 py-0.5 rounded-[5px] leading-none shrink-0">
                  <Clock size={11} className="text-[#38bdf8]" />
                  <span>{displayTime} WIB</span>
                </span>
              )}
              {displayShift && (
                <span className={`inline-flex items-center gap-1 font-mono text-[10.5px] font-bold border px-2 py-0.5 rounded-full leading-none shrink-0 ${shiftStyle.className}`}>
                  <ShiftBadgeIcon size={11} />
                  <span>{displayShift}</span>
                </span>
              )}
              {/* Verdict Pill */}
              {isOk && (
                <span className="inline-flex items-center gap-1 h-[22px] px-2.5 rounded-full text-[10.5px] font-bold font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 leading-none shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                  <Check size={11} strokeWidth={2.5} />
                  <span>OK</span>
                </span>
              )}
              {isNok && (
                <span className="inline-flex items-center gap-1 h-[22px] px-2.5 rounded-full text-[10.5px] font-bold font-mono bg-rose-500/20 text-rose-400 border border-rose-500/40 leading-none shrink-0 shadow-[0_0_10px_rgba(244,63,94,0.15)]">
                  <AlertTriangle size={11} strokeWidth={2.5} />
                  <span>NOK</span>
                </span>
              )}
              {isPending && (
                <span className="inline-flex items-center gap-1 h-[22px] px-2.5 rounded-full text-[10.5px] font-bold font-mono bg-slate-800 text-slate-300 border border-slate-700 leading-none shrink-0">
                  <Clock size={11} strokeWidth={2.5} />
                  <span>Belum Dinilai</span>
                </span>
              )}
            </div>

            {/* Checkpoint Title */}
            <h2 id="monitoring-detail-title" className="text-sm sm:text-[15px] font-bold text-white mt-1 leading-snug">
              {displayTask}
            </h2>
          </div>

          {/* Close button */}
          <button
            type="button"
            className="text-slate-400 hover:text-white hover:bg-slate-800/80 p-2 rounded-xl transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            onClick={onClose}
            aria-label="Tutup dialog detail monitoring"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto max-h-[calc(80vh-140px)] [scrollbar-width:thin] [scrollbar-color:#334155_transparent]">
          {/* Metadata Grid */}
          <div
            id="monitoring-detail-desc"
            className="grid grid-cols-2 gap-2.5 rounded-xl border border-slate-700/70 bg-slate-900/60 p-3 text-xs max-[440px]:grid-cols-1"
          >
            {/* PIC Shifter */}
            <div className="flex flex-col gap-1 min-w-0">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Pemeriksa / PIC Shifter
              </span>
              <div className="flex items-center gap-2.5 font-semibold text-slate-100 min-w-0">
                <Avatar size="md" name={displayOwner} shape="circle" className="shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="truncate text-xs font-bold text-white">{displayOwner}</span>
                  <span className="text-[10px] text-slate-400 truncate">{ownerRole}</span>
                </div>
              </div>
            </div>

            {/* Status / Evaluasi */}
            <div className="flex flex-col gap-1 min-w-0">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Status Evaluasi
              </span>
              <div className="flex items-center gap-2 font-semibold text-slate-100">
                {isOk && (
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                    <ShieldCheck size={14} className="shrink-0" />
                    <span className="font-semibold">Normal</span>
                  </div>
                )}
                {isNok && (
                  <div className="flex items-center gap-1.5 text-rose-400 text-xs">
                    <AlertTriangle size={14} className="shrink-0" />
                    <span className="font-semibold">Perlu Tindakan / Issue</span>
                  </div>
                )}
                {isPending && (
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                    <Clock size={14} className="shrink-0" />
                    <span>Menunggu Pemeriksaan</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section: Pesan / Catatan Monitoring Shifter */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <MessageSquare size={14} className="text-[#38bdf8]" />
                <span>Pesan / Catatan Hasil Monitoring</span>
              </div>

              <div className="flex items-center gap-2">
                {noteText && (
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                    title="Salin isi pesan catatan"
                  >
                    {copied ? (
                      <>
                        <CheckCheck size={12} className="text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Salin Pesan</span>
                      </>
                    )}
                  </button>
                )}
                <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-slate-400 bg-slate-800/80 border border-slate-700 px-2 py-0.5 rounded-md shrink-0">
                  <Lock size={10} />
                  <span>Hanya Baca</span>
                </span>
              </div>
            </div>

            {/* Note Display Container */}
            {noteText ? (
              <div
                className={`relative w-full min-h-[105px] rounded-xl bg-[#0b1322] border p-4 text-[13px] leading-relaxed select-text shadow-inner overflow-hidden ${
                  isNok
                    ? "border-rose-500/40 border-l-[4px] border-l-rose-500 text-slate-100"
                    : isOk
                    ? "border-emerald-500/30 border-l-[4px] border-l-emerald-500 text-slate-100"
                    : "border-sky-500/30 border-l-[4px] border-l-[#38bdf8] text-slate-100"
                }`}
              >
                <div className="whitespace-pre-wrap break-words font-sans relative z-10">
                  {noteText}
                </div>
                {/* Character Counter footer inside note */}
                <div className="flex items-center justify-end mt-3 pt-2 border-t border-slate-800/60 text-[10px] font-mono text-slate-500">
                  <span>{noteText.length} karakter</span>
                </div>
              </div>
            ) : (
              <div className="w-full rounded-xl bg-slate-900/50 border border-dashed border-slate-700/80 p-4 text-xs flex flex-col items-center justify-center text-center gap-1.5 min-h-[100px]">
                <Info size={18} className="text-slate-500" />
                <span className="text-slate-400 font-medium">
                  {isOk
                    ? "Petugas shifter tidak mencatat anomali khusus pada checkpoint ini (seluruh metrik beroperasi normal)."
                    : isNok
                    ? "Status checkpoint ditandai NOK, namun belum ada rincian pesan anomali yang dilampirkan."
                    : "Checkpoint ini belum diperiksa oleh petugas shift pada sesi monitoring hari ini."}
                </span>
                <span className="text-[11px] text-slate-500">
                  Belum ada pesan teks yang diketikkan.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-700/80 bg-slate-900/60 flex items-center justify-between gap-3 max-sm:flex-col-reverse">
          <div>
            {onGoToMonitoring && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onGoToMonitoring();
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#38bdf8] hover:text-sky-300 transition-colors cursor-pointer group"
              >
                <span>Buka Halaman Monitoring</span>
                <ExternalLink size={12} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 max-sm:w-full">
            <button
              type="button"
              className="px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm hover:border-slate-600 max-sm:w-full"
              onClick={onClose}
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : null;
}

