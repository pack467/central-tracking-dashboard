"use client";
import { useId, useRef, useState } from "react";
import { AlertCircle, Lock, ShieldCheck } from "lucide-react";
import { Modal } from "@/app/components/ui/Modal";
import { ApiError } from "@/app/lib/api/errors";
import { masterId } from "@/app/lib/master-data-model";
import { norm } from "@/app/lib/master-people";
import { masterRoles } from "@/app/services/master-data-v2";
import type { Role } from "@/app/types/master-data";
import { ACTIVE_SEGMENTS, Field, FormFooter, FormHeader, Segmented, STATUS_HINTS, DiscardConfirm } from "./form-ui";
import { useUnsavedChangesGuard, useVisualViewport } from "./form-hooks";
import { inputClass } from "./master-ui";

interface Props { role?: Role; roles: readonly Omit<Role, "usageCount">[]; onClose: () => void; onSaved: (role: Role) => void }

export function RoleFormModal({ role, roles, onClose, onSaved }: Props) {
  const [start] = useState(() => ({ name: role?.name || "", description: role?.description || "", active: role?.active ?? true }));
  const [form, setForm] = useState(start);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [requestKey] = useState(() => masterId("request"));
  const prefix = useId();
  const busy = useRef(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(start);
  const viewport = useVisualViewport(); useUnsavedChangesGuard(dirty);
  const change = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: "", form: "" }));
  };
  const requestClose = () => { if (busy.current) return; if (confirmExit) setConfirmExit(false); else if (dirty) setConfirmExit(true); else onClose(); };
  const duplicate = roles.some(item => item.key !== role?.key && norm(item.name) === norm(form.name));
  const missing = !form.name.trim() ? ["Nama peran"] : duplicate ? ["Nama peran (sudah ada)"] : [];
  async function submit() {
    if (busy.current) return;
    if (!form.name.trim() || duplicate) {
      setErrors({ name: !form.name.trim() ? "Nama peran wajib diisi." : `Peran "${form.name.trim()}" sudah ada.` });
      requestAnimationFrame(() => document.getElementById(`${prefix}-name`)?.focus());
      return;
    }
    busy.current = true; setSaving(true);
    try {
      onSaved(role ? await masterRoles.update(role.key, form, requestKey) : await masterRoles.create(form, requestKey));
    } catch (error) {
      const field = error instanceof ApiError && error.details && typeof error.details === "object" && "field" in error.details
        ? String(error.details.field)
        : "form";
      setErrors(
        
        
        { [["name", "description", "active"].includes(field) ? field : "form"]: error instanceof Error ? error.message : "Gagal menyimpan." }
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  const title = `${role ? "Ubah" : "Tambah"} peran`;
  return (
    <Modal open onClose={requestClose} variant="master-form" viewport={viewport} label={title}>
      <FormHeader
        icon={<span
          aria-hidden="true"
          className="inline-grid size-9 shrink-0 place-items-center rounded-lg border border-violet-400/25 bg-violet-400/10 text-violet-300"
        >
          <ShieldCheck size={16} />
        </span>}
        title={title[0].toUpperCase() + title.slice(1)}
        subtitle="Peran operasional dipakai untuk mengelompokkan personel."
        onClose={requestClose}
      />
      {confirmExit ? (
        <DiscardConfirm onKeep={() => setConfirmExit(false)} onDiscard={onClose} />
      ) : (
        <form className="flex min-h-0 flex-1 flex-col" noValidate onSubmit={event => { event.preventDefault(); void submit(); }}>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 lg:p-6">
            {errors.form && (
              <p role="alert" className="flex items-start gap-2 rounded-lg border border-rose-400/30 bg-rose-950 p-3 text-sm text-rose-200">
                <AlertCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
                {errors.form}
              </p>
            )}
            {role?.protected && (
              <p role="status" className="flex items-start gap-2 rounded-lg border border-slate-600 bg-slate-800/70 p-3 text-[12px] text-slate-300"><Lock size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-slate-400" />Peran bawaan dipakai logika aplikasi. Nama boleh diubah; tidak dapat dinonaktifkan atau dihapus.</p>
            )}
            <Field
              id={`${prefix}-name`}
              label="Nama peran"
              required
              error={errors.name || (form.name.trim() && duplicate ? `Peran "${form.name.trim()}" sudah ada.` : "")}
              hint="Nama yang tampil di Team Roster dan filter."
            >
              <input
                id={`${prefix}-name`}
                aria-invalid={!!errors.name || (!!form.name.trim() && duplicate)}
                aria-describedby={`${prefix}-name-help`}
                aria-required
                placeholder="mis. Supervisor"
                className={inputClass}
                value={form.name}
                maxLength={40}
                autoComplete="off"
                onChange={event => change("name", event.target.value)}
              />
            </Field>
            <Field id={`${prefix}-description`} label="Deskripsi" error={errors.description} hint="Tugas atau tanggung jawab peran ini.">
              <textarea
                id={`${prefix}-description`}
                aria-describedby={`${prefix}-description-help`}
                placeholder="mis. Mengawasi jalannya shift dan menyetujui handover."
                className={`${inputClass} min-h-20 resize-y`}
                maxLength={200}
                value={form.description}
                onChange={event => change("description", event.target.value)}
              />
            </Field>
            <Field
              id={`${prefix}-active`}
              label="Status"
              required
              group
              hint={role?.protected ? "Peran bawaan selalu aktif." : form.active ? STATUS_HINTS.active : STATUS_HINTS.inactive}
            >
              <Segmented
                id={`${prefix}-active`}
                label="Status"
                disabled={!!role?.protected}
                value={form.active ? "active" : "inactive"}
                options={ACTIVE_SEGMENTS}
                onChange={value => change("active", value === "active")}
              />
            </Field>
            {role && (
              <p className="text-[11px] text-slate-400">Kunci tetap: <span className="font-dashboard-mono text-slate-300">{role.key}</span>. Mengganti nama hanya mengubah tampilan.</p>
            )}
          </div>
          <FormFooter saving={saving} missing={missing} onCancel={requestClose} />
        </form>
      )}
    </Modal>
  );
}
