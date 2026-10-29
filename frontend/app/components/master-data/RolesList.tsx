"use client";
import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Ban, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { canMaster, type MasterRole } from "@/app/lib/permissions";
import { masterRoles } from "@/app/services/master-data-v2";
import type { Role, RoleUsage } from "@/app/types/master-data";
import { COL, Count, DataTable, type Column } from "./data-table";
import { MasterBadge, UsageBar } from "./master-ui";
import { RowMenu, actionIcon, type RowMenuItem } from "./team-ui";

interface Props {
  rows: Role[];
  /** Every role in manual order, so the up/down limits do not depend on the current page. */
  order: readonly string[];
  manualOrder: boolean;
  access: MasterRole;
  highlighted: string;
  footer?: ReactNode;
  onEdit: (role: Role) => void;
  onStatus: (role: Role, status: "active" | "inactive") => void;
  onDelete: (role: Role) => void;
  onReorder: (role: Role, direction: number) => void;
  onViewPeople: (roleKey: string) => void;
}
const stepClass = "inline-grid size-7 pointer-coarse:size-11 place-items-center rounded-md text-slate-400 hover:bg-slate-700 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 disabled:opacity-30";

function Actions({ role, access, mobile = false, order, manualOrder, onEdit, onStatus, onDelete, onReorder }: Pick<Props, "access" | "order" | "manualOrder" | "onEdit" | "onStatus" | "onDelete" | "onReorder"> & { role: Role; mobile?: boolean }) {
  const [usage, setUsage] = useState<RoleUsage>(), [loading, setLoading] = useState(false);
  const update = canMaster(access, "role", "update");
  const archive = canMaster(access, "role", "archive");
  const remove = canMaster(access, "role", "delete");
  const index = order.indexOf(role.key);
  function opened(open: boolean) {
    if (!open || usage || loading) return;
    setLoading(true);
    void masterRoles.usage(role.key).then(setUsage).catch(() => undefined).finally(() => setLoading(false));
  }
  const items: RowMenuItem[] = [];
  if (update) items.push({ key: "edit", label: "Ubah", icon: <Pencil size={15} className="text-slate-300" />, onSelect: () => onEdit(role) });
  if (update && mobile)
    items.push(
      {
        key: "up",
        label: "Naikkan",
        icon: <ArrowUp size={15} />,
        disabled: !manualOrder || index <= 0,
        hint: manualOrder ? undefined : "Urutkan berdasarkan Urutan.",
        onSelect: () => onReorder(role, -1)
      },
      {
        key: "down",
        label: "Turunkan",
        icon: <ArrowDown size={15} />,
        disabled: !manualOrder || index >= order.length - 1,
        hint: manualOrder ? undefined : "Urutkan berdasarkan Urutan.",
        onSelect: () => onReorder(role, 1)
      }
    );
  if (archive)
    items.push(
      
      
      role.active
        ? {
          key: "inactive",
          label: "Nonaktifkan",
          icon: <Ban size={15} />,
          disabled: role.protected || (!!usage && !usage.canDeactivate),
          hint: role.protected ? "Peran bawaan dipakai logika aplikasi." : usage?.deactivateReason,
          onSelect: () => onStatus(role, "inactive")
        }
        : { key: "restore", label: "Aktifkan", icon: <RotateCcw size={15} className="text-sky-300" />, onSelect: () => onStatus(role, "active") }
    );
  if (remove)
    items.push(
      {
        key: "delete",
        label: "Hapus",
        tone: "danger",
        icon: <Trash2 size={15} />,
        disabled: role.protected || (!!usage && !usage.canDelete),
        hint: role.protected ? "Peran bawaan dipakai logika aplikasi." : usage?.deleteReason,
        onSelect: () => onDelete(role)
      }
    );
  if (!items.length) return null;
  return (
    <div className="flex shrink-0 items-center justify-end gap-0.5">
      {!mobile && update && (
        <button type="button" className={actionIcon} onClick={() => onEdit(role)} aria-label={`Ubah ${role.name}`} title="Ubah">
          <Pencil size={15} />
        </button>
      )}
      <RowMenu
        name={role.name}
        items={items.filter(item => mobile || item.key !== "edit")}
        mobile={mobile}
        loading={loading}
        onOpenChange={opened}
      />
    </div>
  );
}

export function RolesList(props: Props) {
  const { rows, order, manualOrder, access, highlighted, footer, onReorder, onViewPeople } = props;
  const maxUsage = Math.max(1, ...rows.map(role => role.usageCount));
  const index = (role: Role) => order.indexOf(role.key), canMove = canMaster(access, "role", "update");
  const usage = (role: Role) => (
    <button
      type="button"
      onClick={() => onViewPeople(role.key)}
      aria-label={`${role.usageCount} personel aktif memakai ${role.name}. Lihat daftar`}
      title="Lihat personel"
      className="inline-flex flex-col items-end gap-1.5 rounded-md py-1 focus-visible:outline-none pointer-coarse:min-h-11 pointer-coarse:justify-center"
    >
      <Count value={role.usageCount} unit="personel" />
      <UsageBar value={role.usageCount} max={maxUsage} fill="bg-[#38bdf8]" label="Pemakaian" />
    </button>
  );
  const name = (role: Role) => (
    <span className="flex min-w-0 items-center gap-3">
      <span className="min-w-0">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[14px] font-semibold leading-5 text-slate-50" title={role.name}>{role.name}</span>
          {role.protected && <span className="sr-only">Peran bawaan</span>}
        </span>
        {role.description && <span className="block truncate text-[12px] leading-4 text-slate-400" title={role.description}>{role.description}</span>}
      </span>
    </span>
  );
  const columns: Column<Role>[] = [
    { key: "name", label: "Nama peran", cell: name },
    { key: "usage", label: "Dipakai", w: COL.usage, align: "right", cell: usage },
    {
      key: "order",
      label: "Urutan",
      w: "w-[140px] pointer-coarse:w-[184px]",
      hide: "md",
      align: "right",
      cell: role => (
        <span className="inline-flex items-center justify-end gap-1">
          <span className="w-5 text-right font-dashboard-mono text-[13px] tabular-nums text-slate-300">{index(role) + 1}</span>
          {canMove && (
            <span className="flex items-center">
              <button type="button" disabled={!manualOrder || index(role) <= 0} className={stepClass} aria-label={`Naikkan ${role.name}`} title={manualOrder ? "Naikkan" : "Urutkan berdasarkan Urutan"} onClick={() => onReorder(role, -1)}><ArrowUp size={13} /></button>
              <button type="button" disabled={!manualOrder || index(role) >= order.length - 1} className={stepClass} aria-label={`Turunkan ${role.name}`} title={manualOrder ? "Turunkan" : "Urutkan berdasarkan Urutan"} onClick={() => onReorder(role, 1)}><ArrowDown size={13} /></button>
            </span>
          )}
        </span>
      )
    },
    { key: "status", label: "Status", w: COL.status, cell: role => <MasterBadge value={role.active ? "active" : "inactive"} /> },
    { key: "actions", label: "Aksi", w: COL.actions, align: "right", glyph: true, cell: role => <Actions role={role} {...props} /> }
  ];
  return (
    <DataTable
      label="Daftar Peran"
      columns={columns}
      rows={rows}
      rowId={role => role.key}
      highlighted={highlighted}
      onOpen={() => undefined}
      footer={footer}
      card={role => (
        <div className="p-3">
          <div className="pr-12">
            {name(role)}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <MasterBadge value={role.active ? "active" : "inactive"} />
              <span className="text-[11.5px] text-slate-400">Urutan {index(role) + 1}</span>
            </div>
            <div className="mt-1">{usage(role)}</div>
          </div>
          <div className="absolute right-1.5 top-1.5"><Actions role={role} {...props} mobile /></div>
        </div>
      )}
    />
  );
}
