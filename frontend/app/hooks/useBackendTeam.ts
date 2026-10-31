"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@/app/lib/api/errors";
import { useSessionUserId } from "@/app/hooks/useSessionUserId";
import { backendPeopleAndRoles } from "@/app/services/backend-team";
import type { Person, Role } from "@/app/types/master-data";

/**
 * Everyone and every role from the backend (/users, /roles), loaded once per logged-in person and shared by every screen that lists people:
 * the roster, the PIC and owner pickers, and Master Data. One query (TanStack Query), so all those screens share one load and one answer.
 *
 * Nobody logged in: nothing is loaded and the (empty) store counts as loaded. Marking it "not loaded" used to make every screen still on
 * display load /users and /roles again after a logout, in a loop with the 401 that followed. A 401 is not an error to show either: the app
 * sends the person to /login. Any other failure is kept in `error` while it is tried again (5 s, 15 s, 45 s; lib/query-client.ts).
 * `enabled` false only reads what another screen loaded.
 */
interface Snapshot { people: Person[]; roles: Role[]; loaded: boolean; error?: string }
const EMPTY: Snapshot = { people: [], roles: [], loaded: false };
const NOTHING_TO_LOAD: Snapshot = { ...EMPTY, loaded: true };

export const backendTeamKey = (userId: string | null) => ["backend", userId, "team"] as const;

export function useBackendTeam(enabled: boolean): Snapshot {
  const userId = useSessionUserId();
  const query = useQuery({
    queryKey: backendTeamKey(userId),
    queryFn: ({ signal }) => backendPeopleAndRoles(signal),
    enabled: enabled && userId !== null,
    staleTime: Infinity,
  });
  const problem = query.error ?? query.failureReason;
  return useMemo(() => {
    if (userId === null) return NOTHING_TO_LOAD;
    if (query.data) return { people: query.data.people, roles: query.data.roles, loaded: true };
    if (problem instanceof ApiError && problem.status === 401) return NOTHING_TO_LOAD;
    if (problem) return { ...EMPTY, error: problem.message || "Gagal memuat personel." };
    return EMPTY;
  }, [userId, query.data, problem]);
}
