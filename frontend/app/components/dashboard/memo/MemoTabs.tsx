"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { ChevronLeft, ChevronRight, ClipboardCopy, Copy, Eraser, MoreHorizontal, Pencil, Pin, PinOff, Plus, Trash2 } from "lucide-react";
import { MAX_NOTES, MAX_TITLE, type Note } from "@/app/lib/shift-notes";
import { menuKeyDown, useMenuDismiss } from "@/app/components/master-data/menu-ui";

export interface TabActions {
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRename: (id: string, title: string) => boolean;
  onPin: (id: string) => void;
  onDuplicate: (id: string) => void;
  onCopy: (id: string) => void;
  onClear: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
}

interface Props extends TabActions { notes: readonly Note[]; activeId: string; dirtyIds: ReadonlySet<string> }

const FADE = {
  none: "",
  l: "[mask-image:linear-gradient(to_right,transparent,#000_20px)]",
  r: "[mask-image:linear-gradient(to_left,transparent,#000_20px)]",
  lr: "[mask-image:linear-gradient(to_right,transparent,#000_20px,#000_calc(100%-20px),transparent)]",
} as const;
const itemClass = "flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm text-slate-100 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400/60 aria-disabled:cursor-not-allowed aria-disabled:text-slate-500 aria-disabled:hover:bg-transparent sm:min-h-9";
const dangerItemClass = "flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm text-rose-300 hover:bg-rose-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-400/60 sm:min-h-9";
const tabId = (id: string) => `memo-tab-${id}`;

/** The note bar: ARIA tabs that scroll sideways, a "+" that stays put, and one menu per note (also on right click and long press). */
export function MemoTabs({ notes, activeId, dirtyIds, onSelect, onAdd, onRename, onPin, onDuplicate, onCopy, onClear, onDelete, onMove }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const press = useRef<{ timer: number; fired: boolean } | null>(null);
  const [fade, setFade] = useState<keyof typeof FADE>("none");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [menuFor, setMenuFor] = useState<{ id: string; left: number } | null>(null);
  const full = notes.length >= MAX_NOTES;

  const measure = useCallback(() => {
    const element = list.current;
    if (!element) return;
    const left = element.scrollLeft > 2, right = element.scrollLeft + element.clientWidth < element.scrollWidth - 2;
    setFade(left && right ? "lr" : left ? "l" : right ? "r" : "none");
  }, []);
  useEffect(() => {
    const element = list.current;
    if (!element) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [measure, notes.length]);
  // the active tab is always fully in view
  useEffect(() => { document.getElementById(tabId(activeId))?.scrollIntoView({ inline: "nearest", block: "nearest" }); }, [activeId, notes.length]);

  const closeMenu = useCallback(() => setMenuFor(null), []);
  useMenuDismiss(!!menuFor, wrap, closeMenu, { focusFirst: true });
  /** The menu button toggles; right click and long press only ever open (a phone sends both a long press and a context menu event). */
  const openMenu = (id: string, toggle = false) => {
    const tab = document.getElementById(tabId(id)), box = wrap.current?.getBoundingClientRect();
    if (!tab || !box) return;
    const left = Math.max(4, Math.min(tab.getBoundingClientRect().left - box.left, box.width - 228));
    setMenuFor(current => toggle && current?.id === id ? null : { id, left });
  };

  const startRename = (note: Note) => { setMenuFor(null); setRenaming(note.id); setDraft(note.title); setInvalid(false); };
  const commit = (id: string, value: string) => {
    if (onRename(id, value)) { setRenaming(null); setInvalid(false); return true; }
    setInvalid(true);
    return false;
  };

  const tabKeys = (event: KeyboardEvent<HTMLButtonElement>, note: Note, index: number) => {
    const key = event.key;
    if (key === "F2") { event.preventDefault(); startRename(note); return; }
    if (event.altKey && (key === "ArrowLeft" || key === "ArrowRight")) {
      event.preventDefault();
      onMove(note.id, key === "ArrowLeft" ? -1 : 1);
      requestAnimationFrame(() => document.getElementById(tabId(note.id))?.focus());
      return;
    }
    const target = key === "ArrowRight" ? index + 1 : key === "ArrowLeft" ? index - 1 : key === "Home" ? 0 : key === "End" ? notes.length - 1 : -1;
    if (target < 0) return;
    event.preventDefault();
    const next = notes[(target + notes.length) % notes.length];
    onSelect(next.id);
    requestAnimationFrame(() => document.getElementById(tabId(next.id))?.focus());
  };

  const pressStart = (event: PointerEvent<HTMLButtonElement>, id: string) => {
    if (event.pointerType !== "touch") return;
    const state = { timer: window.setTimeout(() => { state.fired = true; openMenu(id); }, 500), fired: false };
    press.current = state;
  };
  const pressEnd = () => { if (press.current) window.clearTimeout(press.current.timer); };

  const target = menuFor ? notes.find(note => note.id === menuFor.id) : undefined;
  const targetIndex = target ? notes.findIndex(note => note.id === target.id) : -1;
  const canLeft = !!target && targetIndex > 0 && !!notes[targetIndex - 1].pinned === !!target.pinned;
  const canRight = !!target && targetIndex < notes.length - 1 && !!notes[targetIndex + 1].pinned === !!target.pinned;
  const act = (run: () => void) => () => { setMenuFor(null); run(); };

  return (
    <div ref={wrap} className="relative flex shrink-0 items-end gap-1 order-2 border-b border-slate-700/80 bg-slate-900/50 px-3 sm:px-5">
      <div
        ref={list}
        role="tablist"
        aria-label="Catatan"
        aria-orientation="horizontal"
        onScroll={measure}
        className={`flex min-w-0 flex-1 items-end gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${FADE[fade]}`}
      >
        {notes.map((note, index) => {
          const active = note.id === activeId, dirty = dirtyIds.has(note.id);
          return (
            <div key={note.id} className="flex shrink-0 items-center">
              {renaming === note.id ? (
                <input
                  ref={element => element?.focus()}
                  aria-label={`Nama catatan, maksimal ${MAX_TITLE} karakter`}
                  aria-invalid={invalid}
                  maxLength={MAX_TITLE}
                  value={draft}
                  onChange={event => { setDraft(event.target.value); setInvalid(false); }}
                  onFocus={event => event.currentTarget.select()}
                  onKeyDown={event => {
                    if (event.key === "Enter") { event.preventDefault(); commit(note.id, draft); }
                    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setRenaming(null); requestAnimationFrame(() => document.getElementById(tabId(note.id))?.focus()); }
                  }}
                  onBlur={() => { if (renaming === note.id && !commit(note.id, draft)) setRenaming(null); }}
                  className={`h-11 w-44 rounded-lg border bg-slate-950 px-3 text-sm text-slate-50 outline-none sm:h-9 ${invalid ? "border-rose-400" : "border-sky-400/60"}`}
                />
              ) : (
                <button
                  type="button"
                  role="tab"
                  id={tabId(note.id)}
                  aria-selected={active}
                  aria-controls="memo-panel"
                  tabIndex={active ? 0 : -1}
                  title={`${note.title}${note.pinned ? " (disematkan)" : ""}`}
                  onClick={() => { if (press.current?.fired) { press.current = null; return; } setMenuFor(null); onSelect(note.id); }}
                  onDoubleClick={() => startRename(note)}
                  onContextMenu={event => { event.preventDefault(); openMenu(note.id); }}
                  onKeyDown={event => tabKeys(event, note, index)}
                  onPointerDown={event => pressStart(event, note.id)}
                  onPointerUp={pressEnd}
                  onPointerLeave={pressEnd}
                  onPointerCancel={pressEnd}
                  className={`flex h-11 items-center gap-1.5 rounded-t-lg border-b-2 px-3 text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400/60 sm:h-9 ${active ? "border-sky-400 bg-sky-500/10 text-sky-200" : "border-transparent text-slate-300 hover:bg-slate-800 hover:text-white"}`}
                >
                  {note.pinned && <Pin size={12} className="shrink-0" aria-hidden="true" />}
                  <span className="max-w-[18ch] truncate">{note.title}</span>
                  {dirty && <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-amber-400" />}
                  {dirty && <span className="sr-only">belum disimpan</span>}
                </button>
              )}
              {active && renaming !== note.id && (
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={menuFor?.id === note.id}
                  aria-label={`Menu catatan ${note.title}`}
                  onClick={() => openMenu(note.id, true)}
                  className="grid size-11 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 sm:size-9"
                >
                  <MoreHorizontal size={16} aria-hidden="true" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        aria-label="Catatan baru"
        title={full ? `Maksimal ${MAX_NOTES} catatan` : "Catatan baru"}
        disabled={full}
        onClick={onAdd}
        className="mb-px grid size-11 shrink-0 place-items-center rounded-lg text-sky-300 hover:bg-sky-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 disabled:cursor-not-allowed disabled:text-slate-600 disabled:hover:bg-transparent sm:size-9"
      >
        <Plus size={18} aria-hidden="true" />
      </button>
      {full && <span className="sr-only">Batas {MAX_NOTES} catatan tercapai.</span>}

      {menuFor && target && (
        <div
          ref={menu}
          role="menu"
          tabIndex={-1}
          aria-label={`Menu ${target.title}`}
          onKeyDown={menuKeyDown}
          style={{ left: menuFor.left }}
          className="absolute top-full z-40 mt-1 w-56 rounded-xl border border-slate-600 bg-[#1e293b] p-1 shadow-[0_18px_36px_rgba(0,0,0,0.4)]"
        >
          <button type="button" role="menuitem" className={itemClass} onClick={() => startRename(target)}><Pencil size={15} aria-hidden="true" />Ubah nama</button>
          <button type="button" role="menuitem" className={itemClass} onClick={act(() => onPin(target.id))}>
            {target.pinned ? <PinOff size={15} aria-hidden="true" /> : <Pin size={15} aria-hidden="true" />}{target.pinned ? "Lepas sematan" : "Sematkan"}
          </button>
          <button type="button" role="menuitem" aria-disabled={full} className={itemClass} onClick={full ? undefined : act(() => onDuplicate(target.id))}><Copy size={15} aria-hidden="true" />Duplikat</button>
          <button type="button" role="menuitem" className={itemClass} onClick={act(() => onCopy(target.id))}><ClipboardCopy size={15} aria-hidden="true" />Salin</button>
          {canLeft && <button type="button" role="menuitem" className={itemClass} onClick={act(() => onMove(target.id, -1))}><ChevronLeft size={15} aria-hidden="true" />Geser ke kiri</button>}
          {canRight && <button type="button" role="menuitem" className={itemClass} onClick={act(() => onMove(target.id, 1))}><ChevronRight size={15} aria-hidden="true" />Geser ke kanan</button>}
          <div role="separator" className="my-1 h-px bg-slate-700" />
          <button type="button" role="menuitem" className={itemClass} onClick={act(() => onClear(target.id))}><Eraser size={15} aria-hidden="true" />Kosongkan catatan</button>
          <button type="button" role="menuitem" className={dangerItemClass} onClick={act(() => onDelete(target.id))}><Trash2 size={15} aria-hidden="true" />Hapus</button>
        </div>
      )}
    </div>
  );
}
