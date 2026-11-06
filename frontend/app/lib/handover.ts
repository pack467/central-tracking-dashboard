import type { CheckpointAssessment, HandoverActor, HandoverDraft, HandoverRecordData, HandoverTask, RosterMember, Ticket } from "./types";
import { createShiftHandoverDraft, initialHandoverRecord, initialHandoverTasks, isOpenTicket, monitoringSchedule, STANDARD_MONITORED_PROJECTS } from "./data";
import { getNextShiftChange, getShiftInfo, getShiftInfoForMinutes, isShiftActiveForMember, type ShiftId } from "./shifts";
import { ticketCode } from "@/app/lib/ticket-code";

export const emptyHandoverRecord: HandoverRecordData = {
  sourceShift: "", targetShift: "", sourcePic: "", targetPic: "", monitoringOwner: "",
  monitoredProjects: [], monitoringSummary: "", validationNote: "", notes: "", openTickets: [], tasks: [], findings: [],
  monitoringExceptions: [], receiverEmail: "", acceptance: null, auditTrail: [],
};

export class HandoverError extends Error {
  public status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const textValue = (value: unknown, max = 5000): string => {
  if (typeof value !== "string" || value.length > max) throw new HandoverError("Format atau panjang isian handover tidak valid.");
  return value.trim();
};
const optionalText = (value: unknown, max = 5000) => value == null ? "" : textValue(value, max);
const objectValue = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new HandoverError("Format catatan handover tidak valid.");
  return value as Record<string, unknown>;
};
const arrayValue = (value: unknown, max = 200): unknown[] => {
  if (!Array.isArray(value) || value.length > max) throw new HandoverError(`Daftar handover tidak valid atau melebihi ${max} item.`);
  return value;
};

const TICKET_TEXT = ["id", "subject", "project", "severity", "priority", "status", "owner", "source", "description", "category", "date", "requestTime", "created", "createdAt", "updatedAt", "clientId"] as const;
const TICKET_NUMBER = ["agingHours", "resolutionMinutes", "responseMinutes"] as const;
/**
  * A ticket kept in a stored note, reduced to the fields a note shows, each of the right type and length. An entry without an id and a
  * subject is dropped. Lists in a note sent by the browser are not taken at all (see validateDraft): these come from notes already stored.
  */
function storedTickets(value: unknown): Ticket[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.slice(0, 200).flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const source = item as Record<string, unknown>;
    const ticket: Record<string, string | number> = {};
    for (const key of TICKET_TEXT) if (typeof source[key] === "string" && (source[key] as string).length <= (key === "description" ? 5000 : 300)) ticket[key] = source[key] as string;
    for (const key of TICKET_NUMBER) if (typeof source[key] === "number" && Number.isFinite(source[key])) ticket[key] = source[key] as number;
    return ticket.id && ticket.subject ? [ticket as unknown as Ticket] : [];
  });
}

function getShiftLabelFromTime(timeStr: string, fallbackShift = ""): string {
  const match = /^(\d{1,2}):(\d{2})/.exec((timeStr || "").trim());
  if (match) {
    const mins = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
    return getShiftInfoForMinutes(mins).label;
  }
  if (fallbackShift) {
    return fallbackShift.toLowerCase().startsWith("shift") ? fallbackShift : `Shift ${fallbackShift}`;
  }
  return "Shift Aktif";
}

export function parseHandoverContent(content: string): HandoverRecordData {
  if (typeof content !== "string" || !content.trim()) {
    throw new HandoverError("Data catatan handover tidak valid.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new HandoverError("Format JSON catatan handover tidak valid.");
  }
  const raw = objectValue(parsed);
  const tasks = arrayValue(raw.tasks).map((value) => {
    const task = objectValue(value);
    if (!Number.isSafeInteger(task.id) || !["repeat", "waiting", "in-progress"].includes(String(task.state))) throw new HandoverError("Data tugas tidak valid.");
    return {
      id: task.id as number,
      ...(task.taskTemplateId !== undefined ? { taskTemplateId: task.taskTemplateId as string | number } : {}),
      ...(typeof task.isNewlyAdded === "boolean" ? { isNewlyAdded: task.isNewlyAdded } : {}),
      title: textValue(task.title, 300),
      project: textValue(task.project, 120),
      detail: textValue(task.detail),
      state: task.state as "repeat" | "waiting" | "in-progress",
      // the form sets it and the note shows it; dropping it here lost it on every save
      ...(["Critical", "High", "Medium", "Low"].includes(String(task.priority)) ? { priority: task.priority as string } : {}),
      completed: task.completed === true,
      ...(task.sourceRef ? { sourceRef: textValue(task.sourceRef, 200) } : {}),
      // who ticked it and when; dropping these here lost them on the next save of the note
      ...(task.completed === true && task.confirmedBy ? { confirmedBy: textValue(task.confirmedBy, 500) } : {}),
      ...(task.completed === true && task.confirmedAt ? { confirmedAt: textValue(task.confirmedAt, 40) } : {}),
      ...(task.completed === true && task.ticketId ? { ticketId: textValue(task.ticketId, 200), ticketCode: optionalText(task.ticketCode, 200) } : {}),
    };
  });
  if (new Set(tasks.map((task) => task.id)).size !== tasks.length) throw new HandoverError("ID tugas harus unik.");
  const findings = arrayValue(raw.findings).map((value) => {
    const finding = objectValue(value);
    if (!["waiting", "in-progress"].includes(String(finding.state))) throw new HandoverError("Status temuan tidak valid.");
    return { project: textValue(finding.project, 120), title: textValue(finding.title, 300), detail: textValue(finding.detail), state: finding.state as "waiting" | "in-progress", ...(finding.sourceRef ? { sourceRef: textValue(finding.sourceRef, 200) } : {}) };
  });
  const monitoringCheckpoints = Array.isArray(raw.monitoringCheckpoints)
    ? arrayValue(raw.monitoringCheckpoints).map((value) => {
        const cp = objectValue(value);
        const v = String(cp.verdict || "ok").toLowerCase();
        const verdict: "ok" | "nok" = v === "nok" || v === "not-adequate" ? "nok" : "ok";
        return {
          time: textValue(cp.time, 40),
          project: textValue(cp.project, 120),
          task: textValue(cp.task, 300),
          verdict,
          ...(cp.note ? { note: optionalText(cp.note, 2000) } : {}),
          ...(cp.owner ? { owner: optionalText(cp.owner, 200) } : {}),
          ...(cp.shift ? { shift: optionalText(cp.shift, 60) } : {}),
        };
      })
    : undefined;
  return {
    ...(raw.organization ? { organization: textValue(raw.organization, 200) } : {}),
    sourceShift: textValue(raw.sourceShift, 40), targetShift: textValue(raw.targetShift, 40),
    sourcePic: textValue(raw.sourcePic, 500), targetPic: textValue(raw.targetPic, 500),
    receiverEmail: optionalText(raw.receiverEmail, 254).toLowerCase(),
    monitoringOwner: textValue(raw.monitoringOwner, 500), monitoringSummary: textValue(raw.monitoringSummary),
    monitoredProjects: arrayValue(raw.monitoredProjects).map((project) => textValue(project, 120)),
    validationNote: textValue(raw.validationNote),
    notes: optionalText(raw.notes, 5000),
    openTickets: storedTickets(raw.openTickets),
    closedTickets: storedTickets(raw.closedTickets),
    tasks, findings,
    ...(monitoringCheckpoints !== undefined ? { monitoringCheckpoints } : {}),
    monitoringExceptions: arrayValue(raw.monitoringExceptions ?? []).map((value) => {
      const exception = objectValue(value);
      return { project: textValue(exception.project, 120), reason: textValue(exception.reason) };
    }),
    createdBy: raw.createdBy as HandoverActor | undefined,
    acceptance: (raw.acceptance ?? null) as HandoverRecordData["acceptance"],
    auditTrail: arrayValue(raw.auditTrail ?? [], 2000) as NonNullable<HandoverRecordData["auditTrail"]>,
  };
}

/** What a handover calls work that belongs to no project. */
export const GENERAL_PROJECT = "Umum";
/**
 * The form no longer offers two things: the general project used to be called NOC, and tasks could be Critical. A draft, a note being revised
 * and tasks carried over from the last note follow the form; a stored note stays as it was written.
 */
export function withCurrentChoices(draft: HandoverDraft): HandoverDraft {
  const renamed = <T extends { project: string }>(item: T): T => (item.project === "NOC" ? { ...item, project: GENERAL_PROJECT } : item);
  return {
    ...draft,
    tasks: draft.tasks.map(task => { const next = renamed(task); return next.priority === "Critical" ? { ...next, priority: "High" } : next; }),
    findings: draft.findings.map(renamed),
  };
}

export function validateDraft(draft: HandoverDraft): HandoverRecordData {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date) || Number.isNaN(Date.parse(draft.date)) || new Date(draft.date).toISOString().slice(0, 10) !== draft.date) throw new HandoverError("Tanggal serah terima tidak valid.");
  const record = parseHandoverContent(JSON.stringify({ ...draft, monitoredProjects: draft.monitoredProjects.split(",").map((p) => p.trim()).filter(Boolean) }));
  if (!["Subuh>Pagi", "Pagi>Malam", "Malam>Subuh"].includes(`${record.sourceShift}>${record.targetShift}`)) throw new HandoverError("Pilih rotasi Subuh → Pagi, Pagi → Malam, atau Malam → Subuh.");
  if (!record.sourcePic || !record.targetPic) throw new HandoverError("Isi PIC pengirim dan penerima.");
  if (record.receiverEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.receiverEmail)) throw new HandoverError("Format email akun penerima tidak valid.");
  if (record.tasks.some((task) => !task.title || !task.project)) throw new HandoverError("Isi judul dan proyek setiap tugas.");
  if (record.findings.some((finding) => !finding.project || !finding.title || !finding.detail)) throw new HandoverError("Lengkapi proyek, judul, dan rincian setiap temuan atau hapus temuan kosong.");
  const coverage = [...record.monitoredProjects, ...(record.monitoringExceptions ?? []).map((item) => item.project)].map((p) => p.toLowerCase());
  if (new Set(coverage).size !== coverage.length) throw new HandoverError("Proyek monitoring tidak boleh duplikat atau sekaligus ditandai tidak dimonitor.");
  if (record.monitoringExceptions?.some((item) => !item.project || !item.reason)) throw new HandoverError("Isi alasan untuk setiap proyek yang tidak dimonitor.");
  // a new or revised note starts unticked: who confirmed a task, or which ticket it became, is never taken from the sender's draft
  record.tasks = record.tasks.map((task) => ({ ...task, confirmedBy: undefined, confirmedAt: undefined, ticketId: undefined, ticketCode: undefined }));
  // Nor are ticket lists: the browser could write any ticket into them. The app never sends its own (a note's open tickets come from its
  // tasks' "ticket:<id>" references, read against the live ticket list); a revision keeps the lists already stored (api/handovers/[id]).
  record.openTickets = undefined;
  record.closedTickets = undefined;
  record.monitoringOwner ||= record.sourcePic;
  record.monitoringSummary ||= "Monitoring belum dicatat.";
  record.validationNote ||= "Menunggu validasi shift penerima.";
  if (JSON.stringify(record).length > 50000) throw new HandoverError("Catatan terlalu panjang (maksimal 50.000 karakter).");
  return record;
}

export function canEditHandover(record: HandoverRecordData, actor: HandoverActor | null) {
  return Boolean(actor && (!record.createdBy || record.createdBy.id === actor.id));
}
export function canReceiveHandover(_record: HandoverRecordData, actor: HandoverActor | null) {
  return Boolean(actor);
}
/**
 * Deleting a note, or a task from its checklist: the sender or the receiver (anyone, when no receiving account is named). Once a note has
 * been accepted the receiver is known, and it is a record of what happened, so only the sender and the person who accepted it may delete it.
 */
export function canDeleteHandover(record: HandoverRecordData, actor: HandoverActor | null) {
  if (!actor) return false;
  if (record.acceptance) return record.createdBy?.id === actor.id || record.acceptance.actor?.id === actor.id;
  if (canEditHandover(record, actor)) return true;
  if (record.receiverEmail) {
    return record.receiverEmail.toLowerCase() === actor.email.toLowerCase();
  }
  return true;
}

/**
 * Team rule: whoever hands over or takes over may add and delete a handover and its tasks, i.e. a person scheduled on the handover's
 * source or target shift. A person on leave may not. A person with no known shift (not scheduled in Master Data, as people from the
 * backend are) is not held back: their shift cannot be checked. The handover API does not know shifts, so this is checked in the app.
 */
export function isInHandoverShift(memberShift: string | null | undefined, record: Pick<HandoverRecordData, "sourceShift" | "targetShift">) {
  const shift = (memberShift ?? "").toLowerCase();
  if (!/subuh|pagi|malam|cuti|leave/.test(shift)) return true;
  return [record.sourceShift, record.targetShift].some((value) => isShiftActiveForMember(shift, value.toLowerCase() as ShiftId));
}
export function handoverShiftRuleMessage(record: Pick<HandoverRecordData, "sourceShift" | "targetShift">, what: string) {
  return `Hanya anggota Shift ${record.sourceShift} atau Shift ${record.targetShift} yang dapat ${what}.`;
}

/** The checklist of a revised note starts over, except the tasks that became tickets: those tickets exist, and Done on them again would ask for another. */
export function restartChecklist(stored: readonly HandoverTask[], revised: readonly HandoverTask[]): HandoverTask[] {
  return revised.map((task) => {
    const done = stored.find((item) => item.id === task.id && item.ticketId);
    return done ? { ...task, completed: true, confirmedBy: done.confirmedBy, confirmedAt: done.confirmedAt, ticketId: done.ticketId, ticketCode: done.ticketCode } : { ...task, completed: false };
  });
}

export function updateHandoverRecord(record: HandoverRecordData, actor: HandoverActor, action: string, payload: Record<string, unknown>, now = new Date().toISOString()) {
  const next = structuredClone(record);
  let auditAction: NonNullable<HandoverRecordData["auditTrail"]>[number]["action"];
  if (action === "task") {
    if (!canReceiveHandover(record, actor) && !canEditHandover(record, actor)) throw new HandoverError("Checklist hanya dapat diubah oleh pengguna yang sudah login.", 403);
    if (record.acceptance) throw new HandoverError("Handover sudah diterima. Pengirim harus merevisi catatan sebelum checklist dapat diubah.", 409);
    const task = next.tasks.find((item) => item.id === payload.taskId);
    if (!task || typeof payload.completed !== "boolean") throw new HandoverError("Tugas atau status checklist tidak valid.");
    if (task.ticketId && !payload.completed) throw new HandoverError("Tugas ini sudah menjadi tiket, jadi tidak bisa dibatalkan dari sini.", 409);
    task.completed = payload.completed;
    if (task.completed) {
      task.confirmedBy = actor.name;
      task.confirmedAt = now;
      if (payload.ticket !== undefined && !task.ticketId) {
        const ticket = objectValue(payload.ticket);
        const id = textValue(ticket.id, 200);
        if (!id) throw new HandoverError("Tiket tugas tidak valid.");
        task.ticketId = id;
        task.ticketCode = optionalText(ticket.code, 200) || id;
      }
    } else {
      task.confirmedBy = undefined;
      task.confirmedAt = undefined;
    }
    auditAction = task.completed ? "task-confirmed" : "task-unconfirmed";
  } else if (action === "delete-task") {
    if (!canDeleteHandover(record, actor)) throw new HandoverError("Tugas hanya dapat dihapus oleh pengirim atau akun penerima yang dituju.", 403);
    if (record.acceptance) throw new HandoverError("Handover sudah diterima. Pengirim harus merevisi catatan sebelum checklist dapat diubah.", 409);
    const taskIndex = next.tasks.findIndex((item) => item.id === payload.taskId);
    if (taskIndex === -1) throw new HandoverError("Tugas tidak ditemukan.");
    if (next.tasks[taskIndex].ticketId) throw new HandoverError("Tugas ini sudah menjadi tiket, jadi tidak bisa dihapus.", 409);
    next.tasks.splice(taskIndex, 1);
    auditAction = "task-deleted";
  } else if (action === "confirm") {
    if (!canReceiveHandover(record, actor)) throw new HandoverError("Masuk dengan akun Anda untuk menerima handover.", 403);
    if (record.acceptance) return record;
    next.acceptance = { actor, at: now };
    next.validationNote = optionalText(payload.note) || `Diterima oleh ${actor.name}.`;
    next.tasks = next.tasks.map((task) =>
      task.completed
        ? {
            ...task,
            confirmedBy: task.confirmedBy || actor.name,
            confirmedAt: task.confirmedAt || now,
          }
        : task
    );
    auditAction = "accepted";
  } else {
    throw new HandoverError("Aksi handover tidak dikenal.");
  }
  const trail = record.auditTrail ?? [];
  const last = trail[trail.length - 1];
  // Ticking a box and unticking it again (same person, same task, nothing in between) changes nothing, so it leaves no audit line. Without
  // this, clicking one checkbox back and forth grew the note until it hit the size limit and could not be saved any more.
  const undo = action === "task" && last?.taskId === payload.taskId && last?.actor?.id === actor.id
    && last?.action === (auditAction === "task-confirmed" ? "task-unconfirmed" : "task-confirmed");
  next.auditTrail = undo ? trail.slice(0, -1) : [...trail, { action: auditAction, actor, at: now, ...(action === "task" || action === "delete-task" ? { taskId: payload.taskId as number } : {}) }];
  return next;
}

export function buildDashboardHandoverDraft(
  input: {
    tickets: Ticket[];
    assessments: Record<string, CheckpointAssessment>;
    members: RosterMember[];
    actor: HandoverActor | null;
    previousRecord?: HandoverRecordData | null;
  },
  date = new Date()
): HandoverDraft {
  const draft = createShiftHandoverDraft(date);
  const currentShift = getShiftInfo(date);
  const nextShift = getShiftInfo(getNextShiftChange(date));
  const receivers = input.members.filter((member) => member.status !== "On Leave" && isShiftActiveForMember(member.currentShift, nextShift));
  const assessed = monitoringSchedule.flatMap((entry) => {
    const assessment = input.assessments[`${entry.time}-${entry.project}-${entry.task}`];
    return assessment ? [{ entry, assessment }] : [];
  });
  const monitoredProjects = Array.from(new Set(assessed.map(({ entry }) => entry.project).filter((project) => project !== "Handover")));
  const openTickets = input.tickets.filter(isOpenTicket);

  // Tasks from the previous shift that were marked Done (completed: true) or deleted are NOT carried over to the next shift.
  // Only tasks that remain uncompleted (completed: false) in the previous shift carry over.
  const prevTasks = input.previousRecord?.tasks;
  const completedIdentities = new Set<string>(
    (prevTasks ?? []).filter((task) => task.completed).map((task) => getTaskIdentity(task))
  );
  const baseTasks = prevTasks
    ? prevTasks
        .filter((task) => !task.completed)
        .map((task) => ({
          ...task,
          taskTemplateId: task.taskTemplateId || `standard-${task.id}`,
          isNewlyAdded: false,
          completed: false,
          confirmedBy: undefined,
          confirmedAt: undefined,
        }))
    : initialHandoverTasks
        .filter((task) => !task.completed)
        .map((task) => ({
          ...task,
          taskTemplateId: task.taskTemplateId || `standard-${task.id}`,
          isNewlyAdded: false,
          completed: false,
          confirmedBy: undefined,
          confirmedAt: undefined,
        }));

  const existingIdentities = new Set<string>(baseTasks.map((task) => getTaskIdentity(task)));

  const ticketTasks: HandoverTask[] = openTickets
    .filter((ticket) => {
      const ref = `ticket:${ticket.id}`;
      const tpl = `ticket-${ticket.id}`;
      return !existingIdentities.has(ref) && !existingIdentities.has(tpl) && !completedIdentities.has(ref) && !completedIdentities.has(tpl);
    })
    .map((ticket, index) => ({
      id: 1000 + index,
      taskTemplateId: `ticket-${ticket.id}`,
      isNewlyAdded: true,
      title: `Tindak lanjut #${ticketCode(ticket)}: ${ticket.subject}`,
      project: ticket.project,
      detail: `${ticket.description || ticket.subject}\nStatus: ${ticket.status}. PIC: ${ticket.owner}.`,
      state: "in-progress" as const,
      completed: false,
      sourceRef: `ticket:${ticket.id}`,
    }));

  const monitoringCheckpoints =
    assessed.length > 0
      ? assessed.map(({ entry, assessment }) => ({
          time: entry.time,
          project: entry.project,
          task: entry.task,
          verdict: ["nok", "not-adequate"].includes(assessment.verdict) ? ("nok" as const) : ("ok" as const),
          note: assessment.note || "",
          owner: entry.owner || input.actor?.name || "",
          shift: getShiftLabelFromTime(entry.time, currentShift.shortLabel),
        }))
      : (initialHandoverRecord.monitoringCheckpoints ?? []).map((cp) => ({
          ...cp,
          owner: cp.owner || input.actor?.name || initialHandoverRecord.monitoringOwner,
          shift: cp.shift || getShiftLabelFromTime(cp.time, currentShift.shortLabel),
        }));

  return {
    ...draft,
    sourceShift: currentShift.shortLabel,
    sourcePic: input.actor?.name ?? "", targetPic: receivers.map((member) => member.name).join(", "),
    receiverEmail: "", monitoringOwner: input.actor?.name ?? "",
    monitoredProjects: (monitoredProjects.length > 0 ? monitoredProjects : STANDARD_MONITORED_PROJECTS).join(", "),
    monitoringExceptions: [],
    monitoringCheckpoints,
    monitoringSummary: `Snapshot dashboard: ${assessed.length} checkpoint telah dinilai; ${openTickets.length} tiket masih terbuka. Tinjau tanggal dan cakupan data sebelum serah terima.`,
    findings: assessed.filter(({ assessment }) => ["nok", "not-adequate"].includes(assessment.verdict)).map(({ entry, assessment }) => ({ project: entry.project, title: `${entry.time} — ${entry.task}`, detail: assessment.note || "Checkpoint NOK memerlukan tindak lanjut.", state: "waiting", sourceRef: `checkpoint:${entry.time}-${entry.project}-${entry.task}` })),
    tasks: [...baseTasks, ...ticketTasks],
  };
}

/**
 * Returns a stable unique identifier for a task across shifts.
 * Used for accurate task deduplication across handover logs.
 */
export function getTaskIdentity(task: HandoverTask): string {
  if (task.taskTemplateId) {
    return String(task.taskTemplateId);
  }
  if (task.sourceRef) {
    return task.sourceRef;
  }
  if (task.id >= 1 && task.id <= 10) {
    return `standard-task-${task.id}`;
  }
  if (task.title) {
    return `task:${(task.project || "").trim().toLowerCase()}:${task.title.trim().toLowerCase()}`;
  }
  return `task-${task.id}`;
}

/**
 * Determines whether a task was newly created during this shift
 * (as opposed to being routine SOP or carried forward from a prior shift).
 */
export function isNewlyAddedTask(task: HandoverTask): boolean {
  if (typeof task.isNewlyAdded === "boolean") {
    return task.isNewlyAdded;
  }
  if (task.sourceRef?.startsWith("ticket:")) {
    return true;
  }
  // Standard repeating SOP checklist items are routine carry-overs
  if (task.state === "repeat" || (task.id >= 1 && task.id <= 8)) {
    return false;
  }
  // Ad-hoc tasks or tasks created with timestamp IDs / custom items
  return true;
}
