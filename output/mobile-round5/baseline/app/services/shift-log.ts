/**
 * Shift Log / Handover Service (NestJS Ready with Mock Adapter)
 */

import { isMockMode } from "@/app/lib/config";
import { apiClient } from "@/app/lib/api/client";
import { mockAdapter } from "./mock-adapter";
import type { StoredHandoverRecord } from "@/app/lib/types";

export const shiftLogService = {
  async list(signal?: AbortSignal): Promise<StoredHandoverRecord[]> {
    if (isMockMode()) {
      return mockAdapter.getHandovers(signal);
    }

    const res = await apiClient.get<{ data: StoredHandoverRecord[] }>("/shift-logs", { signal });
    return res.data || [];
  },

  async create(record: Omit<StoredHandoverRecord, "id">, signal?: AbortSignal): Promise<StoredHandoverRecord> {
    if (isMockMode()) {
      return {
        ...record,
        id: Date.now(),
      };
    }

    const res = await apiClient.post<{ data: StoredHandoverRecord }>("/shift-logs", record, { signal });
    return res.data;
  },

  async delete(id: number, signal?: AbortSignal): Promise<void> {
    if (isMockMode()) {
      return;
    }

    await apiClient.delete(`/shift-logs/${id}`, { signal });
  },
};
