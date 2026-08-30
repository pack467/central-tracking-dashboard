export type Tone = "critical" | "warning" | "success" | "neutral" | "info";

export type ToastTone = Tone;

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string | number;
  message: string;
  tone: ToastTone;
  renderKey?: string | number;
  action?: ToastAction;
}

export interface CheckpointAssessment {
  verdict: "ok" | "nok" | "adequate" | "not-adequate";
  note: string;
}

export interface TicketHistoryEntry {
  time: string;
  action: string;
  author: string;
}

export interface Ticket {
  id: string;
  subject: string;
  project: string;
  severity: string;
  category?: string;
  requestTime?: string;
  responseTime?: string;
  completionTime?: string;
  isStillOpen?: boolean;
  owner: string;
  status: string;
  created: string;
  description?: string;
  history?: TicketHistoryEntry[];
}

export type HandoverState = "repeat" | "waiting" | "in-progress";

export interface HandoverTask {
  id: number;
  title: string;
  project: string;
  detail: string;
  state: HandoverState;
  completed: boolean;
}

export interface HandoverFinding {
  project: string;
  title: string;
  detail: string;
  state: "waiting" | "in-progress";
}

export interface HandoverRecordData {
  sourceShift: string;
  targetShift: string;
  sourcePic: string;
  targetPic: string;
  monitoringSummary: string;
  monitoringOwner: string;
  monitoredProjects: string[];
  validationNote: string;
  findings: HandoverFinding[];
  tasks: HandoverTask[];
}

export interface StoredHandoverRecord {
  id: number;
  title: string;
  handoverDate: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export type HandoverDraft = {
  date: string;
  sourceShift: string;
  targetShift: string;
  sourcePic: string;
  targetPic: string;
  monitoringOwner: string;
  monitoredProjects: string;
  monitoringSummary: string;
  validationNote: string;
  findings: HandoverFinding[];
  tasks: HandoverTask[];
};

export interface MonitoringEntry {
  time: string;
  project: string;
  task: string;
  owner: string;
  state: string;
  tone: Tone;
  overview?: boolean;
}

export interface ProjectHealthEntry {
  name: string;
  status: string;
  detail: string;
  tone: Tone;
}

export type RosterMemberStatus = "Active" | "On Break" | "Off Duty" | "On Leave";
export type RosterRole = "Operator NOC" | "Shift Lead" | "Incident Coordinator" | "L2 Specialist" | "Infrastructure Engineer";
export type DayScheduleType = "Pagi" | "Sore" | "Malam" | "Off" | "Leave";

export interface DayScheduleEntry {
  day: string; // "Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"
  date: string; // "25 Aug"
  shift: DayScheduleType;
  hours?: string;
}

export interface RosterMember {
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

export interface ShiftSwapRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  targetMemberId: string;
  targetMemberName: string;
  requestedDate: string;
  currentShift: string;
  targetShift: string;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  createdAt: string;
}
