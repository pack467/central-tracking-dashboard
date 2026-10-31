"use client";

import { Select, MultiSelect } from "@/app/components/ui/Select";

import { useMemo } from "react";
import { ChevronDown, Clock, FileText, RotateCcw, Users } from "lucide-react";
import { DatePicker } from "@/app/components/ui/DatePicker";

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
function ShifterMultiSelect({ value, onChange, records }: { value: string; onChange: (val: string) => void; records: StoredHandoverRecord[] }) {
  const selectedList = useMemo(() => value ? value.split(/[,|]/).map(name => name.trim()).filter(Boolean) : [], [value]);
  const allShifters = useMemo(() => {
    const names = new Set<string>(DEFAULT_NOC_SHIFTERS);
    for (const record of records) {
      try { const parsed = typeof record.content === "string" ? JSON.parse(record.content) : record.content; for (const pic of [parsed?.sourcePic, parsed?.targetPic]) if (typeof pic === "string") for (const name of pic.split(",")) if (name.trim()) names.add(name.trim()); } catch { /* Keep the existing malformed-record fallback. */ }
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [records]);
  return <MultiSelect label="Shifter (PIC)" aria-label="Filter Shifter PIC" value={selectedList} onChange={names => onChange(names.join(", "))} options={allShifters.map(name => ({ value: name, label: name }))} selectAllMode="add-filtered" icon={<Users size={16} />} className="w-full h-[38px] text-[12px]" formatValue={names => !names.length ? "Semua Shifter" : names.length <= 2 ? names.join(", ") : names.slice(0, 2).join(", ") + " (+" + (names.length - 2) + ")"} />;
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
            
            <Select icon={<Clock size={16} aria-hidden="true" />}
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
            </Select>
            
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
