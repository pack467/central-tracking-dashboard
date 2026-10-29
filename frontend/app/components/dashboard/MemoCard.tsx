"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, Layers, Pencil, StickyNote } from "lucide-react";
import { useShiftNotes } from "@/app/hooks/useShiftNotes";
import { notesStore } from "@/app/lib/shift-notes";
import { isEmptyDoc, type NoteDoc } from "@/app/lib/shift-notes-doc";
import { NoteView } from "./memo/NoteView";

interface Props {
  /** Phones get the same card the memo always had (amber edge, 14px text); desktop a compact one. */
  mobile: boolean;
  /** Opens the editor. Moving between notes, adding and renaming them all happen there. */
  onOpen: () => void;
  /** The loading skeleton shows this card with its text blurred out, so nothing moves when the real card arrives. */
  loading?: boolean;
}

const hasText = (doc: NoteDoc) => !isEmptyDoc(doc) || doc.blocks.some(block => block.k === "li");
const EPOCH = "1970-01-01T00:00:00.000Z";
/** HH.mm in Jakarta, or null for a stored value that is not a date (the card must survive hand-edited storage). */
const clock = (iso: string) => { const date = new Date(iso); return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Jakarta" }).format(date); };

/**
 * The Memo card of the dashboard: how many notes there are, one main note as formatted text, and a way into the editor.
 * The main note is the first pinned one, otherwise the active one. The row for "Lihat semua" always has its room, so the card keeps one height.
 */
export function MemoCard({ mobile, onOpen, loading = false }: Props) {
  const { notes, active, hydrated } = useShiftNotes();
  const main = notes.find(note => note.pinned) ?? active;
  const allEmpty = notes.every(note => !hasText(note.doc));
  const body = useRef<HTMLDivElement | null>(null);
  const [clipped, setClipped] = useState(false);

  const measure = useCallback(() => {
    const element = body.current;
    if (element) setClipped(element.scrollHeight > element.clientHeight + 1);
  }, []);
  useEffect(() => {
    const element = body.current;
    if (!element) return;
    let frame = 0, live = true;
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => { if (live) measure(); }); };
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    schedule();
    void document.fonts.ready.then(() => { if (live) schedule(); });
    return () => { live = false; cancelAnimationFrame(frame); observer.disconnect(); };
  }, [measure, main.doc, mobile, allEmpty]);

  const open = () => { notesStore.setActive(main.id); onOpen(); };
  // until the saved notes are read, the card holds its place unseen: the seed text swapping for real notes would otherwise shift the layout
  const state = `${hydrated ? "" : "invisible"} ${loading ? "pointer-events-none [&_[data-memo-copy]]:text-transparent [&_[data-memo-copy]]:bg-slate-700/40 [&_[data-memo-copy]]:rounded [&_[data-memo-copy]]:animate-pulse motion-reduce:[&_*]:animate-none" : ""}`;
  const touch = mobile ? "min-h-11" : "h-7";
  const edit = (
    <button type="button" onClick={open} disabled={loading} aria-label={`Edit catatan ${main.title}`} className={`inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-600 px-2.5 text-[11px] font-semibold text-slate-100 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 ${touch}`}>
      <Pencil size={11} aria-hidden="true" />Edit
    </button>
  );

  const frame = (children: React.ReactNode) => mobile ? (
    <div data-memo-card data-loading={loading || undefined} className={`flex w-full shrink-0 flex-col gap-2 overflow-hidden rounded-xl border border-slate-700/50 bg-[#0f172a]/60 p-3.5 text-left ${allEmpty ? "border-dashed" : "border-l-[3px] border-l-amber-400"} ${state}`}>{children}</div>
  ) : (
    <div data-memo-card data-loading={loading || undefined} className={`flex min-h-0 flex-1 flex-col gap-2 ${state}`}>{children}</div>
  );

  if (allEmpty) {
    return frame(
      <button type="button" onClick={open} disabled={loading} className={`flex w-full items-center gap-3 text-left text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 ${mobile ? "min-h-11" : "min-h-7"}`}>
        <StickyNote size={mobile ? 22 : 16} className="shrink-0 text-amber-400/60" aria-hidden="true" />
        <span className="min-w-0 flex-1">Belum ada catatan</span>
        <span className="shrink-0 text-[12px] font-semibold text-amber-300">Tulis catatan</span>
      </button>,
    );
  }

  const time = main.updatedAt !== EPOCH ? clock(main.updatedAt) : null;
  const updated = time ? `Diperbarui ${time}` : null;
  return frame(
    <>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpen}
          disabled={loading}
          aria-label="Buka semua catatan"
          title="Buka semua catatan"
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 text-[11px] font-semibold text-amber-200 hover:bg-amber-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 ${touch}`}
        >
          <Layers size={12} aria-hidden="true" />
          {notes.length} catatan
        </button>
        {updated && <span className="min-w-0 flex-1 truncate text-[11px] text-slate-400">{updated}</span>}
        {!updated && <span className="flex-1" />}
        {edit}
      </div>
      <div className="relative overflow-hidden">
        <div ref={body} className={mobile ? "max-h-[89.6px] overflow-hidden" : "h-[72px] overflow-hidden"}>
          {hasText(main.doc) ? (
            <NoteView
              doc={main.doc}
              onToggleTodo={loading ? undefined : index => notesStore.toggleTodo(main.id, index)}
              className={mobile ? "text-[14px] leading-[1.6] text-slate-200" : "text-[11.5px] leading-6 text-[#f1f5f9]"}
            />
          ) : (
            <p className="m-0 text-[12px] text-slate-400">Catatan ini masih kosong.</p>
          )}
        </div>
        {clipped && <span data-memo-fade aria-hidden="true" className={`pointer-events-none absolute inset-x-0 bottom-0 h-6 ${mobile ? "bg-[linear-gradient(to_bottom,transparent,color-mix(in_srgb,#0f172a_60%,#1e293b))]" : "bg-[linear-gradient(to_bottom,transparent,#0b1120)]"}`} />}
      </div>
      {/* its own row under the text: it never sits on a line of the note, and the room is kept whether or not the text is cut */}
      <div className={`flex shrink-0 items-center justify-end ${mobile ? "h-11" : "h-6"}`}>
        {clipped && (
          <button type="button" onClick={onOpen} disabled={loading} data-memo-more className={`inline-flex items-center gap-0.5 rounded text-[12px] leading-4 font-semibold text-amber-300 hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 ${mobile ? "h-11 px-1" : "h-6"}`}>
            Lihat semua<ChevronRight size={14} aria-hidden="true" />
          </button>
        )}
      </div>
    </>,
  );
}
