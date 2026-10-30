"use client";

import { useMemo, useState } from "react";
import { Layers, TrendingUp } from "lucide-react";
import { useContainerDimensions } from "@/app/hooks/useContainerDimensions";
import { wholeStep } from "@/app/lib/chart-scale";
import { formatDeltaPct, monthShort, type MomComparison as MomData } from "@/app/lib/mom-comparison";

const CURR = "#38bdf8";
const PREV = "#a78bfa";

interface Props {
  data: MomData;
  /** "compact" on the dashboard card, "full" in the expanded panel (adds the summary cards). */
  variant: "compact" | "full";
  view: "trajectory" | "project";
  onViewChange: (view: "trajectory" | "project") => void;
  projectLabel: (project: string) => string;
  projectColor: (project: string) => string;
}

const nf = (value: number) => value.toLocaleString("id-ID");

function DeltaPill({ curr, prev, betterWhenLower = false, neutral = false }: { curr: number; prev: number; betterWhenLower?: boolean; neutral?: boolean }) {
  const text = formatDeltaPct(curr, prev);
  const up = curr > prev, down = curr < prev;
  const good = neutral ? null : betterWhenLower ? down : up;
  const tone = !up && !down ? "border-slate-500/30 bg-slate-500/10 text-slate-300" : good === null ? "border-sky-400/30 bg-sky-400/10 text-sky-300" : good ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-rose-400/30 bg-rose-400/10 text-rose-300";
  return <span className={`inline-flex h-[20px] items-center rounded-full border px-2 font-mono text-[10.5px] font-bold tabular-nums ${tone}`}>{text}</span>;
}

/**
 * Bulan Lalu vs Bulan Ini, shared by the dashboard card and the expanded panel. Hover state lives here, so moving over the chart re-renders
 * only this component (not the whole dashboard).
 */
export function MomComparison({ data, variant, view, onViewChange, projectLabel, projectColor }: Props) {
  const { current, previous, throughDay } = data;
  const empty = current.total === 0 && data.previousFullTotal === 0;
  const range = `1–${throughDay}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 mom-chart-container">
      {/* Which months, over which days, and the switch between the trend and the per-system view */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-[10px] border border-[rgba(148,163,184,0.12)] bg-[rgba(148,163,184,0.04)] px-3 py-2 mom-subview-toggle-bar">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-[var(--ink-secondary)]">
          <span className="inline-flex items-center gap-1.5"><i className="inline-block h-[3px] w-3.5 rounded-full" style={{ background: CURR }} /><strong className="font-semibold text-[var(--ink-primary)]">{current.label}</strong><span className="text-[var(--ink-muted)]">bulan ini</span></span>
          <span className="inline-flex items-center gap-1.5"><i className="inline-block h-0 w-3.5 border-t-2 border-dashed" style={{ borderColor: PREV }} /><strong className="font-semibold text-[var(--ink-primary)]">{previous.label}</strong><span className="text-[var(--ink-muted)]">bulan lalu</span></span>
          <span className="inline-flex items-center gap-1.5 text-[var(--ink-muted)]" title={`Kedua bulan dibandingkan pada tanggal yang sama (${range}), supaya bulan yang belum selesai tidak dibandingkan dengan sebulan penuh`}>
            tanggal {range}: <strong className="font-mono text-[var(--ink-primary)]">{nf(current.total)}</strong> vs <strong className="font-mono text-[var(--ink-primary)]">{nf(previous.total)}</strong> tiket <DeltaPill curr={current.total} prev={previous.total} neutral />
          </span>
        </div>
        <div role="group" aria-label="Tampilan perbandingan" className="flex gap-1.5 mom-toggle-btns">
          {([["trajectory", "Tren", TrendingUp], ["project", "Per Sistem", Layers]] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              onClick={() => onViewChange(id)}
              className={`inline-flex items-center gap-1.5 rounded-[7px] border px-2.5 py-1 text-[11px] font-semibold transition-colors mom-toggle-btn ${view === id ? "border-sky-400/40 bg-sky-400/15 text-sky-300 active" : "border-[rgba(148,163,184,0.15)] text-[var(--ink-secondary)] hover:bg-white/5 hover:text-[var(--ink-primary)]"}`}
            >
              <Icon size={12} aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
      </div>

      {variant === "full" && (
        <div className="grid grid-cols-4 gap-2.5 max-[860px]:grid-cols-2">
          {[
            { label: "Tiket dibuka", curr: current.total, prev: previous.total, format: nf, neutral: true },
            { label: "Selesai", curr: current.resolved, prev: previous.resolved, format: nf },
            { label: "Rata-rata durasi", curr: current.avgResolution, prev: previous.avgResolution, format: (v: number) => `${nf(v)} mnt`, lower: true },
            { label: "Kepatuhan SLA", curr: current.slaRate, prev: previous.slaRate, format: (v: number) => `${v}%` },
          ].map((card) => (
            <div key={card.label} className="flex flex-col gap-1.5 rounded-[10px] border border-[rgba(148,163,184,0.12)] bg-slate-900/60 p-[10px_12px]">
              <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--ink-muted)]">{card.label}</span>
              <div className="flex items-baseline justify-between gap-2">
                <strong className="font-mono text-[19px] font-extrabold tabular-nums text-[var(--ink-primary)]">{card.curr === null ? "—" : card.format(card.curr)}</strong>
                {card.curr !== null && card.prev !== null && <DeltaPill curr={card.curr} prev={card.prev} betterWhenLower={card.lower} neutral={card.neutral} />}
              </div>
              <span className="text-[10.5px] text-[var(--ink-muted)]">bulan lalu: <span className="font-mono text-[var(--ink-secondary)]">{card.prev === null ? "—" : card.format(card.prev)}</span></span>
            </div>
          ))}
        </div>
      )}

      {empty ? (
        <div role="status" className="flex flex-1 min-h-[240px] flex-col items-center justify-center gap-2 text-center">
          <p className="m-0 text-[14px] font-semibold text-[var(--ink-primary)]">Belum ada tiket bulan ini maupun bulan lalu</p>
          <p className="m-0 text-[12.5px] text-[var(--ink-muted)]">Perbandingan muncul setelah ada tiket.</p>
        </div>
      ) : view === "trajectory" ? (
        <MomTrend data={data} tall={variant === "full"} />
      ) : (
        <MomByProject data={data} projectLabel={projectLabel} projectColor={projectColor} />
      )}
    </div>
  );
}

function MomTrend({ data, tall }: { data: MomData; tall: boolean }) {
  const [ref, size] = useContainerDimensions<HTMLDivElement>();
  const [mode, setMode] = useState<"cumulative" | "daily">("cumulative");
  const [hover, setHover] = useState<number | null>(null);
  const { days, throughDay, current, previous } = data;

  const width = Math.max(320, Math.round(size.width || 760));
  const height = Math.max(tall ? 320 : 250, Math.round(size.height || (tall ? 420 : 300)));
  const left = 44, right = 18, top = 22, bottom = 30;
  const plotW = width - left - right, plotH = height - top - bottom;
  const last = days.length;
  const xOf = (day: number) => left + ((day - 1) / Math.max(1, last - 1)) * plotW;
  const valueOf = (d: (typeof days)[number], which: "curr" | "prev") => (mode === "cumulative" ? (which === "curr" ? d.currCum : d.prevCum) : d[which]);

  const scale = useMemo(() => {
    const max = Math.max(4, ...days.map((d) => Math.max(valueOf(d, "curr") ?? 0, valueOf(d, "prev") ?? 0)));
    const step = wholeStep(max / 4);
    const yMax = Math.ceil(max / step) * step;
    const ticks: number[] = [];
    for (let v = 0; v <= yMax; v += step) ticks.push(v);
    return { yMax, ticks };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, mode]);
  const yOf = (value: number) => top + plotH - (value / scale.yMax) * plotH;

  const line = (which: "curr" | "prev") => {
    let path = "";
    for (const d of days) {
      const value = valueOf(d, which);
      if (value === null) continue;
      path += `${path ? " L" : "M"} ${xOf(d.day).toFixed(1)} ${yOf(value).toFixed(1)}`;
    }
    return path;
  };
  const area = (which: "curr" | "prev") => {
    const points = days.filter((d) => valueOf(d, which) !== null);
    if (!points.length) return "";
    return `${line(which)} L ${xOf(points[points.length - 1].day).toFixed(1)} ${top + plotH} L ${xOf(points[0].day).toFixed(1)} ${top + plotH} Z`;
  };
  const xTicks = [1, 5, 10, 15, 20, 25, last].filter((day, i, list) => day <= last && list.indexOf(day) === i && (day === last || last - day >= 3));
  const todayX = xOf(throughDay);
  const currEnd = days[throughDay - 1];
  const hovered = hover !== null ? days[hover - 1] : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-[var(--ink-muted)]">{mode === "cumulative" ? "Jumlah tiket terkumpul sejak tanggal 1" : "Tiket per tanggal"}</span>
        <div role="group" aria-label="Cara menghitung" className="inline-flex rounded-[7px] border border-[rgba(148,163,184,0.15)] p-[2px]">
          {([["cumulative", "Kumulatif"], ["daily", "Harian"]] as const).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={mode === id} onClick={() => setMode(id)} className={`rounded-[5px] px-2 py-[2px] text-[10.5px] font-semibold ${mode === id ? "bg-sky-400/15 text-sky-300" : "text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"}`}>{label}</button>
          ))}
        </div>
      </div>
      <div ref={ref} className={`relative w-full flex-1 ${tall ? "min-h-[320px]" : "min-h-[250px]"}`}>
        <svg
          className="absolute inset-0 size-full select-none"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Tren tiket ${current.label} dibanding ${previous.label}`}
          onMouseMove={(event) => {
            const box = event.currentTarget.getBoundingClientRect();
            const x = ((event.clientX - box.left) / box.width) * width;
            setHover(Math.max(1, Math.min(last, Math.round(((x - left) / plotW) * (last - 1)) + 1)));
          }}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="momCurrFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={CURR} stopOpacity="0.28" /><stop offset="100%" stopColor={CURR} stopOpacity="0" /></linearGradient>
            <linearGradient id="momPrevFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={PREV} stopOpacity="0.14" /><stop offset="100%" stopColor={PREV} stopOpacity="0" /></linearGradient>
          </defs>
          {scale.ticks.map((tick) => (
            <g key={tick}>
              <line x1={left} x2={width - right} y1={yOf(tick)} y2={yOf(tick)} stroke={tick === 0 ? "rgba(148,163,184,0.35)" : "rgba(148,163,184,0.1)"} strokeDasharray={tick === 0 ? undefined : "3 4"} />
              <text x={left - 8} y={yOf(tick) + 3.5} textAnchor="end" fill="#94a3b8" fontSize="10.5" fontFamily="var(--font-mono)">{nf(tick)}</text>
            </g>
          ))}
          {/* days still to come this month: a soft band, so the stop of the blue line reads as "today" and not as a drop */}
          {throughDay < last && <rect x={todayX} y={top} width={width - right - todayX} height={plotH} fill="rgba(148,163,184,0.04)" />}
          <path d={area("prev")} fill="url(#momPrevFill)" />
          <path d={area("curr")} fill="url(#momCurrFill)" />
          <path d={line("prev")} fill="none" stroke={PREV} strokeWidth="2" strokeDasharray="5 4" strokeLinejoin="round" />
          <path d={line("curr")} fill="none" stroke={CURR} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          <line x1={todayX} x2={todayX} y1={top - 6} y2={top + plotH} stroke="rgba(56,189,248,0.45)" strokeDasharray="2 3" />
          <text x={Math.min(width - right - 4, todayX + 4)} y={top - 8} textAnchor={todayX > width - 90 ? "end" : "start"} fill="#7dd3fc" fontSize="10" fontWeight="700">Hari ini · tgl {throughDay}</text>
          {currEnd && valueOf(currEnd, "curr") !== null && (
            <circle cx={todayX} cy={yOf(valueOf(currEnd, "curr") as number)} r="4" fill={CURR} stroke="#0f172a" strokeWidth="2" />
          )}
          {xTicks.map((day) => (
            <text key={day} x={xOf(day)} y={height - 10} textAnchor={day === 1 ? "start" : day === last ? "end" : "middle"} fill="#94a3b8" fontSize="10.5" fontFamily="var(--font-mono)">{day}</text>
          ))}
          {hovered && (
            <g pointerEvents="none">
              <line x1={xOf(hovered.day)} x2={xOf(hovered.day)} y1={top} y2={top + plotH} stroke="rgba(148,163,184,0.45)" />
              {valueOf(hovered, "prev") !== null && <circle cx={xOf(hovered.day)} cy={yOf(valueOf(hovered, "prev") as number)} r="3.5" fill={PREV} stroke="#0f172a" strokeWidth="1.5" />}
              {valueOf(hovered, "curr") !== null && <circle cx={xOf(hovered.day)} cy={yOf(valueOf(hovered, "curr") as number)} r="4" fill={CURR} stroke="#0f172a" strokeWidth="1.5" />}
            </g>
          )}
        </svg>
        {hovered && (
          <div
            role="status"
            className="pointer-events-none absolute top-2 z-10 w-[200px] rounded-lg border border-slate-600/70 bg-slate-950/95 p-2.5 text-[11px] shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
            style={{ left: Math.min(Math.max(0, (xOf(hovered.day) / width) * (size.width || width) + 12), (size.width || width) - 210) }}
          >
            <div className="mb-1.5 font-semibold text-[var(--ink-primary)]">Tanggal {hovered.day}</div>
            {([["curr", current.key, CURR], ["prev", previous.key, PREV]] as const).map(([which, key, color]) => {
              const daily = hovered[which], cumulative = which === "curr" ? hovered.currCum : hovered.prevCum;
              return (
                <div key={which} className="flex items-center justify-between gap-2 py-[1px]">
                  <span className="inline-flex items-center gap-1.5 text-[var(--ink-secondary)]"><i className="inline-block size-2 rounded-full" style={{ background: color }} />{hovered.day} {monthShort(key)}</span>
                  <span className="font-mono text-[var(--ink-primary)]">{daily === null ? (which === "curr" ? "belum" : "—") : `${daily} · Σ ${cumulative}`}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MomByProject({ data, projectLabel, projectColor }: { data: MomData; projectLabel: (p: string) => string; projectColor: (p: string) => string }) {
  const max = Math.max(1, ...data.projects.map((row) => Math.max(row.curr, row.prev)));
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1">
      <div className="grid grid-cols-[minmax(84px,140px)_minmax(0,1fr)_64px] items-center gap-3 px-1 pb-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--ink-muted)]">
        <span>Sistem</span><span>Tanggal 1–{data.throughDay}</span><span className="text-right">Selisih</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
        {data.projects.map((row) => (
          <div key={row.project} className="grid grid-cols-[minmax(84px,140px)_minmax(0,1fr)_64px] items-center gap-3 rounded-lg px-1 py-1.5 hover:bg-white/[0.03]">
            <span className="inline-flex min-w-0 items-center gap-2 text-[12px] font-semibold text-[var(--ink-primary)]">
              <i className="inline-block size-[9px] shrink-0 rounded-[2.5px]" style={{ background: projectColor(row.project) }} />
              <span className="truncate" title={projectLabel(row.project)}>{projectLabel(row.project)}</span>
            </span>
            <span className="flex min-w-0 flex-col gap-[3px]">
              {([["curr", row.curr, CURR, "bulan ini"], ["prev", row.prev, PREV, "bulan lalu"]] as const).map(([key, value, color, label]) => (
                <span key={key} className="flex items-center gap-2" title={`${label}: ${value} tiket`}>
                  <span className="h-[8px] rounded-full" style={{ width: `${Math.max(value ? 2 : 0, (value / max) * 100)}%`, background: color, opacity: key === "prev" ? 0.75 : 1 }} />
                  <span className="font-mono text-[10.5px] tabular-nums text-[var(--ink-secondary)]">{nf(value)}</span>
                </span>
              ))}
            </span>
            <span className="text-right"><DeltaPill curr={row.curr} prev={row.prev} neutral /></span>
          </div>
        ))}
      </div>
    </div>
  );
}
