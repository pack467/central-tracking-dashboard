"use client";
import type { ReactNode } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Database } from "lucide-react";
import { Select } from "@/app/components/ui/Select";
import type { MasterPage } from "@/app/types/master-data";
import { buttonClass, iconClass } from "./master-ui";

/** Same frame as DataTable: header 40 px, rows 64 px, the same edge padding, a fixed-width tail for Status and Aksi. */
export function ListSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Memuat daftar"
      className="@container overflow-hidden rounded-2xl border border-[rgba(148,163,184,0.12)] bg-[#1e293b] motion-safe:animate-pulse"
    >
      <div className="hidden h-10 items-center border-b border-slate-700/70 bg-[#182234] px-5 @[600px]:flex">
        <div className="h-2.5 w-24 rounded bg-slate-700/70" />
        <div className="ml-auto h-2.5 w-[132px] rounded bg-slate-700/70" />
        <div className="h-2.5 w-[136px] rounded bg-slate-700/70" />
      </div>
      {Array.from(
        { length: count },
        (_, i) => (
          <div key={i} className="flex h-[112px] items-center gap-3 border-t border-slate-700/60 px-5 first:border-t-0 @[600px]:h-16">
            <div className="size-10 shrink-0 rounded-lg bg-slate-700/70" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3 w-2/5 rounded bg-slate-700/70" />
              <div className="h-2.5 w-1/4 rounded bg-slate-700/50" />
            </div>
            <div className="h-5 w-16 shrink-0 rounded-full bg-slate-700/60 @[600px]:mr-[56px]" />
            <div className="hidden h-5 w-24 shrink-0 rounded bg-slate-700/60 @[600px]:block" />
          </div>
        )
      )}
    </div>
  );
}

export function ListError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      className="flex min-h-[480px] flex-col items-center justify-center gap-4 rounded-2xl border border-rose-400/25 bg-[#1e293b] px-6 py-12 text-center lg:min-h-[560px]"
    >
      <span className="inline-grid size-12 place-items-center rounded-xl border border-rose-400/25 bg-rose-400/10 text-rose-300">
        <AlertTriangle size={22} aria-hidden="true" />
      </span>
      <div>
        <p role="alert" className="text-sm font-semibold text-slate-100">{message}</p>
        <p className="mt-1 text-xs text-slate-400">Daftar belum dapat dimuat.</p>
      </div>
      <button type="button" className={buttonClass} onClick={onRetry}>Coba lagi</button>
    </div>
  );
}
export function ListEmpty({ filtered, label, onReset, action }: { filtered: boolean; label: string; onReset: () => void; action?: ReactNode }) {
  return (
    <div
      className="flex min-h-[480px] flex-col items-center justify-center gap-4 rounded-2xl border border-[rgba(148,163,184,0.12)] bg-[#1e293b] px-6 py-12 text-center lg:min-h-[560px]"
    >
      <span className="inline-grid size-12 place-items-center rounded-xl border border-slate-700 bg-slate-800/70 text-slate-400">
        <Database size={22} aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-100">{filtered ? "Tidak ada hasil" : "Belum ada data"}</p>
        <p className="mt-1 text-xs text-slate-400">
          {filtered ? "Coba kata kunci atau filter lain." : `Tambahkan ${label.toLowerCase()} pertama.`}
        </p>
      </div>
      {filtered ? <button type="button" className={buttonClass} onClick={onReset}>Reset filter</button> : action}
    </div>
  );
}

export function MasterPager({ meta, pageSize, onPage, onSize }: { meta: MasterPage<unknown>["meta"]; pageSize: number; onPage: (page: number) => void; onSize: (size: 10 | 25 | 50) => void }) {
  return (
    <footer className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-t border-slate-700/60 px-5 py-2 text-[12px] text-slate-400">
      <p aria-live="polite"><span className="font-dashboard-mono tabular-nums text-slate-200">{meta.total ? (meta.page - 1) * meta.pageSize + 1 : 0}-{Math.min(meta.page * meta.pageSize, meta.total)}</span> dari <span className="font-dashboard-mono tabular-nums text-slate-200">{meta.total}</span></p>
      <div className="flex items-center gap-2">
        <label htmlFor="master-page-size" className="hidden sm:inline">Baris</label>
        <div
          className="[&_button[data-select-trigger]]:h-11 [&_button[data-select-trigger]]:min-h-11 lg:[&_button[data-select-trigger]]:h-9 lg:[&_button[data-select-trigger]]:min-h-9"
        >
          <Select
            id="master-page-size"
            aria-label={`Jumlah per halaman: ${pageSize}`}
            className="w-[72px]"
            value={pageSize}
            options={[10, 25, 50].map(n => ({ value: n, label: String(n) }))}
            onValueChange={size => onSize(Number(size) as 10 | 25 | 50)}
          />
        </div>
        <button
          type="button"
          className={iconClass}
          disabled={meta.page <= 1}
          onClick={() => onPage(meta.page - 1)}
          aria-label="Halaman sebelumnya"
          title="Halaman sebelumnya"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          className={iconClass}
          disabled={meta.page >= meta.totalPages}
          onClick={() => onPage(meta.page + 1)}
          aria-label="Halaman berikutnya"
          title="Halaman berikutnya"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </footer>
  );
}
