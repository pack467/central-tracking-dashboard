"use client";
import { useId, useRef, useState } from "react";
import { AlertCircle, ChevronDown, Users } from "lucide-react";
import { Modal } from "@/app/components/ui/Modal";
import { Select } from "@/app/components/ui/Select";
import { DateField } from "@/app/components/ui/DateField";
import { ApiError } from "@/app/lib/api/errors";
import { masterId } from "@/app/lib/master-data-model";
import { EMAIL_PATTERN, SHIFT_KEYS, SHIFT_LABELS, norm } from "@/app/lib/master-people";
import { masterPeople } from "@/app/services/master-data-v2";
import type { Person, PersonInput, Role, ShiftKey } from "@/app/types/master-data";
import { Field, FormFooter, FormHeader, Section, Segmented, STATUS_HINTS, STATUS_SEGMENTS, DiscardConfirm } from "./form-ui";
import { useUnsavedChangesGuard, useVisualViewport } from "./form-hooks";
import { inputClass } from "./master-ui";
import { wibDateString } from "@/app/lib/wib";

interface FormState {
  fullName: string;
  employeeId: string;
  email: string;
  phone: string;
  roleKey: string;
  defaultShift: string;
  joinDate: string;
  status: string;
  notes: string;
}
interface Props {
  person?: Person;
  roles: readonly Omit<Role, "usageCount">[];
  people: readonly Person[];
  onClose: () => void;
  onSaved: (person: Person) => void;
}
function initial({ person, roles }: Props): FormState {
  return {
    fullName: person?.fullName || "",
    employeeId: person?.employeeId || "",
    email: person?.email || "",
    phone: person?.phone || "",
    roleKey: person?.roleKey || roles.find(role => role.active)?.key || "",
    defaultShift: person?.defaultShift || "",
    joinDate: person?.joinDate || "",
    status: person?.status === "archived" ? "inactive" : person?.status || "active",
    notes: person?.notes || ""
  };
}
const PLACEHOLDERS: Partial<Record<keyof FormState, string>> = { fullName: "mis. Budi Santoso", employeeId: "mis. EMP-1020", email: "nama@perusahaan.id", phone: "+62 811-0000-0010" };
const LABELS: Record<string, string> = { fullName: "Nama lengkap", employeeId: "ID pegawai", email: "Email", roleKey: "Peran", joinDate: "Tanggal bergabung" };
const FIELDS = ["fullName", "employeeId", "email", "phone", "roleKey", "defaultShift", "joinDate", "status", "notes"] as const;

/** One form for adding and editing people, used by Master Data and the Team Roster. Only Pengelola should reach it; the adapter rejects everyone else with 403. */
export function PersonFormModal(props: Props) {
  const { person, roles, people, onClose, onSaved } = props;
  const [start] = useState(() => initial(props));
  const [form, setForm] = useState(start);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [more, setMore] = useState(!!start.notes);
  const [requestKey] = useState(() => masterId("request"));
  const prefix = useId();
  const todayYMD = wibDateString();
  const busy = useRef(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(start);
  const viewport = useVisualViewport(); useUnsavedChangesGuard(dirty);
  const change = (key: keyof FormState, value: string) => {
    setForm(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: "", form: "" }));
  };
  const attrs = (key: keyof FormState) => ({ id: `${prefix}-${key}`, "aria-invalid": !!errors[key], "aria-describedby": `${prefix}-${key}-help` });
  const requestClose = () => { if (busy.current) return; if (confirmExit) setConfirmExit(false); else if (dirty) setConfirmExit(true); else onClose(); };
  const others = people.filter(item => item.id !== person?.id);
  const roleOptions = roles.filter(role => role.active || role.key === person?.roleKey).map(role => ({ value: role.key, label: role.active ? role.name : `${role.name} (Nonaktif)` }));
  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!form.fullName.trim()) next.fullName = "Nama lengkap wajib diisi.";
    if (!form.employeeId.trim())
      next.employeeId = "ID pegawai wajib diisi."; else if (others.some(item => norm(item.employeeId) === norm(form.employeeId)))
      next.employeeId = `ID pegawai "${form.employeeId.trim()}" sudah digunakan.`;
    if (!form.email.trim()) next.email = "Email wajib diisi.";
    else if (!EMAIL_PATTERN.test(form.email.trim())) next.email = "Format email tidak valid.";
    else if (others.some(item => norm(item.email) === norm(form.email))) next.email = `Email "${form.email.trim()}" sudah digunakan.`;
    if (!form.roleKey) next.roleKey = "Pilih peran operasional.";
    if (!form.joinDate) next.joinDate = "Tanggal bergabung wajib diisi.";
    return next;
  }
  function focusFirst(keys: string[]) {
    // A field inside the collapsed "Tambahan" section opens it first, then takes focus.
    if (keys.includes("notes")) setMore(true);
    requestAnimationFrame(() => {
      const key = keys[0];
      const node = document.querySelector<HTMLElement>(
        `[id="${prefix}-${key}"]`
      ) ||
        document.querySelector<HTMLElement>('form [aria-invalid="true"]');
      node?.focus();
    });
  }
  async function submit() {
    if (busy.current) return;
    const next = validate();
    if (Object.keys(next).length) { setErrors(next); focusFirst(FIELDS.filter(key => next[key])); return; }
    const input: PersonInput = {
      fullName: form.fullName,
      employeeId: form.employeeId,
      email: form.email,
      phone: form.phone,
      roleKey: form.roleKey,
      defaultShift: (form.defaultShift || null) as ShiftKey | null,
      joinDate: form.joinDate,
      status: form.status as Person["status"],
      notes: form.notes
    };
    busy.current = true; setSaving(true);
    try {
      onSaved(person ? await masterPeople.update(person.id, input, requestKey) : await masterPeople.create(input, requestKey));
    } catch (error) {
      const field = error instanceof ApiError && error.details && typeof error.details === "object" && "field" in error.details
        ? String(error.details.field)
        : "form";
      const key = (FIELDS as readonly string[]).includes(field) ? field : "form";
      setErrors({ [key]: error instanceof Error ? error.message : "Gagal menyimpan." });
      focusFirst(key === "form" ? [] : [key]);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  const missing = Object.keys(validate()).map(key => LABELS[key] || key), title = `${person ? "Ubah" : "Tambah"} personel`;
  const text = (key: "fullName" | "employeeId" | "email" | "phone", label: string, required = false, hint?: string) => (
    <Field id={`${prefix}-${key}`} label={label} required={required} error={errors[key]} hint={hint}>
      <input
        {...attrs(key)}
        aria-required={required}
        className={inputClass}
        placeholder={PLACEHOLDERS[key]}
        onBlur={() => { if (form[key].trim()) setErrors(current => ({ ...current, [key]: validate()[key] || "" })); }}
        value={form[key]}
        maxLength={key === "email" ? 255 : key === "fullName" ? 120 : key === "employeeId" ? 40 : 50}
        inputMode={key === "email" ? "email" : key === "phone" ? "tel" : undefined}
        autoComplete="off"
        onChange={event => change(key, event.target.value)}
      />
    </Field>
  );
  return (
    <Modal open onClose={requestClose} variant="master-form" viewport={viewport} label={title}>
      <FormHeader
        icon={<span
          aria-hidden="true"
          className="inline-grid size-9 shrink-0 place-items-center rounded-lg border border-sky-400/25 bg-sky-400/10 text-sky-300"
        >
          <Users size={16} />
        </span>}
        title={title[0].toUpperCase() + title.slice(1)}
        subtitle="Satu data personel dipakai di Team Roster, tiket, dan pilihan PIC."
        onClose={requestClose}
      />
      {confirmExit ? (
        <DiscardConfirm onKeep={() => setConfirmExit(false)} onDiscard={onClose} />
      ) : (
        <form
          className="flex min-h-0 flex-1 flex-col [&_button[data-select-trigger]]:h-11 [&_button[data-select-trigger]]:min-h-11 [&_button[data-select-trigger]]:text-base lg:[&_button[data-select-trigger]]:h-10 lg:[&_button[data-select-trigger]]:min-h-10 lg:[&_button[data-select-trigger]]:text-sm"
          noValidate
          onSubmit={event => { event.preventDefault(); void submit(); }}
        >
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 pb-6 pt-6 lg:px-6">
            {errors.form && (
              <p
                role="alert"
                id={`${prefix}-form`}
                tabIndex={-1}
                className="flex items-start gap-2 rounded-lg border border-rose-400/30 bg-rose-950 p-3 text-sm text-rose-200"
              >
                <AlertCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
                {errors.form}
              </p>
            )}
            <Section title="Identitas">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="lg:col-span-2">{text("fullName", "Nama lengkap", true)}</div>
                {text("employeeId", "ID pegawai", true, "Nomor induk pegawai. Tidak boleh sama dengan personel lain.")}
                {text("email", "Email", true, "Tidak boleh sama dengan personel lain.")}
                {text("phone", "Telepon")}
              </div>
            </Section>
            <Section title="Penugasan" description="Menentukan kelompok di Team Roster dan pilihan PIC.">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Field id={`${prefix}-roleKey`} label="Peran operasional" required error={errors.roleKey} hint="Daftar peran diatur di tab Peran.">
                  <Select
                    {...attrs("roleKey")}
                    required
                    size="form"
                    className="w-full"
                    value={form.roleKey}
                    options={roleOptions}
                    placeholder="Pilih peran"
                    onValueChange={value => change("roleKey", value)}
                  />
                </Field>
                <Field id={`${prefix}-defaultShift`} label="Shift default" hint="Jadwal mingguan tetap diatur di Team Roster.">
                  <Select
                    {...attrs("defaultShift")}
                    size="form"
                    className="w-full"
                    value={form.defaultShift}
                    options={[{ value: "", label: "Belum ditetapkan" }, ...SHIFT_KEYS.map(key => ({ value: key, label: SHIFT_LABELS[key] }))]}
                    onValueChange={value => change("defaultShift", value)}
                  />
                </Field>
                <div className="lg:col-span-2">
                  <Field id={`${prefix}-joinDate`} label="Tanggal bergabung" required error={errors.joinDate}>
                    <DateField
                      id={`${prefix}-joinDate`}
                      value={form.joinDate}
                      onChange={value => change("joinDate", value)}
                      max={todayYMD}
                      aria-invalid={!!errors.joinDate}
                    />
                  </Field>
                </div>
                <div className="lg:col-span-2">
                  <Field id={`${prefix}-status`} label="Status" required hint={STATUS_HINTS[form.status]} group>
                    <Segmented
                      id={`${prefix}-status`}
                      label="Status"
                      value={form.status}
                      options={STATUS_SEGMENTS.filter(option => option.value !== "archived")}
                      onChange={value => change("status", value)}
                    />
                  </Field>
                </div>
              </div>
            </Section>
            <div className="border-t border-slate-700/60 pt-4">
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-between gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 lg:min-h-9"
                aria-expanded={more}
                aria-controls={`${prefix}-additional`}
                onClick={() => setMore(!more)}
              >
                <span className="flex flex-wrap items-baseline gap-x-2 text-sm font-semibold text-slate-100">Tambahan<span className="text-xs font-normal text-slate-400">Catatan</span></span>
                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className={`text-slate-400 transition-transform duration-150 motion-reduce:transition-none ${more ? "rotate-180" : ""}`}
                />
              </button>
              {more && (
                <div id={`${prefix}-additional`} className="mt-4">
                  <Field id={`${prefix}-notes`} label="Catatan" error={errors.notes}>
                    <textarea
                      {...attrs("notes")}
                      className={`${inputClass} min-h-24 resize-y`}
                      maxLength={1000}
                      value={form.notes}
                      onChange={event => change("notes", event.target.value)}
                    />
                  </Field>
                </div>
              )}
            </div>
          </div>
          <FormFooter saving={saving} missing={missing} onCancel={requestClose} />
        </form>
      )}
    </Modal>
  );
}
