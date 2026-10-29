"use client";

import { useSyncExternalStore } from "react";
import { notesStore, type Note, type NotesSnapshot } from "@/app/lib/shift-notes";

/** The notes of Memo & Catatan Shift. The server and the first client render show the seed; saved notes arrive right after hydration. */
export function useShiftNotes(): NotesSnapshot & { active: Note } {
  const snapshot = useSyncExternalStore(notesStore.subscribe, notesStore.getSnapshot, notesStore.getServerSnapshot);
  const active = snapshot.notes.find(note => note.id === snapshot.activeId) ?? snapshot.notes[0];
  return { ...snapshot, active };
}
