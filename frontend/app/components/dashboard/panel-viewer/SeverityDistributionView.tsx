"use client";

import type { TicketSeverity } from "@/app/lib/types";
import { DistributionDonut, DistributionStat, useDistributionFocus, type DonutRenderer } from "./DistributionDonut";

interface SeverityDistributionViewProps {
  priorityCounts: Record<TicketSeverity, number>;
  total: number;
  priorityColors: Record<TicketSeverity, string>;
  severityStyles: Record<TicketSeverity, { borderLeft: string; dot: string; bar: string }>;
  renderDonutSlices: DonutRenderer;
}
const severities: TicketSeverity[] = ["High", "Medium", "Low"];
const tones = { High: "text-orange-400", Medium: "text-amber-400", Low: "text-teal-400" } as const;

export function SeverityDistributionView({ priorityCounts, total, priorityColors, severityStyles, renderDonutSlices }: SeverityDistributionViewProps) {
  const focus = useDistributionFocus();
  const slices = severities.map(label => ({ label, count: priorityCounts[label], color: priorityColors[label] }));
  const percent = (key: TicketSeverity) => total ? Math.round(priorityCounts[key] / total * 100) : 0;
  const ratios = severities.map((key, index) => ({ key, share: total ? priorityCounts[key] / total * 100 : 0, x: total ? severities.slice(0, index).reduce((sum, severity) => sum + priorityCounts[severity], 0) / total * 100 : 0 }));
  return <div className="flex min-w-0 flex-none flex-col gap-3 lg:min-h-0 lg:flex-1" data-distribution-view="severity">
    <div className="grid shrink-0 grid-cols-2 gap-2.5 lg:grid-cols-4">{severities.map(key => <DistributionStat key={key} label={`${key} · ${percent(key)}%`} value={priorityCounts[key]} tone={tones[key]} />)}</div>
    <div data-distribution-layout className="grid min-w-0 gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <DistributionDonut slices={slices} total={total} renderDonutSlices={renderDonutSlices} focus={focus} />
      <div data-distribution-list-panel className="flex min-w-0 flex-col gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-4 lg:min-h-0 lg:p-6">
        <div className="grid min-h-[228px] grid-cols-2 auto-rows-fr gap-3 lg:flex-1">
          {severities.map(key => <button key={key} type="button" data-severity-card={key} {...focus.interactions(key)} aria-pressed={focus.active === key} aria-label={`${key}: ${priorityCounts[key]} tiket, ${percent(key)}%`} className={`flex min-h-[108px] min-w-0 flex-col justify-between gap-2 rounded-xl border border-l-[3px] p-3 text-left transition-opacity duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${severityStyles[key].borderLeft} ${focus.active === key ? "border-y-sky-400/50 border-r-sky-400/50 bg-sky-400/10" : "border-y-slate-700/60 border-r-slate-700/60 bg-slate-900/70"} ${focus.active && focus.active !== key ? "opacity-45" : "opacity-100"}`}>
            <span className="flex w-full items-center justify-between gap-1 text-[12px] font-semibold"><span className="inline-flex items-center gap-1.5"><span className={`size-2 shrink-0 rounded-full ${severityStyles[key].dot}`} />{key}</span><span className="text-[11px] font-mono text-slate-400">{percent(key)}%</span></span>
            <strong className={`text-[40px] leading-none font-mono font-bold tabular-nums ${tones[key]}`}>{priorityCounts[key]}</strong>
            <svg aria-hidden="true" className="h-2 w-full overflow-hidden rounded-full bg-slate-800"><rect width={`${percent(key)}%`} height="8" rx="4" fill={priorityColors[key]} /></svg>
          </button>)}
        </div>
        <div className="flex shrink-0 flex-col gap-1.5" aria-label="Rasio severity">
          <span className="text-[11px] leading-[14px] text-slate-400">Rasio severity</span>
          <div role="img" aria-label="Bar rasio severity" className="flex h-3.5 w-full overflow-hidden rounded-full bg-slate-800">
            {ratios.map(({ key, share }) => <svg key={key} width={`${share}%`} height="14" className="h-3.5 shrink-0" opacity={focus.active && focus.active !== key ? .45 : 1} aria-label={`${key}: ${percent(key)}%`}><title>{key}: {percent(key)}%</title><rect width="100%" height="14" fill={priorityColors[key]} />{share >= 10 && <text x="50%" y="10.5" textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="600" fontFamily="var(--font-mono)">{percent(key)}%</text>}</svg>)}
          </div>
        </div>
        <div className="flex shrink-0 flex-col overflow-hidden rounded-lg border border-slate-700/60 bg-slate-900/60 lg:h-[clamp(252px,30vh,332px)]">
          <table className="flex h-full w-full flex-col text-left text-[12px]" aria-label="Rincian severity">
            <thead className="shrink-0 border-b border-slate-700 text-[11px] text-slate-400"><tr className="grid h-8 grid-cols-[minmax(0,1fr)_64px_64px] items-center px-3"><th className="font-semibold">Severity</th><th className="text-right font-semibold">Tiket</th><th className="text-right font-semibold">Persen</th></tr></thead>
            <tbody className="flex flex-1 flex-col justify-center divide-y divide-slate-800/60">
              {severities.map(key => <tr key={key} className="flex min-h-11 max-h-16 flex-1"><td colSpan={3} className="flex w-full p-0"><button type="button" data-distribution-row={key} data-count={priorityCounts[key]} {...focus.interactions(key)} aria-pressed={focus.active === key} aria-label={`${key}: ${priorityCounts[key]} tiket, ${percent(key)}%`} className={`grid min-h-11 w-full grid-cols-[minmax(0,1fr)_64px_64px] items-center px-3 text-left transition-opacity duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400 ${focus.active === key ? "bg-sky-400/10" : "hover:bg-slate-800/60"} ${focus.active && focus.active !== key ? "opacity-45" : "opacity-100"}`}><span className="inline-flex items-center gap-2"><span className={`size-2 rounded-full ${severityStyles[key].dot}`} />{key}</span><strong className="text-right font-mono">{priorityCounts[key]}</strong><span className="text-right font-mono text-slate-400">{percent(key)}%</span></button></td></tr>)}
            </tbody>
            <tfoot className="sticky bottom-0 shrink-0 border-t border-slate-700 bg-slate-900 font-mono font-bold"><tr className="grid h-11 grid-cols-[minmax(0,1fr)_64px_64px] items-center px-3"><td>Total</td><td className="text-right text-sky-400">{total}</td><td className="text-right">100%</td></tr></tfoot>
          </table>
        </div>
      </div>
    </div>
  </div>;
}
