import type { CategoryColorKey } from "@/app/lib/category-colors";

/**
 * Central Tracking Dashboard - Master Data Types
 *
 * Mendefinisikan kontrak tipe untuk Master Data:
 * - ClientOrganization (Organisasi Klien)
 * - ProjectMaster (Proyek / Layanan di bawah Klien)
 * - SystemMaster (Modul / Sub-Layanan di bawah Proyek)
 *
 * Kompatibel dengan DTO NestJS nanti:
 * - GET /api/master/clients, POST, PUT /:id, PATCH /:id/status
 * - GET /api/master/projects, POST, PUT /:id, PATCH /:id/status
 * - GET /api/master/systems, POST, PUT /:id, PATCH /:id/status
 */

export type ClientTier =
  | "Enterprise"
  | "Standard"
  | "Internal"
  | "Enterprise NOC"
  | "Mission Critical"
  | "Dedicated SLA";

export type ClientStatus = "active" | "inactive" | "archived";

export interface ClientOrganization {
  id: string; // slug unik: "tritronik", "bni", "telkomsel", dll.
  name: string; // Nama organisasi: "PT Tritronik Teknologi Indonesia"
  shortName: string; // Nama ringkas: "Tritronik"
  code: string; // Kode unik: "TTN", "BNI", "TSEL" (case-insensitive)
  tagline: string; // Deskripsi singkat / spesialisasi
  avatarBg?: string;
  avatarColor?: string;
  borderColor?: string;
  tier: ClientTier;
  status: ClientStatus;
  picName: string; // Person In Charge
  picEmail: string; // Email PIC valid
  picPhone?: string; // Kontak PIC opsional
  description?: string;
  logoUrl?: string;
  createdAt: string; // ISO 8601 UTC
  updatedAt: string; // ISO 8601 UTC
  systemsCount?: number; // legacy backward-compatibility
}

export type ProjectStatus = "active" | "archived";
export type ProjectHealthDefault = "healthy" | "degraded" | "critical";

export interface ProjectMaster {
  id: string; // Format: "proj-{clientId}-{code/slug}"
  clientId: string; // Relasi ke ClientOrganization.id
  name: string; // Nama ringkas proyek: "SM", "EPC Core", "B2B"
  displayName?: string; // v2 label; name remains the stable historical key.
  fullName: string; // Nama lengkap proyek: "Service Management & Middleware"
  code: string; // Kode unik dalam klien: "SM", "EPC"
  detail: string; // Deskripsi lingkup layanan / health detail default
  leadEngineer?: string; // Lead Engineer / PIC teknis proyek
  healthDefault?: ProjectHealthDefault;
  status: ProjectStatus;
  createdAt: string; // ISO 8601 UTC
  updatedAt?: string; // ISO 8601 UTC
}

export type SystemCriticality = "critical" | "high" | "medium" | "low";
export type SystemEnvironment = "Production" | "Staging" | "DRC";
export type SystemStatus = "active" | "maintenance" | "deprecated";

export interface SystemMaster {
  id: string; // Format: "sys-{clientId}-{projectId}-{slug}"
  clientId: string; // Relasi ke ClientOrganization.id
  projectId: string; // Relasi ke ProjectMaster.id
  name: string; // Nama sistem: "OCS Billing", "Switching ATM"
  criticality: SystemCriticality;
  environment: SystemEnvironment;
  status: SystemStatus;
  createdAt?: string; // ISO 8601 UTC
  updatedAt?: string; // ISO 8601 UTC
}

export interface MasterDataPayload {
  version: number;
  clients: ClientOrganization[];
  projects: ProjectMaster[];
  systems: SystemMaster[];
  lastSaved: string;
}

export interface CreateClientInput {
  name: string;
  shortName?: string;
  code: string;
  tier: ClientTier;
  picName: string;
  picEmail: string;
  picPhone?: string;
  description?: string;
}

export interface UpdateClientInput {
  name?: string;
  shortName?: string;
  code?: string;
  tier?: ClientTier;
  status?: ClientStatus;
  picName?: string;
  picEmail?: string;
  picPhone?: string;
  description?: string;
}

export interface CreateProjectInput {
  clientId: string;
  name: string;
  fullName: string;
  code: string;
  detail: string;
  leadEngineer?: string;
  healthDefault?: ProjectHealthDefault;
}

export interface UpdateProjectInput {
  name?: string;
  fullName?: string;
  code?: string;
  detail?: string;
  leadEngineer?: string;
  healthDefault?: ProjectHealthDefault;
  status?: ProjectStatus;
}

export interface CreateSystemInput {
  clientId: string;
  projectId: string;
  name: string;
  criticality: SystemCriticality;
  environment: SystemEnvironment;
  status?: SystemStatus;
}

export interface UpdateSystemInput {
  name?: string;
  projectId?: string;
  criticality?: SystemCriticality;
  environment?: SystemEnvironment;
  status?: SystemStatus;
}

// Canonical v2 model. Legacy interfaces above are read projections for existing
// operational pages; conversion is isolated in lib/master-data-model.ts.
export type OrganizationKind = "tenant" | "client";
export type AdministrativeStatus = "active" | "inactive" | "archived";
export type MasterEntity = "organization" | "project" | "system" | "category" | "severity";
export type SeverityCode = "critical" | "high" | "medium" | "low";
export interface ExternalPic { name: string; email?: string; phone?: string }
export interface Organization {
  id: string;
  kind: OrganizationKind;
  code: string;
  name: string;
  shortName?: string;
  description?: string;
  /** Square logo: a small PNG/JPEG/WebP data URL made in the browser, or an http(s) URL once a server stores files. */
  logoUrl?: string;
  picUserId?: string;
  picContact?: ExternalPic;
  status: AdministrativeStatus;
  createdAt: string;
  updatedAt: string;
  /** Read-only presentation fields needed by existing operational pages. */
  legacy?: Omit<ClientOrganization, "systemsCount">;
}
export interface Project {
  id: string;
  organizationId: string;
  relatedClientIds?: string[];
  code: string;
  name: string;
  shortName?: string;
  scope?: string;
  logoUrl?: string;
  leadUserId?: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  /** Stable historical project string; never rewritten when a label changes. */
  legacyKey: string;
  legacy?: ProjectMaster;
}
export interface System {
  id: string;
  projectId: string;
  name: string;
  code: string;
  /** @deprecated No longer asked for or written; values saved earlier are kept as they were. */
  environment?: SystemEnvironment;
  /** @deprecated No longer asked for or written; values saved earlier are kept as they were. */
  criticality?: SystemCriticality;
  picUserId?: string;
  description?: string;
  referenceUrl?: string;
  logoUrl?: string;
  status: AdministrativeStatus;
  createdAt: string;
  updatedAt: string;
  legacy?: SystemMaster;
  legacyCondition?: "maintenance";
}
export interface TicketCategory {
  id: string;
  key: string;
  name: string;
  description?: string;
  /** Palette key (see lib/category-colors). Always present after migration; optional here so older snapshots still type-check. */
  color?: CategoryColorKey;
  active: boolean;
  sortOrder: number;
  readonly usageCount: number;
}
export interface Severity {
  code: SeverityCode;
  displayName: string;
  description?: string;
  readonly level: 1 | 2 | 3 | 4;
  readonly color: string;
  readonly usageCount: number;
}
/** Team entities: people and operational roles (stage 1 of the scope review). */
export type TeamEntity = "person" | "role";
export type AnyMasterEntity = MasterEntity | TeamEntity;
export type ShiftKey = "subuh" | "pagi" | "malam";
export interface Person {
  id: string;
  fullName: string;
  /** Legacy roster members may lack these; they are required only when saved from the form. */
  employeeId?: string;
  email?: string;
  phone?: string;
  roleKey: string;
  defaultShift?: ShiftKey;
  /** ISO date (YYYY-MM-DD). */
  joinDate?: string;
  status: AdministrativeStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
export interface Role {
  /** Stable, immutable; the five seed roles keep their historical display string. */
  key: string;
  name: string;
  description?: string;
  active: boolean;
  sortOrder: number;
  /** Application logic depends on this role: it cannot be deactivated or deleted. */
  protected: boolean;
  /** Active people holding the role (derived). */
  readonly usageCount: number;
}
export interface MasterTombstone { type: AnyMasterEntity; id: string; nameSnapshot: string; at: string; by: string }
export type AuditEntityType = AnyMasterEntity | "mapping" | "backup";
export interface AuditEntry {
  id: string;
  entityType: AuditEntityType;
  entityId: string;
  at: string;
  byUserId: string;
  byName: string;
  changes: { field: string; from: unknown; to: unknown }[];
  /** Marks the creation / hard-delete entries; older entries without it are never rewritten. */
  kind?: "create" | "delete";
}
export interface MasterActor { id: string; name: string; role: string; email?: string; employeeId?: string }
export type LegacySourceType = "ticket" | "checkpoint" | "handover";
export type LegacyReferenceStatus = "unmapped" | "ambiguous" | "mapped" | "label" | "deferred";
export interface LegacyReferenceExample {
  recordRef: string;
  label: string;
  active: boolean;
  rawProject: string;
  projectId?: string;
  systemId?: string;
}
export interface LegacyReference {
  id: string;
  organizationId?: string;
  sourceType: LegacySourceType;
  rawValue: string;
  count: number;
  examples: LegacyReferenceExample[];
  status: LegacyReferenceStatus;
  candidates: string[];
}
export type MappingAction = "link" | "keepLabel" | "defer";
export interface SystemMapping { recordRef: string; systemId: string; note: string }
export interface MappingDecision {
  referenceId: string;
  action: MappingAction;
  projectId?: string;
  systemMappings?: SystemMapping[];
  note?: string;
  decidedByUserId: string;
  decidedAt: string;
  version: number;
}
export interface MappingDecisionInput {
  action: MappingAction;
  projectId?: string | null;
  systemMappings?: { recordRef: string; systemId: string; note: string }[];
  note?: string;
}
export type ReviewFindingType =
  | "pic_missing"
  | "pic_legacy"
  | "reference_unmapped"
  | "reference_ambiguous"
  | "parent_inactive"
  | "system_coverage"
  | "invalid_relation";
export type ReviewSeverity = "info" | "warning" | "error";
export interface ReviewFinding {
  id: string;
  type: ReviewFindingType;
  severity: ReviewSeverity;
  entityType: MasterEntity | "reference";
  entityId: string;
  organizationId?: string;
  recordName: string;
  summary: string;
  referenceCount: number;
  referenceId?: string;
  action: "detail" | "mapping";
}
export interface MasterSourceBreakdown { id: number; mapped: number; unclear: number }
export interface MasterRelationUsage { total: number; active: number; bySource: MasterSourceBreakdown }
export interface MasterUsageExample {
  recordRef: string;
  sourceType: LegacySourceType;
  label: string;
  active: boolean;
  via: "id" | "mapped" | "unclear";
  rawProject: string;
  projectId?: string;
  systemId?: string;
}
export interface MasterImpactRelations {
  tickets: MasterRelationUsage;
  checkpoints: MasterRelationUsage;
  handovers: MasterRelationUsage;
}
export interface MappingUsageTotals {
  reference: { tickets: number; checkpoints: number; handovers: number };
  project?: { id: string; tickets: number; checkpoints: number; handovers: number };
  system?: { id: string; tickets: number; checkpoints: number; handovers: number };
}
export interface MappingImpactPreview {
  before: MappingUsageTotals;
  after: MappingUsageTotals;
  affected: MasterUsageExample[];
  warnings: string[];
}
export interface MasterSnapshotV2 {
  version: 2;
  /** Optional marker for the extended v2 schema; old v2 data is still valid. 4 adds people, roles and tombstones. */
  schemaRevision?: 3 | 4 | 5 | 6;
  organizations: Organization[];
  projects: Project[];
  systems: System[];
  categories: Omit<TicketCategory, "usageCount">[];
  severities: Omit<Severity, "usageCount" | "color">[];
  audit: AuditEntry[];
  lastSavedAt: string;
  revision: number;
  idempotency: { key: string; entity: MasterEntity; entityId: string; fingerprint: string }[];
  legacyReferences?: LegacyReference[];
  mappingDecisions?: MappingDecision[];
  /** schemaRevision 4. Optional in the type so cancelled (hidden) P0 code keeps compiling; the repository always normalizes them. */
  people?: Person[];
  roles?: Omit<Role, "usageCount">[];
  tombstones?: MasterTombstone[];
}
export interface MasterRecordMap {
  organization: Organization;
  project: Project;
  system: System;
  category: TicketCategory;
  severity: Severity;
}
export type OrganizationInput = Omit<Organization, "id" | "createdAt" | "updatedAt" | "legacy" | "picUserId" | "picContact"> & { picUserId?: string | null; picContact?: ExternalPic | null };
export type ProjectInput = Omit<Project, "id" | "createdAt" | "updatedAt" | "legacy" | "legacyKey" | "leadUserId"> & { leadUserId?: string | null };
export type SystemInput = Omit<System, "id" | "createdAt" | "updatedAt" | "legacy" | "legacyCondition" | "picUserId"> & { picUserId?: string | null };
/** `sortOrder` is optional: the form no longer asks for it, a new category goes last and "Atur urutan" is the only way to move it. */
export type TicketCategoryInput = Pick<TicketCategory, "name" | "description" | "active" | "color"> & Partial<Pick<TicketCategory, "sortOrder">>;
export type SeverityInput = Pick<Severity, "displayName" | "description">;
export interface MasterInputMap {
  organization: OrganizationInput;
  project: ProjectInput;
  system: SystemInput;
  category: TicketCategoryInput;
  severity: SeverityInput;
}
export type PersonInput = Pick<Person, "fullName" | "roleKey"> & Partial<Pick<Person, "employeeId" | "email" | "phone" | "joinDate" | "notes" | "status">> & { defaultShift?: ShiftKey | null };
export type RoleInput = Pick<Role, "name" | "description" | "active">;
export interface PersonUsageItem { id: string; label: string; active?: boolean }
export interface PersonUsage {
  organizations: PersonUsageItem[];
  projects: PersonUsageItem[];
  systems: PersonUsageItem[];
  /** Tickets under the person's name or id (conservative exact match). */
  tickets: number;
  activeTickets: number;
  ticketExamples: PersonUsageItem[];
  handovers: number;
  checkpoints: number;
  /** Working days in the stored schedule plus shift-swap requests. */
  scheduleEntries: number;
  swapRequests: number;
  /** Audit entries other than the creation entry. */
  auditEntries: number;
  isSelf: boolean;
  /** Set when the person is the only active holder of a protected role. */
  lastHolderOf?: string;
  canDelete: boolean;
  deleteReason?: string;
  canDeactivate: boolean;
  deactivateReason?: string;
}
export interface RoleUsage {
  activePeople: number;
  inactivePeople: number;
  canDelete: boolean;
  deleteReason?: string;
  canDeactivate: boolean;
  deactivateReason?: string;
}
export interface MasterDeleteCheck { canDelete: boolean; reason?: string }
export interface MasterQuery {
  q?: string;
  status?: string;
  kind?: OrganizationKind | "all";
  organizationId?: string;
  projectId?: string;
  roleKey?: string;
  review?: boolean;
  sort?: "name" | "-name" | "updated" | "-updated" | "order" | "-usage";
  page?: number;
  pageSize?: 10 | 25 | 50;
}
export interface MasterPage<T> { data: T[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }
export interface MasterImpact {
  organizations: number;
  projects: number;
  systems: number;
  checkpoints: number;
  activeCheckpoints: number;
  tickets: number;
  activeTickets: number;
  handovers: number;
  activeHandovers: number;
  parentActive: boolean;
  parentReason?: string;
  parentStatus?: string;
  recordStatus?: string;
  newWorkAvailable?: boolean;
  coverageComplete?: boolean;
  unclearReferences?: number;
  mappedReferences?: number;
  idReferences?: number;
  relations?: MasterImpactRelations;
  examples?: MasterUsageExample[];
  /** Hard delete is allowed only for records that were never used. */
  canDelete?: boolean;
  deleteReason?: string;
}
export type MasterSaveStatus = "saving" | "saved" | "failed" | "session";
export interface MasterSyncState { status: MasterSaveStatus; lastSavedAt: string | null; revision: number; ready: boolean; error?: string }
