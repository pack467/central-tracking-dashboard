// Templates schedule checks as local "HH:mm" times in an IANA time zone; logs
// store each slot as an exact instant (scheduled_at). Intl converts between
// the two, so no date library is needed.

export const TIME_OF_DAY = /^([01]\d|2[0-3]):[0-5]\d$/; // "09:00"
export const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/; // "2026-11-02"

// An instant as a wall clock in `timeZone` shows it.
export function localDateTime(instant: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(instant)
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    onTheMinute: parts.second === '00' && instant.getUTCMilliseconds() === 0,
  };
}

// A @db.Date column (Prisma returns UTC midnight) as "YYYY-MM-DD".
export const toDateOnly = (date: Date) => date.toISOString().slice(0, 10);
