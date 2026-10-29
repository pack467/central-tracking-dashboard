import { Avatar as SharedAvatar } from "@/app/components/ui/Avatar";
import { safeLogo } from "@/app/lib/master-data-model";
import { Building2, Handshake, ImageOff, ShieldAlert, Tags } from "lucide-react";
import type {
  MasterEntity,
  MasterRecordMap,
  MasterSnapshotV2,
  Organization,
  Project,
  Severity,
  System,
  TicketCategory
} from "@/app/types/master-data";
export type MasterRow = MasterRecordMap[MasterEntity];
export type MasterUsers = readonly { id: string; name: string; email?: string; phone?: string; status?: "active" | "inactive" | "archived" }[];
export const buttonClass = "inline-flex h-11 min-h-11 items-center justify-center gap-2 rounded-[10px] border border-slate-600 bg-slate-800/40 px-3 text-sm font-semibold text-slate-100 transition-[background-color,border-color,box-shadow] duration-150 hover:border-slate-500 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f172a] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none lg:h-10 lg:min-h-10";
export const primaryClass = "inline-flex h-11 min-h-11 items-center justify-center gap-2 rounded-[10px] bg-sky-400 px-4 text-sm font-bold text-white transition-[background-color,box-shadow] duration-150 hover:bg-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f172a] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none lg:h-10 lg:min-h-10";
export const iconClass = "inline-flex size-11 shrink-0 items-center justify-center rounded-[10px] text-slate-300 transition-colors duration-150 hover:bg-slate-700 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f172a] disabled:opacity-40 motion-reduce:transition-none lg:size-9";
export const inputClass = "min-h-11 w-full rounded-[10px] border border-slate-600 bg-[#0f172a] px-3 py-2 text-base text-slate-50 outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-slate-400 hover:border-slate-500 focus:border-sky-400/70 focus:ring-2 focus:ring-sky-400/25 aria-invalid:border-rose-400/70 disabled:opacity-60 motion-reduce:transition-none lg:min-h-10 lg:text-sm";
export const masterRowId = (entity: MasterEntity, row: MasterRow) => entity === "severity" ? (row as Severity).code : (row as Exclude<MasterRow, Severity>).id;
export const masterRowName = (entity: MasterEntity, row: MasterRow) => entity === "severity" ? (row as Severity).displayName : (row as Exclude<MasterRow, Severity>).name;
export const masterRowStatus = (entity: MasterEntity, row: MasterRow) => entity === "category"
  ? (row as TicketCategory).active ? "active" : "inactive"
  : entity === "severity" ? "active" : (row as Organization | Project | System).status;

const BADGE_COLORS: Record<string, string> = {
  active: "border-emerald-400/35 bg-emerald-950 text-emerald-300",
  inactive: "border-slate-600 bg-slate-800 text-slate-300",
  archived: "border-rose-400/35 bg-rose-950 text-rose-300",
  critical: "border-red-400/40 bg-red-950 text-red-300",
  high: "border-orange-400/40 bg-orange-950 text-orange-300",
  medium: "border-amber-400/40 bg-amber-950 text-amber-300",
  low: "border-teal-400/40 bg-teal-950 text-teal-300",
  tenant: "border-violet-400/35 bg-violet-950 text-violet-200",
  client: "border-sky-400/35 bg-sky-950 text-sky-200",
  Production: "border-emerald-400/35 bg-emerald-950 text-emerald-300",
  Staging: "border-amber-400/35 bg-amber-950 text-amber-300",
  DRC: "border-purple-400/35 bg-purple-950 text-purple-200",
  unmapped: "border-amber-400/35 bg-amber-950 text-amber-200",
  ambiguous: "border-orange-400/35 bg-orange-950 text-orange-200",
  mapped: "border-emerald-400/35 bg-emerald-950 text-emerald-300",
  label: "border-sky-400/35 bg-sky-950 text-sky-200",
  deferred: "border-slate-600 bg-slate-800 text-slate-300",
  info: "border-sky-400/35 bg-sky-950 text-sky-200",
  warning: "border-amber-400/35 bg-amber-950 text-amber-200",
  error: "border-rose-400/35 bg-rose-950 text-rose-300",
};
const BADGE_LABELS: Record<string, string> = {
  active: "Aktif",
  inactive: "Nonaktif",
  archived: "Arsip",
  tenant: "Tenant",
  client: "Klien/Mitra",
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  unmapped: "Belum terpetakan",
  ambiguous: "Ambigu",
  mapped: "Terpetakan",
  label: "Label",
  deferred: "Ditunda",
  info: "Informasi",
  warning: "Perlu ditinjau",
  error: "Perlu diperbaiki"
};
const STATUS_VALUES = new Set(["active", "inactive", "archived"]);
export function MasterBadge({ value, className = "" }: { value: string; className?: string }) {
  const kindIcon = value === "tenant" ? <Building2 size={12} aria-hidden="true" /> : value === "client" ? <Handshake size={12} aria-hidden="true" /> : null;
  const dot = STATUS_VALUES.has(value) || ["Production", "Staging", "DRC"].includes(value);
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold leading-5 ${BADGE_COLORS[value] || BADGE_COLORS.inactive} ${className}`}
    >
      {dot && <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />}
      {kindIcon}
      {BADGE_LABELS[value] || value}
    </span>
  );
}

/** Solid, so the severity reads at a glance; dark text on the light fills, white on red (4.8:1). */
const SEVERITY_TONES: Record<string, string> = {
  critical: "bg-red-600 text-white",
  high: "bg-orange-400 text-slate-950",
  medium: "bg-amber-400 text-slate-950",
  low: "bg-teal-400 text-slate-950",
};
export function SeverityBadge({ code, label }: { code: string; label?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${SEVERITY_TONES[code] || SEVERITY_TONES.medium}`}
    >
      <span aria-hidden="true" className="size-2 rounded-full bg-current" />
      {label || (code.charAt(0).toUpperCase() + code.slice(1))}
    </span>
  );
}
/** Destructive primary button in forms (discard changes). */
export const dangerClass = "inline-flex h-11 min-h-11 items-center justify-center gap-2 rounded-[10px] bg-rose-500 px-4 text-sm font-bold text-white transition-colors duration-150 hover:bg-rose-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f172a] motion-reduce:transition-none lg:h-10 lg:min-h-10";
/** Same button in dialogs, where it is disabled while the request is running. */
export const dangerBusyClass = "inline-flex h-11 min-h-11 items-center justify-center gap-2 rounded-[10px] bg-rose-500 px-4 text-sm font-bold text-white transition-colors duration-150 hover:bg-rose-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f172a] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none lg:h-10 lg:min-h-10";
export function initials(name: string): string {
  const words = name.replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter(word => word && !/^(PT|CV|TBK|PERSERO)$/i.test(word));
  if (!words.length) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}
const AVATAR_PX = { xs: 28, sm: 30, md: 36, lg: 44, xl: 52 } as const;
/** The grey circle every other page uses (ui/Avatar). `seed` and `shape` are accepted so existing callers keep compiling; colour no longer varies per record. */
export function Avatar({ name, size = "md" }: { name: string; seed?: string; size?: keyof typeof AVATAR_PX; shape?: "rounded" | "circle" }) {
  return <SharedAvatar name={name} initials={initials(name)} size={AVATAR_PX[size]} shape="circle" />;
}

const ENTITY_TILE = {
  organization: { icon: ImageOff, tone: "border-slate-600 bg-slate-800 text-slate-500" },
  project: { icon: ImageOff, tone: "border-slate-600 bg-slate-800 text-slate-500" },
  system: { icon: ImageOff, tone: "border-slate-600 bg-slate-800 text-slate-500" },
  category: { icon: Tags, tone: "border-amber-400/25 bg-amber-400/10 text-amber-300" },
  severity: { icon: ShieldAlert, tone: "border-red-400/25 bg-red-400/10 text-red-300" },
} as const;
const TILE_SIZES = { table: "size-10 rounded-lg", xs: "size-7 rounded-md", sm: "size-8 rounded-lg", md: "size-9 rounded-lg", lg: "size-11 rounded-xl", xl: "size-12 rounded-xl" } as const;
/**
 * Organisasi, Proyek and Sistem show their logo in a square tile, or a grey "no image" tile until one is uploaded.
 * Logos sit on white because most are drawn for a light background. Kategori and Severity keep their coloured icon.
 */
export function EntityIconTile({ entity, size = "lg", src }: { entity: MasterEntity; size?: keyof typeof TILE_SIZES; src?: string }) {
  const item = ENTITY_TILE[entity], Icon = item.icon, iconSize = size === "xl" ? 22 : size === "lg" || size === "table" ? 20 : size === "xs" ? 14 : 16;
  const logo = safeLogo(src);
  if (logo)
    return (
      <span aria-hidden="true" className={`inline-grid shrink-0 place-items-center overflow-hidden border border-slate-600 bg-white ${size === "xs" ? "p-0.5" : "p-1"} ${TILE_SIZES[size]}`}>
        {/* A data URL logo has nothing for next/image to optimise. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt="" className="size-full object-contain" draggable={false} />
      </span>
    );
  return (
    <span aria-hidden="true" className={`inline-grid shrink-0 place-items-center border ${TILE_SIZES[size]} ${item.tone}`}>
      <Icon size={iconSize} />
    </span>
  );
}

/** A thin bar under a count. `fill` is a full class ("bg-[#38bdf8]"); the width is the only dynamic value. */
export function UsageBar({ value, max, fill, label }: { value: number; max: number; fill: string; label: string }) {
  const width = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return (
    <span className="block h-1.5 w-20 overflow-hidden rounded-full bg-slate-700/70" role="img" aria-label={`${label}: ${value}`}>
      <span className={`block h-full rounded-full ${fill}`} style={{ width: `${width}%` }} />
    </span>
  );
}

/** Severity colours as classes, the same hex values as SEVERITY_COLORS. */
export const SEVERITY_DOT: Record<string, string> = { critical: "bg-[#ef4444]", high: "bg-[#f97316]", medium: "bg-[#f59e0b]", low: "bg-[#2dd4bf]" };
/** Priority of a severity as people say it: P1 is the most urgent. */
export const LEVEL_LABELS = ["P1 - Tertinggi", "P2 - Tinggi", "P3 - Sedang", "P4 - Terendah"] as const;
/** "P1 Tertinggi": the number in semibold, the word quiet, on one line and without a box. */
export function LevelChip({ level }: { level: number }) {
  return (
    <span className="inline-flex shrink-0 items-baseline gap-1.5 whitespace-nowrap text-[13px]">
      <span className="font-semibold tabular-nums text-slate-50">P{level}</span>
      <span className="text-slate-400">{LEVEL_LABELS[level - 1]?.slice(5)}</span>
    </span>
  );
}
/** A named record in a cell: its logo (or the grey "no image" tile), the name and one quiet line. The same everywhere an entity is named. */
export function EntityCell({ entity, logoUrl, title, sub, size = "sm" }: { entity: MasterEntity; logoUrl?: string; title: string; sub?: string; size?: "sm" | "table" }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <EntityIconTile entity={entity} size={size} src={logoUrl} />
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium leading-5 text-slate-100" title={title}>{title || "—"}</span>
        {sub ? <span className="block truncate text-[12px] leading-4 text-slate-400" title={sub}>{sub}</span> : null}
      </span>
    </span>
  );
}
/** The colour of a category as a 40 px tile with a solid dot: how it looks in lists and in the form header. */
export function CategoryTile({ chip, dot, size = "table" }: { chip: string; dot: string; size?: "table" | "sm" }) {
  return (
    <span aria-hidden="true" className={`inline-grid shrink-0 place-items-center border ${chip} ${size === "table" ? "size-10 rounded-lg" : "size-8 rounded-lg"}`}>
      <span className={`size-3 rounded-full ${dot}`} />
    </span>
  );
}

/** A category as a chip: the same look in the form preview, the drawer and wherever a ticket shows its category. */
export function CategoryChip({ name, chip, dot }: { name: string; chip: string; dot: string }) {
  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12px] font-semibold leading-5 ${chip}`}>
      <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${dot}`} />
      <span className="truncate">{name}</span>
    </span>
  );
}

export function ReviewMarker({ label, onClick, tone = "warning" }: { label: string; onClick: () => void; tone?: "warning" | "info" | "error" }) {
  const classes = tone === "error"
    ? "border-rose-400/35 bg-rose-950 text-rose-300 hover:border-rose-400/60"
    : tone === "info"
      ? "border-sky-400/35 bg-sky-950 text-sky-200 hover:border-sky-400/60"
      : "border-amber-400/35 bg-amber-950 text-amber-200 hover:border-amber-400/60";
  return (
    <button
      type="button"
      onClick={event => { event.stopPropagation(); onClick(); }}
      className={`inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 text-[11px] font-semibold transition-colors duration-150 hover:bg-slate-800/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 motion-reduce:transition-none lg:min-h-5 lg:py-0.5 ${classes}`}
    >
      {label}
    </button>
  );
}
export function picName(entity: MasterEntity, row: MasterRow, catalog: MasterSnapshotV2, users: MasterUsers): string {
  if (entity === "organization") {
    const org = row as Organization;
    return users.find(u => u.id === org.picUserId)?.name || org.picContact?.name || "Belum ditetapkan";
  }
  if (entity === "project") {
    const project = row as Project;
    return users.find(u => u.id === project.leadUserId)?.name || project.legacy?.leadEngineer || "Belum ditetapkan";
  }
  if (entity === "system") {
    const system = row as System, project = catalog.projects.find(p => p.id === system.projectId);
    return users.find(u => u.id === system.picUserId)?.name || (project ? picName("project", project, catalog, users) : "Belum ditetapkan");
  }
  return "";
}
/** The person behind a PIC label, so an inactive assignee can carry a small "Nonaktif" tag. */
export function picUser(entity: MasterEntity, row: MasterRow, catalog: MasterSnapshotV2, users: MasterUsers): MasterUsers[number] | undefined {
  if (entity === "organization") return users.find(u => u.id === (row as Organization).picUserId);
  if (entity === "project") return users.find(u => u.id === (row as Project).leadUserId);
  if (entity === "system") {
    const system = row as System, project = catalog.projects.find(p => p.id === system.projectId);
    return users.find(u => u.id === system.picUserId) || (project ? picUser("project", project, catalog, users) : undefined);
  }
  return undefined;
}
export function rowContext(entity: MasterEntity, row: MasterRow, catalog: MasterSnapshotV2, users: MasterUsers): [string, string] {
  if (entity === "organization") {
    const org = row as Organization;
    return [`Leader: ${picName(entity, row, catalog, users)}`, `${catalog.projects.filter(p => p.organizationId === org.id).length} proyek`];
  }
  if (entity === "project") {
    const project = row as Project;
    return [
      `${catalog.organizations.find(o => o.id === project.organizationId)?.shortName || catalog.organizations.find(o => o.id === project.organizationId)?.name || "Organisasi"} · PIC: ${picName(entity, row, catalog, users)}`,
      `${catalog.systems.filter(s => s.projectId === project.id).length} sistem`
    ];
  }
  if (entity === "system") {
    const system = row as System;
    const project = catalog.projects.find(p => p.id === system.projectId);
    return [
      `${project?.name || "Proyek"} · ${catalog.organizations.find(o => o.id === project?.organizationId)?.shortName || "Organisasi"}`,
      `PIC: ${picName(entity, row, catalog, users)}`
    ];
  }
  if (entity === "category") {
    const category = row as TicketCategory;
    return [category.description || "Tanpa deskripsi", `${category.usageCount} tiket`];
  }
  const severity = row as Severity; return [`Tingkat ${severity.level}`, `${severity.usageCount} tiket`];
}
