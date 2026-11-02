"use client";

import React, { useState, useEffect, useRef } from "react";
import { Layers, X, Check, AlertCircle } from "lucide-react";
import { Modal } from "@/app/components/ui/Modal";
import type {
  ClientOrganization,
  ProjectMaster,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectHealthDefault,
} from "@/app/types/master-data";

interface ProjectFormModalProps {
  open: boolean;
  initialData?: ProjectMaster | null;
  defaultClientId?: string;
  clients: readonly ClientOrganization[];
  existingProjects: readonly ProjectMaster[];
  onSave: (data: CreateProjectInput | UpdateProjectInput) => Promise<void>;
  onClose: () => void;
}

const HEALTH_OPTIONS: { value: ProjectHealthDefault; label: string; tone: string }[] = [
  { value: "healthy", label: "Healthy (Normal)", tone: "text-emerald-400" },
  { value: "degraded", label: "Degraded (Perlu Perhatian)", tone: "text-amber-400" },
  { value: "critical", label: "Critical (Gangguan)", tone: "text-rose-400" },
];

export function ProjectFormModal({
  open,
  initialData,
  defaultClientId,
  clients,
  existingProjects,
  onSave,
  onClose,
}: ProjectFormModalProps) {
  const isEdit = Boolean(initialData);

  const [clientId, setClientId] = useState(defaultClientId || clients[0]?.id || "tritronik");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [fullName, setFullName] = useState("");
  const [detail, setDetail] = useState("");
  const [leadEngineer, setLeadEngineer] = useState("");
  const [healthDefault, setHealthDefault] = useState<ProjectHealthDefault>("healthy");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setClientId(initialData.clientId);
        setCode(initialData.code);
        setName(initialData.name);
        setFullName(initialData.fullName || initialData.name);
        setDetail(initialData.detail || "");
        setLeadEngineer(initialData.leadEngineer || "");
        setHealthDefault(initialData.healthDefault || "healthy");
      } else {
        setClientId(defaultClientId || clients[0]?.id || "tritronik");
        setCode("");
        setName("");
        setFullName("");
        setDetail("");
        setLeadEngineer("NOC Lead Specialist");
        setHealthDefault("healthy");
      }
      setErrors({});
      setIsSubmitting(false);
    }
  }, [open, initialData, defaultClientId, clients]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEdit && (!code || code === name.toUpperCase().slice(0, 6))) {
      setCode(val.trim().toUpperCase().slice(0, 8));
    }
    if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!clientId) {
      newErrors.clientId = "Klien wajib dipilih";
    }

    if (!name.trim()) {
      newErrors.name = "Nama proyek wajib diisi";
    }

    const codeTrimmed = code.trim().toUpperCase();
    if (!codeTrimmed) {
      newErrors.code = "Kode proyek wajib diisi";
    } else {
      // Check duplicate within the selected client
      const isDuplicate = existingProjects.some(
        (p) =>
          p.id !== initialData?.id &&
          p.clientId === clientId &&
          p.code.toUpperCase() === codeTrimmed,
      );
      if (isDuplicate) {
        newErrors.code = `Kode "${codeTrimmed}" sudah digunakan pada klien ini`;
      }
    }

    if (!detail.trim()) {
      newErrors.detail = "Deskripsi / lingkup layanan wajib diisi";
    }

    setErrors(newErrors);

    if (newErrors.name && nameInputRef.current) {
      nameInputRef.current.focus();
    } else if (newErrors.code && codeInputRef.current) {
      codeInputRef.current.focus();
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const payload: CreateProjectInput | UpdateProjectInput = isEdit
        ? {
            name: name.trim(),
            fullName: fullName.trim() || name.trim(),
            code: code.trim().toUpperCase(),
            detail: detail.trim(),
            leadEngineer: leadEngineer.trim() || undefined,
            healthDefault,
          }
        : {
            clientId,
            name: name.trim(),
            fullName: fullName.trim() || name.trim(),
            code: code.trim().toUpperCase(),
            detail: detail.trim(),
            leadEngineer: leadEngineer.trim() || undefined,
            healthDefault,
          };

      await onSave(payload);
      onClose();
    } catch {
      // Handled in parent
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDirty = isEdit
    ? clientId !== initialData?.clientId ||
      name !== initialData?.name ||
      fullName !== (initialData?.fullName || initialData?.name) ||
      code !== initialData?.code ||
      detail !== (initialData?.detail || "") ||
      leadEngineer !== (initialData?.leadEngineer || "") ||
      healthDefault !== (initialData?.healthDefault || "healthy")
    : name.length > 0 || code.length > 0 || detail.length > 0;

  const handleClose = () => {
    if (isDirty) {
      if (window.confirm("Ada perubahan data yang belum disimpan. Yakin ingin menutup form?")) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const isValid = name.trim().length > 0 && code.trim().length > 0 && detail.trim().length > 0;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      label={isEdit ? "Ubah Data Proyek" : "Tambah Proyek Baru"}
      variant="form"
      width={600}
    >
      <form onSubmit={handleSubmit} className="flex flex-col h-full bg-[#1e293b] text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/70 bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/25 text-sky-400">
              <Layers size={18} />
            </span>
            <div>
              <h2 className="text-[15px] font-bold text-slate-100 leading-snug">
                {initialData ? `Ubah Proyek: ${initialData.name}` : "Tambah Proyek Layanan Baru"}
              </h2>
              <p className="text-[11.5px] text-slate-400">
                {initialData ? "Sesuaikan parameter proyek" : "Daftarkan proyek baru di bawah organisasi klien"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Tutup modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4 overflow-y-auto max-h-[70vh] [scrollbar-width:thin]">
          {/* Baris 1: Klien Terkait & Status */}
          <div className="grid grid-cols-2 max-[540px]:grid-cols-1 gap-3.5">
            <div>
              <label htmlFor="project-client-select" className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Organisasi Klien <span className="text-rose-400">*</span>
              </label>
              <select
                id="project-client-select"
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  if (errors.clientId) setErrors((prev) => ({ ...prev, clientId: "" }));
                }}
                disabled={isEdit}
                className="w-full h-[38px] px-3 rounded-lg text-[13px] bg-slate-900/80 border border-slate-700 text-white focus:outline-none focus:border-sky-400 disabled:opacity-50 disabled:bg-slate-800 cursor-pointer"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-800 text-white">
                    {c.shortName || c.name} ({c.code})
                  </option>
                ))}
              </select>
              {initialData && (
                <p className="text-[10px] text-slate-400 mt-1 font-mono">
                  ID: <span className="text-slate-300">{initialData.id}</span>
                </p>
              )}
            </div>

            <div>
              <label htmlFor="project-health-select" className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Status Kesehatan Standar
              </label>
              <select
                id="project-health-select"
                value={healthDefault}
                onChange={(e) => setHealthDefault(e.target.value as ProjectHealthDefault)}
                className="w-full h-[38px] px-3 rounded-lg text-[13px] bg-slate-900/80 border border-slate-700 text-white focus:outline-none focus:border-sky-400 cursor-pointer"
              >
                {HEALTH_OPTIONS.map((h) => (
                  <option key={h.value} value={h.value} className="bg-slate-800 text-white">
                    {h.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Baris 2: Nama & Kode Proyek */}
          <div className="grid grid-cols-2 max-[540px]:grid-cols-1 gap-3.5">
            <div>
              <label htmlFor="project-name-input" className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Nama Singkat Proyek <span className="text-rose-400">*</span>
              </label>
              <input
                id="project-name-input"
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Contoh: SM, EPC Core, B2B"
                aria-invalid={Boolean(errors.name)}
                className={`w-full h-[38px] px-3 rounded-lg text-[13px] bg-slate-900/80 border ${
                  errors.name ? "border-rose-500" : "border-slate-700 focus:border-sky-400"
                } text-white focus:outline-none`}
              />
              {errors.name && <p className="text-[11px] text-rose-400 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="project-code-input" className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5 font-mono">
                Kode Proyek <span className="text-rose-400">*</span>
              </label>
              <input
                id="project-code-input"
                ref={codeInputRef}
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  if (errors.code) setErrors((prev) => ({ ...prev, code: "" }));
                }}
                placeholder="Misal: SM, EPC"
                maxLength={10}
                aria-invalid={Boolean(errors.code)}
                className={`w-full h-[38px] px-3 rounded-lg text-[13px] font-mono font-bold bg-slate-900/80 border ${
                  errors.code ? "border-rose-500" : "border-slate-700 focus:border-sky-400"
                } text-white focus:outline-none`}
              />
              {errors.code && (
                <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.code}
                </p>
              )}
            </div>
          </div>

          {/* Baris 3: Nama Lengkap & Lead Engineer */}
          <div className="grid grid-cols-2 max-[540px]:grid-cols-1 gap-3.5">
            <div>
              <label htmlFor="project-fullname-input" className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Nama Lengkap Layanan
              </label>
              <input
                id="project-fullname-input"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Contoh: Service Management & Middleware"
                className="w-full h-[38px] px-3 rounded-lg text-[13px] bg-slate-900/80 border border-slate-700 text-white focus:outline-none focus:border-sky-400"
              />
            </div>

            <div>
              <label htmlFor="project-lead-input" className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Lead Engineer / PIC Teknis
              </label>
              <input
                id="project-lead-input"
                type="text"
                value={leadEngineer}
                onChange={(e) => setLeadEngineer(e.target.value)}
                placeholder="Contoh: Muhammad Ihsanul Arifin"
                className="w-full h-[38px] px-3 rounded-lg text-[13px] bg-slate-900/80 border border-slate-700 text-white focus:outline-none focus:border-sky-400"
              />
            </div>
          </div>

          {/* Baris 4: Detail / Lingkup */}
          <div>
            <label htmlFor="project-detail-input" className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Lingkup / Observasi Health Default <span className="text-rose-400">*</span>
            </label>
            <textarea
              id="project-detail-input"
              rows={2}
              value={detail}
              onChange={(e) => {
                setDetail(e.target.value);
                if (errors.detail) setErrors((prev) => ({ ...prev, detail: "" }));
              }}
              placeholder="Contoh: ActiveMQ queue buffer normal, throughput stabil 1.2k/s"
              aria-invalid={Boolean(errors.detail)}
              className={`w-full p-2.5 rounded-lg text-[12.5px] bg-slate-900/80 border ${
                errors.detail ? "border-rose-500" : "border-slate-700 focus:border-sky-400"
              } text-white focus:outline-none resize-none`}
            />
            {errors.detail && <p className="text-[11px] text-rose-400 mt-1">{errors.detail}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-700/70 bg-slate-900/60 shrink-0">
          <p className="text-[11px] text-slate-400">
            <span className="text-rose-400">*</span> Wajib diisi
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 rounded-lg text-[12px] font-semibold text-slate-300 bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-bold text-white bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_0_12px_rgba(56,189,248,0.3)] cursor-pointer"
            >
              <Check size={14} />
              <span>{isSubmitting ? "Menyimpan..." : isEdit ? "Perbarui Proyek" : "Simpan Proyek"}</span>
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
