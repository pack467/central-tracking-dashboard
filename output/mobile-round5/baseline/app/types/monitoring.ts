/**
 * Monitoring DTO & Data Transfer Objects (NestJS Ready)
 */

import type {
  MonitoringEntry,
  HistoricalAssessmentEntry,
  Tone,
} from "@/app/lib/types";

export interface MonitoringEntryDto {
  time: string;
  project: string;
  task: string;
  owner: string;
  state: string;
  tone: Tone;
  overview?: boolean;
  clientId?: string;
}

export interface CheckpointAssessmentDto {
  key: string;
  verdict: "ok" | "nok" | "adequate" | "not-adequate" | null;
  note?: string;
  assessedAt?: string;
  assessedBy?: string;
}

export interface HistoricalAssessmentDto {
  id: string;
  date: string;
  time: string;
  project: string;
  task: string;
  owner: string;
  verdict: "ok" | "nok";
  note: string;
  clientId?: string;
}

export interface ProjectHealthDto {
  name: string;
  status: string;
  detail: string;
  tone: Tone;
  clientId?: string;
}

export function monitoringDtoToModel(dto: MonitoringEntryDto): MonitoringEntry {
  return { ...dto };
}

export function historicalAssessmentDtoToModel(dto: HistoricalAssessmentDto): HistoricalAssessmentEntry {
  return { ...dto };
}
