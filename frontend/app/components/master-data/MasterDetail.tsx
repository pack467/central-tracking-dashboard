"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Check, Copy, History, Lock, Trash2 } from "lucide-react";
import { Modal } from "@/app/components/ui/Modal";
import { masterDataV2 } from "@/app/services/master-data-v2";
import { resolveCategoryColor } from "@/app/lib/category-colors";
import { useMasterSync } from "@/app/hooks/useMasterData";
import { canMaster, type MasterRole } from "@/app/lib/permissions";
import { MASTER_LABELS } from "@/app/lib/master-data-route";
import { findingsForRecord, projectUnmappedCount, type ReviewResult } from "@/app/lib/master-review";
import { MASTER_DATA_P0_ENABLED } from "@/app/lib/master-data-flags";
import { HistoryPanel } from "./MasterHistory";
import { TicketUsage } from "./usage-panel";
import { operationalLink } from "@/app/lib/master-data-links";
import type {
  AuditEntry,
  MasterEntity,
  MasterImpact,
  MasterQuery,
  MasterSnapshotV2,
  MasterSourceBreakdown,
  Organization,
  Project,
  ReviewFindingType,
  Severity,
  System,
  TicketCategory
} from "@/app/types/master-data";
import {
  Avatar,
  EntityIconTile,
  LevelChip,
  SEVERITY_DOT,
  MasterBadge,
  ReviewMarker,
  SeverityBadge,
  buttonClass,
  masterRowName,
  masterRowStatus,
  picName,
  type MasterRow,
  type MasterUsers
} from "./master-ui";
import { useMenuDismiss } from "./menu-ui";
import { DetailHeader, DetailMenu } from "./detail-ui";
interface Props {
  entity: MasterEntity;
  id: string;
  catalog: MasterSnapshotV2;
  users: MasterUsers;
  role: MasterRole;
  review?: ReviewResult;
  /** The tab the drawer opens on; a click on a usage count opens the usage tab straight away. */
  initialSection?: "relations";
  onClose: () => void;
  onEdit: (row: MasterRow) => void;
  onStatus: (row: MasterRow) => void;
  onDelete: (row: MasterRow) => void;
  onRelation: (entity: MasterEntity, query: Partial<MasterQuery>) => void;
  onOpenRecord: (entity: MasterEntity, id: string) => void;
  onReview?: (type: ReviewFindingType) => void;
}
const date = (value: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value));
const relative = (value: string) => {
  const diff = Date.now() - Date.parse(value);
  if (!Number.isFinite(diff)) return "—";
  const minutes = Math.round(diff / 60000);
  if (Math.abs(minutes) < 1) return "baru saja";
  const formatter = new Intl.RelativeTimeFormat("id-ID", { numeric: "auto" });
  if (Math.abs(minutes) < 60) return formatter.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(-hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 31) return formatter.format(-days, "day");
  const months = Math.round(days / 30);
  if (Math.abs(months) < 12) return formatter.format(-months, "month");
  return formatter.format(-Math.round(months / 12), "year");
};
const STATUS: Record<string, string> = { active: "Aktif", inactive: "Nonaktif", archived: "Arsip" };
function DetailCard({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-slate-700/70 bg-[#182234]/60 p-4 ${className}`}>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}
function KeyValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-slate-400">{label}</dt>
      <dd className="mt-0.5 break-words text-[13px] text-slate-200">{children}</dd>
    </div>
  );
}
function LinkChip({ children, onClick, label }: { children: ReactNode; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/50 px-2 py-1 text-left text-[11.5px] text-slate-200 transition-colors duration-150 hover:border-sky-400/40 hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 motion-reduce:transition-none lg:min-h-0"
    >
      <span className="truncate">{children}</span>
      <ArrowUpRight size={12} aria-hidden="true" className="shrink-0 text-sky-300" />
    </button>
  );
}
function CopyButton({ copied, onCopy, label }: { copied: boolean; onCopy: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={label}
      title={label}
      className="inline-grid size-11 shrink-0 place-items-center rounded-md text-slate-400 transition-colors duration-150 hover:bg-slate-700 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 motion-reduce:transition-none lg:size-7"
    >
      {copied ? <Check size={13} className="text-emerald-300" /> : <Copy size={13} />}
    </button>
  );
}
function SourcePills({ source }: { source: MasterSourceBreakdown }) {
  return (
    <div className="flex flex-wrap gap-1.5 text-[11px]">
      <span className="rounded-full border border-slate-600 bg-slate-800 px-2 py-0.5 text-slate-300">ID {source.id}</span>
      <span className="rounded-full border border-sky-400/30 bg-sky-950 px-2 py-0.5 text-sky-200">Pemetaan {source.mapped}</span>
      <span
        title="Record dengan referensi belum jelas; tidak dihitung dalam total proyek/sistem."
        className="rounded-full border border-amber-400/30 bg-amber-950 px-2 py-0.5 text-amber-200"
      >Belum jelas {source.unclear}</span>
    </div>
  );
}
function UsageCard({ label, total, active, source }: { label: string; total: number; active: number; source: MasterSourceBreakdown }) {
  return (
    <div className="rounded-xl border border-slate-700/70 bg-[#0f172a]/45 p-3">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="mt-1 font-dashboard-mono text-lg font-semibold tabular-nums text-slate-50">{total} <span className="font-sans text-[11px] font-normal text-slate-400">{active} aktif</span></p>
      {MASTER_DATA_P0_ENABLED && <div className="mt-2"><SourcePills source={source} /></div>}
    </div>
  );
}
export function MasterDetail(props: Props) {
  const { entity, id, catalog, users, role, review, initialSection, onClose, onEdit, onStatus, onDelete, onRelation, onOpenRecord, onReview } = props;
  const { revision } = useMasterSync();
  const [section, setSection] = useState<string>(initialSection ?? "summary");
  const [retry, setRetry] = useState(0);
  const [moreBusy, setMoreBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const [copied, setCopied] = useState("");
  const menuRef = useRef<HTMLDivElement>(null), copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const key = `${entity}:${id}:${revision}:${retry}`;
  const [result, setResult] = useState<{ key: string; row?: MasterRow; impact?: MasterImpact; audit: AuditEntry[]; page: number; pages: number; error?: string }>({ key: "", audit: [], page: 1, pages: 1 });
  useEffect(
    
    
    () => {
      const controller = new AbortController();
      void Promise.all([masterDataV2.get(entity, id, controller.signal), masterDataV2.getImpact(entity, id, controller.signal), masterDataV2.listAudit(entity, id, 1, controller.signal)]).then(([row, impact, audit]) => {
        if (!controller.signal.aborted) setResult({ key, row, impact, audit: audit.data, page: 1, pages: audit.meta.totalPages });
      }).catch((error: unknown) => { if (!controller.signal.aborted) setResult({ key, audit: [], page: 1, pages: 1, error: error instanceof Error ? error.message : "Gagal memuat detail" }); });
      return () => controller.abort();
    },
    [entity, id, key]
  );
  useMenuDismiss(menu, menuRef, () => setMenu(false));
  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);
  const loading = result.key !== key, row = loading ? undefined : result.row, impact = result.impact;
  const copy = (value: string, keyName: string) => {
    void navigator.clipboard?.writeText(value).then(() => { setCopied(keyName); if (copyTimer.current) clearTimeout(copyTimer.current); copyTimer.current = setTimeout(() => setCopied(""), 1600); }).catch(() => undefined);
  };
  const relation = (label: string, count: number, target: MasterEntity, query: Partial<MasterQuery>) => (
    <button
      type="button"
      onClick={() => onRelation(target, query)}
      className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-slate-700/70 bg-[#0f172a]/40 px-3 text-left transition-colors duration-150 hover:border-sky-400/40 hover:bg-[#243044]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 motion-reduce:transition-none"
    >
      <EntityIconTile entity={target} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold text-slate-100">{label}</span>
        <span className="block text-[11px] text-slate-400">{count} item</span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-sky-300">Lihat daftar<ArrowUpRight size={12} aria-hidden="true" /></span>
    </button>
  );
  async function loadMore() { if (moreBusy) return; setMoreBusy(true); try {
    const next = await masterDataV2.listAudit(entity, id, result.page + 1);
    setResult(current => ({ ...current, audit: [...current.audit, ...next.data], page: next.meta.page, pages: next.meta.totalPages }));
  } catch (cause) {
    setResult(current => ({ ...current, error: cause instanceof Error ? cause.message : "Gagal memuat riwayat" }));
  } finally {
    setMoreBusy(false);
  } }
  const ownFindings = review && row ? findingsForRecord(review.findings, entity, id) : [];
  const organizationId = entity === "organization"
    ? id
    : entity === "project"
      ? (row as Project | undefined)?.organizationId
      : entity === "system" ? catalog.projects.find(project => project.id === (row as System | undefined)?.projectId)?.organizationId : undefined;
  const unmapped = review && organizationId && ["organization", "project"].includes(entity) ? projectUnmappedCount(review.references, organizationId) : 0;
  const parentProject = entity === "system" ? catalog.projects.find(project => project.id === (row as System | undefined)?.projectId) : undefined;
  const parentOrganization = entity === "project"
    ? catalog.organizations.find(org => org.id === (row as Project | undefined)?.organizationId)
    : parentProject ? catalog.organizations.find(org => org.id === parentProject.organizationId) : undefined;
  const parentStatus = entity === "project" ? parentOrganization?.status : parentProject?.status;
  const relationCount = !row
    ? 0
    : entity === "organization"
      ? catalog.projects.filter(project => project.organizationId === id).length + (impact?.systems || 0)
      : entity === "project"
        ? catalog.systems.filter(system => system.projectId === id).length + 1 + ((row as Project).relatedClientIds?.length || 0)
        : entity === "system" ? 1 : entity === "category" ? (row as TicketCategory).usageCount : (row as Severity).usageCount;
  const pic = row ? picName(entity, row, catalog, users) : "";
  const childCount = !row ? 0 : entity === "organization" ? catalog.projects.filter(project => project.organizationId === id).length : entity === "project" ? catalog.systems.filter(system => system.projectId === id).length : 0;
  const usedTotal = !row ? 0 : entity === "category" ? (row as TicketCategory).usageCount : entity === "severity" ? (row as Severity).usageCount : 0;
  // when the record was last changed: its own timestamp, or the newest entry of its history
  const changedAt = row ? ("updatedAt" in row ? row.updatedAt : result.audit[0]?.at) : undefined;
  const systemFallback = !!row &&
    entity === "system" &&
    !(row as System).picUserId &&
    !!parentProject &&
    !!(parentProject.leadUserId || parentProject.legacy?.leadEngineer);
  const description = row ? (entity === "project" ? (row as Project).scope : "description" in row ? row.description : "") : "";
  const relationContent = row && (
    <>
      {entity === "organization" && (
        <>
          {relation("Proyek", catalog.projects.filter(project => project.organizationId === id).length, "project", { organizationId: id })}
          {relation("Sistem", impact?.systems || 0, "system", { organizationId: id })}
        </>
      )}
      {entity === "project" && (
        <>
          {relation(
            "Sistem",
            catalog.systems.filter(system => system.projectId === id).length,
            "system",
            { projectId: id, organizationId: (row as Project).organizationId }
          )}
          {relation(
            "Organisasi pemilik",
            1,
            "organization",
            { q: catalog.organizations.find(org => org.id === (row as Project).organizationId)?.code }
          )}
          {(row as Project).relatedClientIds?.map(clientId => relation(
            catalog.organizations.find(org => org.id === clientId)?.name || "Klien terkait",
            1,
            "organization",
            { q: catalog.organizations.find(org => org.id === clientId)?.code }
          ))}
        </>
      )}
      {entity === "system" &&
        relation(
          "Proyek induk",
          1,
          "project",
          {
            q: catalog.projects.find(project => project.id === (row as System).projectId)?.code,
            organizationId: catalog.projects.find(project => project.id === (row as System).projectId)?.organizationId
          }
        )}
      {impact?.relations && (
        <>
          <div className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">Penggunaan</h3>
            {["organization", "project", "system"].includes(entity) ? (
              <div className="grid gap-2 sm:grid-cols-3">
                <UsageCard
                  label="Tiket"
                  total={impact.relations.tickets.total}
                  active={impact.relations.tickets.active}
                  source={impact.relations.tickets.bySource}
                />
                {impact.relations.checkpoints.total > 0 && (
                  <UsageCard
                    label="Checkpoint"
                    total={impact.relations.checkpoints.total}
                    active={impact.relations.checkpoints.active}
                    source={impact.relations.checkpoints.bySource}
                  />
                )}
                {impact.relations.handovers.total > 0 && (
                  <UsageCard
                    label="Handover"
                    total={impact.relations.handovers.total}
                    active={impact.relations.handovers.active}
                    source={impact.relations.handovers.bySource}
                  />
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-700/70 bg-[#0f172a]/45 p-3">
                <p className="text-sm text-slate-200">{impact.relations.tickets.total} tiket · {impact.relations.tickets.active} aktif</p>
              </div>
            )}
            {MASTER_DATA_P0_ENABLED &&
              ["project", "system"].includes(entity) &&
              (impact.relations.tickets.bySource.unclear + impact.relations.checkpoints.bySource.unclear + impact.relations.handovers.bySource.unclear) > 0 && (
              <p className="text-[11px] leading-4 text-slate-400">Belum jelas = record di organisasi yang referensinya belum dipetakan; tidak dihitung dalam total.</p>
            )}
          </div>
          {MASTER_DATA_P0_ENABLED && !impact.coverageComplete && (
            <p className="rounded-lg border border-amber-400/30 bg-amber-950 p-3 text-xs text-amber-200">Sebagian referensi lama belum dipetakan. Angka 0 berarti belum tercatat, bukan bukti tidak pernah dipakai.</p>
          )}
          {impact.examples && impact.examples.length > 0 && (
            <div className="rounded-xl border border-slate-700/70 bg-[#0f172a]/40 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">Contoh record</p>
              <ul className="mt-2 space-y-2">
                {impact.examples.map(example => {
                  const link = operationalLink(example.sourceType, example.rawProject, example.projectId, catalog);
                  return (
                    <li
                      key={example.recordRef}
                      className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-700/60 pt-2 first:border-0 first:pt-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs text-slate-100">{example.label}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {example.sourceType === "ticket" ? "Tiket" : example.sourceType === "checkpoint" ? "Checkpoint" : "Handover"}
                          {MASTER_DATA_P0_ENABLED ? ` · ${example.via === "id" ? "Lewat ID" : example.via === "mapped" ? "Pemetaan ditinjau" : "Belum jelas"}` : ""}
                          {example.active ? " · Aktif" : ""}
                        </p>
                      </div>
                      <Link
                        href={link.href}
                        scroll={false}
                        className="inline-flex min-h-11 items-center text-[11px] font-semibold text-sky-300 hover:text-sky-200 lg:min-h-8"
                      >
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {!["organization", "project", "system"].includes(entity) && (
            <div
              className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700/80 bg-[#0f172a]/25 px-5 py-8 text-center"
            >
              <span className="inline-grid size-10 place-items-center rounded-xl border border-slate-700 bg-slate-800/70 text-slate-400">
                <History size={18} aria-hidden="true" />
              </span>
              <p className="text-sm font-semibold text-slate-200">Tidak ada relasi struktural</p>
              <p className="max-w-[320px] text-xs leading-5 text-slate-400">{entity === "category" ? "Kategori" : "Severity"} ini dipakai lewat tiket, bukan proyek atau sistem.</p>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Link
              className={buttonClass}
              href={entity === "project" ? operationalLink("ticket", (row as Project).legacyKey, id, catalog).href : "/tickets"}
              scroll={false}
            >Lihat tiket</Link>
            <Link
              className={buttonClass}
              href={entity === "project" ? operationalLink("checkpoint", (row as Project).legacyKey, id, catalog).href : "/monitoring"}
              scroll={false}
            >Lihat checkpoint</Link>
            <Link className={buttonClass} href="/shift-log" scroll={false}>Shift Log</Link>
          </div>
        </>
      )}
      {!impact?.relations && !["organization", "project", "system"].includes(entity) && (
        <div className="flex flex-1 flex-col gap-3">
          <div className="grid grid-cols-3 gap-2">
            {[["Tiket", impact?.tickets || 0, impact?.activeTickets || 0], ["Checkpoint", impact?.checkpoints || 0, impact?.activeCheckpoints || 0], ["Handover", impact?.handovers || 0, impact?.activeHandovers || 0]].map(([label, total, active]) => (
              <div key={String(label)} className="rounded-xl border border-slate-700/70 bg-[#0f172a]/45 p-3 text-center">
                <p className="font-dashboard-mono text-lg font-semibold tabular-nums text-slate-100">{String(total)}</p>
                <p className="text-[11px] text-slate-300">{String(label)}</p>
                <p className="text-[11px] text-slate-400">{String(active)} aktif</p>
              </div>
            ))}
          </div>
          <div
            className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700/80 bg-[#0f172a]/25 px-5 py-8 text-center"
          >
            <span className="inline-grid size-10 place-items-center rounded-xl border border-slate-700 bg-slate-800/70 text-slate-400">
              <History size={18} aria-hidden="true" />
            </span>
            <p className="text-sm font-semibold text-slate-200">Tidak ada relasi struktural</p>
            <p className="max-w-[320px] text-xs leading-5 text-slate-400">{entity === "category" ? "Kategori" : "Severity"} ini dipakai lewat tiket, bukan proyek atau sistem.</p>
            <Link
              href="/tickets"
              scroll={false}
              className="inline-flex min-h-11 items-center text-[11.5px] font-semibold text-sky-300 hover:text-sky-200 lg:min-h-8"
            >Lihat tiket</Link>
          </div>
        </div>
      )}
    </>
  );
  return (
    <Modal open variant="master-drawer" onClose={onClose} label={`Detail ${MASTER_LABELS[entity]}`}>
      <DetailHeader
        lead={<EntityIconTile entity={entity} size="xl" src={row && "logoUrl" in row ? row.logoUrl : undefined} />}
        kicker={MASTER_LABELS[entity]}
        title={row ? masterRowName(entity, row) : "Detail"}
        badges={row && (
          <>
            {entity === "severity" ? <SeverityBadge code={(row as Severity).code} /> : <MasterBadge value={masterRowStatus(entity, row)} />}
            {entity === "organization" && <MasterBadge value={(row as Organization).kind} />}
          </>
        )}
        onEdit={row && canMaster(role, entity, "update") ? () => onEdit(row) : undefined}
        menu={row && (canMaster(role, entity, "archive") || canMaster(role, entity, "delete") && entity !== "severity") && (
          <DetailMenu menuRef={menuRef} open={menu} onToggle={() => setMenu(!menu)}>
            {canMaster(role, entity, "archive") && (
              <button
                type="button"
                role="menuitem"
                className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-rose-300 hover:bg-rose-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-400/60"
                onClick={() => { setMenu(false); onStatus(row); }}
              >
                {masterRowStatus(entity, row) === "active" ? "Arsipkan" : "Pulihkan"}
              </button>
            )}
            {canMaster(role, entity, "delete") && entity !== "severity" && (
              <button
                type="button"
                role="menuitem"
                aria-disabled={impact && !impact.canDelete ? true : undefined}
                title={impact && !impact.canDelete ? impact.deleteReason : undefined}
                className={`flex min-h-11 w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset ${impact && !impact.canDelete ? "cursor-not-allowed text-slate-400 focus-visible:ring-slate-500/60" : "text-rose-300 hover:bg-rose-950 focus-visible:ring-rose-400/60"}`}
                onClick={() => { if (impact && !impact.canDelete) return; setMenu(false); onDelete(row); }}
              >
                <Trash2 size={15} className="mt-0.5 shrink-0" />
                <span className="min-w-0">
                  <span className="block">Hapus</span>
                  {impact && !impact.canDelete && impact.deleteReason && (
                    <span className="mt-0.5 block text-[11px] leading-4 text-slate-400">{impact.deleteReason}</span>
                  )}
                </span>
              </button>
            )}
          </DetailMenu>
        )}
        onClose={onClose}
      />
      <div
        role="tablist"
        tabIndex={-1}
        aria-label="Bagian detail"
        className="grid shrink-0 grid-cols-3 border-b border-slate-700 px-2"
        onKeyDown={event => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          const tabs = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button[role="tab"]')];
          const index = tabs.indexOf(document.activeElement as HTMLButtonElement);
          const next = event.key === "Home" ? 0 : event.key === "End" ? 2 : (index + (event.key === "ArrowRight" ? 1 : -1) + 3) % 3;
          event.preventDefault();
          tabs[next]?.focus();
          tabs[next]?.click();
        }}
      >
        {([["summary", "Ringkasan", 0], ["relations", entity === "category" || entity === "severity" ? "Penggunaan" : "Relasi", relationCount], ["audit", "Riwayat", result.audit.length]] as const).map(([value, label, count]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={section === value}
            tabIndex={section === value ? 0 : -1}
            onClick={() => setSection(value)}
            className={section === value
              ? "relative min-h-11 border-b-2 border-sky-400 text-[13px] font-semibold text-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400/60"
              : "min-h-11 border-b-2 border-transparent text-[13px] text-slate-400 transition-colors duration-150 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400/60 motion-reduce:transition-none"}
          >
            <span className="inline-flex items-center gap-1.5">
              {label}
              {value !== "summary" && count > 0 && (
                <span
                  className="rounded-full border border-slate-700 bg-slate-800/70 px-1.5 py-0.5 font-dashboard-mono text-[11px] tabular-nums text-slate-400"
                >
                  {count}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
      <div
        className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 pb-[max(20px,env(safe-area-inset-bottom))] lg:p-5"
        role="tabpanel"
        aria-label={section === "summary" ? "Ringkasan" : section === "relations" ? (entity === "category" || entity === "severity" ? "Penggunaan" : "Relasi") : "Riwayat"}
      >
        {loading ? (
          <div role="status" aria-label="Memuat detail" className="space-y-4 motion-safe:animate-pulse">
            <div className="h-16 rounded-xl bg-slate-800" />
            <div className="h-36 rounded-xl bg-slate-800" />
            <div className="h-28 rounded-xl bg-slate-800" />
            <div className="h-24 rounded-xl bg-slate-800" />
          </div>
        ) : result.error ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-center">
            <span className="inline-grid size-11 place-items-center rounded-xl border border-rose-400/25 bg-rose-400/10 text-rose-300">
              <AlertTriangle size={20} />
            </span>
            <p role="alert" className="text-sm text-rose-200">{result.error}</p>
            <button type="button" className={buttonClass} onClick={() => setRetry(value => value + 1)}>Coba lagi</button>
          </div>
        ) : row && (
          <>
            {section === "summary" && (
              <>
                {MASTER_DATA_P0_ENABLED && (ownFindings.length > 0 || unmapped > 0 || entity === "system") && (
                  <div className="flex flex-wrap gap-1.5">
                    {ownFindings.map(finding => (
                      <ReviewMarker
                        key={finding.id}
                        label={finding.type === "pic_missing"
                          ? "Belum ada PIC"
                          : finding.type === "pic_legacy"
                            ? "PIC lama"
                            : finding.type === "parent_inactive" ? "Induk nonaktif" : finding.type === "system_coverage" ? "Cakupan sistem" : "Relasi tidak valid"}
                        tone={finding.severity === "error" ? "error" : finding.severity === "info" ? "info" : "warning"}
                        onClick={() => onReview?.(finding.type)}
                      />
                    ))}
                    {unmapped > 0 && <ReviewMarker label={`${unmapped} referensi belum dipetakan`} onClick={() => onReview?.("reference_unmapped")} />}
                    {entity === "project" && unmapped === 0 && (
                      <span
                        className="inline-flex min-h-6 items-center rounded-full border border-emerald-400/30 bg-emerald-950 px-2.5 text-[11px] font-semibold text-emerald-300"
                      >Pemetaan lengkap</span>
                    )}
                    {entity === "system" && systemFallback && (
                      <span
                        className="inline-flex min-h-6 items-center rounded-full border border-sky-400/30 bg-sky-950 px-2.5 text-[11px] font-semibold text-sky-200"
                      >Ikut PIC proyek</span>
                    )}
                  </div>
                )}
                <DetailCard title="Identitas">
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                    {entity === "category" ? (
                      <KeyValue label="Kode">
                        <span className="inline-flex items-center gap-1.5 font-dashboard-mono text-[12px] text-slate-200" title="Kode tetap">{(row as TicketCategory).key}<Lock size={12} aria-hidden="true" className="text-slate-500" /></span>
                      </KeyValue>
                    ) : "code" in row ? (
                      <KeyValue label="Kode">
                        <span className="inline-flex items-center gap-1 font-dashboard-mono text-[12px] tabular-nums text-slate-200">
                          {row.code}
                          <CopyButton copied={copied === "code"} onCopy={() => copy(row.code, "code")} label="Salin kode" />
                        </span>
                      </KeyValue>
                    ) : null}
                    {entity === "organization" && (row as Organization).shortName && <KeyValue label="Nama singkat">{(row as Organization).shortName}</KeyValue>}
                    {entity === "project" && parentOrganization && (
                      <KeyValue label="Organisasi">
                        <LinkChip label={`Buka ${parentOrganization.name}`} onClick={() => onOpenRecord("organization", parentOrganization.id)}>
                          {parentOrganization.shortName || parentOrganization.name}
                        </LinkChip>
                      </KeyValue>
                    )}
                    {entity === "system" && parentProject && (
                      <KeyValue label="Proyek">
                        <LinkChip label={`Buka ${parentProject.name}`} onClick={() => onOpenRecord("project", parentProject.id)}>{parentProject.name}</LinkChip>
                      </KeyValue>
                    )}
                    {entity === "system" && parentOrganization && (
                      <KeyValue label="Organisasi">
                        <LinkChip label={`Buka ${parentOrganization.name}`} onClick={() => onOpenRecord("organization", parentOrganization.id)}>
                          {parentOrganization.shortName || parentOrganization.name}
                        </LinkChip>
                      </KeyValue>
                    )}
                    {entity === "category" && (
                      <KeyValue label="Warna">
                        <span className="inline-flex items-center gap-2">
                          <span aria-hidden="true" className={`size-3 rounded-full ${resolveCategoryColor((row as TicketCategory).key, catalog.categories).dot}`} />
                          {resolveCategoryColor((row as TicketCategory).key, catalog.categories).name}
                        </span>
                      </KeyValue>
                    )}
                    {entity === "severity" && <KeyValue label="Tingkat"><LevelChip level={(row as Severity).level} /></KeyValue>}
                    {entity === "organization" && childCount > 0 && <KeyValue label="Proyek">{childCount} proyek</KeyValue>}
                    {entity === "organization" && (impact?.systems || 0) > 0 && <KeyValue label="Sistem">{impact?.systems} sistem</KeyValue>}
                    {entity === "project" && childCount > 0 && <KeyValue label="Sistem">{childCount} sistem</KeyValue>}
                    {(entity === "category" || entity === "severity") && (
                      <KeyValue label="Pemakaian">
                        {usedTotal ? `${usedTotal} tiket${impact?.relations ? ` · ${impact.relations.tickets.active} aktif` : ""}` : "Belum dipakai"}
                      </KeyValue>
                    )}
                    {changedAt && <KeyValue label="Diubah"><time dateTime={changedAt} title={date(changedAt)}>{relative(changedAt)}</time></KeyValue>}
                  </dl>
                  {parentStatus && parentStatus !== "active" && (
                    <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-950 px-3 py-2 text-[12px] text-amber-200">
                      {entity === "project" ? "Organisasi" : "Proyek"} induk berstatus {STATUS[parentStatus] || parentStatus}.
                    </p>
                  )}
                </DetailCard>
                {(entity === "organization" || entity === "project" || entity === "system") && (
                    <DetailCard title="Penanggung jawab" className="sm:col-span-2">
                      <div className="flex items-center gap-2.5">
                        {pic && pic !== "Belum ditetapkan" ? (
                          <>
                            <Avatar name={pic} size="sm" shape="circle" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-semibold text-slate-100">{pic}</span>
                              <span className="mt-0.5 block text-[11px] text-slate-400">
                                {systemFallback ? "Mengikuti PIC proyek" : entity === "organization" ? "Leader" : entity === "project" ? "PIC" : "PIC sistem"}
                              </span>
                            </span>
                            {systemFallback && (
                              <span className="rounded-full border border-sky-400/30 bg-sky-950 px-2 py-0.5 text-[11px] font-semibold text-sky-200">Ikut PIC proyek</span>
                            )}
                          </>
                        ) : (
                          <>
                            <span aria-hidden="true" className="inline-grid size-8 place-items-center rounded-full border border-slate-700 bg-slate-800 text-slate-400">?</span>
                            <span className="text-[12px] text-slate-400">Belum ditetapkan</span>
                          </>
                        )}
                      </div>
                      {entity === "organization" && ((row as Organization).picContact?.email || (row as Organization).picContact?.phone) && (
                        <p className="mt-2 text-[11px] text-slate-400">
                          {[(row as Organization).picContact?.email, (row as Organization).picContact?.phone].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </DetailCard>
                  )}
                {description ? (
                  <DetailCard title={entity === "project" ? "Lingkup layanan" : "Deskripsi"}>
                    <p className="whitespace-pre-wrap text-[12.5px] leading-5 text-slate-300">{description}</p>
                  </DetailCard>
                ) : null}
              </>
            )}
            {section === "relations" && (
              <div className="flex min-h-full flex-col gap-3">
                {(entity === "category" || entity === "severity") && row
                  ? <TicketUsage entity={entity} row={row as TicketCategory | Severity} fill={entity === "category" ? resolveCategoryColor((row as TicketCategory).key, catalog.categories).dot : SEVERITY_DOT[(row as Severity).code]} />
                  : relationContent}
              </div>
            )}
            {section === "audit" && (
              <HistoryPanel
                entity={entity}
                id={id}
                entries={result.audit}
                catalog={catalog}
                users={users}
                hasMore={result.page < result.pages}
                moreBusy={moreBusy}
                onMore={() => void loadMore()}
              />
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
