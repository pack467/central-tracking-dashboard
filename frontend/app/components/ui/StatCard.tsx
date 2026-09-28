"use client";

import type React from "react";

export type StatAccentColor = "blue" | "green" | "amber" | "rose" | "purple" | "gray";

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
  badgeTone?: "blue" | "green" | "amber" | "rose" | "neutral" | "purple" | "gray";
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
  gray:   "#94a3b8",
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
        "sc [display:flex] [flex-direction:column] [gap:8px] [padding:16px_18px] [background:#141e30] [border:1px_solid_rgba(255,_255,_255,_0.07)] [border-radius:11px] [transition:border-color_0.15s_ease,_background-color_0.15s_ease]",
        `sc-${accentColor}`,
        isClickable ? "sc-clickable [cursor:pointer] [user-select:none]" : "",
        className,
      ].filter(Boolean).join(" ")}
      onClick={isClickable ? onClick : undefined}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      role={isClickable ? "button" : "region"}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={ariaLabel || label}
    >
      {/* ── Row 1: label + icon badge ── */}
      <div className="sc-header [display:flex] [align-items:center] [justify-content:space-between] [gap:8px]">
        <span className="sc-label [font-size:10px] [font-weight:700] [letter-spacing:0.8px] [text-transform:uppercase] [font-family:var(--font-mono)] [color:var(--ink-muted)]">{label}</span>
        <span
          className="sc-icon [display:inline-grid] [place-items:center] [width:28px] [height:28px] [border-radius:50%] [flex-shrink:0] [border:1px_solid_currentColor] [opacity:0.95]"
          style={{ color: accentHex, background: `${accentHex}18` }}
          aria-hidden="true"
        >
          {icon}
        </span>
      </div>

      {/* ── Row 2: big number ── */}
      <div className="sc-value-row [display:flex] [align-items:baseline] [gap:3px] [line-height:1]">
        <strong className="sc-value [font-size:32px] [font-weight:800] [letter-spacing:-0.6px] [color:var(--ink-primary)]">{value}</strong>
        {unit && <span className="sc-unit [font-size:13px] [font-weight:600] [color:var(--ink-muted)]">{unit}</span>}
      </div>

      {/* ── Rows 3 + 4: subtitle then tight progress bar ── */}
      {(subtitle || progress) && (
        <div className="sc-body [display:flex] [flex-direction:column] [gap:6px]">
          {subtitle && <div className="sc-subtitle [font-size:11px] [font-weight:500] [color:var(--ink-muted)] [line-height:1.35]">{subtitle}</div>}

          {progress && (
            <div className="sc-track [height:3px] [width:100%] [background:rgba(148,_163,_184,_0.12)] [border-radius:99px] [overflow:hidden] [display:flex]" role="progressbar" aria-valuenow={progress.value} aria-valuemin={0} aria-valuemax={100}>
              {progress.segments && progress.segments.length > 0 ? (
                progress.segments.map((seg, i) => (
                  <div
                    key={i}
                    className="sc-track-seg [height:100%] [border-radius:99px] [transition:width_0.3s_ease]"
                    style={{
                      width: `${Math.max(0, Math.min(100, seg.percentage))}%`,
                      backgroundColor: seg.color,
                    }}
                    title={seg.label}
                  />
                ))
              ) : (
                <div
                  className="sc-track-fill [height:100%] [border-radius:99px] [transition:width_0.3s_ease]"
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
        <div className="sc-footer [display:flex] [align-items:center] [justify-content:space-between] [gap:6px] [margin-top:2px]">
          <span className={`sc-pill sc-pill-${pillTone} [display:inline-flex] [align-items:center] [padding:2.5px_8px] [border-radius:99px] [font-size:10px] [font-weight:600] [font-family:var(--font-mono)] [letter-spacing:0.2px] [line-height:1] [border:1px_solid_rgba(148,_163,_184,_0.2)] [background:rgba(148,_163,_184,_0.08)]`}>{badgeText}</span>
          {isClickable && <span className="sc-hint [font-size:11px] [font-weight:600] [color:var(--ink-muted)] [white-space:nowrap] [transition:color_0.15s_ease]">Review →</span>}
        </div>
      )}
    </div>
  );
}
