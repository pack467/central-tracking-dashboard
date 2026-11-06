/**
 * Team Roster Service (NestJS Ready with Mock Adapter)
 */

import { isMockMode } from "@/app/lib/config";
import { apiClient } from "@/app/lib/api/client";
import { mockAdapter } from "./mock-adapter";
import type { RosterMember, ShiftSwapRequest } from "@/app/lib/types";
import { seedSwapRequests } from "@/app/lib/data";

export const rosterService = {
  async listMembers(signal?: AbortSignal): Promise<RosterMember[]> {
    if (isMockMode()) {
      return mockAdapter.getRosterMembers(signal);
    }

    const res = await apiClient.get<{ data: RosterMember[] }>("/roster/members", { signal });
    return res.data || [];
  },

  async listSwaps(signal?: AbortSignal): Promise<ShiftSwapRequest[]> {
    if (isMockMode()) {
      return seedSwapRequests;
    }

    const res = await apiClient.get<{ data: ShiftSwapRequest[] }>("/roster/swaps", { signal });
    return res.data || [];
  },
};
