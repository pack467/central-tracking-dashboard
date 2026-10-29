import { getShiftType } from "@/app/lib/shifts";
import type { Person, Role, ShiftKey } from "@/app/types/master-data";
import type { RosterMember } from "@/app/lib/types";

/** The five roles the application logic (Team Roster statistics, access mapping) compares by string. */
export const SEED_ROLE_KEYS = ["Operator NOC", "Shift Lead", "Incident Coordinator", "L2 Specialist", "Infrastructure Engineer"] as const;
export const SHIFT_KEYS: readonly ShiftKey[] = ["subuh", "pagi", "malam"];
export const SHIFT_LABELS: Record<ShiftKey, string> = { subuh: "Shift Subuh", pagi: "Shift Pagi", malam: "Shift Malam" };
/** Same strings the legacy member form stored in RosterMember.currentShift. */
export const SHIFT_ASSIGNMENT: Record<ShiftKey, string> = {
  subuh: "Shift Subuh (00:00–08:30 WIB)",
  pagi: "Shift Pagi (08:00–16:30 WIB)",
  malam: "Shift Malam (16:00–00:30 WIB)",
};
export const SEED_TIME = "2026-10-15T00:00:00.000Z";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type StoredRole = Omit<Role, "usageCount">;
export function seedRoles(): StoredRole[] {
  return SEED_ROLE_KEYS.map((key, index) => ({ key, name: key, active: true, sortOrder: index, protected: true }));
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
/** "15 Jan 2024" (legacy roster display) to "2024-01-15"; undefined when it cannot be read. */
export function parseRosterDate(display: unknown): string | undefined {
  if (typeof display !== "string") return undefined;
  if (isIsoDate(display.trim())) return display.trim();
  const match = display.trim().match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})$/);
  if (!match) return undefined;
  const month = MONTHS.findIndex(name => name.toLowerCase() === match[2].toLowerCase());
  if (month < 0) return undefined;
  const iso = `${match[3]}-${String(month + 1).padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  return isIsoDate(iso) ? iso : undefined;
}
/** Inverse of parseRosterDate, in the exact shape the seed members use ("01 Mar 2023"). */
export function formatRosterDate(iso: string | undefined): string {
  if (!iso || !isIsoDate(iso)) return "";
  return `${iso.slice(8, 10)} ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
}
export function shiftKeyFromAssignment(current: unknown): ShiftKey | undefined {
  const type = getShiftType(typeof current === "string" ? current : "");
  return type === "default" ? undefined : type;
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const norm = (value: unknown): string => typeof value === "string" ? value.trim().replace(/\s+/g, " ").toLowerCase() : "";

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown): string | undefined => typeof value === "string" && value.trim() ? value.trim() : undefined;

export function personFromRosterMember(member: RosterMember | Record<string, unknown>, at: string): Person | undefined {
  if (!record(member)) return undefined;
  const id = text(member.id), fullName = text(member.name), roleKey = text(member.role);
  if (!id || !fullName || !roleKey) return undefined;
  return {
    id, fullName, roleKey, employeeId: text(member.employeeId), email: text(member.email), phone: text(member.phone),
    defaultShift: shiftKeyFromAssignment(member.currentShift), joinDate: parseRosterDate(member.joinDate),
    status: "active", createdAt: at, updatedAt: at,
  };
}

/**
 * Seeds the people collection from the Team Roster. The seed members come first;
 * members stored under ctd.roster.members win on a matching id and any extra
 * stored member is preserved. The legacy key itself is never modified.
 */
export function seedPeople(storedRoster: unknown, seeds: readonly RosterMember[], at: string): { people: Person[]; extraRoleKeys: string[] } {
  const byId = new Map<string, Person>();
  for (const seed of seeds) { const person = personFromRosterMember(seed, at); if (person) byId.set(person.id, person); }
  if (Array.isArray(storedRoster)) {
    for (const stored of storedRoster) {
      const person = personFromRosterMember(stored as Record<string, unknown>, at);
      if (person) byId.set(person.id, { ...byId.get(person.id), ...person, createdAt: at, updatedAt: at });
    }
  }
  const people = [...byId.values()];
  const known = new Set<string>(SEED_ROLE_KEYS);
  return { people, extraRoleKeys: [...new Set(people.map(person => person.roleKey).filter(key => !known.has(key)))] };
}

/** Names that identify the same person in free-text owner fields ("A, B", "A & B"). */
export function ownerTokens(value: unknown): string[] {
  if (typeof value !== "string") return [];
  const whole = norm(value);
  return whole ? [...new Set([whole, ...value.split(/[,;/&]|\s+dan\s+|\s+and\s+/i).map(norm).filter(Boolean)])] : [];
}
export function nameMatchesPerson(value: unknown, person: Pick<Person, "fullName">): boolean {
  const name = norm(person.fullName);
  return !!name && ownerTokens(value).includes(name);
}
