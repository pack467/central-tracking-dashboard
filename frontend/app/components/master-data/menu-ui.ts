"use client";
import { useEffect, useRef, type KeyboardEvent, type RefObject } from "react";

/** Icon button in a table row. */
export const actionIcon = "inline-grid size-9 pointer-coarse:size-11 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors duration-150 hover:bg-slate-700 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 motion-reduce:transition-none";
/** Same button on a card, sized for a finger. */
export const mobileActionIcon = "inline-grid size-11 place-items-center rounded-lg text-slate-300 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60";
export const menuPanelClass = (up: boolean) => `absolute right-0 z-40 w-60 rounded-xl border border-slate-600 bg-[#1e293b] p-1 shadow-[0_18px_36px_rgba(0,0,0,0.4)] ${up ? "bottom-full mb-1" : "top-full mt-1"}`;

/** A menu opens upwards when there is no room below it but there is above (last rows of a long list). */
export function opensUpward(trigger: Element): boolean {
  const rect = trigger.getBoundingClientRect();
  return window.innerHeight - rect.bottom < 320 && rect.top > 320;
}

/** Arrow keys, Home and End move between the items of a menu. */
export function menuKeyDown(event: KeyboardEvent<HTMLElement>): void {
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
  const items = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];
  const index = items.indexOf(document.activeElement as HTMLButtonElement);
  const next = event.key === "Home"
    ? 0
    : event.key === "End" ? items.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
  event.preventDefault();
  items[next]?.focus();
}

/**
 * Closes an open menu on a press outside it or on Escape (focus goes back to its trigger) and,
 * when asked, moves focus to the first enabled item. `close` and `onOpen` may change on every render.
 */
export function useMenuDismiss(open: boolean, ref: RefObject<HTMLElement | null>, close: () => void, options: { focusFirst?: boolean; onOpen?: () => void } = {}): void {
  const latest = useRef({ close, onOpen: options.onOpen });
  useEffect(() => { latest.current = { close, onOpen: options.onOpen }; });
  const focusFirst = options.focusFirst ?? false;
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) latest.current.close(); };
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      latest.current.close();
      ref.current?.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]')?.focus();
    };
    if (focusFirst) ref.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not([aria-disabled="true"])')?.focus();
    latest.current.onOpen?.();
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape, true);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape, true); };
  }, [open, ref, focusFirst]);
}
