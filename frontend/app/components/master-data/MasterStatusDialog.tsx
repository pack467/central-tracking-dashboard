"use client";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Archive, RotateCcw } from "lucide-react";
import { Modal } from "@/app/components/ui/Modal";
import { masterDataV2 } from "@/app/services/master-data-v2";
import { MASTER_LABELS } from "@/app/lib/master-data-route";
import type { MasterEntity, MasterImpact } from "@/app/types/master-data";
import { MASTER_DATA_P0_ENABLED } from "@/app/lib/master-data-flags";
import { MasterBadge, buttonClass, masterRowId, masterRowName, masterRowStatus, type MasterRow, dangerBusyClass } from "./master-ui";
import { DialogBody, DialogError, DialogFooter, DialogHeader, AcknowledgeBox } from "./dialog-ui";
const primaryClass = "inline-flex h-11 min-h-11 items-center justify-center gap-2 rounded-[10px] bg-sky-400 px-4 text-sm font-bold text-white transition-colors duration-150 hover:bg-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f172a] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none lg:h-10 lg:min-h-10";
export function ImpactSummary({ impact }: { impact: MasterImpact }) {
  const rows = [["Tiket", impact.tickets, impact.activeTickets], ["Checkpoint", impact.checkpoints, impact.activeCheckpoints], ["Handover", impact.handovers || 0, impact.activeHandovers || 0]] as const;
  const source = impact.relations
    ? impact.relations.tickets.bySource.id + impact.relations.checkpoints.bySource.id + impact.relations.handovers.bySource.id
    : 0;
  const mapped = impact.relations
    ? impact.relations.tickets.bySource.mapped + impact.relations.checkpoints.bySource.mapped + impact.relations.handovers.bySource.mapped
    : 0;
  const unclear = impact.relations
    ? impact.relations.tickets.bySource.unclear + impact.relations.checkpoints.bySource.unclear + impact.relations.handovers.bySource.unclear
    : 0;
  return (
    <div className="rounded-xl border border-slate-700 bg-[#0f172a]/45 p-3">
      <div className="grid grid-cols-3 divide-x divide-slate-700/70">
        {rows.map(([label, total, active]) => (
          <div key={label} className="px-2 text-center first:pl-0 last:pr-0">
            <strong className="block font-dashboard-mono text-lg font-semibold tabular-nums text-slate-50">{total}</strong>
            <span className="block text-[11px] text-slate-300">{label}</span>
            <span className="block text-[11px] text-slate-400">{active} aktif</span>
          </div>
        ))}
      </div>
      {MASTER_DATA_P0_ENABLED && (
        <ul className="mt-3 space-y-1.5 border-t border-slate-700/60 pt-2.5 text-[11.5px]">
          <li className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-slate-400"><span aria-hidden="true" className="size-1.5 rounded-full bg-slate-400" />Lewat ID</span>
            <span className="font-dashboard-mono tabular-nums text-slate-200">{source}</span>
          </li>
          <li className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-slate-400"><span aria-hidden="true" className="size-1.5 rounded-full bg-sky-400" />Pemetaan</span>
            <span className="font-dashboard-mono tabular-nums text-sky-200">{mapped}</span>
          </li>
          <li className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-slate-400"><span aria-hidden="true" className="size-1.5 rounded-full bg-amber-400" />Belum jelas</span>
            <span className="font-dashboard-mono tabular-nums text-amber-200">{unclear}</span>
          </li>
        </ul>
      )}
    </div>
  );
}
export function MasterStatusDialog({ entity, row, onClose, onSaved }: { entity: MasterEntity; row: MasterRow; onClose: () => void; onSaved: (row: MasterRow) => void }) {
  const id = masterRowId(entity, row), restore = masterRowStatus(entity, row) !== "active", busy = useRef(false);
  const [impact, setImpact] = useState<MasterImpact>();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [retry, setRetry] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  useEffect(
    
    
    () => {
      const controller = new AbortController();
      void masterDataV2.getImpact(entity, id, controller.signal).then(data => { if (!controller.signal.aborted) setImpact(data); }).catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Gagal memuat dampak"); });
      return () => controller.abort();
    },
    [entity, id, retry]
  );
  async function save() {
    if (busy.current || !impact || restore && !impact.parentActive || !confirmed) return;
    busy.current = true; setSaving(true); setError("");
    try {
      const updated = await masterDataV2.setStatus(entity, id, restore ? "active" : entity === "category" ? "inactive" : "archived");
      onSaved(updated);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal menyimpan");
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  const activeWork = !!(impact && (impact.activeTickets > 0 || impact.activeCheckpoints > 0 || (impact.activeHandovers || 0) > 0));
  const Tone = restore ? RotateCcw : Archive;
  return (
    <Modal open variant="master-form" label={restore ? "Pulihkan data" : "Arsipkan data"} onClose={() => { if (!busy.current) onClose(); }}>
      <DialogHeader
        icon={<Tone size={18} aria-hidden="true" />}
        restore={restore}
        kicker={MASTER_LABELS[entity]}
        title={restore ? "Pulihkan data" : "Arsipkan data"}
        disabled={saving}
        onClose={onClose}
      />
      <DialogBody name={masterRowName(entity, row)}>
        {impact ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <MasterBadge value={impact.recordStatus || masterRowStatus(entity, row)} />
              {impact.parentStatus && (
                <span className="text-[11.5px] text-slate-400">Induk: <span className="font-semibold text-slate-200">{impact.parentStatus === "active" ? "Aktif" : impact.parentStatus === "inactive" ? "Nonaktif" : "Arsip"}</span></span>
              )}
            </div>
            <ImpactSummary impact={impact} />
            {!restore && activeWork && (
              <p className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-950 p-3 text-sm text-amber-200"><AlertTriangle size={17} className="mt-0.5 shrink-0" />Masih ada pekerjaan aktif terkait. Pastikan penggantinya tersedia sebelum mengarsipkan.</p>
            )}
            {MASTER_DATA_P0_ENABLED && !impact.coverageComplete && (
              <p className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-950 p-3 text-sm text-amber-200"><AlertTriangle size={17} className="mt-0.5 shrink-0" />Cakupan referensi belum lengkap. Angka 0 belum tentu berarti tidak pernah dipakai.</p>
            )}
            {restore && !impact.parentActive && (
              <p role="alert" className="flex items-start gap-2 rounded-lg border border-rose-400/30 bg-rose-950 p-3 text-sm text-rose-200">
                <AlertTriangle size={17} className="mt-0.5 shrink-0" />
                {impact.parentReason || "Induk belum aktif."}
              </p>
            )}
            {restore ? (
              <p className="text-sm text-slate-300">
                {impact.parentActive
                  ? "Data aktif akan tersedia untuk pekerjaan baru."
                  : "Pulihkan induk terlebih dahulu sebelum record ini dapat dipakai untuk pekerjaan baru."}
              </p>
            ) : (
              <p className="text-sm text-slate-300">Riwayat tetap tersedia. Data ini tidak ditawarkan untuk pekerjaan baru.</p>
            )}
            <AcknowledgeBox checked={confirmed} onChange={setConfirmed}>Saya memahami dampak {restore ? "pemulihan" : "arsip"} ini.</AcknowledgeBox>
            {MASTER_DATA_P0_ENABLED && impact.unclearReferences ? (
              <p className="text-[11px] text-slate-400">{impact.unclearReferences} referensi lama belum dipetakan.</p>
            ) : null}
            {impact.examples && impact.examples.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">Contoh penggunaan</p>
                <ul className="mt-2 space-y-1.5 text-xs text-slate-300">
                  {impact.examples.slice(0, 3).map(example => (
                    <li key={example.recordRef} className="flex items-start gap-2">
                      <span aria-hidden="true" className="mt-1.5 size-1 shrink-0 rounded-full bg-slate-500" />
                      <span className="min-w-0 truncate">{example.label} <span className="text-slate-400">({example.sourceType === "ticket" ? "tiket" : example.sourceType === "checkpoint" ? "checkpoint" : "handover"}{example.active ? " · aktif" : ""})</span></span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : !error && <p role="status" className="text-sm text-slate-400">Memuat dampak…</p>}
        <DialogError error={error} canRetry={!impact} onRetry={() => { setError(""); setRetry(value => value + 1); }} />
      </DialogBody>
      <DialogFooter>
        <button type="button" className={buttonClass} disabled={saving} onClick={onClose}>Batal</button>
        <button
          type="button"
          className={restore ? primaryClass : dangerBusyClass}
          disabled={saving || !impact || !confirmed || restore && !impact.parentActive}
          onClick={() => void save()}
        >
          {saving ? "Menyimpan…" : restore ? "Pulihkan" : "Ya, arsipkan"}
        </button>
      </DialogFooter>
    </Modal>
  );
}



