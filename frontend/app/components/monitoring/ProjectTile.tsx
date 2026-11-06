"use client";

import { EntityIconTile } from "@/app/components/master-data/master-ui";
import { useMasterReferences } from "@/app/hooks/useMasterReferences";

/**
 * The project tile used on the Monitoring page: the uploaded logo, or the grey "no image" tile,
 * the same as the Tickets table and Master Data.
 */
export function ProjectTile({ name, clientId, size = "sm" }: { name: string; clientId?: string; size?: "xs" | "sm" | "md" }) {
  const { projectFor } = useMasterReferences();
  return <EntityIconTile entity="project" size={size} src={projectFor(name, clientId)?.logoUrl} />;
}
