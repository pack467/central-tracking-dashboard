import { ApiError } from "@/app/lib/api/errors";
import { buildLegacyReferences, type SourceRecord } from "@/app/lib/master-review";
import { isMasterV2, isSafeLogo, MASTER_SEVERITIES } from "@/app/lib/master-data-model";
import { isCategoryColor, withBaselineColors, type CategoryColorKey } from "@/app/lib/category-colors";
import type {
  AuditEntry,
  LegacyReference,
  MappingDecision,
  MasterSnapshotV2,
  Organization,
  Project,
  Severity,
  System,
  TicketCategory
} from "@/app/types/master-data";

export const BACKUP_SCHEMA_VERSION = 3;
export const BACKUP_APP_NAME = "Central Tracking Dashboard";
export const BACKUP_MAX_BYTES = 5 * 1024 * 1024;
const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

interface BackupAlias { projectId: string; keys: string[] }
export interface MasterBackupFile {
  schemaVersion: number;
  appName: string;
  exportedAt: string;
  data: {
    version: 2;
    schemaRevision: 3;
    organizations: Organization[];
    projects: Project[];
    systems: System[];
    categories: Omit<TicketCategory, "usageCount">[];
    severities: Omit<Severity, "usageCount" | "color">[];
    mappingDecisions: MappingDecision[];
    aliases: BackupAlias[];
    legacyReferences: LegacyReference[];
    audit: AuditEntry[];
    lastSavedAt: string;
    revision: number;
  };
}
export interface RestoreChange { collection: string; label: string; id: string; kind: "added" | "updated" | "removed" | "conflict" }
export interface RestorePreview {
  counts: { organizations: number; projects: number; systems: number; categories: number; severities: number; mappingDecisions: number; audit: number };
  organizations: { id: string; name: string }[];
  added: number;
  updated: number;
  removed: number;
  conflicts: RestoreChange[];
  changes: RestoreChange[];
  warnings: string[];
  backupVersion: "v2" | "v3";
  fileName?: string;
}
export interface ValidatedBackup { snapshot: MasterSnapshotV2; preview: RestorePreview }

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const string = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const array = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const text = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const iso = (value: unknown, fallback: string) => string(value) && Number.isFinite(Date.parse(value)) ? value : fallback;
const pick = (source: Record<string, unknown>, keys: readonly string[]) => Object.fromEntries(keys.filter(key => source[key] !== undefined).map(key => [key, source[key]]));

function safeKeys(value: unknown, path = "data"): void {
  if (Array.isArray(value)) { value.forEach((item, index) => safeKeys(item, `${path}[${index}]`)); return; }
  if (!record(value)) return;
  for (const key of Object.keys(value)) {
    if (DANGEROUS_KEYS.has(key)) throw new ApiError({ status: 422, message: `Kunci tidak diizinkan: ${key}.`, code: "UNSAFE_KEY", details: { path: `${path}.${key}` } });
    safeKeys(value[key], `${path}.${key}`);
  }
}

export function buildBackup(snapshot: MasterSnapshotV2, references: readonly LegacyReference[], exportedAt: string): MasterBackupFile {
  const aliases = snapshot.projects.map(project => ({ projectId: project.id, keys: [project.legacyKey, project.legacy?.name, project.legacy?.code].filter((key): key is string => !!key) }));
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    appName: BACKUP_APP_NAME,
    exportedAt,
    data: {
      version: 2,
      schemaRevision: 3,
      organizations: snapshot.organizations.map(item => ({ ...item })),
      projects: snapshot.projects.map(item => ({ ...item })),
      systems: snapshot.systems.map(item => ({ ...item })),
      categories: snapshot.categories.map(({ id, key, name, description, color, active, sortOrder }) => ({ id, key, name, description, color, active, sortOrder })),
      severities: snapshot.severities.map(({ code, displayName, description, level }) => ({ code, displayName, description, level })),
      mappingDecisions: (snapshot.mappingDecisions || []).map(item => ({ ...item, systemMappings: item.systemMappings?.map(mapping => ({ ...mapping })) })),
      aliases,
      legacyReferences: references.map(item => ({ ...item, examples: item.examples.map(example => ({ ...example })), candidates: [...item.candidates] })),
      audit: snapshot.audit.map(item => ({ ...item, changes: item.changes.map(change => ({ ...change })) })),
      lastSavedAt: snapshot.lastSavedAt,
      revision: snapshot.revision
    }
  };
}

function normalizeLegacy(value: unknown, collection: "organization" | "project" | "system"): Record<string, unknown> | undefined {
  if (!record(value)) return undefined;
  const keys = collection === "organization"
    ? [
      "id",
      "name",
      "shortName",
      "code",
      "tagline",
      "avatarBg",
      "avatarColor",
      "borderColor",
      "tier",
      "picName",
      "picEmail",
      "picPhone",
      "description",
      "logoUrl",
      "status",
      "createdAt",
      "updatedAt"
    ]
    : collection === "project"
      ? ["id", "clientId", "name", "displayName", "fullName", "code", "detail", "leadEngineer", "healthDefault", "status", "createdAt", "updatedAt"]
      : ["id", "clientId", "projectId", "name", "criticality", "environment", "status", "createdAt", "updatedAt"];
  const picked = pick(value, keys);
  return Object.keys(picked).length ? picked : undefined;
}
function normalizeOrganization(value: unknown): Organization {
  const source = record(value) ? value : {};
  const contact = record(source.picContact) ? pick(source.picContact, ["name", "email", "phone"]) : undefined;
  const legacy = normalizeLegacy(source.legacy, "organization");
  return {
    id: text(source.id),
    kind: text(source.kind) as Organization["kind"],
    code: text(source.code),
    name: text(source.name),
    ...(text(source.shortName) ? { shortName: text(source.shortName) } : {}),
    ...(text(source.description) ? { description: text(source.description) } : {}),
    ...(text(source.picUserId) ? { picUserId: text(source.picUserId) } : {}),
    ...(isSafeLogo(text(source.logoUrl)) ? { logoUrl: text(source.logoUrl) } : {}),
    ...(contact && string(contact.name) ? { picContact: contact as unknown as Organization["picContact"] } : {}),
    status: text(source.status) as Organization["status"],
    createdAt: text(source.createdAt),
    updatedAt: text(source.updatedAt),
    ...(legacy ? { legacy: legacy as Organization["legacy"] } : {})
  };
}
function normalizeProject(value: unknown): Project {
  const source = record(value) ? value : {};
  const related = array(source.relatedClientIds).filter(string);
  const legacy = normalizeLegacy(source.legacy, "project");
  return {
    id: text(source.id),
    organizationId: text(source.organizationId),
    ...(Array.isArray(source.relatedClientIds) ? { relatedClientIds: related } : {}),
    code: text(source.code),
    name: text(source.name),
    ...(text(source.shortName) ? { shortName: text(source.shortName) } : {}),
    ...(text(source.scope) ? { scope: text(source.scope) } : {}),
    ...(isSafeLogo(text(source.logoUrl)) ? { logoUrl: text(source.logoUrl) } : {}),
    ...(text(source.leadUserId) ? { leadUserId: text(source.leadUserId) } : {}),
    status: text(source.status) as Project["status"],
    createdAt: text(source.createdAt),
    updatedAt: text(source.updatedAt),
    legacyKey: text(source.legacyKey) || text(source.name),
    ...(legacy ? { legacy: legacy as unknown as Project["legacy"] } : {})
  };
}
function normalizeSystem(value: unknown): System {
  const source = record(value) ? value : {}, legacy = normalizeLegacy(source.legacy, "system");
  return {
    id: text(source.id),
    projectId: text(source.projectId),
    name: text(source.name),
    code: text(source.code),
    ...(["Production", "Staging", "DRC"].includes(text(source.environment)) ? { environment: text(source.environment) as System["environment"] } : {}),
    ...(["critical", "high", "medium", "low"].includes(text(source.criticality)) ? { criticality: text(source.criticality) as System["criticality"] } : {}),
    ...(text(source.picUserId) ? { picUserId: text(source.picUserId) } : {}),
    ...(text(source.description) ? { description: text(source.description) } : {}),
    ...(text(source.referenceUrl) ? { referenceUrl: text(source.referenceUrl) } : {}),
    ...(isSafeLogo(text(source.logoUrl)) ? { logoUrl: text(source.logoUrl) } : {}),
    status: text(source.status) as System["status"],
    createdAt: text(source.createdAt),
    updatedAt: text(source.updatedAt),
    ...(legacy ? { legacy: legacy as unknown as System["legacy"] } : {}),
    ...(text(source.legacyCondition) === "maintenance" ? { legacyCondition: "maintenance" as const } : {})
  };
}
function normalizeCategory(value: unknown): Omit<TicketCategory, "usageCount"> {
  const source = record(value) ? value : {};
  return {
    id: text(source.id),
    key: text(source.key),
    name: text(source.name),
    ...(text(source.description) ? { description: text(source.description) } : {}),
    ...(isCategoryColor(text(source.color)) ? { color: text(source.color) as CategoryColorKey } : {}),
    active: source.active === true,
    sortOrder: Number.isInteger(source.sortOrder) ? Number(source.sortOrder) : 0
  };
}
function normalizeSeverity(value: unknown): Omit<Severity, "usageCount" | "color"> {
  const source = record(value) ? value : {};
  const code = text(source.code) as Severity["code"];
  const seed = MASTER_SEVERITIES.find(item => item.code === code);
  return {
    code,
    displayName: text(source.displayName) || seed?.displayName || "",
    ...(text(source.description) ? { description: text(source.description) } : {}),
    level: (Number.isInteger(source.level) ? Number(source.level) : seed?.level || 4) as Severity["level"]
  };
}
function normalizeDecision(value: unknown, now: string): MappingDecision {
  const source = record(value) ? value : {};
  const mappings = array(source.systemMappings).filter(record).map(mapping => ({ recordRef: text(mapping.recordRef), systemId: text(mapping.systemId), note: text(mapping.note) }));
  return {
    referenceId: text(source.referenceId),
    action: text(source.action) as MappingDecision["action"],
    ...(text(source.projectId) ? { projectId: text(source.projectId) } : {}),
    ...(mappings.length ? { systemMappings: mappings } : {}),
    ...(text(source.note) ? { note: text(source.note) } : {}),
    decidedByUserId: text(source.decidedByUserId) || "unknown",
    decidedAt: iso(source.decidedAt, now),
    version: Number.isInteger(source.version) && Number(source.version) > 0 ? Number(source.version) : 1
  };
}
function normalizeAudit(value: unknown, now: string): AuditEntry {
  const source = record(value) ? value : {};
  return {
    id: text(source.id),
    entityType: text(source.entityType) as AuditEntry["entityType"],
    entityId: text(source.entityId),
    at: iso(source.at, now),
    byUserId: text(source.byUserId) || "unknown",
    byName: text(source.byName) || "Tidak diketahui",
    changes: array(source.changes).filter(record).map(change => ({ field: text(change.field), from: change.from ?? null, to: change.to ?? null }))
  };
}

function normalizeSnapshot(raw: unknown, now: string): { snapshot: MasterSnapshotV2; version: "v2" | "v3" } {
  if (!record(raw)) throw new ApiError({ status: 422, message: "Isi cadangan tidak valid.", code: "INVALID_BACKUP" });
  const wrapperVersion = raw.schemaVersion, data = record(raw.data) ? raw.data : raw, versionField = data.version ?? raw.version;
  if (wrapperVersion !== undefined && wrapperVersion !== 2 && wrapperVersion !== 3)
    throw new ApiError({ status: 422, message: "Versi skema cadangan tidak dikenal.", code: "UNKNOWN_SCHEMA_VERSION" });
  if (versionField !== 2) throw new ApiError({ status: 422, message: "Versi data cadangan tidak dikenal.", code: "UNKNOWN_SCHEMA_VERSION" });
  const organizations = array(data.organizations).map(normalizeOrganization);
  const projects = array(data.projects).map(normalizeProject);
  const systems = array(data.systems).map(normalizeSystem);
  const categories = withBaselineColors(array(data.categories).map(normalizeCategory));
  const severities = array(data.severities).map(normalizeSeverity);
  const mappingDecisions = array(data.mappingDecisions).map(value => normalizeDecision(value, now));
  const audit = array(data.audit).map(value => normalizeAudit(value, now));
  const snapshot: MasterSnapshotV2 = {
    version: 2,
    schemaRevision: 3,
    organizations,
    projects,
    systems,
    categories,
    severities,
    audit,
    idempotency: [],
    lastSavedAt: iso(data.lastSavedAt, now),
    revision: Number.isInteger(data.revision) && Number(data.revision) >= 0 ? Number(data.revision) : 0,
    legacyReferences: [],
    mappingDecisions
  };
  return { snapshot, version: wrapperVersion === 3 ? "v3" : "v2" };
}

function validate(snapshot: MasterSnapshotV2, records: readonly SourceRecord[], now: string): string[] {
  const errors: string[] = [];
  if (!snapshot.organizations.length) errors.push("Cadangan tidak berisi organisasi.");
  const orgIds = new Set(snapshot.organizations.map(org => org.id)), orgCodes = new Set<string>();
  for (const org of snapshot.organizations) {
    const code = org.code.trim().toLowerCase();
    if (!org.id || !org.name || !org.code) errors.push("Organisasi memiliki field wajib kosong.");
    if (orgCodes.has(code)) errors.push(`Kode organisasi duplikat: ${org.code}.`); orgCodes.add(code);
    if (!["tenant", "client"].includes(org.kind) || !["active", "inactive", "archived"].includes(org.status)) errors.push(`Enum organisasi tidak valid: ${org.id}.`);
    if (!Number.isFinite(Date.parse(org.createdAt)) || !Number.isFinite(Date.parse(org.updatedAt))) errors.push(`Tanggal organisasi tidak valid: ${org.id}.`);
    if (org.picUserId && org.picContact) errors.push(`PIC organisasi ganda: ${org.id}.`);
  }
  const projectIds = new Set(snapshot.projects.map(project => project.id)), projectCodes = new Set<string>();
  for (const project of snapshot.projects) {
    if (!project.id || !project.name || !project.code || !project.legacyKey) errors.push("Proyek memiliki field wajib kosong.");
    if (!orgIds.has(project.organizationId)) errors.push(`Organisasi proyek tidak ditemukan: ${project.id}.`);
    const code = `${project.organizationId}|${project.code.trim().toLowerCase()}`;
    if (projectCodes.has(code)) errors.push(`Kode proyek duplikat: ${project.code}.`); projectCodes.add(code);
    if (!["active", "archived"].includes(project.status)) errors.push(`Status proyek tidak valid: ${project.id}.`);
    if (project.relatedClientIds?.some(id => !snapshot.organizations.some(org => org.id === id && org.kind === "client"))) errors.push(`Klien terkait tidak valid: ${project.id}.`);
  }
  const systemCodes = new Set<string>();
  for (const system of snapshot.systems) {
    if (!system.id || !system.name || !system.code) errors.push("Sistem memiliki field wajib kosong.");
    if (!projectIds.has(system.projectId)) errors.push(`Proyek sistem tidak ditemukan: ${system.id}.`);
    const code = `${system.projectId}|${system.code.trim().toLowerCase()}`;
    if (systemCodes.has(code)) errors.push(`Kode sistem duplikat: ${system.code}.`); systemCodes.add(code);
    if ((system.environment !== undefined && !["Production", "Staging", "DRC"].includes(system.environment)) || (system.criticality !== undefined && !["critical", "high", "medium", "low"].includes(system.criticality)) || !["active", "inactive", "archived"].includes(system.status)) errors.push(`Enum sistem tidak valid: ${system.id}.`);
    if (system.referenceUrl && !/^https?:\/\//i.test(system.referenceUrl) && !/^\/(?!\/)/.test(system.referenceUrl)) errors.push(`URL referensi sistem tidak valid: ${system.id}.`);
  }
  const categoryKeys = new Set<string>(), categoryNames = new Set<string>();
  for (const category of snapshot.categories) {
    const key = category.key.trim().toLowerCase(), name = category.name.trim().toLowerCase();
    if (!category.id || !category.key || !category.name) errors.push("Kategori memiliki field wajib kosong.");
    if (categoryKeys.has(key)) errors.push(`Key kategori duplikat: ${category.key}.`); categoryKeys.add(key);
    if (categoryNames.has(name)) errors.push(`Nama kategori duplikat: ${category.name}.`); categoryNames.add(name);
    if (!Number.isInteger(category.sortOrder) || category.sortOrder < 0) errors.push(`Urutan kategori tidak valid: ${category.id}.`);
  }
  if (snapshot.severities.length !== 4 ||
        !snapshot.severities.every(item => MASTER_SEVERITIES.some(seed => seed.code === item.code && seed.level === item.level) && item.displayName && item.displayName.length <= 24))
    errors.push("Severity harus berisi empat kode dengan level yang sesuai.");
  const references = buildLegacyReferences(snapshot, records);
  const referenceIds = new Set(references.map(reference => reference.id));
  const decisionIds = new Set<string>();
  for (const decision of snapshot.mappingDecisions || []) {
    if (decisionIds.has(decision.referenceId)) errors.push(`Keputusan pemetaan duplikat: ${decision.referenceId}.`); decisionIds.add(decision.referenceId);
    if (!referenceIds.has(decision.referenceId)) errors.push(`Referensi keputusan pemetaan tidak ditemukan: ${decision.referenceId}.`);
    if (!["link", "keepLabel", "defer"].includes(decision.action)) errors.push(`Aksi pemetaan tidak valid: ${decision.referenceId}.`);
    const project = snapshot.projects.find(item => item.id === decision.projectId);
    const reference = references.find(item => item.id === decision.referenceId);
    if (decision.action === "link" && !project) errors.push(`Target proyek pemetaan tidak ditemukan: ${decision.referenceId}.`);
    if (decision.action === "link" && !reference?.organizationId) errors.push(`Organisasi sumber referensi tidak diketahui: ${decision.referenceId}.`);
    if (project && reference?.organizationId && project.organizationId !== reference.organizationId) errors.push(`Target proyek berada di luar organisasi sumber: ${decision.referenceId}.`);
    if (decision.systemMappings?.some(mapping => !snapshot.systems.some(system => system.id === mapping.systemId && system.projectId === decision.projectId) || !mapping.note.trim())) errors.push(`Pemetaan sistem tidak valid atau tanpa catatan: ${decision.referenceId}.`);
  }
  if (errors.length) return [...new Set(errors)];
  const probe: MasterSnapshotV2 = { ...snapshot, lastSavedAt: now, revision: snapshot.revision + 1, legacyReferences: references };
  if (!isMasterV2(probe)) errors.push("Struktur data cadangan tidak valid atau memiliki relasi yang tidak dikenal.");
  return [...new Set(errors)];
}

function collectionChanges(current: readonly { id: string; name: string }[], incoming: readonly { id: string; name: string }[], collection: string): { added: number; updated: number; removed: number; changes: RestoreChange[]; conflicts: RestoreChange[] } {
  const currentMap = new Map(current.map(item => [item.id, item])), incomingMap = new Map(incoming.map(item => [item.id, item]));
  let added = 0, updated = 0, removed = 0; const changes: RestoreChange[] = [], conflicts: RestoreChange[] = [];
  for (const item of incoming) {
    const before = currentMap.get(item.id);
    if (!before) { added++; changes.push({ collection, id: item.id, label: item.name, kind: "added" }); continue; }
    if (JSON.stringify(before) !== JSON.stringify(item)) { updated++; const change: RestoreChange = { collection, id: item.id, label: item.name, kind: "conflict" }; changes.push({ ...change, kind: "updated" }); conflicts.push(change); }
  }
  for (const item of current) if (!incomingMap.has(item.id)) { removed++; changes.push({ collection, id: item.id, label: item.name, kind: "removed" }); }
  return { added, updated, removed, changes, conflicts };
}

export function validateBackupText(content: string, current: MasterSnapshotV2, records: readonly SourceRecord[], options: { fileName?: string; now?: string } = {}): ValidatedBackup {
  if (content.length > BACKUP_MAX_BYTES)
    throw new ApiError({ status: 422, message: "Ukuran cadangan melebihi 5 MB.", code: "FILE_TOO_LARGE" });
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new ApiError({ status: 422, message: "File bukan JSON yang valid.", code: "INVALID_JSON" });
  }
  safeKeys(parsed);
  const now = options.now || new Date().toISOString(), normalized = normalizeSnapshot(parsed, now);
  const errors = validate(normalized.snapshot, records, now);
  if (errors.length) throw new ApiError({ status: 422, message: errors[0], code: "INVALID_BACKUP", details: { errors } });
  const orgChange = collectionChanges(
    current.organizations.map(org => ({ id: org.id, name: org.name })),
    normalized.snapshot.organizations.map(org => ({ id: org.id, name: org.name })),
    "organisasi"
  );
  const projectChange = collectionChanges(
    current.projects.map(project => ({ id: project.id, name: project.name })),
    normalized.snapshot.projects.map(project => ({ id: project.id, name: project.name })),
    "proyek"
  );
  const systemChange = collectionChanges(
    current.systems.map(system => ({ id: system.id, name: system.name })),
    normalized.snapshot.systems.map(system => ({ id: system.id, name: system.name })),
    "sistem"
  );
  const categoryChange = collectionChanges(
    current.categories.map(category => ({ id: category.id, name: category.name })),
    normalized.snapshot.categories.map(category => ({ id: category.id, name: category.name })),
    "kategori"
  );
  const severityChange = collectionChanges(
    current.severities.map(severity => ({ id: severity.code, name: severity.displayName })),
    normalized.snapshot.severities.map(severity => ({ id: severity.code, name: severity.displayName })),
    "severity"
  );
  const decisionChange = collectionChanges(
    (current.mappingDecisions || []).map(decision => ({ id: decision.referenceId, name: decision.referenceId })),
    (normalized.snapshot.mappingDecisions || []).map(decision => ({ id: decision.referenceId, name: decision.referenceId })),
    "pemetaan"
  );
  const all = [orgChange, projectChange, systemChange, categoryChange, severityChange, decisionChange];
  const warnings = ["Semua data Master Data lokal akan diganti.", "Data transaksi operasional (tiket, checkpoint, handover) tidak diubah."];
  if (normalized.version === "v2") warnings.push("Cadangan v2 lama: koleksi keputusan pemetaan kosong secara default.");
  if (normalized.snapshot.mappingDecisions?.length) warnings.push("Keputusan pemetaan ikut dipulihkan.");
  return {
    snapshot: normalized.snapshot,
    preview: {
      counts: {
        organizations: normalized.snapshot.organizations.length,
        projects: normalized.snapshot.projects.length,
        systems: normalized.snapshot.systems.length,
        categories: normalized.snapshot.categories.length,
        severities: normalized.snapshot.severities.length,
        mappingDecisions: normalized.snapshot.mappingDecisions?.length || 0,
        audit: normalized.snapshot.audit.length
      },
      organizations: normalized.snapshot.organizations.map(org => ({ id: org.id, name: org.name })),
      added: all.reduce((sum, item) => sum + item.added, 0),
      updated: all.reduce((sum, item) => sum + item.updated, 0),
      removed: all.reduce((sum, item) => sum + item.removed, 0),
      conflicts: all.flatMap(item => item.conflicts).slice(0, 50),
      changes: all.flatMap(item => item.changes).slice(0, 50),
      warnings,
      backupVersion: normalized.version,
      fileName: options.fileName
    }
  };
}
