"use client";

import { X, PlusCircle, MessageSquare, Headphones, CheckCircle2, Edit3, Clock, Tag, Zap } from "lucide-react";
import { Badge } from "@/app/components/ui/Badge";
import { Avatar } from "@/app/components/ui/Avatar";
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

export type ActivityTypeLabel = "Tiket Dibuat" | "User Request" | "Kita Merespon" | "Tiket Closed" | "Tiket Open";

export interface ActivityTypeConfig {
  label: ActivityTypeLabel;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties; className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
}

export function getActivityConfig(type?: string, action?: string, ticketStatus?: string): ActivityTypeConfig {
  const normType = (type || "").toLowerCase().trim();
  const text = (action || "").toLowerCase();
  const normStatus = (ticketStatus || "").toLowerCase();

  // Helper: determine if activity or ticket context represents a Closed resolution
  const isClosingAction =
    text.includes("tutup") ||
    text.includes("closed") ||
    text.includes("selesai") ||
    text.includes("ditutup") ||
    text.includes("resolved") ||
    normType === "closed" ||
    normType === "tiket closed";

  const isOpeningAction =
    text.includes("dibuka kembali") ||
    text.includes("re-open") ||
    text.includes("reopened") ||
    text.includes("masih open") ||
    normType === "open" ||
    normType === "tiket open" ||
    normType === "re-open";

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
    if (isClosingAction || (!isOpeningAction && normStatus === "closed")) {
      return {
        label: "Tiket Closed",
        icon: CheckCircle2,
        color: "var(--purple)",
        bgColor: "var(--purple-soft)",
        borderColor: "var(--purple-border)",
      };
    }
    return {
      label: "Tiket Open",
      icon: Clock,
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

  if (isClosingAction || normStatus === "closed") {
    return {
      label: "Tiket Closed",
      icon: CheckCircle2,
      color: "var(--purple)",
      bgColor: "var(--purple-soft)",
      borderColor: "var(--purple-border)",
    };
  }

  if (isOpeningAction) {
    return {
      label: "Tiket Open",
      icon: Clock,
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
              <div className="[display:flex]! [gap:8px]! [align-items:center]! [margin-bottom:8px]! [flex-wrap:wrap]!">
                <Badge tone={sevTone}>Severity {ticket.severity}</Badge>
                <Badge tone={statusTone(ticket.status)}>{ticket.status}</Badge>
                {categoryDisplay && (
                  <Badge tone="neutral">
                    <Tag size={10} className="[margin-right:4px]! [vertical-align:middle]!" />
                    {categoryDisplay}
                  </Badge>
                )}
              </div>
              <h2 className="[font-size:18px]! [font-weight:700]! [margin:0]! [color:var(--ink-primary)]!">
                {ticket.subject}
              </h2>
              <span className="[font-size:11px]! [color:var(--ink-muted)]! [font-family:var(--font-mono)]!">
                ID Ticket: #{ticket.id} · Dibuat pukul {ticket.created}
              </span>
            </div>
            <ModalCloseButton onClose={onClose} label="Tutup panel" />
          </div>

          <div className="drawer-content-inner">
            {/* Proyek, Kategori & Penanggung Jawab */}
            <div className="drawer-meta-section [margin-bottom:20px]!">
              <span className="drawer-section-title">
                Proyek &amp; Penanggung Jawab
              </span>

              <div className="[display:flex]! [flex-direction:column]! [gap:12px]! [margin-top:10px]!">
                {/* Project & Category Row */}
                <div className="[display:flex]! [align-items:center]! [gap:16px]! [flex-wrap:wrap]!">
                  <div className="[display:flex]! [align-items:center]! [gap:10px]!">
                    <ProjectMark name={ticket.project} />
                    <div>
                      <strong className="[display:block]! [font-size:13px]! [color:var(--ink-primary)]!">
                        {ticket.project}
                      </strong>
                      <span className="[font-size:11px]! [color:var(--ink-muted)]!">
                        Proyek / Sistem
                      </span>
                    </div>
                  </div>

                  {categoryDisplay && (
                    <div className="[display:flex]! [align-items:center]! [gap:8px]! [padding-left:16px]! [border-left:1px_solid_var(--line,_rgba(255,_255,_255,_0.08))]!">
                      <div>
                        <strong className="[display:flex]! [align-items:center]! [gap:5px]! [font-size:13px]! [color:var(--ink-primary)]!">
                          <Tag size={12} className="[color:var(--accent-blue)]!" />
                          {categoryDisplay}
                        </strong>
                        <span className="[font-size:11px]! [color:var(--ink-muted)]!">
                          Kategori Tiket
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Assignees (All Owners / PIC) */}
                <div className="[margin-top:2px]!">
                  <span className="[font-size:11px]! [color:var(--ink-muted)]! [display:block]! [margin-bottom:6px]! [font-weight:500]!">
                    Pemilik Tiket ({ownersList.length > 1 ? `${ownersList.length} PIC` : "PIC"}):
                  </span>
                  <div className="drawer-owners-list">
                    {ownersList.map((ownerName, idx) => (
                      <div key={idx} className="drawer-owner-entry">
                        <Avatar size="sm" name={ownerName} className="mini-avatar" />
                        <span className="drawer-owner-name">{ownerName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline Permintaan Ad-hoc (Explicit Time Fields captured at creation) */}
            {hasAdhocTimeline && (
              <div className="drawer-adhoc-timeline [margin-bottom:22px]!">
                <div className="drawer-adhoc-header">
                  <span className="drawer-adhoc-badge">
                    <Zap size={11} className="[display:inline-block]! [vertical-align:middle]! [margin-right:4px]!" />
                    TIMELINE PERMINTAAN AD-HOC
                  </span>
                  <small className="[color:var(--ink-muted)]! [font-size:11px]!">
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

            <div className="[margin-bottom:24px]!">
              <span className="drawer-section-title">
                Deskripsi / Catatan Operasional
              </span>
              <p className="[margin:8px_0_0]! [color:var(--ink-secondary)]! [font-size:13px]! [line-height:1.5]!">
                {ticket.description || "Item aktivitas operasional yang memerlukan pemeriksaan dan konfirmasi rutin."}
              </p>
            </div>

            <div>
              <span className="[font-size:11px]! [font-weight:700]! [color:var(--ink-muted)]! [font-family:var(--font-mono)]! [text-transform:uppercase]! [letter-spacing:0.5px]!">
                Riwayat aktivitas
              </span>
              <div className="[margin-top:12px]! [display:flex]! [flex-direction:column]! [gap:8px]!">
                {ticket.history?.length ? (
                  ticket.history.map((entry, index) => {
                    const config = getActivityConfig(entry.type, entry.action, ticket.status);
                    const IconComponent = config.icon;

                    return (
                      <div
                        key={index}
                        className="ticket-activity-entry [display:flex]! [align-items:center]! [justify-content:space-between]! [gap:10px]! [font-size:12px]! [padding:8px_12px]! [background:rgba(255,_255,_255,_0.025)]! [border:1px_solid_var(--line)]! [border-radius:7px]!"
                      >
                        {/* Time & Activity Badge */}
                        <div className="[display:flex]! [align-items:center]! [gap:10px]!">
                          <span className="[color:var(--ink-muted)]! [font-family:var(--font-mono)]! [font-weight:600]! [font-size:11px]! [min-width:40px]!">
                            {entry.time}
                          </span>

                          <span
                            className="activity-type-tag [display:inline-flex]! [align-items:center]! [gap:5px]! [padding:2px_7px]! [border-radius:4px]! [font-size:10.5px]! [font-weight:700]! [font-family:var(--font-mono)]! [line-height:1.3]! [color:var(--activity-tag-color)]! [background-color:var(--activity-tag-background)]! [border:1px_solid_var(--activity-tag-border)]!"
                            style={{
                              "--activity-tag-color": config.color,
                              "--activity-tag-background": config.bgColor,
                              "--activity-tag-border": config.borderColor,
                            } as React.CSSProperties}
                          >
                            <IconComponent size={11} strokeWidth={2.4} />
                            <span>{config.label}</span>
                          </span>
                        </div>

                        {/* Author */}
                        <span className="[color:var(--ink-muted)]! [font-size:11px]!">
                          oleh <strong className="[color:var(--ink-secondary)]! [font-weight:500]!">{entry.author}</strong>
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="[color:var(--ink-muted)]! [font-size:12px]!">
                    Belum ada riwayat aktivitas yang tercatat.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="drawer-footer">
            <button
              type="button"
              className="button button-secondary [display:inline-flex]! [align-items:center]! [gap:6px]!"
              onClick={() => setEditModalOpen(true)}
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
