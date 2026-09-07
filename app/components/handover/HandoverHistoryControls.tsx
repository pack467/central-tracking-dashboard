"use client";

import { Search, X, RefreshCw, RotateCcw, FileText, ChevronDown } from "lucide-react";
import { DatePicker } from "@/app/components/ui/DatePicker";
import type { useHandoverWorkflow } from "@/app/hooks/useHandoverWorkflow";
export type HandoverWorkflow = ReturnType<typeof useHandoverWorkflow>;

export function HandoverHistoryControls({ workflow }: { workflow: HandoverWorkflow }) {
  const hasFilters = Boolean(workflow.filters.date || workflow.filters.pic);

  return (
    <div className="handover-history-controls">
      <div className="history-control-item history-date-item">
        <label className="history-control-label">
          Tanggal
          <div style={{ minWidth: "150px", width: "100%" }}>
            <DatePicker
              value={workflow.filters.date}
              onChange={(date) => workflow.setFilters((prev) => ({ ...prev, date }))}
              placeholder="Pilih tanggal..."
            />
          </div>
        </label>
      </div>

      <div className="history-control-item history-search-item">
        <label className="history-control-label">
          PIC pengirim
          <div className="history-search-input-wrap">
            <Search size={14} className="history-search-icon" />
            <input
              value={workflow.filters.pic}
              placeholder="Cari nama PIC pengirim..."
              onChange={(event) => workflow.setFilters((prev) => ({ ...prev, pic: event.target.value }))}
            />
            {workflow.filters.pic && (
              <button
                type="button"
                className="history-search-clear-btn"
                title="Hapus filter PIC"
                onClick={() => workflow.setFilters((prev) => ({ ...prev, pic: "" }))}
              >
                <X size={12} />
              </button>
            )}
          </div>
        </label>
      </div>

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
            onClick={() => workflow.setFilters({ date: "", pic: "" })}
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

