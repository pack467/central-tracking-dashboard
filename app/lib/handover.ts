import type { CheckpointAssessment, HandoverActor, HandoverDraft, HandoverRecordData, RosterMember, Ticket } from "./types";
import { createShiftHandoverDraft, initialHandoverTasks, isOpenTicket, monitoringSchedule, STANDARD_MONITORED_PROJECTS } from "./data";
import { getNextShiftChange, getShiftInfo, isShiftActiveForMember } from "./shifts";

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
    return { id: task.id as number, title: textValue(task.title, 300), project: textValue(task.project, 120), detail: textValue(task.detail), state: task.state as "repeat" | "waiting" | "in-progress", completed: task.completed === true, ...(task.sourceRef ? { sourceRef: textValue(task.sourceRef, 200) } : {}) };
  });
  if (new Set(tasks.map((task) => task.id)).size !== tasks.length) throw new HandoverError("ID tugas harus unik.");
  const findings = arrayValue(raw.findings).map((value) => {
    const finding = objectValue(value);
    if (!["waiting", "in-progress"].includes(String(finding.state))) throw new HandoverError("Status temuan tidak valid.");
    return { project: textValue(finding.project, 120), title: textValue(finding.title, 300), detail: textValue(finding.detail), state: finding.state as "waiting" | "in-progress", ...(finding.sourceRef ? { sourceRef: textValue(finding.sourceRef, 200) } : {}) };
  });
  return {
    sourceShift: textValue(raw.sourceShift, 40), targetShift: textValue(raw.targetShift, 40),
    sourcePic: textValue(raw.sourcePic, 500), targetPic: textValue(raw.targetPic, 500),
    receiverEmail: optionalText(raw.receiverEmail, 254).toLowerCase(),
    monitoringOwner: textValue(raw.monitoringOwner, 500), monitoringSummary: textValue(raw.monitoringSummary),
    monitoredProjects: arrayValue(raw.monitoredProjects).map((project) => textValue(project, 120)),
    validationNote: textValue(raw.validationNote),
    notes: optionalText(raw.notes, 5000),
    openTickets: Array.isArray(raw.openTickets) ? (raw.openTickets as Ticket[]) : undefined,
    tasks, findings,
    monitoringExceptions: arrayValue(raw.monitoringExceptions ?? []).map((value) => {
      const exception = objectValue(value);
      return { project: textValue(exception.project, 120), reason: textValue(exception.reason) };
    }),
    createdBy: raw.createdBy as HandoverActor | undefined,
    acceptance: (raw.acceptance ?? null) as HandoverRecordData["acceptance"],
    auditTrail: arrayValue(raw.auditTrail ?? [], 2000) as NonNullable<HandoverRecordData["auditTrail"]>,
  };
}

export function validateDraft(draft: HandoverDraft): HandoverRecordData {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date) || Number.isNaN(Date.parse(draft.date)) || new Date(draft.date).toISOString().slice(0, 10) !== draft.date) throw new HandoverError("Tanggal serah terima tidak valid.");
  const record = parseHandoverContent(JSON.stringify({ ...draft, monitoredProjects: draft.monitoredProjects.split(",").map((p) => p.trim()).filter(Boolean) }));
  if (!["Subuh>Pagi", "Pagi>Malam", "Malam>Subuh"].includes(`${record.sourceShift}>${record.targetShift}`)) throw new HandoverError("Pilih rotasi Subuh → Pagi, Pagi → Malam, atau Malam → Subuh.");
  if (!record.sourcePic || !record.targetPic) throw new HandoverError("Isi PIC pengirim dan penerima.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.receiverEmail ?? "")) throw new HandoverError("Isi email akun penerima yang akan mengonfirmasi handover.");
  if (!record.tasks.length || record.tasks.some((task) => !task.title || !task.project)) throw new HandoverError("Isi judul dan proyek setiap tugas; minimal satu tugas diperlukan.");
  if (record.findings.some((finding) => !finding.project || !finding.title || !finding.detail)) throw new HandoverError("Lengkapi proyek, judul, dan rincian setiap temuan atau hapus temuan kosong.");
  const coverage = [...record.monitoredProjects, ...(record.monitoringExceptions ?? []).map((item) => item.project)].map((p) => p.toLowerCase());
  if (new Set(coverage).size !== coverage.length) throw new HandoverError("Proyek monitoring tidak boleh duplikat atau sekaligus ditandai tidak dimonitor.");
  if (record.monitoringExceptions?.some((item) => !item.project || !item.reason)) throw new HandoverError("Isi alasan untuk setiap proyek yang tidak dimonitor.");
  record.monitoringOwner ||= record.sourcePic;
  record.monitoringSummary ||= "Monitoring belum dicatat.";
  record.validationNote ||= "Menunggu validasi shift penerima.";
  if (JSON.stringify(record).length > 50000) throw new HandoverError("Catatan terlalu panjang (maksimal 50.000 karakter).");
  return record;
}

export function canEditHandover(record: HandoverRecordData, actor: HandoverActor | null) {
  return Boolean(actor && (!record.createdBy || record.createdBy.id === actor.id));
}
export function canReceiveHandover(record: HandoverRecordData, actor: HandoverActor | null) {
  return Boolean(actor && record.receiverEmail?.toLowerCase() === actor.email.toLowerCase());
}

export function updateHandoverRecord(record: HandoverRecordData, actor: HandoverActor, action: string, payload: Record<string, unknown>, now = new Date().toISOString()) {
  const next = structuredClone(record);
  let auditAction: NonNullable<HandoverRecordData["auditTrail"]>[number]["action"];
  if (action === "task") {
    if (!canReceiveHandover(record, actor)) throw new HandoverError("Checklist hanya dapat dikonfirmasi oleh akun penerima yang dituju.", 403);
    if (record.acceptance) throw new HandoverError("Handover sudah diterima. Pengirim harus merevisi catatan sebelum checklist dapat diubah.", 409);
    const task = next.tasks.find((item) => item.id === payload.taskId);
    if (!task || typeof payload.completed !== "boolean") throw new HandoverError("Tugas atau status checklist tidak valid.");
    task.completed = payload.completed;
    if (task.completed) {
      task.confirmedBy = actor.name;
      task.confirmedAt = now;
    } else {
      task.confirmedBy = undefined;
      task.confirmedAt = undefined;
    }
    auditAction = task.completed ? "task-confirmed" : "task-unconfirmed";
  } else if (action === "confirm") {
    if (!canReceiveHandover(record, actor)) throw new HandoverError("Hanya akun dengan email penerima yang dapat menerima handover.", 403);
    if (record.acceptance) return record;
    if (!record.tasks.length || record.tasks.some((task) => !task.completed)) throw new HandoverError("Periksa dan konfirmasikan seluruh tugas sebelum menerima handover.");
    next.acceptance = { actor, at: now };
    next.validationNote = optionalText(payload.note) || `Diterima oleh ${actor.name}.`;
    next.tasks = next.tasks.map((task) => ({
      ...task,
      confirmedBy: task.confirmedBy || actor.name,
      confirmedAt: task.confirmedAt || now,
    }));
    auditAction = "accepted";
  } else {
    throw new HandoverError("Aksi handover tidak dikenal.");
  }
  next.auditTrail = [...(record.auditTrail ?? []), { action: auditAction, actor, at: now, ...(action === "task" ? { taskId: payload.taskId as number } : {}) }];
  return next;
}

export function buildDashboardHandoverDraft(input: { tickets: Ticket[]; assessments: Record<string, CheckpointAssessment>; members: RosterMember[]; actor: HandoverActor | null }, date = new Date()): HandoverDraft {
  const draft = createShiftHandoverDraft(date);
  const nextShift = getShiftInfo(getNextShiftChange(date));
  const receivers = input.members.filter((member) => member.status !== "On Leave" && isShiftActiveForMember(member.currentShift, nextShift));
  const assessed = monitoringSchedule.flatMap((entry) => {
    const assessment = input.assessments[`${entry.time}-${entry.project}-${entry.task}`];
    return assessment ? [{ entry, assessment }] : [];
  });
  const monitoredProjects = Array.from(new Set(assessed.map(({ entry }) => entry.project).filter((project) => project !== "Handover")));
  const openTickets = input.tickets.filter(isOpenTicket);
  return {
    ...draft,
    sourceShift: getShiftInfo(date).shortLabel,
    sourcePic: input.actor?.name ?? "", targetPic: receivers.map((member) => member.name).join(", "),
    // A roster contact is a suggestion; the sender must verify the receiving account.
    receiverEmail: receivers[0]?.email ?? "", monitoringOwner: input.actor?.name ?? "",
    monitoredProjects: (monitoredProjects.length > 0 ? monitoredProjects : STANDARD_MONITORED_PROJECTS).join(", "),
    monitoringExceptions: [],
    monitoringSummary: `Snapshot dashboard: ${assessed.length} checkpoint telah dinilai; ${openTickets.length} tiket masih terbuka. Tinjau tanggal dan cakupan data sebelum serah terima.`,
    findings: assessed.filter(({ assessment }) => ["nok", "not-adequate"].includes(assessment.verdict)).map(({ entry, assessment }) => ({ project: entry.project, title: `${entry.time} — ${entry.task}`, detail: assessment.note || "Checkpoint NOK memerlukan tindak lanjut.", state: "waiting", sourceRef: `checkpoint:${entry.time}-${entry.project}-${entry.task}` })),
    tasks: [
      ...initialHandoverTasks.filter((task) => task.state === "repeat").map((task) => ({ ...task, completed: false })),
      ...openTickets.map((ticket, index) => ({ id: 1000 + index, title: `Tindak lanjut #${ticket.id}: ${ticket.subject}`, project: ticket.project, detail: `${ticket.description || ticket.subject}\nStatus: ${ticket.status}. PIC: ${ticket.owner}.`, state: "in-progress" as const, completed: false, sourceRef: `ticket:${ticket.id}` })),
    ],
  };
}
