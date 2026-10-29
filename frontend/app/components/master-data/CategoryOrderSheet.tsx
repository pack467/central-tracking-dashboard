"use client";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { BottomSheet } from "@/app/components/ui/BottomSheet";
import { resolveCategoryColor } from "@/app/lib/category-colors";
import type { TicketCategory } from "@/app/types/master-data";
import { CategoryTile, buttonClass, primaryClass } from "./master-ui";

interface Props {
  /** Every category of the catalog; only the active ones are listed, inactive ones keep their place. */
  categories: readonly Omit<TicketCategory, "usageCount">[];
  onClose: () => void;
  /** Receives the ids of the active categories in the new order; one call, one write. */
  onSave: (ids: string[]) => Promise<void>;
}

const move = "grid size-11 shrink-0 place-items-center rounded-lg text-slate-300 hover:bg-slate-700 hover:text-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent lg:size-9";

/**
 * "Atur urutan": the order tickets show categories in. The list is a draft until "Simpan urutan"; closing the sheet discards it.
 * Dragging works with mouse and touch through the handle; the up/down buttons (and arrow keys on the handle) are the keyboard way.
 */
export function CategoryOrderSheet({ categories, onClose, onSave }: Props) {
  const active = [...categories].filter(category => category.active).sort((a, b) => a.sortOrder - b.sortOrder);
  const start = active.map(category => category.id);
  const [ids, setIds] = useState(start);
  const [dragging, setDragging] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [moved, setMoved] = useState("");
  const byId = new Map(active.map(category => [category.id, category]));
  const changed = ids.some((id, index) => id !== start[index]);
  const handles = useRef(new Map<string, HTMLButtonElement>());

  // functional update: a fast drag fires several pointer events before React renders again, and each must act on the latest list
  const put = (id: string, target: string | number) => { setMoved(id); setIds(current => {
    const from = current.indexOf(id), to = typeof target === "number" ? from + target : current.indexOf(target);
    if (from < 0 || to < 0 || to >= current.length || from === to) return current;
    const next = [...current];
    next.splice(from, 1);
    next.splice(to, 0, id);
    return next;
  }); };
  const note = moved && byId.has(moved) ? `${byId.get(moved)?.name} sekarang di posisi ${ids.indexOf(moved) + 1} dari ${ids.length}.` : "";
  // a button that just became disabled (top or bottom reached) loses focus: hand it to the handle of the same row
  const refocus = (id: string) => requestAnimationFrame(() => handles.current.get(id)?.focus());
  // While a row is dragged, listen on the window: React moves the row's DOM node as it passes its neighbours, which would drop a pointer capture.
  useEffect(() => {
    if (!dragging) return;
    const move = (event: PointerEvent) => {
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-order-id]")?.getAttribute("data-order-id");
      if (target && target !== dragging) put(dragging, target);
    };
    const end = () => setDragging("");
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", end); window.removeEventListener("pointercancel", end); };
  }, [dragging]);
  const keys = (event: KeyboardEvent<HTMLButtonElement>, id: string) => {
    const step = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
    if (!step) return;
    event.preventDefault();
    put(id, step);
  };
  async function save() {
    setSaving(true); setError("");
    try { await onSave(ids); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Gagal menyimpan urutan."); setSaving(false); }
  }
  return (
    <BottomSheet
      open
      onClose={onClose}
      title="Atur urutan kategori"
      dataSheetId="category-order"
      footer={
        <div className="flex gap-2">
          <button type="button" className={`${buttonClass} flex-1`} onClick={onClose}>Batal</button>
          <button type="button" className={`${primaryClass} flex-1`} disabled={!changed || saving} onClick={() => void save()}>{saving ? "Menyimpan…" : "Simpan urutan"}</button>
        </div>
      }
    >
      <p className="mb-3 text-[13px] leading-5 text-slate-300">Urutan ini dipakai di pilihan kategori tiket. Seret pegangan, atau pakai tombol naik dan turun. Kategori nonaktif tidak ditampilkan.</p>
      <ol className="space-y-1.5" aria-label="Urutan kategori aktif">
        {ids.map((id, index) => {
          const category = byId.get(id)!;
          const color = resolveCategoryColor(category.key, categories);
          return (
            <li key={id} data-order-id={id} className={`flex items-center gap-1 rounded-xl border px-1.5 py-1 ${dragging === id ? "border-sky-400/60 bg-slate-700" : "border-slate-700 bg-[#0f172a]/60"}`}>
              <button
                type="button"
                ref={node => { if (node) handles.current.set(id, node); else handles.current.delete(id); }}
                aria-label={`Geser ${category.name}, posisi ${index + 1} dari ${ids.length}`}
                title="Seret untuk memindahkan"
                onPointerDown={event => { event.preventDefault(); setDragging(id); }}
                onKeyDown={event => keys(event, id)}
                className="grid size-11 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-slate-400 hover:bg-slate-700 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 active:cursor-grabbing lg:size-9"
              >
                <GripVertical size={18} aria-hidden="true" />
              </button>
              <span className="w-5 shrink-0 text-center font-dashboard-mono text-[12px] tabular-nums text-slate-400" aria-hidden="true">{index + 1}</span>
              <CategoryTile chip={color.chip} dot={color.dot} size="sm" />
              <span className="min-w-0 flex-1 px-1">
                <span className="block truncate text-[14px] font-medium text-slate-50" title={category.name}>{category.name}</span>
                <span className="block truncate font-dashboard-mono text-[11px] text-slate-400">{category.key}</span>
              </span>
              <button type="button" className={move} disabled={index === 0} aria-label={`Naikkan ${category.name}`} title="Naikkan" onClick={() => { put(id, -1); if (index === 1) refocus(id); }}><ChevronUp size={18} aria-hidden="true" /></button>
              <button type="button" className={move} disabled={index === ids.length - 1} aria-label={`Turunkan ${category.name}`} title="Turunkan" onClick={() => { put(id, 1); if (index === ids.length - 2) refocus(id); }}><ChevronDown size={18} aria-hidden="true" /></button>
            </li>
          );
        })}
      </ol>
      <p className="sr-only" role="status" aria-live="polite">{note}</p>
      {error && <p role="alert" className="mt-3 rounded-lg border border-rose-400/30 bg-rose-950/40 px-3 py-2 text-[13px] text-rose-200">{error}</p>}
    </BottomSheet>
  );
}
