/**
 * Central Tracking Dashboard - Master Data Service (NestJS Ready with Mock Adapter)
 *
 * Mengelola Master Data:
 * - Klien (ClientOrganization)
 * - Proyek (ProjectMaster)
 * - Sistem (SystemMaster)
 *
 * Mendukung switch dinamis antara Mock Adapter (localStorage) dan backend NestJS.
 */

import { isMockMode } from "@/app/lib/config";
import { apiClient } from "@/app/lib/api/client";
import { mockAdapter } from "./mock-adapter";
import type {
  ClientOrganization,
  ProjectMaster,
  SystemMaster,
  CreateClientInput,
  UpdateClientInput,
  CreateProjectInput,
  UpdateProjectInput,
  CreateSystemInput,
  UpdateSystemInput,
  ClientStatus,
  ProjectStatus,
  SystemStatus,
} from "@/app/types/master-data";

export const masterDataService = {
  // ── Clients ──
  async listClients(signal?: AbortSignal): Promise<ClientOrganization[]> {
    if (isMockMode()) {
      return mockAdapter.listMasterClients(signal);
    }
    const res = await apiClient.get<{ data: ClientOrganization[] }>("/master/clients", { signal });
    return res.data || [];
  },

  async createClient(data: CreateClientInput, signal?: AbortSignal): Promise<ClientOrganization> {
    if (isMockMode()) {
      return mockAdapter.createMasterClient(data, signal);
    }
    const res = await apiClient.post<{ data: ClientOrganization }>("/master/clients", data, { signal });
    return res.data;
  },

  async updateClient(id: string, updates: UpdateClientInput, signal?: AbortSignal): Promise<ClientOrganization> {
    if (isMockMode()) {
      return mockAdapter.updateMasterClient(id, updates, signal);
    }
    const res = await apiClient.put<{ data: ClientOrganization }>(`/master/clients/${encodeURIComponent(id)}`, updates, { signal });
    return res.data;
  },

  async setClientStatus(id: string, status: ClientStatus, signal?: AbortSignal): Promise<ClientOrganization> {
    if (isMockMode()) {
      return mockAdapter.setMasterClientStatus(id, status, signal);
    }
    const res = await apiClient.patch<{ data: ClientOrganization }>(`/master/clients/${encodeURIComponent(id)}/status`, { status }, { signal });
    return res.data;
  },

  // ── Projects ──
  async listProjects(clientId?: string, signal?: AbortSignal): Promise<ProjectMaster[]> {
    if (isMockMode()) {
      return mockAdapter.listMasterProjects(clientId, signal);
    }
    const res = await apiClient.get<{ data: ProjectMaster[] }>("/master/projects", {
      params: clientId ? { clientId } : undefined,
      signal,
    });
    return res.data || [];
  },

  async createProject(data: CreateProjectInput, signal?: AbortSignal): Promise<ProjectMaster> {
    if (isMockMode()) {
      return mockAdapter.createMasterProject(data, signal);
    }
    const res = await apiClient.post<{ data: ProjectMaster }>("/master/projects", data, { signal });
    return res.data;
  },

  async updateProject(id: string, updates: UpdateProjectInput, signal?: AbortSignal): Promise<ProjectMaster> {
    if (isMockMode()) {
      return mockAdapter.updateMasterProject(id, updates, signal);
    }
    const res = await apiClient.put<{ data: ProjectMaster }>(`/master/projects/${encodeURIComponent(id)}`, updates, { signal });
    return res.data;
  },

  async setProjectStatus(id: string, status: ProjectStatus, signal?: AbortSignal): Promise<ProjectMaster> {
    if (isMockMode()) {
      return mockAdapter.setMasterProjectStatus(id, status, signal);
    }
    const res = await apiClient.patch<{ data: ProjectMaster }>(`/master/projects/${encodeURIComponent(id)}/status`, { status }, { signal });
    return res.data;
  },

  // ── Systems ──
  async listSystems(clientId?: string, projectId?: string, signal?: AbortSignal): Promise<SystemMaster[]> {
    if (isMockMode()) {
      return mockAdapter.listMasterSystems(clientId, projectId, signal);
    }
    const res = await apiClient.get<{ data: SystemMaster[] }>("/master/systems", {
      params: { clientId, projectId },
      signal,
    });
    return res.data || [];
  },

  async createSystem(data: CreateSystemInput, signal?: AbortSignal): Promise<SystemMaster> {
    if (isMockMode()) {
      return mockAdapter.createMasterSystem(data, signal);
    }
    const res = await apiClient.post<{ data: SystemMaster }>("/master/systems", data, { signal });
    return res.data;
  },

  async updateSystem(id: string, updates: UpdateSystemInput, signal?: AbortSignal): Promise<SystemMaster> {
    if (isMockMode()) {
      return mockAdapter.updateMasterSystem(id, updates, signal);
    }
    const res = await apiClient.put<{ data: SystemMaster }>(`/master/systems/${encodeURIComponent(id)}`, updates, { signal });
    return res.data;
  },

  async setSystemStatus(id: string, status: SystemStatus, signal?: AbortSignal): Promise<SystemMaster> {
    if (isMockMode()) {
      return mockAdapter.setMasterSystemStatus(id, status, signal);
    }
    const res = await apiClient.patch<{ data: SystemMaster }>(`/master/systems/${encodeURIComponent(id)}/status`, { status }, { signal });
    return res.data;
  },
};
