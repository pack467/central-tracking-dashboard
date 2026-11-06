"use client";

import { useState, useMemo } from "react";
import { Search, ChevronUp, ChevronDown, ChevronRight } from "lucide-react";
import { Avatar } from "@/app/components/ui/Avatar";
import { useNarrowTouchLayout } from "@/app/hooks/useMobileLayout";
import { UserRecapMobile } from "./UserRecapMobile";

export interface UserSummaryItem {
  name: string;
  role: string;
  initials: string;
  todayCount: number;
  monthCount: number;
  yearCount: number;
  todayBreakdown: Record<string, number>;
  monthBreakdown?: Record<string, number>;
  yearBreakdown?: Record<string, number>;
  recentTickets?: unknown[];
  tickets?: unknown[];
}

interface UserRecapViewProps {
  userSummaries: UserSummaryItem[];
  onSelectUserDetail: (user: UserSummaryItem) => void;
  projectColors: Record<string, string>;
}

export type SortField = "name" | "today" | "month" | "year";
export type SortDirection = "asc" | "desc";

export function UserRecapView({
  userSummaries,
  onSelectUserDetail,
  projectColors,
}: UserRecapViewProps) {
  const narrow = useNarrowTouchLayout();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("today");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Max values for mini progress bars
  const maxMonth = useMemo(() => Math.max(...userSummaries.map((u) => u.monthCount), 1), [userSummaries]);
  const maxYear = useMemo(() => Math.max(...userSummaries.map((u) => u.yearCount), 1), [userSummaries]);

  // Handle sort header click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Filtered and sorted staff
  const sortedStaff = useMemo(() => {
    const list = userSummaries.filter(
      (u) =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") cmp = a.name.localeCompare(b.name);
      else if (sortField === "today") cmp = a.todayCount - b.todayCount;
      else if (sortField === "month") cmp = a.monthCount - b.monthCount;
      else if (sortField === "year") cmp = a.yearCount - b.yearCount;

      return sortDirection === "asc" ? cmp : -cmp;
    });

    return list;
  }, [userSummaries, searchQuery, sortField, sortDirection]);

  // Totals
  const totalToday = useMemo(() => userSummaries.reduce((a, b) => a + b.todayCount, 0), [userSummaries]);
  const totalMonth = useMemo(() => userSummaries.reduce((a, b) => a + b.monthCount, 0), [userSummaries]);
  const totalYear = useMemo(() => userSummaries.reduce((a, b) => a + b.yearCount, 0), [userSummaries]);

  if (narrow) return <UserRecapMobile userSummaries={userSummaries} sortedStaff={sortedStaff} searchQuery={searchQuery} onSearch={setSearchQuery} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} onSelectUserDetail={onSelectUserDetail} projectColors={projectColors} totals={{ today: totalToday, month: totalMonth, year: totalYear }} />;

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">
      {/* ── 1. Compact 4-Stat Strip (~60px height) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0">
        <div className="h-[60px] px-3.5 py-2 rounded-xl bg-slate-900/70 border border-slate-700/60 flex flex-col justify-center shadow-sm">
          <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-slate-400">
            TOTAL STAF OPERASIONAL
          </span>
          <div className="text-[20px] font-mono font-bold text-white tabular-nums leading-tight">
            {userSummaries.length} <span className="text-xs font-normal text-slate-400">personel</span>
          </div>
        </div>

        <div className="h-[60px] px-3.5 py-2 rounded-xl bg-slate-900/70 border border-slate-700/60 flex flex-col justify-center shadow-sm">
          <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-slate-400">
            TIKET HARI INI
          </span>
          <div className="text-[20px] font-mono font-bold text-sky-400 tabular-nums leading-tight">
            {totalToday} <span className="text-xs font-normal text-slate-400">tiket</span>
          </div>
        </div>

        <div className="h-[60px] px-3.5 py-2 rounded-xl bg-slate-900/70 border border-slate-700/60 flex flex-col justify-center shadow-sm">
          <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-slate-400">
            TIKET BULAN INI
          </span>
          <div className="text-[20px] font-mono font-bold text-emerald-400 tabular-nums leading-tight">
            {totalMonth} <span className="text-xs font-normal text-slate-400">tiket</span>
          </div>
        </div>

        <div className="h-[60px] px-3.5 py-2 rounded-xl bg-slate-900/70 border border-slate-700/60 flex flex-col justify-center shadow-sm">
          <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-slate-400">
            TIKET TAHUN INI
          </span>
          <div className="text-[20px] font-mono font-bold text-indigo-400 tabular-nums leading-tight">
            {totalYear} <span className="text-xs font-normal text-slate-400">tiket</span>
          </div>
        </div>
      </div>

      {/* ── 2. Search & Filter Bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-1 text-xs shrink-0">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama atau peran staf..."
            className="w-full h-8 pl-9 pr-3 rounded-lg bg-slate-900/80 border border-slate-700/80 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
          />
        </div>

        <span className="text-[11px] font-mono text-slate-500">
          Menampilkan {sortedStaff.length} dari {userSummaries.length} staf
        </span>
      </div>

      {/* ── 3. Main Table: Fills Panel completely to the bottom without dead band ── */}
      <div className="flex-1 min-h-0 bg-slate-900/40 rounded-xl border border-slate-700/60 overflow-hidden flex flex-col">
        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900/95 sticky top-0 z-10 border-b border-slate-700 font-mono text-slate-300">
              <tr className="h-10">
                <th
                  onClick={() => handleSort("name")}
                  className="py-2.5 px-4 font-semibold cursor-pointer hover:text-sky-400 sticky left-0 bg-slate-900/95 z-20 select-none min-w-[200px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Staf</span>
                    {sortField === "name" && (
                      sortDirection === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("today")}
                  className="py-2.5 px-3 font-semibold text-right cursor-pointer hover:text-sky-400 select-none whitespace-nowrap min-w-[100px]"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Hari Ini</span>
                    {sortField === "today" && (
                      sortDirection === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                    )}
                  </div>
                </th>
                <th className="py-2.5 px-4 font-semibold text-left select-none hidden md:table-cell min-w-[220px]">
                  <span>Rincian Sistem (Hari Ini)</span>
                </th>
                <th
                  onClick={() => handleSort("month")}
                  className="py-2.5 px-4 font-semibold text-right cursor-pointer hover:text-sky-400 select-none whitespace-nowrap min-w-[130px]"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Bulan Ini</span>
                    {sortField === "month" && (
                      sortDirection === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("year")}
                  className="py-2.5 px-4 font-semibold text-right cursor-pointer hover:text-sky-400 select-none whitespace-nowrap min-w-[130px]"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Tahun Ini</span>
                    {sortField === "year" && (
                      sortDirection === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                    )}
                  </div>
                </th>
                <th className="py-2.5 px-3 text-center font-semibold w-12 select-none">
                  <span>Aksi</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {sortedStaff.map((user) => {
                const breakdown = Object.entries(user.todayBreakdown || {}) as [string, number][];
                const monthPct = Math.round((user.monthCount / maxMonth) * 100);
                const yearPct = Math.round((user.yearCount / maxYear) * 100);

                return (
                  <tr
                    key={user.name}
                    className="h-11 hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    onClick={() => onSelectUserDetail(user)}
                  >
                    {/* Staff name & role */}
                    <td className="py-2 px-4 sticky left-0 bg-slate-900/90 group-hover:bg-slate-850/90 transition-colors z-10 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          initials={user.initials}
                          name={user.name}
                          size="sm"
                          className="w-7 h-7 text-[11px]"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-slate-100 group-hover:text-sky-400 transition-colors text-xs truncate">
                            {user.name}
                          </span>
                          <span className="text-[10.5px] text-slate-400 truncate">
                            {user.role}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Today Count */}
                    <td className="py-2 px-3 text-right tabular-nums font-bold text-sm text-sky-400">
                      {user.todayCount}
                    </td>

                    {/* System Breakdown Chips */}
                    <td className="py-2 px-4 hidden md:table-cell">
                      {breakdown.length > 0 ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {breakdown.map(([project, count]) => (
                            <span
                              key={project}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] bg-slate-800/80 border border-slate-700/80 text-slate-200"
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ background: projectColors[project] || "#38bdf8" }}
                              />
                              <span className="text-slate-400">{project}:</span>
                              <b>{count}</b>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-600 text-[11px]">-</span>
                      )}
                    </td>

                    {/* Month Count with Mini Bar */}
                    <td className="py-2 px-4 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="tabular-nums font-bold text-emerald-400 text-xs">
                          {user.monthCount}
                        </span>
                        <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${monthPct}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Year Count with Mini Bar */}
                    <td className="py-2 px-4 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="tabular-nums font-bold text-indigo-400 text-xs">
                          {user.yearCount}
                        </span>
                        <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${yearPct}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Action Arrow */}
                    <td className="py-2 px-3 text-center">
                      <ChevronRight
                        size={15}
                        className="text-slate-500 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all inline-block"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-900/95 sticky bottom-0 border-t-2 border-slate-700 font-mono font-bold text-slate-100 z-10">
              <tr className="h-11">
                <td className="py-2.5 px-4 sticky left-0 bg-slate-900/95">Total Keseluruhan</td>
                <td className="py-2.5 px-3 text-right tabular-nums text-sky-400">{totalToday}</td>
                <td className="py-2.5 px-4 hidden md:table-cell text-slate-400 text-xs font-normal">
                  Rata-rata: {(totalToday / (userSummaries.length || 1)).toFixed(1)} tiket/staf
                </td>
                <td className="py-2.5 px-4 text-right tabular-nums text-emerald-400">{totalMonth}</td>
                <td className="py-2.5 px-4 text-right tabular-nums text-indigo-400">{totalYear}</td>
                <td className="py-2.5 px-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
