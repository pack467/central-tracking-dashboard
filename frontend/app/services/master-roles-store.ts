/** Peran: reads, validation, writes, order, usage and safe delete. */
import { auditEntry, pageOf, peopleOf, roleRecords, rolesOf, transact } from "./master-transaction";
import { authorized, clone, error, load, sessionActor } from "./master-store";
import { tombstone, untouched } from "./master-delete-rules";
import { chosen, diff, optionalText, required } from "./master-catalog-store";
import { findPerson } from "./master-people-store";
import { norm, type StoredRole } from "@/app/lib/master-people";
import { masterId } from "@/app/lib/master-data-model";
import type { AuditEntry, MasterPage, MasterQuery, MasterSnapshotV2, Role, RoleInput, RoleUsage } from "@/app/types/master-data";

/* Roles */
function findRole(data: MasterSnapshotV2, key: string): StoredRole {
  const role = rolesOf(data).find(item => item.key === key);
  if (!role) error(404, "Peran tidak ditemukan.", "NOT_FOUND");
  return role;
}

function roleUsageOf(data: MasterSnapshotV2, role: StoredRole): RoleUsage {
  const holders = peopleOf(data).filter(person => person.roleKey === role.key);
  const activePeople = holders.filter(person => person.status === "active").length;
  const deactivateReason = role.protected
    ? "Peran ini dipakai logika aplikasi dan tidak dapat dinonaktifkan."
    : activePeople ? `Dipakai ${activePeople} personel aktif. Pindahkan mereka lebih dulu.` : undefined;
  const deleteReason = role.protected
    ? "Peran bawaan dipakai logika aplikasi dan tidak dapat dihapus."
    : holders.length
      ? `Sudah dipakai ${holders.length} personel. Gunakan Nonaktifkan.`
      : !untouched(data, "role", role.key) ? "Sudah pernah diubah. Gunakan Nonaktifkan." : undefined;
  return {
    activePeople,
    inactivePeople: holders.length - activePeople,
    canDelete: !deleteReason,
    deleteReason,
    canDeactivate: !deactivateReason,
    deactivateReason
  };
}

export function listRoles(query: MasterQuery = {}, actor = sessionActor): MasterPage<Role> {
  authorized("role", "read", actor); const data = load(), needle = norm(query.q);
  let rows = roleRecords(data).filter(role => {
    if (needle && ![role.name, role.description].some(value => norm(value).includes(needle))) return false;
    if (query.status &&
          query.status !== "all" &&
          (role.active ? "active" : "inactive") !== (query.status === "archived" ? "inactive" : query.status))
      return false;
    return true;
  });
  const sort = query.sort || "order";
  rows = [...rows].sort((a, b) => sort === "order"
    ? a.sortOrder - b.sortOrder
    : a.name.localeCompare(b.name, "id", { numeric: true, sensitivity: "base" }) * (sort === "-name" ? -1 : 1));
  return pageOf(rows, query);
}

export function getRole(key: string, actor = sessionActor): Role { authorized("role", "read", actor); const data = load(); findRole(data, key); return clone(roleRecords(data).find(role => role.key === key)!); }

function normalizeRole(input: Record<string, unknown>, data: MasterSnapshotV2, existing?: StoredRole): Pick<StoredRole, "name" | "description" | "active"> {
  const present = (key: string) => key in input;
  const name = existing && !present("name") ? existing.name : required(input.name, "name", "Nama peran", 40);
  if (rolesOf(data).some(role => role.key !== existing?.key && norm(role.name) === norm(name)))
    error(409, `Peran "${name}" sudah ada.`, "DUPLICATE_NAME", "name");
  const active = present("active") ? input.active : existing?.active ?? true;
  if (typeof active !== "boolean") error(422, "Status peran wajib dipilih.", "VALIDATION_ERROR", "active");
  return { name, description: present("description") ? optionalText(input.description, "description", 200) : existing?.description, active };
}

export function createRole(input: RoleInput, actor = sessionActor): Role {
  authorized("role", "create", actor);
  const data = load(), value = normalizeRole(input as unknown as Record<string, unknown>, data), key = masterId("role");
  const role: StoredRole = { key, ...value, sortOrder: rolesOf(data).reduce((max, item) => Math.max(max, item.sortOrder + 1), 0), protected: false };
  transact(
    actor,
    (next, at) => {
      next.roles = [...rolesOf(next), role];
      return [auditEntry("role", key, actor, at, diff({}, role as unknown as Record<string, unknown>), "create")];
    }
  );
  return getRole(key, actor);
}

export function updateRole(key: string, input: Partial<RoleInput>, actor = sessionActor): Role {
  authorized("role", "update", actor);
  const data = load(), old = findRole(data, key), value = normalizeRole(input as unknown as Record<string, unknown>, data, old);
  if (value.active !== old.active) {
    authorized("role", "archive", actor);
    if (!value.active) {
      const usage = roleUsageOf(data, old);
      if (!usage.canDeactivate)
        error(409, usage.deactivateReason || "Peran tidak dapat dinonaktifkan.", old.protected ? "ROLE_PROTECTED" : "ROLE_IN_USE", "active");
    }
  }
  const changes = diff(old as unknown as Record<string, unknown>, { ...old, ...value } as unknown as Record<string, unknown>);
  if (changes.length)
    transact(
      actor,
      (next, at) => {
        next.roles = rolesOf(next).map(role => role.key === key ? { ...role, ...value } : role);
        return [auditEntry("role", key, actor, at, changes)];
      }
    );
  return getRole(key, actor);
}

export function setRoleStatus(key: string, status: string, actor = sessionActor): Role {
  authorized("role", "archive", actor);
  return updateRole(key, { active: chosen(status, ["active", "inactive"] as const, "status") === "active" }, actor);
}

export function roleUsage(key: string, actor = sessionActor): RoleUsage { authorized("role", "read", actor); const data = load(); return roleUsageOf(data, findRole(data, key)); }

export function deleteRole(key: string, actor = sessionActor): void {
  authorized("role", "delete", actor);
  const data = load(), role = findRole(data, key), usage = roleUsageOf(data, role);
  if (!usage.canDelete) error(409, usage.deleteReason || "Peran sudah dipakai.", role.protected ? "ROLE_PROTECTED" : "IN_USE");
  transact(actor, (next, at) => {
    next.roles = rolesOf(next).filter(item => item.key !== key);
    tombstone(next, "role", key, role.name, at, actor);
    return [auditEntry("role", key, actor, at, [{ field: "name", from: role.name, to: null }], "delete")];
  });
}

/** Swaps two adjacent roles in ONE transaction (one write, one revision). */
export function reorderRole(key: string, direction: number, actor = sessionActor): Role {
  authorized("role", "update", actor);
  const data = load();
  const ordered = [...rolesOf(data)].sort((a, b) => a.sortOrder - b.sortOrder);
  const index = ordered.findIndex(role => role.key === key);
  const other = ordered[index + direction];
  if (index < 0) error(404, "Peran tidak ditemukan.", "NOT_FOUND");
  if (!other) return getRole(key, actor);
  const first = ordered[index];
  transact(
    
    
    actor,
    (next, at) => {
      next.roles = rolesOf(next).map(role => role.key === first.key ? { ...role, sortOrder: other.sortOrder } : role.key === other.key ? { ...role, sortOrder: first.sortOrder } : role);
      return [
        auditEntry("role", first.key, actor, at, [{ field: "sortOrder", from: first.sortOrder, to: other.sortOrder }]),
        auditEntry("role", other.key, actor, at, [{ field: "sortOrder", from: other.sortOrder, to: first.sortOrder }])
      ];
    }
  );
  return getRole(key, actor);
}

export function listTeamAudit(entity: "person" | "role", id: string, page = 1, actor = sessionActor): MasterPage<AuditEntry> {
  authorized(entity, "read", actor); const data = load();
  if (entity === "person") findPerson(data, id); else findRole(data, id);
  const entries = data.audit.filter(entry => entry.entityType === entity && entry.entityId === id);
  const totalPages = Math.max(1, Math.ceil(entries.length / 10));
  const current = Math.min(totalPages, Math.max(1, Math.floor(page)));
  return { data: clone(entries.slice((current - 1) * 10, current * 10)), meta: { page: current, pageSize: 10, total: entries.length, totalPages } };
}
