"use client";
import Link from "next/link";
import { paths } from "@/app/lib/routes";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowRightLeft, CheckCircle2, ChevronDown, Clock, ExternalLink, Moon, Sun, Sunset, Users } from "lucide-react";
import { useShiftTransition } from "@/app/hooks/useLiveClock";


interface ShiftTransitionBadgeProps {
  onOpenHandover?: () => void;
  onNavigate?: (label: string) => void;
}

function getShiftIcon(id: string) {
  if (id === "subuh") return Moon;
  if (id === "pagi") return Sun;
  return Sunset;
}

export function ShiftTransitionBadge({ onOpenHandover, onNavigate }: ShiftTransitionBadgeProps) {
  const transition = useShiftTransition();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Only render if inside active handover window or upcoming window
  if (!transition.isActive && !transition.isUpcoming) {
    return null;
  }

  const FromIcon = getShiftIcon(transition.fromShift.id);
  const ToIcon = getShiftIcon(transition.toShift.id);

  const handleOpenHandover = () => {
    setIsOpen(false);
    if (onOpenHandover) {
      onOpenHandover();
    } else if (onNavigate) {
      onNavigate("Shift Log");
    }
  };

  const fromShiftName = transition.fromShift.name.replace("Shift ", "");
  const toShiftName = transition.toShift.name.replace("Shift ", "");

  return (
    <div
      className="shift-transition-container relative inline-flex items-center"
      ref={containerRef}
    >
      <button
        type="button"
        className={`shift-transition-pill inline-flex items-center gap-[12px] px-[12px] py-[5px] min-h-[38px] rounded-[8px] cursor-pointer select-none text-[#ffffff] transition-[background-color_0.18s_ease,border-color_0.18s_ease] shadow-none [&:hover_.transition-chevron]:text-[rgba(255,255,255,0.85)] ${
          transition.isActive
            ? isOpen
              ? "active-window open border border-[#f59e0b] bg-[rgba(245,158,11,0.18)]"
              : "active-window border border-[rgba(245,158,11,0.32)] bg-[rgba(245,158,11,0.08)] hover:border-[rgba(245,158,11,0.55)] hover:bg-[rgba(245,158,11,0.14)]"
            : "upcoming-window border border-[rgba(56,189,248,0.3)] bg-[rgba(56,189,248,0.08)] hover:border-[rgba(56,189,248,0.55)] hover:bg-[rgba(56,189,248,0.14)]"
        }`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title={
          transition.isActive
            ? `Pergantian Shift Aktif: ${transition.label} (${transition.windowPeriod}) - Sisa ${transition.minutesRemaining} menit`
            : `Pergantian Shift Akan Datang: ${transition.label} dalam ${transition.minutesUntilStart} menit`
        }
      >
        {/* Lead Icon with subtle live glow */}
        <div
          className={`transition-icon-container relative flex items-center justify-center w-[24px] h-[24px] rounded-[6px] shrink-0 ${
            transition.isActive
              ? "bg-[rgba(245,158,11,0.14)] border border-[rgba(245,158,11,0.3)]"
              : "bg-[rgba(56,189,248,0.14)] border border-[rgba(56,189,248,0.3)]"
          }`}
          aria-hidden="true"
        >
          <ArrowRightLeft
            size={13}
            className={`transition-lead-icon ${transition.isActive ? "text-[#fbbf24]" : "text-[#38bdf8]"}`}
          />
          {transition.isActive && (
            <span className="transition-live-dot absolute -top-[2px] -right-[2px] w-[6px] h-[6px] rounded-[50%] bg-[#f59e0b] [box-shadow:0_0_6px_#f59e0b] animate-[liveDotPulse_2s_infinite_ease-in-out]" />
          )}
        </div>

        {/* Clean 2-line textual hierarchy */}
        <div className="transition-info-stack flex flex-col items-start text-left leading-[1.15] min-w-0">
          <div className="transition-meta-row transition-meta-line flex items-center gap-[4px] max-[900px]:hidden">
            <span className={`transition-kicker-label text-[8.5px] font-extrabold tracking-[0.6px] uppercase font-[var(--font-mono)] ${transition.isActive ? "text-[#fbbf24]" : "text-[#38bdf8]"}`}>
              {transition.isActive ? "TRANSISI SHIFT" : "MENUJU TRANSISI"}
            </span>
            <span className="transition-meta-dot text-[rgba(255,255,255,0.35)] text-[9px]">·</span>
            <span className="transition-time-range text-[9.5px] font-[var(--font-mono)] text-[rgba(255,255,255,0.7)] font-medium">{transition.windowStart}–{transition.windowEnd}</span>
          </div>

          <div className="transition-flow-row transition-names-label flex items-center gap-[4px] mt-[1px] text-[11.5px] font-bold text-[#f8fafc] whitespace-nowrap max-[640px]:hidden">
            <span className="shift-name-from text-[#e2e8f0]">{fromShiftName}</span>
            <ArrowRight size={10} className={`shift-flow-arrow opacity-85 ${transition.isActive ? "text-[#fbbf24]" : "text-[#38bdf8]"}`} />
            <span className="shift-name-to text-[#ffffff]">{toShiftName}</span>
          </div>
        </div>

        {/* Countdown Badge & Chevron */}
        <div className="transition-badge-actions inline-flex items-center gap-[8px] ml-auto shrink-0">
          <span className={`transition-timer-badge inline-flex items-center justify-center h-[24px] min-w-[64px] px-[10px] rounded-[999px] text-[10.5px] font-bold font-[var(--font-mono)] leading-none tracking-[0.2px] text-center whitespace-nowrap box-border ${transition.isActive ? "bg-[rgba(245,158,11,0.18)] text-[#fbbf24] border border-[rgba(245,158,11,0.4)]" : "bg-[rgba(56,189,248,0.15)] text-[#38bdf8] border border-[rgba(56,189,248,0.4)]"}`}>
            {transition.isActive
              ? `Sisa ${transition.minutesRemaining}m`
              : `dlm ${transition.minutesUntilStart}m`}
          </span>
          <ChevronDown size={12} className={`transition-chevron inline-flex items-center justify-center text-[rgba(255,255,255,0.55)] transition-[transform_0.2s_ease,color_0.15s_ease] shrink-0 ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </button>

      {isOpen && (
        <div
          className="shift-transition-popover absolute top-[calc(100%+8px)] right-0 w-[420px] max-w-[calc(100vw-24px)] max-[640px]:w-[calc(100vw-20px)] max-[640px]:-right-[40px] bg-[#111520] border border-[rgba(245,158,11,0.35)] rounded-[12px] [box-shadow:0_16px_40px_rgba(0,0,0,0.75),_0_0_28px_rgba(245,158,11,0.15)] p-[16px] z-[100] backdrop-blur-[16px] flex flex-col gap-[13px] animate-[transitionPopoverFade_0.18s_cubic-bezier(0.16,1,0.3,1)]"
          role="dialog"
          aria-label="Detail Jendela Pergantian Shift"
        >
          {/* Popover Header */}
          <div className="transition-popover-header flex items-start justify-between gap-[10px] pb-[10px] border-b border-[rgba(255,255,255,0.08)]">
            <div className="transition-header-title-box flex flex-col gap-[2px]">
              <span className="transition-header-kicker inline-flex items-center gap-[5px] text-[9.5px] font-extrabold tracking-[0.8px] text-[#fbbf24] uppercase font-[var(--font-mono)]">
                <ArrowRightLeft size={13} />
                <span>HANDOVER WINDOW</span>
              </span>
              <h4 className="transition-header-heading m-0 text-[14px] font-bold text-[#ffffff]">
                {transition.isActive
                  ? `Pergantian Shift: ${transition.label}`
                  : `Persiapan Shift: ${transition.label}`}
              </h4>
            </div>
            <span
              className={`transition-status-pill text-[10px] font-bold px-[8px] py-[3px] rounded-[999px] whitespace-nowrap font-[var(--font-mono)] ${
                transition.isActive
                  ? "status-overlap-active bg-[rgba(245,158,11,0.2)] text-[#fbbf24] border border-[rgba(245,158,11,0.4)]"
                  : "status-upcoming bg-[rgba(56,189,248,0.15)] text-[#38bdf8] border border-[rgba(56,189,248,0.35)]"
              }`}
            >
              {transition.isActive ? "Overlap Aktif (30m)" : `Mulai dlm ${transition.minutesUntilStart}m`}
            </span>
          </div>

          {/* Overlap Progress Meter */}
          <div className="transition-timeline-box flex flex-col gap-[6px] bg-[rgba(255,255,255,0.03)] p-[9px_11px] rounded-[8px] border border-[rgba(255,255,255,0.06)]">
            <div className="transition-timeline-labels flex items-center justify-between text-[10px] font-[var(--font-mono)] text-[var(--ink-muted)]">
              <span className="timeline-start-time inline-flex items-center gap-[4px] text-[#cbd5e1] font-semibold">
                <Clock size={11} /> {transition.windowStart} WIB
              </span>
              <span className="timeline-info-center text-[#fbbf24] font-semibold">
                {transition.isActive
                  ? `Sisa ${transition.minutesRemaining} menit dari total 30 menit`
                  : `Mulai pada pukul ${transition.windowStart} WIB`}
              </span>
              <span className="timeline-end-time inline-flex items-center gap-[4px] text-[#cbd5e1] font-semibold">{transition.windowEnd} WIB</span>
            </div>
            <div className="transition-progress-track w-full h-[6px] rounded-[999px] bg-[rgba(255,255,255,0.08)] overflow-hidden">
              <div
                className="transition-progress-fill h-full bg-[linear-gradient(90deg,#f59e0b_0%,#a855f7_100%)] rounded-[999px] transition-[width] duration-300 ease-out [box-shadow:0_0_10px_rgba(245,158,11,0.5)]"
                style={{ width: `${transition.isActive ? transition.progressPercent : 0}%` }}
              />
            </div>
          </div>

          {/* Visual Shift Handover Cards (From Shift -> To Shift) */}
          <div className="transition-shifts-grid grid grid-cols-[1fr_auto_1fr] items-center gap-[8px]">
            {/* Outgoing Shift Card */}
            <div className={`transition-shift-card from-card shift-theme-${transition.fromShift.id} flex flex-col p-[10px] rounded-[9px] ${
              transition.fromShift.id === "pagi"
                ? "border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.05)]"
                : transition.fromShift.id === "malam"
                  ? "border border-[rgba(168,85,247,0.3)] bg-[rgba(168,85,247,0.05)]"
                  : transition.fromShift.id === "subuh"
                    ? "border border-[rgba(56,189,248,0.3)] bg-[rgba(56,189,248,0.05)]"
                    : "border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)]"
            }`}>
              <div className="shift-card-header flex items-center justify-between mb-[4px]">
                <span className="shift-card-role-tag text-[8px] font-extrabold tracking-[0.6px] text-[var(--ink-muted)] font-[var(--font-mono)]">SHIFT KELUAR</span>
                <FromIcon size={14} className={`shift-card-icon ${transition.fromShift.id === "malam" ? "text-[#c084fc]" : transition.fromShift.id === "subuh" ? "text-[#38bdf8]" : "text-[#fbbf24]"}`} />
              </div>
              <strong className="shift-card-name text-[12px] font-bold text-[#ffffff]">{transition.fromShift.label}</strong>
              <span className="shift-card-hours text-[9.5px] font-[var(--font-mono)] text-[#94a3b8] mt-[1px]">{transition.fromShift.period}</span>
              <p className="shift-card-desc m-[6px_0_0] text-[9.5px] leading-[1.35] text-[var(--ink-muted)]">
                Penyelesaian checklist monitoring, update tiket kendala, & transfer informasi operasional.
              </p>
            </div>

            {/* Connecting Transfer Indicator */}
            <div className="transition-connector flex flex-col items-center gap-[3px]">
              <span className="connector-line w-[1px] h-[8px] bg-[rgba(255,255,255,0.15)]" />
              <span className="connector-badge w-[24px] h-[24px] rounded-[50%] grid place-items-center bg-[rgba(245,158,11,0.18)] text-[#fbbf24] border border-[rgba(245,158,11,0.4)]">
                <ArrowRight size={14} />
              </span>
              <span className="connector-line w-[1px] h-[8px] bg-[rgba(255,255,255,0.15)]" />
            </div>

            {/* Incoming Shift Card */}
            <div className={`transition-shift-card to-card shift-theme-${transition.toShift.id} flex flex-col p-[10px] rounded-[9px] ${
              transition.toShift.id === "pagi"
                ? "border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.05)]"
                : transition.toShift.id === "malam"
                  ? "border border-[rgba(168,85,247,0.3)] bg-[rgba(168,85,247,0.05)]"
                  : transition.toShift.id === "subuh"
                    ? "border border-[rgba(56,189,248,0.3)] bg-[rgba(56,189,248,0.05)]"
                    : "border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)]"
            }`}>
              <div className="shift-card-header flex items-center justify-between mb-[4px]">
                <span className="shift-card-role-tag text-[8px] font-extrabold tracking-[0.6px] text-[var(--ink-muted)] font-[var(--font-mono)]">SHIFT MASUK</span>
                <ToIcon size={14} className={`shift-card-icon ${transition.toShift.id === "malam" ? "text-[#c084fc]" : transition.toShift.id === "subuh" ? "text-[#38bdf8]" : "text-[#fbbf24]"}`} />
              </div>
              <strong className="shift-card-name text-[12px] font-bold text-[#ffffff]">{transition.toShift.label}</strong>
              <span className="shift-card-hours text-[9.5px] font-[var(--font-mono)] text-[#94a3b8] mt-[1px]">{transition.toShift.period}</span>
              <p className="shift-card-desc m-[6px_0_0] text-[9.5px] leading-[1.35] text-[var(--ink-muted)]">
                Verifikasi checklist serah-terima, periksa tiket terbuka, & ambil alih pemantauan sistem.
              </p>
            </div>
          </div>

          {/* SOP Checklist / Note Hint */}
          <div className="transition-hint-banner flex items-start gap-[8px] p-[8px_10px] rounded-[8px] bg-[rgba(56,189,248,0.06)] border border-[rgba(56,189,248,0.18)] text-[10.5px] leading-[1.4] text-[#cbd5e1]">
            <CheckCircle2 size={14} className="hint-banner-icon text-[#38bdf8] shrink-0 mt-[2px]" />
            <div className="hint-banner-text">
              <strong className="block text-[#38bdf8] text-[10.5px] mb-[2px]">SOP Temu Shift 30 Menit:</strong>
              <span>
                Kedua PIC shift bertugas bersama selama {transition.windowPeriod} untuk memastikan
                kesinambungan pemantauan tanpa kendala terlewat.
              </span>
            </div>
          </div>

          {/* Popover Actions */}
          <div className="transition-popover-actions flex items-center gap-[8px] pt-[6px]">
            <button
              type="button"
              className="transition-btn-primary flex-1 inline-flex items-center justify-center gap-[6px] p-[8px_12px] bg-[linear-gradient(135deg,#f59e0b_0%,#d97706_100%)] text-[#090d16] font-bold text-[11px] rounded-[7px] border-none cursor-pointer transition-[filter,background] duration-150 [box-shadow:0_1px_3px_rgba(0,0,0,0.2)] hover:brightness-110"
              onClick={handleOpenHandover}
            >
              <ExternalLink size={13} />
              <span>Buka Catatan Serah Terima (Handover)</span>
            </button>
            <Link href={paths.teamRoster}
              
              className="transition-btn-secondary inline-flex items-center justify-center gap-[5px] p-[8px_12px] bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-[#e2e8f0] font-semibold text-[11px] rounded-[7px] cursor-pointer transition-all duration-150 hover:bg-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)] hover:text-[#ffffff]"
              onClick={() => setIsOpen(false)}
            >
              <Users size={13} />
              <span>Lihat Jadwal Tim</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
