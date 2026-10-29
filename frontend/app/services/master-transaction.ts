/** Helpers shared by every writer: collection accessors, paging, one atomic write with its audit entry. */
import { clone, error, load, persist } from "./master-store";
import { type StoredRole } from "@/app/lib/master-people";
import { isMasterV2, masterId, masterNow } from "@/app/lib/master-data-model";
import type {
  AnyMasterEntity,
  AuditEntry,
  MasterActor,
  MasterPage,
  MasterQuery,
  MasterSnapshotV2,
  Person,
  Role
} from "@/app/types/master-data";

/* ---------------------------------------------------------------------------------------------
 * Stage 1 and 2: people, roles, safe delete. Every rule below is enforced here, never only in the UI.
 * ------------------------------------------------------------------------------------------- */
export const peopleOf = (data: MasterSnapshotV2): Person[] => data.people || [];

export const rolesOf = (data: MasterSnapshotV2): StoredRole[] => data.roles || [];

export function roleRecords(data: MasterSnapshotV2): Role[] {
  const people = peopleOf(data);
  return rolesOf(data).map(role => ({ ...role, usageCount: people.filter(person => person.roleKey === role.key && person.status === "active").length }));
}

export function pageOf<T>(rows: T[], query: MasterQuery): MasterPage<T> {
  const pageSize = [10, 25, 50].includes(query.pageSize || 0) ? query.pageSize! : 10;
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(totalPages, Math.max(1, Math.floor(query.page || 1)));
  return { data: clone(rows.slice((page - 1) * pageSize, page * pageSize)), meta: { page, pageSize, total, totalPages } };
}

/** One atomic write: every collection change, audit entry and the revision bump are persisted together. */
export function transact(actor: MasterActor, apply: (next: MasterSnapshotV2, at: string) => AuditEntry[]): void {
  const next = clone(load()), at = masterNow(), entries = apply(next, at);
  next.audit.unshift(...entries);
  next.revision++; next.lastSavedAt = at;
  if (!isMasterV2(next)) error(422, "Perubahan menghasilkan relasi yang tidak valid.", "INVALID_RELATION");
  persist(next);
}

export function auditEntry(entityType: AnyMasterEntity, entityId: string, actor: MasterActor, at: string, changes: AuditEntry["changes"], kind?: AuditEntry["kind"]): AuditEntry {
  return { id: masterId("audit"), entityType, entityId, at, byUserId: actor.id, byName: actor.name, changes, ...(kind ? { kind } : {}) };
}
