"use client";

import { useEffect, useState } from "react";
import { UserPlus, UserCheck, X } from "lucide-react";
import { Modal } from "@/app/components/ui/Modal";
import { ModalCloseButton } from "@/app/components/ui/ModalCloseButton";
import { useToast } from "@/app/components/ui/Toast";
import type { RosterMember, RosterRole, RosterMemberStatus } from "@/app/lib/types";

interface MemberCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSaveMember: (member: RosterMember) => void;
  editingMember?: RosterMember | null;
}

export function MemberCreateModal({
  open,
  onClose,
  onSaveMember,
  editingMember,
}: MemberCreateModalProps) {
  const notify = useToast();

  const [name, setName] = useState("");
  const [role, setRole] = useState<RosterRole>("Operator NOC");
  const [employeeId, setEmployeeId] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [currentShift, setCurrentShift] = useState("Shift Malam (16:00–00:30 WIB)");
  const [status, setStatus] = useState<RosterMemberStatus>("Active");

  useEffect(() => {
    if (editingMember) {
      setName(editingMember.name);
      setRole(editingMember.role);
      setEmployeeId(editingMember.employeeId);
      setEmail(editingMember.email);
      setPhone(editingMember.phone);
      setCurrentShift(editingMember.currentShift);
      setStatus(editingMember.status);
    } else {
      setName("");
      setRole("Operator NOC");
      setEmployeeId(`EMP-${Math.floor(1000 + Math.random() * 9000)}`);
      setEmail("");
      setPhone("+62 8");
      setCurrentShift("Shift Malam (16:00–00:30 WIB)");
      setStatus("Active");
    }
  }, [editingMember, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const colors = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#db2777", "#4f46e5", "#0891b2"];
    const randomBg = colors[Math.floor(Math.random() * colors.length)];

    const memberData: RosterMember = {
      id: editingMember?.id ?? `mem-${Date.now()}`,
      name: name.trim(),
      role,
      employeeId: employeeId.trim() || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      email: email.trim() || `${name.toLowerCase().replace(/\s+/g, ".")}@company.id`,
      phone: phone.trim() || "+62 812-0000-0000",
      currentShift,
      status,
      joinDate: editingMember?.joinDate ?? "28 Aug 2026",
      avatarBg: editingMember?.avatarBg ?? randomBg,
      weeklySchedule: editingMember?.weeklySchedule ?? [
        { day: "Sen", date: "24 Aug", shift: "Malam", hours: "16:00–00:30" },
        { day: "Sel", date: "25 Aug", shift: "Malam", hours: "16:00–00:30" },
        { day: "Rab", date: "26 Aug", shift: "Malam", hours: "16:00–00:30" },
        { day: "Kam", date: "27 Aug", shift: "Malam", hours: "16:00–00:30" },
        { day: "Jum", date: "28 Aug", shift: "Malam", hours: "16:00–00:30" },
        { day: "Sab", date: "29 Aug", shift: "Off", hours: "Libur" },
        { day: "Min", date: "30 Aug", shift: "Off", hours: "Libur" },
      ],
      stats: editingMember?.stats ?? {
        onTimePercentage: 100,
        shiftsCompleted: 1,
        handoverScore: 100,
      },
      history: editingMember?.history ?? [
        { date: "28 Aug", shift: currentShift, status: "Present", note: "Pendaftaran anggota baru" },
      ],
    };

    onSaveMember(memberData);
    notify.success(
      editingMember
        ? `Data anggota ${memberData.name} berhasil diperbarui.`
        : `Anggota tim baru ${memberData.name} ditambahkan ke roster.`,
      { id: "member-save" },
    );
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      label={editingMember ? "Edit Anggota Tim" : "Tambah Anggota Tim"}
      width={560}
    >
      <div className="modal-title">
        <div>
          <strong style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {editingMember ? (
              <UserCheck size={18} style={{ color: "var(--accent-blue)" }} />
            ) : (
              <UserPlus size={18} style={{ color: "var(--accent-blue)" }} />
            )}
            {editingMember ? "Edit Data Anggota Tim" : "Tambah Anggota Tim Baru"}
          </strong>
          <small>Lengkapi data identitas, peran NOC, dan penugasan shift dinas</small>
        </div>
        <ModalCloseButton onClose={onClose} />
      </div>

      <form onSubmit={handleSubmit} style={{ padding: "8px 0" }}>
        <div className="two-inputs" style={{ marginBottom: "12px" }}>
          <label>
            <span>Nama Lengkap *</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Galih Khairi"
              required
            />
          </label>

          <label>
            <span>Role / Posisi *</span>
            <select value={role} onChange={(e) => setRole(e.target.value as RosterRole)}>
              <option value="Operator NOC">Operator NOC</option>
              <option value="Shift Lead">Shift Lead</option>
              <option value="Incident Coordinator">Incident Coordinator</option>
              <option value="L2 Specialist">L2 Specialist</option>
              <option value="Infrastructure Engineer">Infrastructure Engineer</option>
            </select>
          </label>
        </div>

        <div className="two-inputs" style={{ marginBottom: "12px" }}>
          <label>
            <span>Employee ID</span>
            <input
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="EMP-1048"
            />
          </label>

          <label>
            <span>Penugasan Shift</span>
            <select value={currentShift} onChange={(e) => setCurrentShift(e.target.value)}>
              <option value="Shift Subuh (00:00–08:30 WIB)">Shift Subuh (00:00–08:30 WIB)</option>
              <option value="Shift Pagi (08:00–16:30 WIB)">Shift Pagi (08:00–16:30 WIB)</option>
              <option value="Shift Malam (16:00–00:30 WIB)">Shift Malam (16:00–00:30 WIB)</option>
              <option value="Cuti Tahunan (On Leave)">Cuti Tahunan (On Leave)</option>
            </select>
          </label>
        </div>

        <div className="two-inputs" style={{ marginBottom: "12px" }}>
          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@company.id"
            />
          </label>

          <label>
            <span>Nomor Telepon</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+62 812-3456-7890"
            />
          </label>
        </div>

        <label style={{ display: "grid", gap: "4px", marginBottom: "16px" }}>
          <span>Status Kehadiran</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as RosterMemberStatus)}>
            <option value="Active">Active (Sedang Dinas)</option>
            <option value="On Break">On Break (Istirahat)</option>
            <option value="Off Duty">Off Duty (Lepas Dinas)</option>
            <option value="On Leave">On Leave (Cuti / Izin)</option>
          </select>
        </label>

        <div className="modal-actions">
          <button type="button" className="button button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button button-primary">
            {editingMember ? "✓ Simpan Perubahan" : "＋ Tambahkan Anggota"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
