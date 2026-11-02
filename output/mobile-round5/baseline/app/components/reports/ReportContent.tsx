"use client";

import { BarChart3, CalendarDays, Layers3, Search, ShieldCheck, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { numericDate, type WeeklyReport } from "@/app/lib/weekly-report";

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

export function ReportDailyChart({ report }: { report: WeeklyReport }) {
  if (!report.total) return <ReportEmptyState kind="daily" />;
  const totals = report.days.map((_, index) => report.projects.reduce((sum, project) => sum + project.days[index], 0));
  const rawMax = Math.max(1, ...totals);

  // Integer scale calculation
  const stepValue = rawMax <= 6 ? 1 : Math.ceil(rawMax / 5);
  const intervals = rawMax <= 6 ? rawMax : 5;
  const scaleMax = stepValue * intervals;

  // Grid tick values from scaleMax down to 0
  const ticks = Array.from({ length: intervals + 1 }, (_, i) => scaleMax - i * stepValue);
  const step = 620 / Math.max(report.days.length, 1);

  return (
    <div className="flex flex-col justify-between h-full min-h-64 p-4 sm:p-5">
      <svg viewBox="0 0 660 225" className="w-full" role="img" aria-label="Grafik tiket harian per proyek">
        {ticks.map((tickVal) => {
          const y = 180 - (tickVal / scaleMax) * 160;
          return (
            <g key={tickVal}>
              <line x1="30" x2="650" y1={y} y2={y} stroke="#334155" strokeDasharray="3 5" />
              <text x="23" y={y + 3.5} fill="#94a3b8" fontSize="10" textAnchor="end" fontFamily="var(--font-mono)">
                {tickVal}
              </text>
            </g>
          );
        })}
        {report.days.map((day, index) => {
          let offset = 0;
          return (
            <g key={day}>
              {report.projects.map((project) => {
                const count = project.days[index];
                const height = (count / scaleMax) * 160;
                offset += height;
                return (
                  <g key={project.project}>
                    <rect
                      x={30 + step * index + step * 0.22}
                      y={180 - offset}
                      width={step * 0.56}
                      height={height}
                      rx={height > 4 ? 2 : 0}
                      fill={report.config.project_colors[project.project] ?? "#38bdf8"}
                    >
                      <title>{numericDate(day)} · {project.project}: {count}</title>
                    </rect>
                    {height >= 14 && (
                      <text
                        x={30 + step * (index + 0.5)}
                        y={180 - offset + height / 2 + 3.5}
                        fill="#ffffff"
                        fontSize="9"
                        fontWeight="600"
                        textAnchor="middle"
                      >
                        {count}
                      </text>
                    )}
                  </g>
                );
              })}
              <text
                x={30 + step * (index + 0.5)}
                y="202"
                fill="#94a3b8"
                fontSize={report.days.length > 14 ? 8 : 10}
                textAnchor="middle"
                fontFamily="var(--font-mono)"
              >
                {day.slice(8)}/{day.slice(5, 7)}
              </text>
              {totals[index] > 0 && (
                <text
                  x={30 + step * (index + 0.5)}
                  y={172 - (totals[index] / scaleMax) * 160}
                  fill="#f8fafc"
                  fontWeight="bold"
                  fontSize="10"
                  textAnchor="middle"
                  fontFamily="var(--font-mono)"
                >
                  {totals[index]}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-3 max-w-xl mx-auto w-full">
        {report.projects.map((project) => (
          <span key={project.project} className="inline-flex items-center gap-1.5 text-[11px] text-[#cbd5e1] truncate" title={project.project}>
            <span
              className="h-2 w-2 shrink-0 rounded-xs"
              style={{ backgroundColor: report.config.project_colors[project.project] ?? "#38bdf8" }}
            />
            <span className="truncate">{project.project}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
