/**
 * Tickets from the real backend (GET /tickets). The backend answers in pages of at most 100 and every ticket carries its project, tenant,
 * client, user, severity and category as embedded objects, so one pass over the pages gives the app everything it shows.
 *
 * What the backend does not have, and so what the UI will not show for these tickets: system, priority, shift (derived here from the hour),
 * escalation, response time, SLA target and history. Severity has three levels there (Low, Med, High), the same three the UI has.
 *
 * Writes go to POST /tickets and PATCH /tickets/:id. The form's names (project, severity, category, status, PIC) are turned into the
 * backend's ids here; anything the backend cannot hold is refused with a message instead of looking saved.
 */
import { apiClient } from "@/app/lib/api/client";
import { ApiError } from "@/app/lib/api/errors";
import { apiModuleEnabled } from "@/app/lib/config";
import { getShiftInfoForMinutes } from "@/app/lib/shifts";
import { wibDateString } from "@/app/lib/wib";
import type { Ticket, TicketSeverity } from "@/app/lib/types";
import type { z } from "zod";
import { backendTicketSchema, lookupListSchema, parseResponse, ticketPageSchema } from "@/app/lib/api/schemas";
import { getQueryClient } from "@/app/lib/query-client";

/** A ticket as the backend sends it; the shape is checked on arrival (lib/api/schemas.ts). Status: Open, Closed, Activity, Meeting, Pending, ReOpen. */
export type BackendTicket = z.output<typeof backendTicketSchema>;
type TicketPage = z.output<typeof ticketPageSchema>;

/** Tickets use the backend only when both the tickets module and the login are on: the endpoints need a session. */
export const ticketsFromBackend = (): boolean => apiModuleEnabled("tickets") && apiModuleEnabled("auth");

const WIB_OFFSET_MS = 7 * 3600_000;
const pad = (n: number) => String(n).padStart(2, "0");
/** The backend stores UTC; the app shows WIB (UTC+7). */
function wib(iso: string | null): { date: string; time: string; minuteOfDay: number } | null {
  if (!iso) return null;
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return null;
  const d = new Date(parsed + WIB_OFFSET_MS);
  return { date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`, time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`, minuteOfDay: d.getUTCHours() * 60 + d.getUTCMinutes() };
}

function severityOf(name: string | undefined): TicketSeverity {
  const value = (name || "").toLowerCase();
  if (value.startsWith("crit")) return "High";
  if (value.startsWith("high")) return "High";
  if (value.startsWith("low")) return "Low";
  return "Medium";
}

/** Backend ticket -> the ticket the UI works with. */
export function backendTicketToModel(source: BackendTicket): Ticket {
  const opened = wib(source.open_at), closed = wib(source.closed_at);
  const owner = source.user?.name?.trim() || source.requester?.trim() || "—";
  const minutes = source.closed_at && source.open_at ? Math.max(0, Math.round((Date.parse(source.closed_at) - Date.parse(source.open_at)) / 60000)) : undefined;
  const category = source.category?.name;
  const status = source.status === "ReOpen" ? "Re-Open" : source.status;
  return {
    id: String(source.id),
    subject: source.subject,
    project: source.project?.code_prefix?.trim() || source.project?.name || "—",
    severity: severityOf(source.severity?.name),
    ...(category ? { category, type: category } : {}),
    date: opened?.date,
    requestTime: opened?.time,
    ...(closed ? { completionTime: closed.time } : {}),
    isStillOpen: !source.closed_at && status !== "Closed",
    owner,
    owners: owner === "—" ? [] : [owner],
    // the assignee's id, the same id the people list uses, so tickets are matched to people by id and not by name text
    ...(source.user?.id ?? source.user_id ? { ownerIds: [String(source.user?.id ?? source.user_id)] } : {}),
    status,
    created: opened?.time ?? source.created_at,
    ...(source.description ? { description: source.description } : {}),
    ...(minutes !== undefined ? { resolutionMinutes: minutes } : {}),
    // the app has one definition of the shifts (lib/shifts.ts); the backend has none
    shift: opened ? getShiftInfoForMinutes(opened.minuteOfDay).shortLabel : undefined,
    // every backend ticket belongs to the Tritronik client today; the app's own client ids are slugs of the names
    clientId: (source.client?.name || "Tritronik").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    backend: {
      projectId: String(source.project?.id ?? source.project_id),
      ...(source.project?.name ? { projectName: source.project.name } : {}),
      ...(source.client?.id ?? source.client_id ? { clientId: String(source.client?.id ?? source.client_id) } : {}),
      ...(source.user?.id ?? source.user_id ? { userId: String(source.user?.id ?? source.user_id) } : {}),
      ...(source.third_party_ticket_id ? { thirdPartyId: source.third_party_ticket_id } : {}),
    },
  };
}

// v2: tickets carry their backend ids (`backend`), which a copy stored by v1 does not have
const PAGE = 100, PARALLEL = 4, CACHE_MS = 30_000, STORED_MS = 3 * 60_000, STORAGE_KEY = "ctd.backendTickets.v2";
let cache: { at: number; promise: Promise<Ticket[]> } | undefined;
/** Whose tickets are cached. A load or a stored copy made for someone else is never used. */
let owner = "";

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
/** The backend answers 429 after 100 requests a minute from one address: wait for the window to move on, a few times, then give up. */
async function getPage(page: number): Promise<TicketPage> {
  for (let attempt = 0; ; attempt++) {
    try {
      return parseResponse(ticketPageSchema, await apiClient.get<unknown>("/tickets", { params: { limit: PAGE, page, sort: "open_at", order: "desc" } }), "daftar tiket");
    } catch (cause) {
      if (!(cause instanceof ApiError) || cause.status !== 429 || attempt >= 3) throw cause;
      // the server's own Retry-After when the browser can read it, else a growing wait; a little jitter so tabs do not retry in step
      await wait((cause.retryAfterMs ?? 6000 * (attempt + 1)) + Math.random() * 1000);
    }
  }
}

async function loadAll(): Promise<Ticket[]> {
  const first = await getPage(1);
  const pages = [first.data];
  const remaining = Array.from({ length: Math.max(0, first.meta.total_pages - 1) }, (_, index) => index + 2);
  // a few pages at a time: a full load is about 37 requests of the 100 a minute the backend allows
  for (let i = 0; i < remaining.length; i += PARALLEL) {
    const batch = await Promise.all(remaining.slice(i, i + PARALLEL).map(getPage));
    for (const result of batch) pages.push(result.data);
  }
  return pages.flat().map(backendTicketToModel);
}

/** A load a moment ago survives a page reload (same tab only), so reloading does not spend another 37 requests. Cleared on logout. */
function readStored(): Ticket[] | undefined {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const value = JSON.parse(raw) as { at: number; owner?: string; tickets: Ticket[] };
    return owner && value.owner === owner && Date.now() - value.at < STORED_MS && Array.isArray(value.tickets) ? value.tickets : undefined;
  } catch { return undefined; }
}
function writeStored(tickets: Ticket[]) {
  if (!owner) return;
  try { window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ at: Date.now(), owner, tickets })); } catch { /* too big or blocked: just load again next time */ }
}

/** Every ticket, mapped. Callers within 30 seconds share one load; a failure is not cached. */
export function fetchAllTickets(): Promise<Ticket[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.promise;
  const stored = typeof window !== "undefined" ? readStored() : undefined;
  const promise = stored ? Promise.resolve(stored) : loadAll().then(tickets => { if (typeof window !== "undefined") writeStored(tickets); return tickets; });
  cache = { at: Date.now(), promise };
  promise.catch(() => { if (cache?.promise === promise) cache = undefined; });
  return promise;
}
/**
 * The tickets in memory and in sessionStorage belong to this person; a different one (or nobody) starts from nothing.
 * Opening the app is not a change of person: going from "nobody known yet" to the person who loaded these keeps the stored copy, so a
 * reload does not load everything again. (A copy stored for someone else is never used: the stored owner is compared when reading.)
 */
export function setTicketCacheOwner(id: string | null) {
  const next = id ?? "";
  if (next === owner) return;
  const previous = owner;
  owner = next;
  if (previous === "") cache = undefined;
  else resetTicketCache();
}
/** The newest changes: the 100 tickets changed most recently (new ones and edited ones). One request, so it can run every minute. */
export async function fetchRecentTickets(): Promise<Ticket[]> {
  const page = parseResponse(ticketPageSchema, await apiClient.get<unknown>("/tickets", { params: { limit: PAGE, page: 1, sort: "updated_at", order: "desc" } }), "tiket terbaru");
  return page.data.map(backendTicketToModel);
}
const sortKey = (ticket: Ticket) => `${ticket.date ?? ""} ${ticket.requestTime ?? ""}`;
/** Puts recently changed tickets into the list: a known id is replaced, a new one is added, and the list stays newest first. */
export function mergeRecentTickets(current: readonly Ticket[], recent: readonly Ticket[]): Ticket[] {
  if (!recent.length) return current as Ticket[];
  const byId = new Map(current.map(ticket => [ticket.id, ticket]));
  for (const ticket of recent) byId.set(ticket.id, ticket);
  return [...byId.values()].sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
}
/** Keeps the merged list as the cached one, so a reload or another screen starts from it. */
export function rememberTickets(tickets: Ticket[]) {
  if (!owner) return;
  cache = { at: Date.now(), promise: Promise.resolve(tickets) };
  writeStored(tickets);
}

/** Forget what was loaded (an explicit reload, or the person changed). */
export function resetTicketCache() {
  cache = undefined;
  try { window.sessionStorage.removeItem(STORAGE_KEY); } catch { /* nothing stored */ }
}

// ── Writing ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

type Lookup = z.output<typeof lookupListSchema>[number];
export interface TicketLookups { categories: Lookup[]; severities: Lookup[] }
export const ticketLookupsKey = ["backend", "ticket-lookups"] as const;

export async function loadTicketLookups(): Promise<TicketLookups> {
  const [categories, severities] = await Promise.all([apiClient.get<unknown>("/ticket-categories"), apiClient.get<unknown>("/ticket-severities")]);
  return { categories: parseResponse(lookupListSchema, categories, "kategori tiket"), severities: parseResponse(lookupListSchema, severities, "severity tiket") };
}
/**
 * Categories and severities as the backend names them (GET /ticket-categories, /ticket-severities). Kept in the query cache for the whole
 * session (the forms read the same entry through useBackendTicketOptions) and dropped at logout; a failure is not kept.
 */
export function fetchTicketLookups(): Promise<TicketLookups> {
  return getQueryClient().fetchQuery({ queryKey: ticketLookupsKey, queryFn: loadTicketLookups, staleTime: Infinity });
}

/** The backend's projects, read from its tickets (there is no GET /projects): one per id, by name. A project without tickets is not listed. */
export function backendProjects(tickets: readonly Ticket[]): { id: string; name: string }[] {
  const byId = new Map<string, string>();
  for (const ticket of tickets) {
    const id = ticket.backend?.projectId;
    if (id && !byId.has(id)) byId.set(id, ticket.backend?.projectName || ticket.project);
  }
  return [...byId].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}

/** The UI's statuses the backend has (`TicketStatus`). Escalated and RCA exist only in the app. */
const BACKEND_STATUS: Record<string, string> = { Open: "Open", Closed: "Closed", Activity: "Activity", Meeting: "Meeting", Pending: "Pending", "Re-Open": "ReOpen", ReOpen: "ReOpen" };
function backendStatus(status: string): string {
  const value = BACKEND_STATUS[status];
  if (!value) throw new Error(`Status "${status}" belum ada di backend. Pilih Open, Closed, Activity, Meeting, Pending atau Re-Open.`);
  return value;
}
const sameName = (a: string | undefined, b: string) => !!a && a.trim().toLowerCase() === b.trim().toLowerCase();
function lookupId(list: readonly Lookup[], value: string | undefined, what: string): string | null {
  if (!value) return null;
  const found = list.find(item => sameName(item.name, value) || sameName(item.code_name, value));
  if (!found) throw new Error(`${what} "${value}" tidak dikenal backend.`);
  return found.id;
}
/** The backend keeps one assignee: the first PIC that is a backend user. */
const assigneeOf = (ticket: Ticket) => ticket.ownerIds?.find(id => /^\d+$/.test(id));
/** HH:MM on today's WIB date, written with its +07:00 offset so the backend stores the right UTC instant. */
const wibToday = (time: string) => `${wibDateString()}T${time}:00+07:00`;

/** The body of POST /tickets for a ticket filled in on the form. `backend.projectId` holds the chosen project. */
export function ticketToCreateBody(ticket: Ticket, known: TicketLookups): Record<string, unknown> {
  const projectId = ticket.backend?.projectId;
  if (!projectId) throw new Error("Pilih proyek.");
  const assignee = assigneeOf(ticket);
  return {
    subject: ticket.subject,
    project_id: projectId,
    status: backendStatus(String(ticket.status)),
    severity_id: lookupId(known.severities, ticket.severity, "Severity"),
    category_id: lookupId(known.categories, ticket.category, "Kategori"),
    ...(ticket.backend?.clientId ? { client_id: ticket.backend.clientId } : {}),
    ...(ticket.description ? { description: ticket.description } : {}),
    ...(ticket.backend?.thirdPartyId ? { third_party_ticket_id: ticket.backend.thirdPartyId } : {}),
    // without one the backend assigns the ticket to whoever creates it
    ...(assignee ? { user_id: assignee } : {}),
    ...(ticket.requestTime ? { open_at: wibToday(ticket.requestTime) } : {}),
    ...(ticket.completionTime ? { closed_at: wibToday(ticket.completionTime) } : {}),
  };
}

/** The body of PATCH /tickets/:id: only what changed, so an operator without tickets.write.any is not refused for "reassigning". */
export function ticketToUpdateBody(next: Ticket, previous: Ticket, known: TicketLookups): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (next.subject !== previous.subject) body.subject = next.subject;
  if (next.backend?.projectId && next.backend.projectId !== previous.backend?.projectId) body.project_id = next.backend.projectId;
  if (next.severity !== previous.severity) body.severity_id = lookupId(known.severities, next.severity, "Severity");
  if ((next.category || "") !== (previous.category || "")) body.category_id = lookupId(known.categories, next.category, "Kategori");
  if (next.status !== previous.status) body.status = backendStatus(String(next.status));
  if ((next.description || "") !== (previous.description || "")) body.description = next.description || null;
  const assignee = assigneeOf(next);
  if (assignee && assignee !== previous.backend?.userId) body.user_id = assignee;
  return body;
}

/**
 * Creates the ticket in the backend and answers with it as the backend saved it (its own id, times and names). The client is the backend
 * client of the app's active client, read from the loaded tickets (`known`), as there is no GET /clients.
 */
export async function createBackendTicket(ticket: Ticket, known: readonly Ticket[]): Promise<Ticket> {
  const appClient = ticket.clientId || "tritronik";
  const clientId = known.find(item => (item.clientId || "tritronik") === appClient && item.backend?.clientId)?.backend?.clientId;
  if (!clientId) throw new Error("Klien ini belum punya tiket di backend, jadi tiket baru belum bisa dicatat untuknya.");
  const body = ticketToCreateBody({ ...ticket, backend: { ...ticket.backend, clientId } }, await fetchTicketLookups());
  return backendTicketToModel(parseResponse(backendTicketSchema, await apiClient.post<unknown>("/tickets", body), "tiket yang disimpan"));
}

/** Saves the changes from `previous` to `next`; nothing changed sends nothing. */
export async function updateBackendTicket(next: Ticket, previous: Ticket): Promise<Ticket> {
  const body = ticketToUpdateBody(next, previous, await fetchTicketLookups());
  if (!Object.keys(body).length) return previous;
  return backendTicketToModel(parseResponse(backendTicketSchema, await apiClient.patch<unknown>(`/tickets/${encodeURIComponent(previous.id)}`, body), "tiket yang disimpan"));
}
