"use client";

import { BarChart3, CalendarDays, Layers3, Search, ShieldCheck, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { MasterProjectName } from "@/app/components/ui/MasterProjectName";
import { formatDuration, numericDate, type WeeklyReport } from "@/app/lib/weekly-report";

export function ReportPanel({
  title,
  note,
  icon: Icon,
  headerAction,
  className = "",
  headerClassName = "",
  children,
}: {
  title: string;
  note?: string;
  icon?: LucideIcon;
  headerAction?: ReactNode;
  className?: string;
  headerClassName?: string;
  children: ReactNode;
}) {
  const isOverflowVisible = className.includes("overflow-visible");
  return (
    <article
      className={`min-w-0 rounded-[12px] border border-[#334155] bg-[#1e293b] shadow-[0_4px_16px_rgba(0,0,0,0.2)] flex flex-col ${
        isOverflowVisible ? "" : "overflow-hidden"
      } ${className}`}
    >
      <div
        className={`flex flex-wrap items-center justify-between gap-3 border-b border-[#334155] px-4 py-3 sm:px-5 sm:py-3.5 bg-[rgba(15,23,42,0.45)] rounded-t-[12px] ${headerClassName}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="flex items-center gap-2 text-[14px] sm:text-[15px] font-semibold tracking-tight text-[#f8fafc]">
            {Icon && <Icon size={15} className="shrink-0 text-[#38bdf8]" />}
            <span>{title}</span>
          </h2>
          {note && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold leading-none bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/20 shrink-0">
              {note}
            </span>
          )}
        </div>
        {headerAction && <div className="flex items-center gap-2 shrink-0">{headerAction}</div>}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </article>
  );
}

const emptyContent = {
  projects: {
    icon: BarChart3,
    title: "Distribusi proyek belum tersedia",
    description: "Tiket yang tercatat pada periode ini akan ditampilkan menurut proyeknya.",
  },
  daily: {
    icon: CalendarDays,
    title: "Belum ada aktivitas tiket harian",
    description: "Pilih periode lain untuk melihat volume tiket dari hari ke hari.",
  },
  categories: {
    icon: Layers3,
    title: "Belum ada kategori untuk dirangkum",
    description: "Kategori dan tingkat keparahan akan muncul setelah ada tiket sesuai filter.",
  },
  monitoring: {
    icon: ShieldCheck,
    title: "Belum ada checkpoint tercatat",
    description: "Hasil monitoring proyek pada periode terpilih akan dirangkum di sini.",
  },
  tickets: {
    icon: Search,
    title: "Tidak ada tiket yang sesuai",
    description: "Coba sesuaikan kata kunci pencarian, rentang tanggal, atau proyek.",
  },
  monitoringLog: {
    icon: Search,
    title: "Catatan monitoring belum ditemukan",
    description: "Sesuaikan pencarian atau periode untuk melihat catatan checkpoint.",
  },
};

export function ReportEmptyState({
  kind,
  compact = false,
}: {
  kind: keyof typeof emptyContent;
  compact?: boolean;
}) {
  const { icon: Icon, title, description } = emptyContent[kind];
  if (compact) {
    return (
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 px-4 py-6 sm:px-6 text-center sm:text-left min-h-20">
        <span className="grid h-8 w-8 place-items-center rounded-full border border-[#334155] bg-[#0f172a] text-[#38bdf8] shrink-0 shadow-sm">
          <Icon size={15} strokeWidth={2} />
        </span>
        <div>
          <h3 className="text-[13px] font-bold text-[#f8fafc]">{title}</h3>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#94a3b8]">{description}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center px-4 sm:px-5 min-h-48 py-8">
      <div className="flex max-w-sm flex-col items-center text-center">
        <span className="mb-2.5 grid h-10 w-10 place-items-center rounded-full border border-[#334155] bg-[#0f172a] text-[#38bdf8] shadow-sm">
          <Icon size={16} strokeWidth={2} />
        </span>
        <h3 className="text-[13px] font-bold text-[#f8fafc]">{title}</h3>
        <p className="mt-1 text-[11.5px] leading-relaxed text-[#94a3b8]">{description}</p>
      </div>
    </div>
  );
}

export function ReportDataTable({
  headers,
  rows,
  total = false,
  alignments,
  stickyFirstCol = false,
  minWidth = "min-w-[640px]",
}: {
  headers: string[];
  rows: ReactNode[][];
  total?: boolean;
  alignments?: ("left" | "right" | "center")[];
  stickyFirstCol?: boolean;
  minWidth?: string;
}) {
  const getAlign = (colIndex: number): string => {
    if (alignments && alignments[colIndex]) {
      return alignments[colIndex] === "right" ? "text-right" : alignments[colIndex] === "center" ? "text-center" : "text-left";
    }
    if (total && colIndex > 0) return "text-right";
    return "text-left";
  };

  return (
    <div className="max-w-full overflow-x-auto overscroll-x-contain [scrollbar-width:thin] [scrollbar-color:#334155_transparent] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:bg-[#334155] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#475569]">
      <table className={`w-full border-collapse text-xs ${minWidth}`}>
        <thead className="border-b border-[#334155] bg-[rgba(15,23,42,0.7)] text-[10.5px] font-bold uppercase tracking-[0.05em] text-[#94a3b8]">
          <tr>
            {headers.map((header, colIndex) => {
              const isFirst = stickyFirstCol && colIndex === 0;
              return (
                <th
                  key={header}
                  className={`px-4 sm:px-5 py-3 font-semibold leading-tight ${getAlign(colIndex)} ${
                    isFirst ? "sticky left-0 bg-[#0f172a] z-20 border-r border-[#334155]/60 shadow-[2px_0_6px_rgba(0,0,0,0.2)]" : ""
                  }`}
                >
                  {header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#334155]/40 font-mono">
          {rows.map((row, index) => {
            const isTotal = total && index === rows.length - 1;
            return (
              <tr
                key={index}
                className={`group transition-colors duration-150 min-h-[44px] ${
                  isTotal
                    ? "border-t-2 border-[#38bdf8]/40 bg-[rgba(56,189,248,0.08)] font-bold text-[#f8fafc]"
                    : "text-[#cbd5e1] hover:bg-[#243044]/60"
                }`}
              >
                {row.map((cell, column) => {
                  const isFirst = stickyFirstCol && column === 0;
                  return (
                    <td
                      key={column}
                      className={`px-4 sm:px-5 py-3 align-middle leading-5 tabular-nums ${getAlign(column)} ${
                        isFirst
                          ? `sticky left-0 z-10 border-r border-[#334155]/60 shadow-[2px_0_6px_rgba(0,0,0,0.2)] font-sans ${
                              isTotal ? "bg-[#182334] font-bold text-[#f8fafc]" : "bg-[#1e293b] group-hover:bg-[#243044] text-[#f8fafc]"
                            }`
                          : ""
                      }`}
                    >
                      {cell}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ReportProjectChart({ report }: { report: WeeklyReport }) {
  const max = Math.max(1, ...report.projects.map((project) => project.total));
  if (!report.projects.length) return <ReportEmptyState kind="projects" />;

  return (
    <div className="flex flex-col justify-between h-full min-h-64 p-4 sm:p-5 gap-3.5">
      {report.projects.map((project) => {
        const color = report.config.project_colors[project.project] ?? "#38bdf8";
        const percent = Math.round((project.total / (report.total || 1)) * 100);
        return (
          <div key={project.project} className="grid grid-cols-[120px_minmax(0,1fr)_65px] items-center gap-3">
            <span className="flex items-center gap-2 truncate text-xs font-semibold text-[#f8fafc]" title={project.project}>
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
              <span className="truncate">{project.project}</span>
            </span>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#0f172a] border border-[#334155]/60">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${project.total ? Math.max(3, (project.total / max) * 100) : 0}%`,
                  backgroundColor: color,
                }}
              />
            </div>
            <div className="flex items-center justify-end gap-1 font-mono text-xs tabular-nums">
              <strong className="font-bold text-[#f8fafc]">{project.total}</strong>
              <span className="text-[10.5px] text-[#94a3b8]">({percent}%)</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const WEEKDAY = new Intl.DateTimeFormat("id-ID", { weekday: "short", timeZone: "UTC" });

function projectColor(report: WeeklyReport, name: string) {
  return report.config.project_colors[name] ?? "#38bdf8";
}

function ChartLegend({ report }: { report: WeeklyReport }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-3">
      {report.projects.map((project) => (
        <span key={project.project} className="inline-flex items-center gap-1.5 text-[11px] text-[#cbd5e1]" title={project.project}>
          <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: projectColor(report, project.project) }} />
          <span>{project.project}</span>
        </span>
      ))}
    </div>
  );
}

interface DayBucket {
  key: string;
  label: string;
  sub: string;
  title: string;
  counts: number[];
  total: number;
}

const ddmm = (day: string) => `${day.slice(8)}/${day.slice(5, 7)}`;

/** Daily buckets, or 7-day buckets when the period is too long to show one bar per day. */
function dayBuckets(report: WeeklyReport, weekly: boolean): DayBucket[] {
  const size = weekly ? 7 : 1;
  const out: DayBucket[] = [];
  for (let start = 0; start < report.days.length; start += size) {
    const days = report.days.slice(start, start + size);
    const first = days[0];
    const last = days[days.length - 1];
    const counts = report.projects.map((project) => project.days.slice(start, start + size).reduce((sum, value) => sum + value, 0));
    out.push({
      key: first,
      label: ddmm(first),
      sub: weekly ? `s.d. ${ddmm(last)}` : WEEKDAY.format(new Date(`${first}T00:00:00Z`)),
      title: weekly ? `${numericDate(first)} – ${numericDate(last)}` : numericDate(first),
      counts,
      total: counts.reduce((sum, value) => sum + value, 0),
    });
  }
  return out;
}

/** Axis step of 1, 2 or 5 × 10ⁿ giving about five gridlines. */
function niceScale(rawMax: number) {
  const rough = Math.max(1, rawMax / 5);
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = Math.max(1, [1, 2, 5, 10].map((m) => m * magnitude).find((value) => value >= rough) ?? 10 * magnitude);
  const max = Math.max(step, Math.ceil(rawMax / step) * step);
  return { step, max, ticks: Array.from({ length: max / step + 1 }, (_, i) => max - i * step) };
}

export function ReportDailyChart({ report }: { report: WeeklyReport }) {
  if (!report.total) return <ReportEmptyState kind="daily" />;

  // Reports span at most 31 days: wider screens keep one bar per day, phones switch to weekly rows beyond three weeks.
  const phoneBuckets = dayBuckets(report, report.days.length > 21);
  const buckets = dayBuckets(report, false);
  const phoneMax = Math.max(1, ...phoneBuckets.map((bucket) => bucket.total));
  const { max: scaleMax, ticks } = niceScale(Math.max(1, ...buckets.map((bucket) => bucket.total)));

  const W = 540;
  const LEFT = 30;
  const BASE = 196;
  const PLOT = 168;
  const step = (W - LEFT - 6) / Math.max(buckets.length, 1);
  const barWidth = Math.min(step * 0.62, 36);
  const labelEvery = Math.max(1, Math.ceil(buckets.length / 10));
  const totalFont = step >= 30 ? 11 : 9;
  const fitsTotal = (value: number) => String(value).length * totalFont * 0.62 + 2 <= step;
  const fitsSegments = step >= 22;

  return (
    <div className="flex h-full min-h-64 flex-col justify-between p-4 sm:p-5">
      {phoneBuckets.length !== report.days.length && (
        <p className="mb-3 text-[11px] text-[#94a3b8] sm:hidden">Dikelompokkan per minggu karena periode lebih dari 3 minggu.</p>
      )}

      {/* Phone: one row per day (or week) with a stacked bar */}
      <ul className="space-y-2.5 sm:hidden" aria-label="Tiket per periode dan proyek">
        {phoneBuckets.map((bucket) => (
          <li key={bucket.key} className="grid grid-cols-[56px_minmax(0,1fr)_32px] items-center gap-3">
            <span className="leading-tight">
              <span className="block font-mono text-[11.5px] font-semibold text-[#f8fafc]">{bucket.label}</span>
              <span className="block text-[10px] text-[#64748b]">{bucket.sub}</span>
            </span>
            <span className="flex h-3 overflow-hidden rounded-full bg-[#0f172a]" title={`${bucket.title}: ${bucket.total} tiket`}>
              {report.projects.map((project, index) =>
                bucket.counts[index] ? (
                  <span
                    key={project.project}
                    className="h-full"
                    style={{ width: `${(bucket.counts[index] / phoneMax) * 100}%`, backgroundColor: projectColor(report, project.project) }}
                  />
                ) : null
              )}
            </span>
            <span className="text-right font-mono text-[12px] font-bold tabular-nums text-[#f8fafc]">{bucket.total}</span>
          </li>
        ))}
      </ul>

      {/* Tablet & desktop: stacked column chart */}
      <svg viewBox={`0 0 ${W} 224`} className="hidden w-full sm:block" role="img" aria-label="Grafik tiket per periode dan proyek">
        {ticks.map((tickVal) => {
          const y = BASE - (tickVal / scaleMax) * PLOT;
          return (
            <g key={tickVal}>
              <line x1={LEFT} x2={W - 4} y1={y} y2={y} stroke="#334155" strokeDasharray={tickVal ? "3 5" : undefined} />
              <text x={LEFT - 7} y={y + 3.5} fill="#94a3b8" fontSize="10" textAnchor="end" fontFamily="var(--font-mono)">
                {tickVal}
              </text>
            </g>
          );
        })}
        {buckets.map((bucket, index) => {
          let offset = 0;
          const center = LEFT + step * (index + 0.5);
          const showLabel = index % labelEvery === 0;
          return (
            <g key={bucket.key}>
              <title>{`${bucket.title}: ${bucket.total} tiket`}</title>
              {report.projects.map((project, projectIndex) => {
                const count = bucket.counts[projectIndex];
                const height = (count / scaleMax) * PLOT;
                offset += height;
                return count ? (
                  <g key={project.project}>
                    <rect x={center - barWidth / 2} y={BASE - offset} width={barWidth} height={height} fill={projectColor(report, project.project)}>
                      <title>{`${bucket.title} · ${project.project}: ${count}`}</title>
                    </rect>
                    {fitsSegments && height >= 15 && (
                      <text x={center} y={BASE - offset + height / 2 + 3.5} fill="#ffffff" fontSize="10" fontWeight="600" textAnchor="middle" pointerEvents="none">
                        {count}
                      </text>
                    )}
                  </g>
                ) : null;
              })}
              {showLabel && (
                <>
                  <line x1={center} x2={center} y1={BASE} y2={BASE + 4} stroke="#475569" />
                  <text x={center} y={BASE + 17} fill="#94a3b8" fontSize="10" textAnchor="middle" fontFamily="var(--font-mono)">
                    {bucket.label}
                  </text>
                </>
              )}
              {bucket.total > 0 && fitsTotal(bucket.total) && (
                <text x={center} y={BASE - 5 - (bucket.total / scaleMax) * PLOT} fill="#f8fafc" fontWeight="bold" fontSize={totalFont} textAnchor="middle" fontFamily="var(--font-mono)">
                  {bucket.total}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <ChartLegend report={report} />
    </div>
  );
}

/** Phone layout of the duration & SLA table: one row per project, Grand Total last. */
export function ReportDurationList({ report, showCombined }: { report: WeeklyReport; showCombined: boolean }) {
  const rows = [
    ...report.projects.map((row) => ({ key: row.project, name: row.project, avg: row.averageMinutes, sla: row.slaPercent, total: row.total, combined: row.clickupCount, isTotal: false })),
    { key: "__total", name: "Grand Total", avg: report.averageMinutes, sla: report.slaPercent, total: report.total, combined: report.clickupTotal, isTotal: true },
  ];
  return (
    <ul className="divide-y divide-[#334155]/50">
      {rows.map((row) => (
        <li key={row.key} className={`flex items-center justify-between gap-3 px-4 py-3 ${row.isTotal ? "border-t border-[#38bdf8]/30 bg-[rgba(56,189,248,0.06)]" : ""}`}>
          <div className="min-w-0">
            <p className={`flex items-center gap-2 text-[12.5px] text-[#f8fafc] ${row.isTotal ? "font-bold" : "font-semibold"}`}>
              {!row.isTotal && <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: projectColor(report, row.name) }} />}
              <span className="truncate">{row.isTotal ? row.name : <MasterProjectName value={row.name} historical />}</span>
            </p>
            <p className={`mt-0.5 text-[11px] text-[#94a3b8] ${row.isTotal ? "" : "pl-4"}`}>
              Rata-rata <span className="font-mono text-[#cbd5e1]">{formatDuration(row.avg)}</span>
              {" · "}SLA <span className="font-mono text-[#cbd5e1]">{row.sla === null ? "—" : `${row.sla}%`}</span>
              {showCombined && (
                <>
                  {" · "}Gabungan <span className="font-mono text-[#cbd5e1]">{row.combined ?? "—"}</span>
                </>
              )}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-mono text-[15px] font-bold tabular-nums leading-none text-[#f8fafc]">{row.total}</p>
            <p className="mt-1 text-[10px] text-[#64748b]">tiket</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Phone layout of the category matrix: each category lists only the projects that have tickets. */
export function ReportCategoryList({ report }: { report: WeeklyReport }) {
  return (
    <ul className="divide-y divide-[#334155]/50">
      {report.categories.map((row) => (
        <li key={row.category} className="px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 text-[12.5px] font-semibold leading-snug text-[#f8fafc]">{row.category}</p>
            <span className="shrink-0 font-mono text-[14px] font-bold tabular-nums leading-tight text-[#f8fafc]">{row.total}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {row.counts.map((count, index) =>
              count ? (
                <span key={report.projects[index]?.project ?? index} className="inline-flex items-center gap-1.5 rounded-[6px] border border-[#334155] bg-[#0f172a] px-2 py-0.5 text-[11px] text-[#cbd5e1]">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: projectColor(report, report.projects[index]?.project ?? "") }} />
                  {report.projects[index]?.project}
                  <strong className="font-mono font-bold text-[#f8fafc]">{count}</strong>
                </span>
              ) : null
            )}
          </div>
        </li>
      ))}
      <li className="flex items-center justify-between gap-3 border-t border-[#38bdf8]/30 bg-[rgba(56,189,248,0.06)] px-4 py-3">
        <span className="text-[12.5px] font-bold text-[#f8fafc]">Grand Total</span>
        <span className="font-mono text-[14px] font-bold tabular-nums text-[#f8fafc]">{report.total}</span>
      </li>
    </ul>
  );
}
