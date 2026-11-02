"use client";

import React from "react";
import { Skeleton } from "./Skeleton";
import { SkeletonKpi } from "./SkeletonKpi";
import { SkeletonTable } from "./SkeletonTable";

export function MasterDataSkeleton() {
  return (
    <div className="flex flex-col gap-6 w-full animate-pulse" aria-busy="true" aria-label="Memuat master data...">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-4 max-[1024px]:grid-cols-2 max-[640px]:grid-cols-1 gap-3.5">
        <SkeletonKpi />
        <SkeletonKpi />
        <SkeletonKpi />
        <SkeletonKpi />
      </div>

      {/* Tabs Row */}
      <div className="flex items-center gap-2 border-b border-slate-700/60 pb-2">
        <Skeleton width={110} height={36} borderRadius={8} />
        <Skeleton width={110} height={36} borderRadius={8} />
        <Skeleton width={110} height={36} borderRadius={8} />
      </div>

      {/* Toolbar Row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Skeleton width={260} height={38} borderRadius={8} />
        <div className="flex items-center gap-2">
          <Skeleton width={120} height={38} borderRadius={8} />
          <Skeleton width={110} height={38} borderRadius={8} />
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="p-4 rounded-xl border border-slate-700/50 bg-[#1e293b]/70">
        <SkeletonTable rows={6} columns={6} />
      </div>
    </div>
  );
}
