"use client";
import Link from "next/link";
import { paths } from "@/app/lib/routes";


import { useState, useMemo } from "react";
import { User, Mail, Phone, Clock, Briefcase, Shield, History, Edit3, Copy, Check, Building2, ArrowRightLeft } from "lucide-react";
import { Badge } from "@/app/components/ui/Badge";
import { Avatar } from "@/app/components/ui/Avatar";
import { Modal } from "@/app/components/ui/Modal";
import { ModalCloseButton } from "@/app/components/ui/ModalCloseButton";
import { useToast } from "@/app/components/ui/Toast";
import { useActiveShift } from "@/app/hooks/useLiveClock";
import { useClient } from "@/app/context/ClientContext";
import { useUserStatus } from "@/app/hooks/useUserStatus";
import { seedRosterMembers, seedTickets, monitoringSchedule, seedHistoricalAssessments } from "@/app/lib/data";
import { computeScheduleColors, statusTone } from "@/app/components/team/RosterTable";
import type { RosterMember } from "@/app/lib/types";

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

export function ProfileView() {
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
    employeeId: baseMember.employeeId || "EMP-1001",
    email: baseMember.email || "galih.khairi@company.id",
    phone: baseMember.phone || "+62 812-3456-7890",
    department: "Network Operations Center & Infrastructure",
    joinDate: baseMember.joinDate || "15 Jan 2024",
    bio: "Operator NOC Console 01 — Siap koordinasi via radio console / WhatsApp internal.",
  });

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ ...profileData });

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

  return (
    <div className="flex flex-col gap-[20px] w-full">
      {/* ── 1. Page Header Block ── */}
      <section className="page-heading flex justify-between items-end mb-[22px] max-[660px]:flex-col max-[660px]:items-start max-[660px]:gap-[12px] max-[640px]:mb-0">
        <div>
          <div className="flex items-center gap-[8px] text-[var(--ink-muted)] text-[10px] tracking-[1px] font-bold font-mono uppercase">
            <span className="live-dot live-dot-pulse" /> PROFIL OPERASIONAL
          </div>
          <h1 className="m-[6px_0_4px] text-[var(--ink-primary)] text-[24px] leading-[1.2] tracking-[-0.4px] font-bold">
            <User size={22} className="[display:inline-block]! [vertical-align:middle]! [margin-right:8px]! [color:var(--accent-blue)]!" />
            Profil Pengguna
          </h1>
          <p className="m-0 text-[var(--ink-secondary)] text-[13px]">Kelola informasi akun, peran, dan preferensi operasional Anda.</p>
        </div>
      </section>

      {/* ── 2. Top Profile Summary Card ── */}
      <section
        className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-[12px] p-[24px] flex items-center justify-between gap-[20px] flex-wrap relative overflow-hidden [box-shadow:var(--shadow-sm)] transition-[border-color] duration-150 ease-out hover:border-[rgba(56,189,248,0.3)]"
        aria-label="Ringkasan identitas operator"
      >
        <div className="flex items-center gap-[20px] flex-wrap">
          {/* Avatar circle with dynamic status ring */}
          <div
            className="relative inline-flex items-center justify-center w-[72px] h-[72px] min-w-[72px] min-h-[72px] rounded-[50%] shrink-0 box-border bg-transparent [box-shadow:0_0_0_2px_var(--panel-bg,#1e293b),_0_0_0_5px_var(--status-ring-color,#22c55e),_0_0_16px_var(--status-ring-glow,rgba(34,197,94,0.5))] transition-[box-shadow] duration-250 ease-out"
            style={{
              "--status-ring-color": currentStatusConfig.color,
              "--status-ring-glow": currentStatusConfig.glow,
            } as React.CSSProperties}
          >
            <Avatar
              name={profileData.name}
              size="xl"
              shape="circle"
              className="!w-[72px] !h-[72px] !min-w-[72px] !min-h-[72px] !rounded-[50%] !bg-[linear-gradient(135deg,#475569,#334155)] !text-[#f8fafc] !flex !items-center !justify-center !text-[26px] !font-bold ![font-family:var(--font-sans)] !border-2 !border-[var(--panel-bg,#1e293b)] ![box-shadow:none] !grayscale !shrink-0 !select-none"
              ariaLabel={`Avatar profil ${profileData.name}`}
            />
            <span
              className="absolute bottom-[1px] right-[1px] w-[16px] h-[16px] rounded-[50%] border-[3px] border-[var(--panel-bg,#1e293b)] bg-[var(--status-ring-color,#22c55e)] [box-shadow:0_2px_5px_rgba(0,0,0,0.5)] transition-[background-color] duration-250 ease-out z-[2]"
              title={`Status Kehadiran: ${userStatus}`}
            />
          </div>

          <div className="flex flex-col gap-[6px]">
            <div className="flex items-center gap-[10px] flex-wrap">
              <h2 className="text-[22px] font-bold text-[var(--ink-primary)] m-0 leading-[1.2]">{profileData.name}</h2>
              <Badge tone={userStatus === "Online" ? "success" : userStatus === "Busy" ? "critical" : userStatus === "On Break" ? "warning" : "info"}>
                <span
                  className="[display:inline-block]! [width:7px]! [height:7px]! [border-radius:50%]! [margin-right:5px]! [vertical-align:middle]! [background-color:var(--profile-status-color)]! [box-shadow:0_0_6px_var(--profile-status-color)]!"
                  style={{ "--profile-status-color": currentStatusConfig.color } as React.CSSProperties}
                />
                {userStatus}
              </Badge>
              <Badge tone={statusTone(baseMember.status)}>
                <span className="live-dot live-dot-pulse [margin-right:4px]! [width:6px]! [height:6px]! [min-width:6px]! [min-height:6px]!" />
                {baseMember.status === "Active" ? "Aktif Bertugas" : baseMember.status}
              </Badge>
              <Badge tone="info">
                <Clock size={11} className="[margin-right:4px]! [vertical-align:middle]!" />
                {activeShift.label} ({activeShift.period})
              </Badge>
            </div>

            <div className="flex items-center gap-[8px] text-[13px] text-[var(--ink-secondary)] flex-wrap">
              <span className="inline-flex items-center gap-[5px] px-[8px] py-[2px] bg-[rgba(56,189,248,0.12)] border border-[rgba(56,189,248,0.3)] text-[var(--accent-blue)] rounded-[5px] font-semibold text-[11.5px] [font-family:var(--font-mono)]">
                <Briefcase size={11} className="[margin-right:3px]!" />
                {profileData.role}
              </span>
              <span>•</span>
              <span className="[font-family:var(--font-mono)] text-[var(--ink-muted)] text-[12px]">ID: {profileData.employeeId}</span>
              <span>•</span>
              <span className="text-[var(--ink-muted)] text-[12px]">
                {profileData.department}
              </span>
            </div>

            {/* Quick Contact Badges */}
            <div className="flex items-center gap-[10px] mt-[4px] flex-wrap">
              <button
                type="button"
                className="inline-flex items-center gap-[6px] px-[10px] py-[4px] bg-[rgba(255,255,255,0.04)] border border-[var(--panel-border)] rounded-[6px] text-[var(--ink-secondary)] text-[12px] cursor-pointer transition-[background,border-color,color] duration-150 ease-out leading-[1.4] select-none hover:bg-[rgba(56,189,248,0.08)] hover:border-[rgba(56,189,248,0.35)] hover:text-[var(--accent-blue)]"
                onClick={() => handleCopy(profileData.email, "Email")}
                title="Klik untuk menyalin email"
              >
                <Mail size={12} className="[color:var(--accent-blue)]!" />
                <span>{profileData.email}</span>
                <Copy size={11} className="[opacity:0.6]! [margin-left:2px]!" />
              </button>

              <button
                type="button"
                className="inline-flex items-center gap-[6px] px-[10px] py-[4px] bg-[rgba(255,255,255,0.04)] border border-[var(--panel-border)] rounded-[6px] text-[var(--ink-secondary)] text-[12px] cursor-pointer transition-[background,border-color,color] duration-150 ease-out leading-[1.4] select-none hover:bg-[rgba(56,189,248,0.08)] hover:border-[rgba(56,189,248,0.35)] hover:text-[var(--accent-blue)]"
                onClick={() => handleCopy(profileData.phone, "Nomor Telepon")}
                title="Klik untuk menyalin nomor HP"
              >
                <Phone size={12} className="[color:var(--green)]!" />
                <span>{profileData.phone}</span>
                <Copy size={11} className="[opacity:0.6]! [margin-left:2px]!" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-[10px]">
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
      <div className="grid grid-cols-[1.35fr_1fr] max-[1024px]:grid-cols-1 gap-[20px] [align-items:start]">
        {/* ── LEFT / MAIN COLUMN ── */}
        <div className="flex flex-col gap-[20px]">
          {/* Card: Informasi Akun */}
          <section className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-[12px] p-[20px_22px] [box-shadow:var(--shadow-sm)] flex flex-col gap-[16px] transition-[border-color] duration-150 ease-out hover:border-[rgba(255,255,255,0.14)]" aria-label="Informasi akun operator">
            <div className="flex justify-between items-center [border-bottom:1px_solid_var(--line)] pb-[12px] mb-[2px]">
              <div className="flex items-center gap-[8px]">
                <h3 className="text-[13px] font-bold text-[var(--ink-primary)] tracking-[0.03em] uppercase [font-family:var(--font-sans)] m-0 flex items-center gap-[7px]">
                  <Shield size={14} className="[color:var(--accent-blue)]!" />
                  Informasi Akun &amp; Otorisasi
                </h3>
              </div>
              <span className="text-[11.5px] text-[var(--ink-muted)] m-0 leading-[1.4]">Detail hak akses dan penugasan sistem</span>
            </div>

            <div className="grid grid-cols-2 max-[640px]:grid-cols-1 gap-[14px_18px]">
              <div className="flex flex-col gap-[4px]">
                <span className="text-[11px] [font-family:var(--font-mono)] text-[var(--ink-muted)] uppercase tracking-[0.5px]">Peran &amp; Tanggung Jawab</span>
                <span className="text-[13px] font-semibold text-[var(--ink-primary)] leading-[1.4] break-words">{profileData.role} (First Response &amp; Console)</span>
              </div>

              <div className="flex flex-col gap-[4px]">
                <span className="text-[11px] [font-family:var(--font-mono)] text-[var(--ink-muted)] uppercase tracking-[0.5px]">Nomor Induk Karyawan</span>
                <span className="text-[13px] font-semibold text-[var(--ink-primary)] leading-[1.4] break-words [font-family:var(--font-mono)]!">
                  {profileData.employeeId}
                </span>
              </div>

              <div className="flex flex-col gap-[4px]">
                <span className="text-[11px] [font-family:var(--font-mono)] text-[var(--ink-muted)] uppercase tracking-[0.5px]">Departemen</span>
                <span className="text-[13px] font-semibold text-[var(--ink-primary)] leading-[1.4] break-words">{profileData.department}</span>
              </div>

              <div className="flex flex-col gap-[4px]">
                <span className="text-[11px] [font-family:var(--font-mono)] text-[var(--ink-muted)] uppercase tracking-[0.5px]">Tanggal Bergabung</span>
                <span className="text-[13px] font-semibold text-[var(--ink-primary)] leading-[1.4] break-words">
                  {profileData.joinDate} <small className="text-[var(--ink-muted)] font-normal">(~2 tahun 8 bulan)</small>
                </span>
              </div>

              <div className="flex flex-col gap-[4px] [grid-column:1_/_-1]!">
                <span className="text-[11px] [font-family:var(--font-mono)] text-[var(--ink-muted)] uppercase tracking-[0.5px]">Cakupan Klien / Tenant yang Diakses</span>
                <div className="flex flex-wrap gap-[6px] mt-[4px]">
                  {clients.map((c) => (
                    <span key={c.id} className="inline-flex items-center gap-[5px] px-[8px] py-[3px] bg-[rgba(255,255,255,0.035)] border border-[var(--line)] rounded-[6px] text-[11.5px] font-medium text-[var(--ink-secondary)]">
                      <Building2 size={11} className="[color:var(--accent-blue)]!" />
                      <span>{c.name}</span>
                    </span>
                  ))}
                  {clients.length === 0 && (
                    <span className="inline-flex items-center gap-[5px] px-[8px] py-[3px] bg-[rgba(255,255,255,0.035)] border border-[var(--line)] rounded-[6px] text-[11.5px] font-medium text-[var(--ink-secondary)]">
                      <Building2 size={11} />
                      <span>Tritronik Enterprise NOC</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-[4px] [grid-column:1_/_-1]!">
                <span className="text-[11px] [font-family:var(--font-mono)] text-[var(--ink-muted)] uppercase tracking-[0.5px]">Otorisasi &amp; Hak Akses Operasional</span>
                <div className="flex flex-wrap gap-[6px] mt-[4px]">
                  <span className="inline-flex items-center gap-[4px] px-[7px] py-[2px] bg-[rgba(74,222,128,0.08)] border border-[rgba(74,222,128,0.25)] rounded-[4px] text-[10.5px] [font-family:var(--font-mono)] font-semibold text-[var(--green)]">
                    <Check size={10} strokeWidth={3} /> Buat &amp; Update Tiket
                  </span>
                  <span className="inline-flex items-center gap-[4px] px-[7px] py-[2px] bg-[rgba(74,222,128,0.08)] border border-[rgba(74,222,128,0.25)] rounded-[4px] text-[10.5px] [font-family:var(--font-mono)] font-semibold text-[var(--green)]">
                    <Check size={10} strokeWidth={3} /> Evaluasi Checkpoint Monitoring
                  </span>
                  <span className="inline-flex items-center gap-[4px] px-[7px] py-[2px] bg-[rgba(74,222,128,0.08)] border border-[rgba(74,222,128,0.25)] rounded-[4px] text-[10.5px] [font-family:var(--font-mono)] font-semibold text-[var(--green)]">
                    <Check size={10} strokeWidth={3} /> Validasi Serah Terima Shift
                  </span>
                  <span className="inline-flex items-center gap-[4px] px-[7px] py-[2px] bg-[rgba(74,222,128,0.08)] border border-[rgba(74,222,128,0.25)] rounded-[4px] text-[10.5px] [font-family:var(--font-mono)] font-semibold text-[var(--green)]">
                    <Check size={10} strokeWidth={3} /> Eksekusi Runbook SOP
                  </span>
                  <span className="inline-flex items-center gap-[4px] px-[7px] py-[2px] bg-[rgba(74,222,128,0.08)] border border-[rgba(74,222,128,0.25)] rounded-[4px] text-[10.5px] [font-family:var(--font-mono)] font-semibold text-[var(--green)]">
                    <Check size={10} strokeWidth={3} /> Eskalasi Tier-2 Specialist
                  </span>
                </div>
              </div>

              {profileData.bio && (
                <div className="flex flex-col gap-[4px] [grid-column:1_/_-1]!">
                  <span className="text-[11px] [font-family:var(--font-mono)] text-[var(--ink-muted)] uppercase tracking-[0.5px]">Catatan Operasional / Bio</span>
                  <p className="mt-[4px] text-[var(--ink-secondary)] text-[12.5px] leading-[1.5]">
                    {profileData.bio}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Card: Aktivitas Terbaru (Personal Activity Reference, NOT a performance scorecard) */}
          <section className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-[12px] p-[20px_22px] [box-shadow:var(--shadow-sm)] flex flex-col gap-[16px] transition-[border-color] duration-150 ease-out hover:border-[rgba(255,255,255,0.14)]" aria-label="Aktivitas terbaru operator">
            <div className="flex justify-between items-center [border-bottom:1px_solid_var(--line)] pb-[12px] mb-[2px]">
              <div className="flex items-center gap-[8px]">
                <h3 className="text-[13px] font-bold text-[var(--ink-primary)] tracking-[0.03em] uppercase [font-family:var(--font-sans)] m-0 flex items-center gap-[7px]">
                  <History size={14} className="[color:var(--purple)]!" />
                  Aktivitas Operasional Terbaru
                </h3>
              </div>
              <span className="text-[11.5px] text-[var(--ink-muted)] m-0 leading-[1.4]">
                Referensi catatan kontribusi pribadi (bukan pemeringkatan)
              </span>
            </div>

            {/* Primary Operational Summary Metric Cards (4 Stat Cards Row) */}
            <div className="grid grid-cols-4 max-[900px]:grid-cols-2 max-[480px]:grid-cols-1 gap-[10px]" aria-label="Metrik ringkasan operasional utama">
              <div className="bg-[rgba(255,255,255,0.025)] border border-[var(--line)] rounded-[8px] p-[11px_13px] flex flex-col gap-[3px] transition-[border-color] duration-150 ease-out hover:border-[rgba(255,255,255,0.14)]" title="Volume akumulasi tiket yang pernah ditangani (Jam terbang tinggi)">
                <span className="text-[19px] font-bold [font-family:var(--font-mono)] leading-[1.2] [color:var(--accent-blue)]!">
                  {operationalMetrics.totalTicketsHandled}
                </span>
                <span className="text-[11px] text-[var(--ink-muted)] leading-[1.35]">Total Tiket</span>
              </div>
              <div className="bg-[rgba(255,255,255,0.025)] border border-[var(--line)] rounded-[8px] p-[11px_13px] flex flex-col gap-[3px] transition-[border-color] duration-150 ease-out hover:border-[rgba(255,255,255,0.14)]" title="Konsistensi serah terima shift rutin diselesaikan secara tertib">
                <span className="text-[19px] font-bold [font-family:var(--font-mono)] leading-[1.2] [color:var(--green)]!">
                  {operationalMetrics.handoversCompleted}
                </span>
                <span className="text-[11px] text-[var(--ink-muted)] leading-[1.35]">Serah Terima Diselesaikan</span>
              </div>
              <div className="bg-[rgba(255,255,255,0.025)] border border-[var(--line)] rounded-[8px] p-[11px_13px] flex flex-col gap-[3px] transition-[border-color] duration-150 ease-out hover:border-[rgba(255,255,255,0.14)]" title="Tingkat ketepatan waktu shift: Prima (Target >= 95%)">
                <span
                  className="text-[19px] font-bold [font-family:var(--font-mono)] leading-[1.2] [color:var(--profile-metric-color)]!"
                  style={{ "--profile-metric-color": getOnTimeColor(operationalMetrics.onTimeShiftRate) } as React.CSSProperties}
                >
                  {operationalMetrics.onTimeShiftRate}
                </span>
                <span className="text-[11px] text-[var(--ink-muted)] leading-[1.35]">Ketepatan Waktu Shift (On-Time)</span>
              </div>
              <div className="bg-[rgba(255,255,255,0.025)] border border-[var(--line)] rounded-[8px] p-[11px_13px] flex flex-col gap-[3px] transition-[border-color] duration-150 ease-out hover:border-[rgba(255,255,255,0.14)]" title="Kepatuhan SLA tiket: Optimal dan memenuhi target (Target >= 95%)">
                <span
                  className="text-[19px] font-bold [font-family:var(--font-mono)] leading-[1.2] [color:var(--profile-metric-color)]!"
                  style={{ "--profile-metric-color": getSlaColor(operationalMetrics.slaComplianceRate) } as React.CSSProperties}
                >
                  {operationalMetrics.slaComplianceRate}
                </span>
                <span className="text-[11px] text-[var(--ink-muted)] leading-[1.35]">Kepatuhan SLA Tiket</span>
              </div>
            </div>

            {/* Additional Operational Summary Metrics Grid (Replaces Activity Log) */}
            <div className="grid grid-cols-4 max-[900px]:grid-cols-2 max-[480px]:grid-cols-2 gap-[10px] mt-[4px]" aria-label="Metrik ringkasan kontribusi operasional">
              <div className="bg-[rgba(255,255,255,0.02)] border border-[var(--line)] rounded-[8px] p-[11px_13px] flex flex-col gap-[3px] transition-[border-color] duration-150 ease-out hover:border-[rgba(255,255,255,0.14)]" title="Kepatuhan evaluasi sensor checklist berkala">
                <span className="text-[19px] font-bold [font-family:var(--font-mono)] leading-[1.2] [color:var(--accent-blue)]!">
                  {operationalMetrics.totalCheckpointsEvaluated}
                </span>
                <span className="text-[11px] text-[var(--ink-muted)] leading-[1.35]">Checkpoint Dievaluasi</span>
              </div>
              <div className="bg-[rgba(255,255,255,0.02)] border border-[var(--line)] rounded-[8px] p-[11px_13px] flex flex-col gap-[3px] transition-[border-color] duration-150 ease-out hover:border-[rgba(255,255,255,0.14)]" title="Tiket yang dieskalasi ke tier lanjutan (Jumlah sedang/wajar: 6-15)">
                <span
                  className="text-[19px] font-bold [font-family:var(--font-mono)] leading-[1.2] [color:var(--profile-metric-color)]!"
                  style={{ "--profile-metric-color": getEscalationColor(operationalMetrics.totalEscalationsHandled) } as React.CSSProperties}
                >
                  {operationalMetrics.totalEscalationsHandled}
                </span>
                <span className="text-[11px] text-[var(--ink-muted)] leading-[1.35]">Total Eskalasi</span>
              </div>
              <div className="bg-[rgba(255,255,255,0.02)] border border-[var(--line)] rounded-[8px] p-[11px_13px] flex flex-col gap-[3px] transition-[border-color] duration-150 ease-out hover:border-[rgba(255,255,255,0.14)]" title="Temuan anomali audit shift dalam batas aman dan terkendali (<= 5)">
                <span
                  className="text-[19px] font-bold [font-family:var(--font-mono)] leading-[1.2] [color:var(--profile-metric-color)]!"
                  style={{ "--profile-metric-color": getFindingsColor(operationalMetrics.totalFindingsRecorded) } as React.CSSProperties}
                >
                  {operationalMetrics.totalFindingsRecorded}
                </span>
                <span className="text-[11px] text-[var(--ink-muted)] leading-[1.35]">Total Temuan</span>
              </div>
              <div className="bg-[rgba(255,255,255,0.02)] border border-[var(--line)] rounded-[8px] p-[11px_13px] flex flex-col gap-[3px] transition-[border-color] duration-150 ease-out hover:border-[rgba(255,255,255,0.14)]" title="Rata-rata kecepatan respon tiket: Sangat cepat / responsif (<= 10m)">
                <span
                  className="text-[19px] font-bold [font-family:var(--font-mono)] leading-[1.2] [color:var(--profile-metric-color)]!"
                  style={{ "--profile-metric-color": getResponseTimeColor(operationalMetrics.avgResponseTime) } as React.CSSProperties}
                >
                  {operationalMetrics.avgResponseTime}
                </span>
                <span className="text-[11px] text-[var(--ink-muted)] leading-[1.35]">Rata-rata Respon Tiket</span>
              </div>
            </div>

            {/* Additional Operational Summary Metrics Grid 2: Jam Kerja & Akumulasi Tugas */}
            <div className="grid grid-cols-4 max-[900px]:grid-cols-2 max-[480px]:grid-cols-2 gap-[10px] mt-[4px]" aria-label="Metrik jam kerja dan akumulasi tugas">
              <div className="bg-[rgba(255,255,255,0.02)] border border-[var(--line)] rounded-[8px] p-[11px_13px] flex flex-col gap-[3px] transition-[border-color] duration-150 ease-out hover:border-[rgba(255,255,255,0.14)]" title="Akumulasi total jam dinas shift resmi">
                <span className="text-[19px] font-bold [font-family:var(--font-mono)] leading-[1.2] [color:var(--accent-blue)]!">
                  {operationalMetrics.totalShiftHours}
                </span>
                <span className="text-[11px] text-[var(--ink-muted)] leading-[1.35]">Total Jam Shift</span>
              </div>
              <div className="bg-[rgba(255,255,255,0.02)] border border-[var(--line)] rounded-[8px] p-[11px_13px] flex flex-col gap-[3px] transition-[border-color] duration-150 ease-out hover:border-[rgba(255,255,255,0.14)]" title="Jam kerja lembur/di luar shift resmi (Perhatian moderat: 21-50 jam)">
                <span
                  className="text-[19px] font-bold [font-family:var(--font-mono)] leading-[1.2] [color:var(--profile-metric-color)]!"
                  style={{ "--profile-metric-color": getOvertimeColor(operationalMetrics.overtimeHours) } as React.CSSProperties}
                >
                  {operationalMetrics.overtimeHours}
                </span>
                <span className="text-[11px] text-[var(--ink-muted)] leading-[1.35]">Jam Kerja di Luar Shift</span>
              </div>
              <div className="bg-[rgba(255,255,255,0.02)] border border-[var(--line)] rounded-[8px] p-[11px_13px] flex flex-col gap-[3px] transition-[border-color] duration-150 ease-out hover:border-[rgba(255,255,255,0.14)]" title="Akumulasi seluruh tugas operasional yang diselesaikan dengan tuntas">
                <span className="text-[19px] font-bold [font-family:var(--font-mono)] leading-[1.2] [color:var(--green)]!">
                  {operationalMetrics.tasksCompleted}
                </span>
                <span className="text-[11px] text-[var(--ink-muted)] leading-[1.35]">Tugas Diselesaikan</span>
              </div>
              <div className="bg-[rgba(255,255,255,0.02)] border border-[var(--line)] rounded-[8px] p-[11px_13px] flex flex-col gap-[3px] transition-[border-color] duration-150 ease-out hover:border-[rgba(255,255,255,0.14)]" title="Total jejak interaksi dan aktivitas operasional di dashboard">
                <span className="text-[19px] font-bold [font-family:var(--font-mono)] leading-[1.2] [color:var(--accent-blue)]!">
                  {operationalMetrics.totalActivities}
                </span>
                <span className="text-[11px] text-[var(--ink-muted)] leading-[1.35]">Total Activity</span>
              </div>
            </div>
          </section>
        </div>

        {/* ── RIGHT / SIDEBAR COLUMN ── */}
        <div className="flex flex-col gap-[20px]">
          {/* Card: Shift & Ketersediaan */}
          <section className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-[12px] p-[20px_22px] [box-shadow:var(--shadow-sm)] flex flex-col gap-[16px] transition-[border-color] duration-150 ease-out hover:border-[rgba(255,255,255,0.14)]" aria-label="Jadwal shift dan ketersediaan">
            <div className="flex justify-between items-center [border-bottom:1px_solid_var(--line)] pb-[12px] mb-[2px]">
              <div className="flex items-center gap-[8px]">
                <h3 className="text-[13px] font-bold text-[var(--ink-primary)] tracking-[0.03em] uppercase [font-family:var(--font-sans)] m-0 flex items-center gap-[7px]">
                  <Clock size={14} className="[color:var(--accent-blue)]!" />
                  Shift &amp; Ketersediaan
                </h3>
              </div>
              <span className="text-[11.5px] text-[var(--ink-muted)] m-0 leading-[1.4]">Jadwal tugas minggu berjalan</span>
            </div>

            {/* Current Shift Banner */}
            <div className="flex items-center justify-between gap-[12px] p-[12px_14px] bg-[rgba(56,189,248,0.06)] border border-[rgba(56,189,248,0.2)] rounded-[9px] flex-wrap">
              <div className="flex items-center gap-[10px]">
                <div className="w-[34px] h-[34px] rounded-[8px] bg-[rgba(56,189,248,0.15)] text-[var(--accent-blue)] flex items-center justify-center shrink-0">
                  <Clock size={18} />
                </div>
                <div>
                  <h4 className="text-[13px] font-bold text-[var(--ink-primary)] m-0">
                    {activeShift.label} ({activeShift.period})
                  </h4>
                  <p className="text-[11.5px] text-[var(--ink-muted)] m-0">
                    Pola Kerja: 5 Hari Kerja, 2 Hari Libur (Standar Rotasi NOC)
                  </p>
                </div>
              </div>
              <Badge tone="success">
                <span className="live-dot live-dot-pulse [margin-right:3px]!" />
                Aktif
              </Badge>
            </div>

            {/* Weekly Schedule Grid (SEN..MIN) */}
            <div className="flex flex-col gap-[8px]">
              <span className="text-[11px] [font-family:var(--font-mono)] text-[var(--ink-muted)] uppercase tracking-[0.5px] mb-[2px]">
                Jadwal Minggu Ini (24 Agu – 30 Agu)
              </span>

              <div className="grid grid-cols-7 gap-[6px] w-full">
                {scheduleDays.map((dayEntry, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-center justify-center gap-[3px] p-[8px_4px] rounded-[7px] border border-transparent transition-[border-color] duration-150 ease-out select-none text-center hover:border-[rgba(255,255,255,0.18)] [background:var(--profile-schedule-background)]! [color:var(--profile-schedule-color)]! [border-color:var(--profile-schedule-border)]!"
                    style={{
                      "--profile-schedule-background": dayEntry.style.bg,
                      "--profile-schedule-color": dayEntry.style.color,
                      "--profile-schedule-border": dayEntry.style.border,
                    } as React.CSSProperties}
                    title={`${dayEntry.day} (${dayEntry.date}): ${dayEntry.shift} (${dayEntry.hours ?? "-"})`}
                  >
                    <span className="text-[10.5px] [font-family:var(--font-mono)] font-bold uppercase">{dayEntry.day}</span>
                    <span className="text-[14px] font-extrabold [font-family:var(--font-mono)] leading-none">
                      {dayEntry.shift === "Leave" ? "L" : dayEntry.shift === "Off" ? "—" : dayEntry.shift[0]}
                    </span>
                    <span className="text-[9.5px] text-[var(--ink-muted)] whitespace-nowrap">
                      {dayEntry.shift === "Off" ? "Libur" : dayEntry.shift}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between gap-[10px] text-[11px] text-[var(--ink-muted)] pt-[4px] flex-wrap">
                <div className="flex items-center gap-[12px] flex-wrap">
                  <span className="inline-flex items-center gap-[4px]">
                    <span className="w-[7px] h-[7px] rounded-full [background:#7c3aed]!" />
                    <span>Malam (16:00–00:30)</span>
                  </span>
                  <span className="inline-flex items-center gap-[4px]">
                    <span className="w-[7px] h-[7px] rounded-full [background:#475569]!" />
                    <span>Off (Libur)</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Shift Swap Option */}
            <div className="pt-[6px] [border-top:1px_solid_var(--line)]">
              <Link href={paths.teamRoster}
                className="button button-secondary w-full justify-center"
              >
                <ArrowRightLeft size={13} />
                <span>Pengajuan Tukar Shift</span>
              </Link>
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
            <strong className="[display:flex]! [align-items:center]! [gap:8px]!">
              <User size={16} className="[color:var(--accent-blue)]!" />
              Ubah Informasi Profil
            </strong>
            <small>Perbarui data diri, nomor kontak operasional, dan catatan serah terima shift.</small>
          </div>
          <ModalCloseButton onClose={() => setIsEditModalOpen(false)} label="Tutup modal" />
        </div>

        <form onSubmit={handleSaveProfile}>
          <div className="flex flex-col gap-[16px]">
            <div className="flex flex-col gap-[6px]">
              <label htmlFor="edit-name" className="text-[11.5px] font-semibold text-[var(--ink-secondary)] [font-family:var(--font-mono)] uppercase tracking-[0.5px]">
                Nama Lengkap
              </label>
              <input
                id="edit-name"
                type="text"
                required
                className="w-full h-[38px] px-[12px] py-[8px] bg-[var(--input-bg)] border border-[var(--line)] rounded-[7px] text-[13px] text-[var(--ink-primary)] [font-family:var(--font-sans)] transition-[border-color,box-shadow] duration-150 ease-out box-border focus:outline-none focus:border-[var(--accent-blue)] focus:[box-shadow:0_0_0_2px_var(--accent-blue-soft)]"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-[6px]">
              <label htmlFor="edit-email" className="text-[11.5px] font-semibold text-[var(--ink-secondary)] [font-family:var(--font-mono)] uppercase tracking-[0.5px]">
                Alamat Email Resmi
              </label>
              <input
                id="edit-email"
                type="email"
                required
                className="w-full h-[38px] px-[12px] py-[8px] bg-[var(--input-bg)] border border-[var(--line)] rounded-[7px] text-[13px] text-[var(--ink-primary)] [font-family:var(--font-sans)] transition-[border-color,box-shadow] duration-150 ease-out box-border focus:outline-none focus:border-[var(--accent-blue)] focus:[box-shadow:0_0_0_2px_var(--accent-blue-soft)]"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
              <span className="text-[11px] text-[var(--ink-muted)] leading-[1.35] mt-[2px]">Digunakan untuk notifikasi handover dan eskalasi.</span>
            </div>

            <div className="flex flex-col gap-[6px]">
              <label htmlFor="edit-phone" className="text-[11.5px] font-semibold text-[var(--ink-secondary)] [font-family:var(--font-mono)] uppercase tracking-[0.5px]">
                Nomor Telepon / WhatsApp
              </label>
              <input
                id="edit-phone"
                type="tel"
                required
                className="w-full h-[38px] px-[12px] py-[8px] bg-[var(--input-bg)] border border-[var(--line)] rounded-[7px] text-[13px] text-[var(--ink-primary)] [font-family:var(--font-sans)] transition-[border-color,box-shadow] duration-150 ease-out box-border focus:outline-none focus:border-[var(--accent-blue)] focus:[box-shadow:0_0_0_2px_var(--accent-blue-soft)]"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
              <span className="text-[11px] text-[var(--ink-muted)] leading-[1.35] mt-[2px]">Nomor aktif untuk koordinasi darurat insiden P1.</span>
            </div>

            <div className="flex flex-col gap-[6px]">
              <label htmlFor="edit-bio" className="text-[11.5px] font-semibold text-[var(--ink-secondary)] [font-family:var(--font-mono)] uppercase tracking-[0.5px]">
                Catatan Operasional / Handover Note
              </label>
              <textarea
                id="edit-bio"
                rows={3}
                className="w-full min-h-[84px] px-[12px] py-[8px] bg-[var(--input-bg)] border border-[var(--line)] rounded-[7px] text-[13px] text-[var(--ink-primary)] [font-family:var(--font-sans)] transition-[border-color,box-shadow] duration-150 ease-out box-border resize-none leading-[1.5] focus:outline-none focus:border-[var(--accent-blue)] focus:[box-shadow:0_0_0_2px_var(--accent-blue-soft)]"
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
