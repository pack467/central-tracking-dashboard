"use client";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { buttonClass, iconClass } from "./master-ui";

/** Shared frame of the confirmation dialogs (status change, delete): header, body, retry message, footer. */
export function DialogHeader({ icon, restore = false, kicker, title, closeLabel = "Tutup konfirmasi", disabled, onClose }: { icon: ReactNode; restore?: boolean; kicker: string; title: string; closeLabel?: string; disabled: boolean; onClose: () => void }) {
  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-slate-700 px-4 py-3 lg:px-6">
      <span
        className={`inline-grid size-9 shrink-0 place-items-center rounded-lg border ${restore ? "border-sky-400/25 bg-sky-400/10 text-sky-300" : "border-rose-400/25 bg-rose-400/10 text-rose-300"}`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-[0.08em] text-slate-400">{kicker}</p>
        <h2 className="truncate text-base font-bold text-slate-50">{title}</h2>
      </div>
      <button type="button" className={iconClass} disabled={disabled} aria-label={closeLabel} onClick={onClose}><X size={20} /></button>
    </header>
  );
}
/** Scrolling body that opens with the name of the record the dialog is about. */
export function DialogBody({ name, children }: { name: string; children: ReactNode }) {
  return <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 lg:p-6">
    <p className="break-words text-sm font-semibold text-slate-100">{name}</p>
    {children}
  </div>;
}
export function DialogFooter({ children }: { children: ReactNode }) {
  return (
    <footer
      className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-700 bg-[#0f172a] px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] lg:px-6"
    >
      {children}
    </footer>
  );
}
/** The error line; "Coba lagi" is offered only while the data the dialog depends on has not loaded. */
export function DialogError({ error, canRetry, onRetry }: { error: string; canRetry: boolean; onRetry: () => void }) {
  if (!error) return null;
  return (
    <div className="space-y-2">
      <p role="alert" className="text-sm text-rose-200">{error}</p>
      {canRetry && <button type="button" className={buttonClass} onClick={onRetry}>Coba lagi</button>}
    </div>
  );
}
export function AcknowledgeBox({ checked, onChange, children }: { checked: boolean; onChange: (checked: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex min-h-11 items-start gap-3 rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-sm text-slate-200">
      <input
        type="checkbox"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        className="mt-0.5 size-5 shrink-0 accent-sky-400"
      />
      {children}
    </label>
  );
}
