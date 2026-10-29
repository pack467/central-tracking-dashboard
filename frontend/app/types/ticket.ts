/**
 * Ticket DTO & Data Transfer Objects (NestJS Ready)
 *
 * Bentuk model DTO disesuaikan dengan skema NestJS Backend nanti:
 * - CamelCase naming convention
 * - Tanggal ISO 8601 (string)
 * - Mapper tipis mentransformasikan DTO <-> model UI internal (Ticket)
 */

import type { Ticket, TicketSeverity, TicketStatus, TicketType, TicketHistoryEntry } from "@/app/lib/types";

export interface TicketHistoryEntryDto {
  time: string;
  type?: string;
  action: string;
  author: string;
}

export interface TicketDto {
  id: string;
  subject: string;
  project: string;
  severity: TicketSeverity | string;
  priority?: string;
  category?: string;
  type?: TicketType | string;
  date?: string; // YYYY-MM-DD atau ISO string
  requestTime?: string;
  responseTime?: string;
  completionTime?: string;
  isStillOpen?: boolean;
  owner: string;
  owners?: string[];
  status: TicketStatus | string;
  createdAt: string; // ISO 8601 string di NestJS
  description?: string;
  escalationLevel?: string;
  escalatedTo?: string;
  escalatedAt?: string;
  agingHours?: number;
  responseMinutes?: number;
  resolutionMinutes?: number;
  rootCauseCategory?: string;
  slaTargetMinutes?: number;
  shift?: "Subuh" | "Pagi" | "Malam";
  history?: TicketHistoryEntryDto[];
  clientId?: string;
}

export interface CreateTicketDto {
  subject: string;
  project: string;
  severity: TicketSeverity | string;
  type: TicketType | string;
  owner: string;
  description?: string;
  category?: string;
  clientId?: string;
}

export interface UpdateTicketDto extends Partial<CreateTicketDto> {
  status?: TicketStatus | string;
  resolutionMinutes?: number;
  responseMinutes?: number;
}

/**
 * Mapper: TicketDto (NestJS) -> Ticket (UI Model)
 */
export function ticketDtoToModel(dto: TicketDto): Ticket {
  return {
    ...dto,
    created: dto.createdAt || dto.date || new Date().toISOString(),
    history: dto.history as TicketHistoryEntry[] | undefined,
  };
}

/**
 * Mapper: Ticket (UI Model) -> TicketDto (NestJS)
 */
export function ticketModelToDto(model: Ticket): TicketDto {
  return {
    ...model,
    createdAt: model.created || new Date().toISOString(),
  };
}
