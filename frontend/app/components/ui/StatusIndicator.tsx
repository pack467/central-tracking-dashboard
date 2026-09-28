"use client";

import React from "react";

export type StatusIndicatorType =
  | "bertugas"
  | "aktif"
  | "active"
  | "online"
  | "break"
  | "on break"
  | "standby"
  | "offline"
  | "off"
  | "off duty"
  | "on leave";

export interface StatusIndicatorProps {
  status: StatusIndicatorType | string;
  label?: string;
  size?: "sm" | "md";
  className?: string;
  style?: React.CSSProperties;
}

const STATUS_INDICATOR_BASE_CLASS = "status-indicator [display:inline-flex] [align-items:center] [font-weight:500] [line-height:1] [white-space:nowrap] [flex-shrink:0] [user-select:none]";

const STATUS_INDICATOR_SIZE_CLASSES = {
  sm: "[font-size:10px] [gap:4px]",
  md: "[font-size:11px] [gap:5.5px]",
} as const;

const STATUS_INDICATOR_STATE_CLASSES = {
  bertugas: "[color:#4ade80]",
  online: "[color:#38bdf8]",
  offline: "[color:#94a3b8]",
} as const;

const STATUS_DOT_SIZE_CLASSES = {
  sm: "[width:5px] [height:5px]",
  md: "[width:6px] [height:6px]",
} as const;

const STATUS_DOT_STATE_CLASSES = {
  bertugas: "[background:#22c55e] [box-shadow:0_0_6px_rgba(34,_197,_94,_0.65)]",
  online: "[background:#38bdf8] [box-shadow:0_0_6px_rgba(56,_189,_248,_0.65)]",
  offline: "[background:#64748b]",
} as const;

/**
 * Resolves any incoming status string to one of three canonical states:
 * 1. "bertugas" (Green dot + "Bertugas" label)
 * 2. "online"   (Blue/Teal dot + "Online" label)
 * 3. "offline"  (Muted gray dot + "Offline" label)
 */
export function resolveMemberStatus(status: string): {
  state: "bertugas" | "online" | "offline";
  defaultLabel: string;
} {
  const s = (status || "").toLowerCase().trim();
  if (
    s === "bertugas" ||
    s === "aktif" ||
    s === "active" ||
    s === "on duty" ||
    s === "present"
  ) {
    return { state: "bertugas", defaultLabel: "Bertugas" };
  }
  if (
    s === "online" ||
    s === "break" ||
    s === "on break" ||
    s === "standby"
  ) {
    return { state: "online", defaultLabel: "Online" };
  }
  return { state: "offline", defaultLabel: "Offline" };
}

/**
 * Reusable StatusIndicator Component
 * Renders a compact, colored status dot alongside an explicit text label.
 */
export function StatusIndicator({
  status,
  label,
  size = "md",
  className = "",
  style,
}: StatusIndicatorProps) {
  const { state, defaultLabel } = resolveMemberStatus(status);
  const displayLabel = label ?? defaultLabel;

  return (
    <span
      className={`${STATUS_INDICATOR_BASE_CLASS} ${STATUS_INDICATOR_SIZE_CLASSES[size]} ${STATUS_INDICATOR_STATE_CLASSES[state]} ${className}`.trim()}
      style={style}
      aria-label={`Status: ${displayLabel}`}
    >
      <span
        className={`[border-radius:50%] [flex-shrink:0] ${STATUS_DOT_SIZE_CLASSES[size]} ${STATUS_DOT_STATE_CLASSES[state]}`}
        aria-hidden="true"
      />
      <span className="status-indicator-label">{displayLabel}</span>
    </span>
  );
}
