"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, Ban, Trash2 } from "lucide-react";
import { Modal } from "@/app/components/ui/Modal";
import { buttonClass, inputClass, dangerBusyClass } from "./master-ui";
import { DialogBody, DialogError, DialogFooter, DialogHeader } from "./dialog-ui";

export interface DeleteCheck { canDelete: boolean; reason?: string; summary?: ReactNode }
interface Props {
  label: string;
  name: string;
  load: (signal: AbortSignal) => Promise<DeleteCheck>;
  onDelete: () => Promise<void>;
  onClose: () => void;
  onDeleted: () => void;
  alternative: string;
}

/** Hard delete is only for records that were never used; the adapter enforces the same rule. */
export function DeleteDialog({ label, name, load, onDelete, onClose, onDeleted, alternative }: Props) {
  const [check, setCheck] = useState<DeleteCheck>();
  const [error, setError] = useState("");
  const [typed, setTyped] = useState("");
  const [saving, setSaving] = useState(false);
  const [retry, setRetry] = useState(0);
  const busy = useRef(false), inputId = useId(), [loader] = useState(() => load);
  useEffect(
    
    
    () => {
      const controller = new AbortController();
      void loader(controller.signal).then(result => { if (!controller.signal.aborted) setCheck(result); }).catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Gagal memeriksa pemakaian."); });
      return () => controller.abort();
    },
    [loader, retry]
  );
  const matches = typed.trim().toLowerCase() === name.trim().toLowerCase() && !!name.trim();
  async function confirm() {
    if (busy.current || !check?.canDelete || !matches) return;
    busy.current = true; setSaving(true); setError("");
    try {
      await onDelete();
      onDeleted();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal menghapus.");
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  return (
    <Modal open variant="master-form" label={`Hapus ${label}`} onClose={() => { if (!busy.current) onClose(); }}>
      <DialogHeader
        icon={check && !check.canDelete ? <Ban size={18} aria-hidden="true" /> : <Trash2 size={18} aria-hidden="true" />}
        kicker={label}
        title="Hapus permanen"
        closeLabel="Tutup konfirmasi hapus"
        disabled={saving}
        onClose={onClose}
      />
      <DialogBody name={name}>
        {!check && !error && <p role="status" className="text-sm text-slate-400">Memeriksa pemakaian…</p>}
        {check && !check.canDelete && (
          <>
            <p role="alert" className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-950 p-3 text-sm text-amber-200">
              <AlertTriangle size={17} aria-hidden="true" className="mt-0.5 shrink-0" />
              {check.reason || `Sudah dipakai. Gunakan ${alternative}.`}
            </p>
            {check.summary}
            <p className="text-[12px] text-slate-400">Riwayat tetap tersimpan jika Anda memakai {alternative}.</p>
          </>
        )}
        {check?.canDelete && (
          <>
            {check.summary}
            <p className="flex items-start gap-2 rounded-lg border border-rose-400/30 bg-rose-950 p-3 text-sm text-rose-200"><AlertTriangle size={17} aria-hidden="true" className="mt-0.5 shrink-0" />Belum pernah dipakai. Penghapusan tidak dapat dibatalkan.</p>
            <div>
              <label htmlFor={inputId} className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">Ketik nama untuk konfirmasi</label>
              <input
                id={inputId}
                autoComplete="off"
                spellCheck={false}
                className={`${inputClass} mt-1.5`}
                value={typed}
                placeholder={name}
                onChange={event => setTyped(event.target.value)}
                onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void confirm(); } }}
              />
            </div>
          </>
        )}
        <DialogError error={error} canRetry={!check} onRetry={() => { setError(""); setRetry(value => value + 1); }} />
      </DialogBody>
      <DialogFooter>
        <button type="button" className={buttonClass} disabled={saving} onClick={onClose}>{check && !check.canDelete ? "Tutup" : "Batal"}</button>
        {check?.canDelete && (
          <button type="button" className={dangerBusyClass} disabled={saving || !matches} onClick={() => void confirm()}>
            {saving ? "Menghapus…" : "Hapus permanen"}
          </button>
        )}
      </DialogFooter>
    </Modal>
  );
}
