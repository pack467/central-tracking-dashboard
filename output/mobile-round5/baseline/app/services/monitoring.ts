/**
 * Monitoring Service (NestJS Ready with Mock Adapter)
 */

import { isMockMode } from "@/app/lib/config";
import { apiClient } from "@/app/lib/api/client";
import { mockAdapter } from "./mock-adapter";
import type { MonitoringEntry, ProjectHealthEntry, HistoricalAssessmentEntry } from "@/app/lib/types";

export const monitoringService = {
  async getMonitoringData(clientId?: string, signal?: AbortSignal) {
    if (isMockMode()) {
      return mockAdapter.getMonitoring(clientId, signal);
    }

    const [scheduleRes, projectsRes] = await Promise.all([
      apiClient.get<{ data: MonitoringEntry[] }>("/monitoring/schedule", { params: { clientId }, signal }),
      apiClient.get<{ data: ProjectHealthEntry[] }>("/monitoring/projects", { params: { clientId }, signal }),
    ]);

    return {
      schedule: scheduleRes.data || [],
      projects: projectsRes.data || [],
    };
  },

  async getHistoricalAssessments(clientId?: string, signal?: AbortSignal): Promise<HistoricalAssessmentEntry[]> {
    if (isMockMode()) {
      return mockAdapter.getHistoricalAssessments(clientId, signal);
    }

    const res = await apiClient.get<{ data: HistoricalAssessmentEntry[] }>("/monitoring/historical", {
      params: { clientId },
      signal,
    });
    return res.data || [];
  },
};
