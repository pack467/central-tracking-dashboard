"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/app/components/ui/Modal";
import { Badge } from "@/app/components/ui/Badge";
import { makeTicketId, nowClockLabel } from "@/app/lib/data";
import { statusTone } from "@/app/components/tickets/TicketTable";
import type { Ticket } from "@/app/lib/types";

interface TicketCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (ticket: Ticket) => void;
}

const PROJECT_OPTIONS = ["SM", "B2B", "USIEM", "MB", "EPC Tools", "DM", "UNEM", "APH", "L2"];
const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Critical"];
const STATUS_OPTIONS = ["Open", "Closed", "Active", "Meeting", "Re-Open", "Pending"] as const;

const CATEGORY_OPTIONS = [
  "Ad-hoc Request",
  "Escalation Handling",
  "Incident & Issue Handling",
  "Validate End-to-End Process Flow",
  "Knowledge Management & Documentation",
  "Monitoring VM, Platform & Services",
];

export function TicketCreateModal({ open, onClose, onCreate }: TicketCreateModalProps) {
  const [ticketCode, setTicketCode] = useState(() => makeTicketId());
  const [subject, setSubject] = useState("");
  const [project, setProject] = useState("SM");
  const [severity, setSeverity] = useState("Low");
  const [status, setStatus] = useState<string>("Open");
  const [category, setCategory] = useState<string>("");
  const [description, setDescription] = useState("");

  // Conditional Ad-hoc Request fields
  const [requestTime, setRequestTime] = useState("");
  const [responseTime, setResponseTime] = useState("");
  const [completionTime, setCompletionTime] = useState("");
  const [isStillOpen, setIsStillOpen] = useState(false);

  const [error, setError] = useState("");

  // Pre-fill suggested ticket code & current time whenever modal opens
  useEffect(() => {
    if (open) {
      const current = nowClockLabel();
      setTicketCode(makeTicketId());
      setRequestTime(current);
      setResponseTime(current);
      setCompletionTime("");
      setIsStillOpen(false);
      setError("");
    }
  }, [open]);

  const reset = () => {
    setTicketCode(makeTicketId());
    setSubject("");
    setProject("SM");
    setSeverity("Low");
    setStatus("Open");
    setCategory("");
    setDescription("");
    setRequestTime("");
    setResponseTime("");
    setCompletionTime("");
    setIsStillOpen(false);
    setError("");
  };

  const submit = () => {
    const trimmedSubject = subject.trim();
    const cleanCode = ticketCode.trim().replace(/^#/, "") || makeTicketId();

    if (!trimmedSubject) {
      setError("Subjek ticket wajib diisi agar tim operasional memahami konteks.");
      return;
    }
    if (!category || category === "--") {
      setError("Silakan pilih salah satu 'Category' yang sesuai.");
      return;
    }
    if (!status) {
      setError("Status ticket wajib dipilih.");
      return;
    }

    // Validation for Ad-hoc Request category
    if (category === "Ad-hoc Request") {
      if (!requestTime.trim()) {
        setError("Request Time wajib diisi untuk kategori Ad-hoc Request.");
        return;
      }
      if (!responseTime.trim()) {
        setError("Response Time wajib diisi untuk kategori Ad-hoc Request.");
        return;
      }
      if (!isStillOpen && !completionTime.trim()) {
        setError("Completion Time wajib diisi, atau centang 'Still Open' jika pekerjaan belum selesai.");
        return;
      }
    }

    const created = nowClockLabel();
    const isAdhoc = category === "Ad-hoc Request";

    onCreate({
      id: cleanCode,
      subject: trimmedSubject,
      project,
      severity,
      category,
      requestTime: isAdhoc ? requestTime : undefined,
      responseTime: isAdhoc ? responseTime : undefined,
      completionTime: isAdhoc ? (isStillOpen ? undefined : completionTime) : undefined,
      isStillOpen: isAdhoc ? isStillOpen : undefined,
      owner: "Galih Khairi",
      status,
      created,
      description:
        description.trim() ||
        (isAdhoc
          ? `Permintaan Ad-hoc (Req: ${requestTime}, Resp: ${responseTime}${isStillOpen ? ", Status: Still Open" : `, Selesai: ${completionTime}`}).`
          : `Item aktivitas operasional kategori ${category}.`),
      history: [
        {
          time: created,
          action: `Ticket #${cleanCode} dibuat oleh operator (Kategori: ${category}, Status: ${status})`,
          author: "Galih Khairi",
        },
      ],
    });

    reset();
    onClose();
  };

  const isAdhoc = category === "Ad-hoc Request";

  return (
    <Modal open={open} onClose={onClose} label="Buat ticket baru" width={640}>
      <div className="modal-title">
        <div>
          <strong>Buat Ticket NOC Baru</strong>
          <small>Catat tugas operasional, permintaan ad-hoc, atau penanganan insiden.</small>
        </div>
        <button onClick={onClose} aria-label="Tutup modal">×</button>
      </div>

      <div className="ticket-form-grid">
        {/* Row 1: Ticket Code (Editable) + Subject */}
        <div className="ticket-code-subject-row">
          <label className="ticket-field-code">
            <span>TICKET CODE</span>
            <div className="ticket-input-wrapper">
              <span className="ticket-hash-prefix">#</span>
              <input
                type="text"
                value={ticketCode}
                onChange={(e) => setTicketCode(e.target.value.replace(/^#/, ""))}
                placeholder="Kode tiket"
                className="ticket-editable-code-input"
                title="Kode tiket dapat diedit manual atau menggunakan kode yang di-generate sistem"
              />
            </div>
          </label>

          <label className="ticket-field-subject">
            <span>SUBJECT</span>
            <input
              value={subject}
              onChange={(event) => {
                setSubject(event.target.value);
                if (error) setError("");
              }}
              placeholder="Judul singkat pekerjaan atau observasi"
              autoFocus
            />
          </label>
        </div>

        {/* Row 2: Project + Priority Level + Status (3-Column Grid) */}
        <div className="three-inputs">
          <label>
            <span>PROJECT</span>
            <select value={project} onChange={(event) => setProject(event.target.value)}>
              {PROJECT_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>

          <label>
            <span>PRIORITY LEVEL</span>
            <select value={severity} onChange={(event) => setSeverity(event.target.value)}>
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>

          <label>
            <div className="ticket-field-label-wrapper">
              <span>STATUS</span>
              <Badge tone={statusTone(status)}>{status}</Badge>
            </div>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                if (error) setError("");
              }}
              className="ticket-status-select"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>

        {/* Row 3: Category (Full Width) */}
        <label className="ticket-field-category">
          <div className="ticket-field-label-wrapper">
            <span>CATEGORY</span>
            <span className="ticket-required-star">* Wajib</span>
          </div>
          <select
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              if (error) setError("");
            }}
            className={category && category !== "--" ? "selected-category" : ""}
          >
            <option value="">-- Select Category --</option>
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        {/* Conditional Fields for "Ad-hoc Request" (Smooth Expandable Container) */}
        {isAdhoc && (
          <div className="adhoc-fields-container anim-fade">
            <div className="adhoc-fields-header">
              <span className="adhoc-fields-badge">⚡ Ad-hoc Request Timeline</span>
              <small>Catat waktu masuk, respon, dan estimasi selesai permintaan.</small>
            </div>

            <div className="three-inputs adhoc-inputs-row">
              <label>
                <span>REQUEST TIME *</span>
                <input
                  type="time"
                  value={requestTime}
                  onChange={(e) => {
                    setRequestTime(e.target.value);
                    if (error) setError("");
                  }}
                  className="ticket-time-input"
                />
              </label>

              <label>
                <span>RESPONSE TIME *</span>
                <input
                  type="time"
                  value={responseTime}
                  onChange={(e) => {
                    setResponseTime(e.target.value);
                    if (error) setError("");
                  }}
                  className="ticket-time-input"
                />
              </label>

              <label>
                <div className="ticket-field-label-wrapper">
                  <span>COMPLETION TIME</span>
                  <label className="still-open-toggle-label" title="Centang jika permintaan belum selesai">
                    <input
                      type="checkbox"
                      checked={isStillOpen}
                      onChange={(e) => {
                        setIsStillOpen(e.target.checked);
                        if (error) setError("");
                      }}
                      className="still-open-checkbox"
                    />
                    <span>Still Open</span>
                  </label>
                </div>
                <input
                  type="time"
                  value={completionTime}
                  onChange={(e) => {
                    setCompletionTime(e.target.value);
                    if (error) setError("");
                  }}
                  disabled={isStillOpen}
                  className={`ticket-time-input ${isStillOpen ? "time-input-disabled" : ""}`}
                  placeholder={isStillOpen ? "Masih berlangsung" : ""}
                />
              </label>
            </div>
          </div>
        )}

        {/* Row 4: Operational Notes */}
        <label>
          <span>OPERATIONAL NOTES</span>
          <textarea
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Masukkan observasi rinci, langkah penanganan, kode error, atau instruksi terkait..."
          />
        </label>
      </div>

      {error && (
        <div className="form-error-banner">
          <span className="form-error-icon">!</span>
          <span>{error}</span>
        </div>
      )}

      <p className="form-hint">
        Ticket disimpan otomatis dan langsung tersinkronisasi ke daftar antrean operasional.
      </p>

      <div className="modal-actions">
        <button className="button button-secondary" onClick={onClose} type="button">
          Batal
        </button>
        <button className="button button-primary" onClick={submit} type="button">
          ✓ Buat Ticket
        </button>
      </div>
    </Modal>
  );
}
