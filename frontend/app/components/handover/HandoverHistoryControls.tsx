"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Clock, FileText, RotateCcw, Search, Users, X } from "lucide-react";
import { DatePicker } from "@/app/components/ui/DatePicker";
import { initials } from "@/app/lib/data";
import type { useHandoverWorkflow } from "@/app/hooks/useHandoverWorkflow";
import type { StoredHandoverRecord } from "@/app/lib/types";

export type HandoverWorkflow = ReturnType<typeof useHandoverWorkflow>;

const DEFAULT_NOC_SHIFTERS = [
  "Tahan Julianus Nadeak",
  "Yuha Azhari Simbolon",
  "Nicholas Bima Nooka Putra",
  "Pangondion Kurniawan Naibaho",
  "Natanael Tambun",
  "Agnes Siahaan",
  "Ade Yuri F. Damanik",
  "Muhammad Ihsanul Arifin",
  "Mhd. Galih Khairi",
  "Pedro Hutagaol",
  "Kristina Marbun",
  "Andri Agung Exaudi Sigiro",
  "Dimas Yudistira",
  "Tennov Pakpahan",
];

const HISTORY_CONTROLS_CLASS =
  "flex items-end gap-[12px] p-[12px_18px] m-0 bg-[rgba(15,23,42,0.45)] border-b border-[var(--line)] box-border max-[768px]:flex-wrap max-[768px]:gap-[10px] max-[768px]:p-[10px_14px]";
const HISTORY_CONTROL_ITEM_CLASS = "flex flex-col min-w-0";
const HISTORY_DATE_ITEM_CLASS = "flex-[0_0_220px] min-w-[190px] max-[768px]:flex-[1_1_210px]";
const HISTORY_SHIFT_ITEM_CLASS = "flex-[0_0_190px] min-w-[160px] max-[768px]:flex-[1_1_160px]";
const HISTORY_SEARCH_ITEM_CLASS = "flex-[1_1_260px] min-w-[210px] max-[768px]:flex-[1_1_200px]";
const HISTORY_CONTROL_LABEL_CLASS = "flex flex-col gap-[5px] w-full";
const HISTORY_CONTROL_LABEL_TEXT_CLASS =
  "text-[10.5px] font-bold tracking-[0.4px] text-[var(--ink-secondary)] uppercase leading-none";
const HISTORY_SHIFT_SELECT_WRAP_CLASS = "relative flex items-center w-full";
const HISTORY_SHIFT_SELECT_CLASS =
  "w-full h-[38px] p-[8px_30px_8px_32px] text-[12px] bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-[7px] text-[var(--ink-primary)] appearance-none cursor-pointer transition-all duration-150 ease-out box-border focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] focus:outline-none";
const HISTORY_SHIFT_OPTGROUP_CLASS =
  "bg-[var(--panel-bg)] text-[var(--ink-muted)] text-[11px] font-bold";
const HISTORY_SHIFT_OPTION_CLASS = "bg-[var(--panel-bg)] text-[var(--ink-primary)] text-[12px] p-[4px]";
const HISTORY_ACTIONS_CLASS =
  "inline-flex items-center gap-[8px] shrink-0 ml-auto max-[768px]:ml-0 max-[768px]:w-full max-[768px]:justify-end";
const HISTORY_ACTION_BUTTON_CLASS =
  "inline-flex items-center justify-center gap-[6px] h-[38px] text-[12px] font-semibold rounded-[7px] cursor-pointer whitespace-nowrap box-border";
const HISTORY_RESET_BUTTON_CLASS =
  "px-[12px] bg-transparent border border-[var(--panel-border)] text-[var(--ink-muted)] hover:border-[var(--line)] hover:text-[var(--ink-primary)] hover:bg-[rgba(255,255,255,0.05)]";
const HISTORY_ERROR_CLASS = "basis-full w-full m-[4px_0_0] text-[var(--red)] text-[11.5px]";
const HISTORY_MORE_CLASS =
  "flex items-center justify-between gap-[12px] pt-[14px] mt-[14px] border-t border-[var(--line)] flex-wrap";
const HISTORY_MORE_INFO_CLASS = "flex items-center gap-[6px] text-[11.5px] text-[var(--ink-secondary)]";
const HISTORY_LOAD_MORE_BUTTON_CLASS =
  "inline-flex items-center gap-[5px] p-[6px_14px] text-[11.5px] font-bold cursor-pointer";

/**
 * Multi-Select Dropdown Filter for Shifter (PIC)
 * Allows selecting one or multiple NOC shifters directly.
 */
function ShifterMultiSelect({
  value,
  onChange,
  records,
}: {
  value: string;
  onChange: (val: string) => void;
  records: StoredHandoverRecord[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse comma-separated string into array of names
  const selectedList = useMemo(() => {
    if (!value) return [];
    return value
      .split(/[,|]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [value]);

  // Aggregate all unique shifters from records + defaults
  const allShifters = useMemo(() => {
    const set = new Set<string>(DEFAULT_NOC_SHIFTERS);
    for (const r of records) {
      try {
        const parsed = typeof r.content === "string" ? JSON.parse(r.content) : r.content;
        if (parsed?.sourcePic) set.add(parsed.sourcePic);
        if (parsed?.targetPic) set.add(parsed.targetPic);
      } catch {
        // ignore malformed JSON
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [records]);

  // Filtered shifters in popover search
  const filteredShifters = useMemo(() => {
    if (!query.trim()) return allShifters;
    const q = query.toLowerCase();
    return allShifters.filter((name) => name.toLowerCase().includes(q));
  }, [allShifters, query]);

  // Close on outside click or escape
  useEffect(() => {
    if (!isOpen) return;
    const handleDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  const toggle = (name: string) => {
    const exists = selectedList.includes(name);
    const next = exists ? selectedList.filter((n) => n !== name) : [...selectedList, name];
    onChange(next.join(", "));
  };

  const selectAll = () => {
    const set = new Set([...selectedList, ...filteredShifters]);
    onChange(Array.from(set).join(", "));
  };

  const clearAll = () => {
    onChange("");
  };

  // Label to show in trigger box
  const label = useMemo(() => {
    if (selectedList.length === 0) return "Semua Shifter";
    if (selectedList.length === 1) return selectedList[0];
    if (selectedList.length === 2) return `${selectedList[0]}, ${selectedList[1]}`;
    return `${selectedList[0]}, ${selectedList[1]} (+${selectedList.length - 2})`;
  }, [selectedList]);

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Box */}
      <div
        className={`flex items-center justify-between gap-[8px] w-full h-[38px] p-[0_10px_0_11px] bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-[7px] text-[12px] cursor-pointer select-none transition-all duration-150 ease-out box-border hover:border-[var(--accent-blue-border)] hover:bg-[rgba(15,23,42,0.9)] ${
          selectedList.length > 0
            ? "border-[rgba(56,189,248,0.4)] bg-[rgba(56,189,248,0.08)] text-[var(--accent-blue,#38bdf8)] font-semibold"
            : "text-[var(--ink-primary)]"
        } ${isOpen ? "border-[var(--accent-blue)] shadow-[0_0_0_3px_var(--accent-blue-soft)]" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
      >
        <div className="flex items-center gap-[8px] min-w-0 flex-1">
          <Users
            size={14}
            className={`shrink-0 transition-colors duration-150 ease-out ${
              selectedList.length > 0 ? "text-[var(--accent-blue,#38bdf8)]" : "text-[var(--ink-muted)]"
            }`}
          />
          <span
            className={`whitespace-nowrap overflow-hidden text-ellipsis flex-1 min-w-0 ${
              selectedList.length === 0 ? "text-[var(--ink-muted)] font-normal" : ""
            }`}
          >
            {label}
          </span>
          {selectedList.length > 1 && (
            <span className="inline-flex items-center justify-center p-[1px_6px] rounded-[10px] bg-[rgba(56,189,248,0.2)] text-[#38bdf8] text-[10.5px] font-bold shrink-0">
              {selectedList.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-[6px] shrink-0">
          {selectedList.length > 0 && (
            <button
              type="button"
              className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-[4px] bg-transparent border-0 text-[var(--ink-muted)] cursor-pointer transition-all duration-120 ease-out hover:bg-[rgba(255,255,255,0.1)] hover:text-white"
              title="Hapus filter Shifter"
              onClick={(e) => {
                e.stopPropagation();
                clearAll();
              }}
            >
              <X size={12} />
            </button>
          )}
          <ChevronDown
            size={14}
            className={`pointer-events-none transition-[transform,color] duration-150 ease-out ${
              isOpen ? "rotate-180" : ""
            } ${selectedList.length > 0 ? "text-[var(--accent-blue,#38bdf8)]" : "text-[var(--ink-muted)]"}`}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Floating Multi-Select Popover */}
      {isOpen && (
        <div
          className="absolute top-[calc(100%+6px)] left-0 z-[9999] w-full min-w-[280px] max-w-[360px] bg-[#131b2e] border border-[var(--line)] rounded-[9px] shadow-[0_12px_30px_rgba(0,0,0,0.6),0_4px_12px_rgba(0,0,0,0.4)] p-[10px] flex flex-col gap-[8px] animate-[datepicker-fade-in_0.15s_ease-out]"
          role="dialog"
          aria-label="Filter Shifter PIC"
        >
          {/* Popover Quick Search */}
          <div className="relative flex items-center w-full">
            <Search size={13} className="absolute left-[9px] text-[var(--ink-muted)] pointer-events-none" />
            <input
              type="text"
              className="w-full h-[32px] p-[6px_26px_6px_28px] text-[11.5px] bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-[6px] text-[var(--ink-primary)] box-border focus:border-[var(--accent-blue)] focus:outline-none"
              placeholder="Cari shifter..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            {query && (
              <button
                type="button"
                className="absolute right-[6px] inline-grid place-items-center w-[16px] h-[16px] bg-transparent border-0 text-[var(--ink-muted)] cursor-pointer hover:text-white"
                onClick={() => setQuery("")}
              >
                <X size={11} />
              </button>
            )}
          </div>

          {/* Quick Select Actions */}
          <div className="flex items-center justify-between p-[0_2px] text-[11px]">
            <span className="text-[var(--ink-secondary)] font-semibold">
              {selectedList.length > 0 ? `${selectedList.length} terpilih` : "Pilih satu atau lebih"}
            </span>
            <div className="flex items-center gap-[8px]">
              <button
                type="button"
                className="bg-transparent border-0 p-0 text-[var(--accent-blue,#38bdf8)] text-[11px] font-semibold cursor-pointer hover:underline"
                onClick={selectAll}
              >
                Pilih Semua
              </button>
              <span className="text-[var(--panel-border)]">·</span>
              <button
                type="button"
                className="bg-transparent border-0 p-0 text-[var(--ink-muted)] text-[11px] cursor-pointer hover:text-[#f87171] hover:underline"
                onClick={clearAll}
              >
                Reset
              </button>
            </div>
          </div>

          {/* Shifter List with Checkboxes */}
          <div className="max-h-[220px] overflow-y-auto flex flex-col gap-[2px] pr-[2px]">
            {filteredShifters.length === 0 ? (
              <div className="p-[16px] text-center text-[var(--ink-muted)] text-[11.5px]">
                Tidak ada shifter ditemukan.
              </div>
            ) : (
              filteredShifters.map((name) => {
                const isSelected = selectedList.includes(name);
                const userInitials = initials(name);
                return (
                  <div
                    key={name}
                    className={`flex items-center gap-[9px] p-[6px_8px] rounded-[6px] cursor-pointer transition-colors duration-120 ease-out ${
                      isSelected
                        ? "bg-[rgba(56,189,248,0.1)] hover:bg-[rgba(56,189,248,0.15)]"
                        : "hover:bg-[rgba(255,255,255,0.05)]"
                    }`}
                    onClick={() => toggle(name)}
                  >
                    {/* Custom Checkbox */}
                    <div
                      className={`inline-flex items-center justify-center w-[16px] h-[16px] rounded-[4px] transition-all duration-120 ease-out shrink-0 ${
                        isSelected
                          ? "bg-[var(--accent-blue,#38bdf8)] border border-[var(--accent-blue,#38bdf8)]"
                          : "bg-[rgba(15,23,42,0.6)] border border-[var(--panel-border)]"
                      }`}
                    >
                      {isSelected && <Check size={11} className="text-[#0f172a] [stroke-width:3]" />}
                    </div>

                    {/* Initials Avatar */}
                    <div className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full bg-[rgba(255,255,255,0.08)] text-[var(--ink-secondary)] text-[10px] font-bold shrink-0">
                      {userInitials}
                    </div>

                    {/* Name */}
                    <span
                      className={`text-[12px] leading-[1.2] flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis ${
                        isSelected ? "text-[var(--accent-blue,#38bdf8)] font-semibold" : "text-[var(--ink-primary)]"
                      }`}
                    >
                      {name}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Bar */}
          <div className="flex items-center justify-end pt-[6px] border-t border-[var(--line)]">
            <button
              type="button"
              className="button button-primary h-[28px] px-[12px] text-[11.5px] font-semibold rounded-[6px]"
              onClick={() => setIsOpen(false)}
            >
              Selesai
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function HandoverHistoryControls({ workflow }: { workflow: HandoverWorkflow }) {
  const hasFilters = Boolean(workflow.filters.date || workflow.filters.shift || workflow.filters.pic);

  return (
    <div className={HISTORY_CONTROLS_CLASS}>
      {/* 1. Filter Tanggal */}
      <div className={`${HISTORY_CONTROL_ITEM_CLASS} ${HISTORY_DATE_ITEM_CLASS}`}>
        <div className={HISTORY_CONTROL_LABEL_CLASS}>
          <span className={HISTORY_CONTROL_LABEL_TEXT_CLASS}>Tanggal</span>
          <div className="w-full">
            <DatePicker
              value={workflow.filters.date}
              onChange={(date) => workflow.setFilters((prev) => ({ ...prev, date }))}
              placeholder="Semua Waktu"
              clearable
              showAllTimePreset
              referenceDate="2026-09-06"
              aria-label="Filter rentang tanggal serah terima"
              className={
                workflow.filters.date
                  ? "[&_.custom-datepicker-trigger]:border-[rgba(56,189,248,0.4)] [&_.custom-datepicker-trigger]:bg-[rgba(56,189,248,0.08)] [&_.custom-datepicker-trigger]:text-[var(--accent-blue,#38bdf8)] [&_.custom-datepicker-trigger]:font-semibold"
                  : ""
              }
            />
          </div>
        </div>
      </div>

      {/* 2. Filter Shift */}
      <div className={`${HISTORY_CONTROL_ITEM_CLASS} ${HISTORY_SHIFT_ITEM_CLASS}`}>
        <label className={HISTORY_CONTROL_LABEL_CLASS}>
          <span className={HISTORY_CONTROL_LABEL_TEXT_CLASS}>Shift</span>
          <div className={HISTORY_SHIFT_SELECT_WRAP_CLASS}>
            <Clock
              size={14}
              className={`absolute left-[10px] pointer-events-none z-1 transition-colors duration-150 ease-out ${
                workflow.filters.shift ? "text-[var(--accent-blue,#38bdf8)]" : "text-[var(--ink-muted)]"
              }`}
              aria-hidden="true"
            />
            <select
              className={`${HISTORY_SHIFT_SELECT_CLASS} ${
                workflow.filters.shift
                  ? "border-[rgba(56,189,248,0.4)] bg-[rgba(56,189,248,0.08)] text-[var(--accent-blue,#38bdf8)] font-semibold"
                  : ""
              }`}
              value={workflow.filters.shift}
              onChange={(event) => workflow.setFilters((prev) => ({ ...prev, shift: event.target.value }))}
              aria-label="Filter berdasarkan shift"
            >
              <option className={HISTORY_SHIFT_OPTION_CLASS} value="">
                Semua Shift
              </option>
              <optgroup className={HISTORY_SHIFT_OPTGROUP_CLASS} label="Shift Spesifik">
                <option className={HISTORY_SHIFT_OPTION_CLASS} value="subuh">
                  Shift Subuh
                </option>
                <option className={HISTORY_SHIFT_OPTION_CLASS} value="pagi">
                  Shift Pagi
                </option>
                <option className={HISTORY_SHIFT_OPTION_CLASS} value="malam">
                  Shift Malam
                </option>
              </optgroup>
              <optgroup className={HISTORY_SHIFT_OPTGROUP_CLASS} label="Rotasi Serah Terima">
                <option className={HISTORY_SHIFT_OPTION_CLASS} value="subuh → pagi">
                  Subuh → Pagi
                </option>
                <option className={HISTORY_SHIFT_OPTION_CLASS} value="pagi → malam">
                  Pagi → Malam
                </option>
                <option className={HISTORY_SHIFT_OPTION_CLASS} value="malam → subuh">
                  Malam → Subuh
                </option>
              </optgroup>
            </select>
            <ChevronDown
              size={14}
              className={`absolute right-[11px] pointer-events-none z-1 transition-colors duration-150 ease-out ${
                workflow.filters.shift ? "text-[var(--accent-blue,#38bdf8)]" : "text-[var(--ink-muted)]"
              }`}
              aria-hidden="true"
            />
          </div>
        </label>
      </div>

      {/* 3. Filter Shifter (PIC) - Multi-Select Direct Filter */}
      <div className={`${HISTORY_CONTROL_ITEM_CLASS} ${HISTORY_SEARCH_ITEM_CLASS}`}>
        <div className={HISTORY_CONTROL_LABEL_CLASS}>
          <span className={HISTORY_CONTROL_LABEL_TEXT_CLASS}>Shifter (PIC)</span>
          <ShifterMultiSelect
            value={workflow.filters.pic}
            onChange={(pic) => workflow.setFilters((prev) => ({ ...prev, pic }))}
            records={workflow.records}
          />
        </div>
      </div>

      {/* 4. Action Buttons (Reset filter when active) */}
      {hasFilters && (
        <div className={HISTORY_ACTIONS_CLASS}>
          <button
            type="button"
            className={`${HISTORY_ACTION_BUTTON_CLASS} ${HISTORY_RESET_BUTTON_CLASS}`}
            onClick={() => workflow.setFilters({ date: "", shift: "", pic: "" })}
          >
            <RotateCcw size={12} />
            Reset filter
          </button>
        </div>
      )}

      {workflow.error && (
        <p className={HISTORY_ERROR_CLASS} role="alert">
          {workflow.error}
        </p>
      )}
    </div>
  );
}

export function HandoverHistoryMore({ workflow }: { workflow: HandoverWorkflow }) {
  return (
    <div className={HISTORY_MORE_CLASS}>
      <div className={HISTORY_MORE_INFO_CLASS}>
        <FileText size={14} style={{ color: "var(--ink-muted)" }} />
        <span>
          {workflow.loading ? "Memuat catatan…" : `${workflow.records.length} dari ${workflow.total} catatan`}
        </span>
      </div>
      {workflow.hasMore && (
        <button
          type="button"
          className={`button button-secondary ${HISTORY_LOAD_MORE_BUTTON_CLASS}`}
          disabled={workflow.loading || workflow.busy}
          onClick={workflow.loadMore}
        >
          <ChevronDown size={14} />
          Muat lebih banyak
        </button>
      )}
    </div>
  );
}
