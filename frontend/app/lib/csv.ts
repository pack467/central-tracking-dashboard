/**
 * One CSV cell, safe to open in a spreadsheet.
 *
 * Text is always quoted (quotes doubled). A text that starts with = + - @ or a tab/carriage return would be run as a formula by Excel and
 * Google Sheets even inside quotes, so it gets a leading apostrophe: it shows as plain text and nothing executes. Numbers are written as they
 * are (a negative number is a number, not a formula); empty values are empty.
 */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${text.replace(/"/g, '""')}"`;
}

/** A line of cells, joined with the delimiter the export uses (the semicolon: it opens in columns in Indonesian locale spreadsheets). */
export function csvLine(cells: ReadonlyArray<string | number | null | undefined>, delimiter = ";"): string {
  return cells.map(csvCell).join(delimiter);
}
