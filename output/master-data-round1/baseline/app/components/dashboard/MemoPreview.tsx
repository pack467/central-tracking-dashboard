"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StickyNote, ChevronRight } from "lucide-react";

/** Display-only bullet normalization. The stored memo stays untouched. */
export function MemoPreview({ memo, onOpen, loading = false }: { memo: string; onOpen: () => void; loading?: boolean }) {
  const points = memo.split(/\r?\n/).map(line => line.replace(/^\s*[•*-]\s+/, "").trim()).filter(Boolean);
  const list = useRef<HTMLUListElement>(null);
  const [clipped, setClipped] = useState(points.length >= 4);
  const attachList = useCallback((element: HTMLUListElement | null) => {
    list.current = element;
    if (element) setClipped(element.scrollHeight > element.clientHeight + 1);
  }, []);
  useEffect(() => {
    const element = list.current;
    if (!element) return;
    let frame = 0, active = true;
    const measure = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => { if (active) setClipped(element.scrollHeight > element.clientHeight + 1); }); };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    void document.fonts.ready.then(() => { if (active) measure(); });
    return () => { active = false; cancelAnimationFrame(frame); observer.disconnect(); };
  }, [memo]);
  return <button type="button" onClick={onOpen} disabled={loading} data-memo-preview data-loading={loading || undefined} aria-label={points.length ? "Buka memo dan catatan shift lengkap" : "Tulis memo dan catatan shift"} className={`relative w-full shrink-0 overflow-hidden rounded-xl border border-slate-700/50 bg-[#0f172a]/60 p-3.5 text-left text-[14px] leading-[1.6] text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 lg:hidden ${points.length ? "border-l-[3px] border-l-amber-400" : "border-dashed"} ${loading ? "pointer-events-none [&_[data-memo-copy]]:text-transparent [&_[data-memo-copy]]:bg-slate-700/40 [&_[data-memo-copy]]:rounded [&_[data-memo-copy]]:animate-pulse motion-reduce:[&_*]:animate-none" : "active:bg-[#0f172a]/80"}`}>
    {points.length ? <>
      <div className="relative overflow-hidden">
        <ul ref={attachList} className="m-0 max-h-[89.6px] list-disc space-y-2 overflow-hidden p-0 marker:text-transparent [overflow-wrap:anywhere]">
          {points.map((point, index) => <li key={index} className="relative pl-4"><span aria-hidden="true" className="absolute top-[8px] left-0 size-1.5 rounded-full bg-amber-400" /><span data-memo-copy>{point}</span></li>)}
        </ul>
        {clipped && <span data-memo-fade aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-[linear-gradient(to_bottom,transparent,color-mix(in_srgb,#0f172a_60%,#1e293b))]" />}
      </div>
      {clipped && <span data-memo-more className="mt-2 flex h-11 items-center justify-end gap-1.5 text-[12px] leading-4 font-semibold text-amber-300">Selengkapnya<ChevronRight size={16} /></span>}
    </> : <span className="flex min-h-11 items-center gap-3"><StickyNote size={22} className="shrink-0 text-amber-400/60" /><span className="min-w-0 flex-1">Belum ada catatan</span><span className="inline-flex h-11 shrink-0 items-center rounded-lg border border-slate-700 bg-[#243044] px-3 text-[13px] font-semibold text-amber-300">Tulis</span></span>}
  </button>;
}
