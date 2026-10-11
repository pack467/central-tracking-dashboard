"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function RouteProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  const activeRef = useRef(false);
  const visibleRef = useRef(false);
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trickleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finishNavigation = useCallback(() => {
    activeRef.current = false;
    visibleRef.current = false;

    if (delayTimerRef.current) {
      clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }
    if (trickleTimerRef.current) {
      clearInterval(trickleTimerRef.current);
      trickleTimerRef.current = null;
    }
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }

    setProgress(100);

    if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    finishTimerRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 200);
  }, []);

  const startNavigation = useCallback(() => {
    if (finishTimerRef.current) {
      clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }

    activeRef.current = true;

    if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
    delayTimerRef.current = setTimeout(() => {
      if (!activeRef.current) return;
      visibleRef.current = true;
      setVisible(true);
      setProgress(15);

      if (trickleTimerRef.current) clearInterval(trickleTimerRef.current);
      trickleTimerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 88) return prev;
          const increment = Math.max(1, (88 - prev) * 0.1);
          return Math.min(88, prev + increment);
        });
      }, 200);
    }, 120);

    safetyTimeoutRef.current = setTimeout(() => {
      finishNavigation();
    }, 10000);
  }, [finishNavigation]);

  useEffect(() => {
    if (activeRef.current || visibleRef.current) {
      finishNavigation();
    }
  }, [pathname, searchParams, finishNavigation]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      lastPath = window.location.pathname;
      const target = (event.target as HTMLElement).closest("a");
      if (!target) return;
      if (target.getAttribute("aria-disabled") === "true") return;
      if (target.target && target.target !== "_self") return;
      if (target.hasAttribute("download")) return;

      const href = target.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;

      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname) return;

        startNavigation();
      } catch {
        // Abaikan URL parsing error
      }
    };

    let lastPath = window.location.pathname;
    const handlePopState = () => {
      if (window.location.pathname !== lastPath) startNavigation();
      lastPath = window.location.pathname;
    };

    document.addEventListener("click", handleClick, { capture: true });
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
      window.removeEventListener("popstate", handlePopState);
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
      if (trickleTimerRef.current) clearInterval(trickleTimerRef.current);
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    };
  }, [startNavigation]);

  if (!visible) return null;

  return (
    <div
      id="route-progress-bar"
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[9999] h-[2px] pointer-events-none transition-opacity duration-200"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div
        className="h-full bg-[#38bdf8] shadow-[0_0_8px_rgba(56,189,248,0.5)] transition-[width] duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export function RouteProgress() {
  return (
    <Suspense fallback={null}>
      <RouteProgressBar />
    </Suspense>
  );
}
