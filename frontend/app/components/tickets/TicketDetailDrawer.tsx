"use client";

import { X, PlusCircle, MessageSquare, Headphones, CheckCircle2, Edit3, Clock, Tag, Zap } from "lucide-react";
import { Badge } from "@/app/components/ui/Badge";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { ModalCloseButton } from "@/app/components/ui/ModalCloseButton";
import { TicketEditModal } from "@/app/components/tickets/TicketEditModal";
import { ProjectMark } from "@/app/components/ui/ProjectMark";
import { useToast } from "@/app/components/ui/Toast";
import { severityTone, statusTone } from "@/app/components/tickets/TicketTable";
import { useState } from "react";
import { nowClockLabel, initials } from "@/app/lib/data";
import { useAuth } from "@/app/lib/auth";
import type { Ticket } from "@/app/lib/types";

export type ActivityTypeLabel = "Tiket Dibuat" | "User Request" | "Kita Merespon" | "Tiket Closed / Open";

export interface ActivityTypeConfig {
  label: ActivityTypeLabel;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties; className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
}

export function getActivityConfig(type?: string, action?: string): ActivityTypeConfig {
  const normType = (type || "").toLowerCase().trim();
  const text = (action || "").toLowerCase();

  // 1. Explicit type match
  if (normType === "created" || normType === "tiket dibuat" || normType === "ticket dibuat") {
    return {
      label: "Tiket Dibuat",
      icon: PlusCircle,
      color: "var(--accent-blue)",
      bgColor: "var(--accent-blue-soft)",
      borderColor: "var(--accent-blue-border)",
    };
  }

  if (normType === "user_request" || normType === "user request" || normType === "request") {
    return {
      label: "User Request",
      icon: MessageSquare,
      color: "var(--orange)",
      bgColor: "var(--orange-soft)",
      borderColor: "var(--orange-border)",
    };
  }

  if (normType === "response" || normType === "kita merespon" || normType === "respon") {
    return {
      label: "Kita Merespon",
      icon: Headphones,
      color: "var(--green)",
      bgColor: "var(--green-soft)",
      borderColor: "var(--green-border)",
    };
  }

  if (
    normType === "status_change" ||
    normType === "closed" ||
    normType === "open" ||
    normType === "tiket closed" ||
    normType === "tiket open" ||
    normType === "tiket closed / open"
  ) {
    return {
      label: "Tiket Closed / Open",
      icon: CheckCircle2,
      color: "var(--red)",
      bgColor: "var(--red-soft)",
      borderColor: "var(--red-border)",
    };
  }

  // 2. Infer from action text when type is not explicitly provided (legacy or custom actions)
  if (text.includes("dibuat") || text.includes("created") || text.includes("alert trigger")) {
    return {
      label: "Tiket Dibuat",
      icon: PlusCircle,
      color: "var(--accent-blue)",
      bgColor: "var(--accent-blue-soft)",
      borderColor: "var(--accent-blue-border)",
    };
  }

  if (
    text.includes("request") ||
    text.includes("permintaan") ||
    text.includes("user") ||
    text.includes("requester") ||
    text.includes("menanyakan") ||
    text.includes("pemohon")
  ) {
    return {
      label: "User Request",
      icon: MessageSquare,
      color: "var(--orange)",
      bgColor: "var(--orange-soft)",
      borderColor: "var(--orange-border)",
    };
  }

  if (
    text.includes("tutup") ||
    text.includes("closed") ||
    text.includes("selesai") ||
    text.includes("ditutup") ||
    text.includes("dibuka kembali") ||
    text.includes("re-open")
  ) {
    return {
      label: "Tiket Closed / Open",
      icon: CheckCircle2,
      color: "var(--red)",
      bgColor: "var(--red-soft)",
      borderColor: "var(--red-border)",
    };
  }

  // Default fallback for operational responses, progress updates, and escalations
  return {
    label: "Kita Merespon",
    icon: Headphones,
    color: "var(--green)",
    bgColor: "var(--green-soft)",
    borderColor: "var(--green-border)",
  };
}

interface TicketDetailDrawerProps {
  ticket: Ticket | null;
  onClose: () => void;
  onUpdate: (ticket: Ticket) => void;
}

export function TicketDetailDrawer({ ticket, onClose, onUpdate }: TicketDetailDrawerProps) {
  const notify = useToast();
  const { user } = useAuth();
  const operatorName = user?.name || "Operator NOC";
  const [confirmClose, setConfirmClose] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  if (!ticket) return null;

  const escalate = () => {
    onUpdate({
      ...ticket,
      status: "Escalated",
      history: [
        ...(ticket.history ?? []),
        {
          time: nowClockLabel(),
          type: "response",
          action: "Tim merespon: ticket dieskalasikan ke Lead Operator untuk koordinasi eskalasi penanganan L2",
          author: operatorName,
        },
      ],
    });
    notify.info(`Ticket #${ticket.id} dieskalasikan ke Lead Operator.`, { id: `ticket-${ticket.id}` });
    onClose();
  };

  const markDone = () => {
    setConfirmClose(false);
    onUpdate({
      ...ticket,
      status: "Closed",
      history: [
        ...(ticket.history ?? []),
        {
          time: nowClockLabel(),
          type: "status_change",
          action: `Tiket ditutup oleh ${operatorName}`,
          author: operatorName,
        },
      ],
    });
    notify.success(`Ticket #${ticket.id} ditandai selesai.`, { id: `ticket-${ticket.id}` });
    onClose();
  };

  const sevTone = severityTone(ticket.severity);

  const ownersList: string[] =
    ticket.owners && ticket.owners.length > 0
      ? ticket.owners
      : ticket.owner
      ? ticket.owner
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : ["Unassigned"];

  const categoryDisplay =
    ticket.category && ticket.category !== "--"
      ? ticket.category
      : ticket.type && ticket.type !== "--"
      ? ticket.type
      : null;

  const hasAdhocTimeline = Boolean(
    ticket.requestTime || ticket.responseTime || ticket.completionTime || ticket.isStillOpen
  );

  return (
    <>
      <div
        className="drawer-backdrop anim-fade"
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div className="drawer-body anim-slide-left" role="dialog" aria-modal="true" aria-label="Detail ticket">
          <div className="drawer-header">
            <div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px", flexWrap: "wrap" }}>
                <Badge tone={sevTone}>Prioritas {ticket.severity}</Badge>
                <Badge tone={statusTone(ticket.status)}>{ticket.status}</Badge>
                {categoryDisplay && (
                  <Badge tone="neutral">
                    <Tag size={10} style={{ marginRight: "4px", verticalAlign: "middle" }} />
                    {categoryDisplay}
                  </Badge>
                )}
              </div>
              <h2 style={{ fontSize: "18px", fontWeight: "700", margin: "0", color: "var(--ink-primary)" }}>
                {ticket.subject}
              </h2>
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--ink-muted)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                ID Ticket: #{ticket.id} · Dibuat pukul {ticket.created}
              </span>
            </div>
            <ModalCloseButton onClose={onClose} label="Tutup panel" />
          </div>

          <div className="drawer-content-inner">
            {/* Proyek, Kategori & Penanggung Jawab */}
            <div className="drawer-meta-section" style={{ marginBottom: "20px" }}>
              <span className="drawer-section-title">
                Proyek &amp; Penanggung Jawab
              </span>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px" }}>
                {/* Project & Category Row */}
                <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <ProjectMark name={ticket.project} />
                    <div>
                      <strong style={{ display: "block", fontSize: "13px", color: "var(--ink-primary)" }}>
                        {ticket.project}
                      </strong>
                      <span style={{ fontSize: "11px", color: "var(--ink-muted)" }}>
                        Proyek / Sistem
                      </span>
                    </div>
                  </div>

                  {categoryDisplay && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        paddingLeft: "16px",
                        borderLeft: "1px solid var(--line, rgba(255, 255, 255, 0.08))",
                      }}
                    >
                      <div>
                        <strong
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            fontSize: "13px",
                            color: "var(--ink-primary)",
                          }}
                        >
                          <Tag size={12} style={{ color: "var(--accent-blue)" }} />
                          {categoryDisplay}
                        </strong>
                        <span style={{ fontSize: "11px", color: "var(--ink-muted)" }}>
                          Kategori Tiket
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Assignees (All Owners / PIC) */}
                <div style={{ marginTop: "2px" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--ink-muted)",
                      display: "block",
                      marginBottom: "6px",
                      fontWeight: "500",
                    }}
                  >
                    Ditugaskan kepada ({ownersList.length} PIC):
                  </span>
                  <div className="drawer-owners-list">
                    {ownersList.map((ownerName, idx) => (
                      <div key={idx} className="drawer-owner-entry">
                        <span className="mini-avatar" aria-hidden="true">
                          {initials(ownerName)}
                        </span>
                        <span className="drawer-owner-name">{ownerName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline Permintaan Ad-hoc (Explicit Time Fields captured at creation) */}
            {hasAdhocTimeline && (
              <div className="drawer-adhoc-timeline" style={{ marginBottom: "22px" }}>
                <div className="drawer-adhoc-header">
                  <span className="drawer-adhoc-badge">
                    <Zap size={11} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "4px" }} />
                    TIMELINE PERMINTAAN AD-HOC
                  </span>
                  <small style={{ color: "var(--ink-muted)", fontSize: "11px" }}>
                    Waktu masuk, respon, dan penyelesaian operasional
                  </small>
                </div>

                <div className="drawer-adhoc-grid">
                  <div className="drawer-adhoc-cell">
                    <div className="drawer-adhoc-label">
                      <Clock size={11} className="drawer-adhoc-icon" />
                      <span>REQUEST TIME</span>
                    </div>
                    <div className="drawer-adhoc-value">
                      {ticket.requestTime || "—"}
                    </div>
                  </div>

                  <div className="drawer-adhoc-cell">
                    <div className="drawer-adhoc-label">
                      <Clock size={11} className="drawer-adhoc-icon" />
                      <span>RESPONSE TIME</span>
                    </div>
                    <div className="drawer-adhoc-value">
                      {ticket.responseTime || "—"}
                    </div>
                  </div>

                  <div className="drawer-adhoc-cell">
                    <div className="drawer-adhoc-label">
                      <CheckCircle2 size={11} className="drawer-adhoc-icon" />
                      <span>COMPLETION TIME</span>
                    </div>
                    <div className="drawer-adhoc-value">
                      {ticket.isStillOpen ? (
                        <span className="drawer-adhoc-still-open">
                          <span className="drawer-adhoc-pulse-dot" />
                          Masih berlangsung
                        </span>
                      ) : ticket.completionTime ? (
                        ticket.completionTime
                      ) : ticket.status === "Closed" ? (
                        "Selesai"
                      ) : (
                        <span className="drawer-adhoc-still-open">
                          <span className="drawer-adhoc-pulse-dot" />
                          Masih berlangsung
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginBottom: "24px" }}>
              <span className="drawer-section-title">
                Deskripsi / Catatan Operasional
              </span>
              <p style={{ margin: "8px 0 0", color: "var(--ink-secondary)", fontSize: "13px", lineHeight: 1.5 }}>
                {ticket.description || "Item aktivitas operasional yang memerlukan pemeriksaan dan konfirmasi rutin."}
              </p>
            </div>

            <div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "var(--ink-muted)",
                  fontFamily: "var(--font-mono)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Riwayat aktivitas
              </span>
              <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {ticket.history?.length ? (
                  ticket.history.map((entry, index) => {
                    const config = getActivityConfig(entry.type, entry.action);
                    const IconComponent = config.icon;

                    return (
                      <div
                        key={index}
                        className="ticket-activity-entry"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "10px",
                          fontSize: "12px",
                          padding: "8px 12px",
                          background: "rgba(255, 255, 255, 0.025)",
                          border: "1px solid var(--line)",
                          borderRadius: "7px",
                        }}
                      >
                        {/* Time & Activity Badge */}
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span
                            style={{
                              color: "var(--ink-muted)",
                              fontFamily: "var(--font-mono)",
                              fontWeight: "600",
                              fontSize: "11px",
                              minWidth: "40px",
                            }}
                          >
                            {entry.time}
                          </span>

                          <span
                            className="activity-type-tag"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "2px 7px",
                              borderRadius: "4px",
                              fontSize: "10.5px",
                              fontWeight: "700",
                              fontFamily: "var(--font-mono)",
                              color: config.color,
                              backgroundColor: config.bgColor,
                              border: `1px solid ${config.borderColor}`,
                              lineHeight: "1.3",
                            }}
                          >
                            <IconComponent size={11} strokeWidth={2.4} />
                            <span>{config.label}</span>
                          </span>
                        </div>

                        {/* Author */}
                        <span style={{ color: "var(--ink-muted)", fontSize: "11px" }}>
                          oleh <strong style={{ color: "var(--ink-secondary)", fontWeight: "500" }}>{entry.author}</strong>
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ color: "var(--ink-muted)", fontSize: "12px" }}>
                    Belum ada riwayat aktivitas yang tercatat.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="drawer-footer">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setEditModalOpen(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Edit3 size={13} />
              <span>Edit Ticket</span>
            </button>
            <button type="button" className="button button-secondary" onClick={escalate}>
              Eskalasi
            </button>
            <button
              type="button"
              className="button button-primary"
              onClick={() => {
                if (ticket.status === "Ditutup" || ticket.status === "Closed") {
                  notify.info(`Ticket #${ticket.id} sudah ditutup sebelumnya.`, { id: `ticket-${ticket.id}` });
                  return;
                }
                setConfirmClose(true);
              }}
            >
              Close Ticket
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmClose}
        danger
        title={`Tutup ticket #${ticket.id}?`}
        message="Ticket akan ditandai Ditutup dan masuk ke riwayat aktivitas hari ini."
        confirmLabel="Ya, tutup ticket"
        onCancel={() => setConfirmClose(false)}
        onConfirm={markDone}
      />

      <TicketEditModal
        open={editModalOpen}
        ticket={ticket}
        onClose={() => setEditModalOpen(false)}
        onSave={(updated) => onUpdate(updated)}
      />
    </>
  );
}
