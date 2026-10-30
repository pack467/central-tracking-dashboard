"use client";
import { useRef, useState, type ReactNode } from "react";
import { Lock, MoreHorizontal } from "lucide-react";
import type { Person, Role } from "@/app/types/master-data";
import { actionIcon, menuKeyDown, menuPanelClass, mobileActionIcon, opensUpward, useMenuDismiss } from "./menu-ui";

export { actionIcon };

/** A person's role as plain text, without a coloured pill. */
export function RoleBadge({ name, locked = false }: { roleKey?: string; name: string; locked?: boolean }) {
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-[13px] text-slate-200">
      <span className="truncate" title={name}>{name}</span>
      {locked && <Lock size={11} aria-label="Peran bawaan" className="shrink-0 text-slate-400" />}
    </span>
  );
}
/** Small tag shown next to a person who is no longer active but is still assigned somewhere. */
export function InactiveTag({ status }: { status: Person["status"] }) {
  if (status === "active") return null;
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-md border border-slate-600 bg-slate-800 px-1.5 py-0.5 text-[11px] font-semibold leading-4 text-slate-300"
    >
      {status === "archived" ? "Arsip" : "Nonaktif"}
    </span>
  );
}
export const roleName = (roles: readonly Pick<Role, "key" | "name">[], key: string) => roles.find(role => role.key === key)?.name || key || "Tidak tersedia";
export const BLANK = "Belum diisi";

export interface RowMenuItem {
  key: string;
  label: string;
  icon: ReactNode;
  tone?: "danger";
  disabled?: boolean;
  hint?: string;
  onSelect: () => void;
}
const itemBase = "flex min-h-11 w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset";
/** Three-dot menu: disabled entries stay visible and explain why with a short reason. */
export function RowMenu({ name, items, mobile = false, onOpenChange, loading = false }: { name: string; items: RowMenuItem[]; mobile?: boolean; onOpenChange?: (open: boolean) => void; loading?: boolean }) {
  const [open, setOpenState] = useState(false), [up, setUp] = useState(false), ref = useRef<HTMLDivElement>(null);
  const setOpen = (value: boolean) => { setOpenState(value); onOpenChange?.(value); };
  useMenuDismiss(open, ref, () => { setOpenState(false); onOpenChange?.(false); }, { focusFirst: true });
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className={mobile ? mobileActionIcon : actionIcon}
        aria-label={`Aksi ${name}`}
        title="Aksi"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={event => { setUp(opensUpward(event.currentTarget)); setOpen(!open); }}
      >
        <MoreHorizontal size={mobile ? 20 : 17} />
      </button>
      {open && (
        <div
          role="menu"
          tabIndex={-1}
          aria-label={`Aksi ${name}`}
          aria-busy={loading || undefined}
          className={menuPanelClass(up)}
          onKeyDown={menuKeyDown}
        >
          {items.map(item => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              aria-disabled={item.disabled || undefined}
              title={item.disabled ? item.hint : undefined}
              className={`${itemBase} ${item.disabled ? "cursor-not-allowed text-slate-400 focus-visible:ring-slate-500/60" : item.tone === "danger" ? "text-rose-300 hover:bg-rose-950 focus-visible:ring-rose-400/60" : "text-slate-100 hover:bg-slate-700 focus-visible:ring-sky-400/60"}`}
              onClick={() => { if (item.disabled) return; setOpen(false); item.onSelect(); }}
            >
              <span className="mt-0.5 shrink-0">{item.icon}</span>
              <span className="min-w-0">
                <span className="block">{item.label}</span>
                {item.disabled && item.hint && <span className="mt-0.5 block text-[11px] leading-4 text-slate-400">{item.hint}</span>}
              </span>
            </button>
          ))}
          {loading && <p role="status" className="px-3 py-2 text-[11px] text-slate-400">Memeriksa pemakaian…</p>}
        </div>
      )}
    </div>
  );
}
