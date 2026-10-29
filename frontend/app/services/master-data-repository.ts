import {
  acceptServerCatalog,
  clone,
  directory,
  load,
  resetStore,
  serverSync,
  setExternalUsers,
  setSessionActor,
  setSync,
  subscribe,
  sync
} from "./master-store";
import { create, get, impact, list, listAudit, remove, reorderCategories, reorderCategory, setStatus, update } from "./master-catalog-store";
import {
  backupData,
  decideMapping,
  listMappingAudit,
  mappingPreview,
  previewRestore,
  references,
  restoreBackup,
  review
} from "./master-review-store";
import { createPerson, deletePerson, getPerson, listPeople, personUsage, setPersonStatus, updatePerson } from "./master-people-store";
import {
  createRole,
  deleteRole,
  getRole,
  listRoles,
  listTeamAudit,
  reorderRole,
  roleUsage,
  setRoleStatus,
  updateRole
} from "./master-roles-store";
import { peopleOf, rolesOf } from "./master-transaction";
import { type StoredRole } from "@/app/lib/master-people";
import { organizationToLegacy, projectToLegacy, systemToLegacy } from "@/app/lib/master-data-model";
import type { Person } from "@/app/types/master-data";

/** Public entry point of Master Data persistence. The work lives in the master-*-store modules. */
export const masterRepository = {
  list, get, create, update, setStatus, impact, listAudit, review, references, mappingPreview, decideMapping, listMappingAudit, backupData, previewRestore, restoreBackup, reorderCategory, reorderCategories,
  remove, listPeople, getPerson, createPerson, updatePerson, setPersonStatus, personUsage, deletePerson, listRoles, getRole, createRole, updateRole, setRoleStatus, roleUsage, deleteRole, reorderRole, listTeamAudit,
  bootstrap: () => clone(load()),
  /** Read-only views of the live collections; never mutate the returned arrays. */
  people: (): readonly Person[] => peopleOf(load()),
  roles: (): readonly StoredRole[] => rolesOf(load()),
  snapshot: () => clone(load()),
  acceptServerCatalog,
  getSync: () => sync,
  getServerSync: () => serverSync,
  subscribe,
  setActor: setSessionActor,
  setUsers: setExternalUsers,
  saving: () => setSync({ status: "saving", error: undefined }),
  failed: (cause: unknown) => setSync({ ready: true, status: "failed", error: cause instanceof Error ? cause.message : "Gagal menyimpan" }),
  settled: () => { if (sync.status === "saving") setSync({ status: "saved" }); },
  legacyClients: () => { const data = load(); return data.organizations.map(o => organizationToLegacy(o, data.projects, data.systems, directory(data))); },
  legacyProjects: () => load().projects.map(p => projectToLegacy(p, directory())),
  legacySystems: () => { const data = load(); return data.systems.map(s => systemToLegacy(s, data.projects)); },
  reset: resetStore,
};

export { masterSourceRecords } from "./master-store";
