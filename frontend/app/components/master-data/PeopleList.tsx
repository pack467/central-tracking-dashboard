"use client";
import { useState, type ReactNode } from "react";
import { Ban, Eye, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { canMaster, type MasterRole } from "@/app/lib/permissions";
import { masterPeople } from "@/app/services/master-data-v2";
import type { Person, PersonUsage, Role } from "@/app/types/master-data";
import { COL, DataTable, Stack, type Column } from "./data-table";
import { Avatar, MasterBadge } from "./master-ui";
import { BLANK, RoleBadge, RowMenu, actionIcon, roleName, type RowMenuItem } from "./team-ui";

export type PersonStatusTarget = "active" | "inactive";
interface Props {
  rows: Person[];
  roles: readonly Omit<Role, "usageCount">[];
  access: MasterRole;
  highlighted: string;
  footer?: ReactNode;
  onDetail: (id: string) => void;
  onEdit: (person: Person) => void;
  onStatus: (person: Person, status: PersonStatusTarget) => void;
  onDelete: (person: Person) => void;
}
function Actions({ person, access, mobile = false, onDetail, onEdit, onStatus, onDelete }: Pick<Props, "access" | "onDetail" | "onEdit" | "onStatus" | "onDelete"> & { person: Person; mobile?: boolean }) {
  const [usage, setUsage] = useState<PersonUsage>(), [loading, setLoading] = useState(false);
  const update = canMaster(access, "person", "update");
  const archive = canMaster(access, "person", "archive");
  const remove = canMaster(access, "person", "delete");
  function opened(open: boolean) {
    if (!open || usage || loading) return;
    setLoading(true);
    void masterPeople.usage(person.id).then(setUsage).catch(() => undefined).finally(() => setLoading(false));
  }
  const leaveBlocked = !!usage && !usage.canDeactivate;
  const items: RowMenuItem[] = [{ key: "detail", label: "Detail", icon: <Eye size={15} className="text-sky-300" />, onSelect: () => onDetail(person.id) }];
  if (update)
    items.push({ key: "edit", label: "Ubah", icon: <Pencil size={15} className="text-slate-300" />, onSelect: () => onEdit(person) });
  if (archive) {
    if (person.status === "active")
      items.push(
        {
          key: "inactive",
          label: "Nonaktifkan",
          icon: <Ban size={15} />,
          disabled: leaveBlocked,
          hint: usage?.deactivateReason,
          onSelect: () => onStatus(person, "inactive")
        }
      ); else {
      items.push(
        
        
        { key: "restore", label: "Aktifkan", icon: <RotateCcw size={15} className="text-sky-300" />, onSelect: () => onStatus(person, "active") }
      );
    }
  }
  if (remove)
    items.push(
      {
        key: "delete",
        label: "Hapus",
        tone: "danger",
        icon: <Trash2 size={15} />,
        disabled: !!usage && !usage.canDelete,
        hint: usage?.deleteReason,
        onSelect: () => onDelete(person)
      }
    );
  return (
    <div className="flex shrink-0 items-center justify-end gap-0.5">
      {!mobile && (
        <button type="button" className={actionIcon} onClick={() => onDetail(person.id)} aria-label={`Detail ${person.fullName}`} title="Detail">
          <Eye size={15} />
        </button>
      )}
      {!mobile && update && (
        <button type="button" className={actionIcon} onClick={() => onEdit(person)} aria-label={`Ubah ${person.fullName}`} title="Ubah">
          <Pencil size={15} />
        </button>
      )}
      <RowMenu name={person.fullName} items={items} mobile={mobile} loading={loading} onOpenChange={opened} />
    </div>
  );
}
const Muted = ({ children }: { children: ReactNode }) => <span className="text-slate-400">{children}</span>;

export function PeopleList(props: Props) {
  const { rows, roles, highlighted, onDetail, footer } = props;
  const columns: Column<Person>[] = [
    {
      key: "name",
      label: "Nama",
      cell: person => (
        <span className="flex min-w-0 items-center gap-3">
          <Avatar name={person.fullName} seed={person.id} size="md" />
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-semibold leading-5 text-slate-50" title={person.fullName}>{person.fullName}</span>
            <span className="block truncate font-dashboard-mono text-[12px] leading-4 tabular-nums text-slate-400">
              {person.employeeId || <span className="font-sans">ID belum diisi</span>}
            </span>
          </span>
        </span>
      )
    },
    { key: "role", label: "Peran", w: "w-[180px]", cell: person => <RoleBadge roleKey={person.roleKey} name={roleName(roles, person.roleKey)} /> },
    {
      key: "contact",
      label: "Email / Telepon",
      w: "w-[260px]",
      hide: "lg",
      cell: person => <Stack title={<span title={person.email}>{person.email || <Muted>{BLANK}</Muted>}</span>} sub={person.phone || BLANK} />
    },
    { key: "status", label: "Status", w: COL.status, cell: person => <MasterBadge value={person.status === "archived" ? "inactive" : person.status} /> },
    { key: "actions", label: "Aksi", w: COL.actions, align: "right", glyph: true, cell: person => <Actions person={person} {...props} /> }
  ];
  return (
    <DataTable
      label="Daftar Personel"
      columns={columns}
      rows={rows}
      rowId={person => person.id}
      highlighted={highlighted}
      onOpen={person => onDetail(person.id)}
      footer={footer}
      card={person => (
        <div className="p-3">
          <button
            type="button"
            onClick={() => onDetail(person.id)}
            className="flex w-full items-start gap-3 pr-12 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
            aria-label={`Detail ${person.fullName}`}
          >
            <Avatar name={person.fullName} seed={person.id} size="md" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-semibold text-slate-50">{person.fullName}</span>
              <span className="mt-0.5 block truncate font-dashboard-mono text-[12px] tabular-nums text-slate-400">
                {person.employeeId || <span className="font-sans">ID belum diisi</span>}
              </span>
              <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <RoleBadge roleKey={person.roleKey} name={roleName(roles, person.roleKey)} />
                <MasterBadge value={person.status === "archived" ? "inactive" : person.status} />
              </span>
              <span className="mt-1 block truncate text-[12px] text-slate-300">{person.email || BLANK}</span>
            </span>
          </button>
          <div className="absolute right-1.5 top-1.5"><Actions person={person} {...props} mobile /></div>
        </div>
      )}
    />
  );
}
