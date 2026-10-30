"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { fetchAllTickets, fetchRecentTickets, mergeRecentTickets, rememberTickets, resetTicketCache } from "@/app/services/backend-tickets";
import type { Ticket } from "@/app/lib/types";

/** How often the newest changes are fetched while the tab is on screen: one request a minute. */
const REFRESH_MS = 60_000;

/**
 * The shell's tickets when they come from the backend: loaded once the person is logged in, kept in memory (nothing is written to
 * localStorage). Tickets are read-only while writing is not connected, so this copy only ever changes by loading or refreshing.
 * While the tab is visible the newest changes (the 100 most recently updated tickets) are merged in every minute, and again when the
 * tab comes back after being hidden.
 *
 * Returns [tickets, setTickets, ready, error, reload, refresh]. `ready` becomes true after the first answer, even a failed one, so
 * nothing waits forever. `reload` loads everything again; `refresh` fetches only the newest changes.
 */
export function useBackendTickets(enabled: boolean) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string>();
  const [round, setRound] = useState(0);
  const latest = useRef<Ticket[]>([]);
  const lastRefresh = useRef(0);
  useEffect(() => { latest.current = tickets; }, [tickets]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetchAllTickets()
      .then(loaded => { if (!cancelled) { setTickets(loaded); setError(undefined); setReady(true); lastRefresh.current = Date.now(); } })
      .catch((cause: unknown) => { if (!cancelled) { setError(cause instanceof Error ? cause.message : "Gagal memuat tiket."); setReady(true); } });
    return () => { cancelled = true; };
  }, [enabled, round]);

  const refresh = useCallback(async () => {
    lastRefresh.current = Date.now();
    try {
      const merged = mergeRecentTickets(latest.current, await fetchRecentTickets());
      if (merged !== latest.current) { rememberTickets(merged); setTickets(merged); }
    } catch { /* a missed refresh is not worth a message: the next one tries again */ }
  }, []);

  useEffect(() => {
    if (!enabled || !ready || error) return;
    const visible = () => typeof document === "undefined" || document.visibilityState === "visible";
    const timer = setInterval(() => { if (visible()) void refresh(); }, REFRESH_MS);
    const onVisibility = () => { if (visible() && Date.now() - lastRefresh.current >= REFRESH_MS) void refresh(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onVisibility); };
  }, [enabled, ready, error, refresh]);

  const reload = useCallback(() => { resetTicketCache(); setReady(false); setRound(value => value + 1); }, []);
  return [tickets, setTickets as Dispatch<SetStateAction<Ticket[]>>, ready, error, reload, refresh] as const;
}
