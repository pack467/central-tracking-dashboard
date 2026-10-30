"use client";

import { useMemo } from "react";
import { useContainerDimensions } from "@/app/hooks/useContainerDimensions";
import { durationScale, SLA_BREACH_MINUTES, SLA_TARGET_MINUTES } from "@/app/lib/chart-scale";
import { ChartTooltip, TooltipHeader, TooltipRow, useChartHover } from "./chart-tooltip";
import { GranularityTag } from "./GranularityTag";
import { axisLabelStride, bucketAxisLabel, bucketRanges, bucketTitle, bucketVolume, chooseGranularity, maxPointsFor, showAxisLabel, type VolumeGranularity } from "@/app/lib/volume-buckets";

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

export interface ResolutionKpis {
  avg: number;
  compliancePct: number;
  min: number;
  max: number;
  count: number;
}

interface ResolutionTrendViewProps {
  volumeByDate: VolumeItem[];
  mode: "chart" | "table";
  /** Per closed ticket, as on the dashboard card. Without it the view falls back to the periods it draws. */
  kpis?: ResolutionKpis | null;
}

/** The days, weeks or months that have at least one closed ticket, each with the average over all of its closed tickets. */
function averagedSeries(volumeByDate: VolumeItem[], granularity: VolumeGranularity) {
  return bucketVolume(volumeByDate, granularity)
    .filter((bucket) => bucket.resolvedCount > 0)
    .map((bucket) => ({ ...bucket, avgResolution: Math.round(bucket.resolutionSum / bucket.resolvedCount) }));
}

export function ResolutionTrendView({ volumeByDate, mode, kpis: ticketKpis }: ResolutionTrendViewProps) {
  const [containerRef, dimensions] = useContainerDimensions<HTMLDivElement>();

  const width = Math.max(dimensions.width || 800, 640);
  const height = Math.max(dimensions.height || 420, 320);

  const marginLeft = 48;
  const marginRight = 84; // Room for the two SLA target labels at right (60m, 120m)
  const marginTop = 28;
  const marginBottom = 34;

  const plotWidth = width - marginLeft - marginRight;
  const plotHeight = height - marginTop - marginBottom;

  const baselineY = height - marginBottom;

  // One point per day while each gets 28 px; longer ranges average per week or month. Periods without a closed ticket get no point.
  const firstDate = volumeByDate[0]?.date ?? "";
  const lastDate = volumeByDate[volumeByDate.length - 1]?.date ?? "";
  const granularity = volumeByDate.length ? chooseGranularity(firstDate, lastDate, maxPointsFor(plotWidth, 28)) ?? "month" : "day";
  const series = useMemo(() => averagedSeries(volumeByDate, granularity), [volumeByDate, granularity]);
  const dailyRows = useMemo(() => averagedSeries(volumeByDate, "day"), [volumeByDate]);
  const rangeDays = volumeByDate.length ? bucketRanges(firstDate, lastDate, "day").length : 0;
  const n = series.length;

  const kpis = useMemo(() => {
    if (ticketKpis) return ticketKpis;
    const resolved = series.reduce((sum, item) => sum + item.resolvedCount, 0);
    if (!resolved) return { avg: 0, min: 0, max: 0, compliancePct: 0, count: 0 };
    const values = series.map((item) => item.avgResolution);
    return { avg: Math.round(series.reduce((sum, item) => sum + item.resolutionSum, 0) / resolved), min: Math.min(...values), max: Math.max(...values), compliancePct: Math.round((values.filter((value) => value <= SLA_TARGET_MINUTES).length / values.length) * 100), count: resolved };
  }, [ticketKpis, series]);

  // Y-axis scaling: from the points drawn, not from the slowest single ticket
  // A bounded set of round ticks; far above the SLA lines the axis is compressed so one outlier cannot flatten them (lib/chart-scale.ts)
  const seriesMax = Math.max(0, ...series.map((item) => item.avgResolution));
  const seriesMin = series.length ? Math.min(...series.map((item) => item.avgResolution)) : 0;
  const scale = useMemo(() => durationScale(seriesMax), [seriesMax]);
  const yTicks = scale.ticks;
  const yFor = (minutes: number) => baselineY - Math.round(scale.ratio(minutes) * plotHeight);

  const stepX = n > 1 ? plotWidth / (n - 1) : plotWidth / 2;
  const labelStride = axisLabelStride(stepX, granularity);

  // Target SLA line coordinates
  const targetSlaY = yFor(SLA_TARGET_MINUTES);
  const breachSlaY = yFor(SLA_BREACH_MINUTES);
  const avgLineY = yFor(kpis.avg);

  // Points
  const points = useMemo(() => {
    return series.map((item, idx) => {
      const x = Math.round(marginLeft + (n > 1 ? idx * stepX : plotWidth / 2));
      const y = Math.round(baselineY - scale.ratio(item.avgResolution) * plotHeight);
      return { x, y, idx, item };
    });
  }, [series, n, stepX, marginLeft, plotWidth, baselineY, scale, plotHeight]);

  const pathLine = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const firstX = points[0]?.x ?? marginLeft;
  const lastX = points[points.length - 1]?.x ?? (marginLeft + plotWidth);
  const pathArea = `${pathLine} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;

  // Find peak and trough points for pill callouts
  const peakPoint = points.find((p) => p.item.avgResolution === seriesMax);
  const minPoint = points.find((p) => p.item.avgResolution === seriesMin && p !== peakPoint);

  const { svg: chartSvg, bindSvg, svgProps, index: hoveredIdx } = useChartHover({ xs: points.map((p) => p.x), viewWidth: width, resetKey: `${mode}|${n}|${granularity}` });
  const hoveredPoint = hoveredIdx !== null ? points[hoveredIdx] ?? null : null;

  if (series.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 text-slate-400 text-sm">
        Belum ada tiket selesai pada filter saat ini, jadi durasi penyelesaian belum bisa dihitung.
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">
      {/* ── 1. Compact 4-Stat Strip (~60px height) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0">
        <div className="h-[60px] px-3.5 py-2 rounded-xl bg-slate-900/70 border border-slate-700/60 flex flex-col justify-center shadow-sm">
          <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-slate-400">
            RATA-RATA RESOLUSI
          </span>
          <div className="text-[20px] font-mono font-bold text-white tabular-nums leading-tight flex items-baseline gap-1">
            {kpis.avg} <span className="text-xs font-normal text-slate-400">menit</span>
          </div>
        </div>

        <div className="h-[60px] px-3.5 py-2 rounded-xl bg-slate-900/70 border border-slate-700/60 flex flex-col justify-center shadow-sm">
          <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-slate-400">
            KEPATUHAN SLA
          </span>
          <div className="text-[20px] font-mono font-bold text-emerald-400 tabular-nums leading-tight">
            {kpis.compliancePct}%
          </div>
        </div>

        <div className="h-[60px] px-3.5 py-2 rounded-xl bg-slate-900/70 border border-slate-700/60 flex flex-col justify-center shadow-sm">
          <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-slate-400">
            DURASI TERCEPAT
          </span>
          <div className="text-[20px] font-mono font-bold text-sky-400 tabular-nums leading-tight flex items-baseline gap-1">
            {kpis.min} <span className="text-xs font-normal text-slate-400">menit</span>
          </div>
        </div>

        <div className="h-[60px] px-3.5 py-2 rounded-xl bg-slate-900/70 border border-slate-700/60 flex flex-col justify-center shadow-sm">
          <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-slate-400">
            DURASI TERTINGGI
          </span>
          <div className="text-[20px] font-mono font-bold text-amber-400 tabular-nums leading-tight flex items-baseline gap-1">
            {kpis.max} <span className="text-xs font-normal text-slate-400">menit</span>
          </div>
        </div>
      </div>

      {/* ── 2. Legend Strip (Single line) ── */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-1 text-xs shrink-0">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-sky-400 font-medium text-[11.5px]">
            <span className="w-3.5 h-0.5 rounded-full bg-sky-400" />
            Resolusi Rata-rata
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-300 font-medium text-[11.5px]">
            <span className="w-3 h-0 border-t border-dashed border-sky-400" />
            Rata-rata Periode ({kpis.avg}m)
          </span>
          <span className="inline-flex items-center gap-1.5 text-amber-400 font-medium text-[11.5px]">
            <span className="w-3.5 h-0 border-t-2 border-dashed border-amber-400" />
            High (60m)
          </span>
          <span className="inline-flex items-center gap-1.5 text-rose-400 font-medium text-[11.5px]">
            <span className="w-3.5 h-0 border-t-2 border-dashed border-rose-400" />
            Medium/Low (120m)
          </span>
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
                  <th className="py-2.5 px-4 text-right font-semibold text-sky-400">Rata-rata Resolusi</th>
                  <th className="py-2.5 px-4 text-right font-semibold text-slate-300">Tiket Ditutup</th>
                  <th className="py-2.5 px-4 text-center font-semibold" title="Rata-rata hari itu dibanding dua target: 60 menit (High) dan 120 menit (Medium/Low)">Rata-rata vs target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {dailyRows.map((row) => {
                  const isMet = row.avgResolution <= SLA_TARGET_MINUTES;
                  const isBreach = row.avgResolution > SLA_BREACH_MINUTES;
                  const statusLabel = isBreach ? `Di atas ${SLA_BREACH_MINUTES}m` : isMet ? `≤ ${SLA_TARGET_MINUTES}m` : `${SLA_TARGET_MINUTES}–${SLA_BREACH_MINUTES}m`;
                  const statusClass = isBreach
                    ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                    : isMet
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : "bg-amber-500/15 text-amber-400 border-amber-500/30";

                  return (
                    <tr key={row.date} className="h-11 hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-slate-200 sticky left-0 bg-slate-900/90 whitespace-nowrap">
                        {row.date}
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums font-bold text-slate-100">
                        {row.avgResolution} menit
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums text-slate-400">
                        {row.closed}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-900/95 sticky bottom-0 border-t-2 border-slate-700 font-mono font-bold text-slate-100">
                <tr className="h-11">
                  <td className="py-2.5 px-4 sticky left-0 bg-slate-900/95">Rata-rata Periode</td>
                  <td className="py-2.5 px-4 text-right tabular-nums text-sky-400">{kpis.avg} menit</td>
                  <td className="py-2.5 px-4 text-right tabular-nums">{dailyRows.reduce((a, b) => a + b.closed, 0)}</td>
                  <td className="py-2.5 px-4 text-center text-emerald-400 font-semibold">{kpis.compliancePct}% kepatuhan</td>
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
            aria-label={`Grafik tren durasi penyelesaian resolusi, rata-rata ${kpis.avg} menit`}
            {...svgProps}
          >
            <defs>
              <linearGradient id="resTrendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Y Axis Unit Label at top left */}
            <text
              x={marginLeft - 8}
              y={marginTop - 10}
              textAnchor="end"
              fill="#64748b"
              fontSize="11"
              fontFamily="monospace"
              fontWeight="600"
            >
              Menit
            </text>

            {/* Gridlines & Y-ticks */}
            {yTicks.map((tick) => {
              const yPos = yFor(tick);
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
                    {tick}m
                  </text>
                </g>
              );
            })}

            {/* The axis above 120m is compressed when one value is far above the SLA lines: say so */}
            {scale.broken && (
              <text x={marginLeft} y={marginTop - 12} fill="#94a3b8" fontSize="10.5" fontFamily="monospace" fontWeight="600" opacity="0.85">
                Skala di atas {scale.breakAt}m diperkecil
              </text>
            )}

            {/* Base line */}
            <line
              x1={marginLeft}
              y1={baselineY}
              x2={width - marginRight}
              y2={baselineY}
              stroke="#334155"
              strokeWidth="1.5"
            />

            {/* Target SLA Line (60m) */}
            <line
              x1={marginLeft}
              y1={targetSlaY}
              x2={width - marginRight}
              y2={targetSlaY}
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            <text
              x={width - marginRight + 8}
              y={targetSlaY + 4}
              fill="#f59e0b"
              fontSize="11"
              fontFamily="monospace"
              fontWeight="bold"
            >
              Target 60m
            </text>

            {/* Medium/Low target line (120m) */}
            <line
              x1={marginLeft}
              y1={breachSlaY}
              x2={width - marginRight}
              y2={breachSlaY}
              stroke="#f43f5e"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            <text
              x={width - marginRight + 8}
              y={breachSlaY + 4}
              fill="#f43f5e"
              fontSize="11"
              fontFamily="monospace"
              fontWeight="bold"
            >
              Target 120m
            </text>

            {/* Dashed Average Line across data */}
            <line
              x1={marginLeft}
              y1={avgLineY}
              x2={width - marginRight}
              y2={avgLineY}
              stroke="#38bdf8"
              strokeWidth="1.2"
              strokeDasharray="2 3"
              strokeOpacity="0.75"
            />
            <text
              x={width - marginRight + 8}
              y={avgLineY + 3}
              fill="#38bdf8"
              fontSize="10"
              fontFamily="monospace"
              fontWeight="600"
            >
              Rata {kpis.avg}m
            </text>

            {/* Area Fill */}
            <path d={pathArea} fill="url(#resTrendGradient)" />

            {/* Main Trend Line */}
            <path
              d={pathLine}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* X-axis Ticks & Dates */}
            {points.map((p, idx) => {
              if (!showAxisLabel(idx, n, labelStride)) return null;
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
                    x={Math.min(width - marginRight, Math.max(marginLeft + 16, p.x))}
                    y={baselineY + 18}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="11.5"
                    fontFamily="monospace"
                    fontWeight="500"
                  >
                    {bucketAxisLabel(p.item, granularity)}
                  </text>
                </g>
              );
            })}

            {/* Data Points with Value Labels */}
            {points.map((p, idx) => {
              const isPeak = p === peakPoint;
              const isMin = p === minPoint;
              const isHovered = hoveredIdx === idx;
              const showValLabel = n <= 16 || isPeak || isMin || isHovered;

              return (
                <g key={`point-${idx}`}>
                  {/* Outer glow ring for hovered */}
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

                  {/* Main Point */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? 5.5 : isPeak || isMin ? 4.5 : 3.5}
                    fill={isPeak ? "#fbbf24" : isMin ? "#34d399" : "#38bdf8"}
                    stroke="#0f172a"
                    strokeWidth="1.5"
                  />

                  {/* Value label directly above point (without hover) */}
                  {showValLabel && (
                    <g transform={`translate(${Math.min(width - marginRight + 14, Math.max(marginLeft + 16, p.x))}, ${p.y - 12})`}>
                      <rect
                        x="-14"
                        y="-10"
                        width="28"
                        height="14"
                        rx="4"
                        fill="#0f172a"
                        fillOpacity="0.9"
                        stroke={isPeak ? "#f59e0b" : isMin ? "#10b981" : "#334155"}
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="0"
                        textAnchor="middle"
                        fill={isPeak ? "#f59e0b" : isMin ? "#34d399" : "#cbd5e1"}
                        fontSize="10"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {p.item.avgResolution}m
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Vertical Crosshair Line for Active Hover */}
            {hoveredPoint && (
              <g pointerEvents="none">
                <line
                  x1={hoveredPoint.x}
                  y1={marginTop}
                  x2={hoveredPoint.x}
                  y2={baselineY}
                  stroke="#38bdf8"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  strokeOpacity="0.8"
                />
              </g>
            )}
          </svg>

          {hoveredPoint && (
            <ChartTooltip key={hoveredIdx} svg={chartSvg} anchorX={hoveredPoint.x} half={6} plotTop={marginTop} viewWidth={width} viewHeight={height}>
              <TooltipHeader
                title={bucketTitle(hoveredPoint.item, granularity)}
                valueClass={hoveredPoint.item.avgResolution <= SLA_TARGET_MINUTES ? "text-emerald-400" : hoveredPoint.item.avgResolution <= SLA_BREACH_MINUTES ? "text-amber-400" : "text-rose-400"}
                value={hoveredPoint.item.avgResolution <= SLA_TARGET_MINUTES ? `≤ ${SLA_TARGET_MINUTES}m` : hoveredPoint.item.avgResolution <= SLA_BREACH_MINUTES ? `${SLA_TARGET_MINUTES}–${SLA_BREACH_MINUTES}m` : `Di atas ${SLA_BREACH_MINUTES}m`}
              />
              <TooltipRow label="Rata-rata resolusi" valueClass="text-sky-400" value={`${hoveredPoint.item.avgResolution} menit`} />
              <TooltipRow tone="text-slate-400" valueClass="font-normal text-slate-300" label="Tiket ditutup" value={`${hoveredPoint.item.closed} tiket`} />
            </ChartTooltip>
          )}
        </div>
      )}
    </div>
  );
}
