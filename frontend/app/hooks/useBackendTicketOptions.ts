"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppData } from "@/app/components/routing/AppShell";
import { backendProjectOptions, loadTicketLookups, SEEDED_BACKEND_LOOKUPS, ticketLookupsKey, ticketsFromBackend } from "@/app/services/backend-tickets";

/**
 * What the ticket forms offer when tickets live in the backend: its projects (by id, read from the loaded tickets and seeded projects) and its categories
 * (by name, one cached query shared with saving, see fetchTicketLookups). Null when the app keeps tickets itself, so the forms keep the
 * Master Data lists. While loading or if rate-limited, falls back to the seeded backend categories so the dropdown is never empty.
 */
export function useBackendTicketOptions() {
  const enabled = ticketsFromBackend();
  const { tickets } = useAppData();
  const projects = useMemo(() => (enabled ? backendProjectOptions(tickets) : []), [enabled, tickets]);
  const lookups = useQuery({ queryKey: ticketLookupsKey, queryFn: loadTicketLookups, enabled, staleTime: Infinity });
  const categories = useMemo(
    () => (lookups.data?.categories ?? SEEDED_BACKEND_LOOKUPS.categories).map(category => ({ id: category.id, key: category.name, name: category.name })),
    [lookups.data]
  );
  return useMemo(() => enabled
    ? { projects, categories, projectName: (id: string) => projects.find(project => project.id === id)?.name ?? id }
    : null, [enabled, projects, categories]);
}
