"use client";

import { useEffect, useState } from "react";
import { X, Check, Edit3 } from "lucide-react";
import { Modal } from "@/app/components/ui/Modal";
import { Badge } from "@/app/components/ui/Badge";
import { severityTone, statusTone } from "@/app/components/tickets/TicketTable";
import { nowClockLabel, seedRosterMembers } from "@/app/lib/data";
import { useAuth } from "@/app/lib/auth";
import { useToast } from "@/app/components/ui/Toast";
import type { Ticket } from "@/app/lib/types";

interface TicketEditModalProps {
  open: boolean;
  ticket: Ticket | null;
  onClose: () => void;
  onSave: (updated: Ticket) => void;
}

const PROJECT_OPTIONS = ["SM", "B2B", "USIEM", "MB", "EPC Tools", "DM", "UNEM", "APH", "L2"];
const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Critical"];
const STATUS_OPTIONS = ["Open", "Active", "Closed", "Pending", "Meeting", "Escalated"] as const;
const CATEGORY_OPTIONS = [
  "Ad-hoc Request",
  "Escalation Handling",
  "Incident & Issue Handling",
  "Validate End-to-End Process Flow",
  "Knowledge Management & Documentation",
  "Monitoring VM, Platform & Services",
  "Change Request",
  "Maintenance",
  "Other",
];

export function TicketEditModal({ open, ticket, onClose, onSave }: TicketEditModalProps) {
  const notify = useToast();
  const { user } = useAuth();
  const operatorName = user?.name || "Operator NOC";

  const [subject, setSubject] = useState("");
  const [project, setProject] = useState("SM");
  const [severity, setSeverity] = useState("Low");
  const [status, setStatus] = useState<string>("Open");
  const [category, setCategory] = useState<string>("");
  const [owner, setOwner] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (ticket && open) {
      setSubject(ticket.subject);
      setProject(ticket.project);
      setSeverity(ticket.severity);
      setStatus(ticket.status);
      setCategory(ticket.category && ticket.category !== "--" ? ticket.category : "");
      setOwner(ticket.owner);
      setDescription(ticket.description || "");
      setError("");
    }
  }, [ticket, open]);

  if (!ticket) return null;

  const handleSave = () => {
    const trimmedSubject = subject.trim();
    if (!trimmedSubject) {
      setError("Subjek ticket wajib diisi.");
      return;
    }

    const updatedTicket: Ticket = {
      ...ticket,
      subject: trimmedSubject,
      project,
      severity,
      status,
      category: category || undefined,
      owner: owner.trim() || ticket.owner,
      owners: owner.trim() ? owner.trim().split(",").map((s) => s.trim()).filter(Boolean) : ticket.owners,
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

    onSave(updatedTicket);
    notify.success(`Perubahan ticket #${ticket.id} berhasil disimpan.`, { id: `ticket-edit-${ticket.id}` });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} label={`Edit Ticket #${ticket.id}`} width={560}>
      <div className="modal-title">
        <div>
          <strong style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Edit3 size={15} style={{ color: "var(--accent-blue)" }} />
            Edit Ticket #{ticket.id}
          </strong>
          <small>Perbarui rincian subjek, proyek, prioritas, penanggung jawab, dan deskripsi ticket.</small>
        </div>
        <button onClick={onClose} aria-label="Tutup modal" type="button">
          <X size={15} />
        </button>
      </div>

      <div className="ticket-form-grid" style={{ marginTop: "12px" }}>
        {/* Row 1: Subject / Title */}
        <label className="ticket-field-subject" style={{ gridColumn: "1 / -1" }}>
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
        <div className="three-inputs" style={{ gridColumn: "1 / -1" }}>
          <label>
            <span>PROYEK</span>
            <select value={project} onChange={(event) => setProject(event.target.value)}>
              {PROJECT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>

          <label>
            <div className="ticket-field-label-wrapper">
              <span>PRIORITAS</span>
              <Badge tone={severityTone(severity)}>{severity}</Badge>
            </div>
            <select value={severity} onChange={(event) => setSeverity(event.target.value)}>
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>

          <label>
            <div className="ticket-field-label-wrapper">
              <span>STATUS</span>
              <Badge tone={statusTone(status)}>{status}</Badge>
            </div>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Row 3: Assignee / Owner + Category (2 columns) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", gridColumn: "1 / -1" }}>
          <label>
            <span>PENANGGUNG JAWAB (ASSIGNEE)</span>
            <input
              type="text"
              value={owner}
              list="roster-assignees-list"
              onChange={(e) => setOwner(e.target.value)}
              placeholder="Nama penanggung jawab"
            />
            <datalist id="roster-assignees-list">
              {seedRosterMembers.map((m) => (
                <option key={m.id} value={m.name} />
              ))}
            </datalist>
          </label>

          <label>
            <span>KATEGORI</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">-- Tanpa Kategori --</option>
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Row 4: Description */}
        <label style={{ gridColumn: "1 / -1" }}>
          <span>DESKRIPSI TICKET</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Deskripsi detail aktivitas operasional atau catatan penanganan..."
            style={{ resize: "vertical", minHeight: "75px" }}
          />
        </label>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="modal-actions" style={{ marginTop: "16px" }}>
        <button className="button button-secondary" onClick={onClose} type="button">
          Batal
        </button>
        <button className="button button-primary" onClick={handleSave} type="button">
          <Check size={14} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "4px" }} />
          Simpan Perubahan
        </button>
      </div>
    </Modal>
  );
}
