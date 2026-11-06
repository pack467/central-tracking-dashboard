"use client";

import { useEffect, useRef, useState } from "react";
import { StickyNote } from "lucide-react";

/** Display-only bullet normalization. The stored memo stays untouched. */
export function MemoPreview({ memo, onOpen }: { memo: string; onOpen: () => void }) {
  const points = memo.split(/\r?\n/).map(line => line.replace(/^\s*[•*-]\s+/, "").trim()).filter(Boolean);
  const list = useRef<HTMLUListElement>(null);
  const [clipped, setClipped] = useState(points.length > 5);
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
  return <button type="button" onClick={onOpen} aria-label={points.length ? "Buka memo dan catatan shift lengkap" : "Tulis memo dan catatan shift"} className="relative h-[176px] min-h-[176px] w-full shrink-0 overflow-hidden rounded-lg border border-slate-700/50 border-l-[3px] border-l-amber-400 bg-slate-950/40 p-4 text-left text-[14px] leading-6 text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 lg:hidden">
    {points.length ? <>
      <div className="relative h-[120px] overflow-hidden">
        <ul ref={list} className="m-0 h-[120px] list-disc space-y-2 overflow-hidden pl-3.5 marker:text-amber-400">
          {points.map((point, index) => <li key={index}>{point}</li>)}
        </ul>
        {clipped && <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-slate-950/90 to-transparent" />}
      </div>
      <span className="mt-2 block h-4 text-[11px] leading-4 font-semibold text-amber-300">{clipped ? "Selengkapnya" : ""}</span>
    </> : <span className="flex h-full items-center gap-3"><StickyNote size={24} className="shrink-0 text-amber-400" /><span className="flex flex-col gap-2"><span>Belum ada catatan</span><span className="inline-flex min-h-11 w-fit items-center rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 text-[13px] font-semibold text-amber-300">Tulis</span></span></span>}
  </button>;
}
