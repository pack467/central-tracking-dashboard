"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Ban, HardDrive, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useToast } from "@/app/components/ui/Toast";
import { useOrgCatalog } from "@/app/hooks/useOrgCatalog";
import type { useMasterRoute } from "@/app/hooks/useMasterRoute";
import { canMaster, type MasterRole } from "@/app/lib/permissions";
import { ORG_STORES, ordered, usage as usageOf, type OrgItem, type OrgKind } from "@/app/lib/org-catalog";
import { norm } from "@/app/lib/master-people";
import type { MasterSnapshotV2, Person } from "@/app/types/master-data";
import { COL, Count, DataTable, type Column } from "./data-table";
import { DeleteDialog } from "./DeleteDialog";
import { ListEmpty, MasterPager } from "./list-chrome";
import { MasterFilters } from "./MasterFilters";
import { MasterBadge, UsageBar, primaryClass } from "./master-ui";
import { OrgItemFormModal } from "./OrgItemFormModal";
import { RowMenu, actionIcon, type RowMenuItem } from "./team-ui";

type Route = ReturnType<typeof useMasterRoute>;
interface Props { kind: OrgKind; route: Route; catalog: MasterSnapshotV2; access: MasterRole; people: readonly Person[] }
const stepClass = "inline-grid size-7 pointer-coarse:size-11 place-items-center rounded-md text-slate-400 hover:bg-slate-700 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 disabled:opacity-30";

/** Jabatan / Departemen: listed, filtered and paged here, kept in this browser until the backend has them. */
export function OrgCatalogPanel({ kind, route, catalog, access, people }: Props) {
  const state = useOrgCatalog(kind), store = ORG_STORES[kind], { label, noun } = store.config, { query } = route, toast = useToast();
  const [form, setForm] = useState<{ item?: OrgItem }>(), [removing, setRemoving] = useState<OrgItem>(), [highlighted, setHighlighted] = useState("");
  useEffect(
    () => { if (!highlighted) return; const timer = setTimeout(() => setHighlighted(""), 2200); return () => clearTimeout(timer); },
    [highlighted]
  );
  const all = useMemo(() => ordered(state), [state]);
  // only people who still exist count; an id left behind by a deleted person is not a holder
  const holders = useMemo(() => {
    const known = new Set(people.map(person => person.id));
    return usageOf({ ...state, assignments: Object.fromEntries(Object.entries(state.assignments).filter(([id]) => known.has(id))) });
  }, [state, people]);
  const rows = useMemo(() => {
    const q = norm(query.q || "");
    const list = all.filter(item => (!q || norm(item.name).includes(q) || norm(item.description).includes(q)) && (query.status === "active" ? item.active : query.status === "inactive" ? !item.active : true));
    if (query.sort === "name" || query.sort === "-name") list.sort((a, b) => a.name.localeCompare(b.name, "id") * (query.sort === "name" ? 1 : -1));
    if (query.sort === "-updated") list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return list;
  }, [all, query.q, query.status, query.sort]);
  const pageSize = query.pageSize || 10, totalPages = Math.max(1, Math.ceil(rows.length / pageSize)), page = Math.min(query.page || 1, totalPages);
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const filtered = !!(query.q || query.status && query.status !== "all");
  const manualOrder = !query.sort || query.sort === "order";
  const update = canMaster(access, kind, "update"), archive = canMaster(access, kind, "archive"), remove = canMaster(access, kind, "delete");
  const add = canMaster(access, kind, "create") ? (
    <button type="button" className={primaryClass} onClick={() => setForm({})}><Plus size={16} />Tambah {label}</button>
  ) : undefined;
  const run = (action: () => void, message: string, id = "") => {
    try { action(); if (id) setHighlighted(id); toast.success(message); } catch (error) { toast.critical(error instanceof Error ? error.message : "Gagal menyimpan."); }
  };
  const indexOf = (item: OrgItem) => all.findIndex(other => other.id === item.id);
  const maxUsage = Math.max(1, ...all.map(item => holders[item.id] || 0));

  function actions(item: OrgItem, mobile = false): ReactNode {
    const index = indexOf(item), held = holders[item.id] || 0;
    const items: RowMenuItem[] = [];
    if (update) items.push({ key: "edit", label: "Ubah", icon: <Pencil size={15} className="text-slate-300" />, onSelect: () => setForm({ item }) });
    if (update && mobile)
      items.push(
        { key: "up", label: "Naikkan", icon: <ArrowUp size={15} />, disabled: !manualOrder || index <= 0, hint: manualOrder ? undefined : "Urutkan berdasarkan Urutan.", onSelect: () => store.move(item.id, -1) },
        { key: "down", label: "Turunkan", icon: <ArrowDown size={15} />, disabled: !manualOrder || index >= all.length - 1, hint: manualOrder ? undefined : "Urutkan berdasarkan Urutan.", onSelect: () => store.move(item.id, 1) }
      );
    if (archive)
      items.push(
        item.active
          ? { key: "inactive", label: "Nonaktifkan", icon: <Ban size={15} />, hint: held ? `${held} personel tetap memegangnya; tidak bisa dipilih untuk personel lain.` : undefined, onSelect: () => run(() => store.update(item.id, { ...item, active: false }), `${label} dinonaktifkan.`, item.id) }
          : { key: "restore", label: "Aktifkan", icon: <RotateCcw size={15} className="text-sky-300" />, onSelect: () => run(() => store.update(item.id, { ...item, active: true }), `${label} diaktifkan.`, item.id) }
      );
    if (remove)
      items.push({ key: "delete", label: "Hapus", tone: "danger", icon: <Trash2 size={15} />, disabled: held > 0, hint: held ? `Dipakai ${held} personel. Pindahkan dulu, atau nonaktifkan.` : undefined, onSelect: () => setRemoving(item) });
    if (!items.length) return null;
    return (
      <div className="flex shrink-0 items-center justify-end gap-0.5">
        {!mobile && update && (
          <button type="button" className={actionIcon} onClick={() => setForm({ item })} aria-label={`Ubah ${item.name}`} title="Ubah"><Pencil size={15} /></button>
        )}
        <RowMenu name={item.name} items={items.filter(entry => mobile || entry.key !== "edit")} mobile={mobile} />
      </div>
    );
  }
  const name = (item: OrgItem) => (
    <span className="block min-w-0">
      <span className="block truncate text-[14px] font-semibold leading-5 text-slate-50" title={item.name}>{item.name}</span>
      {item.description && <span className="block truncate text-[12px] leading-4 text-slate-400" title={item.description}>{item.description}</span>}
    </span>
  );
  const used = (item: OrgItem) => (
    <span className="inline-flex flex-col items-end gap-1.5 py-1">
      <Count value={holders[item.id] || 0} unit="personel" />
      <UsageBar value={holders[item.id] || 0} max={maxUsage} fill="bg-[#38bdf8]" label="Pemakaian" />
    </span>
  );
  const columns: Column<OrgItem>[] = [
    { key: "name", label: `Nama ${noun}`, cell: name },
    { key: "usage", label: "Dipakai", w: COL.usage, align: "right", cell: used },
    {
      key: "order",
      label: "Urutan",
      w: "w-[140px] pointer-coarse:w-[184px]",
      hide: "md",
      align: "right",
      cell: item => (
        <span className="inline-flex items-center justify-end gap-1">
          <span className="w-5 text-right font-dashboard-mono text-[13px] tabular-nums text-slate-300">{indexOf(item) + 1}</span>
          {update && (
            <span className="flex items-center">
              <button type="button" disabled={!manualOrder || indexOf(item) <= 0} className={stepClass} aria-label={`Naikkan ${item.name}`} title={manualOrder ? "Naikkan" : "Urutkan berdasarkan Urutan"} onClick={() => store.move(item.id, -1)}><ArrowUp size={13} /></button>
              <button type="button" disabled={!manualOrder || indexOf(item) >= all.length - 1} className={stepClass} aria-label={`Turunkan ${item.name}`} title={manualOrder ? "Turunkan" : "Urutkan berdasarkan Urutan"} onClick={() => store.move(item.id, 1)}><ArrowDown size={13} /></button>
            </span>
          )}
        </span>
      )
    },
    { key: "status", label: "Status", w: COL.status, cell: item => <MasterBadge value={item.active ? "active" : "inactive"} /> },
    { key: "actions", label: "Aksi", w: COL.actions, align: "right", glyph: true, cell: item => actions(item) }
  ];
  return (
    <>
      <section aria-label={`Daftar ${label}`} className="space-y-3">
        <MasterFilters entity={kind} query={query} catalog={catalog} setQuery={route.setQuery} resultCount={rows.length} resultLabel={noun} addButton={add} />
        <p role="note" className="flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-3 py-2.5 text-[12px] leading-5 text-amber-100">
          <HardDrive size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-amber-300" />
          <span>{label} belum ada di backend, jadi daftar ini dan {noun} tiap personel tersimpan di browser ini saja: tidak terlihat di perangkat lain dan hilang kalau data browser dibersihkan.</span>
        </p>
        {!pageRows.length ? (
          <ListEmpty filtered={filtered} label={label} onReset={() => route.select(kind)} action={add} />
        ) : (
          <DataTable
            label={`Daftar ${label}`}
            columns={columns}
            rows={pageRows}
            rowId={item => item.id}
            highlighted={highlighted}
            onOpen={() => undefined}
            footer={
              <MasterPager
                meta={{ page, pageSize, total: rows.length, totalPages }}
                pageSize={pageSize}
                onPage={next => route.setQuery({ page: next })}
                onSize={size => route.setQuery({ pageSize: size })}
              />
            }
            card={item => (
              <div className="p-3">
                <div className="pr-12">
                  {name(item)}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <MasterBadge value={item.active ? "active" : "inactive"} />
                    <span className="text-[11.5px] text-slate-400">Urutan {indexOf(item) + 1}</span>
                  </div>
                  <div className="mt-1">{used(item)}</div>
                </div>
                <div className="absolute right-1.5 top-1.5">{actions(item, true)}</div>
              </div>
            )}
          />
        )}
      </section>
      {form ? (
        <OrgItemFormModal
          kind={kind}
          item={form.item}
          items={all}
          onClose={() => setForm(undefined)}
          onSaved={item => { setForm(undefined); setHighlighted(item.id); toast.success(`${label} tersimpan di browser ini.`); }}
        />
      ) : removing && (
        <DeleteDialog
          label={label}
          name={removing.name}
          alternative="Nonaktifkan"
          load={async () => {
            const held = holders[removing.id] || 0;
            return { canDelete: !held, reason: held ? `Dipakai ${held} personel.` : undefined };
          }}
          onDelete={async () => store.remove(removing.id)}
          onClose={() => setRemoving(undefined)}
          onDeleted={() => { setRemoving(undefined); toast.success(`${label} dihapus.`); }}
        />
      )}
    </>
  );
}
