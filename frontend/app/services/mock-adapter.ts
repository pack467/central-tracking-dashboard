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
  toDateInputValue,
} from "@/app/lib/data";
import {
  seedSopEntries,
  seedCredentials,
  seedQuickLinks,
  seedEscalationContacts,
} from "@/app/lib/runbooksData";
import type { Ticket, StoredHandoverRecord, RosterMember } from "@/app/lib/types";
import { masterRepository } from "./master-data-repository";
import { peopleToRosterMembers } from "@/app/lib/people-roster";
import { legacyMasterAdapter } from "./legacy-master-adapter";
import { masterNow } from "@/app/lib/master-data-model";
export const getMasterDataClock = masterNow;
export const resetMasterDataStore = masterRepository.reset;

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

export async function simulateLatency<T>(dataFactory: () => T | Promise<T>, signal?: AbortSignal, ignoreEmpty = false): Promise<T> {
  if (signal?.aborted) throw new DOMException("Request dibatalkan", "AbortError");
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

  if (signal?.aborted) throw new DOMException("Request dibatalkan", "AbortError");
  if (overrides.forceEmpty && !ignoreEmpty) {
    const raw = await dataFactory();
    if (Array.isArray(raw)) return [] as unknown as T;
    if (raw && typeof raw === "object" && "data" in raw && "meta" in raw && Array.isArray(raw.data)) return { ...raw, data: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 1 } } as T;
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

  /** People are owned by Master Data; the legacy ctd.roster.members key is only read once, during its migration. */
  async getRosterMembers(signal?: AbortSignal): Promise<RosterMember[]> {
    return simulateLatency(() => {
      const data = masterRepository.snapshot();
      return peopleToRosterMembers(data.people || [], data.roles || []);
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
  async listMasterClients(...[signal]: [AbortSignal?]) { return simulateLatency(() => legacyMasterAdapter.listMasterClients(), signal); },
  async createMasterClient(...[data, signal]: [Parameters<typeof legacyMasterAdapter.createMasterClient>[0], AbortSignal?]) { return simulateLatency(() => legacyMasterAdapter.createMasterClient(data), signal); },
  async updateMasterClient(...[id, data, signal]: [string, Parameters<typeof legacyMasterAdapter.updateMasterClient>[1], AbortSignal?]) { return simulateLatency(() => legacyMasterAdapter.updateMasterClient(id, data), signal); },
  async setMasterClientStatus(...[id, status, signal]: [string, Parameters<typeof legacyMasterAdapter.setMasterClientStatus>[1], AbortSignal?]) { return simulateLatency(() => legacyMasterAdapter.setMasterClientStatus(id, status), signal); },
  async listMasterProjects(...[clientId, signal]: [string?, AbortSignal?]) { return simulateLatency(() => legacyMasterAdapter.listMasterProjects(clientId), signal); },
  async createMasterProject(...[data, signal]: [Parameters<typeof legacyMasterAdapter.createMasterProject>[0], AbortSignal?]) { return simulateLatency(() => legacyMasterAdapter.createMasterProject(data), signal); },
  async updateMasterProject(...[id, data, signal]: [string, Parameters<typeof legacyMasterAdapter.updateMasterProject>[1], AbortSignal?]) { return simulateLatency(() => legacyMasterAdapter.updateMasterProject(id, data), signal); },
  async setMasterProjectStatus(...[id, status, signal]: [string, Parameters<typeof legacyMasterAdapter.setMasterProjectStatus>[1], AbortSignal?]) { return simulateLatency(() => legacyMasterAdapter.setMasterProjectStatus(id, status), signal); },
  async listMasterSystems(...[clientId, projectId, signal]: [string?, string?, AbortSignal?]) { return simulateLatency(() => legacyMasterAdapter.listMasterSystems(clientId, projectId), signal); },
  async createMasterSystem(...[data, signal]: [Parameters<typeof legacyMasterAdapter.createMasterSystem>[0], AbortSignal?]) { return simulateLatency(() => legacyMasterAdapter.createMasterSystem(data), signal); },
  async updateMasterSystem(...[id, data, signal]: [string, Parameters<typeof legacyMasterAdapter.updateMasterSystem>[1], AbortSignal?]) { return simulateLatency(() => legacyMasterAdapter.updateMasterSystem(id, data), signal); },
  async setMasterSystemStatus(...[id, status, signal]: [string, Parameters<typeof legacyMasterAdapter.setMasterSystemStatus>[1], AbortSignal?]) { return simulateLatency(() => legacyMasterAdapter.setMasterSystemStatus(id, status), signal); },
};
