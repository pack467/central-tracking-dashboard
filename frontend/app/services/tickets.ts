/**
 * Tickets Service (NestJS Ready with Mock Adapter)
 *
 * Mengambil tiket dari API NestJS (`/tickets`) atau Mock Adapter (`mockAdapter`)
 * berdasarkan environment variable NEXT_PUBLIC_USE_MOCK.
 */

import { isMockMode } from "@/app/lib/config";
import { apiClient } from "@/app/lib/api/client";
import { mockAdapter } from "./mock-adapter";
import { fetchAllTickets, ticketsFromBackend } from "./backend-tickets";
import { ticketDtoToModel, ticketModelToDto, type TicketDto } from "@/app/types/ticket";
import type { ApiPaginatedResponse, ApiQueryParams } from "@/app/types/api";
import type { Ticket } from "@/app/lib/types";

export const ticketsService = {
  async list(params?: ApiQueryParams, signal?: AbortSignal): Promise<Ticket[]> {
    if (ticketsFromBackend()) {
      // all tickets of the backend; the view filters, sorts and pages them itself
      const all = await fetchAllTickets();
      const clientId = ((params?.clientId as string | undefined) || "tritronik").toLowerCase();
      return all.filter(ticket => (ticket.clientId || "tritronik").toLowerCase() === clientId);
    }
    if (isMockMode()) {
      return mockAdapter.getTickets(params?.clientId as string | undefined, signal);
    }

    const res = await apiClient.get<ApiPaginatedResponse<TicketDto>>("/tickets", {
      params,
      signal,
    });

    if (res && Array.isArray(res.data)) {
      return res.data.map(ticketDtoToModel);
    }
    return [];
  },

  async getById(id: string, signal?: AbortSignal): Promise<Ticket | null> {
    if (ticketsFromBackend()) return (await fetchAllTickets()).find(ticket => ticket.id.toLowerCase() === id.toLowerCase()) ?? null;
    if (isMockMode()) {
      const tickets = await mockAdapter.getTickets(undefined, signal);
      return tickets.find((t) => t.id.toLowerCase() === id.toLowerCase()) ?? null;
    }

    const res = await apiClient.get<{ data: TicketDto }>(`/tickets/${id}`, { signal });
    return res?.data ? ticketDtoToModel(res.data) : null;
  },

  async create(payload: Partial<Ticket>, signal?: AbortSignal): Promise<Ticket> {
    if (isMockMode()) {
      const newTicket = {
        ...payload,
        id: payload.id || `TICK-${Date.now().toString().slice(-4)}`,
        created: payload.created || new Date().toISOString(),
      } as Ticket;
      return newTicket;
    }

    const dto = ticketModelToDto(payload as Ticket);
    const res = await apiClient.post<{ data: TicketDto }>("/tickets", dto, { signal });
    return ticketDtoToModel(res.data);
  },

  async update(id: string, payload: Partial<Ticket>, signal?: AbortSignal): Promise<Ticket> {
    if (isMockMode()) {
      return { ...payload, id } as Ticket;
    }

    const dto = ticketModelToDto(payload as Ticket);
    const res = await apiClient.patch<{ data: TicketDto }>(`/tickets/${id}`, dto, { signal });
    return ticketDtoToModel(res.data);
  },
};
