/**
 * Central Tracking Dashboard - API Client & Service Layer
 * 
 * Provides unified request handling, error normalization, authentication header
 * injection, and service methods for all dashboard data models.
 */

import type {
  CheckpointAssessment,
  HandoverRecordData,
  MonitoringEntry,
  ProjectHealthEntry,
  RosterMember,
  ShiftSwapRequest,
  StoredHandoverRecord,
  Ticket,
} from "@/app/lib/types";
import {
  attentionItems,
  initialHandoverRecord,
  monitoringSchedule,
  projects,
  seedRosterMembers,
  seedSwapRequests,
  seedTickets,
} from "@/app/lib/data";

export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: unknown;
}

export class DashboardApiException extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(error: ApiError) {
    super(error.message);
    this.name = "DashboardApiException";
    this.status = error.status;
    this.code = error.code;
    this.details = error.details;
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl = "") {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${cleanPath}`, typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { params, timeoutMs = DEFAULT_TIMEOUT_MS, headers: customHeaders, ...fetchOptions } = options;

    const url = this.buildUrl(path, params);

    const headers = new Headers(customHeaders);
    if (!headers.has("Content-Type") && !(fetchOptions.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
    if (this.token) {
      headers.set("Authorization", `Bearer ${this.token}`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: response.statusText };
        }

        throw new DashboardApiException({
          message: errorData.error || errorData.message || `API request failed with status ${response.status}`,
          status: response.status,
          code: errorData.code,
          details: errorData,
        });
      }

      if (response.status === 204) {
        return undefined as unknown as T;
      }

      return await response.json();
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err instanceof DashboardApiException) {
        throw err;
      }
      if (err.name === "AbortError") {
        throw new DashboardApiException({
          message: "Request timeout — server took too long to respond.",
          status: 408,
          code: "TIMEOUT",
        });
      }
      throw new DashboardApiException({
        message: err.message || "Network error occurred.",
        status: 0,
        code: "NETWORK_ERROR",
        details: err,
      });
    }
  }

  get<T>(path: string, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
    return this.request<T>(path, { ...options, method: "GET" });
  }

  post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(path: string, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
    return this.request<T>(path, { ...options, method: "DELETE" });
  }
}

export const api = new ApiClient();

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
