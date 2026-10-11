"use client";

import { useRef, useState } from "react";
import { ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { formatReportDate, type SignatoryConfig } from "@/app/lib/weekly-report";
import { reportButtonClass, reportInputClass } from "./report-styles";

const MAX_SIGNATURE_BYTES = 5 * 1024 * 1024;

async function readSignaturePng(file: File): Promise<string> {
  if (file.type !== "image/png" || !/\.png$/i.test(file.name)) {
    throw new Error("Gunakan gambar tanda tangan berformat PNG.");
  }
  if (file.size > MAX_SIGNATURE_BYTES) throw new Error("Ukuran gambar maksimal 5 MB.");
  const header = new Uint8Array(await file.slice(0, 24).arrayBuffer());
  if (![137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => header[index] === value) || header.length < 24) {
    throw new Error("File PNG tidak valid. Pilih gambar lain.");
  }
  const dimensions = new DataView(header.buffer);
  const width = dimensions.getUint32(16);
  const height = dimensions.getUint32(20);
  if (!width || !height || width > 8192 || height > 8192 || width * height > 16_000_000) {
    throw new Error("Dimensi gambar maksimal 8192 px per sisi dan 16 megapiksel.");
  }
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("Gambar tidak dapat dibaca. Pilih PNG yang valid.");
  });
  bitmap.close();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Gambar belum berhasil dibaca.")));
    reader.onerror = () => reject(new Error("Gambar belum berhasil dibaca."));
    reader.readAsDataURL(file);
  });
}

export function ReportSignatoryFields({
  kind,
  value,
  creationDate,
  disabled,
  onChange,
  onLoadingChange,
}: {
  kind: "prepared" | "approved";
  value: SignatoryConfig;
  creationDate: string;
  disabled: boolean;
  onChange: (next: SignatoryConfig) => void;
  onLoadingChange: (loading: boolean) => void;
}) {
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const loadSequence = useRef(0);
  const label = kind === "prepared" ? "penyusun" : "pemberi persetujuan";
  const id = `report-signatory-${kind}`;

  async function chooseSignature(file?: File) {
    if (!file) return;
    const sequence = ++loadSequence.current;
    setError("");
    setReading(true);
    onLoadingChange(true);
    try {
      const signature = await readSignaturePng(file);
      if (sequence === loadSequence.current) onChange({ ...value, signature_image_path: signature });
    } catch (cause) {
      if (sequence === loadSequence.current) setError(cause instanceof Error ? cause.message : "Gambar belum berhasil dibaca.");
    } finally {
      if (sequence === loadSequence.current) {
        setReading(false);
        onLoadingChange(false);
      }
    }
  }

  return (
    <fieldset disabled={disabled || reading} className="min-w-0 rounded-[10px] border border-[#334155] bg-[#0f172a]/70 p-4">
      <legend className="px-2 text-[11.5px] font-bold uppercase tracking-wider text-[#38bdf8]">
        {kind === "prepared" ? "Disusun oleh" : "Disetujui oleh"}
      </legend>
      <div className="grid gap-3.5">
        <div className="space-y-1">
          <label htmlFor={`${id}-name`} className="block text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8]">
            Nama lengkap {label}
          </label>
          <input
            id={`${id}-name`}
            className={reportInputClass}
            maxLength={100}
            value={value.name}
            placeholder={`Nama ${label}`}
            onChange={(event) => onChange({ ...value, name: event.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor={`${id}-title`} className="block text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8]">
            Jabatan {label}
          </label>
          <input
            id={`${id}-title`}
            className={reportInputClass}
            maxLength={100}
            value={value.title}
            onChange={(event) => onChange({ ...value, title: event.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor={`${id}-date`} className="block text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8]">
            Tanggal {label}
          </label>
          <input
            id={`${id}-date`}
            type="date"
            className={reportInputClass}
            value={value.date || creationDate}
            onInput={(event) => onChange({ ...value, date: event.currentTarget.value || undefined })}
          />
          {value.date && (
            <button
              type="button"
              className="mt-1 text-left text-[11px] font-medium text-[#38bdf8] hover:underline focus-visible:outline-none cursor-pointer"
              onClick={() => onChange({ ...value, date: undefined })}
            >
              Gunakan tanggal pembuatan ({formatReportDate(creationDate)})
            </button>
          )}
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${id}-signature`} className="block text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8]">
            Gambar tanda tangan {label} (opsional)
          </label>
          <p id={`${id}-help`} className="text-[11px] leading-relaxed text-[#94a3b8]/80">
            PNG transparan, maksimal 5 MB. Gambar diproses langsung di browser.
          </p>
          <input
            id={`${id}-signature`}
            type="file"
            accept="image/png,.png"
            aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`}
            className="block h-[38px] w-full min-w-0 rounded-[8px] border border-[#334155] bg-[#0f172a] px-2 py-1.5 text-xs text-[#cbd5e1] file:mr-2 file:h-[26px] file:rounded-[6px] file:border-0 file:bg-[#38bdf8]/15 file:px-2.5 file:text-[11px] file:font-semibold file:text-[#38bdf8] hover:border-[#475569] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8] disabled:opacity-50 cursor-pointer"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              void chooseSignature(file);
            }}
          />
          {reading && (
            <p role="status" className="flex items-center gap-2 text-xs text-[#94a3b8]">
              <LoaderCircle size={14} className="animate-spin text-[#38bdf8]" />
              Memeriksa gambar…
            </p>
          )}
          {error && (
            <p id={`${id}-error`} role="alert" className="text-xs font-medium text-[#f87171]">
              {error}
            </p>
          )}
          {value.signature_image_path ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] border border-[#334155] bg-[#1e293b]/60 p-3">
              <svg viewBox="0 0 200 80" role="img" aria-label={`Pratinjau tanda tangan ${label}`} className="h-16 w-36 max-w-full rounded-md bg-white p-2 shadow-xs">
                <image href={value.signature_image_path} width="200" height="80" preserveAspectRatio="xMidYMid meet" />
              </svg>
              <button
                type="button"
                className="inline-flex h-[32px] items-center gap-1.5 rounded-[6px] border border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.1)] px-3 text-[11px] font-semibold text-[#f87171] hover:bg-[rgba(248,113,113,0.2)] transition cursor-pointer"
                onClick={() => {
                  setError("");
                  onChange({ ...value, signature_image_path: null });
                }}
              >
                <Trash2 size={13} />
                <span>Hapus gambar</span>
              </button>
            </div>
          ) : (
            <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-[#94a3b8]/70">
              <ImagePlus size={13} className="mt-0.5 shrink-0 text-[#94a3b8]" />
              Ruang tanda tangan kosong dan garis di dalam sel akan disediakan pada PDF.
            </p>
          )}
        </div>
      </div>
    </fieldset>
  );
}
