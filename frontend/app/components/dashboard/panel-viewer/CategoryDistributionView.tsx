"use client";

import { useMasterReferences } from "@/app/hooks/useMasterReferences";
import { resolveCategoryColor } from "@/app/lib/category-colors";
import { Trophy } from "lucide-react";
import { DistributionDonut, DistributionEmptyNote, DistributionStat, useDistributionFocus, type DonutRenderer } from "./DistributionDonut";

interface CategoryDistributionViewProps {
  typeCounts: [string, number][];
  total: number;
  renderDonutSlices: DonutRenderer;
}

export function CategoryDistributionView({ typeCounts, total, renderDonutSlices }: CategoryDistributionViewProps) {
  const focus = useDistributionFocus();
  const { categoryLabel, categories } = useMasterReferences();
  const topCategory = typeCounts.reduce<[string, number]>((best, item) => item[1] > best[1] ? item : best, ["-", 0]);
  // the colour belongs to the category (set in Master Data), not to its place in this list
  const slices = typeCounts.map(([label, count]) => ({ label: categoryLabel(label), count, color: resolveCategoryColor(label, categories).hex }));
  const used = typeCounts.filter(([, count]) => count > 0).length;
  // the trophy marks the category with the most tickets, never a first row of zero
  const leader = (index: number) => index === 0 && (typeCounts[0]?.[1] ?? 0) > 0;
  if (!typeCounts.length) return <div className="flex flex-1 items-center justify-center text-[13px] text-slate-400">Tidak ada data</div>;
  return <div className="flex min-w-0 flex-none flex-col gap-3 lg:min-h-0 lg:flex-1" data-distribution-view="category">
    <div className="grid shrink-0 grid-cols-2 gap-2.5 lg:grid-cols-4">
      <DistributionStat label="Total tiket" value={total} tone="text-sky-400" />
      <DistributionStat label="Kategori terbanyak" value={topCategory[1] ? categoryLabel(topCategory[0]) : "—"} detail={topCategory[1] ? `${categoryLabel(topCategory[0])}: ${topCategory[1]} tiket` : undefined} tone="text-violet-300" />
      <DistributionStat label="Kategori terpakai" value={`${used} dari ${typeCounts.length}`} detail="Kategori yang punya tiket pada rentang ini" tone="text-emerald-400" />
      <DistributionStat label="Rata-rata per kategori" value={`${typeCounts.length ? Math.round(total / typeCounts.length) : 0} tiket`} tone="text-amber-400" />
    </div>
    <div data-distribution-layout className="grid min-w-0 gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <DistributionDonut slices={slices} total={total} renderDonutSlices={renderDonutSlices} focus={focus} />
      <div data-distribution-list-panel className="flex min-w-0 flex-col rounded-xl border border-slate-700/60 bg-slate-900/40 p-4 lg:min-h-0 lg:p-6">
        <div className="mb-3 flex h-8 shrink-0 items-center justify-between gap-2 border-b border-slate-700 pb-2 text-[11px] font-semibold text-slate-400"><span>Kategori, dari yang terbanyak</span><span>Tiket · Persen</span></div>
        {!total && <div className="mb-3 shrink-0"><DistributionEmptyNote /></div>}
        <div data-distribution-rows className="flex flex-1 flex-col gap-2 overflow-y-auto overscroll-contain [scrollbar-width:thin] lg:min-h-0">
          {slices.map((slice, index) => {
            const pct = total ? Math.round(slice.count / total * 100) : 0;
            return <button key={slice.label} type="button" data-distribution-row={slice.label} data-count={slice.count} {...focus.interactions(slice.label)} aria-pressed={focus.active === slice.label} aria-label={`${index + 1}. ${slice.label}: ${slice.count} tiket, ${pct}%`} className={`flex min-h-[64px] w-full flex-1 shrink-0 items-center gap-3 rounded-lg border px-3 py-2.5 text-left lg:min-h-[56px] lg:max-h-[88px] transition-opacity duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${focus.active === slice.label ? "border-sky-400/50 bg-sky-400/10" : leader(index) ? "border-sky-400/30 bg-slate-800/60" : "border-slate-700/60 bg-slate-900/60"} ${focus.active && focus.active !== slice.label ? "opacity-45" : "opacity-100"}`}>
              <span className={`grid size-8 shrink-0 place-items-center rounded-lg font-mono text-[12px] ${leader(index) ? "bg-sky-400/15 text-sky-300" : "bg-slate-800 text-slate-400"}`}>{leader(index) ? <Trophy size={16} /> : index + 1}</span>
              <span className="flex min-w-0 flex-1 flex-col gap-2.5">
                <span className="flex min-w-0 items-center justify-between gap-3"><span className="inline-flex min-w-0 items-center gap-2"><svg aria-hidden="true" className="size-2.5 shrink-0" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill={slice.color} /></svg><span className="truncate text-[15px] font-semibold text-slate-100" title={slice.label}>{slice.label}</span></span><span className="flex shrink-0 items-baseline gap-2 font-mono"><strong className={`text-[18px] ${slice.count ? "text-slate-100" : "text-slate-500"}`}>{slice.count}</strong><span className="text-[11px] text-slate-400">{pct}%</span></span></span>
                <svg aria-hidden="true" className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800" preserveAspectRatio="none"><rect width={`${pct}%`} height="10" rx="5" fill={slice.color} /></svg>
              </span>
            </button>;
          })}
        </div>
      </div>
    </div>
  </div>;
}
