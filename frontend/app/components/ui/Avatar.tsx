"use client";

import React from "react";
import { initials as getInitials } from "@/app/lib/data";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | number;

export interface AvatarProps {
  name?: string | null;
  initials?: string;
  size?: AvatarSize;
  shape?: "circle" | "rounded";
  className?: string;
  style?: React.CSSProperties;
  statusRing?: "active" | "break" | "off" | "verified" | "pending" | string;
  title?: string;
  ariaLabel?: string;
  children?: React.ReactNode;
}

/**
 * Global Shared Avatar Component
 * Enforces unified neutral grayscale styling across the entire application.
 */
export function Avatar({
  name,
  initials: explicitInitials,
  size = "md",
  shape = "circle",
  className = "",
  style,
  statusRing,
  title,
  ariaLabel,
  children,
}: AvatarProps) {
  const displayText = children
    ? children
    : explicitInitials
    ? explicitInitials
    : getInitials(name);

  const sizeClass = typeof size === "string" ? `ui-avatar-${size}` : "";
  const customSizeStyle: React.CSSProperties =
    typeof size === "number"
      ? {
          width: `${size}px`,
          height: `${size}px`,
          minWidth: `${size}px`,
          minHeight: `${size}px`,
          fontSize: `${Math.max(9, Math.round(size * 0.38))}px`,
        }
      : {};

  const ringClass = statusRing
    ? statusRing === "verified" || statusRing === "pending"
      ? `avatar-${statusRing}`
      : `avatar-status-ring avatar-ring-${statusRing}`
    : "";

  return (
    <span
      className={`ui-avatar ui-avatar-${shape} ${sizeClass} ${ringClass} ${className}`.trim()}
      style={{ ...customSizeStyle, ...style }}
      title={title ?? (name || undefined)}
      aria-label={ariaLabel ?? (name ? `Avatar ${name}` : undefined)}
      aria-hidden={!ariaLabel && !title ? true : undefined}
    >
      {displayText}
    </span>
  );
}
