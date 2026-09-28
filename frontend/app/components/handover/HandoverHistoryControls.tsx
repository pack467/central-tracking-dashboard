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
  "[display:flex] [align-items:flex-end] [gap:12px] [padding:12px_18px] [margin:0] [background:rgba(15,_23,_42,_0.45)] [border-bottom:1px_solid_var(--line)] [box-sizing:border-box] max-[768px]:[flex-wrap:wrap] max-[768px]:[gap:10px] max-[768px]:[padding:10px_14px]";
const HISTORY_CONTROL_ITEM_CLASS = "[display:flex] [flex-direction:column] [min-width:0]";
const HISTORY_DATE_ITEM_CLASS = "[flex:0_0_220px] [min-width:190px] max-[768px]:[flex:1_1_210px]";
const HISTORY_SHIFT_ITEM_CLASS = "[flex:0_0_190px] [min-width:160px] max-[768px]:[flex:1_1_160px]";
const HISTORY_SEARCH_ITEM_CLASS = "[flex:1_1_260px] [min-width:210px] max-[768px]:[flex:1_1_200px]";
const HISTORY_CONTROL_LABEL_CLASS = "[display:flex] [flex-direction:column] [gap:5px] [width:100%]";
const HISTORY_CONTROL_LABEL_TEXT_CLASS =
  "[font-size:10.5px] [font-weight:700] [letter-spacing:0.4px] [color:var(--ink-secondary)] [text-transform:uppercase] [line-height:1]";
const HISTORY_SHIFT_SELECT_WRAP_CLASS = "[position:relative] [display:flex] [align-items:center] [width:100%]";
const HISTORY_SHIFT_SELECT_CLASS =
  "[width:100%] [height:38px] [padding:8px_30px_8px_32px] [font-size:12px]! [background:var(--input-bg)] [border:1px_solid_var(--panel-border)] [border-radius:7px] [color:var(--ink-primary)] [appearance:none] [cursor:pointer] [transition:all_0.15s_ease] [box-sizing:border-box] focus:[border-color:var(--accent-blue)] focus:[box-shadow:0_0_0_3px_var(--accent-blue-soft)] focus:[outline:none]!";
const HISTORY_SHIFT_OPTGROUP_CLASS =
  "[background:var(--panel-bg)] [color:var(--ink-muted)] [font-size:11px] [font-weight:700]";
const HISTORY_SHIFT_OPTION_CLASS = "[background:var(--panel-bg)] [color:var(--ink-primary)] [font-size:12px] [padding:4px]";
const HISTORY_ACTIONS_CLASS =
  "[display:inline-flex] [align-items:center] [gap:8px] [flex-shrink:0] [margin-left:auto] max-[768px]:[margin-left:0] max-[768px]:[width:100%] max-[768px]:[justify-content:flex-end]";
const HISTORY_ACTION_BUTTON_CLASS =
  "[display:inline-flex] [align-items:center] [justify-content:center] [gap:6px]! [height:38px]! [font-size:12px]! [font-weight:600] [border-radius:7px] [cursor:pointer] [white-space:nowrap] [box-sizing:border-box]";
const HISTORY_RESET_BUTTON_CLASS =
  "[padding:0_12px]! [background:transparent] [border:1px_solid_var(--panel-border)]! [color:var(--ink-muted)] [&:hover]:[border-color:var(--line)]! [&:hover]:[color:var(--ink-primary)] [&:hover]:[background:rgba(255,_255,_255,_0.05)]!";
const HISTORY_ERROR_CLASS = "[flex-basis:100%] [width:100%] [margin:4px_0_0] [color:var(--red)] [font-size:11.5px]";
const HISTORY_MORE_CLASS =
  "[display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [padding-top:14px] [margin-top:14px] [border-top:1px_solid_var(--line)] [flex-wrap:wrap]";
const HISTORY_MORE_INFO_CLASS = "[display:flex] [align-items:center] [gap:6px] [font-size:11.5px] [color:var(--ink-secondary)]";
const HISTORY_LOAD_MORE_BUTTON_CLASS =
  "[display:inline-flex] [align-items:center] [gap:5px]! [padding:6px_14px]! [font-size:11.5px]! [font-weight:700]! [cursor:pointer]";

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
    <div className="[position:relative] [width:100%]" ref={containerRef}>
      {/* Trigger Box */}
      <div
        className={`[display:flex] [align-items:center] [justify-content:space-between] [gap:8px] [width:100%] [height:38px] [padding:0_10px_0_11px] [background:var(--input-bg)] [border:1px_solid_var(--panel-border)] [border-radius:7px] [font-size:12px] [cursor:pointer] [user-select:none] [transition:all_0.15s_ease] [box-sizing:border-box] hover:[border-color:var(--accent-blue-border)] hover:[background:rgba(15,_23,_42,_0.9)] ${
          selectedList.length > 0
            ? "[border-color:rgba(56,_189,_248,_0.4)]! [background-color:rgba(56,_189,_248,_0.08)]! [color:var(--accent-blue,_#38bdf8)]! [font-weight:600]!"
            : "[color:var(--ink-primary)]"
        } ${isOpen ? "[border-color:var(--accent-blue)]! [box-shadow:0_0_0_3px_var(--accent-blue-soft)]!" : ""}`}
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
        <div className="[display:flex] [align-items:center] [gap:8px] [min-width:0] [flex:1]">
          <Users
            size={14}
            className={`[flex-shrink:0] [transition:color_0.15s_ease] ${
              selectedList.length > 0 ? "[color:var(--accent-blue,_#38bdf8)]!" : "[color:var(--ink-muted)]"
            }`}
          />
          <span
            className={`[white-space:nowrap] [overflow:hidden] [text-overflow:ellipsis] [flex:1] [min-width:0] ${
              selectedList.length === 0 ? "[color:var(--ink-muted)] [font-weight:400]" : ""
            }`}
          >
            {label}
          </span>
          {selectedList.length > 1 && (
            <span className="[display:inline-flex] [align-items:center] [justify-content:center] [padding:1px_6px] [border-radius:10px] [background:rgba(56,_189,_248,_0.2)] [color:#38bdf8] [font-size:10.5px] [font-weight:700] [flex-shrink:0]">
              {selectedList.length}
            </span>
          )}
        </div>

        <div className="[display:flex] [align-items:center] [gap:6px] [flex-shrink:0]">
          {selectedList.length > 0 && (
            <button
              type="button"
              className="[display:inline-flex]! [align-items:center]! [justify-content:center]! [width:18px]! [height:18px]! [border-radius:4px]! [background:transparent]! [border:none]! [color:var(--ink-muted)]! [cursor:pointer]! [transition:all_0.12s_ease]! hover:[background:rgba(255,_255,_255,_0.1)]! hover:[color:#ffffff]!"
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
            className={`[pointer-events:none] [transition:transform_0.2s_ease,_color_0.15s_ease] ${
              isOpen ? "[transform:rotate(180deg)]" : ""
            } ${selectedList.length > 0 ? "[color:var(--accent-blue,_#38bdf8)]!" : "[color:var(--ink-muted)]"}`}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Floating Multi-Select Popover */}
      {isOpen && (
        <div
          className="[position:absolute] [top:calc(100%_+_6px)] [left:0] [z-index:9999] [width:100%] [min-width:280px] [max-width:360px] [background:#131b2e] [border:1px_solid_var(--line)] [border-radius:9px] [box-shadow:0_12px_30px_rgba(0,_0,_0,_0.6),_0_4px_12px_rgba(0,_0,_0,_0.4)] [padding:10px] [display:flex] [flex-direction:column] [gap:8px] [animation:datepicker-fade-in_0.15s_ease-out]"
          role="dialog"
          aria-label="Filter Shifter PIC"
        >
          {/* Popover Quick Search */}
          <div className="[position:relative] [display:flex] [align-items:center] [width:100%]">
            <Search size={13} className="[position:absolute] [left:9px] [color:var(--ink-muted)] [pointer-events:none]" />
            <input
              type="text"
              className="[width:100%] [height:32px] [padding:6px_26px_6px_28px]! [font-size:11.5px]! [background:var(--input-bg)] [border:1px_solid_var(--panel-border)] [border-radius:6px] [color:var(--ink-primary)] [box-sizing:border-box] focus:[border-color:var(--accent-blue)] focus:[outline:none]!"
              placeholder="Cari shifter..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            {query && (
              <button
                type="button"
                className="[position:absolute] [right:6px] [display:inline-grid] [place-items:center] [width:16px] [height:16px] [background:transparent] [border:none] [color:var(--ink-muted)] [cursor:pointer] hover:[color:#ffffff]!"
                onClick={() => setQuery("")}
              >
                <X size={11} />
              </button>
            )}
          </div>

          {/* Quick Select Actions */}
          <div className="[display:flex] [align-items:center] [justify-content:space-between] [padding:0_2px] [font-size:11px]">
            <span className="[color:var(--ink-secondary)] [font-weight:600]">
              {selectedList.length > 0 ? `${selectedList.length} terpilih` : "Pilih satu atau lebih"}
            </span>
            <div className="[display:flex] [align-items:center] [gap:8px]">
              <button
                type="button"
                className="[background:none] [border:none] [padding:0] [color:var(--accent-blue,_#38bdf8)] [font-size:11px] [font-weight:600] [cursor:pointer] hover:[text-decoration:underline]!"
                onClick={selectAll}
              >
                Pilih Semua
              </button>
              <span className="[color:var(--panel-border)]">·</span>
              <button
                type="button"
                className="[background:none] [border:none] [padding:0] [color:var(--ink-muted)] [font-size:11px] [cursor:pointer] hover:[color:#f87171]! hover:[text-decoration:underline]!"
                onClick={clearAll}
              >
                Reset
              </button>
            </div>
          </div>

          {/* Shifter List with Checkboxes */}
          <div className="[max-height:220px] [overflow-y:auto] [display:flex] [flex-direction:column] [gap:2px] [padding-right:2px]">
            {filteredShifters.length === 0 ? (
              <div className="[padding:16px] [text-align:center] [color:var(--ink-muted)] [font-size:11.5px]">
                Tidak ada shifter ditemukan.
              </div>
            ) : (
              filteredShifters.map((name) => {
                const isSelected = selectedList.includes(name);
                const userInitials = initials(name);
                return (
                  <div
                    key={name}
                    className={`[display:flex] [align-items:center] [gap:9px] [padding:6px_8px] [border-radius:6px] [cursor:pointer] [transition:background_0.12s_ease] ${
                      isSelected
                        ? "[background:rgba(56,_189,_248,_0.1)]! hover:[background:rgba(56,_189,_248,_0.15)]!"
                        : "hover:[background:rgba(255,_255,_255,_0.05)]"
                    }`}
                    onClick={() => toggle(name)}
                  >
                    {/* Custom Checkbox */}
                    <div
                      className={`[display:inline-flex] [align-items:center] [justify-content:center] [width:16px] [height:16px] [border-radius:4px] [transition:all_0.12s_ease] [flex-shrink:0] ${
                        isSelected
                          ? "[background:var(--accent-blue,_#38bdf8)]! [border:1px_solid_var(--accent-blue,_#38bdf8)]!"
                          : "[background:rgba(15,_23,_42,_0.6)] [border:1px_solid_var(--panel-border)]"
                      }`}
                    >
                      {isSelected && <Check size={11} className="[color:#0f172a] [stroke-width:3]" />}
                    </div>

                    {/* Initials Avatar */}
                    <div className="[display:inline-flex] [align-items:center] [justify-content:center] [width:22px] [height:22px] [border-radius:50%] [background:rgba(255,_255,_255,_0.08)] [color:var(--ink-secondary)] [font-size:10px] [font-weight:700] [flex-shrink:0]">
                      {userInitials}
                    </div>

                    {/* Name */}
                    <span
                      className={`[font-size:12px] [line-height:1.2] [flex:1] [min-width:0] [white-space:nowrap] [overflow:hidden] [text-overflow:ellipsis] ${
                        isSelected ? "[color:var(--accent-blue,_#38bdf8)] [font-weight:600]" : "[color:var(--ink-primary)]"
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
          <div className="[display:flex] [align-items:center] [justify-content:flex-end] [padding-top:6px] [border-top:1px_solid_var(--line)]">
            <button
              type="button"
              className="button button-primary [height:28px]! [padding:0_12px]! [font-size:11.5px]! [font-weight:600]! [border-radius:6px]!"
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
          <div className="[width:100%]">
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
                  ? "[&_.custom-datepicker-trigger]:[border-color:rgba(56,_189,_248,_0.4)]! [&_.custom-datepicker-trigger]:[background-color:rgba(56,_189,_248,_0.08)]! [&_.custom-datepicker-trigger]:[color:var(--accent-blue,_#38bdf8)]! [&_.custom-datepicker-trigger]:[font-weight:600]!"
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
              className={`[position:absolute] [left:10px] [pointer-events:none] [z-index:1] [transition:color_0.15s_ease] ${
                workflow.filters.shift ? "[color:var(--accent-blue,_#38bdf8)]!" : "[color:var(--ink-muted)]"
              }`}
              aria-hidden="true"
            />
            <select
              className={`${HISTORY_SHIFT_SELECT_CLASS} ${
                workflow.filters.shift
                  ? "[border-color:rgba(56,_189,_248,_0.4)]! [background-color:rgba(56,_189,_248,_0.08)]! [color:var(--accent-blue,_#38bdf8)]! [font-weight:600]!"
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
              className={`[position:absolute] [right:11px] [pointer-events:none] [z-index:1] [transition:color_0.15s_ease] ${
                workflow.filters.shift ? "[color:var(--accent-blue,_#38bdf8)]!" : "[color:var(--ink-muted)]"
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
