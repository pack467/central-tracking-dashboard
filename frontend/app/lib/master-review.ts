import type {
  LegacyReference,
  LegacySourceType,
  MappingDecision,
  MappingDecisionInput,
  MappingImpactPreview,
  MappingUsageTotals,
  MasterImpact,
  MasterRelationUsage,
  MasterSnapshotV2,
  MasterUsageExample,
  Project,
  ReviewFinding,
  ReviewFindingType,
  ReviewSeverity,
  System,
} from "@/app/types/master-data";
import { matchesLegacyProject, resolveMasterProject } from "./master-data-model";

export interface SourceRecord {
  recordRef: string;
  sourceType: LegacySourceType;
  organizationId?: string;
  rawValue: string;
  label: string;
  active: boolean;
  projectId?: string;
  systemId?: string;
  assessmentKey?: string;
  categoryKey?: string;
  severityCode?: string;
}

export interface ReviewResult {
  references: LegacyReference[];
  findings: ReviewFinding[];
  sourceRecords: SourceRecord[];
}

export interface RecordResolution {
  project?: Project;
  via: "id" | "mapped" | "unclear";
  system?: System;
  systemVia?: "id" | "mapped";
}

const SOURCE_LABELS: Record<LegacySourceType, string> = { ticket: "Tiket", checkpoint: "Checkpoint", handover: "Handover" };
const STATUS_LABELS: Record<string, string> = { active: "Aktif", inactive: "Nonaktif", archived: "Arsip" };
const TYPE_ORDER: Record<ReviewFindingType, number> = {
  invalid_relation: 0,
  parent_inactive: 1,
  reference_ambiguous: 2,
  reference_unmapped: 3,
  pic_missing: 4,
  pic_legacy: 5,
  system_coverage: 6
};
const SEVERITY_ORDER: Record<ReviewSeverity, number> = { error: 0, warning: 1, info: 2 };

export const REVIEW_TYPE_LABELS: Record<ReviewFindingType, string> = {
  pic_missing: "PIC belum ditetapkan",
  pic_legacy: "PIC lama",
  reference_unmapped: "Referensi belum terpetakan",
  reference_ambiguous: "Ambigu",
  parent_inactive: "Induk nonaktif",
  system_coverage: "Cakupan sistem",
  invalid_relation: "Relasi tidak valid",
};
export const REVIEW_SEVERITY_LABELS: Record<ReviewSeverity, string> = { error: "Perlu diperbaiki", warning: "Perlu ditinjau", info: "Informasi" };
export const REFERENCE_STATUS_LABELS: Record<LegacyReference["status"], string> = { unmapped: "Belum terpetakan", ambiguous: "Ambigu", mapped: "Terpetakan", label: "Label operasional", deferred: "Ditunda" };

export function referenceIdFor(sourceType: LegacySourceType, organizationId: string | undefined, rawValue: string): string {
  return `ref:${sourceType}:${organizationId || "unknown"}:${encodeURIComponent(rawValue.trim().toLowerCase())}`;
}

function projectKeys(project: Project): string[] {
  return [project.id, project.legacyKey, project.legacy?.name, project.legacy?.code].filter((key): key is string => !!key);
}

function referenceCandidates(catalog: MasterSnapshotV2, rawValue: string, organizationId?: string): Project[] {
  if (!organizationId) return [];
  const scoped = catalog.projects.filter(project => project.organizationId === organizationId);
  const needle = rawValue.trim().toLowerCase();
  const exact = scoped.filter(project => projectKeys(project).some(key => key.toLowerCase() === needle));
  if (exact.length) return exact;
  return scoped.filter(project => projectKeys(project).some(key => matchesLegacyProject(rawValue, key)));
}

function referenceStatus(reference: Omit<LegacyReference, "status">, decision: MappingDecision | undefined): LegacyReference["status"] {
  if (decision) {
    if (decision.action === "link") return "mapped";
    if (decision.action === "keepLabel") return "label";
    return "deferred";
  }
  if (reference.candidates.length > 1) return "ambiguous";
  if (reference.candidates.length === 1) return "mapped";
  return "unmapped";
}

export function buildLegacyReferences(catalog: MasterSnapshotV2, records: readonly SourceRecord[]): LegacyReference[] {
  const decisions = new Map((catalog.mappingDecisions || []).map(decision => [decision.referenceId, decision]));
  const groups = new Map<string, { organizationId?: string; sourceType: LegacySourceType; rawValue: string; count: number; examples: LegacyReference["examples"]; explicit: Set<string> }>();
  for (const record of records) {
    const id = referenceIdFor(record.sourceType, record.organizationId, record.rawValue);
    let group = groups.get(id);
    if (!group) {
      group = { organizationId: record.organizationId, sourceType: record.sourceType, rawValue: record.rawValue, count: 0, examples: [], explicit: new Set() };
      groups.set(id, group);
    }
    group.count++;
    if (record.projectId) group.explicit.add(record.projectId);
    if (group.examples.length < 5) group.examples.push({ recordRef: record.recordRef, label: record.label, active: record.active, rawProject: record.rawValue, projectId: record.projectId, systemId: record.systemId });
  }
  const references = [...groups.entries()].map(([id, group]) => {
    const explicit = [...group.explicit].map(projectId => catalog.projects.find(project => project.id === projectId)).filter((project): project is Project => !!project);
    const candidates = explicit.length ? explicit : referenceCandidates(catalog, group.rawValue, group.organizationId);
    const base = {
      id,
      organizationId: group.organizationId,
      sourceType: group.sourceType,
      rawValue: group.rawValue,
      count: group.count,
      examples: group.examples,
      candidates: candidates.map(project => project.id)
    };
    return { ...base, status: referenceStatus(base, decisions.get(id)) } satisfies LegacyReference;
  });
  return references.sort((a, b) => {
    const order: Record<LegacyReference["status"], number> = { ambiguous: 0, unmapped: 1, deferred: 2, label: 3, mapped: 4 };
    return order[a.status] - order[b.status] || b.count - a.count || a.rawValue.localeCompare(b.rawValue, "id", { sensitivity: "base" });
  });
}

export function decisionMap(catalog: MasterSnapshotV2): Map<string, MappingDecision> {
  return new Map((catalog.mappingDecisions || []).map(decision => [decision.referenceId, decision]));
}

export function resolveRecord(catalog: MasterSnapshotV2, record: SourceRecord, references: readonly LegacyReference[], decisions = decisionMap(catalog)): RecordResolution {
  const referenceId = referenceIdFor(record.sourceType, record.organizationId, record.rawValue);
  const reference = references.find(item => item.id === referenceId);
  const decision = decisions.get(referenceId);
  if (record.projectId) {
    const project = catalog.projects.find(item => item.id === record.projectId && (!record.organizationId || item.organizationId === record.organizationId));
    if (project) return withSystem(catalog, record, { project, via: "id" }, decision);
  }
  if (decision?.action === "link" && decision.projectId) {
    const project = catalog.projects.find(item => item.id === decision.projectId);
    if (project) return withSystem(catalog, record, { project, via: "mapped" }, decision);
  }
  if (decision?.action === "keepLabel" || decision?.action === "defer") return { via: "unclear" };
  const project = resolveMasterProject(catalog.projects, record.projectId || record.rawValue, record.organizationId);
  if (project) return withSystem(catalog, record, { project, via: "id" }, decision);
  if (reference?.status === "mapped" && reference.candidates.length === 1) {
    const candidate = catalog.projects.find(item => item.id === reference.candidates[0]);
    if (candidate) return withSystem(catalog, record, { project: candidate, via: "id" }, decision);
  }
  return { via: "unclear" };
}

function withSystem(catalog: MasterSnapshotV2, record: SourceRecord, resolution: RecordResolution, decision: MappingDecision | undefined): RecordResolution {
  if (record.systemId) {
    const system = catalog.systems.find(item => item.id === record.systemId);
    if (system) return { ...resolution, system, systemVia: "id" };
  }
  const mapping = decision?.systemMappings?.find(item => item.recordRef === record.recordRef);
  if (mapping) {
    const system = catalog.systems.find(item => item.id === mapping.systemId);
    if (system) return { ...resolution, system, systemVia: "mapped" };
  }
  return resolution;
}

function usedReferenceCount(references: readonly LegacyReference[], organizationId: string): number {
  return references.filter(reference => reference.organizationId === organizationId).reduce((sum, reference) => sum + reference.count, 0);
}

function mappedProjectIds(reference: LegacyReference, decisions: Map<string, MappingDecision>): string[] {
  const decision = decisions.get(reference.id);
  if (decision?.action === "link" && decision.projectId) return [decision.projectId];
  return reference.status === "mapped" ? reference.candidates.slice(0, 1) : [];
}

export function buildReview(catalog: MasterSnapshotV2, records: readonly SourceRecord[], userIds: readonly string[] = []): ReviewResult {
  const references = buildLegacyReferences(catalog, records), decisions = decisionMap(catalog), findings: ReviewFinding[] = [];
  const orgs = new Map(catalog.organizations.map(org => [org.id, org]));
  const refsByOrg = new Map<string, number>();
  const mappedByProject = new Map<string, number>();
  const resolvedRecords = records.map(record => ({ record, resolution: resolveRecord(catalog, record, references, decisions) }));
  const systemRecordCount = new Map<string, number>();
  const resolvedSystemIds = new Set<string>();
  for (const { resolution } of resolvedRecords) if (resolution.system) { systemRecordCount.set(resolution.system.id, (systemRecordCount.get(resolution.system.id) || 0) + 1); resolvedSystemIds.add(resolution.system.id); }
  for (const reference of references) {
    if (reference.organizationId) refsByOrg.set(reference.organizationId, (refsByOrg.get(reference.organizationId) || 0) + reference.count);
    for (const projectId of mappedProjectIds(reference, decisions)) mappedByProject.set(projectId, (mappedByProject.get(projectId) || 0) + reference.count);
  }

  const add = (finding: Omit<ReviewFinding, "severity"> & { severity?: ReviewSeverity }) => findings.push({ ...finding, severity: finding.severity || "warning" });
  if (userIds.length) {
    for (const org of catalog.organizations) {
      if (org.picUserId && !userIds.includes(org.picUserId)) add({ id: `invalid_relation:organization:${org.id}:pic`, type: "invalid_relation", severity: "error", entityType: "organization", entityId: org.id, recordName: org.shortName || org.name, summary: "PIC internal tidak ditemukan pada sumber pengguna.", referenceCount: refsByOrg.get(org.id) || 0, action: "detail" });
    }
    for (const project of catalog.projects) {
      if (project.leadUserId && !userIds.includes(project.leadUserId)) add({ id: `invalid_relation:project:${project.id}:pic`, type: "invalid_relation", severity: "error", entityType: "project", entityId: project.id, organizationId: project.organizationId, recordName: `${project.code} — ${project.name}`, summary: "PIC proyek tidak ditemukan pada sumber pengguna.", referenceCount: mappedByProject.get(project.id) || 0, action: "detail" });
    }
    for (const system of catalog.systems) {
      if (system.picUserId && !userIds.includes(system.picUserId)) add({ id: `invalid_relation:system:${system.id}:pic`, type: "invalid_relation", severity: "error", entityType: "system", entityId: system.id, organizationId: catalog.projects.find(project => project.id === system.projectId)?.organizationId, recordName: system.name, summary: "PIC sistem tidak ditemukan pada sumber pengguna.", referenceCount: systemRecordCount.get(system.id) || 0, action: "detail" });
    }
  }
  for (const org of catalog.organizations) {
    if (org.status !== "active") continue;
    if (org.picContact) add({ id: `pic_legacy:organization:${org.id}`, type: "pic_legacy", entityType: "organization", entityId: org.id, recordName: org.shortName || org.name, summary: `PIC lama masih teks: ${org.picContact.name}.`, referenceCount: refsByOrg.get(org.id) || 0, action: "detail" });
    else if (!org.picUserId) add({ id: `pic_missing:organization:${org.id}`, type: "pic_missing", severity: "info", entityType: "organization", entityId: org.id, recordName: org.shortName || org.name, summary: "PIC organisasi belum ditetapkan.", referenceCount: refsByOrg.get(org.id) || 0, action: "detail" });
  }
  for (const project of catalog.projects) {
    const organization = orgs.get(project.organizationId);
    if (!organization) add({ id: `invalid_relation:project:${project.id}:organization`, type: "invalid_relation", severity: "error", entityType: "project", entityId: project.id, organizationId: project.organizationId, recordName: `${project.code} — ${project.name}`, summary: "Organisasi proyek tidak ditemukan.", referenceCount: mappedByProject.get(project.id) || 0, action: "detail" });
    if (project.status === "active") {
      if (!project.leadUserId) {
        if (project.legacy?.leadEngineer) add({ id: `pic_legacy:project:${project.id}`, type: "pic_legacy", entityType: "project", entityId: project.id, organizationId: project.organizationId, recordName: `${project.code} — ${project.name}`, summary: `PIC proyek masih teks: ${project.legacy.leadEngineer}.`, referenceCount: mappedByProject.get(project.id) || 0, action: "detail" });
        else add({ id: `pic_missing:project:${project.id}`, type: "pic_missing", severity: "info", entityType: "project", entityId: project.id, organizationId: project.organizationId, recordName: `${project.code} — ${project.name}`, summary: "PIC proyek belum ditetapkan.", referenceCount: mappedByProject.get(project.id) || 0, action: "detail" });
      }
      if (organization && organization.status !== "active") add({ id: `parent_inactive:project:${project.id}`, type: "parent_inactive", severity: "error", entityType: "project", entityId: project.id, organizationId: project.organizationId, recordName: `${project.code} — ${project.name}`, summary: `Organisasi induk ${STATUS_LABELS[organization.status].toLowerCase()} tetapi proyek masih aktif.`, referenceCount: mappedByProject.get(project.id) || 0, action: "detail" });
    }
  }
  for (const system of catalog.systems) {
    const project = catalog.projects.find(item => item.id === system.projectId), organization = project ? orgs.get(project.organizationId) : undefined;
    if (!project) add({ id: `invalid_relation:system:${system.id}:project`, type: "invalid_relation", severity: "error", entityType: "system", entityId: system.id, organizationId: organization?.id, recordName: system.name, summary: "Proyek induk sistem tidak ditemukan.", referenceCount: systemRecordCount.get(system.id) || 0, action: "detail" });
    if (system.status === "active") {
      const effectivePic = system.picUserId || project?.leadUserId || project?.legacy?.leadEngineer;
      if (!effectivePic) add({ id: `pic_missing:system:${system.id}`, type: "pic_missing", severity: "info", entityType: "system", entityId: system.id, organizationId: organization?.id, recordName: system.name, summary: "PIC sistem dan PIC proyek belum ditetapkan.", referenceCount: systemRecordCount.get(system.id) || 0, action: "detail" });
      if (project && (project.status !== "active" || organization && organization.status !== "active")) add({ id: `parent_inactive:system:${system.id}`, type: "parent_inactive", severity: "error", entityType: "system", entityId: system.id, organizationId: organization?.id, recordName: system.name, summary: project.status !== "active" ? `Proyek induk ${STATUS_LABELS[project.status].toLowerCase()} tetapi sistem masih aktif.` : `Organisasi induk ${STATUS_LABELS[organization!.status].toLowerCase()} tetapi sistem masih aktif.`, referenceCount: systemRecordCount.get(system.id) || 0, action: "detail" });
    }
    if (system.status === "active" && !resolvedSystemIds.has(system.id)) add({ id: `system_coverage:${system.id}`, type: "system_coverage", severity: "info", entityType: "system", entityId: system.id, organizationId: organization?.id, recordName: system.name, summary: "Belum ada referensi operasional eksplisit dengan systemId.", referenceCount: 0, action: "detail" });
  }
  for (const reference of references) {
    if (reference.status === "unmapped") add({ id: `reference_unmapped:${reference.id}`, type: "reference_unmapped", entityType: "reference", entityId: reference.id, organizationId: reference.organizationId, recordName: reference.rawValue, summary: `Label "${reference.rawValue}" dari ${SOURCE_LABELS[reference.sourceType].toLowerCase()} belum cocok ke proyek.`, referenceCount: reference.count, referenceId: reference.id, action: "mapping" });
    if (reference.status === "ambiguous") add({ id: `reference_ambiguous:${reference.id}`, type: "reference_ambiguous", entityType: "reference", entityId: reference.id, organizationId: reference.organizationId, recordName: reference.rawValue, summary: `Label "${reference.rawValue}" cocok ke ${reference.candidates.length} proyek dan tidak dipilih otomatis.`, referenceCount: reference.count, referenceId: reference.id, action: "mapping" });
    const invalid = reference.examples.some(example => example.projectId && !catalog.projects.some(project => project.id === example.projectId && project.organizationId === reference.organizationId));
    if (invalid) add({ id: `invalid_relation:reference:${reference.id}:project`, type: "invalid_relation", severity: "error", entityType: "reference", entityId: reference.id, organizationId: reference.organizationId, recordName: reference.rawValue, summary: "Referensi menunjuk proyek yang tidak valid.", referenceCount: reference.count, referenceId: reference.id, action: "mapping" });
  }
  for (const decision of catalog.mappingDecisions || []) {
    const reference = references.find(item => item.id === decision.referenceId);
    if (!reference) { add({ id: `invalid_relation:mapping:${decision.referenceId}:reference`, type: "invalid_relation", severity: "error", entityType: "reference", entityId: decision.referenceId, recordName: decision.referenceId, summary: "Keputusan pemetaan menunjuk referensi yang tidak dikenal.", referenceCount: 0, referenceId: decision.referenceId, action: "mapping" }); continue; }
    const project = catalog.projects.find(item => item.id === decision.projectId);
    if (decision.action === "link" && (!project || project.organizationId !== reference.organizationId)) add({ id: `invalid_relation:mapping:${decision.referenceId}:project`, type: "invalid_relation", severity: "error", entityType: "reference", entityId: reference.id, organizationId: reference.organizationId, recordName: reference.rawValue, summary: "Target proyek keputusan pemetaan tidak valid.", referenceCount: reference.count, referenceId: reference.id, action: "mapping" });
    if (decision.systemMappings?.some(mapping => !catalog.systems.some(system => system.id === mapping.systemId && system.projectId === project?.id))) add({ id: `invalid_relation:mapping:${decision.referenceId}:system`, type: "invalid_relation", severity: "error", entityType: "reference", entityId: reference.id, organizationId: reference.organizationId, recordName: reference.rawValue, summary: "Target sistem keputusan pemetaan tidak valid.", referenceCount: reference.count, referenceId: reference.id, action: "mapping" });
  }
  findings.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
    TYPE_ORDER[a.type] - TYPE_ORDER[b.type] ||
    a.recordName.localeCompare(b.recordName, "id", { sensitivity: "base" }));
  return { references, findings, sourceRecords: [...records] };
}

export function findingsForRecord(findings: readonly ReviewFinding[], entity: string, id: string): ReviewFinding[] {
  return findings.filter(finding => finding.entityType === entity && finding.entityId === id);
}

export function unresolvedReferenceCount(references: readonly LegacyReference[], organizationId?: string): number {
  return references.filter(reference => reference.organizationId === organizationId && (reference.status === "unmapped" || reference.status === "ambiguous")).length;
}

export function projectUnmappedCount(references: readonly LegacyReference[], organizationId: string): number {
  return references.filter(reference => reference.organizationId === organizationId && (reference.status === "unmapped" || reference.status === "ambiguous")).reduce((sum, reference) => sum + reference.count, 0);
}

function emptyUsage(): MasterRelationUsage { return { total: 0, active: 0, bySource: { id: 0, mapped: 0, unclear: 0 } }; }
function addUsage(usage: MasterRelationUsage, resolution: RecordResolution, active: boolean) {
  usage.total++; if (active) usage.active++;
  usage.bySource[resolution.via]++;
}
function relationKey(sourceType: SourceRecord["sourceType"]): "tickets" | "checkpoints" | "handovers" {
  return sourceType === "ticket" ? "tickets" : sourceType === "checkpoint" ? "checkpoints" : "handovers";
}
function checkpointActive(assessment: { verdict?: string } | undefined, record: SourceRecord): boolean {
  const verdict = assessment?.verdict;
  return verdict === "nok" || verdict === "not-adequate" || !verdict && record.active;
}
function sourceActive(record: SourceRecord, assessments: Record<string, { verdict?: string }>): boolean {
  if (record.sourceType === "checkpoint") return checkpointActive(assessments[record.assessmentKey || ""], record);
  return record.active;
}

export function computeImpact(catalog: MasterSnapshotV2, records: readonly SourceRecord[], assessments: Record<string, { verdict?: string }>, entity: string, id: string): MasterImpact {
  const references = buildLegacyReferences(catalog, records), decisions = decisionMap(catalog);
  const allResolved = records.map(record => ({ record, resolution: resolveRecord(catalog, record, references, decisions) }));
  const unresolvedOrg = new Map<string, number>();
  for (const reference of references) if (reference.organizationId && (reference.status === "unmapped" || reference.status === "ambiguous")) unresolvedOrg.set(reference.organizationId, (unresolvedOrg.get(reference.organizationId) || 0) + reference.count);
  if (entity === "category" || entity === "severity") {
    const tickets = records.filter(record => record.sourceType === "ticket" &&
      (entity === "category" ? record.categoryKey === catalog.categories.find(item => item.id === id)?.key : record.severityCode === id));
    return {
      organizations: 0,
      projects: 0,
      systems: 0,
      checkpoints: 0,
      activeCheckpoints: 0,
      tickets: tickets.length,
      activeTickets: tickets.filter(item => item.active).length,
      handovers: 0,
      activeHandovers: 0,
      parentActive: true,
      recordStatus: "active",
      parentStatus: undefined,
      newWorkAvailable: true,
      coverageComplete: true,
      unclearReferences: 0,
      mappedReferences: 0,
      idReferences: 0,
      relations: {
        tickets: { total: tickets.length, active: tickets.filter(item => item.active).length, bySource: { id: tickets.length, mapped: 0, unclear: 0 } },
        checkpoints: emptyUsage(),
        handovers: emptyUsage()
      },
      examples: []
    };
  }
  const project = entity === "project" ? catalog.projects.find(item => item.id === id) : undefined;
  const system = entity === "system" ? catalog.systems.find(item => item.id === id) : undefined;
  const scopeOrg = entity === "organization"
    ? id
    : entity === "project"
      ? project?.organizationId
      : system ? catalog.projects.find(item => item.id === system.projectId)?.organizationId : undefined;
  const relations = { tickets: emptyUsage(), checkpoints: emptyUsage(), handovers: emptyUsage() };
  const examples: MasterUsageExample[] = [];
  for (const { record, resolution } of allResolved) {
    const inOrg = !!scopeOrg && record.organizationId === scopeOrg;
    const confirmed = entity === "organization" ? inOrg : entity === "project" ? resolution.project?.id === id : resolution.system?.id === id;
    const unclear = entity === "project" ? inOrg && resolution.via === "unclear" : entity === "system" ? !!resolution.project && !resolution.system : false;
    if (!confirmed && !unclear) continue;
    if (confirmed) {
      const active = sourceActive(record, assessments);
      addUsage(relations[relationKey(record.sourceType)], resolution, active);
      if (examples.length < 5) examples.push({ recordRef: record.recordRef, sourceType: record.sourceType, label: record.label, active, via: resolution.via, rawProject: record.rawValue, projectId: resolution.project?.id, systemId: resolution.system?.id });
    } else {
      relations[relationKey(record.sourceType)].bySource.unclear++;
      if (examples.length < 5) examples.push({ recordRef: record.recordRef, sourceType: record.sourceType, label: record.label, active: record.active, via: "unclear", rawProject: record.rawValue });
    }
  }
  const parentProject = system ? catalog.projects.find(item => item.id === system.projectId) : project;
  const parentOrganization = parentProject
    ? catalog.organizations.find(org => org.id === parentProject.organizationId)
    : entity === "organization" ? catalog.organizations.find(org => org.id === id) : undefined;
  const projects = entity === "organization" ? catalog.projects.filter(item => item.organizationId === id) : project ? [project] : [];
  const systems = entity === "system" && system ? [system] : catalog.systems.filter(item => projects.some(project => project.id === item.projectId));
  const parentActive = entity === "organization"
    ? true
    : entity === "project"
      ? parentOrganization?.status === "active"
      : entity === "system" ? parentProject?.status === "active" && parentOrganization?.status === "active" : true;
  const record = entity === "organization" ? catalog.organizations.find(org => org.id === id) : entity === "project" ? project : system;
  const recordStatus = record?.status || "active";
  const unresolved = unresolvedOrg.get(scopeOrg || "") || 0;
  const projectRecords = allResolved.filter(item => item.resolution.project?.id === (entity === "project" ? id : system?.projectId));
  const systemLinked = projectRecords.filter(item => item.resolution.system?.id === id);
  const coverageComplete = entity === "organization"
    ? unresolved === 0
    : entity === "project" ? unresolved === 0 : system ? projectRecords.length > 0 && systemLinked.length === projectRecords.length : true;
  const unclearReferences = references.filter(reference => reference.organizationId === scopeOrg && (reference.status === "unmapped" || reference.status === "ambiguous")).length;
  const mappedReferences = references.filter(reference => reference.organizationId === scopeOrg && reference.status === "mapped").length;
  const idReferences = references.filter(reference => reference.organizationId === scopeOrg && reference.status === "mapped" && !decisions.get(reference.id)).length;
  return {
    organizations: entity === "organization" ? 1 : 0,
    projects: projects.length,
    systems: systems.length,
    checkpoints: relations.checkpoints.total,
    activeCheckpoints: relations.checkpoints.active,
    tickets: relations.tickets.total,
    activeTickets: relations.tickets.active,
    handovers: relations.handovers.total,
    activeHandovers: relations.handovers.active,
    parentActive,
    parentReason: parentActive
      ? undefined
      : entity === "organization"
        ? undefined
        : entity === "project"
          ? "Organisasi induk belum aktif."
          : !parentProject
            ? "Proyek induk tidak ditemukan."
            : parentProject.status !== "active" ? `Proyek induk ${STATUS_LABELS[parentProject.status].toLowerCase()}.` : "Organisasi induk belum aktif.",
    parentStatus: entity === "organization" ? undefined : entity === "project" ? parentOrganization?.status : parentProject?.status,
    recordStatus,
    newWorkAvailable: recordStatus === "active" && parentActive,
    coverageComplete,
    unclearReferences,
    mappedReferences,
    idReferences,
    relations,
    examples
  };
}

function aggregateForProject(catalog: MasterSnapshotV2, records: readonly SourceRecord[], projectId: string): MappingUsageTotals["project"] {
  const references = buildLegacyReferences(catalog, records), decisions = decisionMap(catalog);
  const result = { id: projectId, tickets: 0, checkpoints: 0, handovers: 0 };
  for (const record of records) if (resolveRecord(catalog, record, references, decisions).project?.id === projectId) result[record.sourceType === "ticket" ? "tickets" : record.sourceType === "checkpoint" ? "checkpoints" : "handovers"]++;
  return result;
}
function aggregateForSystem(catalog: MasterSnapshotV2, records: readonly SourceRecord[], systemId: string, projectId?: string): MappingUsageTotals["system"] {
  const references = buildLegacyReferences(catalog, records), decisions = decisionMap(catalog);
  const result = { id: systemId, tickets: 0, checkpoints: 0, handovers: 0 };
  for (const record of records) if (resolveRecord(catalog, record, references, decisions).system?.id === systemId && (!projectId || resolveRecord(catalog, record, references, decisions).project?.id === projectId)) result[record.sourceType === "ticket" ? "tickets" : record.sourceType === "checkpoint" ? "checkpoints" : "handovers"]++;
  return result;
}
function applyPreviewDecision(catalog: MasterSnapshotV2, referenceId: string, input: MappingDecisionInput, actorId = "preview"): MasterSnapshotV2 {
  const decision: MappingDecision = {
    referenceId,
    action: input.action,
    projectId: input.projectId || undefined,
    systemMappings: input.systemMappings?.filter(mapping => mapping.systemId),
    note: input.note?.trim() || undefined,
    decidedByUserId: actorId,
    decidedAt: new Date().toISOString(),
    version: 1
  };
  const others = (catalog.mappingDecisions || []).filter(item => item.referenceId !== referenceId);
  return { ...catalog, mappingDecisions: [...others, decision] };
}

export function buildMappingPreview(catalog: MasterSnapshotV2, records: readonly SourceRecord[], referenceId: string, input: MappingDecisionInput): MappingImpactPreview {
  const reference = buildLegacyReferences(catalog, records).find(item => item.id === referenceId);
  if (!reference)
    return {
      before: { reference: { tickets: 0, checkpoints: 0, handovers: 0 } },
      after: { reference: { tickets: 0, checkpoints: 0, handovers: 0 } },
      affected: [],
      warnings: ["Referensi tidak ditemukan."]
    };
  const refRecords = records.filter(record => referenceIdFor(record.sourceType, record.organizationId, record.rawValue) === referenceId);
  const beforeCatalog = catalog, afterCatalog = applyPreviewDecision(catalog, referenceId, input);
  const beforeResolved = refRecords.map(record => resolveRecord(beforeCatalog, record, buildLegacyReferences(beforeCatalog, records), decisionMap(beforeCatalog)));
  const afterResolved = refRecords.map(record => resolveRecord(afterCatalog, record, buildLegacyReferences(afterCatalog, records), decisionMap(afterCatalog)));
  const beforeRef = { tickets: 0, checkpoints: 0, handovers: 0 }, afterRef = { tickets: 0, checkpoints: 0, handovers: 0 };
  for (const record of refRecords) { const key = record.sourceType === "ticket" ? "tickets" : record.sourceType === "checkpoint" ? "checkpoints" : "handovers"; beforeRef[key]++; afterRef[key]++; }
  const targetProject = input.projectId || undefined;
  const targetSystem = input.systemMappings?.find(mapping => mapping.systemId)?.systemId;
  const before: MappingUsageTotals = {
    reference: beforeRef,
    project: targetProject ? aggregateForProject(beforeCatalog, records, targetProject) : undefined,
    system: targetSystem ? aggregateForSystem(beforeCatalog, records, targetSystem, targetProject) : undefined
  };
  const after: MappingUsageTotals = {
    reference: afterRef,
    project: targetProject ? aggregateForProject(afterCatalog, records, targetProject) : undefined,
    system: targetSystem ? aggregateForSystem(afterCatalog, records, targetSystem, targetProject) : undefined
  };
  const affected: MasterUsageExample[] = [];
  refRecords.forEach((record, index) => {
    const old = beforeResolved[index], next = afterResolved[index];
    if (old.project?.id !== next.project?.id || old.system?.id !== next.system?.id || old.via !== next.via)
      affected.push(
        {
          recordRef: record.recordRef,
          sourceType: record.sourceType,
          label: record.label,
          active: record.active,
          via: next.via,
          rawProject: record.rawValue,
          projectId: next.project?.id,
          systemId: next.system?.id
        }
      );
  });
  const warnings: string[] = [];
  if (!reference.organizationId) warnings.push("Organisasi sumber tidak diketahui; hanya Tetap sebagai label atau Tunda yang tersedia.");
  if (reference.status === "ambiguous") warnings.push("Referensi ambigu memerlukan catatan keputusan.");
  if (input.action === "link" && input.projectId && reference.candidates.length > 0 && !reference.candidates.includes(input.projectId))
    warnings.push("Proyek target berbeda dari calon yang ditemukan; catatan wajib diisi.");
  if (input.systemMappings?.length) warnings.push("Setiap pemetaan sistem memerlukan catatan per record.");
  return { before, after, affected, warnings };
}

export interface MappingValidationError { message: string; field?: string; code: string }
export function validateMappingDecision(catalog: MasterSnapshotV2, reference: LegacyReference | undefined, input: MappingDecisionInput, records: readonly SourceRecord[]): MappingValidationError | null {
  if (!reference) return { message: "Referensi tidak ditemukan.", code: "NOT_FOUND", field: "referenceId" };
  if (!["link", "keepLabel", "defer"].includes(input.action))
    return { message: "Keputusan tidak valid.", code: "VALIDATION_ERROR", field: "action" };
  const note = input.note?.trim() || "";
  if (note.length > 500) return { message: "Catatan maksimal 500 karakter.", code: "VALIDATION_ERROR", field: "note" };
  if (input.action === "link") {
    if (!reference.organizationId || !catalog.organizations.some(org => org.id === reference.organizationId))
      return { message: "Organisasi sumber tidak diketahui; pilih Tetap sebagai label atau Tunda.", code: "INVALID_PARENT", field: "action" };
    const project = catalog.projects.find(item => item.id === input.projectId && item.organizationId === reference.organizationId);
    if (!project) return { message: "Pilih proyek aktif dalam organisasi sumber.", code: "INVALID_PARENT", field: "projectId" };
    if (project.status !== "active") return { message: "Proyek target harus aktif.", code: "INVALID_PARENT", field: "projectId" };
    if (reference.status === "ambiguous" && !note)
      return { message: "Catatan wajib untuk keputusan pada referensi ambigu.", code: "VALIDATION_ERROR", field: "note" };
    if (reference.candidates.length && !reference.candidates.includes(project.id) && !note)
      return { message: "Catatan wajib karena target berbeda dari calon yang ditemukan.", code: "VALIDATION_ERROR", field: "note" };
  }
  if (input.action === "keepLabel" && reference.status === "ambiguous" && !note)
    return { message: "Catatan wajib untuk label pada referensi ambigu.", code: "VALIDATION_ERROR", field: "note" };
  if (input.systemMappings?.length) {
    if (input.action !== "link")
      return { message: "Pemetaan sistem hanya tersedia saat menghubungkan ke proyek.", code: "VALIDATION_ERROR", field: "systemMappings" };
    const refRecords = records.filter(record => referenceIdFor(record.sourceType, record.organizationId, record.rawValue) === reference.id);
    for (const mapping of input.systemMappings) {
      if (!mapping.systemId) continue;
      const target = catalog.systems.find(system => system.id === mapping.systemId);
      if (!target || target.projectId !== input.projectId) return { message: "Sistem target harus berada di proyek yang dipilih.", code: "INVALID_PARENT", field: "systemMappings" };
      if (!refRecords.some(record => record.recordRef === mapping.recordRef)) return { message: "Record pemetaan sistem bukan bagian dari referensi ini.", code: "INVALID_RELATION", field: "systemMappings" };
      if (!mapping.note?.trim()) return { message: "Catatan wajib untuk setiap pemetaan sistem.", code: "VALIDATION_ERROR", field: "systemMappings" };
    }
    if (!note) return { message: "Catatan keputusan wajib saat memetakan sistem.", code: "VALIDATION_ERROR", field: "note" };
  }
  return null;
}

export function usageSourceFor(reference: LegacyReference, decisions: Map<string, MappingDecision>): "id" | "mapped" | "unclear" {
  const decision = decisions.get(reference.id);
  if (decision?.action === "link") return "mapped";
  if (reference.status === "mapped") return "id";
  return "unclear";
}

export function reviewTypeLabel(type: ReviewFindingType): string { return REVIEW_TYPE_LABELS[type]; }
export { SOURCE_LABELS, STATUS_LABELS, usedReferenceCount };
