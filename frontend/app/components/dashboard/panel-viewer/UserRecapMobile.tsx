"use client";
import { MasterProjectName } from "@/app/components/ui/MasterProjectName";

import { useEffect, useRef, useState } from "react";
import { Search, X, ChevronDown, ChevronUp, ChevronRight, Users } from "lucide-react";
import { Avatar } from "@/app/components/ui/Avatar";
import { RECAP_PERIODS, recapCount, type RecapPeriod, type UserSummaryItem, type SortField, type SortDirection } from "./user-recap-periods";

interface UserRecapMobileProps {
  userSummaries: UserSummaryItem[];
  sortedStaff: UserSummaryItem[];
  searchQuery: string;
  onSearch: (query: string) => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  onSelectUserDetail: (user: UserSummaryItem) => void;
  projectColors: Record<string, string>;
  totals: Record<RecapPeriod, number>;
}
// the same five periods and colours as the desktop table
const metrics = Object.fromEntries(RECAP_PERIODS.map(p => [p.key, { label: p.label, short: p.short, color: p.text, fill: p.fill }])) as Record<RecapPeriod, { label: string; short: string; color: string; fill: string }>;
const sortLabels: Record<SortField, string> = { ...Object.fromEntries(RECAP_PERIODS.map(p => [p.key, p.short])) as Record<RecapPeriod, string>, name: "Nama" };
const metricKeys = RECAP_PERIODS.map(p => p.key);
const sortFields: SortField[] = [...metricKeys, "name"];
const valueOf = recapCount;

export function UserRecapMobile({ userSummaries, sortedStaff, searchQuery, onSearch, sortField, sortDirection, onSort, onSelectUserDetail, projectColors, totals }: UserRecapMobileProps) {
  const [expandedName, setExpandedName] = useState<string | null>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const field = sortField === "name" ? "today" : sortField;
  const maxValue = Math.max(1, ...userSummaries.map(user => valueOf(user, field)));
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    let width = window.innerWidth, baseline = viewport.height;
    const update = () => {
      if (width !== window.innerWidth) { width = window.innerWidth; baseline = viewport.height; }
      baseline = Math.max(baseline, window.innerHeight, viewport.height);
      const inputFocused = document.activeElement === searchRef.current;
      setKeyboardOpen(inputFocused && viewport.scale <= 1.05 && baseline - viewport.height > 140);
    };
    const frame = requestAnimationFrame(update);
    viewport.addEventListener("resize", update); window.addEventListener("resize", update);
    document.addEventListener("focusin", update); document.addEventListener("focusout", update);
    return () => { cancelAnimationFrame(frame); viewport.removeEventListener("resize", update); window.removeEventListener("resize", update); document.removeEventListener("focusin", update); document.removeEventListener("focusout", update); };
  }, []);
  const clearSearch = () => { onSearch(""); searchRef.current?.focus(); };

  return <div data-user-recap-mobile className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
    <div data-recap-stats className="grid shrink-0 grid-cols-3 gap-2 px-3 pt-2 [@media(max-height:500px)]:grid-cols-6">
      {[{ label: "Staf", value: userSummaries.length, tone: "text-slate-100" }, ...metricKeys.map(key => ({ label: metrics[key].short, value: totals[key], tone: metrics[key].color }))].map(item => <div key={item.label} className="flex h-10 min-w-0 flex-col justify-center rounded-lg border border-slate-700/60 bg-slate-900/70 px-3"><span className="truncate text-[11px] leading-[14px] text-slate-400">{item.label}</span><strong className={`text-[18px] leading-[22px] font-mono tabular-nums ${item.tone}`}>{item.value}</strong></div>)}
    </div>
    <div data-recap-controls className="sticky top-0 z-10 flex shrink-0 flex-col gap-2 bg-[#0f172a] px-3 py-2">
      <div className="flex h-11 min-w-0 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 pl-3 focus-within:border-sky-400/70 focus-within:ring-2 focus-within:ring-sky-400/15">
        <Search size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
        <input ref={searchRef} data-user-recap-search type="search" aria-label="Cari nama atau peran staf" value={searchQuery} onChange={event => onSearch(event.target.value)} placeholder="Cari staf…" className="h-full min-w-0 flex-1 appearance-none border-0 bg-transparent p-0 text-[16px] text-slate-100 outline-none placeholder:text-slate-500 [&::-webkit-search-cancel-button]:appearance-none" />
        {searchQuery ? <button type="button" onClick={clearSearch} aria-label="Hapus pencarian" className="grid size-11 shrink-0 place-items-center rounded-lg text-slate-400 focus-visible:ring-2 focus-visible:ring-sky-400"><X size={16} /></button> : <span className="w-3 shrink-0" />}
      </div>
      <div role="group" aria-label="Urutan staf" className="grid grid-cols-3 gap-1">
        {sortFields.map(key => <button key={key} type="button" data-sort-field={key} onClick={() => onSort(key)} aria-pressed={sortField === key} aria-label={`Urutkan ${sortLabels[key]}${sortField === key ? sortDirection === "desc" ? ", menurun" : ", menaik" : ""}`} className={`inline-flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-lg border px-1 text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${sortField === key ? "border-sky-400/40 bg-sky-400/14 text-sky-400" : "border-slate-700 bg-slate-900/60 text-slate-400"}`}><span>{sortLabels[key]}</span>{sortField === key && (sortDirection === "desc" ? <ChevronDown size={12} className="shrink-0" /> : <ChevronUp size={12} className="shrink-0" />)}</button>)}
      </div>
      <span className="text-[11px] leading-[14px] text-slate-400" aria-live="polite">Menampilkan {sortedStaff.length} dari {userSummaries.length}</span>
    </div>
    <div data-recap-list className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4 [scrollbar-width:thin]">
      {sortedStaff.length ? <div className="flex min-w-0 flex-col gap-2">{sortedStaff.map(user => {
        const expanded = expandedName === user.name, value = valueOf(user, field), id = `recap-${encodeURIComponent(user.name).replaceAll("%", "")}`, onLeave = /\(on leave\)/i.test(user.role), role = user.role.replace(/\s*\(on leave\)\s*/ig, "").trim(), breakdown = Object.entries(user.todayBreakdown || {});
        return <article key={user.name} className={`min-w-0 overflow-hidden rounded-xl border ${expanded ? "border-sky-400/40 bg-slate-900/70" : "border-slate-700/60 bg-slate-900/40"}`}>
          <button type="button" id={`${id}-button`} data-recap-row={user.name} data-today={user.todayCount} data-month={user.monthCount} data-year={user.yearCount} onClick={() => setExpandedName(previous => previous === user.name ? null : user.name)} aria-expanded={expanded} aria-controls={`${id}-details`} aria-label={`${user.name}, ${metrics[field].short} ${value}, ${expanded ? "ringkas" : "perluas"}`} className="grid min-h-16 w-full min-w-0 grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400">
            <Avatar size="lg" name={user.name} initials={user.initials} className="[&.ui-avatar]:size-10 [&.ui-avatar]:min-h-10 [&.ui-avatar]:min-w-10 [&.ui-avatar]:text-[12px]" />
            <span className="flex min-w-0 flex-col gap-0.5"><span className="truncate text-[14px] leading-[18px] font-semibold text-slate-100" title={user.name}>{user.name}</span><span className="flex min-w-0 items-center gap-1.5 text-[11px] leading-[14px] text-slate-400"><span className="truncate" title={user.role}>{role}</span>{onLeave && <span className="shrink-0 rounded bg-slate-700/70 px-1 text-[11px] text-slate-300">Cuti</span>}</span><svg aria-hidden="true" className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-800"><rect width={`${value / maxValue * 100}%`} height="4" rx="2" fill={metrics[field].fill} /></svg></span>
            <span className="flex min-w-10 shrink-0 flex-col items-end gap-0.5"><strong className={`text-[20px] leading-6 font-mono tabular-nums ${value ? metrics[field].color : "text-[#64748b]"}`}>{value}</strong><span className="text-[11px] leading-[14px] text-slate-400">{metrics[field].short}</span></span>
          </button>
          <div id={`${id}-details`} role="region" aria-labelledby={`${id}-button`} aria-hidden={!expanded} inert={!expanded} className={`grid transition-[grid-template-rows,opacity] duration-150 motion-reduce:transition-none ${expanded ? "grid-rows-[1fr] opacity-100 visible" : "grid-rows-[0fr] opacity-0 invisible"}`}>
            <div className="min-h-0 overflow-hidden"><div className="flex flex-col gap-3 border-t border-slate-700/60 p-3">
              <dl className="grid grid-cols-5 gap-1.5">{metricKeys.map(key => <div key={key} className="min-w-0 rounded-lg border border-slate-700/50 bg-slate-950/40 px-1 py-2 text-center"><dt className="truncate text-[11px] leading-[14px] text-slate-400">{metrics[key].short}</dt><dd className={`m-0 mt-1 text-[18px] leading-[22px] font-mono font-bold ${valueOf(user, key) ? metrics[key].color : "text-[#64748b]"}`}>{valueOf(user, key)}</dd></div>)}</dl>
              {breakdown.length > 0 && <div className="flex min-w-0 gap-1.5 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Sistem hari ini">{breakdown.map(([project, count]) => <span key={project} className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded border border-slate-700 bg-slate-800/60 px-2 text-[11px]"><svg aria-hidden="true" className="size-1.5" viewBox="0 0 6 6"><circle cx="3" cy="3" r="3" fill={projectColors[project] || "#38bdf8"} /></svg><span><MasterProjectName value={project} /></span><strong className="font-mono">{count}</strong></span>)}</div>}
              <button type="button" onClick={() => onSelectUserDetail(user)} aria-label={`Detail ${user.name}`} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-sky-400/40 bg-sky-400/10 text-[13px] font-semibold text-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">Detail<ChevronRight size={16} /></button>
            </div></div>
          </div>
        </article>;
      })}</div> : <div role="status" className="flex min-h-full flex-col items-center justify-center gap-3 py-6 text-[13px] text-slate-400"><Users size={28} /><span>Tidak ditemukan</span><button type="button" onClick={clearSearch} className="min-h-11 rounded-lg border border-slate-600 bg-slate-800 px-3 font-semibold text-slate-200">Hapus pencarian</button></div>}
    </div>
    {!keyboardOpen && <footer data-recap-total className="shrink-0 border-t border-slate-700 bg-slate-900 pb-[env(safe-area-inset-bottom)]" aria-label="Total keseluruhan"><div className="grid h-[55px] grid-cols-[auto_repeat(5,minmax(0,1fr))] items-center gap-1.5 px-3"><span className="text-[13px] font-semibold text-slate-200">Total</span>{metricKeys.map(key => <span key={key} className="flex min-w-0 flex-col items-end"><span className="text-[11px] leading-[14px] text-slate-400">{metrics[key].short}</span><strong data-recap-total-value={key} className={`text-[16px] leading-[22px] font-mono tabular-nums ${metrics[key].color}`}>{totals[key]}</strong></span>)}</div></footer>}
  </div>;
}
