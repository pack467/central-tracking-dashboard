"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useUrlQuery } from "@/app/hooks/useUrlQuery";
import { shiftLogSchema } from "@/app/lib/query-state";
import { paths } from "@/app/lib/routes";
import { useToast } from "@/app/components/ui/Toast";
import { useAuth } from "@/app/lib/auth";
import { useClient } from "@/app/context/ClientContext";
import { useActiveShift } from "@/app/hooks/useLiveClock";
import { createHandoverDraft, initialHandoverRecord } from "@/app/lib/data";
import { buildDashboardHandoverDraft, HandoverError, handoverShiftRuleMessage, isInHandoverShift, parseHandoverContent, validateDraft, withCurrentChoices } from "@/app/lib/handover";
import { isShiftActiveForMember } from "@/app/lib/shifts";
import type { CheckpointAssessment, HandoverActor, HandoverDraft, RosterMember, StoredHandoverRecord, Ticket } from "@/app/lib/types";

type DraftSession = {
  draft: HandoverDraft;
  mode: "prepare" | "create" | "edit";
  editId: number | null;
  revision: number | null;
  requestId: string;
  step: 1 | 2 | 3 | 4;
  open: boolean;
};
type ListResponse = { notes: StoredHandoverRecord[]; total: number; page: number; hasMore: boolean; actor: HandoverActor };
type Inputs = { tickets: Ticket[]; assessments: Record<string, CheckpointAssessment>; members: RosterMember[] };

/**
 * Set by the hook while it is mounted: what a 401 from the handover API means. With the backend login, that API checks the session cookie
 * with the backend. Either the session has ended (the app then logs out, as a 401 from the backend itself does), or it is alive and the
 * cookie never reached this site's server: logging in again would not help, so say what is wrong instead of looping through /login.
 */
/**
 * Development only: the account named here (the part of its email before the "@") counts as on the active shift at any hour, so the handover
 * flow can be tried with a backend account, since the backend has no shifts. A production build never reads it.
 */
const DEV_ON_SHIFT_ACCOUNT = process.env.NODE_ENV === "development" ? (process.env.NEXT_PUBLIC_DEV_ON_SHIFT_ACCOUNT ?? "").trim().toLowerCase() : "";

let explainUnauthorized: (() => Promise<string | null>) | null = null;
const COOKIE_NOT_RECEIVED = "Anda masih login, tetapi sesi tidak sampai ke server handover. Hubungi administrator: aplikasi dan API harus disajikan di satu alamat.";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options, headers: { "Content-Type": "application/json", ...options?.headers }, signal: AbortSignal.timeout(20000) });
  // a proxy in front can answer with an HTML error page: that is a failed request, not a parse error to show
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (response.status === 401 && explainUnauthorized) throw new HandoverError((await explainUnauthorized()) ?? payload.error ?? "Sesi login sudah berakhir.", 401);
  if (!response.ok) throw new HandoverError(payload.error || "Permintaan handover gagal.", response.status);
  return payload as T;
}

export function useHandoverWorkflow(inputs: Inputs) {
  const notify = useToast();
  const { user, recheckSession } = useAuth();
  const activeShift = useActiveShift();
  const { activeClient } = useClient();
  const userId = user?.id ?? null;
  useEffect(() => {
    const explain = async () => ((await recheckSession()) === "valid" ? COOKIE_NOT_RECEIVED : null);
    explainUnauthorized = explain;
    return () => { if (explainUnauthorized === explain) explainUnauthorized = null; };
  }, [recheckSession]);
  // The logged-in person's shift, from the roster (Master Data); a demo account carries its own. Unknown when neither has one.
  const myShift = useMemo(() => {
    if (!user) return null;
    const email = user.email.toLowerCase();
    if (DEV_ON_SHIFT_ACCOUNT && email.split("@")[0] === DEV_ON_SHIFT_ACCOUNT) return activeShift.label;
    const name = user.name?.toLowerCase().trim();
    const member = inputs.members.find(
      (item) =>
        item.id === user.id ||
        (email && item.email.toLowerCase() === email) ||
        (name && item.name.toLowerCase().trim() === name)
    );
    const memberShift = member?.currentShift && member.currentShift !== "Belum dijadwalkan" ? member.currentShift : null;
    return memberShift ?? user.shift ?? member?.currentShift ?? null;
  }, [activeShift.label, inputs.members, user]);
  const isOnActiveShift = useMemo(() => {
    if (!myShift) return false;
    return isShiftActiveForMember(myShift, activeShift);
  }, [myShift, activeShift]);
  const canManage = useCallback((value: { sourceShift: string; targetShift: string }) => isInHandoverShift(myShift, value), [myShift]);
  const [records, setRecords] = useState<StoredHandoverRecord[]>([]);
  const [active, setActive] = useState<StoredHandoverRecord | null>(null);
  const activeRef = useRef(active);
  const [serverActor, setActor] = useState<HandoverActor | null>(null);
  const actor = useMemo<HandoverActor | null>(
    () =>
      serverActor ??
      (user
        ? { id: user.id, name: user.name?.trim() || user.email || "Pengguna", email: user.email?.trim().toLowerCase() || "" }
        : null),
    [serverActor, user]
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [allTotal, setAllTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [privateFilters, setPrivateFilters] = useState({ date: "", shift: "", pic: "" });
  const pathname = usePathname();
  const query = useUrlQuery(shiftLogSchema, pathname === paths.shiftLog);
  const filters = useMemo(() => pathname === paths.shiftLog ? { date: query.values.date, shift: query.values.shift, pic: privateFilters.pic } : privateFilters, [pathname, query.values.date, query.values.shift, privateFilters]);
  const setFilters = (value: typeof privateFilters | ((previous: typeof privateFilters) => typeof privateFilters)) => { const next = typeof value === "function" ? value(filters) : value; setPrivateFilters(next); if (pathname === paths.shiftLog) query.update({ date: next.date, shift: shiftLogSchema.shift.parse(next.shift.toLowerCase()), page: 1 }); };
  const listRequest = useRef(0);
  const [open, setOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"active" | "history">("history");
  const [session, setSession] = useState<DraftSession | null>(null);
  const sessionRef = useRef<DraftSession | null>(null);
  const [draftSaved, setDraftSaved] = useState(true);
  const storageKey = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const select = useCallback((note: StoredHandoverRecord | null) => {
    if (note && typeof note.content === "string") {
      try {
        parseHandoverContent(note.content);
      } catch {
        // Ignore parse error during selection
      }
    }
    activeRef.current = note;
    setActive(note);
  }, []);

  const loadPage = useCallback(async (nextPage = 1) => {
    const sequence = ++listRequest.current;
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ ...filters, page: String(nextPage), limit: "200" });
      const payload = await request<ListResponse>(`/api/handovers?${query}`);
      if (sequence !== listRequest.current) return;
      setActor(payload.actor);
      setRecords((previous) => nextPage === 1 ? payload.notes : [...previous, ...payload.notes.filter((note) => !previous.some((old) => old.id === note.id))]);
      setTotal(payload.total);
      if (!filters.date && !filters.shift && !filters.pic) setAllTotal(payload.total);
      setHasMore(payload.hasMore);
      setPage(payload.page);
      if (!activeRef.current && !filters.date && !filters.shift && !filters.pic) {
        // Select the newest real record, never the sample handover.
        select(payload.notes[0] ?? null);
      }
    } catch (cause) {
      if (sequence === listRequest.current) setError(cause instanceof Error ? cause.message : "Catatan gagal dimuat.");
    } finally {
      if (sequence === listRequest.current) setLoading(false);
    }
  }, [filters, select]);

  useEffect(() => {
    // Filter text is debounced; stale responses cannot replace a newer query.
    const requestCounter = listRequest;
    const timer = setTimeout(() => void loadPage(1), 250);
    return () => { clearTimeout(timer); requestCounter.current++; };
  }, [loadPage]);

  const refresh = useCallback(async () => {
    if (busyRef.current) return;
    const current = activeRef.current;
    await loadPage(1);
    if (!current) return;
    try {
      const payload = await request<{ note: StoredHandoverRecord }>(`/api/handovers/${current.id}`);
      if (activeRef.current?.id === current.id) select(payload.note);
    } catch (cause) {
      if (cause instanceof HandoverError && cause.status === 404) select(null);
      else setError(cause instanceof Error ? cause.message : "Catatan gagal dimuat ulang.");
    }
  }, [loadPage, select]);

  // The shell stays mounted across pages and nothing polls the notes, so a handover another operator just saved shows up at the next page move.
  const refreshedOn = useRef(pathname);
  useEffect(() => {
    if (refreshedOn.current === pathname) return;
    refreshedOn.current = pathname;
    void refresh();
  }, [pathname, refresh]);

  const persistSession = useCallback((next: DraftSession | null) => {
    sessionRef.current = next;
    setSession(next);
    try {
      if (!storageKey.current) throw new Error("Identitas belum tersedia.");
      if (next) localStorage.setItem(storageKey.current, JSON.stringify(next));
      else localStorage.removeItem(storageKey.current);
      setDraftSaved(true);
    } catch {
      setDraftSaved(false);
      notify.warning("Draf belum bisa disimpan di perangkat. Jangan reload sebelum menyimpan ke server.", { id: "handover-draft-storage" });
    }
  }, [notify]);

  useEffect(() => {
    // The draft belongs to the person logged in to the app, not only to the handover identity: in development (and with a simulated actor)
    // every person has the same handover identity, and the next person at a shared desk must not get the previous person's draft.
    if (!actor || !userId) return;
    const key = `ctd.handoverDraft.v1:${userId}:${actor.id}`;
    if (storageKey.current === key) return;
    storageKey.current = key;
    let restored: DraftSession | null = null;
    try {
      // a draft from before drafts were per person goes to whoever opens handover first, and only to them
      const legacyKey = `ctd.handoverDraft.v1:${actor.id}`;
      const legacy = localStorage.getItem(legacyKey);
      if (legacy !== null) {
        if (localStorage.getItem(key) === null) localStorage.setItem(key, legacy);
        localStorage.removeItem(legacyKey);
      }
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved) as DraftSession;
        if (!["prepare", "create", "edit"].includes(parsed.mode) || typeof parsed.requestId !== "string" || typeof parsed.draft?.date !== "string" || typeof parsed.draft?.monitoredProjects !== "string") throw new Error();
        parsed.step = Math.min(Math.max(Number(parsed.step) || 1, 1), 4) as 1 | 2 | 3 | 4;
        parseHandoverContent(JSON.stringify({ ...parsed.draft, monitoredProjects: parsed.draft.monitoredProjects.split(",").filter(Boolean) }));
        restored = { ...parsed, draft: withCurrentChoices(parsed.draft) };
      }
    } catch {
      notify.warning("Draf lokal tidak dapat dipulihkan. Catatan yang sudah disimpan di server tetap aman.", { id: "handover-draft-restore" });
    }
    // this person's draft, or none: the previous person's draft never stays open
    if (restored || sessionRef.current) {
      sessionRef.current = restored;
      setSession(restored);
      if (restored) setDraftSaved(true);
    }
  }, [actor, userId, notify]);

  const record = useMemo(() => {
    if (active) {
      try { return parseHandoverContent(active.content); } catch { /* ignore */ }
    }
    if (records.length > 0) {
      try { return parseHandoverContent(records[0].content); } catch { /* ignore */ }
    }
    return initialHandoverRecord;
  }, [active, records]);

  const openWizard = useCallback((mode: "prepare" | "create") => {
    if (busyRef.current) return;
    if (!actor) { notify.warning("Identitas belum dimuat. Coba muat ulang handover."); return; }
    setOpen(false);
    if (sessionRef.current) {
      persistSession({ ...sessionRef.current, open: true });
      notify.info("Melanjutkan draf yang belum disimpan. Buang draf jika ingin memulai catatan baru.", { id: "handover-resume" });
    } else {
      // which client it is for: the one the app is showing
      const draft = { ...withCurrentChoices(buildDashboardHandoverDraft({ ...inputs, actor, previousRecord: record })), organization: activeClient.shortName || activeClient.name };
      if (!canManage(draft)) { notify.warning(handoverShiftRuleMessage(draft, "membuat handover ini")); return; }
      persistSession({ draft, mode, editId: null, revision: null, requestId: crypto.randomUUID(), step: 1, open: true });
    }
  }, [activeClient, actor, canManage, inputs, notify, persistSession, record]);

  const openStored = async (note: StoredHandoverRecord) => {
    if (busyRef.current) return;
    try {
      const fresh = await request<{ note: StoredHandoverRecord }>(`/api/handovers/${note.id}`);
      select(fresh.note);
      const isAccepted = Boolean(parseHandoverContent(fresh.note.content).acceptance);
      setModalMode(isAccepted ? "history" : "active");
      setOpen(true);
    } catch (cause) { notify.critical(cause instanceof Error ? cause.message : "Catatan gagal dibuka."); }
  };

  const edit = () => {
    const note = activeRef.current ?? active ?? records[0] ?? null;
    if (!note || busyRef.current) return;
    if (sessionRef.current) {
      notify.warning("Masih ada draf. Lanjutkan atau buang draf tersebut sebelum mengedit catatan lain.");
      persistSession({ ...sessionRef.current, open: true });
    } else {
      persistSession({ draft: withCurrentChoices(createHandoverDraft(parseHandoverContent(note.content), note.handoverDate)), mode: "edit", editId: note.id, revision: note.revision ?? 1, requestId: crypto.randomUUID(), step: 1, open: true });
    }
    setOpen(false);
  };

  const save = async () => {
    const draftSession = sessionRef.current;
    if (!draftSession || busyRef.current) return;
    try { validateDraft(draftSession.draft); } catch (cause) { notify.warning(cause instanceof Error ? cause.message : "Lengkapi form handover."); return; }
    if (!draftSession.editId && !canManage(draftSession.draft)) { notify.warning(handoverShiftRuleMessage(draftSession.draft, "membuat handover ini")); return; }
    busyRef.current = true;
    setBusy(true);
    try {
      const payload = await request<{ note: StoredHandoverRecord }>(draftSession.editId ? `/api/handovers/${draftSession.editId}` : "/api/handovers", {
        method: draftSession.editId ? "PUT" : "POST",
        body: JSON.stringify({ draft: draftSession.draft, action: "edit", revision: draftSession.revision, requestId: draftSession.requestId }),
      });
      select(payload.note);
      persistSession(null);
      setOpen(true);
      // just saved, so it waits for the receiver: opening it as read-only history said it had already been accepted
      setModalMode("active");
      setFilters({ date: "", shift: "", pic: "" });
      notify.success(draftSession.editId ? "Revisi disimpan. Penerima perlu memeriksa ulang checklist." : "Handover disimpan dan menunggu penerimaan.");
    } catch (cause) {
      notify.critical(cause instanceof Error ? cause.message : "Catatan belum tersimpan. Draf tetap tersedia.");
    } finally { busyRef.current = false; setBusy(false); }
  };

  const mutate = async (action: "task" | "confirm" | "delete-task", changes: Record<string, unknown>) => {
    const current = activeRef.current ?? active ?? records[0] ?? null;
    if (!current || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const payload = await request<{ note: StoredHandoverRecord }>(`/api/handovers/${current.id}`, { method: "PUT", body: JSON.stringify({ action, ...changes, revision: current.revision }) });
      // Only update checks/progress after the server confirms persistence.
      select(payload.note);
      setRecords((previous) => previous.map((note) => note.id === payload.note.id ? payload.note : note));
      // Clear any unsubmitted prepare/create draft so the next shift's draft reflects the updated Done/Delete tasks
      if (sessionRef.current && (sessionRef.current.mode === "prepare" || sessionRef.current.mode === "create")) {
        persistSession(null);
      }
      if (action === "task") {
        if (changes.completed) {
          notify.success("Tugas ditandai selesai (Done) dan tidak akan muncul di shift selanjutnya.", { id: `handover-task-${String(changes.taskId)}` });
        } else {
          notify.info("Status Done dibatalkan — tugas akan tetap dilanjutkan ke shift selanjutnya.", { id: `handover-task-${String(changes.taskId)}` });
        }
      }
      if (action === "confirm") notify.success("Penerimaan handover berhasil dicatat beserta identitas dan waktunya.");
      if (action === "delete-task") notify.success("Tugas berhasil dihapus dari checklist handover dan tidak akan muncul di shift selanjutnya.");
    } catch (cause) {
      notify.critical(cause instanceof Error ? cause.message : "Perubahan belum tersimpan; status tidak diubah.");
    } finally { busyRef.current = false; setBusy(false); }
  };

  /**
   * Done on a task that has no ticket yet: the ticket is made first, then the task is closed with it. The note is read again before anything is
   * made, because a change someone else saved would refuse the second step only after the ticket exists. If that second step still fails, the
   * ticket is there and the same Done finds it again (taskTicketCode), so it is safe to repeat.
   */
  const completeTask = async (taskId: number, createTicket: () => Promise<{ id: string; code: string }>) => {
    const current = activeRef.current ?? active ?? records[0] ?? null;
    if (!current || busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    let ticket: { id: string; code: string } | null = null;
    try {
      const { note: latest } = await request<{ note: StoredHandoverRecord }>(`/api/handovers/${current.id}`);
      const task = parseHandoverContent(latest.content).tasks.find((item) => item.id === taskId);
      if (latest.revision !== current.revision || !task || task.completed) {
        select(latest);
        setRecords((previous) => previous.map((note) => note.id === latest.id ? latest : note));
        throw new HandoverError("Catatan baru saja berubah di sesi lain. Periksa lagi sebelum menandai Done.", 409);
      }
      ticket = await createTicket();
      const payload = await request<{ note: StoredHandoverRecord }>(`/api/handovers/${current.id}`, { method: "PUT", body: JSON.stringify({ action: "task", taskId, completed: true, ticket, revision: latest.revision }) });
      select(payload.note);
      setRecords((previous) => previous.map((note) => note.id === payload.note.id ? payload.note : note));
      if (sessionRef.current && (sessionRef.current.mode === "prepare" || sessionRef.current.mode === "create")) persistSession(null);
      notify.success(`Tugas selesai dan dicatat sebagai tiket #${ticket.code}.`, { id: `handover-task-${taskId}` });
      return true;
    } catch (cause) {
      notify.critical(ticket ? `Tiket #${ticket.code} sudah dibuat, tetapi tugasnya belum tertandai selesai. Klik Done sekali lagi: tiketnya tidak akan dibuat dua kali.` : cause instanceof Error ? cause.message : "Tiket belum dibuat; status tugas tidak diubah.");
      return false;
    } finally { busyRef.current = false; setBusy(false); }
  };

  const remove = async (id: number) => {
    if (busyRef.current) throw new Error("Tunggu penyimpanan yang sedang berjalan.");
    const note = records.find((item) => item.id === id);
    if (!note) throw new Error("Muat ulang daftar catatan.");
    const content = parseHandoverContent(note.content);
    if (!canManage(content)) throw new Error(handoverShiftRuleMessage(content, "menghapus handover ini"));
    busyRef.current = true;
    setBusy(true);
    try {
      await request(`/api/handovers/${id}?revision=${note.revision}`, { method: "DELETE" });
      if (activeRef.current?.id === id) select(null);
      if (sessionRef.current?.editId === id) persistSession(null);
      await loadPage(1);
    } finally { busyRef.current = false; setBusy(false); }
  };

  const openReader = useCallback((specificNote?: StoredHandoverRecord | null) => {
    if (busyRef.current) return;
    const isValidRecord = Boolean(
      specificNote &&
      typeof specificNote === "object" &&
      typeof (specificNote as StoredHandoverRecord).content === "string" &&
      "id" in specificNote
    );
    if (isValidRecord && specificNote) {
      select(specificNote);
      let isAccepted = false;
      try {
        isAccepted = Boolean(parseHandoverContent(specificNote.content).acceptance);
      } catch {
        isAccepted = false;
      }
      setModalMode(isAccepted ? "history" : "active");
    } else {
      const isAccepted = Boolean(record.acceptance);
      setModalMode(isAccepted ? "history" : "active");
    }
    setOpen(true);
  }, [record.acceptance, select]);

  const openActive = useCallback(() => {
    if (busyRef.current) return;
    // Find pending record if exists
    const pending = records.find((r) => {
      try {
        return !parseHandoverContent(r.content).acceptance;
      } catch {
        return false;
      }
    });
    // When the logged-in user is NOT on the active shift ("Baca Handover"), open the reader instead of preparing a new handover
    if (!isOnActiveShift) {
      openReader(pending ?? active ?? records[0] ?? null);
      return;
    }
    if (pending) {
      select(pending);
      setModalMode("active");
      setOpen(true);
    } else if (active && !record.acceptance) {
      setModalMode("active");
      setOpen(true);
    } else {
      openWizard("prepare");
    }
  }, [active, isOnActiveShift, openReader, openWizard, record.acceptance, records, select]);

  return {
    records, active: active ?? records[0] ?? null, record, actor, loading, error, total, allTotal, hasMore, filters, setFilters, busy,
    loadMore: () => { if (!loading) void loadPage(page + 1); }, refresh, openStored, remove,
    open, close: () => { if (!busyRef.current) setOpen(false); }, openReader, openActive, modalMode,
    session, draftSaved, openWizard, edit, save,
    closeWizard: () => { if (sessionRef.current && !busyRef.current) persistSession({ ...sessionRef.current, open: false }); },
    discardDraft: () => { if (!busyRef.current) persistSession(null); },
    changeDraft: (updater: (draft: HandoverDraft) => HandoverDraft) => { if (sessionRef.current && !busyRef.current) persistSession({ ...sessionRef.current, draft: updater(sessionRef.current.draft) }); },
    changeStep: (step: 1 | 2 | 3 | 4) => { if (sessionRef.current) persistSession({ ...sessionRef.current, step }); },
    completeTask,
    toggleTask: (id: number) => { const task = record.tasks.find((item) => item.id === id); if (task) void mutate("task", { taskId: id, completed: !task.completed }); },
    deleteTask: (id: number) => {
      const task = record.tasks.find((item) => item.id === id);
      if (!task) return;
      if (!canManage(record)) { notify.warning(handoverShiftRuleMessage(record, "menghapus tugas handover ini")); return; }
      void mutate("delete-task", { taskId: id });
    },
    canManage,
    isOnActiveShift,
    confirm: (note: string) => void mutate("confirm", { note }),
  };
}
