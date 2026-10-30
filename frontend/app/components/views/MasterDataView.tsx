"use client";
import { Suspense, useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronRight, Database } from "lucide-react";
import { useAppData } from "@/app/components/routing/AppShell";
import { useAuth } from "@/app/lib/auth";
import { masterRole } from "@/app/lib/permissions";
import { MASTER_DATA_P0_ENABLED } from "@/app/lib/master-data-flags";
import { MASTER_GROUPS, MASTER_LABELS, isOrgEntity } from "@/app/lib/master-data-route";
import { useOrgCatalog } from "@/app/hooks/useOrgCatalog";
import { OrgCatalogPanel } from "@/app/components/master-data/OrgCatalogPanel";
import { useMasterCatalog, useMasterReview, usePeople, useRoles } from "@/app/hooks/useMasterData";
import { rolesFromBackend } from "@/app/services/backend-team";
import { useAccess } from "@/app/hooks/useAccess";
import { useMasterRoute } from "@/app/hooks/useMasterRoute";
import { MasterNavigation } from "@/app/components/master-data/MasterNavigation";
import { CatalogPanel } from "@/app/components/master-data/CatalogPanel";
import { TeamPanel } from "@/app/components/master-data/TeamPanel";
import { ListSkeleton } from "@/app/components/master-data/list-chrome";
import { MasterTools } from "@/app/components/master-data/MasterTools";
import type { MasterUsers } from "@/app/components/master-data/master-ui";
import type { AnyMasterEntity } from "@/app/types/master-data";

/** `hint` says what is counted when it is not obvious; it lives in the tooltip and the accessible name, not in extra text under the number. */
type StatItem = { key: string; count: number; label: string; hint?: string; target?: AnyMasterEntity };
const STAT_COLUMNS = { 2: "grid-cols-2", 3: "grid-cols-3" } as const;
function Stat({ item, onOpen }: { item: StatItem; onOpen: (entity: AnyMasterEntity) => void }) {
  const content = <>
    <span className="block font-dashboard-mono text-[19px] font-semibold leading-7 tabular-nums text-slate-50 sm:text-[22px] min-[1025px]:text-[24px]">{item.count}</span>
    <span className="block text-[12px] leading-4 text-slate-400">{item.label}</span>
  </>;
  const base = "min-w-0 px-4 py-1 text-left min-[1025px]:min-w-[112px]";
  return item.target ? (
    <button
      type="button"
      onClick={() => onOpen(item.target!)}
      aria-label={`${MASTER_LABELS[item.target]}: ${item.count}. Buka daftar`}
      className={`${base} rounded-lg transition-colors duration-150 hover:bg-slate-400/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 motion-reduce:transition-none`}
    >
      {content}
    </button>
  ) : (
    <div className={base} title={item.hint} aria-label={item.hint ? `${item.label}, ${item.hint}: ${item.count}` : undefined}>
      {content}
    </div>
  );
}
export function MasterDataView() { return <Suspense fallback={<ListSkeleton count={8} />}><MasterDataContent /></Suspense>; }
function MasterDataContent() {
  const { catalog, sync } = useMasterCatalog(), route = useMasterRoute(catalog, sync.ready), { entity } = route;
  const review = useMasterReview(), appData = useAppData(), { user } = useAuth(), people = usePeople();
  const access = masterRole(user || undefined);
  /** The people master is the single source for every PIC picker and every PIC label. */
  const users: MasterUsers = useMemo(
    () => people.map(person => ({ id: person.id, name: person.fullName, email: person.email, phone: person.phone, status: person.status })),
    [people]
  );
  const openEntity = (next: AnyMasterEntity) => route.select(next);
  // roles and people come from the backend when those modules are connected; the filters below read them from the catalog
  const roles = useRoles(), positions = useOrgCatalog("position"), departments = useOrgCatalog("department");
  const { can } = useAccess();
  const rolesReadable = !rolesFromBackend() || can("roles.view");
  const leadKey = rolesFromBackend() ? "TEAM_LEAD" : "Shift Lead";
  const hasLead = roles.some(role => role.key === leadKey);
  const summary: StatItem[] = route.group === "services"
    ? [
      { key: "organization", count: catalog.organizations.filter(o => o.status === "active").length, label: "Organisasi aktif", target: "organization" },
      { key: "project", count: catalog.projects.filter(p => p.status === "active").length, label: "Proyek aktif", target: "project" },
      { key: "system", count: catalog.systems.filter(s => s.status === "active").length, label: "Sistem aktif", target: "system" }
    ]
    : route.group === "team"
      ? [
        { key: "person", count: people.filter(person => person.status === "active").length, label: "Personel aktif", target: "person" },
        ...(rolesReadable ? [{ key: "role", count: roles.filter(role => role.active).length, label: "Peran aktif", target: "role" as const }] : []),
        ...(hasLead ? [{ key: "lead", count: people.filter(person => person.status === "active" && person.roleKey === leadKey).length, label: "Shift Lead aktif" }] : [])
      ]
      : [
        { key: "category", count: catalog.categories.filter(c => c.active).length, label: "Kategori aktif", target: "category" as const },
        { key: "tickets", count: appData?.tickets.length || 0, label: "Tiket terhubung", hint: "semua tiket dari semua klien" }
      ];
  const teamCatalog = useMemo(() => rolesFromBackend() ? { ...catalog, roles: roles.map(role => ({ ...role, usageCount: 0 })) } : catalog, [catalog, roles]);
  const counts = {
    organization: catalog.organizations.length,
    project: catalog.projects.length,
    system: catalog.systems.length,
    category: catalog.categories.length,
    severity: catalog.severities.filter(s => s.code !== "critical").length,
    person: people.length,
    role: rolesReadable ? roles.length : null,
    position: positions.items.length,
    department: departments.items.length
  };
  const savedAt = sync.lastSavedAt ? new Date(sync.lastSavedAt) : null;
  const stamp = savedAt
    ? `${new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }).format(savedAt)}, ${new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Jakarta" }).format(savedAt)}`
    : "";
  const syncLabel = !sync.ready
    ? "Memuat…"
    : sync.status === "saving"
      ? "Menyimpan…"
      : sync.status === "failed" ? "Gagal menyimpan" : sync.status === "session" ? "Hanya sesi ini" : `Diperbarui ${stamp}`.trim();
  const syncHint = sync.status === "session"
    ? "Penyimpanan browser tidak tersedia. Perubahan hanya bertahan selama sesi ini."
    : "Tersimpan di browser ini; tidak dibagikan ke perangkat lain.";
  const syncText = sync.status === "failed" ? "text-rose-300" : sync.status === "saving" || sync.status === "session" ? "text-amber-300" : "text-slate-400";
  const syncDot = sync.status === "failed"
    ? "bg-rose-400"
    : sync.status === "saving" || sync.status === "session" ? "bg-amber-300" : "bg-emerald-400";
  const reviewCount = review.findings.length, showReview = MASTER_DATA_P0_ENABLED;
  return (
    <div data-master-data-v2 className="min-w-0 space-y-4 text-slate-100">
      <nav aria-label="Breadcrumb" className="hidden flex-wrap items-center gap-1.5 text-[11px] text-slate-400 lg:flex">
        <Link
          href="/dashboard"
          className="transition-colors duration-150 hover:text-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
        >Dashboard</Link>
        <ChevronRight size={12} aria-hidden="true" />
        <span>Master Data</span>
        <ChevronRight size={12} aria-hidden="true" />
        <span>{MASTER_GROUPS[route.group]}</span>
        <ChevronRight size={12} aria-hidden="true" />
        <span aria-current="page" className="text-slate-200">
          {showReview && route.view === "review" ? "Perlu ditinjau" : MASTER_LABELS[entity]}
        </span>
      </nav>
      <header className="rounded-2xl border border-[rgba(148,163,184,0.12)] bg-[#1e293b]/60 px-4 py-4 lg:px-5 [@media(max-height:520px)]:py-2">
        <div className="flex min-w-0 flex-col gap-3 min-[1025px]:flex-row min-[1025px]:items-center min-[1025px]:justify-between min-[1025px]:gap-6">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden="true" className="inline-grid size-10 shrink-0 place-items-center rounded-xl border border-slate-700 bg-slate-800/70 text-sky-300">
              <Database size={20} />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-[20px] font-semibold leading-7 tracking-tight text-slate-50 sm:text-[24px]">Master Data</h1>
              <p
                role="status"
                title={sync.error || syncHint}
                aria-label={`${syncLabel}. ${syncHint}`}
                className={`mt-0.5 flex items-center gap-1.5 text-[12px] leading-4 max-sm:hidden ${syncText}`}
              >
                <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${syncDot}`} />
                {syncLabel}
              </p>
            </div>
            {showReview && (
              <div className="ml-auto flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => route.openReview()}
                  aria-label={`Perlu ditinjau, ${reviewCount} temuan`}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 text-[12px] font-semibold text-amber-200 transition-colors duration-150 hover:bg-amber-400/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 motion-reduce:transition-none lg:min-h-8"
                ><AlertTriangle size={13} aria-hidden="true" />Perlu ditinjau<span className="font-dashboard-mono tabular-nums text-amber-100">{reviewCount}</span></button>
                <MasterTools />
              </div>
            )}
          </div>
          <div
            role="group"
            aria-label="Ringkasan"
            className={`grid ${STAT_COLUMNS[summary.length as 2 | 3]} divide-x divide-slate-700/70 max-[1024px]:border-t max-[1024px]:border-slate-700/60 max-[1024px]:pt-3 min-[1025px]:flex min-[1025px]:items-stretch [@media(max-height:520px)]:hidden`}
          >
            {summary.map(item => <Stat key={item.key} item={item} onOpen={openEntity} />)}
          </div>
          <p aria-hidden="true" className={`flex items-center gap-1.5 text-[12px] leading-4 sm:hidden ${syncText}`}>
            <span className={`size-1.5 shrink-0 rounded-full ${syncDot}`} />
            {syncLabel}
          </p>
        </div>
      </header>
      <MasterNavigation entity={entity} counts={counts} onSelect={openEntity} />
      {isOrgEntity(entity) ? (
        <OrgCatalogPanel key={entity} kind={entity} route={route} catalog={catalog} access={access} people={people} />
      ) : route.group === "team" ? (
        <TeamPanel route={route} catalog={teamCatalog} access={access} users={users} />
      ) : (
        <CatalogPanel route={route} catalog={catalog} access={access} users={users} />
      )}
    </div>
  );
}
