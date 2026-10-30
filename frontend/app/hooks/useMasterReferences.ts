"use client";
import { useMasterCatalog } from "./useMasterData";
import { resolveMasterProject, severityTicketCode } from "@/app/lib/master-data-model";
/** Values stay immutable; display labels and eligibility follow Master Data. */
export function useMasterReferences() {
  const { catalog, sync } = useMasterCatalog();
  const categories = [...catalog.categories].sort((a, b) => a.sortOrder - b.sortOrder);
  const categoryLabel = (key: string) => categories.find(c => c.key === key)?.name || key;
  const severityLabel = (code: string) => catalog.severities.find(s => s.code === code.toLowerCase())?.displayName || code;
  const projectFor = (value: string, organizationId?: string) => resolveMasterProject(catalog.projects, value, organizationId);
  const projectLabel = (value: string, organizationId?: string, archivedLabel = false) => {
    const project = projectFor(value, organizationId);
    return project
      ? `${project.name !== project.legacyKey || project.id === value ? project.name : value}${archivedLabel && (project.status !== "active" || catalog.organizations.find(o => o.id === project.organizationId)?.status !== "active") ? " (Arsip)" : ""}`
      : value;
  };
  return {
    catalog,
    revision: sync.revision,
    categories,
    activeCategories: categories.filter(c => c.active),
    categoryLabel,
    severityLabel,
    projectFor,
    projectLabel,
    severityOptions: catalog.severities.filter(s => s.code !== "critical").map(s => ({ value: severityTicketCode(s.code), label: s.displayName }))
  };
}
