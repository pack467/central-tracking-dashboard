"use client";
export function MasterDataSkeleton() {
  return <div className="w-full min-w-0 space-y-4 motion-safe:animate-pulse" aria-busy="true" aria-label="Memuat Master Data">
    <div className="hidden h-4 w-72 max-w-full rounded bg-slate-800 lg:block" />
    <div className="rounded-2xl border border-[rgba(148,163,184,0.12)] bg-gradient-to-br from-sky-400/[0.06] to-transparent px-3 py-3 lg:px-5 lg:py-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3"><div className="size-11 rounded-xl bg-slate-700/70" /><div className="space-y-2"><div className="h-6 w-40 rounded bg-slate-700/70" /><div className="h-5 w-52 rounded-full bg-slate-800" /></div></div>
        <div className="flex items-center gap-2"><div className="flex gap-2">{Array.from({ length: 3 }, (_, i) => <div key={i} className="h-[68px] w-[152px] rounded-xl border border-slate-700/60 bg-slate-800/60 xl:w-[158px]" />)}</div><div className="h-8 w-36 rounded-full bg-slate-800" /></div>
      </div>
    </div>
    <div className="hidden h-11 items-center gap-2 rounded-2xl border border-slate-700/70 bg-slate-800/50 p-1 lg:flex"><div className="h-8 w-40 rounded-lg bg-slate-700/70" /><div className="h-8 w-32 rounded-lg bg-slate-800" /><div className="h-6 w-px bg-slate-700" /><div className="h-8 w-28 rounded-lg bg-slate-700/70" /><div className="h-8 w-24 rounded-lg bg-slate-800" /><div className="h-8 w-24 rounded-lg bg-slate-800" /></div>
    <div className="h-[122px] rounded-xl border border-slate-700/70 bg-slate-800 lg:hidden" />
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-700/70 bg-[#0f172a]/80 px-3 py-3"><div className="flex items-center gap-2"><div className="h-10 flex-1 rounded-lg bg-slate-800 lg:max-w-[340px]" /><div className="hidden h-10 flex-1 rounded-lg bg-slate-800 lg:block" /><div className="h-10 w-32 rounded-lg bg-slate-800" /></div></div>
      <div className="overflow-hidden rounded-2xl border border-slate-700/70 bg-[#1e293b]">
        <div className="hidden h-10 items-center gap-4 border-b border-slate-700/70 bg-[#182234] px-4 lg:flex">{[34, 12, 22, 10, 12].map((width, i) => <div key={i} style={{ width: `${width}%` }} className="h-2.5 rounded bg-slate-700/70" />)}<div className="ml-auto h-2.5 w-14 rounded bg-slate-700/70" /></div>
        {Array.from({ length: 8 }, (_, i) => <div key={i} className="flex h-[139px] items-center gap-3 border-t border-slate-700/60 px-4 lg:h-16"><div className="size-10 shrink-0 rounded-lg bg-slate-700/70 lg:size-9" /><div className="min-w-0 flex-1 space-y-2"><div className="h-3 w-2/5 rounded bg-slate-700/70" /><div className="h-2.5 w-1/4 rounded bg-slate-700/50" /></div><div className="hidden h-5 w-20 rounded-full bg-slate-700/60 lg:block" /><div className="h-5 w-16 rounded-full bg-slate-700/60" /></div>)}
        <div className="flex h-11 items-center justify-between border-t border-slate-700/60 px-4"><div className="h-2.5 w-20 rounded bg-slate-700/60" /><div className="h-8 w-36 rounded-lg bg-slate-700/60" /></div>
      </div>
    </div>
  </div>;
}


