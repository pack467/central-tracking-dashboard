"use client";

import { Children, cloneElement, isValidElement, useState, type ReactNode, type SVGProps } from "react";
import { useContainerDimensions } from "@/app/hooks/useContainerDimensions";
import { useCompactLayout, useMobileLayout } from "@/app/hooks/useMobileLayout";

export interface DistributionSlice { label: string; count: number; color: string }
export type DonutRenderer = (slices: DistributionSlice[], cx: number, cy: number, radius: number, strokeWidth: number, gapAngle?: number) => ReactNode;
type InteractiveCircleProps = SVGProps<SVGCircleElement> & { "data-distribution-segment"?: string; "data-focus-ring"?: "none" };

export function useDistributionFocus() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const active = hovered ?? focused ?? pinned;
  const toggle = (key: string) => { setPinned(previous => previous === key ? null : key); setFocused(null); };
  const interactions = (key: string) => ({
    onPointerEnter: (event: { pointerType: string }) => { if (event.pointerType !== "touch") { setFocused(null); setHovered(key); } },
    onPointerLeave: () => setHovered(null),
    onFocus: () => { setHovered(null); setFocused(key); },
    onBlur: () => setFocused(null),
    onClick: () => toggle(key),
  });
  return { active, interactions, toggle };
}
export type DistributionFocus = ReturnType<typeof useDistributionFocus>;

export function DistributionStat({ label, value, detail, tone = "text-white" }: { label: string; value: ReactNode; detail?: string; tone?: string }) {
  return <div className="flex h-[60px] min-w-0 flex-col justify-center rounded-xl border border-slate-700/60 bg-slate-900/70 px-3.5 py-2" title={detail}>
    <span className="truncate text-[11px] font-mono text-slate-400">{label}</span>
    <strong className={`truncate text-[20px] leading-tight font-mono font-bold tabular-nums ${tone}`}>{value}</strong>
  </div>;
}

export function DistributionDonut({ slices, total, renderDonutSlices, focus }: { slices: DistributionSlice[]; total: number; renderDonutSlices: DonutRenderer; focus: DistributionFocus }) {
  const [panelRef, dimensions] = useContainerDimensions<HTMLDivElement>();
  const compact = useCompactLayout(), phone = useMobileLayout();
  const diameter = phone ? 220 : compact ? 300 : dimensions.width ? Math.max(240, Math.min(dimensions.width - 16, dimensions.height - 112, 520)) : 300;
  const selected = slices.find(slice => slice.label === focus.active);
  const visibleSlices = slices.filter(slice => slice.count > 0);
  const circles = Children.toArray(renderDonutSlices(slices, 100, 100, 84, 32, 2));
  return <div ref={panelRef} data-distribution-donut-panel className="flex min-w-0 flex-col items-center justify-center gap-4 rounded-xl border border-slate-700/60 bg-slate-900/40 p-4 lg:min-h-0 lg:p-6">
    <div data-distribution-donut className="relative shrink-0" style={{ width: diameter, height: diameter }}>
      <svg className="block size-full overflow-visible" viewBox="0 0 200 200" aria-label="Distribusi tiket; pilih segmen untuk sorotan">
        {circles.map((circle, index) => {
          const slice = visibleSlices[index];
          if (!slice || !isValidElement<InteractiveCircleProps>(circle)) return circle;
          const pct = total ? Math.round(slice.count / total * 100) : 0;
          return cloneElement(circle, {
            ...focus.interactions(slice.label),
            "data-distribution-segment": slice.label,
            role: "button", tabIndex: 0,
            "aria-label": `${slice.label}: ${slice.count} tiket, ${pct}%`,
            "aria-pressed": focus.active === slice.label,
            strokeLinecap: "butt",
            opacity: focus.active && focus.active !== slice.label ? 0.45 : 1,
            "data-focus-ring": "none",
            // An outline on an SVG circle is its bounding box (a square around the whole donut), so keyboard focus thickens and brightens the segment instead.
            className: "cursor-pointer outline-none focus:outline-none transition-opacity duration-150 motion-reduce:transition-none focus-visible:[stroke-width:36px] focus-visible:brightness-125",
            onKeyDown: event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); focus.toggle(slice.label); } },
          }, <title>{slice.label}: {slice.count} · {pct}%</title>);
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-[19%] text-center" aria-live="polite" data-distribution-center>
        <strong className="font-mono text-[44px] leading-none font-black tabular-nums lg:text-[52px]">{selected?.count ?? total}</strong>
        <span className="text-[11px] leading-4 font-semibold text-slate-400">{selected ? `${selected.label} · ${total ? Math.round(selected.count / total * 100) : 0}%` : "Total tiket"}</span>
      </div>
    </div>
    <div className="flex w-full flex-wrap items-center justify-center gap-2" aria-label="Legenda distribusi">
      {slices.map(slice => <button key={slice.label} type="button" {...focus.interactions(slice.label)} aria-pressed={focus.active === slice.label} className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-medium transition-opacity duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${focus.active === slice.label ? "border-sky-400/50 bg-sky-400/10" : "border-slate-700 bg-slate-900/50"} ${focus.active && focus.active !== slice.label ? "opacity-45" : "opacity-100"}`}>
        <svg aria-hidden="true" className="size-2 shrink-0" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill={slice.color} /></svg>
        <span>{slice.label}</span><strong className="font-mono">{slice.count}</strong>
      </button>)}
    </div>
  </div>;
}
