import React from "react";
import { Skeleton } from "./Skeleton";

export interface SkeletonKpiProps {
  hasTrend?: boolean;
  hasSparkline?: boolean;
  className?: string;
}

/**
 * Primitif Reusable: SkeletonKpi
 *
 * Selaras dengan StatCard & kartu metrik di atas grafik velocity / traffic:
 * - Label / Title
 * - Nilai Angka Besar (KPI)
 * - Badge Tren persentase
 * - Mini Sparkline bar/graph
 */
export function SkeletonKpi({
  hasTrend = true,
  hasSparkline = true,
  className = "",
}: SkeletonKpiProps) {
  return (
    <div
      className={`p-4 rounded-xl border border-[#334155] bg-[#1e293b] flex flex-col justify-between min-h-[108px] ${className}`}
      aria-hidden="true"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <Skeleton height={13} width="55%" borderRadius={4} />
        {hasTrend && <Skeleton height={20} width={45} borderRadius={12} />}
      </div>

      <div className="flex items-end justify-between gap-3 mt-1">
        <Skeleton height={28} width="40%" borderRadius={6} />
        {hasSparkline && (
          <div className="flex items-end gap-1 h-7">
            {[40, 60, 30, 90, 70].map((h, i) => (
              <Skeleton
                key={i}
                width={6}
                height={`${h}%`}
                borderRadius={2}
                tone="card"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
