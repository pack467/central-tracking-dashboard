"use client";

import { useState } from "react";
import { FolderKanban, Gauge, Tag, Ticket as TicketIcon } from "lucide-react";
import { Modal } from "@/app/components/ui/Modal";
import { ModalCloseButton } from "@/app/components/ui/ModalCloseButton";
import { Select, type SelectOption } from "@/app/components/ui/Select";
import { useAppData } from "@/app/components/routing/AppShell";
import { useClient } from "@/app/context/ClientContext";
import { useBackendTicketOptions } from "@/app/hooks/useBackendTicketOptions";
import { useMasterReferences } from "@/app/hooks/useMasterReferences";
import { normalizeSeverity } from "@/app/lib/severity";
import { backendProjectChoices } from "@/app/services/backend-tickets";
import type { HandoverTask } from "@/app/lib/types";
import { FORM_SELECT } from "./ProjectSelect";

export interface TaskTicketChoice {
  project: { name: string; backendId?: string; masterId?: string };
  category: string;
  severity: string;
}

const SEVERITIES: SelectOption[] = [{ value: "Low", label: "Low" }, { value: "Medium", label: "Medium" }, { value: "High", label: "High" }];
const FIELD = "grid gap-1.5 text-[12.5px] font-semibold text-[var(--ink-secondary)]";

/** What a finished task's ticket needs and the task cannot say: asked once, with what the task does say already filled in. */
export function TaskTicketDialog({ task, busy, onCancel, onConfirm }: { task: HandoverTask; busy: boolean; onCancel: () => void; onConfirm: (choice: TaskTicketChoice) => void }) {
  const { tickets } = useAppData();
  const { activeClientId, getProjectsForClient } = useClient();
  const master = useMasterReferences();
  const backend = useBackendTicketOptions();

  const backendChoices = backend ? backendProjectChoices(tickets) : [];
  const projects: SelectOption[] = backend
    ? backendChoices.map(({ id, value, name }) => ({ value: id, label: name, textValue: `${name} ${value}`, meta: value === name ? undefined : value }))
    : getProjectsForClient(activeClientId, false).map(({ name }) => ({ value: name, label: master.projectLabel(name, activeClientId) }));
  const categories: SelectOption[] = (backend ? backend.categories : master.activeCategories).map(({ key, name }) => ({ value: key, label: name }));

  const [project, setProject] = useState(() => (backend ? backendChoices.find((choice) => choice.value === task.project)?.id : projects.find((option) => option.value === task.project)?.value)?.toString() ?? "");
  const [category, setCategory] = useState(() => categories.find((option) => /^(others|lainnya)$/i.test(String(option.label)))?.value.toString() ?? "");
  const [severity, setSeverity] = useState(() => normalizeSeverity(task.priority));

  const confirm = () => {
    const chosen = backendChoices.find((choice) => choice.id === project);
    onConfirm({
      project: backend ? { name: chosen?.value ?? project, backendId: project } : { name: project, masterId: master.projectFor(project, activeClientId)?.id },
      category,
      severity,
    });
  };

  return (
    <Modal open onClose={() => { if (!busy) onCancel(); }} label="Selesaikan tugas dan buat tiket" width={520}>
      <div className="modal-title">
        <div>
          <strong>Selesaikan tugas &amp; buat tiket</strong>
          <small>Tugas ditutup dan dicatat sebagai tiket berstatus Closed atas nama Anda.</small>
        </div>
        <ModalCloseButton onClose={() => { if (!busy) onCancel(); }} />
      </div>

      <div className="flex items-start gap-2.5 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5">
        <TicketIcon size={15} className="mt-[2px] shrink-0 text-[var(--accent-blue)]" aria-hidden="true" />
        <span className="min-w-0 text-[13px] font-semibold leading-snug text-[var(--ink-primary)] [overflow-wrap:anywhere]">{task.title}</span>
      </div>

      <div className="mt-4 grid gap-4">
        <div className="grid gap-1.5">
          <label className={FIELD}>
            <span>Proyek <span className="text-red-400" aria-hidden="true">*</span></span>
            <Select {...FORM_SELECT} aria-label="Proyek tiket" label="Proyek" icon={<FolderKanban size={16} aria-hidden="true" />} value={project} options={[{ value: "", label: "Pilih proyek" }, ...projects]} onValueChange={setProject} />
          </label>
          {!project && task.project && <p className="m-0 text-[11.5px] leading-[1.45] text-amber-300">“{task.project}” bukan proyek tiket. Pilih proyek untuk tiket ini.</p>}
        </div>
        <div className="grid items-start gap-4 min-[521px]:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <label className={FIELD}>
            <span>Kategori <span className="text-red-400" aria-hidden="true">*</span></span>
            <Select {...FORM_SELECT} aria-label="Kategori tiket" label="Kategori" icon={<Tag size={16} aria-hidden="true" />} value={category} options={[{ value: "", label: "Pilih kategori" }, ...categories]} onValueChange={setCategory} />
          </label>
          <label className={FIELD}>
            <span>Severity</span>
            <Select {...FORM_SELECT} aria-label="Severity tiket" label="Severity" icon={<Gauge size={16} aria-hidden="true" />} value={severity} options={SEVERITIES} onValueChange={(next) => setSeverity(normalizeSeverity(next))} />
          </label>
        </div>
      </div>

      <div className="modal-actions">
        <button type="button" className="button button-secondary" onClick={onCancel} disabled={busy}>Batal</button>
        <button type="button" className="button button-primary" onClick={confirm} disabled={busy || !project || !category}>{busy ? "Membuat tiket…" : "Selesai & Buat Tiket"}</button>
      </div>
    </Modal>
  );
}
