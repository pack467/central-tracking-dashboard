"use client";

import { useState } from "react";
import { ArrowRightLeft, Check, X, Clock, AlertCircle } from "lucide-react";
import { Modal } from "@/app/components/ui/Modal";
import { Badge } from "@/app/components/ui/Badge";
import { useToast } from "@/app/components/ui/Toast";
import type { RosterMember, ShiftSwapRequest } from "@/app/lib/types";

interface ShiftSwapModalProps {
  open: boolean;
  onClose: () => void;
  requests: ShiftSwapRequest[];
  members: RosterMember[];
  onUpdateRequest: (updated: ShiftSwapRequest[]) => void;
  preselectedMember?: RosterMember | null;
}

export function ShiftSwapModal({
  open,
  onClose,
  requests,
  members,
  onUpdateRequest,
  preselectedMember,
}: ShiftSwapModalProps) {
  const notify = useToast();
  const [showNewForm, setShowNewForm] = useState(false);

  // Form states
  const [requesterId, setRequesterId] = useState(preselectedMember?.id ?? members[0]?.id ?? "");
  const [targetId, setTargetId] = useState(members[1]?.id ?? "");
  const [targetDate, setTargetDate] = useState("29 Aug 2026");
  const [targetShift, setTargetShift] = useState("Shift Pagi (07:00–15:59)");
  const [reason, setReason] = useState("");

  const handleStatusChange = (requestId: string, newStatus: "Approved" | "Rejected") => {
    const prevRequests = [...requests];
    const updated = requests.map((r) => (r.id === requestId ? { ...r, status: newStatus } : r));
    onUpdateRequest(updated);

    const isApprove = newStatus === "Approved";
    const toastFn = isApprove ? notify.success : notify.warning;
    const label = isApprove ? "Disetujui" : "Ditolak";

    toastFn(`Permintaan tukar shift telah ${label}.`, {
      id: `swap-${requestId}`,
      duration: 6500,
      action: {
        label: "Undo",
        onClick: () => {
          onUpdateRequest(prevRequests);
          notify.info("Perubahan status tukar shift dibatalkan (Undo).", { id: `swap-${requestId}` });
        },
      },
    });
  };

  const handleResetStatus = (requestId: string) => {
    const prevRequests = [...requests];
    const updated = requests.map((r) => (r.id === requestId ? { ...r, status: "Pending" as const } : r));
    onUpdateRequest(updated);

    notify.info("Status permintaan dikembalikan ke Pending.", {
      id: `swap-${requestId}`,
      duration: 6500,
      action: {
        label: "Undo",
        onClick: () => onUpdateRequest(prevRequests),
      },
    });
  };

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const reqMember = members.find((m) => m.id === requesterId);
    const tarMember = members.find((m) => m.id === targetId);

    if (!reqMember || !tarMember) return;

    const newReq: ShiftSwapRequest = {
      id: `swap-${Date.now()}`,
      requesterId: reqMember.id,
      requesterName: reqMember.name,
      targetMemberId: tarMember.id,
      targetMemberName: tarMember.name,
      requestedDate: targetDate,
      currentShift: reqMember.currentShift,
      targetShift: targetShift,
      reason: reason.trim() || "Penyesuaian jadwal dinas shift.",
      status: "Pending",
      createdAt: "Hari ini",
    };

    onUpdateRequest([newReq, ...requests]);
    notify.success(`Permintaan tukar shift diajukan untuk ${tarMember.name}.`, { id: "swap-new" });
    setShowNewForm(false);
    setReason("");
  };

  return (
    <Modal open={open} onClose={onClose} label="Shift Swap & Scheduling Requests" width={680}>
      <div className="modal-title">
        <div>
          <strong style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ArrowRightLeft size={18} style={{ color: "var(--accent-blue)" }} />
            Shift Swap &amp; Schedule Requests
          </strong>
          <small>Kelola dan setujui pertukaran jadwal shift antar operator</small>
        </div>
        <button onClick={onClose} aria-label="Tutup">
          ×
        </button>
      </div>

      <div className="swap-modal-body" style={{ maxHeight: "70vh", overflowY: "auto", padding: "10px 0" }}>
        {!showNewForm ? (
          <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "var(--ink-secondary)" }}>
              {requests.filter((r) => r.status === "Pending").length} permintaan menunggu persetujuan
            </span>
            <button
              className="button button-primary"
              style={{ fontSize: "12px", padding: "6px 12px" }}
              onClick={() => setShowNewForm(true)}
            >
              ＋ Buat Permintaan Tukar Shift
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreateRequest} className="swap-create-form" style={{ marginBottom: "20px", padding: "16px", background: "var(--panel-bg)", border: "1px solid var(--panel-border)", borderRadius: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <strong style={{ fontSize: "13px", color: "var(--ink-primary)" }}>Formulir Tukar Shift Baru</strong>
              <button
                type="button"
                className="button button-secondary"
                style={{ fontSize: "11px", padding: "3px 8px" }}
                onClick={() => setShowNewForm(false)}
              >
                Batal
              </button>
            </div>

            <div className="two-inputs" style={{ marginBottom: "10px" }}>
              <label>
                <span>Pemohon (Requester)</span>
                <select
                  value={requesterId}
                  onChange={(e) => setRequesterId(e.target.value)}
                  required
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Tukar Dengan (Target Member)</span>
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  required
                >
                  {members.filter((m) => m.id !== requesterId).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="two-inputs" style={{ marginBottom: "10px" }}>
              <label>
                <span>Tanggal Pertukaran</span>
                <input
                  type="text"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  placeholder="Contoh: 29 Aug 2026"
                  required
                />
              </label>

              <label>
                <span>Shift Target yang Diminta</span>
                <select
                  value={targetShift}
                  onChange={(e) => setTargetShift(e.target.value)}
                >
                  <option value="Shift Pagi (07:00–15:59)">Shift Pagi (07:00–15:59)</option>
                  <option value="Shift Sore (13:00–22:59)">Shift Sore (13:00–22:59)</option>
                  <option value="Shift Malam (23:00–06:59)">Shift Malam (23:00–06:59)</option>
                </select>
              </label>
            </div>

            <label style={{ display: "grid", gap: "4px", marginBottom: "14px" }}>
              <span>Alasan Pertukaran Shift</span>
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Tuliskan alasan penyesuaian jadwal atau keperluan mendesak..."
                required
              />
            </label>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button type="button" className="button button-secondary" onClick={() => setShowNewForm(false)}>
                Cancel
              </button>
              <button type="submit" className="button button-primary">
                ✓ Kirim Permintaan
              </button>
            </div>
          </form>
        )}

        {/* List of Requests */}
        <div className="swap-requests-list" style={{ display: "grid", gap: "10px" }}>
          {requests.map((req) => {
            const isPending = req.status === "Pending";
            const isApproved = req.status === "Approved";
            const isRejected = req.status === "Rejected";

            return (
              <div
                key={req.id}
                className="swap-request-card"
                style={{
                  padding: "14px 16px",
                  borderRadius: "9px",
                  background: isApproved
                    ? "var(--green-soft)"
                    : isRejected
                    ? "var(--red-soft)"
                    : "var(--panel-bg)",
                  border: `1px solid ${
                    isApproved
                      ? "var(--green-border)"
                      : isRejected
                      ? "var(--red-border)"
                      : "var(--panel-border)"
                  }`,
                  display: "grid",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <strong style={{ fontSize: "13px", color: "var(--ink-primary)" }}>{req.requesterName}</strong>
                      <span style={{ color: "var(--accent-blue)", fontSize: "11px", fontWeight: "700" }}>⇄</span>
                      <strong style={{ fontSize: "13px", color: "var(--ink-primary)" }}>{req.targetMemberName}</strong>
                      <Badge tone={isApproved ? "success" : isRejected ? "critical" : "warning"}>
                        {req.status}
                      </Badge>
                    </div>
                    <div style={{ fontSize: "11.5px", color: "var(--ink-secondary)", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <span>📅 <strong>{req.requestedDate}</strong></span>
                      <span>🔄 Target: <strong>{req.targetShift}</strong></span>
                      <span style={{ color: "var(--ink-muted)" }}><Clock size={12} style={{ display: "inline", verticalAlign: "middle" }} /> {req.createdAt}</span>
                    </div>
                  </div>

                  {/* Approve / Reject Buttons (Reusing OK/NOK aesthetic with toggle/undo) */}
                  <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                    {isPending ? (
                      <>
                        <button
                          className="assess-btn assess-ok"
                          style={{ minHeight: "28px", padding: "4px 10px", fontSize: "11px" }}
                          onClick={() => handleStatusChange(req.id, "Approved")}
                          title="Setujui pertukaran shift ini"
                        >
                          <Check size={13} style={{ display: "inline", verticalAlign: "middle" }} /> Approve
                        </button>
                        <button
                          className="assess-btn assess-fail"
                          style={{ minHeight: "28px", padding: "4px 10px", fontSize: "11px" }}
                          onClick={() => handleStatusChange(req.id, "Rejected")}
                          title="Tolak pertukaran shift ini"
                        >
                          <X size={13} style={{ display: "inline", verticalAlign: "middle" }} /> Reject
                        </button>
                      </>
                    ) : (
                      <button
                        className="button button-secondary"
                        style={{ fontSize: "10.5px", padding: "4px 8px" }}
                        onClick={() => handleResetStatus(req.id)}
                        title="Klik untuk membatalkan dan mereset status kembali ke Pending (Undo)"
                      >
                        ↺ Undo to Pending
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ fontSize: "11px", color: "var(--ink-secondary)", background: "rgba(127, 127, 127, 0.05)", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--line)" }}>
                  <span style={{ fontWeight: "600", color: "var(--ink-primary)" }}>Alasan: </span>
                  {req.reason}
                </div>
              </div>
            );
          })}

          {requests.length === 0 && (
            <div style={{ textAlign: "center", padding: "28px 16px", color: "var(--ink-muted)", fontSize: "12px" }}>
              <AlertCircle size={28} style={{ margin: "0 auto 8px", display: "block" }} />
              Belum ada permintaan tukar shift aktif.
            </div>
          )}
        </div>
      </div>

      <div className="modal-actions">
        <button className="button button-secondary" onClick={onClose}>
          Tutup
        </button>
      </div>
    </Modal>
  );
}
