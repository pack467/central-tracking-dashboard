"use client";
import { useId, useRef, useState } from "react";
import { AlertCircle, ChevronDown, Lock } from "lucide-react";
import { Modal } from "@/app/components/ui/Modal";
import { Select, MultiSelect } from "@/app/components/ui/Select";
import { ApiError } from "@/app/lib/api/errors";
import { nextFreeColor, resolveCategoryColor, type CategoryColorKey } from "@/app/lib/category-colors";
import { categoryKey, isSafeReferenceUrl, masterCode } from "@/app/lib/master-data-model";
import { MASTER_LABELS } from "@/app/lib/master-data-route";
import { masterDataV2 } from "@/app/services/master-data-v2";
import { ImpactSummary } from "./MasterStatusDialog";
import { Field, FormFooter, FormHeader, LogoField, Section, Segmented, STATUS_HINTS, type SegmentOption, DiscardConfirm } from "./form-ui";
import { useUnsavedChangesGuard, useVisualViewport } from "./form-hooks";
import { ColorField, CounterField, FixedCode } from "./category-form-ui";
import { EntityIconTile, LevelChip, SeverityBadge, buttonClass, primaryClass, inputClass, masterRowId, type MasterRow } from "./master-ui";
import type {
  MasterEntity,
  MasterImpact,
  MasterInputMap,
  MasterSnapshotV2,
  Organization,
  Project,
  Severity,
  System,
  TicketCategory
} from "@/app/types/master-data";
interface FormState {
  name: string;
  code: string;
  kind: string;
  shortName: string;
  description: string;
  status: string;
  organizationId: string;
  projectId: string;
  relatedClientIds: string[];
  leadUserId: string;
  picUserId: string;
  referenceUrl: string;
  logoUrl: string;
  picMode: string;
  contactName: string;
  email: string;
  phone: string;
  active: boolean;
  color: string;
  displayName: string;
}
interface Props {
  entity: MasterEntity;
  row?: MasterRow;
  catalog: MasterSnapshotV2;
  users: readonly { id: string; name: string; status?: "active" | "inactive" | "archived" }[];
  activeOrganizationId: string;
  onClose: () => void;
  onSave: (input: MasterInputMap[MasterEntity]) => Promise<void>;
}
function initial({ row, entity, catalog, activeOrganizationId }: Props): FormState {
  const org = entity === "organization" ? row as Organization | undefined : undefined;
  const project = entity === "project" ? row as Project | undefined : undefined;
  const system = entity === "system" ? row as System | undefined : undefined;
  const category = entity === "category" ? row as TicketCategory | undefined : undefined;
  const severity = entity === "severity" ? row as Severity | undefined : undefined;
  return {
    name: row && "name" in row ? row.name : "",
    code: row && "code" in row ? row.code : "",
    kind: org?.kind || "client",
    shortName: org?.shortName || project?.shortName || "",
    description: org?.description || project?.scope || system?.description || category?.description || severity?.description || "",
    status: org?.status || project?.status || system?.status || "active",
    organizationId: project?.organizationId ||
      (system ? catalog.projects.find(p => p.id === system.projectId)?.organizationId : undefined) ||
      (catalog.organizations.some(o => o.id === activeOrganizationId && o.status === "active") ? activeOrganizationId : ""),
    projectId: system?.projectId || "",
    relatedClientIds: project?.relatedClientIds || [],
    leadUserId: project?.leadUserId || "",
    picUserId: org?.picUserId || system?.picUserId || "",
    referenceUrl: system?.referenceUrl || "",
    logoUrl: org?.logoUrl || project?.logoUrl || system?.logoUrl || "",
    picMode: org?.picContact ? "external" : org?.picUserId ? "internal" : "none",
    contactName: org?.picContact?.name || "",
    email: org?.picContact?.email || "",
    phone: org?.picContact?.phone || "",
    active: category?.active ?? true,
    color: category ? resolveCategoryColor(category.key, catalog.categories).key : entity === "category" ? nextFreeColor(catalog.categories) : "",
    displayName: severity?.displayName || ""
  };
}
/** Fields rendered inside the collapsed "Tambahan" section. */
const ADDITIONAL = new Set(["picMode", "picUserId", "leadUserId", "relatedClientIds", "contactName", "email", "phone", "referenceUrl", "description"]);
function hasAdditional(start: FormState, entity: MasterEntity): boolean {
  if (entity === "organization")
    return !!(start.shortName || start.description || start.picMode !== "none" || start.contactName || start.email || start.phone);
  if (entity === "project") return !!(start.shortName || start.description || start.leadUserId || start.relatedClientIds.length);
  if (entity === "system") return !!(start.description || start.picUserId || start.referenceUrl);
  return !!start.description;
}
const ENTITY_HELP: Record<MasterEntity, string> = {
  organization: "Klien, mitra, atau tenant yang memiliki proyek dan sistem.",
  project: "Kontrak atau layanan milik sebuah organisasi.",
  system: "Aplikasi atau layanan yang dipantau di bawah sebuah proyek.",
  category: "Pengelompokan jenis tiket.",
  severity: "Tingkat tetap. Hanya nama tampil dan deskripsi yang bisa diubah.",
};
const ADDITIONAL_SUMMARY: Record<MasterEntity, string> = {
  organization: "Leader, deskripsi",
  project: "PIC, klien terkait, lingkup layanan",
  system: "PIC sistem, tautan referensi, deskripsi",
  category: "Deskripsi",
  severity: "Deskripsi",
};
const FIELD_LABELS: Record<string, string> = {
  name: "Nama",
  code: "Kode",
  organizationId: "Organisasi",
  projectId: "Proyek induk",
  displayName: "Nama tampil",
  picUserId: "Personel",
  contactName: "Nama kontak",
  email: "Email kontak",
  referenceUrl: "Referensi"
};
const PLACEHOLDERS: Record<MasterEntity, Partial<Record<string, string>>> = {
  organization: {
    name: "mis. PT Contoh Nusantara",
    code: "mis. CNU",
    shortName: "mis. Contoh",
    contactName: "mis. Budi Santoso",
    email: "nama@perusahaan.id",
    phone: "+62 811-0000-0010"
  },
  project: { name: "mis. Core Network Monitoring", code: "mis. CNM", shortName: "mis. Core Network" },
  system: { name: "mis. Billing Gateway", code: "mis. BILLING-GATEWAY", referenceUrl: "https://…" },
  category: { name: "mis. Gangguan Jaringan" },
  severity: { displayName: "mis. Kritis" }
};
const FIELD_HINTS: Record<MasterEntity, Partial<Record<string, string>>> = {
  organization: { code: "Singkatan unik. Dibuat otomatis dari nama, boleh diubah.", shortName: "Dipakai di tabel dan filter bila nama resmi panjang." },
  project: {
    code: "Singkatan unik dalam satu organisasi. Dibuat otomatis dari nama, boleh diubah.",
    shortName: "Dipakai di tabel dan filter bila nama panjang."
  },
  system: { code: "Dibuat otomatis dari nama, boleh diubah.", referenceUrl: "Tautan ke dashboard atau runbook sistem ini." },
  category: {},
  severity: { displayName: "Nama yang tampil di tiket dan grafik." }
};
const STATUS_OPTIONS: SegmentOption[] = [
  { value: "active", label: "Aktif", dot: "bg-emerald-400", active: "border-emerald-400/40 bg-emerald-400/15 text-emerald-200" },
  { value: "inactive", label: "Nonaktif", dot: "bg-slate-400", active: "border-slate-500 bg-slate-700/70 text-slate-100" },
  { value: "archived", label: "Arsip", dot: "bg-rose-400", active: "border-rose-400/40 bg-rose-400/15 text-rose-200" },
];
const CATEGORY_STATUS_OPTIONS: SegmentOption[] = [
  { value: "active", label: "Aktif", dot: "bg-emerald-400", active: "border-emerald-400/40 bg-emerald-400/15 text-emerald-200" },
  { value: "inactive", label: "Nonaktif", dot: "bg-slate-400", active: "border-slate-500 bg-slate-700/70 text-slate-100" },
];
export function MasterForm(props: Props) {
  const { entity, row, catalog, users, onClose, onSave } = props;
  const [start] = useState(() => initial(props));
  const [form, setForm] = useState(start);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [more, setMore] = useState(() => hasAdditional(start, entity));
  const [notice, setNotice] = useState("");
  const [pendingStatus, setPendingStatus] = useState<{ input: MasterInputMap[MasterEntity]; impact: MasterImpact }>();
  const prefix = useId();
  const busy = useRef(false);
  const customCode = useRef(!!form.code);
  const initialJson = JSON.stringify(start);
  const dirty = JSON.stringify(form) !== initialJson;
  const viewport = useVisualViewport(); useUnsavedChangesGuard(dirty);
  const id = row ? masterRowId(entity, row) : "";
  const parentLocked = entity === "project" && !!row && (catalog.systems.some(s => s.projectId === id) || !!(row as Project).legacy);
  const change = <K extends keyof FormState,>(key: K, value: FormState[K]) => {
    setForm(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: "", form: "" }));
  };
  const attrs = (key: string) => ({ id: `${prefix}-${key}`, "aria-invalid": !!errors[key], "aria-describedby": `${prefix}-${key}-help` });
  const requestClose = () => {
    if (busy.current) return;
    if (pendingStatus)
      setPendingStatus(undefined); else if (confirmExit) setConfirmExit(false); else if (dirty) setConfirmExit(true); else onClose();
  };
  // Only active people are offered for NEW assignments; a person already assigned stays selectable, tagged "Nonaktif".
  const assigned = new Set([start.picUserId, start.leadUserId].filter(Boolean));
  const choices = users.filter(user => !user.status || user.status === "active" || assigned.has(user.id)).map(user => ({ value: user.id, label: user.status && user.status !== "active" ? `${user.name} (Nonaktif)` : user.name }));
  /** Opens "Tambahan" when an error sits inside it, then focuses the first invalid field once it is rendered. */
  const reveal = (keys: string[]) => {
    if (keys.some(key => ADDITIONAL.has(key))) setMore(true);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const first = document.querySelector<HTMLElement>('form [aria-invalid="true"]');
      (first || document.getElementById(`${prefix}-${keys[0]}`))?.focus();
    }));
  };
  const orgChoices = catalog.organizations.filter(o => o.status === "active" || o.id === form.organizationId).map(o => ({ value: o.id, label: `${o.shortName || o.name}${o.status !== "active" ? " (Arsip/Nonaktif)" : ""}` }));
  const projectChoices = catalog.projects.filter(p => p.organizationId === form.organizationId && (p.status === "active" || p.id === form.projectId)).map(p => ({ value: p.id, label: `${p.code} — ${p.name}${p.status !== "active" ? " (Arsip)" : ""}` }));
  const statusChoices = [
    { value: "active", label: "Aktif" },
    ...(entity !== "project" ? [{ value: "inactive", label: "Nonaktif" }] : []),
    { value: "archived", label: "Arsip" }
  ];
  const textField = (key: "name" | "code" | "shortName" | "contactName" | "email" | "phone" | "referenceUrl" | "displayName", label: string, required = false, hint?: string) => (
    <Field id={`${prefix}-${key}`} label={label} required={required} error={errors[key]} hint={hint ?? FIELD_HINTS[entity][key]}>
      <input
        {...attrs(key)}
        aria-required={required}
        className={inputClass}
        placeholder={PLACEHOLDERS[entity][key]}
        autoComplete="off"
        onBlur={() => { if (form[key].trim()) setErrors(current => ({ ...current, [key]: validate()[key] || "" })); }}
        value={form[key]}
        maxLength={key === "displayName" ? 24 : key === "name" && entity === "category" ? 40 : key === "code" ? 32 : key === "referenceUrl" ? 2000 : 255}
        inputMode={key === "email" ? "email" : key === "phone" ? "tel" : undefined}
        onChange={event => {
          const value = event.target.value;
          if (key === "code") customCode.current = !!value;
          if (key === "name" && ["system", "organization", "project"].includes(entity) && !customCode.current) {
            setForm(current => ({ ...current, name: value, code: value.trim() ? masterCode(value) : "" }));
            setErrors(current => ({ ...current, name: "", code: "", form: "" }));
          }
          else
            change(key, value);
        }}
      />
      {(key === "displayName" || key === "name" && entity === "category") && (
        <p className="mt-1 text-right font-dashboard-mono text-[11px] tabular-nums text-slate-400" aria-hidden="true">{form[key].length}/{key === "displayName" ? 24 : 40}</p>
      )}
    </Field>
  );
  const selectField = (key: "kind" | "status" | "organizationId" | "projectId" | "picMode" | "picUserId" | "leadUserId", label: string, options: { value: string; label: string; disabled?: boolean }[], required = false, hint?: string, disabled = false) => (
    <Field id={`${prefix}-${key}`} label={label} required={required} error={errors[key]} hint={hint}>
      <Select
        {...attrs(key)}
        required={required}
        size="form"
        className="w-full"
        value={form[key]}
        options={options}
        disabled={disabled}
        placeholder={`Pilih ${label.toLowerCase()}`}
        onValueChange={value => {
          if (key === "organizationId") {
            const keepProject = catalog.projects.some(p => p.id === form.projectId && p.organizationId === value && p.status === "active");
            const notices: string[] = [];
            if (form.projectId && !keepProject) notices.push("Proyek induk dikosongkan karena tidak valid untuk organisasi ini.");
            if (form.relatedClientIds.includes(value)) notices.push("Klien terkait dikosongkan karena sama dengan organisasi pemilik.");
            setNotice(notices.join(" "));
            setForm(current => ({
                ...current,
                organizationId: value,
                relatedClientIds: current.relatedClientIds.filter(id => id !== value),
                projectId: keepProject ? current.projectId : ""
              }));
          } else if (key === "picMode") {
            const notices: string[] = [];
            if (value === "external" && form.picUserId) notices.push("Leader internal dikosongkan karena memakai kontak eksternal.");
            if (value === "internal" && (form.contactName || form.email || form.phone))
              notices.push("Kontak eksternal dikosongkan karena memakai Leader internal.");
            if (value === "none" && (form.picUserId || form.contactName || form.email || form.phone)) notices.push("Leader dikosongkan.");
            setNotice(notices.join(" "));
            setForm(current => ({
                ...current,
                picMode: value,
                picUserId: value === "internal" ? current.picUserId : "",
                contactName: value === "external" ? current.contactName : "",
                email: value === "external" ? current.email : "",
                phone: value === "external" ? current.phone : ""
              }));
            setErrors(current => ({ ...current, picMode: "", form: "" }));
          }
          else
            change(key, value);
        }}
      />
    </Field>
  );
  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    if (entity === "severity") {
      if (!form.displayName.trim()) next.displayName = "Nama tampil wajib diisi.";
    } else {
      if (!form.name.trim()) next.name = "Nama wajib diisi.";
      if (entity !== "category") {
        if (!form.code.trim() && entity !== "system") next.code = "Kode wajib diisi.";
        const duplicate = entity === "organization"
          ? catalog.organizations.some(o => o.id !== id && o.code.toLowerCase() === form.code.trim().toLowerCase())
          : entity === "project"
            ? catalog.projects.some(p => p.id !== id && p.organizationId === form.organizationId && p.code.toLowerCase() === form.code.trim().toLowerCase())
            : catalog.systems.some(s => s.id !== id && s.projectId === form.projectId && s.code.toLowerCase() === (form.code.trim() || masterCode(form.name)).toLowerCase());
        if (duplicate) next.code = "Kode sudah digunakan.";
      }
    }
    if (entity === "category" && catalog.categories.some(c => c.id !== id && c.name.toLowerCase() === form.name.trim().toLowerCase()))
      next.name = "Nama kategori sudah digunakan.";
    if ((entity === "project" || entity === "system") && !form.organizationId) next.organizationId = "Pilih organisasi.";
    if (entity === "system" && !form.projectId) next.projectId = "Pilih proyek.";
    if (entity === "organization" && form.picMode === "internal" && !form.picUserId) next.picUserId = "Pilih personel.";
    if (entity === "organization" && form.picMode === "external") {
      if (!form.contactName.trim()) next.contactName = "Nama kontak wajib diisi.";
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = "Format email tidak valid.";
    }
    if (form.referenceUrl && !isSafeReferenceUrl(form.referenceUrl.trim())) next.referenceUrl = "Gunakan URL http/https atau tautan aplikasi.";
    return next;
  }
  async function submit() {
    if (busy.current) return;
    const next = validate();
    if (Object.keys(next).length) {
      setErrors(next); reveal(Object.keys(next)); return;
    }
    let input: MasterInputMap[MasterEntity];
    if (entity === "organization")
      input = {
        kind: form.kind as Organization["kind"],
        name: form.name,
        code: form.code,
        shortName: form.shortName,
        description: form.description,
        logoUrl: form.logoUrl,
        picUserId: form.picMode === "internal" ? form.picUserId : null,
        picContact: form.picMode === "external" ? { name: form.contactName, email: form.email, phone: form.phone } : null,
        status: form.status as Organization["status"]
      }; else if (entity === "project")
      input = {
        organizationId: form.organizationId,
        name: form.name,
        code: form.code,
        shortName: form.shortName,
        scope: form.description,
        logoUrl: form.logoUrl,
        relatedClientIds: form.relatedClientIds,
        leadUserId: form.leadUserId || null,
        status: form.status as Project["status"]
      }; else if (entity === "system")
      input = {
        projectId: form.projectId,
        name: form.name,
        code: form.code,
        picUserId: form.picUserId || null,
        description: form.description,
        referenceUrl: form.referenceUrl,
        logoUrl: form.logoUrl,
        status: form.status as System["status"]
      }; else if (entity === "category") input = { name: form.name, description: form.description, color: form.color as CategoryColorKey, active: form.active };
else input = { displayName: form.displayName, description: form.description };
    if (row && entity !== "severity") {
      const status = entity === "category" ? form.active ? "active" : "inactive" : form.status;
      const currentStatus = entity === "category" ? ((row as TicketCategory).active ? "active" : "inactive") : (row as Organization | Project | System).status;
      if (status !== currentStatus) {
        busy.current = true; setSaving(true);
        try {
          const impact = await masterDataV2.getImpact(entity, id);
          if (status === "active" && !impact.parentActive) { setErrors({ status: impact.parentReason || "Induk belum aktif." }); return; }
          if (status !== "active") { setPendingStatus({ input, impact }); return; }
        } catch (cause) { setErrors({ form: cause instanceof Error ? cause.message : "Gagal memuat dampak." }); return; }
        finally { busy.current = false; setSaving(false); }
      }
    }
    await performSave(input);
  }
  async function performSave(input: MasterInputMap[MasterEntity]) {
    if (busy.current) return;
    busy.current = true; setSaving(true);
    try {
      await onSave(input);
    } catch (error) {
      const field = error instanceof ApiError && error.details && typeof error.details === "object" && "field" in error.details
        ? String(error.details.field).replace("picContact.name", "contactName").replace("picContact.email", "email")
        : "form";
      setErrors({ [pendingStatus ? "form" : field]: error instanceof Error ? error.message : "Gagal menyimpan." });
      reveal(pendingStatus ? [] : [field]);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  const missing = Object.keys(validate()).map(key => key === "name" && entity === "organization"
    ? "Nama resmi"
    : key === "picUserId" && entity === "organization" ? "Leader (personel)" : FIELD_LABELS[key] || key);
  const isSystem = entity === "system", hasLogo = entity === "organization" || entity === "project" || isSystem;
  const additionalDescriptionLabel = entity === "project" ? "Lingkup layanan" : entity === "system" ? "Deskripsi fungsi" : "Deskripsi";
  return (
    <Modal open onClose={requestClose} variant="master-form" viewport={viewport} label={`${row ? "Ubah" : "Tambah"} ${MASTER_LABELS[entity]}`}>
      <FormHeader
        icon={<EntityIconTile entity={entity} size="md" src={form.logoUrl} />}
        title={`${row ? "Ubah" : "Tambah"} ${MASTER_LABELS[entity]}`}
        subtitle={ENTITY_HELP[entity]}
        onClose={requestClose}
      />
      {confirmExit ? (
        <DiscardConfirm onKeep={() => setConfirmExit(false)} onDiscard={onClose} />
      ) : pendingStatus ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 lg:p-6">
            <div className="flex items-center gap-2">
              <span className="inline-grid size-9 place-items-center rounded-lg border border-amber-400/25 bg-amber-400/10 text-amber-300">
                <AlertCircle size={18} aria-hidden="true" />
              </span>
              <h3 className="text-base font-semibold text-slate-50">Ubah status data?</h3>
            </div>
            <ImpactSummary impact={pendingStatus.impact} />
            <p className="text-sm text-amber-200">
              {pendingStatus.impact.activeTickets || pendingStatus.impact.activeCheckpoints
                ? "Masih ada pekerjaan aktif. Pastikan penggantinya tersedia."
                : "Data tidak ditawarkan untuk pekerjaan baru. Riwayat tetap tersedia."}
            </p>
            {errors.form && (
              <p role="alert" className="flex items-start gap-2 rounded-lg border border-rose-400/30 bg-rose-950 p-3 text-sm text-rose-200">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                {errors.form}
              </p>
            )}
          </div>
          <footer
            className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-slate-700 bg-[#0f172a] px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] lg:px-6"
          >
            <button type="button" className={buttonClass} disabled={saving} onClick={() => setPendingStatus(undefined)}>Kembali</button>
            <button type="button" className={primaryClass} disabled={saving} onClick={() => void performSave(pendingStatus.input)}>
              {saving ? "Menyimpan…" : "Ya, simpan status"}
            </button>
          </footer>
        </div>
      ) : (
        <form
          className="flex min-h-0 flex-1 flex-col [&_button[data-select-trigger]]:h-11 [&_button[data-select-trigger]]:min-h-11 [&_button[data-select-trigger]]:text-base lg:[&_button[data-select-trigger]]:h-10 lg:[&_button[data-select-trigger]]:min-h-10 lg:[&_button[data-select-trigger]]:text-sm"
          noValidate
          onSubmit={event => { event.preventDefault(); void submit(); }}
        >
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 lg:p-6">
            {errors.form && (
              <p
                role="alert"
                tabIndex={-1}
                id={`${prefix}-form`}
                className="flex items-start gap-2 rounded-lg border border-rose-400/30 bg-rose-950 p-3 text-sm text-rose-200"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                {errors.form}
              </p>
            )}
            {notice && <p role="status" className="rounded-lg border border-amber-400/30 bg-amber-950 p-2.5 text-xs text-amber-200">{notice}</p>}
            {entity === "category" ? (
              <>
                {row && <FixedCode id={`${prefix}-key`} value={(row as TicketCategory).key} />}
                <Section title="Data utama">
                  <div className="grid grid-cols-1 gap-4">
                    {textField("name", "Nama", true)}
                    {!row && <FixedCode id={`${prefix}-key`} value={form.name.trim() ? categoryKey(form.name, catalog.categories.map(item => item.key)) : ""} />}
                    <CounterField
                      id={`${prefix}-description`}
                      label="Deskripsi"
                      value={form.description}
                      max={160}
                      rows={3}
                      placeholder="mis. Gangguan di luar rencana yang perlu ditangani segera."
                      hint="Membantu tim memilih kategori yang tepat."
                      error={errors.description}
                      onChange={value => change("description", value)}
                    />
                  </div>
                </Section>
                <Section title="Tampilan dan status">
                  <div className="grid grid-cols-1 gap-5">
                    <ColorField
                      id={`${prefix}-color`}
                      value={form.color}
                      name={form.name}
                      onChange={value => change("color", value)}
                      sameAs={catalog.categories.find(item => item.id !== id && resolveCategoryColor(item.key, catalog.categories).key === form.color)?.name}
                    />
                    <Field id={`${prefix}-active`} label="Status" required hint={form.active ? "Aktif: bisa dipilih di tiket baru." : "Nonaktif: tidak muncul di tiket baru. Riwayat tetap tersimpan."} group>
                      <Segmented
                        id={`${prefix}-active`}
                        label="Status"
                        value={form.active ? "active" : "inactive"}
                        options={CATEGORY_STATUS_OPTIONS}
                        onChange={value => change("active", value === "active")}
                      />
                    </Field>
                  </div>
                </Section>
              </>
            ) : entity === "severity" ? (
              <>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-slate-700/70 bg-[#0f172a]/50 px-4 py-3 text-xs text-slate-400">
                  <SeverityBadge code={(row as Severity).code} />
                  <span className="inline-flex items-center gap-1.5" title="Kode tetap">Kode <span className="font-dashboard-mono text-[12px] text-slate-200">{(row as Severity).code}</span><Lock size={12} aria-hidden="true" className="text-slate-500" /></span>
                  <span className="inline-flex items-center gap-1.5">Tingkat <LevelChip level={(row as Severity).level} /></span>
                </div>
                <Section title="Data utama">
                  <div className="grid grid-cols-1 gap-4">
                    {textField("displayName", "Nama tampil", true)}
                    <CounterField
                      id={`${prefix}-description`}
                      label="Deskripsi / panduan"
                      value={form.description}
                      max={200}
                      rows={3}
                      placeholder="mis. Layanan utama mati total. Tangani segera."
                      hint="Panduan kapan severity ini dipakai."
                      error={errors.description}
                      onChange={value => change("description", value)}
                    />
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      Pratinjau
                      <SeverityBadge code={(row as Severity).code} label={form.displayName.trim() || (row as Severity).displayName} />
                    </div>
                  </div>
                </Section>
              </>
            ) : (
            <Section title="Data utama">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {hasLogo && (
                  <div className="lg:col-span-2">
                    <LogoField
                      id={`${prefix}-logoUrl`}
                      entity={entity}
                      value={form.logoUrl}
                      error={errors.logoUrl}
                      onChange={value => change("logoUrl", value)}
                      onError={message => setErrors(current => ({ ...current, logoUrl: message }))}
                    />
                  </div>
                )}
                {entity === "organization" &&
                  selectField("kind", "Jenis", [{ value: "client", label: "Klien/Mitra" }, { value: "tenant", label: "Tenant" }], true)}
                {(entity === "project" || entity === "system") &&
                  selectField(
                    
                    
                    "organizationId",
                    "Organisasi",
                    orgChoices,
                    true,
                    parentLocked ? "Dikunci: proyek sudah dipakai." : entity === "project" ? "Organisasi pemilik proyek ini." : "Organisasi pemilik sistem ini.",
                    parentLocked
                  )}
                {isSystem &&
                  selectField(
                    "projectId",
                    "Proyek induk",
                    projectChoices,
                    true,
                    !form.organizationId ? "Pilih organisasi terlebih dahulu." : undefined,
                    !form.organizationId
                  )}
                {textField("name", entity === "organization" ? "Nama resmi" : "Nama", true)}
                {!["category", "severity"].includes(entity) && textField("code", "Kode", entity !== "system")}
                {(entity === "organization" || entity === "project") && textField("shortName", "Nama singkat")}
                <div className="lg:col-span-2">
                  <Field id={`${prefix}-status`} label="Status" required error={errors.status} hint={STATUS_HINTS[form.status]} group>
                    <Segmented
                      id={`${prefix}-status`}
                      label="Status"
                      value={form.status}
                      options={STATUS_OPTIONS.filter(option => statusChoices.some(choice => choice.value === option.value) && (row || option.value !== "archived"))}
                      onChange={value => change("status", value)}
                    />
                  </Field>
                </div>
              </div>
            </Section>
            )}
            {entity !== "category" && entity !== "severity" && (
            <div className="border-t border-slate-700/60 pt-4">
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-between gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 lg:min-h-9"
                aria-expanded={more}
                aria-controls={`${prefix}-additional`}
                onClick={() => setMore(!more)}
              >
                <span className="flex flex-wrap items-baseline gap-x-2 text-sm font-semibold text-slate-100">Tambahan<span className="text-xs font-normal normal-case tracking-normal text-slate-400">{ADDITIONAL_SUMMARY[entity]}</span></span>
                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className={`text-slate-400 transition-transform duration-150 motion-reduce:transition-none ${more ? "rotate-180" : ""}`}
                />
              </button>
              {more && (
                <div id={`${prefix}-additional`} className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {entity === "organization" && (
                    <div className="lg:col-span-2">
                      {selectField(
                        "picMode",
                        "Leader",
                        [
                          { value: "none", label: "Belum ditetapkan" },
                          { value: "internal", label: "Personel internal" },
                          { value: "external", label: "Kontak eksternal" }
                        ],
                        false,
                        "Penanggung jawab utama organisasi. Boleh dikosongkan."
                      )}
                    </div>
                  )}
                  {entity === "organization" && form.picMode === "internal" && (
                    <div className="lg:col-span-2">{selectField("picUserId", "Personel", choices, true)}</div>
                  )}
                  {entity === "organization" && form.picMode === "external" && (
                    <>
                      {textField("contactName", "Nama kontak", true)}
                      {textField("email", "Email kontak")}
                      <div className="lg:col-span-2">{textField("phone", "Telepon kontak")}</div>
                    </>
                  )}
                  {entity === "project" &&
                    selectField("leadUserId", "PIC", [{ value: "", label: "Belum ditetapkan" }, ...choices], false, "Boleh dibiarkan kosong.")}
                  {entity === "project" && (
                    <Field id={`${prefix}-relatedClientIds`} label="Klien/Mitra terkait">
                      <MultiSelect
                        id={`${prefix}-relatedClientIds`}
                        size="form"
                        className="w-full"
                        value={form.relatedClientIds}
                        onChange={value => change("relatedClientIds", value)}
                        options={catalog.organizations.filter(o => o.id !== form.organizationId && o.kind === "client" && (o.status === "active" || form.relatedClientIds.includes(o.id))).map(o => ({ value: o.id, label: o.shortName || o.name }))}
                        placeholder="Pilih klien/mitra"
                      />
                    </Field>
                  )}
                  {entity === "system" &&
                    selectField(
                      "picUserId",
                      "PIC sistem",
                      [{ value: "", label: "Ikut PIC proyek" }, ...choices],
                      false,
                      "Kosongkan untuk mengikuti PIC proyek."
                    )}
                  {entity === "system" && textField("referenceUrl", "Referensi dashboard/runbook")}
                  <div className="lg:col-span-2">
                    <Field id={`${prefix}-description`} label={additionalDescriptionLabel} error={errors.description}>
                      <textarea
                        {...attrs("description")}
                        className={`${inputClass} min-h-24 resize-y`}
                        maxLength={2000}
                        value={form.description}
                        onChange={event => change("description", event.target.value)}
                      />
                    </Field>
                  </div>
                </div>
              )}
            </div>
            )}
          </div>
          <FormFooter saving={saving} missing={missing} onCancel={requestClose} />
        </form>
      )}
    </Modal>
  );
}
