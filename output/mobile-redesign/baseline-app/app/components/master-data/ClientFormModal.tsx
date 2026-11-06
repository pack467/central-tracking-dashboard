"use client";

import React, { useState, useEffect, useRef } from "react";
import { Building2, X, Check, AlertCircle } from "lucide-react";
import { Modal } from "@/app/components/ui/Modal";
import type {
  ClientOrganization,
  ClientTier,
  CreateClientInput,
  UpdateClientInput,
} from "@/app/types/master-data";

interface ClientFormModalProps {
  open: boolean;
  initialData?: ClientOrganization | null;
  existingClients: readonly ClientOrganization[];
  onSave: (data: CreateClientInput | UpdateClientInput) => Promise<void>;
  onClose: () => void;
}

const TIER_OPTIONS: ClientTier[] = [
  "Enterprise NOC",
  "Mission Critical",
  "Dedicated SLA",
  "Enterprise",
  "Standard",
  "Internal",
];

export function ClientFormModal({
  open,
  initialData,
  existingClients,
  onSave,
  onClose,
}: ClientFormModalProps) {
  const isEdit = Boolean(initialData);

  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [code, setCode] = useState("");
  const [tier, setTier] = useState<ClientTier>("Enterprise NOC");
  const [picName, setPicName] = useState("");
  const [picEmail, setPicEmail] = useState("");
  const [picPhone, setPicPhone] = useState("");
  const [description, setDescription] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const codeInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Sync state when opening
  useEffect(() => {
    if (open) {
      if (initialData) {
        setName(initialData.name || "");
        setShortName(initialData.shortName || "");
        setCode(initialData.code || "");
        setTier(initialData.tier || "Enterprise NOC");
        setPicName(initialData.picName || "");
        setPicEmail(initialData.picEmail || "");
        setPicPhone(initialData.picPhone || "");
        setDescription(initialData.description || initialData.tagline || "");
      } else {
        setName("");
        setShortName("");
        setCode("");
        setTier("Enterprise NOC");
        setPicName("");
        setPicEmail("");
        setPicPhone("");
        setDescription("");
      }
      setErrors({});
      setIsSubmitting(false);
    }
  }, [open, initialData]);

  // Auto-generate code from name if creating and code wasn't manually typed
  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEdit && (!code || code === generateCode(name))) {
      setCode(generateCode(val));
    }
    if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
  };

  const generateCode = (str: string) => {
    const cleaned = str.trim().toUpperCase();
    if (!cleaned) return "";
    const words = cleaned.split(/\s+/);
    if (words.length > 1) {
      return words.map((w) => w[0]).join("").slice(0, 6);
    }
    return cleaned.slice(0, 5);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Nama klien wajib diisi";
    }

    const codeTrimmed = code.trim().toUpperCase();
    if (!codeTrimmed) {
      newErrors.code = "Kode klien wajib diisi";
    } else {
      const isDuplicate = existingClients.some(
        (c) => c.id !== initialData?.id && c.code.toUpperCase() === codeTrimmed,
      );
      if (isDuplicate) {
        newErrors.code = `Kode "${codeTrimmed}" sudah digunakan oleh klien lain`;
      }
    }

    if (!picName.trim()) {
      newErrors.picName = "Nama PIC wajib diisi";
    }

    if (!picEmail.trim()) {
      newErrors.picEmail = "Email PIC wajib diisi";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(picEmail.trim())) {
      newErrors.picEmail = "Format email tidak valid (contoh: user@company.com)";
    }

    setErrors(newErrors);

    // Focus first error field
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
      const payload: CreateClientInput | UpdateClientInput = {
        name: name.trim(),
        shortName: shortName.trim() || name.trim(),
        code: code.trim().toUpperCase(),
        tier,
        picName: picName.trim(),
        picEmail: picEmail.trim(),
        picPhone: picPhone.trim() || undefined,
        description: description.trim() || undefined,
      };

      await onSave(payload);
      onClose();
    } catch {
      // Error handled in parent via toast
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDirty = isEdit
    ? name !== (initialData?.name || "") ||
      shortName !== (initialData?.shortName || "") ||
      code !== (initialData?.code || "") ||
      tier !== (initialData?.tier || "Enterprise NOC") ||
      picName !== (initialData?.picName || "") ||
      picEmail !== (initialData?.picEmail || "") ||
      picPhone !== (initialData?.picPhone || "") ||
      description !== (initialData?.description || initialData?.tagline || "")
    : name.length > 0 || code.length > 0 || picName.length > 0 || picEmail.length > 0;

  const handleClose = () => {
    if (isDirty) {
      if (window.confirm("Ada perubahan data yang belum disimpan. Yakin ingin menutup form?")) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const isValid =
    name.trim().length > 0 &&
    code.trim().length > 0 &&
    picName.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(picEmail.trim());

  return (
    <Modal
      open={open}
      onClose={handleClose}
      label={isEdit ? "Ubah Data Klien" : "Tambah Klien Baru"}
      variant="form"
      width={640}
    >
      <form onSubmit={handleSubmit} className="flex flex-col h-full bg-[#1e293b] text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/70 bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/25 text-sky-400">
              <Building2 size={18} />
            </span>
            <div>
              <h2 className="text-[15px] font-bold text-slate-100 leading-snug">
                {initialData ? `Ubah Data Klien: ${initialData.name}` : "Tambah Klien / Organisasi Baru"}
              </h2>
              <p className="text-[11.5px] text-slate-400">
                {initialData ? "Perbarui informasi organisasi dan PIC" : "Daftarkan profil klien master baru"}
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

        {/* Scrollable Form Body */}
        <div className="p-5 flex flex-col gap-4 overflow-y-auto max-h-[70vh] [scrollbar-width:thin]">
          {/* Baris 1: ID (jika edit) & Kode Klien */}
          <div className="grid grid-cols-2 max-[540px]:grid-cols-1 gap-3.5">
            <div>
              <label htmlFor="client-code-input" className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5 font-mono">
                Kode Klien <span className="text-rose-400">*</span>
              </label>
              <input
                id="client-code-input"
                ref={codeInputRef}
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  if (errors.code) setErrors((prev) => ({ ...prev, code: "" }));
                }}
                disabled={isEdit}
                placeholder="Misal: BNI, TSEL"
                maxLength={10}
                aria-invalid={Boolean(errors.code)}
                aria-describedby={errors.code ? "client-code-err" : undefined}
                className={`w-full h-[38px] px-3 rounded-lg text-[13px] font-mono font-bold bg-slate-900/80 border ${
                  errors.code ? "border-rose-500 focus:ring-rose-500" : "border-slate-700 focus:border-sky-400"
                } text-white focus:outline-none focus:ring-1 focus:ring-sky-400 disabled:opacity-50 disabled:bg-slate-800`}
              />
              {errors.code && (
                <p id="client-code-err" className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.code}
                </p>
              )}
              {initialData && (
                <p className="text-[10px] text-slate-400 mt-1 font-mono">
                  ID: <span className="text-slate-300">{initialData.id}</span> (kode tidak dapat diubah)
                </p>
              )}
            </div>

            <div>
              <label htmlFor="client-tier-select" className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Tier Layanan <span className="text-rose-400">*</span>
              </label>
              <select
                id="client-tier-select"
                value={tier}
                onChange={(e) => setTier(e.target.value as ClientTier)}
                className="w-full h-[38px] px-3 rounded-lg text-[12.5px] bg-slate-900/80 border border-slate-700 text-white focus:outline-none focus:border-sky-400 cursor-pointer"
              >
                {TIER_OPTIONS.map((t) => (
                  <option key={t} value={t} className="bg-slate-800 text-white">
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Baris 2: Nama Lengkap & Nama Ringkas */}
          <div className="grid grid-cols-2 max-[540px]:grid-cols-1 gap-3.5">
            <div>
              <label htmlFor="client-name-input" className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Nama Lengkap Klien <span className="text-rose-400">*</span>
              </label>
              <input
                id="client-name-input"
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Contoh: PT Bank Negara Indonesia Tbk"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "client-name-err" : undefined}
                className={`w-full h-[38px] px-3 rounded-lg text-[13px] bg-slate-900/80 border ${
                  errors.name ? "border-rose-500 focus:ring-rose-500" : "border-slate-700 focus:border-sky-400"
                } text-white focus:outline-none focus:ring-1 focus:ring-sky-400`}
              />
              {errors.name && (
                <p id="client-name-err" className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.name}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="client-shortname-input" className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Nama Singkat / Tampilan
              </label>
              <input
                id="client-shortname-input"
                type="text"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder="Contoh: BNI"
                className="w-full h-[38px] px-3 rounded-lg text-[13px] bg-slate-900/80 border border-slate-700 text-white focus:outline-none focus:border-sky-400"
              />
              <p className="text-[10px] text-slate-400 mt-1">Digunakan pada pemilih klien di header</p>
            </div>
          </div>

          {/* Baris 3: PIC Kontak */}
          <div className="p-3.5 rounded-lg border border-slate-700/60 bg-slate-900/40 flex flex-col gap-3">
            <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">
              Kontak Person In Charge (PIC)
            </span>
            <div className="grid grid-cols-3 max-[600px]:grid-cols-1 gap-3">
              <div>
                <label htmlFor="client-pic-name" className="block text-[10.5px] font-semibold text-slate-300 mb-1">
                  Nama PIC <span className="text-rose-400">*</span>
                </label>
                <input
                  id="client-pic-name"
                  type="text"
                  value={picName}
                  onChange={(e) => {
                    setPicName(e.target.value);
                    if (errors.picName) setErrors((prev) => ({ ...prev, picName: "" }));
                  }}
                  placeholder="Nama narahubung"
                  aria-invalid={Boolean(errors.picName)}
                  className={`w-full h-[34px] px-2.5 rounded-md text-[12px] bg-slate-900 border ${
                    errors.picName ? "border-rose-500" : "border-slate-700 focus:border-sky-400"
                  } text-white focus:outline-none`}
                />
                {errors.picName && <p className="text-[10px] text-rose-400 mt-1">{errors.picName}</p>}
              </div>

              <div>
                <label htmlFor="client-pic-email" className="block text-[10.5px] font-semibold text-slate-300 mb-1">
                  Email PIC <span className="text-rose-400">*</span>
                </label>
                <input
                  id="client-pic-email"
                  type="email"
                  value={picEmail}
                  onChange={(e) => {
                    setPicEmail(e.target.value);
                    if (errors.picEmail) setErrors((prev) => ({ ...prev, picEmail: "" }));
                  }}
                  placeholder="pic@domain.com"
                  aria-invalid={Boolean(errors.picEmail)}
                  className={`w-full h-[34px] px-2.5 rounded-md text-[12px] bg-slate-900 border ${
                    errors.picEmail ? "border-rose-500" : "border-slate-700 focus:border-sky-400"
                  } text-white focus:outline-none`}
                />
                {errors.picEmail && <p className="text-[10px] text-rose-400 mt-1">{errors.picEmail}</p>}
              </div>

              <div>
                <label htmlFor="client-pic-phone" className="block text-[10.5px] font-semibold text-slate-300 mb-1">
                  No. Telepon / HP
                </label>
                <input
                  id="client-pic-phone"
                  type="tel"
                  value={picPhone}
                  onChange={(e) => setPicPhone(e.target.value)}
                  placeholder="+62 81..."
                  className="w-full h-[34px] px-2.5 rounded-md text-[12px] bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-sky-400"
                />
              </div>
            </div>
          </div>

          {/* Deskripsi */}
          <div>
            <label htmlFor="client-desc-input" className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Deskripsi &amp; Lingkup Layanan
            </label>
            <textarea
              id="client-desc-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Catatan ringkas mengenai cakupan layanan monitoring klien ini..."
              className="w-full p-2.5 rounded-lg text-[12.5px] bg-slate-900/80 border border-slate-700 text-white focus:outline-none focus:border-sky-400 resize-none"
            />
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
              <span>{isSubmitting ? "Menyimpan..." : isEdit ? "Perbarui Klien" : "Simpan Klien"}</span>
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
