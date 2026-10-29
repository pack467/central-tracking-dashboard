"use client";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { entityGroup, masterRouteUrl, parseMasterRoute, type MasterRoute } from "@/app/lib/master-data-route";
import type { AnyMasterEntity, MasterQuery, MasterSnapshotV2 } from "@/app/types/master-data";

export function useMasterRoute(catalog: MasterSnapshotV2, ready: boolean) {
  const router = useRouter(), searchParams = useSearchParams(), raw = searchParams.toString();
  const route = useMemo(() => parseMasterRoute(new URLSearchParams(raw)), [raw]);
  const mock = searchParams.get("mock");
  const query = route.query;
  const orgValid = !query.organizationId || query.organizationId === "all" || catalog.organizations.some(o => o.id === query.organizationId);
  const projectValid = !query.projectId ||
    query.projectId === "all" ||
    catalog.projects.some(p => p.id === query.projectId && (query.organizationId === "all" || p.organizationId === query.organizationId));
  const normalized = useMemo(
    
    
    () => ({
        ...route,
        query: { ...route.query, organizationId: orgValid ? route.query.organizationId : "all", projectId: projectValid ? route.query.projectId : "all" }
      }),
    [route, orgValid, projectValid]
  );
  useEffect(() => {
    if (!ready) return;
    const url = masterRouteUrl(normalized, mock);
    if (url !== `/master-data?${raw}`) router.replace(url, { scroll: false });
  }, [ready, normalized, mock, raw, router]);

  // The URL updates asynchronously. Two changes made before it does (for example a filter pick and a cleared search)
  // would both start from the same stale route and the second would overwrite the first, so the last route we
  // navigated to is remembered and used as the base until the URL catches up.
  const rawRef = useRef(raw), pending = useRef<{ from: string; route: MasterRoute } | null>(null);
  useEffect(() => { rawRef.current = raw; }, [raw]);
  const base = (): MasterRoute => pending.current && pending.current.from === rawRef.current ? pending.current.route : normalized;
  const navigate = useCallback((next: MasterRoute, push = false) => {
    pending.current = { from: rawRef.current, route: next };
    const url = masterRouteUrl(next, mock);
    if (push) router.push(url, { scroll: false }); else router.replace(url, { scroll: false });
  }, [mock, router]);
  return {
    ...normalized,
    setQuery: (updates: Partial<MasterQuery>) => {
      const current = base();
      navigate({ ...current, detail: "", query: { ...current.query, page: 1, ...updates } });
    },
    select: (entity: AnyMasterEntity, filters: Partial<MasterQuery> = {}) => navigate(
      {
        ...parseMasterRoute(new URLSearchParams()),
        entity,
        group: entityGroup(entity),
        query: { page: 1, pageSize: base().query.pageSize, ...filters },
        detail: "",
        view: "list",
        reviewType: "all",
        referenceId: ""
      }
    ),
    openDetail: (id: string) => navigate({ ...base(), detail: id }, true),
    closeDetail: () => navigate({ ...base(), detail: "" }),
    openReview: (type: MasterRoute["reviewType"] = "all") => navigate({ ...base(), view: "review", reviewType: type, referenceId: "", detail: "" }, true),
    setReviewType: (type: MasterRoute["reviewType"]) => navigate({ ...base(), view: "review", reviewType: type, referenceId: "", detail: "" }),
    openReference: (id: string) => navigate({ ...base(), view: "review", referenceId: id, detail: "" }, true),
    closeReference: () => navigate({ ...base(), detail: "", referenceId: "" }),
    closeReview: () => navigate({ ...base(), view: "list", reviewType: "all", referenceId: "", detail: "" }),
    openRecord: (entity: AnyMasterEntity, id: string) => navigate({ ...base(), entity, group: entityGroup(entity), detail: id }, true)
  };
}
