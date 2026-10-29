"use client";

import React from "react";
import { Skeleton } from "./Skeleton";
import { SkeletonKpi } from "./SkeletonKpi";
import { SkeletonChart } from "./SkeletonChart";
import { SkeletonTable } from "./SkeletonTable";

/**
 * ReportsSkeleton:
 * Kerangka halaman Reports & Laporan Mingguan
 * (Date Filter & Export Bar + 4 Metric Cards + Charts + Pratinjau Dokumen Lembar A4)
 */
export function ReportsSkeleton() {
  return (
    <div role="status" aria-busy="true" className="w-full flex flex-col gap-5 py-2">
      <span className="sr-only" aria-live="polite">Memuat analitik laporan...</span>

      {/* Date Filter & Export Bar */}
      <div className="p-3.5 rounded-xl border border-[#334155] bg-[#1e293b] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Skeleton width={220} height={36} borderRadius={8} tone="card" />
          <Skeleton width={130} height={36} borderRadius={8} tone="subtle" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton width={130} height={36} borderRadius={8} tone="subtle" />
          <Skeleton width={140} height={36} borderRadius={8} tone="accent" />
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonKpi key={i} hasTrend={true} hasSparkline={true} />
        ))}
      </div>

      {/* Chart & Distribution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="p-5 rounded-xl border border-[#334155] bg-[#1e293b] flex flex-col min-h-[320px]">
          <div className="pb-3 border-b border-[#334155]/60 mb-3 flex justify-between items-center">
            <Skeleton width={180} height={16} borderRadius={4} tone="card" />
            <Skeleton width={60} height={20} borderRadius={99} tone="subtle" />
          </div>
          <SkeletonChart variant="bar" height={220} hasLegend={true} />
        </div>
        <div className="p-5 rounded-xl border border-[#334155] bg-[#1e293b] flex flex-col min-h-[320px]">
          <div className="pb-3 border-b border-[#334155]/60 mb-3 flex justify-between items-center">
            <Skeleton width={180} height={16} borderRadius={4} tone="card" />
            <Skeleton width={60} height={20} borderRadius={99} tone="subtle" />
          </div>
          <SkeletonChart variant="donut" height={220} hasLegend={true} />
        </div>
      </div>

      {/* Pratinjau Dokumen Laporan (Frame Lembar Pratinjau) */}
      <div className="p-5 rounded-xl border border-[#334155] bg-[#1e293b] flex flex-col gap-4 min-h-[420px]">
        <div className="flex items-center justify-between pb-3 border-b border-[#334155]/60">
          <div className="flex items-center gap-2">
            <Skeleton width={28} height={28} borderRadius={6} tone="accent" />
            <Skeleton width={200} height={16} borderRadius={4} tone="card" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton width={90} height={28} borderRadius={6} tone="subtle" />
            <Skeleton width={90} height={28} borderRadius={6} tone="subtle" />
          </div>
        </div>

        {/* Tabel Ringkasan Pratinjau */}
        <SkeletonTable
          rows={5}
          columns={[
            { width: "20%", label: "KATEGORI LAPORAN", type: "badge" },
            { width: "35%", label: "DESKRIPSI / TEMUAN", type: "text" },
            { width: "15%", label: "TOTAL TIKET", type: "pill" },
            { width: "15%", label: "SLA COMPLIANCE", type: "badge" },
            { width: "15%", label: "STATUS", type: "pill" },
          ]}
          hasHeader={true}
          hasPagination={false}
          rowHeight={46}
        />
      </div>
    </div>
  );
}
