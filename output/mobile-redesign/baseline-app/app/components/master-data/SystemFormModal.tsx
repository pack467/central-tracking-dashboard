"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Cpu, X, Check, AlertCircle } from "lucide-react";
import { Modal } from "@/app/components/ui/Modal";
import type {
  ClientOrganization,
  ProjectMaster,
  SystemMaster,
  CreateSystemInput,
  UpdateSystemInput,
  SystemCriticality,
  SystemEnvironment,
  SystemStatus,
} from "@/app/types/master-data";

interface SystemFormModalProps {
  open: boolean;
  initialData?: SystemMaster | null;
  defaultClientId?: string;
  defaultProjectId?: string;
  clients: readonly ClientOrganization[];
  projects: readonly ProjectMaster[];
  onSave: (data: CreateSystemInput | UpdateSystemInput) => Promise<void>;
  onClose: () => void;
}

const CRITICALITY_OPTIONS: { value: SystemCriticality; label: string; badge: string }[] = [
  { value: "critical", label: "Critical", badge: "bg-rose-500/20 text-rose-400 border border-rose-500/30" },
  { value: "high", label: "High", badge: "bg-amber-500/20 text-amber-400 border border-amber-500/30" },
  { value: "medium", label: "Medium", badge: "bg-sky-500/20 text-sky-400 border border-sky-500/30" },
  { value: "low", label: "Low", badge: "bg-slate-500/20 text-slate-400 border border-slate-500/30" },
];

const ENVIRONMENT_OPTIONS: SystemEnvironment[] = ["Production", "Staging", "DRC"];
const STATUS_OPTIONS: SystemStatus[] = ["active", "maintenance", "deprecated"];

export function SystemFormModal({
  open,
  initialData,
  defaultClientId,
  defaultProjectId,
  clients,
  projects,
  onSave,
  onClose,
}: SystemFormModalProps) {
  const isEdit = Boolean(initialData);

  const [clientId, setClientId] = useState(defaultClientId || clients[0]?.id || "tritronik");
  const [projectId, setProjectId] = useState(defaultProjectId || "");
  const [name, setName] = useState("");
  const [criticality, setCriticality] = useState<SystemCriticality>("high");
  const [environment, setEnvironment] = useState<SystemEnvironment>("Production");
  const [status, setStatus] = useState<SystemStatus>("active");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Available projects for the selected client
  const availableProjects = useMemo(() => {
    return projects.filter((p) => p.clientId === clientId && p.status === "active");
  }, [projects, clientId]);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setClientId(initialData.clientId);
        setProjectId(initialData.projectId);
        setName(initialData.name);
        setCriticality(initialData.criticality);
        setEnvironment(initialData.environment);
        setStatus(initialData.status);
      } else {
        const initClient = defaultClientId || clients[0]?.id || "tritronik";
        setClientId(initClient);
        const clientProjs = projects.filter((p) => p.clientId === initClient && p.status === "active");
        setProjectId(defaultProjectId || clientProjs[0]?.id || "");
        setName("");
        setCriticality("high");
        setEnvironment("Production");
        setStatus("active");
      }
      setErrors({});
      setIsSubmitting(false);
    }
  }, [open, initialData, defaultClientId, defaultProjectId, clients, projects]);

  // When client changes, auto-select first available project if current project doesn't belong to it
  const handleClientChange = (newClientId: string) => {
    setClientId(newClientId);
    const matched = projects.filter((p) => p.clientId === newClientId && p.status === "active");
    if (!matched.some((p) => p.id === projectId)) {
      setProjectId(matched[0]?.id || "");
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!clientId) newErrors.clientId = "Klien wajib dipilih";
    if (!projectId) newErrors.projectId = "Proyek wajib dipilih";
    if (!name.trim()) newErrors.name = "Nama sistem wajib diisi";

    setErrors(newErrors);

    if (newErrors.name && nameInputRef.current) {
      nameInputRef.current.focus();
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const payload: CreateSystemInput | UpdateSystemInput = isEdit
        ? {
            name: name.trim(),
            projectId,
            criticality,
            environment,
            status,
          }
        : {
            clientId,
            projectId,
            name: name.trim(),
            criticality,
            environment,
            status,
          };

      await onSave(payload);
      onClose();
    } catch {
      // Error handled in parent
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDirty = isEdit
    ? clientId !== initialData?.clientId ||
      projectId !== initialData?.projectId ||
      name !== initialData?.name ||
      criticality !== initialData?.criticality ||
      environment !== initialData?.environment ||
      status !== (initialData?.status || "active")
    : name.length > 0;

  const handleClose = () => {
    if (isDirty) {
      if (window.confirm("Ada perubahan data yang belum disimpan. Yakin ingin menutup form?")) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const isValid = name.trim().length > 0 && Boolean(projectId);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      label={isEdit ? "Ubah Data Sistem" : "Tambah Sistem Baru"}
      variant="form"
      width={560}
    >
      <form onSubmit={handleSubmit} className="flex flex-col h-full bg-[#1e293b] text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/70 bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/25 text-sky-400">
              <Cpu size={18} />
            </span>
            <div>
              <h2 className="text-[15px] font-bold text-slate-100 leading-snug">
                {initialData ? `Ubah Sistem: ${initialData.name}` : "Tambah Sistem / Modul Baru"}
              </h2>
              <p className="text-[11.5px] text-slate-400">
                {initialData ? "Perbarui informasi sub-layanan" : "Daftarkan komponen sistem yang dimonitor"}
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
          {/* Cascaded Row: Klien & Proyek */}
          <div className="grid grid-cols-2 max-[540px]:grid-cols-1 gap-3.5">
            <div>
              <label htmlFor="system-client-select" className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Klien <span className="text-rose-400">*</span>
              </label>
              <select
                id="system-client-select"
                value={clientId}
                onChange={(e) => handleClientChange(e.target.value)}
                disabled={isEdit}
                className="w-full h-[38px] px-3 rounded-lg text-[13px] bg-slate-900/80 border border-slate-700 text-white focus:outline-none focus:border-sky-400 disabled:opacity-50 cursor-pointer"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-800 text-white">
                    {c.shortName || c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="system-project-select" className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Proyek Terkait <span className="text-rose-400">*</span>
              </label>
              <select
                id="system-project-select"
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  if (errors.projectId) setErrors((prev) => ({ ...prev, projectId: "" }));
                }}
                className="w-full h-[38px] px-3 rounded-lg text-[13px] bg-slate-900/80 border border-slate-700 text-white focus:outline-none focus:border-sky-400 cursor-pointer"
              >
                {availableProjects.length === 0 ? (
                  <option value="" disabled>Belum ada proyek aktif</option>
                ) : (
                  availableProjects.map((p) => (
                    <option key={p.id} value={p.id} className="bg-slate-800 text-white">
                      {p.name} ({p.code})
                    </option>
                  ))
                )}
              </select>
              {errors.projectId && <p className="text-[11px] text-rose-400 mt-1">{errors.projectId}</p>}
            </div>
          </div>

          {/* Nama Sistem */}
          <div>
            <label htmlFor="system-name-input" className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Nama Sistem / Sub-Layanan <span className="text-rose-400">*</span>
            </label>
            <input
              id="system-name-input"
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
              }}
              placeholder="Contoh: OCS Billing, Switching ATM, Kafka SIEM"
              aria-invalid={Boolean(errors.name)}
              className={`w-full h-[38px] px-3 rounded-lg text-[13px] bg-slate-900/80 border ${
                errors.name ? "border-rose-500" : "border-slate-700 focus:border-sky-400"
              } text-white focus:outline-none`}
            />
            {errors.name && (
              <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.name}
              </p>
            )}
          </div>

          {/* Baris 3: Kriticalitas & Environment */}
          <div className="grid grid-cols-2 max-[540px]:grid-cols-1 gap-3.5">
            <div>
              <label htmlFor="system-criticality-select" className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Kriticalitas Layanan
              </label>
              <select
                id="system-criticality-select"
                value={criticality}
                onChange={(e) => setCriticality(e.target.value as SystemCriticality)}
                className="w-full h-[38px] px-3 rounded-lg text-[13px] bg-slate-900/80 border border-slate-700 text-white focus:outline-none focus:border-sky-400 cursor-pointer"
              >
                {CRITICALITY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value} className="bg-slate-800 text-white">
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="system-env-select" className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Environment
              </label>
              <select
                id="system-env-select"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as SystemEnvironment)}
                className="w-full h-[38px] px-3 rounded-lg text-[13px] bg-slate-900/80 border border-slate-700 text-white focus:outline-none focus:border-sky-400 cursor-pointer"
              >
                {ENVIRONMENT_OPTIONS.map((env) => (
                  <option key={env} value={env} className="bg-slate-800 text-white">
                    {env}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status jika edit */}
          {isEdit && (
            <div>
              <label htmlFor="system-status-select" className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Status Operasional
              </label>
              <select
                id="system-status-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as SystemStatus)}
                className="w-full h-[38px] px-3 rounded-lg text-[13px] bg-slate-900/80 border border-slate-700 text-white focus:outline-none focus:border-sky-400 cursor-pointer"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s} className="bg-slate-800 text-white capitalize">
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}
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
              <span>{isSubmitting ? "Menyimpan..." : isEdit ? "Perbarui Sistem" : "Simpan Sistem"}</span>
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
