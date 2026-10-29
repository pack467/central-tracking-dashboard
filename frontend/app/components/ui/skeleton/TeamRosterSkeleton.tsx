"use client";

import React from "react";
import { Skeleton } from "./Skeleton";
import { SkeletonKpi } from "./SkeletonKpi";
import { SkeletonTable } from "./SkeletonTable";

/**
 * TeamRosterSkeleton:
 * Kerangka halaman Team Roster (4 Kartu Duty Roster + Filter Bar + Tabel Anggota Tim)
 */
export function TeamRosterSkeleton() {
  return (
    <div role="status" aria-busy="true" className="w-full flex flex-col gap-5 py-2">
      <span className="sr-only" aria-live="polite">Memuat daftar anggota tim...</span>

      {/* 4 Roster Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonKpi key={i} hasTrend={false} hasSparkline={false} />
        ))}
      </div>

      {/* Filter / View Switcher Bar */}
      <div className="p-3.5 rounded-xl border border-[#334155] bg-[#1e293b] flex flex-wrap items-center justify-between gap-3">
        <Skeleton width={240} height={36} borderRadius={8} tone="card" />
        <div className="flex items-center gap-2">
          <Skeleton width={110} height={36} borderRadius={8} tone="subtle" />
          <Skeleton width={110} height={36} borderRadius={8} tone="subtle" />
        </div>
      </div>

      {/* Members Table */}
      <SkeletonTable
        rows={8}
        columns={[
          { width: "26%", label: "NAMA & JABATAN", type: "avatar" },
          { width: "16%", label: "SHIFT AKTIF", type: "badge" },
          { width: "16%", label: "STATUS", type: "pill" },
          { width: "20%", label: "KONTAK PIC", type: "text" },
          { width: "22%", label: "JADWAL MINGGUAN", type: "badge" },
        ]}
        hasHeader={true}
        hasPagination={true}
        rowHeight={56}
      />
    </div>
  );
}
