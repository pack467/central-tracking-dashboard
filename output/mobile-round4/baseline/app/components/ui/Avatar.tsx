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

const AVATAR_BASE_CLASS =
  "[display:inline-grid] [place-items:center] [flex-shrink:0] [user-select:none] [background:var(--avatar-bg,_#3a3a3e)]! [color:var(--avatar-text,_#f8fafc)]! [border:1px_solid_var(--avatar-border,_rgba(148,_163,_184,_0.22))] [font-family:var(--font-mono,_monospace)] [font-weight:700] [line-height:1] [text-align:center] [box-sizing:border-box] [filter:grayscale(100%)] [-webkit-filter:grayscale(100%)]";

const AVATAR_SHAPE_CLASS: Record<"circle" | "rounded", string> = {
  circle: "[border-radius:9999px]",
  rounded: "[border-radius:8px]",
};

const AVATAR_SIZE_TAILWIND_CLASS: Record<Exclude<AvatarSize, number>, string> = {
  xs: "[width:20px] [height:20px] [min-width:20px] [min-height:20px] [font-size:8.5px]",
  sm: "[width:26px] [height:26px] [min-width:26px] [min-height:26px] [font-size:10px]",
  md: "[width:32px] [height:32px] [min-width:32px] [min-height:32px] [font-size:11.5px]",
  lg: "[width:42px] [height:42px] [min-width:42px] [min-height:42px] [font-size:14px]",
  xl: "[width:72px] [height:72px] [min-width:72px] [min-height:72px] [font-size:26px] [font-family:var(--font-sans,_sans-serif)] [border-width:3px] [box-shadow:0_0_0_4px_rgba(148,_163,_184,_0.15)]",
};

const AVATAR_STATUS_RING_CLASS: Record<string, string> = {
  active: "relative outline-[2.5px] outline-solid outline-[var(--green)] outline-offset-[2px] transition-[outline-color] duration-200",
  break: "relative outline-[2.5px] outline-solid outline-[var(--orange)] outline-offset-[2px] transition-[outline-color] duration-200",
  off: "relative outline-[2.5px] outline-solid outline-[var(--ink-muted)] outline-offset-[2px] transition-[outline-color] duration-200",
  verified: "relative outline-[2.5px] outline-solid outline-[var(--green)] outline-offset-[2px] transition-[outline-color] duration-200",
  pending: "relative outline-[2.5px] outline-solid outline-[var(--orange)] outline-offset-[2px] transition-[outline-color] duration-200",
};

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
  const tailwindSizeClass =
    typeof size === "string" ? AVATAR_SIZE_TAILWIND_CLASS[size] : "";
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
    ? AVATAR_STATUS_RING_CLASS[statusRing] ?? "relative outline-[2.5px] outline-solid outline-[var(--ink-muted)] outline-offset-[2px] transition-[outline-color] duration-200"
    : "";

  return (
    <span
      className={`ui-avatar ${AVATAR_BASE_CLASS} ui-avatar-${shape} ${AVATAR_SHAPE_CLASS[shape]} ${sizeClass} ${tailwindSizeClass} ${ringClass} ${className}`.trim()}
      style={{ ...customSizeStyle, ...style }}
      title={title ?? (name || undefined)}
      aria-label={ariaLabel ?? (name ? `Avatar ${name}` : undefined)}
      aria-hidden={!ariaLabel && !title ? true : undefined}
    >
      {displayText}
    </span>
  );
}
