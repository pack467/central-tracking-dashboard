"use client";

import { useState } from "react";
import { Mail, Phone, Clock, CalendarDays, X } from "lucide-react";
import { Badge } from "@/app/components/ui/Badge";
import { ModalCloseButton } from "@/app/components/ui/ModalCloseButton";
import { useToast } from "@/app/components/ui/Toast";
import { initials } from "@/app/lib/data";
import { statusTone, shiftColor } from "@/app/components/team/RosterTable";
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <span className="roster-section-eyebrow" style={{ margin: 0 }}>
          SHIFT &amp; ATTENDANCE HISTORY
        </span>
        <div className="filter-tabs" style={{ scale: "0.85", transformOrigin: "right center" }}>
          <button className={mode === "list" ? "selected" : ""} onClick={() => setMode("list")}>
            List
          </button>
          <button className={mode === "heatmap" ? "selected" : ""} onClick={() => setMode("heatmap")}>
            Monthly
          </button>
        </div>
      </div>

      {/* ── List view ── */}
      {mode === "list" && (
        <div style={{ display: "grid", gap: "8px" }}>
          {member.history.map((h, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 12px",
                background: "rgba(127,127,127,0.05)",
                border: "1px solid var(--line)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            >
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: "700", color: "var(--accent-blue)", flexShrink: 0 }}>
                  <Clock size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                  {h.date}
                </span>
                <div>
                  <strong style={{ display: "block", color: "var(--ink-primary)", fontSize: "12.5px" }}>{h.shift}</strong>
                  {h.note && <small style={{ color: "var(--ink-muted)", fontSize: "11px" }}>{h.note}</small>}
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
        <div className="member-heatmap-wrapper">
          <p style={{ margin: "0 0 10px", fontSize: "11px", color: "var(--ink-muted)" }}>
            <CalendarDays size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
            August 2026 — shift pattern based on weekly schedule
          </p>

          <div className="member-heatmap-dow">
            {MONTH_DAYS.map((d) => <div key={d}>{d}</div>)}
          </div>

          <div className="member-heatmap-grid">
            {Array(firstDow).fill(null).map((_, i) => (
              <div key={`e-${i}`} className="member-heatmap-cell member-heatmap-empty" />
            ))}
            {days.map(({ day, shiftDay }) => {
              const shift = (shiftDay?.shift ?? "Off") as Parameters<typeof shiftColor>[0];
              const sc = shiftColor(shift);
              const isToday = day === 28;
              return (
                <div
                  key={day}
                  className={`member-heatmap-cell ${isToday ? "member-heatmap-today" : ""}`}
                  style={{ background: sc.bg, borderColor: isToday ? "var(--accent-blue)" : sc.border, color: sc.color }}
                  title={`${day} Aug — ${shift}${shiftDay?.hours ? ` (${shiftDay.hours})` : ""}`}
                >
                  <span className="heatmap-day-num">{day}</span>
                  <span className="heatmap-shift-code">
                    {shift === "Off" ? "—" : shift === "Leave" ? "L" : shift[0]}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="member-heatmap-legend">
            {(["Subuh", "Pagi", "Malam", "Leave", "Off"] as const).map((shift) => {
              const sc = shiftColor(shift);
              return (
                <span key={shift} className="legend-item">
                  <i style={{ background: sc.bg, borderColor: sc.border }} />
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

  if (!member) return null;

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
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <span
              className="avatar"
              style={{ width: "42px", height: "42px", fontSize: "14px", background: member.avatarBg ?? "var(--accent-blue)" }}
            >
              {initials(member.name)}
            </span>
            <div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                <h2 style={{ fontSize: "17px", fontWeight: "700", margin: 0, color: "var(--ink-primary)" }}>
                  {member.name}
                </h2>
                <Badge tone={statusTone(member.status)}>{member.status}</Badge>
              </div>
              <span style={{ fontSize: "11.5px", color: "var(--ink-muted)", fontFamily: "var(--font-mono)" }}>
                {member.role} · ID: {member.employeeId}
              </span>
            </div>
          </div>
          <ModalCloseButton onClose={onClose} label="Tutup panel" />
        </div>

        {/* Scrollable content */}
        <div className="drawer-content-inner">
          {/* Contact quick-copy */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
            <button className="button button-secondary" style={{ fontSize: "11px", padding: "6px 10px" }} onClick={() => copyToClipboard(member.email, "Email")}>
              <Mail size={13} /> {member.email}
            </button>
            <button className="button button-secondary" style={{ fontSize: "11px", padding: "6px 10px" }} onClick={() => copyToClipboard(member.phone, "Phone")}>
              <Phone size={13} /> {member.phone}
            </button>
          </div>

          {/* Attendance stats */}
          <div style={{ marginBottom: "24px" }}>
            <span className="roster-section-eyebrow">ATTENDANCE &amp; PERFORMANCE</span>
            <div className="metrics-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginTop: "8px" }}>
              <div className="metric-card" style={{ padding: "12px" }}>
                <span className="metric-title" style={{ fontSize: "9px" }}>ON-TIME RATE</span>
                <strong style={{ fontSize: "18px", color: "var(--green)", marginTop: "4px" }}>{member.stats.onTimePercentage}%</strong>
                <small style={{ color: "var(--ink-muted)", fontSize: "10px" }}>On-time attendance</small>
              </div>
              <div className="metric-card" style={{ padding: "12px" }}>
                <span className="metric-title" style={{ fontSize: "9px" }}>SHIFTS DONE</span>
                <strong style={{ fontSize: "18px", color: "var(--accent-blue)", marginTop: "4px" }}>{member.stats.shiftsCompleted}</strong>
                <small style={{ color: "var(--ink-muted)", fontSize: "10px" }}>Completed shifts</small>
              </div>
              <div className="metric-card" style={{ padding: "12px" }}>
                <span className="metric-title" style={{ fontSize: "9px" }}>HANDOVER QUALITY</span>
                <strong style={{ fontSize: "18px", color: "var(--purple)", marginTop: "4px" }}>{member.stats.handoverScore}%</strong>
                <small style={{ color: "var(--ink-muted)", fontSize: "10px" }}>SOP compliance score</small>
              </div>
            </div>
          </div>

          {/* Current shift & status switcher */}
          <div style={{ marginBottom: "24px", padding: "14px", background: "var(--panel-bg)", border: "1px solid var(--panel-border)", borderRadius: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span className="roster-section-eyebrow" style={{ margin: 0 }}>CURRENT ASSIGNED SHIFT</span>
              <Badge tone="info">
                <Clock size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: "3px" }} />
                {member.currentShift}
              </Badge>
            </div>
            <p style={{ margin: "0 0 12px", fontSize: "12px", color: "var(--ink-secondary)" }}>
              Assigned to Console 01 / NOC Command Desk. Joined <strong>{member.joinDate}</strong>.
            </p>
            <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: "11px", color: "var(--ink-muted)", fontWeight: "600", marginRight: "4px" }}>Quick Status:</span>
              {(["Active", "On Break", "Off Duty", "On Leave"] as const).map((s) => (
                <button
                  key={s}
                  className={`button ${member.status === s ? "button-primary" : "button-secondary"}`}
                  style={{ fontSize: "11px", padding: "4px 8px" }}
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
