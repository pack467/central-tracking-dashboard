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
    <div className="shift-transition-container" ref={containerRef}>
      <button
        type="button"
        className={`shift-transition-pill ${transition.isActive ? "active-window" : "upcoming-window"} ${
          isOpen ? "open" : ""
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
        <div className="transition-icon-container" aria-hidden="true">
          <ArrowRightLeft size={13} className="transition-lead-icon" />
          {transition.isActive && <span className="transition-live-dot" />}
        </div>

        {/* Clean 2-line textual hierarchy */}
        <div className="transition-info-stack">
          <div className="transition-meta-row">
            <span className="transition-kicker-label">
              {transition.isActive ? "TRANSISI SHIFT" : "MENUJU TRANSISI"}
            </span>
            <span className="transition-meta-dot">·</span>
            <span className="transition-time-range">{transition.windowStart}–{transition.windowEnd}</span>
          </div>

          <div className="transition-flow-row">
            <span className="shift-name-from">{fromShiftName}</span>
            <ArrowRight size={10} className="shift-flow-arrow" />
            <span className="shift-name-to">{toShiftName}</span>
          </div>
        </div>

        {/* Countdown Badge & Chevron */}
        <div className="transition-badge-actions">
          <span className="transition-timer-badge">
            {transition.isActive
              ? `Sisa ${transition.minutesRemaining}m`
              : `dlm ${transition.minutesUntilStart}m`}
          </span>
          <ChevronDown size={12} className={`transition-chevron ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </button>

      {isOpen && (
        <div
          className="shift-transition-popover"
          role="dialog"
          aria-label="Detail Jendela Pergantian Shift"
        >
          {/* Popover Header */}
          <div className="transition-popover-header">
            <div className="transition-header-title-box">
              <span className="transition-header-kicker">
                <ArrowRightLeft size={13} />
                <span>HANDOVER WINDOW</span>
              </span>
              <h4 className="transition-header-heading">
                {transition.isActive
                  ? `Pergantian Shift: ${transition.label}`
                  : `Persiapan Shift: ${transition.label}`}
              </h4>
            </div>
            <span
              className={`transition-status-pill ${
                transition.isActive ? "status-overlap-active" : "status-upcoming"
              }`}
            >
              {transition.isActive ? "Overlap Aktif (30m)" : `Mulai dlm ${transition.minutesUntilStart}m`}
            </span>
          </div>

          {/* Overlap Progress Meter */}
          <div className="transition-timeline-box">
            <div className="transition-timeline-labels">
              <span className="timeline-start-time">
                <Clock size={11} /> {transition.windowStart} WIB
              </span>
              <span className="timeline-info-center">
                {transition.isActive
                  ? `Sisa ${transition.minutesRemaining} menit dari total 30 menit`
                  : `Mulai pada pukul ${transition.windowStart} WIB`}
              </span>
              <span className="timeline-end-time">{transition.windowEnd} WIB</span>
            </div>
            <div className="transition-progress-track">
              <div
                className="transition-progress-fill"
                style={{ width: `${transition.isActive ? transition.progressPercent : 0}%` }}
              />
            </div>
          </div>

          {/* Visual Shift Handover Cards (From Shift -> To Shift) */}
          <div className="transition-shifts-grid">
            {/* Outgoing Shift Card */}
            <div className={`transition-shift-card from-card shift-theme-${transition.fromShift.id}`}>
              <div className="shift-card-header">
                <span className="shift-card-role-tag">SHIFT KELUAR</span>
                <FromIcon size={14} className="shift-card-icon" />
              </div>
              <strong className="shift-card-name">{transition.fromShift.label}</strong>
              <span className="shift-card-hours">{transition.fromShift.period}</span>
              <p className="shift-card-desc">
                Penyelesaian checklist monitoring, update tiket kendala, & transfer informasi operasional.
              </p>
            </div>

            {/* Connecting Transfer Indicator */}
            <div className="transition-connector">
              <span className="connector-line" />
              <span className="connector-badge">
                <ArrowRight size={14} />
              </span>
              <span className="connector-line" />
            </div>

            {/* Incoming Shift Card */}
            <div className={`transition-shift-card to-card shift-theme-${transition.toShift.id}`}>
              <div className="shift-card-header">
                <span className="shift-card-role-tag">SHIFT MASUK</span>
                <ToIcon size={14} className="shift-card-icon" />
              </div>
              <strong className="shift-card-name">{transition.toShift.label}</strong>
              <span className="shift-card-hours">{transition.toShift.period}</span>
              <p className="shift-card-desc">
                Verifikasi checklist serah-terima, periksa tiket terbuka, & ambil alih pemantauan sistem.
              </p>
            </div>
          </div>

          {/* SOP Checklist / Note Hint */}
          <div className="transition-hint-banner">
            <CheckCircle2 size={14} className="hint-banner-icon" />
            <div className="hint-banner-text">
              <strong>SOP Temu Shift 30 Menit:</strong>
              <span>
                Kedua PIC shift bertugas bersama selama {transition.windowPeriod} untuk memastikan
                kesinambungan pemantauan tanpa kendala terlewat.
              </span>
            </div>
          </div>

          {/* Popover Actions */}
          <div className="transition-popover-actions">
            <button
              type="button"
              className="transition-btn-primary"
              onClick={handleOpenHandover}
            >
              <ExternalLink size={13} />
              <span>Buka Catatan Serah Terima (Handover)</span>
            </button>
            <button
              type="button"
              className="transition-btn-secondary"
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
