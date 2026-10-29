import { seedRosterMembers } from "@/app/lib/data";
import { SEED_TIME, SHIFT_ASSIGNMENT, formatRosterDate, seedPeople, shiftKeyFromAssignment } from "@/app/lib/master-people";
import type { DayScheduleEntry, RosterMember } from "@/app/lib/types";
import type { Person, Role, ShiftKey } from "@/app/types/master-data";

/**
 * Bridge between the people master (identity) and the Team Roster (scheduling).
 * Identity always comes from Master Data; seed members keep their scheduling,
 * statistics and history untouched, new people get the same defaults the legacy
 * member form used to create.
 */
const SEED_PEOPLE = seedPeople(null, seedRosterMembers, SEED_TIME).people;
export const seedPeopleSnapshot = (): Person[] => SEED_PEOPLE;

const DEFAULT_HOURS: Record<ShiftKey, { shift: DayScheduleEntry["shift"]; hours: string }> = {
  subuh: { shift: "Subuh", hours: "00:00–08:30" },
  pagi: { shift: "Pagi", hours: "08:00–16:30" },
  malam: { shift: "Malam", hours: "16:00–00:30" },
};
const WEEK: Pick<DayScheduleEntry, "day" | "date">[] = [
  { day: "Sen", date: "24 Aug" }, { day: "Sel", date: "25 Aug" }, { day: "Rab", date: "26 Aug" }, { day: "Kam", date: "27 Aug" },
  { day: "Jum", date: "28 Aug" }, { day: "Sab", date: "29 Aug" }, { day: "Min", date: "30 Aug" },
];
export function defaultWeeklySchedule(shift: ShiftKey = "malam"): DayScheduleEntry[] {
  return WEEK.map((entry, index) => index < 5 ? { ...entry, ...DEFAULT_HOURS[shift] } : { ...entry, shift: "Off", hours: "Libur" });
}

export function personToRosterMember(person: Person, role: Pick<Role, "key" | "name"> | undefined): RosterMember {
  const base = seedRosterMembers.find(member => member.id === person.id);
  const sameShift = !!base && shiftKeyFromAssignment(base.currentShift) === person.defaultShift;
  const currentShift = person.defaultShift ? sameShift ? base!.currentShift : SHIFT_ASSIGNMENT[person.defaultShift] : base?.currentShift ?? "Belum dijadwalkan";
  const status = person.status === "active" ? base?.status ?? "Active" : "Off Duty";
  return {
    id: person.id, name: person.fullName, role: role?.name || person.roleKey, roleKey: person.roleKey,
    employeeId: person.employeeId || "", email: person.email || "", phone: person.phone || "",
    currentShift, status,
    joinDate: base && base.joinDate === formatRosterDate(person.joinDate) ? base.joinDate : formatRosterDate(person.joinDate),
    avatarBg: base?.avatarBg,
    weeklySchedule: base?.weeklySchedule ?? defaultWeeklySchedule(person.defaultShift),
    stats: base?.stats ?? { onTimePercentage: 100, shiftsCompleted: 0, handoverScore: 100 },
    history: base?.history ?? [],
  };
}
/** Active people by default; pass includeInactive for the roster's "Termasuk nonaktif" toggle. */
export function peopleToRosterMembers(people: readonly Person[], roles: readonly Pick<Role, "key" | "name">[], includeInactive = false): RosterMember[] {
  return people.filter(person => includeInactive || person.status === "active").map(person => personToRosterMember(person, roles.find(role => role.key === person.roleKey)));
}
