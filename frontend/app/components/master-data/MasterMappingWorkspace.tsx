"use client";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ExternalLink, Save } from "lucide-react";
import { masterDataV2 } from "@/app/services/master-data-v2";
import { useMasterSync } from "@/app/hooks/useMasterData";
import { canMappingDecide, type MasterRole } from "@/app/lib/permissions";
import { REFERENCE_STATUS_LABELS, SOURCE_LABELS } from "@/app/lib/master-review";
import { operationalLink } from "@/app/lib/master-data-links";
import { Select } from "@/app/components/ui/Select";
import { useToast } from "@/app/components/ui/Toast";
import type {
  AuditEntry,
  LegacyReference,
  MappingAction,
  MappingDecision,
  MappingImpactPreview,
  MasterSnapshotV2
} from "@/app/types/master-data";
import { MasterBadge, buttonClass, primaryClass, inputClass } from "./master-ui";

interface Props {
  reference: LegacyReference;
  catalog: MasterSnapshotV2;
  role: MasterRole;
  onClose: () => void;
  onSaved: (decision: MappingDecision) => void;
}
const ACTION_LABELS: Record<MappingAction, string> = { link: "Hubungkan ke proyek", keepLabel: "Tetap sebagai label operasional", defer: "Tunda" };
const ACTION_SHORT: Record<MappingAction, string> = { link: "Hubungkan", keepLabel: "Tetap label", defer: "Tunda" };
const date = (value: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value));
function usageText(usage?: { tickets: number; checkpoints: number; handovers: number }): string {
  if (!usage) return "—";
  return `${usage.tickets} tiket · ${usage.checkpoints} checkpoint · ${usage.handovers} handover`;
}
function MappingUsage({ label, before, after }: { label: string; before?: { tickets: number; checkpoints: number; handovers: number }; after?: { tickets: number; checkpoints: number; handovers: number } }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-3">
      <p className="text-xs font-semibold text-slate-200">{label}</p>
      <p className="mt-1 text-[11px] text-slate-400">Sebelum: {usageText(before)}</p>
      <p className="text-[11px] text-slate-100">Sesudah: {usageText(after)}</p>
    </div>
  );
}
export function MasterMappingWorkspace({ reference, catalog, role, onClose, onSaved }: Props) {
  const existing = catalog.mappingDecisions?.find(decision => decision.referenceId === reference.id);
  const { revision } = useMasterSync();
  const toast = useToast();
  const [action, setAction] = useState<MappingAction>(existing?.action || (reference.organizationId ? "link" : "keepLabel"));
  const [projectId, setProjectId] = useState(existing?.projectId || "");
  const [note, setNote] = useState(existing?.note || "");
  const [systems, setSystems] = useState<Record<string, { systemId: string; note: string }>>(() => Object.fromEntries((existing?.systemMappings || []).map(mapping => [mapping.recordRef, { systemId: mapping.systemId, note: mapping.note }])));
  const [preview, setPreview] = useState<MappingImpactPreview>();
  const [previewError, setPreviewError] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [audit, setAudit] = useState<AuditEntry[]>([]), [step, setStep] = useState<"source" | "target" | "preview">("source");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [viewport, setViewport] = useState<{ height: number; top: number; narrow: boolean }>();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const canDecide = canMappingDecide(role), readOnly = !canDecide;
  const projectOptions = useMemo(
    
    
    () => catalog.projects.filter(project => project.organizationId === reference.organizationId && (project.status === "active" || project.id === projectId)).map(project => ({ value: project.id, label: `${project.code} — ${project.name}${project.status !== "active" ? " (Arsip)" : ""}` })),
    [catalog.projects, projectId, reference.organizationId]
  );
  const systemOptions = useMemo(
    
    
    () => catalog.systems.filter(system => system.projectId === projectId).map(system => ({ value: system.id, label: `${system.code} — ${system.name}` })),
    [catalog.systems, projectId]
  );
  const link = reference.examples[0]
    ? operationalLink(reference.sourceType, reference.examples[0].rawProject, reference.examples[0].projectId, catalog)
    : operationalLink(reference.sourceType, reference.rawValue, undefined, catalog);
  useEffect(
    
    
    () => {
      const controller = new AbortController();
      void masterDataV2.listMappingAudit(reference.id, controller.signal).then(rows => { if (!controller.signal.aborted) setAudit(rows); }).catch(() => { /* history stays empty */ });
      return () => controller.abort();
    },
    [reference.id, revision]
  );
  useEffect(
    () => {
      const vv = window.visualViewport;
      if (!vv) return;
      const update = () => {
        if (window.innerWidth < 1024)
          setViewport({ height: vv.height, top: vv.offsetTop, narrow: window.innerWidth < 768 });
        else
          setViewport(undefined);
      };
      update();
      vv.addEventListener("resize", update);
      vv.addEventListener("scroll", update);
      return () => { vv.removeEventListener("resize", update); vv.removeEventListener("scroll", update); };
    },
    []
  );
  const draft = useMemo(
    
    
    () => ({
        action,
        projectId: action === "link" ? projectId : undefined,
        note,
        systemMappings: Object.entries(systems).filter(([, value]) => value.systemId).map(([recordRef, value]) => ({ recordRef, systemId: value.systemId, note: value.note }))
      }),
    [action, projectId, note, systems]
  );
  const target = catalog.projects.find(project => project.id === projectId);
  const targetSystem = catalog.systems.find(system => system.id === draft.systemMappings?.[0]?.systemId);
  useEffect(
    
    
    () => {
      if (readOnly) return;
      const controller = new AbortController();
      const timer = setTimeout(
        
        
        () => {
          setPreviewing(true);
          setPreviewError("");
          void masterDataV2.mappingPreview(reference.id, draft, controller.signal).then(result => { if (!controller.signal.aborted) setPreview(result); }).catch((cause: unknown) => { if (!controller.signal.aborted) setPreviewError(cause instanceof Error ? cause.message : "Gagal memuat pratinjau"); }).finally(() => { if (!controller.signal.aborted) setPreviewing(false); });
        },
        260
      );
      return () => { clearTimeout(timer); controller.abort(); };
    },
    [draft, readOnly, reference.id]
  );

  async function save() {
    if (saving || readOnly) return;
    setSaving(true); setError("");
    try {
      const decision = await masterDataV2.decideMapping(reference.id, draft);
      toast.success("Keputusan pemetaan disimpan.");
      onSaved(decision);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Gagal menyimpan keputusan.";
      setError(message); toast.critical(message); setStep("target");
    } finally { setSaving(false); }
  }
  const title = reference.rawValue;
  return (
    <section aria-label={`Tinjau referensi ${title}`} className="min-w-0 space-y-4 pb-40 md:pb-24 lg:pb-0">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="mb-2 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-sky-300 hover:text-sky-200 lg:min-h-8"
          ><ArrowLeft size={15} />Kembali ke temuan</button>
          <h2 className="break-words text-lg font-bold text-slate-50">Tinjau referensi “{title}”</h2>
          <p className="mt-1 text-xs text-slate-400">{SOURCE_LABELS[reference.sourceType]} · {reference.count} record · {reference.organizationId ? catalog.organizations.find(org => org.id === reference.organizationId)?.name || reference.organizationId : "Organisasi sumber tidak diketahui"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MasterBadge value={reference.status} />
          <span className="text-xs text-slate-400">{REFERENCE_STATUS_LABELS[reference.status]}</span>
        </div>
      </header>
      {readOnly && (
        <p role="note" className="rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm text-slate-300">Hanya Pengelola Master Data yang dapat menyimpan keputusan. Anda dapat membaca temuan dan contoh penggunaan.</p>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className={`${step === "source" ? "block" : "hidden"} space-y-3 lg:block`} aria-label="Sumber referensi">
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
            <h3 className="text-sm font-semibold text-slate-100">Konteks sumber</h3>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-slate-400">Organisasi</dt>
                <dd className="mt-1 text-slate-100">
                  {reference.organizationId
                    ? catalog.organizations.find(org => org.id === reference.organizationId)?.name || reference.organizationId
                    : "Tidak diketahui"}
                </dd>
              </div>
              <div><dt className="text-slate-400">Jenis sumber</dt><dd className="mt-1 text-slate-100">{SOURCE_LABELS[reference.sourceType]}</dd></div>
              <div>
                <dt className="text-slate-400">Nilai lama</dt>
                <dd className="mt-1 break-words font-dashboard-mono text-slate-100">{reference.rawValue}</dd>
              </div>
              <div><dt className="text-slate-400">Jumlah</dt><dd className="mt-1 text-slate-100">{reference.count} record</dd></div>
            </dl>
          </div>
          <div className="rounded-xl border border-slate-700 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-100">Contoh pemakaian</h3>
              <Link
                href={link.href}
                scroll={false}
                className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-sky-300 hover:text-sky-200 lg:min-h-8"
              >Lihat semua<ExternalLink size={13} /></Link>
            </div>
            <ul className="mt-2 space-y-2">
              {reference.examples.map(example => {
                const exampleLink = operationalLink(reference.sourceType, example.rawProject, example.projectId, catalog);
                return (
                  <li key={example.recordRef} className="border-t border-slate-700 pt-2 first:border-0 first:pt-0">
                    <p className="text-xs text-slate-100">{example.label}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">{example.active ? "Aktif" : "Selesai"} · {example.projectId ? catalog.projects.find(project => project.id === example.projectId)?.name || "Proyek" : "Belum terpetakan"}</p>
                    <Link
                      href={exampleLink.href}
                      scroll={false}
                      className="mt-1 inline-flex min-h-11 items-center text-[11px] text-sky-300 hover:text-sky-200 lg:min-h-6"
                    >
                      {exampleLink.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
            {reference.examples.length < reference.count && (
              <p className="mt-2 text-[11px] text-slate-400">Menampilkan {reference.examples.length} dari {reference.count} record.</p>
            )}
            {link.note && <p className="mt-2 text-[11px] text-amber-200">{link.note}</p>}
          </div>
          {reference.candidates.length > 0 && (
            <div className="rounded-xl border border-slate-700 p-4">
              <h3 className="text-sm font-semibold text-slate-100">Calon proyek</h3>
              <p className="mt-1 text-[11px] text-slate-400">Saran dari nama/kunci lama. Tidak pernah dipilih otomatis.</p>
              <ul className="mt-2 space-y-1 text-xs text-slate-200">
                {reference.candidates.map(candidateId => {
                  const candidate = catalog.projects.find(project => project.id === candidateId);
                  return <li key={candidateId}>{candidate ? `${candidate.code} — ${candidate.name}` : candidateId}</li>;
                })}
              </ul>
            </div>
          )}
        </section>
        <section className={`${step === "target" ? "block" : "hidden"} space-y-3 lg:block`} aria-label="Target pemetaan">
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
            <h3 className="text-sm font-semibold text-slate-100">Keputusan</h3>
            <div role="radiogroup" aria-label="Keputusan pemetaan" className="mt-2 grid gap-2">
              {(["link", "keepLabel", "defer"] as MappingAction[]).map(value => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={action === value}
                  disabled={readOnly || value === "link" && !reference.organizationId}
                  onClick={() => setAction(value)}
                  className={action === value
                    ? "flex min-h-11 items-center gap-2 rounded-lg border border-sky-500 bg-sky-950 px-3 text-left text-sm font-semibold text-sky-100 disabled:opacity-40"
                    : "flex min-h-11 items-center gap-2 rounded-lg border border-slate-600 px-3 text-left text-sm text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"}
                >
                  {action === value ? (
                    <Check size={16} className="shrink-0 text-sky-300" />
                  ) : (
                    <span className="size-4 shrink-0 rounded-full border border-slate-500" />
                  )}
                  {ACTION_LABELS[value]}
                </button>
              ))}
            </div>
            {!reference.organizationId && (
              <p className="mt-2 text-[11px] text-amber-200">Organisasi sumber tidak diketahui; hanya Tetap label atau Tunda yang tersedia.</p>
            )}
          </div>
          {action === "link" && (
            <div className="rounded-xl border border-slate-700 p-4">
              <label htmlFor="mapping-project" className="block text-xs font-semibold text-slate-200">Target proyek <span className="text-sky-300">*</span></label>
              <p className="mt-1 text-[11px] text-slate-400">Dibatasi ke organisasi sumber.</p>
              <Select
                id="mapping-project"
                className="mt-2 w-full"
                size="form"
                searchable
                value={projectId}
                options={projectOptions}
                placeholder="Pilih proyek"
                disabled={readOnly}
                onValueChange={value => { setProjectId(value); setSystems({}); }}
              />
            </div>
          )}
          {action === "link" && projectId && (
            <div className="rounded-xl border border-slate-700 p-4">
              <h3 className="text-sm font-semibold text-slate-100">Target sistem <span className="font-normal text-slate-400">(opsional per record)</span></h3>
              <p className="mt-1 text-[11px] text-slate-400">Isi hanya bila sistem untuk record tersebut memang diketahui. Catatan wajib untuk setiap pemetaan sistem.</p>
              <div className="mt-3 space-y-3">
                {reference.examples.map(example => {
                  const current = systems[example.recordRef] || { systemId: "", note: "" };
                  return (
                    <div key={example.recordRef} className="rounded-lg border border-slate-700 bg-slate-800 p-3">
                      <p className="text-xs text-slate-100">{example.label}</p>
                      <Select
                        aria-label={`Sistem untuk ${example.label}`}
                        className="mt-2 w-full"
                        value={current.systemId}
                        options={[{ value: "", label: "Tanpa sistem" }, ...systemOptions]}
                        disabled={readOnly || !systemOptions.length}
                        onValueChange={value => setSystems(previous => ({ ...previous, [example.recordRef]: { systemId: value, note: value ? previous[example.recordRef]?.note || "" : "" } }))}
                      />
                      {current.systemId && (
                        <input
                          aria-label={`Catatan sistem untuk ${example.label}`}
                          className={`${inputClass} mt-2`}
                          maxLength={300}
                          placeholder="Catatan pemetaan sistem (wajib)"
                          value={current.note}
                          disabled={readOnly}
                          onChange={event => setSystems(previous => ({ ...previous, [example.recordRef]: { ...current, note: event.target.value } }))}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              {!systemOptions.length && <p className="mt-2 text-[11px] text-amber-200">Proyek ini belum memiliki sistem.</p>}
            </div>
          )}
          <div className="rounded-xl border border-slate-700 p-4">
            <label htmlFor="mapping-note" className="block text-xs font-semibold text-slate-200">Catatan</label>
            <p className="mt-1 text-[11px] text-slate-400">Wajib untuk keputusan ambigu, pengecualian, dan setiap pemetaan sistem.</p>
            <textarea
              id="mapping-note"
              className={`${inputClass} mt-2 min-h-24 resize-y`}
              maxLength={500}
              value={note}
              disabled={readOnly}
              onChange={event => setNote(event.target.value)}
              placeholder="Alasan keputusan…"
            />
          </div>
          {existing && <p className="text-[11px] text-slate-400">Keputusan tersimpan versi {existing.version}. Menyimpan lagi akan menaikkan versi.</p>}
        </section>
        <section className={`${step === "preview" ? "block" : "hidden"} space-y-3 lg:col-span-2 lg:block`} aria-label="Pratinjau dampak">
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-100">Pratinjau dampak</h3>
              {previewing && <span role="status" className="text-[11px] text-slate-400">Menghitung…</span>}
            </div>
            {readOnly ? (
              <p className="mt-2 text-xs text-slate-400">Pratinjau tidak tersedia untuk peran baca.</p>
            ) : previewError ? (
              <p role="alert" className="mt-2 text-xs text-rose-200">{previewError}</p>
            ) : preview ? (
              <div className="mt-3 space-y-2">
                <div className="grid gap-2 sm:grid-cols-3">
                  <MappingUsage label="Referensi" before={preview.before.reference} after={preview.after.reference} />
                  <MappingUsage label={target ? `Proyek ${target.code}` : "Proyek target"} before={preview.before.project} after={preview.after.project} />
                  <MappingUsage
                    label={targetSystem ? `Sistem ${targetSystem.code}` : "Sistem target"}
                    before={preview.before.system}
                    after={preview.after.system}
                  />
                </div>
                {preview.affected.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-200">{preview.affected.length} record terpengaruh</p>
                    <ul className="mt-1 space-y-1 text-[11px] text-slate-300">
                      {preview.affected.slice(0, 5).map(example => (
                        <li key={example.recordRef} className="truncate">• {example.label} → {example.projectId ? catalog.projects.find(project => project.id === example.projectId)?.name || "proyek" : "belum jelas"}{example.systemId ? ` · ${catalog.systems.find(system => system.id === example.systemId)?.name || "sistem"}` : ""}</li>
                      ))}
                    </ul>
                    {preview.affected.length > 5 && <p className="mt-1 text-[11px] text-slate-400">+{preview.affected.length - 5} record lain.</p>}
                  </div>
                )}
                {preview.warnings.map(warning => <p key={warning} className="text-[11px] text-amber-200">{warning}</p>)}
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-400">Pilih keputusan dan target untuk melihat dampak.</p>
            )}
          </div>
          {error && <p role="alert" className="rounded-lg border border-rose-700 bg-rose-950 p-3 text-sm text-rose-200">{error}</p>}
          <div className="hidden justify-end lg:flex">
            <button type="button" className={primaryClass} disabled={readOnly || saving || !preview} onClick={() => void save()}>
              <Save size={16} />
              {saving ? "Menyimpan…" : "Simpan keputusan"}
            </button>
          </div>
        </section>
      </div>
      {audit.length > 0 && (
        <div className="rounded-xl border border-slate-700 p-4">
          <h3 className="text-sm font-semibold text-slate-100">Riwayat pemetaan</h3>
          <ul className="mt-2 space-y-2">
            {audit.slice(0, 5).map(entry => {
              const actionChange = entry.changes.find(change => change.field === "action");
              const version = entry.changes.find(change => change.field === "version");
              const project = entry.changes.find(change => change.field === "projectId");
              const note = entry.changes.find(change => change.field === "note");
              return (
                <li key={entry.id} className="border-t border-slate-700 pt-2 text-xs text-slate-300 first:border-0 first:pt-0">
                  <p><span className="font-semibold text-slate-100">{entry.byName}</span> · <time dateTime={entry.at}>{date(entry.at)}</time></p>
                  <p className="mt-0.5">
                    {ACTION_SHORT[(actionChange?.to as MappingAction) || "defer"] || String(actionChange?.to || "Keputusan")}
                    {version?.to ? ` · versi ${version.to}` : ""}
                    {project?.to ? ` · ${catalog.projects.find(item => item.id === project.to)?.name || project.to}` : ""}
                  </p>
                  {note?.to ? <p className="mt-0.5 text-slate-400">{String(note.to)}</p> : null}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {mounted &&
        createPortal(
          
          
          <div
            className="fixed inset-x-0 bottom-[57px] z-[95] flex items-center justify-between gap-2 border-t border-slate-700 bg-slate-900 p-3 pb-[max(12px,env(safe-area-inset-bottom))] md:bottom-0 lg:hidden"
            style={viewport ? { bottom: Math.max(0, window.innerHeight - viewport.height - viewport.top) || (viewport.narrow ? 57 : 0) } : undefined}
          >
            <button
              type="button"
              className={buttonClass}
              onClick={() => step === "source" ? onClose() : setStep(step === "preview" ? "target" : "source")}
            >
              <ArrowLeft size={16} />
              {step === "source" ? "Kembali" : "Sebelumnya"}
            </button>
            {step === "preview" ? (
              <button type="button" className={primaryClass} disabled={readOnly || saving || !preview} onClick={() => void save()}>
                {saving ? "Menyimpan…" : "Simpan"}
              </button>
            ) : (
              <button type="button" className={primaryClass} onClick={() => setStep(step === "source" ? "target" : "preview")}>
                {step === "source" ? "Lanjut" : "Pratinjau"}
                <ArrowRight size={16} />
              </button>
            )}
          </div>,
          document.body
        )}
      <p className="sr-only" role="status">{readOnly ? "Mode baca" : "Anda dapat menyimpan keputusan"} · {SOURCE_LABELS[reference.sourceType]} · {reference.count} record</p>
    </section>
  );
}


