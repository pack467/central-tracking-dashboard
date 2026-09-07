export type ShiftId = "subuh" | "pagi" | "malam";

export interface ShiftInfo {
  id: ShiftId;
  name: string;
  label: string;
  shortLabel: "Subuh" | "Pagi" | "Malam";
  period: string;
  tag: "SUBUH" | "PAGI" | "MALAM";
  color: string;
  badgeClass: `topbar-shift-${ShiftId}`;
}

export const shiftDefinitions: Record<ShiftId, ShiftInfo> = {
  subuh: {
    id: "subuh",
    name: "Shift Subuh (00:00 – 08:30)",
    label: "Shift Subuh",
    shortLabel: "Subuh",
    period: "00:00 – 08:30 WIB",
    tag: "SUBUH",
    color: "#94a3b8",
    badgeClass: "topbar-shift-subuh",
  },
  pagi: {
    id: "pagi",
    name: "Shift Pagi (08:00 – 16:30)",
    label: "Shift Pagi",
    shortLabel: "Pagi",
    period: "08:00 – 16:30 WIB",
    tag: "PAGI",
    color: "var(--orange)",
    badgeClass: "topbar-shift-pagi",
  },
  malam: {
    id: "malam",
    name: "Shift Malam (16:00 – 00:30)",
    label: "Shift Malam",
    shortLabel: "Malam",
    period: "16:00 – 00:30 WIB",
    tag: "MALAM",
    color: "var(--purple)",
    badgeClass: "topbar-shift-malam",
  },
};

/**
 * The published handover windows overlap by 30 minutes. Live ownership is
 * unambiguous: the most recently started shift takes precedence at 08:00 and
 * 16:00, and Subuh starts again at midnight.
 */
export function getShiftInfoForMinutes(totalMinutes: number): ShiftInfo {
  const minuteOfDay = ((totalMinutes % 1_440) + 1_440) % 1_440;

  if (minuteOfDay >= 16 * 60) return shiftDefinitions.malam;
  if (minuteOfDay >= 8 * 60) return shiftDefinitions.pagi;
  return shiftDefinitions.subuh;
}

export function getShiftInfo(date: Date = new Date()): ShiftInfo {
  return getShiftInfoForMinutes(date.getHours() * 60 + date.getMinutes());
}

export function getNextShiftChange(date: Date = new Date()): Date {
  const next = new Date(date);
  const totalMinutes = date.getHours() * 60 + date.getMinutes();

  if (totalMinutes < 8 * 60) {
    next.setHours(8, 0, 0, 20);
  } else if (totalMinutes < 16 * 60) {
    next.setHours(16, 0, 0, 20);
  } else {
    next.setDate(next.getDate() + 1);
    next.setHours(0, 0, 0, 20);
  }

  return next;
}

/**
 * Checks if a member's assigned shift matches the active shift.
 */
export function isShiftActiveForMember(memberShift: string, activeShift: ShiftInfo | ShiftId): boolean {
  const activeId = typeof activeShift === "string" ? activeShift : activeShift.id;
  const s = memberShift.toLowerCase();
  if (s.includes("cuti") || s.includes("leave")) return false;
  if (activeId === "subuh") return s.includes("subuh");
  if (activeId === "pagi") return s.includes("pagi");
  if (activeId === "malam") return s.includes("malam");
  return false;
}

/**
 * Derives a staff member's real-time status:
 * - If manually marked "On Leave" or "On Break", that explicit status takes priority.
 * - Otherwise, status is "Active" if currentShift matches activeShift, else "Off Duty".
 */
export function getDerivedMemberStatus(
  member: { currentShift: string; status: "Active" | "On Break" | "Off Duty" | "On Leave" },
  activeShift: ShiftInfo | ShiftId
): "Active" | "On Break" | "Off Duty" | "On Leave" {
  // Explicit manual statuses take priority
  if (
    member.status === "On Leave" ||
    member.currentShift.toLowerCase().includes("leave") ||
    member.currentShift.toLowerCase().includes("cuti")
  ) {
    return "On Leave";
  }

  if (member.status === "On Break") {
    // If on break during their shift, stay On Break; if shift is inactive, they are Off Duty
    return isShiftActiveForMember(member.currentShift, activeShift) ? "On Break" : "Off Duty";
  }

  // Automatic time-derived calculation
  return isShiftActiveForMember(member.currentShift, activeShift) ? "Active" : "Off Duty";
}

