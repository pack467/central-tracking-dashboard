"use client";

import { useMemo } from "react";
import { Sun, Sunset, Moon } from "lucide-react";
import { useContainerDimensions } from "@/app/hooks/useContainerDimensions";
import { ChartTooltip, TooltipHeader, TooltipRow, useChartHover } from "./chart-tooltip";

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
  const n = multiLineSeries.length;
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
    for (const p of multiLineSeries) {
      if (activeLineFilter === "all") max = Math.max(max, p.subuh, p.pagi, p.malam);
      else if (activeLineFilter === "Pagi") max = Math.max(max, p.pagi);
      else if (activeLineFilter === "Malam") max = Math.max(max, p.malam);
      else if (activeLineFilter === "Subuh") max = Math.max(max, p.subuh);
    }
    return Math.max(max, 4);
  }, [multiLineSeries, activeLineFilter]);

  const stepVal = Math.max(1, Math.ceil(maxVal / 4));
  const yMax = stepVal * 4;
  const yTicks = [0, stepVal, stepVal * 2, stepVal * 3, yMax];

  const stepX = n > 1 ? plotWidth / (n - 1) : plotWidth / 2;

  const pointsPagi = useMemo(() => {
    return multiLineSeries.map((item, idx) => ({
      x: Math.round(marginLeft + (n > 1 ? idx * stepX : plotWidth / 2)),
      y: Math.round(baselineY - (item.pagi / yMax) * plotHeight),
      val: item.pagi,
    }));
  }, [multiLineSeries, n, stepX, marginLeft, plotWidth, baselineY, yMax, plotHeight]);

  const pointsMalam = useMemo(() => {
    return multiLineSeries.map((item, idx) => ({
      x: Math.round(marginLeft + (n > 1 ? idx * stepX : plotWidth / 2)),
      y: Math.round(baselineY - (item.malam / yMax) * plotHeight),
      val: item.malam,
    }));
  }, [multiLineSeries, n, stepX, marginLeft, plotWidth, baselineY, yMax, plotHeight]);

  const pointsSubuh = useMemo(() => {
    return multiLineSeries.map((item, idx) => ({
      x: Math.round(marginLeft + (n > 1 ? idx * stepX : plotWidth / 2)),
      y: Math.round(baselineY - (item.subuh / yMax) * plotHeight),
      val: item.subuh,
    }));
  }, [multiLineSeries, n, stepX, marginLeft, plotWidth, baselineY, yMax, plotHeight]);

  const pathPagi = pointsPagi.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const pathMalam = pointsMalam.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const pathSubuh = pointsSubuh.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  const { svg: chartSvg, bindSvg, svgProps, index: hoveredIdx } = useChartHover({ xs: pointsPagi.map((p) => p.x), viewWidth: width, resetKey: `${mode}|${activeLineFilter}|${n}` });
  const hoveredItem = hoveredIdx !== null ? multiLineSeries[hoveredIdx] ?? null : null;
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
            SHIFT PAGI (07:00-15:30)
          </span>
          <div className="text-[20px] font-mono font-bold text-amber-400 tabular-nums leading-tight flex items-baseline gap-1.5">
            {pagiTotal} <span className="text-xs font-normal text-slate-400">tiket ({pagiPct}%)</span>
          </div>
        </div>

        <div className="h-[60px] px-3.5 py-2 rounded-xl bg-slate-900/70 border border-slate-700/60 flex flex-col justify-center shadow-sm">
          <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-slate-400 flex items-center gap-1.5">
            <Sunset size={12} className="text-sky-400" />
            SHIFT MALAM (15:00-23:30)
          </span>
          <div className="text-[20px] font-mono font-bold text-sky-400 tabular-nums leading-tight flex items-baseline gap-1.5">
            {malamTotal} <span className="text-xs font-normal text-slate-400">tiket ({malamPct}%)</span>
          </div>
        </div>

        <div className="h-[60px] px-3.5 py-2 rounded-xl bg-slate-900/70 border border-slate-700/60 flex flex-col justify-center shadow-sm">
          <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-slate-400 flex items-center gap-1.5">
            <Moon size={12} className="text-indigo-400" />
            SHIFT SUBUH (23:00-07:30)
          </span>
          <div className="text-[20px] font-mono font-bold text-indigo-400 tabular-nums leading-tight flex items-baseline gap-1.5">
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

        <div className="flex items-center gap-4 text-xs font-mono">
          {(activeLineFilter === "all" || activeLineFilter === "Pagi") && (
            <span className="inline-flex items-center gap-1.5 text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              Pagi: <b>{pagiTotal} ({pagiPct}%)</b>
            </span>
          )}
          {(activeLineFilter === "all" || activeLineFilter === "Malam") && (
            <span className="inline-flex items-center gap-1.5 text-sky-400">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              Malam: <b>{malamTotal} ({malamPct}%)</b>
            </span>
          )}
          {(activeLineFilter === "all" || activeLineFilter === "Subuh") && (
            <span className="inline-flex items-center gap-1.5 text-indigo-400">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
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
                  <th className="py-2.5 px-4 text-right font-semibold text-sky-400">Shift Malam</th>
                  <th className="py-2.5 px-4 text-right font-semibold text-indigo-400">Shift Subuh</th>
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
                    <td className="py-2.5 px-4 text-right tabular-nums text-sky-300 font-medium">
                      {row.malam}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-indigo-300 font-medium">
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
                  <td className="py-2.5 px-4 text-right tabular-nums text-sky-400">{malamTotal}</td>
                  <td className="py-2.5 px-4 text-right tabular-nums text-indigo-400">{subuhTotal}</td>
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
                stroke="#818cf8"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {(activeLineFilter === "all" || activeLineFilter === "Malam") && (
              <path
                d={pathMalam}
                fill="none"
                stroke="#38bdf8"
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
            {multiLineSeries.map((item, idx) => {
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
                      fill="#818cf8"
                      stroke="#0f172a"
                      strokeWidth="1.5"
                    />
                  )}

                  {(activeLineFilter === "all" || activeLineFilter === "Malam") && (
                    <circle
                      cx={xPos}
                      cy={pointsMalam[idx].y}
                      r={isHovered ? 5 : 3.5}
                      fill="#38bdf8"
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
                      fill="#38bdf8"
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
                      fill="#818cf8"
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
              const showLabel = width >= 600 || idx % 2 === 0 || idx === n - 1;
              const dateParts = multiLineSeries[idx].date.split("-");
              const shortDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}` : multiLineSeries[idx].date;

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
                      {shortDate}
                    </text>
                  )}
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
              <TooltipHeader title={hoveredItem.date} value={`Total ${hoveredItem.total}`} />
              <TooltipRow tone="text-amber-300" valueClass="text-amber-300" marker={<Sun size={12} aria-hidden="true" />} label="Shift Pagi" value={`${hoveredItem.pagi} tiket`} />
              <TooltipRow tone="text-sky-300" valueClass="text-sky-300" marker={<Sunset size={12} aria-hidden="true" />} label="Shift Malam" value={`${hoveredItem.malam} tiket`} />
              <TooltipRow tone="text-indigo-300" valueClass="text-indigo-300" marker={<Moon size={12} aria-hidden="true" />} label="Shift Subuh" value={`${hoveredItem.subuh} tiket`} />
            </ChartTooltip>
          )}
        </div>
      )}
    </div>
  );
}
