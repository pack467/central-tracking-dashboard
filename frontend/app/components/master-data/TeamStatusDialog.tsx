"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, Archive, Ban, RotateCcw, Users } from "lucide-react";
import { Modal } from "@/app/components/ui/Modal";
import { masterPeople, masterRoles } from "@/app/services/master-data-v2";
import type { Person, PersonUsage, Role, RoleUsage } from "@/app/types/master-data";
import { buttonClass, primaryClass, dangerBusyClass } from "./master-ui";
import { DialogBody, DialogError, DialogFooter, DialogHeader, AcknowledgeBox } from "./dialog-ui";

export type TeamTarget = { kind: "person"; row: Person; status: "active" | "inactive" | "archived" } | { kind: "role"; row: Omit<Role, "usageCount"> & { usageCount?: number }; status: "active" | "inactive" };
const STATUS_TEXT = { active: "Aktif", inactive: "Nonaktif", archived: "Arsip" } as const;

function Row({ label, value, tone }: { label: string; value: ReactNode; tone?: "warn" }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="text-slate-400">{label}</span>
      <span className={`font-dashboard-mono tabular-nums ${tone === "warn" ? "text-amber-200" : "text-slate-100"}`}>{value}</span>
    </li>
  );
}
export function PersonImpact({ usage }: { usage: PersonUsage }) {
  return (
    <ul className="space-y-1.5 rounded-xl border border-slate-700 bg-[#0f172a]/45 p-3 text-[12px]">
      <Row
        label="Leader organisasi / PIC proyek / sistem"
        value={`${usage.organizations.length} / ${usage.projects.length} / ${usage.systems.length}`}
      />
      <Row
        label="Tiket atas nama ini"
        value={`${usage.tickets} (${usage.activeTickets} aktif)`}
        tone={usage.activeTickets ? "warn" : undefined}
      />
      <Row label="Checkpoint monitoring" value={usage.checkpoints} />
      <Row label="Handover" value={usage.handovers} />
      <Row label="Jadwal shift (hari / minggu)" value={usage.scheduleEntries} tone={usage.scheduleEntries ? "warn" : undefined} />
    </ul>
  );
}

export function TeamStatusDialog({ target, onClose, onSaved, onOpenPeople }: { target: TeamTarget; onClose: () => void; onSaved: () => void; onOpenPeople?: (roleKey: string) => void }) {
  const restore = target.status === "active", busy = useRef(false);
  const [usage, setUsage] = useState<PersonUsage | RoleUsage>();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [retry, setRetry] = useState(0);
  const id = target.kind === "person" ? target.row.id : target.row.key;
  useEffect(
    
    
    () => {
      const controller = new AbortController();
      void (target.kind === "person" ? masterPeople.usage(id, controller.signal) : masterRoles.usage(id, controller.signal)).then(data => { if (!controller.signal.aborted) setUsage(data); }).catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Gagal memuat dampak."); });
      return () => controller.abort();
    },
    [target.kind, id, retry]
  );
  const blocked = !restore && !!usage && !usage.canDeactivate, reason = usage?.deactivateReason;
  async function save() {
    if (busy.current || !usage || blocked || !confirmed) return;
    busy.current = true; setSaving(true); setError("");
    try {
      await (target.kind === "person" ? masterPeople.setStatus(id, target.status) : masterRoles.setStatus(id, target.status));
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal menyimpan.");
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  const archiving = target.status === "archived", Tone = restore ? RotateCcw : archiving ? Archive : Ban;
  const title = `${restore ? (target.kind === "person" ? "Aktifkan" : "Pulihkan") : archiving ? "Arsipkan" : "Nonaktifkan"} ${target.kind === "person" ? "personel" : "peran"}`;
  const name = target.kind === "person" ? target.row.fullName : target.row.name;
  return (
    <Modal open variant="master-form" label={title} onClose={() => { if (!busy.current) onClose(); }}>
      <DialogHeader
        icon={<Tone size={18} aria-hidden="true" />}
        restore={restore}
        kicker={target.kind === "person" ? "Personel" : "Peran"}
        title={title}
        disabled={saving}
        onClose={onClose}
      />
      <DialogBody name={name}>
        <p className="text-[12px] text-slate-400">Status menjadi <span className="font-semibold text-slate-200">{STATUS_TEXT[target.status]}</span>.</p>
        {usage ? (
          <>
            {target.kind === "person" && <PersonImpact usage={usage as PersonUsage} />}
            {target.kind === "role" && (
              <ul className="space-y-1.5 rounded-xl border border-slate-700 bg-[#0f172a]/45 p-3 text-[12px]">
                <Row label="Personel aktif" value={(usage as RoleUsage).activePeople} tone={(usage as RoleUsage).activePeople ? "warn" : undefined} />
                <Row label="Personel nonaktif / arsip" value={(usage as RoleUsage).inactivePeople} />
              </ul>
            )}
            {blocked && (
              <p role="alert" className="flex items-start gap-2 rounded-lg border border-rose-400/30 bg-rose-950 p-3 text-sm text-rose-200">
                <AlertTriangle size={17} aria-hidden="true" className="mt-0.5 shrink-0" />
                {reason}
              </p>
            )}
            {blocked && target.kind === "role" && (usage as RoleUsage).activePeople > 0 && onOpenPeople && (
              <button type="button" className={buttonClass} onClick={() => onOpenPeople(target.row.key)}><Users size={15} aria-hidden="true" />Lihat {(usage as RoleUsage).activePeople} personel</button>
            )}
            {!blocked &&
              !restore &&
              target.kind === "person" &&
              ((usage as PersonUsage).activeTickets > 0 ||
                  (usage as PersonUsage).scheduleEntries > 0 ||
                  (usage as PersonUsage).projects.length + (usage as PersonUsage).systems.length + (usage as PersonUsage).organizations.length > 0) && (
              <p className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-950 p-3 text-sm text-amber-200"><AlertTriangle size={17} aria-hidden="true" className="mt-0.5 shrink-0" />Masih ada pekerjaan atas nama ini. Tetapkan penggantinya. Riwayat tetap terbaca, nama tampil dengan tag Nonaktif.</p>
            )}
            <p className="text-sm text-slate-300">
              {restore ? "Aktif kembali dan tersedia untuk penugasan baru." : "Tidak ditawarkan untuk penugasan baru. Riwayat tetap tersedia."}
            </p>
            {!blocked && <AcknowledgeBox checked={confirmed} onChange={setConfirmed}>Saya memahami dampaknya.</AcknowledgeBox>}
          </>
        ) : !error && <p role="status" className="text-sm text-slate-400">Memuat dampak…</p>}
        <DialogError error={error} canRetry={!usage} onRetry={() => { setError(""); setRetry(value => value + 1); }} />
      </DialogBody>
      <DialogFooter>
        <button type="button" className={buttonClass} disabled={saving} onClick={onClose}>Batal</button>
        <button
          type="button"
          className={restore ? primaryClass : dangerBusyClass}
          disabled={saving || !usage || blocked || !confirmed}
          onClick={() => void save()}
        >
          {saving ? "Menyimpan…" : restore ? "Pulihkan" : archiving ? "Ya, arsipkan" : "Ya, nonaktifkan"}
        </button>
      </DialogFooter>
    </Modal>
  );
}
