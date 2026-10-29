"use client";

import React from "react";
import { Skeleton } from "./Skeleton";

export interface SkeletonColumnDef {
  width?: string | number;
  label?: string;
  type?: "id" | "text" | "badge" | "avatar" | "pill" | "actions" | "date";
}

export interface SkeletonTableProps {
  rows?: number;
  columns?: number | SkeletonColumnDef[];
  hasToolbar?: boolean;
  hasHeader?: boolean;
  hasPagination?: boolean;
  rowHeight?: number;
  className?: string;
}

const DETERMINISTIC_TEXT_WIDTHS = ["82%", "68%", "88%", "72%", "80%", "64%", "76%", "84%"];

/**
 * Primitif Reusable: SkeletonTable
 *
 * Mendukung jumlah baris dan kolom dinamis, layout toolbar pencarian/filter,
 * header tabel, dan footer paginasi yang selaras dengan TicketTable, RosterTable, dan ShiftLogTable.
 */
export function SkeletonTable({
  rows = 8,
  columns = 6,
  hasToolbar = false,
  hasHeader = true,
  hasPagination = true,
  rowHeight = 48,
  className = "",
}: SkeletonTableProps) {
  const columnDefs: SkeletonColumnDef[] = Array.isArray(columns)
    ? columns
    : Array.from({ length: columns }).map((_, i) => ({
        width: i === 0 ? "12%" : i === 1 ? "32%" : i === 2 ? "16%" : i === 3 ? "16%" : "12%",
        type: i === 0 ? "id" : i === 1 ? "text" : i === 2 ? "badge" : i === 3 ? "avatar" : "pill",
      }));

  return (
    <div
      className={`relative w-full rounded-xl border border-[#334155] bg-[#1e293b] overflow-hidden flex flex-col ${className}`}
      aria-hidden="true"
    >
      {/* Garis Progres Tipis 2px Indeterminate di Tepi Atas Panel */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden z-20 pointer-events-none rounded-t-xl bg-slate-800/40"
        aria-hidden="true"
      >
        <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-sky-400 to-transparent animate-skeleton-bar-indeterminate" />
      </div>

      {/* Optional Toolbar */}
      {hasToolbar && (
        <div className="p-3.5 border-b border-[#334155] flex flex-wrap items-center justify-between gap-3 bg-[#1e293b]">
          <Skeleton height={36} width={260} borderRadius={8} tone="card" />
          <div className="flex items-center gap-2">
            <Skeleton height={36} width={110} borderRadius={8} tone="subtle" />
            <Skeleton height={36} width={110} borderRadius={8} tone="subtle" />
          </div>
        </div>
      )}

      {/* Table Header */}
      {hasHeader && (
        <div className="px-4 py-3 border-b border-[#334155] bg-[#0f172a]/60 flex items-center justify-between gap-4">
          {columnDefs.map((col, idx) => (
            <div
              key={idx}
              style={{ width: col.width }}
              className="shrink-0 flex items-center text-xs font-semibold text-slate-400"
            >
              {col.label ? (
                <span>{col.label}</span>
              ) : (
                <Skeleton height={12} width="55%" borderRadius={3} tone="card" staggerIndex={idx} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Table Body Rows */}
      <div className="divide-y divide-[#334155]/40 flex-1">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div
            key={rowIdx}
            className="px-4 flex items-center justify-between gap-4 hover:bg-slate-800/20 transition-colors"
            style={{ height: `${rowHeight}px` }}
          >
            {columnDefs.map((col, colIdx) => {
              const type = col.type || (colIdx === 0 ? "id" : colIdx === 1 ? "text" : "badge");
              return (
                <div
                  key={colIdx}
                  style={{ width: col.width }}
                  className="shrink-0 flex items-center gap-2"
                >
                  {type === "id" && (
                    <Skeleton height={12} width={64} borderRadius={3} tone="card" staggerIndex={rowIdx} />
                  )}
                  {type === "text" && (
                    <Skeleton
                      height={12}
                      width={DETERMINISTIC_TEXT_WIDTHS[(rowIdx + colIdx) % DETERMINISTIC_TEXT_WIDTHS.length]}
                      borderRadius={3}
                      tone="panel"
                      staggerIndex={rowIdx + 1}
                    />
                  )}
                  {type === "badge" && (
                    <Skeleton height={18} width={58} borderRadius={99} tone="subtle" staggerIndex={rowIdx + 2} />
                  )}
                  {type === "avatar" && (
                    <div className="flex items-center gap-2">
                      <Skeleton height={22} width={22} borderRadius="50%" tone="card" staggerIndex={rowIdx + 2} />
                      <Skeleton height={11} width={75} borderRadius={3} tone="subtle" staggerIndex={rowIdx + 2} />
                    </div>
                  )}
                  {type === "pill" && (
                    <Skeleton height={18} width={50} borderRadius={99} tone="card" staggerIndex={rowIdx + 3} />
                  )}
                  {type === "date" && (
                    <Skeleton height={11} width={68} borderRadius={3} tone="subtle" staggerIndex={rowIdx + 3} />
                  )}
                  {type === "actions" && (
                    <Skeleton height={24} width={28} borderRadius={6} tone="subtle" staggerIndex={rowIdx + 4} />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Optional Pagination Footer */}
      {hasPagination && (
        <div className="px-4 py-3 border-t border-[#334155] bg-[#1e293b] flex items-center justify-between gap-4">
          <Skeleton height={12} width={150} borderRadius={4} tone="subtle" />
          <div className="flex items-center gap-1">
            <Skeleton height={26} width={48} borderRadius={6} tone="subtle" />
            <Skeleton height={26} width={26} borderRadius={6} tone="card" />
            <Skeleton height={26} width={26} borderRadius={6} tone="subtle" />
            <Skeleton height={26} width={48} borderRadius={6} tone="subtle" />
          </div>
        </div>
      )}
    </div>
  );
}
