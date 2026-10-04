export type Tone =
  | "critical"
  | "warning"
  | "success"
  | "neutral"
  | "info"
  | "high"
  | "low"
  | "orange"
  | "teal";

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

export interface HistoricalAssessmentEntry {
  id: string;
  date: string; // YYYY-MM-DD
  time: string;
  project: string;
  task: string;
  owner: string;
  verdict: "ok" | "nok";
  note: string;
  clientId?: string;
}

export type TicketActivityType =
  | "created"
  | "user_request"
  | "response"
  | "status_change";

export interface TicketHistoryEntry {
  time: string;
  type?: TicketActivityType | string;
  action: string;
  author: string;
}

export type TicketType =
  | "Incident"
  | "Ad-hoc Request"
  | "Maintenance"
  | "Change Request"
  | "Escalation"
  | "Monitoring Alert"
  | "Other";

export interface Ticket {
  id: string;
  subject: string;
  project: string;
  severity: string;
  priority?: string;
  category?: string;
  type?: TicketType | string;
  date?: string; // YYYY-MM-DD
  requestTime?: string;
  responseTime?: string;
  completionTime?: string;
  isStillOpen?: boolean;
  owner: string;
  owners?: string[];
  status: string;
  created: string;
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
  history?: TicketHistoryEntry[];
  clientId?: string;
}

export type HandoverState =
  | "repeat"
  | "waiting"
  | "in-progress"
  | "activity"
  | "escalated"
  | "blocked"
  | "waiting-vendor"
  | "done"
  | string;

export interface HandoverTask {
  id: number;
  taskTemplateId?: string | number;
  isNewlyAdded?: boolean;
  title: string;
  project: string;
  detail: string;
  state: HandoverState;
  priority?: "Critical" | "High" | "Medium" | "Low" | string;
  completed: boolean;
  sourceRef?: string;
  confirmedBy?: string;
  confirmedAt?: string;
}

export interface HandoverCheckpoint {
  time: string;
  project: string;
  task: string;
  verdict: "ok" | "nok";
  note?: string;
}

export interface HandoverFinding {
  project: string;
  title: string;
  detail: string;
  state: "waiting" | "in-progress";
  sourceRef?: string;
}

export interface HandoverActor {
  id: string;
  name: string;
  email: string;
  local?: boolean;
}

export interface MonitoringException {
  project: string;
  reason: string;
}

export interface HandoverAuditEntry {
  action: "created" | "edited" | "task-confirmed" | "task-unconfirmed" | "task-deleted" | "accepted" | "reopened";
  actor: HandoverActor;
  at: string;
  taskId?: number;
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
  notes?: string;
  openTickets?: Ticket[];
  closedTickets?: Ticket[];
  findings: HandoverFinding[];
  tasks: HandoverTask[];
  receiverEmail?: string;
  monitoringExceptions?: MonitoringException[];
  monitoringCheckpoints?: HandoverCheckpoint[];
  createdBy?: HandoverActor;
  acceptance?: { actor: HandoverActor; at: string } | null;
  auditTrail?: HandoverAuditEntry[];
}

export interface StoredHandoverRecord {
  id: number;
  title: string;
  handoverDate: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  revision?: number;
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
  notes?: string;
  findings: HandoverFinding[];
  tasks: HandoverTask[];
  openTickets?: Ticket[];
  closedTickets?: Ticket[];
  receiverEmail?: string;
  monitoringExceptions?: MonitoringException[];
};

export interface MonitoringEntry {
  time: string;
  project: string;
  task: string;
  owner: string;
  state: string;
  tone: Tone;
  overview?: boolean;
  clientId?: string;
}

export interface ProjectHealthEntry {
  name: string;
  status: string;
  detail: string;
  tone: Tone;
  clientId?: string;
}

export type RosterMemberStatus = "Active" | "On Break" | "Off Duty" | "On Leave";
export type RosterRole = "Operator NOC" | "Shift Lead" | "Incident Coordinator" | "L2 Specialist" | "Infrastructure Engineer";
export type DayScheduleType = "Subuh" | "Pagi" | "Malam" | "Off" | "Leave";

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

/* ── Runbooks Types ── */

export type SopCategory = "Monitoring" | "Incident" | "Handover" | "Maintenance" | "General";

export interface SopStep {
  order: number;
  instruction: string;
}

export type SopAttachmentType = "pdf" | "word" | "video" | "report" | "sheet" | "doc" | "link";

export interface SopAttachment {
  id: string;
  title: string;
  url: string;
  type: SopAttachmentType;
  format?: string;
  description?: string;
}

export interface SopEntry {
  id: string;
  title: string;
  category: SopCategory;
  project?: string;
  description?: string;
  steps?: SopStep[];
  attachments?: SopAttachment[];
  externalLinks?: { label: string; url: string }[];
  updatedAt: string;
  updatedBy: string;
}

export type CredentialCategory = "Website" | "VPN" | "SSH" | "API";

export interface CredentialEntry {
  id: string;
  label: string;
  category: CredentialCategory;
  project?: string;
  url?: string;
  host?: string;
  port?: string;
  username: string;
  password: string;
  protocol?: string;
  notes?: string;
  expiresAt?: string;
}

export type LinkCategory = "Dashboard" | "Ticketing" | "Internal" | "Vendor";

export interface QuickLink {
  id: string;
  label: string;
  url: string;
  category: LinkCategory;
  project?: string;
  description?: string;
  icon?: string;
}

export type EscalationLevel = "L1" | "L2" | "L3" | "Vendor";

export interface EscalationContact {
  id: string;
  project: string;
  level: EscalationLevel;
  name: string;
  role: string;
  phone?: string;
  email?: string;
  channel?: string;
  responseTarget: string;
  notes?: string;
}
