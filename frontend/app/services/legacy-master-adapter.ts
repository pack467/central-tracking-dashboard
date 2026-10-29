/** Compatibility DTOs for existing consumers. All writes use the v2 repository. */
import { masterRepository as repo } from "./master-data-repository";
import { projectToLegacy } from "@/app/lib/master-data-model";
import type { CreateClientInput, UpdateClientInput, CreateProjectInput, UpdateProjectInput, CreateSystemInput, UpdateSystemInput, ClientStatus, ProjectStatus, SystemStatus, OrganizationInput, ProjectInput, SystemInput } from "@/app/types/master-data";

const organizationInput = (v: CreateClientInput | UpdateClientInput): Partial<OrganizationInput> => ({
  ...("name" in v ? { name: v.name } : {}), ...("code" in v ? { code: v.code } : {}),
  ...("shortName" in v ? { shortName: v.shortName } : {}), ...("description" in v ? { description: v.description } : {}),
  ...("status" in v ? { status: v.status } : {}),
  ...("picName" in v ? { picContact: v.picName ? { name: v.picName, email: v.picEmail, phone: v.picPhone } : null, picUserId: null } : {}),
});
const projectInput = (v: CreateProjectInput | UpdateProjectInput): Partial<ProjectInput> => ({
  ...("clientId" in v ? { organizationId: v.clientId } : {}), ...("name" in v ? { name: v.name } : {}),
  ...("code" in v ? { code: v.code } : {}), ...("detail" in v ? { scope: v.detail } : {}), ...("status" in v ? { status: v.status } : {}),
});
const systemInput = (v: CreateSystemInput | UpdateSystemInput): Partial<SystemInput> => ({
  ...("projectId" in v ? { projectId: v.projectId } : {}), ...("name" in v ? { name: v.name } : {}),
  ...("environment" in v ? { environment: v.environment } : {}), ...("criticality" in v ? { criticality: v.criticality } : {}),
  ...("status" in v ? { status: v.status === "deprecated" ? "archived" : "active" } : {}),
});
const org = (id: string) => repo.legacyClients().find(v => v.id === id)!;
const sys = (id: string) => repo.legacySystems().find(v => v.id === id)!;

export const legacyMasterAdapter = {
  listMasterClients: () => repo.legacyClients(),
  createMasterClient: (v: CreateClientInput) => { const created = repo.create("organization", { kind: "client", status: "active", ...organizationInput(v) } as OrganizationInput); return org(created.id); },
  updateMasterClient: (id: string, v: UpdateClientInput) => {
    const current = org(id);
    const fields = ["picName", "picEmail", "picPhone"].some(field => field in v) ? { picName: current.picName, picEmail: current.picEmail, picPhone: current.picPhone, ...v } : v;
    repo.update("organization", id, organizationInput(fields)); return org(id);
  },
  setMasterClientStatus: (id: string, status: ClientStatus) => { repo.setStatus("organization", id, status); return org(id); },
  listMasterProjects: (clientId?: string) => repo.legacyProjects().filter(p => !clientId || p.clientId === clientId),
  createMasterProject: (v: CreateProjectInput) => projectToLegacy(repo.create("project", { status: "active", ...projectInput(v) } as ProjectInput)),
  updateMasterProject: (id: string, v: UpdateProjectInput) => projectToLegacy(repo.update("project", id, projectInput(v))),
  setMasterProjectStatus: (id: string, status: ProjectStatus) => projectToLegacy(repo.setStatus("project", id, status)),
  listMasterSystems: (clientId?: string, projectId?: string) => repo.legacySystems().filter(s => (!clientId || s.clientId === clientId) && (!projectId || s.projectId === projectId)),
  createMasterSystem: (v: CreateSystemInput) => { const created = repo.create("system", { code: "", status: "active", ...systemInput(v) } as SystemInput); return sys(created.id); },
  updateMasterSystem: (id: string, v: UpdateSystemInput) => { repo.update("system", id, systemInput(v)); return sys(id); },
  setMasterSystemStatus: (id: string, status: SystemStatus) => { repo.setStatus("system", id, status === "deprecated" ? "archived" : "active"); return sys(id); },
};
