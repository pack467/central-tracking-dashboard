"use client";

import React from "react";
import { useCompactLayout } from "@/app/hooks/useMobileLayout";
import { Skeleton } from "./Skeleton";
import { SkeletonAvatar } from "./SkeletonAvatar";
import { SkeletonChart } from "./SkeletonChart";
import { PanelViewButton } from "@/app/components/dashboard/PanelViewButton";
import { MemoCard } from "@/app/components/dashboard/MemoCard";

const DETERMINISTIC_TITLE_WIDTHS = ["74%", "85%", "64%", "82%", "68%", "78%", "86%", "62%", "80%", "70%"];
const DETERMINISTIC_TASK_WIDTHS = ["68%", "54%", "72%", "58%", "64%", "75%", "52%", "60%"];
const DETERMINISTIC_MEMO_WIDTHS = ["92%", "84%", "96%", "76%", "88%", "42%"];

/**
 * 1. Live Ops Command Bar Skeleton
 * Dimensi & padding identik dengan `ops-focus-header`
 */
export function DashboardLiveOpsCommandBarSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap py-1 max-lg:flex-nowrap max-lg:h-7 max-lg:py-0" aria-hidden="true">
      <div className="inline-flex items-center gap-2.5">
        <Skeleton width={105} height={22} borderRadius={99} tone="accent" />
        <Skeleton className="hidden md:block" width={260} height={16} borderRadius={4} tone="card" />
      </div>
      <Skeleton width={135} height={26} borderRadius={6} tone="subtle" />
    </div>
  );
}

/**
 * 2. Tiket Hari Ini Skeleton (Widget A)
 * Anatomi lengkap: ID mono, Dot project, Judul deterministik, Meta kategori & owner, 2 Badges
 * 15 baris mengisi penuh kontainer 640-750px tanpa menyisakan ruang kosong.
 */
export function TodayTicketsSkeleton() {
  const mobile = useCompactLayout();
  if (mobile) return <div aria-hidden="true" className="flex h-[647px] flex-none flex-col">
    <div className="flex flex-col">{Array.from({ length: 4 }, (_, index) => <div key={index} className="flex h-[129.5px] flex-none flex-col gap-2 border-b border-slate-700/45 px-4 py-3.5 last:border-b-0">
      <div className="flex h-[22px] items-center gap-1.5"><Skeleton className="h-[22px] w-16 rounded-full" /><Skeleton className="h-[22px] w-[72px] rounded-full" /><Skeleton className="ml-auto h-[11px] w-[68px]" /></div>
      <div className="flex h-[40.5px] flex-col justify-center gap-1.5"><Skeleton className="h-[13px] w-[90%]" /><Skeleton className="h-[13px] w-[72%]" /></div>
      <div className="flex h-[22px] items-center gap-2"><Skeleton className="h-3 w-10" /><Skeleton className="h-3 w-14" /><Skeleton className="ml-auto size-[22px] rounded-full" /><Skeleton className="h-3 w-20" /></div>
    </div>)}</div>
    <div className="flex flex-col gap-3 px-4 pb-4"><Skeleton className="h-11 w-full rounded-lg" /><div className="flex h-[57px] items-end justify-between border-t border-slate-700/50 pt-3"><Skeleton className="h-11 w-[140px] rounded-lg" /><Skeleton className="h-11 w-[92px] rounded-lg" /></div></div>
  </div>;
  return (
    <div className="flex flex-col flex-1 h-full justify-between max-lg:h-[645px]" aria-hidden="true">
      {/* 17 Baris Tiket Hari Ini - Memenuhi tinggi panel tanpa celah kosong */}
      <div className="flex flex-col gap-1.5 flex-1 min-h-0 overflow-hidden pr-0.5 [mask-image:linear-gradient(to_bottom,black_90%,transparent_100%)] max-lg:[mask-image:none] max-lg:gap-2 max-lg:[&>div:nth-child(n+6)]:hidden">
        {Array.from({ length: 17 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[108px_1fr_auto] max-[560px]:grid-cols-1 items-center gap-2.5 p-[7px_12px] rounded-lg border border-slate-700/40 bg-[#0f172a]/25 max-lg:h-[100px] max-lg:shrink-0 max-lg:rounded-xl max-lg:p-3 max-lg:grid-cols-[minmax(0,1fr)_auto] max-lg:gap-1 max-lg:[&>div:nth-child(2)]:col-span-2 max-lg:[&>div:nth-child(2)]:row-start-2 max-lg:[&>div:nth-child(3)]:col-start-2 max-lg:[&>div:nth-child(3)]:row-start-1"
          >
            {/* Kiri: ID mono (64x10) + Dot 6px + Label Project (40x10) */}
            <div className="flex flex-col gap-1">
              <Skeleton width={64} height={11} borderRadius={3} tone="card" staggerIndex={i} />
              <div className="flex items-center gap-1.5">
                <Skeleton width={6} height={6} borderRadius="50%" tone="accent" staggerIndex={i} />
                <Skeleton width={42} height={10} borderRadius={3} tone="subtle" staggerIndex={i} />
              </div>
            </div>

            {/* Tengah: Judul 60-85% deterministik (12px) + Meta line: Pill Kategori (56x10) + Avatar 12px + Nama (88x10) */}
            <div className="flex flex-col gap-1.5 min-w-0">
              <Skeleton
                width={DETERMINISTIC_TITLE_WIDTHS[i % DETERMINISTIC_TITLE_WIDTHS.length]}
                height={12}
                borderRadius={3}
                staggerIndex={i + 1}
              />
              <div className="flex items-center gap-2 flex-wrap">
                <Skeleton width={56} height={10} borderRadius={99} tone="subtle" staggerIndex={i + 2} />
                <div className="flex items-center gap-1">
                  <Skeleton width={12} height={12} borderRadius="50%" tone="card" staggerIndex={i + 2} />
                  <Skeleton width={88} height={10} borderRadius={3} tone="subtle" staggerIndex={i + 2} />
                </div>
              </div>
            </div>

            {/* Kanan: Dua pill badge: Priority (44x18) dan Status (58x18) */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Skeleton width={44} height={18} borderRadius={99} tone="subtle" staggerIndex={i + 3} />
              <Skeleton width={58} height={18} borderRadius={99} tone="card" staggerIndex={i + 3} />
            </div>
          </div>
        ))}
      </div>

      {/* Footer Paginasi */}
      <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-700/30 mt-2 shrink-0 max-lg:h-[105px]">
        <Skeleton width={150} height={12} borderRadius={4} tone="subtle" />
        <div className="flex items-center gap-1">
          <Skeleton width={48} height={24} borderRadius={6} tone="subtle" />
          <Skeleton width={24} height={24} borderRadius={6} tone="card" />
          <Skeleton width={24} height={24} borderRadius={6} tone="subtle" />
          <Skeleton width={48} height={24} borderRadius={6} tone="subtle" />
        </div>
      </div>
    </div>
  );
}

/**
 * 3. Memo & Catatan Shift Skeleton (Widget B)
 * Toolbar dipertahankan, area catatan berisi 6 garis deterministik + info meta footer
 */
export function ShiftMemoNotesSkeleton({ memo }: { memo?: string } = {}) {
  const mobile = useCompactLayout();
  if (mobile && memo !== undefined) return <MemoCard mobile onOpen={() => {}} loading />;
  return (
    <div className="flex flex-col flex-1 min-h-[160px] max-lg:min-h-[171.6px] max-lg:h-[171.6px] max-lg:overflow-hidden max-lg:p-3.5 max-lg:rounded-xl max-lg:bg-[#0f172a]/60 max-lg:border-l-[3px] max-lg:border-l-amber-400/50 p-3 bg-[#0b1120] border border-slate-700/40 rounded-lg justify-between gap-2.5" aria-hidden="true">
      <div className="flex flex-col gap-2.5 max-lg:[&>div:nth-child(n+4)]:hidden">
        {DETERMINISTIC_MEMO_WIDTHS.map((w, idx) => (
          <Skeleton
            key={idx}
            width={w}
            height={11}
            borderRadius={3}
            tone="subtle"
            staggerIndex={idx}
          />
        ))}
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 mt-1 max-lg:hidden">
        <Skeleton width={110} height={10} borderRadius={3} tone="subtle" staggerIndex={6} />
        <Skeleton width={70} height={10} borderRadius={3} tone="subtle" staggerIndex={7} />
      </div>
    </div>
  );
}

/**
 * 4. List Monitoring Shift Skeleton (Widget C)
 * 8 baris sesuai data monitoring: Tag sistem mono (40x18), Task title (50-75%), OK pill (44x24)
 */
export function MonitoringChecklistSkeleton() {
  return (
    <div className="flex flex-col flex-1 min-h-[280px] max-lg:min-h-[355.5px] max-lg:h-[355.5px] gap-1.5 justify-between" aria-hidden="true">
      <div className="flex flex-col gap-1.5 flex-1 max-lg:[&>div:nth-child(n+6)]:hidden max-lg:[&>div]:h-[46px]">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-2 rounded-lg border border-slate-700/30 bg-[#0f172a]/25"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <Skeleton width={40} height={18} borderRadius={4} tone="card" staggerIndex={i} />
              <Skeleton
                width={DETERMINISTIC_TASK_WIDTHS[i % DETERMINISTIC_TASK_WIDTHS.length]}
                height={12}
                borderRadius={3}
                staggerIndex={i + 1}
              />
            </div>
            <Skeleton width={44} height={22} borderRadius={99} tone="subtle" staggerIndex={i + 2} />
          </div>
        ))}
      </div>

      {/* Footer 2 Teks Kecil */}
      <div className="flex items-center justify-between pt-1.5 border-t border-slate-700/30 text-xs shrink-0">
        <Skeleton width={110} height={10} borderRadius={3} tone="subtle" />
        <Skeleton width={80} height={10} borderRadius={3} tone="subtle" />
      </div>
    </div>
  );
}

/**
 * 5. Ticket Volume per Project Skeleton
 * Stacked bar chart + bottom legend
 */
export function TicketVolumeChartSkeleton() {
  const mobile = useCompactLayout();
  return (
    <div className="flex flex-col flex-1 w-full justify-between gap-3 min-h-[290px] max-lg:min-h-[303px] max-lg:h-[303px]" aria-hidden="true">
      {mobile && <Skeleton width="80%" height={16} tone="subtle" />}
      <SkeletonChart variant="bar" height={mobile ? 220 : 260} hasLegend={!mobile} />
      {mobile && <div className="flex h-[43px] items-end gap-2 border-t border-slate-700 pt-2.5"><Skeleton width={100} height={32} /><Skeleton width={100} height={32} /></div>}
    </div>
  );
}

/**
 * 6. Rekap Tiket per User Skeleton
 * 4 kartu staf vertikal dengan 3 metric pills (Hari Ini, Bulan Ini, Tahun Ini)
 */
export function StaffRecapSkeleton() {
  return (
    <div className="flex flex-col gap-2 flex-1 min-h-0 overflow-hidden pr-0.5 max-lg:gap-0 lg:[&>div:nth-child(n+5)]:hidden max-lg:[&>div]:h-[60px] max-lg:[&>div]:shrink-0 max-lg:min-h-[352px] max-lg:after:mt-2 max-lg:after:content-[''] max-lg:after:block max-lg:after:h-11 max-lg:after:shrink-0 max-lg:after:rounded-lg max-lg:after:border max-lg:after:border-slate-700/40 max-lg:after:bg-slate-900/30" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 p-2.5 rounded-lg bg-[#0f172a]/30 border border-slate-700/40 max-lg:flex-row max-lg:items-center max-lg:gap-2 max-lg:p-0 max-lg:rounded-none max-lg:border-0 max-lg:border-b max-lg:bg-transparent max-lg:[&>div:first-child]:min-w-0 max-lg:[&>div:first-child]:flex-1 max-lg:[&>div:first-child>div]:min-w-0 max-lg:[&>div:first-child>div]:overflow-hidden max-lg:[&>div:first-child>div]:gap-2 max-lg:[&>div:first-child>div>div:first-child]:size-8 max-lg:[&>div:first-child>div:last-child]:hidden max-lg:[&>div:nth-child(2)]:w-[108px] max-lg:[&>div:nth-child(2)]:shrink-0 max-lg:[&>div:nth-child(2)]:p-0 max-lg:[&>div:nth-child(2)]:border-0 max-lg:[&>div:nth-child(2)]:bg-transparent max-lg:[&>div:nth-child(3)]:w-10 max-lg:[&>div:nth-child(3)>div]:hidden"
        >
          {/* Baris Atas: Avatar 28px bulat + Nama & Jabatan */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <SkeletonAvatar size={28} shape="circle" />
              <div className="flex flex-col gap-1">
                <Skeleton width={95} height={12} borderRadius={3} tone="card" staggerIndex={i} />
                <Skeleton width={68} height={10} borderRadius={2} tone="subtle" staggerIndex={i} />
              </div>
            </div>
            <Skeleton width={42} height={16} borderRadius={99} tone="subtle" staggerIndex={i} />
          </div>

          {/* 3 Mini-KPI: Label (24x8) + Angka (28x14) */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-md bg-slate-950/40 border border-slate-700/20">
            {[1, 2, 3].map((m) => (
              <div key={m} className="flex flex-col items-center gap-0.5 py-0.5">
                <Skeleton width={26} height={8} borderRadius={2} tone="subtle" staggerIndex={i + m} />
                <Skeleton width={28} height={14} borderRadius={3} tone="card" staggerIndex={i + m} />
              </div>
            ))}
          </div>

          {/* Chips Hari Ini */}
          <div className="flex items-center gap-1.5">
            <Skeleton width={48} height={12} borderRadius={99} tone="subtle" staggerIndex={i} />
            <Skeleton width={56} height={12} borderRadius={99} tone="subtle" staggerIndex={i} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 7. Distribusi Kategori / Tipe Tiket Skeleton
 * Donut chart di kiri + 7 baris ranked bar di kanan
 */
export function CategoryDistributionSkeleton() {
  return (
    <div className="grid grid-cols-[140px_1fr] max-[540px]:grid-cols-1 gap-5 items-center h-full flex-1 min-h-[180px] max-lg:gap-3 max-lg:h-[404px] max-lg:min-h-0 max-lg:flex-none max-lg:overflow-hidden" aria-hidden="true">
      {/* Donut Chart */}
      <div className="flex items-center justify-center">
        <SkeletonChart variant="donut" height={140} hasLegend={false} className="max-lg:[&>div>div]:size-[140px]" />
      </div>

      {/* 7 Ranked Category Bars */}
      <div className="flex flex-col justify-between h-full gap-2 w-full max-lg:gap-0">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1 max-lg:flex-row max-lg:items-center max-lg:h-9">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <Skeleton width={8} height={8} borderRadius={2} tone="accent" staggerIndex={i} />
                <Skeleton width={75} height={10} borderRadius={3} tone="card" staggerIndex={i} />
              </div>
              <Skeleton width={32} height={10} borderRadius={2} tone="subtle" staggerIndex={i} />
            </div>
            <Skeleton width="100%" height={5} borderRadius={99} tone="subtle" staggerIndex={i} />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 8. Distribusi Berdasarkan Severity Skeleton
 * Donut severity di kiri + 3 kartu High/Medium/Low di kanan
 */
export function SeverityDistributionSkeleton() {
  return (
    <div className="flex flex-col sm:grid sm:grid-cols-[auto_1fr] gap-4 sm:gap-6 flex-1 min-h-[180px] max-lg:h-[404px] max-lg:overflow-hidden items-center justify-center" aria-hidden="true">
      {/* Donut */}
      <div className="flex items-center justify-center shrink-0">
        <SkeletonChart variant="donut" height={140} hasLegend={false} />
      </div>

      {/* 4 Severity Cards */}
      <div className="grid grid-cols-2 gap-2.5 w-full h-full">
        {["High", "Medium", "Low"].map((sev, idx) => (
          <div
            key={sev}
            className="p-3 rounded-lg bg-[#0f172a]/30 border border-[#334155] border-l-[3px] border-l-slate-600 flex flex-col justify-between min-h-[75px]"
          >
            <div className="flex items-center gap-1.5">
              <Skeleton width={8} height={8} borderRadius="50%" tone="accent" staggerIndex={idx} />
              <Skeleton width={48} height={10} borderRadius={3} tone="subtle" staggerIndex={idx} />
            </div>
            <Skeleton width={32} height={20} borderRadius={4} tone="card" className="my-0.5" staggerIndex={idx} />
            <Skeleton width="80%" height={6} borderRadius={99} tone="subtle" staggerIndex={idx} />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 9. Tren Durasi Penyelesaian (Resolution Velocity) Skeleton
 * 4 Summary Stat Pills + SVG Smooth Curve Line Chart
 */
export function ResolutionVelocitySkeleton() {
  const mobile = useCompactLayout();
  return (
    <div className="flex flex-col flex-1 gap-3 justify-between min-h-[290px] max-lg:h-[381px] max-lg:min-h-0 max-lg:flex-none max-lg:overflow-hidden" aria-hidden="true">
      {/* 4 Summary Stat Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 max-lg:grid-cols-2 gap-2.5 mb-1 max-lg:[&>div>div:last-child]:hidden max-lg:[&>div>div]:h-[54px]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-1.5 p-2.5 bg-[#0f172a]/30 border border-slate-700/40 rounded-lg"
          >
            <Skeleton width={70} height={10} borderRadius={2} tone="subtle" staggerIndex={i} />
            <Skeleton width={42} height={18} borderRadius={4} tone="card" staggerIndex={i} />
            <Skeleton width={55} height={9} borderRadius={2} tone="subtle" staggerIndex={i} />
          </div>
        ))}
      </div>

      {/* Line Chart Wave */}
      <SkeletonChart variant="line" height={mobile ? 252 : 190} hasLegend={false} />
    </div>
  );
}

/**
 * 10. Tren Trafik Beban per Shift (Shift Traffic Velocity) Skeleton
 * 4 Shift KPI Cards (Pagi, Malam, Subuh, Peak) + Multi-line chart
 */
export function ShiftTrafficSkeleton() {
  const mobile = useCompactLayout();
  return (
    <div className="flex flex-col flex-1 gap-3 justify-between min-h-[290px] max-lg:h-[453px] max-lg:min-h-0 max-lg:flex-none max-lg:overflow-hidden max-lg:after:content-[''] max-lg:after:h-11 max-lg:after:shrink-0 max-lg:after:rounded-lg max-lg:after:bg-slate-900/30" aria-hidden="true">
      {/* 4 Shift KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 max-lg:grid-cols-2 gap-3 mb-1 max-lg:gap-2 max-lg:[&>div]:h-16">
        {["Shift Pagi", "Shift Malam", "Shift Subuh", "Beban Puncak"].map((label, idx) => (
          <div
            key={label}
            className="flex flex-col gap-1.5 p-3 rounded-xl bg-[#0f172a]/30 border border-slate-700/40"
          >
            <div className="flex items-center gap-1.5">
              <Skeleton width={10} height={10} borderRadius="50%" tone="accent" staggerIndex={idx} />
              <Skeleton width={60} height={11} borderRadius={3} tone="subtle" staggerIndex={idx} />
            </div>
            <Skeleton width={38} height={18} borderRadius={4} tone="card" staggerIndex={idx} />
            <Skeleton width={75} height={9} borderRadius={2} tone="subtle" staggerIndex={idx} />
          </div>
        ))}
      </div>

      {/* Traffic Trend Chart */}
      <SkeletonChart variant="line" height={mobile ? 252 : 180} hasLegend={false} />
    </div>
  );
}

/**
 * Komposisi Penuh: DashboardSkeleton
 * Fallback segmen Next.js (loading.tsx) dan fallback Suspense OverviewView
 */
export function DashboardSkeleton() {
  return (
    <div role="status" aria-busy="true" className="w-full flex flex-col gap-5 py-2 max-lg:py-0 max-lg:gap-3 max-lg:overflow-hidden max-lg:[&_button]:min-h-10 max-lg:[&_button]:min-w-10 max-lg:[&_span]:text-[11px]">
      <span className="sr-only" aria-live="polite">Memuat dashboard...</span>

      <div className="flex h-[53px] flex-col gap-2 lg:hidden" aria-hidden="true"><Skeleton width={130} height={11} /><Skeleton width={146} height={26} /></div>
      {/* Live Ops Command Bar */}
      <DashboardLiveOpsCommandBarSkeleton />

      {/* Operational Focus: Today's Tickets & Shift Memo/Monitoring */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_410px] gap-4 w-full ops-focus-grid max-lg:gap-3">
        {/* Today's Tickets */}
        <div className="relative overflow-hidden p-4 sm:p-5 rounded-xl border border-[#334155] bg-[#1e293b] flex flex-col min-h-[640px] max-lg:min-h-0 max-lg:h-[726px] ops-today-panel max-lg:order-2 max-lg:[&.ops-today-panel]:p-0 max-lg:rounded-2xl max-lg:border-slate-700/60">
          {/* Garis Progres Tipis 2px Indeterminate */}
          <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden z-20 pointer-events-none rounded-t-xl bg-slate-800/40" aria-hidden="true">
            <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-sky-400 to-transparent animate-skeleton-bar-indeterminate" />
          </div>
          <div className="flex items-center justify-between pb-3.5 border-b border-[#334155]/60 mb-3 lg:[&]:mb-3 max-lg:mb-0 max-lg:h-[77px] max-lg:min-h-[77px] max-lg:gap-3 max-lg:p-4 max-lg:border-slate-700/50">
            <span className="max-lg:flex max-lg:items-center max-lg:gap-3 lg:contents"><Skeleton className="hidden size-8 max-lg:block" borderRadius={10} /><Skeleton width={130} height={18} borderRadius={4} tone="card" /></span>
            <Skeleton width={60} height={20} borderRadius={99} tone="subtle" />
          </div>
          <div className="report-panel-body flex flex-col flex-1 min-h-0">
            <TodayTicketsSkeleton />
          </div>
          {/* Indikator Halus "Memuat data..." di Pojok Bawah */}
          <div className="absolute bottom-2.5 right-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#0f172a]/80 border border-slate-700/40 text-[10.5px] font-mono text-slate-400 select-none pointer-events-none z-10" aria-hidden="true">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            <span>Memuat data...</span>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-3 min-h-[640px] max-lg:contents max-lg:min-h-0">
          <div className="relative overflow-hidden p-4 rounded-xl border border-[#334155] bg-[#1e293b] flex flex-col min-h-[220px] max-lg:min-h-0 max-lg:h-[282.6px] ops-shift-panel max-lg:order-1 max-lg:[&.ops-shift-panel]:p-0 max-lg:rounded-2xl max-lg:border-slate-700/60">
            <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden z-20 pointer-events-none rounded-t-xl bg-slate-800/40" aria-hidden="true">
              <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-sky-400 to-transparent animate-skeleton-bar-indeterminate" />
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-[#334155]/60 mb-2 max-lg:mb-0 max-lg:h-[77px] max-lg:min-h-[77px] max-lg:gap-3 max-lg:p-4 max-lg:border-slate-700/50">
              <span className="max-lg:flex max-lg:min-w-0 max-lg:items-center max-lg:gap-3 lg:contents"><Skeleton className="hidden size-8 max-lg:block" borderRadius={10} /><Skeleton width={140} height={16} borderRadius={4} tone="card" /></span>
              <PanelViewButton panelTitle="Memo & Catatan Shift" onClick={() => {}} disabled={true} className="max-lg:size-11 max-lg:[&]:min-h-11 max-lg:[&]:min-w-11 max-lg:[&_span]:hidden" />
            </div>
            <div className="max-lg:p-4 lg:contents"><ShiftMemoNotesSkeleton /></div>
          </div>
          <div className="relative overflow-hidden p-4 rounded-xl border border-[#334155] bg-[#1e293b] flex flex-col flex-1 min-h-[380px] max-lg:min-h-0 max-lg:h-[466.5px] ops-engineer-panel max-lg:order-3 max-lg:[&.ops-engineer-panel]:p-0 max-lg:rounded-2xl max-lg:border-slate-700/60">
            <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden z-20 pointer-events-none rounded-t-xl bg-slate-800/40" aria-hidden="true">
              <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-sky-400 to-transparent animate-skeleton-bar-indeterminate" />
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-[#334155]/60 mb-2 max-lg:mb-0 max-lg:h-[77px] max-lg:min-h-[77px] max-lg:gap-3 max-lg:p-4 max-lg:border-slate-700/50">
              <span className="max-lg:flex max-lg:items-center max-lg:gap-3 lg:contents"><Skeleton className="hidden size-8 max-lg:block" borderRadius={10} /><Skeleton width={150} height={16} borderRadius={4} tone="card" /></span>
              <div className="flex items-center gap-1.5">
                <Skeleton width={44} height={18} borderRadius={99} tone="subtle" />
                <Skeleton width={48} height={18} borderRadius={99} tone="subtle" />
              </div>
            </div>
            <div className="max-lg:p-4 lg:contents"><MonitoringChecklistSkeleton /></div>
            <div className="absolute bottom-2.5 right-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#0f172a]/80 border border-slate-700/40 text-[10.5px] font-mono text-slate-400 select-none pointer-events-none z-10" aria-hidden="true">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
              <span>Memuat data...</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[74px] items-center justify-between rounded-xl border border-slate-700 bg-slate-800 p-3 lg:hidden" aria-hidden="true"><Skeleton width={60} height={14} /><Skeleton width={130} height={40} /></div>
      {/* Analytics Volume & User Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-4 w-full max-lg:gap-3">
        <div className="relative overflow-hidden p-5 rounded-xl border border-[#334155] bg-[#1e293b] flex flex-col min-h-[380px] max-lg:min-h-0 max-lg:h-[406px]">
          <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden z-20 pointer-events-none rounded-t-xl bg-slate-800/40" aria-hidden="true">
            <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-sky-400 to-transparent animate-skeleton-bar-indeterminate" />
          </div>
          <div className="flex items-center justify-between pb-3 border-b border-[#334155]/60 mb-3 report-panel-heading">
            <Skeleton width={180} height={18} borderRadius={4} tone="card" />
            <PanelViewButton panelTitle="Volume Tiket" onClick={() => {}} disabled={true} />
          </div>
          <TicketVolumeChartSkeleton />
          <div className="absolute bottom-2.5 right-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#0f172a]/80 border border-slate-700/40 text-[10.5px] font-mono text-slate-400 select-none pointer-events-none z-10" aria-hidden="true">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            <span>Memuat data...</span>
          </div>
        </div>
        <div className="relative overflow-hidden p-4 sm:p-5 rounded-xl border border-[#334155] bg-[#1e293b] flex flex-col min-h-[580px] max-lg:min-h-0 max-lg:h-[451px] user-summary-panel">
          <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden z-20 pointer-events-none rounded-t-xl bg-slate-800/40" aria-hidden="true">
            <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-sky-400 to-transparent animate-skeleton-bar-indeterminate" />
          </div>
          <div className="flex items-center justify-between pb-3 border-b border-[#334155]/60 mb-3 report-panel-heading">
            <Skeleton width={140} height={18} borderRadius={4} tone="card" />
            <Skeleton width={44} height={16} borderRadius={99} tone="subtle" />
          </div>
          <StaffRecapSkeleton />
          <div className="absolute bottom-2.5 right-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#0f172a]/80 border border-slate-700/40 text-[10.5px] font-mono text-slate-400 select-none pointer-events-none z-10" aria-hidden="true">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            <span>Memuat data...</span>
          </div>
        </div>
      </div>

      <div aria-hidden="true" className="h-11 rounded-lg bg-slate-800 border border-slate-700 lg:hidden" />
      {/* Distributions: Category & Severity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-lg:flex max-lg:gap-3 max-lg:overflow-hidden max-lg:[&>div]:min-w-full max-lg:[&>div]:shrink-0 max-lg:[&>div]:h-[507px]">
        <div className="relative overflow-hidden p-5 rounded-xl border border-[#334155] bg-[#1e293b] flex flex-col min-h-[250px]">
          <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden z-20 pointer-events-none rounded-t-xl bg-slate-800/40" aria-hidden="true">
            <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-sky-400 to-transparent animate-skeleton-bar-indeterminate" />
          </div>
          <div className="flex items-center justify-between pb-3 border-b border-[#334155]/60 mb-3">
            <Skeleton width={180} height={18} borderRadius={4} tone="card" />
            <PanelViewButton panelTitle="Distribusi Kategori" onClick={() => {}} disabled={true} />
          </div>
          <CategoryDistributionSkeleton />
        </div>
        <div className="relative overflow-hidden p-5 rounded-xl border border-[#334155] bg-[#1e293b] flex flex-col min-h-[250px]">
          <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden z-20 pointer-events-none rounded-t-xl bg-slate-800/40" aria-hidden="true">
            <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-sky-400 to-transparent animate-skeleton-bar-indeterminate" />
          </div>
          <div className="flex items-center justify-between pb-3 border-b border-[#334155]/60 mb-3">
            <Skeleton width={190} height={18} borderRadius={4} tone="card" />
            <PanelViewButton panelTitle="Distribusi Severity" onClick={() => {}} disabled={true} />
          </div>
          <SeverityDistributionSkeleton />
        </div>
      </div>

      {/* Velocity Trend */}
      <div className="relative overflow-hidden p-5 rounded-xl border border-[#334155] bg-[#1e293b] flex flex-col min-h-[350px] max-lg:min-h-0 max-lg:h-[484px]">
        <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden z-20 pointer-events-none rounded-t-xl bg-slate-800/40" aria-hidden="true">
          <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-sky-400 to-transparent animate-skeleton-bar-indeterminate" />
        </div>
        <div className="flex items-center justify-between pb-3 border-b border-[#334155]/60 mb-3">
          <Skeleton width={200} height={18} borderRadius={4} tone="card" />
          <PanelViewButton panelTitle="Tren Durasi Penyelesaian" onClick={() => {}} disabled={true} />
        </div>
        <ResolutionVelocitySkeleton />
        <div className="absolute bottom-2.5 right-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#0f172a]/80 border border-slate-700/40 text-[10.5px] font-mono text-slate-400 select-none pointer-events-none z-10" aria-hidden="true">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
          <span>Memuat data...</span>
        </div>
      </div>

      {/* Shift Traffic Velocity */}
      <div className="relative overflow-hidden p-5 rounded-xl border border-[#334155] bg-[#1e293b] flex flex-col min-h-[350px] max-lg:min-h-0 max-lg:h-[556px]">
        <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden z-20 pointer-events-none rounded-t-xl bg-slate-800/40" aria-hidden="true">
          <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-sky-400 to-transparent animate-skeleton-bar-indeterminate" />
        </div>
        <div className="flex items-center justify-between pb-3 border-b border-[#334155]/60 mb-3">
          <Skeleton width={220} height={18} borderRadius={4} tone="card" />
          <PanelViewButton panelTitle="Trafik Beban Shift" onClick={() => {}} disabled={true} />
        </div>
        <ShiftTrafficSkeleton />
        <div className="absolute bottom-2.5 right-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#0f172a]/80 border border-slate-700/40 text-[10.5px] font-mono text-slate-400 select-none pointer-events-none z-10" aria-hidden="true">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
          <span>Memuat data...</span>
        </div>
      </div>
    </div>
  );
}
