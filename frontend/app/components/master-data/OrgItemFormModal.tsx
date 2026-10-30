"use client";
import { useId, useRef, useState } from "react";
import { AlertCircle, Briefcase, Network } from "lucide-react";
import { Modal } from "@/app/components/ui/Modal";
import { ORG_STORES, OrgCatalogError, type OrgItem, type OrgKind } from "@/app/lib/org-catalog";
import { norm } from "@/app/lib/master-people";
import { ACTIVE_SEGMENTS, Field, FormFooter, FormHeader, Segmented, STATUS_HINTS, DiscardConfirm } from "./form-ui";
import { useUnsavedChangesGuard, useVisualViewport } from "./form-hooks";
import { inputClass } from "./master-ui";

interface Props { kind: OrgKind; item?: OrgItem; items: readonly OrgItem[]; onClose: () => void; onSaved: (item: OrgItem) => void }

const COPY: Record<OrgKind, { subtitle: string; namePlaceholder: string; nameHint: string; descriptionPlaceholder: string; descriptionHint: string }> = {
  position: {
    subtitle: "Jabatan kantor personel, terpisah dari peran operasional.",
    namePlaceholder: "mis. Senior Engineer",
    nameHint: "Nama yang tampil di daftar Personel dan Rekap per User.",
    descriptionPlaceholder: "mis. Menangani kasus kompleks dan membimbing engineer lain.",
    descriptionHint: "Tanggung jawab jabatan ini."
  },
  department: {
    subtitle: "Departemen tempat personel bernaung.",
    namePlaceholder: "mis. Network Operations Center",
    nameHint: "Nama yang tampil di daftar Personel.",
    descriptionPlaceholder: "mis. Pemantauan jaringan dan layanan 24 jam.",
    descriptionHint: "Cakupan kerja departemen ini."
  }
};

/** Add or edit a Jabatan or Departemen; saved in this browser (app/lib/org-catalog.ts). */
export function OrgItemFormModal({ kind, item, items, onClose, onSaved }: Props) {
  const store = ORG_STORES[kind], { label, noun } = store.config, copy = COPY[kind];
  const [start] = useState(() => ({ name: item?.name || "", description: item?.description || "", active: item?.active ?? true }));
  const [form, setForm] = useState(start);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmExit, setConfirmExit] = useState(false);
  const prefix = useId();
  const busy = useRef(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(start);
  const viewport = useVisualViewport(); useUnsavedChangesGuard(dirty);
  const change = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: "", form: "" }));
  };
  const requestClose = () => { if (busy.current) return; if (confirmExit) setConfirmExit(false); else if (dirty) setConfirmExit(true); else onClose(); };
  const duplicate = items.some(other => other.id !== item?.id && norm(other.name) === norm(form.name));
  const missing = !form.name.trim() ? [`Nama ${noun}`] : duplicate ? [`Nama ${noun} (sudah ada)`] : [];
  function submit() {
    if (busy.current) return;
    if (!form.name.trim() || duplicate) {
      setErrors({ name: !form.name.trim() ? `Nama ${noun} wajib diisi.` : `${label} "${form.name.trim()}" sudah ada.` });
      requestAnimationFrame(() => document.getElementById(`${prefix}-name`)?.focus());
      return;
    }
    busy.current = true;
    try {
      onSaved(item ? store.update(item.id, form) : store.create(form));
    } catch (error) {
      const field = error instanceof OrgCatalogError ? error.field : "form";
      setErrors({ [field]: error instanceof Error ? error.message : "Gagal menyimpan." });
    } finally {
      busy.current = false;
    }
  }
  const title = `${item ? "Ubah" : "Tambah"} ${noun}`;
  const Icon = kind === "position" ? Briefcase : Network;
  return (
    <Modal open onClose={requestClose} variant="master-form" viewport={viewport} label={title}>
      <FormHeader
        icon={<span
          aria-hidden="true"
          className="inline-grid size-9 shrink-0 place-items-center rounded-lg border border-sky-400/25 bg-sky-400/10 text-sky-300"
        >
          <Icon size={16} />
        </span>}
        title={title[0].toUpperCase() + title.slice(1)}
        subtitle={copy.subtitle}
        onClose={requestClose}
      />
      {confirmExit ? (
        <DiscardConfirm onKeep={() => setConfirmExit(false)} onDiscard={onClose} />
      ) : (
        <form className="flex min-h-0 flex-1 flex-col" noValidate onSubmit={event => { event.preventDefault(); submit(); }}>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 lg:p-6">
            {errors.form && (
              <p role="alert" className="flex items-start gap-2 rounded-lg border border-rose-400/30 bg-rose-950 p-3 text-sm text-rose-200">
                <AlertCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
                {errors.form}
              </p>
            )}
            <Field
              id={`${prefix}-name`}
              label={`Nama ${noun}`}
              required
              error={errors.name || (form.name.trim() && duplicate ? `${label} "${form.name.trim()}" sudah ada.` : "")}
              hint={copy.nameHint}
            >
              <input
                id={`${prefix}-name`}
                aria-invalid={!!errors.name || (!!form.name.trim() && duplicate)}
                aria-describedby={`${prefix}-name-help`}
                aria-required
                placeholder={copy.namePlaceholder}
                className={inputClass}
                value={form.name}
                maxLength={60}
                autoComplete="off"
                onChange={event => change("name", event.target.value)}
              />
            </Field>
            <Field id={`${prefix}-description`} label="Deskripsi" error={errors.description} hint={copy.descriptionHint}>
              <textarea
                id={`${prefix}-description`}
                aria-describedby={`${prefix}-description-help`}
                placeholder={copy.descriptionPlaceholder}
                className={`${inputClass} min-h-20 resize-y`}
                maxLength={200}
                value={form.description}
                onChange={event => change("description", event.target.value)}
              />
            </Field>
            <Field id={`${prefix}-active`} label="Status" required group hint={form.active ? STATUS_HINTS.active : STATUS_HINTS.inactive}>
              <Segmented
                id={`${prefix}-active`}
                label="Status"
                value={form.active ? "active" : "inactive"}
                options={ACTIVE_SEGMENTS}
                onChange={value => change("active", value === "active")}
              />
            </Field>
          </div>
          <FormFooter saving={false} missing={missing} onCancel={requestClose} />
        </form>
      )}
    </Modal>
  );
}
