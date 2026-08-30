"use client";

import { Badge } from "@/app/components/ui/Badge";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { ProjectMark } from "@/app/components/ui/ProjectMark";
import { useToast } from "@/app/components/ui/Toast";
import { statusTone } from "@/app/components/tickets/TicketTable";
import { useState } from "react";
import { nowClockLabel } from "@/app/lib/data";
import type { Ticket } from "@/app/lib/types";

interface TicketDetailDrawerProps {
  ticket: Ticket | null;
  onClose: () => void;
  onUpdate: (ticket: Ticket) => void;
}

export function TicketDetailDrawer({ ticket, onClose, onUpdate }: TicketDetailDrawerProps) {
  const notify = useToast();
  const [confirmClose, setConfirmClose] = useState(false);

  if (!ticket) return null;

  const escalate = () => {
    onUpdate({
      ...ticket,
      history: [
        ...(ticket.history ?? []),
        { time: nowClockLabel(), action: "Dieskalasikan ke Lead Operator", author: "Galih Khairi" },
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
        { time: nowClockLabel(), action: "Ticket ditandai selesai dan ditutup", author: "Galih Khairi" },
      ],
    });
    notify.success(`Ticket #${ticket.id} ditandai selesai.`, { id: `ticket-${ticket.id}` });
    onClose();
  };

  const severityTone = ticket.severity === "Kritis" || ticket.severity === "Tinggi" ? "critical" : ticket.severity === "Sedang" ? "warning" : "info";

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
                <Badge tone={severityTone}>Prioritas {ticket.severity}</Badge>
                <Badge tone={statusTone(ticket.status)}>{ticket.status}</Badge>
                {ticket.category && ticket.category !== "--" && (
                  <Badge tone="neutral">{ticket.category}</Badge>
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
            <button
              onClick={onClose}
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "6px",
                background: "rgba(127, 127, 127, 0.08)",
                color: "var(--ink-muted)",
                fontSize: "18px",
              }}
            >
              ×
            </button>
          </div>

          <div className="drawer-content-inner">
            <div style={{ marginBottom: "20px" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "var(--ink-muted)",
                  fontFamily: "var(--font-mono)",
                  textTransform: "uppercase",
                }}
              >
                Proyek &amp; penanggung jawab
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "8px" }}>
                <ProjectMark name={ticket.project} />
                <div>
                  <strong style={{ display: "block", fontSize: "13px", color: "var(--ink-primary)" }}>
                    {ticket.project}
                  </strong>
                  <span style={{ fontSize: "11px", color: "var(--ink-secondary)" }}>
                    Ditugaskan kepada {ticket.owner}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "var(--ink-muted)",
                  fontFamily: "var(--font-mono)",
                  textTransform: "uppercase",
                }}
              >
                Deskripsi
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
                }}
              >
                Riwayat aktivitas
              </span>
              <div style={{ marginTop: "12px", display: "grid", gap: "12px" }}>
                {ticket.history?.length ? (
                  ticket.history.map((entry, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        gap: "10px",
                        fontSize: "12px",
                        padding: "10px",
                        background: "rgba(127, 127, 127, 0.05)",
                        border: "1px solid var(--line)",
                        borderRadius: "8px",
                      }}
                    >
                      <span style={{ color: "var(--accent-blue)", fontFamily: "var(--font-mono)", fontWeight: "600" }}>
                        {entry.time}
                      </span>
                      <div style={{ flex: 1 }}>
                        <strong style={{ display: "block", color: "var(--ink-primary)" }}>{entry.action}</strong>
                        <span style={{ color: "var(--ink-muted)", fontSize: "11px" }}>oleh {entry.author}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ color: "var(--ink-muted)", fontSize: "12px" }}>
                    Belum ada riwayat aktivitas yang tercatat.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="drawer-footer">
            <button className="button button-secondary" onClick={escalate}>
              Eskalasi
            </button>
            <button
              className="button button-primary"
              onClick={() => {
                if (ticket.status === "Ditutup" || ticket.status === "Closed") {
                  notify.info(`Ticket #${ticket.id} sudah ditutup sebelumnya.`, { id: `ticket-${ticket.id}` });
                  onClose();
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
    </>
  );
}
