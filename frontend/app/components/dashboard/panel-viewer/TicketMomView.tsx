"use client";

import { useState, useMemo } from "react";
import { TrendingUp, Layers } from "lucide-react";
import { useContainerDimensions } from "@/app/hooks/useContainerDimensions";
import { ChartTooltip, TooltipHeader, TooltipRow, useChartHover } from "./chart-tooltip";

interface RawTrajectoryPoint {
  index?: number;
  label?: string;
  currDate?: string;
  currFormatted?: string;
  currCount?: number;
  currResolved?: number;
  currCumulative?: number;
  prevDate?: string;
  prevFormatted?: string;
  prevCount?: number;
  prevResolved?: number;
  prevCumulative?: number;
  delta?: number;
}

interface RawProjectRow {
  project?: string;
  currCount?: number;
  prevCount?: number;
  currResolved?: number;
  prevResolved?: number;
  delta?: number;
}

interface TrajectoryPoint {
  index: number;
  label: string;
  dateLabel: string;
  currDate: string;
  currFormatted: string;
  currCount: number;
  currResolved: number;
  currCumulative: number;
  prevDate: string;
  prevFormatted: string;
  prevCount: number;
  prevResolved: number;
  prevCumulative: number;
  delta: number;
}

interface ProjectRow {
  project: string;
  currCount: number;
  prevCount: number;
  currResolved: number;
  prevResolved: number;
  delta: number;
}

interface MomData {
  prevMonthLabel?: string;
  currMonthLabel?: string;
  prevTotal?: number;
  totalPrev?: number;
  currTotal?: number;
  totalCurr?: number;
  deltaTotal?: number;
  totalDelta?: number;
  trajectoryPoints?: RawTrajectoryPoint[];
  projectComparison?: RawProjectRow[];
}

interface TicketMomViewProps {
  momData: MomData | null | undefined;
  mode: "chart" | "table";
}

export function TicketMomView({ momData, mode }: TicketMomViewProps) {
  const [containerRef, dimensions] = useContainerDimensions<HTMLDivElement>();
  const [subView, setSubView] = useState<"trajectory" | "project">("trajectory");

  const prevMonthLabel = momData?.prevMonthLabel || "Bulan Lalu";
  const currMonthLabel = momData?.currMonthLabel || "Bulan Ini";
  const totalPrev = momData?.prevTotal ?? momData?.totalPrev ?? 0;
  const totalCurr = momData?.currTotal ?? momData?.totalCurr ?? 0;
  const totalDelta = momData?.deltaTotal ?? momData?.totalDelta ?? (totalCurr - totalPrev);

  // Clean growth percentage calculation & formatting
  const totalDeltaPctFormatted = useMemo(() => {
    if (totalPrev > 0) {
      const pct = ((totalDelta / totalPrev) * 100).toFixed(1);
      const sign = totalDelta > 0 ? "+" : "";
      return `${sign}${pct}%`;
    }
    return "-";
  }, [totalDelta, totalPrev]);

  const trajectoryPoints = useMemo<TrajectoryPoint[]>(() => {
    const rawTrajectory = momData?.trajectoryPoints || [];
    return rawTrajectory.map((p, idx) => {
      const currCount = p.currCount || 0;
      const prevCount = p.prevCount || 0;
      const delta = typeof p.delta === "number" ? p.delta : currCount - prevCount;
      const dateLabel = p.currFormatted || p.label || (p.currDate ? p.currDate.slice(5) : `H${idx + 1}`);

      return {
        index: p.index ?? idx,
        label: p.label || `Hari ${idx + 1}`,
        dateLabel,
        currDate: p.currDate || "-",
        currFormatted: p.currFormatted || "-",
        currCount,
        currResolved: p.currResolved || 0,
        currCumulative: p.currCumulative || 0,
        prevDate: p.prevDate || "-",
        prevFormatted: p.prevFormatted || "-",
        prevCount,
        prevResolved: p.prevResolved || 0,
        prevCumulative: p.prevCumulative || 0,
        delta,
      };
    });
  }, [momData?.trajectoryPoints]);

  const projectComparison = useMemo<ProjectRow[]>(() => {
    return (momData?.projectComparison || []).map((p) => {
      const curr = p.currCount || 0;
      const prev = p.prevCount || 0;
      const delta = typeof p.delta === "number" ? p.delta : curr - prev;
      return {
        project: p.project || "-",
        currCount: curr,
        prevCount: prev,
        currResolved: p.currResolved || 0,
        prevResolved: p.prevResolved || 0,
        delta,
      };
    });
  }, [momData]);

  // Chart scaling
  const n = trajectoryPoints.length;
  const width = Math.max(dimensions.width || 800, 640);
  const height = Math.max(dimensions.height || 420, 320);

  const marginLeft = 48;
  const marginRight = 24;
  const marginTop = 28;
  const marginBottom = 34;

  const plotWidth = width - marginLeft - marginRight;
  const plotHeight = height - marginTop - marginBottom;

  const baselineY = height - marginBottom;

  const maxVal = useMemo(() => {
    let max = 0;
    for (const p of trajectoryPoints) {
      if (p.currCount > max) max = p.currCount;
      if (p.prevCount > max) max = p.prevCount;
    }
    return Math.max(max, 4);
  }, [trajectoryPoints]);

  const stepVal = Math.max(1, Math.ceil(maxVal / 4));
  const yMax = stepVal * 4;
  const yTicks = [0, stepVal, stepVal * 2, stepVal * 3, yMax];

  const stepX = n > 1 ? plotWidth / (n - 1) : plotWidth / 2;

  const pointsCurr = useMemo(() => {
    return trajectoryPoints.map((p, idx) => ({
      x: Math.round(marginLeft + (n > 1 ? idx * stepX : plotWidth / 2)),
      y: Math.round(baselineY - (p.currCount / yMax) * plotHeight),
      point: p,
      idx,
    }));
  }, [trajectoryPoints, n, stepX, marginLeft, plotWidth, baselineY, yMax, plotHeight]);

  const pointsPrev = useMemo(() => {
    return trajectoryPoints.map((p, idx) => ({
      x: Math.round(marginLeft + (n > 1 ? idx * stepX : plotWidth / 2)),
      y: Math.round(baselineY - (p.prevCount / yMax) * plotHeight),
      point: p,
      idx,
    }));
  }, [trajectoryPoints, n, stepX, marginLeft, plotWidth, baselineY, yMax, plotHeight]);

  const pathCurr = pointsCurr.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const pathPrev = pointsPrev.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  const { svg: chartSvg, bindSvg, svgProps, index: hoveredPointIdx } = useChartHover({ xs: pointsCurr.map((p) => p.x), viewWidth: width, resetKey: `${mode}|${subView}|${n}` });
  const hoveredItem = hoveredPointIdx !== null ? trajectoryPoints[hoveredPointIdx] ?? null : null;
  const hoveredCurrPoint = hoveredPointIdx !== null ? pointsCurr[hoveredPointIdx] ?? null : null;

  if (trajectoryPoints.length === 0 && projectComparison.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 text-slate-400 text-sm">
        Tidak ada data komparasi Month-over-Month untuk filter saat ini.
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">
      {/* ── 1. Compact 4-Stat Strip (~60px height) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0">
        <div className="h-[60px] px-3.5 py-2 rounded-xl bg-slate-900/70 border border-slate-700/60 flex flex-col justify-center shadow-sm">
          <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-slate-400">
            {prevMonthLabel.toUpperCase()}
          </span>
          <div className="text-[20px] font-mono font-bold text-purple-400 tabular-nums leading-tight">
            {totalPrev} <span className="text-xs font-normal text-slate-400">tiket</span>
          </div>
        </div>

        <div className="h-[60px] px-3.5 py-2 rounded-xl bg-slate-900/70 border border-slate-700/60 flex flex-col justify-center shadow-sm">
          <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-slate-400">
            {currMonthLabel.toUpperCase()}
          </span>
          <div className="text-[20px] font-mono font-bold text-sky-400 tabular-nums leading-tight">
            {totalCurr} <span className="text-xs font-normal text-slate-400">tiket</span>
          </div>
        </div>

        <div className="h-[60px] px-3.5 py-2 rounded-xl bg-slate-900/70 border border-slate-700/60 flex flex-col justify-center shadow-sm">
          <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-slate-400">
            SELISIH TOTAL
          </span>
          <div
            className={`text-[20px] font-mono font-bold tabular-nums leading-tight ${
              totalDelta > 0 ? "text-rose-400" : "text-emerald-400"
            }`}
          >
            {totalDelta > 0 ? `+${totalDelta}` : totalDelta}{" "}
            <span className="text-xs font-normal text-slate-400">tiket</span>
          </div>
        </div>

        <div className="h-[60px] px-3.5 py-2 rounded-xl bg-slate-900/70 border border-slate-700/60 flex flex-col justify-center shadow-sm">
          <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-slate-400">
            PERTUMBUHAN MOM
          </span>
          <div
            className={`text-[20px] font-mono font-bold tabular-nums leading-tight ${
              totalDelta > 0 ? "text-rose-400" : "text-emerald-400"
            }`}
          >
            {totalDeltaPctFormatted}
          </div>
        </div>
      </div>

      {/* ── 2. Controls / Sub-view Bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-1 text-xs shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubView("trajectory")}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
              subView === "trajectory"
                ? "bg-sky-500/15 border-sky-500/40 text-sky-400"
                : "bg-slate-800/60 border-slate-700/80 text-slate-400 hover:text-slate-200"
            }`}
          >
            <TrendingUp size={13} /> Tren Harian
          </button>
          <button
            type="button"
            onClick={() => setSubView("project")}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
              subView === "project"
                ? "bg-sky-500/15 border-sky-500/40 text-sky-400"
                : "bg-slate-800/60 border-slate-700/80 text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers size={13} /> Per Sistem
          </button>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="inline-flex items-center gap-1.5 text-purple-400">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            {prevMonthLabel}: <b>{totalPrev}</b>
          </span>
          <span className="inline-flex items-center gap-1.5 text-sky-400">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
            {currMonthLabel}: <b>{totalCurr}</b>
          </span>
        </div>
      </div>

      {/* ── 3. Main Display: Chart or Table ── */}
      {mode === "table" ? (
        /* Table View: Fits content without dead empty band */
        <div className="h-auto max-h-[calc(100vh-220px)] bg-slate-900/40 rounded-xl border border-slate-700/60 overflow-hidden flex flex-col">
          <div className="overflow-x-auto overflow-y-auto">
            {subView === "trajectory" ? (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900/95 sticky top-0 border-b border-slate-700 font-mono text-slate-300 z-10">
                  <tr className="h-10">
                    <th className="py-2.5 px-4 font-semibold sticky left-0 bg-slate-900/95">Hari (Tanggal)</th>
                    <th className="py-2.5 px-4 font-semibold text-right text-purple-400">{prevMonthLabel}</th>
                    <th className="py-2.5 px-4 font-semibold text-right text-sky-400">{currMonthLabel}</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Selisih</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Pertumbuhan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {trajectoryPoints.map((row) => {
                    const deltaPositive = row.delta > 0;
                    const deltaZero = row.delta === 0;
                    // FIX: Baseline 0 shows "-" instead of misleading "0%" red
                    const growthText =
                      row.prevCount > 0
                        ? `${deltaPositive ? "+" : ""}${Math.round((row.delta / row.prevCount) * 100)}%`
                        : "-";

                    return (
                      <tr key={`mom-row-${row.index}`} className="h-11 hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-slate-200 sticky left-0 bg-slate-900/90 whitespace-nowrap">
                          {row.currDate} <span className="text-slate-500 font-normal">vs {row.prevDate}</span>
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums text-purple-300 font-medium">
                          {row.prevCount}
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums text-sky-300 font-medium">
                          {row.currCount}
                        </td>
                        <td
                          className={`py-2.5 px-4 text-right tabular-nums font-bold ${
                            deltaZero ? "text-slate-500" : deltaPositive ? "text-rose-400" : "text-emerald-400"
                          }`}
                        >
                          {deltaPositive ? `+${row.delta}` : row.delta}
                        </td>
                        <td
                          className={`py-2.5 px-4 text-right tabular-nums font-semibold ${
                            growthText === "-"
                              ? "text-slate-500"
                              : deltaPositive
                              ? "text-rose-400"
                              : "text-emerald-400"
                          }`}
                        >
                          {growthText}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-900/95 sticky bottom-0 border-t-2 border-slate-700 font-mono font-bold text-slate-100">
                  <tr className="h-11">
                    <td className="py-2.5 px-4 sticky left-0 bg-slate-900/95">Total Keseluruhan</td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-purple-400">{totalPrev}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-sky-400">{totalCurr}</td>
                    <td
                      className={`py-2.5 px-4 text-right tabular-nums ${
                        totalDelta > 0 ? "text-rose-400" : "text-emerald-400"
                      }`}
                    >
                      {totalDelta > 0 ? `+${totalDelta}` : totalDelta}
                    </td>
                    <td
                      className={`py-2.5 px-4 text-right tabular-nums ${
                        totalDelta > 0 ? "text-rose-400" : "text-emerald-400"
                      }`}
                    >
                      {totalDeltaPctFormatted}
                    </td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900/95 sticky top-0 border-b border-slate-700 font-mono text-slate-300 z-10">
                  <tr className="h-10">
                    <th className="py-2.5 px-4 font-semibold sticky left-0 bg-slate-900/95">Sistem / Proyek</th>
                    <th className="py-2.5 px-4 font-semibold text-right text-purple-400">{prevMonthLabel}</th>
                    <th className="py-2.5 px-4 font-semibold text-right text-sky-400">{currMonthLabel}</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Selisih</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Pertumbuhan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {projectComparison.map((row) => {
                    const deltaPositive = row.delta > 0;
                    const deltaZero = row.delta === 0;
                    const growthText =
                      row.prevCount > 0
                        ? `${deltaPositive ? "+" : ""}${Math.round((row.delta / row.prevCount) * 100)}%`
                        : "-";

                    return (
                      <tr key={row.project} className="h-11 hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-slate-200 sticky left-0 bg-slate-900/90 whitespace-nowrap">
                          {row.project}
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums text-purple-300">{row.prevCount}</td>
                        <td className="py-2.5 px-4 text-right tabular-nums text-sky-300">{row.currCount}</td>
                        <td
                          className={`py-2.5 px-4 text-right tabular-nums font-bold ${
                            deltaZero ? "text-slate-500" : deltaPositive ? "text-rose-400" : "text-emerald-400"
                          }`}
                        >
                          {deltaPositive ? `+${row.delta}` : row.delta}
                        </td>
                        <td
                          className={`py-2.5 px-4 text-right tabular-nums font-semibold ${
                            growthText === "-"
                              ? "text-slate-500"
                              : deltaPositive
                              ? "text-rose-400"
                              : "text-emerald-400"
                          }`}
                        >
                          {growthText}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-900/95 sticky bottom-0 border-t-2 border-slate-700 font-mono font-bold text-slate-100">
                  <tr className="h-11">
                    <td className="py-2.5 px-4 sticky left-0 bg-slate-900/95">Total Keseluruhan</td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-purple-400">{totalPrev}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-sky-400">{totalCurr}</td>
                    <td
                      className={`py-2.5 px-4 text-right tabular-nums ${
                        totalDelta > 0 ? "text-rose-400" : "text-emerald-400"
                      }`}
                    >
                      {totalDelta > 0 ? `+${totalDelta}` : totalDelta}
                    </td>
                    <td
                      className={`py-2.5 px-4 text-right tabular-nums ${
                        totalDelta > 0 ? "text-rose-400" : "text-emerald-400"
                      }`}
                    >
                      {totalDeltaPctFormatted}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      ) : (
        /* Full-Width Full-Height SVG Plot (>=85% panel coverage) */
        <div
          ref={containerRef}
          className="relative flex-1 min-h-[320px] bg-slate-900/50 rounded-xl border border-slate-700/60 p-2 sm:p-3 overflow-hidden flex flex-col justify-center"
        >
          <svg
            ref={bindSvg}
            className="w-full h-full block cursor-crosshair select-none touch-pan-y"
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={`Grafik komparasi Month-over-Month tiket, ${prevMonthLabel} vs ${currMonthLabel}`}
            {...svgProps}
          >
            {/* Y Axis Unit Label */}
            <text
              x={marginLeft - 8}
              y={marginTop - 10}
              textAnchor="end"
              fill="#64748b"
              fontSize="11"
              fontFamily="monospace"
              fontWeight="600"
            >
              Tiket
            </text>

            {/* Gridlines & Y-ticks */}
            {yTicks.map((tick) => {
              const yPos = baselineY - Math.round((tick / yMax) * plotHeight);
              return (
                <g key={`ytick-${tick}`}>
                  <line
                    x1={marginLeft}
                    y1={yPos}
                    x2={width - marginRight}
                    y2={yPos}
                    stroke="rgba(51, 65, 85, 0.45)"
                    strokeWidth="1"
                    strokeDasharray={tick === 0 ? undefined : "3 4"}
                  />
                  <text
                    x={marginLeft - 10}
                    y={yPos + 4}
                    textAnchor="end"
                    fill="#94a3b8"
                    fontSize="12"
                    fontFamily="monospace"
                    fontWeight="500"
                  >
                    {tick}
                  </text>
                </g>
              );
            })}

            {/* Base line */}
            <line
              x1={marginLeft}
              y1={baselineY}
              x2={width - marginRight}
              y2={baselineY}
              stroke="#334155"
              strokeWidth="1.5"
            />

            {/* Previous Month Line (Dashed Purple) */}
            <path
              d={pathPrev}
              fill="none"
              stroke="#c084fc"
              strokeWidth="2.2"
              strokeDasharray="4 3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Current Month Line (Solid Sky Blue) */}
            <path
              d={pathCurr}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Points Previous Month */}
            {pointsPrev.map((p, idx) => (
              <circle
                key={`p-prev-${idx}`}
                cx={p.x}
                cy={p.y}
                r="3.5"
                fill="#c084fc"
                stroke="#0f172a"
                strokeWidth="1.5"
              />
            ))}

            {/* Points Current Month with Value Labels */}
            {pointsCurr.map((p, idx) => {
              const isHovered = hoveredPointIdx === idx;
              const showValLabel = n <= 16 || isHovered;

              return (
                <g key={`p-curr-${idx}`}>
                  {isHovered && (
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="9"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2"
                      strokeOpacity="0.5"
                    />
                  )}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? 5.5 : 4}
                    fill="#38bdf8"
                    stroke="#0f172a"
                    strokeWidth="1.5"
                  />

                  {/* Value label directly above point */}
                  {showValLabel && p.point.currCount > 0 && (
                    <g transform={`translate(${p.x}, ${p.y - 10})`}>
                      <rect
                        x="-10"
                        y="-9"
                        width="20"
                        height="13"
                        rx="3"
                        fill="#0f172a"
                        fillOpacity="0.85"
                        stroke="#334155"
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="0"
                        textAnchor="middle"
                        fill="#38bdf8"
                        fontSize="10"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {p.point.currCount}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* X-axis Ticks & Dates */}
            {pointsCurr.map((p, idx) => {
              const showLabel = width >= 600 || idx % 2 === 0 || idx === n - 1;
              const labelText = p.point.currDate.length >= 10 ? p.point.currDate.slice(5) : p.point.dateLabel;

              return (
                <g key={`xtick-${idx}`}>
                  <line
                    x1={p.x}
                    y1={baselineY}
                    x2={p.x}
                    y2={baselineY + 4}
                    stroke="#475569"
                    strokeWidth="1"
                  />
                  {showLabel && (
                    <text
                      x={p.x}
                      y={baselineY + 18}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="11.5"
                      fontFamily="monospace"
                      fontWeight="500"
                    >
                      {labelText}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Vertical Crosshair Line */}
            {hoveredCurrPoint && (
              <line
                x1={hoveredCurrPoint.x}
                y1={marginTop}
                x2={hoveredCurrPoint.x}
                y2={baselineY}
                stroke="#38bdf8"
                strokeWidth="1"
                strokeDasharray="3 3"
                strokeOpacity="0.8"
                pointerEvents="none"
              />
            )}
          </svg>

          {/* Floating Tooltip */}
          {hoveredItem && hoveredCurrPoint && (
            <ChartTooltip key={hoveredPointIdx} svg={chartSvg} anchorX={hoveredCurrPoint.x} half={6} plotTop={marginTop} viewWidth={width} viewHeight={height}>
              <TooltipHeader title={hoveredItem.currDate} value={`vs ${hoveredItem.prevDate}`} valueClass="font-normal text-slate-400" />
              <TooltipRow tone="text-purple-300" valueClass="text-purple-300" label={prevMonthLabel} value={`${hoveredItem.prevCount} tiket`} />
              <TooltipRow tone="text-sky-300" valueClass="text-sky-300" label={currMonthLabel} value={`${hoveredItem.currCount} tiket`} />
              <div className="mt-1.5 border-t border-slate-700/70 pt-1.5">
                <TooltipRow
                  tone="text-slate-400"
                  valueClass={hoveredItem.delta > 0 ? "text-rose-400" : "text-emerald-400"}
                  label="Selisih"
                  value={`${hoveredItem.delta > 0 ? `+${hoveredItem.delta}` : hoveredItem.delta} tiket`}
                />
              </div>
            </ChartTooltip>
          )}
        </div>
      )}
    </div>
  );
}
