/**
 * Shift & Handover DTO (NestJS Ready)
 */

import type { StoredHandoverRecord, ShiftSwapRequest } from "@/app/lib/types";

export interface HandoverRecordDto {
  id: number;
  title: string;
  handoverDate: string; // ISO date string (YYYY-MM-DD or ISO 8601)
  content: string; // Serialized JSON of HandoverRecordData
  createdAt: string;
  updatedAt: string;
  revision?: number;
}

export interface ShiftSwapDto {
  id: string;
  requesterId: string;
  requesterName: string;
  targetMemberId: string;
  targetMemberName: string;
  requestedDate: string;
  currentShift: string;
  targetShift: string;
  status: "Pending" | "Approved" | "Rejected";
  reason: string;
  createdAt: string;
}

export function handoverDtoToModel(dto: HandoverRecordDto): StoredHandoverRecord {
  return {
    id: dto.id,
    title: dto.title,
    handoverDate: dto.handoverDate,
    content: dto.content,
    createdAt: dto.createdAt || new Date().toISOString(),
    updatedAt: dto.updatedAt || new Date().toISOString(),
    revision: dto.revision,
  };
}

export function shiftSwapDtoToModel(dto: ShiftSwapDto): ShiftSwapRequest {
  return {
    id: dto.id,
    requesterId: dto.requesterId,
    requesterName: dto.requesterName,
    targetMemberId: dto.targetMemberId,
    targetMemberName: dto.targetMemberName,
    requestedDate: dto.requestedDate,
    currentShift: dto.currentShift,
    targetShift: dto.targetShift,
    reason: dto.reason,
    status: dto.status,
    createdAt: dto.createdAt,
  };
}
