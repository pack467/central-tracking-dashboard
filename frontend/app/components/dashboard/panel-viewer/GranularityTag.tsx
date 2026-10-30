import { granularityBadge, type VolumeGranularity } from "@/app/lib/volume-buckets";

/** "PER MINGGU · 93 hari": how an expanded chart groups its range, at the end of its legend row. */
export function GranularityTag({ granularity, days }: { granularity: VolumeGranularity; days: number }) {
  const detail = granularity === "week" ? `${days} hari, dikelompokkan Senin–Minggu` : granularity === "month" ? `${days} hari, dikelompokkan per bulan` : `${days} hari`;
  return (
    <span className="inline-flex items-center gap-2 text-[11px] font-mono text-slate-400" title={granularity === "day" ? undefined : "Rentang panjang dikelompokkan agar grafik tetap terbaca. Tabel tetap per hari."}>
      <span className="inline-flex h-5 items-center rounded-full border border-sky-400/30 bg-sky-400/10 px-2 text-[10px] font-bold uppercase tracking-[0.08em] text-sky-300">{granularityBadge(granularity)}</span>
      {detail}
    </span>
  );
}
