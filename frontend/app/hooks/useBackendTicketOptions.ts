"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppData } from "@/app/components/routing/AppShell";
import { backendProjects, fetchTicketLookups, ticketsFromBackend } from "@/app/services/backend-tickets";

interface CategoryOption { id: string; key: string; name: string }

/**
 * What the ticket forms offer when tickets live in the backend: its projects (by id, read from the loaded tickets) and its categories
 * (by name). Null when the app keeps tickets itself, so the forms keep the Master Data lists.
 */
export function useBackendTicketOptions() {
  const enabled = ticketsFromBackend();
  const { tickets } = useAppData();
  const projects = useMemo(() => (enabled ? backendProjects(tickets) : []), [enabled, tickets]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetchTicketLookups()
      .then(known => { if (!cancelled) setCategories(known.categories.map(category => ({ id: category.id, key: category.name, name: category.name }))); })
      .catch(() => { /* the form says no category is chosen; saving asks the backend again */ });
    return () => { cancelled = true; };
  }, [enabled]);
  return useMemo(() => enabled
    ? { projects, categories, projectName: (id: string) => projects.find(project => project.id === id)?.name ?? id }
    : null, [enabled, projects, categories]);
}
