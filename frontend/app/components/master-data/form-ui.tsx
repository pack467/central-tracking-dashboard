"use client";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { AlertCircle, ArrowLeft, ImageUp, Trash2, X } from "lucide-react";
import { LOGO_ACCEPT, readLogo } from "@/app/lib/master-logo";
import type { MasterEntity } from "@/app/types/master-data";
import { EntityIconTile, buttonClass, iconClass, primaryClass, dangerClass } from "./master-ui";

/** One labelled input: readable label, "Opsional" tag when not required, a hint below the control, and the error replacing the hint. */
export function Field({ id, label, required, error, children, hint, group = false }: { id: string; label: string; required?: boolean; error?: string; children: ReactNode; hint?: string; group?: boolean }) {
  const labelClass = "text-[13px] font-medium text-slate-100";
  const labelText = <>{label}{required && <span aria-hidden="true" className="ml-1 text-sky-300">*</span>}</>;
  return (
    <div className="min-w-0">
      <div className="flex min-h-5 items-baseline justify-between gap-2">
        {group ? <span id={`${id}-label`} className={labelClass}>{labelText}</span> : <label htmlFor={id} className={labelClass}>{labelText}</label>}
        {!required && <span className="shrink-0 text-[11px] text-slate-400">Opsional</span>}
      </div>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p id={`${id}-help`} role="alert" className="mt-1.5 flex items-start gap-1.5 text-xs leading-4 text-rose-300">
          <AlertCircle size={13} aria-hidden="true" className="mt-px shrink-0" />
          {error}
        </p>
      ) : hint ? <p id={`${id}-help`} className="mt-1.5 text-xs leading-4 text-slate-400">{hint}</p> : <span id={`${id}-help`} className="sr-only" />}
    </div>
  );
}
/** Square logo picker: preview, upload or replace, remove. The image is shrunk in the browser before it is kept. */
export function LogoField({ id, entity, value, error, onChange, onError }: { id: string; entity: MasterEntity; value: string; error?: string; onChange: (value: string) => void; onError: (message: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function pick(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await readLogo(file));
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "Gambar tidak dapat dipakai.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <Field id={id} label="Logo" error={error} hint="PNG, JPG, atau WebP, maksimal 2 MB. Gambar diperkecil otomatis dan tampil di kotak persegi." group>
      <div className="flex items-center gap-3">
        <EntityIconTile entity={entity} size="xl" src={value} />
        <input ref={input} type="file" accept={LOGO_ACCEPT} hidden onChange={event => void pick(event.target.files?.[0])} />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            id={id}
            className={buttonClass}
            disabled={busy}
            aria-describedby={`${id}-label ${id}-help`}
            onClick={() => input.current?.click()}
          >
            <ImageUp size={16} aria-hidden="true" />
            {busy ? "Memproses…" : value ? "Ganti logo" : "Unggah logo"}
          </button>
          {value && (
            <button type="button" className={buttonClass} disabled={busy} onClick={() => onChange("")}>
              <Trash2 size={16} aria-hidden="true" />
              Hapus logo
            </button>
          )}
        </div>
      </div>
    </Field>
  );
}
export function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-4 border-t border-slate-700/60 pt-5 first:border-t-0 first:pt-0">
      <div>
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-slate-400">{description}</p>}
      </div>
      {children}
    </section>
  );
}
export interface SegmentOption { value: string; label: string; dot?: string; active: string }
export function Segmented({ id, value, options, onChange, label, disabled = false }: { id: string; value: string; options: SegmentOption[]; onChange: (value: string) => void; label: string; disabled?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const index = options.findIndex(option => option.value === value);
    const next = event.key === "Home"
      ? 0
      : event.key === "End" ? options.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + options.length) % options.length;
    event.preventDefault(); onChange(options[next].value); ref.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
  }
  return (
    <div
      ref={ref}
      id={id}
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      onKeyDown={onKeyDown}
      className="flex flex-wrap gap-1 rounded-[10px] border border-slate-700 bg-[#0f172a] p-1"
      tabIndex={-1}
    >
      {options.map(option => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={`inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-[13px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none lg:min-h-9 ${active ? option.active : "border-transparent text-slate-300 hover:bg-slate-700/50 hover:text-slate-100"}`}
          >
            {option.dot && <span aria-hidden="true" className={`size-1.5 rounded-full ${option.dot}`} />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
export const STATUS_SEGMENTS: SegmentOption[] = [
  { value: "active", label: "Aktif", dot: "bg-emerald-400", active: "border-emerald-400/40 bg-emerald-400/15 text-emerald-200" },
  { value: "inactive", label: "Nonaktif", dot: "bg-slate-400", active: "border-slate-500 bg-slate-700/70 text-slate-100" },
  { value: "archived", label: "Arsip", dot: "bg-rose-400", active: "border-rose-400/40 bg-rose-400/15 text-rose-200" },
];
export const ACTIVE_SEGMENTS: SegmentOption[] = STATUS_SEGMENTS.slice(0, 2);
/** What each status means, shown under the selector so nobody has to guess the difference between Nonaktif and Arsip. */
export const STATUS_HINTS: Record<string, string> = {
  active: "Muncul di pilihan dan bisa dipakai untuk pekerjaan baru.",
  inactive: "Tidak ditawarkan untuk pekerjaan baru. Riwayat tetap tersimpan dan bisa diaktifkan lagi.",
  archived: "Dihentikan permanen dari pemakaian. Riwayat tetap tersimpan dan bisa dipulihkan.",
};
/** Visual-viewport tracking so a full-screen mobile form follows the virtual keyboard. */
export function viewportOf(): { height: number; top: number } | undefined {
  const vv = typeof window !== "undefined" ? window.visualViewport : null;
  return vv && window.innerWidth < 1024 ? { height: vv.height, top: vv.offsetTop } : undefined;
}
/** Shared modal header: icon tile, title, one line saying what the record is for, close. */
export function FormHeader({ icon, title, subtitle, onClose }: { icon: ReactNode; title: string; subtitle?: string; onClose: () => void }) {
  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-slate-700 px-4 py-3 lg:px-6">
      <button type="button" className={`${iconClass} lg:hidden`} onClick={onClose} aria-label="Kembali"><ArrowLeft size={20} /></button>
      {icon}
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-base font-bold text-slate-50">{title}</h2>
        {subtitle && <p className="truncate text-xs text-slate-400">{subtitle}</p>}
      </div>
      <button
        type="button"
        className="inline-grid size-11 shrink-0 place-items-center rounded-[10px] text-slate-300 transition-colors duration-150 hover:bg-slate-700 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 motion-reduce:transition-none lg:size-10"
        onClick={onClose}
        aria-label="Tutup form"
      >
        <X size={20} />
      </button>
    </header>
  );
}
/** Shared footer. While the form is incomplete it names what is missing instead of leaving Simpan disabled without a reason. */
export function FormFooter({ saving, missing, onCancel }: { saving: boolean; missing: string[]; onCancel: () => void }) {
  return (
    <footer
      className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-700 bg-[#0f172a] px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] lg:px-6"
    >
      {missing.length ? (
        <p id="master-form-missing" className="min-w-0 flex-1 text-xs text-amber-200 lg:basis-0">Belum lengkap: {missing.join(", ")}</p>
      ) : (
        <p className="text-xs text-slate-400"><span className="text-sky-300">*</span> Wajib diisi</p>
      )}
      <div className="flex items-center gap-2">
        <button type="button" className={buttonClass} disabled={saving} onClick={onCancel}>Batal</button>
        <button
          type="submit"
          className={primaryClass}
          disabled={saving || missing.length > 0}
          aria-describedby={missing.length ? "master-form-missing" : undefined}
        >
          {saving ? "Menyimpan…" : "Simpan"}
        </button>
      </div>
    </footer>
  );
}
/** "Buang perubahan?" step shown in place of a form when it is closed with unsaved changes. */
export function DiscardConfirm({ onKeep, onDiscard }: { onKeep: () => void; onDiscard: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <span className="inline-grid size-12 place-items-center rounded-xl border border-amber-400/25 bg-amber-400/10 text-amber-300">
          <AlertCircle size={22} aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-base font-semibold text-slate-50">Buang perubahan?</h3>
          <p className="mt-1 text-sm text-slate-300">Perubahan belum disimpan.</p>
        </div>
      </div>
      <footer
        className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-slate-700 bg-[#0f172a] px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] lg:px-6"
      >
        <button type="button" className={buttonClass} onClick={onKeep}>Lanjut mengisi</button>
        <button type="button" className={dangerClass} onClick={onDiscard}>Buang perubahan</button>
      </footer>
    </div>
  );
}
