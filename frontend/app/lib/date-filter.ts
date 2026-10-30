import { addDaysToDateString } from "./wib.ts";

/**
 * The dashboard's date filter is one string:
 *   "today"        today in WIB (the default; the URL carries nothing)
 *   "all"          every ticket
 *   "2026-09-30"   one day
 *   "2026-09-01..2026-09-30"   a range, both ends included
 * "today" is resolved here against the WIB date passed in, so it stays right after midnight without the URL changing.
 */
export const DATE_FILTER_TODAY = "today";
export const DATE_FILTER_ALL = "all";

export function dateFilterMatches(filter: string, ticketDate: string, today: string): boolean {
  if (!filter || filter === DATE_FILTER_ALL) return true;
  if (filter === DATE_FILTER_TODAY) return ticketDate === today;
  if (filter.includes("..")) {
    const [start, end] = filter.split("..");
    if (start && ticketDate < start) return false;
    if (end && ticketDate > end) return false;
    return true;
  }
  return ticketDate === filter;
}

/** The filter as the picker should show it: a real date for "today", nothing for "all" (the picker then shows its placeholder). */
export function dateFilterToPickerValue(filter: string, today: string): string {
  if (filter === DATE_FILTER_TODAY) return today;
  if (filter === DATE_FILTER_ALL || !filter) return "";
  return filter;
}

/** What the picker reports, as a filter: nothing is "all", today's date is "today" (so the URL stays clean), anything else is itself. */
export function pickerValueToDateFilter(value: string, today: string): string {
  if (!value) return DATE_FILTER_ALL;
  return value === today ? DATE_FILTER_TODAY : value;
}

/** A short name for the filter, for file names and messages. */
export function dateFilterLabel(filter: string, today: string): string {
  if (filter === DATE_FILTER_TODAY) return `Hari Ini — ${today}`;
  if (filter === DATE_FILTER_ALL || !filter) return "Semua Waktu";
  if (filter.includes("..")) return filter.replace("..", " s/d ");
  return filter;
}

/** "The last 7 days up to and including today", as a filter. */
export function lastSevenDaysFilter(today: string): string {
  return `${addDaysToDateString(today, -6)}..${today}`;
}
