"use client";

import { useState } from "react";
import { ArrowRightLeft, Check, X, Clock, AlertCircle, Calendar, RefreshCw } from "lucide-react";
import { Modal } from "@/app/components/ui/Modal";
import { ModalCloseButton } from "@/app/components/ui/ModalCloseButton";
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
  const [targetShift, setTargetShift] = useState("Shift Pagi (08:00–16:30)");
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
          <strong className="[display:flex]! [align-items:center]! [gap:8px]!">
            <ArrowRightLeft size={18} className="[color:var(--accent-blue)]" />
            Shift Swap &amp; Schedule Requests
          </strong>
          <small>Kelola dan setujui pertukaran jadwal shift antar operator</small>
        </div>
        <ModalCloseButton onClose={onClose} />
      </div>

      <div className="swap-modal-body [max-height:70vh]! [overflow-y:auto]! [padding:10px_0]!">
        {!showNewForm ? (
          <div className="[margin-bottom:16px]! [display:flex]! [justify-content:space-between]! [align-items:center]!">
            <span className="[font-size:12px]! [color:var(--ink-secondary)]!">
              {requests.filter((r) => r.status === "Pending").length} permintaan menunggu persetujuan
            </span>
            <button
              className="button button-primary [font-size:12px]! [padding:6px_12px]!"
              onClick={() => setShowNewForm(true)}
            >
              ＋ Buat Permintaan Tukar Shift
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreateRequest} className="swap-create-form [margin-bottom:20px]! [padding:16px]! [background:var(--panel-bg)]! [border:1px_solid_var(--panel-border)]! [border-radius:10px]!">
            <div className="[display:flex]! [justify-content:space-between]! [align-items:center]! [margin-bottom:12px]!">
              <strong className="[font-size:13px]! [color:var(--ink-primary)]!">Formulir Tukar Shift Baru</strong>
              <button
                type="button"
                className="button button-secondary [font-size:11px]! [padding:3px_8px]!"
                onClick={() => setShowNewForm(false)}
              >
                Batal
              </button>
            </div>

            <div className="two-inputs [margin-bottom:10px]!">
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

            <div className="two-inputs [margin-bottom:10px]!">
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
                  <option value="Shift Subuh (00:00–08:30)">Shift Subuh (00:00–08:30)</option>
                  <option value="Shift Pagi (08:00–16:30)">Shift Pagi (08:00–16:30)</option>
                  <option value="Shift Malam (16:00–00:30)">Shift Malam (16:00–00:30)</option>
                </select>
              </label>
            </div>

            <label className="[display:grid]! [gap:4px]! [margin-bottom:14px]!">
              <span>Alasan Pertukaran Shift</span>
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Tuliskan alasan penyesuaian jadwal atau keperluan mendesak..."
                required
              />
            </label>

            <div className="[display:flex]! [justify-content:flex-end]! [gap:8px]!">
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
        <div className="swap-requests-list [display:grid]! [gap:10px]!">
          {requests.map((req) => {
            const isPending = req.status === "Pending";
            const isApproved = req.status === "Approved";
            const isRejected = req.status === "Rejected";

            return (
              <div
                key={req.id}
                className="swap-request-card [padding:14px_16px]! [border-radius:9px]! [display:grid]! [gap:10px]! [background:var(--swap-request-card-bg)]! [border:var(--swap-request-card-border)]!"
                style={{
                  "--swap-request-card-bg": isApproved
                    ? "var(--green-soft)"
                    : isRejected
                    ? "var(--red-soft)"
                    : "var(--panel-bg)",
                  "--swap-request-card-border": `1px solid ${
                    isApproved
                      ? "var(--green-border)"
                      : isRejected
                      ? "var(--red-border)"
                      : "var(--panel-border)"
                  }`,
                } as React.CSSProperties}
              >
                <div className="[display:flex]! [justify-content:space-between]! [align-items:flex-start]! [gap:12px]!">
                  <div>
                    <div className="[display:flex]! [align-items:center]! [gap:8px]! [margin-bottom:4px]!">
                      <strong className="[font-size:13px]! [color:var(--ink-primary)]!">{req.requesterName}</strong>
                      <span className="[color:var(--accent-blue)]! [font-size:11px]! [font-weight:700]!">⇄</span>
                      <strong className="[font-size:13px]! [color:var(--ink-primary)]!">{req.targetMemberName}</strong>
                      <Badge tone={isApproved ? "success" : isRejected ? "critical" : "warning"}>
                        {req.status}
                      </Badge>
                    </div>
                    <div className="[font-size:11.5px]! [color:var(--ink-secondary)]! [display:flex]! [gap:12px]! [flex-wrap:wrap]! [align-items:center]!">
                      <span className="[display:inline-flex]! [align-items:center]! [gap:4px]!">
                        <Calendar size={12} className="[color:var(--accent-blue)]" /> <strong>{req.requestedDate}</strong>
                      </span>
                      <span className="[display:inline-flex]! [align-items:center]! [gap:4px]!">
                        <RefreshCw size={11} className="[color:var(--orange)]" /> Target: <strong>{req.targetShift}</strong>
                      </span>
                      <span className="[color:var(--ink-muted)]! [display:inline-flex]! [align-items:center]! [gap:4px]!">
                        <Clock size={12} /> {req.createdAt}
                      </span>
                    </div>
                  </div>

                  {/* Approve / Reject Buttons (Reusing OK/NOK aesthetic with toggle/undo) */}
                  <div className="[display:flex]! [gap:6px]! [flex-shrink:0]!">
                    {isPending ? (
                      <>
                        <button
                          className="assess-btn assess-ok [min-height:28px]! [padding:4px_10px]! [font-size:11px]!"
                          onClick={() => handleStatusChange(req.id, "Approved")}
                          title="Setujui pertukaran shift ini"
                        >
                          <Check size={13} strokeWidth={2.5} className="assess-btn-icon" />
                          <span className="assess-btn-text">Approve</span>
                        </button>
                        <button
                          className="assess-btn assess-fail [min-height:28px]! [padding:4px_10px]! [font-size:11px]!"
                          onClick={() => handleStatusChange(req.id, "Rejected")}
                          title="Tolak pertukaran shift ini"
                        >
                          <X size={13} strokeWidth={2.5} className="assess-btn-icon" />
                          <span className="assess-btn-text">Reject</span>
                        </button>
                      </>
                    ) : (
                      <button
                        className="button button-secondary [font-size:10.5px]! [padding:4px_8px]!"
                        onClick={() => handleResetStatus(req.id)}
                        title="Klik untuk membatalkan dan mereset status kembali ke Pending (Undo)"
                      >
                        ↺ Undo to Pending
                      </button>
                    )}
                  </div>
                </div>

                <div className="[font-size:11px]! [color:var(--ink-secondary)]! [background:rgba(127,_127,_127,_0.05)]! [padding:8px_10px]! [border-radius:6px]! [border:1px_solid_var(--line)]!">
                  <span className="[font-weight:600]! [color:var(--ink-primary)]!">Alasan: </span>
                  {req.reason}
                </div>
              </div>
            );
          })}

          {requests.length === 0 && (
            <div className="[text-align:center]! [padding:28px_16px]! [color:var(--ink-muted)]! [font-size:12px]!">
              <AlertCircle size={28} className="[margin:0_auto_8px]! [display:block]!" />
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
