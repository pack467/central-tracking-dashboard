import { MASTER_DATA_P0_ENABLED } from "@/app/lib/master-data-flags";
import { SHIFT_LABELS } from "@/app/lib/master-people";
import { categoryPaletteEntry } from "@/app/lib/category-colors";
import type { AnyMasterEntity, AuditEntry, MasterSnapshotV2 } from "@/app/types/master-data";

export type AuditFilter = "all" | "name" | "pic" | "status" | "relation" | "mapping";
export const AUDIT_FILTERS: readonly { value: AuditFilter; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "name", label: "Nama" },
  { value: "pic", label: "PIC" },
  { value: "status", label: "Status" },
  { value: "relation", label: "Relasi" },
  ...(MASTER_DATA_P0_ENABLED ? [{ value: "mapping" as const, label: "Pemetaan" }] : []),
];
/** History filter chips: Semua | Nama | PIC | Status | Relasi for the catalog, adapted for people and roles. */
export function auditFiltersFor(entity: AnyMasterEntity): readonly { value: AuditFilter; label: string }[] {
  if (entity === "person")
    return [
      { value: "all", label: "Semua" },
      { value: "name", label: "Identitas" },
      { value: "relation", label: "Peran" },
      { value: "status", label: "Status" }
    ];
  if (entity === "role") return [{ value: "all", label: "Semua" }, { value: "name", label: "Nama" }, { value: "status", label: "Status" }];
  return AUDIT_FILTERS.filter(filter => entity === "organization" || entity === "project" || entity === "system" || filter.value !== "pic" && filter.value !== "relation").map(filter => filter.value === "pic" && entity === "organization" ? { ...filter, label: "Leader" } : filter);
}

const FIELD_LABELS: Record<string, string> = {
  name: "Nama",
  code: "Kode",
  shortName: "Nama singkat",
  displayName: "Nama tampil",
  kind: "Jenis",
  description: "Deskripsi",
  scope: "Lingkup layanan",
  status: "Status",
  active: "Status",
  organizationId: "Organisasi",
  projectId: "Proyek induk",
  leadUserId: "PIC",
  picUserId: "PIC",
  picContact: "Kontak PIC",
  relatedClientIds: "Klien terkait",
  environment: "Environment",
  criticality: "Criticality",
  referenceUrl: "Referensi",
  logoUrl: "Logo",
  color: "Warna",
  sortOrder: "Urutan",
  legacyKey: "Kunci lama",
  legacyCondition: "Kondisi lama",
  action: "Keputusan",
  systemMappings: "Pemetaan sistem",
  note: "Catatan",
  notes: "Catatan",
  version: "Versi",
  fullName: "Nama lengkap",
  employeeId: "ID pegawai",
  email: "Email",
  phone: "Telepon",
  roleKey: "Peran",
  defaultShift: "Shift default",
  joinDate: "Tanggal bergabung",
  Cadangan: "Cadangan",
  Organisasi: "Jumlah organisasi",
  Proyek: "Jumlah proyek",
  Sistem: "Jumlah sistem",
  Pemetaan: "Jumlah pemetaan"
};
const STATUS_LABELS: Record<string, string> = { active: "Aktif", inactive: "Nonaktif", archived: "Arsip", tenant: "Tenant", client: "Klien/Mitra" };

/** Organisasi calls its responsible person "Leader"; Proyek and Sistem call theirs "PIC". */
export function auditFieldLabel(field: string, entity?: AnyMasterEntity): string {
  if (entity === "organization" && field === "picUserId") return "Leader";
  if (entity === "organization" && field === "picContact") return "Kontak Leader";
  if (entity === "project" && field === "leadUserId") return "PIC";
  return FIELD_LABELS[field] || field;
}

export function formatMasterId(id: string, catalog: MasterSnapshotV2): string {
  const organization = catalog.organizations.find(item => item.id === id);
  if (organization) return `${organization.code} — ${organization.name}`;
  const project = catalog.projects.find(item => item.id === id);
  if (project) return `${project.code} — ${project.name}`;
  const system = catalog.systems.find(item => item.id === id);
  if (system) return `${system.code} — ${system.name}`;
  return `${id} (Tidak ditemukan)`;
}

function userName(id: string, users: readonly { id: string; name: string }[]): string {
  const found = users.find(user => user.id === id);
  return found?.name || `${id} (Tidak ditemukan)`;
}

export function auditValueLabel(field: string, value: unknown, catalog: MasterSnapshotV2, users: readonly { id: string; name: string }[]): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field === "status" || field === "kind") return STATUS_LABELS[String(value)] || String(value);
  if (field === "active") return value ? "Aktif" : "Nonaktif";
  if (field === "sortOrder") return String(Number(value) + 1);
  if (field === "color") return categoryPaletteEntry(String(value)).name;
  if (field === "roleKey") return catalog.roles?.find(role => role.key === String(value))?.name || `${String(value)} (Tidak ditemukan)`;
  if (field === "defaultShift") return SHIFT_LABELS[value as keyof typeof SHIFT_LABELS] || String(value);
  if (field === "joinDate" && /^\d{4}-\d{2}-\d{2}$/.test(String(value)))
    return new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${String(value)}T00:00:00Z`));
  if (field === "organizationId") return formatMasterId(String(value), catalog);
  if (field === "projectId") return formatMasterId(String(value), catalog);
  if (field === "picUserId" || field === "leadUserId") return userName(String(value), users);
  if (field === "relatedClientIds" && Array.isArray(value)) return value.map(id => formatMasterId(String(id), catalog)).join(", ") || "—";
  if (field === "picContact" && value && typeof value === "object") {
    const contact = value as { name?: string; email?: string; phone?: string };
    return [contact.name, contact.email, contact.phone].filter(Boolean).join(" · ") || "—";
  }
  if (field === "systemMappings" && Array.isArray(value)) return `${value.length} record`;
  if (Array.isArray(value)) return value.map(item => typeof item === "string" ? item : JSON.stringify(item)).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
export function auditRawValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}
export function auditChangeCategory(entry: AuditEntry, field: string): AuditFilter {
  if (entry.entityType === "mapping" || ["action", "systemMappings", "referenceId", "version", "Cadangan", "Pemetaan"].includes(field))
    return "mapping";
  if (["name", "shortName", "displayName", "code", "description", "scope", "fullName", "employeeId", "email", "phone", "notes", "defaultShift", "joinDate"].includes(field))
    return "name";
  if (["picUserId", "picContact", "leadUserId"].includes(field)) return "pic";
  if (["status", "active"].includes(field)) return "status";
  if (["organizationId", "projectId", "relatedClientIds", "roleKey"].includes(field)) return "relation";
  return "all";
}
export function auditEntryMatches(entry: AuditEntry, filter: AuditFilter): boolean {
  if (filter === "all") return true;
  return entry.changes.some(change => auditChangeCategory(entry, change.field) === filter);
}
export function currentRecordName(entity: AnyMasterEntity, id: string, catalog: MasterSnapshotV2): string | undefined {
  if (entity === "person") return catalog.people?.find(item => item.id === id)?.fullName;
  if (entity === "role") return catalog.roles?.find(item => item.key === id)?.name;
  if (entity === "organization") return catalog.organizations.find(item => item.id === id)?.name;
  if (entity === "project") return catalog.projects.find(item => item.id === id)?.name;
  if (entity === "system") return catalog.systems.find(item => item.id === id)?.name;
  if (entity === "category") return catalog.categories.find(item => item.id === id)?.name;
  return catalog.severities.find(item => item.code === id)?.displayName;
}
export function auditNameContext(entity: AnyMasterEntity, id: string, field: string, stored: unknown, catalog: MasterSnapshotV2): string | undefined {
  if (!["name", "shortName", "displayName", "fullName"].includes(field) || typeof stored !== "string") return undefined;
  const current = currentRecordName(entity, id, catalog);
  return current && current !== stored ? `tersimpan: ${stored} - kini: ${current}` : undefined;
}
