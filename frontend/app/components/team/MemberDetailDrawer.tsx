"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { copyTextToClipboard } from "@/app/lib/copy-text";
import { ArrowRightLeft, CalendarCheck, Clock, Copy, History, Mail, Phone, X } from "lucide-react";
import { Badge } from "@/app/components/ui/Badge";
import { MemberAvatar, useIsCurrentMember } from "@/app/components/team/MemberAvatar";
import { useToast } from "@/app/components/ui/Toast";
import { statusTone, shiftColor } from "@/app/components/team/RosterTable";
import { useUserStatus } from "@/app/hooks/useUserStatus";
import type { DayScheduleType, RosterMember, RosterMemberStatus } from "@/app/lib/types";

const SHIFT_LABEL: Record<DayScheduleType, string> = { Subuh: "Subuh", Pagi: "Pagi", Malam: "Malam", Leave: "Cuti", Off: "Libur" };
const STATUS_OPTIONS: RosterMemberStatus[] = ["Active", "On Break", "Off Duty", "On Leave"];
const HISTORY_LABEL: Record<RosterMember["history"][number]["status"], string> = { Present: "Hadir", Late: "Terlambat", Leave: "Cuti", Swapped: "Tukar shift" };

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.8px] text-[#94a3b8]">{children}</h3>;
}

interface MemberDetailDrawerProps {
  member: RosterMember | null;
  onClose: () => void;
  onUpdateMember: (updated: RosterMember) => void;
  onRequestSwap: (member: RosterMember) => void;
}

export function MemberDetailDrawer({ member, onClose, onUpdateMember, onRequestSwap }: MemberDetailDrawerProps) {
  const notify = useToast();
  const panelRef = useRef<HTMLElement>(null);
  const isCurrentUser = useIsCurrentMember(member);
  const { userStatus } = useUserStatus();

  useEffect(() => {
    if (!member) return;
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
  }, [member, onClose]);

  if (!member || typeof document === "undefined") return null;

  const hasHistory = member.history.length > 0;
  const hasStats = member.stats.shiftsCompleted > 0 || hasHistory;
  const workingDays = member.weeklySchedule.filter((day) => day.shift !== "Off" && day.shift !== "Leave").length;

  const changeStatus = (status: RosterMemberStatus) => {
    if (status === member.status) return;
    onUpdateMember({ ...member, status });
    notify.success(`Status ${member.name} diubah menjadi ${status}.`, { id: `status-${member.id}` });
  };

  const copy = (text: string, label: string) => {
    void copyTextToClipboard(text).then((copied) => {
      if (copied) notify.success(`${label} disalin: ${text}`, { id: `copy-${text}` });
      else notify.warning(`${label} tidak dapat disalin.`, { id: `copy-failed-${text}` });
    });
  };

  const contacts = [
    { icon: Mail, label: "Email", value: member.email },
    { icon: Phone, label: "Nomor HP", value: member.phone },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[90] flex justify-end">
      <button type="button" tabIndex={-1} aria-label="Tutup detail anggota" className="absolute inset-0 cursor-default bg-[rgba(2,6,23,0.72)]" onClick={onClose} />

      <section
        ref={panelRef}
        tabIndex={-1}
        data-focus-ring="none"
        className="relative flex h-full outline-none w-full flex-col border-l border-[#334155] bg-[#162033] shadow-[-12px_0_40px_rgba(0,0,0,0.45)] sm:w-[460px] animate-[member-drawer-in_0.18s_ease-out] motion-reduce:animate-none"
        role="dialog"
        aria-modal="true"
        aria-label={`Detail anggota — ${member.name}`}
      >
        <style>{"@keyframes member-drawer-in{from{transform:translateX(24px);opacity:0}to{transform:none;opacity:1}}"}</style>

        {/* Header */}
        <header className="flex items-start gap-3 border-b border-[#334155] bg-[#1e293b] px-4 pb-4 pt-[max(16px,env(safe-area-inset-top))] sm:px-5">
          <span className="mt-1 inline-flex shrink-0"><MemberAvatar size="lg" member={member} /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-bold leading-snug text-[#f8fafc]">{member.name}</h2>
            <p className="mt-0.5 text-[12px] text-[#94a3b8]">
              {member.role}
              {member.employeeId && <span className="font-mono text-[11px] text-[#64748b]"> · {member.employeeId}</span>}
            </p>
            <div className="mt-2">
              {isCurrentUser ? (
                <Badge tone={userStatus === "Online" ? "success" : userStatus === "Busy" ? "critical" : userStatus === "On Break" ? "warning" : "info"}>{userStatus}</Badge>
              ) : (
                <Badge tone={statusTone(member.status)}>{member.status}</Badge>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] border border-[#334155] bg-[#0f172a] text-[#94a3b8] transition-colors hover:bg-[#243044] hover:text-[#f8fafc] cursor-pointer max-sm:h-10 max-sm:w-10"
          >
            <X size={16} />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 py-5 sm:px-5">
          {/* Current shift */}
          <section>
            <SectionTitle>Shift saat ini</SectionTitle>
            <div className="flex items-center gap-3 rounded-[10px] border border-[#334155] bg-[#0f172a] p-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] bg-[#0c2a3d] text-[#38bdf8]">
                <Clock size={16} />
              </span>
              <div className="min-w-0">
                <strong className="block text-[13px] font-semibold text-[#f8fafc]">{member.currentShift}</strong>
                <span className="block text-[11.5px] text-[#94a3b8]">
                  {workingDays} hari kerja minggu ini{member.joinDate ? ` · Bergabung ${member.joinDate}` : ""}
                </span>
              </div>
            </div>
          </section>

          {/* This week */}
          <section>
            <SectionTitle>Jadwal minggu ini</SectionTitle>
            <div className="grid grid-cols-7 gap-1">
              {member.weeklySchedule.map((day, index) => {
                const color = shiftColor(day.shift);
                return (
                  <div
                    key={index}
                    className="flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-[8px] border px-0.5 text-center"
                    style={{ background: color.bg, color: color.color, borderColor: color.border }}
                    title={`${day.day} ${day.date}: ${SHIFT_LABEL[day.shift]}${day.hours ? ` · ${day.hours}` : ""}`}
                  >
                    <span className="font-mono text-[9px] font-bold uppercase leading-none opacity-80">{day.day}</span>
                    <span className="text-[10.5px] font-bold leading-none">{SHIFT_LABEL[day.shift]}</span>
                    <span className="font-mono text-[8.5px] leading-none opacity-70">{day.date}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Contact */}
          <section>
            <SectionTitle>Kontak</SectionTitle>
            <ul className="divide-y divide-[#334155]/70 overflow-hidden rounded-[10px] border border-[#334155] bg-[#0f172a]">
              {contacts.map(({ icon: Icon, label, value }) => (
                <li key={label} className="flex items-center gap-3 px-3 py-2.5">
                  <Icon size={15} className="shrink-0 text-[#94a3b8]" />
                  <div className="min-w-0 flex-1">
                    <span className="block text-[10.5px] text-[#64748b]">{label}</span>
                    <span className={`block truncate text-[12.5px] ${value ? "text-[#f8fafc]" : "italic text-[#64748b]"}`}>{value || "Belum diisi"}</span>
                  </div>
                  {value && (
                    <button
                      type="button"
                      onClick={() => copy(value, label)}
                      aria-label={`Salin ${label.toLowerCase()} ${member.name}`}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-[7px] border border-[#334155] text-[#94a3b8] transition-colors hover:bg-[#243044] hover:text-[#38bdf8] cursor-pointer max-sm:h-10 max-sm:w-10"
                    >
                      <Copy size={13} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {/* Status override */}
          <section>
            <SectionTitle>Ubah status</SectionTitle>
            <div className="grid grid-cols-2 gap-1 rounded-[10px] border border-[#334155] bg-[#0f172a] p-1 sm:grid-cols-4" role="group" aria-label="Status anggota">
              {STATUS_OPTIONS.map((status) => {
                const active = member.status === status;
                return (
                  <button
                    key={status}
                    type="button"
                    aria-pressed={active}
                    onClick={() => changeStatus(status)}
                    className={`h-9 rounded-[7px] text-[11.5px] font-semibold transition-colors cursor-pointer max-sm:h-10 ${
                      active ? "bg-[#1e293b] text-[#38bdf8] ring-1 ring-[#38bdf8]/35" : "text-[#94a3b8] hover:bg-[#1e293b] hover:text-[#f8fafc]"
                    }`}
                  >
                    {status}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Performance + history only when there is something recorded */}
          <section>
            <SectionTitle>Kinerja &amp; riwayat</SectionTitle>
            {hasStats ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Tepat waktu", value: `${member.stats.onTimePercentage}%`, tone: "text-[#4ade80]" },
                    { label: "Shift selesai", value: member.stats.shiftsCompleted, tone: "text-[#38bdf8]" },
                    { label: "Kualitas handover", value: `${member.stats.handoverScore}%`, tone: "text-[#c084fc]" },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-[10px] border border-[#334155] bg-[#0f172a] p-3">
                      <strong className={`block font-mono text-[18px] font-bold leading-none ${stat.tone}`}>{stat.value}</strong>
                      <span className="mt-1.5 block text-[10.5px] leading-tight text-[#94a3b8]">{stat.label}</span>
                    </div>
                  ))}
                </div>
                {hasHistory && (
                  <ul className="mt-3 space-y-1.5">
                    {member.history.map((entry, index) => (
                      <li key={index} className="flex items-center justify-between gap-3 rounded-[8px] border border-[#334155] bg-[#0f172a] px-3 py-2.5">
                        <div className="min-w-0">
                          <strong className="block text-[12.5px] font-semibold text-[#f8fafc]">{entry.shift}</strong>
                          <span className="block truncate text-[11px] text-[#94a3b8]">
                            <span className="font-mono">{entry.date}</span>
                            {entry.note ? ` · ${entry.note}` : ""}
                          </span>
                        </div>
                        <Badge tone={entry.status === "Present" ? "success" : entry.status === "Leave" ? "critical" : "warning"}>{HISTORY_LABEL[entry.status]}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <div className="flex items-center gap-3 rounded-[10px] border border-dashed border-[#334155] px-3 py-4">
                <History size={16} className="shrink-0 text-[#64748b]" />
                <p className="text-[12px] leading-relaxed text-[#94a3b8]">Belum ada shift yang tercatat untuk anggota ini. Kinerja dan riwayat akan muncul setelah shift pertama selesai.</p>
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <footer className="grid grid-cols-2 gap-2 border-t border-[#334155] bg-[#1e293b] px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:flex sm:justify-end sm:px-5">
          <button
            type="button"
            onClick={() => {
              onClose();
              onRequestSwap(member);
            }}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#334155] bg-[#0f172a] px-3.5 text-[12px] font-semibold text-[#f8fafc] transition-colors hover:bg-[#243044] cursor-pointer"
          >
            <ArrowRightLeft size={14} className="text-[#38bdf8]" /> Tukar shift
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#0284c7] px-4 text-[12px] font-bold text-white transition-colors hover:bg-[#0369a1] cursor-pointer"
          >
            <CalendarCheck size={14} /> Selesai
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
