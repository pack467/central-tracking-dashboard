import type { TicketSeverity } from "./types.ts";

/**
 * Tickets have three severities: High, Medium and Low, the same three the backend has. Older local data and the demo tickets may still say
 * "Critical" (or "Kritis"): those read as High everywhere, so no page shows a fourth level. Anything unknown reads as Medium.
 */
export const TICKET_SEVERITIES: readonly TicketSeverity[] = ["High", "Medium", "Low"];

export function normalizeSeverity(value: unknown): TicketSeverity {
  const text = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (text.startsWith("crit") || text === "kritis" || text.startsWith("high") || text === "tinggi") return "High";
  if (text.startsWith("low") || text === "rendah") return "Low";
  return "Medium";
}
