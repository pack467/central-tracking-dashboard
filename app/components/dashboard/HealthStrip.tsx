"use client";

import { Badge } from "@/app/components/ui/Badge";
import { ProjectMark } from "@/app/components/ui/ProjectMark";
import { useToast } from "@/app/components/ui/Toast";
import { projects } from "@/app/lib/data";
import type { ProjectHealthEntry } from "@/app/lib/types";

export function HealthStrip({ entries = projects }: { entries?: ProjectHealthEntry[] }) {
  const notify = useToast();
  const healthy = entries.filter((project) => project.tone === "success").length;
  const attention = entries.length - healthy;

  return (
    <section className="health-strip" aria-label="Kesehatan layanan per proyek">
      <div className="health-intro">
        <span className="health-title">Kesehatan layanan</span>
        <Badge tone="success">{healthy} Healthy</Badge>
        {attention > 0 && <Badge tone="warning">{attention} Degraded</Badge>}
      </div>
      <div className="project-pills">
        {entries.map((project) => (
          <button
            className="project-pill"
            key={project.name}
            onClick={() =>
              notify(`${project.name}: Status ${project.status.toUpperCase()} (${project.detail})`, project.tone, {
                id: `health-project-${project.name.toLowerCase().replace(/\s+/g, "-")}`,
              })
            }
          >
            <ProjectMark name={project.name} />
            <span>
              <strong>{project.name}</strong>
              <small>{project.detail}</small>
            </span>
            <i className={`status-dot ${project.tone}`} />
          </button>
        ))}
      </div>
    </section>
  );
}
