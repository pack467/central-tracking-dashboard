"use client";

import type { TicketSeverity } from "@/app/lib/types";
import { TICKET_SEVERITIES } from "@/app/lib/severity";
import { DistributionDonut, DistributionEmptyNote, DistributionStat, useDistributionFocus, type DonutRenderer } from "./DistributionDonut";

interface SeverityDistributionViewProps {
  priorityCounts: Record<TicketSeverity, number>;
  total: number;
  priorityColors: Record<TicketSeverity, string>;
  severityStyles: Record<TicketSeverity, { borderLeft: string; dot: string; bar: string }>;
  renderDonutSlices: DonutRenderer;
}
const tones = { High: "text-orange-400", Medium: "text-amber-400", Low: "text-teal-400" } as const;
const tiles = { High: "border-orange-400/30 bg-orange-400/10", Medium: "border-amber-400/30 bg-amber-400/10", Low: "border-teal-400/30 bg-teal-400/10" } as const;

/**
 * Severity in full: four numbers on top, the donut on the left and on the right one row per severity (how many, what share),
 * under a single bar that shows the whole mix. Each number appears once.
 */
export function SeverityDistributionView({ priorityCounts, total, priorityColors, severityStyles, renderDonutSlices }: SeverityDistributionViewProps) {
  const focus = useDistributionFocus();
  const slices = TICKET_SEVERITIES.map(label => ({ label, count: priorityCounts[label], color: priorityColors[label] }));
  const percent = (key: TicketSeverity) => total ? Math.round(priorityCounts[key] / total * 100) : 0;
  const dimmed = (key: string) => focus.active && focus.active !== key;
  return <div className="flex min-w-0 flex-none flex-col gap-3 lg:min-h-0 lg:flex-1" data-distribution-view="severity">
    <div className="grid shrink-0 grid-cols-2 gap-2.5 lg:grid-cols-4">
      <DistributionStat label="Total tiket" value={total} tone="text-sky-400" />
      {TICKET_SEVERITIES.map(key => <DistributionStat key={key} label={`${key} · ${percent(key)}% dari total`} value={priorityCounts[key]} tone={tones[key]} />)}
    </div>
    <div data-distribution-layout className="grid min-w-0 gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <DistributionDonut slices={slices} total={total} renderDonutSlices={renderDonutSlices} focus={focus} />
      <div data-distribution-list-panel className="flex min-w-0 flex-col gap-4 rounded-xl border border-slate-700/60 bg-slate-900/40 p-4 lg:min-h-0 lg:p-6">
        <div className="flex shrink-0 flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[13px] font-semibold text-slate-100">Komposisi severity</span>
            <span className="text-[11px] text-slate-400">{total.toLocaleString("id-ID")} tiket</span>
          </div>
          <div role="img" aria-label={`Komposisi severity: ${TICKET_SEVERITIES.map(key => `${key} ${percent(key)}%`).join(", ")}`} className="flex h-3 w-full overflow-hidden rounded-full bg-slate-800">
            {TICKET_SEVERITIES.map(key => total && priorityCounts[key] ? <span key={key} className="h-full transition-opacity duration-150 motion-reduce:transition-none" style={{ width: `${priorityCounts[key] / total * 100}%`, background: priorityColors[key], opacity: dimmed(key) ? 0.45 : 1 }} /> : null)}
          </div>
          {!total && <DistributionEmptyNote />}
        </div>

        <div className="flex flex-col gap-2.5 lg:min-h-0 lg:flex-1" aria-label="Rincian severity">
          {TICKET_SEVERITIES.map(key => {
            const count = priorityCounts[key], pct = percent(key);
            return <button key={key} type="button" data-severity-card={key} data-distribution-row={key} data-count={count} {...focus.interactions(key)} aria-pressed={focus.active === key} aria-label={`${key}: ${count} tiket, ${pct}%`}
              className={`grid min-h-[84px] w-full min-w-0 grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-l-[3px] px-3.5 py-3 text-left transition-opacity duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 lg:max-h-[132px] lg:flex-1 ${severityStyles[key].borderLeft} ${focus.active === key ? "border-y-sky-400/50 border-r-sky-400/50 bg-sky-400/10" : "border-y-slate-700/60 border-r-slate-700/60 bg-slate-900/70"} ${dimmed(key) ? "opacity-45" : "opacity-100"}`}>
              <span aria-hidden="true" className={`grid size-10 place-items-center rounded-lg border ${tiles[key]}`}><span className={`size-3 rounded-full ${severityStyles[key].dot}`} /></span>
              <span className="flex min-w-0 flex-col gap-2">
                <span className="truncate text-[14px] font-semibold text-slate-100">{key}</span>
                <svg aria-hidden="true" className="h-2 w-full overflow-hidden rounded-full bg-slate-800" preserveAspectRatio="none"><rect width={`${pct}%`} height="8" rx="4" fill={priorityColors[key]} /></svg>
              </span>
              <span className="flex flex-col items-end gap-1 font-mono tabular-nums">
                <strong className={`text-[26px] font-bold leading-none ${count ? tones[key] : "text-slate-500"}`}>{count.toLocaleString("id-ID")}</strong>
                <span className="text-[11px] text-slate-400">{pct}%</span>
              </span>
            </button>;
          })}
        </div>
      </div>
    </div>
  </div>;
}
