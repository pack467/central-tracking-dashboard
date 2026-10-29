import React from "react";
import { Skeleton } from "./Skeleton";

export interface SkeletonTextProps {
  lines?: number;
  lastLineWidth?: string | number;
  height?: number | string;
  gap?: number;
  width?: string | number;
  className?: string;
}

/**
 * Primitif Reusable: SkeletonText
 *
 * Menghasilkan blok teks berskeleton multi-baris atau baris tunggal
 * dengan proporsi realistis (baris terakhir lebih pendek).
 */
export function SkeletonText({
  lines = 1,
  lastLineWidth = "65%",
  height = 14,
  gap = 8,
  width = "100%",
  className = "",
}: SkeletonTextProps) {
  if (lines <= 1) {
    return (
      <Skeleton
        width={width}
        height={height}
        borderRadius={4}
        className={className}
      />
    );
  }

  return (
    <div
      className={`flex flex-col ${className}`}
      style={{ gap: `${gap}px` }}
      aria-hidden="true"
    >
      {Array.from({ length: lines }).map((_, index) => {
        const isLast = index === lines - 1;
        const lineWidth = isLast ? lastLineWidth : width;
        return (
          <Skeleton
            key={index}
            width={lineWidth}
            height={height}
            borderRadius={4}
          />
        );
      })}
    </div>
  );
}
