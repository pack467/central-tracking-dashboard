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
  const sizeClass = size === "sm" ? "status-indicator-sm" : "";

  return (
    <span
      className={`status-indicator status-indicator-${state} ${sizeClass} ${className}`.trim()}
      style={style}
      aria-label={`Status: ${displayLabel}`}
    >
      <span className="status-indicator-dot" aria-hidden="true" />
      <span className="status-indicator-label">{displayLabel}</span>
    </span>
  );
}
