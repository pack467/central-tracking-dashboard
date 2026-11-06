"use client";

import React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  tone?: "panel" | "card" | "subtle" | "accent";
  staggerIndex?: number;
  staggerIn?: boolean;
  pulse?: boolean;
  style?: React.CSSProperties;
}

/**
 * Primitif Reusable: Skeleton (Blok Dasar Berkontras Tinggi & Shimmer Diagonal)
 *
 * Menggunakan token desain Dark Slate Premium:
 * - Dasar: #243044 (alpha 0.9) di atas panel #1e293b (kontras terukur >= 1.4:1)
 * - Border mikro: border-[#334155]/40 untuk definisi bentuk presisi
 * - Shimmer: kilau sweep diagonal (100deg) #334155 -> #3b4a63 -> #334155 (lebar ~40%)
 * - Phase Global: offset animasi diagonal via staggerIndex (jeda fase negatif)
 * - Pulsa Halus: opacity 0.88 -> 1 dengan periode 1.8s
 * - Aksesibilitas: aria-hidden="true"
 * - prefers-reduced-motion: animasi dinonaktifkan otomatis di theme.css, blok tetap kontras
 */
export function Skeleton({
  className = "",
  width,
  height,
  borderRadius = 6,
  tone = "panel",
  staggerIndex,
  staggerIn = false,
  pulse = true,
  style,
  ...props
}: SkeletonProps) {
  const bgClass =
    tone === "card"
      ? "bg-[#283548] border border-[#334155]/60"
      : tone === "subtle"
      ? "bg-[#1e293b]/90 border border-[#334155]/30"
      : tone === "accent"
      ? "bg-sky-500/15 border border-sky-400/30"
      : "bg-[#243044]/90 border border-[#334155]/40";

  const staggerPhaseDelay =
    typeof staggerIndex === "number"
      ? `${-((Math.abs(staggerIndex) % 12) * 150)}ms`
      : undefined;

  const entranceDelay =
    staggerIn && typeof staggerIndex === "number"
      ? `${Math.min(staggerIndex * 40, 480)}ms`
      : undefined;

  return (
    <div
      className={`relative overflow-hidden ${bgClass} shrink-0 box-border ${
        pulse ? "animate-skeleton-pulse" : ""
      } ${staggerIn ? "animate-skeleton-stagger-in" : ""} ${className}`}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        borderRadius:
          typeof borderRadius === "number" ? `${borderRadius}px` : borderRadius,
        animationDelay: entranceDelay || staggerPhaseDelay,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    >
      {/* Lapisan Shimmer Sapuan Diagonal Transform 100deg */}
      <div
        className="absolute inset-0 -translate-x-full bg-[linear-gradient(100deg,transparent_15%,#334155_38%,#3b4a63_50%,#334155_62%,transparent_85%)] animate-shimmer pointer-events-none"
        style={{
          animationDelay: staggerPhaseDelay,
        }}
        aria-hidden="true"
      />
    </div>
  );
}
