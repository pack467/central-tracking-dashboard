import { apiClient } from "@/app/lib/api/client";
import { isMockMode } from "@/app/lib/config";
import { simulateLatency } from "./mock-adapter";
import { masterRepository as repo } from "./master-data-repository";
import type {
  AuditEntry,
  LegacyReference,
  MappingDecision,
  MappingDecisionInput,
  MappingImpactPreview,
  MasterEntity,
  MasterImpact,
  MasterInputMap,
  MasterPage,
  MasterQuery,
  MasterRecordMap,
  Person,
  PersonInput,
  PersonUsage,
  Role,
  RoleInput,
  RoleUsage
} from "@/app/types/master-data";
import type { MasterBackupFile, RestorePreview } from "@/app/lib/master-backup";
import type { ReviewResult } from "@/app/lib/master-review";

const paths = { organization: "organizations", project: "projects", system: "systems", category: "categories", severity: "severities" } as const;
const path = (entity: MasterEntity, id?: string) => `/master/${paths[entity]}${id ? `/${encodeURIComponent(id)}` : ""}`;
async function mutation<T>(operation: () => Promise<T>): Promise<T> {
  repo.saving();
  try {
    const result = await operation();
    if (!isMockMode()) await masterDataV2.catalog();
    repo.settled();
    return result;
  } catch (error) {
    repo.failed(error);
    throw error;
  }
}
const enc = encodeURIComponent;
/** People master (single source of staff identity). Same { data, meta } contract as the catalog entities. */
export const masterPeople = {
  list(query: MasterQuery = {}, signal?: AbortSignal): Promise<MasterPage<Person>> {
    return isMockMode() ? simulateLatency(() => repo.listPeople(query), signal) : apiClient.get("/master/people", { params: { ...query }, signal });
  },
  async get(id: string, signal?: AbortSignal): Promise<Person> {
    if (isMockMode()) return simulateLatency(() => repo.getPerson(id), signal, true);
    return (await apiClient.get<{ data: Person }>(`/master/people/${enc(id)}`, { signal })).data;
  },
  create(input: PersonInput, requestKey: string, signal?: AbortSignal): Promise<Person> {
    return mutation(async () => isMockMode() ? simulateLatency(() => repo.createPerson(input), signal, true) : (await apiClient.post<{ data: Person }>("/master/people", input, { signal, headers: { "Idempotency-Key": requestKey } })).data);
  },
  update(id: string, input: Partial<PersonInput>, requestKey: string, signal?: AbortSignal): Promise<Person> {
    return mutation(async () => isMockMode() ? simulateLatency(() => repo.updatePerson(id, input), signal, true) : (await apiClient.put<{ data: Person }>(`/master/people/${enc(id)}`, input, { signal, headers: { "Idempotency-Key": requestKey } })).data);
  },
  setStatus(id: string, status: string, signal?: AbortSignal): Promise<Person> {
    return mutation(async () => isMockMode() ? simulateLatency(() => repo.setPersonStatus(id, status), signal, true) : (await apiClient.patch<{ data: Person }>(`/master/people/${enc(id)}/status`, { status }, { signal })).data);
  },
  async usage(id: string, signal?: AbortSignal): Promise<PersonUsage> {
    if (isMockMode()) return simulateLatency(() => repo.personUsage(id), signal, true);
    return (await apiClient.get<{ data: PersonUsage }>(`/master/people/${enc(id)}/usage`, { signal })).data;
  },
  delete(id: string, signal?: AbortSignal): Promise<void> {
    return mutation(async () => { if (isMockMode()) await simulateLatency(() => repo.deletePerson(id), signal, true); else await apiClient.delete(`/master/people/${enc(id)}`, { signal }); });
  },
  listAudit(id: string, page = 1, signal?: AbortSignal): Promise<MasterPage<AuditEntry>> {
    return isMockMode() ? simulateLatency(() => repo.listTeamAudit("person", id, page), signal) : apiClient.get(`/master/people/${enc(id)}/audit`, { params: { page }, signal });
  }
};
/** Operational roles (Peran). The role key is stable and immutable; renaming changes the display name only. */
export const masterRoles = {
  list(query: MasterQuery = {}, signal?: AbortSignal): Promise<MasterPage<Role>> {
    return isMockMode() ? simulateLatency(() => repo.listRoles(query), signal) : apiClient.get("/master/roles", { params: { ...query }, signal });
  },
  async get(key: string, signal?: AbortSignal): Promise<Role> {
    if (isMockMode()) return simulateLatency(() => repo.getRole(key), signal, true);
    return (await apiClient.get<{ data: Role }>(`/master/roles/${enc(key)}`, { signal })).data;
  },
  create(input: RoleInput, requestKey: string, signal?: AbortSignal): Promise<Role> {
    return mutation(async () => isMockMode() ? simulateLatency(() => repo.createRole(input), signal, true) : (await apiClient.post<{ data: Role }>("/master/roles", input, { signal, headers: { "Idempotency-Key": requestKey } })).data);
  },
  update(key: string, input: Partial<RoleInput>, requestKey: string, signal?: AbortSignal): Promise<Role> {
    return mutation(async () => isMockMode() ? simulateLatency(() => repo.updateRole(key, input), signal, true) : (await apiClient.put<{ data: Role }>(`/master/roles/${enc(key)}`, input, { signal, headers: { "Idempotency-Key": requestKey } })).data);
  },
  setStatus(key: string, status: string, signal?: AbortSignal): Promise<Role> {
    return mutation(async () => isMockMode() ? simulateLatency(() => repo.setRoleStatus(key, status), signal, true) : (await apiClient.patch<{ data: Role }>(`/master/roles/${enc(key)}/status`, { status }, { signal })).data);
  },
  async usage(key: string, signal?: AbortSignal): Promise<RoleUsage> {
    if (isMockMode()) return simulateLatency(() => repo.roleUsage(key), signal, true);
    return (await apiClient.get<{ data: RoleUsage }>(`/master/roles/${enc(key)}/usage`, { signal })).data;
  },
  delete(key: string, signal?: AbortSignal): Promise<void> {
    return mutation(async () => { if (isMockMode()) await simulateLatency(() => repo.deleteRole(key), signal, true); else await apiClient.delete(`/master/roles/${enc(key)}`, { signal }); });
  },
  /** One atomic request: swaps the role with its neighbour. */
  reorder(key: string, direction: number, signal?: AbortSignal): Promise<void> {
    return mutation(async () => { if (isMockMode()) await simulateLatency(() => repo.reorderRole(key, direction), signal, true); else await apiClient.patch("/master/roles/order", { key, direction }, { signal }); });
  },
  listAudit(key: string, page = 1, signal?: AbortSignal): Promise<MasterPage<AuditEntry>> {
    return isMockMode() ? simulateLatency(() => repo.listTeamAudit("role", key, page), signal) : apiClient.get(`/master/roles/${enc(key)}/audit`, { params: { page }, signal });
  },
};
export const masterDataV2 = {
  /** Hard delete for organizations, projects, systems and categories; only records that were never used. */
  delete(entity: MasterEntity, id: string, signal?: AbortSignal): Promise<void> {
    return mutation(async () => { if (isMockMode()) await simulateLatency(() => repo.remove(entity, id), signal, true); else await apiClient.delete(path(entity, id), { signal }); });
  },
  async getMetadata(signal?: AbortSignal): Promise<{ lastSavedAt: string; revision: number }> {
    if (isMockMode()) return simulateLatency(() => { const data = repo.snapshot(); return { lastSavedAt: data.lastSavedAt, revision: data.revision }; }, signal, true);
    return (await apiClient.get<{ data: { lastSavedAt: string; revision: number } }>("/master/meta", { signal })).data;
  },
  async catalog(signal?: AbortSignal) {
    if (isMockMode()) return repo.bootstrap();
    async function all<E extends MasterEntity>(entity: E) {
      const first = await masterDataV2.list(entity, { pageSize: 50 }, signal);
      const rest = await Promise.all(Array.from({ length: first.meta.totalPages - 1 }, (_, i) => masterDataV2.list(entity, { pageSize: 50, page: i + 2 }, signal)));
      return [...first.data, ...rest.flatMap(page => page.data)];
    }
    const [organizations, projects, systems, categories, severities, metadata] = await Promise.all([all("organization"), all("project"), all("system"), all("category"), all("severity"), masterDataV2.getMetadata(signal)]);
    repo.acceptServerCatalog({ organizations, projects, systems, categories: categories.map(row => ({ id: row.id, key: row.key, name: row.name, description: row.description, active: row.active, sortOrder: row.sortOrder })), severities: severities.map(row => ({ code: row.code, displayName: row.displayName, description: row.description, level: row.level })) }, metadata.lastSavedAt);
    return repo.snapshot();
  },
  list<E extends MasterEntity>(entity: E, query: MasterQuery = {}, signal?: AbortSignal): Promise<MasterPage<MasterRecordMap[E]>> {
    return isMockMode() ? simulateLatency(() => repo.list(entity, query), signal) : apiClient.get(path(entity), { params: { ...query }, signal });
  },
  async get<E extends MasterEntity>(entity: E, id: string, signal?: AbortSignal): Promise<MasterRecordMap[E]> {
    if (isMockMode()) return simulateLatency(() => repo.get(entity, id), signal, true);
    return (await apiClient.get<{ data: MasterRecordMap[E] }>(path(entity, id), { signal })).data;
  },
  create<E extends MasterEntity>(entity: E, input: MasterInputMap[E], requestKey: string, signal?: AbortSignal): Promise<MasterRecordMap[E]> {
    return mutation(async () => isMockMode() ? simulateLatency(() => repo.create(entity, input, undefined, requestKey), signal, true) : (await apiClient.post<{ data: MasterRecordMap[E] }>(path(entity), input, { signal, headers: { "Idempotency-Key": requestKey } })).data);
  },
  update<E extends MasterEntity>(entity: E, id: string, input: Partial<MasterInputMap[E]>, requestKey: string, signal?: AbortSignal): Promise<MasterRecordMap[E]> {
    return mutation(async () => isMockMode() ? simulateLatency(() => repo.update(entity, id, input, undefined, requestKey), signal, true) : (await apiClient.put<{ data: MasterRecordMap[E] }>(path(entity, id), input, { signal, headers: { "Idempotency-Key": requestKey } })).data);
  },
  setStatus<E extends MasterEntity>(entity: E, id: string, status: string, signal?: AbortSignal): Promise<MasterRecordMap[E]> {
    return mutation(async () => isMockMode() ? simulateLatency(() => repo.setStatus(entity, id, status), signal, true) : (await apiClient.patch<{ data: MasterRecordMap[E] }>(`${path(entity, id)}/status`, { status }, { signal })).data);
  },
  async getImpact(entity: MasterEntity, id: string, signal?: AbortSignal): Promise<MasterImpact> {
    if (isMockMode()) return simulateLatency(() => repo.impact(entity, id), signal, true);
    return (await apiClient.get<{ data: MasterImpact }>(`${path(entity, id)}/impact`, { signal })).data;
  },
  listAudit(entity: MasterEntity, id: string, page = 1, signal?: AbortSignal): Promise<MasterPage<AuditEntry>> {
    return isMockMode() ? simulateLatency(() => repo.listAudit(entity, id, page), signal) : apiClient.get(`${path(entity, id)}/audit`, { params: { page }, signal });
  },
  review(signal?: AbortSignal): Promise<ReviewResult> {
    return isMockMode() ? simulateLatency(() => repo.review(), signal, true) : apiClient.get("/master/review", { signal });
  },
  listReferences(signal?: AbortSignal): Promise<LegacyReference[]> {
    return isMockMode() ? simulateLatency(() => repo.references(), signal, true) : apiClient.get("/master/references", { signal });
  },
  mappingPreview(referenceId: string, input: MappingDecisionInput, signal?: AbortSignal): Promise<MappingImpactPreview> {
    return isMockMode() ? simulateLatency(() => repo.mappingPreview(referenceId, input), signal, true) : apiClient.post(`/master/references/${encodeURIComponent(referenceId)}/preview`, input, { signal });
  },
  decideMapping(referenceId: string, input: MappingDecisionInput, signal?: AbortSignal): Promise<MappingDecision> {
    return mutation(async () => isMockMode() ? simulateLatency(() => repo.decideMapping(referenceId, input), signal, true) : (await apiClient.post<{ data: MappingDecision }>(`/master/references/${encodeURIComponent(referenceId)}/decision`, input, { signal })).data);
  },
  listMappingAudit(referenceId?: string, signal?: AbortSignal): Promise<AuditEntry[]> {
    return isMockMode() ? simulateLatency(() => repo.listMappingAudit(referenceId), signal, true) : apiClient.get("/master/mapping-audit", { params: { referenceId }, signal });
  },
  buildBackup(signal?: AbortSignal): Promise<MasterBackupFile> {
    return simulateLatency(() => repo.backupData(), signal, true);
  },
  previewRestore(content: string, fileName: string | undefined, signal?: AbortSignal): Promise<RestorePreview> {
    return simulateLatency(() => repo.previewRestore(content, fileName), signal, true);
  },
  restoreBackup(content: string, fileName: string | undefined, signal?: AbortSignal): Promise<RestorePreview> {
    return mutation(async () => simulateLatency(() => repo.restoreBackup(content, fileName), signal, true));
  },
  /** The active categories in their new order, as ONE request: nothing is saved until the whole order is sent. */
  reorderCategories(ids: string[], signal?: AbortSignal): Promise<void> {
    return mutation(async () => { if (isMockMode()) await simulateLatency(() => repo.reorderCategories(ids), signal, true); else await apiClient.put("/master/categories/order", { ids }, { signal }); });
  },
  reorderCategory(id: string, direction: number, signal?: AbortSignal): Promise<void> {
    return mutation(async () => { if (isMockMode()) await simulateLatency(() => repo.reorderCategory(id, direction), signal, true); else await apiClient.patch(`/master/categories/order`, { id, direction }, { signal }); });
  },
};
