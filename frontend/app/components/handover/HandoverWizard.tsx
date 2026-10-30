"use client";

import { Select } from "@/app/components/ui/Select";

import { useRef, useState, type ReactNode } from "react";
import { ArrowRightLeft, ArrowRight, Check, Calendar, Users, ShieldCheck, Plus, Trash2, ChevronDown, CheckSquare, ChevronsUpDown, FileText, Clock3, UserRound, Activity, Type, AlignLeft, ListTodo, Flag, AlertCircle, Lightbulb } from "lucide-react";
import { Modal } from "@/app/components/ui/Modal";
import { ModalCloseButton } from "@/app/components/ui/ModalCloseButton";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { DatePicker } from "@/app/components/ui/DatePicker";
import type { HandoverActor, HandoverDraft, HandoverState } from "@/app/lib/types";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { TaskPriorityBadge } from "./TaskPriorityBadge";
import { ProjectSelect } from "./ProjectSelect";

interface HandoverWizardProps {
  open: boolean;
  mode?: "prepare" | "create" | "edit";
  draft: HandoverDraft;
  dirty: boolean;
  draftSaved: boolean;
  initialStep: 1 | 2 | 3 | 4;
  onStepChange: (step: 1 | 2 | 3 | 4) => void;
  onDiscard: () => void;
  actor: HandoverActor | null;
  onDraftChange: (updater: (previous: HandoverDraft) => HandoverDraft) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}

type Step = 1 | 2 | 3 | 4;

const SHIFT_ROTATIONS = [
  { from: "Subuh", to: "Pagi", label: "Subuh → Pagi" },
  { from: "Pagi", to: "Malam", label: "Pagi → Malam" },
  { from: "Malam", to: "Subuh", label: "Malam → Subuh" },
];

// One look for every field in the wizard
const INPUT = "w-full min-h-[42px] pl-[40px] pr-[12px] py-[10px] rounded-lg text-[13px] bg-[var(--input-bg)] border border-[var(--panel-border)] text-[var(--ink-primary)] font-normal placeholder:text-[var(--ink-muted)] focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] focus:outline-none transition-[border-color,box-shadow] duration-150";
const TEXTAREA = `${INPUT} min-h-[96px] leading-[1.55] resize-y`;
const SELECT = "w-full min-h-[42px] pl-[40px] pr-[42px] py-[10px] rounded-lg text-[13px] bg-[var(--input-bg)] border border-[var(--panel-border)] text-[var(--ink-primary)] font-normal appearance-none cursor-pointer focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] focus:outline-none transition-[border-color,box-shadow] duration-150";
const FIELD_ICON = "absolute z-[1] left-[13px] top-[21px] -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none transition-colors duration-150 group-focus-within/shell:text-[var(--accent-blue)]";
const CARD = "rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5 max-[660px]:p-4";
const SECONDARY_BUTTON = "inline-flex items-center justify-center gap-1.5 min-h-[36px] px-[15px] rounded-lg text-[12px] font-semibold cursor-pointer transition-colors duration-150 border border-[var(--line)] bg-[var(--panel-bg)] text-[var(--ink-secondary)] hover:bg-[var(--panel-bg-hover)] hover:text-[var(--ink-primary)] disabled:opacity-50 disabled:cursor-not-allowed";
const ADD_BUTTON = "inline-flex items-center justify-center gap-1.5 min-h-[34px] px-3.5 rounded-lg border border-sky-400/40 bg-sky-400/10 text-[12px] font-bold text-sky-300 cursor-pointer transition-colors duration-150 hover:border-sky-400 hover:bg-sky-400/20 hover:text-white";

/** A field's label: the name, an optional "Opsional" tag, and the control under it. */
function Field({ label, optional, hint, children, className = "", htmlFor }: { label: string; optional?: boolean; hint?: string; children: ReactNode; className?: string; htmlFor?: string }) {
  return (
    <label className={`grid gap-1.5 text-[12.5px] font-semibold text-[var(--ink-secondary)] ${className}`} htmlFor={htmlFor}>
      <span className="flex items-center gap-2">{label}{optional && <span className="rounded bg-slate-700/60 px-1.5 py-[1px] text-[10.5px] font-medium text-slate-400">Opsional</span>}</span>
      {children}
      {hint && <small className="text-[11.5px] font-normal leading-[1.45] text-[var(--ink-muted)]">{hint}</small>}
    </label>
  );
}

/** The title of a card: an icon tile, the name, and what it is for. */
function CardTitle({ icon, title, sub, aside }: { icon: ReactNode; title: string; sub?: string; aside?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3 max-[660px]:flex-col">
      <div className="flex items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-[var(--accent-blue-border)] bg-[var(--accent-blue-soft)] text-[var(--accent-blue)]">{icon}</span>
        <div>
          <strong className="block text-[14px] font-semibold text-[var(--ink-primary)]">{title}</strong>
          {sub && <span className="block text-[12px] text-[var(--ink-muted)]">{sub}</span>}
        </div>
      </div>
      {aside}
    </div>
  );
}

/** The question each step answers, so the person knows what to fill in before reading the fields. */
function StepIntro({ step, title, text }: { step: Step; title: string; text: string }) {
  return (
    <div className="mb-5">
      <span className="mb-1 block text-[11.5px] font-bold text-[var(--accent-blue)]">Langkah {step} dari 4</span>
      <h3 className="m-0 mb-1 text-[19px] font-bold leading-[1.3] text-[var(--ink-primary)] max-[660px]:text-[17px]">{title}</h3>
      <p className="m-0 text-[13px] leading-[1.5] text-[var(--ink-secondary)]">{text}</p>
    </div>
  );
}

/** A project in a header or summary: plain text in a quiet chip. */
function ProjectPill({ name }: { name: string }) {
  return <span className="inline-flex shrink-0 items-center rounded-md border border-slate-600/60 bg-slate-800/70 px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-slate-200">{name}</span>;
}

const PRIORITY_ACCENT: Record<string, string> = { Critical: "border-l-red-500", High: "border-l-orange-400", Medium: "border-l-amber-400", Low: "border-l-teal-400" };

export function HandoverWizard({
  open,
  mode = "create",
  draft,
  dirty,
  draftSaved,
  initialStep,
  onStepChange,
  onDiscard,
  onDraftChange,
  onClose,
  onSave,
  saving,
}: HandoverWizardProps) {
  const [step, setStep] = useState<Step>(initialStep);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [collapsedTasks, setCollapsedTasks] = useState<Record<number, boolean>>({});
  const formScrollRef = useRef<HTMLDivElement>(null);

  const title = mode === "edit" ? "Edit Catatan Handover" : mode === "prepare" ? "Siapkan Handover" : "Buat Handover Baru";

  const requestClose = () => {
    if (saving) return;
    if (dirty && !draftSaved) setConfirmDiscard(true);
    else onClose();
  };

  const handleStepChange = (targetStep: Step) => {
    setStep(targetStep);
    onStepChange(targetStep);
    formScrollRef.current?.scrollTo({ top: 0 });
  };

  const updateTask = (taskId: number, change: Partial<HandoverDraft["tasks"][number]>) => {
    onDraftChange((previous) => ({
      ...previous,
      tasks: previous.tasks.map((task) => (task.id === taskId ? { ...task, ...change } : task)),
    }));
  };

  const updateFinding = (findingIndex: number, change: Partial<HandoverDraft["findings"][number]>) => {
    onDraftChange((previous) => ({
      ...previous,
      findings: previous.findings.map((finding, index) =>
        index === findingIndex ? { ...finding, ...change } : finding,
      ),
    }));
  };

  const addTask = () => {
    const newId = Date.now();
    onDraftChange((previous) => ({
      ...previous,
      tasks: [
        ...previous.tasks,
        {
          id: newId,
          taskTemplateId: `custom-${newId}`,
          isNewlyAdded: true,
          title: "",
          project: "NOC",
          detail: "",
          state: "repeat" as HandoverState,
          priority: "Medium",
          completed: false,
        },
      ],
    }));
    // Keep the newly added task expanded
    setCollapsedTasks((prev) => ({ ...prev, [newId]: false }));
  };

  const removeTask = (taskId: number) => {
    onDraftChange((previous) => ({
      ...previous,
      tasks: previous.tasks.filter((task) => task.id !== taskId),
    }));
  };

  const toggleTaskCollapse = (taskId: number, index: number) => {
    setCollapsedTasks((prev) => ({
      ...prev,
      [taskId]: !(prev[taskId] ?? index > 0),
    }));
  };

  const toggleAllTasks = (collapse: boolean) => {
    const nextState: Record<number, boolean> = {};
    draft.tasks.forEach((task) => {
      nextState[task.id] = collapse;
    });
    setCollapsedTasks(nextState);
  };

  const areAllTasksCollapsed = draft.tasks.length > 0 && draft.tasks.every((task, index) => collapsedTasks[task.id] ?? index > 0);

  const addFinding = () => {
    onDraftChange((previous) => ({
      ...previous,
      findings: [...previous.findings, { project: "NOC", title: "", detail: "", state: "waiting" as const }],
    }));
  };

  const removeFinding = (findingIndex: number) => {
    onDraftChange((previous) => ({
      ...previous,
      findings: previous.findings.filter((_, index) => index !== findingIndex),
    }));
  };

  const applyShiftRotation = (from: string, to: string) => {
    onDraftChange((previous) => ({
      ...previous,
      sourceShift: from,
      targetShift: to,
    }));
  };

  // What is still missing per step, shown on the stepper and in the summary (it does not block anything: saving checks it)
  const shiftInfoComplete = Boolean(draft.date && draft.sourceShift.trim() && draft.targetShift.trim() && draft.sourcePic.trim() && draft.targetPic.trim());
  const untitledFindings = draft.findings.filter((finding) => !finding.title.trim()).length;
  const untitledTasks = draft.tasks.filter((task) => !task.title.trim()).length;
  const hasNote = Boolean(draft.notes?.trim());
  const steps: Array<{ step: Step; label: string; sub: string; ok: boolean }> = [
    { step: 1, label: "Shift & PIC", sub: shiftInfoComplete ? `${draft.sourceShift} → ${draft.targetShift}` : "Belum lengkap", ok: shiftInfoComplete },
    { step: 2, label: "Catatan", sub: hasNote ? "Ada catatan" : "Opsional", ok: true },
    { step: 3, label: "Temuan", sub: draft.findings.length ? `${draft.findings.length} temuan` : "Tidak ada", ok: untitledFindings === 0 },
    { step: 4, label: "Tugas", sub: `${draft.tasks.length} tugas`, ok: untitledTasks === 0 },
  ];
  const nextLabel = step === 1 ? "Lanjut ke Catatan" : step === 2 ? "Lanjut ke Temuan" : "Lanjut ke Tugas";

  return (
    <>
      <Modal open={open} onClose={requestClose} label={title} variant="form" width={920}>
        {/* Header */}
        <header className="flex items-start justify-between gap-6 border-b border-[var(--line)] bg-[linear-gradient(135deg,var(--accent-blue-soft),transparent_70%)] p-[20px_28px_18px] max-[660px]:gap-3 max-[660px]:p-[16px]">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--accent-blue-border)] bg-[var(--accent-blue-soft)] text-[var(--accent-blue)] max-[660px]:size-9">
              <ArrowRightLeft size={18} />
            </span>
            <div className="min-w-0">
              <span className="block font-mono text-[10.5px] font-bold tracking-[0.75px] text-[var(--accent-blue)]">{mode === "prepare" ? "PERSIAPAN SERAH TERIMA SHIFT" : "CATATAN SERAH TERIMA"}</span>
              <h2 className="m-0 mt-0.5 text-[20px] font-bold leading-[1.25] tracking-[-0.35px] text-[var(--ink-primary)] max-[660px]:text-[17px]">{title}</h2>
              <p className="m-0 mt-1 text-[12.5px] leading-[1.5] text-[var(--ink-secondary)]">Isi empat langkah singkat untuk shift penerima, lalu periksa ringkasannya sebelum menyimpan.</p>
              <p className="mt-2 inline-flex w-fit items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--panel-bg)] px-2.5 py-1 text-[11.5px] text-[var(--ink-secondary)]" role="status">
                <span className={`size-[7px] shrink-0 rounded-full ${draftSaved ? "bg-[var(--green)]" : "bg-[var(--orange)]"}`} />
                {draftSaved ? "Draf tersimpan otomatis di perangkat ini" : "Draf belum tersimpan — jangan tutup halaman"}
                {mode === "edit" && <span> · Revisi akan mengulang checklist penerimaan.</span>}
              </p>
            </div>
          </div>
          <ModalCloseButton onClose={requestClose} />
        </header>

        {/* Stepper: numbered steps on one line; a passed step shows a check when it is complete, or "!" when something is missing */}
        <nav className="border-b border-[var(--line)] bg-[var(--bg)] px-[28px] py-3 max-[660px]:px-3" aria-label="Langkah handover">
          <ol className="m-0 grid list-none grid-cols-4 gap-2 p-0">
            {steps.map((item, index) => {
              const current = step === item.step;
              const passed = item.step < step;
              const circle = current
                ? "border-[var(--accent-blue)] bg-[var(--accent-blue)] text-white shadow-[0_0_0_3px_var(--accent-blue-soft)]"
                : passed && item.ok
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : passed
                    ? "border-amber-400 bg-amber-400/15 text-amber-300"
                    : "border-[var(--line)] bg-[var(--panel-bg)] text-[var(--ink-muted)]";
              return (
                <li key={item.step} className="relative min-w-0">
                  {index < steps.length - 1 && <span aria-hidden="true" className={`absolute left-[calc(50%+22px)] right-[calc(-50%+22px)] top-[17px] h-[2px] rounded-full min-[661px]:hidden ${passed ? "bg-emerald-500/60" : "bg-[var(--line)]"}`} />}
                  <button
                    type="button"
                    onClick={() => handleStepChange(item.step)}
                    aria-current={current ? "step" : undefined}
                    className={`flex w-full min-w-0 items-center gap-2.5 rounded-lg border p-2 text-left transition-colors duration-150 max-[660px]:flex-col max-[660px]:gap-1 max-[660px]:border-transparent max-[660px]:bg-transparent max-[660px]:p-1 max-[660px]:text-center ${
                      current ? "border-[var(--accent-blue)] bg-[var(--accent-blue-soft)]" : "border-[var(--line)] bg-[var(--panel-bg)] hover:bg-[var(--panel-bg-hover)]"
                    }`}
                  >
                    <span className={`relative z-[1] grid size-[30px] shrink-0 place-items-center rounded-full border-2 font-mono text-[12px] font-bold ${circle}`}>
                      {passed && item.ok ? <Check size={15} strokeWidth={3} /> : passed ? "!" : item.step}
                    </span>
                    <span className="flex min-w-0 flex-col leading-[1.25]">
                      <span className={`truncate text-[12.5px] ${current ? "font-bold text-[var(--ink-primary)]" : "font-semibold text-[var(--ink-secondary)]"}`}>{item.label}</span>
                      <span className={`truncate text-[11px] max-[660px]:hidden ${passed && !item.ok ? "text-amber-300" : "text-[var(--ink-muted)]"}`}>{item.sub}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Form Body Scroll Area */}
        <div ref={formScrollRef} className="flex-1 overflow-y-auto p-[24px_28px_28px] max-[660px]:p-[18px_16px_24px]" inert={saving}>
          {/* ══════════════════════════════════════
              STEP 1: INFORMASI SHIFT
             ══════════════════════════════════════ */}
          {step === 1 && (
            <section className="flex flex-col gap-4">
              <StepIntro step={1} title="Siapa yang menyerahkan dan menerima shift?" text="Pilih tanggal dan arah pergantian shift, lalu isi nama penanggung jawab kedua shift." />

              <div className={CARD}>
                <CardTitle icon={<Calendar size={16} />} title="Tanggal & rotasi shift" sub="Kapan serah terima terjadi, dari shift mana ke shift mana" />

                <div className="grid grid-cols-[minmax(0,240px)_minmax(0,1fr)] gap-4 max-[660px]:grid-cols-1">
                  <div className="grid gap-1.5 text-[12.5px] font-semibold text-[var(--ink-secondary)]">
                    <span>Tanggal serah terima</span>
                    <DatePicker
                      value={draft.date}
                      onChange={(date) => onDraftChange((prev) => ({ ...prev, date }))}
                      mode="single"
                      required
                      aria-label="Tanggal serah terima"
                    />
                  </div>
                  <div className="grid gap-1.5 text-[12.5px] font-semibold text-[var(--ink-secondary)]">
                    <span>Pilih rotasi cepat</span>
                    <div className="grid grid-cols-3 gap-2 max-[420px]:grid-cols-1">
                      {SHIFT_ROTATIONS.map((rotation) => {
                        const isSelected =
                          draft.sourceShift.toLowerCase() === rotation.from.toLowerCase() &&
                          draft.targetShift.toLowerCase() === rotation.to.toLowerCase();
                        return (
                          <button
                            key={rotation.label}
                            type="button"
                            aria-pressed={isSelected}
                            className={`inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-lg border px-2 text-[12.5px] transition-colors duration-150 ${
                              isSelected
                                ? "border-[var(--accent-blue)] bg-[var(--accent-blue-soft)] font-bold text-[var(--accent-blue)]"
                                : "border-[var(--line)] bg-[var(--bg)] font-semibold text-[var(--ink-secondary)] hover:border-[var(--accent-blue-border)] hover:text-[var(--accent-blue)]"
                            }`}
                            onClick={() => applyShiftRotation(rotation.from, rotation.to)}
                          >
                            {isSelected && <Check size={13} strokeWidth={3} aria-hidden="true" />}
                            {rotation.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Shift Pengirim & Penerima with directional arrow */}
                <div className="mt-4 grid grid-cols-[minmax(0,1fr)_32px_minmax(0,1fr)] items-end gap-3 max-[660px]:grid-cols-1">
                  <Field label="Shift yang menyerahkan">
                    <span className="group/shell relative block w-full min-w-0">
                      <Clock3 className={FIELD_ICON} size={16} aria-hidden="true" />
                      <input className={INPUT} value={draft.sourceShift} onChange={(event) => onDraftChange((prev) => ({ ...prev, sourceShift: event.target.value }))} placeholder="Contoh: Subuh" required />
                    </span>
                  </Field>
                  <span className="mb-[5px] grid size-8 place-items-center rounded-full border border-[var(--accent-blue-border)] bg-[var(--accent-blue-soft)] text-[var(--accent-blue)] max-[660px]:mb-0 max-[660px]:justify-self-center max-[660px]:rotate-90" title="Arah serah terima" aria-hidden="true">
                    <ArrowRight size={16} />
                  </span>
                  <Field label="Shift yang menerima">
                    <span className="group/shell relative block w-full min-w-0">
                      <Clock3 className={FIELD_ICON} size={16} aria-hidden="true" />
                      <input className={INPUT} value={draft.targetShift} onChange={(event) => onDraftChange((prev) => ({ ...prev, targetShift: event.target.value }))} placeholder="Contoh: Pagi" required />
                    </span>
                  </Field>
                </div>
              </div>

              <div className={CARD}>
                <CardTitle icon={<Users size={16} />} title="Penanggung jawab (PIC)" sub="Siapa yang menyerahkan dan siapa yang menerima" />
                <div className="grid grid-cols-2 items-start gap-4 max-[660px]:grid-cols-1">
                  <Field label="PIC shift pengirim">
                    <span className="group/shell relative block w-full min-w-0">
                      <UserRound className={FIELD_ICON} size={16} aria-hidden="true" />
                      <input className={INPUT} value={draft.sourcePic} onChange={(event) => onDraftChange((prev) => ({ ...prev, sourcePic: event.target.value }))} placeholder="Nama penanggung jawab shift saat ini" required />
                    </span>
                  </Field>
                  <Field label="PIC shift penerima" hint="Lebih dari satu nama dipisahkan koma.">
                    <span className="group/shell relative block w-full min-w-0">
                      <UserRound className={FIELD_ICON} size={16} aria-hidden="true" />
                      <input className={INPUT} value={draft.targetPic} onChange={(event) => onDraftChange((prev) => ({ ...prev, targetPic: event.target.value }))} placeholder="Nama penerima, contoh: Budi, Andi" required />
                    </span>
                  </Field>
                </div>
              </div>

              {/* what the step says, in one line */}
              <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-4 py-3 text-[12.5px] ${shiftInfoComplete ? "border-emerald-400/25 bg-emerald-500/[0.06] text-emerald-100" : "border-amber-400/25 bg-amber-400/[0.06] text-amber-100"}`} role="status">
                {shiftInfoComplete ? <Check size={15} className="shrink-0 text-emerald-400" aria-hidden="true" /> : <AlertCircle size={15} className="shrink-0 text-amber-400" aria-hidden="true" />}
                {shiftInfoComplete ? (
                  <span>Shift <b className="font-semibold">{draft.sourceShift}</b> → <b className="font-semibold">{draft.targetShift}</b> · <b className="font-semibold">{draft.sourcePic}</b> menyerahkan ke <b className="font-semibold">{draft.targetPic}</b></span>
                ) : (
                  <span>Lengkapi tanggal, kedua shift, dan kedua PIC agar handover bisa disimpan.</span>
                )}
              </div>
            </section>
          )}

          {/* ══════════════════════════════════════
              STEP 2: CATATAN SHIFT
             ══════════════════════════════════════ */}
          {step === 2 && (
            <section className="flex flex-col gap-4">
              <StepIntro step={2} title="Apa yang perlu diketahui shift berikutnya?" text="Tulis konteks umum atau pengingat. Kendala yang spesifik dicatat di langkah Temuan, pekerjaan di langkah Tugas." />
              <div className={CARD}>
                <CardTitle icon={<FileText size={16} />} title="Catatan untuk shift penerima" sub="Pesan, konteks operasional, atau pengingat penting" />
                <Field label="Isi catatan" optional>
                  <span className="group/shell relative block w-full min-w-0">
                    <FileText className={FIELD_ICON} size={16} aria-hidden="true" />
                    <textarea
                      rows={7}
                      className={TEXTAREA}
                      value={draft.notes ?? ""}
                      onChange={(event) => onDraftChange((prev) => ({ ...prev, notes: event.target.value }))}
                      placeholder="Contoh: Pantau lonjakan trafik setelah pukul 20.00 dan cek laporan monitoring sebelum pergantian shift."
                    />
                  </span>
                </Field>
              </div>
              <div className="flex items-start gap-2.5 rounded-xl border border-sky-400/20 bg-sky-400/[0.05] px-4 py-3 text-[12.5px] leading-[1.55] text-slate-300">
                <Lightbulb size={15} className="mt-[2px] shrink-0 text-sky-400" aria-hidden="true" />
                <span>Tulis singkat dan jelas: apa yang terjadi, apa yang sudah dilakukan, dan apa yang perlu diperhatikan. Boleh dikosongkan bila tidak ada.</span>
              </div>
            </section>
          )}

          {/* ══════════════════════════════════════
              STEP 3: TEMUAN & PENGECUALIAN
             ══════════════════════════════════════ */}
          {step === 3 && (
            <section className="flex flex-col gap-4">
              <StepIntro step={3} title="Adakah kendala atau hal yang perlu dipantau?" text="Satu kartu untuk satu temuan. Jika tidak ada, langsung lanjut ke langkah Tugas." />
              <div className="flex items-center justify-between gap-3 max-[660px]:flex-col max-[660px]:items-start">
                <div className="flex items-center gap-2 text-[13.5px] font-semibold text-[var(--ink-primary)]">
                  <ShieldCheck size={16} className="text-[var(--accent-blue)]" /> Temuan yang diteruskan
                  <span className="grid h-[22px] min-w-[22px] place-items-center rounded-md bg-[var(--accent-blue-soft)] px-1.5 font-mono text-[11px] font-bold text-[var(--accent-blue)]">{draft.findings.length}</span>
                </div>
                {draft.findings.length > 0 && (
                  <button type="button" className={ADD_BUTTON} onClick={addFinding}>
                    <Plus size={14} strokeWidth={2.5} /> Tambah Temuan
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-3">
                {draft.findings.length > 0 ? (
                  draft.findings.map((finding, index) => {
                    const waiting = finding.state === "waiting";
                    return (
                      <article key={`finding-${index}`} className={`rounded-xl border border-[var(--panel-border)] border-l-[3px] bg-[var(--panel-bg)] p-5 max-[660px]:p-4 ${waiting ? "border-l-amber-400" : "border-l-violet-400"}`}>
                        <div className="mb-4 flex items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="grid h-[22px] min-w-[28px] shrink-0 place-items-center rounded-md border border-[var(--accent-blue-border)] bg-[var(--accent-blue-soft)] px-1.5 font-mono text-[11px] font-bold text-[var(--accent-blue)]">#{index + 1}</span>
                            <strong className={`truncate text-[13px] font-semibold ${finding.title ? "text-[var(--ink-primary)]" : "text-[var(--ink-muted)] italic"}`}>{finding.title || "Belum diberi judul"}</strong>
                            {finding.project && <ProjectPill name={finding.project} />}
                          </div>
                          <button
                            type="button"
                            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-transparent px-2 py-1 text-[12px] font-semibold text-[var(--ink-muted)] transition-colors duration-150 hover:border-[var(--red-border)] hover:bg-[var(--red-soft)] hover:text-[var(--red)]"
                            onClick={() => removeFinding(index)}
                            aria-label="Hapus temuan"
                          >
                            <Trash2 size={13} /> Hapus
                          </button>
                        </div>

                        <div className="grid grid-cols-2 items-start gap-4 max-[660px]:grid-cols-1">
                          <Field label="Proyek terkait" htmlFor={`finding-project-${index}`} hint="Pilih dari saran atau ketik nama proyek lain.">
                            <ProjectSelect id={`finding-project-${index}`} value={finding.project} onChange={(project) => updateFinding(index, { project })} placeholder="Pilih atau ketik proyek" />
                          </Field>
                          <Field label="Kondisi saat ini">
                            <Select icon={<Activity size={16} aria-hidden="true" />} className={SELECT} value={finding.state} onChange={(event) => updateFinding(index, { state: event.target.value as "waiting" | "in-progress" })}>
                              <option value="waiting">Perlu dipantau</option>
                              <option value="in-progress">Sedang ditindaklanjuti</option>
                            </Select>
                          </Field>
                          <Field label="Ringkasan temuan" className="col-span-2 max-[660px]:col-span-1">
                            <span className="group/shell relative block w-full min-w-0">
                              <Type className={FIELD_ICON} size={16} aria-hidden="true" />
                              <input className={INPUT} value={finding.title} onChange={(event) => updateFinding(index, { title: event.target.value })} placeholder="Contoh: Checkpoint SIEM belum menerima data terbaru" />
                            </span>
                          </Field>
                          <Field label="Kondisi terakhir dan tindak lanjut" className="col-span-2 max-[660px]:col-span-1">
                            <span className="group/shell relative block w-full min-w-0">
                              <AlignLeft className={FIELD_ICON} size={16} aria-hidden="true" />
                              <textarea rows={3} className={TEXTAREA} value={finding.detail} onChange={(event) => updateFinding(index, { detail: event.target.value })} placeholder="Apa yang sudah diperiksa? Apa yang harus dipantau atau dilakukan shift penerima?" />
                            </span>
                          </Field>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-xl border-[1.5px] border-dashed border-[var(--line)] bg-[var(--panel-bg)] p-[36px_24px] text-center">
                    <div className="mb-3 grid size-12 place-items-center rounded-full border border-[var(--green-border)] bg-[var(--green-soft)] text-[var(--green)]">
                      <ShieldCheck size={24} />
                    </div>
                    <div className="mb-1 text-[14px] font-bold text-[var(--ink-primary)]">Belum ada temuan</div>
                    <div className="mb-4 max-w-[380px] text-[12.5px] leading-[1.5] text-[var(--ink-secondary)]">
                      Tambahkan bila ada kendala atau anomali yang perlu diketahui shift berikutnya. Jika tidak ada, langsung lanjut ke langkah Tugas.
                    </div>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-[12.5px] font-bold text-white transition-colors duration-150 hover:bg-sky-500"
                      onClick={addFinding}
                    >
                      <Plus size={15} strokeWidth={2.5} /> Tambah Temuan
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ══════════════════════════════════════
              STEP 4: CEKLIS TUGAS SHIFT
             ══════════════════════════════════════ */}
          {step === 4 && (
            <section className="flex flex-col gap-4">
              <StepIntro step={4} title="Pekerjaan apa yang harus dilanjutkan?" text="Tugas sudah terisi dari dashboard. Buka kartunya untuk mengubah judul, proyek, kondisi, atau prioritas." />
              <div className="flex items-center justify-between gap-3 max-[660px]:flex-col max-[660px]:items-start">
                <div className="flex items-center gap-2 text-[13.5px] font-semibold text-[var(--ink-primary)]">
                  <CheckSquare size={16} className="text-[var(--accent-blue)]" /> Tugas untuk shift penerima
                  <span className="grid h-[22px] min-w-[22px] place-items-center rounded-md bg-[var(--accent-blue-soft)] px-1.5 font-mono text-[11px] font-bold text-[var(--accent-blue)]">{draft.tasks.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  {draft.tasks.length > 1 && (
                    <button type="button" className={`${SECONDARY_BUTTON} min-h-[34px] px-3 text-[11.5px]`} onClick={() => toggleAllTasks(!areAllTasksCollapsed)}>
                      <ChevronsUpDown size={13} />
                      {areAllTasksCollapsed ? "Buka Semua" : "Tutup Semua"}
                    </button>
                  )}
                  <button type="button" className={ADD_BUTTON} onClick={addTask}>
                    <Plus size={14} strokeWidth={2.5} /> Tambah Tugas
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                {draft.tasks.map((task, index) => {
                  const isCollapsed = collapsedTasks[task.id] ?? index > 0;
                  const untitled = !task.title.trim();
                  return (
                    <article
                      key={task.id}
                      className={`overflow-hidden rounded-xl border border-[var(--panel-border)] border-l-[3px] bg-[var(--panel-bg)] transition-colors duration-150 hover:border-[var(--accent-blue-border)] ${PRIORITY_ACCENT[task.priority || "Medium"] ?? "border-l-slate-500"}`}
                    >
                      {/* Accordion Header */}
                      <div
                        className={`flex min-h-[56px] cursor-pointer select-none items-center justify-between gap-3 px-4 py-3 transition-colors duration-150 hover:bg-[var(--panel-bg-hover)] ${!isCollapsed ? "border-b border-[var(--line)]" : ""}`}
                        onClick={() => toggleTaskCollapse(task.id, index)}
                        role="button"
                        tabIndex={0}
                        aria-expanded={!isCollapsed}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleTaskCollapse(task.id, index);
                          }
                        }}
                      >
                        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="grid h-[22px] min-w-[28px] shrink-0 place-items-center rounded-md border border-[var(--accent-blue-border)] bg-[var(--accent-blue-soft)] px-1.5 font-mono text-[11px] font-bold text-[var(--accent-blue)]">#{index + 1}</span>
                            <span className={`truncate text-[13.5px] font-semibold ${untitled ? "italic text-amber-300" : "text-[var(--ink-primary)]"}`}>{untitled ? "Belum ada judul" : task.title}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 pl-[36px]">
                            {task.project && <ProjectPill name={task.project} />}
                            <TaskStatusBadge state={task.state} />
                            <TaskPriorityBadge priority={task.priority} />
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            className="grid size-8 place-items-center rounded-md border border-transparent text-[var(--ink-muted)] transition-colors duration-150 hover:border-[var(--red-border)] hover:bg-[var(--red-soft)] hover:text-[var(--red)]"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeTask(task.id);
                            }}
                            aria-label={`Hapus Tugas #${index + 1}`}
                            title="Hapus tugas"
                          >
                            <Trash2 size={14} />
                          </button>
                          <span className={`grid size-8 place-items-center text-[var(--ink-muted)] transition-transform duration-200 ${!isCollapsed ? "rotate-180" : ""}`}>
                            <ChevronDown size={16} />
                          </span>
                        </div>
                      </div>

                      {/* Accordion Body */}
                      {!isCollapsed && (
                        <div className="bg-[var(--bg)] p-5 max-[660px]:p-4">
                          <div className="grid grid-cols-2 items-start gap-4 max-[660px]:grid-cols-1">
                            <Field label="Judul tugas" className="col-span-2 max-[660px]:col-span-1">
                              <span className="group/shell relative block w-full min-w-0">
                                <ListTodo className={FIELD_ICON} size={16} aria-hidden="true" />
                                <input className={INPUT} value={task.title} onChange={(event) => updateTask(task.id, { title: event.target.value })} placeholder="Contoh: Periksa alarm dan laporan SIEM" required />
                              </span>
                            </Field>
                            <Field label="Proyek" htmlFor={`task-project-${task.id}`} className="col-span-2 max-[660px]:col-span-1">
                              <ProjectSelect id={`task-project-${task.id}`} value={task.project} onChange={(project) => updateTask(task.id, { project })} placeholder="Pilih atau ketik proyek" />
                            </Field>
                            <Field label="Kondisi tugas">
                              <Select icon={<Activity size={16} aria-hidden="true" />} className={SELECT} value={task.state} onChange={(event) => updateTask(task.id, { state: event.target.value as HandoverState })}>
                                <option value="repeat">Rutin / berulang</option>
                                <option value="waiting">Menunggu tindak lanjut</option>
                                <option value="in-progress">Sedang dikerjakan</option>
                                <option value="done">Selesai</option>
                                <option value="escalated">Dieskalasi</option>
                                <option value="blocked">Terhambat</option>
                                <option value="waiting-vendor">Menunggu Vendor</option>
                                <option value="activity">Aktivitas</option>
                              </Select>
                            </Field>
                            <Field label="Prioritas">
                              <Select icon={<Flag size={16} aria-hidden="true" />} className={SELECT} value={task.priority || "Medium"} onChange={(event) => updateTask(task.id, { priority: event.target.value })}>
                                <option value="Critical">Kritis</option>
                                <option value="High">Tinggi</option>
                                <option value="Medium">Sedang</option>
                                <option value="Low">Rendah</option>
                              </Select>
                            </Field>
                            <Field label="Apa yang perlu dilakukan shift penerima?" className="col-span-2 max-[660px]:col-span-1">
                              <span className="group/shell relative block w-full min-w-0">
                                <AlignLeft className={FIELD_ICON} size={16} aria-hidden="true" />
                                <textarea rows={3} className={TEXTAREA} value={task.detail} onChange={(event) => updateTask(task.id, { detail: event.target.value })} placeholder="Tulis langkah berikutnya, batas waktu bila ada, dan informasi yang diperlukan untuk mengerjakannya." />
                              </span>
                            </Field>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>

              {/* the whole handover in one look before saving */}
              <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
                <strong className="mb-3 block text-[13px] font-semibold text-[var(--ink-primary)]">Ringkasan sebelum disimpan</strong>
                <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0 max-[560px]:grid-cols-1">
                  {[
                    { ok: shiftInfoComplete, text: shiftInfoComplete ? `Shift ${draft.sourceShift} → ${draft.targetShift}, ${draft.sourcePic} → ${draft.targetPic}` : "Shift & PIC belum lengkap", step: 1 as Step },
                    { ok: true, text: hasNote ? "Catatan untuk shift penerima terisi" : "Tanpa catatan (opsional)", step: 2 as Step },
                    { ok: untitledFindings === 0, text: untitledFindings ? `${untitledFindings} temuan belum diberi judul` : draft.findings.length ? `${draft.findings.length} temuan diteruskan` : "Tidak ada temuan", step: 3 as Step },
                    { ok: untitledTasks === 0, text: untitledTasks ? `${untitledTasks} tugas belum diberi judul` : `${draft.tasks.length} tugas diteruskan`, step: 4 as Step },
                  ].map((row) => (
                    <li key={row.step}>
                      <button type="button" onClick={() => handleStepChange(row.step)} className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-[12.5px] transition-colors duration-150 ${row.ok ? "border-emerald-400/20 bg-emerald-500/[0.05] text-slate-200 hover:border-emerald-400/40" : "border-amber-400/30 bg-amber-400/[0.06] text-amber-100 hover:border-amber-400/60"}`}>
                        {row.ok ? <Check size={14} strokeWidth={3} className="shrink-0 text-emerald-400" aria-hidden="true" /> : <AlertCircle size={14} className="shrink-0 text-amber-400" aria-hidden="true" />}
                        <span className="min-w-0 truncate">{row.text}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between gap-4 border-t border-[var(--line)] bg-[var(--panel-bg)] p-[14px_24px] max-[660px]:flex-col max-[660px]:items-stretch max-[660px]:gap-2.5 max-[660px]:p-[12px_16px]">
          <div className="flex items-center gap-2 max-[660px]:flex-wrap">
            {step > 1 && (
              <button type="button" className={SECONDARY_BUTTON} onClick={() => handleStepChange((step - 1) as Step)}>
                ← Kembali
              </button>
            )}
            <button type="button" className={SECONDARY_BUTTON} onClick={requestClose} disabled={saving}>
              Tutup Draf
            </button>
            <button
              type="button"
              className="whitespace-nowrap bg-transparent px-1 py-0.5 text-[12px] font-semibold text-[var(--red)] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              disabled={saving}
              onClick={() => setConfirmDiscard(true)}
            >
              Buang Draf
            </button>
          </div>

          <div className="flex items-center gap-3 max-[660px]:w-full max-[660px]:flex-col max-[660px]:items-stretch">
            <span className="text-[11.5px] text-[var(--ink-muted)] max-[660px]:text-center">Langkah {step} dari 4</span>
            {step < 4 ? (
              <button
                type="button"
                className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg bg-[var(--accent-blue)] px-4 text-[12.5px] font-semibold text-white transition-colors duration-150 hover:bg-sky-500"
                onClick={() => handleStepChange((step + 1) as Step)}
              >
                {nextLabel} <ArrowRight size={14} aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg bg-[var(--accent-blue)] px-4 text-[12.5px] font-bold text-white transition-colors duration-150 hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={onSave}
                disabled={saving}
              >
                {saving ? "Menyimpan…" : <><Check size={16} strokeWidth={2.5} /> Simpan &amp; Buka Handover</>}
              </button>
            )}
          </div>
        </footer>
      </Modal>

      <ConfirmDialog
        open={confirmDiscard}
        danger
        title="Buang draf handover ini?"
        message="Perubahan yang belum disimpan akan hilang jika Anda keluar sekarang."
        confirmLabel="Buang draf"
        cancelLabel="Lanjut mengisi"
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false);
          onDiscard();
        }}
      />
    </>
  );
}
