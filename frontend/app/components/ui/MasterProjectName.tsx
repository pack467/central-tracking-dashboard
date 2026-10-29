"use client";
import { useClient } from "@/app/context/ClientContext";
import { readMasterProjection, resolveMasterProject } from "@/app/lib/master-data-model";
/** Presentation only: historical strings, matching, chart series and keys stay intact. */
export function MasterProjectName({ value, organizationId, historical = false }: { value: string; organizationId?: string; historical?: boolean }) {
  const { projects, allClients, activeClientId } = useClient();
  const scope = organizationId || activeClientId;
  const projection = readMasterProjection(), canonical = projection ? resolveMasterProject(projection.canonicalProjects, value, scope) : undefined;
  if (canonical) return `${canonical.name !== canonical.legacyKey || canonical.id === value ? canonical.name : value}${historical && (canonical.status === "archived" || allClients.find(o => o.id === canonical.organizationId)?.status !== "active") ? " (Arsip)" : ""}`;
  const project = projects.find(p => p.clientId === scope && (p.id === value || p.name === value)) || projects.find(p => p.clientId === scope && value.includes("/") && p.name.toLowerCase() === value.split("/")[0].toLowerCase());
  const label = project?.displayName || (project?.id === value ? project.name : value);
  return `${label}${historical && project && (project.status === "archived" || allClients.find(o => o.id === project.clientId)?.status !== "active") ? " (Arsip)" : ""}`;
}
