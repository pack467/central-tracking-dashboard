import { isOpenTicket } from "./data";
import { slaCompliance } from "./ticket-metrics.ts";
import type { Ticket } from "./types";
import { weekdayOfDateString } from "./wib.ts";

const same = (a: string | undefined | null, b: string) => Boolean(a) && a!.trim().toLowerCase() === b.trim().toLowerCase();

/** A ticket is this person's when the backend assigned it to them, or when they are named among its PICs. */
export function isTicketOf(ticket: Ticket, user: { id: string; name: string }): boolean {
  return ticket.backend?.userId === user.id
    || Boolean(ticket.ownerIds?.includes(user.id))
    || same(ticket.owner, user.name)
    || Boolean(ticket.owners?.some(owner => same(owner, user.name)));
}

export interface TicketStats { total: number; open: number; closed: number; escalated: number; averageMinutes: number | null; slaRate: number | null }

/** Counted from the tickets themselves, nothing estimated. No finished ticket with a duration means no average and no SLA, not zero. The SLA is the one the dashboard shows. */
export function ticketStats(tickets: readonly Ticket[]): TicketStats {
  const open = tickets.filter(isOpenTicket).length;
  const durations = tickets.map(ticket => ticket.resolutionMinutes).filter((minutes): minutes is number => typeof minutes === "number");
  return {
    total: tickets.length,
    open,
    closed: tickets.length - open,
    escalated: tickets.filter(ticket => Boolean(ticket.escalationLevel) || /escalat|eskalasi/i.test(ticket.status) || /escalat|eskalasi/i.test(ticket.category ?? "")).length,
    averageMinutes: durations.length ? Math.round(durations.reduce((sum, minutes) => sum + minutes, 0) / durations.length) : null,
    slaRate: slaCompliance(tickets).rate,
  };
}

export const formatDuration = (minutes: number | null) => {
  if (minutes === null) return "—";
  if (minutes < 60) return `${minutes} mnt`;
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  return rest ? `${hours} jam ${rest} mnt` : `${hours} jam`;
};

/** Where a day sits in a roster week, which runs Monday (0) to Sunday (6). */
export const rosterDayIndex = (ymd: string) => (weekdayOfDateString(ymd) + 6) % 7;

/** Backend permission keys as people read them; one not listed here shows as it is. */
const PERMISSION_LABELS: Record<string, string> = {
  "tickets.read": "Lihat tiket",
  "tickets.write": "Buat & ubah tiket",
  "tickets.write.any": "Kelola tiket semua orang",
  "tickets.delete": "Hapus tiket",
  "users.read": "Lihat personel",
  "users.manage": "Kelola personel",
  "users.manage.all": "Kelola semua personel",
  "roles.read": "Lihat peran",
  "roles.manage": "Kelola peran",
  "monitoring.read": "Lihat monitoring",
  "monitoring.write": "Isi monitoring",
};
export const permissionLabel = (key: string) => PERMISSION_LABELS[key] ?? key;
