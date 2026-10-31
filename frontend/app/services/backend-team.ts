/**
 * Personel and Peran from the real backend: GET /users and GET /roles (read only for now).
 *
 * The backend answers these two as plain arrays without paging or filters, so searching, filtering, sorting and paging are done here with
 * the same rules the Master Data lists use. Fields the backend does not have (phone, shift, join date, notes, sort order, the "built-in"
 * flag) are simply absent; writing is not connected and says so instead of pretending to save.
 */
import { apiClient } from "@/app/lib/api/client";
import { ApiError } from "@/app/lib/api/errors";
import { apiModuleEnabled } from "@/app/lib/config";
import { roleLabel } from "@/app/lib/auth-api";
import type { MasterPage, MasterQuery, Person, PersonUsage, Role, RoleUsage } from "@/app/types/master-data";
import { z } from "zod";
import { backendRoleSchema, backendUserSchema, parseResponse } from "@/app/lib/api/schemas";

/** A person and a role as the backend sends them; the shapes are checked on arrival (lib/api/schemas.ts). */
export type BackendUser = z.output<typeof backendUserSchema>;
export type BackendRole = z.output<typeof backendRoleSchema>;
const userListSchema = z.array(backendUserSchema);
const roleListSchema = z.array(backendRoleSchema);
const ticketCountSchema = z.looseObject({ meta: z.looseObject({ total: z.number() }) });

export const peopleFromBackend = (): boolean => apiModuleEnabled("people") && apiModuleEnabled("auth");
export const rolesFromBackend = (): boolean => apiModuleEnabled("roles") && apiModuleEnabled("auth");

const NOT_CONNECTED = (what: string) => new ApiError({ status: 501, code: "NOT_CONNECTED", message: `${what} belum tersambung ke backend: untuk saat ini daftar ini hanya bisa dibaca.` });
export const notConnected = NOT_CONNECTED;

export function backendUserToPerson(user: BackendUser, roles: readonly BackendRole[]): Person {
  const role = roles.find(item => String(item.id) === String(user.role_id));
  return {
    id: String(user.id),
    fullName: user.name?.trim() || user.email || `Pengguna ${user.id}`,
    ...(user.nik ? { employeeId: user.nik } : {}),
    ...(user.email ? { email: user.email } : {}),
    roleKey: role?.name ?? "",
    status: user.is_active ? "active" : "inactive",
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}
export function backendRoleToRole(role: BackendRole, index: number): Role {
  return {
    key: role.name,
    name: roleLabel(role.name),
    ...(role.description ? { description: role.description } : {}),
    active: true,
    sortOrder: index,
    // the backend has no flag for this; roles are managed there, never switched off here
    protected: true,
    usageCount: role.user_count ?? 0,
  };
}

const collator = new Intl.Collator("id", { sensitivity: "base", numeric: true });
function page<T>(rows: T[], query: MasterQuery): MasterPage<T> {
  const pageSize = [10, 25, 50].includes(query.pageSize ?? 0) ? query.pageSize! : 10;
  const total = rows.length, totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(totalPages, Math.max(1, Math.floor(query.page || 1)));
  return { data: rows.slice((current - 1) * pageSize, current * pageSize), meta: { page: current, pageSize, total, totalPages } };
}

async function users(signal?: AbortSignal) { return parseResponse(userListSchema, await apiClient.get<unknown>("/users", { signal }), "daftar personel"); }
async function roles(signal?: AbortSignal) { return parseResponse(roleListSchema, await apiClient.get<unknown>("/roles", { signal }), "daftar peran"); }
const isForbidden = (cause: unknown) => cause instanceof ApiError && cause.status === 403;
/**
 * GET /roles needs roles.read, which only admins have, while GET /users needs users.read, which everyone has. Roles here only name
 * people's roles, so someone who may not read them still gets the people list, just without role names.
 */
async function rolesForLabels(signal?: AbortSignal): Promise<BackendRole[]> {
  try { return await roles(signal); } catch (cause) { if (isForbidden(cause)) return []; throw cause; }
}
const NO_ROLE_ACCESS = "Anda tidak memiliki izin untuk melihat daftar peran.";
async function rolesOrDenied(signal?: AbortSignal): Promise<BackendRole[]> {
  try { return await roles(signal); } catch (cause) { throw isForbidden(cause) ? new ApiError({ status: 403, code: "FORBIDDEN", message: NO_ROLE_ACCESS }) : cause; }
}

/** Everyone and the readable roles together, each list fetched once (people.all and roles.available would both fetch /roles). */
export async function backendPeopleAndRoles(signal?: AbortSignal): Promise<{ people: Person[]; roles: Role[] }> {
  const [userRows, roleRows] = await Promise.all([users(signal), rolesForLabels(signal)]);
  return { people: userRows.map(user => backendUserToPerson(user, roleRows)), roles: roleRows.map(backendRoleToRole) };
}

export const backendPeople = {
  async all(signal?: AbortSignal): Promise<Person[]> {
    const [userRows, roleRows] = await Promise.all([users(signal), rolesForLabels(signal)]);
    return userRows.map(user => backendUserToPerson(user, roleRows));
  },
  async list(query: MasterQuery = {}, signal?: AbortSignal): Promise<MasterPage<Person>> {
    const q = (query.q || "").trim().toLowerCase();
    let rows = await this.all(signal);
    if (q) rows = rows.filter(person => [person.fullName, person.employeeId, person.email].some(value => value?.toLowerCase().includes(q)));
    if (query.status && query.status !== "all") rows = rows.filter(person => person.status === query.status || (query.status === "archived" && person.status === "inactive"));
    if (query.roleKey && query.roleKey !== "all") rows = rows.filter(person => person.roleKey === query.roleKey);
    const sort = query.sort || "name";
    rows.sort((a, b) => sort === "-name" ? collator.compare(b.fullName, a.fullName)
      : sort === "updated" ? a.updatedAt.localeCompare(b.updatedAt)
      : sort === "-updated" ? b.updatedAt.localeCompare(a.updatedAt)
      : collator.compare(a.fullName, b.fullName));
    return page(rows, query);
  },
  async get(id: string, signal?: AbortSignal): Promise<Person> {
    const found = (await this.all(signal)).find(person => person.id === id);
    if (!found) throw new ApiError({ status: 404, code: "NOT_FOUND", message: "Personel tidak ditemukan." });
    return found;
  },
  /** Tickets are counted by the backend (GET /tickets filters by user_id); the other relations do not exist there. */
  async usage(id: string, signal?: AbortSignal): Promise<PersonUsage> {
    const count = async (params: Record<string, string | number>) => parseResponse(ticketCountSchema, await apiClient.get<unknown>("/tickets", { params: { limit: 1, user_id: id, ...params }, signal }), "jumlah tiket").meta.total;
    const [tickets, activeTickets] = await Promise.all([count({}), count({ status: "Open,Pending,ReOpen,Activity" })]);
    const reason = "Penghapusan dan penonaktifan personel belum tersambung ke backend.";
    return { organizations: [], projects: [], systems: [], tickets, activeTickets, ticketExamples: [], handovers: 0, checkpoints: 0, scheduleEntries: 0, swapRequests: 0, auditEntries: 0, isSelf: false, canDelete: false, deleteReason: reason, canDeactivate: false, deactivateReason: reason };
  },
  async audit(): Promise<MasterPage<never>> { return { data: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 1 } }; },
};

export const backendRoles = {
  /** The roles, or a 403 with a readable message when this person may not read them. */
  async all(signal?: AbortSignal): Promise<Role[]> { return (await rolesOrDenied(signal)).map(backendRoleToRole); },
  /** The roles this person may read: none, rather than an error, when they may not (the shared people store uses this). */
  async available(signal?: AbortSignal): Promise<Role[]> { return (await rolesForLabels(signal)).map(backendRoleToRole); },
  async list(query: MasterQuery = {}, signal?: AbortSignal): Promise<MasterPage<Role>> {
    const q = (query.q || "").trim().toLowerCase();
    let rows = await this.all(signal);
    if (q) rows = rows.filter(role => [role.name, role.key, role.description].some(value => value?.toLowerCase().includes(q)));
    if (query.status && query.status !== "all") rows = rows.filter(role => (role.active ? "active" : "inactive") === query.status);
    const sort = query.sort || "order";
    rows.sort((a, b) => sort === "name" ? collator.compare(a.name, b.name) : sort === "-name" ? collator.compare(b.name, a.name) : a.sortOrder - b.sortOrder);
    return page(rows, query);
  },
  async get(key: string, signal?: AbortSignal): Promise<Role> {
    const found = (await this.all(signal)).find(role => role.key === key);
    if (!found) throw new ApiError({ status: 404, code: "NOT_FOUND", message: "Peran tidak ditemukan." });
    return found;
  },
  async usage(key: string, signal?: AbortSignal): Promise<RoleUsage> {
    const role = await this.get(key, signal);
    const reason = "Perubahan peran belum tersambung ke backend.";
    return { activePeople: role.usageCount, inactivePeople: 0, canDelete: false, deleteReason: reason, canDeactivate: false, deactivateReason: reason };
  },
};
