"use client";

import { Children, Fragment, isValidElement, useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type ButtonHTMLAttributes, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Check, ChevronDown, Search } from "lucide-react";
import { BottomSheet } from "./BottomSheet";
import { SELECT_STYLES as S } from "./select-styles";

export interface SelectOption {
  value: string | number;
  label: ReactNode;
  textValue?: string;
  icon?: ReactNode;
  meta?: ReactNode;
  disabled?: boolean;
  group?: string;
  key?: string;
}
export interface SelectChangeEvent {
  target: { value: string; name: string };
  currentTarget: { value: string; name: string };
}
type TriggerProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "value" | "defaultValue" | "onChange" | "children" | "type">;
interface CommonProps extends TriggerProps {
  options?: SelectOption[];
  children?: ReactNode;
  label?: string;
  placeholder?: string;
  icon?: ReactNode;
  active?: boolean;
  required?: boolean;
  size?: "filter" | "form" | "compact";
  allowCustom?: boolean;
  searchable?: boolean;
  renderValue?: (label: ReactNode) => ReactNode;
  listboxId?: string;
}
export interface SelectProps extends CommonProps {
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (event: SelectChangeEvent) => void;
  onValueChange?: (value: string) => void;
}
export interface MultiSelectProps extends CommonProps {
  value: string[];
  onChange: (values: string[]) => void;
  formatValue?: (values: string[]) => ReactNode;
  selectAllMode?: "replace" | "add-filtered";
}
const sheetQuery = "(max-width: 767px), (pointer: coarse)";
const subscribeSheet = (notify: () => void) => {
  const media = window.matchMedia(sheetQuery); media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
const sheetSnapshot = () => window.matchMedia(sheetQuery).matches;
const serverSnapshot = () => false;
const normalize = (text: string) => text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
function textOf(value: ReactNode): string {
  return Children.toArray(value).map(child => typeof child === "string" || typeof child === "number" ? String(child) : isValidElement<{ children?: ReactNode }>(child) ? textOf(child.props.children) : "").join("");
}
/** Existing option children are read as data; no native select/option is mounted. */
function optionsOf(children: ReactNode, group?: string, disabled = false): SelectOption[] {
  return Children.toArray(children).flatMap(child => {
    if (!isValidElement<{ value?: string | number; children?: ReactNode; label?: string; disabled?: boolean }>(child)) return [];
    if (child.type === Fragment) return optionsOf(child.props.children, group, disabled);
    if (child.type === "optgroup") return optionsOf(child.props.children, child.props.label, disabled || !!child.props.disabled);
    if (child.type !== "option") return [];
    const label = child.props.label ?? child.props.children;
    return [{ value: child.props.value ?? textOf(label), label, textValue: textOf(label), group, disabled: disabled || child.props.disabled, key: String(child.key ?? child.props.value ?? textOf(label)) }];
  });
}
/** Keep the old control's dimensions and identifiers, while replacing its theme. */
function geometryClasses(className: string) {
  return className.split(/\s+/).filter(token => {
    if (token.includes("svg") || /(?:^|:)(?:p[trblxy]?-|font-|text-|leading-|tracking-|h-|min-h-|max-h-|gap-)/.test(token) || /\[(?:padding|font-size|font-family|line-height|height|min-height|max-height):/.test(token)) return false;
    if (/(?:^|:)(?:bg-|border|rounded|shadow|ring|outline|appearance|accent-|opacity-|text-\[(?:#|var|rgba)|text-(?:white|slate|sky|ink|status))/.test(token)) return false;
    return /(?:^|:)(?:w-|h-|min-w-|max-w-|min-h-|max-h-|p[trblxy]?-|m[trblxy]?-|flex|grow|shrink|self-|basis-|font-|text-|tracking-|leading-|hidden|block|inline|relative|absolute|inset-|top-|left-|right-|bottom-|z-|col-|row-|box-|overflow-|whitespace-|truncate|cursor-|disabled:opacity)/.test(token)
      || /\[(?:width|height|min-width|max-width|min-height|max-height|padding|margin|font-size|font-family|line-height):/.test(token)
      || /^[a-z][\w-]+$/.test(token);
  }).join(" ");
}
export function Select({ value, defaultValue, onChange, onValueChange, ...props }: SelectProps) {
  const [localValue, setLocalValue] = useState(defaultValue);
  return <SelectBase {...props} value={value ?? localValue} onSingleChange={next => {
    if (value === undefined) setLocalValue(next);
    const target = { value: next, name: props.name ?? "" };
    onChange?.({ target, currentTarget: target }); onValueChange?.(next);
  }} />;
}
export function MultiSelect({ value, onChange, formatValue, selectAllMode = "replace", ...props }: MultiSelectProps) {
  return <SelectBase {...props} value={value} onMultiChange={onChange} formatValue={formatValue} selectAllMode={selectAllMode} />;
}
interface BaseProps extends CommonProps {
  value?: string | number | string[];
  onSingleChange?: (value: string) => void;
  onMultiChange?: (value: string[]) => void;
  formatValue?: (values: string[]) => ReactNode;
  selectAllMode?: "replace" | "add-filtered";
}
function SelectBase({ value, onSingleChange, onMultiChange, formatValue, selectAllMode, options: suppliedOptions, children, label: suppliedLabel, placeholder = "Pilih…", icon, active, required, size = "filter", allowCustom = false, searchable: searchableProp, renderValue, listboxId, className = "", id: suppliedId, disabled, name, onClick, ...triggerProps }: BaseProps) {
  const generatedId = useId(); const id = suppliedId ?? `select-${generatedId}`;
  const listId = listboxId ?? `${id}-listbox`, pathname = usePathname();
  const sheet = useSyncExternalStore(subscribeSheet, sheetSnapshot, serverSnapshot);
  const options = useMemo(() => suppliedOptions ?? optionsOf(children), [suppliedOptions, children]);
  const multiple = !!onMultiChange;
  const selected = useMemo(() => Array.isArray(value) ? value : [String(value ?? "")], [value]);
  const selectedOption = options.find(option => String(option.value) === selected[0]) ?? (allowCustom ? undefined : options.find(option => !option.disabled));
  const singleValue = allowCustom ? selected[0] : String(selectedOption?.value ?? "");
  const currentValues = multiple ? selected : [singleValue];
  const [requestedOpen, setRequestedOpen] = useState(false), [openedOnPath, setOpenedOnPath] = useState(pathname);
  const open = requestedOpen && openedOnPath === pathname && !disabled;
  const [query, setQuery] = useState(""), [activeIndex, setActiveIndex] = useState(-1), [label, setLabel] = useState(suppliedLabel ?? "Pilihan");
  const [keyboardMode, setKeyboardMode] = useState(false);
  const [position, setPosition] = useState({ left: 12, top: 12, width: 220, maxHeight: 320 });
  const triggerRef = useRef<HTMLButtonElement>(null), popupRef = useRef<HTMLDivElement>(null), searchRef = useRef<HTMLInputElement>(null);
  const restoreFocus = useRef(true), typing = useRef({ text: "", time: 0 });
  const filtered = useMemo(() => options.map((option, index) => ({ option, index })).filter(({ option }) => normalize(option.textValue ?? textOf(option.label)).includes(normalize(query.trim()))), [options, query]);
  const enabled = filtered.filter(({ option }) => !option.disabled).map(({ index }) => index);
  const searchable = searchableProp ?? (options.length > 8 || allowCustom);
  const activeId = open && filtered.some(item => item.index === activeIndex) ? `${listId}-${activeIndex}` : undefined;
  const isActive = active ?? (multiple ? selected.length > 0 : !!selectedOption && String(selectedOption.value) !== String(options[0]?.value));
  const selectedLabel = multiple ? formatValue?.(selected) ?? (selected.length ? `${selected.length} terpilih` : placeholder) : selectedOption?.label ?? (singleValue || placeholder);

  const close = useCallback((restore = true) => { restoreFocus.current = restore; typing.current = { text: "", time: 0 }; setRequestedOpen(false); }, []);
  const locate = useCallback(() => {
    const trigger = triggerRef.current; if (!trigger) return;
    const box = trigger.getBoundingClientRect(), viewport = window.visualViewport;
    const viewportWidth = viewport?.width ?? window.innerWidth, viewportHeight = viewport?.height ?? window.innerHeight;
    const longest = Math.max(16, ...options.map(option => (option.textValue ?? textOf(option.label)).length));
    const width = Math.min(viewportWidth - 24, Math.max(box.width, Math.min(360, longest * 7 + 52), 180));
    // a multi-select spends ~92px on its search box and "Pilih Semua" row, so it gets more room to still show a useful number of options
    const cap = multiple ? 380 : 320;
    const naturalHeight = Math.min(cap, options.length * 36 + (searchable ? 48 : 0) + (multiple ? 44 : 0) + 10);
    const below = viewportHeight - box.bottom - 10, above = box.top - 10;
    // open upwards whenever the list does not fit below and there is more room above (it used to stay below until under 180px,
    // which left a long list showing two or three options near the bottom of a form)
    const flip = below < naturalHeight && above > below;
    const maxHeight = Math.max(100, Math.min(cap, flip ? above : below, viewportHeight - 24));
    const actualHeight = Math.min(popupRef.current?.parentElement?.getBoundingClientRect().height || naturalHeight, maxHeight);
    const next = { left: Math.max(12, Math.min(viewportWidth - width - 12, box.left)), top: Math.max(12, flip ? box.top - actualHeight - 6 : box.bottom + 6), width, maxHeight };
    setPosition(previous => Object.keys(next).every(key => previous[key as keyof typeof next] === next[key as keyof typeof next]) ? previous : next);
  }, [options, searchable, multiple]);
  const show = (index?: number, keyboard = false) => {
    if (disabled) return;
    restoreFocus.current = true;
    setKeyboardMode(keyboard);
    const trigger = triggerRef.current;
    const associatedLabel = suppliedId ? document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(suppliedId)}"]`) : trigger?.closest("label")?.querySelector("span");
    setLabel(suppliedLabel ?? triggerProps["aria-label"] ?? associatedLabel?.textContent?.trim().replace(/\s*\*$/, "") ?? "Pilihan");
    setQuery(allowCustom && !multiple ? singleValue : "");
    const selectedIndex = options.findIndex(option => currentValues.includes(String(option.value)) && !option.disabled);
    setActiveIndex(index ?? (allowCustom && multiple ? -1 : selectedIndex < 0 ? options.findIndex(option => !option.disabled) : selectedIndex));
    locate(); setOpenedOnPath(pathname); setRequestedOpen(true);
    window.dispatchEvent(new CustomEvent("ctd-select-open", { detail: id }));
  };
  const choose = (index: number) => {
    const option = options[index]; if (!option || option.disabled) return;
    const next = String(option.value);
    if (onMultiChange) {
      onMultiChange(selected.includes(next) ? selected.filter(v => v !== next) : [...selected, next]);
      if (allowCustom) { setQuery(""); setActiveIndex(-1); }
    }
    else { onSingleChange?.(next); close(); }
  };
  const focusAdjacent = (reverse: boolean) => {
    const trigger = triggerRef.current; if (!trigger) return;
    const scope = trigger.closest('[role="dialog"]') ?? document;
    const controls = [...scope.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]):not([type="hidden"]):not([data-select-value]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')].filter(el => el.checkVisibility() && !el.closest("[data-select-popup]"));
    const current = controls.indexOf(trigger), next = current + (reverse ? -1 : 1);
    const target = scope === document ? controls[next] : controls[(next + controls.length) % controls.length];
    requestAnimationFrame(() => target?.focus({ preventScroll: true }));
  };
  const handleKey = (event: KeyboardEvent<HTMLElement>) => {
    if (disabled) return;
    const inSearch = event.target === searchRef.current;
    const action = (event.target as Element).closest("button");
    if (action && action !== triggerRef.current && !["Escape", "Tab"].includes(event.key)) return;
    if (event.key === "Tab" && open) { event.preventDefault(); event.stopPropagation(); close(false); focusAdjacent(event.shiftKey); return; }
    if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); close(); return; }
    if (allowCustom && onMultiChange && inSearch) {
      if (event.key === "Backspace" && !query && selected.length) { onMultiChange(selected.slice(0, -1)); return; }
      if (event.key === "," || (event.key === "Enter" && activeIndex < 0)) {
        event.preventDefault(); event.stopPropagation();
        if (query.trim()) { onMultiChange([...selected, query.trim()]); setQuery(""); setActiveIndex(-1); }
        return;
      }
    }
    if (["ArrowDown", "ArrowUp", "Home", "End", "PageDown", "PageUp"].includes(event.key)) {
      event.preventDefault(); event.stopPropagation();
      setKeyboardMode(true);
      if (!open) { show(event.key === "Home" ? options.findIndex(o => !o.disabled) : event.key === "End" ? options.findLastIndex(o => !o.disabled) : undefined, true); return; }
      if (!enabled.length) return;
      const current = enabled.indexOf(activeIndex);
      const next = event.key === "Home" ? 0 : event.key === "End" ? enabled.length - 1 : event.key === "PageDown" ? Math.min(enabled.length - 1, current + 8) : event.key === "PageUp" ? Math.max(0, current - 8) : current < 0 ? event.key === "ArrowDown" ? 0 : enabled.length - 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + enabled.length) % enabled.length;
      setActiveIndex(enabled[next]); return;
    }
    if (event.key === "Enter" || (event.key === " " && !inSearch && (!open || !typing.current.text || performance.now() - typing.current.time > 700))) {
      event.preventDefault(); event.stopPropagation();
      if (!open) show(undefined, true); else if (allowCustom && inSearch && activeIndex < 0) { onSingleChange?.(query); close(); } else choose(activeIndex);
      return;
    }
    if (!inSearch && event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
      event.preventDefault(); event.stopPropagation();
      const now = performance.now(); typing.current.text = now - typing.current.time > 700 ? event.key : typing.current.text + event.key; typing.current.time = now;
      const term = normalize(typing.current.text), match = options.findIndex(option => !option.disabled && normalize(option.textValue ?? textOf(option.label)).startsWith(term));
      setKeyboardMode(true);
      if (!open) show(match >= 0 ? match : undefined, true); else if (match >= 0) setActiveIndex(match);
    }
  };
  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const frame = requestAnimationFrame(() => {
      if (searchable) { searchRef.current?.focus({ preventScroll: true }); searchRef.current?.select(); }
      else if (sheet) popupRef.current?.querySelector<HTMLElement>('[role="listbox"]')?.focus({ preventScroll: true });
      else triggerRef.current?.focus({ preventScroll: true });
    });
    const outside = (event: PointerEvent) => {
      const target = event.target as Element;
      if (!triggerRef.current?.contains(target) && !target.closest(`[data-select-popup="${CSS.escape(id)}"]`)) close(false);
    };
    const other = (event: Event) => { if ((event as CustomEvent<string>).detail !== id) close(false); };
    const back = () => close();
    document.addEventListener("pointerdown", outside, true); window.addEventListener("ctd-select-open", other); window.addEventListener("popstate", back);
    return () => {
      cancelAnimationFrame(frame); document.removeEventListener("pointerdown", outside, true); window.removeEventListener("ctd-select-open", other); window.removeEventListener("popstate", back);
      if (restoreFocus.current && trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [open, sheet, searchable, id, close]);
  useEffect(() => {
    if (!open || sheet) return;
    let frame = 0;
    const reposition = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(locate); };
    const resize = new ResizeObserver(reposition);
    if (triggerRef.current) resize.observe(triggerRef.current);
    if (popupRef.current) resize.observe(popupRef.current);
    window.addEventListener("scroll", reposition, true); window.addEventListener("resize", reposition);
    const viewport = window.visualViewport; viewport?.addEventListener("resize", reposition); reposition();
    return () => { cancelAnimationFrame(frame); resize.disconnect(); window.removeEventListener("scroll", reposition, true); window.removeEventListener("resize", reposition); viewport?.removeEventListener("resize", reposition); };
  }, [open, sheet, locate]);
  useEffect(() => { if (open && activeId) document.getElementById(activeId)?.scrollIntoView({ block: "nearest" }); }, [open, activeId]);

  const optionList = <div ref={popupRef} data-select-popup={id} role="presentation" onKeyDown={handleKey} className="flex min-h-0 flex-col">
    {searchable && <div className="relative m-1 mb-2 shrink-0">
      <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
      <input ref={searchRef} data-select-initial-focus role="combobox" aria-expanded={open} aria-controls={listId} aria-activedescendant={activeId} aria-autocomplete="list" aria-label={`Cari ${label}`} value={query} placeholder="Cari pilihan…" className={S.search} onKeyDown={handleKey} onChange={event => {
        const next = event.target.value; setQuery(next);
        setActiveIndex(allowCustom && multiple ? -1 : options.findIndex(option => !option.disabled && normalize(option.textValue ?? textOf(option.label)).includes(normalize(next))));
        if (allowCustom) onSingleChange?.(next);
      }} />
    </div>}
    {multiple && <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-2 border-b border-[#334155] px-1 pb-1 text-[11px] text-[#94a3b8]">
      <span>Pilih {label} ({selected.length}/{options.length})</span>
      <div className="flex items-center gap-1"><button type="button" className={S.action} onClick={() => {
        const all = (selectAllMode === "add-filtered" ? filtered.map(item => item.option) : options).filter(option => !option.disabled).map(option => String(option.value));
        onMultiChange?.(selectAllMode === "add-filtered" ? [...new Set([...selected, ...all])] : all);
      }}>Pilih Semua</button><button type="button" className={S.action} onClick={() => onMultiChange?.([])}>Hapus</button></div>
    </div>}
    <div id={listId} role="listbox" tabIndex={sheet && !searchable ? 0 : -1} data-select-initial-focus={!searchable ? true : undefined} aria-label={label} aria-multiselectable={multiple || undefined} aria-activedescendant={activeId} className="min-h-0 overflow-y-auto overscroll-contain p-0.5 [scrollbar-width:thin] [scrollbar-color:#475569_transparent]" onKeyDown={handleKey}>
      {filtered.map(({ option, index }, filteredIndex) => {
        const selected = currentValues.includes(String(option.value)), text = option.textValue ?? textOf(option.label);
        return <Fragment key={`${option.key ?? String(option.value)}:${index}`}>
          {option.group && option.group !== filtered[filteredIndex - 1]?.option.group && <div className="px-2.5 py-1.5 text-[11px] font-semibold text-[#94a3b8]">{option.group}</div>}
          <div id={`${listId}-${index}`} role="option" aria-selected={selected} aria-disabled={option.disabled || undefined} tabIndex={-1} title={text} className={`${S.option} ${selected ? S.selected : ""} ${keyboardMode && activeIndex === index ? S.keyboard : ""} ${option.disabled ? S.disabled : ""}`} onKeyDown={handleKey} onPointerDown={event => event.preventDefault()} onPointerMove={event => { if (event.pointerType !== "touch" && !option.disabled) { setKeyboardMode(false); setActiveIndex(index); } }} onClick={() => choose(index)}>
            {multiple && <span aria-hidden="true" className={`grid size-4 shrink-0 place-items-center rounded border ${selected ? "border-[#38bdf8]/60 bg-[#38bdf8]/20 text-[#38bdf8]" : "border-[#475569] bg-[#0f172a]"}`}>{selected && <Check size={12} />}</span>}
            {option.icon && <span aria-hidden="true" className="flex size-4 shrink-0 items-center justify-center text-[#38bdf8]">{option.icon}</span>}
            <span className="min-w-0 flex-1 truncate">{option.label}</span>
            {option.meta && <span className="shrink-0 text-[11px] text-[#94a3b8]">{option.meta}</span>}
            {!multiple && selected && <Check size={15} aria-hidden="true" className="shrink-0 text-[#38bdf8]" />}
          </div>
        </Fragment>;
      })}
      {allowCustom && multiple && query.trim() && !selected.some(value => normalize(value.trim()) === normalize(query.trim())) && <button type="button" className={`${S.option} text-[#38bdf8]`} onPointerDown={event => event.preventDefault()} onClick={() => { onMultiChange?.([...selected, query.trim()]); setQuery(""); setActiveIndex(-1); }}>Tambahkan “{query.trim()}”</button>}
      {!filtered.length && !allowCustom && <div role="status" className="px-3 py-5 text-center text-[13px] text-[#94a3b8]">Tidak ada pilihan yang cocok.</div>}
    </div>
  </div>;
  const baseClass = geometryClasses(className);
  return <>
    <button {...triggerProps} ref={triggerRef} id={id} type="button" disabled={disabled} role="combobox" aria-haspopup="listbox" aria-label={triggerProps["aria-label"] ?? suppliedLabel} aria-expanded={open} aria-controls={listId} aria-activedescendant={activeId} aria-required={required || undefined} title={triggerProps.title ?? (multiple ? selected.join(", ") : textOf(selectedLabel))} data-active={isActive ? "true" : undefined} data-select-trigger className={`${S.trigger} ${size === "form" ? "w-full" : ""} ${baseClass} ${isActive ? S.active : ""}`} onKeyDown={handleKey} onClick={event => { onClick?.(event); if (!event.defaultPrevented) { if (open) close(); else show(); } }}>
      {icon && <span data-select-icon aria-hidden="true" className={`grid size-4 shrink-0 place-items-center [&>svg]:static [&>svg]:size-4 [&>svg]:shrink-0 ${isActive ? "text-[#38bdf8]" : "text-[#94a3b8]"}`}>{icon}</span>}
      <span className="grid min-w-0 flex-1 text-left [&_*]:font-normal [&_*]:text-[11.5px]">
        <span data-select-value-label className="col-start-1 row-start-1 min-w-0 truncate">{renderValue ? renderValue(selectedLabel) : selectedLabel}</span>
        {!renderValue && !allowCustom && <span aria-hidden="true" className="pointer-events-none invisible col-start-1 row-start-1 grid h-0 overflow-hidden">{options.map((option, index) => <span key={`${option.key ?? String(option.value)}:${index}`} className="col-start-1 row-start-1 whitespace-nowrap">{option.label}</span>)}</span>}
      </span>
      <ChevronDown data-select-chevron size={16} aria-hidden="true" className={`static size-4 shrink-0 transition-transform duration-150 motion-reduce:transition-none ${isActive ? "text-[#38bdf8]" : "text-[#94a3b8]"} ${open ? "rotate-180" : ""}`} />
    </button>
    {(name || required) && <input data-select-value aria-hidden="true" tabIndex={-1} className="sr-only" type={required ? "text" : "hidden"} name={name} required={required} disabled={disabled} value={multiple ? selected.join(", ") : singleValue} onChange={() => {}} onInvalid={event => { event.preventDefault(); triggerRef.current?.focus(); show(); }} />}
    {sheet ? <BottomSheet open={open} onClose={() => close()} title={label} dataSheetId={`${id}-sheet`} selectLayer restoreFocus={false} initialFocusSelector="[data-select-initial-focus]" onKeyDown={handleKey}>{optionList}</BottomSheet> : open && createPortal(<div data-select-popup={id} role="presentation" className={`fixed z-[250] flex flex-col ${S.panel}`} style={position}>{optionList}</div>, document.body)}
  </>;
}
