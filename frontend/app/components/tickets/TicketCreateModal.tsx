"use client";

import { useMasterReferences } from "@/app/hooks/useMasterReferences";
import { TicketSystemSelect } from "./TicketSystemSelect";
import { Select } from "@/app/components/ui/Select";
import { getTimelineConfig } from "@/app/lib/ticket-timeline";

import { useState, useMemo } from "react";
import { X, Zap, Check, Ticket, FileText, Layers, AlertTriangle, Activity, Tag, AlignLeft, Clock, CheckCircle2, Users, Building2, Share2 } from "lucide-react";
import { Modal } from "@/app/components/ui/Modal";
import { Badge } from "@/app/components/ui/Badge";
import { TimePicker } from "@/app/components/ui/TimePicker";
import { OwnerTagInput } from "@/app/components/tickets/OwnerTagInput";
import { usePeople } from "@/app/hooks/useMasterData";
import { useBackendTicketOptions } from "@/app/hooks/useBackendTicketOptions";
import { ownerIdsFor } from "@/app/lib/ticket-owner";
import { nowClockLabel } from "@/app/lib/data";
import { severityTone, statusTone } from "@/app/components/tickets/TicketTable";
import { useAuth } from "@/app/lib/auth";
import type { Ticket as TicketType } from "@/app/lib/types";
import { useClient } from "@/app/context/ClientContext";
import { getClientSystems } from "@/app/lib/clientData";

interface TicketCreateModalProps {
  open: boolean;
  onClose: () => void;
  /** Saves the ticket; a promise that fails keeps the form open with the reason. */
  onCreate: (ticket: TicketType) => void | Promise<unknown>;
}

const PRIORITY_OPTIONS = ["Low", "Medium", "High"];
const STATUS_OPTIONS = ["Open", "Closed", "Activity", "Meeting", "Re-Open", "Pending", "RCA"] as const;



export function TicketCreateModal({ open, onClose, onCreate }: TicketCreateModalProps) {
  const { user, hasPermission } = useAuth();
  const master = useMasterReferences();
  // with the backend as the source its projects (by id) and categories are offered instead of the Master Data ones
  const backend = useBackendTicketOptions();
  const { severityLabel, projectFor } = master;
  const activeCategories = backend ? backend.categories : master.activeCategories;
  const statusOptions = useMemo(
    () => (backend ? STATUS_OPTIONS.filter((opt) => opt !== "RCA") : STATUS_OPTIONS),
    [backend]
  );
  const projectLabel = (value: string, organizationId?: string) => backend ? backend.projectName(value) : master.projectLabel(value, organizationId);
  const { activeClient, activeClientId, getProjectsForClient } = useClient();
  const clientSystems = useMemo(() => {
    if (backend) return backend.projects.map((p) => p.id);
    const projs = getProjectsForClient(activeClientId, false).map((p) => p.name);
    if (projs.length > 0) return projs;
    return getClientSystems(activeClientId);
  }, [backend, activeClientId, getProjectsForClient]);

  const defaultProject = clientSystems[0] || (backend ? "1" : "SM");
  const operatorName = user?.name || "Mhd. Galih Khairi";
  const [ticketCode, setTicketCode] = useState("");
  const [subject, setSubject] = useState("");
  const [owners, setOwners] = useState<string[]>(() => [operatorName]);
  const people = usePeople();
  const ownerIds = useMemo(() => {
    const matched = ownerIdsFor(owners, people);
    if (
      matched.length === 0 &&
      user?.id &&
      /^\d+$/.test(user.id) &&
      owners.some((o) => o.trim().toLowerCase() === (user.name || "").trim().toLowerCase())
    ) {
      matched.push(user.id);
    }
    if (backend && !hasPermission("tickets.write.any")) {
      return matched.filter((id) => id === user?.id);
    }
    return matched;
  }, [owners, people, user, backend, hasPermission]);
  const [project, setProject] = useState(() => defaultProject);
  const [systemId, setSystemId] = useState("");
  const [severity, setSeverity] = useState("Low");
  const [status, setStatus] = useState<string>("Open");
  const [category, setCategory] = useState<string>("");
  const [description, setDescription] = useState("");

  // Conditional Escalation fields
  const [escalatedTo, setEscalatedTo] = useState("");

  // Conditional Ad-hoc Request fields
  const [requestTime, setRequestTime] = useState("");
  const [responseTime, setResponseTime] = useState("");
  const [completionTime, setCompletionTime] = useState("");
  const [isStillOpen, setIsStillOpen] = useState(false);

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const isEscalation = useMemo(() => {
    const normCategory = (category || "").toLowerCase();
    const normStatus = (status || "").toLowerCase();
    return (
      normCategory.includes("escalat") ||
      normCategory.includes("eskalasi") ||
      normStatus.includes("escalat") ||
      normStatus.includes("eskalasi")
    );
  }, [category, status]);

  const timelineConfig = useMemo(() => getTimelineConfig(category), [category]);

  // Pre-fill current time & default project when the modal opens, and only then: this used to run again whenever the system list or the
  // operator changed, which wiped what was already typed.
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      const current = nowClockLabel();
      setSystemId("");
      setTicketCode("");
      setEscalatedTo("");
      setRequestTime(current);
      setResponseTime(current);
      setCompletionTime("");
      setIsStillOpen(false);
      setError("");
      setProject(clientSystems[0] || (backend ? "1" : "SM"));
      setOwners([operatorName]);
    }
  }

  // Keep project valid if clientSystems loads asynchronously while modal is open
  if (clientSystems.length > 0 && !clientSystems.includes(project)) {
    setProject(clientSystems[0]);
  }

  const reset = () => {
    setSystemId("");
    setTicketCode("");
    setSubject("");
    setOwners([operatorName]);
    setProject(clientSystems[0] || (backend ? "1" : "SM"));
    setSeverity("Low");
    setStatus("Open");
    setCategory("");
    setEscalatedTo("");
    setDescription("");
    setRequestTime("");
    setResponseTime("");
    setCompletionTime("");
    setIsStillOpen(false);
    setError("");
  };

  const submit = async () => {
    if (saving) return;
    const cleanCode = ticketCode.trim().replace(/^#/, "");
    const trimmedSubject = subject.trim();

    if (!cleanCode) {
      setError("Kode tiket wajib diisi.");
      return;
    }
    if (cleanCode.length > 100) {
      setError("Kode tiket maksimal 100 karakter.");
      return;
    }
    if (!trimmedSubject) {
      setError("Subjek ticket wajib diisi agar tim operasional memahami konteks.");
      return;
    }
    if (!category || !activeCategories.some(entry => entry.key === category)) {
      setError("Silakan pilih salah satu 'Category' yang sesuai.");
      return;
    }
    if (!status) {
      setError("Status ticket wajib dipilih.");
      return;
    }

    if (!clientSystems.includes(project)) { setError("Pilih proyek aktif."); return; }

    // Validation for timeline fields according to selected category
    if (category) {
      if (!requestTime.trim()) {
        setError(`${timelineConfig.firstLabel} wajib diisi.`);
        return;
      }
      if (timelineConfig.fieldCount === 3 && !responseTime.trim()) {
        setError(`${timelineConfig.secondLabel || "Response Time"} wajib diisi.`);
        return;
      }
      if (!isStillOpen && !completionTime.trim()) {
        setError(`${timelineConfig.completionLabel} wajib diisi, atau centang 'Still Open' jika pekerjaan belum selesai.`);
        return;
      }
      if (!isStillOpen && completionTime.trim() && requestTime.trim() && completionTime.trim() < requestTime.trim()) {
        setError(`${timelineConfig.completionLabel} tidak boleh lebih awal dari ${timelineConfig.firstLabel}.`);
        return;
      }
    }

    const created = nowClockLabel();
    const primaryOwner = owners.length > 0 ? owners.join(", ") : "Unassigned";
    const matchingSystem = master.catalog.systems.find(
      (s) =>
        s.id === systemId.trim() ||
        s.name.toLowerCase() === systemId.trim().toLowerCase() ||
        s.code.toLowerCase() === systemId.trim().toLowerCase()
    );
    const resolvedSystemId = matchingSystem ? matchingSystem.id : (systemId.trim() || undefined);

    const draft: TicketType = {
      id: cleanCode,
      subject: trimmedSubject,
      // the backend keeps the project by id and the ticket code as its third-party id
      ...(backend ? { project: backend.projectName(project), backend: { projectId: project, thirdPartyId: cleanCode } } : { project }),
      severity,
      requestTime: requestTime.trim() || undefined,
      responseTime: timelineConfig.fieldCount === 3 ? (responseTime.trim() || undefined) : undefined,
      completionTime: isStillOpen ? undefined : (completionTime.trim() || undefined),
      isStillOpen: isStillOpen || undefined,
      escalatedTo: isEscalation && escalatedTo.trim() ? escalatedTo.trim() : undefined,
      escalationLevel: isEscalation ? "Level 2" : undefined,
      owner: primaryOwner,
      owners,
      ...(ownerIds.length ? { ownerIds } : {}),
      category,
      type: category,
      projectId: backend ? undefined : projectFor(project, activeClientId)?.id,
      systemId: resolvedSystemId,
      systemComponent: systemId.trim() || undefined,
      status,
      created,
      description:
        description.trim() ||
        (timelineConfig.fieldCount === 3
          ? `${category} (${timelineConfig.firstLabel}: ${requestTime}, ${timelineConfig.secondLabel}: ${responseTime}${isStillOpen ? ", Status: Still Open" : `, ${timelineConfig.completionLabel}: ${completionTime}`}).`
          : `${category} (${timelineConfig.firstLabel}: ${requestTime}${isStillOpen ? ", Status: Still Open" : `, ${timelineConfig.completionLabel}: ${completionTime}`}).` +
            (isEscalation && escalatedTo.trim() ? ` Eskalasi ke ${escalatedTo.trim()}.` : "")),
      clientId: activeClientId,
      history: [
        {
          time: created,
          type: isEscalation ? "status_change" : "created",
          action: isEscalation && escalatedTo.trim()
            ? `Ticket #${cleanCode} dibuat dan dieskalasikan ke ${escalatedTo.trim()} oleh ${operatorName}`
            : `Ticket #${cleanCode} dibuat oleh ${operatorName} (Assignee: ${primaryOwner}, Kategori: ${category}, Status: ${status})`,
          author: operatorName,
        },
      ],
    };

    setSaving(true);
    try {
      await onCreate(draft);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ticket tidak tersimpan. Coba lagi.");
      return;
    } finally {
      setSaving(false);
    }
    reset();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} label="Buat ticket baru" width={640}>
      <div className="modal-title">
        <div>
          <div className="ticket-modal-title-row">
            <strong>Buat Ticket Baru</strong>
            <span className="ticket-client-badge">
              <Building2 size={11} className="ticket-client-badge-icon" />
              <span>{activeClient.shortName || activeClient.name}</span>
            </span>
          </div>
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
                  TICKET CODE <span className="ticket-required-star" title="Wajib diisi">*</span>
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
                  title="Kode tiket"
                />
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
              />
            </label>
          </div>

          {/* Row: Pemilik Tiket / PIC (Multi-chip Tag Input) */}
          <div className="ticket-field-owners">
            <div className="ticket-field-label-wrapper">
              <span className="ticket-field-label">
                <Users size={12} className="ticket-field-icon" />
                ASSIGNEE
              </span>
              <span className="ticket-field-hint">Dapat menambahkan lebih dari satu assignee</span>
            </div>
            <OwnerTagInput
              owners={owners}
              onChange={setOwners}
              placeholder="Ketik nama operator atau pilih assignee..."
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
              <Select size="form" className="w-full" value={project} onChange={(event) => setProject(event.target.value)}>
                {clientSystems.map((option) => (
                  <option key={option} value={option}>{projectLabel(option, activeClientId)}</option>
                ))}
              </Select>
            </label>

            <label>
              <div className="ticket-field-label-wrapper">
                <span className="ticket-field-label">
                  <AlertTriangle size={12} className="ticket-field-icon" />
                  SEVERITY LEVEL
                </span>
                <Badge tone={severityTone(severity)}>{severity}</Badge>
              </div>
              <Select size="form" className="w-full" value={severity} onChange={(event) => setSeverity(event.target.value)}>
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>{severityLabel(option)}</option>
                ))}
              </Select>
            </label>

            <label>
              <div className="ticket-field-label-wrapper">
                <span className="ticket-field-label">
                  <Activity size={12} className="ticket-field-icon" />
                  STATUS
                </span>
                <Badge tone={statusTone(status)}>{status}</Badge>
              </div>
              <Select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  if (error) setError("");
                }}
                className="ticket-status-select"
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </Select>
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
            <Select
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                if (error) setError("");
              }}
              className={category && category !== "--" ? "selected-category" : ""}
            >
              <option value="">-- Pilih Kategori Tiket --</option>
              {activeCategories.map((entry) => (
                <option key={entry.key} value={entry.key}>
                  {entry.name}
                </option>
              ))}
            </Select>
          </label>

          <TicketSystemSelect project={backend ? backend.projectName(project) : project}organizationId={activeClientId} value={systemId} onChange={setSystemId} />

          {/* Conditional Fields for "Escalation" */}
          {isEscalation && (
            <label className="ticket-field-escalated">
              <div className="ticket-field-label-wrapper">
                <span className="ticket-field-label">
                  <Share2 size={12} className="ticket-field-icon" />
                  TARGET ESKALASI
                </span>
                <span className="ticket-field-hint">Target eskalasi penanganan</span>
              </div>
              <input
                type="text"
                value={escalatedTo}
                onChange={(event) => {
                  setEscalatedTo(event.target.value);
                  if (error) setError("");
                }}
                placeholder="Ketik target eskalasi (contoh: L2 Support, Dimas Suryo, Vendor Core)..."
                className="w-full"
              />
            </label>
          )}

          {/* Dynamic Timeline Fields (Adapted to Category) */}
          {Boolean(category) && (
            <div className="adhoc-fields-container">
              <div className="adhoc-fields-header">
                <span className="adhoc-fields-badge">
                  <Zap size={11} className="[display:inline-block]! [vertical-align:middle]! [margin-right:4px]!" />
                  {timelineConfig.badgeTitle}
                </span>
                <small>{timelineConfig.badgeSub}</small>
              </div>

              {timelineConfig.fieldCount === 3 ? (
                <div className="three-inputs adhoc-inputs-row">
                  <label>
                    <div className="ticket-field-label-wrapper">
                      <span className="ticket-field-label">
                        <Clock size={12} className="ticket-field-icon" />
                        {timelineConfig.firstLabel} <span className="ticket-required-star">*</span>
                      </span>
                    </div>
                    <TimePicker
                      value={requestTime}
                      onChange={(val) => {
                        setRequestTime(val);
                        if (error) setError("");
                      }}
                      placeholder="00:00"
                      title={timelineConfig.firstHint}
                    />
                  </label>

                  <label>
                    <div className="ticket-field-label-wrapper">
                      <span className="ticket-field-label">
                        <Clock size={12} className="ticket-field-icon" />
                        {timelineConfig.secondLabel || "RESPONSE TIME"} <span className="ticket-required-star">*</span>
                      </span>
                    </div>
                    <TimePicker
                      value={responseTime}
                      onChange={(val) => {
                        setResponseTime(val);
                        if (error) setError("");
                      }}
                      placeholder="00:00"
                      title={timelineConfig.secondHint || "Waktu respon pertama penanganan"}
                    />
                  </label>

                  <div className="ticket-field-stack">
                    <div className="ticket-field-label-wrapper">
                      <span className="ticket-field-label">
                        <CheckCircle2 size={12} className="ticket-field-icon" />
                        {timelineConfig.completionLabel}
                      </span>
                      <label className="still-open-toggle-label" title="Centang jika pekerjaan belum selesai">
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
                      title={isStillOpen ? "Pekerjaan masih berlangsung" : `Waktu selesai (${timelineConfig.completionLabel})`}
                    />
                  </div>
                </div>
              ) : (
                <div className="[display:grid]! [grid-template-columns:1fr_1.35fr]! [gap:12px]! max-[640px]:[grid-template-columns:1fr]!">
                  <label>
                    <div className="ticket-field-label-wrapper">
                      <span className="ticket-field-label">
                        <Clock size={12} className="ticket-field-icon" />
                        {timelineConfig.firstLabel} <span className="ticket-required-star">*</span>
                      </span>
                    </div>
                    <TimePicker
                      value={requestTime}
                      onChange={(val) => {
                        setRequestTime(val);
                        if (error) setError("");
                      }}
                      placeholder="00:00"
                      title={timelineConfig.firstHint}
                    />
                  </label>

                  <div className="ticket-field-stack">
                    <div className="ticket-field-label-wrapper">
                      <span className="ticket-field-label">
                        <CheckCircle2 size={12} className="ticket-field-icon" />
                        {timelineConfig.completionLabel}
                      </span>
                      <label className="still-open-toggle-label" title="Centang jika pekerjaan belum selesai">
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
                      title={isStillOpen ? "Pekerjaan masih berlangsung" : `Waktu selesai (${timelineConfig.completionLabel})`}
                    />
                  </div>
                </div>
              )}
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
        <button className="button button-primary" onClick={submit} type="button" disabled={saving}>
          <Check size={14} className="[display:inline-block]! [vertical-align:middle]! [margin-right:4px]!" /> Buat Ticket
        </button>
      </div>
    </Modal>
  );
}
