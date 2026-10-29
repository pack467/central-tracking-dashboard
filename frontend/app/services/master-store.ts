/** State, persistence and cross-tab sync of the Master Data dataset, plus readers for the operational data it is checked against. */
import { ApiError } from "@/app/lib/api/errors";
import { actorCanMaster, type MasterAction } from "@/app/lib/permissions";
import { ALL_COMBINED_SEED_TICKETS, CLIENT_HANDOVER_TASKS, getClientMonitoringSchedule } from "@/app/lib/clientData";
import { initialHandoverRecord, seedRosterMembers } from "@/app/lib/data";
import { MASTER_DATA_P0_ENABLED } from "@/app/lib/master-data-flags";
import { SEED_ROLE_KEYS, seedPeople, seedRoles, type StoredRole } from "@/app/lib/master-people";
import { SEED_MASTER_CLIENTS, SEED_MASTER_PROJECTS, SEED_MASTER_SYSTEMS } from "@/app/lib/masterDataSeeds";
import {
  MASTER_INVALID_KEY,
  MASTER_LEGACY_STORAGE_KEY,
  MASTER_SEVERITIES,
  MASTER_RECOVERY_KEY,
  MASTER_STORAGE_KEY,
  MASTER_SEED_TIME,
  isMasterV1,
  isMasterV2,
  isSafeLogo,
  isSafeReferenceUrl,
  masterNow,
  migrateMasterV1,
  publishMasterProjection
} from "@/app/lib/master-data-model";
import { buildLegacyReferences, type SourceRecord } from "@/app/lib/master-review";
import { withBaselineColors } from "@/app/lib/category-colors";
import type {
  AnyMasterEntity,
  MasterActor,
  MasterEntity,
  MasterRecordMap,
  MasterSnapshotV2,
  MasterSyncState
} from "@/app/types/master-data";
import type { Ticket } from "@/app/lib/types";
import { isMockMode } from "@/app/lib/config";

type Directory = readonly { id: string; name: string; email?: string; phone?: string }[];

const ROSTER_LEGACY_KEY = "ctd.roster.members";

function seedTeam(base: MasterSnapshotV2, storedRoster?: unknown): MasterSnapshotV2 {
  const { people, extraRoleKeys } = seedPeople(storedRoster, seedRosterMembers, MASTER_SEED_TIME);
  const roles: StoredRole[] = [
    ...seedRoles(),
    ...extraRoleKeys.map((key, index) => ({ key, name: key, active: true, sortOrder: SEED_ROLE_KEYS.length + index, protected: false }))
  ];
  return { ...base, schemaRevision: 6, people, roles, tombstones: base.tombstones || [] };
}

const seed = seedTeam(
  migrateMasterV1(
    { version: 1, clients: SEED_MASTER_CLIENTS, projects: SEED_MASTER_PROJECTS, systems: SEED_MASTER_SYSTEMS, lastSaved: MASTER_SEED_TIME }
  )
);

export let snapshot = structuredClone(seed);
let loaded = false, cachedRaw: string | null = null;

/** Raw text of stored data that failed validation. It is copied to MASTER_INVALID_KEY just before anything overwrites it. */
let pendingInvalid: string | null = null, readingFromStorageEvent = false;

export let sync: MasterSyncState = { status: "saved", lastSavedAt: null, revision: 0, ready: false };

export const serverSync = sync;

const listeners = new Set<() => void>(), warnings = new Set<string>();

/** Only set when a server directory replaces the local people list. */
let externalUsers: Directory | null = null;

export let sessionActor: MasterActor = { id: "op-1", name: "Mhd. Galih Khairi", role: "Operator NOC" };

/** The people master is the single source of staff identity (PIC pickers, legacy projections). */
export function directory(data: MasterSnapshotV2 = snapshot): Directory {
  return externalUsers || (data.people || []).map(person => ({ id: person.id, name: person.fullName, email: person.email, phone: person.phone }));
}

function notify(): void { publishMasterProjection(snapshot, directory()); listeners.forEach(listener => listener()); }

export function setSync(next: Partial<MasterSyncState>): void { sync = { ...sync, ...next }; notify(); }

function warnOnce(key: string, message: string): void { if (!warnings.has(key)) { warnings.add(key); console.warn(message); } }

export function error(status: number, message: string, code: string, field?: string): never { throw new ApiError({ status, message, code, details: field ? { field } : undefined }); }

export function authorized(entity: AnyMasterEntity, action: MasterAction, actor = sessionActor): void {
  if (!actorCanMaster(actor, entity, action)) error(403, "Anda tidak memiliki izin untuk tindakan ini.", "FORBIDDEN");
}

export const clone = <T,>(value: T): T => structuredClone(value);

export const identity = (entity: MasterEntity, value: MasterRecordMap[MasterEntity]) => entity === "severity"
  ? (value as MasterRecordMap["severity"]).code
  : (value as Exclude<MasterRecordMap[MasterEntity], MasterRecordMap["severity"]>).id;

export const persistedKey = { organization: "organizations", project: "projects", system: "systems", category: "categories", severity: "severities" } as const;

export function prepare(next: MasterSnapshotV2): MasterSnapshotV2 {
  const prepared: MasterSnapshotV2 = {
    ...next, schemaRevision: 6,
    people: next.people || snapshot.people || seed.people, roles: next.roles || snapshot.roles || seed.roles, tombstones: next.tombstones || snapshot.tombstones || [],
    // Cancelled P0 feature: legacy references are recomputed only while the flag is on; stored ones are kept untouched.
    legacyReferences: MASTER_DATA_P0_ENABLED ? buildLegacyReferences(next, masterSourceRecords(next)) : next.legacyReferences,
  };
  if (!isMasterV2(prepared)) error(422, "Perubahan menghasilkan relasi yang tidak valid.", "INVALID_RELATION");
  return prepared;
}

function stashInvalid(): void {
  if (pendingInvalid === null) return;
  try { window.localStorage.setItem(MASTER_INVALID_KEY, JSON.stringify({ at: masterNow(), raw: pendingInvalid })); }
  catch { warnOnce("invalid-copy", "Salinan data yang tidak valid tidak dapat disimpan."); }
  pendingInvalid = null;
}

const safeLogoOf = <T extends { logoUrl?: string }>(row: T): T => !row.logoUrl || isSafeLogo(row.logoUrl) ? row : { ...row, logoUrl: undefined };
/** Categories saved before colours existed get the colour they were drawn with: by their order, over the original eight. */
function withCategoryColors(data: MasterSnapshotV2): MasterSnapshotV2 {
  if (data.categories.every(category => category.color)) return data;
  return { ...data, categories: withBaselineColors(data.categories) };
}

/** schemaRevision 5 -> 6: severities saved without a description get the default guidance once; a description cleared later stays empty. */
function withSeverityDescriptions(data: MasterSnapshotV2): MasterSnapshotV2 {
  if (data.schemaRevision === 6 || data.severities.every(severity => severity.description)) return data;
  return { ...data, severities: data.severities.map(severity => severity.description ? severity : { ...severity, description: MASTER_SEVERITIES.find(item => item.code === severity.code)?.description }) };
}

/** Stored URLs and logos are untrusted: an unsafe one is dropped instead of rejecting the whole dataset. */
function withSafeUrls(data: MasterSnapshotV2): MasterSnapshotV2 {
  const urlsSafe = data.systems.every(system => !system.referenceUrl || isSafeReferenceUrl(system.referenceUrl));
  const logosSafe = [...data.organizations, ...data.projects, ...data.systems].every(row => !row.logoUrl || isSafeLogo(row.logoUrl));
  if (urlsSafe && logosSafe) return data;
  if (!urlsSafe) warnOnce("unsafe-url", "Tautan referensi yang tidak aman dihapus dari data tersimpan.");
  if (!logosSafe) warnOnce("unsafe-logo", "Logo yang tidak valid dihapus dari data tersimpan.");
  return {
    ...data,
    organizations: data.organizations.map(safeLogoOf),
    projects: data.projects.map(safeLogoOf),
    systems: data.systems.map(system => safeLogoOf(!system.referenceUrl || isSafeReferenceUrl(system.referenceUrl) ? system : { ...system, referenceUrl: undefined }))
  };
}

export function persist(next: MasterSnapshotV2): void {
  const prepared = prepare(next);
  snapshot = prepared;
  if (typeof window === "undefined") {
    setSync({ ready: true, status: "session", revision: prepared.revision, lastSavedAt: prepared.lastSavedAt, error: undefined });
    return;
  }
  try {
    const raw = JSON.stringify(prepared);
    stashInvalid();
    window.localStorage.setItem(MASTER_STORAGE_KEY, raw);
    cachedRaw = raw;
    setSync({ ready: true, status: "saved", revision: prepared.revision, lastSavedAt: prepared.lastSavedAt, error: undefined });
  } catch {
    warnOnce("storage", "Penyimpanan tidak tersedia. Perubahan Master Data hanya disimpan dalam sesi ini.");
    setSync({ ready: true, status: "session", revision: prepared.revision, lastSavedAt: prepared.lastSavedAt, error: undefined });
  }
}

/** The legacy roster key is only read, never written: it stays as a safety copy. */
function readStoredRoster(): unknown {
  try { return JSON.parse(window.localStorage.getItem(ROSTER_LEGACY_KEY) || "null"); } catch { return null; }
}

export function load(): MasterSnapshotV2 {
  let storedRaw: string | null = null;
  if (!isMockMode()) return snapshot;
  if (typeof window === "undefined") { loaded = true; return snapshot; }
  if (loaded && sync.status === "session") return snapshot;
  try {
    const raw = window.localStorage.getItem(MASTER_STORAGE_KEY);
    storedRaw = raw;
    if (loaded && (raw === cachedRaw || sync.status === "session")) return snapshot;
    if (raw) {
      const candidate: unknown = JSON.parse(raw);
      if (!isMasterV2(candidate)) throw new Error("INVALID_V2");
      const parsed = withSafeUrls(candidate);
      if (!parsed.people || !parsed.roles) {
        // schemaRevision 3 -> 4: add people and roles from the Team Roster; every other collection is kept as stored.
        snapshot = seedTeam({ ...withSeverityDescriptions(parsed), legacyReferences: parsed.legacyReferences || [], mappingDecisions: parsed.mappingDecisions || [] }, readStoredRoster());
        loaded = true; persist(snapshot);
        return snapshot;
      }
      // schemaRevision 4 -> 5: every category gets the palette colour it was already drawn with; nothing else is touched.
      const coloured = withSeverityDescriptions(withCategoryColors(parsed));
      snapshot = { ...coloured, schemaRevision: 6, legacyReferences: parsed.legacyReferences || [], mappingDecisions: parsed.mappingDecisions || [] }; cachedRaw = raw; loaded = true;
      if (coloured !== parsed || parsed.schemaRevision !== 6) { persist(snapshot); return snapshot; }
      setSync({ ready: true, status: "saved", lastSavedAt: parsed.lastSavedAt, revision: parsed.revision, error: undefined });
      return snapshot;
    }
    const legacyRaw = window.localStorage.getItem(MASTER_LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const legacy: unknown = JSON.parse(legacyRaw);
      if (!isMasterV1(legacy)) throw new Error("INVALID_V1");
      const migrated = migrateMasterV1(legacy, SEED_MASTER_PROJECTS);
      if (!isMasterV2(migrated)) throw new Error("INVALID_MIGRATION");
      snapshot = seedTeam(migrated, readStoredRoster());
    } else snapshot = seedTeam(clone(seed), readStoredRoster());
    snapshot.lastSavedAt = masterNow(); loaded = true; persist(snapshot);
  } catch (cause) {
    if (cause instanceof SyntaxError || cause instanceof Error && cause.message.startsWith("INVALID_")) {
      warnOnce("invalid", "Data Master Data tidak valid. Data awal digunakan; salinan aslinya disimpan di ctd.masterData.invalid.v1.");
      pendingInvalid = storedRaw;
      snapshot = clone(seed); snapshot.lastSavedAt = masterNow(); loaded = true;
      // A tab that merely noticed another tab's bad write must not overwrite it; the copy is made when this tab first writes.
      if (readingFromStorageEvent) setSync({ ready: true, status: "session", lastSavedAt: snapshot.lastSavedAt, revision: snapshot.revision, error: undefined });
      else persist(snapshot);
    } else {
      loaded = true;
      warnOnce("storage", "Penyimpanan tidak tersedia. Perubahan Master Data hanya disimpan dalam sesi ini.");
      setSync({ ready: true, status: "session", lastSavedAt: snapshot.lastSavedAt, revision: snapshot.revision });
    }
  }
  return snapshot;
}

function storageChanged(event: StorageEvent): void {
  if (event.key !== MASTER_STORAGE_KEY && event.key !== null) return;
  loaded = false; cachedRaw = null;
  if (sync.status === "session") sync = { ...sync, status: "saved" };
  readingFromStorageEvent = true;
  try { load(); } finally { readingFromStorageEvent = false; }
}

export function subscribe(listener: () => void): () => void {
  if (!listeners.size && typeof window !== "undefined") window.addEventListener("storage", storageChanged);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size && typeof window !== "undefined") window.removeEventListener("storage", storageChanged);
  };
}

/** Complete persisted simulation dataset, never a paginated UI result. */
export function allTickets(): Ticket[] {
  if (typeof window !== "undefined") {
    try {
      const value: unknown = JSON.parse(localStorage.getItem("ctd.tickets.v4") || "null");
      if (Array.isArray(value) && value.every(t => t && typeof t.id === "string" && typeof t.project === "string")) return value;
    } catch { /* use the full immutable seed */ }
  }
  return ALL_COMBINED_SEED_TICKETS;
}

export function allAssessments(): Record<string, { verdict?: string }> {
  if (typeof window === "undefined") return {};
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem("ctd.checkpoints") || "{}");
    if (stored && typeof stored === "object" && !Array.isArray(stored)) return stored as Record<string, { verdict?: string }>;
  } catch { /* use complete seed schedule states */ }
  return {};
}

/** Complete operational references used for review, usage and mapping decisions. */
export function masterSourceRecords(catalog: MasterSnapshotV2 = load()): SourceRecord[] {
  const records: SourceRecord[] = [];
  for (const ticket of allTickets()) {
    records.push({ recordRef: `ticket:${ticket.id}`, sourceType: "ticket", organizationId: ticket.clientId || "tritronik", rawValue: ticket.project, label: ticket.subject || ticket.id, active: !["closed", "ditutup"].includes(String(ticket.status || "").toLowerCase()), projectId: ticket.projectId, systemId: ticket.systemId, categoryKey: ticket.type || ticket.category, severityCode: String(ticket.severity || "").toLowerCase() });
  }
  const assessments = allAssessments();
  for (const org of catalog.organizations) {
    for (const entry of getClientMonitoringSchedule(org.id)) {
      const assessmentKey = `${entry.time}-${entry.project}-${entry.task}`, verdict = assessments[assessmentKey]?.verdict;
      records.push({ recordRef: `checkpoint:${org.id}:${assessmentKey}`, sourceType: "checkpoint", organizationId: org.id, rawValue: entry.project, label: `${entry.time} — ${entry.task}`, active: verdict === "nok" || verdict === "not-adequate" || !verdict && !["Done", "Selesai"].includes(entry.state), assessmentKey });
    }
  }
  for (const [organizationId, tasks] of Object.entries(CLIENT_HANDOVER_TASKS)) {
    for (const task of tasks) {
      const state = String(task.state);
      records.push({ recordRef: `handover:${organizationId}:task:${task.id}`, sourceType: "handover", organizationId, rawValue: task.project, label: task.title, active: !task.completed || ["waiting", "in-progress", "escalated", "blocked", "waiting-vendor"].includes(state) });
    }
  }
  initialHandoverRecord.findings.forEach((finding, index) => records.push(
    {
      recordRef: `handover:tritronik:finding:${index}`,
      sourceType: "handover",
      organizationId: "tritronik",
      rawValue: finding.project,
      label: finding.title,
      active: true
    }
  ));
  initialHandoverRecord.monitoringCheckpoints?.forEach((checkpoint, index) => records.push(
    {
      recordRef: `handover:tritronik:checkpoint:${index}`,
      sourceType: "handover",
      organizationId: "tritronik",
      rawValue: checkpoint.project,
      label: `${checkpoint.time} — ${checkpoint.task}`,
      active: checkpoint.verdict === "nok"
    }
  ));
  initialHandoverRecord.monitoredProjects.forEach(project => records.push(
    {
      recordRef: `handover:tritronik:monitored:${encodeURIComponent(project)}`,
      sourceType: "handover",
      organizationId: "tritronik",
      rawValue: project,
      label: "Proyek dimonitor",
      active: false
    }
  ));
  return records;
}

/** Replaces the in-memory dataset with one a restore has just written to storage. */
export function adoptWritten(prepared: MasterSnapshotV2, raw: string): void { snapshot = prepared; cachedRaw = raw; loaded = true; }
/** Takes over a catalog loaded from a server (API mode). */
export function acceptServerCatalog(data: Pick<MasterSnapshotV2, "organizations" | "projects" | "systems" | "categories" | "severities">, lastSavedAt = masterNow()): void {
  const next = { ...snapshot, ...data, revision: snapshot.revision + 1, lastSavedAt };
  if (!isMasterV2(next)) error(422, "Respons katalog server tidak valid.", "INVALID_RESPONSE");
  snapshot = prepare(next);
  setSync({ ready: true, status: "saved", revision: snapshot.revision, lastSavedAt, error: undefined });
}
export function setSessionActor(actor: MasterActor): void { sessionActor = { ...actor }; }
export function setExternalUsers(registered: Directory): void { externalUsers = registered; publishMasterProjection(snapshot, directory()); }
/** Forgets everything in memory and in storage; used by tests. */
export function resetStore(): void {
  snapshot = clone(seed); loaded = false; cachedRaw = null; pendingInvalid = null; readingFromStorageEvent = false;
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(MASTER_STORAGE_KEY);
      localStorage.removeItem(MASTER_RECOVERY_KEY);
      localStorage.removeItem(MASTER_INVALID_KEY);
    } catch { /* session-only reset */ }
  }
  sync = { ...serverSync };
}
