/**
 * Central Tracking Dashboard - Mock Adapter (Simulated Data Layer)
 *
 * Membungkus data simulasi YANG SUDAH ADA dengan delay realistis (getMockDelay())
 * tanpa mengubah angka, grafik, atau tampilan dashboard sama sekali.
 *
 * Mendukung pengujian:
 * - ?mock=0 / ?mock=instant -> delay 0ms (tes cepat / pixel diff)
 * - ?mock=slow -> delay 3s
 * - ?mock=error -> throw ApiError (uji tombol "Coba lagi")
 * - ?mock=empty -> kembalikan data kosong
 * - ?mock=timeout -> timeout 15s
 */

import { getMockDelay } from "@/app/lib/config";
import { ApiError } from "@/app/lib/api/errors";
import {
  ALL_COMBINED_SEED_TICKETS,
  getClientTickets,
  getClientMonitoringSchedule,
  getClientProjects,
  getClientHistoricalAssessments,
} from "@/app/lib/clientData";
import {
  initialHandoverRecord,
  seedRosterMembers,
  toDateInputValue,
} from "@/app/lib/data";
import {
  seedSopEntries,
  seedCredentials,
  seedQuickLinks,
  seedEscalationContacts,
} from "@/app/lib/runbooksData";
import type { Ticket, StoredHandoverRecord, RosterMember } from "@/app/lib/types";
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
import {
  SEED_MASTER_CLIENTS,
  SEED_MASTER_PROJECTS,
  SEED_MASTER_SYSTEMS,
} from "@/app/lib/masterDataSeeds";

const MASTER_DATA_STORAGE_KEY = "ctd.masterData.v1";

export function getMasterDataClock(): string {
  if (typeof window !== "undefined" && (window as unknown as { __TEST_CLOCK__?: string }).__TEST_CLOCK__) {
    return (window as unknown as { __TEST_CLOCK__: string }).__TEST_CLOCK__;
  }
  return new Date().toISOString();
}

interface MasterDataStore {
  version: number;
  clients: ClientOrganization[];
  projects: ProjectMaster[];
  systems: SystemMaster[];
  lastSaved: string;
}

let inMemoryMasterStore: MasterDataStore = {
  version: 1,
  clients: [...SEED_MASTER_CLIENTS],
  projects: [...SEED_MASTER_PROJECTS],
  systems: [...SEED_MASTER_SYSTEMS],
  lastSaved: getMasterDataClock(),
};

let storageWarningEmitted = false;

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function loadMasterDataStore(): MasterDataStore {
  if (typeof window === "undefined") {
    return inMemoryMasterStore;
  }
  try {
    const raw = window.localStorage.getItem(MASTER_DATA_STORAGE_KEY);
    if (!raw) {
      saveMasterDataStore(inMemoryMasterStore);
      return inMemoryMasterStore;
    }
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      parsed.version === 1 &&
      Array.isArray(parsed.clients) &&
      Array.isArray(parsed.projects) &&
      Array.isArray(parsed.systems)
    ) {
      inMemoryMasterStore = parsed;
      return parsed;
    }
    saveMasterDataStore(inMemoryMasterStore);
    return inMemoryMasterStore;
  } catch {
    if (!storageWarningEmitted) {
      storageWarningEmitted = true;
      console.warn("Storage master data tidak tersedia atau penuh. Beralih ke fallback in-memory.");
    }
    return inMemoryMasterStore;
  }
}

function saveMasterDataStore(store: MasterDataStore): void {
  inMemoryMasterStore = {
    ...store,
    lastSaved: getMasterDataClock(),
  };
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MASTER_DATA_STORAGE_KEY, JSON.stringify(inMemoryMasterStore));
  } catch {
    if (!storageWarningEmitted) {
      storageWarningEmitted = true;
      console.warn("Gagal menyimpan ke localStorage. Data master hanya disimpan dalam sesi in-memory.");
    }
  }
}

export function resetMasterDataStore(): void {
  inMemoryMasterStore = {
    version: 1,
    clients: [...SEED_MASTER_CLIENTS],
    projects: [...SEED_MASTER_PROJECTS],
    systems: [...SEED_MASTER_SYSTEMS],
    lastSaved: getMasterDataClock(),
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(MASTER_DATA_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

function checkMockTestOverrides(): { forceError?: boolean; forceEmpty?: boolean; forceTimeout?: boolean } {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const mock = params.get("mock");
  return {
    forceError: mock === "error",
    forceEmpty: mock === "empty",
    forceTimeout: mock === "timeout",
  };
}

async function simulateLatency<T>(dataFactory: () => T | Promise<T>, signal?: AbortSignal): Promise<T> {
  const overrides = checkMockTestOverrides();

  if (overrides.forceTimeout) {
    await new Promise((resolve) => setTimeout(resolve, 16000));
    throw new ApiError({
      status: 408,
      message: "Simulasi Timeout: Request melebihi batas waktu 15 detik.",
      code: "TIMEOUT",
    });
  }

  const delayMs = getMockDelay();

  if (delayMs > 0) {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => resolve(), delayMs);
      if (signal) {
        if (signal.aborted) {
          clearTimeout(timer);
          const err = new Error("Request dibatalkan oleh pengguna");
          err.name = "AbortError";
          reject(err);
        } else {
          signal.addEventListener("abort", () => {
            clearTimeout(timer);
            const err = new Error("Request dibatalkan oleh pengguna");
            err.name = "AbortError";
            reject(err);
          }, { once: true });
        }
      }
    });
  }

  if (overrides.forceError) {
    throw new ApiError({
      status: 500,
      message: "Simulasi Kesalahan Server (Mock Error): Gagal mengambil data.",
      code: "SIMULATED_ERROR",
    });
  }

  if (overrides.forceEmpty) {
    const raw = await dataFactory();
    if (Array.isArray(raw)) return [] as unknown as T;
    return {} as unknown as T;
  }

  return await dataFactory();
}

export const mockAdapter = {
  async getTickets(clientId?: string, signal?: AbortSignal): Promise<Ticket[]> {
    return simulateLatency(() => {
      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem("ctd.tickets.v4");
          if (stored) {
            const parsed = JSON.parse(stored);
            return getClientTickets(parsed, clientId);
          }
        } catch {
          // fallback to seed
        }
      }
      return getClientTickets(ALL_COMBINED_SEED_TICKETS, clientId);
    }, signal);
  },

  async getMonitoring(clientId?: string, signal?: AbortSignal) {
    return simulateLatency(() => {
      const schedule = getClientMonitoringSchedule(clientId);
      const projects = getClientProjects(clientId);
      return { schedule, projects };
    }, signal);
  },

  async getHistoricalAssessments(clientId?: string, signal?: AbortSignal) {
    return simulateLatency(() => getClientHistoricalAssessments(clientId), signal);
  },

  async getHandovers(signal?: AbortSignal): Promise<StoredHandoverRecord[]> {
    return simulateLatency(async () => {
      if (typeof window !== "undefined") {
        try {
          const res = await fetch("/api/handovers?limit=200", { signal });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.notes) && data.notes.length > 0) {
              return data.notes as StoredHandoverRecord[];
            }
          }
        } catch {
          // Fallback to localStorage or seed
        }
        try {
          const stored = localStorage.getItem("ctd.handover.notes");
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          }
        } catch {
          // Fallback to default handover record
        }
      }
      return [
        {
          id: 1,
          title: `Handover Shift ${initialHandoverRecord.sourceShift} → ${initialHandoverRecord.targetShift}`,
          handoverDate: toDateInputValue(),
          content: JSON.stringify(initialHandoverRecord),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
    }, signal);
  },

  async getRosterMembers(signal?: AbortSignal): Promise<RosterMember[]> {
    return simulateLatency(() => {
      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem("ctd.roster.members");
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          }
        } catch {
          // Fallback to seed roster members
        }
      }
      return seedRosterMembers;
    }, signal);
  },

  async getRunbooksData(signal?: AbortSignal) {
    return simulateLatency(() => ({
      sops: seedSopEntries,
      credentials: seedCredentials,
      quickLinks: seedQuickLinks,
      escalations: seedEscalationContacts,
    }), signal);
  },

  // ── Master Data: Clients ──
  async listMasterClients(signal?: AbortSignal): Promise<ClientOrganization[]> {
    return simulateLatency(() => {
      const store = loadMasterDataStore();
      return [...store.clients];
    }, signal);
  },

  async createMasterClient(data: CreateClientInput, signal?: AbortSignal): Promise<ClientOrganization> {
    return simulateLatency(() => {
      const store = loadMasterDataStore();
      const codeTrimmed = data.code.trim().toUpperCase();
      if (!data.name.trim()) {
        throw new ApiError({ status: 422, message: "Nama klien wajib diisi.", code: "VALIDATION_ERROR" });
      }
      if (!codeTrimmed) {
        throw new ApiError({ status: 422, message: "Kode klien wajib diisi.", code: "VALIDATION_ERROR" });
      }
      if (store.clients.some((c) => c.code.toUpperCase() === codeTrimmed)) {
        throw new ApiError({
          status: 409,
          message: `Kode klien "${codeTrimmed}" sudah digunakan. Gunakan kode lain.`,
          code: "DUPLICATE_CODE",
        });
      }
      if (data.picEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.picEmail.trim())) {
        throw new ApiError({ status: 422, message: "Format email PIC tidak valid.", code: "INVALID_EMAIL" });
      }

      const id = slugify(codeTrimmed) || slugify(data.name);
      const now = getMasterDataClock();
      const newClient: ClientOrganization = {
        id,
        name: data.name.trim(),
        shortName: data.shortName?.trim() || data.name.trim(),
        code: codeTrimmed,
        tagline: data.description?.trim() || "Managed Enterprise Client",
        tier: data.tier,
        status: "active",
        picName: data.picName.trim(),
        picEmail: data.picEmail.trim(),
        picPhone: data.picPhone?.trim(),
        description: data.description?.trim(),
        createdAt: now,
        updatedAt: now,
        systemsCount: 0,
      };

      store.clients.unshift(newClient);
      saveMasterDataStore(store);
      return newClient;
    }, signal);
  },

  async updateMasterClient(id: string, updates: UpdateClientInput, signal?: AbortSignal): Promise<ClientOrganization> {
    return simulateLatency(() => {
      const store = loadMasterDataStore();
      const index = store.clients.findIndex((c) => c.id === id);
      if (index === -1) {
        throw new ApiError({ status: 404, message: "Klien tidak ditemukan.", code: "NOT_FOUND" });
      }
      const existing = store.clients[index];

      if (updates.code) {
        const codeTrimmed = updates.code.trim().toUpperCase();
        if (store.clients.some((c) => c.id !== id && c.code.toUpperCase() === codeTrimmed)) {
          throw new ApiError({
            status: 409,
            message: `Kode klien "${codeTrimmed}" sudah digunakan oleh klien lain.`,
            code: "DUPLICATE_CODE",
          });
        }
      }

      if (updates.picEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.picEmail.trim())) {
        throw new ApiError({ status: 422, message: "Format email PIC tidak valid.", code: "INVALID_EMAIL" });
      }

      const now = getMasterDataClock();
      const updated: ClientOrganization = {
        ...existing,
        name: updates.name !== undefined ? updates.name.trim() : existing.name,
        shortName: updates.shortName !== undefined ? updates.shortName.trim() : existing.shortName,
        code: updates.code !== undefined ? updates.code.trim().toUpperCase() : existing.code,
        tier: updates.tier !== undefined ? updates.tier : existing.tier,
        status: updates.status !== undefined ? updates.status : existing.status,
        picName: updates.picName !== undefined ? updates.picName.trim() : existing.picName,
        picEmail: updates.picEmail !== undefined ? updates.picEmail.trim() : existing.picEmail,
        picPhone: updates.picPhone !== undefined ? updates.picPhone.trim() : existing.picPhone,
        description: updates.description !== undefined ? updates.description.trim() : existing.description,
        updatedAt: now,
      };

      store.clients[index] = updated;
      saveMasterDataStore(store);
      return updated;
    }, signal);
  },

  async setMasterClientStatus(id: string, status: ClientStatus, signal?: AbortSignal): Promise<ClientOrganization> {
    return simulateLatency(() => {
      const store = loadMasterDataStore();
      const index = store.clients.findIndex((c) => c.id === id);
      if (index === -1) {
        throw new ApiError({ status: 404, message: "Klien tidak ditemukan.", code: "NOT_FOUND" });
      }
      const existing = store.clients[index];

      // Aturan bisnis: Klien aktif terakhir tidak boleh dinonaktifkan atau diarsipkan
      if ((status === "archived" || status === "inactive") && existing.status === "active") {
        const activeCount = store.clients.filter((c) => c.status === "active").length;
        if (activeCount <= 1) {
          throw new ApiError({
            status: 400,
            message: "Klien aktif terakhir tidak dapat dinonaktifkan atau diarsipkan.",
            code: "LAST_ACTIVE_CLIENT",
          });
        }
      }

      const updated: ClientOrganization = {
        ...existing,
        status,
        updatedAt: getMasterDataClock(),
      };
      store.clients[index] = updated;
      saveMasterDataStore(store);
      return updated;
    }, signal);
  },

  // ── Master Data: Projects ──
  async listMasterProjects(clientId?: string, signal?: AbortSignal): Promise<ProjectMaster[]> {
    return simulateLatency(() => {
      const store = loadMasterDataStore();
      if (clientId && clientId !== "all") {
        return store.projects.filter((p) => p.clientId === clientId);
      }
      return [...store.projects];
    }, signal);
  },

  async createMasterProject(data: CreateProjectInput, signal?: AbortSignal): Promise<ProjectMaster> {
    return simulateLatency(() => {
      const store = loadMasterDataStore();
      if (!data.clientId) {
        throw new ApiError({ status: 422, message: "Klien wajib dipilih.", code: "VALIDATION_ERROR" });
      }
      if (!data.name.trim()) {
        throw new ApiError({ status: 422, message: "Nama proyek wajib diisi.", code: "VALIDATION_ERROR" });
      }
      const codeTrimmed = data.code.trim().toUpperCase();
      if (!codeTrimmed) {
        throw new ApiError({ status: 422, message: "Kode proyek wajib diisi.", code: "VALIDATION_ERROR" });
      }

      // Aturan bisnis: Kode proyek unik dalam SATU klien yang sama
      const duplicateInClient = store.projects.some(
        (p) => p.clientId === data.clientId && p.code.toUpperCase() === codeTrimmed,
      );
      if (duplicateInClient) {
        throw new ApiError({
          status: 409,
          message: `Kode proyek "${codeTrimmed}" sudah digunakan pada klien ini.`,
          code: "DUPLICATE_PROJECT_CODE",
        });
      }

      const id = `proj-${data.clientId}-${slugify(codeTrimmed)}`;
      const now = getMasterDataClock();
      const newProj: ProjectMaster = {
        id,
        clientId: data.clientId,
        name: data.name.trim(),
        fullName: data.fullName?.trim() || data.name.trim(),
        code: codeTrimmed,
        detail: data.detail?.trim() || "Operational Service",
        leadEngineer: data.leadEngineer?.trim() || "NOC Lead Engineer",
        healthDefault: data.healthDefault || "healthy",
        status: "active",
        createdAt: now,
        updatedAt: now,
      };

      store.projects.unshift(newProj);
      saveMasterDataStore(store);
      return newProj;
    }, signal);
  },

  async updateMasterProject(id: string, updates: UpdateProjectInput, signal?: AbortSignal): Promise<ProjectMaster> {
    return simulateLatency(() => {
      const store = loadMasterDataStore();
      const index = store.projects.findIndex((p) => p.id === id);
      if (index === -1) {
        throw new ApiError({ status: 404, message: "Proyek tidak ditemukan.", code: "NOT_FOUND" });
      }
      const existing = store.projects[index];

      if (updates.code) {
        const codeTrimmed = updates.code.trim().toUpperCase();
        const duplicateInClient = store.projects.some(
          (p) => p.id !== id && p.clientId === existing.clientId && p.code.toUpperCase() === codeTrimmed,
        );
        if (duplicateInClient) {
          throw new ApiError({
            status: 409,
            message: `Kode proyek "${codeTrimmed}" sudah digunakan oleh proyek lain pada klien ini.`,
            code: "DUPLICATE_PROJECT_CODE",
          });
        }
      }

      const now = getMasterDataClock();
      const updated: ProjectMaster = {
        ...existing,
        name: updates.name !== undefined ? updates.name.trim() : existing.name,
        fullName: updates.fullName !== undefined ? updates.fullName.trim() : existing.fullName,
        code: updates.code !== undefined ? updates.code.trim().toUpperCase() : existing.code,
        detail: updates.detail !== undefined ? updates.detail.trim() : existing.detail,
        leadEngineer: updates.leadEngineer !== undefined ? updates.leadEngineer.trim() : existing.leadEngineer,
        healthDefault: updates.healthDefault !== undefined ? updates.healthDefault : existing.healthDefault,
        status: updates.status !== undefined ? updates.status : existing.status,
        updatedAt: now,
      };

      store.projects[index] = updated;
      saveMasterDataStore(store);
      return updated;
    }, signal);
  },

  async setMasterProjectStatus(id: string, status: ProjectStatus, signal?: AbortSignal): Promise<ProjectMaster> {
    return simulateLatency(() => {
      const store = loadMasterDataStore();
      const index = store.projects.findIndex((p) => p.id === id);
      if (index === -1) {
        throw new ApiError({ status: 404, message: "Proyek tidak ditemukan.", code: "NOT_FOUND" });
      }
      const updated: ProjectMaster = {
        ...store.projects[index],
        status,
        updatedAt: getMasterDataClock(),
      };
      store.projects[index] = updated;
      saveMasterDataStore(store);
      return updated;
    }, signal);
  },

  // ── Master Data: Systems ──
  async listMasterSystems(clientId?: string, projectId?: string, signal?: AbortSignal): Promise<SystemMaster[]> {
    return simulateLatency(() => {
      const store = loadMasterDataStore();
      let res = store.systems;
      if (clientId && clientId !== "all") {
        res = res.filter((s) => s.clientId === clientId);
      }
      if (projectId && projectId !== "all") {
        res = res.filter((s) => s.projectId === projectId);
      }
      return [...res];
    }, signal);
  },

  async createMasterSystem(data: CreateSystemInput, signal?: AbortSignal): Promise<SystemMaster> {
    return simulateLatency(() => {
      const store = loadMasterDataStore();
      if (!data.name.trim()) {
        throw new ApiError({ status: 422, message: "Nama sistem wajib diisi.", code: "VALIDATION_ERROR" });
      }
      if (!data.clientId || !data.projectId) {
        throw new ApiError({ status: 422, message: "Klien dan proyek wajib dipilih.", code: "VALIDATION_ERROR" });
      }

      const id = `sys-${data.clientId}-${data.projectId}-${slugify(data.name)}`;
      const now = getMasterDataClock();
      const newSys: SystemMaster = {
        id,
        clientId: data.clientId,
        projectId: data.projectId,
        name: data.name.trim(),
        criticality: data.criticality || "high",
        environment: data.environment || "Production",
        status: data.status || "active",
        createdAt: now,
        updatedAt: now,
      };

      store.systems.unshift(newSys);
      saveMasterDataStore(store);
      return newSys;
    }, signal);
  },

  async updateMasterSystem(id: string, updates: UpdateSystemInput, signal?: AbortSignal): Promise<SystemMaster> {
    return simulateLatency(() => {
      const store = loadMasterDataStore();
      const index = store.systems.findIndex((s) => s.id === id);
      if (index === -1) {
        throw new ApiError({ status: 404, message: "Sistem tidak ditemukan.", code: "NOT_FOUND" });
      }
      const existing = store.systems[index];
      const now = getMasterDataClock();
      const updated: SystemMaster = {
        ...existing,
        name: updates.name !== undefined ? updates.name.trim() : existing.name,
        projectId: updates.projectId !== undefined ? updates.projectId : existing.projectId,
        criticality: updates.criticality !== undefined ? updates.criticality : existing.criticality,
        environment: updates.environment !== undefined ? updates.environment : existing.environment,
        status: updates.status !== undefined ? updates.status : existing.status,
        updatedAt: now,
      };

      store.systems[index] = updated;
      saveMasterDataStore(store);
      return updated;
    }, signal);
  },

  async setMasterSystemStatus(id: string, status: SystemStatus, signal?: AbortSignal): Promise<SystemMaster> {
    return simulateLatency(() => {
      const store = loadMasterDataStore();
      const index = store.systems.findIndex((s) => s.id === id);
      if (index === -1) {
        throw new ApiError({ status: 404, message: "Sistem tidak ditemukan.", code: "NOT_FOUND" });
      }
      const updated: SystemMaster = {
        ...store.systems[index],
        status,
        updatedAt: getMasterDataClock(),
      };
      store.systems[index] = updated;
      saveMasterDataStore(store);
      return updated;
    }, signal);
  },
};

