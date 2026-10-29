/** Cancelled P0 feature (hidden behind MASTER_DATA_P0_ENABLED): review, mapping decisions and JSON backup. */
import { adoptWritten, clone, directory, error, load, masterSourceRecords, persist, prepare, sessionActor, setSync } from "./master-store";
import { ApiError } from "@/app/lib/api/errors";
import { actorCanBackupManage, actorCanMappingDecide, canReviewRead, masterRole } from "@/app/lib/permissions";
import { MASTER_RECOVERY_KEY, MASTER_STORAGE_KEY, masterId, masterNow } from "@/app/lib/master-data-model";
import {
  buildBackup,
  validateBackupText,
  BACKUP_APP_NAME,
  BACKUP_SCHEMA_VERSION,
  type MasterBackupFile,
  type RestorePreview
} from "@/app/lib/master-backup";
import {
  buildLegacyReferences,
  buildMappingPreview,
  buildReview,
  validateMappingDecision,
  type ReviewResult
} from "@/app/lib/master-review";
import type {
  AuditEntry,
  LegacyReference,
  MappingDecision,
  MappingDecisionInput,
  MappingImpactPreview,
  MasterSnapshotV2
} from "@/app/types/master-data";

export function review(actor = sessionActor): ReviewResult {
  if (!canReviewRead(masterRole(actor))) error(403, "Anda tidak memiliki izin membaca temuan.", "FORBIDDEN");
  const data = load();
  return buildReview(data, masterSourceRecords(data), directory(data).map(user => user.id));
}

export function references(actor = sessionActor): LegacyReference[] { return review(actor).references; }

export function mappingPreview(referenceId: string, input: MappingDecisionInput, actor = sessionActor): MappingImpactPreview {
  if (!canReviewRead(masterRole(actor))) error(403, "Anda tidak memiliki izin membaca referensi.", "FORBIDDEN");
  const data = load();
  return buildMappingPreview(data, masterSourceRecords(data), referenceId, input);
}

export function decideMapping(referenceId: string, input: MappingDecisionInput, actor = sessionActor): MappingDecision {
  if (!actorCanMappingDecide(actor)) error(403, "Hanya Pengelola Master Data yang dapat memutuskan pemetaan.", "FORBIDDEN");
  const data = load(), result = buildReview(data, masterSourceRecords(data), directory(data).map(user => user.id));
  const reference = result.references.find(item => item.id === referenceId);
  const invalid = validateMappingDecision(data, reference, input, masterSourceRecords(data));
  if (invalid)
    throw new ApiError({ status: invalid.code === "NOT_FOUND" ? 404 : invalid.code === "INVALID_PARENT" ? 422 : 422, message: invalid.message, code: invalid.code, details: invalid.field ? { field: invalid.field } : undefined });
  const previous = data.mappingDecisions?.find(item => item.referenceId === referenceId);
  const at = masterNow();
  const systemMappings = input.systemMappings?.filter(mapping => mapping.systemId).map(mapping => ({ recordRef: mapping.recordRef, systemId: mapping.systemId, note: mapping.note.trim() })) ||
    [];
  const decision: MappingDecision = {
    referenceId, action: input.action,
    projectId: input.action === "link" ? input.projectId || undefined : undefined,
    ...(systemMappings.length ? { systemMappings } : {}),
    note: input.note?.trim() || undefined,
    decidedByUserId: actor.id, decidedAt: at, version: (previous?.version || 0) + 1,
  };
  const next = clone(data);
  next.mappingDecisions = [decision, ...(next.mappingDecisions || []).filter(item => item.referenceId !== referenceId)];
  next.audit.unshift(
    { id: masterId("audit"), entityType: "mapping", entityId: referenceId, at, byUserId: actor.id, byName: actor.name, changes: [
      { field: "action", from: previous?.action ?? null, to: decision.action },
      { field: "projectId", from: previous?.projectId ?? null, to: decision.projectId ?? null },
      { field: "systemMappings", from: previous?.systemMappings ?? null, to: decision.systemMappings ?? null },
      { field: "note", from: previous?.note ?? null, to: decision.note ?? null },
      { field: "version", from: previous?.version ?? null, to: decision.version },
    ] }
  );
  next.revision++; next.lastSavedAt = at;
  persist(next);
  return clone(decision);
}

export function listMappingAudit(referenceId?: string): AuditEntry[] {
  return clone(load().audit.filter(entry => entry.entityType === "mapping" && (!referenceId || entry.entityId === referenceId)));
}

export function backupData(actor = sessionActor): MasterBackupFile {
  if (!actorCanBackupManage(actor)) error(403, "Anda tidak memiliki izin mengelola cadangan.", "FORBIDDEN");
  const data = load();
  return buildBackup(data, buildLegacyReferences(data, masterSourceRecords(data)), masterNow());
}

export function previewRestore(content: string, fileName: string | undefined, actor = sessionActor): RestorePreview {
  if (!actorCanBackupManage(actor)) error(403, "Anda tidak memiliki izin memulihkan cadangan.", "FORBIDDEN");
  const data = load();
  return validateBackupText(content, data, masterSourceRecords(data), { fileName, now: masterNow() }).preview;
}

export function restoreBackup(content: string, fileName: string | undefined, actor = sessionActor): RestorePreview {
  if (!actorCanBackupManage(actor)) error(403, "Anda tidak memiliki izin memulihkan cadangan.", "FORBIDDEN");
  const data = load(), now = masterNow(), validated = validateBackupText(content, data, masterSourceRecords(data), { fileName, now });
  const next: MasterSnapshotV2 = {
    ...validated.snapshot, version: 2, schemaRevision: 4, idempotency: [], revision: data.revision + 1, lastSavedAt: now,
    audit: [{ id: masterId("audit"), entityType: "backup", entityId: "master", at: now, byUserId: actor.id, byName: actor.name, changes: [
      { field: "Cadangan", from: null, to: fileName || "berkas JSON" },
      { field: "Organisasi", from: data.organizations.length, to: validated.snapshot.organizations.length },
      { field: "Proyek", from: data.projects.length, to: validated.snapshot.projects.length },
      { field: "Sistem", from: data.systems.length, to: validated.snapshot.systems.length },
      { field: "Pemetaan", from: data.mappingDecisions?.length || 0, to: validated.snapshot.mappingDecisions?.length || 0 },
    ] }, ...validated.snapshot.audit],
  };
  const prepared = prepare(next);
  const recovery = JSON.stringify({ schemaVersion: BACKUP_SCHEMA_VERSION, appName: BACKUP_APP_NAME, exportedAt: now, reason: "restore", fileName, data });
  const raw = JSON.stringify(prepared);
  try {
    if (typeof window === "undefined" || !window.localStorage) throw new Error("NO_STORAGE");
    window.localStorage.setItem(MASTER_RECOVERY_KEY, recovery);
    window.localStorage.setItem(MASTER_STORAGE_KEY, raw);
  } catch {
    error(500, "Gagal menulis cadangan. Data lama tetap utuh.", "RESTORE_WRITE_FAILED");
  }
  adoptWritten(prepared, raw);
  setSync({ ready: true, status: "saved", revision: prepared.revision, lastSavedAt: prepared.lastSavedAt, error: undefined });
  return validated.preview;
}
