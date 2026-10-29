/** Organisasi, Proyek, Sistem, Kategori and Severity: reads, validation, writes, safe delete and category order. */
import {
  allAssessments,
  allTickets,
  authorized,
  clone,
  directory,
  error,
  identity,
  load,
  masterSourceRecords,
  persist,
  persistedKey,
  sessionActor,
  snapshot
} from "./master-store";
import { catalogDeleteCheck, tombstone } from "./master-delete-rules";
import { auditEntry, transact } from "./master-transaction";
import { MASTER_DATA_P0_ENABLED } from "@/app/lib/master-data-flags";
import { CATEGORY_PALETTE, nextFreeColor } from "@/app/lib/category-colors";
import { SEVERITY_COLORS, categoryKey, isMasterV2, isSafeLogo, isSafeReferenceUrl, masterCode, masterId, masterNow } from "@/app/lib/master-data-model";
import { buildReview, computeImpact } from "@/app/lib/master-review";
import type {
  AuditEntry,
  MasterActor,
  MasterEntity,
  MasterImpact,
  MasterInputMap,
  MasterPage,
  MasterQuery,
  MasterRecordMap,
  Organization,
  Project,
  System
} from "@/app/types/master-data";

function records<E extends MasterEntity>(entity: E, data = load()): MasterRecordMap[E][] {
  const tickets = entity === "category" || entity === "severity" ? allTickets() : [];
  if (entity === "category")
    return data.categories.map(category => ({ ...category, usageCount: tickets.filter(t => (t.type || t.category) === category.key).length })) as MasterRecordMap[E][];
  if (entity === "severity")
    return data.severities.map(severity => ({ ...severity, color: SEVERITY_COLORS[severity.code], usageCount: tickets.filter(t => t.severity.toLowerCase() === severity.code).length })) as MasterRecordMap[E][];
  return data[persistedKey[entity]] as MasterRecordMap[E][];
}

export function get<E extends MasterEntity>(entity: E, id: string, actor = sessionActor): MasterRecordMap[E] {
  authorized(entity, "read", actor);
  const found = records(entity).find(row => identity(entity, row) === id);
  if (!found) error(404, "Data tidak ditemukan.", "NOT_FOUND");
  return clone(found);
}

export function list<E extends MasterEntity>(entity: E, query: MasterQuery = {}, actor = sessionActor): MasterPage<MasterRecordMap[E]> {
  authorized(entity, "read", actor); const data = load();
  const needle = query.q?.trim().toLocaleLowerCase() || "";
  let rows = records(entity, data).filter(item => {
    const value = item as unknown as Record<string, unknown>;
    // A logo is base64 text: searching inside it would match almost any short query.
    if (needle && !JSON.stringify(value, (key, field) => key === "logoUrl" ? undefined : field).toLocaleLowerCase().includes(needle)) return false;
    if (query.status && query.status !== "all") {
      const status = entity === "category" ? value.active ? "active" : "inactive" : value.status;
      if (entity !== "severity" && status !== query.status && !(entity === "category" && query.status === "archived" && status === "inactive"))
        return false;
    }
    if (entity === "organization" && query.kind && query.kind !== "all" && value.kind !== query.kind) return false;
    const organizationId = entity === "project"
      ? value.organizationId
      : entity === "system" ? data.projects.find(p => p.id === value.projectId)?.organizationId : value.id;
    if (query.organizationId && query.organizationId !== "all" && organizationId !== query.organizationId) return false;
    if (query.projectId && query.projectId !== "all" && (entity === "system" ? value.projectId : value.id) !== query.projectId) return false;
    return true;
  });
  if (query.review && MASTER_DATA_P0_ENABLED) {
    const review = buildReview(data, masterSourceRecords(data), directory(data).map(user => user.id));
    const ids = new Set(review.findings.filter(finding => finding.entityType === entity).map(finding => finding.entityId));
    rows = rows.filter(item => ids.has(identity(entity, item)));
  }
  const sort = query.sort || (entity === "category" || entity === "severity" ? "order" : "name");
  // Categories and severities carry no timestamp of their own: their last change comes from the audit trail.
  const lastChange = new Map<string, string>();
  if (sort.includes("updated") && (entity === "category" || entity === "severity"))
    for (const entry of data.audit) if (entry.entityType === entity && !lastChange.has(entry.entityId)) lastChange.set(entry.entityId, entry.at);
  rows = [...rows].sort((a, b) => {
    const aa = a as unknown as Record<string, unknown>, bb = b as unknown as Record<string, unknown>;
    if (sort === "order") return Number(aa.sortOrder ?? aa.level ?? 0) - Number(bb.sortOrder ?? bb.level ?? 0);
    if (sort === "-usage") return Number(bb.usageCount ?? 0) - Number(aa.usageCount ?? 0) || String(aa.name || "").localeCompare(String(bb.name || ""), "id", { sensitivity: "base" });
    if (sort.includes("updated")) {
      const value = (row: Record<string, unknown>) => String(row.updatedAt || lastChange.get(String(entity === "severity" ? row.code : row.id)) || "");
      return value(aa).localeCompare(value(bb)) * (sort.startsWith("-") ? -1 : 1);
    }
    const field = entity === "severity" ? "displayName" : "name";
    return String(aa[field] || "").localeCompare(String(bb[field] || ""), "id", { numeric: true, sensitivity: "base" }) * (sort.startsWith("-") ? -1 : 1);
  });
  const pageSize = [10, 25, 50].includes(query.pageSize || 0) ? query.pageSize! : 10;
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(totalPages, Math.max(1, Math.floor(query.page || 1)));
  return { data: clone(rows.slice((page - 1) * pageSize, page * pageSize)), meta: { page, pageSize, total, totalPages } };
}

export function impact(entity: MasterEntity, id: string, actor = sessionActor): MasterImpact {
  get(entity, id, actor); const data = load();
  const result = computeImpact(data, masterSourceRecords(data), allAssessments(), entity, id);
  const check = catalogDeleteCheck(entity, id, data, result);
  return { ...result, canDelete: check.canDelete, deleteReason: check.reason };
}

export const text = (value: unknown) => typeof value === "string" ? value.trim() : "";

export function required(value: unknown, field: string, label: string, limit = 255): string {
  const clean = text(value); if (!clean) error(422, `${label} wajib diisi.`, "VALIDATION_ERROR", field);
  if (clean.length > limit) error(422, `${label} maksimal ${limit} karakter.`, "VALIDATION_ERROR", field);
  return clean;
}

export function optionalText(value: unknown, field: string, limit = 2000): string | undefined {
  const clean = text(value); if (clean.length > limit) error(422, `Maksimal ${limit} karakter.`, "VALIDATION_ERROR", field); return clean || undefined;
}

function code(value: unknown): string { return required(value, "code", "Kode", 32).toUpperCase(); }

/** An empty value removes the logo; anything else must be a small PNG/JPEG/WebP image or an https URL. */
function logo(value: unknown): string | undefined {
  const clean = text(value); if (!clean) return undefined;
  if (!isSafeLogo(clean)) error(422, "Logo harus gambar PNG, JPG, atau WebP berukuran kecil.", "INVALID_LOGO", "logoUrl");
  return clean;
}

export function chosen<T extends string>(value: unknown, values: readonly T[], field: string): T {
  if (!values.includes(value as T)) error(422, "Pilihan tidak valid.", "VALIDATION_ERROR", field); return value as T;
}

/** A PIC must be a known person; only active people can be newly assigned, an already assigned one may stay. */
function userId(value: unknown, field: string, previous?: unknown): string | undefined {
  const id = text(value); if (!id) return undefined;
  if (!directory().some(user => user.id === id)) error(422, "Pengguna tidak terdaftar.", "INVALID_USER", field);
  const person = snapshot.people?.find(item => item.id === id);
  if (person && person.status !== "active" && id !== previous)
    error(422, "Personel tidak aktif. Pilih personel aktif.", "INACTIVE_USER", field);
  return id;
}

function duplicates(entity: MasterEntity, id: string, field: string, value: string, scope?: string): void {
  const found = records(entity).some(record => {
    const row = record as unknown as Record<string, unknown>;
    return identity(entity, record) !== id &&
      text(row[field]).toLowerCase() === value.toLowerCase() &&
      (!scope || (entity === "project" ? row.organizationId : row.projectId) === scope);
  });
  if (found) error(409, field === "code" ? `Kode "${value}" sudah digunakan.` : "Nama kategori sudah digunakan.", "DUPLICATE_CODE", field);
}

function normalize(entity: MasterEntity, input: Record<string, unknown>, existing?: MasterRecordMap[MasterEntity]): Record<string, unknown> {
  const old = existing as unknown as Record<string, unknown> | undefined;
  const value = { ...old, ...input };
  const id = existing ? identity(entity, existing) : "";
  if (entity === "severity")
    return {
      ...old,
      displayName: required(value.displayName, "displayName", "Nama tampil", 24),
      description: optionalText(value.description, "description")
    };
  if (entity === "category") {
    const name = required(value.name, "name", "Nama kategori", 40);
    duplicates(entity, id, "name", name);
    if (typeof value.active !== "boolean") error(422, "Status kategori wajib dipilih.", "VALIDATION_ERROR", "active");
    // The form has no order field: an existing category keeps its place, a new one goes last. "Atur urutan" is the only way to move it.
    const sortOrder = value.sortOrder === undefined || value.sortOrder === null
      ? Math.max(-1, ...load().categories.map(item => item.sortOrder)) + 1
      : value.sortOrder;
    if (!Number.isInteger(sortOrder) || Number(sortOrder) < 0)
      error(422, "Urutan harus bilangan bulat mulai 0.", "VALIDATION_ERROR", "sortOrder");
    const color = text(value.color) ? chosen(text(value.color), CATEGORY_PALETTE.map(entry => entry.key), "color") : (old?.color as string | undefined) ?? nextFreeColor(load().categories);
    return { ...old, name, description: optionalText(value.description, "description"), color, active: value.active, sortOrder };
  }
  const name = required(value.name, "name", "Nama");
  const normalizedCode = code(entity === "system" && !text(value.code) ? masterCode(name) : value.code);
  if (entity === "organization") {
    duplicates(entity, id, "code", normalizedCode);
    const picUserId = userId(value.picUserId, "picUserId", old?.picUserId);
    let picContact: Organization["picContact"];
    if (value.picContact) {
      if (typeof value.picContact !== "object") error(422, "Kontak tidak valid.", "VALIDATION_ERROR", "picContact");
      const raw = value.picContact as Record<string, unknown>;
      picContact = {
        name: required(raw.name, "picContact.name", "Nama kontak"),
        email: optionalText(raw.email, "picContact.email", 255),
        phone: optionalText(raw.phone, "picContact.phone", 50)
      };
      if (picContact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(picContact.email))
        error(422, "Format email tidak valid.", "INVALID_EMAIL", "picContact.email");
    }
    if (picUserId && picContact) error(422, "Pilih PIC internal atau kontak eksternal.", "VALIDATION_ERROR", "picUserId");
    return {
      ...old,
      kind: chosen(value.kind, ["tenant", "client"], "kind"),
      code: normalizedCode,
      name,
      shortName: optionalText(value.shortName, "shortName", 100),
      description: optionalText(value.description, "description"),
      logoUrl: logo(value.logoUrl),
      picUserId,
      picContact,
      status: chosen(value.status, ["active", "inactive", "archived"], "status")
    };
  }
  if (entity === "project") {
    const organizationId = required(value.organizationId, "organizationId", "Organisasi");
    const parent = load().organizations.find(o => o.id === organizationId);
    if (!parent || (!old || old.organizationId !== organizationId) && parent.status !== "active")
      error(422, "Pilih organisasi aktif.", "INVALID_PARENT", "organizationId");
    if (old && old.organizationId !== organizationId) {
      const usage = impact("project", id);
      if (usage.systems || usage.tickets || usage.checkpoints)
        error(422, "Organisasi dikunci karena proyek sudah dipakai.", "PARENT_LOCKED", "organizationId");
    }
    duplicates(entity, id, "code", normalizedCode, organizationId);
    const relatedClientIds = Array.isArray(value.relatedClientIds) ? [...new Set(value.relatedClientIds.map(text).filter(Boolean))] : [];
    if (relatedClientIds.includes(organizationId)) error(422, "Klien terkait harus organisasi lain.", "INVALID_PARENT", "relatedClientIds");
    if (relatedClientIds.some(clientId => !load().organizations.some(o => o.id === clientId && o.kind === "client" && (o.status === "active" || (old?.relatedClientIds as string[] | undefined)?.includes(clientId)))))
      error(422, "Klien terkait tidak valid.", "INVALID_PARENT", "relatedClientIds");
    return {
      ...old,
      organizationId,
      relatedClientIds,
      name,
      code: normalizedCode,
      shortName: optionalText(value.shortName, "shortName", 100),
      scope: optionalText(value.scope, "scope"),
      logoUrl: logo(value.logoUrl),
      leadUserId: userId(value.leadUserId, "leadUserId", old?.leadUserId),
      status: chosen(value.status, ["active", "archived"], "status")
    };
  }
  const projectId = required(value.projectId, "projectId", "Proyek"), parent = load().projects.find(p => p.id === projectId);
  if (!parent ||
        (!old || old.projectId !== projectId) &&
          (parent.status !== "active" || !load().organizations.some(o => o.id === parent.organizationId && o.status === "active")))
    error(422, "Pilih proyek dengan organisasi aktif.", "INVALID_PARENT", "projectId");
  duplicates(entity, id, "code", normalizedCode, projectId);
  const referenceUrl = optionalText(value.referenceUrl, "referenceUrl", 2000);
  if (referenceUrl && !isSafeReferenceUrl(referenceUrl))
    error(422, "Gunakan URL http/https atau tautan aplikasi.", "INVALID_URL", "referenceUrl");
  return {
    ...old,
    projectId,
    name,
    code: normalizedCode,
    picUserId: userId(value.picUserId, "picUserId", old?.picUserId),
    description: optionalText(value.description, "description"),
    referenceUrl,
    logoUrl: logo(value.logoUrl),
    status: chosen(value.status, ["active", "inactive", "archived"], "status")
  };
}

/** The audit records that a logo changed, not the image itself, so history stays small and readable. */
const auditValue = (field: string, value: unknown, label: string) => field === "logoUrl" && value ? label : value ?? null;
export function diff(before: Record<string, unknown>, after: Record<string, unknown>): AuditEntry["changes"] {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter(field => !["id", "code_name", "createdAt", "updatedAt", "legacy", "usageCount"].includes(field))
    .filter(field => JSON.stringify(before[field]) !== JSON.stringify(after[field]))
    .map(field => ({ field, from: auditValue(field, before[field], "Logo lama"), to: auditValue(field, after[field], "Logo baru") }));
}

function commit<E extends MasterEntity>(entity: E, id: string, value: Record<string, unknown>, before: Record<string, unknown>, actor: MasterActor, requestKey?: string, fingerprint?: string): MasterRecordMap[E] {
  const data = load(), changes = diff(before, value);
  if (!changes.length) return get(entity, id, actor);
  const next = clone(data), collection = next[persistedKey[entity]] as unknown as Record<string, unknown>[];
  const index = collection.findIndex(row => (entity === "severity" ? row.code : row.id) === id);
  const at = masterNow(), final = { ...value };
  delete final.usageCount;
  // a severity's colour is derived and locked; a category's colour is data
  if (entity === "severity") delete final.color;
  if (["organization", "project", "system"].includes(entity)) final.updatedAt = at;
  if (index < 0) collection.unshift(final); else collection[index] = final;
  next.audit.unshift({ id: masterId("audit"), entityType: entity, entityId: id, at, byUserId: actor.id, byName: actor.name, changes });
  if (requestKey && fingerprint)
    next.idempotency = [{ key: requestKey, fingerprint, entity, entityId: id }, ...next.idempotency].slice(0, 200);
  next.revision++; next.lastSavedAt = at;
  if (!isMasterV2(next)) error(422, "Perubahan menghasilkan relasi yang tidak valid.", "INVALID_RELATION");
  persist(next); return get(entity, id, actor);
}

export function create<E extends MasterEntity>(entity: E, input: MasterInputMap[E], actor = sessionActor, requestKey?: string): MasterRecordMap[E] {
  authorized(entity, "create", actor); load();
  const fingerprint = JSON.stringify({ entity, actor: actor.id, input });
  const previous = requestKey ? snapshot.idempotency.find(i => i.key === requestKey) : undefined;
  if (previous) {
    if (previous.fingerprint !== fingerprint) error(409, "Permintaan simpan sudah digunakan.", "IDEMPOTENCY_CONFLICT");
    return get(entity, previous.entityId, actor);
  }
  const value = normalize(entity, input as unknown as Record<string, unknown>), id = masterId(entity), at = masterNow();
  value.id = id;
  if (entity === "category") value.key = categoryKey(String(value.name), load().categories.map(category => category.key));
  if (entity === "project") value.legacyKey = value.name;
  if (["organization", "project", "system"].includes(entity)) { value.createdAt = at; value.updatedAt = at; }
  return commit(entity, id, value, {}, actor, requestKey, fingerprint);
}

export function update<E extends MasterEntity>(entity: E, id: string, input: Partial<MasterInputMap[E]>, actor = sessionActor, requestKey?: string): MasterRecordMap[E] {
  authorized(entity, "update", actor);
  const fingerprint = JSON.stringify({ entity, id, input, actor: actor.id });
  const previous = requestKey ? load().idempotency.find(i => i.key === requestKey) : undefined;
  if (previous) {
    if (previous.fingerprint !== fingerprint) error(409, "Permintaan simpan sudah digunakan.", "IDEMPOTENCY_CONFLICT");
    return get(entity, id, actor);
  }
  const old = get(entity, id, actor), value = normalize(entity, input as Record<string, unknown>, old);
  if (entity === "organization" && value.status !== (old as Organization).status) assertStatus(entity, id, String(value.status), actor);
  if ((entity === "project" || entity === "system") && value.status !== (old as Project | System).status)
    assertStatus(entity, id, String(value.status), actor);
  return commit(
    entity,
    id,
    value,
    old as unknown as Record<string, unknown>,
    actor,
    requestKey,
    JSON.stringify({ entity, id, input, actor: actor.id })
  );
}

function assertStatus(entity: MasterEntity, id: string, status: string, actor: MasterActor): void {
  authorized(entity, "archive", actor); const current = get(entity, id, actor);
  if (entity === "severity") error(403, "Severity tidak dapat diarsipkan.", "FORBIDDEN");
  if (entity === "organization" &&
        (current as Organization).status === "active" &&
        status !== "active" &&
        load().organizations.filter(o => o.status === "active").length <= 1)
    error(422, "Organisasi aktif terakhir tidak dapat dinonaktifkan atau diarsipkan.", "LAST_ACTIVE_CLIENT", "status");
  if (status === "active" && !impact(entity, id, actor).parentActive)
    error(422, "Aktifkan organisasi atau proyek induk terlebih dahulu.", "PARENT_INACTIVE", "status");
}

export function setStatus<E extends MasterEntity>(entity: E, id: string, status: string, actor = sessionActor): MasterRecordMap[E] {
  assertStatus(entity, id, status, actor);
  const payload = entity === "category" ? { active: status === "active" } : { status };
  return update(entity, id, payload as unknown as Partial<MasterInputMap[E]>, actor);
}

export function listAudit(entity: MasterEntity, id: string, page = 1, actor = sessionActor): MasterPage<AuditEntry> {
  get(entity, id, actor); const entries = load().audit.filter(a => a.entityType === entity && a.entityId === id);
  const totalPages = Math.max(1, Math.ceil(entries.length / 10));
  const currentPage = Math.min(totalPages, Math.max(1, Math.floor(page)));
  return {
    data: clone(entries.slice((currentPage - 1) * 10, currentPage * 10)),
    meta: { page: currentPage, pageSize: 10, total: entries.length, totalPages }
  };
}

export function reorderCategory(id: string, direction: number, actor = sessionActor): MasterRecordMap["category"] {
  authorized("category", "update", actor);
  const data = load();
  const ordered = [...data.categories].sort((a, b) => a.sortOrder - b.sortOrder);
  const index = ordered.findIndex(category => category.id === id);
  const other = ordered[index + direction];
  if (!other) return get("category", id, actor);
  const next = clone(data);
  const at = masterNow();
  const first = next.categories.find(category => category.id === id)!;
  const second = next.categories.find(category => category.id === other.id)!;
  const firstOrder = first.sortOrder, secondOrder = second.sortOrder;
  first.sortOrder = secondOrder; second.sortOrder = firstOrder;
  for (const category of [first, second]) next.audit.unshift({ id: masterId("audit"), entityType: "category", entityId: category.id, at, byUserId: actor.id, byName: actor.name, changes: [{ field: "sortOrder", from: category.id === first.id ? firstOrder : secondOrder, to: category.sortOrder }] });
  next.revision++; next.lastSavedAt = at;
  persist(next);
  return get("category", id, actor);
}

/**
 * Puts the active categories in a new order in ONE write: the active ones fill, in the given order, the places the active ones had;
 * inactive categories keep their place. Cancelling the sheet never reaches this function.
 */
export function reorderCategories(ids: readonly string[], actor = sessionActor): void {
  authorized("category", "update", actor);
  const data = load();
  const ordered = [...data.categories].sort((a, b) => a.sortOrder - b.sortOrder);
  const active = ordered.filter(category => category.active);
  if (ids.length !== active.length || new Set(ids).size !== ids.length || !ids.every(id => active.some(category => category.id === id)))
    error(422, "Urutan tidak valid.", "VALIDATION_ERROR", "ids");
  const queue = [...ids];
  const arranged = ordered.map(category => {
    if (!category.active) return category;
    const id = queue.shift();
    return data.categories.find(item => item.id === id)!;
  });
  const next = clone(data), at = masterNow();
  arranged.forEach((category, index) => {
    const target = next.categories.find(item => item.id === category.id)!;
    if (target.sortOrder === index) return;
    next.audit.unshift({ id: masterId("audit"), entityType: "category", entityId: target.id, at, byUserId: actor.id, byName: actor.name, changes: [{ field: "sortOrder", from: target.sortOrder, to: index }] });
    target.sortOrder = index;
  });
  if (next.audit.length === data.audit.length) return;
  next.revision++; next.lastSavedAt = at;
  persist(next);
}

/** Hard delete for organizations, projects, systems and categories: only records that were never used. */
export function remove(entity: MasterEntity, id: string, actor = sessionActor): void {
  authorized(entity, "delete", actor);
  const row = get(entity, id, actor);
  const data = load();
  const check = catalogDeleteCheck(entity, id, data, computeImpact(data, masterSourceRecords(data), allAssessments(), entity, id));
  if (!check.canDelete) error(409, check.reason || "Data sudah dipakai.", "IN_USE");
  const name = (row as { name?: string }).name || id;
  transact(actor, (next, at) => {
    const collection = next[persistedKey[entity]] as unknown as Record<string, unknown>[];
    (next as unknown as Record<string, unknown>)[persistedKey[entity]] = collection.filter(item => item.id !== id);
    tombstone(next, entity, id, name, at, actor);
    return [auditEntry(entity, id, actor, at, [{ field: "name", from: name, to: null }], "delete")];
  });
}
