import { baselineColorFor, isCategoryColor } from "./category-colors";
import type {
  ClientOrganization,
  MasterDataPayload,
  MasterSnapshotV2,
  Organization,
  Project,
  ProjectMaster,
  SeverityCode,
  System,
  SystemMaster
} from "@/app/types/master-data";

export const MASTER_STORAGE_KEY = "ctd.masterData.v2";
export const MASTER_LEGACY_STORAGE_KEY = "ctd.masterData.v1";
export const MASTER_RECOVERY_KEY = "ctd.masterData.recovery.v1";
/** Holds the raw text of stored data that failed validation, so it is never destroyed by the replacement. */
export const MASTER_INVALID_KEY = "ctd.masterData.invalid.v1";
export const MASTER_CHANGE_EVENT = "ctd:master-data";
export const CATEGORY_KEYS = ["Maintenance", "Incident", "Change Request", "Escalation", "Ad-hoc Request", "Monitoring", "Monitoring Alert"] as const;
export const MASTER_SEVERITIES = [
  { code: "critical", displayName: "Critical (Kritis)", level: 1, description: "Layanan utama mati total" },
  { code: "high", displayName: "High (Tinggi)", level: 2, description: "Fungsi penting terganggu" },
  { code: "medium", displayName: "Medium (Sedang)", level: 3, description: "Sebagian fungsi terganggu, ada solusi sementara" },
  { code: "low", displayName: "Low (Rendah)", level: 4, description: "Dampak kecil, tidak mendesak" },
] as const;
export const SEVERITY_COLORS: Record<SeverityCode, string> = { critical: "#ef4444", high: "#f97316", medium: "#f59e0b", low: "#2dd4bf" };
export const MASTER_SEED_TIME = "2026-10-15T00:00:00.000Z";

/** The single clock for writes, migration and audit. Never called by rendering. */
export function masterNow(): string {
  const testTime = typeof window !== "undefined" ? (window as unknown as { __TEST_CLOCK__?: string }).__TEST_CLOCK__ : undefined;
  return testTime && Number.isFinite(Date.parse(testTime)) ? new Date(testTime).toISOString() : new Date().toISOString();
}
export function masterCode(name: string): string { return name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "SYSTEM"; }
/** Readable, unique and fixed for life: tickets keep pointing at it when the name changes. The form shows it before the category exists. */
export function categoryKey(name: string, taken: readonly string[]): string {
  const base = masterCode(name).slice(0, 28) || "KATEGORI", used = new Set(taken.map(key => key.toLowerCase()));
  let key = base, suffix = 2;
  while (used.has(key.toLowerCase())) key = `${base}-${suffix++}`;
  return key;
}
/** crypto.randomUUID only exists in secure contexts (HTTPS or localhost), so opening the app by LAN IP over http used to break every create. */
export function randomUuid(): string {
  const webCrypto = typeof globalThis.crypto !== "undefined" ? globalThis.crypto : undefined;
  if (webCrypto && typeof webCrypto.randomUUID === "function") return webCrypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (webCrypto && typeof webCrypto.getRandomValues === "function") webCrypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0"));
  return [hex.slice(0, 4), hex.slice(4, 6), hex.slice(6, 8), hex.slice(8, 10), hex.slice(10)].map(part => part.join("")).join("-");
}
export function masterId(prefix: string): string { return `${prefix}-${randomUuid()}`; }
/** http(s) or an app path. A second slash or a backslash after the first one would make a browser treat the path as another site ("//evil.com", "/\evil.com"). */
export function isSafeReferenceUrl(value: string): boolean { return /^https?:\/\//i.test(value) || /^\/(?![/\\])/.test(value); }
/** The only way a stored reference URL may reach an href. */
export function safeHref(value: string | undefined | null): string | undefined { const text = value?.trim(); return text && isSafeReferenceUrl(text) ? text : undefined; }
/** Upper bound for a stored logo. The form shrinks images to 128 px, which stays far below this; the cap protects browser storage. */
export const MASTER_LOGO_MAX_LENGTH = 200_000;
/**
 * A logo is either a base64 PNG/JPEG/WebP data URL (no SVG: it can carry script) or an https URL.
 * Only these strings may reach an <img src>.
 */
export function isSafeLogo(value: string): boolean {
  if (value.length > MASTER_LOGO_MAX_LENGTH) return false;
  return /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value) || /^https:\/\/[^\s"'<>]+$/i.test(value);
}
/** The only way a stored logo may reach an img src. */
export function safeLogo(value: string | undefined | null): string | undefined { return value && isSafeLogo(value) ? value : undefined; }
export function severityTicketCode(code: SeverityCode): "Critical" | "High" | "Medium" | "Low" {
  return ({ critical: "Critical", high: "High", medium: "Medium", low: "Low" } as const)[code];
}
/** Existing Monitoring matching semantics, shared without importing UI modules. */
export function matchesLegacyProject(entryProject: string, targetProject: string): boolean {
  if (!entryProject || !targetProject) return false;
  const entry = entryProject.toLowerCase().trim(), target = targetProject.toLowerCase().trim();
  return entry === target || entry.startsWith(`${target}/`) || entry.startsWith(`${target} `) || target === "epc" && entry.startsWith("epc");
}
/** Exact immutable identity first; ambiguous legacy aliases are never guessed. */
export function resolveMasterProject(projects: readonly Project[], value: string, organizationId?: string): Project | undefined {
  const scoped = projects.filter(p => !organizationId || p.organizationId === organizationId), needle = value.trim().toLowerCase();
  const byId = scoped.find(p => p.id === value);
  if (byId) return byId;
  const keys = (project: Project) => [project.legacyKey, project.legacy?.name, project.legacy?.code].filter((key): key is string => !!key);
  const exact = scoped.filter(p => keys(p).some(key => key.toLowerCase() === needle));
  if (exact.length) return exact.length === 1 ? exact[0] : undefined;
  const aliases = scoped.filter(p => keys(p).some(key => matchesLegacyProject(value, key)));
  return aliases.length === 1 ? aliases[0] : undefined;
}

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const string = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const iso = (value: unknown): value is string => string(value) && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
const member = (value: unknown, values: readonly unknown[]) => values.includes(value);
const unique = (values: string[]) => new Set(values).size === values.length;
const optional = (value: unknown) => value === undefined || typeof value === "string";
const dates = (value: Record<string, unknown>) => iso(value.createdAt) && iso(value.updatedAt);
const optionalStrings = (value: Record<string, unknown>, fields: readonly string[]) => fields.every(field => optional(value[field]));

export function isMasterV1(value: unknown): value is MasterDataPayload {
  if (!record(value) || value.version !== 1 || !Array.isArray(value.clients) || !Array.isArray(value.projects) || !Array.isArray(value.systems))
    return false;
  return value.clients.every(c => record(c) && string(c.id) && string(c.code) && string(c.name) && member(c.status, ["active", "inactive", "archived"])) &&
    value.projects.every(p => record(p) && string(p.id) && string(p.clientId) && string(p.name) && string(p.code) && member(p.status, ["active", "archived"])) &&
    value.systems.every(s => record(s) && string(s.id) && string(s.projectId) && string(s.name) && member(s.status, ["active", "maintenance", "deprecated"])) &&
    unique(value.clients.map(c => c.id)) &&
    unique(value.projects.map(p => p.id)) &&
    unique(value.systems.map(s => s.id));
}

/** Provisional organization model and all v1 field/status mapping live here. */
export function migrateMasterV1(old: MasterDataPayload, originalProjects: readonly ProjectMaster[] = []): MasterSnapshotV2 {
  const organizations: Organization[] = old.clients.map(client => {
    const legacy = { ...client };
    delete legacy.systemsCount;
    return {
      id: client.id,
      kind: "client",
      code: client.code,
      name: client.name,
      shortName: client.shortName,
      description: client.description,
      status: client.status,
      picContact: client.picName ? { name: client.picName, email: client.picEmail || undefined, phone: client.picPhone || undefined } : undefined,
      createdAt: iso(client.createdAt) ? client.createdAt : MASTER_SEED_TIME,
      updatedAt: iso(client.updatedAt) ? client.updatedAt : MASTER_SEED_TIME,
      legacy
    };
  });
  const projects: Project[] = old.projects.map(project => ({
      id: project.id,
      organizationId: project.clientId,
      relatedClientIds: [],
      code: project.code,
      name: project.name,
      scope: project.detail,
      status: project.status,
      legacyKey: originalProjects.find(p => p.id === project.id)?.name || project.name,
      legacy: { ...project },
      createdAt: iso(project.createdAt) ? project.createdAt : MASTER_SEED_TIME,
      updatedAt: iso(project.updatedAt) ? project.updatedAt : iso(project.createdAt) ? project.createdAt : MASTER_SEED_TIME
    }));
  const usedCodes = new Set<string>();
  const systems: System[] = old.systems.map(system => {
    const base = masterCode(system.name); let code = base, suffix = 2;
    while (usedCodes.has(`${system.projectId}|${code}`)) code = `${base.slice(0, 26)}-${suffix++}`;
    usedCodes.add(`${system.projectId}|${code}`);
    return {
      id: system.id, projectId: system.projectId, name: system.name, code, environment: system.environment,
      criticality: system.criticality, status: system.status === "deprecated" ? "archived" : "active",
      legacyCondition: system.status === "maintenance" ? "maintenance" : undefined, legacy: { ...system },
      createdAt: iso(system.createdAt) ? system.createdAt : MASTER_SEED_TIME,
      updatedAt: iso(system.updatedAt) ? system.updatedAt : MASTER_SEED_TIME,
    };
  });
  return {
    version: 2, schemaRevision: 3, organizations, projects, systems,
    categories: CATEGORY_KEYS.map((key, index) => ({ id: `category-${index + 1}`, key, name: key, color: baselineColorFor(index), active: true, sortOrder: index })),
    severities: MASTER_SEVERITIES.map(severity => ({ ...severity })),
    audit: [], idempotency: [], revision: 0, legacyReferences: [], mappingDecisions: [],
    lastSavedAt: iso(old.lastSaved) ? old.lastSaved : MASTER_SEED_TIME,
  };
}

export function isMasterV2(value: unknown): value is MasterSnapshotV2 {
  if (!record(value) || value.version !== 2 || !iso(value.lastSavedAt) || !Number.isInteger(value.revision) || Number(value.revision) < 0)
    return false;
  const { organizations: orgs, projects, systems, categories, severities, audit, idempotency } = value;
  if (!Array.isArray(orgs) ||
        !orgs.length ||
        !Array.isArray(projects) ||
        !Array.isArray(systems) ||
        !Array.isArray(categories) ||
        !Array.isArray(severities) ||
        !Array.isArray(audit) ||
        !Array.isArray(idempotency))
    return false;
  if (!orgs.every(o => record(o) &&
        string(o.id) &&
        string(o.code) &&
        string(o.name) &&
        dates(o) &&
        member(o.kind, ["tenant", "client"]) &&
        member(o.status, ["active", "inactive", "archived"]) &&
        optionalStrings(o, ["shortName", "description", "picUserId", "logoUrl"]) &&
        !(o.picUserId && o.picContact) &&
        (!o.picContact || record(o.picContact) && string(o.picContact.name) && optional(o.picContact.email) && optional(o.picContact.phone)) &&
        (!o.legacy ||
            record(o.legacy) &&
              optionalStrings(
                o.legacy,
                ["name", "code", "shortName", "tagline", "tier", "picName", "picEmail", "picPhone", "description", "avatarBg", "avatarColor", "borderColor"]
              ))))
    return false;
  if (!unique(orgs.map(o => o.id)) || !unique(orgs.map(o => o.code.trim().toLowerCase()))) return false;
  if (!projects.every(p => record(p) &&
        string(p.id) &&
        string(p.organizationId) &&
        orgs.some(o => o.id === p.organizationId) &&
        string(p.code) &&
        string(p.name) &&
        string(p.legacyKey) &&
        dates(p) &&
        member(p.status, ["active", "archived"]) &&
        optionalStrings(p, ["shortName", "scope", "leadUserId", "logoUrl"]) &&
        (!p.legacy || record(p.legacy) && optionalStrings(p.legacy, ["name", "fullName", "detail", "leadEngineer", "healthDefault"])) &&
        (!p.relatedClientIds ||
            Array.isArray(p.relatedClientIds) && p.relatedClientIds.every(id => orgs.some(o => o.id === id && o.kind === "client")))))
    return false;
  if (!unique(projects.map(p => p.id)) || !unique(projects.map(p => `${p.organizationId}|${p.code.trim().toLowerCase()}`))) return false;
  if (!systems.every(s => record(s) &&
        string(s.id) &&
        string(s.projectId) &&
        projects.some(p => p.id === s.projectId) &&
        string(s.name) &&
        string(s.code) &&
        dates(s) &&
        member(s.status, ["active", "inactive", "archived"]) &&
        (s.environment === undefined || member(s.environment, ["Production", "Staging", "DRC"])) &&
        (s.criticality === undefined || member(s.criticality, ["critical", "high", "medium", "low"])) &&
        optionalStrings(s, ["picUserId", "description", "referenceUrl", "logoUrl"]) &&
        (!s.legacy || record(s.legacy) && optionalStrings(s.legacy, ["name"])) &&
        (!s.legacyCondition || s.legacyCondition === "maintenance")))
    return false;
  if (!unique(systems.map(s => s.id)) || !unique(systems.map(s => `${s.projectId}|${s.code.trim().toLowerCase()}`))) return false;
  if (!categories.every(c => record(c) &&
        string(c.id) &&
        string(c.key) &&
        string(c.name) &&
        typeof c.active === "boolean" &&
        Number.isInteger(c.sortOrder) &&
        Number(c.sortOrder) >= 0 &&
        (c.color === undefined || isCategoryColor(c.color)) &&
        optional(c.description)) ||
        !unique(categories.map(c => c.id)) ||
        !unique(categories.map(c => c.key.toLowerCase())))
    return false;
  if (severities.length !== 4 ||
        !severities.every(s => record(s) &&
          MASTER_SEVERITIES.some(seed => seed.code === s.code && seed.level === s.level) &&
          string(s.displayName) &&
          s.displayName.length <= 24 &&
          optional(s.description)) ||
        !unique(severities.map(s => s.code)))
    return false;
  const legacyReferences = value.legacyReferences, mappingDecisions = value.mappingDecisions;
  if (legacyReferences !== undefined &&
        (!Array.isArray(legacyReferences) ||
            !legacyReferences.every(ref => record(ref) &&
              string(ref.id) &&
              member(ref.sourceType, ["ticket", "checkpoint", "handover"]) &&
              string(ref.rawValue) &&
              Number.isInteger(ref.count) &&
              Number(ref.count) >= 0 &&
              member(ref.status, ["unmapped", "ambiguous", "mapped", "label", "deferred"]) &&
              Array.isArray(ref.candidates) &&
              ref.candidates.every(id => string(id)) &&
              Array.isArray(ref.examples) &&
              ref.examples.length <= 5 &&
              ref.examples.every(example => record(example) &&
                string(example.recordRef) &&
                string(example.label) &&
                string(example.rawProject) &&
                typeof example.active === "boolean" &&
                optional(example.projectId) &&
                optional(example.systemId)) &&
              optional(ref.organizationId)) ||
            legacyReferences && !unique(legacyReferences.map(ref => ref.id))))
    return false;
  if (mappingDecisions !== undefined &&
        (!Array.isArray(mappingDecisions) ||
            !mappingDecisions.every(decision => {
              if (!record(decision) ||
                    !string(decision.referenceId) ||
                    !member(decision.action, ["link", "keepLabel", "defer"]) ||
                    !string(decision.decidedByUserId) ||
                    !iso(decision.decidedAt) ||
                    !Number.isInteger(decision.version) ||
                    Number(decision.version) < 1 ||
                    !optional(decision.note))
                return false;
              const project = projects.find(project => record(project) && project.id === decision.projectId);
              if (decision.projectId !== undefined && (!string(decision.projectId) || !project)) return false;
              if (decision.action === "link" && !project) return false;
              if (decision.systemMappings !== undefined) {
                if (!Array.isArray(decision.systemMappings) ||
                      !decision.systemMappings.every(mapping => record(mapping) &&
                        string(mapping.recordRef) &&
                        string(mapping.systemId) &&
                        string(mapping.note) &&
                        systems.some(system => record(system) && system.id === mapping.systemId && system.projectId === project?.id)))
                  return false;
              }
              return true;
            }) ||
            !unique(mappingDecisions.map(decision => decision.referenceId))))
    return false;
  const { people, roles, tombstones } = value;
  if (people !== undefined || roles !== undefined || tombstones !== undefined) {
    if (!Array.isArray(people) || !Array.isArray(roles) || !Array.isArray(tombstones)) return false;
    if (!roles.every(r => record(r) &&
          string(r.key) &&
          string(r.name) &&
          typeof r.active === "boolean" &&
          typeof r.protected === "boolean" &&
          Number.isInteger(r.sortOrder) &&
          Number(r.sortOrder) >= 0 &&
          optional(r.description)) ||
          !unique(roles.map(r => r.key)) ||
          !unique(roles.map(r => r.name.trim().toLowerCase())))
      return false;
    if (!people.every(p => record(p) &&
          string(p.id) &&
          string(p.fullName) &&
          string(p.roleKey) &&
          roles.some(r => r.key === p.roleKey) &&
          dates(p) &&
          member(p.status, ["active", "inactive", "archived"]) &&
          optionalStrings(p, ["employeeId", "email", "phone", "joinDate", "notes"]) &&
          (p.defaultShift === undefined || member(p.defaultShift, ["subuh", "pagi", "malam"])) &&
          (p.joinDate === undefined || /^\d{4}-\d{2}-\d{2}$/.test(String(p.joinDate)))) ||
          !unique(people.map(p => p.id)))
      return false;
    if (!tombstones.every(t => record(t) &&
          string(t.id) &&
          string(t.nameSnapshot) &&
          string(t.by) &&
          iso(t.at) &&
          member(t.type, ["organization", "project", "system", "category", "person", "role"])))
      return false;
  }
  return audit.every(a => record(a) &&
    string(a.id) &&
    string(a.entityId) &&
    iso(a.at) &&
    string(a.byUserId) &&
    string(a.byName) &&
    member(a.entityType, ["organization", "project", "system", "category", "severity", "mapping", "backup", "person", "role"]) &&
    Array.isArray(a.changes) &&
    a.changes.every(c => record(c) && string(c.field))) &&
    idempotency.every(i => record(i) &&
      string(i.key) &&
      string(i.entityId) &&
      string(i.fingerprint) &&
      member(i.entity, ["organization", "project", "system", "category", "severity"]));
}

export function projectToLegacy(project: Project, users: readonly { id: string; name: string }[] = []): ProjectMaster {
  return {
    ...project.legacy, id: project.id, clientId: project.organizationId, name: project.legacyKey, code: project.code,
    displayName: project.name !== project.legacyKey ? project.name : undefined,
    fullName: project.name === project.legacy?.name ? project.legacy?.fullName || project.name : project.name,
    detail: project.scope || "", leadEngineer: users.find(u => u.id === project.leadUserId)?.name || project.legacy?.leadEngineer,
    healthDefault: project.legacy?.healthDefault, status: project.status, createdAt: project.createdAt, updatedAt: project.updatedAt,
  };
}
export function systemToLegacy(system: System, projects: readonly Project[]): SystemMaster {
  return {
    ...system.legacy,
    id: system.id,
    clientId: projects.find(p => p.id === system.projectId)?.organizationId || "",
    projectId: system.projectId,
    name: system.name,
    // the two fields are no longer collected; pages that still read the legacy shape get the values they always had, or a neutral default
    environment: system.environment ?? "Production",
    criticality: system.criticality ?? "medium",
    status: system.status === "active" ? system.legacyCondition || "active" : "deprecated",
    createdAt: system.createdAt,
    updatedAt: system.updatedAt
  };
}
export function organizationToLegacy(organization: Organization, projects: readonly Project[], systems: readonly System[], users: readonly { id: string; name: string; email?: string; phone?: string }[] = []): ClientOrganization {
  const user = users.find(u => u.id === organization.picUserId), contact = organization.picContact;
  return {
    ...organization.legacy,
    id: organization.id,
    name: organization.name,
    shortName: organization.shortName || organization.name,
    code: organization.code,
    status: organization.status,
    tagline: organization.legacy?.tagline || organization.description || "",
    description: organization.description,
    tier: organization.legacy?.tier || "Standard",
    picName: user?.name || contact?.name || "",
    picEmail: user?.email || contact?.email || "",
    picPhone: user?.phone || contact?.phone,
    systemsCount: systems.filter(s => projects.some(p => p.id === s.projectId && p.organizationId === organization.id) && s.status !== "archived").length,
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt
  };
}

/** Safe, cycle-free bridge for legacy synchronous clientData selectors. */
type MasterProjection = { projects: ProjectMaster[]; systems: SystemMaster[]; canonicalProjects: readonly Project[]; organizationStatuses: Record<string, Organization["status"]> };
let publishedProjection: MasterProjection | null = null;
export function publishMasterProjection(snapshot: MasterSnapshotV2, users: readonly { id: string; name: string }[] = []): void {
  if (typeof window !== "undefined")
    publishedProjection = {
      projects: snapshot.projects.map(p => projectToLegacy(p, users)),
      systems: snapshot.systems.map(s => systemToLegacy(s, snapshot.projects)),
      canonicalProjects: snapshot.projects,
      organizationStatuses: Object.fromEntries(snapshot.organizations.map(o => [o.id, o.status]))
    };
}
export function readMasterProjection(): MasterProjection | null {
  if (typeof window === "undefined") return null;
  if (publishedProjection) return publishedProjection;
  try {
    const raw = localStorage.getItem(MASTER_STORAGE_KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (!isMasterV2(data)) return null;
    return {
      projects: data.projects.map(p => projectToLegacy(p)),
      systems: data.systems.map(s => systemToLegacy(s, data.projects)),
      canonicalProjects: data.projects,
      organizationStatuses: Object.fromEntries(data.organizations.map(o => [o.id, o.status]))
    };
  } catch {
    return null;
  }
}
