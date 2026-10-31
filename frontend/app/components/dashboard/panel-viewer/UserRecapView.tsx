"use client";

import { useState, useMemo } from "react";
import { Search, X, ChevronUp, ChevronDown, ChevronsUpDown, ChevronRight, Users } from "lucide-react";
import { Avatar } from "@/app/components/ui/Avatar";
import { useNarrowTouchLayout } from "@/app/hooks/useMobileLayout";
import { UserRecapMobile } from "./UserRecapMobile";
import { RECAP_PERIODS, recapCount, type RecapPeriod, type SortDirection, type SortField, type UserSummaryItem } from "./user-recap-periods";

export type { UserSummaryItem } from "./user-recap-periods";

interface UserRecapViewProps {
  userSummaries: UserSummaryItem[];
  onSelectUserDetail: (user: UserSummaryItem) => void;
  projectColors: Record<string, string>;
}

/** Which columns step aside as the panel narrows: the project chips first, then the week. Today and the totals always stay. */
const COLUMN_VISIBILITY: Partial<Record<RecapPeriod | "projects", string>> = { week: "hidden lg:table-cell", projects: "hidden xl:table-cell" };

export function UserRecapView({ userSummaries, onSelectUserDetail, projectColors }: UserRecapViewProps) {
  const narrow = useNarrowTouchLayout();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("today");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDirection(field === "name" ? "asc" : "desc"); }
  };

  const sortedStaff = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    const list = userSummaries.filter(u => u.name.toLowerCase().includes(needle) || u.role.toLowerCase().includes(needle));
    list.sort((a, b) => {
      const cmp = sortField === "name" ? a.name.localeCompare(b.name) : recapCount(a, sortField) - recapCount(b, sortField) || a.name.localeCompare(b.name);
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return list;
  }, [userSummaries, searchQuery, sortField, sortDirection]);

  // Per period: everybody's sum (summary cards and footer) and the highest single count (the scale of that column's bars)
  const totals = useMemo(() => Object.fromEntries(RECAP_PERIODS.map(p => [p.key, userSummaries.reduce((sum, u) => sum + recapCount(u, p.key), 0)])) as Record<RecapPeriod, number>, [userSummaries]);
  const maxima = useMemo(() => Object.fromEntries(RECAP_PERIODS.map(p => [p.key, Math.max(1, ...userSummaries.map(u => recapCount(u, p.key)))])) as Record<RecapPeriod, number>, [userSummaries]);
  const activeToday = userSummaries.filter(u => u.todayCount > 0).length;

  if (narrow) return <UserRecapMobile userSummaries={userSummaries} sortedStaff={sortedStaff} searchQuery={searchQuery} onSearch={setSearchQuery} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} onSelectUserDetail={onSelectUserDetail} projectColors={projectColors} totals={totals} />;

  const sortIcon = (field: SortField) => sortField !== field
    ? <ChevronsUpDown size={12} className="text-slate-600" aria-hidden="true" />
    : sortDirection === "asc" ? <ChevronUp size={13} aria-hidden="true" /> : <ChevronDown size={13} aria-hidden="true" />;
  const ariaSort = (field: SortField) => sortField === field ? (sortDirection === "asc" ? "ascending" : "descending") : "none";

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3" data-user-recap-view>
      {/* ── 1. One card per number: staff, then every period ── */}
      <div className="grid shrink-0 grid-cols-3 gap-2.5 xl:grid-cols-6">
        <div className="flex h-[64px] min-w-0 flex-col justify-center gap-1 rounded-xl border border-slate-600/50 bg-slate-800/40 px-3.5" title={`${activeToday} staf punya tiket hari ini`}>
          <strong className="font-mono text-[22px] font-bold leading-none tabular-nums text-slate-100">{userSummaries.length}</strong>
          <span className="truncate text-[11.5px] text-slate-400">Staf · {activeToday} aktif hari ini</span>
        </div>
        {RECAP_PERIODS.map(p => (
          <div key={p.key} className={`flex h-[64px] min-w-0 flex-col justify-center gap-1 rounded-xl border px-3.5 ${p.card}`} title={p.hint}>
            <strong className={`font-mono text-[22px] font-bold leading-none tabular-nums ${p.text}`}>{totals[p.key].toLocaleString("id-ID")}</strong>
            <span className="truncate text-[11.5px] text-slate-400">Tiket {p.label}</span>
          </div>
        ))}
      </div>

      {/* ── 2. Search ── */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari nama atau peran staf..."
            aria-label="Cari nama atau peran staf"
            className="h-9 w-full rounded-lg border border-slate-700/80 bg-slate-900/80 pl-9 pr-9 text-[13px] text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {searchQuery && <button type="button" onClick={() => setSearchQuery("")} aria-label="Hapus pencarian" className="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-200"><X size={14} /></button>}
        </div>
        <span className="text-[12px] text-slate-400" aria-live="polite">Menampilkan <b className="font-semibold text-slate-200">{sortedStaff.length}</b> dari {userSummaries.length} staf · klik judul kolom untuk mengurutkan</span>
      </div>

      {/* ── 3. The table: fills the panel; header and totals stay in view while the rows scroll ── */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-700/60 bg-[#0f172a]">
        <div className="min-h-0 flex-1 overflow-auto [scrollbar-width:thin]">
          <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
            <thead className="sticky top-0 z-10 bg-[#0f172a] text-[11.5px] text-slate-400 shadow-[0_1px_0_#334155]">
              <tr className="h-11">
                <th scope="col" aria-sort={ariaSort("name")} className="sticky left-0 z-20 w-[260px] bg-[#0f172a] px-4 font-semibold xl:w-[300px]">
                  <button type="button" onClick={() => handleSort("name")} className={`inline-flex items-center gap-1.5 hover:text-sky-300 ${sortField === "name" ? "text-sky-300" : ""}`}>Staf {sortIcon("name")}</button>
                </th>
                {RECAP_PERIODS.map(p => (
                  <th key={p.key} scope="col" aria-sort={ariaSort(p.key)} className={`w-[118px] px-3 text-right font-semibold ${COLUMN_VISIBILITY[p.key] ?? ""}`} title={p.hint}>
                    <button type="button" onClick={() => handleSort(p.key)} className={`inline-flex items-center gap-1.5 whitespace-nowrap hover:text-sky-300 ${sortField === p.key ? "text-sky-300" : ""}`}>
                      <span className="size-1.5 rounded-full" style={{ background: p.fill }} aria-hidden="true" />{p.label} {sortIcon(p.key)}
                    </button>
                  </th>
                ))}
                <th scope="col" className={`px-4 font-semibold ${COLUMN_VISIBILITY.projects}`}>Proyek Hari Ini</th>
                <th scope="col" className="w-12 px-3"><span className="sr-only">Detail</span></th>
              </tr>
            </thead>
            <tbody>
              {sortedStaff.map(user => {
                const projects = Object.entries(user.todayBreakdown || {}).sort((a, b) => b[1] - a[1]);
                return (
                  <tr
                    key={user.name}
                    onClick={() => onSelectUserDetail(user)}
                    className="group h-[58px] cursor-pointer border-b border-slate-800/80 bg-[#0f172a] transition-colors hover:bg-[#18233a]"
                  >
                    <td className="sticky left-0 z-[1] bg-inherit px-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar initials={user.initials} name={user.name} size="sm" className="size-8 shrink-0 text-[11px]" />
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-[13px] font-semibold text-slate-100 group-hover:text-sky-300" title={user.name}>{user.name}</span>
                          <span className="truncate text-[11.5px] text-slate-400" title={user.role}>{user.role || "—"}</span>
                        </div>
                      </div>
                    </td>
                    {RECAP_PERIODS.map(p => {
                      const value = recapCount(user, p.key);
                      return (
                        <td key={p.key} className={`px-3 ${COLUMN_VISIBILITY[p.key] ?? ""}`}>
                          <div className="flex flex-col items-end gap-1.5">
                            <span className={`font-mono text-[14px] font-bold leading-none tabular-nums ${value ? p.text : "text-slate-600"}`}>{value.toLocaleString("id-ID")}</span>
                            {/* a bar only where there is something to compare; an empty slot keeps the rows aligned */}
                            <span className={`block h-1 w-[72px] overflow-hidden rounded-full ${value ? "bg-slate-800" : ""}`} aria-hidden="true">
                              {value > 0 && <span className="block h-full rounded-full" style={{ width: `${Math.max(4, (value / maxima[p.key]) * 100)}%`, background: p.fill }} />}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                    <td className={`px-4 ${COLUMN_VISIBILITY.projects}`}>
                      {projects.length ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {projects.map(([project, count]) => (
                            <span key={project} className="inline-flex items-center gap-1.5 rounded-md border border-slate-700/80 bg-slate-800/70 px-1.5 py-0.5 text-[11px] text-slate-300">
                              <span className="size-1.5 rounded-full" style={{ background: projectColors[project] || "#38bdf8" }} aria-hidden="true" />
                              {project}<b className="font-mono text-slate-100">{count}</b>
                            </span>
                          ))}
                        </div>
                      ) : <span className="text-[12px] text-slate-600">Belum ada</span>}
                    </td>
                    <td className="px-3 text-center">
                      <button type="button" onClick={event => { event.stopPropagation(); onSelectUserDetail(user); }} aria-label={`Detail ${user.name}`} className="grid size-8 place-items-center rounded-md text-slate-500 hover:bg-slate-700/60 hover:text-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">
                        <ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!sortedStaff.length && (
                <tr>
                  <td colSpan={RECAP_PERIODS.length + 3} className="py-12 text-center text-[13px] text-slate-400">
                    <div className="flex flex-col items-center gap-2"><Users size={24} aria-hidden="true" />Tidak ada staf yang cocok dengan “{searchQuery}”.</div>
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="sticky bottom-0 z-10 bg-[#0f172a] shadow-[0_-1px_0_#334155]">
              <tr className="h-12">
                <th scope="row" className="sticky left-0 z-20 bg-[#0f172a] px-4 text-[13px] font-semibold text-slate-200">Total keseluruhan</th>
                {RECAP_PERIODS.map(p => (
                  <td key={p.key} className={`px-3 text-right font-mono text-[14px] font-bold tabular-nums ${p.text} ${COLUMN_VISIBILITY[p.key] ?? ""}`}>{totals[p.key].toLocaleString("id-ID")}</td>
                ))}
                <td className={`px-4 text-[12px] text-slate-400 ${COLUMN_VISIBILITY.projects}`}>Rata-rata hari ini {(totals.today / (userSummaries.length || 1)).toLocaleString("id-ID", { maximumFractionDigits: 1 })} tiket/staf</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
