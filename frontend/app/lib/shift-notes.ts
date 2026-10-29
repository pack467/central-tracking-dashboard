/**
 * Notes of "Memo & Catatan Shift": the list of notes, the active note, and where they live.
 * Stored as ctd.memo.v2. The single string the memo used to be (ctd_shift_notepad_memo) is read once and becomes "Catatan 1";
 * that key is never written or removed. Drafts live under their own key so a closed tab cannot lose unsaved text.
 */
import { randomUuid } from "./master-data-model";
import { type NoteDoc, cleanDoc, docFromText, emptyDoc } from "./shift-notes-doc";

export const NOTES_KEY = "ctd.memo.v2";
export const INVALID_NOTES_KEY = "ctd.memo.invalid.v1";
export const LEGACY_MEMO_KEY = "ctd_shift_notepad_memo";
export const DRAFT_KEY = "ctd.memo.draft.v1";
export const MAX_NOTES = 20;
export const MAX_TITLE = 40;

export const SEED_MEMO_TEXT = `• Pantau koneksi gateway B2B sekunder menjelang lonjakan transaksi pagi.
• Antrean ActiveMQ broker #228 masih dalam batas investigasi failover.
• Jadwal checklist checkpoint berikutnya pukul 06:30 WIB (USIEM & SM).
• Status failover DR cluster standby normal tanpa kendala.`;

export interface Note { id: string; title: string; doc: NoteDoc; createdAt: string; updatedAt: string; pinned?: boolean }
/** Pinned notes always come first in `notes`; that order is what the tab bar shows. */
export interface NotesState { v: 2; notes: Note[]; activeId: string; rev: number }
export interface NotesSnapshot extends NotesState { /** false when browser storage is blocked and notes live only in this tab */ persistent: boolean; hydrated: boolean }

const EPOCH = "1970-01-01T00:00:00.000Z";

/** The one clock of the memo; tests freeze it with window.__TEST_CLOCK__ like the rest of the app. */
export function nowIso(): string {
  const frozen = typeof window !== "undefined" ? (window as unknown as { __TEST_CLOCK__?: string }).__TEST_CLOCK__ : undefined;
  return frozen ? new Date(frozen).toISOString() : new Date().toISOString();
}

const seedNote = (): Note => ({ id: "note-seed", title: "Catatan 1", doc: docFromText(SEED_MEMO_TEXT), createdAt: EPOCH, updatedAt: EPOCH });
const seedState = (): NotesState => ({ v: 2, notes: [seedNote()], activeId: "note-seed", rev: 0 });
const newId = () => `note-${randomUuid()}`;

/** Smallest "Catatan N" not used yet, so numbers never clash even after deletes. */
export function nextTitle(notes: readonly Note[]): string {
  const used = new Set(notes.map(note => note.title));
  let n = 1;
  while (used.has(`Catatan ${n}`)) n++;
  return `Catatan ${n}`;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** Strict: anything that is not a well formed v2 state is refused as a whole. */
export function parseState(raw: unknown): NotesState | null {
  let value = raw;
  if (typeof raw === "string") { try { value = JSON.parse(raw); } catch { return null; } }
  if (!isRecord(value) || value.v !== 2 || !Array.isArray(value.notes) || value.notes.length < 1 || value.notes.length > MAX_NOTES) return null;
  const notes: Note[] = [], ids = new Set<string>();
  for (const item of value.notes) {
    if (!isRecord(item) || typeof item.id !== "string" || !item.id || ids.has(item.id)) return null;
    if (typeof item.title !== "string" || item.title.trim() === "" || item.title.length > MAX_TITLE) return null;
    if (typeof item.createdAt !== "string" || typeof item.updatedAt !== "string") return null;
    if (item.pinned !== undefined && typeof item.pinned !== "boolean") return null;
    const doc = cleanDoc(item.doc);
    if (!doc) return null;
    ids.add(item.id);
    notes.push({ id: item.id, title: item.title, doc, createdAt: item.createdAt, updatedAt: item.updatedAt, ...(item.pinned ? { pinned: true } : {}) });
  }
  // keep the "pinned first" order even if something wrote the list otherwise
  const ordered = [...notes.filter(note => note.pinned), ...notes.filter(note => !note.pinned)];
  const activeId = typeof value.activeId === "string" && ids.has(value.activeId) ? value.activeId : ordered[0].id;
  return { v: 2, notes: ordered, activeId, rev: Number.isInteger(value.rev) && (value.rev as number) >= 0 ? (value.rev as number) : 0 };
}

function fromLegacy(text: string): NotesState {
  const at = nowIso();
  const id = newId();
  return { v: 2, notes: [{ id, title: "Catatan 1", doc: docFromText(text), createdAt: at, updatedAt: at }], activeId: id, rev: 1 };
}

function storage(): Storage | null {
  try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; }
}

// ---------------------------------------------------------------- store

let state: NotesState = seedState();
let persistent = true;
let hydrated = false;
let listening = false;
const SERVER_SNAPSHOT: NotesSnapshot = { ...seedState(), persistent: true, hydrated: false };
let snapshot: NotesSnapshot = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();

function publish(next: NotesState) {
  state = next;
  snapshot = { ...next, persistent, hydrated };
  listeners.forEach(listener => listener());
}

function persist(next: NotesState) {
  const store = storage();
  if (store) {
    try { store.setItem(NOTES_KEY, JSON.stringify(next)); persistent = true; } catch { persistent = false; }
  } else persistent = false;
  publish(next);
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  const store = storage();
  let next: NotesState | null = null, migrated = false;
  if (store) {
    try {
      const raw = store.getItem(NOTES_KEY);
      if (raw !== null) {
        next = parseState(raw);
        if (!next) { try { store.setItem(INVALID_NOTES_KEY, JSON.stringify({ at: nowIso(), raw })); } catch { /* the copy is a courtesy */ } }
      }
    } catch { persistent = false; }
    if (!next) {
      try {
        const legacy = store.getItem(LEGACY_MEMO_KEY);
        if (legacy !== null) { next = fromLegacy(legacy); migrated = true; }
      } catch { persistent = false; }
    }
  } else persistent = false;
  if (migrated && next) persist(next); else publish(next ?? seedState());
}

function onStorage(event: StorageEvent) {
  if (event.key !== null && event.key !== NOTES_KEY) return;
  const store = storage();
  let raw: string | null = null;
  try { raw = store ? store.getItem(NOTES_KEY) : null; } catch { return; }
  const next = raw === null ? null : parseState(raw);
  if (next) publish(next);
}

function update(change: (current: NotesState) => NotesState | null): boolean {
  hydrate();
  const next = change(state);
  if (!next) return false;
  persist({ ...next, rev: state.rev + 1 });
  return true;
}
const mapNote = (current: NotesState, id: string, change: (note: Note) => Note): NotesState | null =>
  current.notes.some(note => note.id === id) ? { ...current, notes: current.notes.map(note => note.id === id ? change(note) : note) } : null;

export const notesStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    if (!listening && typeof window !== "undefined") { listening = true; window.addEventListener("storage", onStorage); }
    hydrate();
    return () => { listeners.delete(listener); };
  },
  getSnapshot: () => snapshot,
  getServerSnapshot: () => SERVER_SNAPSHOT,

  setActive: (id: string) => update(current => current.activeId !== id && current.notes.some(note => note.id === id) ? { ...current, activeId: id } : null),
  /** Replaces the content of a note with a validated document. */
  saveDoc: (id: string, doc: NoteDoc) => {
    const clean = cleanDoc(doc);
    return !!clean && update(current => mapNote(current, id, note => ({ ...note, doc: clean, updatedAt: nowIso() })));
  },
  /** Returns the id of the new note, or null when the limit is reached. */
  addNote: (doc: NoteDoc = emptyDoc(), title?: string): string | null => {
    hydrate();
    if (state.notes.length >= MAX_NOTES) return null;
    const id = newId(), at = nowIso();
    update(current => ({ ...current, notes: [...current.notes, { id, title: title ?? nextTitle(current.notes), doc, createdAt: at, updatedAt: at }], activeId: id }));
    return id;
  },
  renameNote: (id: string, title: string) => {
    const clean = title.trim();
    return clean.length >= 1 && clean.length <= MAX_TITLE && update(current => mapNote(current, id, note => note.title === clean ? note : { ...note, title: clean, updatedAt: nowIso() }));
  },
  togglePin: (id: string) => update(current => {
    const note = current.notes.find(item => item.id === id);
    if (!note) return null;
    const rest = current.notes.filter(item => item.id !== id);
    const pinned = rest.filter(item => item.pinned), loose = rest.filter(item => !item.pinned);
    return { ...current, notes: [...pinned, { ...note, pinned: note.pinned ? undefined : true }, ...loose] };
  }),
  duplicateNote: (id: string, doc?: NoteDoc): string | null => {
    hydrate();
    const source = state.notes.find(note => note.id === id);
    if (!source || state.notes.length >= MAX_NOTES) return null;
    const copyId = newId(), at = nowIso();
    const title = `${source.title} (salinan)`.slice(0, MAX_TITLE);
    update(current => {
      const index = current.notes.findIndex(note => note.id === id);
      const copy: Note = { id: copyId, title, doc: cleanDoc(doc) ?? source.doc, createdAt: at, updatedAt: at, ...(source.pinned ? { pinned: true } : {}) };
      return { ...current, notes: [...current.notes.slice(0, index + 1), copy, ...current.notes.slice(index + 1)], activeId: copyId };
    });
    return copyId;
  },
  /**
   * Deletes a note; the last remaining note is emptied instead. The returned value is what `undoRemove` needs.
   */
  removeNote: (id: string): { note: Note; index: number; cleared: boolean } | null => {
    hydrate();
    const index = state.notes.findIndex(note => note.id === id);
    if (index < 0) return null;
    const note = state.notes[index];
    if (state.notes.length === 1) { notesStore.saveDoc(id, emptyDoc()); return { note, index, cleared: true }; }
    update(current => {
      const notes = current.notes.filter(item => item.id !== id);
      return { ...current, notes, activeId: current.activeId === id ? notes[Math.min(index, notes.length - 1)].id : current.activeId };
    });
    return { note, index, cleared: false };
  },
  undoRemove: ({ note, index, cleared }: { note: Note; index: number; cleared: boolean }) => {
    if (cleared) return notesStore.saveDoc(note.id, note.doc);
    return update(current => {
      if (current.notes.some(item => item.id === note.id) || current.notes.length >= MAX_NOTES) return null;
      const notes = [...current.notes];
      notes.splice(Math.min(index, notes.length), 0, note);
      return { ...current, notes: [...notes.filter(item => item.pinned), ...notes.filter(item => !item.pinned)], activeId: note.id };
    });
  },
  /** Moves a note one place, inside its pinned or unpinned group. */
  moveNote: (id: string, direction: -1 | 1) => update(current => {
    const index = current.notes.findIndex(note => note.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= current.notes.length || !!current.notes[target].pinned !== !!current.notes[index].pinned) return null;
    const notes = [...current.notes];
    [notes[index], notes[target]] = [notes[target], notes[index]];
    return { ...current, notes };
  }),
  clearNote: (id: string) => notesStore.saveDoc(id, emptyDoc()),
  /** Ticks or unticks the checklist item at `blockIndex`; used by the dashboard card, which saves straight away. */
  toggleTodo: (id: string, blockIndex: number) => update(current => {
    const block = current.notes.find(note => note.id === id)?.doc.blocks[blockIndex];
    if (!block || block.k !== "li" || block.l !== "todo") return null;
    return mapNote(current, id, note => ({
      ...note,
      doc: { ...note.doc, blocks: note.doc.blocks.map((item, i) => i === blockIndex && item.k === "li" ? { ...item, c: item.c ? undefined : true } : item) },
      updatedAt: nowIso(),
    }));
  }),
};

/** Test hook: forget everything held in memory, as a fresh page load would. */
export function resetNotesStore() {
  state = seedState(); persistent = true; hydrated = false; snapshot = SERVER_SNAPSHOT;
  if (listening && typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  listening = false; listeners.clear();
}

// ---------------------------------------------------------------- drafts

/** Unsaved text per note, kept under its own key; read back and validated when the modal opens. */
export function readDrafts(): Record<string, NoteDoc> {
  const out: Record<string, NoteDoc> = {};
  try {
    const raw = storage()?.getItem(DRAFT_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (isRecord(parsed) && parsed.v === 1 && isRecord(parsed.drafts)) {
      for (const [id, value] of Object.entries(parsed.drafts)) { const doc = cleanDoc(value); if (doc) out[id] = doc; }
    }
  } catch { /* a damaged draft is simply gone */ }
  return out;
}

export function writeDrafts(drafts: Record<string, NoteDoc>) {
  try {
    const store = storage();
    if (!store) return;
    if (Object.keys(drafts).length === 0) store.removeItem(DRAFT_KEY); else store.setItem(DRAFT_KEY, JSON.stringify({ v: 1, drafts }));
  } catch { /* storage may be blocked or full */ }
}
