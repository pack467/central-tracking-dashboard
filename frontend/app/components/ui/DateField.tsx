"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { BottomSheet } from "./BottomSheet";

/**
 * One date, typed or picked. A text input that takes "HH/BB/TTTT" (slashes are added as you type) and a calendar button that opens a floating
 * popover: it never pushes the form down. On phones the popover becomes a bottom sheet. The month and the year are buttons that open a quick
 * picker, so 2019 is a few clicks away. Values are "YYYY-MM-DD" strings, like the rest of the app.
 */
export interface DateFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Inclusive bounds, "YYYY-MM-DD". */
  min?: string;
  max?: string;
  /** Earliest year offered by the year picker. */
  minYear?: number;
  clearable?: boolean;
  disabled?: boolean;
  /** Reference "today" for the "Hari ini" button and the ring; defaults to the device date. */
  today?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const POPOVER_WIDTH = 312;

const pad = (n: number) => String(n).padStart(2, "0");
const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function fromYMD(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d ? date : null;
}
const toDMY = (value: string) => { const d = fromYMD(value); return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : ""; };
function fromDMY(text: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!m) return null;
  const ymd = `${m[3]}-${m[2]}-${m[1]}`;
  return fromYMD(ymd) ? ymd : null;
}
/** Digits only; "04012023" becomes "04/01/2023". A pasted "2023-01-04" is understood too. */
function mask(raw: string): string {
  const iso = /^\s*(\d{4})-(\d{2})-(\d{2})\s*$/.exec(raw);
  const digits = (iso ? `${iso[3]}${iso[2]}${iso[1]}` : raw.replace(/\D/g, "")).slice(0, 8);
  return digits.length <= 2 ? digits : digits.length <= 4 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}
const longDate = (value: string) => {
  const d = fromYMD(value);
  return d ? new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d) : "";
};
const addDays = (value: string, days: number) => { const d = fromYMD(value)!; d.setDate(d.getDate() + days); return toYMD(d); };
const addMonths = (value: string, months: number) => {
  const d = fromYMD(value)!, day = d.getDate();
  d.setDate(1); d.setMonth(d.getMonth() + months);
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return toYMD(d);
};
const mondayIndex = (d: Date) => (d.getDay() + 6) % 7;

const subscribeNarrow = (notify: () => void) => { const media = window.matchMedia("(max-width: 640px)"); media.addEventListener("change", notify); return () => media.removeEventListener("change", notify); };
const useNarrow = () => useSyncExternalStore(subscribeNarrow, () => window.matchMedia("(max-width: 640px)").matches, () => false);

const navButton = "inline-grid size-9 place-items-center rounded-lg text-slate-300 transition-colors duration-150 hover:bg-slate-400/[0.08] hover:text-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent motion-reduce:transition-none max-sm:size-11";
const titleButton = "inline-flex h-9 items-center rounded-lg px-2.5 text-[14px] font-semibold text-slate-50 transition-colors duration-150 hover:bg-slate-400/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 motion-reduce:transition-none max-sm:h-11";
const footerButton = "inline-flex h-9 items-center rounded-lg px-3 text-[13px] font-semibold text-sky-300 transition-colors duration-150 hover:bg-slate-400/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 disabled:cursor-not-allowed disabled:text-slate-500 disabled:hover:bg-transparent motion-reduce:transition-none max-sm:h-11";

export function DateField({ id, value, onChange, min, max, minYear = 1990, clearable = false, disabled = false, today, "aria-label": ariaLabel, "aria-describedby": describedBy, "aria-invalid": invalidProp }: DateFieldProps) {
  const uid = useId();
  const messageId = `${id}-message`;
  const controlRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const narrow = useNarrow();
  const todayYMD = today ?? toYMD(new Date());
  const [text, setText] = useState(() => toDMY(value));
  const [seen, setSeen] = useState(value);
  const [blurred, setBlurred] = useState(false);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"days" | "months" | "years">("days");
  const [focusDate, setFocusDate] = useState(value || todayYMD);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [announce, setAnnounce] = useState("");

  // an outside change of the value (the calendar, a reset) rewrites the text; typing a half date must not be overwritten
  if (value !== seen) {
    setSeen(value);
    if (value !== (fromDMY(text) ?? "")) setText(toDMY(value));
  }

  const clampToBounds = (ymd: string) => (min && ymd < min ? min : max && ymd > max ? max : ymd);
  const blocked = (ymd: string) => Boolean((min && ymd < min) || (max && ymd > max));

  // what the text says: a valid date, a problem, or nothing yet
  const parsed = text.length === 10 ? fromDMY(text) : null;
  const problem = text.length === 10
    ? !parsed ? "Tanggal tidak valid" : max && parsed > max ? "Tidak boleh di masa depan" : min && parsed < min ? `Tidak boleh sebelum ${toDMY(min)}` : ""
    : text.length > 0 && blurred ? "Lengkapi tanggal (HH/BB/TTTT)" : "";
  const readable = parsed && !problem ? longDate(parsed) : "";

  function type(raw: string) {
    const next = mask(raw);
    setText(next);
    const ymd = next.length === 10 ? fromDMY(next) : null;
    const accepted = ymd && !blocked(ymd) ? ymd : "";
    setSeen(accepted);
    onChange(accepted);
  }
  function pick(ymd: string) {
    setText(toDMY(ymd)); setSeen(ymd); setBlurred(true);
    onChange(ymd);
    close();
  }
  function close() {
    setOpen(false);
    requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  }
  function openPopover() {
    if (disabled) return;
    setFocusDate(clampToBounds(parsed && !problem ? parsed : value || todayYMD));
    setView("days");
    bump();
    setOpen(true);
  }

  // Escape closes only the popover: it is handled before the modal under it can see the key
  useEffect(() => {
    if (!open) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); }
      else if (event.key === "Tab" && popoverRef.current?.contains(document.activeElement)) { setOpen(false); buttonRef.current?.focus({ preventScroll: true }); }
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target) || controlRef.current?.contains(target) || (target as Element).closest?.("[data-sheet-id=date-field]")) return;
      setOpen(false);
    };
    window.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onPointer);
    return () => { window.removeEventListener("keydown", onKey, true); document.removeEventListener("pointerdown", onPointer); };
  }, [open]);

  // floating position: below the control, flipped above when there is no room, kept inside the screen
  useLayoutEffect(() => {
    if (!open || narrow) return;
    const place = () => {
      const control = controlRef.current?.getBoundingClientRect(), pop = popoverRef.current;
      if (!control || !pop) return;
      const height = pop.offsetHeight, below = window.innerHeight - control.bottom - 8, above = control.top - 8;
      const wanted = below >= height || below >= above ? control.bottom + 6 : control.top - height - 6;
      // never leave the screen; when neither side has room the popover scrolls inside itself
      const top = Math.min(Math.max(8, wanted), Math.max(8, window.innerHeight - Math.min(height, window.innerHeight - 16) - 8));
      const left = Math.min(Math.max(8, control.left), Math.max(8, window.innerWidth - POPOVER_WIDTH - 8));
      setPosition(current => current.top === top && current.left === left ? current : { top, left });
    };
    place();
    window.addEventListener("resize", place); window.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [open, narrow, view]);

  // focus lands on the day (or month, or year) that matters; the month arrows keep their own focus so they can be pressed again
  const [focusTick, setFocusTick] = useState(0);
  const bump = () => setFocusTick(tick => tick + 1);
  useEffect(() => {
    if (!open || focusTick === 0) return;
    const frame = requestAnimationFrame(() => (narrow ? document.querySelector<HTMLElement>("[data-sheet-id=date-field]") : popoverRef.current)?.querySelector<HTMLElement>("[data-date-focus]")?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [open, focusTick, narrow]);

  const viewDate = fromYMD(focusDate) ?? new Date();
  const year = viewDate.getFullYear(), month = viewDate.getMonth();
  const maxYear = max ? Number(max.slice(0, 4)) : Number(todayYMD.slice(0, 4)) + 5;
  const years = useMemo(() => Array.from({ length: Math.max(1, maxYear - minYear + 1) }, (_, i) => maxYear - i), [maxYear, minYear]);

  const days = useMemo(() => {
    const first = new Date(year, month, 1), lead = mondayIndex(first);
    const start = new Date(year, month, 1 - lead);
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return { ymd: toYMD(d), day: d.getDate(), inMonth: d.getMonth() === month }; });
  }, [year, month]);

  function moveFocus(next: string) {
    const target = clampToBounds(next);
    if (target === focusDate) return;
    setFocusDate(target);
    const d = fromYMD(target)!;
    if (d.getMonth() !== month || d.getFullYear() !== year) setAnnounce(`${MONTHS[d.getMonth()]} ${d.getFullYear()}`);
  }
  function onGridKey(event: KeyboardEvent<HTMLDivElement>) {
    const d = fromYMD(focusDate)!;
    let next: string | undefined;
    switch (event.key) {
      case "ArrowLeft": next = addDays(focusDate, -1); break;
      case "ArrowRight": next = addDays(focusDate, 1); break;
      case "ArrowUp": next = addDays(focusDate, -7); break;
      case "ArrowDown": next = addDays(focusDate, 7); break;
      case "Home": next = addDays(focusDate, -mondayIndex(d)); break;
      case "End": next = addDays(focusDate, 6 - mondayIndex(d)); break;
      case "PageUp": next = addMonths(focusDate, event.shiftKey ? -12 : -1); break;
      case "PageDown": next = addMonths(focusDate, event.shiftKey ? 12 : 1); break;
      default: return;
    }
    event.preventDefault();
    bump();
    moveFocus(next);
  }
  const step = (months: number) => moveFocus(addMonths(focusDate, months));
  const monthBlocked = (y: number, m: number) => Boolean((max && toYMD(new Date(y, m, 1)) > max) || (min && toYMD(new Date(y, m + 1, 0)) < min));

  const selected = parsed && !problem ? parsed : value;
  const nextBlocked = Boolean(max && toYMD(new Date(year, month + (view === "days" ? 1 : 12), 1)) > max);
  const header = (
    <div className="mb-2 flex items-center justify-between gap-1">
      <button type="button" className={navButton} aria-label={view === "days" ? "Bulan sebelumnya" : "Tahun sebelumnya"} onClick={() => step(view === "days" ? -1 : -12)} disabled={view === "years"}><ChevronLeft size={18} aria-hidden="true" /></button>
      <div className="flex items-center gap-0.5">
        <button type="button" className={titleButton} aria-haspopup="listbox" aria-expanded={view === "months"} onClick={() => { bump(); setView(view === "months" ? "days" : "months"); }}>{MONTHS[month]}</button>
        <button type="button" className={titleButton} aria-haspopup="listbox" aria-expanded={view === "years"} onClick={() => { bump(); setView(view === "years" ? "days" : "years"); }}>{year}</button>
      </div>
      <button type="button" className={navButton} aria-label={view === "days" ? "Bulan berikutnya" : "Tahun berikutnya"} onClick={() => step(view === "days" ? 1 : 12)} disabled={view === "years" || nextBlocked}><ChevronRight size={18} aria-hidden="true" /></button>
    </div>
  );

  const body: ReactNode = view === "months" ? (
    <div role="listbox" aria-label="Pilih bulan" className="grid grid-cols-3 gap-1.5">
      {MONTHS_SHORT.map((name, index) => {
        const active = index === month, off = monthBlocked(year, index);
        return (
          <button
            key={name}
            type="button"
            role="option"
            aria-selected={active}
            aria-label={MONTHS[index]}
            disabled={off}
            data-date-focus={active ? "" : undefined}
            onClick={() => { bump(); moveFocus(addMonths(focusDate, index - month)); setView("days"); }}
            className={`h-10 rounded-lg text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 disabled:cursor-not-allowed disabled:opacity-30 motion-reduce:transition-none max-sm:h-11 ${active ? "bg-sky-400 font-semibold text-slate-950" : "text-slate-200 hover:bg-slate-400/[0.08]"}`}
          >{name}</button>
        );
      })}
    </div>
  ) : view === "years" ? (
    <div role="listbox" aria-label="Pilih tahun" className="grid max-h-[216px] grid-cols-4 gap-1.5 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin] max-sm:max-h-[264px]" ref={node => { const active = node?.querySelector<HTMLElement>("[aria-selected=true]"); if (node && active && node.dataset.centered !== "1") { node.dataset.centered = "1"; node.scrollTop = active.offsetTop - node.clientHeight / 2 + active.clientHeight / 2; } }}>
      {years.map(y => (
        <button
          key={y}
          type="button"
          role="option"
          aria-selected={y === year}
          data-date-focus={y === year ? "" : undefined}
          onClick={() => { bump(); moveFocus(addMonths(focusDate, (y - year) * 12)); setView("months"); }}
          className={`h-10 rounded-lg text-[13px] font-medium tabular-nums transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 motion-reduce:transition-none max-sm:h-11 ${y === year ? "bg-sky-400 font-semibold text-slate-950" : "text-slate-200 hover:bg-slate-400/[0.08]"}`}
        >{y}</button>
      ))}
    </div>
  ) : (
    <div role="grid" tabIndex={-1} aria-label={`${MONTHS[month]} ${year}`} onKeyDown={onGridKey}>
      <div role="row" className="mb-1 grid grid-cols-7 text-center">
        {WEEKDAYS.map(name => <span key={name} role="columnheader" className="py-1 text-[11px] font-semibold text-slate-400">{name}</span>)}
      </div>
      {Array.from({ length: 6 }, (_, row) => (
        <div key={row} role="row" className="grid grid-cols-7">
          {days.slice(row * 7, row * 7 + 7).map(({ ymd, day, inMonth }) => {
            const isSelected = ymd === selected, isToday = ymd === todayYMD, off = blocked(ymd), isFocus = ymd === focusDate;
            return (
              <button
                key={ymd}
                type="button"
                role="gridcell"
                aria-selected={isSelected}
                aria-label={longDate(ymd)}
                aria-current={isToday ? "date" : undefined}
                disabled={off}
                tabIndex={isFocus ? 0 : -1}
                data-date-focus={isFocus ? "" : undefined}
                onClick={() => pick(ymd)}
                className={`mx-auto grid size-9 place-items-center rounded-lg text-[13px] tabular-nums transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-30 motion-reduce:transition-none max-sm:size-10 ${isSelected ? "bg-sky-400 font-semibold text-slate-950" : `${inMonth ? "text-slate-100" : "text-slate-400"} ${isToday ? "ring-1 ring-inset ring-slate-400" : ""} hover:bg-slate-400/[0.1]`}`}
              >{day}</button>
            );
          })}
        </div>
      ))}
    </div>
  );

  const panel = (
    <>
      {header}
      {body}
      <div className="mt-3 flex items-center justify-between border-t border-slate-700/70 pt-2">
        <button type="button" className={footerButton} disabled={blocked(todayYMD)} onClick={() => pick(todayYMD)}>Hari ini</button>
        {clearable && value ? <button type="button" className={footerButton} onClick={() => { setText(""); setSeen(""); onChange(""); close(); }}>Hapus</button> : <span />}
      </div>
      <p className="sr-only" role="status" aria-live="polite">{announce}</p>
    </>
  );

  const message = problem || readable;
  return (
    <div>
      <div
        ref={controlRef}
        className={`flex h-10 items-center rounded-[10px] border bg-[#0f172a] pl-3 pr-1 transition-[border-color,box-shadow] duration-150 focus-within:border-sky-400/70 focus-within:ring-2 focus-within:ring-sky-400/25 motion-reduce:transition-none max-sm:h-11 ${problem || invalidProp ? "border-rose-400/70" : "border-slate-600 hover:border-slate-500"} ${disabled ? "opacity-60" : ""}`}
      >
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="HH/BB/TTTT"
          maxLength={10}
          value={text}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-invalid={!!problem || invalidProp || undefined}
          aria-describedby={[message ? messageId : "", describedBy].filter(Boolean).join(" ") || undefined}
          onChange={event => type(event.target.value)}
          onBlur={() => setBlurred(true)}
          onKeyDown={event => { if (event.key === "ArrowDown" && event.altKey) { event.preventDefault(); openPopover(); } }}
          className="h-full min-w-0 flex-1 bg-transparent font-dashboard-mono text-base tabular-nums text-slate-50 outline-none placeholder:font-sans placeholder:text-slate-400 lg:text-sm"
        />
        <button
          ref={buttonRef}
          type="button"
          disabled={disabled}
          aria-label="Buka kalender"
          title="Buka kalender"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={`${uid}-calendar`}
          onClick={() => open ? close() : openPopover()}
          className="inline-grid size-9 shrink-0 place-items-center rounded-lg text-slate-300 transition-colors duration-150 hover:bg-slate-400/[0.08] hover:text-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 motion-reduce:transition-none max-sm:size-11"
        >
          <Calendar size={18} aria-hidden="true" />
        </button>
      </div>
      {message ? (
        <p id={messageId} role={problem ? "alert" : undefined} className={`mt-1.5 min-h-4 text-xs leading-4 ${problem ? "text-rose-300" : "text-slate-400"}`}>{message}</p>
      ) : null}
      {open && !narrow && typeof document !== "undefined" && createPortal(
        <div
          ref={popoverRef}
          id={`${uid}-calendar`}
          role="dialog"
          aria-label="Pilih tanggal"
          style={{ top: position.top, left: position.left, width: POPOVER_WIDTH }}
          className="fixed z-[260] max-h-[calc(100dvh-16px)] max-w-[calc(100vw-16px)] overflow-y-auto overscroll-contain rounded-xl border border-slate-600 bg-[#1e293b] p-3 shadow-[0_12px_30px_rgba(0,0,0,0.45)]"
        >
          {panel}
        </div>,
        document.body
      )}
      {open && narrow && (
        <BottomSheet open onClose={() => setOpen(false)} title="Pilih tanggal" dataSheetId="date-field" selectLayer restoreFocus={false} initialFocusSelector="[data-date-focus]">
          {panel}
        </BottomSheet>
      )}
    </div>
  );
}
