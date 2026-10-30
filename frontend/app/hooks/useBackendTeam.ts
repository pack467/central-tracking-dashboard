"use client";

import { useEffect, useSyncExternalStore } from "react";
import { ApiError } from "@/app/lib/api/errors";
import { backendPeople, backendRoles } from "@/app/services/backend-team";
import type { Person, Role } from "@/app/types/master-data";

/**
 * Everyone and every role from the backend (/users, /roles), loaded once and shared by every screen that lists people: the roster,
 * the PIC and owner pickers, and Master Data. Without a login the load fails with a 401, which is not an error to show: the app sends the
 * person to /login and the login resets this store. Any other failure is kept in `error` and tried again a few times, 5 s then 15 s then 45 s.
 */
interface Snapshot { people: Person[]; roles: Role[]; loaded: boolean; error?: string }
const EMPTY: Snapshot = { people: [], roles: [], loaded: false };
const RETRY_MS = [5_000, 15_000, 45_000];
let snapshot: Snapshot = EMPTY;
let inflight: Promise<void> | undefined;
let attempt = 0;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const publish = (next: Snapshot) => { snapshot = next; listeners.forEach(listener => listener()); };

function load() {
  if (inflight) return;
  inflight = Promise.all([backendPeople.all(), backendRoles.available()])
    .then(([people, roles]) => { attempt = 0; publish({ people, roles, loaded: true }); })
    .catch((cause: unknown) => {
      if (cause instanceof ApiError && cause.status === 401) { publish({ ...EMPTY, loaded: true }); return; }
      publish({ ...EMPTY, error: cause instanceof Error && cause.message ? cause.message : "Gagal memuat personel." });
      if (attempt < RETRY_MS.length) retryTimer = setTimeout(load, RETRY_MS[attempt++]);
    })
    .finally(() => { inflight = undefined; });
}
/** Forget what was loaded (logout, or the person changed). A retry that was waiting is cancelled. */
export function resetBackendTeam() {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = undefined;
  attempt = 0;
  publish(EMPTY);
}

export function useBackendTeam(enabled: boolean): Snapshot {
  const current = useSyncExternalStore(
    notify => { listeners.add(notify); return () => { listeners.delete(notify); }; },
    () => snapshot,
    () => EMPTY
  );
  useEffect(() => { if (enabled && !current.loaded) load(); }, [enabled, current.loaded]);
  return current;
}
