"use client";
import { useSyncExternalStore } from "react";
import { ORG_STORES, type OrgCatalogState, type OrgKind } from "@/app/lib/org-catalog";

/** Jabatan or Departemen with who holds which; re-renders on every change, in this tab and in other tabs. */
export function useOrgCatalog(kind: OrgKind): OrgCatalogState {
  const store = ORG_STORES[kind];
  return useSyncExternalStore(store.subscribe, store.snapshot, store.serverSnapshot);
}
