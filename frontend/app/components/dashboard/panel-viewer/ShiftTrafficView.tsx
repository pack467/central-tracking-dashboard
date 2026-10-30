"use client";

import { useMemo } from "react";
import { Sun, Sunset, Moon } from "lucide-react";
import { useContainerDimensions } from "@/app/hooks/useContainerDimensions";
import { ChartTooltip, TooltipHeader, TooltipRow, useChartHover } from "./chart-tooltip";
import { GranularityTag } from "./GranularityTag";
import { shiftDefinitions } from "@/app/lib/shifts";
import { axisLabelStride, bucketAxisLabel, bucketKeyOf, bucketRanges, bucketTitle, chooseGranularity, maxPointsFor, showAxisLabel, type VolumeGranularity } from "@/app/lib/volume-buckets";

/** "08:00–16:30": the hours of each shift as the rest of the app defines them. */
const shiftHours = {
  pagi: shiftDefinitions.pagi.period.replace(" WIB", "").replace(/\s/g, ""),
  malam: shiftDefinitions.malam.period.replace(" WIB", "").replace(/\s/g, ""),
  subuh: shiftDefinitions.subuh.period.replace(" WIB", "").replace(/\s/g, ""),
};

interface MultiLinePoint {
  date: string;
  subuh: number;
  pagi: number;
  malam: number;
  total: number;
}

interface ShiftTrafficData {
  shiftTotals: Record<string, number>;
  grandTotal: number;
  peakShift: { name: string; id: string };
  dateList?: string[];
  matrix?: Record<string, Record<string, number>>;
  multiLineSeries?: MultiLinePoint[];
}

interface ShiftTrafficViewProps {
  shiftTrafficData: ShiftTrafficData;
  activeLineFilter: "all" | "Pagi" | "Malam" | "Subuh";
  onLineFilterChange: (filter: "all" | "Pagi" | "Malam" | "Subuh") => void;
  mode: "chart" | "table";
}

export function ShiftTrafficView({
  shiftTrafficData,
  activeLineFilter,
  onLineFilterChange,
  mode,
}: ShiftTrafficViewProps) {
  const [containerRef, dimensions] = useContainerDimensions<HTMLDivElement>();

  const { shiftTotals, grandTotal, peakShift } = shiftTrafficData;

  const multiLineSeries: MultiLinePoint[] = useMemo(() => {
    if (shiftTrafficData.multiLineSeries && shiftTrafficData.multiLineSeries.length > 0) {
      return shiftTrafficData.multiLineSeries;
    }
    const dates = shiftTrafficData.dateList || [];
    const mat = shiftTrafficData.matrix || { Subuh: {}, Pagi: {}, Malam: {} };
    return dates.map((d) => {
      const subuh = mat.Subuh?.[d] || 0;
      const pagi = mat.Pagi?.[d] || 0;
      const malam = mat.Malam?.[d] || 0;
      return {
        date: d,
        subuh,
        pagi,
        malam,
        total: subuh + pagi + malam,
      };
    });
  }, [shiftTrafficData]);

  const pagiTotal = shiftTotals["Pagi"] || 0;
  const malamTotal = shiftTotals["Malam"] || 0;
  const subuhTotal = shiftTotals["Subuh"] || 0;
  const grand = grandTotal || 1;

  const pagiPct = Math.round((pagiTotal / grand) * 100);
  const malamPct = Math.round((malamTotal / grand) * 100);
  const subuhPct = Math.round((subuhTotal / grand) * 100);

  // Dynamic geometry (ResizeObserver, zero letterbox)
  const width = Math.max(dimensions.width || 800, 640);
  const height = Math.max(dimensions.height || 420, 320);

  const marginLeft = 48;
  const marginRight = 24;
  const marginTop = 28;
  const marginBottom = 34;

  const plotWidth = width - marginLeft - marginRight;
  const plotHeight = height - marginTop - marginBottom;

  const baselineY = height - marginBottom;

  // One point per day while each gets 28 px; longer ranges are summed per week or month (lib/volume-buckets.ts). The table stays per day.
  const firstDate = multiLineSeries[0]?.date ?? "";
  const lastDate = multiLineSeries[multiLineSeries.length - 1]?.date ?? "";
  const datesAreDays = /^\d{4}-\d{2}-\d{2}$/.test(firstDate) && /^\d{4}-\d{2}-\d{2}$/.test(lastDate);
  const granularity: VolumeGranularity = datesAreDays ? chooseGranularity(firstDate, lastDate, maxPointsFor(plotWidth, 28)) ?? "month" : "day";
  const chartSeries = useMemo(() => {
    if (!datesAreDays || granularity === "day") return multiLineSeries.map((item) => ({ ...item, to: item.date }));
    const buckets = bucketRanges(firstDate, lastDate, granularity).map((range) => ({ ...range, subuh: 0, pagi: 0, malam: 0, total: 0 }));
    const byKey = new Map(buckets.map((bucket) => [bucket.date, bucket]));
    for (const day of multiLineSeries) {
      const bucket = byKey.get(bucketKeyOf(day.date, granularity, firstDate));
      if (!bucket) continue;
      bucket.subuh += day.subuh; bucket.pagi += day.pagi; bucket.malam += day.malam; bucket.total += day.total;
    }
    return buckets;
  }, [multiLineSeries, datesAreDays, granularity, firstDate, lastDate]);
  const rangeDays = datesAreDays ? bucketRanges(firstDate, lastDate, "day").length : multiLineSeries.length;
  const n = chartSeries.length;

  const maxVal = useMemo(() => {
    let max = 0;
    for (const p of chartSeries) {
      if (activeLineFilter === "all") max = Math.max(max, p.subuh, p.pagi, p.malam);
      else if (activeLineFilter === "Pagi") max = Math.max(max, p.pagi);
      else if (activeLineFilter === "Malam") max = Math.max(max, p.malam);
      else if (activeLineFilter === "Subuh") max = Math.max(max, p.subuh);
    }
    return Math.max(max, 4);
  }, [chartSeries, activeLineFilter]);

  const stepVal = Math.max(1, Math.ceil(maxVal / 4));
  const yMax = stepVal * 4;
  const yTicks = [0, stepVal, stepVal * 2, stepVal * 3, yMax];

  const stepX = n > 1 ? plotWidth / (n - 1) : plotWidth / 2;
  const labelStride = axisLabelStride(stepX, granularity);

  const pointsPagi = useMemo(() => {
    return chartSeries.map((item, idx) => ({
      x: Math.round(marginLeft + (n > 1 ? idx * stepX : plotWidth / 2)),
      y: Math.round(baselineY - (item.pagi / yMax) * plotHeight),
      val: item.pagi,
    }));
  }, [chartSeries, n, stepX, marginLeft, plotWidth, baselineY, yMax, plotHeight]);

  const pointsMalam = useMemo(() => {
    return chartSeries.map((item, idx) => ({
      x: Math.round(marginLeft + (n > 1 ? idx * stepX : plotWidth / 2)),
      y: Math.round(baselineY - (item.malam / yMax) * plotHeight),
      val: item.malam,
    }));
  }, [chartSeries, n, stepX, marginLeft, plotWidth, baselineY, yMax, plotHeight]);

  const pointsSubuh = useMemo(() => {
    return chartSeries.map((item, idx) => ({
      x: Math.round(marginLeft + (n > 1 ? idx * stepX : plotWidth / 2)),
      y: Math.round(baselineY - (item.subuh / yMax) * plotHeight),
      val: item.subuh,
    }));
  }, [chartSeries, n, stepX, marginLeft, plotWidth, baselineY, yMax, plotHeight]);

  const pathPagi = pointsPagi.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const pathMalam = pointsMalam.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const pathSubuh = pointsSubuh.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  const { svg: chartSvg, bindSvg, svgProps, index: hoveredIdx } = useChartHover({ xs: pointsPagi.map((p) => p.x), viewWidth: width, resetKey: `${mode}|${activeLineFilter}|${n}` });
  const hoveredItem = hoveredIdx !== null ? chartSeries[hoveredIdx] ?? null : null;
  const hoveredX = hoveredIdx !== null ? pointsPagi[hoveredIdx]?.x ?? null : null;

  if (multiLineSeries.length === 0 || grandTotal === 0) {
    return (
      <div className="flex items-center justify-center h-80 text-slate-400 text-sm">
        Tidak ada data trafik shift pada filter ini.
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">
      {/* ── 1. Compact 4-Stat Strip (~60px height) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0">
        <div className="h-[60px] px-3.5 py-2 rounded-xl bg-slate-900/70 border border-slate-700/60 flex flex-col justify-center shadow-sm">
          <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-slate-400 flex items-center gap-1.5">
            <Sun size={12} className="text-amber-400" />
            SHIFT PAGI ({shiftHours.pagi})
          </span>
          <div className="text-[20px] font-mono font-bold text-amber-400 tabular-nums leading-tight flex items-baseline gap-1.5">
            {pagiTotal} <span className="text-xs font-normal text-slate-400">tiket ({pagiPct}%)</span>
          </div>
        </div>

        <div className="h-[60px] px-3.5 py-2 rounded-xl bg-slate-900/70 border border-slate-700/60 flex flex-col justify-center shadow-sm">
          <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-slate-400 flex items-center gap-1.5">
            <Sunset size={12} className="text-purple-400" />
            SHIFT MALAM ({shiftHours.malam})
          </span>
          <div className="text-[20px] font-mono font-bold text-purple-400 tabular-nums leading-tight flex items-baseline gap-1.5">
            {malamTotal} <span className="text-xs font-normal text-slate-400">tiket ({malamPct}%)</span>
          </div>
        </div>

        <div className="h-[60px] px-3.5 py-2 rounded-xl bg-slate-900/70 border border-slate-700/60 flex flex-col justify-center shadow-sm">
          <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-slate-400 flex items-center gap-1.5">
            <Moon size={12} className="text-sky-400" />
            SHIFT SUBUH ({shiftHours.subuh})
          </span>
          <div className="text-[20px] font-mono font-bold text-sky-400 tabular-nums leading-tight flex items-baseline gap-1.5">
            {subuhTotal} <span className="text-xs font-normal text-slate-400">tiket ({subuhPct}%)</span>
          </div>
        </div>

        <div className="h-[60px] px-3.5 py-2 rounded-xl bg-slate-900/70 border border-slate-700/60 flex flex-col justify-center shadow-sm">
          <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-slate-400">
            SHIFT TERTINGGI
          </span>
          <div className="text-[20px] font-mono font-bold text-white tabular-nums leading-tight truncate">
            {peakShift.name}
          </div>
        </div>
      </div>

      {/* ── 2. Filter & Legend Controls ── */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-1 text-xs shrink-0">
        <div className="flex items-center gap-1.5">
          {(["all", "Pagi", "Malam", "Subuh"] as const).map((filter) => {
            const isActive = activeLineFilter === filter;
            const label = filter === "all" ? "Semua Shift" : `Shift ${filter}`;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => onLineFilterChange(filter)}
                className={`px-3 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                  isActive
                    ? "bg-sky-500 text-slate-950 font-bold border-sky-400 shadow-sm"
                    : "bg-slate-800/60 border-slate-700/80 text-slate-400 hover:text-slate-200"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4 flex-wrap text-xs font-mono">
          {datesAreDays && <span className="hidden sm:inline-flex"><GranularityTag granularity={granularity} days={rangeDays} /></span>}
          {(activeLineFilter === "all" || activeLineFilter === "Pagi") && (
            <span className="inline-flex items-center gap-1.5 text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              Pagi: <b>{pagiTotal} ({pagiPct}%)</b>
            </span>
          )}
          {(activeLineFilter === "all" || activeLineFilter === "Malam") && (
            <span className="inline-flex items-center gap-1.5 text-purple-400">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
              Malam: <b>{malamTotal} ({malamPct}%)</b>
            </span>
          )}
          {(activeLineFilter === "all" || activeLineFilter === "Subuh") && (
            <span className="inline-flex items-center gap-1.5 text-sky-400">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              Subuh: <b>{subuhTotal} ({subuhPct}%)</b>
            </span>
          )}
        </div>
      </div>

      {/* ── 3. Main Display: Chart or Table ── */}
      {mode === "table" ? (
        /* Table View: Fits content without dead empty band */
        <div className="h-auto max-h-[calc(100vh-220px)] bg-slate-900/40 rounded-xl border border-slate-700/60 overflow-hidden flex flex-col">
          <div className="overflow-x-auto overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900/95 sticky top-0 border-b border-slate-700 font-mono text-slate-300 z-10">
                <tr className="h-10">
                  <th className="py-2.5 px-4 font-semibold sticky left-0 bg-slate-900/95">Tanggal</th>
                  <th className="py-2.5 px-4 text-right font-semibold text-amber-400">Shift Pagi</th>
                  <th className="py-2.5 px-4 text-right font-semibold text-purple-400">Shift Malam</th>
                  <th className="py-2.5 px-4 text-right font-semibold text-sky-400">Shift Subuh</th>
                  <th className="py-2.5 px-4 text-right font-semibold text-white">Total Harian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {multiLineSeries.map((row) => (
                  <tr key={row.date} className="h-11 hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-slate-200 sticky left-0 bg-slate-900/90 whitespace-nowrap">
                      {row.date}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-amber-300 font-medium">
                      {row.pagi}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-purple-300 font-medium">
                      {row.malam}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-sky-300 font-medium">
                      {row.subuh}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums font-bold text-white">
                      {row.total}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-900/95 sticky bottom-0 border-t-2 border-slate-700 font-mono font-bold text-slate-100">
                <tr className="h-11">
                  <td className="py-2.5 px-4 sticky left-0 bg-slate-900/95">Total Keseluruhan</td>
                  <td className="py-2.5 px-4 text-right tabular-nums text-amber-400">{pagiTotal}</td>
                  <td className="py-2.5 px-4 text-right tabular-nums text-purple-400">{malamTotal}</td>
                  <td className="py-2.5 px-4 text-right tabular-nums text-sky-400">{subuhTotal}</td>
                  <td className="py-2.5 px-4 text-right tabular-nums text-white">{grandTotal}</td>
                </tr>
              </tfoot>
            </table>
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
            aria-label={`Grafik tren trafik beban per shift, total beban ${grandTotal} tiket`}
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

            {/* Lines */}
            {(activeLineFilter === "all" || activeLineFilter === "Subuh") && (
              <path
                d={pathSubuh}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {(activeLineFilter === "all" || activeLineFilter === "Malam") && (
              <path
                d={pathMalam}
                fill="none"
                stroke="#c084fc"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {(activeLineFilter === "all" || activeLineFilter === "Pagi") && (
              <path
                d={pathPagi}
                fill="none"
                stroke="#fbbf24"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Points & Value labels */}
            {chartSeries.map((item, idx) => {
              const showValLabel = n <= 16;
              const xPos = pointsPagi[idx].x;
              const isHovered = hoveredIdx === idx;

              return (
                <g key={`shift-points-${idx}`}>
                  {(activeLineFilter === "all" || activeLineFilter === "Subuh") && (
                    <circle
                      cx={xPos}
                      cy={pointsSubuh[idx].y}
                      r={isHovered ? 5 : 3.5}
                      fill="#38bdf8"
                      stroke="#0f172a"
                      strokeWidth="1.5"
                    />
                  )}

                  {(activeLineFilter === "all" || activeLineFilter === "Malam") && (
                    <circle
                      cx={xPos}
                      cy={pointsMalam[idx].y}
                      r={isHovered ? 5 : 3.5}
                      fill="#c084fc"
                      stroke="#0f172a"
                      strokeWidth="1.5"
                    />
                  )}

                  {(activeLineFilter === "all" || activeLineFilter === "Pagi") && (
                    <circle
                      cx={xPos}
                      cy={pointsPagi[idx].y}
                      r={isHovered ? 5 : 3.5}
                      fill="#fbbf24"
                      stroke="#0f172a"
                      strokeWidth="1.5"
                    />
                  )}

                  {/* Value labels if filtered to a single shift */}
                  {showValLabel && activeLineFilter === "Pagi" && item.pagi > 0 && (
                    <text
                      x={xPos}
                      y={pointsPagi[idx].y - 8}
                      textAnchor="middle"
                      fill="#fbbf24"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {item.pagi}
                    </text>
                  )}
                  {showValLabel && activeLineFilter === "Malam" && item.malam > 0 && (
                    <text
                      x={xPos}
                      y={pointsMalam[idx].y - 8}
                      textAnchor="middle"
                      fill="#c084fc"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {item.malam}
                    </text>
                  )}
                  {showValLabel && activeLineFilter === "Subuh" && item.subuh > 0 && (
                    <text
                      x={xPos}
                      y={pointsSubuh[idx].y - 8}
                      textAnchor="middle"
                      fill="#38bdf8"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {item.subuh}
                    </text>
                  )}
                </g>
              );
            })}

            {/* X-axis Ticks & Dates */}
            {pointsPagi.map((p, idx) => {
              if (!showAxisLabel(idx, n, labelStride)) return null;
              const item = chartSeries[idx];
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
                  <text
                    x={Math.min(width - marginRight - 4, Math.max(marginLeft + 16, p.x))}
                    y={baselineY + 18}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="11.5"
                    fontFamily="monospace"
                    fontWeight="500"
                  >
                    {datesAreDays ? bucketAxisLabel(item, granularity) : item.date}
                  </text>
                </g>
              );
            })}

            {/* Vertical Crosshair Line */}
            {hoveredX !== null && (
              <line
                x1={hoveredX}
                y1={marginTop}
                x2={hoveredX}
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
          {hoveredItem && hoveredX !== null && (
            <ChartTooltip key={hoveredIdx} svg={chartSvg} anchorX={hoveredX} half={6} plotTop={marginTop} viewWidth={width} viewHeight={height}>
              <TooltipHeader title={datesAreDays ? bucketTitle(hoveredItem, granularity) : hoveredItem.date} value={`Total ${hoveredItem.total}`} />
              <TooltipRow tone="text-amber-300" valueClass="text-amber-300" marker={<Sun size={12} aria-hidden="true" />} label="Shift Pagi" value={`${hoveredItem.pagi} tiket`} />
              <TooltipRow tone="text-purple-300" valueClass="text-purple-300" marker={<Sunset size={12} aria-hidden="true" />} label="Shift Malam" value={`${hoveredItem.malam} tiket`} />
              <TooltipRow tone="text-sky-300" valueClass="text-sky-300" marker={<Moon size={12} aria-hidden="true" />} label="Shift Subuh" value={`${hoveredItem.subuh} tiket`} />
            </ChartTooltip>
          )}
        </div>
      )}
    </div>
  );
}
