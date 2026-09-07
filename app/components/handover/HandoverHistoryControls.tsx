"use client";

import { DatePicker } from "@/app/components/ui/DatePicker";
import type { useHandoverWorkflow } from "@/app/hooks/useHandoverWorkflow";
export type HandoverWorkflow = ReturnType<typeof useHandoverWorkflow>;

export function HandoverHistoryControls({ workflow }: { workflow: HandoverWorkflow }) {
  return (
    <div className="handover-history-controls">
      <label>
        Tanggal
        <div style={{ minWidth: "150px" }}>
          <DatePicker
            value={workflow.filters.date}
            onChange={(date) => workflow.setFilters((prev) => ({ ...prev, date }))}
            placeholder="Pilih tanggal..."
          />
        </div>
      </label>
      <label>PIC pengirim<input value={workflow.filters.pic} placeholder="Cari nama PIC…" onChange={(event) => workflow.setFilters((prev) => ({ ...prev, pic: event.target.value }))} /></label>
      <button className="button button-secondary" disabled={workflow.loading || workflow.busy} onClick={() => void workflow.refresh()}>Muat ulang</button>
      {(workflow.filters.date || workflow.filters.pic) && <button className="text-button" onClick={() => workflow.setFilters({ date: "", pic: "" })}>Reset filter</button>}
      {workflow.error && <p className="handover-storage-error" role="alert">{workflow.error}</p>}
    </div>
  );
}

export function HandoverHistoryMore({ workflow }: { workflow: HandoverWorkflow }) {
  return <div className="handover-history-more">
    <span>{workflow.loading ? "Memuat catatan…" : `${workflow.records.length} dari ${workflow.total} catatan`}</span>
    {workflow.hasMore && <button className="button button-secondary" disabled={workflow.loading || workflow.busy} onClick={workflow.loadMore}>Muat lebih banyak</button>}
  </div>;
}
