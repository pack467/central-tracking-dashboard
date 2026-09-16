"use client";

import { useState, useMemo } from "react";
import {
  User,
  Mail,
  Phone,
  Clock,
  Calendar,
  Briefcase,
  Shield,
  Layers,
  CheckCircle2,
  AlertTriangle,
  History,
  Bell,
  Edit3,
  Copy,
  Check,
  Building2,
  ArrowRightLeft,
  X,
  FileText,
} from "lucide-react";
import { Badge } from "@/app/components/ui/Badge";
import { Avatar } from "@/app/components/ui/Avatar";
import { Modal } from "@/app/components/ui/Modal";
import { ModalCloseButton } from "@/app/components/ui/ModalCloseButton";
import { useToast } from "@/app/components/ui/Toast";
import { useActiveShift } from "@/app/hooks/useLiveClock";
import { useClient } from "@/app/context/ClientContext";
import { useUserStatus } from "@/app/hooks/useUserStatus";
import {
  initials,
  seedRosterMembers,
  seedTickets,
  monitoringSchedule,
  seedHistoricalAssessments,
} from "@/app/lib/data";
import { computeScheduleColors, statusTone } from "@/app/components/team/RosterTable";
import type { RosterMember } from "@/app/lib/types";

interface ProfileViewProps {
  onNavigateToShiftSwap?: () => void;
  onNavigateToHandover?: () => void;
  onNavigateToTickets?: () => void;
}

// Helper functions to determine semantic colors based on operational performance:
// - Green (`var(--green)`): Optimal / Sesuai target / Positif
// - Amber/Orange (`var(--orange)`): Waspada / Cukup / Sedang / Perhatian beban
// - Red (`var(--red)`): Kritis / Lewat ambang batas / Kurang baik
// - Blue (`var(--accent-blue)`): Volume akumulatif / Jam terbang / Konsistensi

// 1. Ketepatan Waktu Shift (Makin TINGGI makin BAGUS: >=95% Prima, 85-94% Waspada, <85% Kritis)
const getOnTimeColor = (rateStr: string) => {
  const val = parseFloat(rateStr);
  if (isNaN(val)) return "var(--green)";
  return val >= 95 ? "var(--green)" : val >= 85 ? "var(--orange)" : "var(--red)";
};

// 2. Kepatuhan SLA Tiket (Makin TINGGI makin BAGUS: >=95% Tercapai, 85-94% Waspada, <85% Breach)
const getSlaColor = (rateStr: string) => {
  const val = parseFloat(rateStr);
  if (isNaN(val)) return "var(--green)";
  return val >= 95 ? "var(--green)" : val >= 85 ? "var(--orange)" : "var(--red)";
};

// 3. Rata-rata Respon Tiket (Makin RENDAH/CEPAT makin BAGUS: <=10m Cepat, 10-20m Sedang, >20m Lambat)
const getResponseTimeColor = (timeStr: string) => {
  const val = parseFloat(timeStr);
  if (isNaN(val)) return "var(--green)";
  return val <= 10 ? "var(--green)" : val <= 20 ? "var(--orange)" : "var(--red)";
};

// 4. Total Eskalasi (Makin SEDIKIT makin BAGUS / Mandiri: <=5 Mandiri, 6-15 Wajar/Kompleks, >15 Kritis)
const getEscalationColor = (count: number) => {
  return count <= 5 ? "var(--green)" : count <= 15 ? "var(--orange)" : "var(--red)";
};

// 5. Total Temuan (Audit Shift: <=5 Terkendali, 6-12 Perhatian, >12 Gangguan Menumpuk)
const getFindingsColor = (count: number) => {
  return count <= 5 ? "var(--green)" : count <= 12 ? "var(--orange)" : "var(--red)";
};

// 6. Jam Kerja di Luar Shift (Makin SEDIKIT makin SEHAT: <=20 Jam Sehat, 21-50 Jam Perhatian Lembur, >50 Jam Overwork)
const getOvertimeColor = (timeStr: string) => {
  const val = parseFloat(timeStr);
  if (isNaN(val)) return "var(--orange)";
  return val <= 20 ? "var(--green)" : val <= 50 ? "var(--orange)" : "var(--red)";
};

export function ProfileView({
  onNavigateToShiftSwap,
  onNavigateToHandover,
  onNavigateToTickets,
}: ProfileViewProps) {
  const notify = useToast();
  const activeShift = useActiveShift();
  const { clients } = useClient();
  const { userStatus, currentStatusConfig } = useUserStatus();

  // Find Galih Khairi's member record from seedRosterMembers or fallback
  const baseMember: RosterMember = useMemo(() => {
    return (
      seedRosterMembers.find((m) => m.name.toLowerCase().includes("galih")) ??
      seedRosterMembers[0]
    );
  }, []);

  // Editable profile state
  const [profileData, setProfileData] = useState({
    name: baseMember.name || "Mhd. Galih Khairi",
    role: baseMember.role || "Operator NOC",
    employeeId: baseMember.employeeId || "EMP-1048",
    email: baseMember.email || "galih.khairi@company.id",
    phone: baseMember.phone || "+62 812-3456-7890",
    department: "Network Operations Center & Infrastructure",
    joinDate: baseMember.joinDate || "15 Jan 2024",
    bio: "Operator NOC Console 01 — Siap koordinasi via radio console / WhatsApp internal.",
  });

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ ...profileData });

  // Notification Preferences State (Persisted in state)
  const [preferences, setPreferences] = useState({
    notifyTickets: true,
    notifyMonitoring: true,
    notifyHandover: true,
    notifySla: true,
    notifyAudit: false,
  });

  // Schedule days pre-computed
  const scheduleDays = useMemo(
    () => computeScheduleColors(baseMember.weeklySchedule),
    [baseMember.weeklySchedule]
  );

  // Dynamic Personal Operational Summary Metrics (Galih Khairi)
  const operationalMetrics = useMemo(() => {
    const userKeyword = "galih";

    // 1. All-time tickets handled:
    // Reuses the established STAFF_ROSTER baseYear figure (325) + active assigned tickets
    const baseYearTickets = 325;
    const userTickets = seedTickets.filter((t) => {
      const owner = (t.owner || "").toLowerCase();
      const hasCoOwner =
        t.owners && t.owners.some((o) => o.toLowerCase().includes(userKeyword));
      return owner.includes(userKeyword) || hasCoOwner;
    });
    const totalTicketsHandled = baseYearTickets + userTickets.length;

    // 2. Personal SLA compliance rate:
    // Non-comparative personal reference rate
    const slaComplianceRate = "98.2%";

    // 3. Handover sessions validated (established in dashboard)
    const handoversCompleted = 142;

    // 4. On-time shift attendance
    const onTimeShiftRate = "98.5%";

    // 5. Total checkpoints evaluated
    const userCheckpoints = monitoringSchedule.filter((m) =>
      (m.owner || "").toLowerCase().includes(userKeyword)
    ).length;
    const userHistorical = seedHistoricalAssessments.filter((h) =>
      (h.owner || "").toLowerCase().includes(userKeyword)
    ).length;
    const totalCheckpointsEvaluated = 302 + userCheckpoints + userHistorical; // 312 Checkpoint Dievaluasi

    // 6. Escalations handled
    const userEscalations = userTickets.filter(
      (t) => t.type === "Escalation" || Boolean(t.escalationLevel)
    ).length;
    const totalEscalationsHandled = 8 + userEscalations; // 9

    // 7. Findings / anomalies logged during shifts
    const totalFindingsRecorded = 5;

    // 8. Average response time
    const avgResponseTime = "8.4m";

    // 9. Total jam dinas shift (akumulasi jam dinas resmi)
    const totalShiftHours = "1.184 Jam";

    // 10. Jam di luar shift (lembur, standby darurat & koordinasi eskalasi)
    const overtimeHours = "46.5 Jam";

    // 11. Tugas yang diselesaikan (checkpoint + tiket tertutup + validasi handover)
    const tasksCompleted = 512;

    // 12. Total aktivitas operasional tercatat
    const totalActivities = 864;

    return {
      totalTicketsHandled,
      handoversCompleted,
      onTimeShiftRate,
      slaComplianceRate,
      totalCheckpointsEvaluated,
      totalEscalationsHandled,
      totalFindingsRecorded,
      avgResponseTime,
      totalShiftHours,
      overtimeHours,
      tasksCompleted,
      totalActivities,
    };
  }, []);

  // Quick Copy Helper
  const handleCopy = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      notify.success(`${label} berhasil disalin: ${text}`, { id: `copy-${label}` });
    }
  };

  // Save profile changes
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileData({ ...editForm });
    setIsEditModalOpen(false);
    notify.success("Profil pengguna berhasil diperbarui.", { id: "profile-saved" });
  };

  // Save preferences
  const handleSavePreferences = () => {
    notify.success("Preferensi notifikasi berhasil disimpan.", { id: "pref-saved" });
  };

  return (
    <div className="profile-page-container anim-fade">
      {/* ── 1. Page Header Block ── */}
      <section className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="live-dot live-dot-pulse" /> PROFIL OPERASIONAL
          </div>
          <h1>
            <User
              size={22}
              style={{
                display: "inline-block",
                verticalAlign: "middle",
                marginRight: "8px",
                color: "var(--accent-blue)",
              }}
            />
            Profil Pengguna
          </h1>
          <p>Kelola informasi akun, peran, dan preferensi operasional Anda.</p>
        </div>
      </section>

      {/* ── 2. Top Profile Summary Card ── */}
      <section className="profile-summary-card" aria-label="Ringkasan identitas operator">
        <div className="profile-summary-main">
          {/* Avatar circle with dynamic status ring */}
          <div
            className="profile-avatar-large-wrapper"
            style={{
              "--status-ring-color": currentStatusConfig.color,
              "--status-ring-glow": currentStatusConfig.glow,
            } as React.CSSProperties}
          >
            <Avatar
              name={profileData.name}
              size="xl"
              shape="circle"
              className="profile-avatar-large"
              ariaLabel={`Avatar profil ${profileData.name}`}
            />
            <span
              className="profile-large-status-badge"
              style={{ backgroundColor: currentStatusConfig.color }}
              title={`Status Kehadiran: ${userStatus}`}
            />
          </div>

          <div className="profile-summary-info">
            <div className="profile-name-row">
              <h2 className="profile-name-title">{profileData.name}</h2>
              <Badge tone={userStatus === "Online" ? "success" : userStatus === "Busy" ? "critical" : userStatus === "On Break" ? "warning" : "info"}>
                <span
                  style={{
                    display: "inline-block",
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    backgroundColor: currentStatusConfig.color,
                    marginRight: "5px",
                    verticalAlign: "middle",
                    boxShadow: `0 0 6px ${currentStatusConfig.color}`,
                  }}
                />
                {userStatus}
              </Badge>
              <Badge tone={statusTone(baseMember.status)}>
                <span className="live-dot live-dot-pulse" style={{ marginRight: "4px" }} />
                {baseMember.status === "Active" ? "Aktif Bertugas" : baseMember.status}
              </Badge>
              <Badge tone="info">
                <Clock size={11} style={{ marginRight: "4px", verticalAlign: "middle" }} />
                {activeShift.label} ({activeShift.period})
              </Badge>
            </div>

            <div className="profile-role-meta">
              <span className="profile-role-pill">
                <Briefcase size={11} style={{ marginRight: "3px" }} />
                {profileData.role}
              </span>
              <span>•</span>
              <span className="profile-emp-id">ID: {profileData.employeeId}</span>
              <span>•</span>
              <span style={{ color: "var(--ink-muted)", fontSize: "12px" }}>
                {profileData.department}
              </span>
            </div>

            {/* Quick Contact Badges */}
            <div className="profile-contact-chips">
              <button
                type="button"
                className="profile-contact-btn"
                onClick={() => handleCopy(profileData.email, "Email")}
                title="Klik untuk menyalin email"
              >
                <Mail size={12} style={{ color: "var(--accent-blue)" }} />
                <span>{profileData.email}</span>
                <Copy size={11} style={{ opacity: 0.6, marginLeft: "2px" }} />
              </button>

              <button
                type="button"
                className="profile-contact-btn"
                onClick={() => handleCopy(profileData.phone, "Nomor Telepon")}
                title="Klik untuk menyalin nomor HP"
              >
                <Phone size={12} style={{ color: "var(--green)" }} />
                <span>{profileData.phone}</span>
                <Copy size={11} style={{ opacity: 0.6, marginLeft: "2px" }} />
              </button>
            </div>
          </div>
        </div>

        <div className="profile-summary-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              setEditForm({ ...profileData });
              setIsEditModalOpen(true);
            }}
          >
            <Edit3 size={13} />
            <span>Ubah Profil</span>
          </button>
        </div>
      </section>

      {/* ── 3. 2-Column Responsive Grid ── */}
      <div className="profile-grid-layout">
        {/* ── LEFT / MAIN COLUMN ── */}
        <div className="profile-column">
          {/* Card: Informasi Akun */}
          <section className="profile-section-card" aria-label="Informasi akun operator">
            <div className="profile-card-header">
              <div className="profile-card-title-group">
                <h3 className="profile-card-title">
                  <Shield size={14} style={{ color: "var(--accent-blue)" }} />
                  Informasi Akun &amp; Otorisasi
                </h3>
              </div>
              <span className="profile-card-subtitle">Detail hak akses dan penugasan sistem</span>
            </div>

            <div className="profile-info-grid">
              <div className="profile-info-item">
                <span className="profile-info-label">Peran &amp; Tanggung Jawab</span>
                <span className="profile-info-value">{profileData.role} (First Response &amp; Console)</span>
              </div>

              <div className="profile-info-item">
                <span className="profile-info-label">Nomor Induk Karyawan</span>
                <span className="profile-info-value" style={{ fontFamily: "var(--font-mono)" }}>
                  {profileData.employeeId}
                </span>
              </div>

              <div className="profile-info-item">
                <span className="profile-info-label">Departemen</span>
                <span className="profile-info-value">{profileData.department}</span>
              </div>

              <div className="profile-info-item">
                <span className="profile-info-label">Tanggal Bergabung</span>
                <span className="profile-info-value">
                  {profileData.joinDate} <small style={{ color: "var(--ink-muted)", fontWeight: "normal" }}>(~2 tahun 8 bulan)</small>
                </span>
              </div>

              <div className="profile-info-item" style={{ gridColumn: "1 / -1" }}>
                <span className="profile-info-label">Cakupan Klien / Tenant yang Diakses</span>
                <div className="profile-tenants-list">
                  {clients.map((c) => (
                    <span key={c.id} className="profile-tenant-badge">
                      <Building2 size={11} style={{ color: "var(--accent-blue)" }} />
                      <span>{c.name}</span>
                    </span>
                  ))}
                  {clients.length === 0 && (
                    <span className="profile-tenant-badge">
                      <Building2 size={11} />
                      <span>Tritronik Enterprise NOC</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="profile-info-item" style={{ gridColumn: "1 / -1" }}>
                <span className="profile-info-label">Otorisasi &amp; Hak Akses Operasional</span>
                <div className="profile-permissions-tags">
                  <span className="profile-perm-tag">
                    <Check size={10} strokeWidth={3} /> Buat &amp; Update Tiket
                  </span>
                  <span className="profile-perm-tag">
                    <Check size={10} strokeWidth={3} /> Evaluasi Checkpoint Monitoring
                  </span>
                  <span className="profile-perm-tag">
                    <Check size={10} strokeWidth={3} /> Validasi Serah Terima Shift
                  </span>
                  <span className="profile-perm-tag">
                    <Check size={10} strokeWidth={3} /> Eksekusi Runbook SOP
                  </span>
                  <span className="profile-perm-tag">
                    <Check size={10} strokeWidth={3} /> Eskalasi Tier-2 Specialist
                  </span>
                </div>
              </div>

              {profileData.bio && (
                <div className="profile-info-item" style={{ gridColumn: "1 / -1" }}>
                  <span className="profile-info-label">Catatan Operasional / Bio</span>
                  <p style={{ margin: "4px 0 0", color: "var(--ink-secondary)", fontSize: "12.5px", lineHeight: 1.5 }}>
                    {profileData.bio}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Card: Aktivitas Terbaru (Personal Activity Reference, NOT a performance scorecard) */}
          <section className="profile-section-card" aria-label="Aktivitas terbaru operator">
            <div className="profile-card-header">
              <div className="profile-card-title-group">
                <h3 className="profile-card-title">
                  <History size={14} style={{ color: "var(--purple)" }} />
                  Aktivitas Operasional Terbaru
                </h3>
              </div>
              <span className="profile-card-subtitle">
                Referensi catatan kontribusi pribadi (bukan pemeringkatan)
              </span>
            </div>

            {/* Primary Operational Summary Metric Cards (4 Stat Cards Row) */}
            <div className="profile-stats-tally" aria-label="Metrik ringkasan operasional utama">
              <div className="profile-tally-item" title="Volume akumulasi tiket yang pernah ditangani (Jam terbang tinggi)">
                <span className="profile-tally-num" style={{ color: "var(--accent-blue)" }}>
                  {operationalMetrics.totalTicketsHandled}
                </span>
                <span className="profile-tally-label">Total Tiket</span>
              </div>
              <div className="profile-tally-item" title="Konsistensi serah terima shift rutin diselesaikan secara tertib">
                <span className="profile-tally-num" style={{ color: "var(--green)" }}>
                  {operationalMetrics.handoversCompleted}
                </span>
                <span className="profile-tally-label">Serah Terima Diselesaikan</span>
              </div>
              <div className="profile-tally-item" title="Tingkat ketepatan waktu shift: Prima (Target >= 95%)">
                <span className="profile-tally-num" style={{ color: getOnTimeColor(operationalMetrics.onTimeShiftRate) }}>
                  {operationalMetrics.onTimeShiftRate}
                </span>
                <span className="profile-tally-label">Ketepatan Waktu Shift (On-Time)</span>
              </div>
              <div className="profile-tally-item" title="Kepatuhan SLA tiket: Optimal dan memenuhi target (Target >= 95%)">
                <span className="profile-tally-num" style={{ color: getSlaColor(operationalMetrics.slaComplianceRate) }}>
                  {operationalMetrics.slaComplianceRate}
                </span>
                <span className="profile-tally-label">Kepatuhan SLA Tiket</span>
              </div>
            </div>

            {/* Additional Operational Summary Metrics Grid (Replaces Activity Log) */}
            <div className="profile-metrics-grid" aria-label="Metrik ringkasan kontribusi operasional">
              <div className="profile-metric-tile" title="Kepatuhan evaluasi sensor checklist berkala">
                <span className="profile-metric-num" style={{ color: "var(--accent-blue)" }}>
                  {operationalMetrics.totalCheckpointsEvaluated}
                </span>
                <span className="profile-metric-label">Checkpoint Dievaluasi</span>
              </div>
              <div className="profile-metric-tile" title="Tiket yang dieskalasi ke tier lanjutan (Jumlah sedang/wajar: 6-15)">
                <span className="profile-metric-num" style={{ color: getEscalationColor(operationalMetrics.totalEscalationsHandled) }}>
                  {operationalMetrics.totalEscalationsHandled}
                </span>
                <span className="profile-metric-label">Total Eskalasi</span>
              </div>
              <div className="profile-metric-tile" title="Temuan anomali audit shift dalam batas aman dan terkendali (<= 5)">
                <span className="profile-metric-num" style={{ color: getFindingsColor(operationalMetrics.totalFindingsRecorded) }}>
                  {operationalMetrics.totalFindingsRecorded}
                </span>
                <span className="profile-metric-label">Total Temuan</span>
              </div>
              <div className="profile-metric-tile" title="Rata-rata kecepatan respon tiket: Sangat cepat / responsif (<= 10m)">
                <span className="profile-metric-num" style={{ color: getResponseTimeColor(operationalMetrics.avgResponseTime) }}>
                  {operationalMetrics.avgResponseTime}
                </span>
                <span className="profile-metric-label">Rata-rata Respon Tiket</span>
              </div>
            </div>

            {/* Additional Operational Summary Metrics Grid 2: Jam Kerja & Akumulasi Tugas */}
            <div className="profile-metrics-grid" aria-label="Metrik jam kerja dan akumulasi tugas">
              <div className="profile-metric-tile" title="Akumulasi total jam dinas shift resmi">
                <span className="profile-metric-num" style={{ color: "var(--accent-blue)" }}>
                  {operationalMetrics.totalShiftHours}
                </span>
                <span className="profile-metric-label">Total Jam Shift</span>
              </div>
              <div className="profile-metric-tile" title="Jam kerja lembur/di luar shift resmi (Perhatian moderat: 21-50 jam)">
                <span className="profile-metric-num" style={{ color: getOvertimeColor(operationalMetrics.overtimeHours) }}>
                  {operationalMetrics.overtimeHours}
                </span>
                <span className="profile-metric-label">Jam Kerja di Luar Shift</span>
              </div>
              <div className="profile-metric-tile" title="Akumulasi seluruh tugas operasional yang diselesaikan dengan tuntas">
                <span className="profile-metric-num" style={{ color: "var(--green)" }}>
                  {operationalMetrics.tasksCompleted}
                </span>
                <span className="profile-metric-label">Tugas Diselesaikan</span>
              </div>
              <div className="profile-metric-tile" title="Total jejak interaksi dan aktivitas operasional di dashboard">
                <span className="profile-metric-num" style={{ color: "var(--accent-blue)" }}>
                  {operationalMetrics.totalActivities}
                </span>
                <span className="profile-metric-label">Total Activity</span>
              </div>
            </div>
          </section>
        </div>

        {/* ── RIGHT / SIDEBAR COLUMN ── */}
        <div className="profile-column">
          {/* Card: Shift & Ketersediaan */}
          <section className="profile-section-card" aria-label="Jadwal shift dan ketersediaan">
            <div className="profile-card-header">
              <div className="profile-card-title-group">
                <h3 className="profile-card-title">
                  <Clock size={14} style={{ color: "var(--accent-blue)" }} />
                  Shift &amp; Ketersediaan
                </h3>
              </div>
              <span className="profile-card-subtitle">Jadwal tugas minggu berjalan</span>
            </div>

            {/* Current Shift Banner */}
            <div className="profile-shift-hero">
              <div className="profile-shift-hero-left">
                <div className="profile-shift-icon-box">
                  <Clock size={18} />
                </div>
                <div>
                  <h4 className="profile-shift-hero-title">
                    {activeShift.label} ({activeShift.period})
                  </h4>
                  <p className="profile-shift-hero-sub">
                    Pola Kerja: 5 Hari Kerja, 2 Hari Libur (Standar Rotasi NOC)
                  </p>
                </div>
              </div>
              <Badge tone="success">
                <span className="live-dot live-dot-pulse" style={{ marginRight: "3px" }} />
                Aktif
              </Badge>
            </div>

            {/* Weekly Schedule Grid (SEN..MIN) */}
            <div className="profile-weekly-schedule">
              <span className="profile-info-label" style={{ marginBottom: "2px" }}>
                Jadwal Minggu Ini (24 Agu – 30 Agu)
              </span>

              <div className="profile-schedule-strip">
                {scheduleDays.map((dayEntry, idx) => (
                  <div
                    key={idx}
                    className="profile-schedule-day"
                    style={{
                      background: dayEntry.style.bg,
                      color: dayEntry.style.color,
                      borderColor: dayEntry.style.border,
                    }}
                    title={`${dayEntry.day} (${dayEntry.date}): ${dayEntry.shift} (${dayEntry.hours ?? "-"})`}
                  >
                    <span className="profile-day-label">{dayEntry.day}</span>
                    <span className="profile-day-code">
                      {dayEntry.shift === "Leave" ? "L" : dayEntry.shift === "Off" ? "—" : dayEntry.shift[0]}
                    </span>
                    <span className="profile-day-sub">
                      {dayEntry.shift === "Off" ? "Libur" : dayEntry.shift}
                    </span>
                  </div>
                ))}
              </div>

              <div className="profile-schedule-legend">
                <div className="profile-legend-items">
                  <span className="profile-legend-item">
                    <span className="profile-legend-dot" style={{ background: "#7c3aed" }} />
                    <span>Malam (16:00–00:30)</span>
                  </span>
                  <span className="profile-legend-item">
                    <span className="profile-legend-dot" style={{ background: "#475569" }} />
                    <span>Off (Libur)</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Shift Swap Option */}
            <div style={{ paddingTop: "6px", borderTop: "1px solid var(--line)" }}>
              <button
                type="button"
                className="button button-secondary"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => {
                  if (onNavigateToShiftSwap) {
                    onNavigateToShiftSwap();
                  } else {
                    notify.info("Buka halaman Team Roster untuk mengajukan permohonan tukar shift.", {
                      id: "swap-hint",
                    });
                  }
                }}
              >
                <ArrowRightLeft size={13} />
                <span>Pengajuan Tukar Shift</span>
              </button>
            </div>
          </section>

          {/* Card: Preferensi & Notifikasi */}
          <section className="profile-section-card" aria-label="Pengaturan preferensi akun">
            <div className="profile-card-header">
              <div className="profile-card-title-group">
                <h3 className="profile-card-title">
                  <Bell size={14} style={{ color: "var(--orange)" }} />
                  Preferensi &amp; Notifikasi
                </h3>
              </div>
              <span className="profile-card-subtitle">Konfigurasi lansiran operasional</span>
            </div>

            <div className="profile-pref-group">
              {/* Notification Category 1: Tiket Baru & Eskalasi */}
              <div className="profile-pref-row">
                <div className="profile-pref-info">
                  <span className="profile-pref-label">Tiket Baru &amp; Eskalasi</span>
                  <span className="profile-pref-desc">
                    Notifikasi saat tiket kritis atau eskalasi masuk
                  </span>
                </div>
                <label className="profile-switch" aria-label="Toggle notifikasi tiket">
                  <input
                    type="checkbox"
                    checked={preferences.notifyTickets}
                    onChange={(e) =>
                      setPreferences((prev) => ({ ...prev, notifyTickets: e.target.checked }))
                    }
                  />
                  <span className="profile-slider" />
                </label>
              </div>

              {/* Notification Category 2: Monitoring & Anomali Sistem */}
              <div className="profile-pref-row">
                <div className="profile-pref-info">
                  <span className="profile-pref-label">Monitoring &amp; Anomali Sistem</span>
                  <span className="profile-pref-desc">
                    Peringatan real-time saat checkpoint NOK
                  </span>
                </div>
                <label className="profile-switch" aria-label="Toggle notifikasi monitoring">
                  <input
                    type="checkbox"
                    checked={preferences.notifyMonitoring}
                    onChange={(e) =>
                      setPreferences((prev) => ({ ...prev, notifyMonitoring: e.target.checked }))
                    }
                  />
                  <span className="profile-slider" />
                </label>
              </div>

              {/* Notification Category 3: Serah Terima Shift */}
              <div className="profile-pref-row">
                <div className="profile-pref-info">
                  <span className="profile-pref-label">Serah Terima Shift (Handover)</span>
                  <span className="profile-pref-desc">
                    Pengingat persiapan dan konfirmasi serah terima
                  </span>
                </div>
                <label className="profile-switch" aria-label="Toggle notifikasi handover">
                  <input
                    type="checkbox"
                    checked={preferences.notifyHandover}
                    onChange={(e) =>
                      setPreferences((prev) => ({ ...prev, notifyHandover: e.target.checked }))
                    }
                  />
                  <span className="profile-slider" />
                </label>
              </div>

              {/* Notification Category 4: Peringatan Batas Waktu SLA */}
              <div className="profile-pref-row">
                <div className="profile-pref-info">
                  <span className="profile-pref-label">Peringatan Batas SLA</span>
                  <span className="profile-pref-desc">
                    Peringatan tiket mendekati atau melewati ambang batas SLA
                  </span>
                </div>
                <label className="profile-switch" aria-label="Toggle notifikasi SLA">
                  <input
                    type="checkbox"
                    checked={preferences.notifySla}
                    onChange={(e) =>
                      setPreferences((prev) => ({ ...prev, notifySla: e.target.checked }))
                    }
                  />
                  <span className="profile-slider" />
                </label>
              </div>

              {/* Notification Category 5: Temuan & Audit */}
              <div className="profile-pref-row">
                <div className="profile-pref-info">
                  <span className="profile-pref-label">Temuan &amp; Audit Shift</span>
                  <span className="profile-pref-desc">
                    Laporan catatan tindak lanjut shift sebelumnya
                  </span>
                </div>
                <label className="profile-switch" aria-label="Toggle notifikasi audit">
                  <input
                    type="checkbox"
                    checked={preferences.notifyAudit}
                    onChange={(e) =>
                      setPreferences((prev) => ({ ...prev, notifyAudit: e.target.checked }))
                    }
                  />
                  <span className="profile-slider" />
                </label>
              </div>

              <div style={{ paddingTop: "8px", borderTop: "1px solid var(--line)" }}>
                <button
                  type="button"
                  className="button button-primary"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={handleSavePreferences}
                >
                  <Check size={14} />
                  <span>Simpan Preferensi</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ── 4. Edit Profile Modal Dialog ── */}
      <Modal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        label="Ubah Informasi Profil"
        width={520}
      >
        <div className="modal-title">
          <div>
            <strong style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <User size={16} style={{ color: "var(--accent-blue)" }} />
              Ubah Informasi Profil
            </strong>
            <small>Perbarui data diri, nomor kontak operasional, dan catatan serah terima shift.</small>
          </div>
          <ModalCloseButton onClose={() => setIsEditModalOpen(false)} label="Tutup modal" />
        </div>

        <form onSubmit={handleSaveProfile}>
          <div className="profile-modal-grid">
            <div className="profile-form-group">
              <label htmlFor="edit-name" className="profile-form-label">
                Nama Lengkap
              </label>
              <input
                id="edit-name"
                type="text"
                required
                className="profile-form-input"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>

            <div className="profile-form-group">
              <label htmlFor="edit-email" className="profile-form-label">
                Alamat Email Resmi
              </label>
              <input
                id="edit-email"
                type="email"
                required
                className="profile-form-input"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
              <span className="profile-form-hint">Digunakan untuk notifikasi handover dan eskalasi.</span>
            </div>

            <div className="profile-form-group">
              <label htmlFor="edit-phone" className="profile-form-label">
                Nomor Telepon / WhatsApp
              </label>
              <input
                id="edit-phone"
                type="tel"
                required
                className="profile-form-input"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
              <span className="profile-form-hint">Nomor aktif untuk koordinasi darurat insiden P1.</span>
            </div>

            <div className="profile-form-group">
              <label htmlFor="edit-bio" className="profile-form-label">
                Catatan Operasional / Handover Note
              </label>
              <textarea
                id="edit-bio"
                rows={3}
                className="profile-form-textarea"
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setIsEditModalOpen(false)}
            >
              Batal
            </button>
            <button type="submit" className="button button-primary">
              <Check size={14} />
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
