"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppData } from "@/app/components/routing/AppShell";
import { backendProjects, loadTicketLookups, ticketLookupsKey, ticketsFromBackend } from "@/app/services/backend-tickets";

interface CategoryOption { id: string; key: string; name: string }
const NO_CATEGORIES: CategoryOption[] = [];

/**
 * What the ticket forms offer when tickets live in the backend: its projects (by id, read from the loaded tickets) and its categories
 * (by name, one cached query shared with saving, see fetchTicketLookups). Null when the app keeps tickets itself, so the forms keep the
 * Master Data lists. A failed load leaves no category chosen; saving asks the backend again.
 */
export function useBackendTicketOptions() {
  const enabled = ticketsFromBackend();
  const { tickets } = useAppData();
  const projects = useMemo(() => (enabled ? backendProjects(tickets) : []), [enabled, tickets]);
  const lookups = useQuery({ queryKey: ticketLookupsKey, queryFn: loadTicketLookups, enabled, staleTime: Infinity });
  const categories = useMemo(
    () => lookups.data?.categories.map(category => ({ id: category.id, key: category.name, name: category.name })) ?? NO_CATEGORIES,
    [lookups.data]
  );
  return useMemo(() => enabled
    ? { projects, categories, projectName: (id: string) => projects.find(project => project.id === id)?.name ?? id }
    : null, [enabled, projects, categories]);
}
