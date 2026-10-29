"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

const GAP = 12;
const EDGE = 8;
/** Below this container width the tooltip becomes a small card pinned to the top edge of the chart. */
const CARD_WIDTH = 520;

interface HoverOptions {
  /** x of every column / point in SVG units, in data order. */
  xs: readonly number[];
  /** Width of the SVG viewBox, so pointer positions can be converted to SVG units. */
  viewWidth: number;
  /** Changing this (view mode, sub view, data set) closes the tooltip. */
  resetKey: string;
}

/**
 * Which column of an SVG chart the pointer is on, and when to let go of it: the pointer leaving or being cancelled, scrolling,
 * resizing, the window losing focus, Escape, a touch outside the chart, or the chart being swapped for another view.
 * A finger lifted from the chart keeps its tooltip until one of those happens.
 */
export function useChartHover({ xs, viewWidth, resetKey }: HoverOptions) {
  // A callback ref kept in state, so the element can be handed to the tooltip while rendering.
  const [svg, bindSvg] = useState<SVGSVGElement | null>(null);
  const [index, setIndex] = useState<number | null>(null);
  const [seenKey, setSeenKey] = useState(resetKey);
  if (seenKey !== resetKey) { setSeenKey(resetKey); setIndex(null); }
  const clear = useCallback(() => setIndex(null), []);

  const pick = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    if (!xs.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const x = (event.clientX - rect.left) * (viewWidth / rect.width);
    let best = 0, distance = Infinity;
    xs.forEach((value, i) => { const d = Math.abs(value - x); if (d < distance) { distance = d; best = i; } });
    setIndex(best);
  }, [xs, viewWidth]);

  const open = index !== null;
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!svg?.contains(event.target as Node)) setIndex(null); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setIndex(null); };
    const hidden = () => { if (document.visibilityState === "hidden") setIndex(null); };
    const close = () => setIndex(null);
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", escape, true);
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("scroll", close, { capture: true, passive: true });
    window.addEventListener("resize", close);
    window.addEventListener("blur", close);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("keydown", escape, true);
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("blur", close);
    };
  }, [open, svg]);

  const svgProps = {
    onPointerMove: pick,
    onPointerDown: pick,
    onPointerLeave: (event: ReactPointerEvent<SVGSVGElement>) => { if (event.pointerType !== "touch") setIndex(null); },
    onPointerCancel: clear,
  };
  return { svg, bindSvg, svgProps, index, clear };
}

interface TooltipProps {
  svg: SVGSVGElement | null;
  /** Column / point x in SVG units, and half the width of the bar (0 for a point). */
  anchorX: number;
  half?: number;
  /** Top of the plot area in SVG units: the tooltip is aligned with it, away from the bars. */
  plotTop: number;
  viewWidth: number;
  viewHeight: number;
  width?: number;
  children: ReactNode;
}

/**
 * Tooltip beside the hovered column, never on it: to the right with a 12 px gap, to the left when the right side has no room,
 * aligned with the top of the plot and kept inside the chart. In a narrow chart it is a small card on the top edge, on the side
 * away from the touched column. It measures itself, so the position is right before the first paint.
 */
export function ChartTooltip({ svg, anchorX, half = 0, plotTop, viewWidth, viewHeight, width = 212, children }: TooltipProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const tip = ref.current, box = tip?.offsetParent as HTMLElement | null;
    if (!tip || !svg || !box) return;
    const s = svg.getBoundingClientRect(), b = box.getBoundingClientRect();
    const kx = s.width / viewWidth, ky = s.height / viewHeight;
    const x = s.left - b.left + anchorX * kx, reach = half * kx;
    const w = tip.offsetWidth, h = tip.offsetHeight, room = box.clientWidth, tall = box.clientHeight;
    let left: number, top: number;
    if (room < CARD_WIDTH) {
      left = x > room / 2 ? EDGE : room - w - EDGE;
      top = EDGE;
    } else {
      left = x + reach + GAP;
      if (left + w > room - EDGE) left = x - reach - GAP - w;
      top = s.top - b.top + plotTop * ky;
    }
    left = Math.round(Math.max(EDGE, Math.min(left, room - w - EDGE)));
    top = Math.round(Math.max(EDGE, Math.min(top, tall - h - EDGE)));
    setPlace(previous => previous && previous.left === left && previous.top === top ? previous : { left, top });
  }, [svg, anchorX, half, plotTop, viewWidth, viewHeight, width, children]);
  return (
    <div
      ref={ref}
      data-chart-tooltip
      // A transform, not left/top: moving the tooltip between columns must not count as a layout shift.
      style={{ transform: `translate(${place?.left ?? 0}px, ${place?.top ?? 0}px)`, width }}
      className={`pointer-events-none absolute left-0 top-0 z-20 max-w-[calc(100%-16px)] rounded-lg border border-slate-600/70 bg-slate-900/[0.97] px-3 py-2.5 font-mono text-xs shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-sm ${place ? "" : "invisible"}`}
    >
      {children}
    </div>
  );
}

/** Title on the left, the headline figure on the right, with a gap that never closes up. */
export function TooltipHeader({ title, value, valueClass = "text-sky-400" }: { title: ReactNode; value?: ReactNode; valueClass?: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-4 border-b border-slate-700/70 pb-2">
      <span className="min-w-0 truncate font-bold text-white">{title}</span>
      {value !== undefined && <span className={`shrink-0 text-right font-bold tabular-nums ${valueClass}`}>{value}</span>}
    </div>
  );
}

/** One line: marker and name on the left, figure on the right. */
export function TooltipRow({ marker, label, value, tone = "text-slate-300", valueClass = "text-slate-100" }: { marker?: ReactNode; label: ReactNode; value: ReactNode; tone?: string; valueClass?: string }) {
  return (
    <div className={`flex items-center justify-between gap-4 py-0.5 leading-5 ${tone}`}>
      <span className="flex min-w-0 items-center gap-2">
        {marker}
        <span className="truncate">{label}</span>
      </span>
      <b className={`shrink-0 text-right font-semibold tabular-nums ${valueClass}`}>{value}</b>
    </div>
  );
}

export function TooltipSwatch({ color }: { color: string }) {
  return <span aria-hidden="true" className="size-2.5 shrink-0 rounded-sm" style={{ background: color }} />;
}
