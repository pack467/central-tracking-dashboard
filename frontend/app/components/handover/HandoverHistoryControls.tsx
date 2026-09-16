"use client";

import { Search, X, RefreshCw, RotateCcw, FileText, ChevronDown } from "lucide-react";
import { DatePicker } from "@/app/components/ui/DatePicker";
import type { useHandoverWorkflow } from "@/app/hooks/useHandoverWorkflow";
export type HandoverWorkflow = ReturnType<typeof useHandoverWorkflow>;

export function HandoverHistoryControls({ workflow }: { workflow: HandoverWorkflow }) {
  const hasFilters = Boolean(workflow.filters.date || workflow.filters.shift || workflow.filters.pic);

  return (
    <div className="handover-history-controls">
      {/* 1. Filter Tanggal */}
      <div className="history-control-item history-date-item">
        <label className="history-control-label">
          <span className="history-control-label-text">Tanggal</span>
          <div className="history-date-picker-wrap">
            <DatePicker
              value={workflow.filters.date}
              onChange={(date) => workflow.setFilters((prev) => ({ ...prev, date }))}
              placeholder="Pilih tanggal..."
            />
          </div>
        </label>
      </div>

      {/* 2. Filter Shift */}
      <div className="history-control-item history-shift-item">
        <label className="history-control-label">
          <span className="history-control-label-text">Shift</span>
          <div className="history-shift-select-wrap">
            <select
              className="history-shift-select"
              value={workflow.filters.shift}
              onChange={(event) => workflow.setFilters((prev) => ({ ...prev, shift: event.target.value }))}
              aria-label="Filter berdasarkan shift"
            >
              <option value="">Semua Shift</option>
              <optgroup label="Shift Spesifik">
                <option value="subuh">Shift Subuh</option>
                <option value="pagi">Shift Pagi</option>
                <option value="malam">Shift Malam</option>
              </optgroup>
              <optgroup label="Rotasi Serah Terima">
                <option value="subuh → pagi">Subuh → Pagi</option>
                <option value="pagi → malam">Pagi → Malam</option>
                <option value="malam → subuh">Malam → Subuh</option>
              </optgroup>
            </select>
            <ChevronDown size={14} className="history-shift-chevron" aria-hidden="true" />
          </div>
        </label>
      </div>

      {/* 3. Filter Shifter (PIC) */}
      <div className="history-control-item history-search-item">
        <label className="history-control-label">
          <span className="history-control-label-text">Shifter (PIC)</span>
          <div className="history-search-input-wrap">
            <Search size={14} className="history-search-icon" />
            <input
              list="shifter-suggestions"
              value={workflow.filters.pic}
              placeholder="Cari nama shifter / PIC..."
              onChange={(event) => workflow.setFilters((prev) => ({ ...prev, pic: event.target.value }))}
            />
            <datalist id="shifter-suggestions">
              <option value="Mhd. Galih Khairi" />
              <option value="M. Ihsanul Arifin" />
              <option value="Pangondian Kurniawan" />
              <option value="Dedi Prasetyo" />
              <option value="Agnes" />
              <option value="Kristina Marbun" />
              <option value="Natanael" />
            </datalist>
            {workflow.filters.pic && (
              <button
                type="button"
                className="history-search-clear-btn"
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
      <div className="history-control-actions">
        <button
          type="button"
          className="button button-secondary history-refresh-btn"
          disabled={workflow.loading || workflow.busy}
          onClick={() => void workflow.refresh()}
        >
          <RefreshCw size={13} className={workflow.loading ? "spin" : ""} />
          Muat ulang
        </button>

        {hasFilters && (
          <button
            type="button"
            className="history-reset-btn"
            onClick={() => workflow.setFilters({ date: "", shift: "", pic: "" })}
          >
            <RotateCcw size={12} />
            Reset filter
          </button>
        )}
      </div>

      {workflow.error && (
        <p className="handover-storage-error" role="alert" style={{ width: "100%", margin: "4px 0 0" }}>
          {workflow.error}
        </p>
      )}
    </div>
  );
}

export function HandoverHistoryMore({ workflow }: { workflow: HandoverWorkflow }) {
  return (
    <div className="handover-history-more">
      <div className="history-more-info">
        <FileText size={14} style={{ color: "var(--ink-muted)" }} />
        <span>
          {workflow.loading ? "Memuat catatan…" : `${workflow.records.length} dari ${workflow.total} catatan`}
        </span>
      </div>
      {workflow.hasMore && (
        <button
          type="button"
          className="button button-secondary history-load-more-btn"
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

