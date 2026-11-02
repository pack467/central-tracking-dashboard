import React from "react";

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
}

/**
 * Primitif Skeleton dasar:
 * Latar #1e293b dengan lapisan gradien shimmer bergerak via transform translateX 1.6s
 */
export function Skeleton({
  className = "",
  width,
  height,
  borderRadius,
  style,
}: SkeletonProps) {
  return (
    <div
      className={`relative overflow-hidden bg-[#1e293b] rounded-[6px] shrink-0 ${className}`}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        borderRadius: typeof borderRadius === "number" ? `${borderRadius}px` : borderRadius,
        ...style,
      }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 -translate-x-full bg-[linear-gradient(90deg,transparent_0%,rgba(148,163,184,0.08)_50%,transparent_100%)] animate-shimmer pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
}

/**
 * Primitif Spinner:
 * SVG ring 16/20px warna currentColor untuk pengganti loader ad-hoc
 */
export function Spinner({
  size = 16,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={`animate-spin text-current shrink-0 ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}

/**
 * Kerangka Halaman: Cards Layout (Dashboard, Overview, Monitoring)
 * Dilengkapi animasi penunda 120ms anti-flicker tanpa JS
 */
export function DashboardCardsSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="w-full py-2 animate-fade-in-delayed"
    >
      <span className="sr-only">Memuat konten dashboard…</span>

      <div aria-hidden="true" className="w-full flex flex-col gap-5">
        {/* Row 4 kartu metrik */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-4 rounded-[10px] border border-[#334155] bg-[#1e293b] flex flex-col justify-between min-h-[104px]"
            >
              <div className="flex items-center justify-between mb-3">
                <Skeleton height={14} width="55%" />
                <Skeleton height={20} width={20} borderRadius="50%" />
              </div>
              <Skeleton height={28} width="40%" className="mb-2" />
              <Skeleton height={12} width="75%" />
            </div>
          ))}
        </div>

        {/* Panel konten utama 2-kolom */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5">
          {/* Panel kiri besar */}
          <div className="p-5 rounded-[10px] border border-[#334155] bg-[#1e293b] flex flex-col gap-4 min-h-[380px]">
            <div className="flex items-center justify-between border-b border-[#334155]/60 pb-3.5">
              <Skeleton height={18} width="35%" />
              <Skeleton height={28} width={90} borderRadius={6} />
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3.5 py-2">
                <Skeleton height={36} width={36} borderRadius="50%" />
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  <Skeleton height={14} width="60%" />
                  <Skeleton height={11} width="35%" />
                </div>
                <Skeleton height={22} width={70} borderRadius={6} />
              </div>
            ))}
          </div>

          {/* Panel kanan kecil */}
          <div className="p-5 rounded-[10px] border border-[#334155] bg-[#1e293b] flex flex-col gap-4 min-h-[380px]">
            <div className="border-b border-[#334155]/60 pb-3.5">
              <Skeleton height={18} width="50%" />
            </div>
            <Skeleton height={140} width="100%" borderRadius={8} />
            <Skeleton height={14} width="75%" />
            <Skeleton height={14} width="90%" />
            <Skeleton height={14} width="60%" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Kerangka Halaman: Table Layout (Tickets, Team Roster, Shift Log, Reports)
 */
export function TableSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="w-full py-2 animate-fade-in-delayed"
    >
      <span className="sr-only">Memuat tabel data…</span>

      <div aria-hidden="true" className="w-full rounded-[10px] border border-[#334155] bg-[#1e293b] overflow-hidden flex flex-col">
        {/* Toolbar bar */}
        <div className="p-3.5 border-b border-[#334155] flex flex-wrap items-center justify-between gap-3 bg-[#1e293b]">
          <Skeleton height={36} width={260} borderRadius={8} />
          <div className="flex items-center gap-2">
            <Skeleton height={36} width={120} borderRadius={8} />
            <Skeleton height={36} width={120} borderRadius={8} />
          </div>
        </div>

        {/* Table header */}
        <div className="p-3 border-b border-[#334155] bg-[#0f172a] flex items-center justify-between gap-4">
          <Skeleton height={14} width="20%" />
          <Skeleton height={14} width="25%" />
          <Skeleton height={14} width="15%" />
          <Skeleton height={14} width="15%" />
          <Skeleton height={14} width="10%" />
        </div>

        {/* Table rows */}
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="p-3.5 border-b border-[#334155]/50 last:border-b-0 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3 w-[20%]">
              <Skeleton height={28} width={28} borderRadius="50%" />
              <Skeleton height={13} width="65%" />
            </div>
            <Skeleton height={13} width="25%" />
            <Skeleton height={20} width="15%" borderRadius={6} />
            <Skeleton height={13} width="15%" />
            <Skeleton height={26} width={60} borderRadius={6} />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Kerangka Halaman: Detail / Form Layout (Profile, Runbooks, Handover)
 */
export function DetailSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="w-full py-2 animate-fade-in-delayed"
    >
      <span className="sr-only">Memuat informasi formulir…</span>

      <div aria-hidden="true" className="w-full flex flex-col gap-5">
        <div className="p-6 rounded-[10px] border border-[#334155] bg-[#1e293b] flex items-center gap-4">
          <Skeleton height={56} width={56} borderRadius="50%" />
          <div className="flex-1 flex flex-col gap-2">
            <Skeleton height={20} width="35%" />
            <Skeleton height={13} width="20%" />
          </div>
        </div>

        <div className="p-6 rounded-[10px] border border-[#334155] bg-[#1e293b] flex flex-col gap-4">
          <Skeleton height={16} width="25%" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton height={12} width="30%" />
                <Skeleton height={38} width="100%" borderRadius={8} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Backward-compatible wrapper untuk DashboardViewSkeleton
 */
export function DashboardViewSkeleton() {
  return <DashboardCardsSkeleton />;
}
