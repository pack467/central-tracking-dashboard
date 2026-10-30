/**
 * The clock of this operation is WIB (UTC+7, no daylight saving), whatever the device is set to. Shifts, "today", the clock in the top bar
 * and the times written on tickets all read from here, so a laptop set to another zone (or a kiosk left on UTC) still shows the shift that is
 * really on duty. The backend stores UTC and tickets are shown in WIB (see backend-tickets.ts), so this is the same clock.
 *
 * Dates here are YYYY-MM-DD strings and arithmetic on them goes through UTC midnight, so it never depends on the device zone either.
 */
const WIB_OFFSET_MS = 7 * 3_600_000;
const DAY_MS = 86_400_000;
const pad = (value: number) => String(value).padStart(2, "0");

/** A Date whose UTC getters read the WIB wall clock. Always read it with getUTC*, never with the local getters. */
const shifted = (date: Date) => new Date(date.getTime() + WIB_OFFSET_MS);

export interface WibParts { year: number; month: number; day: number; hours: number; minutes: number; seconds: number; milliseconds: number; weekday: number }

/** The WIB wall clock of an instant. `month` is 1-12 and `weekday` is 0 (Sunday) to 6. */
export function wibParts(date: Date = new Date()): WibParts {
  const d = shifted(date);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hours: d.getUTCHours(), minutes: d.getUTCMinutes(), seconds: d.getUTCSeconds(), milliseconds: d.getUTCMilliseconds(), weekday: d.getUTCDay() };
}
export function wibMinutesOfDay(date: Date = new Date()): number {
  const { hours, minutes } = wibParts(date);
  return hours * 60 + minutes;
}
/** Milliseconds since WIB midnight. */
export function wibMsOfDay(date: Date = new Date()): number {
  return (((date.getTime() + WIB_OFFSET_MS) % DAY_MS) + DAY_MS) % DAY_MS;
}
/** YYYY-MM-DD in WIB. */
export function wibDateString(date: Date = new Date()): string {
  return shifted(date).toISOString().slice(0, 10);
}
/** HH:MM in WIB. */
export function wibClockLabel(date: Date = new Date()): string {
  const { hours, minutes } = wibParts(date);
  return `${pad(hours)}:${pad(minutes)}`;
}

const utcMidnight = (ymd: string) => {
  const [year, month, day] = ymd.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
};
/** A YYYY-MM-DD date moved by whole days. */
export function addDaysToDateString(ymd: string, days: number): string {
  return new Date(utcMidnight(ymd) + days * DAY_MS).toISOString().slice(0, 10);
}
/** Day of the week of a YYYY-MM-DD date: 0 (Sunday) to 6. */
export function weekdayOfDateString(ymd: string): number {
  return new Date(utcMidnight(ymd)).getUTCDay();
}
