import { slug } from "@/app/lib/query-state";
import { paths, withQuery } from "@/app/lib/routes";
import type { LegacySourceType, MasterSnapshotV2 } from "@/app/types/master-data";

export interface OperationalLink { href: string; label: string; note?: string }
export function operationalLink(sourceType: LegacySourceType, rawProject: string, projectId?: string, catalog?: MasterSnapshotV2): OperationalLink {
  const project = projectId && catalog ? catalog.projects.find(item => item.id === projectId) : undefined;
  if (sourceType === "ticket")
    return { href: withQuery(paths.tickets, new URLSearchParams({ project: slug(rawProject) }).toString()), label: "Lihat tiket terfilter" };
  if (sourceType === "checkpoint")
    return {
      href: withQuery(paths.monitoring, new URLSearchParams({ project: slug(project?.legacyKey || rawProject) }).toString()),
      label: "Lihat checkpoint"
    };
  return { href: paths.shiftLog, label: "Buka Shift Log", note: "Shift Log belum mendukung filter proyek." };
}
