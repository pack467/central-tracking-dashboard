"use client";

import React from "react";
import { Skeleton } from "./Skeleton";
import { SkeletonTable } from "./SkeletonTable";

/**
 * ShiftLogSkeleton:
 * Kerangka halaman Shift Log (4 Stat cards + Controls Toolbar + Tabel Handover Records)
 */
export function ShiftLogSkeleton() {
  return (
    <div role="status" aria-busy="true" className="w-full flex flex-col gap-5 py-2">
      <span className="sr-only" aria-live="polite">Memuat catatan shift...</span>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-4 gap-3 w-full max-[960px]:grid-cols-2 max-[520px]:grid-cols-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-[10px_14px] min-h-[58px] bg-[#1e293b] border border-[#334155] rounded-lg"
          >
            <Skeleton width={34} height={34} borderRadius={8} tone="card" staggerIndex={i} />
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <Skeleton width="45%" height={16} borderRadius={3} tone="card" staggerIndex={i} />
              <Skeleton width="75%" height={10} borderRadius={2} tone="subtle" staggerIndex={i} />
            </div>
          </div>
        ))}
      </div>

      {/* Controls Bar */}
      <div className="p-3.5 rounded-xl border border-[#334155] bg-[#1e293b] flex flex-wrap items-center justify-between gap-3">
        <Skeleton width={260} height={36} borderRadius={8} tone="card" />
        <div className="flex items-center gap-2">
          <Skeleton width={120} height={36} borderRadius={8} tone="subtle" />
          <Skeleton width={140} height={36} borderRadius={8} tone="accent" />
        </div>
      </div>

      {/* Handover List Table */}
      <SkeletonTable
        rows={6}
        columns={[
          { width: "18%", label: "TANGGAL & SHIFT", type: "badge" },
          { width: "28%", label: "CATATAN & SUBJEK", type: "text" },
          { width: "18%", label: "PIC PENGIRIM", type: "avatar" },
          { width: "18%", label: "PIC PENERIMA", type: "avatar" },
          { width: "18%", label: "STATUS & AKSI", type: "actions" },
        ]}
        hasHeader={true}
        hasPagination={true}
        rowHeight={56}
      />
    </div>
  );
}
