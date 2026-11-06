"use client";

import Link from "next/link";
import { paths, routes } from "@/app/lib/routes";
import { useUrlQuery } from "@/app/hooks/useUrlQuery";
import { rosterSchema, weekStart, isoWeek } from "@/app/lib/query-state";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, SearchX } from "lucide-react";
import { Avatar } from "@/app/components/ui/Avatar";
import { ModalCloseButton } from "@/app/components/ui/ModalCloseButton";
import { MemberAvatar } from "@/app/components/team/MemberAvatar";
import { RosterPagination, useRosterPage } from "@/app/components/team/RosterPagination";
import type { DayScheduleType, RosterMember } from "@/app/lib/types";

interface RosterCalendarViewProps {
  members: RosterMember[];
  onSelectMember: (member: RosterMember) => void;
}

/* ── helpers ─────────────────────────────────────────── */
export const SHIFT_STYLE_MAP: Record<
  DayScheduleType,
  { badgeBg: string; badgeBorder: string; badgeText: string; swatchBg: string; label: string; hours: string }
> = {
  Subuh: { badgeBg: "bg-[#0c2a3d]", badgeBorder: "border-[#38bdf8]/35", badgeText: "text-[#7dd3fc]", swatchBg: "bg-[#38bdf8]", label: "Subuh", hours: "00:00–08:30" },
  Pagi: { badgeBg: "bg-[#33270b]", badgeBorder: "border-[#fbbf24]/35", badgeText: "text-[#fcd34d]", swatchBg: "bg-[#fbbf24]", label: "Pagi", hours: "08:00–16:30" },
  Malam: { badgeBg: "bg-[#2a1d3d]", badgeBorder: "border-[#c084fc]/35", badgeText: "text-[#d8b4fe]", swatchBg: "bg-[#c084fc]", label: "Malam", hours: "16:00–00:30" },
  Leave: { badgeBg: "bg-[#3a1a1f]", badgeBorder: "border-[#f87171]/35", badgeText: "text-[#fca5a5]", swatchBg: "bg-[#f87171]", label: "Cuti", hours: "Tidak bertugas" },
  Off: { badgeBg: "bg-[#0f172a]", badgeBorder: "border-[#334155]", badgeText: "text-[#64748b]", swatchBg: "bg-[#64748b]", label: "Libur", hours: "Tidak bertugas" },
};

const SHIFT_ORDER: DayScheduleType[] = ["Subuh", "Pagi", "Malam", "Leave", "Off"];
const DOW_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const MONTH_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const DAY_MS = 86400000;
// Demo "today" of the seed data.
const TODAY_ISO = "2026-08-28";

const CALENDAR_GRID_ROW = "grid grid-cols-[200px_repeat(7,minmax(84px,1fr))] @[900px]:grid-cols-[232px_repeat(7,minmax(92px,1fr))]";

const navButton =
  "inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-[7px] border border-[#334155] bg-[#0f172a] px-2.5 text-[11.5px] font-semibold text-[#cbd5e1] transition-colors hover:bg-[#243044] hover:text-[#f8fafc] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 max-sm:h-10";

/** Mon-first month grid of day numbers (null = padding). */
function buildMonthGrid(year: number, month: number) {
  const totalDays = new Date(year, month + 1, 0).getDate();
  const startDow = (new Date(year, month, 1).getDay() + 6) % 7;
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

function memberShiftForDow(member: RosterMember, dow: number): DayScheduleType {
  return (member.weeklySchedule[dow]?.shift as DayScheduleType) ?? "Off";
}


function ShiftChip({ shift, compact = false }: { shift: DayScheduleType; compact?: boolean }) {
  const style = SHIFT_STYLE_MAP[shift] ?? SHIFT_STYLE_MAP.Off;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-bold ${style.badgeBg} ${style.badgeBorder} ${style.badgeText}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.swatchBg}`} />
      {style.label}
      {!compact && shift !== "Off" && shift !== "Leave" && <span className="font-mono font-medium opacity-80">{style.hours}</span>}
    </span>
  );
}

export function RosterCalendarView({ members, onSelectMember }: RosterCalendarViewProps) {
  const url = useUrlQuery(rosterSchema, paths.teamRoster);
  const calMode = url.values.view === "monthly" ? "monthly" : "weekly";
  const setCalMode = (mode: "weekly" | "monthly") => url.update({ view: mode, page: 1 }, "push");

  // Weekly state
  const defaultWeekStart = weekStart(rosterSchema.week.default).getTime();
  const currentWeekStart = weekStart(url.values.week).getTime();
  const weekOffset = Math.round((currentWeekStart - defaultWeekStart) / (7 * DAY_MS));
  const setWeekOffset = (offset: number) => url.update({ week: isoWeek(new Date(defaultWeekStart + offset * 7 * DAY_MS)) }, "push");
  const weekDays = Array.from({ length: 7 }, (_, dow) => {
    const d = new Date(currentWeekStart + dow * DAY_MS);
    const iso = d.toISOString().slice(0, 10);
    return {
      short: DOW_LABELS[dow],
      day: d.getUTCDate(),
      date: d.toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "UTC" }),
      dow,
      isToday: iso === TODAY_ISO,
      weekend: dow >= 5,
    };
  });
  const weekLabel = `Minggu ${Number(url.values.week.slice(-2))} · ${weekDays[0].date} – ${weekDays[6].date} ${url.values.week.slice(0, 4)}`;

  // Phone agenda: one day at a time, grouped by shift.
  const [agendaDay, setAgendaDay] = useState<number | null>(null);
  const todayIndex = weekDays.findIndex((d) => d.isToday);
  const activeDay = agendaDay ?? (todayIndex >= 0 ? todayIndex : 0);
  const agendaGroups = SHIFT_ORDER.map((shift) => ({
    shift,
    people: members.filter((member) => memberShiftForDow(member, activeDay) === shift),
  })).filter((group) => group.people.length > 0);

  // Monthly state
  const today = new Date(`${TODAY_ISO}T12:00:00`);
  const monthDate = useMemo(() => new Date(`${url.values.month}-01T12:00:00`), [url.values.month]);
  const setMonthDate = (date: Date) => url.update({ month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` }, "push");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const monthGrid = useMemo(() => buildMonthGrid(monthDate.getFullYear(), monthDate.getMonth()), [monthDate]);
  const isCurrentMonth = monthDate.getFullYear() === today.getFullYear() && monthDate.getMonth() === today.getMonth();
  const membersOnDay = useMemo(() => {
    if (selectedDay === null) return [];
    const dow = (new Date(monthDate.getFullYear(), monthDate.getMonth(), selectedDay).getDay() + 6) % 7;
    return members.map((m) => ({ member: m, shift: memberShiftForDow(m, dow) })).filter(({ shift }) => shift !== "Off");
  }, [selectedDay, members, monthDate]);

  const roster = useRosterPage(members);

  return (
    <div className="@container">
      {/* ── Top bar ── */}
      <div className="flex flex-col gap-3 border-b border-[#334155] px-4 py-3 @[900px]:flex-row @[900px]:items-center @[900px]:justify-between sm:px-5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <CalendarIcon size={16} className="shrink-0 text-[#38bdf8]" />
          <strong className="text-[13.5px] font-semibold text-[#f8fafc]">
            {calMode === "weekly" ? weekLabel : `${MONTH_NAMES[monthDate.getMonth()]} ${monthDate.getFullYear()}`}
          </strong>
          {calMode === "weekly" && weekOffset === 0 && (
            <span className="rounded-[4px] border border-[#38bdf8]/30 bg-[#0c2a3d] px-1.5 py-0.5 font-mono text-[9.5px] font-bold text-[#38bdf8]">MINGGU INI</span>
          )}
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 @[560px]:flex @[560px]:items-center">
          <div className="inline-grid grid-cols-2 gap-0.5 rounded-[8px] border border-[#334155] bg-[#0f172a] p-0.5" role="group" aria-label="Mode kalender">
            {(["weekly", "monthly"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={calMode === mode}
                className={`h-8 rounded-[6px] px-3 text-[11.5px] font-semibold transition-colors cursor-pointer max-sm:h-9 ${
                  calMode === mode ? "bg-[#1e293b] text-[#38bdf8] ring-1 ring-[#38bdf8]/30" : "text-[#94a3b8] hover:text-[#f8fafc]"
                }`}
                onClick={() => setCalMode(mode)}
              >
                {mode === "weekly" ? "Mingguan" : "Bulanan"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className={navButton}
              onClick={() => (calMode === "weekly" ? setWeekOffset(weekOffset - 1) : setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1)))}
              aria-label={calMode === "weekly" ? "Minggu sebelumnya" : "Bulan sebelumnya"}
            >
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              className={navButton}
              onClick={() => {
                if (calMode === "weekly") {
                  setWeekOffset(0);
                  setAgendaDay(null);
                } else {
                  setMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));
                  setSelectedDay(today.getDate());
                }
              }}
              disabled={calMode === "weekly" ? weekOffset === 0 : isCurrentMonth}
            >
              Hari ini
            </button>
            <button
              type="button"
              className={navButton}
              onClick={() => (calMode === "weekly" ? setWeekOffset(weekOffset + 1) : setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1)))}
              aria-label={calMode === "weekly" ? "Minggu berikutnya" : "Bulan berikutnya"}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-[#334155] bg-[rgba(15,23,42,0.45)] px-4 py-2.5 text-[11px] text-[#cbd5e1] sm:px-5">
        {SHIFT_ORDER.map((type) => {
          const item = SHIFT_STYLE_MAP[type];
          return (
            <span key={type} className="inline-flex items-center gap-1.5">
              <i className={`block h-2.5 w-2.5 shrink-0 rounded-[3px] ${item.swatchBg}`} aria-hidden="true" />
              <span className="font-semibold">{item.label}</span>
              {type !== "Off" && type !== "Leave" && <span className="font-mono text-[10.5px] text-[#94a3b8]">{item.hours}</span>}
            </span>
          );
        })}
      </div>

      {/* ══ WEEKLY VIEW ══════════════════════════════════ */}
      {calMode === "weekly" && (
        <>
          {/* Phone: pick a day, see who works which shift */}
          <div className="@[640px]:hidden">
            <div className="grid grid-cols-7 gap-1 border-b border-[#334155] p-3" role="tablist" aria-label="Pilih hari">
              {weekDays.map((d) => {
                const active = d.dow === activeDay;
                return (
                  <button
                    key={d.dow}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setAgendaDay(d.dow)}
                    className={`relative flex h-14 flex-col items-center justify-center gap-0.5 rounded-[9px] border transition-colors cursor-pointer ${
                      active
                        ? "border-[#38bdf8]/60 bg-[#0c2a3d] text-[#38bdf8]"
                        : "border-[#334155] bg-[#0f172a] text-[#cbd5e1] hover:bg-[#243044]"
                    }`}
                  >
                    <span className={`text-[10px] font-semibold uppercase ${active ? "" : d.weekend ? "text-[#64748b]" : "text-[#94a3b8]"}`}>{d.short}</span>
                    <span className="font-mono text-[15px] font-bold leading-none">{d.day}</span>
                    {d.isToday && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[#38bdf8]" />}
                  </button>
                );
              })}
            </div>

            {members.length === 0 ? (
              <EmptyMembers />
            ) : (
              <div className="space-y-3 p-3">
                {agendaGroups.map(({ shift, people }) => {
                  const style = SHIFT_STYLE_MAP[shift];
                  return (
                    <section key={shift} className="overflow-hidden rounded-[10px] border border-[#334155] bg-[#0f172a]/60">
                      <header className="flex items-center justify-between gap-2 border-b border-[#334155]/70 px-3 py-2">
                        <span className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-[3px] ${style.swatchBg}`} />
                          <strong className={`text-[12.5px] ${style.badgeText}`}>{style.label}</strong>
                          {shift !== "Off" && shift !== "Leave" && <span className="font-mono text-[11px] text-[#94a3b8]">{style.hours}</span>}
                        </span>
                        <span className="font-mono text-[11px] font-bold text-[#94a3b8]">{people.length} orang</span>
                      </header>
                      <ul className="divide-y divide-[#334155]/60">
                        {people.map((member) => (
                          <li key={member.id}>
                            <Link
                              href={routes.member(member.id, url.query)}
                              scroll={false}
                              className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-[#243044]"
                            >
                              <MemberAvatar size="sm" member={member} />
                              <span className="min-w-0 flex-1">
                                <strong className="block truncate text-[12.5px] font-semibold text-[#f8fafc]">{member.name}</strong>
                                <span className="block truncate text-[11px] text-[#94a3b8]">{member.role}</span>
                              </span>
                              <ChevronRight size={14} className="shrink-0 text-[#64748b]" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </section>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tablet & desktop: member × day grid */}
          <div className="hidden @[640px]:block">
            <div className="overflow-x-auto [overscroll-behavior-x:contain] [scrollbar-width:thin] [scrollbar-color:#334155_transparent]">
              <div className="w-max min-w-full">
                <div className={`${CALENDAR_GRID_ROW} border-b border-[#334155] bg-[rgba(15,23,42,0.6)]`}>
                  <div className="sticky left-0 z-20 flex items-center border-r border-[#334155] bg-[#111a2c] px-4 py-2.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.8px] text-[#94a3b8]">
                    Anggota
                  </div>
                  {weekDays.map((d) => (
                    <div
                      key={d.dow}
                      className={`flex flex-col items-center justify-center gap-0.5 border-l border-[#334155] px-1 py-2 text-center ${d.isToday ? "bg-[#0c2a3d]" : ""}`}
                    >
                      <span className={`text-[11px] font-bold ${d.isToday ? "text-[#38bdf8]" : d.weekend ? "text-[#94a3b8]" : "text-[#f8fafc]"}`}>{d.short}</span>
                      <span className={`font-mono text-[10.5px] ${d.isToday ? "text-[#38bdf8]" : "text-[#94a3b8]"}`}>{d.date}</span>
                      {d.isToday && <span className="rounded-[3px] bg-[#38bdf8] px-1.5 font-mono text-[8px] font-extrabold text-[#0f172a]">HARI INI</span>}
                    </div>
                  ))}
                </div>

                {roster.items.map((member) => (
                  <div className={`${CALENDAR_GRID_ROW} group border-b border-[#334155]/70`} key={member.id}>
                    <Link
                      href={routes.member(member.id, url.query)}
                      scroll={false}
                      className="sticky left-0 z-10 flex min-h-[58px] items-center gap-3 border-r border-[#334155] bg-[#1e293b] px-4 py-2 transition-colors group-hover:bg-[#223046]"
                      title={`Lihat profil ${member.name}`}
                    >
                      <MemberAvatar member={member} />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <strong className="truncate text-[12.5px] font-semibold text-[#f8fafc] transition-colors group-hover:text-[#38bdf8]" title={member.name}>
                          {member.name}
                        </strong>
                        <span className="truncate text-[11px] text-[#94a3b8]">{member.role}</span>
                      </span>
                    </Link>

                    {member.weeklySchedule.map((dayEntry, idx) => {
                      const style = SHIFT_STYLE_MAP[dayEntry.shift] ?? SHIFT_STYLE_MAP.Off;
                      const working = dayEntry.shift !== "Off";
                      return (
                        <div key={idx} className={`flex items-center justify-center border-l border-[#334155]/70 p-1.5 ${weekDays[idx]?.isToday ? "bg-[#0c2a3d]/50" : ""}`}>
                          <div
                            className={`flex h-full min-h-[44px] w-full flex-col justify-center rounded-[7px] border px-1 text-center ${style.badgeBg} ${style.badgeBorder} ${style.badgeText} ${working ? "" : "border-dashed"}`}
                            title={`${member.name} — ${dayEntry.day}: ${style.label}${dayEntry.hours ? ` (${dayEntry.hours})` : ""}`}
                          >
                            <strong className="text-[11.5px] font-bold leading-tight">{style.label}</strong>
                            {working && dayEntry.shift !== "Leave" && (
                              <span className="mt-0.5 hidden items-center justify-center gap-1 font-mono text-[9.5px] opacity-80 @[760px]:inline-flex">
                                <Clock size={9} className="shrink-0" />
                                {dayEntry.hours ?? style.hours}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}

                {members.length === 0 && <EmptyMembers />}
              </div>
            </div>

            <RosterPagination roster={roster} />
          </div>
        </>
      )}

      {/* ══ MONTHLY VIEW ═════════════════════════════════ */}
      {calMode === "monthly" && (
        <div className="p-3 sm:p-4">
          <div className="mb-1.5 grid grid-cols-7 gap-1 @[560px]:gap-1.5">
            {DOW_LABELS.map((d, i) => (
              <div key={d} className={`py-1 text-center font-mono text-[10px] font-bold uppercase tracking-[0.5px] ${i >= 5 ? "text-[#64748b]" : "text-[#94a3b8]"}`}>
                {d}
              </div>
            ))}
          </div>

          {monthGrid.map((week, wi) => (
            <div key={wi} className="mb-1 grid grid-cols-7 gap-1 @[560px]:mb-1.5 @[560px]:gap-1.5">
              {week.map((day, dow) => {
                if (day === null) return <div key={dow} aria-hidden="true" />;
                const isToday = isCurrentMonth && day === today.getDate();
                const isSelected = day === selectedDay;
                const scheduled = members.filter((m) => memberShiftForDow(m, dow) !== "Off");
                return (
                  <button
                    key={dow}
                    type="button"
                    className={`flex min-h-[52px] flex-col items-start gap-1 rounded-[8px] border p-1.5 text-left transition-colors cursor-pointer @[560px]:min-h-[76px] @[560px]:p-2 ${
                      isSelected
                        ? "border-[#38bdf8] bg-[#0c2a3d]"
                        : isToday
                          ? "border-[#38bdf8]/50 bg-[#0f172a]"
                          : "border-[#334155] bg-[#0f172a]/60 hover:bg-[#243044]"
                    }`}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    aria-pressed={isSelected}
                    aria-label={`${day} ${MONTH_NAMES[monthDate.getMonth()]}: ${scheduled.length} bertugas`}
                  >
                    <span className={`font-mono text-[12px] font-bold leading-none ${isToday || isSelected ? "text-[#38bdf8]" : "text-[#f8fafc]"}`}>{day}</span>
                    <span className="hidden flex-wrap gap-[3px] @[560px]:flex">
                      {scheduled.slice(0, 4).map((m) => (
                        <Avatar key={m.id} size="xs" name={m.name} title={`${m.name} — ${SHIFT_STYLE_MAP[memberShiftForDow(m, dow)].label}`} />
                      ))}
                      {scheduled.length > 4 && (
                        <span className="inline-grid h-5 min-w-5 place-items-center rounded-full border border-[#334155] bg-[#1e293b] px-1 font-mono text-[8.5px] font-bold text-[#cbd5e1]">
                          +{scheduled.length - 4}
                        </span>
                      )}
                    </span>
                    {scheduled.length > 0 && (
                      <span className="mt-auto font-mono text-[9.5px] font-semibold text-[#94a3b8]">
                        {scheduled.length}
                        <span className="hidden @[560px]:inline"> bertugas</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {selectedDay !== null && (
            <div className="mt-3 overflow-hidden rounded-[10px] border border-[#38bdf8]/35 bg-[#0f172a]/60">
              <div className="flex items-center justify-between gap-2 border-b border-[#38bdf8]/25 bg-[#0c2a3d] px-3.5 py-2.5 text-[12.5px] text-[#f8fafc]">
                <strong className="flex items-center gap-1.5">
                  <CalendarIcon size={14} className="text-[#38bdf8]" />
                  {selectedDay} {MONTH_NAMES[monthDate.getMonth()]} {monthDate.getFullYear()}
                  <span className="font-normal text-[#94a3b8]">· {membersOnDay.length} bertugas</span>
                </strong>
                <ModalCloseButton onClose={() => setSelectedDay(null)} label="Tutup detail hari" />
              </div>
              {membersOnDay.length === 0 ? (
                <p className="px-4 py-3 text-[12px] text-[#94a3b8]">Semua anggota libur atau cuti pada hari ini.</p>
              ) : (
                <ul className="divide-y divide-[#334155]/60">
                  {membersOnDay.map(({ member, shift }) => (
                    <li key={member.id}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-[#243044] cursor-pointer"
                        onClick={() => onSelectMember(member)}
                        title={`Buka profil ${member.name}`}
                      >
                        <MemberAvatar size="sm" member={member} />
                        <span className="min-w-0 flex-1">
                          <strong className="block truncate text-[12.5px] text-[#f8fafc]">{member.name}</strong>
                          <span className="block truncate text-[11px] text-[#94a3b8]">{member.role}</span>
                        </span>
                        <ShiftChip shift={shift} compact />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyMembers() {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
      <span className="mb-3 grid h-11 w-11 place-items-center rounded-full border border-[#334155] bg-[#0f172a] text-[#94a3b8]">
        <SearchX size={18} />
      </span>
      <strong className="text-[14px] text-[#f8fafc]">Tidak ada anggota yang sesuai</strong>
      <p className="mt-1 text-[12px] text-[#94a3b8]">Ubah kata kunci pencarian atau filter untuk menampilkan jadwal.</p>
    </div>
  );
}
