"use client";

import { useId } from "react";
import { Cpu } from "lucide-react";
import { useMasterReferences } from "@/app/hooks/useMasterReferences";

export interface TicketSystemSelectProps {
  project: string;
  organizationId: string;
  value: string;
  onChange: (value: string) => void;
  originalId?: string;
  className?: string;
}

export function TicketSystemSelect({
  project,
  organizationId,
  value,
  onChange,
  originalId,
  className = "",
}: TicketSystemSelectProps) {
  const reactId = useId();
  const listId = "sys-list-" + reactId.replace(/[^a-zA-Z0-9_-]/g, "");
  const { catalog, projectFor } = useMasterReferences();
  const parent = projectFor(project, organizationId);

  // Suggestions for existing active systems under this project or the original system
  const suggestedSystems = catalog.systems.filter(
    (s) => s.projectId === parent?.id && (s.status === "active" || s.id === originalId)
  );

  // Resolve human-readable name if value points to an existing catalog system ID
  const displayValue = catalog.systems.find((s) => s.id === value)?.name ?? value;

  return (
    <label className={`ticket-field-system ${className}`.trim()}>
      <div className="ticket-field-label-wrapper">
        <span className="ticket-field-label">
          <Cpu size={12} className="ticket-field-icon" />
          SISTEM / KOMPONEN
        </span>
        <span className="ticket-optional-hint">Opsional</span>
      </div>

      <input
        type="text"
        list={suggestedSystems.length > 0 ? listId : undefined}
        value={displayValue}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Contoh: Grafana, Node Exporter, Database, dll."
        className="ticket-system-input"
        autoComplete="off"
        spellCheck={false}
      />

      {suggestedSystems.length > 0 && (
        <datalist id={listId}>
          {suggestedSystems.map((s) => (
            <option key={s.id} value={s.name}>
              {s.code} — {s.name}
            </option>
          ))}
        </datalist>
      )}
    </label>
  );
}
