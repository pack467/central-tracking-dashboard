"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Bold, Eraser, Heading, Highlighter, Italic, List, ListChecks, ListOrdered, Redo2, Underline, Undo2, type LucideIcon } from "lucide-react";
import type { EditorCommand, Formats } from "./NoteEditor";

interface Tool { command: EditorCommand; label: string; hint: string; icon: LucideIcon; toggle?: keyof Formats }
const GROUPS: Tool[][] = [
  [
    { command: "bold", label: "Tebal", hint: "Tebal (Ctrl+B)", icon: Bold, toggle: "bold" },
    { command: "italic", label: "Miring", hint: "Miring (Ctrl+I)", icon: Italic, toggle: "italic" },
    { command: "underline", label: "Garis bawah", hint: "Garis bawah (Ctrl+U)", icon: Underline, toggle: "underline" },
  ],
  [
    { command: "heading", label: "Judul", hint: "Judul", icon: Heading, toggle: "heading" },
    { command: "ul", label: "Poin", hint: "Daftar poin", icon: List, toggle: "ul" },
    { command: "ol", label: "Angka", hint: "Daftar angka", icon: ListOrdered, toggle: "ol" },
    { command: "todo", label: "Centang", hint: "Daftar centang (Ctrl+Enter menandai)", icon: ListChecks, toggle: "todo" },
    { command: "highlight", label: "Penting", hint: "Sorot sebagai penting", icon: Highlighter, toggle: "highlight" },
  ],
  [
    { command: "clear", label: "Hapus format", hint: "Hapus format", icon: Eraser },
    { command: "undo", label: "Urungkan", hint: "Urungkan (Ctrl+Z)", icon: Undo2 },
    { command: "redo", label: "Ulangi", hint: "Ulangi (Ctrl+Shift+Z)", icon: Redo2 },
  ],
];
const TOOLS = GROUPS.flat();

/**
 * Format buttons. They never take focus from the editor (the selection stays where it is), and the arrow keys move between them.
 */
export function MemoToolbar({ formats, onCommand }: { formats: Formats; onCommand: (command: EditorCommand) => void }) {
  const [current, setCurrent] = useState(0);
  const bar = useRef<HTMLDivElement>(null);
  const keys = (event: KeyboardEvent<HTMLDivElement>) => {
    const move = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : event.key === "Home" ? "first" : event.key === "End" ? "last" : null;
    if (move === null) return;
    event.preventDefault();
    const next = move === "first" ? 0 : move === "last" ? TOOLS.length - 1 : (current + move + TOOLS.length) % TOOLS.length;
    setCurrent(next);
    bar.current?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
  };
  let index = -1;
  return (
    <div
      ref={bar}
      role="toolbar"
      aria-label="Format catatan"
      aria-orientation="horizontal"
      onKeyDown={keys}
      className="flex shrink-0 items-center gap-0.5 overflow-x-auto border-b border-slate-700/80 bg-slate-900/60 px-3 py-1.5 [scrollbar-width:none] max-sm:order-4 max-sm:border-t max-sm:border-b-0 sm:order-3 sm:px-5 [&::-webkit-scrollbar]:hidden"
    >
      {GROUPS.map((group, g) => (
        <div key={g} role="group" className="flex shrink-0 items-center gap-0.5">
          {g > 0 && <span role="separator" aria-orientation="vertical" className="mx-1.5 h-5 w-px shrink-0 bg-slate-700" />}
          {group.map(tool => {
            index++;
            const mine = index, Icon = tool.icon, pressed = tool.toggle ? formats[tool.toggle] : undefined;
            return (
              <button
                key={tool.command}
                type="button"
                aria-label={tool.label}
                aria-pressed={pressed}
                title={tool.hint}
                tabIndex={mine === current ? 0 : -1}
                onMouseDown={event => event.preventDefault()}
                onFocus={() => setCurrent(mine)}
                onClick={() => onCommand(tool.command)}
                className={`inline-grid size-11 shrink-0 place-items-center rounded-lg border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 motion-reduce:transition-none sm:size-9 ${pressed ? "border-sky-400/50 bg-sky-500/20 text-sky-300" : "border-transparent text-slate-300 hover:bg-slate-700 hover:text-white"}`}
              >
                <Icon size={17} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
