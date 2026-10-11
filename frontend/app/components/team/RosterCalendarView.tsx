"use client";
import { paths } from "@/app/lib/routes";
import Link from "next/link";
import { routes } from "@/app/lib/routes";


import { useUrlQuery } from "@/app/hooks/useUrlQuery";
import { rosterSchema, weekStart, isoWeek } from "@/app/lib/query-state";


import { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Info,
  Clock,
} from "lucide-react";
import { Avatar } from "@/app/components/ui/Avatar";
import { initials } from "@/app/lib/data";
import { ModalCloseButton } from "@/app/components/ui/ModalCloseButton";
import { shiftColor } from "@/app/components/team/RosterTable";
import type { DayScheduleType, RosterMember } from "@/app/lib/types";

interface RosterCalendarViewProps {
  members: RosterMember[];
  onSelectMember: (member: RosterMember) => void;
}

/* ── helpers ─────────────────────────────────────────── */
export const SHIFT_STYLE_MAP: Record<
  DayScheduleType,
  {
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    hoverBg: string;
    swatchBg: string;
    label: string;
  }
> = {
  Subuh: {
    badgeBg: "bg-[#38bdf8]/15",
    badgeBorder: "border-[#38bdf8]/35",
    badgeText: "text-[#38bdf8]",
    hoverBg: "hover:bg-[#38bdf8]/25",
    swatchBg: "bg-[#38bdf8]",
    label: "Subuh (00:00–08:30)",
  },
  Pagi: {
    badgeBg: "bg-[#fbbf24]/15",
    badgeBorder: "border-[#fbbf24]/35",
    badgeText: "text-[#fbbf24]",
    hoverBg: "hover:bg-[#fbbf24]/25",
    swatchBg: "bg-[#fbbf24]",
    label: "Pagi (08:00–16:30)",
  },
  Malam: {
    badgeBg: "bg-[#c084fc]/15",
    badgeBorder: "border-[#c084fc]/35",
    badgeText: "text-[#c084fc]",
    hoverBg: "hover:bg-[#c084fc]/25",
    swatchBg: "bg-[#c084fc]",
    label: "Malam (16:00–00:30)",
  },
  Off: {
    badgeBg: "bg-[#0f172a]/60",
    badgeBorder: "border-[#334155]/60",
    badgeText: "text-[#94a3b8]",
    hoverBg: "hover:bg-[#1e293b]",
    swatchBg: "bg-[#64748b]",
    label: "Off Duty",
  },
  Leave: {
    badgeBg: "bg-[#f87171]/15",
    badgeBorder: "border-[#f87171]/35",
    badgeText: "text-[#f87171]",
    hoverBg: "hover:bg-[#f87171]/25",
    swatchBg: "bg-[#f87171]",
    label: "Cuti / Leave",
  },
};

const SHIFT_LEGEND_KEYS: DayScheduleType[] = ["Subuh", "Pagi", "Malam", "Off", "Leave"];

const CALENDAR_GRID_ROW =
  "grid grid-cols-[148px_repeat(7,minmax(72px,1fr))] @[560px]:grid-cols-[200px_repeat(7,minmax(84px,1fr))] @[900px]:grid-cols-[232px_repeat(7,minmax(92px,1fr))]";

/** Returns 0=Sun, 1=Mon, …, 6=Sat.  We display Mon-Sun so index 0 = Mon. */
function buildMonthGrid(year: number, month: number) {
  // month: 0-indexed (JS Date convention)
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const totalDays = lastDay.getDate();

  // Day of week for 1st: convert JS (Sun=0) to Mon-based (Mon=0)
  const startDow = (firstDay.getDay() + 6) % 7; // Mon=0 … Sun=6

  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = Array(startDow).fill(null);

  for (let d = 1; d <= totalDays; d++) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

/** Map a member's weeklySchedule to a shift for a given weekday index (Mon=0..Sun=6) */
function memberShiftForDow(member: RosterMember, dow: number): DayScheduleType {
  return (member.weeklySchedule[dow]?.shift as DayScheduleType) ?? "Off";
}

const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function RosterCalendarView({ members, onSelectMember }: RosterCalendarViewProps) {
  const url = useUrlQuery(rosterSchema, paths.teamRoster);
  // View mode: "weekly" | "monthly"
  const calMode = url.values.view === "monthly" ? "monthly" : "weekly";
  const setCalMode = (mode: "weekly" | "monthly") => url.update({ view: mode, page: 1 }, "push");

  // Weekly state
  const weekOffset = Math.round((weekStart(url.values.week).getTime() - weekStart(rosterSchema.week.default).getTime()) / 604800000);
  const setWeekOffset = (next: number | ((old: number) => number)) => {
    const offset = typeof next === "function" ? next(weekOffset) : next;
    url.update({ week: isoWeek(new Date(weekStart(rosterSchema.week.default).getTime() + offset * 604800000)) }, "push");
  };

  // Monthly state – default to current month (Aug 2026 based on seed data)
  const today = new Date(2026, 7, 28); // Aug 28 2026
  const monthDate = useMemo(() => new Date(`${url.values.month}-01T12:00:00`), [url.values.month]);
  const setMonthDate = (next: Date | ((old: Date) => Date)) => { const date = typeof next === "function" ? next(monthDate) : next; url.update({ month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` }, "push"); };
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const monthGrid = useMemo(() => buildMonthGrid(monthDate.getFullYear(), monthDate.getMonth()), [monthDate]);

  const todayDate = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();
  const isCurrentMonth = monthDate.getFullYear() === todayYear && monthDate.getMonth() === todayMonth;

  // Weekly days (seed-based, fixed for demo)
  const weekDays = Array.from({ length: 7 }, (_, dow) => {
    const d = new Date(weekStart(url.values.week).getTime() + dow * 86400000);
    return { short: DOW_LABELS[dow], date: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" }), dow, isToday: d.toISOString().slice(0,10) === "2026-08-28" };
  });

  // Members scheduled on a particular day-of-month
  const membersOnDay = useMemo(() => {
    if (selectedDay === null) return [];
    // dow: 0=Mon
    const dow = (new Date(monthDate.getFullYear(), monthDate.getMonth(), selectedDay).getDay() + 6) % 7;
    return members.map((m) => ({ member: m, shift: memberShiftForDow(m, dow) })).filter(({ shift }) => shift !== "Off");
  }, [selectedDay, members, monthDate]);

  const prevMonth = () => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const goToday = () => { setMonthDate(new Date(todayYear, todayMonth, 1)); setSelectedDay(todayDate); };

  // Weekly members pagination
  const currentPage = url.values.page;
  const setCurrentPage = url.field("page", "push");
  const pageSize = url.values.size;
  const setPageSize = url.field("size", "replace");
  const totalCount = members.length;
  const effectivePageSize = pageSize === "all" ? Math.max(1, totalCount) : pageSize;
  const totalPages = pageSize === "all" ? 1 : Math.max(1, Math.ceil(totalCount / effectivePageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIdx = (safeCurrentPage - 1) * (pageSize === "all" ? totalCount : pageSize);
  const paginatedMembers = useMemo(() => {
    if (pageSize === "all") return members;
    return members.slice(startIdx, startIdx + pageSize);
  }, [members, startIdx, pageSize]);

  const endIdx = totalCount === 0 ? 0 : Math.min(startIdx + paginatedMembers.length, totalCount);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    pages.push(1);
    if (safeCurrentPage > 3) {
      pages.push("...");
    }
    const start = Math.max(2, safeCurrentPage - 1);
    const end = Math.min(totalPages - 1, safeCurrentPage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (safeCurrentPage < totalPages - 2) {
      pages.push("...");
    }
    if (totalPages > 1) {
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, safeCurrentPage]);

  return (
    <div className="@container p-0">
      {/* ── Top Bar ── */}
      <div className="flex flex-col @[900px]:flex-row @[900px]:items-center justify-between gap-3 p-3.5 sm:p-4 border-b border-[#334155] bg-[#1e293b]">
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-[#f8fafc]">
          <CalendarIcon size={16} className="text-[#38bdf8] shrink-0" />
          {calMode === "weekly" ? (
            <div className="flex flex-wrap items-center gap-2">
              <strong className="font-semibold text-[13.5px]">{url.values.week === rosterSchema.week.default ? "Week 34 · 24 Aug – 30 Aug 2026" : `Week ${Number(url.values.week.slice(-2))} · ${weekDays[0].date} – ${weekDays[6].date} ${url.values.week.slice(0,4)}`}</strong>
              {weekOffset === 0 && (
                <span className="text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-[4px] bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/30">
                  CURRENT WEEK
                </span>
              )}
            </div>
          ) : (
            <strong>{MONTH_NAMES[monthDate.getMonth()]} {monthDate.getFullYear()}</strong>
          )}
        </div>

        <div className="flex flex-wrap @[560px]:flex-nowrap items-center gap-2 w-full @[900px]:w-auto">
          {/* View mode toggle */}
          <div className="inline-flex items-center gap-0.5 h-[36px] p-1 bg-[#0f172a] border border-[#334155] rounded-[8px] w-full @[560px]:w-auto justify-stretch shrink-0" aria-label="Switch calendar view">
            <button
              type="button"
              className={`flex-1 @[560px]:flex-initial inline-flex items-center justify-center h-[28px] px-3 text-[11.5px] font-semibold rounded-[6px] gap-1.5 cursor-pointer transition-colors duration-150 ${
                calMode === "weekly"
                  ? "bg-[#0284c7] text-white shadow-sm font-bold"
                  : "bg-transparent text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#1e293b]"
              }`}
              onClick={() => setCalMode("weekly")}
            >
              Weekly
            </button>
            <button
              type="button"
              className={`flex-1 @[560px]:flex-initial inline-flex items-center justify-center h-[28px] px-3 text-[11.5px] font-semibold rounded-[6px] gap-1.5 cursor-pointer transition-colors duration-150 ${
                calMode === "monthly"
                  ? "bg-[#0284c7] text-white shadow-sm font-bold"
                  : "bg-transparent text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#1e293b]"
              }`}
              onClick={() => setCalMode("monthly")}
            >
              Monthly
            </button>
          </div>

          {/* Nav buttons */}
          <div className="grid grid-cols-3 @[560px]:flex gap-1.5 w-full @[560px]:w-auto shrink-0">
            {calMode === "weekly" ? (
              <>
                <button
                  type="button"
                  className="inline-flex items-center justify-center h-[36px] @[560px]:h-[32px] px-2.5 rounded-[6px] text-[11.5px] font-semibold text-[#cbd5e1] bg-[#0f172a] border border-[#334155] hover:bg-[#243044] hover:text-[#f8fafc] transition-colors cursor-pointer"
                  onClick={() => setWeekOffset((p) => p - 1)}
                >
                  <ChevronLeft size={14} className="mr-0.5" /> Prev
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center h-[36px] @[560px]:h-[32px] px-3 rounded-[6px] text-[11.5px] font-semibold text-[#cbd5e1] bg-[#0f172a] border border-[#334155] hover:bg-[#243044] hover:text-[#f8fafc] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={() => setWeekOffset(0)}
                  disabled={weekOffset === 0}
                >
                  Today
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center h-[36px] @[560px]:h-[32px] px-2.5 rounded-[6px] text-[11.5px] font-semibold text-[#cbd5e1] bg-[#0f172a] border border-[#334155] hover:bg-[#243044] hover:text-[#f8fafc] transition-colors cursor-pointer"
                  onClick={() => setWeekOffset((p) => p + 1)}
                >
                  Next <ChevronRight size={14} className="ml-0.5" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="inline-flex items-center justify-center h-[36px] @[560px]:h-[32px] px-2.5 rounded-[6px] text-[11.5px] font-semibold text-[#cbd5e1] bg-[#0f172a] border border-[#334155] hover:bg-[#243044] hover:text-[#f8fafc] transition-colors cursor-pointer"
                  onClick={prevMonth}
                  aria-label="Bulan sebelumnya"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center h-[36px] @[560px]:h-[32px] px-3 rounded-[6px] text-[11.5px] font-semibold text-[#cbd5e1] bg-[#0f172a] border border-[#334155] hover:bg-[#243044] hover:text-[#f8fafc] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={goToday}
                  disabled={isCurrentMonth}
                >
                  Today
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center h-[36px] @[560px]:h-[32px] px-2.5 rounded-[6px] text-[11.5px] font-semibold text-[#cbd5e1] bg-[#0f172a] border border-[#334155] hover:bg-[#243044] hover:text-[#f8fafc] transition-colors cursor-pointer"
                  onClick={nextMonth}
                  aria-label="Bulan berikutnya"
                >
                  <ChevronRight size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Shift Legend (always visible) ── */}
      <div className="flex items-center gap-x-4 gap-y-2 p-3 sm:px-4.5 bg-[#0f172a]/70 border-b border-[#334155] text-[11px] text-[#94a3b8] flex-wrap">
        <span className="flex items-center gap-1.5 font-bold text-[#f8fafc] font-mono text-[10.5px]">
          <Info size={13} className="text-[#38bdf8]" /> Shift:
        </span>
        {SHIFT_LEGEND_KEYS.map((type) => {
          const item = SHIFT_STYLE_MAP[type];
          return (
            <span key={type} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#cbd5e1]">
              <i
                className={`block w-3 h-3 rounded-[3px] border border-white/20 shrink-0 ${item.swatchBg} shadow-sm`}
                aria-hidden="true"
              />
              {item.label}
            </span>
          );
        })}
      </div>

      {/* ══ WEEKLY VIEW ══════════════════════════════════ */}
      {calMode === "weekly" && (
        <>
          <div className="overflow-x-auto [overscroll-behavior-x:contain] [scrollbar-width:thin] [scrollbar-color:#334155_transparent] py-1">
            <div className="min-w-full w-max">
              {/* Header */}
              <div className={`${CALENDAR_GRID_ROW} border-b border-[#334155] bg-[#0f172a] font-mono text-[10.5px]`}>
                <div className="sticky left-0 z-20 bg-[#0f172a] border-r border-[#334155] px-3 py-2.5 sm:px-4 sm:py-3 font-bold text-[#94a3b8] flex items-center select-none">
                  TEAM MEMBER
                </div>
                {weekDays.map((d, idx) => (
                  <div
                    key={idx}
                    className={`p-2 border-l border-[#334155] text-center flex flex-col items-center justify-center select-none ${
                      d.isToday ? "bg-[#38bdf8]/10 text-[#38bdf8] border-x border-[#38bdf8]/20" : ""
                    } ${idx >= 5 ? "opacity-75" : ""}`}
                  >
                    <strong className={idx >= 5 ? "text-[#94a3b8]" : "text-[#f8fafc]"}>{d.short}</strong>
                    <small className="text-[#94a3b8]">{d.date}</small>
                    {d.isToday && (
                      <span className="text-[7.5px] font-extrabold px-1.5 py-0.5 rounded-[3px] bg-[#38bdf8] text-[#0f172a] font-mono mt-0.5 shadow-sm">
                        TODAY
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Member rows */}
              {paginatedMembers.map((member) => (
                <div
                  className={`${CALENDAR_GRID_ROW} border-b border-[#334155] group hover:bg-[#243044]/30 transition-colors duration-150`}
                  key={member.id}
                >
                  {/* Kolom Anggota Sticky */}
                  <Link href={routes.member(member.id, url.query)} scroll={false}
                    className="sticky left-0 z-10 bg-[#1e293b] group-hover:bg-[#223046] transition-colors duration-150 border-r border-[#334155] px-3 py-2.5 sm:px-4 sm:py-3 min-h-[56px] flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectMember(member);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    title={`Lihat profil ${member.name}`}
                  >
                    <Avatar
                      size="md"
                      name={member.name}
                      statusRing={member.status === "Active" ? "active" : member.status === "On Break" ? "break" : "off"}
                      className="w-8 h-8 text-[11px] shrink-0"
                    />
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <strong
                        className="text-[#f8fafc] text-[13px] font-semibold truncate transition-colors duration-150 group-hover:text-[#38bdf8] block"
                        title={member.name}
                      >
                        {member.name}
                      </strong>
                      <small className="text-[11px] text-[#94a3b8] font-medium truncate block hidden @[560px]:block">
                        {member.role}
                      </small>
                    </div>
                  </Link>

                  {/* 7 Kolom Hari */}
                  {member.weeklySchedule.map((dayEntry, idx) => {
                    const shiftStyle = SHIFT_STYLE_MAP[dayEntry.shift] ?? SHIFT_STYLE_MAP.Off;
                    const isToday = weekDays[idx]?.isToday;
                    return (
                      <div
                        key={idx}
                        className={`p-1.5 border-l border-[#334155] flex items-center justify-center ${
                          isToday ? "bg-[#38bdf8]/[0.04] border-x border-[#38bdf8]/15" : ""
                        }`}
                      >
                        <div
                          className={`w-full h-full min-h-[44px] @[560px]:min-h-[48px] rounded-[6px] border p-1.5 flex flex-col justify-center text-center transition-colors duration-150 cursor-default select-none ${shiftStyle.badgeBg} ${shiftStyle.badgeBorder} ${shiftStyle.badgeText} ${shiftStyle.hoverBg}`}
                          title={`${member.name} — ${dayEntry.day}: ${dayEntry.shift} (${dayEntry.hours ?? "—"})`}
                        >
                          <strong className="text-[11.5px] font-bold leading-tight">{dayEntry.shift}</strong>
                          <span className="text-[9.5px] font-mono opacity-85 mt-0.5 hidden @[560px]:inline-flex items-center justify-center">
                            <Clock size={9} className="inline mr-1 shrink-0" />
                            {dayEntry.hours}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {totalCount === 0 && (
                <div className="flex flex-col items-center justify-center p-12 text-center text-[#94a3b8] [grid-column:1_/_-1]!">
                  No team members match the current filter.
                </div>
              )}
            </div>
          </div>

          {/* Pagination Footer for Weekly Calendar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:px-4.5 border-t border-[#334155] bg-[#1e293b]">
            <div className="flex items-center justify-between sm:justify-start gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-[11.5px] text-[#94a3b8] font-medium whitespace-nowrap">Rows per page:</span>
                <select
                  className="h-[30px] pl-2.5 pr-6 py-0 text-[11.5px] rounded-[6px] bg-[position:right_7px_center] bg-[#0f172a] [color-scheme:dark] border border-[#334155] text-[#f8fafc] cursor-pointer inline-flex items-center appearance-none -webkit-appearance-none focus:border-[#38bdf8] focus:outline-none"
                  value={pageSize === "all" ? "all" : String(pageSize)}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPageSize(val === "all" ? "all" : Number(val));
                  }}
                  aria-label="Jumlah baris per halaman"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="all">All</option>
                </select>
              </div>

              <span className="text-[11.5px] text-[#94a3b8] font-sans whitespace-nowrap">
                Showing <strong className="text-[#f8fafc] font-mono">{totalCount === 0 ? 0 : startIdx + 1}–{endIdx}</strong> of{" "}
                <strong className="text-[#f8fafc] font-mono">{totalCount}</strong> members
              </span>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-1.5 w-full sm:w-auto">
              <button
                className="inline-flex items-center justify-center min-h-[36px] sm:min-h-0 h-[36px] sm:h-[28px] px-3 sm:px-2.5 rounded-[6px] text-[11px] font-semibold font-mono bg-[#0f172a] border border-[#334155] text-[#cbd5e1] cursor-pointer transition-colors duration-150 select-none hover:not-disabled:bg-[#243044] hover:not-disabled:border-[#475569] hover:not-disabled:text-[#38bdf8] disabled:opacity-35 disabled:cursor-not-allowed"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
                aria-label="Halaman sebelumnya"
              >
                Prev
              </button>

              <div className="flex items-center gap-1">
                {pageNumbers.map((p, idx) =>
                  p === "..." ? (
                    <span key={`ellipsis-${idx}`} className="px-1 text-[#94a3b8] text-[12px]">…</span>
                  ) : (
                    <button
                      key={p}
                      className={`inline-flex items-center justify-center min-w-[32px] sm:min-w-[28px] min-h-[36px] sm:min-h-0 h-[36px] sm:h-[28px] px-1 rounded-[6px] text-[11px] font-mono cursor-pointer transition-colors duration-150 select-none border ${
                        p === safeCurrentPage
                          ? "bg-[#38bdf8]/15 border-[#38bdf8]/50 text-[#38bdf8] font-bold shadow-sm"
                          : "bg-[#0f172a] border-[#334155] text-[#cbd5e1] font-semibold hover:bg-[#243044] hover:border-[#475569] hover:text-[#38bdf8]"
                      }`}
                      onClick={() => setCurrentPage(Number(p))}
                      aria-label={`Halaman ${p}`}
                      aria-current={p === safeCurrentPage ? "page" : undefined}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>

              <button
                className="inline-flex items-center justify-center min-h-[36px] sm:min-h-0 h-[36px] sm:h-[28px] px-3 sm:px-2.5 rounded-[6px] text-[11px] font-semibold font-mono bg-[#0f172a] border border-[#334155] text-[#cbd5e1] cursor-pointer transition-colors duration-150 select-none hover:not-disabled:bg-[#243044] hover:not-disabled:border-[#475569] hover:not-disabled:text-[#38bdf8] disabled:opacity-35 disabled:cursor-not-allowed"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages || totalPages <= 1}
                aria-label="Halaman berikutnya"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {/* ══ MONTHLY VIEW ═════════════════════════════════ */}
      {calMode === "monthly" && (
        <div className="px-[16px] pb-[20px] pt-0">
          {/* Day-of-week header */}
          <div className="grid grid-cols-[repeat(7,1fr)] gap-[5px] mb-[5px]">
            {DOW_LABELS.map((d) => (
              <div key={d} className="py-[5px] text-center font-mono text-[10px] font-bold text-[var(--ink-muted)] uppercase tracking-[0.5px]">{d}</div>
            ))}
          </div>

          {/* Weeks */}
          {monthGrid.map((week, wi) => (
            <div key={wi} className="grid grid-cols-[repeat(7,1fr)] gap-[5px] mb-[5px]">
              {week.map((day, di) => {
                if (day === null) {
                  return <div key={di} className="min-h-[72px] rounded-[9px] border border-transparent p-[7px_6px_5px] bg-transparent cursor-default pointer-events-none" />;
                }

                const dow = di; // 0=Mon
                const isToday = isCurrentMonth && day === todayDate;
                const isSelected = day === selectedDay;

                // Members working this day (shift !== Off)
                const scheduledMembers = members.filter((m) => memberShiftForDow(m, dow) !== "Off");

                return (
                  <button
                    key={di}
                    className={`min-h-[72px] rounded-[9px] p-[7px_6px_5px] flex flex-col items-start gap-[4px] text-left cursor-pointer transition-[border-color,box-shadow,background] duration-150 ease border ${
                      isSelected
                        ? "border-[var(--accent-blue)] shadow-[0_0_0_2px_var(--accent-blue)] bg-[var(--panel-bg)]"
                        : isToday
                        ? "border-[var(--accent-blue)] bg-[var(--accent-blue-soft)]"
                        : "border-[var(--line)] bg-[var(--panel-bg)] hover:border-[var(--accent-blue-border)] hover:shadow-[0_0_0_2px_var(--accent-blue-soft)]"
                    }`}
                    onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                    aria-label={`${day} ${MONTH_NAMES[monthDate.getMonth()]} — ${scheduledMembers.length} on shift`}
                  >
                    <span className={`text-[12px] font-bold font-mono leading-none ${isToday ? "text-[var(--accent-blue)]" : "text-[var(--ink-primary)]"}`}>{day}</span>

                    {/* Avatar dot stack */}
                    <div className="flex gap-[3px] flex-wrap">
                      {scheduledMembers.slice(0, 4).map((m) => {
                        const shift = memberShiftForDow(m, dow);
                        return (
                          <Avatar
                            key={m.id}
                            size="xs"
                            initials={initials(m.name)[0]}
                            name={m.name}
                            className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-[99px] border-[1.5px] border-[var(--panel-border)] text-[8px] font-extrabold text-white tracking-[-0.5px] shrink-0"
                            title={`${m.name} — ${shift}`}
                          />
                        );
                      })}
                      {scheduledMembers.length > 4 && (
                        <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-[99px] border border-[var(--line)] text-[8px] font-bold bg-[var(--panel-bg)] text-[var(--ink-secondary)] shrink-0">+{scheduledMembers.length - 4}</span>
                      )}
                    </div>

                    {scheduledMembers.length > 0 && (
                      <span className="text-[9.5px] text-[var(--ink-muted)] font-mono font-semibold">{scheduledMembers.length} on shift</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Day detail panel */}
          {selectedDay !== null && membersOnDay.length > 0 && (
            <div className="mt-[14px] rounded-[10px] border border-[var(--accent-blue-border)] bg-[var(--panel-bg)] overflow-hidden anim-fade">
              <div className="flex justify-between items-center p-[10px_14px] bg-[var(--accent-blue-soft)] border-b border-[var(--accent-blue-border)] text-[12.5px] text-[var(--ink-primary)]">
                <strong>
                  <CalendarIcon size={14} className="inline mr-[6px] vertical-middle text-[var(--accent-blue)]" />
                  {selectedDay} {MONTH_NAMES[monthDate.getMonth()]} {monthDate.getFullYear()} — {membersOnDay.length} Scheduled
                </strong>
                <ModalCloseButton onClose={() => setSelectedDay(null)} label="Close day detail" />
              </div>
              <div className="grid gap-0">
                {membersOnDay.map(({ member, shift }) => {
                  const sc = shiftColor(shift);
                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-[10px] p-[10px_14px] border-b border-[var(--line)] last:border-b-0 cursor-pointer transition-colors duration-120 ease hover:bg-[var(--panel-bg-hover)]"
                      onClick={() => onSelectMember(member)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelectMember(member);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      title={`Open ${member.name}'s profile`}
                    >
                      <Avatar
                        size="md"
                        name={member.name}
                        statusRing={member.status === "Active" ? "active" : member.status === "On Break" ? "break" : "off"}
                        className="w-[32px] h-[32px] text-[11px]"
                      />
                      <div className="flex-1 min-w-0">
                        <strong className="block text-[12.5px] text-[var(--ink-primary)]">{member.name}</strong>
                        <small className="text-[11px] text-[var(--ink-muted)]">{member.role}</small>
                      </div>
                      <span
                        className="ml-auto inline-flex items-center p-[3px_8px] rounded-[99px] border text-[11px] font-bold font-mono shrink-0"
                        style={{
                          backgroundColor: sc.bg,
                          color: sc.color,
                          borderColor: sc.border,
                        }}
                      >
                        <Clock size={11} className="inline mr-[3px] vertical-middle" />
                        {shift}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {selectedDay !== null && membersOnDay.length === 0 && (
            <div className="mt-[14px] rounded-[10px] border border-[var(--accent-blue-border)] bg-[var(--panel-bg)] overflow-hidden anim-fade">
              <div className="flex justify-between items-center p-[10px_14px] bg-[var(--accent-blue-soft)] border-b border-[var(--accent-blue-border)] text-[12.5px] text-[var(--ink-primary)]">
                <strong>{selectedDay} {MONTH_NAMES[monthDate.getMonth()]} — No one scheduled</strong>
                <ModalCloseButton onClose={() => setSelectedDay(null)} label="Close day detail" />
              </div>
              <p className="p-[12px_16px] text-[var(--ink-muted)] text-[12px] m-0">
                All team members are off or on leave this day.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

