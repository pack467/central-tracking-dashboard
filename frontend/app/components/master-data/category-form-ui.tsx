"use client";
import { useRef, type KeyboardEvent } from "react";
import { Check, Lock } from "lucide-react";
import { CATEGORY_PALETTE, categoryPaletteEntry } from "@/app/lib/category-colors";
import { CategoryChip, inputClass } from "./master-ui";
import { Field } from "./form-ui";

/** Round swatches, one radio group: arrow keys move and select, the chosen swatch carries a check and a ring. */
export function ColorField({ id, value, onChange, sameAs, name }: { id: string; value: string; onChange: (value: string) => void; sameAs?: string; name: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const keys = CATEGORY_PALETTE.map(entry => entry.key as string);
  const selected = categoryPaletteEntry(value);
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!step && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const index = Math.max(0, keys.indexOf(value));
    const next = event.key === "Home" ? 0 : event.key === "End" ? keys.length - 1 : (index + step + keys.length) % keys.length;
    onChange(keys[next]);
    ref.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
  }
  return (
    <Field id={id} label="Warna pengenal" required group hint={sameAs ? `Sama dengan: ${sameAs}. Tetap bisa disimpan.` : "Dipakai di tiket, filter, dan grafik."}>
      <div ref={ref} id={id} role="radiogroup" aria-label="Warna pengenal" aria-describedby={`${id}-help`} onKeyDown={onKeyDown} tabIndex={-1} className="flex flex-wrap gap-2.5">
        {CATEGORY_PALETTE.map(entry => {
          const active = entry.key === value;
          return (
            <button
              key={entry.key}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={entry.name}
              title={entry.name}
              tabIndex={active || (!keys.includes(value) && entry.key === keys[0]) ? 0 : -1}
              onClick={() => onChange(entry.key)}
              className={`grid size-11 place-items-center rounded-full ${entry.dot} text-white ring-offset-2 ring-offset-[#1e293b] transition-shadow duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 motion-reduce:transition-none lg:size-8 ${active ? `ring-2 ${entry.ring}` : "hover:ring-2 hover:ring-slate-500"}`}
            >
              {active && <Check size={16} strokeWidth={3} aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
        Pratinjau
        <CategoryChip name={name.trim() || "Nama kategori"} chip={selected.chip} dot={selected.dot} />
      </div>
    </Field>
  );
}

/** The fixed code of a category: read-only, mono, with a lock; it never changes when the name does. */
export function FixedCode({ id, value, hint }: { id: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="text-[13px] font-medium text-slate-100">Kode</label>
      <div className="relative mt-1.5" title="Kode tetap">
        <input id={id} readOnly value={value} placeholder="Terisi dari nama" aria-describedby={`${id}-help`} className={`${inputClass} cursor-not-allowed bg-[#0f172a]/60 pr-10 font-dashboard-mono text-slate-300`} />
        <Lock size={14} aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
      </div>
      <p id={`${id}-help`} className="mt-1.5 text-xs leading-4 text-slate-400">{hint ?? "Dibuat otomatis dari nama dan tidak berubah."}</p>
    </div>
  );
}

/** A visible multi-line field with a live counter, used for category and severity descriptions. */
export function CounterField({ id, label, value, max, rows = 3, placeholder, hint, error, onChange }: { id: string; label: string; value: string; max: number; rows?: number; placeholder?: string; hint?: string; error?: string; onChange: (value: string) => void }) {
  return (
    <Field id={id} label={label} error={error} hint={hint}>
      <textarea
        id={id}
        aria-describedby={`${id}-help`}
        aria-invalid={!!error}
        rows={rows}
        maxLength={max}
        value={value}
        placeholder={placeholder}
        onChange={event => onChange(event.target.value)}
        className={`${inputClass} resize-y`}
      />
      <p className="mt-1 text-right font-dashboard-mono text-[11px] tabular-nums text-slate-400" aria-hidden="true">{value.length}/{max}</p>
    </Field>
  );
}
