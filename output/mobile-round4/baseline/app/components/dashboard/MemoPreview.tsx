"use client";

import { useEffect, useRef, useState } from "react";
import { StickyNote } from "lucide-react";

/** Display-only bullet normalization. The stored memo stays untouched. */
export function MemoPreview({ memo, onOpen }: { memo: string; onOpen: () => void }) {
  const points = memo.split(/\r?\n/).map(line => line.replace(/^\s*[•*-]\s+/, "").trim()).filter(Boolean);
  const list = useRef<HTMLUListElement>(null);
  const [clipped, setClipped] = useState(points.length > 3);
  useEffect(() => {
    const element = list.current;
    if (!element) return;
    const measure = () => setClipped(element.scrollHeight > element.clientHeight + 1);
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, [memo]);
  return <button type="button" onClick={onOpen} aria-label={points.length ? "Buka memo dan catatan shift lengkap" : "Tulis memo dan catatan shift"} className="relative h-[108px] w-full shrink-0 overflow-hidden rounded-lg border border-slate-700/50 border-l-[3px] border-l-amber-400 bg-slate-950/40 p-3 text-left text-[13px] leading-5 text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 lg:hidden">
    {points.length ? <>
      <div className="relative h-[60px] overflow-hidden">
        <ul ref={list} className="m-0 h-[60px] list-disc space-y-1.5 overflow-hidden pl-3.5 marker:text-amber-400">
          {points.map((point, index) => <li key={index}>{point}</li>)}
        </ul>
        {clipped && <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-slate-950/90 to-transparent" />}
      </div>
      <span className="mt-1.5 block h-4 text-[11px] leading-4 font-semibold text-amber-300">{clipped ? "Selengkapnya" : ""}</span>
    </> : <span className="flex h-full items-center gap-2.5"><StickyNote size={20} className="shrink-0 text-amber-400" /><span className="flex flex-col gap-1"><span>Belum ada catatan</span><span className="text-[11px] font-semibold text-amber-300">Tulis</span></span></span>}
  </button>;
}
