"use client";

import { useState, useEffect, useMemo, type RefCallback } from "react";

export interface Dimensions {
  width: number;
  height: number;
}

/**
 * Hook to measure container dimensions with ResizeObserver throttled by requestAnimationFrame.
 * Guarantees zero letterboxing and provides 1:1 coordinate system for SVGs.
 */
export function useContainerDimensions<T extends HTMLElement = HTMLDivElement>() {
  const [element, setElement] = useState<T | null>(null);
  // A chart can mount after its loading skeleton. Observe the actual mount,
  // and retain .current for existing viewer consumers.
  const ref = useMemo(() => {
    const callback: RefCallback<T> & { current: T | null } = Object.assign((node: T | null) => {
      callback.current = node;
      setElement(node);
    }, { current: null as T | null });
    return callback;
  }, []);
  const [dimensions, setDimensions] = useState<Dimensions>({ width: 0, height: 0 });

  useEffect(() => {
    const el = element;
    if (!el) return;

    let rafId: number | null = null;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const { width, height } = entry.contentRect;
        const roundedWidth = Math.round(width);
        const roundedHeight = Math.round(height);

        setDimensions((prev) => {
          if (prev.width === roundedWidth && prev.height === roundedHeight) {
            return prev;
          }
          return { width: roundedWidth, height: roundedHeight };
        });
      });
    });

    observer.observe(el);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [element]);

  return [ref, dimensions] as const;
}
