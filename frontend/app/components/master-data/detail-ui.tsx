"use client";
import type { ReactNode, RefObject } from "react";
import { ArrowUpRight, MoreHorizontal, Pencil, X } from "lucide-react";
import { buttonClass, iconClass } from "./master-ui";

export function DetailCard({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-slate-700/70 bg-[#182234]/60 p-4 ${className}`}>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}
export function KeyValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-slate-400">{label}</dt>
      <dd className="mt-0.5 break-words text-[13px] text-slate-200">{children}</dd>
    </div>
  );
}
export function LinkChip({ children, onClick, label }: { children: ReactNode; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/50 px-2 py-1 text-left text-[11.5px] text-slate-200 transition-colors duration-150 hover:border-sky-400/40 hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 motion-reduce:transition-none lg:min-h-0"
    >
      <span className="truncate">{children}</span>
      <ArrowUpRight size={12} aria-hidden="true" className="shrink-0 text-sky-300" />
    </button>
  );
}

/** Small chip with a record's code or id, shown next to its status in a detail header. */
export function CodeChip({ children }: { children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-md border border-slate-700 bg-slate-800/60 px-1.5 py-0.5 font-dashboard-mono text-[11px] tabular-nums text-slate-300"
    >
      {children}
    </span>
  );
}
/** Three-dot menu of a detail header. The caller supplies the items. */
export function DetailMenu({ menuRef, open, onToggle, children }: { menuRef: RefObject<HTMLDivElement | null>; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className={iconClass}
        aria-label="Aksi detail"
        title="Aksi"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={onToggle}
      >
        <MoreHorizontal size={19} />
      </button>
      {open && (
        <div
          role="menu"
          tabIndex={-1}
          aria-label="Aksi detail"
          className="absolute right-0 top-full z-20 mt-1 w-60 rounded-xl border border-slate-600 bg-[#1e293b] p-1 shadow-[0_18px_36px_rgba(0,0,0,0.4)]"
        >
          {children}
        </div>
      )}
    </div>
  );
}
/** Header of the detail drawers: lead (icon or avatar), kicker, title, badges, then Ubah, the menu and close. */
export function DetailHeader({ lead, kicker, title, badges, onEdit, menu, onClose }: { lead: ReactNode; kicker: string; title: string; badges?: ReactNode; onEdit?: () => void; menu?: ReactNode; onClose: () => void }) {
  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-slate-700 px-4 py-3.5">
      {lead}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-[0.08em] text-slate-400">{kicker}</p>
        <h2 className="truncate text-[18px] font-semibold text-slate-50">{title}</h2>
        {badges && <div className="mt-1 flex flex-wrap items-center gap-1.5">{badges}</div>}
      </div>
      {onEdit && <button type="button" className={`${buttonClass} max-sm:min-w-11 max-sm:px-0`} onClick={onEdit} aria-label="Ubah" title="Ubah"><Pencil size={14} aria-hidden="true" /><span className="max-sm:hidden">Ubah</span></button>}
      {menu}
      <button
        type="button"
        className="inline-grid size-11 shrink-0 place-items-center rounded-[10px] text-slate-300 transition-colors duration-150 hover:bg-slate-700 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 motion-reduce:transition-none lg:size-10"
        onClick={onClose}
        aria-label="Tutup detail"
      >
        <X size={20} />
      </button>
    </header>
  );
}
