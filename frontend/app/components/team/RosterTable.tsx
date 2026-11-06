"use client";

import { copyTextToClipboard } from "@/app/lib/copy-text";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { routes } from "@/app/lib/routes";

import { memo, useCallback, useMemo, useState } from "react";
import { Mail, Phone, MoreVertical, ArrowRightLeft, UserCheck, Edit3, Clock, SearchX } from "lucide-react";
import { Badge } from "@/app/components/ui/Badge";
import { useToast } from "@/app/components/ui/Toast";
import { MemberAvatar, useIsCurrentMember } from "@/app/components/team/MemberAvatar";
import { RosterPagination, useRosterPage } from "@/app/components/team/RosterPagination";

import { useUserStatus, getStatusRingStyle } from "@/app/hooks/useUserStatus";
import type { DayScheduleType, RosterMember, Tone } from "@/app/lib/types";

/* ─── Pure helper functions (defined once, stable reference) ─────────────── */

export function statusTone(status: RosterMember["status"]): Tone {
  switch (status) {
    case "Active":    return "success";
    case "On Break":  return "warning";
    case "On Leave":  return "critical";
    default:          return "neutral";
  }
}

export function shiftColor(shift: DayScheduleType): { bg: string; color: string; border: string } {
  switch (shift) {
    case "Subuh": return { bg: "var(--accent-blue-soft)", color: "var(--accent-blue)", border: "var(--accent-blue-border)" };
    case "Pagi":  return { bg: "rgba(245, 158, 11, 0.16)", color: "#fbbf24", border: "rgba(245, 158, 11, 0.35)" };
    case "Malam": return { bg: "var(--purple-soft)", color: "var(--purple)", border: "var(--purple-border)" };
    case "Leave": return { bg: "rgba(239, 68, 68, 0.16)", color: "#f87171", border: "rgba(239, 68, 68, 0.35)" };
    default:      return { bg: "var(--bg)", color: "var(--ink-muted)", border: "var(--line)" };
  }
}

/** Pre-compute the schedule strip colors once per member data object. */
export function computeScheduleColors(schedule: RosterMember["weeklySchedule"]) {
  return schedule.map((d) => ({ ...d, style: shiftColor(d.shift) }));
}

/* ─── Memoized Sub-Components ────────────────────────────────────────────── */

const SHIFT_LETTER: Partial<Record<DayScheduleType, string>> = { Subuh: "S", Pagi: "P", Malam: "M", Leave: "C", Off: "—" };

/** Seven day chips; `fluid` stretches them over the full width (phone cards). */
const ScheduleStrip = memo(function ScheduleStrip({ days, fluid = false }: { days: ReturnType<typeof computeScheduleColors>; fluid?: boolean }) {
  return (
    <div className={fluid ? "grid grid-cols-7 gap-1" : "flex gap-1"}>
      {days.map((dayEntry, idx) => (
        <div
          key={idx}
          className={`flex flex-col items-center justify-center rounded-[6px] border text-center cursor-default ${fluid ? "h-10" : "h-9 w-[30px]"}`}
          style={{ background: dayEntry.style.bg, color: dayEntry.style.color, borderColor: dayEntry.style.border }}
          title={`${dayEntry.day} (${dayEntry.date}): ${dayEntry.shift === "Leave" ? "Cuti" : dayEntry.shift}${dayEntry.hours ? ` · ${dayEntry.hours}` : ""}`}
        >
          <span className="mb-[3px] font-mono text-[8.5px] font-bold uppercase leading-none opacity-80">{dayEntry.day}</span>
          <span className="text-[11.5px] font-extrabold leading-none">{SHIFT_LETTER[dayEntry.shift] ?? dayEntry.shift[0]}</span>
        </div>
      ))}
    </div>
  );
});

interface RowActions {
  onSelectMember: (m: RosterMember) => void;
  onEditMember: (m: RosterMember) => void;
  onRequestSwap: (m: RosterMember) => void;
}

const menuItem =
  "flex w-full items-center gap-2 rounded-[6px] px-2.5 py-2 text-left text-[12px] font-medium text-[#f8fafc] transition-colors hover:bg-[#243044] hover:text-[#38bdf8] max-sm:py-2.5";

/** Each row owns its open/closed menu state, so toggling one menu never re-renders other rows. */
const ActionMenu = memo(function ActionMenu({ member, onSelectMember, onEditMember, onRequestSwap }: RowActions & { member: RosterMember }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <div className="relative inline-flex justify-end">
      <button
        type="button"
        className="grid h-8 w-8 place-items-center rounded-[7px] border border-[#334155] bg-[#0f172a] text-[#94a3b8] transition-colors hover:bg-[#243044] hover:text-[#f8fafc] max-sm:h-10 max-sm:w-10 cursor-pointer"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Aksi untuk ${member.name}`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreVertical size={15} />
      </button>

      {open && (
        <>
          <button type="button" tabIndex={-1} aria-label="Tutup menu aksi" className="fixed inset-0 z-[60] cursor-default" onClick={close} />
          <div className="absolute right-0 top-full z-[65] mt-1 flex min-w-[200px] flex-col gap-0.5 rounded-[9px] border border-[#334155] bg-[#1e293b] p-1 shadow-[0_8px_24px_rgba(0,0,0,0.45)]" role="menu">
            <button type="button" role="menuitem" className={menuItem} onClick={() => { close(); onSelectMember(member); }}>
              <UserCheck size={14} /> Lihat profil &amp; jadwal
            </button>
            <button type="button" role="menuitem" className={menuItem} onClick={() => { close(); onRequestSwap(member); }}>
              <ArrowRightLeft size={14} /> Ajukan tukar shift
            </button>
            <button type="button" role="menuitem" className={menuItem} onClick={() => { close(); onEditMember(member); }}>
              <Edit3 size={14} /> Edit data anggota
            </button>
          </div>
        </>
      )}
    </div>
  );
});

interface RosterRowProps extends RowActions {
  member: RosterMember;
  onCopy: (text: string, label: string) => void;
}

const contactButton =
  "grid h-8 w-8 place-items-center rounded-[7px] border border-[#334155] bg-[#0f172a] text-[#94a3b8] transition-colors hover:bg-[#243044] hover:text-[#38bdf8] cursor-pointer";

const TABLE_GRID =
  "grid grid-cols-[minmax(220px,2fr)_120px_minmax(150px,1.2fr)_76px_44px] min-[1200px]:grid-cols-[minmax(220px,1.7fr)_120px_minmax(140px,1fr)_236px_76px_44px] gap-3 items-center";

/** Memoized row — only re-renders when its own `member` object reference changes. */
const RosterRow = memo(function RosterRow({ member, onSelectMember, onEditMember, onRequestSwap, onCopy }: RosterRowProps) {
  const memberQuery = useSearchParams().toString();
  const scheduleDays = useMemo(() => computeScheduleColors(member.weeklySchedule), [member.weeklySchedule]);

  const { userStatus } = useUserStatus();
  const isCurrentUser = useIsCurrentMember(member);
  const ringColor = (getStatusRingStyle(member.status, isCurrentUser, userStatus) as Record<string, string>)["--status-ring-color"] || "#64748b";

  const status = isCurrentUser ? (
    <Badge tone={userStatus === "Online" ? "success" : userStatus === "Busy" ? "critical" : userStatus === "On Break" ? "warning" : "info"}>
      <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ringColor }} />
      {userStatus}
    </Badge>
  ) : (
    <Badge tone={statusTone(member.status)}>
      {member.status === "Active" && <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-current" />}
      {member.status}
    </Badge>
  );

  const identity = (
    <Link
      href={routes.member(member.id, memberQuery)}
      scroll={false}
      className="group/member flex min-w-0 items-center gap-3"
      title={`Lihat profil ${member.name}`}
    >
      <MemberAvatar member={member} />
      <span className="flex min-w-0 flex-col gap-0.5">
        <strong className="truncate text-[13px] font-semibold text-[#f8fafc] transition-colors group-hover/member:text-[#38bdf8]">{member.name}</strong>
        <span className="truncate text-[11.5px] text-[#94a3b8]">
          {member.role}
          <span className="font-mono text-[10.5px] text-[#64748b]"> · {member.employeeId}</span>
        </span>
      </span>
    </Link>
  );

  const shift = (
    <span className="flex min-w-0 items-center gap-1.5 text-[12px] font-medium text-[#cbd5e1]">
      <Clock size={12} className="shrink-0 text-[#38bdf8]" />
      <span className="truncate">{member.currentShift}</span>
    </span>
  );

  const actions = <ActionMenu member={member} onSelectMember={onSelectMember} onEditMember={onEditMember} onRequestSwap={onRequestSwap} />;

  return (
    <>
      {/* Phone & small tablet: card */}
      <div className="border-b border-[#334155]/70 px-4 py-3.5 min-[900px]:hidden" role="row">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">{identity}</div>
          {actions}
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-11">
          {status}
          {shift}
        </div>
        <div className="mt-3">
          <ScheduleStrip days={scheduleDays} fluid />
        </div>
      </div>

      {/* Desktop: table row */}
      <div className={`${TABLE_GRID} min-h-[64px] border-b border-[#334155]/70 px-5 py-2.5 transition-colors hover:bg-[#243044]/50 max-[899px]:hidden`} role="row">
        {identity}
        <div>{status}</div>
        {shift}
        <div className="max-[1199px]:hidden">
          <ScheduleStrip days={scheduleDays} />
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" className={contactButton} onClick={() => onCopy(member.email, "Email")} title={`Salin email: ${member.email}`} aria-label={`Salin email ${member.name}`}>
            <Mail size={13} />
          </button>
          <button type="button" className={contactButton} onClick={() => onCopy(member.phone, "Nomor HP")} title={`Salin nomor: ${member.phone}`} aria-label={`Salin telepon ${member.name}`}>
            <Phone size={13} />
          </button>
        </div>
        <div className="flex justify-end">{actions}</div>
      </div>
    </>
  );
});

/* ─── Main RosterTable Component ─────────────────────────────────────────── */

interface RosterTableProps extends RowActions {
  members: RosterMember[];
}

export function RosterTable({ members, onSelectMember, onEditMember, onRequestSwap }: RosterTableProps) {
  const notify = useToast();
  const roster = useRosterPage(members);

  /** Stable copy callback keeps RosterRow's memo comparison passing. */
  const copyToClipboard = useCallback((text: string, label: string) => {
    void copyTextToClipboard(text).then((copied) => {
      if (copied) notify.success(`${label} disalin: ${text}`, { id: `copy-${text}` });
      else notify.warning(`${label} tidak dapat disalin.`, { id: `copy-failed-${text}` });
    });
  }, [notify]);

  return (
    <div role="table" aria-label="Tabel daftar tim dan jadwal shift" aria-rowcount={roster.total}>
      <div className={`${TABLE_GRID} h-10 border-b border-[#334155] bg-[rgba(15,23,42,0.55)] px-5 font-mono text-[9.5px] font-bold uppercase tracking-[0.8px] text-[#94a3b8] max-[899px]:hidden`} role="row">
        <span>Anggota</span>
        <span>Status</span>
        <span>Shift saat ini</span>
        <span className="max-[1199px]:hidden">Jadwal minggu ini</span>
        <span>Kontak</span>
        <span className="sr-only">Aksi</span>
      </div>

      {roster.total === 0 ? (
        <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
          <span className="mb-3 grid h-11 w-11 place-items-center rounded-full border border-[#334155] bg-[#0f172a] text-[#94a3b8]">
            <SearchX size={18} />
          </span>
          <strong className="text-[14px] text-[#f8fafc]">Tidak ada anggota yang sesuai</strong>
          <p className="mt-1 text-[12px] text-[#94a3b8]">Ubah kata kunci pencarian atau filter untuk menampilkan anggota.</p>
        </div>
      ) : (
        roster.items.map((member) => (
          <RosterRow
            key={member.id}
            member={member}
            onSelectMember={onSelectMember}
            onEditMember={onEditMember}
            onRequestSwap={onRequestSwap}
            onCopy={copyToClipboard}
          />
        ))
      )}

      <RosterPagination roster={roster} />
    </div>
  );
}
