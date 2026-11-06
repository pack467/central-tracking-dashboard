"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowRight, ArrowRightLeft, CalendarDays, Check, Inbox, Plus, RotateCcw, X } from "lucide-react";
import { Select } from "@/app/components/ui/Select";
import { Avatar } from "@/app/components/ui/Avatar";
import { useToast } from "@/app/components/ui/Toast";
import type { RosterMember, ShiftSwapRequest } from "@/app/lib/types";

interface ShiftSwapModalProps {
  open: boolean;
  onClose: () => void;
  requests: ShiftSwapRequest[];
  members: RosterMember[];
  onUpdateRequest: (updated: ShiftSwapRequest[]) => void;
  /** Opening from a member jumps straight to the form with that member as requester. */
  preselectedMember?: RosterMember | null;
}

type Status = ShiftSwapRequest["status"];
type Filter = "Pending" | "Done" | "All";

const STATUS_META: Record<Status, { label: string; className: string }> = {
  Pending: { label: "Menunggu", className: "border-[#fbbf24]/35 bg-[#33270b] text-[#fcd34d]" },
  Approved: { label: "Disetujui", className: "border-[#4ade80]/35 bg-[#0f2e1d] text-[#86efac]" },
  Rejected: { label: "Ditolak", className: "border-[#f87171]/35 bg-[#3a1a1f] text-[#fca5a5]" },
};

const SHIFT_OPTIONS = [
  { value: "Shift Subuh (00:00–08:30)", label: "Subuh", hours: "00:00–08:30", dot: "bg-[#38bdf8]" },
  { value: "Shift Pagi (08:00–16:30)", label: "Pagi", hours: "08:00–16:30", dot: "bg-[#fbbf24]" },
  { value: "Shift Malam (16:00–00:30)", label: "Malam", hours: "16:00–00:30", dot: "bg-[#c084fc]" },
];

const fieldLabel = "mb-1.5 block text-[11.5px] font-semibold text-[#cbd5e1]";
const inputClass =
  "w-full rounded-[8px] border border-[#334155] bg-[#0f172a] px-3 text-[12.5px] text-[#f8fafc] outline-none transition-colors placeholder:text-[#64748b] focus:border-[#38bdf8] [color-scheme:dark]";
const ghostButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#334155] bg-[#0f172a] px-3.5 text-[12px] font-semibold text-[#f8fafc] transition-colors hover:bg-[#243044] cursor-pointer";
const primaryButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#0284c7] px-4 text-[12px] font-bold text-white transition-colors hover:bg-[#0369a1] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
}

function PersonLine({ name, role, caption }: { name: string; role?: string; caption: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar size="sm" name={name} />
      <div className="min-w-0">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.4px] text-[#64748b]">{caption}</span>
        <strong className="block truncate text-[12.5px] font-semibold text-[#f8fafc]">{name}</strong>
        {role && <span className="block truncate text-[11px] text-[#94a3b8]">{role}</span>}
      </div>
    </div>
  );
}

export function ShiftSwapModal({ open, onClose, requests, members, onUpdateRequest, preselectedMember }: ShiftSwapModalProps) {
  const notify = useToast();
  const panelRef = useRef<HTMLElement>(null);
  const [showForm, setShowForm] = useState(Boolean(preselectedMember));
  const [filter, setFilter] = useState<Filter>("Pending");

  // Form state
  const [requesterId, setRequesterId] = useState(preselectedMember?.id ?? members[0]?.id ?? "");
  const [targetChoice, setTargetChoice] = useState("");
  const [date, setDate] = useState("2026-08-29");
  const [targetShift, setTargetShift] = useState(SHIFT_OPTIONS[1].value);
  const [reason, setReason] = useState("");
  const others = members.filter((m) => m.id !== requesterId);
  const targetId = others.some((m) => m.id === targetChoice) ? targetChoice : others[0]?.id ?? "";
  const requester = members.find((m) => m.id === requesterId);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const memberRole = (id: string) => members.find((m) => m.id === id)?.role;
  const pendingCount = requests.filter((r) => r.status === "Pending").length;
  const doneCount = requests.length - pendingCount;
  const visible = requests.filter((r) => (filter === "All" ? true : filter === "Pending" ? r.status === "Pending" : r.status !== "Pending"));

  const setStatus = (requestId: string, status: Status) => {
    const previous = [...requests];
    onUpdateRequest(requests.map((r) => (r.id === requestId ? { ...r, status } : r)));
    const message =
      status === "Approved" ? "Permintaan tukar shift disetujui." : status === "Rejected" ? "Permintaan tukar shift ditolak." : "Keputusan dibatalkan, permintaan kembali menunggu.";
    (status === "Rejected" ? notify.warning : status === "Approved" ? notify.success : notify.info)(message, {
      id: `swap-${requestId}`,
      duration: 6500,
      action: { label: "Urungkan", onClick: () => onUpdateRequest(previous) },
    });
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const target = members.find((m) => m.id === targetId);
    if (!requester || !target || !date || !reason.trim()) return;
    const created: ShiftSwapRequest = {
      id: `swap-${Date.now()}`,
      requesterId: requester.id,
      requesterName: requester.name,
      targetMemberId: target.id,
      targetMemberName: target.name,
      requestedDate: formatDate(date),
      currentShift: requester.currentShift,
      targetShift,
      reason: reason.trim(),
      status: "Pending",
      createdAt: "Baru saja",
    };
    onUpdateRequest([created, ...requests]);
    notify.success(`Permintaan tukar shift dengan ${target.name} terkirim.`, { id: "swap-new" });
    setReason("");
    setShowForm(false);
    setFilter("Pending");
  };

  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" tabIndex={-1} aria-label="Tutup" className="absolute inset-0 cursor-default bg-[rgba(2,6,23,0.72)]" onClick={onClose} />

      <section
        ref={panelRef}
        tabIndex={-1}
        data-focus-ring="none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="swap-title"
        className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[16px] border border-[#334155] bg-[#162033] shadow-[0_24px_60px_rgba(0,0,0,0.55)] outline-none sm:max-h-[min(760px,calc(100dvh-32px))] sm:w-[640px] sm:rounded-[14px]"
      >
        {/* Header */}
        <header className="flex items-start gap-3 border-b border-[#334155] bg-[#1e293b] px-4 py-4 sm:px-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-[#0c2a3d] text-[#38bdf8]">
            <ArrowRightLeft size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="swap-title" className="text-[16px] font-bold text-[#f8fafc]">
              {showForm ? "Ajukan tukar shift" : "Tukar shift"}
            </h2>
            <p className="mt-0.5 text-[12px] leading-relaxed text-[#94a3b8]">
              {showForm
                ? "Pilih siapa yang bertukar, tanggalnya, dan shift yang diminta."
                : "Permintaan anggota untuk bertukar jadwal. Setujui atau tolak yang masih menunggu."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] border border-[#334155] bg-[#0f172a] text-[#94a3b8] transition-colors hover:bg-[#243044] hover:text-[#f8fafc] cursor-pointer max-sm:h-10 max-sm:w-10"
          >
            <X size={16} />
          </button>
        </header>

        {showForm ? (
          /* ── New request form ── */
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-end">
                <label className="block min-w-0">
                  <span className={fieldLabel}>Pemohon</span>
                  <Select size="form" className="w-full" value={requesterId} onChange={(e) => setRequesterId(e.target.value)} aria-label="Pemohon">
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </Select>
                </label>
                <span className="grid h-6 place-items-center text-[#38bdf8] sm:h-11" aria-hidden="true">
                  <ArrowDown size={16} className="sm:hidden" />
                  <ArrowRight size={16} className="max-sm:hidden" />
                </span>
                <label className="block min-w-0">
                  <span className={fieldLabel}>Ditukar dengan</span>
                  <Select size="form" className="w-full" value={targetId} onChange={(e) => setTargetChoice(e.target.value)} aria-label="Ditukar dengan">
                    {others.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </Select>
                </label>
              </div>
              {requester && (
                <p className="-mt-1 text-[11.5px] text-[#94a3b8]">
                  Shift pemohon saat ini: <span className="text-[#cbd5e1]">{requester.currentShift}</span>
                </p>
              )}

              <label className="block">
                <span className={fieldLabel}>Tanggal tukar</span>
                <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={`${inputClass} h-11 sm:max-w-[220px]`} />
              </label>

              <fieldset>
                <legend className={fieldLabel}>Shift yang diminta</legend>
                <div className="grid grid-cols-3 gap-2">
                  {SHIFT_OPTIONS.map((option) => {
                    const active = targetShift === option.value;
                    return (
                      <label
                        key={option.value}
                        className={`flex cursor-pointer flex-col items-center gap-1 rounded-[9px] border px-2 py-2.5 text-center transition-colors ${
                          active ? "border-[#38bdf8]/60 bg-[#0c2a3d]" : "border-[#334155] bg-[#0f172a] hover:bg-[#243044]"
                        }`}
                      >
                        <input type="radio" name="target-shift" value={option.value} checked={active} onChange={() => setTargetShift(option.value)} className="sr-only" />
                        <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#f8fafc]">
                          <span className={`h-2 w-2 rounded-full ${option.dot}`} />
                          {option.label}
                        </span>
                        <span className="font-mono text-[10.5px] text-[#94a3b8]">{option.hours}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <label className="block">
                <span className={fieldLabel}>Alasan</span>
                <textarea
                  rows={3}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Contoh: ada keperluan keluarga di pagi hari."
                  className={`${inputClass} resize-none py-2.5 leading-relaxed`}
                />
              </label>
            </div>

            <footer className="grid grid-cols-2 gap-2 border-t border-[#334155] bg-[#1e293b] px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:flex sm:justify-end sm:px-5">
              <button type="button" className={ghostButton} onClick={() => setShowForm(false)}>
                Batal
              </button>
              <button type="submit" className={primaryButton} disabled={!reason.trim() || !targetId}>
                <Check size={14} /> Kirim permintaan
              </button>
            </footer>
          </form>
        ) : (
          /* ── Request list ── */
          <>
            <div className="flex flex-col gap-2 border-b border-[#334155] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="grid grid-cols-3 gap-0.5 rounded-[8px] border border-[#334155] bg-[#0f172a] p-0.5 sm:inline-grid" role="group" aria-label="Saring permintaan">
                {([
                  ["Pending", `Menunggu (${pendingCount})`],
                  ["Done", `Selesai (${doneCount})`],
                  ["All", `Semua (${requests.length})`],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={filter === value}
                    onClick={() => setFilter(value)}
                    className={`h-8 whitespace-nowrap rounded-[6px] px-3 text-[11.5px] font-semibold transition-colors cursor-pointer max-sm:h-9 max-sm:px-1 ${
                      filter === value ? "bg-[#1e293b] text-[#38bdf8] ring-1 ring-[#38bdf8]/30" : "text-[#94a3b8] hover:text-[#f8fafc]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button type="button" className={`${primaryButton} h-9 max-sm:h-10`} onClick={() => setShowForm(true)}>
                <Plus size={14} /> Ajukan tukar shift
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
              {visible.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                  <span className="mb-3 grid h-11 w-11 place-items-center rounded-full border border-[#334155] bg-[#0f172a] text-[#94a3b8]">
                    <Inbox size={18} />
                  </span>
                  <strong className="text-[13.5px] text-[#f8fafc]">
                    {filter === "Pending" ? "Tidak ada permintaan yang menunggu" : "Belum ada permintaan"}
                  </strong>
                  <p className="mt-1 max-w-xs text-[12px] text-[#94a3b8]">Permintaan baru akan muncul di sini setelah diajukan.</p>
                </div>
              ) : (
                visible.map((req) => {
                  const meta = STATUS_META[req.status];
                  const pending = req.status === "Pending";
                  return (
                    <article key={req.id} className="overflow-hidden rounded-[11px] border border-[#334155] bg-[#0f172a]/70">
                      <div className="flex items-center justify-between gap-2 border-b border-[#334155]/70 px-3.5 py-2.5">
                        <span className="flex min-w-0 items-center gap-1.5 text-[12px] text-[#cbd5e1]">
                          <CalendarDays size={13} className="shrink-0 text-[#38bdf8]" />
                          <strong className="font-semibold text-[#f8fafc]">{req.requestedDate}</strong>
                          <span className="truncate text-[11px] text-[#64748b]">· diajukan {req.createdAt}</span>
                        </span>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10.5px] font-bold ${meta.className}`}>{meta.label}</span>
                      </div>

                      <div className="space-y-3 px-3.5 py-3">
                        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
                          <PersonLine name={req.requesterName} role={memberRole(req.requesterId)} caption="Pemohon" />
                          <ArrowRightLeft size={15} className="hidden text-[#38bdf8] sm:block" aria-hidden="true" />
                          <PersonLine name={req.targetMemberName} role={memberRole(req.targetMemberId)} caption="Ditukar dengan" />
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-[11.5px]">
                          <span className="rounded-[6px] border border-[#334155] bg-[#1e293b] px-2 py-1 text-[#cbd5e1]">{req.currentShift}</span>
                          <ArrowRight size={13} className="text-[#64748b]" aria-hidden="true" />
                          <span className="rounded-[6px] border border-[#38bdf8]/35 bg-[#0c2a3d] px-2 py-1 font-semibold text-[#7dd3fc]">{req.targetShift}</span>
                        </div>

                        <p className="rounded-[8px] border-l-2 border-[#475569] bg-[#1e293b]/70 px-3 py-2 text-[12px] leading-relaxed text-[#cbd5e1]">{req.reason}</p>
                      </div>

                      <div className="flex justify-end gap-2 border-t border-[#334155]/70 px-3.5 py-2.5 max-sm:grid max-sm:grid-cols-2">
                        {pending ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setStatus(req.id, "Rejected")}
                              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[8px] border border-[#f87171]/40 bg-[#3a1a1f] px-3.5 text-[12px] font-semibold text-[#fca5a5] transition-colors hover:bg-[#4c1d24] cursor-pointer max-sm:h-10"
                            >
                              <X size={14} /> Tolak
                            </button>
                            <button
                              type="button"
                              onClick={() => setStatus(req.id, "Approved")}
                              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[8px] bg-[#16a34a] px-3.5 text-[12px] font-bold text-white transition-colors hover:bg-[#15803d] cursor-pointer max-sm:h-10"
                            >
                              <Check size={14} /> Setujui
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setStatus(req.id, "Pending")}
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[8px] px-3 text-[12px] font-semibold text-[#94a3b8] transition-colors hover:bg-[#243044] hover:text-[#f8fafc] cursor-pointer max-sm:col-span-2 max-sm:h-10"
                            title="Kembalikan permintaan ke status menunggu"
                          >
                            <RotateCcw size={13} /> Batalkan keputusan
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </>
        )}
      </section>
    </div>,
    document.body,
  );
}
