"use client";

import type React from "react";

export type StatAccentColor = "blue" | "green" | "amber" | "rose" | "purple";

export interface ProgressSegment {
  label?: string;
  percentage: number;
  color: string;
}

export interface StatCardProps {
  /** Uppercase label row (e.g. "TOTAL MEMBERS") */
  label: string;
  /** Large anchor number/string */
  value: number | string;
  /** Optional unit suffix */
  unit?: string;
  /** Icon element — rendered inside the small colored circle badge */
  icon: React.ReactNode;
  /** Semantic accent color */
  accentColor?: StatAccentColor;
  /** One muted line of supporting detail */
  subtitle?: React.ReactNode;
  /** Optional inline progress bar rendered directly beneath subtitle */
  progress?: {
    /** 0–100 percentage value */
    value: number;
    /** Override bar color (defaults to accent color) */
    color?: string;
    /** Segmented bar — when provided, `value` is ignored */
    segments?: ProgressSegment[];
  };
  /** Single status/action pill rendered at the bottom */
  badgeText?: string;
  badgeTone?: "blue" | "green" | "amber" | "rose" | "neutral";
  /** Make the entire card a clickable button */
  isClickable?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
  className?: string;
}

/* Accent-color → CSS-var token map */
const ACCENT_HEX: Record<StatAccentColor, string> = {
  blue:   "#38bdf8",
  green:  "#4ade80",
  amber:  "#fbbf24",
  rose:   "#f87171",
  purple: "#c084fc",
};

export function StatCard({
  label,
  value,
  unit,
  icon,
  accentColor = "blue",
  subtitle,
  progress,
  badgeText,
  badgeTone,
  isClickable = false,
  onClick,
  ariaLabel,
  className = "",
}: StatCardProps) {
  const accentHex = ACCENT_HEX[accentColor];
  const pillTone  = badgeTone ?? accentColor;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isClickable && onClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={[
        "sc",
        `sc-${accentColor}`,
        isClickable ? "sc-clickable" : "",
        className,
      ].filter(Boolean).join(" ")}
      onClick={isClickable ? onClick : undefined}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      role={isClickable ? "button" : "region"}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={ariaLabel || label}
    >
      {/* ── Row 1: label + icon badge ── */}
      <div className="sc-header">
        <span className="sc-label">{label}</span>
        <span
          className="sc-icon"
          style={{ color: accentHex, background: `${accentHex}18` }}
          aria-hidden="true"
        >
          {icon}
        </span>
      </div>

      {/* ── Row 2: big number ── */}
      <div className="sc-value-row">
        <strong className="sc-value">{value}</strong>
        {unit && <span className="sc-unit">{unit}</span>}
      </div>

      {/* ── Rows 3 + 4: subtitle then tight progress bar ── */}
      {(subtitle || progress) && (
        <div className="sc-body">
          {subtitle && <div className="sc-subtitle">{subtitle}</div>}

          {progress && (
            <div className="sc-track" role="progressbar" aria-valuenow={progress.value} aria-valuemin={0} aria-valuemax={100}>
              {progress.segments && progress.segments.length > 0 ? (
                progress.segments.map((seg, i) => (
                  <div
                    key={i}
                    className="sc-track-seg"
                    style={{
                      width: `${Math.max(0, Math.min(100, seg.percentage))}%`,
                      backgroundColor: seg.color,
                    }}
                    title={seg.label}
                  />
                ))
              ) : (
                <div
                  className="sc-track-fill"
                  style={{
                    width: `${Math.max(0, Math.min(100, progress.value))}%`,
                    backgroundColor: progress.color ?? accentHex,
                  }}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Row 5: single status pill ── */}
      {badgeText && (
        <div className="sc-footer">
          <span className={`sc-pill sc-pill-${pillTone}`}>{badgeText}</span>
          {isClickable && <span className="sc-hint">Review →</span>}
        </div>
      )}
    </div>
  );
}
