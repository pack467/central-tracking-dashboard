"use client";

import { FolderKanban } from "lucide-react";
import { useId, type ReactNode } from "react";
import { Select, type SelectOption } from "@/app/components/ui/Select";
import { useAppData } from "@/app/components/routing/AppShell";
import { useClient } from "@/app/context/ClientContext";
import { useMasterReferences } from "@/app/hooks/useMasterReferences";
import { useToast } from "@/app/components/ui/Toast";
import { GENERAL_PROJECT } from "@/app/lib/handover";
import { backendProjectChoices, ticketsFromBackend } from "@/app/services/backend-tickets";

export interface ProjectSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
}

// The fields of the handover form that are lists: their height and text size match the text fields next to them (a select's own are set for filter bars).
const VALUE_SIZE = { fontSize: 13 };
export const FORM_SELECT = {
  size: "form",
  active: false,
  style: { height: 44, minHeight: 44 },
  renderValue: (label: ReactNode) => <span style={VALUE_SIZE}>{label}</span>,
} as const;

const GENERAL_OPTION: SelectOption = { value: GENERAL_PROJECT, label: GENERAL_PROJECT, meta: "Tanpa proyek khusus", textValue: `${GENERAL_PROJECT} Tanpa proyek khusus`, group: "Lainnya" };

/** The projects a handover can name: the same list as the ticket forms (the backend's, or Master Data's for the active client), then "Umum" for work that belongs to no project. */
export function ProjectSelect({ value, onChange, placeholder = "Pilih proyek", id }: ProjectSelectProps) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const { activeClient, activeClientId, getProjectsForClient, projects } = useClient();
  const { tickets } = useAppData();
  const { projectLabel } = useMasterReferences();
  const toast = useToast();

  const clientGroup = `Proyek ${activeClient?.shortName ?? ""}`.trim();
  const listed: SelectOption[] = [
    ...(ticketsFromBackend()
      ? backendProjectChoices(tickets).map(({ value: code, name }) => ({ value: code, label: name, textValue: `${name} ${code}`, meta: code === name ? undefined : code, group: "Proyek" }))
      : getProjectsForClient(activeClientId, false).map(({ name }) => ({ value: name, label: projectLabel(name, activeClientId), group: clientGroup }))),
    GENERAL_OPTION,
  ];
  // a name from an older note, or one typed in, stays in the list so it reads as chosen
  const current: SelectOption[] = value.trim() && !listed.some(option => option.value === value) ? [{ value, label: value, group: "Pilihan saat ini" }] : [];

  return (
    <Select
      id={selectId}
      listboxId={`${selectId}-options`}
      value={value}
      onValueChange={next => {
        if (projects.some(project => project.clientId === activeClientId && project.name === next && project.status === "archived")) { toast.warning("Proyek sudah diarsipkan."); return; }
        onChange(next);
      }}
      placeholder={placeholder}
      label="Proyek"
      allowCustom
      icon={<FolderKanban size={16} aria-hidden="true" />}
      options={[...current, ...listed]}
      {...FORM_SELECT}
    />
  );
}
