/** Personel: reads, validation, writes, usage and safe delete. */
import { allTickets, authorized, clone, error, load, sessionActor } from "./master-store";
import { countText, matchesActor, onlyHolderOf, tombstone, untouched, usedSentence } from "./master-delete-rules";
import { auditEntry, pageOf, peopleOf, rolesOf, transact } from "./master-transaction";
import { chosen, diff, optionalText, required, text } from "./master-catalog-store";
import { CLIENT_HANDOVER_TASKS, getClientMonitoringSchedule } from "@/app/lib/clientData";
import { initialHandoverRecord, seedRosterMembers, seedSwapRequests } from "@/app/lib/data";
import { EMAIL_PATTERN, SHIFT_KEYS, isIsoDate, nameMatchesPerson, norm } from "@/app/lib/master-people";
import { masterId, masterNow } from "@/app/lib/master-data-model";
import type {
  AuditEntry,
  MasterActor,
  MasterPage,
  MasterQuery,
  MasterSnapshotV2,
  Person,
  PersonInput,
  PersonUsage,
  PersonUsageItem
} from "@/app/types/master-data";
import type { Ticket } from "@/app/lib/types";

/* People */
const personScan = {
  tickets(person: Person) {
    const matched = allTickets().filter(ticket => ticket.ownerIds?.includes(person.id) || nameMatchesPerson(ticket.owner, person) || ticket.owners?.some(owner => nameMatchesPerson(owner, person)) || nameMatchesPerson(ticket.escalatedTo, person));
    return matched;
  },
  checkpoints(data: MasterSnapshotV2, person: Person): number {
    return data.organizations.reduce((sum, org) => sum + getClientMonitoringSchedule(org.id).filter(entry => nameMatchesPerson(entry.owner, person)).length, 0);
  },
  handovers(person: Person): number {
    const record = initialHandoverRecord;
    const direct = [record.sourcePic, record.targetPic, record.monitoringOwner].filter(value => nameMatchesPerson(value, person)).length;
    const tasks = [...record.tasks, ...Object.values(CLIENT_HANDOVER_TASKS).flat()].filter(task => nameMatchesPerson(task.confirmedBy, person)).length;
    return direct + tasks;
  },
  schedule(person: Person): { entries: number; swaps: number } {
    const base = seedRosterMembers.find(member => member.id === person.id);
    return { entries: base ? base.weeklySchedule.filter(day => day.shift !== "Off" && day.shift !== "Leave").length : 0, swaps: seedSwapRequests.filter(request => request.requesterId === person.id || request.targetMemberId === person.id).length };
  }
};

function personUsageOf(data: MasterSnapshotV2, person: Person, actor: MasterActor): PersonUsage {
  const item = (id: string, label: string, active?: boolean): PersonUsageItem => ({ id, label, active });
  const organizations = data.organizations.filter(org => org.picUserId === person.id).map(org => item(org.id, org.name, org.status === "active"));
  const projects = data.projects.filter(project => project.leadUserId === person.id || !project.leadUserId && nameMatchesPerson(project.legacy?.leadEngineer, person)).map(project => item(project.id, project.name, project.status === "active"));
  const systems = data.systems.filter(system => system.picUserId === person.id).map(system => item(system.id, system.name, system.status === "active"));
  const tickets = personScan.tickets(person);
  const open = (ticket: Ticket) => !["closed", "ditutup"].includes(String(ticket.status || "").toLowerCase());
  const checkpoints = personScan.checkpoints(data, person), handovers = personScan.handovers(person), schedule = personScan.schedule(person);
  const audit = data.audit.filter(entry => entry.entityType === "person" && entry.entityId === person.id);
  const edited = !untouched(data, "person", person.id);
  const isSelf = matchesActor(person, actor), lastHolderOf = onlyHolderOf(data, person);
  const parts: string[] = [];
  if (organizations.length) parts.push(countText(organizations.length, "organisasi (PIC)"));
  if (projects.length) parts.push(countText(projects.length, "proyek (PIC)"));
  if (systems.length) parts.push(countText(systems.length, "sistem (PIC)"));
  if (tickets.length) parts.push(countText(tickets.length, "tiket"));
  if (checkpoints) parts.push(countText(checkpoints, "checkpoint"));
  if (handovers) parts.push(countText(handovers, "handover"));
  if (schedule.entries) parts.push("jadwal shift");
  if (schedule.swaps) parts.push(countText(schedule.swaps, "tukar shift"));
  const guard = isSelf
    ? "Akun yang sedang masuk tidak dapat diubah statusnya."
    : lastHolderOf ? `Satu-satunya ${lastHolderOf} aktif. Tetapkan penggantinya lebih dulu.` : undefined;
  const deleteReason = isSelf
    ? "Akun yang sedang masuk tidak dapat dihapus."
    : lastHolderOf
      ? `Satu-satunya ${lastHolderOf} aktif. Tetapkan penggantinya lebih dulu.`
      : parts.length || edited ? usedSentence(parts, edited, "Nonaktifkan") : undefined;
  return {
    organizations,
    projects,
    systems,
    tickets: tickets.length,
    activeTickets: tickets.filter(open).length,
    ticketExamples: tickets.slice(0, 5).map(ticket => item(ticket.id, ticket.subject || ticket.id, open(ticket))),
    handovers,
    checkpoints,
    scheduleEntries: schedule.entries,
    swapRequests: schedule.swaps,
    auditEntries: audit.length,
    isSelf,
    lastHolderOf,
    canDelete: !deleteReason,
    deleteReason,
    canDeactivate: !guard,
    deactivateReason: guard
  };
}

export function findPerson(data: MasterSnapshotV2, id: string): Person {
  const person = peopleOf(data).find(item => item.id === id);
  if (!person) error(404, "Personel tidak ditemukan.", "NOT_FOUND");
  return person;
}

function normalizePerson(input: Record<string, unknown>, data: MasterSnapshotV2, existing?: Person): Omit<Person, "id" | "createdAt" | "updatedAt"> {
  const present = (key: string) => key in input;
  const fullName = existing && !present("fullName") ? existing.fullName : required(input.fullName, "fullName", "Nama lengkap", 120);
  const employeeId = existing && !present("employeeId") ? existing.employeeId : required(input.employeeId, "employeeId", "ID pegawai", 40);
  let email = existing && !present("email") ? existing.email : required(input.email, "email", "Email", 255);
  if (email && !EMAIL_PATTERN.test(email)) error(422, "Format email tidak valid.", "INVALID_EMAIL", "email");
  email = email || undefined;
  const roleKey = existing && !present("roleKey") ? existing.roleKey : text(input.roleKey);
  const role = rolesOf(data).find(item => item.key === roleKey);
  if (!role) error(422, "Pilih peran operasional.", "VALIDATION_ERROR", "roleKey");
  if (!role.active && role.key !== existing?.roleKey) error(422, "Peran tidak aktif. Pilih peran lain.", "INACTIVE_ROLE", "roleKey");
  const defaultShift = present("defaultShift") ? (input.defaultShift ? chosen(input.defaultShift, SHIFT_KEYS, "defaultShift") : undefined) : existing?.defaultShift;
  const joinDate = existing && !present("joinDate") ? existing.joinDate : text(input.joinDate);
  if (!existing || present("joinDate")) {
    if (!joinDate) error(422, "Tanggal bergabung wajib diisi.", "VALIDATION_ERROR", "joinDate");
    if (!isIsoDate(joinDate)) error(422, "Tanggal bergabung tidak valid.", "VALIDATION_ERROR", "joinDate");
  }
  const status = present("status") ? personStatus(input.status) : existing?.status === "archived" ? "inactive" : existing?.status || "active";
  const others = peopleOf(data).filter(person => person.id !== existing?.id);
  if (employeeId && others.some(person => norm(person.employeeId) === norm(employeeId)))
    error(409, `ID pegawai "${employeeId}" sudah digunakan.`, "DUPLICATE_EMPLOYEE_ID", "employeeId");
  if (email && others.some(person => norm(person.email) === norm(email)))
    error(409, `Email "${email}" sudah digunakan.`, "DUPLICATE_EMAIL", "email");
  return {
    fullName,
    employeeId,
    email,
    phone: present("phone") ? optionalText(input.phone, "phone", 50) : existing?.phone,
    roleKey: role.key,
    defaultShift,
    joinDate,
    status,
    notes: present("notes") ? optionalText(input.notes, "notes", 1000) : existing?.notes
  };
}

function personChanges(before: Record<string, unknown>, after: Record<string, unknown>): AuditEntry["changes"] { return diff(before, after); }

/** Deactivating, archiving or moving a person away from a protected role must never strand that role. */
/** Personel are active or inactive. "archived" (older stored data, older clients) is read as inactive. */
function personStatus(value: unknown): "active" | "inactive" {
  return value === "archived" ? "inactive" : chosen(value, ["active", "inactive"] as const, "status");
}
function assertCanLeave(data: MasterSnapshotV2, person: Person, actor: MasterActor, reason: "status" | "role"): void {
  if (reason === "status" && matchesActor(person, actor))
    error(409, "Akun yang sedang masuk tidak dapat dinonaktifkan atau diarsipkan.", "SELF_PROTECTED", "status");
  const role = onlyHolderOf(data, person);
  if (role)
    error(409, `Satu-satunya ${role} aktif. Tetapkan penggantinya lebih dulu.`, "LAST_ACTIVE_HOLDER", reason === "role" ? "roleKey" : "status");
}

export function listPeople(query: MasterQuery = {}, actor = sessionActor): MasterPage<Person> {
  authorized("person", "read", actor); const data = load(), needle = norm(query.q);
  let rows = peopleOf(data).filter(person => {
    if (needle && ![person.fullName, person.employeeId, person.email, person.phone].some(value => norm(value).includes(needle))) return false;
    if (query.status && query.status !== "all" && (person.status === "archived" ? "inactive" : person.status) !== (query.status === "archived" ? "inactive" : query.status)) return false;
    if (query.roleKey && query.roleKey !== "all" && person.roleKey !== query.roleKey) return false;
    return true;
  });
  const sort = query.sort || "name";
  rows = [...rows].sort((a, b) => sort.includes("updated")
    ? (Date.parse(a.updatedAt) - Date.parse(b.updatedAt)) * (sort.startsWith("-") ? -1 : 1)
    : a.fullName.localeCompare(b.fullName, "id", { numeric: true, sensitivity: "base" }) * (sort === "-name" ? -1 : 1));
  return pageOf(rows, query);
}

export function getPerson(id: string, actor = sessionActor): Person { authorized("person", "read", actor); return clone(findPerson(load(), id)); }

export function createPerson(input: PersonInput, actor = sessionActor): Person {
  authorized("person", "create", actor);
  const data = load(), value = normalizePerson(input as unknown as Record<string, unknown>, data), at = masterNow(), id = masterId("person");
  const person: Person = { id, ...value, createdAt: at, updatedAt: at };
  transact(
    actor,
    (next, when) => {
      next.people = [person, ...peopleOf(next)];
      return [auditEntry("person", id, actor, when, personChanges({}, person as unknown as Record<string, unknown>), "create")];
    }
  );
  return clone(person);
}

export function updatePerson(id: string, input: Partial<PersonInput>, actor = sessionActor): Person {
  authorized("person", "update", actor);
  const data = load(), old = findPerson(data, id), value = normalizePerson(input as unknown as Record<string, unknown>, data, old);
  if (value.status !== old.status) {
    authorized("person", "archive", actor);
    if (value.status !== "active")
      assertCanLeave(data, old, actor, "status"); else if (!rolesOf(data).find(role => role.key === value.roleKey)?.active)
      error(422, "Peran tidak aktif. Pilih peran lain.", "INACTIVE_ROLE", "roleKey");
  }
  if (value.roleKey !== old.roleKey && old.status === "active" && value.status === "active") assertCanLeave(data, old, actor, "role");
  const changes = personChanges(old as unknown as Record<string, unknown>, { ...old, ...value } as unknown as Record<string, unknown>);
  if (!changes.length) return clone(old);
  const updated: Person = { ...old, ...value, updatedAt: masterNow() };
  transact(
    actor,
    (next, when) => {
      next.people = peopleOf(next).map(person => person.id === id ? { ...updated, updatedAt: when } : person);
      return [auditEntry("person", id, actor, when, changes)];
    }
  );
  return getPerson(id, actor);
}

export function setPersonStatus(id: string, status: string, actor = sessionActor): Person {
  authorized("person", "archive", actor);
  return updatePerson(id, { status: personStatus(status) }, actor);
}

export function personUsage(id: string, actor = sessionActor): PersonUsage {
  authorized("person", "read", actor); const data = load();
  return personUsageOf(data, findPerson(data, id), actor);
}

export function deletePerson(id: string, actor = sessionActor): void {
  authorized("person", "delete", actor);
  const data = load(), person = findPerson(data, id), usage = personUsageOf(data, person, actor);
  if (!usage.canDelete) error(409, usage.deleteReason || "Personel sudah dipakai.", "IN_USE");
  transact(actor, (next, at) => {
    next.people = peopleOf(next).filter(item => item.id !== id);
    tombstone(next, "person", id, person.fullName, at, actor);
    return [auditEntry("person", id, actor, at, [{ field: "fullName", from: person.fullName, to: null }], "delete")];
  });
}
