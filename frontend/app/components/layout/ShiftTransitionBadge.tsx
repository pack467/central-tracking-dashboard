"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowRightLeft, CheckCircle2, ChevronDown, Clock, ExternalLink, Moon, Sun, Sunset, Users } from "lucide-react";
import { useShiftTransition } from "@/app/hooks/useLiveClock";
import type { ShiftInfo } from "@/app/lib/shifts";

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

  const handleOpenRoster = () => {
    setIsOpen(false);
    if (onNavigate) {
      onNavigate("Team Roster");
    }
  };

  const fromShiftName = transition.fromShift.name.replace("Shift ", "");
  const toShiftName = transition.toShift.name.replace("Shift ", "");

  return (
    <div
      className="shift-transition-container [position:relative] [display:inline-flex] [align-items:center]"
      ref={containerRef}
    >
      <button
        type="button"
        className={`shift-transition-pill [display:inline-flex] [align-items:center] [gap:12px] [padding:5px_12px] [min-height:38px] [border-radius:8px] [cursor:pointer] [user-select:none] [color:#ffffff] [transition:background-color_0.18s_ease,_border-color_0.18s_ease] [box-shadow:none] [&:hover_.transition-chevron]:[color:rgba(255,_255,_255,_0.85)] ${
          transition.isActive
            ? isOpen
              ? "active-window open [border:1px_solid_#f59e0b]! [background:rgba(245,_158,_11,_0.18)]!"
              : "active-window [border:1px_solid_rgba(245,_158,_11,_0.32)]! [background:rgba(245,_158,_11,_0.08)]! [&:hover]:[border:1px_solid_rgba(245,_158,_11,_0.55)]! [&:hover]:[background:rgba(245,_158,_11,_0.14)]!"
            : "upcoming-window [border:1px_solid_rgba(56,_189,_248,_0.3)]! [background:rgba(56,_189,_248,_0.08)]! [&:hover]:[border:1px_solid_rgba(56,_189,_248,_0.55)]! [&:hover]:[background:rgba(56,_189,_248,_0.14)]!"
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
          className={`transition-icon-container [position:relative] [display:flex] [align-items:center] [justify-content:center] [width:24px] [height:24px] [border-radius:6px] [flex-shrink:0] ${
            transition.isActive
              ? "[background:rgba(245,_158,_11,_0.14)] [border:1px_solid_rgba(245,_158,_11,_0.3)]"
              : "[background:rgba(56,_189,_248,_0.14)] [border:1px_solid_rgba(56,_189,_248,_0.3)]"
          }`}
          aria-hidden="true"
        >
          <ArrowRightLeft
            size={13}
            className={`transition-lead-icon ${transition.isActive ? "[color:#fbbf24]" : "[color:#38bdf8]"}`}
          />
          {transition.isActive && (
            <span className="transition-live-dot [position:absolute] [top:-2px] [right:-2px] [width:6px] [height:6px] [border-radius:50%] [background:#f59e0b] [box-shadow:0_0_6px_#f59e0b] [animation:liveDotPulse_2s_infinite_ease-in-out]" />
          )}
        </div>

        {/* Clean 2-line textual hierarchy */}
        <div className="transition-info-stack [display:flex] [flex-direction:column] [align-items:flex-start] [text-align:left] [line-height:1.15] [min-width:0]">
          <div className="transition-meta-row [display:flex] [align-items:center] [gap:4px]">
            <span className={`transition-kicker-label [font-size:8.5px] [font-weight:800] [letter-spacing:0.6px] [text-transform:uppercase] [font-family:var(--font-mono)] ${transition.isActive ? "[color:#fbbf24]" : "[color:#38bdf8]"}`}>
              {transition.isActive ? "TRANSISI SHIFT" : "MENUJU TRANSISI"}
            </span>
            <span className="transition-meta-dot [color:rgba(255,_255,_255,_0.35)] [font-size:9px]">·</span>
            <span className="transition-time-range [font-size:9.5px] [font-family:var(--font-mono)] [color:rgba(255,_255,_255,_0.7)] [font-weight:500]">{transition.windowStart}–{transition.windowEnd}</span>
          </div>

          <div className="transition-flow-row [display:flex] [align-items:center] [gap:4px] [margin-top:1px] [font-size:11.5px] [font-weight:700] [color:#f8fafc] [white-space:nowrap]">
            <span className="shift-name-from [color:#e2e8f0]">{fromShiftName}</span>
            <ArrowRight size={10} className={`shift-flow-arrow [opacity:0.85] ${transition.isActive ? "[color:#fbbf24]" : "[color:#38bdf8]"}`} />
            <span className="shift-name-to [color:#ffffff]">{toShiftName}</span>
          </div>
        </div>

        {/* Countdown Badge & Chevron */}
        <div className="transition-badge-actions [display:inline-flex] [align-items:center] [gap:8px] [margin-left:auto] [flex-shrink:0]">
          <span className={`transition-timer-badge [display:inline-flex] [align-items:center] [justify-content:center] [height:24px] [min-width:64px] [padding:0_10px] [border-radius:999px] [font-size:10.5px] [font-weight:700] [font-family:var(--font-mono)] [line-height:1] [letter-spacing:0.2px] [text-align:center] [white-space:nowrap] [box-sizing:border-box] ${transition.isActive ? "[background:rgba(245,_158,_11,_0.18)] [color:#fbbf24] [border:1px_solid_rgba(245,_158,_11,_0.4)]" : "[background:rgba(56,_189,_248,_0.15)] [color:#38bdf8] [border:1px_solid_rgba(56,_189,_248,_0.4)]"}`}>
            {transition.isActive
              ? `Sisa ${transition.minutesRemaining}m`
              : `dlm ${transition.minutesUntilStart}m`}
          </span>
          <ChevronDown size={12} className={`transition-chevron [display:inline-flex] [align-items:center] [justify-content:center] [color:rgba(255,_255,_255,_0.55)] [transition:transform_0.2s_ease,_color_0.15s_ease] [flex-shrink:0] ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </button>

      {isOpen && (
        <div
          className="shift-transition-popover [position:absolute] [top:calc(100%_+_8px)] [right:0] [width:420px] [max-width:calc(100vw_-_24px)] [background:#111520] [border:1px_solid_rgba(245,_158,_11,_0.35)] [border-radius:12px] [box-shadow:0_16px_40px_rgba(0,_0,_0,_0.75),_0_0_28px_rgba(245,_158,_11,_0.15)] [padding:16px] [z-index:100] [backdrop-filter:blur(16px)] [display:flex] [flex-direction:column] [gap:13px] [animation:transitionPopoverFade_0.18s_cubic-bezier(0.16,_1,_0.3,_1)]"
          role="dialog"
          aria-label="Detail Jendela Pergantian Shift"
        >
          {/* Popover Header */}
          <div className="transition-popover-header [display:flex] [align-items:flex-start] [justify-content:space-between] [gap:10px] [padding-bottom:10px] [border-bottom:1px_solid_rgba(255,_255,_255,_0.08)]">
            <div className="transition-header-title-box [display:flex] [flex-direction:column] [gap:2px]">
              <span className="transition-header-kicker [display:inline-flex] [align-items:center] [gap:5px] [font-size:9.5px] [font-weight:800] [letter-spacing:0.8px] [color:#fbbf24] [text-transform:uppercase] [font-family:var(--font-mono)]">
                <ArrowRightLeft size={13} />
                <span>HANDOVER WINDOW</span>
              </span>
              <h4 className="transition-header-heading [margin:0] [font-size:14px] [font-weight:700] [color:#ffffff]">
                {transition.isActive
                  ? `Pergantian Shift: ${transition.label}`
                  : `Persiapan Shift: ${transition.label}`}
              </h4>
            </div>
            <span
              className={`transition-status-pill [font-size:10px] [font-weight:700] [padding:3px_8px] [border-radius:999px] [white-space:nowrap] [font-family:var(--font-mono)] ${
                transition.isActive
                  ? "status-overlap-active [background:rgba(245,_158,_11,_0.2)] [color:#fbbf24] [border:1px_solid_rgba(245,_158,_11,_0.4)]"
                  : "status-upcoming [background:rgba(56,_189,_248,_0.15)] [color:#38bdf8] [border:1px_solid_rgba(56,_189,_248,_0.35)]"
              }`}
            >
              {transition.isActive ? "Overlap Aktif (30m)" : `Mulai dlm ${transition.minutesUntilStart}m`}
            </span>
          </div>

          {/* Overlap Progress Meter */}
          <div className="transition-timeline-box [display:flex] [flex-direction:column] [gap:6px] [background:rgba(255,_255,_255,_0.03)] [padding:9px_11px] [border-radius:8px] [border:1px_solid_rgba(255,_255,_255,_0.06)]">
            <div className="transition-timeline-labels [display:flex] [align-items:center] [justify-content:space-between] [font-size:10px] [font-family:var(--font-mono)] [color:var(--ink-muted)]">
              <span className="timeline-start-time [display:inline-flex] [align-items:center] [gap:4px] [color:#cbd5e1] [font-weight:600]">
                <Clock size={11} /> {transition.windowStart} WIB
              </span>
              <span className="timeline-info-center [color:#fbbf24] [font-weight:600]">
                {transition.isActive
                  ? `Sisa ${transition.minutesRemaining} menit dari total 30 menit`
                  : `Mulai pada pukul ${transition.windowStart} WIB`}
              </span>
              <span className="timeline-end-time [display:inline-flex] [align-items:center] [gap:4px] [color:#cbd5e1] [font-weight:600]">{transition.windowEnd} WIB</span>
            </div>
            <div className="transition-progress-track [width:100%] [height:6px] [border-radius:999px] [background:rgba(255,_255,_255,_0.08)] [overflow:hidden]">
              <div
                className="transition-progress-fill [height:100%] [background:linear-gradient(90deg,_#f59e0b_0%,_#a855f7_100%)] [border-radius:999px] [transition:width_0.3s_ease] [box-shadow:0_0_10px_rgba(245,_158,_11,_0.5)]"
                style={{ width: `${transition.isActive ? transition.progressPercent : 0}%` }}
              />
            </div>
          </div>

          {/* Visual Shift Handover Cards (From Shift -> To Shift) */}
          <div className="transition-shifts-grid [display:grid] [grid-template-columns:1fr_auto_1fr] [align-items:center] [gap:8px]">
            {/* Outgoing Shift Card */}
            <div className={`transition-shift-card from-card shift-theme-${transition.fromShift.id} [display:flex] [flex-direction:column] [padding:10px] [border-radius:9px] ${
              transition.fromShift.id === "pagi"
                ? "[border:1px_solid_rgba(245,_158,_11,_0.3)] [background:rgba(245,_158,_11,_0.05)]"
                : transition.fromShift.id === "malam"
                  ? "[border:1px_solid_rgba(168,_85,_247,_0.3)] [background:rgba(168,_85,_247,_0.05)]"
                  : transition.fromShift.id === "subuh"
                    ? "[border:1px_solid_rgba(56,_189,_248,_0.3)] [background:rgba(56,_189,_248,_0.05)]"
                    : "[border:1px_solid_rgba(255,_255,_255,_0.08)] [background:rgba(255,_255,_255,_0.03)]"
            }`}>
              <div className="shift-card-header [display:flex] [align-items:center] [justify-content:space-between] [margin-bottom:4px]">
                <span className="shift-card-role-tag [font-size:8px] [font-weight:800] [letter-spacing:0.6px] [color:var(--ink-muted)] [font-family:var(--font-mono)]">SHIFT KELUAR</span>
                <FromIcon size={14} className={`shift-card-icon ${transition.fromShift.id === "malam" ? "[color:#c084fc]" : transition.fromShift.id === "subuh" ? "[color:#38bdf8]" : "[color:#fbbf24]"}`} />
              </div>
              <strong className="shift-card-name [font-size:12px] [font-weight:700] [color:#ffffff]">{transition.fromShift.label}</strong>
              <span className="shift-card-hours [font-size:9.5px] [font-family:var(--font-mono)] [color:#94a3b8] [margin-top:1px]">{transition.fromShift.period}</span>
              <p className="shift-card-desc [margin:6px_0_0] [font-size:9.5px] [line-height:1.35] [color:var(--ink-muted)]">
                Penyelesaian checklist monitoring, update tiket kendala, & transfer informasi operasional.
              </p>
            </div>

            {/* Connecting Transfer Indicator */}
            <div className="transition-connector [display:flex] [flex-direction:column] [align-items:center] [gap:3px]">
              <span className="connector-line [width:1px] [height:8px] [background:rgba(255,_255,_255,_0.15)]" />
              <span className="connector-badge [width:24px] [height:24px] [border-radius:50%] [display:grid] [place-items:center] [background:rgba(245,_158,_11,_0.18)] [color:#fbbf24] [border:1px_solid_rgba(245,_158,_11,_0.4)]">
                <ArrowRight size={14} />
              </span>
              <span className="connector-line [width:1px] [height:8px] [background:rgba(255,_255,_255,_0.15)]" />
            </div>

            {/* Incoming Shift Card */}
            <div className={`transition-shift-card to-card shift-theme-${transition.toShift.id} [display:flex] [flex-direction:column] [padding:10px] [border-radius:9px] ${
              transition.toShift.id === "pagi"
                ? "[border:1px_solid_rgba(245,_158,_11,_0.3)] [background:rgba(245,_158,_11,_0.05)]"
                : transition.toShift.id === "malam"
                  ? "[border:1px_solid_rgba(168,_85,_247,_0.3)] [background:rgba(168,_85,_247,_0.05)]"
                  : transition.toShift.id === "subuh"
                    ? "[border:1px_solid_rgba(56,_189,_248,_0.3)] [background:rgba(56,_189,_248,_0.05)]"
                    : "[border:1px_solid_rgba(255,_255,_255,_0.08)] [background:rgba(255,_255,_255,_0.03)]"
            }`}>
              <div className="shift-card-header [display:flex] [align-items:center] [justify-content:space-between] [margin-bottom:4px]">
                <span className="shift-card-role-tag [font-size:8px] [font-weight:800] [letter-spacing:0.6px] [color:var(--ink-muted)] [font-family:var(--font-mono)]">SHIFT MASUK</span>
                <ToIcon size={14} className={`shift-card-icon ${transition.toShift.id === "malam" ? "[color:#c084fc]" : transition.toShift.id === "subuh" ? "[color:#38bdf8]" : "[color:#fbbf24]"}`} />
              </div>
              <strong className="shift-card-name [font-size:12px] [font-weight:700] [color:#ffffff]">{transition.toShift.label}</strong>
              <span className="shift-card-hours [font-size:9.5px] [font-family:var(--font-mono)] [color:#94a3b8] [margin-top:1px]">{transition.toShift.period}</span>
              <p className="shift-card-desc [margin:6px_0_0] [font-size:9.5px] [line-height:1.35] [color:var(--ink-muted)]">
                Verifikasi checklist serah-terima, periksa tiket terbuka, & ambil alih pemantauan sistem.
              </p>
            </div>
          </div>

          {/* SOP Checklist / Note Hint */}
          <div className="transition-hint-banner [display:flex] [align-items:flex-start] [gap:8px] [padding:8px_10px] [border-radius:8px] [background:rgba(56,_189,_248,_0.06)] [border:1px_solid_rgba(56,_189,_248,_0.18)] [font-size:10.5px] [line-height:1.4] [color:#cbd5e1]">
            <CheckCircle2 size={14} className="hint-banner-icon [color:#38bdf8] [flex-shrink:0] [margin-top:2px]" />
            <div className="hint-banner-text">
              <strong className="[display:block] [color:#38bdf8] [font-size:10.5px] [margin-bottom:2px]">SOP Temu Shift 30 Menit:</strong>
              <span>
                Kedua PIC shift bertugas bersama selama {transition.windowPeriod} untuk memastikan
                kesinambungan pemantauan tanpa kendala terlewat.
              </span>
            </div>
          </div>

          {/* Popover Actions */}
          <div className="transition-popover-actions [display:flex] [align-items:center] [gap:8px] [padding-top:6px]">
            <button
              type="button"
              className="transition-btn-primary [flex:1] [display:inline-flex] [align-items:center] [justify-content:center] [gap:6px] [padding:8px_12px] [background:linear-gradient(135deg,_#f59e0b_0%,_#d97706_100%)]! [color:#090d16] [font-weight:700] [font-size:11px]! [border-radius:7px] [border:none]! [cursor:pointer] [transition:filter_0.15s_ease,_background_0.15s_ease] [box-shadow:0_1px_3px_rgba(0,_0,_0,_0.2)] [&:hover]:[filter:brightness(1.08)]"
              onClick={handleOpenHandover}
            >
              <ExternalLink size={13} />
              <span>Buka Catatan Serah Terima (Handover)</span>
            </button>
            <button
              type="button"
              className="transition-btn-secondary [display:inline-flex] [align-items:center] [justify-content:center] [gap:5px] [padding:8px_12px] [background:rgba(255,_255,_255,_0.05)]! [border:1px_solid_rgba(255,_255,_255,_0.1)]! [color:#e2e8f0] [font-weight:600] [font-size:11px]! [border-radius:7px] [cursor:pointer] [transition:all_0.15s_ease] [&:hover]:[background:rgba(255,_255,_255,_0.1)]! [&:hover]:[border:1px_solid_rgba(255,_255,_255,_0.2)]! [&:hover]:[color:#ffffff]"
              onClick={handleOpenRoster}
            >
              <Users size={13} />
              <span>Lihat Jadwal Tim</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
