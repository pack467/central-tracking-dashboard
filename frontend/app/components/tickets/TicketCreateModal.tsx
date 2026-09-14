"use client";

import { useEffect, useState, useMemo } from "react";
import {
  X,
  Zap,
  Check,
  Ticket,
  FileText,
  Layers,
  AlertTriangle,
  Activity,
  Tag,
  AlignLeft,
  RefreshCw,
  Clock,
  CheckCircle2,
  Users,
} from "lucide-react";
import { Modal } from "@/app/components/ui/Modal";
import { Badge } from "@/app/components/ui/Badge";
import { TimePicker } from "@/app/components/ui/TimePicker";
import { OwnerTagInput } from "@/app/components/tickets/OwnerTagInput";
import { makeTicketId, nowClockLabel } from "@/app/lib/data";
import { severityTone, statusTone } from "@/app/components/tickets/TicketTable";
import { useAuth } from "@/app/lib/auth";
import type { Ticket as TicketType } from "@/app/lib/types";
import { useClient } from "@/app/context/ClientContext";
import { getClientSystems } from "@/app/lib/clientData";

interface TicketCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (ticket: TicketType) => void;
}

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
  const { user } = useAuth();
  const { activeClient, activeClientId } = useClient();
  const clientSystems = useMemo(() => getClientSystems(activeClientId), [activeClientId]);

  const operatorName = user?.name || "Galih Khairi";
  const [ticketCode, setTicketCode] = useState(() => makeTicketId());
  const [subject, setSubject] = useState("");
  const [owners, setOwners] = useState<string[]>(() => [operatorName]);
  const [project, setProject] = useState(() => clientSystems[0] || "SM");
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
      setProject(clientSystems[0] || "SM");
      setOwners([operatorName]);
    }
  }, [open, clientSystems, operatorName]);

  const reset = () => {
    setTicketCode(makeTicketId());
    setSubject("");
    setOwners([operatorName]);
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
    const cleanCode = ticketCode.trim().replace(/^#/, "");
    const trimmedSubject = subject.trim();

    if (!cleanCode) {
      setError("Kode tiket wajib diisi. Masukkan kode manual atau klik tombol generate.");
      return;
    }
    if (!/^[a-zA-Z0-9_\-]+$/.test(cleanCode) || cleanCode.length < 3) {
      setError("Format kode tiket tidak valid (gunakan minimal 3 karakter alfanumerik atau tanda hubung).");
      return;
    }
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
    const primaryOwner = owners.length > 0 ? owners.join(", ") : "Unassigned";

    onCreate({
      id: cleanCode,
      subject: trimmedSubject,
      project,
      severity,
      requestTime: isAdhoc ? requestTime : undefined,
      responseTime: isAdhoc ? responseTime : undefined,
      completionTime: isAdhoc ? (isStillOpen ? undefined : completionTime) : undefined,
      isStillOpen: isAdhoc ? isStillOpen : undefined,
      owner: primaryOwner,
      owners,
      category: category || "Incident & Issue Handling",
      status,
      created,
      description:
        description.trim() ||
        (isAdhoc
          ? `Permintaan Ad-hoc (Req: ${requestTime}, Resp: ${responseTime}${isStillOpen ? ", Status: Still Open" : `, Selesai: ${completionTime}`}).`
          : `Item aktivitas operasional kategori ${category}.`),
      clientId: activeClientId,
      history: [
        {
          time: created,
          type: "created",
          action: `Ticket #${cleanCode} dibuat oleh ${operatorName} (PIC: ${primaryOwner}, Kategori: ${category}, Status: ${status})`,
          author: operatorName,
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
          <strong>Buat Ticket NOC Baru — {activeClient.shortName}</strong>
          <small>Catat tugas operasional, permintaan ad-hoc, atau penanganan insiden untuk {activeClient.name}.</small>
        </div>
        <button onClick={onClose} aria-label="Tutup modal">
          <X size={15} />
        </button>
      </div>

      <div className="ticket-form-grid">
        {/* ── Section 1: Ticket Identity ── */}
        <div className="ticket-form-section">
          <div className="ticket-section-header">
            <span className="ticket-section-title">Identitas Ticket</span>
          </div>

          <div className="ticket-code-subject-row">
            <label className="ticket-field-code">
              <div className="ticket-field-label-wrapper">
                <span className="ticket-field-label">
                  <Ticket size={12} className="ticket-field-icon" />
                  TICKET CODE
                </span>
              </div>
              <div className="ticket-input-wrapper">
                <span className="ticket-hash-prefix">#</span>
                <input
                  type="text"
                  value={ticketCode}
                  onChange={(event) => {
                    setTicketCode(event.target.value.replace(/^#/, ""));
                    if (error) setError("");
                  }}
                  placeholder="Kode tiket"
                  className="ticket-editable-code-input"
                  title="Kode tiket (dapat diketik manual atau digenerate otomatis)"
                />
                <button
                  type="button"
                  onClick={() => {
                    setTicketCode(makeTicketId());
                    if (error) setError("");
                  }}
                  className="ticket-generate-code-btn"
                  title="Generate Otomatis Kode Baru"
                  aria-label="Generate Otomatis Kode Baru"
                >
                  <RefreshCw size={12} />
                </button>
              </div>
            </label>

            <label className="ticket-field-subject">
              <div className="ticket-field-label-wrapper">
                <span className="ticket-field-label">
                  <FileText size={12} className="ticket-field-icon" />
                  SUBJECT <span className="ticket-required-star" title="Wajib diisi">*</span>
                </span>
              </div>
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

          {/* Row: Pemilik Tiket / PIC (Multi-chip Tag Input) */}
          <div className="ticket-field-owners">
            <div className="ticket-field-label-wrapper">
              <span className="ticket-field-label">
                <Users size={12} className="ticket-field-icon" />
                PEMILIK TIKET / PIC
              </span>
              <span className="ticket-field-hint">Dapat menambahkan lebih dari satu PIC</span>
            </div>
            <OwnerTagInput
              owners={owners}
              onChange={setOwners}
              placeholder="Ketik nama operator atau pilih dari daftar..."
            />
          </div>
        </div>

        <div className="ticket-form-divider" />

        {/* ── Section 2: Classification ── */}
        <div className="ticket-form-section">
          <div className="ticket-section-header">
            <span className="ticket-section-title">Klasifikasi Layanan</span>
          </div>

          {/* Row: Project + Priority Level + Status (3-Column Grid) */}
          <div className="three-inputs">
            <label>
              <div className="ticket-field-label-wrapper">
                <span className="ticket-field-label">
                  <Layers size={12} className="ticket-field-icon" />
                  PROJECT / SISTEM
                </span>
              </div>
              <select value={project} onChange={(event) => setProject(event.target.value)}>
                {clientSystems.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <label>
              <div className="ticket-field-label-wrapper">
                <span className="ticket-field-label">
                  <AlertTriangle size={12} className="ticket-field-icon" />
                  PRIORITY LEVEL
                </span>
                <Badge tone={severityTone(severity)}>{severity}</Badge>
              </div>
              <select value={severity} onChange={(event) => setSeverity(event.target.value)}>
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <label>
              <div className="ticket-field-label-wrapper">
                <span className="ticket-field-label">
                  <Activity size={12} className="ticket-field-icon" />
                  STATUS
                </span>
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

          {/* Category (Full Width) */}
          <label className="ticket-field-category">
            <div className="ticket-field-label-wrapper">
              <span className="ticket-field-label">
                <Tag size={12} className="ticket-field-icon" />
                CATEGORY <span className="ticket-required-star" title="Wajib diisi">*</span>
              </span>
              <span className="ticket-required-hint">Wajib</span>
            </div>
            <select
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                if (error) setError("");
              }}
              className={category && category !== "--" ? "selected-category" : ""}
            >
              <option value="">-- Pilih Kategori Tiket --</option>
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          {/* Conditional Fields for "Ad-hoc Request" */}
          {isAdhoc && (
            <div className="adhoc-fields-container">
              <div className="adhoc-fields-header">
                <span className="adhoc-fields-badge">
                  <Zap size={11} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "4px" }} />
                  Timeline Permintaan Ad-hoc
                </span>
                <small>Waktu masuk, respon, dan estimasi selesai pekerjaan.</small>
              </div>

              <div className="three-inputs adhoc-inputs-row">
                <label>
                  <div className="ticket-field-label-wrapper">
                    <span className="ticket-field-label">
                      <Clock size={12} className="ticket-field-icon" />
                      REQUEST TIME <span className="ticket-required-star">*</span>
                    </span>
                  </div>
                  <TimePicker
                    value={requestTime}
                    onChange={(val) => {
                      setRequestTime(val);
                      if (error) setError("");
                    }}
                    placeholder="00:00"
                    title="Waktu masuk permintaan ad-hoc"
                  />
                </label>

                <label>
                  <div className="ticket-field-label-wrapper">
                    <span className="ticket-field-label">
                      <Clock size={12} className="ticket-field-icon" />
                      RESPONSE TIME <span className="ticket-required-star">*</span>
                    </span>
                  </div>
                  <TimePicker
                    value={responseTime}
                    onChange={(val) => {
                      setResponseTime(val);
                      if (error) setError("");
                    }}
                    placeholder="00:00"
                    title="Waktu respon pertama penanganan"
                  />
                </label>

                <label>
                  <div className="ticket-field-label-wrapper">
                    <span className="ticket-field-label">
                      <CheckCircle2 size={12} className="ticket-field-icon" />
                      COMPLETION TIME
                    </span>
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
                  <TimePicker
                    value={isStillOpen ? "" : completionTime}
                    onChange={(val) => {
                      setCompletionTime(val);
                      if (error) setError("");
                    }}
                    disabled={isStillOpen}
                    placeholder={isStillOpen ? "Masih berlangsung" : "--:--"}
                    title={isStillOpen ? "Permintaan masih berlangsung" : "Waktu penyelesaian permintaan"}
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="ticket-form-divider" />

        {/* ── Section 3: Details & Operational Notes ── */}
        <div className="ticket-form-section">
          <div className="ticket-section-header">
            <span className="ticket-section-title">Rincian & Catatan Operasional</span>
          </div>

          <label>
            <div className="ticket-field-label-wrapper">
              <span className="ticket-field-label">
                <AlignLeft size={12} className="ticket-field-icon" />
                OPERATIONAL NOTES
              </span>
            </div>
            <textarea
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Masukkan observasi rinci, langkah penanganan, kode error, atau instruksi terkait..."
            />
          </label>
        </div>
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
          <Check size={14} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "4px" }} /> Buat Ticket
        </button>
      </div>
    </Modal>
  );
}
