"use client";

import { useState } from "react";
import { Mail, Phone, Clock, CalendarDays, X } from "lucide-react";
import { Badge } from "@/app/components/ui/Badge";
import { Avatar } from "@/app/components/ui/Avatar";
import { ModalCloseButton } from "@/app/components/ui/ModalCloseButton";
import { useToast } from "@/app/components/ui/Toast";
import { initials } from "@/app/lib/data";
import { statusTone, shiftColor } from "@/app/components/team/RosterTable";
import { useUserStatus, getStatusRingStyle } from "@/app/hooks/useUserStatus";
import type { RosterMember, RosterMemberStatus } from "@/app/lib/types";

/* ─────────────────────────────────────────────────────────────
   HistorySection helpers — defined before the components
───────────────────────────────────────────────────────────── */
const MONTH_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function buildAugHeatmap(member: RosterMember) {
  // Aug 1 2026 = Saturday (JS getDay()=6) → Mon-based dow = (6+6)%7 = 5
  const firstDow = 5;
  const days: { day: number; shiftDay: RosterMember["weeklySchedule"][number] | null }[] = [];
  for (let d = 1; d <= 31; d++) {
    const dow = (firstDow + d - 1) % 7;
    const shiftDay = member.weeklySchedule[dow] ?? null;
    days.push({ day: d, shiftDay });
  }
  return { firstDow, days };
}

/* ─────────────────────────────────────────────────────────────
   HistorySection — list view + monthly heatmap toggle
───────────────────────────────────────────────────────────── */
function HistorySection({ member }: { member: RosterMember }) {
  const [mode, setMode] = useState<"list" | "heatmap">("list");
  const { firstDow, days } = buildAugHeatmap(member);

  return (
    <div>
      {/* Header + toggle */}
      <div className="flex justify-between items-center mb-[10px]">
        <span className="block text-[10px] font-mono font-bold tracking-[0.8px] text-[var(--ink-muted)] uppercase m-0">
          SHIFT &amp; ATTENDANCE HISTORY
        </span>
        <div className="inline-flex items-center gap-[2px] h-[36px] box-border p-[3px] bg-[var(--surface,#0f172a)] border border-[var(--panel-border)] rounded-[8px] shrink-0 scale-[0.85] origin-right" aria-label="Toggle history view">
          <button
            type="button"
            className={`inline-flex items-center justify-center h-[28px] px-[12px] text-[11.5px] font-semibold rounded-[6px] gap-[6px] border border-transparent cursor-pointer transition-[color,background-color] duration-150 ease ${
              mode === "list"
                ? "bg-[var(--accent-blue,#2563eb)] text-white shadow-[0_1px_3px_rgba(0,0,0,0.25)]"
                : "bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[rgba(148,163,184,0.08)]"
            }`}
            onClick={() => setMode("list")}
          >
            List
          </button>
          <button
            type="button"
            className={`inline-flex items-center justify-center h-[28px] px-[12px] text-[11.5px] font-semibold rounded-[6px] gap-[6px] border border-transparent cursor-pointer transition-[color,background-color] duration-150 ease ${
              mode === "heatmap"
                ? "bg-[var(--accent-blue,#2563eb)] text-white shadow-[0_1px_3px_rgba(0,0,0,0.25)]"
                : "bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[rgba(148,163,184,0.08)]"
            }`}
            onClick={() => setMode("heatmap")}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* ── List view ── */}
      {mode === "list" && (
        <div className="grid gap-[8px]">
          {member.history.map((h, i) => (
            <div
              key={i}
              className="flex justify-between items-center p-[10px_12px] bg-[rgba(127,127,127,0.05)] border border-[var(--line)] rounded-[8px] text-[12px]"
            >
              <div className="flex gap-[10px] items-center">
                <span className="font-mono font-bold text-[var(--accent-blue)] shrink-0">
                  <Clock size={12} className="inline vertical-middle mr-[4px]" />
                  {h.date}
                </span>
                <div>
                  <strong className="block text-[var(--ink-primary)] text-[12.5px]">{h.shift}</strong>
                  {h.note && <small className="text-[var(--ink-muted)] text-[11px]">{h.note}</small>}
                </div>
              </div>
              <Badge tone={h.status === "Present" ? "success" : h.status === "Leave" ? "critical" : "warning"}>
                {h.status}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {/* ── Monthly heatmap ── */}
      {mode === "heatmap" && (
        <div className="mt-[4px]">
          <p className="m-[0_0_10px] text-[11px] text-[var(--ink-muted)]">
            <CalendarDays size={12} className="inline vertical-middle mr-[4px]" />
            August 2026 — shift pattern based on weekly schedule
          </p>

          <div className="grid grid-cols-[repeat(7,1fr)] gap-[3px] mb-[4px]">
            {MONTH_DAYS.map((d) => (
              <div key={d} className="text-center text-[9px] font-bold font-mono text-[var(--ink-muted)] uppercase py-[2px]">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-[repeat(7,1fr)] gap-[3px]">
            {Array(firstDow).fill(null).map((_, i) => (
              <div key={`e-${i}`} className="aspect-square rounded-[5px] border border-transparent bg-transparent cursor-default" />
            ))}
            {days.map(({ day, shiftDay }) => {
              const shift = (shiftDay?.shift ?? "Off") as Parameters<typeof shiftColor>[0];
              const sc = shiftColor(shift);
              const isToday = day === 28;
              return (
                <div
                  key={day}
                  className={`aspect-square rounded-[5px] flex flex-col items-center justify-center cursor-default ${
                    isToday
                      ? "border-2 border-[var(--accent-blue)]"
                      : "border border-[var(--line)]"
                  }`}
                  style={{
                    backgroundColor: sc.bg,
                    borderColor: isToday ? "var(--accent-blue)" : sc.border,
                    color: sc.color,
                  }}
                  title={`${day} Aug — ${shift}${shiftDay?.hours ? ` (${shiftDay.hours})` : ""}`}
                >
                  <span className="text-[8px] font-mono font-bold leading-none opacity-75">{day}</span>
                  <span className="text-[10px] font-extrabold leading-none mt-[1px]">
                    {shift === "Off" ? "—" : shift === "Leave" ? "L" : shift[0]}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex gap-[10px] flex-wrap mt-[8px] pt-[8px] border-t border-[var(--line)]">
            {(["Subuh", "Pagi", "Malam", "Leave", "Off"] as const).map((shift) => {
              const sc = shiftColor(shift);
              return (
                <span key={shift} className="inline-flex items-center gap-[6px] text-[10.5px]">
                  <i
                    className="block w-[12px] h-[12px] rounded-[3px] border border-[var(--line)]"
                    style={{
                      backgroundColor: sc.bg,
                      borderColor: sc.border,
                    }}
                  />
                  {shift}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Main MemberDetailDrawer component
═══════════════════════════════════════════════════════════ */
interface MemberDetailDrawerProps {
  member: RosterMember | null;
  onClose: () => void;
  onUpdateMember: (updated: RosterMember) => void;
  onRequestSwap: (member: RosterMember) => void;
}

export function MemberDetailDrawer({
  member,
  onClose,
  onUpdateMember,
  onRequestSwap,
}: MemberDetailDrawerProps) {
  const notify = useToast();

  const { userStatus } = useUserStatus();
  if (!member) return null;

  const isCurrentUser = member.name.toLowerCase().includes("galih");
  const ringStyle = getStatusRingStyle(member.status, isCurrentUser, userStatus);
  const ringColor = (ringStyle as any)["--status-ring-color"] || "#22c55e";
  const displayStatus = isCurrentUser ? userStatus : member.status;

  const handleStatusChange = (newStatus: RosterMemberStatus) => {
    const updated: RosterMember = { ...member, status: newStatus };
    onUpdateMember(updated);
    notify.success(`Status ${member.name} changed to ${newStatus}.`, { id: `status-${member.id}` });
  };

  const copyToClipboard = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      notify.success(`${label} copied: ${text}`, { id: `copy-${text}` });
    }
  };

  return (
    <div
      className="drawer-backdrop anim-fade"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="drawer-body anim-slide-left"
        role="dialog"
        aria-modal="true"
        aria-label={`Team Member Detail — ${member.name}`}
      >
        {/* Header */}
        <div className="drawer-header">
          <div className="[display:flex]! [gap:12px]! [align-items:center]!">
            <div
              className="drawer-avatar-ring-wrapper"
              style={ringStyle as React.CSSProperties}
              title={`${member.name} (${displayStatus})`}
            >
              <Avatar size="lg" name={member.name} />
              <span
                className="drawer-avatar-status-badge [background-color:var(--drawer-status-ring-color)]!"
                style={{ "--drawer-status-ring-color": ringColor } as React.CSSProperties}
              />
            </div>
            <div>
              <div className="[display:flex]! [gap:8px]! [align-items:center]! [margin-bottom:4px]!">
                <h2 className="[font-size:17px]! [font-weight:700]! [margin:0]! [color:var(--ink-primary)]!">
                  {member.name}
                </h2>
                {isCurrentUser ? (
                  <Badge tone={userStatus === "Online" ? "success" : userStatus === "Busy" ? "critical" : userStatus === "On Break" ? "warning" : "info"}>
                    {userStatus}
                  </Badge>
                ) : (
                  <Badge tone={statusTone(member.status)}>{member.status}</Badge>
                )}
              </div>
              <span className="[font-size:11.5px]! [color:var(--ink-muted)]! [font-family:var(--font-mono)]!">
                {member.role} · ID: {member.employeeId}
              </span>
            </div>
          </div>
          <ModalCloseButton onClose={onClose} label="Tutup panel" />
        </div>

        {/* Scrollable content */}
        <div className="drawer-content-inner">
          {/* Contact quick-copy */}
          <div className="[display:flex]! [gap:8px]! [margin-bottom:20px]! [flex-wrap:wrap]!">
            <button className="button button-secondary [font-size:11px]! [padding:6px_10px]!" onClick={() => copyToClipboard(member.email, "Email")}>
              <Mail size={13} /> {member.email}
            </button>
            <button className="button button-secondary [font-size:11px]! [padding:6px_10px]!" onClick={() => copyToClipboard(member.phone, "Phone")}>
              <Phone size={13} /> {member.phone}
            </button>
          </div>

          {/* Attendance stats */}
          <div className="[margin-bottom:24px]!">
            <span className="block text-[10px] font-mono font-bold tracking-[0.8px] text-[var(--ink-muted)] uppercase mb-[8px]">ATTENDANCE &amp; PERFORMANCE</span>
            <div className="metrics-grid [grid-template-columns:repeat(3,_1fr)]! [gap:10px]! [margin-top:8px]!">
              <div className="metric-card [padding:12px]!">
                <span className="metric-title [font-size:9px]!">ON-TIME RATE</span>
                <strong className="[font-size:18px]! [color:var(--green)]! [margin-top:4px]!">{member.stats.onTimePercentage}%</strong>
                <small className="[color:var(--ink-muted)]! [font-size:10px]!">On-time attendance</small>
              </div>
              <div className="metric-card [padding:12px]!">
                <span className="metric-title [font-size:9px]!">SHIFTS DONE</span>
                <strong className="[font-size:18px]! [color:var(--accent-blue)]! [margin-top:4px]!">{member.stats.shiftsCompleted}</strong>
                <small className="[color:var(--ink-muted)]! [font-size:10px]!">Completed shifts</small>
              </div>
              <div className="metric-card [padding:12px]!">
                <span className="metric-title [font-size:9px]!">HANDOVER QUALITY</span>
                <strong className="[font-size:18px]! [color:var(--purple)]! [margin-top:4px]!">{member.stats.handoverScore}%</strong>
                <small className="[color:var(--ink-muted)]! [font-size:10px]!">SOP compliance score</small>
              </div>
            </div>
          </div>

          {/* Current shift & status switcher */}
          <div className="[margin-bottom:24px]! [padding:14px]! [background:var(--panel-bg)]! [border:1px_solid_var(--panel-border)]! [border-radius:10px]!">
            <div className="[display:flex]! [justify-content:space-between]! [align-items:center]! [margin-bottom:8px]!">
              <span className="block text-[10px] font-mono font-bold tracking-[0.8px] text-[var(--ink-muted)] uppercase m-0">CURRENT ASSIGNED SHIFT</span>
              <Badge tone="info">
                <Clock size={11} className="[display:inline]! [vertical-align:middle]! [margin-right:3px]!" />
                {member.currentShift}
              </Badge>
            </div>
            <p className="[margin:0_0_12px]! [font-size:12px]! [color:var(--ink-secondary)]!">
              Assigned to Console 01 / NOC Command Desk. Joined <strong>{member.joinDate}</strong>.
            </p>
            <div className="[display:flex]! [gap:6px]! [align-items:center]! [flex-wrap:wrap]!">
              <span className="[font-size:11px]! [color:var(--ink-muted)]! [font-weight:600]! [margin-right:4px]!">Quick Status:</span>
              {(["Active", "On Break", "Off Duty", "On Leave"] as const).map((s) => (
                <button
                  key={s}
                  className={`button ${member.status === s ? "button-primary" : "button-secondary"} [font-size:11px]! [padding:4px_8px]!`}
                  onClick={() => handleStatusChange(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Shift history — list or monthly heatmap */}
          <HistorySection member={member} />
        </div>

        {/* Footer */}
        <div className="drawer-footer">
          <button
            className="button button-secondary"
            onClick={() => { onClose(); onRequestSwap(member); }}
          >
            Request Shift Swap
          </button>
          <button className="button button-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
