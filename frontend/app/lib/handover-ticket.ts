import { nowClockLabel } from "./data";
import type { HandoverTask, Ticket } from "./types";

/**
 * The code of the ticket a handover task becomes. It is the same every time for the same task, so a retry finds the ticket already made instead
 * of making a second one (the backend does not refuse a repeated third-party id). Note ids are never reused (AUTOINCREMENT).
 */
export const taskTicketCode = (noteId: number, taskId: number) => `HO-${noteId}-${taskId}`;

/** A task made from a ticket has its ticket already: Done on it never makes another. */
export const taskSourceTicketId = (task: Pick<HandoverTask, "sourceRef">) => (task.sourceRef?.startsWith("ticket:") ? task.sourceRef.slice("ticket:".length) : null);

export interface TaskTicketInput {
  task: Pick<HandoverTask, "id" | "title" | "detail">;
  noteId: number;
  shifts: string;
  actorName: string;
  clientId: string;
  /** How the ticket names its project; `backendId` when tickets live in the backend, `masterId` when they live in the app. */
  project: { name: string; backendId?: string; masterId?: string };
  severity: string;
  category: string;
  now?: string;
}

/** The closed ticket that records a finished task. It is assigned to whoever finished it. */
export function ticketFromTask({ task, noteId, shifts, actorName, clientId, project, severity, category, now = nowClockLabel() }: TaskTicketInput): Ticket {
  const code = taskTicketCode(noteId, task.id);
  const origin = `Dibuat dari tugas handover Shift ${shifts}.`;
  return {
    id: code,
    subject: task.title.trim().slice(0, 500),
    project: project.name,
    ...(project.backendId ? { backend: { projectId: project.backendId, thirdPartyId: code } } : {}),
    ...(project.masterId ? { projectId: project.masterId } : {}),
    severity,
    category,
    type: category,
    status: "Closed",
    owner: actorName,
    created: now,
    requestTime: now,
    completionTime: now,
    description: task.detail.trim() ? `${task.detail.trim()}\n\n${origin}` : origin,
    clientId,
    history: [{ time: now, type: "created", action: `Ticket #${code} dibuat dari tugas handover yang selesai oleh ${actorName}`, author: actorName }],
  };
}
