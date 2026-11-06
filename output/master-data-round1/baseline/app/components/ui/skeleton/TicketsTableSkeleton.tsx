"use client";

import React from "react";
import { Skeleton } from "./Skeleton";
import { SkeletonKpi } from "./SkeletonKpi";
import { SkeletonTable } from "./SkeletonTable";

/**
 * TicketsTableSkeleton:
 * Kerangka halaman Tickets (4 Kartu Status + Bar Filter & Pencarian + Tabel Tiket Lengkap)
 */
export function TicketsTableSkeleton() {
  return (
    <div role="status" aria-busy="true" className="w-full flex flex-col gap-5 py-2">
      <span className="sr-only" aria-live="polite">Memuat daftar tiket...</span>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-4 max-[1140px]:grid-cols-2 max-[640px]:grid-cols-2 gap-[14px]">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonKpi key={i} hasTrend={true} hasSparkline={true} />
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 rounded-xl border border-[#334155] bg-[#1e293b] flex flex-wrap items-center justify-between gap-3">
        <Skeleton width={260} height={36} borderRadius={8} tone="card" />
        <div className="flex items-center gap-2 flex-wrap">
          <Skeleton width={110} height={36} borderRadius={8} tone="subtle" />
          <Skeleton width={110} height={36} borderRadius={8} tone="subtle" />
          <Skeleton width={110} height={36} borderRadius={8} tone="subtle" />
          <Skeleton width={110} height={36} borderRadius={8} tone="subtle" />
        </div>
      </div>

      {/* Table Tiket dengan Kolom Khusus */}
      <SkeletonTable
        rows={8}
        columns={[
          { width: "12%", label: "ID TIKET", type: "id" },
          { width: "30%", label: "JUDUL / SUBJEK", type: "text" },
          { width: "16%", label: "PROJECT", type: "badge" },
          { width: "16%", label: "PIC / OWNER", type: "avatar" },
          { width: "13%", label: "SEVERITY", type: "pill" },
          { width: "13%", label: "STATUS", type: "pill" },
        ]}
        hasHeader={true}
        hasPagination={true}
        rowHeight={52}
      />
    </div>
  );
}
