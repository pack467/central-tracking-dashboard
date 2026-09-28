"use client";

import { Search, X, RefreshCw, RotateCcw, FileText, ChevronDown } from "lucide-react";
import { DatePicker } from "@/app/components/ui/DatePicker";
import type { useHandoverWorkflow } from "@/app/hooks/useHandoverWorkflow";
export type HandoverWorkflow = ReturnType<typeof useHandoverWorkflow>;

const HISTORY_CONTROLS_CLASS =
  "[display:flex] [align-items:flex-end] [gap:12px] [padding:12px_18px] [margin:0] [background:rgba(15,_23,_42,_0.45)] [border-bottom:1px_solid_var(--line)] [box-sizing:border-box] max-[768px]:[flex-wrap:wrap] max-[768px]:[gap:10px] max-[768px]:[padding:10px_14px]";
const HISTORY_CONTROL_ITEM_CLASS = "[display:flex] [flex-direction:column] [min-width:0]";
const HISTORY_DATE_ITEM_CLASS = "[flex:0_0_220px] [min-width:190px] max-[768px]:[flex:1_1_210px]";
const HISTORY_SHIFT_ITEM_CLASS = "[flex:0_0_190px] [min-width:160px] max-[768px]:[flex:1_1_160px]";
const HISTORY_SEARCH_ITEM_CLASS = "[flex:1_1_240px] max-[768px]:[flex:1_1_200px]";
const HISTORY_CONTROL_LABEL_CLASS = "[display:flex] [flex-direction:column] [gap:5px] [width:100%]";
const HISTORY_CONTROL_LABEL_TEXT_CLASS =
  "[font-size:10.5px] [font-weight:700] [letter-spacing:0.4px] [color:var(--ink-secondary)] [text-transform:uppercase] [line-height:1]";
const HISTORY_SHIFT_SELECT_WRAP_CLASS = "[position:relative] [display:flex] [align-items:center] [width:100%]";
const HISTORY_SHIFT_SELECT_CLASS =
  "[width:100%] [height:38px] [padding:8px_30px_8px_12px] [font-size:12px]! [background:var(--input-bg)] [border:1px_solid_var(--panel-border)] [border-radius:7px] [color:var(--ink-primary)] [appearance:none] [cursor:pointer] [transition:all_0.15s_ease] [box-sizing:border-box] focus:[border-color:var(--accent-blue)] focus:[box-shadow:0_0_0_3px_var(--accent-blue-soft)] focus:[outline:none]!";
const HISTORY_SHIFT_OPTGROUP_CLASS =
  "[background:var(--panel-bg)] [color:var(--ink-muted)] [font-size:11px] [font-weight:700]";
const HISTORY_SHIFT_OPTION_CLASS = "[background:var(--panel-bg)] [color:var(--ink-primary)] [font-size:12px] [padding:4px]";
const HISTORY_SEARCH_INPUT_CLASS =
  "[width:100%] [height:38px] [padding:8px_30px_8px_34px]! [font-size:12px]! [background:var(--input-bg)] [border:1px_solid_var(--panel-border)] [border-radius:7px] [color:var(--ink-primary)] [transition:all_0.15s_ease] [box-sizing:border-box] focus:[border-color:var(--accent-blue)] focus:[box-shadow:0_0_0_3px_var(--accent-blue-soft)] focus:[outline:none]!";
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

export function HandoverHistoryControls({ workflow }: { workflow: HandoverWorkflow }) {
  const hasFilters = Boolean(workflow.filters.date || workflow.filters.shift || workflow.filters.pic);

  return (
    <div className={HISTORY_CONTROLS_CLASS}>
      {/* 1. Filter Tanggal */}
      <div className={`${HISTORY_CONTROL_ITEM_CLASS} ${HISTORY_DATE_ITEM_CLASS}`}>
        <label className={HISTORY_CONTROL_LABEL_CLASS}>
          <span className={HISTORY_CONTROL_LABEL_TEXT_CLASS}>Tanggal</span>
          <div className="[width:100%]">
            <DatePicker
              value={workflow.filters.date}
              onChange={(date) => workflow.setFilters((prev) => ({ ...prev, date }))}
              placeholder="Pilih tanggal..."
            />
          </div>
        </label>
      </div>

      {/* 2. Filter Shift */}
      <div className={`${HISTORY_CONTROL_ITEM_CLASS} ${HISTORY_SHIFT_ITEM_CLASS}`}>
        <label className={HISTORY_CONTROL_LABEL_CLASS}>
          <span className={HISTORY_CONTROL_LABEL_TEXT_CLASS}>Shift</span>
          <div className={HISTORY_SHIFT_SELECT_WRAP_CLASS}>
            <select
              className={HISTORY_SHIFT_SELECT_CLASS}
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
              className="[position:absolute] [right:11px] [color:var(--ink-muted)] [pointer-events:none]"
              aria-hidden="true"
            />
          </div>
        </label>
      </div>

      {/* 3. Filter Shifter (PIC) */}
      <div className={`${HISTORY_CONTROL_ITEM_CLASS} ${HISTORY_SEARCH_ITEM_CLASS}`}>
        <label className={HISTORY_CONTROL_LABEL_CLASS}>
          <span className={HISTORY_CONTROL_LABEL_TEXT_CLASS}>Shifter (PIC)</span>
          <div className="[position:relative] [display:flex] [align-items:center] [width:100%]">
            <Search size={14} className="[position:absolute] [left:11px] [color:var(--ink-muted)] [pointer-events:none]" />
            <input
              className={HISTORY_SEARCH_INPUT_CLASS}
              list="shifter-suggestions"
              value={workflow.filters.pic}
              placeholder="Cari nama shifter / PIC..."
              onChange={(event) => workflow.setFilters((prev) => ({ ...prev, pic: event.target.value }))}
            />
            <datalist id="shifter-suggestions">
              <option value="Tahan Julianus Nadeak" />
              <option value="Yuha Azhari Simbolon" />
              <option value="Nicholas Bima Nooka Putra" />
              <option value="Pangondion Kurniawan Naibaho" />
              <option value="Natanael Tambun" />
              <option value="Agnes Siahaan" />
              <option value="Ade Yuri F. Damanik" />
              <option value="Muhammad Ihsanul Arifin" />
              <option value="Mhd. Galih Khairi" />
              <option value="Pedro Hutagaol" />
              <option value="Kristina Marbun" />
              <option value="Andri Agung Exaudi Sigiro" />
              <option value="Dimas Yudistira" />
              <option value="Tennov Pakpahan" />
            </datalist>
            {workflow.filters.pic && (
              <button
                type="button"
                className="[position:absolute] [right:8px] [display:inline-grid] [place-items:center] [width:18px] [height:18px] [background:transparent] [border:none] [border-radius:4px] [color:var(--ink-muted)] [cursor:pointer] [transition:all_0.12s_ease] [&:hover]:[background:rgba(255,_255,_255,_0.1)]! [&:hover]:[color:#ffffff]"
                title="Hapus filter Shifter"
                onClick={() => workflow.setFilters((prev) => ({ ...prev, pic: "" }))}
              >
                <X size={12} />
              </button>
            )}
          </div>
        </label>
      </div>

      {/* 4. Action Buttons */}
      <div className={HISTORY_ACTIONS_CLASS}>
        <button
          type="button"
          className={`button button-secondary ${HISTORY_ACTION_BUTTON_CLASS} [padding:0_14px]!`}
          disabled={workflow.loading || workflow.busy}
          onClick={() => void workflow.refresh()}
        >
          <RefreshCw size={13} className={workflow.loading ? "spin" : ""} />
          Muat ulang
        </button>

        {hasFilters && (
          <button
            type="button"
            className={`${HISTORY_ACTION_BUTTON_CLASS} ${HISTORY_RESET_BUTTON_CLASS}`}
            onClick={() => workflow.setFilters({ date: "", shift: "", pic: "" })}
          >
            <RotateCcw size={12} />
            Reset filter
          </button>
        )}
      </div>

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
