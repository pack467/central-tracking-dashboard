// Formats of a template's schedule: its time of day and its active dates, both
// local to the template's time zone (Asia/Jakarta, WIB, by default).

export const TIME_OF_DAY = /^([01]\d|2[0-3]):[0-5]\d$/; // "09:00"
export const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/; // "2026-11-02"
