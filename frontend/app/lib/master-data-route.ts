import { MASTER_DATA_P0_ENABLED } from "@/app/lib/master-data-flags";
import type { AnyMasterEntity, MasterQuery, ReviewFindingType } from "@/app/types/master-data";
export const MASTER_TABS = { organization: "organizations", project: "projects", system: "systems", category: "categories", severity: "severities", person: "people", role: "roles", position: "positions", department: "departments" } as const;
export const MASTER_LABELS: Record<AnyMasterEntity, string> = {
  organization: "Organisasi",
  project: "Proyek",
  system: "Sistem",
  category: "Kategori",
  severity: "Severity",
  person: "Personel",
  role: "Peran",
  position: "Jabatan",
  department: "Departemen"
};
export const MASTER_GROUPS = { services: "Organisasi & Layanan", tickets: "Referensi Tiket", team: "Tim & Operasional" } as const;
export type MasterGroup = keyof typeof MASTER_GROUPS;
export const REVIEW_TYPES: readonly ReviewFindingType[] = ["pic_missing", "pic_legacy", "reference_unmapped", "reference_ambiguous", "parent_inactive", "system_coverage", "invalid_relation"];
export type MasterView = "list" | "review";
export type MasterSort = NonNullable<MasterQuery["sort"]>;
export const MASTER_SORTS: Record<MasterSort, string> = { order: "Manual", name: "A–Z", "-name": "Z–A", updated: "Terlama diubah", "-updated": "Terakhir diubah", "-usage": "Terbanyak dipakai" };
/** Sort options offered by the toolbar; categories lead with the order set in "Atur urutan", the order the ticket picker uses. */
export function sortOptions(entity: AnyMasterEntity): MasterSort[] {
  if (entity === "category") return ["order", "name", "-name", "-usage", "-updated"];
  return entity === "severity" || entity === "role" || isOrgEntity(entity) ? ["order", "name", "-name", "-updated"] : ["name", "-name", "-updated"];
}
export function defaultSort(entity: AnyMasterEntity): MasterSort { return sortOptions(entity)[0]; }
export function entityGroup(entity: AnyMasterEntity): MasterGroup {
  return entity === "category" || entity === "severity" ? "tickets" : entity === "person" || entity === "role" || isOrgEntity(entity) ? "team" : "services";
}
export const isTeamEntity = (entity: AnyMasterEntity): entity is "person" | "role" => entity === "person" || entity === "role";
/** Jabatan and Departemen: kept in this browser until the backend has them (app/lib/org-catalog.ts). */
export const isOrgEntity = (entity: AnyMasterEntity): entity is "position" | "department" => entity === "position" || entity === "department";
export const GROUP_ENTITIES: Record<MasterGroup, readonly AnyMasterEntity[]> = { services: ["organization", "project", "system"], tickets: ["category", "severity"], team: ["person", "role", "position", "department"] };
export interface MasterRoute {
  entity: AnyMasterEntity;
  group: MasterGroup;
  query: MasterQuery;
  detail: string;
  view: MasterView;
  reviewType: ReviewFindingType | "all";
  referenceId: string;
}
export function parseMasterRoute(params: URLSearchParams): MasterRoute {
  const tab = params.get("tab"), groupParam = params.get("group");
  const entity = (Object.keys(MASTER_TABS) as AnyMasterEntity[]).find(key => MASTER_TABS[key] === tab) ||
    (groupParam === "tickets" && !tab ? "category" : groupParam === "team" && !tab ? "person" : "organization");
  const group = entityGroup(entity);
  const size = Number(params.get("size")), page = Number(params.get("page"));
  const status = params.get("status") || "all";
  const kind = params.get("kind") || "all";
  const type = params.get("type");
  const sort = params.get("sort") as MasterSort | null;
  const p0 = MASTER_DATA_P0_ENABLED;
  const statuses = entity === "role" || isOrgEntity(entity) ?["active", "inactive"] : ["active", "inactive", "archived"];
  return {
    entity,
    group,
    view: p0 && params.get("view") === "review" ? "review" : "list",
    reviewType: p0 && REVIEW_TYPES.includes(type as ReviewFindingType) ? type as ReviewFindingType : "all",
    referenceId: p0 ? (params.get("ref") || "").slice(0, 256) : "",
    detail: (params.get("detail") || "").slice(0, 128),
    query: {
      q: (params.get("q") || "").slice(0, 200),
      status: statuses.includes(status) && entity !== "severity" && !(entity === "project" && status === "inactive") ? status : "all",
      kind: entity === "organization" && (kind === "tenant" || kind === "client") ? kind : "all",
      organizationId: ["project", "system"].includes(entity) ? params.get("org") || params.get("client") || "all" : "all",
      projectId: entity === "system" ? params.get("project") || "all" : "all",
      roleKey: entity === "person" ? (params.get("role") || "all").slice(0, 128) : "all",
      review: p0 && params.get("review") === "1",
      sort: sort && sortOptions(entity).includes(sort) && sort !== defaultSort(entity) ? sort : undefined,
      page: Number.isInteger(page) && page > 0 ? page : 1,
      pageSize: size === 25 || size === 50 ? size : 10
    }
  };
}
export function masterRouteUrl(route: MasterRoute, mock?: string | null): string {
  const p = new URLSearchParams({ group: route.group, tab: MASTER_TABS[route.entity] });
  const q = route.query;
  if (q.q) p.set("q", q.q);
  if (q.status && q.status !== "all") p.set("status", q.status);
  if (q.kind && q.kind !== "all") p.set("kind", q.kind);
  if (q.organizationId && q.organizationId !== "all") p.set("org", q.organizationId);
  if (q.projectId && q.projectId !== "all") p.set("project", q.projectId);
  if (q.roleKey && q.roleKey !== "all") p.set("role", q.roleKey);
  if (q.sort && q.sort !== defaultSort(route.entity)) p.set("sort", q.sort);
  if (MASTER_DATA_P0_ENABLED && q.review) p.set("review", "1");
  if (q.page && q.page > 1) p.set("page", String(q.page));
  if (q.pageSize && q.pageSize !== 10) p.set("size", String(q.pageSize));
  if (MASTER_DATA_P0_ENABLED && route.view === "review") {
    p.set("view", "review");
    if (route.reviewType !== "all") p.set("type", route.reviewType);
    if (route.referenceId) p.set("ref", route.referenceId);
  }
  if (route.detail) p.set("detail", route.detail);
  if (mock) p.set("mock", mock);
  return `/master-data?${p}`;
}
