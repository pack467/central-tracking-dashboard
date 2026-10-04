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

const ACCENT_BORDER_CLASSES: Record<StatAccentColor, string> = {
  blue:   "border-l-[2.5px] border-l-[#38bdf8] hover:border-[rgba(56,189,248,0.4)]",
  green:  "border-l-[2.5px] border-l-[#4ade80] hover:border-[rgba(74,222,128,0.4)]",
  amber:  "border-l-[2.5px] border-l-[#fbbf24] hover:border-[rgba(251,191,36,0.4)]",
  rose:   "border-l-[2.5px] border-l-[#f87171] hover:border-[rgba(248,113,113,0.4)]",
  purple: "border-l-[2.5px] border-l-[#c084fc] hover:border-[rgba(192,132,252,0.4)]",
  gray:   "border-l-[2.5px] border-l-[#94a3b8] hover:border-[rgba(148,163,184,0.4)]",
};

const PILL_TONE_CLASSES: Record<string, string> = {
  blue:    "bg-[rgba(56,189,248,0.08)] border-[rgba(56,189,248,0.25)] text-[#38bdf8]",
  green:   "bg-[rgba(74,222,128,0.08)] border-[rgba(74,222,128,0.25)] text-[#4ade80]",
  amber:   "bg-[rgba(251,191,36,0.08)] border-[rgba(251,191,36,0.25)] text-[#fbbf24]",
  rose:    "bg-[rgba(248,113,113,0.08)] border-[rgba(248,113,113,0.28)] text-[#f87171]",
  neutral: "bg-[rgba(148,163,184,0.08)] border-[rgba(148,163,184,0.2)] text-[#94a3b8]",
  purple:  "bg-[rgba(192,132,252,0.08)] border-[rgba(192,132,252,0.25)] text-[#c084fc]",
  gray:    "bg-[rgba(148,163,184,0.08)] border-[rgba(148,163,184,0.2)] text-[#94a3b8]",
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
        "sc flex flex-col gap-[8px] p-[16px_18px] bg-[#141e30] border border-[rgba(255,255,255,0.07)] rounded-[11px] [transition:border-color_0.15s_ease,background-color_0.15s_ease]",
        ACCENT_BORDER_CLASSES[accentColor] || ACCENT_BORDER_CLASSES.blue,
        isClickable ? "sc-clickable cursor-pointer select-none group/stat" : "",
        className,
      ].filter(Boolean).join(" ")}
      onClick={isClickable ? onClick : undefined}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      role={isClickable ? "button" : "region"}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={ariaLabel || label}
    >
      {/* ── Row 1: label + icon badge ── */}
      <div className="sc-header flex items-center justify-between gap-[8px]">
        <span className="sc-label text-[10px] font-bold tracking-[0.8px] uppercase font-mono text-[var(--ink-muted)]">{label}</span>
        <span
          className="sc-icon inline-grid place-items-center w-[28px] h-[28px] rounded-[50%] shrink-0 border border-current opacity-95"
          style={{ color: accentHex, background: `${accentHex}18` }}
          aria-hidden="true"
        >
          {icon}
        </span>
      </div>

      {/* ── Row 2: big number ── */}
      <div className="sc-value-row flex items-baseline gap-[3px] leading-none">
        <strong className="sc-value text-[32px] font-extrabold tracking-[-0.6px] text-[var(--ink-primary)]">{value}</strong>
        {unit && <span className="sc-unit text-[13px] font-semibold text-[var(--ink-muted)]">{unit}</span>}
      </div>

      {/* ── Rows 3 + 4: subtitle then tight progress bar ── */}
      {(subtitle || progress) && (
        <div className="sc-body flex flex-col gap-[6px]">
          {subtitle && <div className="sc-subtitle text-[11px] font-medium text-[var(--ink-muted)] leading-[1.35]">{subtitle}</div>}

          {progress && (
            <div className="sc-track h-[3px] w-full bg-[rgba(148,163,184,0.12)] rounded-[99px] overflow-hidden flex" role="progressbar" aria-valuenow={progress.value} aria-valuemin={0} aria-valuemax={100}>
              {progress.segments && progress.segments.length > 0 ? (
                progress.segments.map((seg, i) => (
                  <div
                    key={i}
                    className="sc-track-seg h-full rounded-[99px] [transition:width_0.3s_ease]"
                    style={{
                      width: `${Math.max(0, Math.min(100, seg.percentage))}%`,
                      backgroundColor: seg.color,
                    }}
                    title={seg.label}
                  />
                ))
              ) : (
                <div
                  className="sc-track-fill h-full rounded-[99px] [transition:width_0.3s_ease]"
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
        <div className="sc-footer flex items-center justify-between gap-[6px] mt-[2px]">
          <span className={`sc-pill inline-flex items-center px-[8px] py-[2.5px] rounded-[99px] text-[10px] font-semibold font-mono tracking-[0.2px] leading-none border ${PILL_TONE_CLASSES[pillTone] || PILL_TONE_CLASSES.neutral}`}>{badgeText}</span>
          {isClickable && <span className="sc-hint text-[11px] font-semibold text-[var(--ink-muted)] whitespace-nowrap [transition:color_0.15s_ease] group-hover/stat:text-[var(--accent-blue,#38bdf8)]">Review →</span>}
        </div>
      )}
    </div>
  );
}
