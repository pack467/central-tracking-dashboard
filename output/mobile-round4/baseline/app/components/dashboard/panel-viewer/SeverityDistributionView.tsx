"use client";

import React, { useState } from "react";
import type { TicketSeverity } from "@/app/lib/types";

interface SeverityCounts {
  Critical: number;
  High: number;
  Medium: number;
  Low: number;
}

interface SeverityDistributionViewProps {
  priorityCounts: SeverityCounts;
  total: number;
  priorityColors: Record<TicketSeverity, string>;
  severityStyles: Record<
    TicketSeverity,
    { borderLeft: string; dot: string; bar: string }
  >;
  renderDonutSlices: (
    slices: { label: string; count: number; color: string }[],
    cx: number,
    cy: number,
    r: number,
    strokeWidth: number,
    gapAngle?: number
  ) => React.ReactNode;
}

export function SeverityDistributionView({
  priorityCounts,
  total,
  priorityColors,
  severityStyles,
  renderDonutSlices,
}: SeverityDistributionViewProps) {
  const [hoveredSeverity, setHoveredSeverity] = useState<TicketSeverity | null>(null);

  const severities: TicketSeverity[] = ["Critical", "High", "Medium", "Low"];
  const critHighCount = priorityCounts.Critical + priorityCounts.High;
  const critHighPct = total > 0 ? Math.round((critHighCount / total) * 100) : 0;

  const donutSlices = severities.map((key) => ({
    label: key,
    count: priorityCounts[key],
    color: priorityColors[key],
  }));

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">
      {/* ── 1. Compact 4-Stat Strip (~60px height) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0">
        <div className="h-[60px] px-3.5 py-2 rounded-xl bg-slate-900/70 border border-slate-700/60 flex flex-col justify-center shadow-sm">
          <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-rose-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> CRITICAL
          </span>
          <div className="text-[20px] font-mono font-bold text-rose-400 tabular-nums leading-tight flex items-baseline gap-1.5">
            {priorityCounts.Critical}{" "}
            <span className="text-xs font-normal text-slate-400 font-mono">
              ({total > 0 ? Math.round((priorityCounts.Critical / total) * 100) : 0}%)
            </span>
          </div>
        </div>

        <div className="h-[60px] px-3.5 py-2 rounded-xl bg-slate-900/70 border border-slate-700/60 flex flex-col justify-center shadow-sm">
          <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-orange-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500" /> HIGH
          </span>
          <div className="text-[20px] font-mono font-bold text-orange-400 tabular-nums leading-tight flex items-baseline gap-1.5">
            {priorityCounts.High}{" "}
            <span className="text-xs font-normal text-slate-400 font-mono">
              ({total > 0 ? Math.round((priorityCounts.High / total) * 100) : 0}%)
            </span>
          </div>
        </div>

        <div className="h-[60px] px-3.5 py-2 rounded-xl bg-slate-900/70 border border-slate-700/60 flex flex-col justify-center shadow-sm">
          <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-amber-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> MEDIUM
          </span>
          <div className="text-[20px] font-mono font-bold text-amber-400 tabular-nums leading-tight flex items-baseline gap-1.5">
            {priorityCounts.Medium}{" "}
            <span className="text-xs font-normal text-slate-400 font-mono">
              ({total > 0 ? Math.round((priorityCounts.Medium / total) * 100) : 0}%)
            </span>
          </div>
        </div>

        <div className="h-[60px] px-3.5 py-2 rounded-xl bg-slate-900/70 border border-slate-700/60 flex flex-col justify-center shadow-sm">
          <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-teal-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-400" /> LOW
          </span>
          <div className="text-[20px] font-mono font-bold text-teal-400 tabular-nums leading-tight flex items-baseline gap-1.5">
            {priorityCounts.Low}{" "}
            <span className="text-xs font-normal text-slate-400 font-mono">
              ({total > 0 ? Math.round((priorityCounts.Low / total) * 100) : 0}%)
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. Main Content: Donut + 2x2 Cards & Table ── */}
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
                {critHighCount}
              </span>
              <span className="text-[11px] font-bold font-mono uppercase tracking-[0.15em] text-slate-400 mt-2">
                CRIT / HIGH ({critHighPct}%)
              </span>
              {hoveredSeverity && (
                <span className="text-[11.5px] font-semibold text-sky-400 mt-1 font-mono">
                  {hoveredSeverity}: {priorityCounts[hoveredSeverity]}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 2x2 Severity Cards & Breakdown Table */}
        <div className="flex-1 w-full max-w-3xl flex flex-col gap-4 min-h-0 justify-center">
          {/* 2x2 Cards */}
          <div className="grid grid-cols-2 gap-2.5">
            {severities.map((key) => {
              const count = priorityCounts[key];
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              const style = severityStyles[key];
              const isHovered = hoveredSeverity === key;

              return (
                <div
                  key={key}
                  onMouseEnter={() => setHoveredSeverity(key)}
                  onMouseLeave={() => setHoveredSeverity(null)}
                  className={`p-3 rounded-xl bg-slate-900/70 border border-slate-700/60 border-l-[4px] ${
                    style.borderLeft
                  } flex flex-col justify-between gap-1.5 transition-all cursor-pointer ${
                    isHovered ? "bg-slate-800/90 ring-1 ring-sky-400/50 shadow-lg" : "hover:bg-slate-850/60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                      <strong className="text-xs font-bold text-slate-100">{key}</strong>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">{pct}% share</span>
                  </div>

                  <div className="text-2xl font-extrabold font-mono text-white tabular-nums">
                    {count}
                  </div>

                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Breakdown Table */}
          <div className="bg-slate-900/60 rounded-xl border border-slate-700/60 p-3">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead className="border-b border-slate-700 text-slate-400">
                <tr className="h-7">
                  <th className="py-1 px-3 font-semibold">Tingkat Keparahan</th>
                  <th className="py-1 px-3 text-right font-semibold">Jumlah Tiket</th>
                  <th className="py-1 px-3 text-right font-semibold">Proporsi Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {severities.map((key) => {
                  const count = priorityCounts[key];
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  const style = severityStyles[key];
                  return (
                    <tr
                      key={key}
                      onMouseEnter={() => setHoveredSeverity(key)}
                      onMouseLeave={() => setHoveredSeverity(null)}
                      className={`h-8 hover:bg-slate-800/40 transition-colors ${
                        hoveredSeverity === key ? "bg-sky-500/10" : ""
                      }`}
                    >
                      <td className="py-1 px-3 font-medium text-slate-200">
                        <span className="inline-flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                          {key}
                        </span>
                      </td>
                      <td className="py-1 px-3 text-right tabular-nums font-bold text-white">{count}</td>
                      <td className="py-1 px-3 text-right tabular-nums text-slate-300">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-slate-700 font-bold text-white">
                <tr className="h-8">
                  <td className="py-1 px-3">Total Keseluruhan</td>
                  <td className="py-1 px-3 text-right tabular-nums text-sky-400">{total}</td>
                  <td className="py-1 px-3 text-right tabular-nums">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
