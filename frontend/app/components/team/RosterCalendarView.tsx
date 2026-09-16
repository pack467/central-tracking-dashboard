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
    <div className="roster-calendar-wrapper">
      {/* ── Top Bar ── */}
      <div className="roster-calendar-topbar">
        <div className="roster-calendar-title">
          <CalendarIcon size={16} style={{ color: "var(--accent-blue)" }} />
          {calMode === "weekly" ? (
            <>
              <strong>Week 34 · 24 Aug – 30 Aug 2026</strong>
              {weekOffset === 0 && <span className="roster-current-week-tag">CURRENT WEEK</span>}
            </>
          ) : (
            <strong>{MONTH_NAMES[monthDate.getMonth()]} {monthDate.getFullYear()}</strong>
          )}
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {/* View mode toggle */}
          <div className="filter-tabs cal-view-tabs" aria-label="Switch calendar view">
            <button className={calMode === "weekly" ? "selected" : ""} onClick={() => setCalMode("weekly")}>
              Weekly
            </button>
            <button className={calMode === "monthly" ? "selected" : ""} onClick={() => setCalMode("monthly")}>
              Monthly
            </button>
          </div>

          {/* Nav buttons */}
          <div className="roster-calendar-nav">
            {calMode === "weekly" ? (
              <>
                <button className="button button-secondary roster-week-nav-btn" onClick={() => setWeekOffset((p) => p - 1)}>
                  <ChevronLeft size={14} /> Prev
                </button>
                <button className="button button-secondary roster-week-nav-btn" onClick={() => setWeekOffset(0)} disabled={weekOffset === 0}>
                  Today
                </button>
                <button className="button button-secondary roster-week-nav-btn" onClick={() => setWeekOffset((p) => p + 1)}>
                  Next <ChevronRight size={14} />
                </button>
              </>
            ) : (
              <>
                <button className="button button-secondary roster-week-nav-btn" onClick={prevMonth} aria-label="Bulan sebelumnya">
                  <ChevronLeft size={14} />
                </button>
                <button className="button button-secondary roster-week-nav-btn" onClick={goToday} disabled={isCurrentMonth}>
                  Today
                </button>
                <button className="button button-secondary roster-week-nav-btn" onClick={nextMonth} aria-label="Bulan berikutnya">
                  <ChevronRight size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Shift Legend (always visible) ── */}
      <div className="roster-calendar-legend">
        <span className="legend-label"><Info size={12} /> Shift:</span>
        {SHIFT_LEGEND.map((l) => (
          <span key={l.type} className="legend-item">
            <i style={{ background: l.bg, borderColor: l.border, flexShrink: 0 }} />
            {l.label}
          </span>
        ))}
      </div>

      {/* ══ WEEKLY VIEW ══════════════════════════════════ */}
      {calMode === "weekly" && (
        <>
          <div className="roster-calendar-grid-container">
          <div className="roster-calendar-grid">
            {/* Header */}
            <div className="roster-cal-header-row">
              <div className="roster-cal-member-head">TEAM MEMBER</div>
              {weekDays.map((d, idx) => (
                <div key={idx} className={`roster-cal-day-head ${d.isToday ? "today-column" : ""}`}>
                  <strong>{d.short}</strong>
                  <small>{d.date}</small>
                  {d.isToday && <span className="today-badge">TODAY</span>}
                </div>
              ))}
            </div>

            {/* Member rows */}
            {paginatedMembers.map((member) => (
              <div className="roster-cal-row" key={member.id}>
                <div
                  className="roster-cal-member-cell"
                  onClick={() => onSelectMember(member)}
                  role="button"
                  tabIndex={0}
                  title={`View ${member.name}'s profile`}
                >
                  <Avatar
                    size="md"
                    name={member.name}
                    statusRing={member.status === "Active" ? "active" : member.status === "On Break" ? "break" : "off"}
                    className="roster-avatar"
                  />
                  <div className="roster-member-info">
                    <strong>{member.name}</strong>
                    <small>{member.role}</small>
                  </div>
                </div>

                {member.weeklySchedule.map((dayEntry, idx) => {
                  const colors = shiftColor(dayEntry.shift);
                  const isToday = weekDays[idx]?.isToday;
                  return (
                    <div key={idx} className={`roster-cal-shift-cell ${isToday ? "today-cell" : ""}`}>
                      <div
                        className="roster-shift-block"
                        style={{ background: colors.bg, color: colors.color, borderColor: colors.border }}
                        title={`${member.name} — ${dayEntry.day}: ${dayEntry.shift} (${dayEntry.hours ?? "—"})`}
                      >
                        <strong className="roster-shift-block-title">{dayEntry.shift}</strong>
                        <span className="roster-shift-block-hours">
                          <Clock size={9} style={{ display: "inline", marginRight: "2px", verticalAlign: "middle" }} />
                          {dayEntry.hours}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {totalCount === 0 && (
              <div className="roster-empty-state" style={{ gridColumn: "1/-1" }}>
                No team members match the current filter.
              </div>
            )}
          </div>
        </div>

        {/* Pagination Footer for Weekly Calendar */}
        <div className="roster-pagination-bar">
          <div className="roster-pagination-left">
            <div className="roster-rows-per-page">
              <span className="roster-pagination-label">Rows per page:</span>
              <select
                className="roster-filter-select roster-page-size-select"
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

            <span className="roster-pagination-info">
              Showing <strong>{totalCount === 0 ? 0 : startIdx + 1}–{endIdx}</strong> of <strong>{totalCount}</strong> members
            </span>
          </div>

          <div className="roster-pagination-actions">
            <button
              className="roster-page-btn roster-page-nav"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage <= 1}
              aria-label="Halaman sebelumnya"
            >
              Prev
            </button>

            <div className="roster-page-numbers">
              {pageNumbers.map((p, idx) =>
                p === "..." ? (
                  <span key={`ellipsis-${idx}`} className="roster-page-ellipsis">…</span>
                ) : (
                  <button
                    key={p}
                    className={`roster-page-btn roster-page-num ${p === safeCurrentPage ? "active" : ""}`}
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
              className="roster-page-btn roster-page-nav"
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
        <div className="monthly-cal-wrapper">
          {/* Day-of-week header */}
          <div className="monthly-cal-dow-row">
            {DOW_LABELS.map((d) => (
              <div key={d} className="monthly-cal-dow-head">{d}</div>
            ))}
          </div>

          {/* Weeks */}
          {monthGrid.map((week, wi) => (
            <div key={wi} className="monthly-cal-week-row">
              {week.map((day, di) => {
                if (day === null) {
                  return <div key={di} className="monthly-cal-day monthly-cal-day-empty" />;
                }

                const dow = di; // 0=Mon
                const isToday = isCurrentMonth && day === todayDate;
                const isSelected = day === selectedDay;

                // Members working this day (shift !== Off)
                const scheduledMembers = members.filter((m) => memberShiftForDow(m, dow) !== "Off");

                return (
                  <button
                    key={di}
                    className={`monthly-cal-day ${isToday ? "monthly-cal-day-today" : ""} ${isSelected ? "monthly-cal-day-selected" : ""}`}
                    onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                    aria-label={`${day} ${MONTH_NAMES[monthDate.getMonth()]} — ${scheduledMembers.length} on shift`}
                  >
                    <span className="monthly-day-num">{day}</span>

                    {/* Avatar dot stack */}
                    <div className="monthly-day-avatars">
                      {scheduledMembers.slice(0, 4).map((m) => {
                        const shift = memberShiftForDow(m, dow);
                        const sc = shiftColor(shift);
                        return (
                          <Avatar
                            key={m.id}
                            size="xs"
                            initials={initials(m.name)[0]}
                            name={m.name}
                            className="monthly-avatar-dot"
                            title={`${m.name} — ${shift}`}
                          />
                        );
                      })}
                      {scheduledMembers.length > 4 && (
                        <span className="monthly-avatar-dot monthly-avatar-more">+{scheduledMembers.length - 4}</span>
                      )}
                    </div>

                    {scheduledMembers.length > 0 && (
                      <span className="monthly-day-count">{scheduledMembers.length} on shift</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Day detail panel */}
          {selectedDay !== null && membersOnDay.length > 0 && (
            <div className="monthly-day-detail anim-fade">
              <div className="monthly-day-detail-header">
                <strong>
                  <CalendarIcon size={14} style={{ display: "inline", marginRight: "6px", verticalAlign: "middle", color: "var(--accent-blue)" }} />
                  {selectedDay} {MONTH_NAMES[monthDate.getMonth()]} {monthDate.getFullYear()} — {membersOnDay.length} Scheduled
                </strong>
                <ModalCloseButton onClose={() => setSelectedDay(null)} label="Close day detail" />
              </div>
              <div className="monthly-day-detail-list">
                {membersOnDay.map(({ member, shift }) => {
                  const sc = shiftColor(shift);
                  return (
                    <div
                      key={member.id}
                      className="monthly-day-member-row"
                      onClick={() => onSelectMember(member)}
                      role="button"
                      tabIndex={0}
                      title={`Open ${member.name}'s profile`}
                    >
                      <Avatar
                        size="md"
                        name={member.name}
                        statusRing={member.status === "Active" ? "active" : member.status === "On Break" ? "break" : "off"}
                        className="roster-avatar"
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ display: "block", fontSize: "12.5px", color: "var(--ink-primary)" }}>{member.name}</strong>
                        <small style={{ fontSize: "11px", color: "var(--ink-muted)" }}>{member.role}</small>
                      </div>
                      <span
                        className="monthly-shift-pill"
                        style={{ background: sc.bg, color: sc.color, borderColor: sc.border }}
                      >
                        <Clock size={11} style={{ display: "inline", marginRight: "3px", verticalAlign: "middle" }} />
                        {shift}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {selectedDay !== null && membersOnDay.length === 0 && (
            <div className="monthly-day-detail anim-fade">
              <div className="monthly-day-detail-header">
                <strong>{selectedDay} {MONTH_NAMES[monthDate.getMonth()]} — No one scheduled</strong>
                <ModalCloseButton onClose={() => setSelectedDay(null)} label="Close day detail" />
              </div>
              <p style={{ padding: "12px 16px", color: "var(--ink-muted)", fontSize: "12px", margin: 0 }}>
                All team members are off or on leave this day.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
