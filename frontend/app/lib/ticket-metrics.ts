import type { Ticket } from "./types.ts";
import { addDaysToDateString, weekdayOfDateString } from "./wib.ts";

/**
 * The rules the dashboard numbers are built on, in one place so every panel agrees.
 *
 * - A ticket is DONE when its status is Closed, or when it has a completion time (`isStillOpen === false`). The backend imported 122
 *   Activity/Meeting tickets that carry a closed_at but never got the Closed status; for new tickets the backend sets closed_at exactly when
 *   it closes the ticket, so both rules say the same thing there.
 * - The SLA target depends on the severity: 60 minutes for High (an old "Critical" reads as High), 120 for Medium and Low. The backend has no target of its own
 *   (the ticket carries `slaTargetMinutes` only when something set it, and that value wins).
 * - People are matched by id when the ticket carries ids, otherwise by the exact (normalised) name; never by "contains".
 */

/** The SLA targets in minutes. Change them here and every panel follows. */
export const SLA_MINUTES = { strict: 60, standard: 120 } as const;

export function slaTargetFor(ticket: Pick<Ticket, "severity" | "slaTargetMinutes">): number {
  if (typeof ticket.slaTargetMinutes === "number" && ticket.slaTargetMinutes > 0) return ticket.slaTargetMinutes;
  const severity = (ticket.severity || "").toLowerCase();
  return severity === "critical" || severity === "kritis" || severity === "high" || severity === "tinggi" ? SLA_MINUTES.strict : SLA_MINUTES.standard;
}

export function isTicketDone(ticket: Pick<Ticket, "status" | "isStillOpen">): boolean {
  const status = (ticket.status || "").toLowerCase();
  return status === "closed" || status === "ditutup" || ticket.isStillOpen === false;
}

/** The ticket's day (YYYY-MM-DD), or "" when it has none. There is no made-up default date. */
export function ticketDateOf(ticket: Pick<Ticket, "date" | "created">): string {
  if (ticket.date) return ticket.date;
  return ticket.created && /^\d{4}-\d{2}-\d{2}/.test(ticket.created) ? ticket.created.slice(0, 10) : "";
}

export type SlaStatus = "met" | "breached" | "pending";
/** Met or breached once the ticket is done and has a resolution time; pending otherwise (nothing is guessed). */
export function slaStatus(ticket: Pick<Ticket, "status" | "isStillOpen" | "resolutionMinutes" | "severity" | "slaTargetMinutes">): SlaStatus {
  if (!isTicketDone(ticket) || typeof ticket.resolutionMinutes !== "number") return "pending";
  return ticket.resolutionMinutes <= slaTargetFor(ticket) ? "met" : "breached";
}

/** Share (0-100) of the evaluated tickets that met their target, or null when none could be evaluated. */
export function slaCompliance(tickets: readonly Parameters<typeof slaStatus>[0][]): { rate: number | null; evaluated: number; met: number } {
  let evaluated = 0, met = 0;
  for (const ticket of tickets) {
    const status = slaStatus(ticket);
    if (status === "pending") continue;
    evaluated += 1;
    if (status === "met") met += 1;
  }
  return { rate: evaluated ? Math.round((met / evaluated) * 100) : null, evaluated, met };
}

/** Newest first: by day, then by time of day. */
export function newestFirst(a: Pick<Ticket, "date" | "created">, b: Pick<Ticket, "date" | "created">): number {
  const byDay = ticketDateOf(b).localeCompare(ticketDateOf(a));
  return byDay !== 0 ? byDay : (b.created || "").localeCompare(a.created || "");
}

// ── People ──

/** "Mhd. Galih Khairi" and "Galih Khairi" are the same person: lower case, one space, no leading "Mhd." / "M.". */
export function normalizeName(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").toLowerCase().replace(/^(mhd\.|m\.)\s+/, "");
}

export interface PersonRef { id?: string; name: string }

/** Whether the ticket belongs to the person: their id among the ticket's owner ids, else an exact name match on the owner(s). */
export function matchesPerson(ticket: Pick<Ticket, "owner" | "owners" | "ownerIds">, person: PersonRef): boolean {
  if (person.id && ticket.ownerIds?.includes(person.id)) return true;
  const name = normalizeName(person.name);
  if (!name) return false;
  const names = ticket.owners?.length ? ticket.owners : ticket.owner ? [ticket.owner] : [];
  return names.some((owner) => normalizeName(owner) === name);
}

// ── Periods (all in WIB, given today's WIB date) ──

export type Period = "today" | "week" | "month" | "year" | "total";
export const PERIODS: readonly Period[] = ["total", "year", "month", "week", "today"];

export interface PeriodCounts extends Record<Period, number> {
  byProject: Record<Period, Record<string, number>>;
}

/** Monday of the week (Monday to Sunday) a day falls in. */
export function weekStartOf(ymd: string): string {
  return addDaysToDateString(ymd, -((weekdayOfDateString(ymd) + 6) % 7));
}

/**
 * Tickets opened today, this week (Monday to Sunday), this month and this year (by the ticket's own day, WIB), and all of them, overall and
 * per project. A ticket without a day counts only in the total.
 */
export function periodCounts(tickets: readonly Pick<Ticket, "date" | "created" | "project">[], todayWib: string): PeriodCounts {
  const result: PeriodCounts = { today: 0, week: 0, month: 0, year: 0, total: 0, byProject: { today: {}, week: {}, month: {}, year: {}, total: {} } };
  const week = weekStartOf(todayWib), month = todayWib.slice(0, 7), year = todayWib.slice(0, 4);
  const add = (key: Period, project: string) => { result[key] += 1; result.byProject[key][project] = (result.byProject[key][project] || 0) + 1; };
  for (const ticket of tickets) {
    add("total", ticket.project);
    const day = ticketDateOf(ticket);
    if (!day) continue;
    if (day === todayWib) add("today", ticket.project);
    if (day >= week && day <= todayWib) add("week", ticket.project);
    if (day.startsWith(month)) add("month", ticket.project);
    if (day.startsWith(year)) add("year", ticket.project);
  }
  return result;
}

/** The month key (YYYY-MM) before the given one. */
export function previousMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
}
