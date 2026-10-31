"use client";

import { useMasterReferences } from "@/app/hooks/useMasterReferences";
import { TicketSystemSelect } from "./TicketSystemSelect";
import { Select } from "@/app/components/ui/Select";

import { useEffect, useState, useMemo } from "react";
import { X, Check, Edit3 } from "lucide-react";
import { Modal } from "@/app/components/ui/Modal";
import { Badge } from "@/app/components/ui/Badge";
import { severityTone, statusTone } from "@/app/components/tickets/TicketTable";
import { nowClockLabel } from "@/app/lib/data";
import { useActivePeople } from "@/app/hooks/useMasterData";
import { useBackendTicketOptions } from "@/app/hooks/useBackendTicketOptions";
import { ownerIdsFor } from "@/app/lib/ticket-owner";
import { useAuth } from "@/app/lib/auth";
import { useToast } from "@/app/components/ui/Toast";
import type { Ticket } from "@/app/lib/types";
import { useClient } from "@/app/context/ClientContext";
import { ticketCode } from "@/app/lib/ticket-code";

interface TicketEditModalProps {
  open: boolean;
  ticket: Ticket | null;
  onClose: () => void;
  /** Saves the change; a promise that fails keeps the modal open with the reason. */
  onSave: (updated: Ticket) => void | Promise<unknown>;
}

const PRIORITY_OPTIONS = ["Low", "Medium", "High"];
const STATUS_OPTIONS = ["Open", "Closed", "Activity", "Meeting", "Re-Open", "Pending", "RCA"] as const;


export function TicketEditModal({ open, ticket, onClose, onSave }: TicketEditModalProps) {
  const notify = useToast();
  const { user } = useAuth();
  const master = useMasterReferences();
  // with the backend as the source its projects (by id) and categories are offered instead of the Master Data ones
  const backend = useBackendTicketOptions();
  const { severityLabel, projectFor } = master;
  const activeCategories = backend ? backend.categories : master.activeCategories;
  const categoryLabel = backend ? (key: string) => key : master.categoryLabel;
  const { activeClientId, getProjectsForClient } = useClient();
  const operatorName = user?.name || "Operator NOC";
  const projectLabel = (value: string, organizationId?: string, archived?: boolean) => backend ? backend.projectName(value) : master.projectLabel(value, organizationId, archived);
  const ticketProject = (backend ? ticket?.backend?.projectId : ticket?.project) || "";

  const projectOptions = useMemo(() => {
    const list = backend ? backend.projects.map((p) => p.id) : getProjectsForClient(ticket?.clientId || activeClientId, false).map((p) => p.name);
    if (ticketProject && !list.includes(ticketProject)) {
      return [ticketProject, ...list];
    }
    return list;
  }, [backend, activeClientId, getProjectsForClient, ticket, ticketProject]);

  const [subject, setSubject] = useState("");
  const [project, setProject] = useState("SM");
  const [systemId, setSystemId] = useState("");
  const [severity, setSeverity] = useState("Low");
  const [status, setStatus] = useState<string>("Open");
  const [category, setCategory] = useState<string>("");
  const [owner, setOwner] = useState("");
  const assignees = useActivePeople();
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (ticket && open) {
      setSubject(ticket.subject);
      setProject(ticketProject);
      setSystemId(ticket.systemId || "");
      setSeverity(ticket.severity);
      setStatus(ticket.status);
      setCategory(ticket.type || (ticket.category && ticket.category !== "--" ? ticket.category : ""));
      setOwner(ticket.owner);
      setDescription(ticket.description || "");
      setError("");
    }
  }, [ticket, open, ticketProject]);

  if (!ticket) return null;

  const handleSave = async () => {
    if (saving) return;
    const trimmedSubject = subject.trim();
    if (!trimmedSubject) {
      setError("Subjek ticket wajib diisi.");
      return;
    }

    const owners = owner.trim() ? owner.trim().split(",").map((s) => s.trim()).filter(Boolean) : ticket.owners;
    const changedOwner = !!owner.trim() && owner.trim() !== ticket.owner;
    const ownerIds = changedOwner ? ownerIdsFor(owners ?? [], assignees) : ticket.ownerIds;
    const updatedTicket: Ticket = {
      ...ticket,
      subject: trimmedSubject,
      ...(backend
        ? { backend: { ...ticket.backend, projectId: project, projectName: backend.projectName(project) } }
        : { project, projectId: projectFor(project, ticket.clientId || activeClientId)?.id }),
      systemId: systemId || undefined,
      severity,
      status,
      category: category || undefined,
      type: category || undefined,
      owner: owner.trim() || ticket.owner,
      owners,
      ...(ownerIds?.length ? { ownerIds } : {}),
      description: description.trim(),
      history: [
        ...(ticket.history ?? []),
        {
          time: nowClockLabel(),
          type: "response",
          action: `Ticket diperbarui oleh ${operatorName}`,
          author: operatorName,
        },
      ],
    };

    setSaving(true);
    try {
      await onSave(updatedTicket);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Perubahan tidak tersimpan. Coba lagi.");
      return;
    } finally {
      setSaving(false);
    }
    notify.success(`Perubahan ticket #${ticketCode(ticket)} berhasil disimpan.`, { id: `ticket-edit-${ticket.id}` });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} label={`Edit Ticket #${ticketCode(ticket)}`} width={560}>
      <div className="modal-title">
        <div>
          <strong className="[display:flex]! [align-items:center]! [gap:6px]!">
            <Edit3 size={15} className="[color:var(--accent-blue)]" />
            Edit Ticket #{ticketCode(ticket)}
          </strong>
          <small>Perbarui rincian subjek, proyek, severity, penanggung jawab, dan deskripsi ticket.</small>
        </div>
        <button onClick={onClose} aria-label="Tutup modal" type="button">
          <X size={15} />
        </button>
      </div>

      <div className="ticket-form-grid [margin-top:12px]!">
        {/* Row 1: Subject / Title */}
        <label className="ticket-field-subject [grid-column:1_/_-1]!">
          <div className="ticket-field-label-wrapper">
            <span>JUDUL / SUBJEK TICKET *</span>
          </div>
          <input
            value={subject}
            onChange={(event) => {
              setSubject(event.target.value);
              if (error) setError("");
            }}
            placeholder="Subjek ticket"
            autoFocus
          />
        </label>

        {/* Row 2: Project + Priority + Status (3 columns) */}
        <div className="three-inputs [grid-column:1_/_-1]!">
          <label>
            <span>PROYEK</span>
            <Select size="form" className="w-full" value={project} onChange={(event) => setProject(event.target.value)}>
              {projectOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {projectLabel(opt, ticket?.clientId || activeClientId, true)}
                </option>
              ))}
            </Select>
          </label>

          <label>
            <div className="ticket-field-label-wrapper">
              <span>SEVERITY</span>
              <Badge tone={severityTone(severity)}>{severity}</Badge>
            </div>
            <Select size="form" className="w-full" value={severity} onChange={(event) => setSeverity(event.target.value)}>
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {severityLabel(opt)}
                </option>
              ))}
            </Select>
          </label>

          <label>
            <div className="ticket-field-label-wrapper">
              <span>STATUS</span>
              <Badge tone={statusTone(status)}>{status}</Badge>
            </div>
            <Select size="form" className="w-full" value={status} onChange={(event) => setStatus(event.target.value)}>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </Select>
          </label>
        </div>

        {/* Row 3: Assignee / Owner + Category (2 columns) */}
        <div className="[display:grid]! [grid-template-columns:1fr_1fr]! [gap:12px]! [grid-column:1_/_-1]!">
          <label>
            <span>PENANGGUNG JAWAB (ASSIGNEE)</span>
            <Select allowCustom value={owner} onValueChange={setOwner} label="Penanggung jawab" aria-label="Penanggung jawab (Assignee)" listboxId="roster-assignees-list" placeholder="Nama penanggung jawab" options={assignees.map(person => ({ value: person.fullName, label: person.fullName }))} size="form" className="w-full" />
          </label>

          <label>
            <span>KATEGORI</span>
            <Select size="form" className="w-full" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">-- Tanpa Kategori --</option>
              {category && !activeCategories.some(c => c.key === category) && <option value={category}>{categoryLabel(category)} (Arsip)</option>}
              {activeCategories.map(cat => <option key={cat.id} value={cat.key}>{cat.name}</option>)}
            </Select>
          </label>
        </div>

        <TicketSystemSelect project={backend ? backend.projectName(project) : project}organizationId={ticket?.clientId || activeClientId} value={systemId} onChange={setSystemId} originalId={ticket?.systemId} />

        {/* Row 4: Description */}
        <label className="[grid-column:1_/_-1]!">
          <span>DESKRIPSI TICKET</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Deskripsi detail aktivitas operasional atau catatan penanganan..."
            className="[resize:vertical]! [min-height:75px]!"
          />
        </label>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="modal-actions [margin-top:16px]!">
        <button className="button button-secondary" onClick={onClose} type="button">
          Batal
        </button>
        <button className="button button-primary" onClick={handleSave} type="button" disabled={saving}>
          <Check size={14} className="[display:inline-block]! [vertical-align:middle]! [margin-right:4px]!" />
          Simpan Perubahan
        </button>
      </div>
    </Modal>
  );
}
