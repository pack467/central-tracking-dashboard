"use client";

import { useCallback, useEffect, useMemo, useRef, type Dispatch, type SetStateAction } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSessionUserId } from "@/app/hooks/useSessionUserId";
import { fetchAllTickets, fetchRecentTickets, mergeRecentTickets, rememberTickets, resetTicketCache } from "@/app/services/backend-tickets";
import type { Ticket } from "@/app/lib/types";

/** How often the newest changes are fetched while the tab is on screen: one request a minute. */
const REFRESH_MS = 60_000;
const NO_TICKETS: Ticket[] = [];

export const backendTicketsKey = (userId: string | null) => ["backend", userId, "tickets"] as const;

/**
 * The shell's tickets when they come from the backend: loaded once the person is logged in and kept in the query cache (TanStack Query;
 * nothing is written to localStorage, a short-lived copy goes to sessionStorage, see services/backend-tickets.ts). This copy changes by
 * loading, refreshing, or `put` with a ticket the backend has just saved.
 * While the tab is visible the newest changes (the 100 most recently updated tickets) are merged in every minute, and again when the
 * tab comes back after being hidden.
 *
 * A failed full load is not tried again by the query: the pages already wait out 429 themselves, and starting the 37 requests over would
 * spend the limit the backend gives everyone behind the same address. The error is shown and `reload` tries again.
 *
 * Returns [tickets, setTickets, ready, error, reload, refresh, put]. `ready` becomes true after the first answer, even a failed one, so
 * nothing waits forever. `reload` loads everything again; `refresh` fetches only the newest changes.
 */
export function useBackendTickets(enabled: boolean) {
  const userId = useSessionUserId();
  const client = useQueryClient();
  const key = useMemo(() => backendTicketsKey(userId), [userId]);
  const query = useQuery({ queryKey: key, queryFn: fetchAllTickets, enabled: enabled && userId !== null, staleTime: Infinity, retry: false });
  const tickets = query.data ?? NO_TICKETS;
  const ready = query.isSuccess || query.isError;
  const error = query.error ? query.error.message || "Gagal memuat tiket." : undefined;
  const lastRefresh = useRef(0);
  useEffect(() => { if (query.isSuccess) lastRefresh.current = query.dataUpdatedAt; }, [query.isSuccess, query.dataUpdatedAt]);

  /** Writes the list into the cache and the stored copy, so a reload or another screen starts from it. */
  const write = useCallback((next: Ticket[]) => { client.setQueryData(key, next); rememberTickets(next); }, [client, key]);
  const current = useCallback(() => client.getQueryData<Ticket[]>(key) ?? NO_TICKETS, [client, key]);

  const refresh = useCallback(async () => {
    lastRefresh.current = Date.now();
    try {
      const before = current();
      const merged = mergeRecentTickets(before, await fetchRecentTickets());
      if (merged !== before) write(merged);
    } catch { /* a missed refresh is not worth a message: the next one tries again */ }
  }, [current, write]);

  useEffect(() => {
    if (!enabled || !query.isSuccess) return;
    const visible = () => typeof document === "undefined" || document.visibilityState === "visible";
    const timer = setInterval(() => { if (visible()) void refresh(); }, REFRESH_MS);
    const onVisibility = () => { if (visible() && Date.now() - lastRefresh.current >= REFRESH_MS) void refresh(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onVisibility); };
  }, [enabled, query.isSuccess, refresh]);

  const reload = useCallback(() => { resetTicketCache(); void client.resetQueries({ queryKey: key }); }, [client, key]);
  const setTickets: Dispatch<SetStateAction<Ticket[]>> = useCallback((action) => {
    write(typeof action === "function" ? action(current()) : action);
  }, [current, write]);
  /** A ticket the backend just saved goes into the list (and the stored copy) at once, not at the next refresh. */
  const put = useCallback((ticket: Ticket) => { write(mergeRecentTickets(current(), [ticket])); }, [current, write]);
  return [tickets, setTickets, ready, error, reload, refresh, put] as const;
}
