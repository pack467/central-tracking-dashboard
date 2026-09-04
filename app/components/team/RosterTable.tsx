"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Mail, Phone, MoreVertical, Calendar, ArrowRightLeft, UserCheck, Edit3, Clock, Briefcase } from "lucide-react";
import { Badge } from "@/app/components/ui/Badge";
import { useToast } from "@/app/components/ui/Toast";
import { initials } from "@/app/lib/data";
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
    case "Subuh": return { bg: "rgba(148, 163, 184, 0.16)", color: "#94a3b8", border: "rgba(148, 163, 184, 0.35)" };
    case "Pagi":  return { bg: "rgba(245, 158, 11, 0.16)", color: "#fbbf24", border: "rgba(245, 158, 11, 0.35)" };
    case "Malam": return { bg: "var(--purple-soft)", color: "var(--purple)", border: "var(--purple-border)" };
    case "Leave": return { bg: "rgba(239, 68, 68, 0.16)", color: "#f87171", border: "rgba(239, 68, 68, 0.35)" };
    default:      return { bg: "var(--bg)", color: "var(--ink-muted)", border: "var(--line)" };
  }
}

/** Pre-compute the schedule strip colors once per member data object. */
function computeScheduleColors(schedule: RosterMember["weeklySchedule"]) {
  return schedule.map((d) => ({ ...d, style: shiftColor(d.shift) }));
}

/* ─── Memoized Sub-Components ────────────────────────────────────────────── */

interface ScheduleStripProps {
  /** Pre-computed once via useMemo in RosterRow */
  days: ReturnType<typeof computeScheduleColors>;
}

const ScheduleStrip = memo(function ScheduleStrip({ days }: ScheduleStripProps) {
  return (
    <div className="roster-mini-days">
      {days.map((dayEntry, idx) => (
        <div
          key={idx}
          className="roster-mini-day"
          style={{ background: dayEntry.style.bg, color: dayEntry.style.color, borderColor: dayEntry.style.border }}
          title={`${dayEntry.day} (${dayEntry.date}): ${dayEntry.shift} (${dayEntry.hours ?? "-"})`}
        >
          <span className="roster-mini-day-label">{dayEntry.day}</span>
          <span className="roster-mini-shift-code">
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
    <div className="roster-action-menu-wrapper">
      <button
        className="icon-button roster-menu-btn"
        onClick={toggle}
        aria-label={`Aksi untuk ${member.name}`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreVertical size={15} />
      </button>

      {open && (
        <>
          <div className="roster-menu-backdrop" onClick={close} />
          <div className="roster-action-dropdown anim-scale-up" role="menu">
            <button
              role="menuitem"
              onClick={() => { close(); onSelectMember(member); }}
            >
              <UserCheck size={14} /> Lihat Profil &amp; Jadwal
            </button>
            <button
              role="menuitem"
              onClick={() => { close(); onRequestSwap(member); }}
            >
              <ArrowRightLeft size={14} /> Request Tukar Shift
            </button>
            <button
              role="menuitem"
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
  const scheduleDays = useMemo(() => computeScheduleColors(member.weeklySchedule), [member.weeklySchedule]);

  const ringClass = member.status === "Active" ? "active"
    : member.status === "On Break" ? "break"
    : "off";

  return (
    <div
      className="roster-table-row"
      role="row"
      style={
        offsetTop !== undefined
          ? {
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${offsetTop}px)`,
              height: ROW_HEIGHT,
              willChange: "transform",
            }
          : undefined
      }
    >
      {/* 1. Member Column */}
      <div
        className="roster-member-cell"
        onClick={() => onSelectMember(member)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectMember(member); } }}
        title="Klik untuk melihat profil lengkap"
      >
        <span
          className={`avatar roster-avatar avatar-status-ring avatar-ring-${ringClass}`}
          style={{ background: member.avatarBg ?? "var(--accent-blue)" }}
          aria-hidden="true"
        >
          {initials(member.name)}
        </span>
        <div className="roster-member-info">
          <strong>{member.name}</strong>
          <div className="roster-role-row">
            <span className="roster-role-pill roster-role-pill-filled">
              <Briefcase size={9} style={{ display: "inline", verticalAlign: "middle", marginRight: "3px" }} />
              {member.role}
            </span>
            <span className="roster-emp-id">{member.employeeId}</span>
          </div>
        </div>
      </div>

      {/* 2. Shift Column */}
      <div className="roster-shift-cell">
        <span className="roster-shift-name">
          <Clock size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px", color: "var(--accent-blue)" }} />
          {member.currentShift}
        </span>
        <span className="roster-shift-sub">Standby Room / Console 01</span>
      </div>

      {/* 3. Status Badge */}
      <div className="roster-status-cell">
        <Badge tone={statusTone(member.status)}>
          {member.status === "Active" && <span className="live-dot live-dot-pulse" style={{ marginRight: "4px" }} />}
          {member.status}
        </Badge>
      </div>

      {/* 4. Contact Buttons */}
      <div className="roster-contact-cell">
        <button
          className="roster-contact-btn"
          onClick={() => onCopy(member.email, "Email")}
          title={`Salin email: ${member.email}`}
          aria-label={`Salin email ${member.name}`}
        >
          <Mail size={13} strokeWidth={2} />
        </button>
        <button
          className="roster-contact-btn"
          onClick={() => onCopy(member.phone, "Nomor HP")}
          title={`Salin nomor: ${member.phone}`}
          aria-label={`Salin telepon ${member.name}`}
        >
          <Phone size={13} strokeWidth={2} />
        </button>
      </div>

      {/* 5. Mini 7-day Schedule Strip — memoized */}
      <div className="roster-schedule-strip-cell">
        <ScheduleStrip days={scheduleDays} />
      </div>

      {/* 6. Action Menu — each row manages its own open state */}
      <div className="roster-actions-cell">
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
  const notify = useToast();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | "all">(10);

  // Automatically reset to page 1 when the member dataset changes (due to search/filters)
  useEffect(() => {
    setCurrentPage(1);
  }, [members]);

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
    <div className="roster-table-wrapper" role="table" aria-label="Tabel daftar tim dan jadwal shift">
      {/* Sticky header */}
      <div className="roster-table-header" role="row">
        <span>TEAM MEMBER</span>
        <span>ASSIGNED SHIFT</span>
        <span>STATUS</span>
        <span>CONTACT</span>
        <span className="roster-schedule-col-head">THIS WEEK&apos;S SCHEDULE</span>
        <span style={{ textAlign: "right" }}>ACTIONS</span>
      </div>

      {/* Table body */}
      <div
        className="roster-table-body"
        aria-rowcount={totalCount}
      >
        {totalCount === 0 ? (
          <div className="roster-empty-state">
            <Calendar size={32} strokeWidth={1.5} style={{ color: "var(--ink-muted)", marginBottom: "8px" }} />
            <strong>Tidak ada anggota tim yang sesuai</strong>
            <p>Ubah kata kunci pencarian atau filter untuk menampilkan data roster.</p>
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
      <div className="roster-pagination-bar">
        <div className="roster-pagination-left">
          <div className="roster-rows-per-page">
            <span className="roster-pagination-label">Rows per page:</span>
            <select
              className="roster-filter-select roster-page-size-select"
              value={pageSize === "all" ? "all" : String(pageSize)}
              onChange={(e) => {
                const val = e.target.value;
                setPageSize(val === "all" ? "all" : Number(val));
                setCurrentPage(1);
              }}
              aria-label="Jumlah baris per halaman"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="all">All</option>
            </select>
          </div>

          <span className="roster-pagination-info">
            Showing <strong>{totalCount === 0 ? 0 : startIdx + 1}–{endIdx}</strong> of <strong>{totalCount}</strong> members
          </span>
        </div>

        <div className="roster-pagination-actions">
          <button
            className="roster-page-btn roster-page-nav"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safeCurrentPage <= 1}
            aria-label="Halaman sebelumnya"
          >
            Prev
          </button>

          <div className="roster-page-numbers">
            {pageNumbers.map((p, idx) =>
              p === "..." ? (
                <span key={`ellipsis-${idx}`} className="roster-page-ellipsis">…</span>
              ) : (
                <button
                  key={p}
                  className={`roster-page-btn roster-page-num ${p === safeCurrentPage ? "active" : ""}`}
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
            className="roster-page-btn roster-page-nav"
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
