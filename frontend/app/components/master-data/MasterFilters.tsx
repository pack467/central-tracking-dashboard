"use client";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { Activity, AlertTriangle, ArrowUpDown, Building2, FolderKanban, Lock, RotateCcw, Search, Shapes, SlidersHorizontal, UserCog, X } from "lucide-react";
import { Select } from "@/app/components/ui/Select";
import { BottomSheet } from "@/app/components/ui/BottomSheet";
import { MASTER_DATA_P0_ENABLED } from "@/app/lib/master-data-flags";
import { MASTER_LABELS, MASTER_SORTS, defaultSort, sortOptions } from "@/app/lib/master-data-route";
import type { AnyMasterEntity, MasterQuery, MasterSnapshotV2 } from "@/app/types/master-data";
import { buttonClass, primaryClass } from "./master-ui";
const subscribe = (notify: () => void) => {
  const media = window.matchMedia("(min-width: 1180px)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
const snapshot = () => window.matchMedia("(min-width: 1180px)").matches;
const searchClass = "h-11 w-full rounded-[10px] border border-slate-600 bg-[#0f172a] py-2 pl-10 pr-10 text-base text-slate-100 outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-slate-400 [&::-webkit-search-cancel-button]:appearance-none hover:border-slate-500 focus:border-sky-400/70 focus:ring-2 focus:ring-sky-400/25 motion-reduce:transition-none lg:h-10 lg:text-sm";
const labelClass = "mb-1.5 block text-xs font-medium text-slate-300";
/** Widths of the inline controls, wide enough for "Organisasi Semua" and "Urutkan Urutan tiket" without clipping. */
const INLINE_WIDTH: Record<string, string> = {
  "master-filter-org": "w-[176px]",
  "master-filter-project": "w-[176px]",
  "master-filter-role": "w-[168px]",
  "master-filter-sort": "w-[184px]"
};
const SEARCH_NOUN: Record<AnyMasterEntity, string> = {
  organization: "nama atau kode",
  project: "nama atau kode",
  system: "nama atau kode",
  category: "kategori",
  severity: "severity",
  person: "nama, ID pegawai, atau email",
  role: "peran",
  position: "jabatan",
  department: "departemen"
};
interface Chip { key: string; label: string; clear: () => void }
export function MasterFilters({ entity, query, catalog, setQuery, addButton, extraButton, reviewCount = 0, onReviewChange, resultCount, resultLabel }: { entity: AnyMasterEntity; query: MasterQuery; catalog: MasterSnapshotV2; setQuery: (query: Partial<MasterQuery>) => void; addButton?: ReactNode; extraButton?: ReactNode; reviewCount?: number; onReviewChange?: (value: boolean) => void; resultCount?: number; resultLabel?: string }) {
  const [open, setOpen] = useState(false), wide = useSyncExternalStore(subscribe, snapshot, () => false);
  const filterCount = [query.status, query.kind, query.organizationId, query.projectId, query.roleKey].filter(value => value && value !== "all").length + (MASTER_DATA_P0_ENABLED && query.review ? 1 : 0);
  const filtered = filterCount > 0 || !!query.q;
  const reset = () => setQuery({ q: "", status: "all", kind: "all", organizationId: "all", projectId: "all", roleKey: "all", review: false });
  const statusLabel = query.status === "active" ? "Aktif" : query.status === "inactive" ? "Nonaktif" : query.status === "archived" ? "Arsip" : "Semua";
  const kindLabel = query.kind === "tenant" ? "Tenant" : query.kind === "client" ? "Klien/Mitra" : "Semua";
  const chosen = (value?: string) => !!value && value !== "all";
  const chips: Chip[] = [];
  if (query.q) chips.push({ key: "q", label: `Cari: ${query.q}`, clear: () => setQuery({ q: "" }) });
  if (chosen(query.status)) chips.push({ key: "status", label: `Status: ${statusLabel}`, clear: () => setQuery({ status: "all" }) });
  if (entity === "organization" && chosen(query.kind))
    chips.push({ key: "kind", label: `Jenis: ${kindLabel}`, clear: () => setQuery({ kind: "all" }) });
  if (chosen(query.organizationId))
    chips.push(
      {
        key: "org",
        label: `Organisasi: ${catalog.organizations.find(o => o.id === query.organizationId)?.shortName || "Terpilih"}`,
        clear: () => setQuery({ organizationId: "all", projectId: "all" })
      }
    );
  if (entity === "system" && chosen(query.projectId))
    chips.push(
      {
        key: "project",
        label: `Proyek: ${catalog.projects.find(p => p.id === query.projectId)?.name || "Terpilih"}`,
        clear: () => setQuery({ projectId: "all" })
      }
    );
  if (entity === "person" && chosen(query.roleKey))
    chips.push(
      {
        key: "role",
        label: `Peran: ${catalog.roles?.find(role => role.key === query.roleKey)?.name || query.roleKey}`,
        clear: () => setQuery({ roleKey: "all" })
      }
    );
  if (MASTER_DATA_P0_ENABLED && query.review) chips.push({ key: "review", label: "Perlu ditinjau", clear: () => onReviewChange?.(false) });
  const sortValue = query.sort || defaultSort(entity);
  const controls = (inline: boolean) => {
    // inline: the label sits inside the control ("Status  Semua"); in the sheet it stays above the control
    const field = (id: string, label: string, control: ReactNode) => inline
      ? <div key={id} className={`${INLINE_WIDTH[id] ?? "w-[160px]"} shrink-0`}>{control}</div>
      : <div key={id} className="min-w-0"><label className={labelClass} htmlFor={id}>{label}</label>{control}</div>;
    const inside = (label: string) => inline ? (value: ReactNode) => <><span className="text-slate-400">{label}:</span> <span className="text-slate-100">{value}</span></> : undefined;
    const all = (inlineLabel: string, sheetLabel: string) => inline ? inlineLabel : sheetLabel;
    return (
    <div
      className={inline
        ? "contents [&_button[data-select-trigger]]:h-10 [&_button[data-select-trigger]]:min-h-10"
        : "flex flex-col gap-4 [&_button[data-select-trigger]]:h-11 [&_button[data-select-trigger]]:min-h-11"}
    >
      {entity !== "severity" &&
        field(
          "master-filter-status",
          "Status",
          <Select
            id="master-filter-status"
            icon={<Activity size={16} aria-hidden="true" />}
            className="w-full"
            aria-label={`Filter status: ${statusLabel}`}
            renderValue={inside("Status")}
            active={chosen(query.status)}
            value={query.status || "all"}
            options={[
              { value: "all", label: all("Semua", "Semua status") },
              { value: "active", label: "Aktif" },
              ...(entity !== "project" ? [{ value: "inactive", label: "Nonaktif" }] : []),
              ...(entity !== "category" && entity !== "role" && entity !== "person" && entity !== "position" && entity !== "department" ? [{ value: "archived", label: "Arsip" }] : [])
            ]}
            onValueChange={status => setQuery({ status })}
          />
        )}
      {entity === "organization" &&
        field(
          
          
          "master-filter-kind",
          "Jenis",
          <Select
            id="master-filter-kind"
            icon={<Shapes size={16} aria-hidden="true" />}
            className="w-full"
            aria-label={`Filter jenis: ${kindLabel}`}
            renderValue={inside("Jenis")}
            active={chosen(query.kind)}
            value={query.kind || "all"}
            options={[{ value: "all", label: all("Semua", "Semua jenis") }, { value: "tenant", label: "Tenant" }, { value: "client", label: "Klien/Mitra" }]}
            onValueChange={kind => setQuery({ kind: kind as MasterQuery["kind"] })}
          />
        )}
      {(entity === "project" || entity === "system") &&
        field(
          
          
          "master-filter-org",
          "Organisasi",
          <Select
            id="master-filter-org"
            icon={<Building2 size={16} aria-hidden="true" />}
            className="w-full"
            searchable
            aria-label={`Filter organisasi: ${chosen(query.organizationId) ? catalog.organizations.find(o => o.id === query.organizationId)?.shortName || "Terpilih" : "Semua"}`}
            renderValue={inside("Organisasi")}
            active={chosen(query.organizationId)}
            value={query.organizationId || "all"}
            options={[
              { value: "all", label: all("Semua", "Semua organisasi") },
              ...catalog.organizations.map(o => ({ value: o.id, label: `${o.shortName || o.name}${o.status !== "active" ? " (Arsip/Nonaktif)" : ""}` }))
            ]}
            onValueChange={organizationId => setQuery(
              
              
              {
                organizationId,
                projectId: catalog.projects.some(p => p.id === query.projectId && (organizationId === "all" || p.organizationId === organizationId))
                  ? query.projectId
                  : "all"
              }
            )}
          />
        )}
      {entity === "system" &&
        field(
          
          
          "master-filter-project",
          "Proyek",
          <Select
            id="master-filter-project"
            icon={<FolderKanban size={16} aria-hidden="true" />}
            className="w-full"
            searchable
            aria-label={`Filter proyek: ${chosen(query.projectId) ? catalog.projects.find(p => p.id === query.projectId)?.name || "Terpilih" : "Semua"}`}
            renderValue={inside("Proyek")}
            active={chosen(query.projectId)}
            value={query.projectId || "all"}
            options={[
              { value: "all", label: all("Semua", "Semua proyek") },
              ...catalog.projects.filter(p => !chosen(query.organizationId) || p.organizationId === query.organizationId).map(p => ({ value: p.id, label: `${p.code} — ${p.name}` }))
            ]}
            onValueChange={projectId => setQuery({ projectId })}
          />
        )}
      {entity === "person" &&
        field(
          
          
          "master-filter-role",
          "Peran",
          <Select
            id="master-filter-role"
            icon={<UserCog size={16} aria-hidden="true" />}
            className="w-full"
            aria-label={`Filter peran: ${chosen(query.roleKey) ? catalog.roles?.find(role => role.key === query.roleKey)?.name || query.roleKey : "Semua"}`}
            renderValue={inside("Peran")}
            active={chosen(query.roleKey)}
            value={query.roleKey || "all"}
            options={[
              { value: "all", label: all("Semua", "Semua peran") },
              ...[...(catalog.roles || [])].sort((a, b) => a.sortOrder - b.sortOrder).map(role => ({ value: role.key, label: role.active ? role.name : `${role.name} (Nonaktif)` }))
            ]}
            onValueChange={roleKey => setQuery({ roleKey })}
          />
        )}
      {MASTER_DATA_P0_ENABLED &&
        ["organization", "project", "system"].includes(entity) &&
        onReviewChange &&
        field(
          "master-filter-review",
          "Tinjauan",
          <Select
            id="master-filter-review"
            icon={<AlertTriangle size={16} aria-hidden="true" />}
            className="w-full"
            aria-label={`Filter tinjauan: ${query.review ? "Perlu ditinjau" : "Semua"}`}
            renderValue={inside("Tinjauan")}
            active={!!query.review}
            value={query.review ? "review" : "all"}
            options={[{ value: "all", label: "Semua" }, { value: "review", label: `Perlu ditinjau (${reviewCount})` }]}
            onValueChange={value => onReviewChange(value === "review")}
          />
        )}
      {field(
        "master-filter-sort",
        "Urutkan",
        <Select
          id="master-filter-sort"
          icon={<ArrowUpDown size={16} aria-hidden="true" />}
          className="w-full"
          aria-label={`Urutan: ${MASTER_SORTS[sortValue]}`}
          renderValue={inside("Urutkan")}
          value={sortValue}
          options={sortOptions(entity).map(value => ({ value, label: MASTER_SORTS[value] }))}
          onValueChange={value => setQuery({ sort: value as MasterQuery["sort"] })}
        />
      )}
    </div>
    );
  };
  const noun = resultLabel || "data";
  if (entity === "severity")
    return (
      <p className="flex items-center gap-2 rounded-xl border border-[rgba(148,163,184,0.12)] bg-[#1e293b]/60 px-4 py-3 text-[13px] text-slate-300">
        <Lock size={15} aria-hidden="true" className="shrink-0 text-slate-400" />
        4 tingkat tetap. Hanya nama tampil dan deskripsi yang bisa diubah.
      </p>
    );
  return (
    <>
      <div
        className="sticky top-[52px] z-30 rounded-2xl border border-[rgba(148,163,184,0.12)] bg-[#0f172a]/95 px-3 py-3 shadow-[0_6px_18px_rgba(0,0,0,0.18)] lg:top-[60px]"
      >
        <div
          role={wide ? "group" : undefined}
          aria-label={wide ? "Cari, filter, dan urutan" : undefined}
          className="flex items-center gap-2 lg:flex-wrap max-lg:flex-col max-lg:items-stretch [@media(max-height:520px)]:flex-row [@media(max-height:520px)]:items-center"
        >
          <div className="relative min-w-[180px] flex-1">
            <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              aria-label={`Cari ${MASTER_LABELS[entity]}`}
              type="search"
              value={query.q || ""}
              onChange={event => setQuery({ q: event.target.value })}
              placeholder={`Cari ${SEARCH_NOUN[entity]}…`}
              className={searchClass}
            />
            {query.q ? (
              <button
                type="button"
                onClick={() => setQuery({ q: "" })}
                aria-label="Hapus pencarian"
                className="absolute right-0 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-md text-slate-400 transition-colors duration-150 hover:bg-slate-700 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 motion-reduce:transition-none lg:size-7"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
          {!wide && (
            <div className="flex items-center gap-2">
              <button type="button" className={`${buttonClass} flex-1`} onClick={() => setOpen(true)} aria-haspopup="dialog"><SlidersHorizontal size={16} aria-hidden="true" />Filter &amp; urutan{filterCount ? ` (${filterCount})` : ""}</button>
              {extraButton}
              {addButton}
            </div>
          )}
          {wide && controls(true)}
          {wide && extraButton}
          {wide && <div className="shrink-0">{addButton}</div>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-1 text-xs text-slate-300" aria-live="polite">
        <span>
          {resultCount === undefined ? "Memuat…" : (
            <><span className="font-dashboard-mono font-semibold tabular-nums text-slate-100">{resultCount}</span> {noun}{filtered ? " sesuai filter" : ""}</>
          )}
        </span>
        {chips.map(chip => (
          <button
            key={chip.key}
            type="button"
            onClick={chip.clear}
            aria-label={`Hapus filter ${chip.label}`}
            className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-400/10 px-3 text-xs text-sky-100 transition-colors duration-150 hover:bg-sky-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 motion-reduce:transition-none lg:min-h-8"
          >
            <span className="truncate">{chip.label}</span>
            <X size={12} aria-hidden="true" className="shrink-0 text-sky-300" />
          </button>
        ))}
        {filtered && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center gap-1 rounded-md px-1.5 font-semibold text-sky-300 hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 lg:min-h-8"
          ><RotateCcw size={12} aria-hidden="true" />Atur ulang</button>
        )}
      </div>
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Filter & urutan"
        dataSheetId="master-filters"
        footer={<div className="flex gap-2">
          {filterCount > 0 && (
            <button type="button" className={buttonClass} onClick={reset}><RotateCcw size={14} aria-hidden="true" />Atur ulang</button>
          )}
          <button type="button" className={`${primaryClass} flex-1`} onClick={() => setOpen(false)}>
            {resultCount === undefined ? "Tampilkan hasil" : `Tampilkan ${resultCount} ${noun}`}
          </button>
        </div>}
      >
        {controls(false)}
      </BottomSheet>
    </>
  );
}
