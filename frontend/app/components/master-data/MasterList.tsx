"use client";
import { useRef, useState, type ReactNode } from "react";
import { Archive, Eye, MoreHorizontal, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { masterDataV2 } from "@/app/services/master-data-v2";
import { InactiveTag } from "./team-ui";
import { canMaster, type MasterRole } from "@/app/lib/permissions";
import { findingsForRecord, projectUnmappedCount, type ReviewResult } from "@/app/lib/master-review";
import { resolveCategoryColor } from "@/app/lib/category-colors";
import { MASTER_LABELS } from "@/app/lib/master-data-route";
import type {
  MasterEntity,
  MasterImpact,
  MasterSnapshotV2,
  Organization,
  Project,
  ReviewFindingType,
  Severity,
  System,
  TicketCategory
} from "@/app/types/master-data";
import { COL, Count, DataTable, Stack, type Column } from "./data-table";
import {
  Avatar,
  CategoryTile,
  EntityCell,
  EntityIconTile,
  LevelChip,
  MasterBadge,
  ReviewMarker,
  SEVERITY_DOT,
  SeverityBadge,
  UsageBar,
  masterRowId,
  masterRowName,
  masterRowStatus,
  picName,
  picUser,
  type MasterRow,
  type MasterUsers
} from "./master-ui";
import { actionIcon, menuKeyDown, menuPanelClass, mobileActionIcon, opensUpward, useMenuDismiss } from "./menu-ui";

interface Props {
  entity: MasterEntity;
  rows: MasterRow[];
  catalog: MasterSnapshotV2;
  users: MasterUsers;
  role: MasterRole;
  highlighted: string;
  review?: ReviewResult;
  footer?: ReactNode;
  onReview?: (type: ReviewFindingType) => void;
  onDetail: (id: string, section?: "relations") => void;
  onEdit: (row: MasterRow) => void;
  onStatus: (row: MasterRow) => void;
  onDelete: (row: MasterRow) => void;
}

function markers(entity: MasterEntity, row: MasterRow, catalog: MasterSnapshotV2, review?: ReviewResult): { label: string; type: ReviewFindingType; tone: "warning" | "info" | "error" }[] {
  if (!review || !["organization", "project", "system"].includes(entity)) return [];
  const id = masterRowId(entity, row);
  const own = findingsForRecord(review.findings, entity, id);
  const result: { label: string; type: ReviewFindingType; tone: "warning" | "info" | "error" }[] = [];
  for (const finding of own) {
    const item = { label: finding.type === "pic_missing" ? "Belum ada PIC" : finding.type === "pic_legacy" ? "PIC lama" : finding.type === "parent_inactive" ? "Induk nonaktif" : finding.type === "system_coverage" ? "Cakupan sistem" : "Relasi tidak valid", type: finding.type, tone: finding.severity === "error" ? "error" as const : finding.severity === "info" ? "info" as const : "warning" as const };
    if (!result.some(existing => existing.label === item.label)) result.push(item);
  }
  const organizationId = entity === "organization"
    ? id
    : entity === "project"
      ? (row as Project).organizationId
      : catalog.projects.find(project => project.id === (row as System).projectId)?.organizationId;
  const unmapped = organizationId ? projectUnmappedCount(review.references, organizationId) : 0;
  if (unmapped && (entity === "organization" || entity === "project"))
    result.push({ label: `${unmapped} referensi belum dipetakan`, type: "reference_unmapped", tone: "warning" });
  if (entity === "system" && !(row as System).picUserId) {
    const project = catalog.projects.find(item => item.id === (row as System).projectId);
    if (project && (project.leadUserId || project.legacy?.leadEngineer))
      result.push({ label: "Ikut PIC proyek", type: "pic_missing", tone: "info" });
  }
  return result;
}

const menuItem = "flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-slate-100 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400/60";

/** Detail, Ubah and a menu: the icons are one size and right aligned, so the last one sits under the right edge of the AKSI header. */
function Actions({ row, entity, role, mobile = false, onEdit, onStatus, onDelete, onDetail }: Props & { row: MasterRow; mobile?: boolean }) {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const [check, setCheck] = useState<MasterImpact>();
  const ref = useRef<HTMLDivElement>(null);
  const id = masterRowId(entity, row);
  const name = masterRowName(entity, row);
  const active = masterRowStatus(entity, row) === "active";
  const update = canMaster(role, entity, "update");
  // Hard delete is offered only when the record was never used; the reason is loaded once the menu opens.
  useMenuDismiss(open, ref, () => setOpen(false), { focusFirst: true, onOpen: () => { if (entity !== "severity") void masterDataV2.getImpact(entity, id).then(setCheck).catch(() => undefined); } });
  if (entity === "severity")
    return (
      <div className="flex items-center justify-end">
        {!mobile && <button type="button" className={actionIcon} onClick={() => onDetail(id)} aria-label={`Detail ${name}`} title="Detail"><Eye size={15} /></button>}
        {update && <button type="button" className={mobile ? mobileActionIcon : actionIcon} onClick={() => onEdit(row)} aria-label={`Ubah ${name}`} title="Ubah"><Pencil size={mobile ? 18 : 17} /></button>}
      </div>
    );
  return (
    <div className="flex shrink-0 items-center justify-end" ref={ref}>
      {!mobile && <button type="button" className={actionIcon} onClick={() => onDetail(id)} aria-label={`Detail ${name}`} title="Detail"><Eye size={15} /></button>}
      {!mobile && update && <button type="button" className={actionIcon} onClick={() => onEdit(row)} aria-label={`Ubah ${name}`} title="Ubah"><Pencil size={15} /></button>}
      <div className="relative">
        <button
          type="button"
          className={mobile ? mobileActionIcon : actionIcon}
          aria-label={`Aksi ${name}`}
          title="Aksi"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={event => { setUp(opensUpward(event.currentTarget)); setOpen(!open); }}
        >
          <MoreHorizontal size={mobile ? 20 : 17} />
        </button>
        {open && (
          <div role="menu" tabIndex={-1} aria-label={`Aksi ${name}`} className={menuPanelClass(up)} onKeyDown={menuKeyDown}>
            <button type="button" role="menuitem" className={menuItem} onClick={() => { setOpen(false); onDetail(id); }}><Eye size={15} className="text-sky-300" />Detail</button>
            {update && <button type="button" role="menuitem" className={menuItem} onClick={() => { setOpen(false); onEdit(row); }}><Pencil size={15} className="text-slate-300" />Ubah</button>}
            {canMaster(role, entity, "archive") && (
              <button type="button" role="menuitem" className={`${menuItem} text-rose-300 hover:bg-rose-950 focus-visible:ring-rose-400/60`} onClick={() => { setOpen(false); onStatus(row); }}>
                {active ? <Archive size={15} /> : <RotateCcw size={15} />}
                {entity === "category" ? (active ? "Nonaktifkan" : "Aktifkan") : active ? "Arsipkan" : "Pulihkan"}
              </button>
            )}
            {canMaster(role, entity, "delete") && (
              <button
                type="button"
                role="menuitem"
                aria-disabled={check && !check.canDelete ? true : undefined}
                title={check && !check.canDelete ? check.deleteReason : undefined}
                className={`flex min-h-11 w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset ${check && !check.canDelete ? "cursor-not-allowed text-slate-400 focus-visible:ring-slate-500/60" : "text-rose-300 hover:bg-rose-950 focus-visible:ring-rose-400/60"}`}
                onClick={() => { if (check && !check.canDelete) return; setOpen(false); onDelete(row); }}
              >
                <Trash2 size={15} className="mt-0.5 shrink-0" />
                <span className="min-w-0">
                  <span className="block">Hapus</span>
                  {check && !check.canDelete && check.deleteReason && <span className="mt-0.5 block text-[11px] leading-4 text-slate-400">{check.deleteReason}</span>}
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Pic({ name, status }: { name: string; status?: "active" | "inactive" | "archived" }) {
  if (!name || name === "Belum ditetapkan") return <span className="text-slate-500" aria-label="Belum ditetapkan">—</span>;
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar name={name} size="xs" shape="circle" />
      <span className="truncate text-[13px] text-slate-200" title={name}>{name}</span>
      {status && <InactiveTag status={status} />}
    </span>
  );
}

/** The record's own tile: its logo or grey placeholder, or the colour of a category. */
function Tile({ entity, row, catalog }: { entity: MasterEntity; row: MasterRow; catalog: MasterSnapshotV2 }) {
  if (entity === "organization" || entity === "project" || entity === "system") return <EntityIconTile entity={entity} size="table" src={(row as Organization | Project | System).logoUrl} />;
  if (entity === "category") { const color = resolveCategoryColor((row as TicketCategory).key, catalog.categories); return <CategoryTile chip={color.chip} dot={color.dot} />; }
  return null;
}

function Identity({ entity, row, catalog, rowMarkers, onReview }: { entity: MasterEntity; row: MasterRow; catalog: MasterSnapshotV2; rowMarkers: ReturnType<typeof markers>; onReview?: (type: ReviewFindingType) => void }) {
  if (entity === "severity") return <SeverityBadge code={(row as Severity).code} />;
  if (entity === "category") {
    const category = row as TicketCategory;
    return (
      <span className="flex min-w-0 items-center gap-3">
        <Tile entity={entity} row={row} catalog={catalog} />
        <Stack
          title={<span title={category.name}>{category.name}</span>}
          sub={category.description || (category.key.toLowerCase() === category.name.toLowerCase() ? undefined : category.key)}
        />
      </span>
    );
  }
  const record = row as Organization | Project | System;
  return (
    <span className="flex min-w-0 items-center gap-3">
      <Tile entity={entity} row={row} catalog={catalog} />
      <span className="min-w-0">
        <span className="block truncate text-[14px] font-semibold leading-5 text-slate-50" title={record.name}>{record.name}</span>
        <span className="flex min-w-0 items-center gap-1.5 overflow-hidden">
          <span className="shrink-0 font-dashboard-mono text-[12px] leading-4 tabular-nums text-slate-400">{record.code}</span>
          {rowMarkers.map((marker, index) => (
            <span key={marker.label} className={index > 0 ? "hidden min-w-0 2xl:block" : "hidden min-w-0 xl:block"}>
              <ReviewMarker label={marker.label} tone={marker.tone} onClick={() => onReview?.(marker.type)} />
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}

/** "22 tiket" with a thin bar, one button: it opens the drawer. Nothing used yet reads "Belum dipakai". */
function Usage({ value, max, fill, name, onOpen }: { value: number; max: number; fill: string; name: string; onOpen: () => void }) {
  if (!value) return <span className="text-[12px] text-slate-500">Belum dipakai</span>;
  return (
    <button type="button" onClick={onOpen} aria-label={`Lihat penggunaan ${name}: ${value} tiket`} title="Lihat penggunaan" className="inline-flex flex-col items-end gap-1.5 rounded-md py-1 focus-visible:outline-none pointer-coarse:min-h-11 pointer-coarse:justify-center">
      <Count value={value} unit="tiket" />
      <UsageBar value={value} max={max} fill={fill} label="Pemakaian" />
    </button>
  );
}

function columnsFor(props: Props, maxUsage: number): Column<MasterRow>[] {
  const { entity, catalog, users, onDetail, onReview } = props;
  const identity: Column<MasterRow> = {
    key: "name",
    label: entity === "organization" ? "Organisasi" : entity === "project" ? "Proyek" : entity === "system" ? "Sistem" : entity === "category" ? "Kategori" : "Severity",
    ...(entity === "severity" ? { w: COL.text } : {}),
    cell: row => <Identity entity={entity} row={row} catalog={catalog} rowMarkers={markers(entity, row, catalog, props.review)} onReview={onReview} />,
  };
  const status: Column<MasterRow> = { key: "status", label: "Status", w: COL.status, cell: row => <MasterBadge value={masterRowStatus(entity, row)} /> };
  const actions: Column<MasterRow> = { key: "actions", label: "Aksi", w: COL.actions, align: "right", glyph: true, cell: row => <Actions row={row} {...props} /> };
  const pic = (row: MasterRow) => <Pic name={picName(entity, row, catalog, users)} status={picUser(entity, row, catalog, users)?.status} />;
  const parentOf = (row: MasterRow) => catalog.organizations.find(o => o.id === (row as Project).organizationId);
  if (entity === "organization")
    return [
      identity,
      { key: "kind", label: "Jenis", w: "w-[140px]", hide: "lg", cell: row => <MasterBadge value={(row as Organization).kind} /> },
      { key: "leader", label: "Leader", w: COL.person, hide: "md", cell: pic },
      { key: "projects", label: "Proyek", w: COL.count, align: "right", cell: row => <Count value={catalog.projects.filter(p => p.organizationId === (row as Organization).id).length} unit="proyek" /> },
      status,
      actions,
    ];
  if (entity === "project")
    return [
      identity,
      { key: "organization", label: "Organisasi", w: "w-[240px]", hide: "md", cell: row => <EntityCell entity="organization" logoUrl={parentOf(row)?.logoUrl} title={parentOf(row)?.shortName || parentOf(row)?.name || "—"} sub={parentOf(row)?.code} /> },
      { key: "pic", label: "PIC", w: COL.person, hide: "lg", cell: pic },
      { key: "systems", label: "Sistem", w: COL.count, align: "right", cell: row => <Count value={catalog.systems.filter(s => s.projectId === (row as Project).id).length} unit="sistem" /> },
      status,
      actions,
    ];
  if (entity === "system")
    return [
      identity,
      { key: "project", label: "Proyek", w: "w-[240px]", hide: "md", cell: row => { const project = catalog.projects.find(p => p.id === (row as System).projectId); const organization = catalog.organizations.find(o => o.id === project?.organizationId); return <EntityCell entity="project" logoUrl={project?.logoUrl} title={project?.name || "—"} sub={organization?.shortName || organization?.name || ""} />; } },
      { key: "pic", label: "PIC", w: COL.person, hide: "lg", cell: pic },
      status,
      actions,
    ];
  if (entity === "category")
    return [
      identity,
      { key: "usage", label: "Dipakai", w: COL.usage, align: "right", cell: row => <Usage value={(row as TicketCategory).usageCount} max={maxUsage} fill={resolveCategoryColor((row as TicketCategory).key, catalog.categories).dot} name={masterRowName(entity, row)} onOpen={() => onDetail(masterRowId(entity, row), "relations")} /> },
      status,
      actions,
    ];
  return [
    { ...identity, w: "w-[12%]" },
    { key: "display", label: "Nama tampil", w: "w-[18%]", cell: row => <span className="block truncate text-[14px] font-semibold text-slate-50" title={(row as Severity).displayName}>{(row as Severity).displayName}</span> },
    { key: "level", label: "Tingkat", w: "w-[13%]", cell: row => <LevelChip level={(row as Severity).level} /> },
    { key: "description", label: "Deskripsi", hide: "lg", cell: row => (row as Severity).description ? <span className="block truncate text-[13px] text-slate-300" title={(row as Severity).description}>{(row as Severity).description}</span> : <span className="text-slate-500" aria-label="Belum diisi">-</span> },
    { key: "usage", label: "Dipakai", w: COL.usage, align: "right", cell: row => <Usage value={(row as Severity).usageCount} max={maxUsage} fill={SEVERITY_DOT[(row as Severity).code]} name={masterRowName(entity, row)} onOpen={() => onDetail(masterRowId(entity, row), "relations")} /> },
    actions,
  ];
}

/** The row as a card, for narrow screens: the same facts, one column, the menu a 44 px button. */
function RowCard({ row, ctx, maxUsage }: { row: MasterRow; ctx: Props; maxUsage: number }) {
  const { entity, catalog, users, onDetail } = ctx;
  const id = masterRowId(entity, row), name = masterRowName(entity, row);
  const pic = picName(entity, row, catalog, users);
  const lines: string[] = [];
  let usage: ReactNode = null, badges: ReactNode, parent: ReactNode = null;
  if (entity === "organization") {
    const o = row as Organization;
    lines.push(o.code, `Leader: ${pic}`);
    usage = <Count value={catalog.projects.filter(p => p.organizationId === o.id).length} unit="proyek" />;
    badges = <><MasterBadge value={o.status} /><MasterBadge value={o.kind} /></>;
  } else if (entity === "project") {
    const p = row as Project, owner = catalog.organizations.find(o => o.id === p.organizationId);
    lines.push(p.code, `PIC: ${pic}`);
    parent = <EntityCell entity="organization" logoUrl={owner?.logoUrl} title={owner?.shortName || owner?.name || "—"} sub={owner?.code} />;
    usage = <Count value={catalog.systems.filter(s => s.projectId === p.id).length} unit="sistem" />;
    badges = <MasterBadge value={p.status} />;
  } else if (entity === "system") {
    const s = row as System, project = catalog.projects.find(p => p.id === s.projectId), owner = catalog.organizations.find(o => o.id === project?.organizationId);
    lines.push(s.code, `PIC: ${pic}`);
    parent = <EntityCell entity="project" logoUrl={project?.logoUrl} title={project?.name || "—"} sub={owner?.shortName || owner?.name || ""} />;
    badges = <MasterBadge value={s.status} />;
  } else if (entity === "category") {
    const c = row as TicketCategory;
    lines.push(c.description ? `${c.key} · ${c.description}` : c.key);
    usage = c.usageCount ? <span className="flex items-center gap-2"><Count value={c.usageCount} unit="tiket" /><UsageBar value={c.usageCount} max={maxUsage} fill={resolveCategoryColor(c.key, catalog.categories).dot} label="Pemakaian" /></span> : <span className="text-[12px] text-slate-500">Belum dipakai</span>;
    badges = <MasterBadge value={c.active ? "active" : "inactive"} />;
  } else {
    const s = row as Severity;
    lines.push(s.code, s.description || "Belum diisi");
    usage = s.usageCount ? <span className="flex items-center gap-2"><Count value={s.usageCount} unit="tiket" /><UsageBar value={s.usageCount} max={maxUsage} fill={SEVERITY_DOT[s.code]} label="Pemakaian" /></span> : <span className="text-[12px] text-slate-500">Belum dipakai</span>;
    badges = <LevelChip level={s.level} />;
  }
  return (
    <div className="p-3">
      <button type="button" onClick={() => onDetail(id)} aria-label={`Detail ${name}`} className="flex w-full items-start gap-3 pr-12 text-left focus-visible:outline-none">
        {entity === "severity" ? <span className="pt-0.5"><SeverityBadge code={(row as Severity).code} /></span> : <Tile entity={entity} row={row} catalog={catalog} />}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold text-slate-50">{name}</span>
          {lines.map((line, index) => <span key={index} className={`mt-0.5 block truncate text-[12px] ${index === 0 ? "font-dashboard-mono text-slate-400" : "text-slate-300"}`}>{line}</span>)}
          {parent && <span className="mt-2 block">{parent}</span>}
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">{badges}</span>
          {usage && <span className="mt-1.5 block">{usage}</span>}
        </span>
      </button>
      <div className="absolute right-1.5 top-1.5"><Actions row={row} {...ctx} mobile /></div>
    </div>
  );
}

export function MasterList(props: Props) {
  const { entity, rows, highlighted, onDetail, footer } = props;
  const maxUsage = Math.max(1, ...rows.map(row => "usageCount" in row ? Number((row as TicketCategory | Severity).usageCount) : 0));
  return (
    <DataTable
      label={`Daftar ${MASTER_LABELS[entity]}`}
      columns={columnsFor(props, maxUsage)}
      rows={rows}
      rowId={row => masterRowId(entity, row)}
      highlighted={highlighted}
      onOpen={row => onDetail(masterRowId(entity, row))}
      card={row => <RowCard row={row} ctx={props} maxUsage={maxUsage} />}
      footer={footer}
    />
  );
}
