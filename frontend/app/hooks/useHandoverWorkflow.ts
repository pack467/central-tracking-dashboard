"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/app/components/ui/Toast";
import { createHandoverDraft, initialHandoverRecord } from "@/app/lib/data";
import { buildDashboardHandoverDraft, HandoverError, parseHandoverContent, validateDraft } from "@/app/lib/handover";
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

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options, headers: { "Content-Type": "application/json", ...options?.headers }, signal: AbortSignal.timeout(20000) });
  const payload = await response.json();
  if (!response.ok) throw new HandoverError(payload.error || "Permintaan handover gagal.", response.status);
  return payload as T;
}

export function useHandoverWorkflow(inputs: Inputs) {
  const notify = useToast();
  const [records, setRecords] = useState<StoredHandoverRecord[]>([]);
  const [active, setActive] = useState<StoredHandoverRecord | null>(null);
  const activeRef = useRef(active);
  const [actor, setActor] = useState<HandoverActor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [allTotal, setAllTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [filters, setFilters] = useState({ date: "", pic: "" });
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
      if (!filters.date && !filters.pic) setAllTotal(payload.total);
      setHasMore(payload.hasMore);
      setPage(payload.page);
      if (!activeRef.current && !filters.date && !filters.pic) {
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
    const timer = setTimeout(() => void loadPage(1), 250);
    return () => { clearTimeout(timer); listRequest.current++; };
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
    if (!actor || storageKey.current === `ctd.handoverDraft.v1:${actor.id}`) return;
    storageKey.current = `ctd.handoverDraft.v1:${actor.id}`;
    try {
      const saved = localStorage.getItem(storageKey.current);
      if (!saved) return;
      const restored = JSON.parse(saved) as DraftSession;
      if (!["prepare", "create", "edit"].includes(restored.mode) || typeof restored.requestId !== "string" || typeof restored.draft?.date !== "string" || typeof restored.draft?.monitoredProjects !== "string") throw new Error();
      restored.step = Math.min(Math.max(Number(restored.step) || 1, 1), 4) as 1 | 2 | 3 | 4;
      parseHandoverContent(JSON.stringify({ ...restored.draft, monitoredProjects: restored.draft.monitoredProjects.split(",").filter(Boolean) }));
      sessionRef.current = restored;
      setSession(restored);
      setDraftSaved(true);
    } catch {
      notify.warning("Draf lokal tidak dapat dipulihkan. Catatan yang sudah disimpan di server tetap aman.", { id: "handover-draft-restore" });
    }
  }, [actor, notify]);

  const openWizard = (mode: "prepare" | "create") => {
    if (busyRef.current) return;
    if (!actor) { notify.warning("Identitas belum dimuat. Coba muat ulang handover."); return; }
    setOpen(false);
    if (sessionRef.current) {
      persistSession({ ...sessionRef.current, open: true });
      notify.info("Melanjutkan draf yang belum disimpan. Buang draf jika ingin memulai catatan baru.", { id: "handover-resume" });
    } else {
      persistSession({ draft: buildDashboardHandoverDraft({ ...inputs, actor }), mode, editId: null, revision: null, requestId: crypto.randomUUID(), step: 1, open: true });
    }
  };

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
    const note = activeRef.current;
    if (!note || busyRef.current) return;
    if (sessionRef.current) {
      notify.warning("Masih ada draf. Lanjutkan atau buang draf tersebut sebelum mengedit catatan lain.");
      persistSession({ ...sessionRef.current, open: true });
    } else {
      persistSession({ draft: createHandoverDraft(parseHandoverContent(note.content), note.handoverDate), mode: "edit", editId: note.id, revision: note.revision ?? 1, requestId: crypto.randomUUID(), step: 1, open: true });
    }
    setOpen(false);
  };

  const save = async () => {
    const draftSession = sessionRef.current;
    if (!draftSession || busyRef.current) return;
    try { validateDraft(draftSession.draft); } catch (cause) { notify.warning(cause instanceof Error ? cause.message : "Lengkapi form handover."); return; }
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
      setFilters({ date: "", pic: "" });
      notify.success(draftSession.editId ? "Revisi disimpan. Penerima perlu memeriksa ulang checklist." : "Handover disimpan dan menunggu penerimaan.");
    } catch (cause) {
      notify.critical(cause instanceof Error ? cause.message : "Catatan belum tersimpan. Draf tetap tersedia.");
    } finally { busyRef.current = false; setBusy(false); }
  };

  const mutate = async (action: "task" | "confirm" | "delete-task", changes: Record<string, unknown>) => {
    const current = activeRef.current;
    if (!current || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const payload = await request<{ note: StoredHandoverRecord }>(`/api/handovers/${current.id}`, { method: "PUT", body: JSON.stringify({ action, ...changes, revision: current.revision }) });
      // Only update checks/progress after the server confirms persistence.
      select(payload.note);
      setRecords((previous) => previous.map((note) => note.id === payload.note.id ? payload.note : note));
      if (action === "confirm") notify.success("Penerimaan handover berhasil dicatat beserta identitas dan waktunya.");
      if (action === "delete-task") notify.success("Tugas berhasil dihapus dari checklist handover.");
    } catch (cause) {
      notify.critical(cause instanceof Error ? cause.message : "Perubahan belum tersimpan; status tidak diubah.");
    } finally { busyRef.current = false; setBusy(false); }
  };

  const remove = async (id: number) => {
    if (busyRef.current) throw new Error("Tunggu penyimpanan yang sedang berjalan.");
    const note = records.find((item) => item.id === id);
    if (!note) throw new Error("Muat ulang daftar catatan.");
    busyRef.current = true;
    setBusy(true);
    try {
      await request(`/api/handovers/${id}?revision=${note.revision}`, { method: "DELETE" });
      if (activeRef.current?.id === id) select(null);
      if (sessionRef.current?.editId === id) persistSession(null);
      await loadPage(1);
    } finally { busyRef.current = false; setBusy(false); }
  };

  useEffect(() => {
    if (!active && records.length > 0 && !filters.date && !filters.pic) {
      select(records[0]);
    }
  }, [active, records, filters.date, filters.pic, select]);

  const record = useMemo(() => {
    if (active) {
      try { return parseHandoverContent(active.content); } catch { /* ignore */ }
    }
    if (records.length > 0) {
      try { return parseHandoverContent(records[0].content); } catch { /* ignore */ }
    }
    return initialHandoverRecord;
  }, [active, records]);

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
  }, [active, record.acceptance, records, select]);

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

  return {
    records, active: active ?? records[0] ?? null, record, actor, loading, error, total, allTotal, hasMore, filters, setFilters, busy,
    loadMore: () => { if (!loading) void loadPage(page + 1); }, refresh, openStored, remove,
    open, close: () => { if (!busyRef.current) setOpen(false); }, openReader, openActive, modalMode,
    session, draftSaved, openWizard, edit, save,
    closeWizard: () => { if (sessionRef.current && !busyRef.current) persistSession({ ...sessionRef.current, open: false }); },
    discardDraft: () => { if (!busyRef.current) persistSession(null); },
    changeDraft: (updater: (draft: HandoverDraft) => HandoverDraft) => { if (sessionRef.current && !busyRef.current) persistSession({ ...sessionRef.current, draft: updater(sessionRef.current.draft) }); },
    changeStep: (step: 1 | 2 | 3 | 4) => { if (sessionRef.current) persistSession({ ...sessionRef.current, step }); },
    toggleTask: (id: number) => { const task = record.tasks.find((item) => item.id === id); if (task) void mutate("task", { taskId: id, completed: !task.completed }); },
    deleteTask: (id: number) => { const task = record.tasks.find((item) => item.id === id); if (task) void mutate("delete-task", { taskId: id }); },
    confirm: (note: string) => void mutate("confirm", { note }),
  };
}

