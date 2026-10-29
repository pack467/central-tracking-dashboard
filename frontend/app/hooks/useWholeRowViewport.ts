"use client";

import { useLayoutEffect, type DependencyList, type RefObject } from "react";

/**
 * Trims the viewport height of a scrollable list so it only ever shows whole
 * rows at rest (no half-cut row at the bottom). The list stays scrollable.
 *
 * The element is expected to fill its available space (e.g. `flex-1 min-h-0`).
 * The available height is measured with the trim removed, then the height is
 * reduced to the bottom edge of the last row that fully fits.
 */
export function useWholeRowViewport(
  ref: RefObject<HTMLElement | null>,
  deps: DependencyList = [],
) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const parent = el.parentElement;

    const fit = () => {
      const scrollTop = el.scrollTop;
      el.style.maxHeight = "";
      const available = el.clientHeight;
      const rows = Array.from(el.children) as HTMLElement[];
      if (rows.length === 0 || el.scrollHeight <= available + 1) return;

      const top = el.getBoundingClientRect().top - scrollTop;
      let fitBottom = 0;
      for (const row of rows) {
        const bottom = row.getBoundingClientRect().bottom - top;
        if (bottom <= available + 0.5) fitBottom = bottom;
        else break;
      }
      // Keep a small gutter below the last visible row.
      if (fitBottom > 0 && fitBottom < available) {
        el.style.maxHeight = `${Math.ceil(fitBottom) + 2}px`;
      }
      el.scrollTop = scrollTop;
    };

    let rafId: number | null = null;
    const scheduleFit = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(fit);
    };

    fit();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(scheduleFit) : null;
    if (ro && parent) ro.observe(parent);
    window.addEventListener("resize", scheduleFit);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      ro?.disconnect();
      window.removeEventListener("resize", scheduleFit);
      el.style.maxHeight = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
