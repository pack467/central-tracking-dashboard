/**
 * Reports Service (NestJS Ready with Mock Adapter)
 */

import { isMockMode } from "@/app/lib/config";
import { apiClient } from "@/app/lib/api/client";
import type { WeeklyReportSummaryDto } from "@/app/types/reports";

export const reportsService = {
  async getWeeklyReport(periodStart: string, periodEnd: string, clientId?: string, signal?: AbortSignal): Promise<WeeklyReportSummaryDto> {
    if (isMockMode()) {
      return {
        periodStart,
        periodEnd,
        totalTickets: 42,
        resolvedTickets: 39,
        slaAdherenceRate: 98.4,
        mttrMinutes: 45,
        incidentCount: 5,
        serviceHealthScore: 99.8,
      };
    }

    const res = await apiClient.get<{ data: WeeklyReportSummaryDto }>("/reports/weekly", {
      params: { periodStart, periodEnd, clientId },
      signal,
    });
    return res.data;
  },
};
