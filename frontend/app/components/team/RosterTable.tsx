"use client";
import { paths } from "@/app/lib/routes";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { routes } from "@/app/lib/routes";


import { useUrlQuery } from "@/app/hooks/useUrlQuery";
import { rosterSchema } from "@/app/lib/query-state";


import { memo, useCallback, useMemo, useState } from "react";
import { Mail, Phone, MoreVertical, Calendar, ArrowRightLeft, UserCheck, Edit3, Clock, Briefcase } from "lucide-react";
import { Badge } from "@/app/components/ui/Badge";
import { Avatar } from "@/app/components/ui/Avatar";
import { useToast } from "@/app/components/ui/Toast";

import { useUserStatus, getStatusRingStyle } from "@/app/hooks/useUserStatus";
import type { DayScheduleType, RosterMember, Tone } from "@/app/lib/types";

/* ─── Constants ──────────────────────────────────────────────────────────── */

const ROW_HEIGHT = 68;

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

interface ScheduleStripProps {
  /** Pre-computed once via useMemo in RosterRow */
  days: ReturnType<typeof computeScheduleColors>;
}

const ScheduleStrip = memo(function ScheduleStrip({ days }: ScheduleStripProps) {
  return (
    <div className="flex gap-[4px]">
      {days.map((dayEntry, idx) => (
        <div
          key={idx}
          className="flex flex-col items-center justify-center w-[28px] h-[36px] rounded-[6px] border border-[var(--line)] text-center cursor-default [background:var(--roster-mini-day-bg)]! [color:var(--roster-mini-day-color)]! [border-color:var(--roster-mini-day-border)]!"
          style={{
            "--roster-mini-day-bg": dayEntry.style.bg,
            "--roster-mini-day-color": dayEntry.style.color,
            "--roster-mini-day-border": dayEntry.style.border,
          } as React.CSSProperties}
          title={`${dayEntry.day} (${dayEntry.date}): ${dayEntry.shift} (${dayEntry.hours ?? "-"})`}
        >
          <span className="text-[8px] font-mono font-bold uppercase opacity-80 leading-none mb-[2px]">{dayEntry.day}</span>
          <span className="text-[11px] font-extrabold leading-none">
            {dayEntry.shift === "Leave" ? "L" : dayEntry.shift === "Off" ? "—" : dayEntry.shift[0]}
          </span>
        </div>
      ))}
    </div>
  );
});

interface ActionMenuProps {
  member: RosterMember;
  onSelectMember: (m: RosterMember) => void;
  onEditMember: (m: RosterMember) => void;
  onRequestSwap: (m: RosterMember) => void;
}

/**
 * Each row owns its own open/closed menu state.
 * This completely prevents the action-menu toggle from re-rendering any other row.
 */
const ActionMenu = memo(function ActionMenu({ member, onSelectMember, onEditMember, onRequestSwap }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);

  return (
    <div className="relative inline-flex justify-end">
      <button
        className="icon-button w-[28px] h-[28px]"
        onClick={toggle}
        aria-label={`Aksi untuk ${member.name}`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreVertical size={15} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={close} />
          <div className="absolute top-full right-0 z-[65] min-w-[190px] p-[5px] mt-[4px] border border-[var(--panel-border)] rounded-[9px] bg-[var(--modal-bg)] shadow-[var(--shadow-elevated)] flex flex-col gap-[2px] anim-scale-up" role="menu">
            <button
              role="menuitem"
              className="flex items-center gap-[8px] w-full p-[8px_10px] rounded-[6px] bg-transparent text-[var(--ink-primary)] text-[11.5px] font-medium text-left transition-all duration-[0.12s] ease hover:bg-[var(--accent-blue-soft)] hover:text-[var(--accent-blue)]"
              onClick={() => { close(); onSelectMember(member); }}
            >
              <UserCheck size={14} /> Lihat Profil &amp; Jadwal
            </button>
            <button
              role="menuitem"
              className="flex items-center gap-[8px] w-full p-[8px_10px] rounded-[6px] bg-transparent text-[var(--ink-primary)] text-[11.5px] font-medium text-left transition-all duration-[0.12s] ease hover:bg-[var(--accent-blue-soft)] hover:text-[var(--accent-blue)]"
              onClick={() => { close(); onRequestSwap(member); }}
            >
              <ArrowRightLeft size={14} /> Request Tukar Shift
            </button>
            <button
              role="menuitem"
              className="flex items-center gap-[8px] w-full p-[8px_10px] rounded-[6px] bg-transparent text-[var(--ink-primary)] text-[11.5px] font-medium text-left transition-all duration-[0.12s] ease hover:bg-[var(--accent-blue-soft)] hover:text-[var(--accent-blue)]"
              onClick={() => { close(); onEditMember(member); }}
            >
              <Edit3 size={14} /> Edit Data Anggota
            </button>
          </div>
        </>
      )}
    </div>
  );
});

interface RosterRowProps {
  member: RosterMember;
  onSelectMember: (m: RosterMember) => void;
  onEditMember: (m: RosterMember) => void;
  onRequestSwap: (m: RosterMember) => void;
  onCopy: (text: string, label: string) => void;
  /** Optional absolute offset if rendered in a virtualizer */
  offsetTop?: number;
}

/**
 * Memoized row — only re-renders when its own `member` object reference changes.
 */
const RosterRow = memo(function RosterRow({
  member,
  onSelectMember,
  onEditMember,
  onRequestSwap,
  onCopy,
  offsetTop,
}: RosterRowProps) {
  // Pre-compute schedule colors once per this member's data object.
  const memberQuery = useSearchParams().toString();
  const scheduleDays = useMemo(() => computeScheduleColors(member.weeklySchedule), [member.weeklySchedule]);

  const { userStatus } = useUserStatus();
  const isCurrentUser = member.name.toLowerCase().includes("galih");
  const memberRingStyle = getStatusRingStyle(member.status, isCurrentUser, userStatus);
  const ringColor = (memberRingStyle as any)["--status-ring-color"] || "#22c55e";
  const displayStatus = isCurrentUser ? userStatus : member.status;

  return (
    <div
      className={`grid grid-cols-[minmax(210px,1.8fr)_minmax(180px,1.4fr)_110px_80px_minmax(220px,1.5fr)_50px] max-[1200px]:grid-cols-[minmax(190px,2fr)_minmax(160px,1.5fr)_100px_75px_44px] max-[760px]:grid-cols-[1fr_100px_44px] gap-[12px] items-center px-[20px] py-[8px] min-h-[68px] border-b border-[var(--line)] transition-colors duration-150 ease hover:bg-[var(--panel-bg-hover)]${offsetTop !== undefined ? " [position:absolute]! [top:0]! [left:0]! [width:100%]! [transform:translateY(var(--roster-row-offset-y))]! [height:var(--roster-row-height)]! [will-change:transform]!" : ""}`}
      role="row"
      style={
        offsetTop !== undefined
          ? {
              "--roster-row-offset-y": `${offsetTop}px`,
              "--roster-row-height": `${ROW_HEIGHT}px`,
            } as React.CSSProperties
          : undefined
      }
    >
      {/* 1. Member Column */}
      <Link href={routes.member(member.id, memberQuery)} scroll={false}
        className="flex items-center gap-[12px] cursor-pointer min-w-0 hover:[&_strong]:text-[var(--accent-blue)]"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectMember(member); } }}
        title="Klik untuk melihat profil lengkap"
      >
        <div
          className="roster-table-avatar-ring-wrapper"
          style={memberRingStyle as React.CSSProperties}
          title={`${member.name} (${displayStatus})`}
        >
          <Avatar
            size="md"
            name={member.name}
            className="w-[32px] h-[32px] text-[11px]"
          />
          <span
            className="roster-table-status-badge [background-color:var(--roster-status-ring-color)]!"
            style={{ "--roster-status-ring-color": ringColor } as React.CSSProperties}
          />
        </div>
        <div className="min-w-0 flex flex-col gap-[2px] flex-1">
          <strong className="text-[var(--ink-primary)] text-[13px] font-semibold truncate whitespace-nowrap transition-colors duration-150 ease">{member.name}</strong>
          <div className="flex items-center gap-[6px]">
            <span className="inline-flex items-center px-[7px] py-[2px] rounded-[99px] border border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--ink-secondary)] text-[10px] font-semibold tracking-[0.1px]">
              <Briefcase size={9} className="inline align-middle mr-[3px]" />
              {member.role}
            </span>
            <span className="text-[9.5px] font-mono text-[var(--ink-muted)]">{member.employeeId}</span>
          </div>
        </div>
      </Link>

      {/* 2. Shift Column */}
      <div className="max-[760px]:hidden">
        <span className="block text-[12px] font-semibold text-[var(--ink-primary)]">
          <Clock size={11} className="inline align-middle mr-[4px] text-[var(--accent-blue)]" />
          {member.currentShift}
        </span>
        <span className="block text-[10px] text-[var(--ink-muted)] font-mono mt-[1px]">Standby Room / Console 01</span>
      </div>

      {/* 3. Status Badge */}
      <div className="flex items-center">
        {isCurrentUser ? (
          <Badge tone={userStatus === "Online" ? "success" : userStatus === "Busy" ? "critical" : userStatus === "On Break" ? "warning" : "info"}>
            <span
              className="live-dot live-dot-pulse [margin-right:4px]! [background-color:var(--roster-live-dot-color)]!"
              style={{ "--roster-live-dot-color": ringColor } as React.CSSProperties}
            />
            {userStatus}
          </Badge>
        ) : (
          <Badge tone={statusTone(member.status)}>
            {member.status === "Active" && <span className="live-dot live-dot-pulse [margin-right:4px]!" />}
            {member.status}
          </Badge>
        )}
      </div>

      {/* 4. Contact Buttons */}
      <div className="flex items-center gap-[6px] max-[760px]:hidden">
        <button
          className="grid place-items-center w-[28px] h-[28px] rounded-[6px] border border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--ink-secondary)] cursor-pointer transition-all duration-150 ease hover:text-[var(--accent-blue)] hover:border-[var(--accent-blue-border)] hover:bg-[var(--accent-blue-soft)]"
          onClick={() => onCopy(member.email, "Email")}
          title={`Salin email: ${member.email}`}
          aria-label={`Salin email ${member.name}`}
        >
          <Mail size={13} strokeWidth={2} />
        </button>
        <button
          className="grid place-items-center w-[28px] h-[28px] rounded-[6px] border border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--ink-secondary)] cursor-pointer transition-all duration-150 ease hover:text-[var(--accent-blue)] hover:border-[var(--accent-blue-border)] hover:bg-[var(--accent-blue-soft)]"
          onClick={() => onCopy(member.phone, "Nomor HP")}
          title={`Salin nomor: ${member.phone}`}
          aria-label={`Salin telepon ${member.name}`}
        >
          <Phone size={13} strokeWidth={2} />
        </button>
      </div>

      {/* 5. Mini 7-day Schedule Strip — memoized */}
      <div className="max-[1200px]:hidden">
        <ScheduleStrip days={scheduleDays} />
      </div>

      {/* 6. Action Menu — each row manages its own open state */}
      <div className="flex justify-end">
        <ActionMenu
          member={member}
          onSelectMember={onSelectMember}
          onEditMember={onEditMember}
          onRequestSwap={onRequestSwap}
        />
      </div>
    </div>
  );
},
// Custom comparator: only re-render when the member data object identity changes.
// This means filter/sort changes produce new arrays (correct) but idle ticks skip re-render.
(prev, next) =>
  prev.member === next.member &&
  prev.offsetTop === next.offsetTop &&
  prev.onSelectMember === next.onSelectMember &&
  prev.onEditMember === next.onEditMember &&
  prev.onRequestSwap === next.onRequestSwap &&
  prev.onCopy === next.onCopy
);

/* ─── Main RosterTable Component ─────────────────────────────────────────── */

interface RosterTableProps {
  members: RosterMember[];
  onSelectMember: (member: RosterMember) => void;
  onEditMember: (member: RosterMember) => void;
  onRequestSwap: (member: RosterMember) => void;
}

export function RosterTable({ members, onSelectMember, onEditMember, onRequestSwap }: RosterTableProps) {
  const url = useUrlQuery(rosterSchema, paths.teamRoster);
  const notify = useToast();

  const currentPage = url.values.page;
  const setCurrentPage = url.field("page", "push");
  const pageSize = url.values.size;
  const setPageSize = url.field("size", "replace");

  // Automatically reset to page 1 when the member dataset changes (due to search/filters)


  const totalCount = members.length;
  const effectivePageSize = pageSize === "all" ? Math.max(1, totalCount) : pageSize;
  const totalPages = pageSize === "all" ? 1 : Math.max(1, Math.ceil(totalCount / effectivePageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIdx = (safeCurrentPage - 1) * (pageSize === "all" ? totalCount : pageSize);
  const paginatedMembers = useMemo(() => {
    if (pageSize === "all") return members;
    return members.slice(startIdx, startIdx + pageSize);
  }, [members, startIdx, pageSize]);

  const endIdx = totalCount === 0 ? 0 : Math.min(startIdx + paginatedMembers.length, totalCount);

  /** Stable copy callback — useCallback keeps ref stable so RosterRow.memo comparison passes. */
  const copyToClipboard = useCallback((text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      notify.success(`${label} disalin: ${text}`, { id: `copy-${text}` });
    }
  }, [notify]);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    pages.push(1);
    if (safeCurrentPage > 3) {
      pages.push("...");
    }
    const start = Math.max(2, safeCurrentPage - 1);
    const end = Math.min(totalPages - 1, safeCurrentPage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (safeCurrentPage < totalPages - 2) {
      pages.push("...");
    }
    if (totalPages > 1) {
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, safeCurrentPage]);

  return (
    <div className="overflow-x-auto [overscroll-behavior-x:contain]" role="table" aria-label="Tabel daftar tim dan jadwal shift">
      {/* Sticky header */}
      <div className="grid grid-cols-[minmax(210px,1.8fr)_minmax(180px,1.4fr)_110px_80px_minmax(220px,1.5fr)_50px] max-[1200px]:grid-cols-[minmax(190px,2fr)_minmax(160px,1.5fr)_100px_75px_44px] max-[760px]:grid-cols-[1fr_100px_44px] gap-[12px] items-center px-[18px] h-[38px] text-[var(--ink-muted)] font-mono text-[9.5px] font-bold tracking-[0.8px] border-b border-[var(--line)]" role="row">
        <span>TEAM MEMBER</span>
        <span className="max-[760px]:hidden">ASSIGNED SHIFT</span>
        <span>STATUS</span>
        <span className="max-[760px]:hidden">CONTACT</span>
        <span className="max-[1200px]:hidden">THIS WEEK&apos;S SCHEDULE</span>
        <span className="text-right">ACTIONS</span>
      </div>

      {/* Table body */}
      <div
        className="py-[var(--space-2,8px)]"
        aria-rowcount={totalCount}
      >
        {totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center p-[44px_20px] text-center">
            <Calendar size={32} strokeWidth={1.5} className="text-[var(--ink-muted)] mb-[8px]" />
            <strong className="text-[14px] text-[var(--ink-primary)] mb-[4px]">Tidak ada anggota tim yang sesuai</strong>
            <p className="m-0 text-[12px] text-[var(--ink-muted)]">Ubah kata kunci pencarian atau filter untuk menampilkan data roster.</p>
          </div>
        ) : (
          paginatedMembers.map((member) => (
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
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-[12px_18px] border-t border-[var(--line)] bg-[var(--panel-bg)]">
        <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[11.5px] text-[var(--ink-muted)] font-medium whitespace-nowrap">Rows per page:</span>
            <select
              className="h-[34px] sm:h-[30px] pl-[9px] pr-[24px] py-0 text-[11.5px] font-medium font-sans rounded-[6px] bg-[right_7px_center] bg-[var(--input-bg,#0f172a)] [color-scheme:dark] border border-[var(--panel-border)] cursor-pointer inline-flex items-center appearance-none -webkit-appearance-none transition-[border-color,box-shadow,background-color,color] duration-150 ease shrink-0 hover:border-[rgba(148,163,184,0.35)] focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_rgba(56,189,248,0.12)] focus:outline-none text-[var(--ink-primary)]"
              value={pageSize === "all" ? "all" : String(pageSize)}
              onChange={(e) => {
                const val = e.target.value;
                setPageSize(val === "all" ? "all" : Number(val));
              }}
              aria-label="Jumlah baris per halaman"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="all">All</option>
            </select>
          </div>

          <span className="text-[11.5px] text-[var(--ink-muted)] font-sans whitespace-nowrap">
            Showing <strong className="text-[var(--ink-primary)] font-mono">{totalCount === 0 ? 0 : startIdx + 1}–{endIdx}</strong> of <strong className="text-[var(--ink-primary)] font-mono">{totalCount}</strong> members
          </span>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-[5px] w-full sm:w-auto">
          <button
            className="inline-flex items-center justify-center min-h-[36px] sm:min-h-0 p-[6px_12px] sm:p-[4px_10px] rounded-[6px] text-[11px] font-semibold font-mono bg-[rgba(148,163,184,0.06)] border border-[rgba(148,163,184,0.15)] text-[var(--ink-secondary)] cursor-pointer transition-all duration-150 ease select-none hover:not-disabled:bg-[rgba(56,189,248,0.12)] hover:not-disabled:border-[rgba(56,189,248,0.35)] hover:not-disabled:text-[#38bdf8] disabled:opacity-35 disabled:cursor-not-allowed disabled:bg-[rgba(148,163,184,0.03)] disabled:border-[rgba(148,163,184,0.08)] disabled:text-[var(--ink-muted)]"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safeCurrentPage <= 1}
            aria-label="Halaman sebelumnya"
          >
            Prev
          </button>

          <div className="flex items-center gap-[3px]">
            {pageNumbers.map((p, idx) =>
              p === "..." ? (
                <span key={`ellipsis-${idx}`} className="px-[4px] py-0 text-[var(--ink-muted)] text-[12px]">…</span>
              ) : (
                <button
                  key={p}
                  className={`inline-flex items-center justify-center min-w-[32px] sm:min-w-[26px] h-[36px] sm:h-[26px] p-0 rounded-[6px] text-[11px] font-semibold font-mono border cursor-pointer transition-all duration-150 ease select-none ${
                    p === safeCurrentPage
                      ? "bg-[rgba(56,189,248,0.18)] border-[rgba(56,189,248,0.5)] text-[#38bdf8] font-bold"
                      : "bg-[rgba(148,163,184,0.06)] border-[rgba(148,163,184,0.15)] text-[var(--ink-secondary)] hover:bg-[rgba(56,189,248,0.12)] hover:border-[rgba(56,189,248,0.35)] hover:text-[#38bdf8]"
                  }`}
                  onClick={() => setCurrentPage(Number(p))}
                  aria-label={`Halaman ${p}`}
                  aria-current={p === safeCurrentPage ? "page" : undefined}
                >
                  {p}
                </button>
              )
            )}
          </div>

          <button
            className="inline-flex items-center justify-center min-h-[36px] sm:min-h-0 p-[6px_12px] sm:p-[4px_10px] rounded-[6px] text-[11px] font-semibold font-mono bg-[rgba(148,163,184,0.06)] border border-[rgba(148,163,184,0.15)] text-[var(--ink-secondary)] cursor-pointer transition-all duration-150 ease select-none hover:not-disabled:bg-[rgba(56,189,248,0.12)] hover:not-disabled:border-[rgba(56,189,248,0.35)] hover:not-disabled:text-[#38bdf8] disabled:opacity-35 disabled:cursor-not-allowed disabled:bg-[rgba(148,163,184,0.03)] disabled:border-[rgba(148,163,184,0.08)] disabled:text-[var(--ink-muted)]"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safeCurrentPage >= totalPages || totalPages <= 1}
            aria-label="Halaman berikutnya"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

