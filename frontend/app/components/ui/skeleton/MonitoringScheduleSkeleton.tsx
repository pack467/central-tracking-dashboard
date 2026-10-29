"use client";

import React from "react";
import { Skeleton } from "./Skeleton";
import { SkeletonKpi } from "./SkeletonKpi";

const MONITORING_HOURS = ["00:00", "02:00", "04:00", "06:00", "08:00", "10:00", "12:00", "14:00"];

/**
 * MonitoringScheduleSkeleton:
 * Kerangka halaman Monitoring (3 Stat cards + Matrix Grid Jadwal Monitoring Shift)
 */
export function MonitoringScheduleSkeleton() {
  return (
    <div role="status" aria-busy="true" className="w-full flex flex-col gap-5 py-2">
      <span className="sr-only" aria-live="polite">Memuat jadwal monitoring...</span>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <SkeletonKpi key={i} hasTrend={true} hasSparkline={false} />
        ))}
      </div>

      {/* Schedule Matrix Table */}
      <div className="rounded-xl border border-[#334155] bg-[#1e293b] overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-3.5 border-b border-[#334155] flex flex-wrap items-center justify-between gap-3 bg-[#1e293b]">
          <div className="flex items-center gap-2">
            <Skeleton width={140} height={32} borderRadius={8} tone="card" />
            <Skeleton width={110} height={32} borderRadius={8} tone="subtle" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton width={130} height={32} borderRadius={8} tone="subtle" />
            <Skeleton width={32} height={32} borderRadius={8} tone="card" />
          </div>
        </div>

        {/* Header Hours Row */}
        <div className="px-4 py-3 border-b border-[#334155] bg-[#0f172a]/70 flex items-center justify-between gap-3">
          <Skeleton width="22%" height={14} borderRadius={4} tone="card" />
          {MONITORING_HOURS.map((h, i) => (
            <div key={i} className="flex justify-center w-[44px]">
              <Skeleton width={36} height={12} borderRadius={3} tone="subtle" staggerIndex={i} />
            </div>
          ))}
        </div>

        {/* Monitoring Project Rows */}
        <div className="divide-y divide-[#334155]/40">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-800/15 transition-colors">
              <div className="flex items-center gap-2.5 w-[22%]">
                <Skeleton width={36} height={18} borderRadius={4} tone="card" staggerIndex={i} />
                <Skeleton width={110} height={13} borderRadius={3} staggerIndex={i + 1} />
              </div>
              {MONITORING_HOURS.map((_, j) => (
                <div key={j} className="flex items-center justify-center w-[44px]">
                  <Skeleton
                    width={32}
                    height={26}
                    borderRadius={6}
                    tone={j % 4 === 1 ? "accent" : j % 3 === 0 ? "card" : "subtle"}
                    staggerIndex={i + j}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
