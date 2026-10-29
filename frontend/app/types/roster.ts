/**
 * Team Roster DTO (NestJS Ready)
 */

import type { RosterMember, RosterRole, RosterMemberStatus, DayScheduleEntry } from "@/app/lib/types";

export interface RosterMemberDto {
  id: string;
  name: string;
  role: RosterRole;
  employeeId: string;
  email: string;
  phone: string;
  currentShift: string;
  status: RosterMemberStatus;
  joinDate: string;
  avatarBg?: string;
  weeklySchedule: DayScheduleEntry[];
  stats: {
    onTimePercentage: number;
    shiftsCompleted: number;
    handoverScore: number;
  };
  history: {
    date: string;
    shift: string;
    status: "Present" | "Late" | "Leave" | "Swapped";
    note?: string;
  }[];
}

export function rosterDtoToModel(dto: RosterMemberDto): RosterMember {
  return { ...dto };
}

export function rosterModelToDto(model: RosterMember): RosterMemberDto {
  return { ...model };
}
