"use client";

import React, { useState, useEffect } from "react";
import { useDelayedFlag } from "@/app/hooks/useDelayedFlag";
import { AlertTriangle, RefreshCw, Inbox } from "lucide-react";

export interface PanelSkeletonWrapperProps {
  isLoading: boolean;
  isStale?: boolean;
  error?: Error | null;
  isEmpty?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  onRetry?: () => void;
  skeleton: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  minHeight?: string | number;
  liveRegionText?: string;
  delayMs?: number;
  minDurationMs?: number;
  reserveLoading?: boolean;
  loadingClassName?: string;
}

/**
 * PanelSkeletonWrapper (<Loadable> per-panel):
 *
 * Mengelola state UX per panel:
 * - Anti-flicker delay ~300ms & anti-flash durasi minimum ~400ms via useDelayedFlag
 * - Indikator aktivitas: Progres tipis 2px aksen bergerak indeterminate di tepi atas
 * - Deteksi long loading (> 6 detik) -> ganti status ke "Masih memuat..."
 * - Aksesibilitas: aria-busy="true", aria-live="polite" sr-only text
 * - Transisi halus crossfade (180ms) tanpa layout shift
 * - Stale-While-Revalidate: Saat filter berganti & data lama ada, tampilkan overlay
 *   halus (opacity 0.6) + progress bar tipis, TANPA memunculkan skeleton penuh
 * - In-panel Error state dengan tombol "Coba lagi" (tinggi presisi sama dengan skeleton)
 * - In-panel Empty state jika data kosong
 */
export function PanelSkeletonWrapper({
  isLoading,
  isStale = false,
  error = null,
  isEmpty = false,
  emptyMessage = "Tidak ada data pada rentang filter ini.",
  emptyIcon,
  onRetry,
  skeleton,
  children,
  className = "",
  minHeight,
  liveRegionText = "Memuat data...",
  delayMs = 300,
  minDurationMs = 400,
  reserveLoading = false,
  loadingClassName = "",
}: PanelSkeletonWrapperProps) {
  const showSkeleton = useDelayedFlag(isLoading, { delayMs, minDurationMs });
  const minHeightStyle = typeof minHeight === "number" ? `${minHeight}px` : minHeight;

  // Deteksi status muat lama (> 6s)
  const [isLongLoading, setIsLongLoading] = useState(false);
  useEffect(() => {
    if (!isLoading) {
      setIsLongLoading(false);
      return;
    }
    const timer = setTimeout(() => {
      setIsLongLoading(true);
    }, 6000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  // 1. In-panel Error State (mempertahankan tinggi agar CLS = 0)
  if (error && !isLoading) {
    const isTimeout =
      (error as any).status === 408 ||
      (error as any).code === "TIMEOUT" ||
      error.message?.toLowerCase().includes("timeout");

    return (
      <div
        role="alert"
        aria-live="assertive"
        className={`relative w-full flex flex-col items-center justify-center p-6 text-center rounded-xl border border-red-500/20 bg-red-950/10 ${className}`}
        style={{ minHeight: minHeightStyle }}
      >
        <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-3">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <p className="text-sm font-medium text-slate-200 mb-1">
          {isTimeout
            ? "Permintaan Melebihi Batas Waktu"
            : "Gagal Mengambil Data"}
        </p>
        <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed">
          {error.message || "Terjadi kesalahan saat memuat panel ini. Silakan coba lagi."}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 hover:border-sky-500/40 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500/40"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Coba lagi
          </button>
        )}
      </div>
    );
  }

  // 2. Full Skeleton State (initial load atau delayed loading)
  if (showSkeleton || (reserveLoading && isLoading)) {
    const numericHeight = typeof minHeight === "number" ? minHeight : parseInt(String(minHeight), 10) || 0;
    const isLargePanel = numericHeight >= 280;

    return (
      <div
        role="status"
        aria-busy="true"
        className={`relative w-full flex-1 min-h-0 flex flex-col transition-opacity duration-180 ease-out overflow-hidden ${className} ${loadingClassName}`}
        style={{ minHeight: loadingClassName ? undefined : minHeightStyle }}
      >
        {/* Garis Progres Tipis 2px Indeterminate di Tepi Atas Panel */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden z-20 pointer-events-none rounded-t-xl bg-slate-800/40"
          aria-hidden="true"
        >
          <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-sky-400 to-transparent animate-skeleton-bar-indeterminate" />
        </div>

        <span className="sr-only" aria-live="polite">
          {isLongLoading ? "Masih memuat data..." : liveRegionText}
        </span>

        <div aria-hidden="true" className={`w-full flex-1 min-h-0 flex flex-col ${reserveLoading && !showSkeleton ? "opacity-0" : ""}`}>
          {skeleton}
        </div>

        {/* Indikator Halus "Memuat data..." di Pojok Bawah Panel Besar */}
        {isLargePanel && (
          <div
            className={`absolute bottom-2.5 right-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#0f172a]/80 border border-slate-700/40 text-[10.5px] font-mono text-slate-400 select-none pointer-events-none z-10 ${reserveLoading ? "w-[144px] h-6 justify-center" : ""}`}
            aria-hidden="true"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            <span>{isLongLoading ? "Masih memuat..." : "Memuat data..."}</span>
          </div>
        )}
      </div>
    );
  }

  // 3. Stale State (filter berganti sementara data lama masih ditampilkan)
  if (isStale) {
    return (
      <div
        className={`relative w-full flex-1 min-h-0 flex flex-col overflow-hidden ${className}`}
        style={{ minHeight: minHeightStyle }}
        aria-busy="true"
      >
        {/* Thin animated top progress bar */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden z-20 pointer-events-none bg-slate-800/40"
          aria-hidden="true"
        >
          <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-sky-400 to-transparent animate-skeleton-bar-indeterminate" />
        </div>
        {/* Subtle opacity overlay */}
        <div className="opacity-60 transition-opacity duration-180 pointer-events-none flex-1 min-h-0 flex flex-col">
          {children}
        </div>
      </div>
    );
  }

  // 4. In-panel Empty State
  if (isEmpty) {
    return (
      <div
        className={`relative w-full flex-1 min-h-0 flex flex-col items-center justify-center p-6 text-center text-slate-400 ${className}`}
        style={{ minHeight: minHeightStyle }}
      >
        <div className="w-9 h-9 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 mb-2.5">
          {emptyIcon || <Inbox className="w-4 h-4" />}
        </div>
        <p className="text-xs text-slate-400 max-w-xs">{emptyMessage}</p>
      </div>
    );
  }

  // 5. Success Content with brief smooth fade-in
  return (
    <div
      className={`w-full flex-1 min-h-0 flex flex-col transition-opacity duration-180 ease-out ${className}`}
    >
      {children}
    </div>
  );
}
