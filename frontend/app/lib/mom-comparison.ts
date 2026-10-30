import type { Ticket } from "./types.ts";
import { isTicketDone, previousMonthKey, slaCompliance, ticketDateOf } from "./ticket-metrics.ts";

/**
 * "Bulan Lalu vs Bulan Ini": this month (WIB) against the month before, compared over the SAME days (1 up to today's date), so a month
 * that is not over yet is not set against a whole month. Days are calendar days (the 15th against the 15th), not "the nth day that had
 * tickets". This month's line stops at today: the days still to come are not zeros, they have not happened.
 */

const MONTHS_LONG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export const monthLabel = (key: string) => `${MONTHS_LONG[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;
export const monthShort = (key: string) => MONTHS_SHORT[Number(key.slice(5, 7)) - 1];
export function daysInMonth(key: string): number {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export interface MomSide {
  key: string;
  label: string;
  /** Tickets opened in the compared days. */
  total: number;
  /** Of those, the ones that are done. */
  resolved: number;
  /** Average resolution (minutes) of the done ones with a duration; null when none. */
  avgResolution: number | null;
  /** SLA compliance (%) of the done ones (lib/ticket-metrics.ts); null when none could be evaluated. */
  slaRate: number | null;
}

export interface MomDay {
  day: number;
  /** null: that day has not come yet (this month) or does not exist (a shorter month). */
  curr: number | null;
  prev: number | null;
  currCum: number | null;
  prevCum: number | null;
}

export interface MomProjectRow {
  project: string;
  curr: number;
  prev: number;
  delta: number;
  /** null when last month had none (no meaningful percentage). */
  deltaPct: number | null;
}

export interface MomComparison {
  current: MomSide;
  previous: MomSide;
  /** Compared days: 1 to this (today's date, or the last day of the previous month when it is shorter). */
  throughDay: number;
  currentDays: number;
  previousDays: number;
  /** The previous month as a whole, for context. */
  previousFullTotal: number;
  days: MomDay[];
  projects: MomProjectRow[];
}

type MomTicket = Pick<Ticket, "date" | "created" | "project" | "status" | "isStillOpen" | "resolutionMinutes" | "severity" | "slaTargetMinutes">;

function side(key: string, tickets: readonly MomTicket[]): MomSide {
  const done = tickets.filter(isTicketDone);
  const times = done.filter((t) => typeof t.resolutionMinutes === "number").map((t) => t.resolutionMinutes as number);
  return {
    key,
    label: monthLabel(key),
    total: tickets.length,
    resolved: done.length,
    avgResolution: times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null,
    slaRate: slaCompliance(done).rate,
  };
}

export function buildMomComparison(tickets: readonly MomTicket[], todayWib: string): MomComparison {
  const currKey = todayWib.slice(0, 7);
  const prevKey = previousMonthKey(currKey);
  const today = Number(todayWib.slice(8, 10));
  const currentDays = daysInMonth(currKey), previousDays = daysInMonth(prevKey);
  const throughDay = Math.min(today, currentDays);
  const prevThrough = Math.min(throughDay, previousDays);

  const currDaily = new Array<number>(currentDays + 1).fill(0);
  const prevDaily = new Array<number>(previousDays + 1).fill(0);
  const currList: MomTicket[] = [], prevList: MomTicket[] = [];
  let previousFullTotal = 0;
  for (const ticket of tickets) {
    if (ticket.project === "L2") continue;
    const date = ticketDateOf(ticket);
    if (!date) continue;
    const day = Number(date.slice(8, 10));
    if (date.startsWith(currKey) && day <= throughDay) { currDaily[day] += 1; currList.push(ticket); }
    else if (date.startsWith(prevKey)) {
      prevDaily[day] += 1;
      previousFullTotal += 1;
      if (day <= prevThrough) prevList.push(ticket);
    }
  }

  const days: MomDay[] = [];
  let currCum = 0, prevCum = 0;
  for (let day = 1; day <= Math.max(currentDays, previousDays); day++) {
    const curr = day <= throughDay ? currDaily[day] : null;
    const prev = day <= previousDays ? prevDaily[day] : null;
    if (curr !== null) currCum += curr;
    if (prev !== null) prevCum += prev;
    days.push({ day, curr, prev, currCum: curr === null ? null : currCum, prevCum: prev === null ? null : prevCum });
  }

  const byProject = new Map<string, { curr: number; prev: number }>();
  for (const t of currList) { const row = byProject.get(t.project) ?? { curr: 0, prev: 0 }; row.curr += 1; byProject.set(t.project, row); }
  for (const t of prevList) { const row = byProject.get(t.project) ?? { curr: 0, prev: 0 }; row.prev += 1; byProject.set(t.project, row); }
  const projects = [...byProject.entries()]
    .map(([project, { curr, prev }]) => ({ project, curr, prev, delta: curr - prev, deltaPct: prev ? Math.round(((curr - prev) / prev) * 100) : null }))
    .sort((a, b) => Math.max(b.curr, b.prev) - Math.max(a.curr, a.prev) || a.project.localeCompare(b.project));

  return { current: side(currKey, currList), previous: side(prevKey, prevList), throughDay, currentDays, previousDays, previousFullTotal, days, projects };
}

/** "+12%", "−48%", "0%", or "baru" when last month had none. */
export function formatDeltaPct(curr: number, prev: number): string {
  if (!prev) return curr ? "baru" : "0%";
  const pct = Math.round(((curr - prev) / prev) * 100);
  return pct > 0 ? `+${pct}%` : pct < 0 ? `−${Math.abs(pct)}%` : "0%";
}
