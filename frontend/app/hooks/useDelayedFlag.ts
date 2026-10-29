"use client";

import { useEffect, useRef, useState } from "react";

interface DelayedFlagOptions {
  /**
   * Minimum delay sebelum skeleton ditampilkan (default: 300ms).
   * Mencegah kedipan jika respons data datang cepat (< 300ms).
   */
  delayMs?: number;
  /**
   * Durasi minimum skeleton tampil setelah muncul (default: 400ms).
   * Mencegah visual flash jika data datang segera setelah skeleton muncul.
   */
  minDurationMs?: number;
}

/**
 * Hook Anti-Flicker & Anti-Flash:
 * Mengontrol kemunculan skeleton loading dengan debounce penundaan
 * dan durasi minimum tampil untuk pengalaman visual yang halus.
 */
export function useDelayedFlag(
  isLoading: boolean,
  options: DelayedFlagOptions = {}
): boolean {
  const { delayMs = 300, minDurationMs = 400 } = options;

  const [showSkeleton, setShowSkeleton] = useState(false);
  const shownAtRef = useRef<number | null>(null);
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear existing timers
    if (delayTimerRef.current) {
      clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }
    if (minDurationTimerRef.current) {
      clearTimeout(minDurationTimerRef.current);
      minDurationTimerRef.current = null;
    }

    if (isLoading) {
      // Jika delayMs adalah 0 (mis. untuk pengujian atau preview), tampilkan seketika
      if (delayMs <= 0) {
        shownAtRef.current = Date.now();
        setShowSkeleton(true);
        return;
      }

      // Tunggu delayMs sebelum menampilkan skeleton
      delayTimerRef.current = setTimeout(() => {
        shownAtRef.current = Date.now();
        setShowSkeleton(true);
      }, delayMs);
    } else {
      // Loading selesai: periksa apakah skeleton sempat muncul
      if (shownAtRef.current !== null) {
        const elapsed = Date.now() - shownAtRef.current;
        const remaining = minDurationMs - elapsed;

        if (remaining > 0) {
          // Pertahankan skeleton hingga batas minDurationMs tercapai
          minDurationTimerRef.current = setTimeout(() => {
            setShowSkeleton(false);
            shownAtRef.current = null;
          }, remaining);
        } else {
          setShowSkeleton(false);
          shownAtRef.current = null;
        }
      } else {
        // Skeleton belum sempat muncul sama sekali (data cepat)
        setShowSkeleton(false);
      }
    }

    return () => {
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
      if (minDurationTimerRef.current) clearTimeout(minDurationTimerRef.current);
    };
  }, [isLoading, delayMs, minDurationMs]);

  return showSkeleton;
}
