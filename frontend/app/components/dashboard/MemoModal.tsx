"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Check, Copy, StickyNote, X } from "lucide-react";
import { useToast } from "@/app/components/ui/Toast";
import { useShiftNotes } from "@/app/hooks/useShiftNotes";
import { notesStore, nowIso, readDrafts, writeDrafts, type Note } from "@/app/lib/shift-notes";
import { countItems, docKey, docToHtml, docToText, readDom, type NoteDoc } from "@/app/lib/shift-notes-doc";
import { MemoTabs } from "./memo/MemoTabs";
import { MemoToolbar } from "./memo/MemoToolbar";
import { NO_FORMATS, NoteEditor, type EditorCommand, type Formats, type NoteEditorHandle } from "./memo/NoteEditor";

type Confirm = { kind: "unsaved" } | { kind: "clear"; id: string };

/** Key of a saved note as the editor reads it back, so "changed" means the text really differs from what is stored. */
const normalizedKeys = new WeakMap<Note, string>();
function savedKey(note: Note): string {
  let key = normalizedKeys.get(note);
  if (key === undefined) {
    const holder = document.createElement("div");
    holder.innerHTML = docToHtml(note.doc) || "<div><br></div>";
    key = docKey(readDom(holder));
    normalizedKeys.set(note, key);
  }
  return key;
}

const clock = (iso: string) => new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Jakarta" }).format(new Date(iso)).replace(/\./g, ":");

/** On a phone the modal fills the visible part of the screen, above the virtual keyboard. */
function useKeyboardViewport(open: boolean): { height: number; top: number } | undefined {
  const read = () => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    return vv && window.innerWidth < 640 ? { height: vv.height, top: vv.offsetTop } : undefined;
  };
  const [viewport, setViewport] = useState(read);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!open || !vv) return;
    const update = () => setViewport(read());
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => { vv.removeEventListener("resize", update); vv.removeEventListener("scroll", update); };
  }, [open]);
  return viewport;
}

interface Props { isOpen: boolean; onClose: () => void }

export function MemoModal({ isOpen, onClose }: Props) {
  const notify = useToast();
  const { notes, active, activeId, persistent } = useShiftNotes();
  const modalRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<NoteEditorHandle>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const saveTimer = useRef<number | null>(null);
  const closeRef = useRef<() => void>(() => undefined);
  const saveRef = useRef<() => void>(() => undefined);
  const dialogRef = useRef<HTMLDivElement>(null);

  const [drafts, setDrafts] = useState<Record<string, NoteDoc>>({});
  const [restored, setRestored] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [formats, setFormats] = useState<Formats>(NO_FORMATS);
  const [reset, setReset] = useState(0);
  const [copied, setCopied] = useState(false);
  const [opened, setOpened] = useState(false);
  const viewport = useKeyboardViewport(isOpen);

  // Opening: bring back drafts a closed tab left behind, if they still differ from what is saved.
  if (isOpen !== opened) {
    setOpened(isOpen);
    if (isOpen) {
      const stored = readDrafts(), kept: Record<string, NoteDoc> = {};
      for (const note of notes) if (stored[note.id] && docKey(stored[note.id]) !== savedKey(note)) kept[note.id] = stored[note.id];
      setDrafts(kept);
      setRestored(Object.keys(kept).length > 0);
      setSavedAt(null);
      setConfirm(null);
    }
  }

  const dirtyIds = Object.keys(drafts);
  const dirty = dirtyIds.length > 0;
  const dirtySet = new Set(dirtyIds);
  const liveDoc = drafts[activeId] ?? active.doc;

  const draftsRef = useRef(drafts);
  useEffect(() => { draftsRef.current = drafts; });

  // drafts survive an accidental page close
  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => writeDrafts(drafts), 300);
    return () => window.clearTimeout(timer);
  }, [drafts, isOpen]);

  const onEditorChange = useCallback((id: string, doc: NoteDoc) => {
    const note = notesStore.getSnapshot().notes.find(item => item.id === id);
    if (!note) return;
    const key = docKey(doc), same = key === savedKey(note);
    setDrafts(previous => {
      if (same) { if (!(id in previous)) return previous; const next = { ...previous }; delete next[id]; return next; }
      return previous[id] && docKey(previous[id]) === key ? previous : { ...previous, [id]: doc };
    });
  }, []);

  const save = useCallback(() => {
    const pending = draftsRef.current, ids = Object.keys(pending);
    if (!ids.length) return;
    setSaving(true);
    for (const id of ids) notesStore.saveDoc(id, pending[id]);
    setDrafts({});
    writeDrafts({});
    setRestored(false);
    setSavedAt(nowIso());
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => setSaving(false), 400);
  }, []);
  useEffect(() => { saveRef.current = save; });
  useEffect(() => () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); }, []);

  const finishClose = useCallback(() => { setConfirm(null); onClose(); }, [onClose]);
  const requestClose = useCallback(() => {
    if (confirm) { setConfirm(null); return; }
    if (Object.keys(draftsRef.current).length) setConfirm({ kind: "unsaved" }); else finishClose();
  }, [confirm, finishClose]);
  useEffect(() => { closeRef.current = requestClose; });

  const discardAndClose = () => {
    setDrafts({});
    writeDrafts({});
    setRestored(false);
    setReset(value => value + 1);
    finishClose();
  };
  const saveAndClose = () => { save(); finishClose(); };

  const copyText = useCallback((text: string) => {
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
      notify.success("Tersalin", { id: "memo-copied" });
    }).catch(() => notify.warning("Tidak dapat menyalin ke clipboard.", { id: "memo-copy-failed" }));
  }, [notify]);
  const docOf = (id: string) => drafts[id] ?? notes.find(note => note.id === id)?.doc;

  // ---- note actions (they change the list at once; only the text of a note is a draft)
  const addNote = () => { if (!notesStore.addNote()) notify.warning("Maksimal 20 catatan.", { id: "memo-limit" }); };
  const duplicate = (id: string) => { if (!notesStore.duplicateNote(id, drafts[id])) notify.warning("Maksimal 20 catatan.", { id: "memo-limit" }); };
  const remove = (id: string) => {
    const doc = drafts[id];
    const info = notesStore.removeNote(id);
    if (!info) return;
    setDrafts(previous => { const next = { ...previous }; delete next[id]; return next; });
    if (info.cleared) setReset(value => value + 1);
    const undo = { ...info, note: { ...info.note, doc: doc ?? info.note.doc } };
    notify.info(info.cleared ? "Catatan terakhir dikosongkan." : `"${info.note.title}" dihapus.`, {
      id: "memo-deleted",
      action: { label: "Urungkan", onClick: () => { notesStore.undoRemove(undo); if (info.cleared) setReset(value => value + 1); } },
    });
  };
  const clearNote = (id: string) => {
    setDrafts(previous => { const next = { ...previous }; delete next[id]; return next; });
    notesStore.clearNote(id);
    setReset(value => value + 1);
    setConfirm(null);
    notify.info("Catatan dikosongkan.", { id: "memo-cleared" });
  };

  // ---- opening and closing: focus, keys, scroll lock (the body class reads data-memo-open)
  useEffect(() => {
    if (!isOpen) return;
    triggerRef.current = (document.activeElement as HTMLElement) || null;
    const timer = window.setTimeout(() => {
      // a phone keeps its keyboard down until the user taps the text
      if (!window.matchMedia("(pointer: coarse)").matches) editorRef.current?.focus();
    }, 50);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeRef.current(); return; }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); saveRef.current(); return; }
      if (event.key === "Tab" && modalRef.current) {
        const scope = dialogRef.current ?? modalRef.current;
        const focusables = Array.from(scope.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [contenteditable="true"], [tabindex="0"]'))
          .filter(element => element.offsetParent !== null || element.offsetWidth > 0 || element.offsetHeight > 0);
        if (!focusables.length) return;
        const first = focusables[0], last = focusables[focusables.length - 1];
        const inside = scope.contains(document.activeElement);
        if (event.shiftKey && (document.activeElement === first || !inside)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !inside)) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
      triggerRef.current?.focus?.({ preventScroll: true });
    };
  }, [isOpen]);

  useEffect(() => { if (confirm) dialogRef.current?.querySelector<HTMLElement>("[data-primary]")?.focus(); }, [confirm]);

  if (!isOpen || typeof document === "undefined") return null;

  const status = dirty
    ? `Belum disimpan${dirtyIds.length > 1 ? ` (${dirtyIds.length} catatan)` : ""}`
    : saving ? "Menyimpan…" : savedAt ? `Tersimpan ${clock(savedAt)}` : persistent ? "Disimpan di perangkat ini" : "Hanya sesi ini";
  const statusTone = dirty ? "text-amber-300" : !persistent ? "text-rose-300" : "text-slate-400";
  const initial = drafts[activeId] ?? active.doc;
  const iconBtn = "inline-flex h-11 items-center justify-center gap-1.5 rounded-lg px-3 max-sm:min-w-11 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 motion-reduce:transition-none sm:h-9";

  return createPortal(
    <div
      data-memo-open="true"
      role="presentation"
      style={viewport ? { top: viewport.top, height: viewport.height, bottom: "auto" } : undefined}
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-0 backdrop-blur-sm animate-in fade-in duration-150 motion-reduce:animate-none sm:p-4"
      onClick={event => { if (event.target === event.currentTarget) requestClose(); }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="memo-modal-title"
        className="memo-modal-card relative flex h-full w-full flex-col overflow-hidden bg-[#0f172a] text-[#f8fafc] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] sm:h-[min(80dvh,720px)] sm:w-[min(920px,calc(100vw-2rem))] sm:rounded-2xl sm:border sm:border-[#334155] [@media(max-height:500px)]:h-full [@media(max-height:500px)]:w-full [@media(max-height:500px)]:rounded-none"
      >
        <div className="order-1 flex shrink-0 items-center justify-between gap-2 border-b border-[#334155] bg-slate-900/80 px-4 py-2.5 sm:px-6 sm:py-3 [@media(max-height:500px)]:py-1.5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/15 text-amber-400"><StickyNote size={18} aria-hidden="true" /></div>
            <h2 id="memo-modal-title" className="min-w-0 truncate text-base font-bold text-[#f8fafc] sm:text-lg">Memo &amp; Catatan Shift</h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <span className="mr-1 hidden font-mono text-[11px] text-slate-400 sm:inline" aria-live="polite">{countItems(liveDoc)} butir</span>
            <button type="button" className={iconBtn} onClick={() => copyText(docToText(liveDoc))} title="Salin catatan ini sebagai teks">
              {copied ? <Check size={15} className="text-emerald-400" aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
              <span className="max-sm:sr-only">{copied ? "Tersalin" : "Salin"}</span>
            </button>
            <button type="button" onClick={requestClose} aria-label="Tutup" className="inline-grid size-11 shrink-0 place-items-center rounded-lg text-[#94a3b8] transition-colors hover:bg-slate-800 hover:text-[#f8fafc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 motion-reduce:transition-none sm:size-9">
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        <MemoTabs
          notes={notes}
          activeId={activeId}
          dirtyIds={dirtySet}
          onSelect={id => notesStore.setActive(id)}
          onAdd={addNote}
          onRename={(id, title) => notesStore.renameNote(id, title)}
          onPin={id => notesStore.togglePin(id)}
          onDuplicate={duplicate}
          onCopy={id => { const doc = docOf(id); if (doc) copyText(docToText(doc)); }}
          onClear={id => setConfirm({ kind: "clear", id })}
          onDelete={remove}
          onMove={(id, direction) => notesStore.moveNote(id, direction)}
        />

        <MemoToolbar formats={formats} onCommand={(command: EditorCommand) => editorRef.current?.run(command)} />

        <div
          id="memo-panel"
          role="tabpanel"
          aria-labelledby={`memo-tab-${activeId}`}
          className="relative order-3 min-h-0 flex-1 overflow-y-auto overscroll-contain border border-transparent bg-slate-950/60 p-4 transition-colors duration-150 focus-within:border-sky-400/35 motion-reduce:transition-none sm:order-4 sm:p-[23px]"
        >
          <NoteEditor
            key={`${activeId}:${reset}`}
            ref={editorRef}
            initial={initial}
            label={`Isi catatan ${active.title}`}
            onChange={doc => onEditorChange(activeId, doc)}
            onFormats={setFormats}
          />
        </div>

        <div className="order-5 flex shrink-0 items-center justify-between gap-3 border-t border-[#334155] bg-slate-900/90 px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-6 [@media(max-height:500px)]:py-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
            <span role="status" className={`inline-flex items-center gap-1.5 text-xs font-medium ${statusTone}`}>
              <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${dirty ? "bg-amber-400" : saving ? "animate-pulse bg-sky-400 motion-reduce:animate-none" : persistent ? "bg-emerald-400" : "bg-rose-400"}`} />
              {status}
            </span>
            {restored && dirty && <span className="inline-flex items-center rounded-full border border-amber-400/40 bg-amber-950 px-2 py-0.5 text-[11px] font-semibold text-amber-200">Draft dipulihkan</span>}
          </div>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg bg-sky-700 px-6 text-sm font-bold text-white shadow-md shadow-sky-700/30 transition-colors hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f172a] disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300 disabled:shadow-none motion-reduce:transition-none sm:h-10"
          >
            Simpan
          </button>
        </div>

        {confirm && (
          <div role="presentation" className="absolute inset-0 z-50 grid place-items-center bg-black/55 p-4" onClick={event => { if (event.target === event.currentTarget) setConfirm(null); }}>
            <div
              ref={dialogRef}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="memo-confirm-title"
              aria-describedby="memo-confirm-text"
              className="w-full max-w-sm rounded-xl border border-slate-600 bg-[#1e293b] p-5 shadow-[0_18px_36px_rgba(0,0,0,0.5)]"
            >
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-amber-400/30 bg-amber-950 text-amber-300"><AlertTriangle size={18} aria-hidden="true" /></span>
                <div className="min-w-0">
                  <h3 id="memo-confirm-title" className="text-base font-bold text-slate-50">{confirm.kind === "unsaved" ? "Simpan perubahan?" : "Kosongkan catatan?"}</h3>
                  <p id="memo-confirm-text" className="mt-1 text-sm text-slate-300">
                    {confirm.kind === "unsaved"
                      ? dirtyIds.length > 1 ? `${dirtyIds.length} catatan berubah dan belum disimpan.` : "Catatan ini berubah dan belum disimpan."
                      : `Isi "${notes.find(note => note.id === confirm.id)?.title ?? "catatan"}" dihapus. Judulnya tetap.`}
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button type="button" onClick={() => setConfirm(null)} className="inline-flex h-11 items-center rounded-lg border border-slate-600 px-4 text-sm font-semibold text-slate-100 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 sm:h-10">Batal</button>
                {confirm.kind === "unsaved" ? (
                  <>
                    <button type="button" onClick={discardAndClose} className="inline-flex h-11 items-center rounded-lg border border-rose-400/50 px-4 text-sm font-semibold text-rose-200 hover:bg-rose-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60 sm:h-10">Buang</button>
                    <button type="button" data-primary onClick={saveAndClose} className="inline-flex h-11 items-center rounded-lg bg-sky-700 px-5 text-sm font-bold text-white hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 sm:h-10">Simpan</button>
                  </>
                ) : (
                  <button type="button" data-primary onClick={() => clearNote(confirm.id)} className="inline-flex h-11 items-center rounded-lg bg-rose-600 px-5 text-sm font-bold text-white hover:bg-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 sm:h-10">Kosongkan</button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
