"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Info,
  Clock,
} from "lucide-react";
import { initials } from "@/app/lib/data";
import { Avatar } from "@/app/components/ui/Avatar";
import { ModalCloseButton } from "@/app/components/ui/ModalCloseButton";
import { shiftColor } from "@/app/components/team/RosterTable";
import type { DayScheduleType, RosterMember } from "@/app/lib/types";

interface RosterCalendarViewProps {
  members: RosterMember[];
  onSelectMember: (member: RosterMember) => void;
}

/* ── helpers ─────────────────────────────────────────── */
const SHIFT_LEGEND: { type: DayScheduleType; label: string; bg: string; border: string; color: string }[] = [
  { type: "Subuh", label: "Subuh (00:00–08:30)", bg: "var(--accent-blue-soft)", border: "var(--accent-blue-border)", color: "var(--accent-blue)" },
  { type: "Pagi", label: "Pagi (08:00–16:30)", bg: "var(--orange-soft)", border: "var(--orange-border)", color: "var(--orange)" },
  { type: "Malam", label: "Malam (16:00–00:30)", bg: "var(--purple-soft)", border: "var(--purple-border)", color: "var(--purple)" },
  { type: "Off", label: "Off Duty", bg: "var(--bg)", border: "var(--line)", color: "var(--ink-muted)" },
  { type: "Leave", label: "Cuti / Leave", bg: "var(--red-soft)", border: "var(--red-border)", color: "var(--red)" },
];

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
  // View mode: "weekly" | "monthly"
  const [calMode, setCalMode] = useState<"weekly" | "monthly">("weekly");

  // Weekly state
  const [weekOffset, setWeekOffset] = useState(0);

  // Monthly state – default to current month (Aug 2026 based on seed data)
  const today = new Date(2026, 7, 28); // Aug 28 2026
  const [monthDate, setMonthDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const monthGrid = useMemo(() => buildMonthGrid(monthDate.getFullYear(), monthDate.getMonth()), [monthDate]);

  const todayDate = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();
  const isCurrentMonth = monthDate.getFullYear() === todayYear && monthDate.getMonth() === todayMonth;

  // Weekly days (seed-based, fixed for demo)
  const weekDays = [
    { short: "Mon", date: "24 Aug", dow: 0, isToday: false },
    { short: "Tue", date: "25 Aug", dow: 1, isToday: false },
    { short: "Wed", date: "26 Aug", dow: 2, isToday: false },
    { short: "Thu", date: "27 Aug", dow: 3, isToday: false },
    { short: "Fri", date: "28 Aug", dow: 4, isToday: true },
    { short: "Sat", date: "29 Aug", dow: 5, isToday: false },
    { short: "Sun", date: "30 Aug", dow: 6, isToday: false },
  ].map((d) => ({ ...d, isToday: weekOffset === 0 && d.isToday }));

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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | "all">(10);

  // Automatically reset to page 1 when the member dataset changes (due to search/filters)
  useEffect(() => {
    setCurrentPage(1);
  }, [members]);

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
    <div className="p-0">
      {/* ── Top Bar ── */}
      <div className="flex justify-between items-center gap-[14px] p-[14px_18px] border-b border-[var(--line)] bg-[var(--panel-bg)] flex-wrap">
        <div className="flex items-center gap-[8px] text-[13px] text-[var(--ink-primary)]">
          <CalendarIcon size={16} className="text-[var(--accent-blue)]" />
          {calMode === "weekly" ? (
            <>
              <strong>Week 34 · 24 Aug – 30 Aug 2026</strong>
              {weekOffset === 0 && (
                <span className="text-[9px] font-mono font-bold p-[2px_6px] rounded-[4px] bg-[var(--accent-blue-soft)] text-[var(--accent-blue)] border border-[var(--accent-blue-border)]">
                  CURRENT WEEK
                </span>
              )}
            </>
          ) : (
            <strong>{MONTH_NAMES[monthDate.getMonth()]} {monthDate.getFullYear()}</strong>
          )}
        </div>

        <div className="flex gap-[8px] items-center">
          {/* View mode toggle */}
          <div className="inline-flex items-center gap-[2px] h-[36px] box-border p-[3px] bg-[var(--surface,#0f172a)] border border-[var(--panel-border)] rounded-[8px] shrink-0" aria-label="Switch calendar view">
            <button
              type="button"
              className={`inline-flex items-center justify-center h-[28px] px-[12px] text-[11.5px] font-semibold rounded-[6px] gap-[6px] border border-transparent cursor-pointer transition-[color,background-color] duration-150 ease ${
                calMode === "weekly"
                  ? "bg-[var(--accent-blue,#2563eb)] text-white shadow-[0_1px_3px_rgba(0,0,0,0.25)]"
                  : "bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[rgba(148,163,184,0.08)]"
              }`}
              onClick={() => setCalMode("weekly")}
            >
              Weekly
            </button>
            <button
              type="button"
              className={`inline-flex items-center justify-center h-[28px] px-[12px] text-[11.5px] font-semibold rounded-[6px] gap-[6px] border border-transparent cursor-pointer transition-[color,background-color] duration-150 ease ${
                calMode === "monthly"
                  ? "bg-[var(--accent-blue,#2563eb)] text-white shadow-[0_1px_3px_rgba(0,0,0,0.25)]"
                  : "bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[rgba(148,163,184,0.08)]"
              }`}
              onClick={() => setCalMode("monthly")}
            >
              Monthly
            </button>
          </div>

          {/* Nav buttons */}
          <div className="flex gap-[6px]">
            {calMode === "weekly" ? (
              <>
                <button className="button button-secondary px-[9px] py-[5px] text-[11px]" onClick={() => setWeekOffset((p) => p - 1)}>
                  <ChevronLeft size={14} /> Prev
                </button>
                <button className="button button-secondary px-[9px] py-[5px] text-[11px]" onClick={() => setWeekOffset(0)} disabled={weekOffset === 0}>
                  Today
                </button>
                <button className="button button-secondary px-[9px] py-[5px] text-[11px]" onClick={() => setWeekOffset((p) => p + 1)}>
                  Next <ChevronRight size={14} />
                </button>
              </>
            ) : (
              <>
                <button className="button button-secondary px-[9px] py-[5px] text-[11px]" onClick={prevMonth} aria-label="Bulan sebelumnya">
                  <ChevronLeft size={14} />
                </button>
                <button className="button button-secondary px-[9px] py-[5px] text-[11px]" onClick={goToday} disabled={isCurrentMonth}>
                  Today
                </button>
                <button className="button button-secondary px-[9px] py-[5px] text-[11px]" onClick={nextMonth} aria-label="Bulan berikutnya">
                  <ChevronRight size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Shift Legend (always visible) ── */}
      <div className="flex items-center gap-[14px] p-[10px_18px] bg-[var(--bg)] border-b border-[var(--line)] text-[11px] text-[var(--ink-secondary)] flex-wrap">
        <span className="flex items-center gap-[5px] font-bold text-[var(--ink-primary)] font-mono text-[10.5px]"><Info size={12} /> Shift:</span>
        {SHIFT_LEGEND.map((l) => (
          <span key={l.type} className="inline-flex items-center gap-[6px] text-[10.5px]">
            <i
              className="block w-[12px] h-[12px] rounded-[3px] border shrink-0"
              style={{
                backgroundColor: l.bg,
                borderColor: l.border,
              }}
            />
            {l.label}
          </span>
        ))}
      </div>

      {/* ══ WEEKLY VIEW ══════════════════════════════════ */}
      {calMode === "weekly" && (
        <>
          <div className="overflow-x-auto [overscroll-behavior-x:contain] py-[var(--space-2)]">
            <div className="min-w-[820px]">
              {/* Header */}
              <div className="grid grid-cols-[200px_repeat(7,1fr)] border-b border-[var(--line)] bg-[var(--bg)] font-mono text-[10.5px]">
                <div className="p-[10px_16px] font-bold text-[var(--ink-muted)] flex items-center">TEAM MEMBER</div>
                {weekDays.map((d, idx) => (
                  <div key={idx} className={`p-[8px_10px] border-l border-[var(--line)] text-center flex flex-col items-center justify-center ${d.isToday ? "bg-[var(--accent-blue-soft)] text-[var(--accent-blue)]" : ""}`}>
                    <strong>{d.short}</strong>
                    <small>{d.date}</small>
                    {d.isToday && <span className="text-[7.5px] font-extrabold p-[1px_4px] rounded-[3px] bg-[var(--accent-blue)] text-white mt-[2px]">TODAY</span>}
                  </div>
                ))}
              </div>

              {/* Member rows */}
              {paginatedMembers.map((member) => (
                <div className="grid grid-cols-[200px_repeat(7,1fr)] border-b border-[var(--line)]" key={member.id}>
                  <div
                    className="p-[var(--space-3)_var(--space-4)] flex items-center gap-[var(--space-3)] cursor-pointer hover:[&_strong]:text-[var(--accent-blue)]"
                    onClick={() => onSelectMember(member)}
                    role="button"
                    tabIndex={0}
                    title={`View ${member.name}'s profile`}
                  >
                    <Avatar
                      size="md"
                      name={member.name}
                      statusRing={member.status === "Active" ? "active" : member.status === "On Break" ? "break" : "off"}
                      className="w-[32px] h-[32px] text-[11px]"
                    />
                    <div className="flex flex-col gap-[2px] min-w-0 flex-1">
                      <strong className="text-[var(--ink-primary)] text-[13px] font-semibold overflow-hidden text-ellipsis whitespace-nowrap transition-colors duration-150 ease">{member.name}</strong>
                      <small className="text-[10px] text-[var(--ink-secondary)] font-medium">{member.role}</small>
                    </div>
                  </div>

                  {member.weeklySchedule.map((dayEntry, idx) => {
                    const colors = shiftColor(dayEntry.shift);
                    const isToday = weekDays[idx]?.isToday;
                    return (
                      <div key={idx} className={`p-[var(--space-2)] border-l border-[var(--line)] grid place-items-center ${isToday ? "bg-[color-mix(in_srgb,var(--accent-blue-soft)_30%,transparent)]" : ""}`}>
                        <div
                          className="w-full h-full min-h-[48px] rounded-[6px] border p-[6px_8px] flex flex-col justify-center text-center transition-[background-color,border-color] duration-150 ease cursor-default hover:bg-[var(--panel-bg-hover)] hover:border-[var(--panel-border)]"
                          style={{
                            backgroundColor: colors.bg,
                            color: colors.color,
                            borderColor: colors.border,
                          }}
                          title={`${member.name} — ${dayEntry.day}: ${dayEntry.shift} (${dayEntry.hours ?? "—"})`}
                        >
                          <strong className="text-[11.5px] font-bold">{dayEntry.shift}</strong>
                          <span className="text-[9.5px] font-mono opacity-85 mt-[1px]">
                            <Clock size={9} className="inline mr-[2px] vertical-middle" />
                            {dayEntry.hours}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {totalCount === 0 && (
                <div className="flex flex-col items-center justify-center p-[44px_20px] text-center text-[var(--ink-muted)] [grid-column:1_/_-1]!">
                  No team members match the current filter.
                </div>
              )}
            </div>
          </div>

          {/* Pagination Footer for Weekly Calendar */}
          <div className="flex items-center justify-between gap-[16px] p-[12px_18px] border-t border-[var(--line)] bg-[var(--panel-bg)] flex-wrap">
            <div className="flex items-center gap-[16px] flex-wrap">
              <div className="flex items-center gap-[8px]">
                <span className="text-[11.5px] text-[var(--ink-muted)] font-medium whitespace-nowrap">Rows per page:</span>
                <select
                  className="h-[30px] p-[0_24px_0_9px] text-[11.5px] rounded-[6px] bg-[position:right_7px_center] bg-[var(--input-bg,#0f172a)] [color-scheme:dark] border border-[var(--panel-border)] text-[var(--ink-primary)] cursor-pointer inline-flex items-center appearance-none -webkit-appearance-none"
                  value={pageSize === "all" ? "all" : String(pageSize)}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPageSize(val === "all" ? "all" : Number(val));
                    setCurrentPage(1);
                  }}
                  aria-label="Jumlah baris per halaman"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="all">All</option>
                </select>
              </div>

              <span className="text-[11.5px] text-[var(--ink-muted)] font-sans whitespace-nowrap">
                Showing <strong className="text-[var(--ink-primary)] font-mono">{totalCount === 0 ? 0 : startIdx + 1}–{endIdx}</strong> of <strong className="text-[var(--ink-primary)] font-mono">{totalCount}</strong> members
              </span>
            </div>

            <div className="flex items-center gap-[5px]">
              <button
                className="inline-flex items-center justify-center p-[4px_10px] rounded-[6px] text-[11px] font-semibold font-mono bg-[rgba(148,163,184,0.06)] border border-[rgba(148,163,184,0.15)] text-[var(--ink-secondary)] cursor-pointer transition-all duration-150 ease select-none hover:not-disabled:bg-[rgba(56,189,248,0.12)] hover:not-disabled:border-[rgba(56,189,248,0.35)] hover:not-disabled:text-[#38bdf8] disabled:opacity-35 disabled:cursor-not-allowed disabled:bg-[rgba(148,163,184,0.03)] disabled:border-[rgba(148,163,184,0.08)] disabled:text-[var(--ink-muted)]"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
                aria-label="Halaman sebelumnya"
              >
                Prev
              </button>

              <div className="flex items-center gap-[3px]">
                {pageNumbers.map((p, idx) =>
                  p === "..." ? (
                    <span key={`ellipsis-${idx}`} className="px-[4px] text-[var(--ink-muted)] text-[12px]">…</span>
                  ) : (
                    <button
                      key={p}
                      className={`inline-flex items-center justify-center min-w-[26px] h-[26px] p-0 rounded-[6px] text-[11px] font-mono cursor-pointer transition-all duration-150 ease select-none border ${
                        p === safeCurrentPage
                          ? "bg-[rgba(56,189,248,0.18)] border-[rgba(56,189,248,0.5)] text-[#38bdf8] font-bold"
                          : "bg-[rgba(148,163,184,0.06)] border-[rgba(148,163,184,0.15)] text-[var(--ink-secondary)] font-semibold hover:bg-[rgba(56,189,248,0.12)] hover:border-[rgba(56,189,248,0.35)] hover:text-[#38bdf8]"
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
                className="inline-flex items-center justify-center p-[4px_10px] rounded-[6px] text-[11px] font-semibold font-mono bg-[rgba(148,163,184,0.06)] border border-[rgba(148,163,184,0.15)] text-[var(--ink-secondary)] cursor-pointer transition-all duration-150 ease select-none hover:not-disabled:bg-[rgba(56,189,248,0.12)] hover:not-disabled:border-[rgba(56,189,248,0.35)] hover:not-disabled:text-[#38bdf8] disabled:opacity-35 disabled:cursor-not-allowed disabled:bg-[rgba(148,163,184,0.03)] disabled:border-[rgba(148,163,184,0.08)] disabled:text-[var(--ink-muted)]"
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
