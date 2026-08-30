"use client";

import { useState } from "react";
import { Mail, Phone, MoreVertical, Calendar, ArrowRightLeft, UserCheck, Edit3, Clock, Briefcase } from "lucide-react";
import { Badge } from "@/app/components/ui/Badge";
import { useToast } from "@/app/components/ui/Toast";
import { initials } from "@/app/lib/data";
import type { DayScheduleType, RosterMember, Tone } from "@/app/lib/types";

interface RosterTableProps {
  members: RosterMember[];
  onSelectMember: (member: RosterMember) => void;
  onEditMember: (member: RosterMember) => void;
  onRequestSwap: (member: RosterMember) => void;
}

export function statusTone(status: RosterMember["status"]): Tone {
  switch (status) {
    case "Active":
      return "success";
    case "On Break":
      return "warning";
    case "On Leave":
      return "critical";
    case "Off Duty":
    default:
      return "neutral";
  }
}

export function shiftColor(shift: DayScheduleType): { bg: string; color: string; border: string } {
  switch (shift) {
    case "Pagi":
      return { bg: "var(--accent-blue-soft)", color: "var(--accent-blue)", border: "var(--accent-blue-border)" };
    case "Sore":
      return { bg: "var(--green-soft)", color: "var(--green)", border: "var(--green-border)" };
    case "Malam":
      return { bg: "var(--purple-soft)", color: "var(--purple)", border: "var(--purple-border)" };
    case "Leave":
      return { bg: "var(--red-soft)", color: "var(--red)", border: "var(--red-border)" };
    case "Off":
    default:
      return { bg: "var(--bg)", color: "var(--ink-muted)", border: "var(--line)" };
  }
}

export function RosterTable({ members, onSelectMember, onEditMember, onRequestSwap }: RosterTableProps) {
  const notify = useToast();
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      notify.success(`${label} disalin: ${text}`, { id: `copy-${text}` });
    }
  };

  return (
    <div className="roster-table-wrapper" role="table" aria-label="Tabel daftar tim dan jadwal shift">
      <div className="roster-table-header" role="row">
        <span>TEAM MEMBER</span>
        <span>ASSIGNED SHIFT</span>
        <span>STATUS</span>
        <span>CONTACT</span>
        <span className="roster-schedule-col-head">THIS WEEK'S SCHEDULE</span>
        <span style={{ textAlign: "right" }}>ACTIONS</span>
      </div>

      <div className="roster-table-body">
        {members.map((member) => {
          const isMenuOpen = activeMenuId === member.id;

          return (
            <div className="roster-table-row" role="row" key={member.id}>
              {/* 1. Member Column */}
              <div
                className="roster-member-cell"
                onClick={() => onSelectMember(member)}
                role="button"
                tabIndex={0}
                title="Klik untuk melihat profil lengkap"
              >
                <span
                  className={`avatar roster-avatar avatar-status-ring avatar-ring-${member.status === "Active" ? "active" : member.status === "On Break" ? "break" : "off"}`}
                  style={{ background: member.avatarBg ?? "var(--accent-blue)" }}
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
                  onClick={() => copyToClipboard(member.email, "Email")}
                  title={`Salin email: ${member.email}`}
                  aria-label={`Salin email ${member.name}`}
                >
                  <Mail size={13} strokeWidth={2} />
                </button>
                <button
                  className="roster-contact-btn"
                  onClick={() => copyToClipboard(member.phone, "Nomor HP")}
                  title={`Salin nomor: ${member.phone}`}
                  aria-label={`Salin telepon ${member.name}`}
                >
                  <Phone size={13} strokeWidth={2} />
                </button>
              </div>

              {/* 5. Mini 7-day Schedule Strip */}
              <div className="roster-schedule-strip-cell">
                <div className="roster-mini-days">
                  {member.weeklySchedule.map((dayEntry, idx) => {
                    const style = shiftColor(dayEntry.shift);
                    return (
                      <div
                        key={idx}
                        className="roster-mini-day"
                        style={{ background: style.bg, color: style.color, borderColor: style.border }}
                        title={`${dayEntry.day} (${dayEntry.date}): ${dayEntry.shift} (${dayEntry.hours ?? "-"})`}
                      >
                        <span className="roster-mini-day-label">{dayEntry.day}</span>
                        <span className="roster-mini-shift-code">
                          {dayEntry.shift === "Leave" ? "L" : dayEntry.shift === "Off" ? "—" : dayEntry.shift[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 6. Action Menu */}
              <div className="roster-actions-cell">
                <div className="roster-action-menu-wrapper">
                  <button
                    className="icon-button roster-menu-btn"
                    onClick={() => setActiveMenuId(isMenuOpen ? null : member.id)}
                    aria-label={`Aksi untuk ${member.name}`}
                    aria-expanded={isMenuOpen}
                  >
                    <MoreVertical size={15} />
                  </button>

                  {isMenuOpen && (
                    <>
                      <div className="roster-menu-backdrop" onClick={() => setActiveMenuId(null)} />
                      <div className="roster-action-dropdown anim-scale-up">
                        <button
                          onClick={() => {
                            setActiveMenuId(null);
                            onSelectMember(member);
                          }}
                        >
                          <UserCheck size={14} /> Lihat Profil & Jadwal
                        </button>
                        <button
                          onClick={() => {
                            setActiveMenuId(null);
                            onRequestSwap(member);
                          }}
                        >
                          <ArrowRightLeft size={14} /> Request Tukar Shift
                        </button>
                        <button
                          onClick={() => {
                            setActiveMenuId(null);
                            onEditMember(member);
                          }}
                        >
                          <Edit3 size={14} /> Edit Data Anggota
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {members.length === 0 && (
          <div className="roster-empty-state">
            <Calendar size={32} strokeWidth={1.5} style={{ color: "var(--ink-muted)", marginBottom: "8px" }} />
            <strong>Tidak ada anggota tim yang sesuai</strong>
            <p>Ubah kata kunci pencarian atau filter untuk menampilkan data roster.</p>
          </div>
        )}
      </div>
    </div>
  );
}
