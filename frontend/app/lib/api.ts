/**
 * Central Tracking Dashboard - API Client & Service Layer
 * 
 * Provides unified request handling, error normalization, authentication header
 * injection, and service methods for all dashboard data models.
 */

import type {
  CheckpointAssessment,
  MonitoringEntry,
  ProjectHealthEntry,
  RosterMember,
  ShiftSwapRequest,
  StoredHandoverRecord,
  Ticket,
} from "@/app/lib/types";
import {
  monitoringSchedule,
  projects,
  seedRosterMembers,
  seedSwapRequests,
  seedTickets,
} from "@/app/lib/data";

import { apiClient, ApiClient } from "./api/client";
import { ApiError, isApiError } from "./api/errors";
export { apiClient, ApiClient, ApiError, isApiError };

export const DashboardApiException = ApiError;
export type DashboardApiException = ApiError;
export type { ApiError as IApiError };

export const api = apiClient;


// ── Domain Service Methods (Adapter pattern: real API with mock fallbacks) ──

export const ticketService = {
  async list(): Promise<Ticket[]> {
    try {
      const res = await api.get<{ tickets: Ticket[] }>("/api/tickets");
      return res.tickets;
    } catch {
      // Return local seed if endpoint not yet deployed
      return seedTickets;
    }
  },

  async create(ticket: Ticket): Promise<Ticket> {
    try {
      const res = await api.post<{ ticket: Ticket }>("/api/tickets", ticket);
      return res.ticket;
    } catch {
      return ticket;
    }
  },

  async update(ticket: Ticket): Promise<Ticket> {
    try {
      const res = await api.put<{ ticket: Ticket }>(`/api/tickets/${ticket.id}`, ticket);
      return res.ticket;
    } catch {
      return ticket;
    }
  },
};

export const handoverService = {
  async list(): Promise<StoredHandoverRecord[]> {
    const res = await api.get<{ notes: StoredHandoverRecord[] }>("/api/handovers");
    return res.notes || [];
  },

  async create(payload: { title: string; handoverDate: string; content: string }): Promise<StoredHandoverRecord> {
    const res = await api.post<{ note: StoredHandoverRecord }>("/api/handovers", payload);
    return res.note;
  },

  async update(id: number, payload: { title: string; handoverDate: string; content: string }): Promise<StoredHandoverRecord> {
    const res = await api.put<{ note: StoredHandoverRecord }>(`/api/handovers/${id}`, payload);
    return res.note;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/api/handovers/${id}`);
  },
};

export const monitoringService = {
  async getSchedule(): Promise<MonitoringEntry[]> {
    try {
      const res = await api.get<{ schedule: MonitoringEntry[] }>("/api/monitoring/schedule");
      return res.schedule;
    } catch {
      return monitoringSchedule;
    }
  },

  async getAssessments(): Promise<Record<string, CheckpointAssessment>> {
    try {
      const res = await api.get<{ assessments: Record<string, CheckpointAssessment> }>("/api/monitoring/assessments");
      return res.assessments;
    } catch {
      return {};
    }
  },
};

export const rosterService = {
  async listMembers(): Promise<RosterMember[]> {
    try {
      const res = await api.get<{ members: RosterMember[] }>("/api/roster/members");
      return res.members;
    } catch {
      return seedRosterMembers;
    }
  },

  async listSwaps(): Promise<ShiftSwapRequest[]> {
    try {
      const res = await api.get<{ swaps: ShiftSwapRequest[] }>("/api/roster/swaps");
      return res.swaps;
    } catch {
      return seedSwapRequests;
    }
  },
};

export const healthService = {
  async getProjects(): Promise<ProjectHealthEntry[]> {
    try {
      const res = await api.get<{ projects: ProjectHealthEntry[] }>("/api/health/projects");
      return res.projects;
    } catch {
      return projects;
    }
  },
};
