"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Ban, RotateCcw, Trash2 } from "lucide-react";
import { Modal } from "@/app/components/ui/Modal";
import { useMasterSync } from "@/app/hooks/useMasterData";
import { canMaster, type MasterRole } from "@/app/lib/permissions";
import { SHIFT_LABELS } from "@/app/lib/master-people";
import { paths, routes, withQuery } from "@/app/lib/routes";
import { masterPeople } from "@/app/services/master-data-v2";
import type { AnyMasterEntity, AuditEntry, MasterSnapshotV2, Person, PersonUsage, Role } from "@/app/types/master-data";
import { DetailCard, KeyValue, LinkChip, DetailHeader, DetailMenu } from "./detail-ui";
import { HistoryPanel, formatDateTime, relativeTime } from "./MasterHistory";
import { Avatar, MasterBadge, buttonClass, type MasterUsers } from "./master-ui";
import { useMenuDismiss } from "./menu-ui";
import { BLANK, RoleBadge, roleName } from "./team-ui";
import type { PersonStatusTarget } from "./PeopleList";
import { OrgAssignField } from "./OrgAssignField";

interface Props {
  id: string;
  catalog: MasterSnapshotV2;
  roles: readonly Omit<Role, "usageCount">[];
  users: MasterUsers;
  access: MasterRole;
  onClose: () => void;
  onEdit: (person: Person) => void;
  onStatus: (person: Person, status: PersonStatusTarget) => void;
  onDelete: (person: Person) => void;
  onOpenRecord: (entity: AnyMasterEntity, id: string) => void;
}
const joinLabel = (iso?: string) => iso ? new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`)) : BLANK;
const MenuButton = "flex min-h-11 w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset";

export function PersonDetail({ id, catalog, roles, users, access, onClose, onEdit, onStatus, onDelete, onOpenRecord }: Props) {
  const { revision } = useMasterSync(), key = `${id}:${revision}`;
  const [section, setSection] = useState("summary");
  const [retry, setRetry] = useState(0);
  const [menu, setMenu] = useState(false);
  const [moreBusy, setMoreBusy] = useState(false);
  const [result, setResult] = useState<{ key: string; person?: Person; usage?: PersonUsage; audit: AuditEntry[]; page: number; pages: number; error?: string }>({ key: "", audit: [], page: 1, pages: 1 });
  const menuRef = useRef<HTMLDivElement>(null), full = `${key}:${retry}`;
  useEffect(
    
    
    () => {
      const controller = new AbortController();
      void Promise.all([masterPeople.get(id, controller.signal), masterPeople.usage(id, controller.signal), masterPeople.listAudit(id, 1, controller.signal)]).then(([person, usage, audit]) => {
        if (!controller.signal.aborted) setResult({ key: full, person, usage, audit: audit.data, page: 1, pages: audit.meta.totalPages });
      }).catch((cause: unknown) => { if (!controller.signal.aborted) setResult({ key: full, audit: [], page: 1, pages: 1, error: cause instanceof Error ? cause.message : "Gagal memuat detail" }); });
      return () => controller.abort();
    },
    [id, full]
  );
  useMenuDismiss(menu, menuRef, () => setMenu(false));
  const loading = result.key !== full, person = loading ? undefined : result.person, usage = loading ? undefined : result.usage;
  const update = canMaster(access, "person", "update");
  const archive = canMaster(access, "person", "archive");
  const remove = canMaster(access, "person", "delete");
  async function loadMore() {
    if (moreBusy) return; setMoreBusy(true);
    try {
      const next = await masterPeople.listAudit(id, result.page + 1);
      setResult(current => ({ ...current, audit: [...current.audit, ...next.data], page: next.meta.page, pages: next.meta.totalPages }));
    } catch (cause) {
      setResult(current => ({ ...current, error: cause instanceof Error ? cause.message : "Gagal memuat riwayat" }));
    } finally {
      setMoreBusy(false);
    }
  }
  const pic = usage ? usage.organizations.length + usage.projects.length + usage.systems.length : 0;
  const ticketsHref = person ? withQuery(paths.tickets, new URLSearchParams({ q: person.fullName }).toString()) : paths.tickets;
  const stat = (label: string, value: number | string, sub?: string) => (
    <div className="rounded-xl border border-slate-700/70 bg-[#0f172a]/45 p-3">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="mt-1 font-dashboard-mono text-lg font-semibold tabular-nums text-slate-50">
        {value}
        {sub && <span className="ml-1.5 font-sans text-[11px] font-normal text-slate-400">{sub}</span>}
      </p>
    </div>
  );
  const list = (title: string, entity: AnyMasterEntity, items: PersonUsage["projects"]) => items.length > 0 && (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map(item => (
          <LinkChip key={item.id} label={`Buka ${item.label}`} onClick={() => onOpenRecord(entity, item.id)}>{item.label}</LinkChip>
        ))}
      </div>
    </div>
  );
  const menuItem = (label: string, icon: ReactNode, onClick: () => void, opts: { danger?: boolean; disabled?: boolean; hint?: string } = {}) => (
    <button
      type="button"
      role="menuitem"
      aria-disabled={opts.disabled || undefined}
      title={opts.disabled ? opts.hint : undefined}
      className={`${MenuButton} ${opts.disabled ? "cursor-not-allowed text-slate-400 focus-visible:ring-slate-500/60" : opts.danger ? "text-rose-300 hover:bg-rose-950 focus-visible:ring-rose-400/60" : "text-slate-100 hover:bg-slate-700 focus-visible:ring-sky-400/60"}`}
      onClick={() => { if (opts.disabled) return; setMenu(false); onClick(); }}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className="block">{label}</span>
        {opts.disabled && opts.hint && <span className="mt-0.5 block text-[11px] leading-4 text-slate-400">{opts.hint}</span>}
      </span>
    </button>
  );
  return (
    <Modal open variant="master-drawer" onClose={onClose} label="Detail Personel">
      <DetailHeader
        lead={<Avatar name={person?.fullName || "Personel"} seed={id} size="xl" />}
        kicker="Personel"
        title={person?.fullName || "Detail"}
        badges={person && (
          <>
            <MasterBadge value={person.status === "archived" ? "inactive" : person.status} />
          </>
        )}
        onEdit={person && update ? () => onEdit(person) : undefined}
        menu={person && (archive || remove) && (
          <DetailMenu menuRef={menuRef} open={menu} onToggle={() => setMenu(!menu)}>
            {archive &&
              (person.status === "active" ? (
                  <>
                    {menuItem(
                      "Nonaktifkan",
                      <Ban size={15} />,
                      () => onStatus(person, "inactive"),
                      { disabled: !!usage && !usage.canDeactivate, hint: usage?.deactivateReason }
                    )}
                  </>
                ) : (
                  <>
                    {menuItem("Aktifkan", <RotateCcw size={15} className="text-sky-300" />, () => onStatus(person, "active"))}
                  </>
                ))}
            {remove &&
              menuItem(
                "Hapus",
                <Trash2 size={15} />,
                () => onDelete(person),
                { danger: true, disabled: !!usage && !usage.canDelete, hint: usage?.deleteReason }
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
        {([["summary", "Ringkasan", 0], ["usage", "Penggunaan", pic + (usage?.tickets || 0)], ["audit", "Riwayat", result.audit.length]] as const).map(([value, label, count]) => (
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
        aria-label={section === "summary" ? "Ringkasan" : section === "usage" ? "Penggunaan" : "Riwayat"}
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
        ) : person && (
          <>
            {section === "summary" && (
              <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
                <DetailCard title="Identitas" className="sm:col-span-2">
                  <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {person.employeeId && (
                      <KeyValue label="ID pegawai"><span className="font-dashboard-mono text-[12px] tabular-nums">{person.employeeId}</span></KeyValue>
                    )}
                    {person.email && <KeyValue label="Email">{person.email}</KeyValue>}
                    {person.phone && <KeyValue label="Telepon">{person.phone}</KeyValue>}
                    <KeyValue label="Diubah"><time dateTime={person.updatedAt} title={formatDateTime(person.updatedAt)}>{relativeTime(person.updatedAt)}</time></KeyValue>
                  </dl>
                </DetailCard>
                <DetailCard title="Penugasan" className="sm:col-span-2">
                  <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <KeyValue label="Peran"><RoleBadge roleKey={person.roleKey} name={roleName(roles, person.roleKey)} /></KeyValue>
                    {person.defaultShift && <KeyValue label="Shift default">{SHIFT_LABELS[person.defaultShift]}</KeyValue>}
                    {person.joinDate && <KeyValue label="Tanggal bergabung">{joinLabel(person.joinDate)}</KeyValue>}
                  </dl>
                  <dl className="mt-3 grid grid-cols-1 gap-3 border-t border-slate-700/60 pt-3 sm:grid-cols-2">
                    <KeyValue label="Jabatan"><OrgAssignField kind="position" personId={person.id} editable={canMaster(access, "position", "update")} /></KeyValue>
                    <KeyValue label="Departemen"><OrgAssignField kind="department" personId={person.id} editable={canMaster(access, "department", "update")} /></KeyValue>
                  </dl>
                  <p className="mt-2 text-[11px] text-slate-400">Jabatan dan departemen tersimpan di browser ini (belum ada di backend).</p>
                  {usage?.lastHolderOf && <p className="mt-3 text-[11.5px] text-amber-200">Satu-satunya {usage.lastHolderOf} aktif.</p>}
                </DetailCard>
                {person.notes ? (
                  <DetailCard title="Catatan" className="sm:col-span-2">
                    <p className="whitespace-pre-wrap text-[12.5px] leading-5 text-slate-300">{person.notes}</p>
                  </DetailCard>
                ) : null}
              </div>
            )}
            {section === "usage" && usage && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {stat("Tiket", usage.tickets, `${usage.activeTickets} aktif`)}
                  {pic > 0 && stat("Leader / PIC", pic, "entri")}
                  {usage.checkpoints > 0 && stat("Checkpoint", usage.checkpoints)}
                  {usage.handovers > 0 && stat("Handover", usage.handovers)}
                  {usage.scheduleEntries > 0 && stat("Jadwal shift", usage.scheduleEntries, "hari/minggu")}
                  {usage.swapRequests > 0 && stat("Tukar shift", usage.swapRequests)}
                </div>
                {list("Organisasi (Leader)", "organization", usage.organizations)}
                {list("Proyek (PIC)", "project", usage.projects)}
                {list("Sistem (PIC)", "system", usage.systems)}
                {usage.ticketExamples.length > 0 && (
                  <div className="rounded-xl border border-slate-700/70 bg-[#0f172a]/40 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">Contoh tiket</p>
                    <ul className="mt-2 space-y-1.5">
                      {usage.ticketExamples.map(example => (
                        <li key={example.id} className="truncate text-xs text-slate-200">
                          {example.label}
                          {example.active && <span className="ml-1.5 text-[11px] text-sky-300">aktif</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Link className={buttonClass} href={ticketsHref} scroll={false}>Lihat daftar tiket<ArrowUpRight size={14} aria-hidden="true" /></Link>
                  <Link className={buttonClass} href={routes.member(person.id)} scroll={false}>Lihat jadwal<ArrowUpRight size={14} aria-hidden="true" /></Link>
                </div>
                {pic + usage.tickets + usage.checkpoints + usage.handovers + usage.scheduleEntries === 0 && (
                  <p className="rounded-xl border border-dashed border-slate-700/80 bg-[#0f172a]/25 p-4 text-center text-xs text-slate-400">Belum dipakai di mana pun.</p>
                )}
              </div>
            )}
            {section === "audit" && (
              <HistoryPanel
                entity="person"
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
