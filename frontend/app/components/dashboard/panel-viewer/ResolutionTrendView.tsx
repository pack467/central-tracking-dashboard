"use client";

import { useMemo } from "react";
import { useContainerDimensions } from "@/app/hooks/useContainerDimensions";
import { ChartTooltip, TooltipHeader, TooltipRow, useChartHover } from "./chart-tooltip";

interface VolumeItem {
  date: string;
  created: number;
  closed: number;
  backlog: number;
  projectCounts: Record<string, number>;
  avgResolution: number;
}

interface ResolutionTrendViewProps {
  volumeByDate: VolumeItem[];
  mode: "chart" | "table";
}

export function ResolutionTrendView({ volumeByDate, mode }: ResolutionTrendViewProps) {
  const [containerRef, dimensions] = useContainerDimensions<HTMLDivElement>();

  // Compute KPI stats
  const kpis = useMemo(() => {
    if (volumeByDate.length === 0) {
      return { avg: 0, min: 0, max: 0, compliancePct: 0 };
    }
    const resolutions = volumeByDate.map((v) => v.avgResolution);
    const avg = Math.round(resolutions.reduce((a, b) => a + b, 0) / resolutions.length);
    const min = Math.min(...resolutions);
    const max = Math.max(...resolutions);
    const metCount = volumeByDate.filter((v) => v.avgResolution <= 60).length;
    const compliancePct = Math.round((metCount / volumeByDate.length) * 100);

    return { avg, min, max, compliancePct };
  }, [volumeByDate]);

  // Geometry calculations using actual container dimensions (Zero letterboxing)
  const n = volumeByDate.length;
  const width = Math.max(dimensions.width || 800, 640);
  const height = Math.max(dimensions.height || 420, 320);

  const marginLeft = 48;
  const marginRight = 84; // Room for SLA 60m / Breach 90m labels at right
  const marginTop = 28;
  const marginBottom = 34;

  const plotWidth = width - marginLeft - marginRight;
  const plotHeight = height - marginTop - marginBottom;

  const baselineY = height - marginBottom;

  // Y-axis scaling
  const yMax = Math.max(100, Math.ceil(kpis.max / 20) * 20);
  const yTicks = [0, 20, 40, 60, 80, 100];
  if (yMax > 100) {
    for (let t = 120; t <= yMax; t += 20) yTicks.push(t);
  }

  const stepX = n > 1 ? plotWidth / (n - 1) : plotWidth / 2;

  // Target SLA line coordinates
  const targetSlaY = baselineY - Math.round((60 / yMax) * plotHeight);
  const breachSlaY = baselineY - Math.round((90 / yMax) * plotHeight);
  const avgLineY = baselineY - Math.round((kpis.avg / yMax) * plotHeight);

  // Points
  const points = useMemo(() => {
    return volumeByDate.map((item, idx) => {
      const x = Math.round(marginLeft + (n > 1 ? idx * stepX : plotWidth / 2));
      const val = Math.min(item.avgResolution, yMax);
      const y = Math.round(baselineY - (val / yMax) * plotHeight);
      return { x, y, idx, item };
    });
  }, [volumeByDate, n, stepX, marginLeft, plotWidth, baselineY, yMax, plotHeight]);

  const pathLine = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const firstX = points[0]?.x ?? marginLeft;
  const lastX = points[points.length - 1]?.x ?? (marginLeft + plotWidth);
  const pathArea = `${pathLine} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;

  // Find peak and trough points for pill callouts
  const peakPoint = points.find((p) => p.item.avgResolution === kpis.max);
  const minPoint = points.find((p) => p.item.avgResolution === kpis.min);

  const { svg: chartSvg, bindSvg, svgProps, index: hoveredIdx } = useChartHover({ xs: points.map((p) => p.x), viewWidth: width, resetKey: `${mode}|${n}` });
  const hoveredPoint = hoveredIdx !== null ? points[hoveredIdx] ?? null : null;

  if (volumeByDate.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 text-slate-400 text-sm">
        Tidak ada data durasi penyelesaian untuk filter saat ini.
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
            KEPATUHAN SLA (&le;60M)
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
            Target SLA (60m)
          </span>
          <span className="inline-flex items-center gap-1.5 text-rose-400 font-medium text-[11.5px]">
            <span className="w-3.5 h-0 border-t-2 border-dashed border-rose-400" />
            Batas Kritis (90m)
          </span>
        </div>

        <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
          {n} titik pengamatan
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
                  <th className="py-2.5 px-4 text-center font-semibold">Status SLA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {volumeByDate.map((row) => {
                  const isMet = row.avgResolution <= 60;
                  const isBreach = row.avgResolution > 90;
                  const statusLabel = isBreach ? "Breached (>90m)" : isMet ? "SLA Terpenuhi" : "Peringatan (60-90m)";
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
                  <td className="py-2.5 px-4 text-right tabular-nums">{volumeByDate.reduce((a, b) => a + b.closed, 0)}</td>
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
                    {tick}m
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
              SLA 60m
            </text>

            {/* SLA Breach Line (90m) */}
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
              Breach 90m
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
              // Skip labels if tight on mobile
              const showLabel = width >= 600 || idx % 2 === 0 || idx === n - 1;
              const dateParts = p.item.date.split("-");
              const shortDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}` : p.item.date;

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
                    <g transform={`translate(${p.x}, ${p.y - 12})`}>
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
                title={hoveredPoint.item.date}
                valueClass={hoveredPoint.item.avgResolution <= 60 ? "text-emerald-400" : hoveredPoint.item.avgResolution <= 90 ? "text-amber-400" : "text-rose-400"}
                value={hoveredPoint.item.avgResolution <= 60 ? "SLA Terpenuhi" : hoveredPoint.item.avgResolution <= 90 ? "Warning" : "Breach"}
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
