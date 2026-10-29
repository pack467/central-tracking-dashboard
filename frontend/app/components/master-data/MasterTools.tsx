"use client";
import { useEffect, useRef, useState } from "react";
import { Download, MoreVertical, RotateCcw, Upload, X } from "lucide-react";
import { Modal } from "@/app/components/ui/Modal";
import { useAuth } from "@/app/lib/auth";
import { useToast } from "@/app/components/ui/Toast";
import { canBackupManage, masterRole } from "@/app/lib/permissions";
import { masterDataV2 } from "@/app/services/master-data-v2";
import type { RestorePreview } from "@/app/lib/master-backup";
import { buttonClass, primaryClass, iconClass, inputClass } from "./master-ui";

const MAX_BYTES = 5 * 1024 * 1024;
function defaultFileName(): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const get = (type: string) => parts.find(part => part.type === type)?.value || "00";
  return `master-data-backup-${get("year")}${get("month")}${get("day")}-${get("hour")}${get("minute")}.json`;
}
function safeFileName(value: string): string { const base = value.trim().replace(/[\\/:*?"<>|]+/g, "-").slice(0, 120) || "master-data-backup"; return base.toLowerCase().endsWith(".json") ? base : `${base}.json`; }

export function MasterTools({ onRestored }: { onRestored?: () => void }) {
  const { user } = useAuth(), toast = useToast(), role = masterRole(user || undefined);
  const [menu, setMenu] = useState(false), [mode, setMode] = useState<"download" | "restore" | null>(null);
  const [fileName, setFileName] = useState(defaultFileName);
  const [preview, setPreview] = useState<RestorePreview>();
  const [content, setContent] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const root = useRef<HTMLDivElement>(null), fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!menu) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setMenu(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setMenu(false); };
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [menu]);
  if (!canBackupManage(role)) return null;
  function open(next: "download" | "restore") { setMenu(false); setError(""); setConfirmed(false); setPreview(undefined); setContent(""); setSelectedName(""); if (next === "download") setFileName(defaultFileName()); setMode(next); }
  function close() { if (busy) return; setMode(null); setError(""); setPreview(undefined); setContent(""); setConfirmed(false); }
  async function download() {
    setBusy(true); setError("");
    try {
      const backup = await masterDataV2.buildBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = safeFileName(fileName);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      toast.success("Cadangan Master Data diunduh.");
      setMode(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal membuat cadangan.");
    } finally {
      setBusy(false);
    }
  }
  async function chooseFile(file: File | undefined) {
    if (!file) return;
    setError(""); setPreview(undefined); setConfirmed(false);
    if (file.size > MAX_BYTES) { setError("Ukuran file melebihi 5 MB."); return; }
    if (!file.name.toLowerCase().endsWith(".json") || file.type && !["application/json", "text/json", "text/plain"].includes(file.type)) {
      setError("Pilih file JSON yang valid.");
      return;
    }
    setBusy(true); setSelectedName(file.name);
    try {
      const text = await file.text();
      setContent(text);
      const result = await masterDataV2.previewRestore(text, file.name);
      setPreview(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "File cadangan tidak dapat dibaca.");
      setContent("");
    } finally {
      setBusy(false);
    }
  }
  async function restore() {
    if (!content || !preview || !confirmed) return;
    setBusy(true); setError("");
    try {
      await masterDataV2.restoreBackup(content, selectedName || preview.fileName);
      toast.success("Cadangan Master Data dipulihkan.");
      setMode(null);
      onRestored?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal memulihkan cadangan. Data lama tetap utuh.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="relative" ref={root}>
        <button
          type="button"
          className={iconClass}
          aria-label="Alat Master Data"
          aria-haspopup="menu"
          aria-expanded={menu}
          onClick={() => setMenu(value => !value)}
        >
          <MoreVertical size={19} />
        </button>
        {menu && (
          <div
            role="menu"
            aria-label="Alat Master Data"
            className="absolute right-0 top-full z-40 mt-1 w-56 rounded-xl border border-slate-600 bg-slate-800 p-1 shadow-xl"
          >
            <button
              type="button"
              role="menuitem"
              className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-slate-100 hover:bg-slate-700"
              onClick={() => open("download")}
            ><Download size={16} className="text-sky-300" />Unduh cadangan</button>
            <button
              type="button"
              role="menuitem"
              className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-slate-100 hover:bg-slate-700"
              onClick={() => open("restore")}
            ><Upload size={16} className="text-amber-300" />Pulihkan cadangan</button>
          </div>
        )}
      </div>
      <Modal open={mode === "download"} onClose={close} variant="master-form" label="Unduh cadangan Master Data">
        <header className="flex items-center gap-3 border-b border-slate-700 px-4 py-3">
          <h2 className="min-w-0 flex-1 text-base font-bold">Unduh cadangan</h2>
          <button type="button" className={iconClass} onClick={close} aria-label="Tutup unduh cadangan"><X size={20} /></button>
        </header>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 pb-[max(20px,env(safe-area-inset-bottom))]">
          <p className="text-sm text-slate-300">Cadangan berisi data Master Data (organisasi, proyek, sistem, kategori, severity, keputusan pemetaan, alias, dan riwayat). Bukan seluruh localStorage; tidak ada token atau kredensial.</p>
          <div>
            <label htmlFor="backup-file-name" className="block text-xs font-semibold text-slate-200">Nama file</label>
            <input
              id="backup-file-name"
              className={`${inputClass} mt-1.5`}
              value={fileName}
              maxLength={120}
              onChange={event => setFileName(event.target.value)}
            />
          </div>
          <p className="text-[11px] text-slate-400">Tersimpan di browser ini; bagikan file secara aman jika perlu.</p>
          {error && <p role="alert" className="text-sm text-rose-200">{error}</p>}
        </div>
        <footer className="flex shrink-0 justify-end gap-2 border-t border-slate-700 p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
          <button type="button" className={buttonClass} disabled={busy} onClick={close}>Batal</button>
          <button type="button" className={primaryClass} disabled={busy} onClick={() => void download()}>
            <Download size={16} />
            {busy ? "Menyiapkan…" : "Unduh"}
          </button>
        </footer>
      </Modal>
      <Modal open={mode === "restore"} onClose={close} variant="master-form" label="Pulihkan cadangan Master Data">
        <header className="flex items-center gap-3 border-b border-slate-700 px-4 py-3">
          <h2 className="min-w-0 flex-1 text-base font-bold">Pulihkan cadangan</h2>
          <button type="button" className={iconClass} onClick={close} aria-label="Tutup pulihkan cadangan"><X size={20} /></button>
        </header>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 pb-[max(20px,env(safe-area-inset-bottom))]">
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={event => void chooseFile(event.target.files?.[0])}
          />
          <button type="button" className={buttonClass} disabled={busy} onClick={() => fileRef.current?.click()}>
            <Upload size={16} />
            {selectedName || "Pilih file JSON"}
          </button>
          <p className="text-[11px] text-slate-400">Maksimal 5 MB. Data lokal akan diganti setelah pratinjau dan konfirmasi.</p>
          {busy && !preview && <p role="status" className="text-sm text-slate-400">Memeriksa file…</p>}
          {error && <p role="alert" className="rounded-lg border border-rose-700 bg-rose-950 p-3 text-sm text-rose-200">{error}</p>}
          {preview && (
            <>
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-3">
                <p className="text-sm font-semibold text-slate-100">Pratinjau {preview.backupVersion === "v2" ? "cadangan v2 lama" : "cadangan"}</p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  {([["Organisasi", preview.counts.organizations], ["Proyek", preview.counts.projects], ["Sistem", preview.counts.systems], ["Kategori", preview.counts.categories], ["Severity", preview.counts.severities], ["Pemetaan", preview.counts.mappingDecisions]] as [string, number][]).map(([label, count]) => (
                    <div key={label}>
                      <strong className="block font-dashboard-mono text-base text-slate-50">{count}</strong>
                      <span className="text-[11px] text-slate-400">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg border border-emerald-700 bg-emerald-950 p-2 text-emerald-200">+{preview.added}</div>
                <div className="rounded-lg border border-sky-700 bg-sky-950 p-2 text-sky-200">{preview.updated} berubah</div>
                <div className="rounded-lg border border-rose-700 bg-rose-950 p-2 text-rose-200">-{preview.removed}</div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-200">Organisasi tercakup</p>
                <p className="mt-1 text-xs text-slate-300">
                  {preview.organizations.slice(0, 6).map(org => org.name).join(", ")}
                  {preview.organizations.length > 6 ? `, +${preview.organizations.length - 6}` : ""}
                </p>
              </div>
              {preview.conflicts.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-amber-200">Konflik ID (isi berbeda)</p>
                  <ul className="mt-1 space-y-1 text-[11px] text-amber-200">
                    {preview.conflicts.slice(0, 5).map(conflict => (
                      <li key={`${conflict.collection}:${conflict.id}`}>{conflict.collection}: {conflict.label}</li>
                    ))}
                  </ul>
                  {preview.conflicts.length > 5 && <p className="mt-1 text-[11px] text-slate-400">+{preview.conflicts.length - 5} lainnya.</p>}
                </div>
              )}
              <div className="rounded-lg border border-amber-700 bg-amber-950 p-3 text-xs text-amber-200">
                {preview.warnings.map(warning => <p key={warning}>{warning}</p>)}
                <p className="mt-1">Salinan data sebelumnya disimpan otomatis sebagai cadangan pemulihan.</p>
              </div>
              <label className="flex min-h-11 items-start gap-3 rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm text-slate-200"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} className="mt-0.5 size-5 shrink-0 accent-sky-400" />Saya memahami data Master Data lokal akan diganti.</label>
            </>
          )}
        </div>
        <footer className="flex shrink-0 justify-end gap-2 border-t border-slate-700 p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
          <button type="button" className={buttonClass} disabled={busy} onClick={close}>Batal</button>
          <button type="button" className={primaryClass} disabled={busy || !preview || !confirmed} onClick={() => void restore()}>
            <RotateCcw size={16} />
            {busy ? "Memulihkan…" : "Pulihkan"}
          </button>
        </footer>
      </Modal>
    </>
  );
}


