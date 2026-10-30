"use client";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { masterRepository } from "@/app/services/master-data-repository";
import { masterDataV2, masterPeople, masterRoles } from "@/app/services/master-data-v2";
import { peopleFromBackend, rolesFromBackend } from "@/app/services/backend-team";
import { useBackendTeam } from "@/app/hooks/useBackendTeam";
import { isAbortError } from "@/app/lib/api/errors";
import { MASTER_DATA_P0_ENABLED } from "@/app/lib/master-data-flags";
import { seedRoles } from "@/app/lib/master-people";
import { seedPeopleSnapshot } from "@/app/lib/people-roster";
import { ownerLabel } from "@/app/lib/ticket-owner";
import type { ReviewResult } from "@/app/lib/master-review";
import type { MasterEntity, MasterPage, MasterQuery, MasterRecordMap, Person, Role } from "@/app/types/master-data";

export function useMasterSync() {
  const state = useSyncExternalStore(masterRepository.subscribe, masterRepository.getSync, masterRepository.getServerSync);
  useEffect(() => { masterRepository.bootstrap(); }, []);
  return state;
}
export function useMasterCatalog() {
  const sync = useMasterSync();
  const catalog = masterRepository.snapshot();
  return { catalog, sync };
}
export function useMasterRecords<E extends MasterEntity>(entity: E, query: MasterQuery) {
  const { revision, ready } = useMasterSync();
  const [retry, setRetry] = useState(0);
  const queryKey = JSON.stringify(query);
  const key = `${entity}:${queryKey}:${revision}:${retry}`;
  const [result, setResult] = useState<{ key: string; data: MasterPage<MasterRecordMap[E]> | null; error: Error | null }>({ key: "", data: null, error: null });
  useEffect(
    
    
    () => {
      if (!ready) return;
      const controller = new AbortController();
      void masterDataV2.list(entity, JSON.parse(queryKey) as MasterQuery, controller.signal).then(data => {
        if (!controller.signal.aborted) setResult({ key, data, error: null });
      }).catch((error: unknown) => {
        if (!controller.signal.aborted && !isAbortError(error)) setResult({ key, data: null, error: error instanceof Error ? error : new Error("Gagal memuat data") });
      });
      return () => controller.abort();
    },
    [entity, queryKey, key, ready]
  );
  const refetch = useCallback(() => setRetry(value => value + 1), []);
  const current = result.key === key;
  return { data: current ? result.data : null, error: current ? result.error : null, isLoading: !current || !ready, refetch };
}
const NO_REVIEW: ReviewResult = { references: [], findings: [], sourceRecords: [] };
export function useMasterReview() {
  const { revision, ready } = useMasterSync();
  // Cancelled P0 feature: nothing is computed while it is hidden.
  return useMemo(() => { void revision; return MASTER_DATA_P0_ENABLED && ready ? masterRepository.review() : NO_REVIEW; }, [revision, ready]);
}
/** Generic paginated list for the team collections (people, roles). */
export function useTeamRecords<T>(kind: "person" | "role", query: MasterQuery) {
  const { revision, ready } = useMasterSync();
  const [retry, setRetry] = useState(0);
  const queryKey = JSON.stringify(query), key = `${kind}:${queryKey}:${revision}:${retry}`;
  const [result, setResult] = useState<{ key: string; data: MasterPage<T> | null; error: Error | null }>({ key: "", data: null, error: null });
  useEffect(
    
    
    () => {
      if (!ready) return;
      const controller = new AbortController(), parsed = JSON.parse(queryKey) as MasterQuery;
      const request = (kind === "person" ? masterPeople.list(parsed, controller.signal) : masterRoles.list(parsed, controller.signal)) as Promise<MasterPage<T>>;
      void request.then(data => { if (!controller.signal.aborted) setResult({ key, data, error: null }); }).catch((error: unknown) => {
        if (!controller.signal.aborted && !isAbortError(error)) setResult({ key, data: null, error: error instanceof Error ? error : new Error("Gagal memuat data") });
      });
      return () => controller.abort();
    },
    [kind, queryKey, key, ready]
  );
  const refetch = useCallback(() => setRetry(value => value + 1), []);
  const current = result.key === key;
  return { data: current ? result.data : null, error: current ? result.error : null, isLoading: !current || !ready, refetch };
}
/** Every person, live: a person added anywhere is available at once, without a reload. */
export function usePeople(): Person[] {
  const { revision, ready } = useMasterSync();
  const fromBackend = peopleFromBackend();
  const remote = useBackendTeam(fromBackend || rolesFromBackend());
  return useMemo(() => { void revision; return fromBackend ? remote.people : ready ? masterRepository.people() : seedPeopleSnapshot(); }, [revision, ready, fromBackend, remote.people]) as Person[];
}
/** Active roles in display order, for pickers and filters. */
export function useRoles(): Omit<Role, "usageCount">[] {
  const { revision, ready } = useMasterSync();
  const fromBackend = rolesFromBackend();
  const remote = useBackendTeam(fromBackend || peopleFromBackend());
  return useMemo(
    () => { void revision; return [...(fromBackend ? remote.roles : ready ? masterRepository.roles() : seedRoles())].sort((a, b) => a.sortOrder - b.sortOrder); },
    [revision, ready, fromBackend, remote.roles]
  );
}
/** Active people, for every PIC picker. A person that is assigned but no longer active stays selectable only through the current value. */
export function useActivePeople(): Person[] {
  const people = usePeople();
  return useMemo(() => people.filter(person => person.status === "active"), [people]);
}
/** Current-name resolver for tickets that carry person ids; older tickets keep their stored text. */
export function useOwnerLabel(): (ticket: { owner?: string; owners?: string[]; ownerIds?: string[] }) => string {
  const people = usePeople();
  return useCallback(ticket => ownerLabel(ticket, people), [people]);
}
/** A synchronous guard also catches double taps before React disables the button. */
export function useMasterMutation() {
  const current = useRef<Promise<unknown> | null>(null);
  return <T,>(operation: () => Promise<T>): Promise<T> => {
    if (current.current) return current.current as Promise<T>;
    const request = operation().finally(() => { current.current = null; });
    current.current = request;
    return request;
  };
}
