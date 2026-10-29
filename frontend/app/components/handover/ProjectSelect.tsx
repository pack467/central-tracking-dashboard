"use client";

import { Select } from "@/app/components/ui/Select";
import { useId, useMemo } from "react";
import { STANDARD_MONITORED_PROJECTS } from "@/app/lib/data";
import { useClient } from "@/app/context/ClientContext";
import { useMasterReferences } from "@/app/hooks/useMasterReferences";
import { useToast } from "@/app/components/ui/Toast";

export interface ProjectSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

const FALLBACK_PROJECT_OPTIONS = ["NOC", ...STANDARD_MONITORED_PROJECTS, "EPC Tools"];
const PROJECT_SELECT_CONTAINER_CLASS = "block w-full";
const PROJECT_SELECT_INPUT_CLASS =
  "w-full min-h-[42px] rounded-[7px] p-[10px_12px] text-[13px] bg-[var(--input-bg)] border border-[var(--panel-border)] text-[var(--ink-primary)] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)]";

export function ProjectSelect({
  value,
  onChange,
  placeholder = "Pilih atau ketik proyek",
  className = "",
  id,
}: ProjectSelectProps) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const { activeClientId, getProjectsForClient, projects } = useClient();
  const { projectLabel } = useMasterReferences();
  const toast = useToast();

  const options = useMemo(() => {
    try {
      const clientProjs = getProjectsForClient(activeClientId, false).map((p) => p.name);
      return Array.from(new Set(["NOC", ...clientProjs, ...STANDARD_MONITORED_PROJECTS, "EPC Tools"])).filter(name => !projects.some(p => p.clientId === activeClientId && p.name === name && p.status === "archived"));
    } catch {
      return FALLBACK_PROJECT_OPTIONS;
    }
  }, [activeClientId, getProjectsForClient, projects]);

  return (
    <div className={`${PROJECT_SELECT_CONTAINER_CLASS} ${className}`}>
      <Select id={selectId} listboxId={`${selectId}-options`} value={value} onValueChange={next => {
        if (projects.some(p => p.clientId === activeClientId && p.name === next && p.status === "archived")) { toast.warning("Proyek sudah diarsipkan."); return; }
        onChange(next);
      }} placeholder={placeholder} label="Proyek" allowCustom options={options.map(project => ({ value: project, label: projectLabel(project, activeClientId) }))} size="form" className={PROJECT_SELECT_INPUT_CLASS} />
    </div>
  );
}
