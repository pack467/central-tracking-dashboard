/**
 * Dashboard Analytics Service (NestJS Ready with Mock Adapter)
 */

import { isMockMode } from "@/app/lib/config";
import { apiClient } from "@/app/lib/api/client";
import { mockAdapter } from "./mock-adapter";
import type { DashboardSummaryDto } from "@/app/types/dashboard";
import type { Ticket } from "@/app/lib/types";

export const dashboardService = {
  async getDashboardTickets(clientId?: string, signal?: AbortSignal): Promise<Ticket[]> {
    if (isMockMode()) {
      return mockAdapter.getTickets(clientId, signal);
    }

    const res = await apiClient.get<{ data: Ticket[] }>("/dashboard/tickets", {
      params: { clientId },
      signal,
    });
    return res.data || [];
  },

  async getDashboardSummary(clientId?: string, signal?: AbortSignal): Promise<DashboardSummaryDto | null> {
    if (isMockMode()) {
      return null; // Will compute from tickets directly in UI
    }

    const res = await apiClient.get<{ data: DashboardSummaryDto }>("/dashboard/summary", {
      params: { clientId },
      signal,
    });
    return res.data;
  },
};
