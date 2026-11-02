"use client";

import React from "react";
import { Skeleton } from "./Skeleton";

export interface SkeletonChartProps {
  variant?: "bar" | "line" | "donut";
  height?: number | string;
  hasLegend?: boolean;
  className?: string;
}

const DETERMINISTIC_BAR_HEIGHTS = [45, 75, 32, 88, 58, 82, 38, 72, 54, 94, 66, 48];
const X_AXIS_DATES = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

/**
 * Primitif Reusable: SkeletonChart
 *
 * Menampilkan placeholder grafik analitik berstandar tinggi:
 * - variant "bar": Bar grafik bertingkat dengan animasi scaleY berurutan (1.2s loop)
 * - variant "line": Kurva spline SVG halus dengan garis putus-putus dan grid horizontal
 * - variant "donut": Cincin tebal dengan arc shimmer memutar, angka tengah, & legenda
 */
export function SkeletonChart({
  variant = "bar",
  height = 240,
  hasLegend = true,
  className = "",
}: SkeletonChartProps) {
  const chartHeight = typeof height === "number" ? `${height}px` : height;

  if (variant === "donut") {
    return (
      <div
        className={`w-full flex flex-col items-center justify-center gap-4 ${className}`}
        style={{ minHeight: chartHeight }}
        aria-hidden="true"
      >
        <div className="relative flex items-center justify-center">
          {/* Cincin Luar Donut */}
          <div className="relative w-40 h-40 rounded-full flex items-center justify-center overflow-hidden bg-[#243044]/90 border border-[#334155]/60">
            {/* Lapisan Arc Berputar Halus */}
            <div
              className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#38bdf8_0deg,#334155_90deg,#243044_180deg,#3b4a63_270deg,#38bdf8_360deg)] opacity-35 animate-skeleton-rotate pointer-events-none"
              aria-hidden="true"
            />
            {/* Lubang Tengah Donut */}
            <div className="relative w-24 h-24 rounded-full bg-[#1e293b] border border-[#334155]/50 flex flex-col items-center justify-center gap-1 z-10 shadow-inner">
              <Skeleton width={38} height={18} borderRadius={4} tone="card" />
              <Skeleton width={32} height={8} borderRadius={2} tone="subtle" />
            </div>
          </div>
        </div>

        {hasLegend && (
          <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 px-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-2 p-1 rounded bg-[#0f172a]/40 border border-[#334155]/30">
                <Skeleton width={8} height={8} borderRadius={2} tone="accent" staggerIndex={i} />
                <Skeleton width="65%" height={10} borderRadius={3} tone="subtle" staggerIndex={i} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (variant === "line") {
    return (
      <div
        className={`w-full flex flex-col justify-between ${className}`}
        style={{ minHeight: chartHeight }}
        aria-hidden="true"
      >
        <div className="relative flex-1 w-full flex flex-col justify-between py-2 border-b border-[#334155]/40">
          {/* 4 Garis Grid Horizontal Samar */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none py-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-full flex items-center gap-2">
                <Skeleton width={20} height={8} borderRadius={2} tone="subtle" />
                <div className="flex-1 h-px bg-[#334155]/30 border-b border-dashed border-[#334155]/40" />
              </div>
            ))}
          </div>

          {/* SVG Smooth Sine/Bezier Placeholder Wave */}
          <svg
            className="absolute inset-0 w-full h-full overflow-visible pointer-events-none pl-6 pr-2 py-2"
            preserveAspectRatio="none"
            viewBox="0 0 400 100"
          >
            <defs>
              <linearGradient id="skeletonLineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d="M0,65 C60,35 120,80 180,45 C240,15 300,55 360,30 L400,25 L400,100 L0,100 Z"
              fill="url(#skeletonLineGrad)"
            />
            <path
              d="M0,65 C60,35 120,80 180,45 C240,15 300,55 360,30 L400,25"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2"
              strokeDasharray="4 3"
              className="opacity-70"
            />
          </svg>
        </div>

        {/* Label Sumbu X */}
        <div className="flex items-center justify-between pt-2 pl-7 pr-2">
          {X_AXIS_DATES.map((d, i) => (
            <Skeleton key={i} width={26} height={10} borderRadius={2} tone="subtle" staggerIndex={i} />
          ))}
        </div>
      </div>
    );
  }

  // Default: variant === "bar"
  return (
    <div
      className={`w-full flex flex-col justify-between ${className}`}
      style={{ minHeight: chartHeight }}
      aria-hidden="true"
    >
      {/* Area Bar dengan Garis Grid Samar */}
      <div className="relative flex-1 w-full flex items-end justify-between gap-1.5 sm:gap-2.5 pb-2 border-b border-[#334155]/40 pl-6 pr-2">
        {/* Background Gridlines & Y-Axis Labels */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none py-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-full flex items-center gap-2">
              <Skeleton width={18} height={8} borderRadius={2} tone="subtle" />
              <div className="flex-1 h-px bg-[#334155]/25 border-b border-dashed border-[#334155]/30" />
            </div>
          ))}
        </div>

        {/* Batang-batang Vertikal dengan Animasi ScaleY Berurutan */}
        {DETERMINISTIC_BAR_HEIGHTS.map((h, idx) => (
          <div
            key={idx}
            className="flex-1 flex flex-col justify-end items-center h-full z-10"
          >
            <div
              className="w-full flex justify-center animate-skeleton-bar-scale origin-bottom"
              style={{
                height: `${h}%`,
                animationDelay: `${-((idx % 12) * 120)}ms`,
              }}
            >
              <Skeleton
                width="82%"
                height="100%"
                borderRadius="4px 4px 0 0"
                tone={idx % 3 === 0 ? "card" : idx % 3 === 1 ? "panel" : "subtle"}
                staggerIndex={idx}
                pulse={false}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Optional Legend */}
      {hasLegend && (
        <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Skeleton width={10} height={10} borderRadius={3} tone={i % 2 === 0 ? "accent" : "card"} staggerIndex={i} />
              <Skeleton width={48} height={10} borderRadius={3} tone="subtle" staggerIndex={i} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
