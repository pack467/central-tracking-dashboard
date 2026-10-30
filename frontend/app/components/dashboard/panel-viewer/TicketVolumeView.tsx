"use client";
import { MasterProjectName } from "@/app/components/ui/MasterProjectName";

import { useState, useMemo } from "react";
import { useContainerDimensions } from "@/app/hooks/useContainerDimensions";
import { ChartTooltip, TooltipHeader, TooltipRow, TooltipSwatch, useChartHover } from "./chart-tooltip";
import { GranularityTag } from "./GranularityTag";
import { axisLabelStride, bucketAxisLabel, bucketRanges, bucketTitle, bucketVolume, chooseGranularity, maxPointsFor, showAxisLabel } from "@/app/lib/volume-buckets";

interface VolumeItem {
  date: string;
  created: number;
  closed: number;
  backlog: number;
  projectCounts: Record<string, number>;
  avgResolution: number;
  resolutionSum?: number;
  resolvedCount?: number;
}

interface TicketVolumeViewProps {
  volumeByDate: VolumeItem[];
  allProjects: string[];
  mode: "chart" | "table";
  projectColors: Record<string, string>;
  selectedDate?: string | null;
  onSelectDate?: (date: string | null) => void;
}

export function TicketVolumeView({
  volumeByDate,
  allProjects,
  mode,
  projectColors,
  selectedDate,
  onSelectDate,
}: TicketVolumeViewProps) {
  const [containerRef, dimensions] = useContainerDimensions<HTMLDivElement>();
  const [hiddenProjects, setHiddenProjects] = useState<Set<string>>(new Set());

  // Toggle project visibility in legend
  const toggleProject = (project: string) => {
    setHiddenProjects((prev) => {
      const next = new Set(prev);
      if (next.has(project)) next.delete(project);
      else next.add(project);
      return next;
    });
  };

  const resetHidden = () => setHiddenProjects(new Set());

  // Filtered active projects
  const activeProjects = useMemo(
    () => allProjects.filter((p) => !hiddenProjects.has(p)),
    [allProjects, hiddenProjects]
  );

  // Compute stats: total, avg, peak, min
  const stats = useMemo(() => {
    if (volumeByDate.length === 0) {
      return { total: 0, avg: 0, peakVal: 0, peakDate: "-", minVal: 0 };
    }
    let total = 0;
    let peakVal = 0;
    let peakDate = volumeByDate[0].date;
    let minVal = Infinity;

    volumeByDate.forEach((v) => {
      let sum = 0;
      for (const p of activeProjects) {
        sum += v.projectCounts[p] || 0;
      }
      total += sum;
      if (sum > peakVal) {
        peakVal = sum;
        peakDate = v.date;
      }
      if (sum < minVal) {
        minVal = sum;
      }
    });

    const avg = Math.round(total / volumeByDate.length);
    if (minVal === Infinity) minVal = 0;

    return { total, avg, peakVal, peakDate, minVal };
  }, [volumeByDate, activeProjects]);

  // Project totals for legend chips
  const projectTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const p of allProjects) totals[p] = 0;
    for (const v of volumeByDate) {
      for (const p of allProjects) {
        totals[p] = (totals[p] || 0) + (v.projectCounts[p] || 0);
      }
    }
    return totals;
  }, [volumeByDate, allProjects]);

  // Dynamic geometry (ResizeObserver, zero letterbox)
  const width = Math.max(dimensions.width || 800, 640);
  const height = Math.max(dimensions.height || 420, 320);

  const marginLeft = 48;
  const marginRight = 20;
  const marginTop = 28;
  const marginBottom = 34;

  const plotWidth = width - marginLeft - marginRight;
  const plotHeight = height - marginTop - marginBottom;

  const baselineY = height - marginBottom;

  // One bar per day while each gets 24 px; longer ranges are summed per week or month (lib/volume-buckets.ts). The table stays per day.
  const firstDate = volumeByDate[0]?.date ?? "";
  const lastDate = volumeByDate[volumeByDate.length - 1]?.date ?? "";
  const granularity = volumeByDate.length ? chooseGranularity(firstDate, lastDate, maxPointsFor(plotWidth, 24)) ?? "month" : "day";
  const series = useMemo(() => bucketVolume(volumeByDate, granularity), [volumeByDate, granularity]);
  const rangeDays = volumeByDate.length ? bucketRanges(firstDate, lastDate, "day").length : 0;

  // Y-axis scaling
  const maxVolume = useMemo(() => {
    let max = 0;
    for (const v of series) {
      let sum = 0;
      for (const p of activeProjects) {
        sum += v.projectCounts[p] || 0;
      }
      if (sum > max) max = sum;
    }
    return Math.max(max, 4);
  }, [series, activeProjects]);

  const yTicks = useMemo(() => {
    const step = Math.max(1, Math.ceil(maxVolume / 4));
    const ceiling = step * 4;
    return [0, step, step * 2, step * 3, ceiling];
  }, [maxVolume]);

  const yMax = yTicks[yTicks.length - 1];

  // Every bar gets an equal slot of the width, so neighbours never touch
  const n = series.length;
  const slot = plotWidth / Math.max(1, n);
  const barWidth = Math.max(4, Math.min(48, Math.round(slot * 0.62)));
  const labelStride = axisLabelStride(slot, granularity);

  // Calculate bars
  const bars = useMemo(() => {
    return series.map((item, idx) => {
      const centerX = Math.round(marginLeft + slot * (idx + 0.5));
      const x = Math.round(centerX - barWidth / 2);

      let currentY = baselineY;
      const segments: { project: string; count: number; y: number; h: number; color: string }[] = [];
      let totalBarVal = 0;

      for (const p of activeProjects) {
        const count = item.projectCounts[p] || 0;
        if (count > 0) {
          totalBarVal += count;
          const h = Math.round((count / yMax) * plotHeight);
          currentY -= h;
          segments.push({
            project: p,
            count,
            y: currentY,
            h,
            color: projectColors[p] || "#38bdf8",
          });
        }
      }

      return {
        item,
        idx,
        centerX,
        x,
        segments,
        totalBarVal,
        topY: currentY,
      };
    });
  }, [series, slot, marginLeft, barWidth, baselineY, activeProjects, yMax, plotHeight, projectColors]);

  const peakBarVal = Math.max(0, ...bars.map((b) => b.totalBarVal));
  const { svg: chartSvg, bindSvg, svgProps, index: hoveredIdx } = useChartHover({ xs: bars.map((b) => b.centerX), viewWidth: width, resetKey: `${mode}|${n}|${granularity}` });
  const hoveredBar = hoveredIdx !== null ? bars[hoveredIdx] ?? null : null;
  // Tallest tooltips list at most 8 rows: the 7 biggest projects and the rest folded into one line.
  const tooltipRows = useMemo(() => {
    if (!hoveredBar) return [];
    const sorted = [...hoveredBar.segments].sort((a, b) => b.count - a.count);
    if (sorted.length <= 8) return sorted;
    const rest = sorted.slice(7);
    return [...sorted.slice(0, 7), { project: `+${rest.length} lainnya`, count: rest.reduce((sum, s) => sum + s.count, 0), color: "#64748b", y: 0, h: 0 }];
  }, [hoveredBar]);

  if (volumeByDate.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 text-slate-400 text-sm">
        Tidak ada data volume tiket untuk filter saat ini.
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">
      {/* ── 1. Compact 4-Stat Strip (~60px height) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0">
        <div className="h-[60px] px-3.5 py-2 rounded-xl bg-slate-900/70 border border-slate-700/60 flex flex-col justify-center shadow-sm">
          <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-slate-400">
            TOTAL TIKET
          </span>
          <div className="text-[20px] font-mono font-bold text-white tabular-nums leading-tight">
            {stats.total} <span className="text-xs font-normal text-slate-400">tiket</span>
          </div>
        </div>

        <div className="h-[60px] px-3.5 py-2 rounded-xl bg-slate-900/70 border border-slate-700/60 flex flex-col justify-center shadow-sm">
          <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-slate-400">
            RATA-RATA HARIAN
          </span>
          <div className="text-[20px] font-mono font-bold text-sky-400 tabular-nums leading-tight">
            {stats.avg} <span className="text-xs font-normal text-slate-400">tiket/hari</span>
          </div>
        </div>

        <div className="h-[60px] px-3.5 py-2 rounded-xl bg-slate-900/70 border border-slate-700/60 flex flex-col justify-center shadow-sm">
          <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-slate-400">
            PUNCAK VOLUME
          </span>
          <div className="text-[20px] font-mono font-bold text-amber-400 tabular-nums leading-tight flex items-baseline gap-1.5 truncate">
            {stats.peakVal}{" "}
            <span className="text-[11px] font-normal text-slate-400 font-mono truncate">
              ({stats.peakDate.slice(5)})
            </span>
          </div>
        </div>

        <div className="h-[60px] px-3.5 py-2 rounded-xl bg-slate-900/70 border border-slate-700/60 flex flex-col justify-center shadow-sm">
          <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-slate-400">
            VOLUME TERENDAH
          </span>
          <div className="text-[20px] font-mono font-bold text-emerald-400 tabular-nums leading-tight">
            {stats.minVal} <span className="text-xs font-normal text-slate-400">tiket</span>
          </div>
        </div>
      </div>

      {/* ── 2. Legend Strip with Individual Totals ── */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-1 text-xs shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {allProjects.map((project) => {
            const isHidden = hiddenProjects.has(project);
            const count = projectTotals[project] || 0;
            return (
              <button
                key={project}
                type="button"
                onClick={() => toggleProject(project)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] font-mono border transition-all cursor-pointer ${
                  isHidden
                    ? "opacity-40 bg-slate-900/40 border-slate-800 text-slate-500 line-through"
                    : "bg-slate-800/70 border-slate-700/80 text-slate-200 hover:border-slate-600"
                }`}
                title={`Klik untuk menyembunyikan/menampilkan seri ${project}`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ background: projectColors[project] || "#38bdf8" }}
                />
                <span className="font-semibold"><MasterProjectName value={project} /></span>
                <span className="text-slate-400 text-[10.5px]">({count})</span>
              </button>
            );
          })}

          {hiddenProjects.size > 0 && (
            <button
              type="button"
              onClick={resetHidden}
              className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 underline cursor-pointer ml-1"
            >
              Reset
            </button>
          )}
        </div>

        <span className="hidden sm:inline-flex">
          <GranularityTag granularity={granularity} days={rangeDays} />
        </span>
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
                  {allProjects.map((p) => (
                    <th key={p} className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 justify-end">
                        <span
                          className="w-2 h-2 rounded-sm shrink-0"
                          style={{ background: projectColors[p] || "#38bdf8" }}
                        />
                        {p}
                      </span>
                    </th>
                  ))}
                  <th className="py-2.5 px-4 text-right font-semibold text-sky-400">Total Tiket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {volumeByDate.map((row) => {
                  const rowTotal = allProjects.reduce(
                    (sum, p) => sum + (row.projectCounts[p] || 0),
                    0
                  );
                  const isSelected = selectedDate === row.date;
                  return (
                    <tr
                      key={row.date}
                      onClick={() => onSelectDate?.(isSelected ? null : row.date)}
                      className={`h-11 cursor-pointer transition-colors ${
                        isSelected ? "bg-sky-950/50" : "hover:bg-slate-800/40"
                      }`}
                    >
                      <td className="py-2.5 px-4 font-semibold text-slate-200 sticky left-0 bg-slate-900/90 whitespace-nowrap">
                        {row.date}
                      </td>
                      {allProjects.map((p) => {
                        const count = row.projectCounts[p] || 0;
                        return (
                          <td
                            key={p}
                            className={`py-2.5 px-3 text-right tabular-nums ${
                              count > 0 ? "text-slate-100 font-medium" : "text-slate-600"
                            }`}
                          >
                            {count}
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-4 text-right tabular-nums font-bold text-sky-400">
                        {rowTotal}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-900/95 sticky bottom-0 border-t-2 border-slate-700 font-mono font-bold text-slate-100">
                <tr className="h-11">
                  <td className="py-2.5 px-4 sticky left-0 bg-slate-900/95">Total Keseluruhan</td>
                  {allProjects.map((p) => (
                    <td key={p} className="py-2.5 px-3 text-right tabular-nums text-slate-200">
                      {projectTotals[p] || 0}
                    </td>
                  ))}
                  <td className="py-2.5 px-4 text-right tabular-nums text-sky-400">
                    {stats.total}
                  </td>
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
            aria-label={`Grafik volume tiket per project, total volume ${stats.total} tiket`}
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

            {/* Stacked Bars */}
            {bars.map((b) => {
              const isHovered = hoveredIdx === b.idx;
              const isSelected = Boolean(selectedDate && selectedDate >= b.item.date && selectedDate <= b.item.to);

              return (
                <g
                  key={`bar-${b.idx}`}
                  className="cursor-pointer"
                  onClick={() => onSelectDate?.(isSelected ? null : b.item.date)}
                >
                  {/* Subtle hover/selected background pillar */}
                  {(isHovered || isSelected) && (
                    <rect
                      x={b.x - 3}
                      y={marginTop}
                      width={barWidth + 6}
                      height={plotHeight}
                      fill={isSelected ? "rgba(56, 189, 248, 0.18)" : "rgba(56, 189, 248, 0.08)"}
                      rx="4"
                    />
                  )}

                  {/* Segments */}
                  {b.segments.map((seg, sIdx) => {
                    const isTopSegment = sIdx === b.segments.length - 1 && barWidth >= 10;
                    return (
                      <g key={`seg-${sIdx}`}>
                        <rect
                          x={b.x}
                          y={seg.y}
                          width={barWidth}
                          height={seg.h}
                          fill={seg.color}
                          rx={isTopSegment ? 3 : 0}
                          opacity={hoveredIdx === null ? 0.9 : isHovered ? 1 : 0.55}
                        />
                        {/* Segment count inside if tall enough */}
                        {seg.h >= 16 && barWidth >= 22 && (
                          <text
                            x={b.centerX}
                            y={seg.y + seg.h / 2 + 4}
                            textAnchor="middle"
                            fill="#0f172a"
                            fontSize="10"
                            fontFamily="monospace"
                            fontWeight="bold"
                          >
                            {seg.count}
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {/* Total on top of bar (displayed if barWidth >= 24px or peak) */}
                  {b.totalBarVal > 0 && (barWidth >= 24 || b.totalBarVal === peakBarVal) && (
                    <text
                      x={b.centerX}
                      y={b.topY - 6}
                      textAnchor="middle"
                      fill={b.totalBarVal === peakBarVal ? "#f59e0b" : "#cbd5e1"}
                      fontSize="11"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {b.totalBarVal}
                    </text>
                  )}
                </g>
              );
            })}

            {/* X-axis Ticks & Dates */}
            {bars.map((b) => {
              if (!showAxisLabel(b.idx, n, labelStride)) return null;
              return (
                <g key={`xtick-${b.idx}`}>
                  <line
                    x1={b.centerX}
                    y1={baselineY}
                    x2={b.centerX}
                    y2={baselineY + 4}
                    stroke="#475569"
                    strokeWidth="1"
                  />
                  <text
                    x={Math.min(width - 24, Math.max(marginLeft + 18, b.centerX))}
                    y={baselineY + 18}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="11.5"
                    fontFamily="monospace"
                    fontWeight="500"
                  >
                    {bucketAxisLabel(b.item, granularity)}
                  </text>
                </g>
              );
            })}

            {/* Vertical Crosshair Line for Active Hover */}
            {hoveredBar && (
              <line
                x1={hoveredBar.centerX}
                y1={marginTop}
                x2={hoveredBar.centerX}
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
          {hoveredBar && (
            <ChartTooltip key={hoveredIdx} svg={chartSvg} anchorX={hoveredBar.centerX} half={barWidth / 2 + 3} plotTop={marginTop} viewWidth={width} viewHeight={height}>
              <TooltipHeader title={bucketTitle(hoveredBar.item, granularity)} value={`Total ${hoveredBar.totalBarVal}`} />
              {tooltipRows.map((seg) => (
                <TooltipRow
                  key={seg.project}
                  marker={<TooltipSwatch color={seg.color} />}
                  label={seg.h === 0 ? seg.project : <MasterProjectName value={seg.project} />}
                  value={seg.count}
                />
              ))}
            </ChartTooltip>
          )}
        </div>
      )}
    </div>
  );
}
