"use client";

import React, { useState, useMemo } from "react";

interface CategoryDistributionViewProps {
  typeCounts: [string, number][];
  total: number;
  categoryColors: readonly string[];
  renderDonutSlices: (
    slices: { label: string; count: number; color: string }[],
    cx: number,
    cy: number,
    r: number,
    strokeWidth: number,
    gapAngle?: number
  ) => React.ReactNode;
}

export function CategoryDistributionView({
  typeCounts,
  total,
  categoryColors,
  renderDonutSlices,
}: CategoryDistributionViewProps) {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const topCategory = useMemo(() => {
    if (typeCounts.length === 0) return ["-", 0] as const;
    let best = typeCounts[0];
    for (const item of typeCounts) {
      if (item[1] > best[1]) best = item;
    }
    return best;
  }, [typeCounts]);

  const avgPerCat = useMemo(() => {
    return typeCounts.length > 0 ? Math.round(total / typeCounts.length) : 0;
  }, [total, typeCounts]);

  if (typeCounts.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 text-slate-400 text-sm">
        Tidak ada data distribusi kategori untuk filter saat ini.
      </div>
    );
  }

  const donutSlices = typeCounts.map(([type, count], idx) => ({
    label: type,
    count,
    color: categoryColors[idx % categoryColors.length],
  }));

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">
      {/* ── 1. Compact 4-Stat Strip (~60px height) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0">
        <div className="h-[60px] px-3.5 py-2 rounded-xl bg-slate-900/70 border border-slate-700/60 flex flex-col justify-center shadow-sm">
          <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-slate-400">
            TOTAL TIKET
          </span>
          <div className="text-[20px] font-mono font-bold text-white tabular-nums leading-tight">
            {total} <span className="text-xs font-normal text-slate-400">tiket</span>
          </div>
        </div>

        <div className="h-[60px] px-3.5 py-2 rounded-xl bg-slate-900/70 border border-slate-700/60 flex flex-col justify-center shadow-sm">
          <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-slate-400">
            KATEGORI TERBANYAK
          </span>
          <div className="text-[20px] font-mono font-bold text-sky-400 tabular-nums leading-tight truncate">
            {topCategory[0]}{" "}
            <span className="text-xs font-normal text-slate-400 font-mono">({topCategory[1]})</span>
          </div>
        </div>

        <div className="h-[60px] px-3.5 py-2 rounded-xl bg-slate-900/70 border border-slate-700/60 flex flex-col justify-center shadow-sm">
          <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-slate-400">
            JUMLAH KATEGORI
          </span>
          <div className="text-[20px] font-mono font-bold text-emerald-400 tabular-nums leading-tight">
            {typeCounts.length} <span className="text-xs font-normal text-slate-400">tipe</span>
          </div>
        </div>

        <div className="h-[60px] px-3.5 py-2 rounded-xl bg-slate-900/70 border border-slate-700/60 flex flex-col justify-center shadow-sm">
          <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-slate-400">
            RATA-RATA / TIPE
          </span>
          <div className="text-[20px] font-mono font-bold text-amber-400 tabular-nums leading-tight">
            {avgPerCat} <span className="text-xs font-normal text-slate-400">tiket</span>
          </div>
        </div>
      </div>

      {/* ── 2. Main Content: Donut + Detailed Category List ── */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 flex-1 min-h-0 bg-slate-900/40 rounded-xl border border-slate-700/60 p-4 sm:p-6 overflow-hidden">
        {/* Scaled Donut Chart */}
        <div className="flex flex-col items-center justify-center shrink-0 w-full lg:w-auto my-auto">
          <div className="relative w-[240px] h-[240px] sm:w-[300px] sm:h-[300px] shrink-0">
            <svg className="w-full h-full block" viewBox="0 0 200 200">
              {renderDonutSlices(donutSlices, 100, 100, 72, 20, 2)}
            </svg>

            {/* Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
              <span className="text-4xl sm:text-5xl font-black font-mono text-white leading-none tracking-tight tabular-nums">
                {total}
              </span>
              <span className="text-[11px] font-bold font-mono tracking-widest text-slate-400 mt-2 uppercase">
                TOTAL TIKET
              </span>
              {hoveredCategory && (
                <span className="text-[11.5px] font-semibold text-sky-400 mt-1 max-w-[150px] truncate text-center font-mono">
                  {hoveredCategory}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Ranked Category List & Table with Cross-Highlighting */}
        <div className="flex-1 w-full max-w-3xl flex flex-col min-h-0 h-full justify-center">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700/80 text-xs font-mono text-slate-400">
            <span>KATEGORI / TIPE TIKET</span>
            <span>JUMLAH &amp; PROPORSI</span>
          </div>

          <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[calc(100vh-270px)] pr-1">
            {typeCounts.map(([type, count], idx) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              const color = categoryColors[idx % categoryColors.length];
              const isHovered = hoveredCategory === type;

              return (
                <div
                  key={type}
                  onMouseEnter={() => setHoveredCategory(type)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                    isHovered
                      ? "bg-slate-800/80 border-sky-500/50 shadow-md"
                      : "bg-slate-850/50 border-slate-800/80 hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                    <span className="flex items-center gap-2 text-slate-200">
                      <span className="w-2.5 h-2.5 rounded shrink-0" style={{ background: color }} />
                      <span className="font-semibold">{type}</span>
                    </span>
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <b className="text-white text-sm">{count}</b>
                      <span className="text-slate-400">({pct}%)</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
