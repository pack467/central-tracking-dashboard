"use client";

import { MultiSelect, Select, type SelectOption } from "@/app/components/ui/Select";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowRightLeft, ArrowRight, Check, Calendar, Clock, Eye, Loader2, RotateCw, Users, ShieldCheck, Plus, Trash2, ChevronDown, CheckSquare, ChevronsUpDown, FileText, Clock3, UserRound, Type, AlignLeft, ListTodo, AlertCircle, Lightbulb } from "lucide-react";
import { Modal } from "@/app/components/ui/Modal";
import { ModalCloseButton } from "@/app/components/ui/ModalCloseButton";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { DatePicker } from "@/app/components/ui/DatePicker";
import type { HandoverActor, HandoverDraft, HandoverState, RosterMember } from "@/app/lib/types";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { getTaskPriorityConfig, TaskPriorityBadge } from "./TaskPriorityBadge";
import { FORM_SELECT, ProjectSelect } from "./ProjectSelect";

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
  /** The roster (Master Data): the people the PIC fields offer. */
  members: RosterMember[];
}

type Step = 1 | 2 | 3 | 4;

const SHIFT_OPTIONS = ["Subuh", "Pagi", "Malam"].map((shift) => ({ value: shift, label: `Shift ${shift}` }));
const splitNames = (value: string) => value.split(",").map((name) => name.trim()).filter(Boolean);
const formatPicNames = (names: string[], empty: string) =>
  !names.length ? empty : names.length <= 2 ? names.join(", ") : `${names.slice(0, 2).join(", ")} (+${names.length - 2})`;

const SHIFT_ROTATIONS = [
  { from: "Subuh", to: "Pagi", label: "Subuh → Pagi" },
  { from: "Pagi", to: "Malam", label: "Pagi → Malam" },
  { from: "Malam", to: "Subuh", label: "Malam → Subuh" },
];

// One look for every field in the wizard
const INPUT = "w-full min-h-[44px] pl-[40px] pr-[12px] py-[10px] rounded-lg text-[13px] bg-[var(--input-bg)] border border-[var(--panel-border)] text-[var(--ink-primary)] font-normal placeholder:text-[var(--ink-muted)] focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] focus:outline-none transition-[border-color,box-shadow] duration-150";
const TEXTAREA = `${INPUT} min-h-[96px] leading-[1.55] resize-y`;
const SELECT = "w-full min-h-[42px] pl-[40px] pr-[42px] py-[10px] rounded-lg text-[13px] bg-[var(--input-bg)] border border-[var(--panel-border)] text-[var(--ink-primary)] font-normal appearance-none cursor-pointer focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] focus:outline-none transition-[border-color,box-shadow] duration-150";
const FIELD_ICON = "absolute z-[1] left-[13px] top-[22px] -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none transition-colors duration-150 group-focus-within/shell:text-[var(--accent-blue)]";
const CARD = "rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5 max-[660px]:p-4";
const SECONDARY_BUTTON = "inline-flex items-center justify-center gap-1.5 min-h-[36px] px-[15px] rounded-lg text-[12px] font-semibold cursor-pointer transition-colors duration-150 border border-[var(--line)] bg-[var(--panel-bg)] text-[var(--ink-secondary)] hover:bg-[var(--panel-bg-hover)] hover:text-[var(--ink-primary)] disabled:opacity-50 disabled:cursor-not-allowed";
const ADD_BUTTON = "inline-flex items-center justify-center gap-1.5 min-h-[36px] px-3.5 rounded-lg border border-sky-400/40 bg-sky-400/10 text-[12px] font-bold text-sky-300 cursor-pointer transition-colors duration-150 hover:border-sky-400 hover:bg-sky-400/20 hover:text-white";
const DELETE_BUTTON = "grid size-9 shrink-0 place-items-center rounded-lg border border-transparent text-[var(--ink-muted)] transition-colors duration-150 hover:border-[var(--red-border)] hover:bg-[var(--red-soft)] hover:text-[var(--red)]";
const PROJECT_HINT = "Tidak ada di daftar? Ketik namanya di kolom cari.";

type Finding = HandoverDraft["findings"][number];
type Task = HandoverDraft["tasks"][number];
/** What saving will ask for (validateDraft), named so the person sees it on the card instead of finding out when saving. */
const namesOf = (...pairs: Array<[string, string]>) => pairs.filter(([value]) => !value.trim()).map(([, name]) => name);
const findingMissing = (finding: Finding) => namesOf([finding.title, "temuan"], [finding.project, "proyek"], [finding.detail, "keterangan"]);
const taskMissing = (task: Task) => namesOf([task.title, "tugas"], [task.project, "proyek"]);

/** An option of a short list; what the chosen one means is shown under the field. */
interface Choice extends SelectOption { description?: string }
const FINDING_STATES: Choice[] = [
  { value: "waiting", label: "Perlu dipantau", description: "Belum ada yang menangani, shift penerima perlu mengawasinya.", icon: <Eye size={16} /> },
  { value: "in-progress", label: "Sedang ditindaklanjuti", description: "Sudah ada yang menangani, shift penerima mengikuti perkembangannya.", icon: <Loader2 size={16} /> },
];
// the states a note can hold (parseHandoverContent), named as the badge on the card names them
const TASK_STATES: Choice[] = [
  { value: "repeat", label: "Routine", meta: "Rutin", description: "Pekerjaan rutin yang diulang setiap shift.", icon: <RotateCw size={16} /> },
  { value: "waiting", label: "Pending", meta: "Menunggu", description: "Menunggu tindak lanjut atau pihak lain.", icon: <Clock size={16} /> },
  { value: "in-progress", label: "In Progress", meta: "Dikerjakan", description: "Sedang dikerjakan, shift penerima melanjutkan.", icon: <Loader2 size={16} /> },
];
const TASK_PRIORITIES: Choice[] = [["High", "Tinggi"], ["Medium", "Sedang"], ["Low", "Rendah"]].map(([priority, meta]) => {
  const config = getTaskPriorityConfig(priority);
  return { value: priority, label: config.label, meta, icon: config.icon };
});

/** A field's label: the name, an optional "Opsional" tag, and the control under it. */
function Field({ label, optional, required, hint, children, className = "", htmlFor }: { label: string; optional?: boolean; required?: boolean; hint?: string; children: ReactNode; className?: string; htmlFor?: string }) {
  return (
    <label className={`grid gap-1.5 text-[12.5px] font-semibold text-[var(--ink-secondary)] ${className}`} htmlFor={htmlFor}>
      <span className="flex items-center gap-1.5">{label}{required && <span className="text-red-400" aria-hidden="true">*</span>}{optional && <span className="ml-0.5 rounded bg-slate-700/60 px-1.5 py-[1px] text-[10.5px] font-medium text-slate-400">Opsional</span>}</span>
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

/** A short list for one question: the chosen option's icon on the field, its meaning under it. */
function ChoiceSelect({ label, value, choices, onChange }: { label: string; value: string; choices: Choice[]; onChange: (value: string) => void }) {
  const chosen = choices.find((choice) => choice.value === value);
  return (
    <Field label={label} hint={chosen?.description}>
      <Select {...FORM_SELECT} aria-label={label} label={label} icon={chosen?.icon} value={value} options={choices} onValueChange={onChange} />
    </Field>
  );
}

/** The number of a card in its list. */
function ItemNumber({ value }: { value: number }) {
  return <span className="grid h-[22px] min-w-[28px] shrink-0 place-items-center rounded-md border border-[var(--accent-blue-border)] bg-[var(--accent-blue-soft)] px-1.5 font-mono text-[11px] font-bold text-[var(--accent-blue)]">#{value}</span>;
}

/** Whether a card can be saved and, if not, what it still needs. */
function CompletionNote({ missing }: { missing: string[] }) {
  if (!missing.length) return <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-emerald-400"><Check size={12} strokeWidth={3} aria-hidden="true" /> Lengkap</span>;
  return <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-amber-300"><AlertCircle size={12} aria-hidden="true" /> Belum diisi: {missing.join(", ")}</span>;
}

/** The title of a list, how many it holds, and what can be done with it. */
function ListHeader({ icon, title, count, children }: { icon: ReactNode; title: string; count: number; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <div className="flex items-center gap-2 text-[13.5px] font-semibold text-[var(--ink-primary)]">
        <span className="text-[var(--accent-blue)]" aria-hidden="true">{icon}</span> {title}
        <span className="grid h-[22px] min-w-[22px] place-items-center rounded-md bg-[var(--accent-blue-soft)] px-1.5 font-mono text-[11px] font-bold text-[var(--accent-blue)]">{count}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 max-[660px]:w-full max-[660px]:[&>button]:flex-1">{children}</div>
    </div>
  );
}

/** What a list says when it has nothing. */
function EmptyList({ icon, title, text, tone, children }: { icon: ReactNode; title: string; text: string; tone?: "green"; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-[1.5px] border-dashed border-[var(--line)] bg-[var(--panel-bg)] p-[32px_24px] text-center">
      <div className={`mb-3 grid size-12 place-items-center rounded-full border ${tone === "green" ? "border-[var(--green-border)] bg-[var(--green-soft)] text-[var(--green)]" : "border-[var(--line)] text-[var(--ink-muted)]"}`} aria-hidden="true">{icon}</div>
      <div className="mb-1 text-[14px] font-bold text-[var(--ink-primary)]">{title}</div>
      <div className={`max-w-[420px] text-[12.5px] leading-[1.5] text-[var(--ink-secondary)] ${children ? "mb-4" : ""}`}>{text}</div>
      {children}
    </div>
  );
}

const PRIORITY_ACCENT: Record<string, string> = { High: "border-l-orange-400", Medium: "border-l-amber-400", Low: "border-l-teal-400" };

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
  members,
}: HandoverWizardProps) {
  const [step, setStep] = useState<Step>(initialStep);
  // People on leave are not offered. A name already in the draft (an older note, someone no longer in the roster) stays selectable,
  // so opening a note to revise it never drops its PIC.
  const people = useMemo(() => {
    const names = new Set(members.filter((member) => member.status !== "On Leave").map((member) => member.name));
    for (const name of [...splitNames(draft.sourcePic), ...splitNames(draft.targetPic)]) names.add(name);
    return [...names].sort((a, b) => a.localeCompare(b, "id")).map((name) => ({ value: name, label: name }));
  }, [members, draft.sourcePic, draft.targetPic]);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  // a list of complete tasks starts closed so it can be read; what still needs filling in starts open. Set once: typing a title must not close the card.
  const [collapsedTasks, setCollapsedTasks] = useState<Record<number, boolean>>(() => Object.fromEntries(draft.tasks.map((task) => [task.id, taskMissing(task).length === 0])));
  const formScrollRef = useRef<HTMLDivElement>(null);
  // a card just added: its first field gets the focus once it is on screen, or the person is left looking at the top of a long list
  const focusAfterAdd = useRef<string | null>(null);
  useEffect(() => {
    const id = focusAfterAdd.current;
    if (!id) return;
    focusAfterAdd.current = null;
    const field = document.getElementById(id);
    field?.scrollIntoView({ block: "center" });
    field?.focus({ preventScroll: true });
  }, [draft.tasks.length, draft.findings.length]);

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
          project: "",
          detail: "",
          state: "repeat" as HandoverState,
          priority: "Medium",
          completed: false,
        },
      ],
    }));
    setCollapsedTasks((prev) => ({ ...prev, [newId]: false }));
    focusAfterAdd.current = `task-title-${newId}`;
  };

  const removeTask = (taskId: number) => {
    onDraftChange((previous) => ({
      ...previous,
      tasks: previous.tasks.filter((task) => task.id !== taskId),
    }));
  };

  const toggleTaskCollapse = (taskId: number) => {
    setCollapsedTasks((prev) => ({ ...prev, [taskId]: !(prev[taskId] ?? true) }));
  };

  const showIncompleteTasks = () => {
    setCollapsedTasks(Object.fromEntries(draft.tasks.map((task) => [task.id, taskMissing(task).length === 0])));
    const first = draft.tasks.find((task) => taskMissing(task).length > 0);
    if (first) requestAnimationFrame(() => formScrollRef.current?.querySelector(`[data-task-id="${first.id}"]`)?.scrollIntoView({ block: "start" }));
  };

  const toggleAllTasks = (collapse: boolean) => {
    const nextState: Record<number, boolean> = {};
    draft.tasks.forEach((task) => {
      nextState[task.id] = collapse;
    });
    setCollapsedTasks(nextState);
  };

  const areAllTasksCollapsed = draft.tasks.length > 0 && draft.tasks.every((task) => collapsedTasks[task.id] ?? true);

  const addFinding = () => {
    onDraftChange((previous) => ({
      ...previous,
      findings: [...previous.findings, { project: "", title: "", detail: "", state: "waiting" as const }],
    }));
    focusAfterAdd.current = `finding-title-${draft.findings.length}`;
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

  // What is still missing per step, shown on the stepper (it does not block anything: saving checks it)
  const shiftInfoComplete = Boolean(draft.date && draft.sourceShift.trim() && draft.targetShift.trim() && draft.sourcePic.trim() && draft.targetPic.trim());
  const incompleteFindings = draft.findings.filter((finding) => findingMissing(finding).length > 0).length;
  const incompleteTasks = draft.tasks.filter((task) => taskMissing(task).length > 0).length;
  const hasNote = Boolean(draft.notes?.trim());
  const steps: Array<{ step: Step; label: string; sub: string; ok: boolean }> = [
    { step: 1, label: "Shift & PIC", sub: shiftInfoComplete ? `${draft.sourceShift} → ${draft.targetShift}` : "Belum lengkap", ok: shiftInfoComplete },
    { step: 2, label: "Catatan", sub: hasNote ? "Ada catatan" : "Opsional", ok: true },
    { step: 3, label: "Temuan", sub: incompleteFindings ? `${incompleteFindings} belum lengkap` : draft.findings.length ? `${draft.findings.length} temuan` : "Tidak ada", ok: incompleteFindings === 0 },
    { step: 4, label: "Tugas", sub: incompleteTasks ? `${incompleteTasks} belum lengkap` : `${draft.tasks.length} tugas`, ok: incompleteTasks === 0 },
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
              <p className="m-0 mt-1 text-[12.5px] leading-[1.5] text-[var(--ink-secondary)] max-[660px]:hidden">Isi empat langkah singkat untuk shift penerima, lalu simpan.</p>
              {(!draftSaved || mode === "edit") && (
                <p className="mt-2 inline-flex w-fit items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--panel-bg)] px-2.5 py-1 text-[11.5px] text-[var(--ink-secondary)]" role="status">
                  {!draftSaved && <span className="size-[7px] shrink-0 rounded-full bg-[var(--orange)]" />}
                  {!draftSaved && "Draf belum tersimpan — jangan tutup halaman"}
                  {mode === "edit" && <span>{!draftSaved && " · "}Revisi akan mengulang checklist penerimaan.</span>}
                </p>
              )}
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
                    <Select icon={<Clock3 size={16} aria-hidden="true" />} className={SELECT} aria-label="Shift yang menyerahkan" required
                      options={[{ value: "", label: "Pilih shift" }, ...SHIFT_OPTIONS]} value={draft.sourceShift}
                      onValueChange={(sourceShift) => onDraftChange((prev) => ({ ...prev, sourceShift }))} />
                  </Field>
                  <span className="mb-[5px] grid size-8 place-items-center rounded-full border border-[var(--accent-blue-border)] bg-[var(--accent-blue-soft)] text-[var(--accent-blue)] max-[660px]:mb-0 max-[660px]:justify-self-center max-[660px]:rotate-90" title="Arah serah terima" aria-hidden="true">
                    <ArrowRight size={16} />
                  </span>
                  <Field label="Shift yang menerima">
                    <Select icon={<Clock3 size={16} aria-hidden="true" />} className={SELECT} aria-label="Shift yang menerima" required
                      options={[{ value: "", label: "Pilih shift" }, ...SHIFT_OPTIONS]} value={draft.targetShift}
                      onValueChange={(targetShift) => onDraftChange((prev) => ({ ...prev, targetShift }))} />
                  </Field>
                </div>
              </div>

              <div className={CARD}>
                <CardTitle icon={<Users size={16} />} title="Penanggung jawab (PIC)" sub="Siapa yang menyerahkan dan siapa yang menerima" />
                <div className="grid grid-cols-2 items-start gap-4 max-[660px]:grid-cols-1">
                  <Field label="PIC shift pengirim" hint="Boleh memilih lebih dari satu orang.">
                    <MultiSelect icon={<UserRound size={16} aria-hidden="true" />} className={SELECT} aria-label="PIC shift pengirim" required searchable
                      placeholder="Pilih PIC pengirim" options={people} value={splitNames(draft.sourcePic)}
                      onChange={(names) => onDraftChange((prev) => ({ ...prev, sourcePic: names.join(", ") }))}
                      formatValue={(names) => formatPicNames(names, "Pilih PIC pengirim")} />
                  </Field>
                  <Field label="PIC shift penerima" hint="Boleh memilih lebih dari satu orang.">
                    <MultiSelect icon={<Users size={16} aria-hidden="true" />} className={SELECT} aria-label="PIC shift penerima" required searchable
                      placeholder="Pilih PIC penerima" options={people} value={splitNames(draft.targetPic)}
                      onChange={(names) => onDraftChange((prev) => ({ ...prev, targetPic: names.join(", ") }))}
                      formatValue={(names) => formatPicNames(names, "Pilih PIC penerima")} />
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
              STEP 3: TEMUAN
             ══════════════════════════════════════ */}
          {step === 3 && (
            <section className="flex flex-col gap-4">
              <StepIntro step={3} title="Adakah kendala yang perlu diketahui shift berikutnya?" text="Temuan adalah kondisi yang perlu diawasi, misalnya checkpoint yang bermasalah. Pekerjaan yang harus diselesaikan dicatat di langkah Tugas. Tidak ada kendala? Langsung lanjut." />

              {draft.findings.length > 0 && (
                <ListHeader icon={<ShieldCheck size={16} />} title="Temuan untuk shift penerima" count={draft.findings.length}>
                  <button type="button" className={ADD_BUTTON} onClick={addFinding}>
                    <Plus size={14} strokeWidth={2.5} /> Tambah Temuan
                  </button>
                </ListHeader>
              )}

              <div className="flex flex-col gap-3">
                {draft.findings.length > 0 ? (
                  draft.findings.map((finding, index) => {
                    const missing = findingMissing(finding);
                    return (
                      <article key={`finding-${index}`} className={`overflow-hidden rounded-xl border border-[var(--panel-border)] border-l-[3px] bg-[var(--panel-bg)] ${finding.state === "waiting" ? "border-l-amber-400" : "border-l-violet-400"}`}>
                        <header className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-3 max-[660px]:px-4">
                          <div className="flex min-w-0 items-start gap-2.5">
                            <ItemNumber value={index + 1} />
                            <div className="min-w-0">
                              <strong className={`block truncate text-[13.5px] font-semibold leading-[22px] ${finding.title.trim() ? "text-[var(--ink-primary)]" : "text-[var(--ink-muted)]"}`}>{finding.title.trim() || "Temuan baru"}</strong>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                {finding.project && <ProjectPill name={finding.project} />}
                                <CompletionNote missing={missing} />
                              </div>
                            </div>
                          </div>
                          <button type="button" className={DELETE_BUTTON} onClick={() => removeFinding(index)} aria-label={`Hapus temuan #${index + 1}`} title="Hapus temuan">
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        </header>

                        <div className="grid gap-4 p-5 max-[660px]:p-4">
                          <Field label="Apa temuannya?" required>
                            <span className="group/shell relative block w-full min-w-0">
                              <Type className={FIELD_ICON} size={16} aria-hidden="true" />
                              <input id={`finding-title-${index}`} className={INPUT} value={finding.title} onChange={(event) => updateFinding(index, { title: event.target.value })} placeholder="Contoh: Checkpoint SIEM belum menerima data terbaru" />
                            </span>
                          </Field>
                          <div className="grid items-start gap-4 min-[561px]:grid-cols-2">
                            <Field label="Proyek terkait" required htmlFor={`finding-project-${index}`} hint={PROJECT_HINT}>
                              <ProjectSelect id={`finding-project-${index}`} value={finding.project} onChange={(project) => updateFinding(index, { project })} />
                            </Field>
                            <ChoiceSelect label="Bagaimana kondisinya sekarang?" value={finding.state} choices={FINDING_STATES} onChange={(state) => updateFinding(index, { state: state as Finding["state"] })} />
                          </div>
                          <Field label="Apa yang sudah diperiksa, dan apa yang harus dilakukan shift penerima?" required>
                            <span className="group/shell relative block w-full min-w-0">
                              <AlignLeft className={FIELD_ICON} size={16} aria-hidden="true" />
                              <textarea rows={3} className={TEXTAREA} value={finding.detail} onChange={(event) => updateFinding(index, { detail: event.target.value })} placeholder="Contoh: Data berhenti masuk sejak 06.30, indexer sudah direstart. Pantau sampai data masuk kembali." />
                            </span>
                          </Field>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <EmptyList icon={<ShieldCheck size={24} />} tone="green" title="Tidak ada temuan" text="Bagus kalau memang tidak ada kendala. Tambahkan hanya bila ada kondisi yang perlu diawasi shift berikutnya.">
                    <button type="button" className={ADD_BUTTON} onClick={addFinding}>
                      <Plus size={14} strokeWidth={2.5} /> Tambah Temuan
                    </button>
                  </EmptyList>
                )}
              </div>
            </section>
          )}

          {/* ══════════════════════════════════════
              STEP 4: TUGAS
             ══════════════════════════════════════ */}
          {step === 4 && (
            <section className="flex flex-col gap-4">
              <StepIntro step={4} title="Pekerjaan apa yang harus dilanjutkan?" text="Daftar ini sudah terisi dari shift sebelumnya dan tiket yang masih terbuka. Klik sebuah tugas untuk mengubahnya, hapus yang tidak perlu, dan tambahkan yang belum ada." />

              <ListHeader icon={<CheckSquare size={16} />} title="Tugas untuk shift penerima" count={draft.tasks.length}>
                {draft.tasks.length > 1 && (
                  <button type="button" className={`${SECONDARY_BUTTON} min-h-[36px] px-3 text-[12px]`} onClick={() => toggleAllTasks(!areAllTasksCollapsed)}>
                    <ChevronsUpDown size={14} aria-hidden="true" />
                    {areAllTasksCollapsed ? "Buka Semua" : "Tutup Semua"}
                  </button>
                )}
                <button type="button" className={ADD_BUTTON} onClick={addTask}>
                  <Plus size={14} strokeWidth={2.5} /> Tambah Tugas
                </button>
              </ListHeader>

              {incompleteTasks > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl border border-amber-400/30 bg-amber-400/[0.06] px-4 py-2.5 text-[12.5px] text-amber-100" role="status">
                  <span className="flex items-center gap-2"><AlertCircle size={15} className="shrink-0 text-amber-400" aria-hidden="true" /> {incompleteTasks} tugas belum lengkap dan harus diisi sebelum disimpan.</span>
                  <button type="button" className="min-h-[28px] font-semibold text-amber-300 underline-offset-2 hover:underline" onClick={showIncompleteTasks}>Tampilkan</button>
                </div>
              )}

              <div className="flex flex-col gap-2.5">
                {draft.tasks.length === 0 && (
                  <EmptyList icon={<CheckSquare size={24} />} title="Belum ada tugas" text="Tambahkan pekerjaan yang harus dilanjutkan shift penerima." />
                )}
                {draft.tasks.map((task, index) => {
                  const isCollapsed = collapsedTasks[task.id] ?? true;
                  const missing = taskMissing(task);
                  const origin = task.sourceRef?.startsWith("ticket:") ? "Dari tiket" : String(task.taskTemplateId ?? "").startsWith("custom-") ? "Baru" : null;
                  const summary = task.detail.split("\n")[0].trim();
                  return (
                    <article key={task.id} data-task-id={task.id} className={`overflow-hidden rounded-xl border border-[var(--panel-border)] border-l-[3px] bg-[var(--panel-bg)] transition-colors duration-150 hover:border-[var(--accent-blue-border)] ${PRIORITY_ACCENT[task.priority || "Medium"] ?? "border-l-slate-500"}`}>
                      <div className={`flex items-start gap-1 pr-2 ${!isCollapsed ? "border-b border-[var(--line)]" : ""}`}>
                        <button type="button" className="flex min-w-0 flex-1 items-start gap-2.5 py-3 pl-3.5 pr-1 text-left" aria-expanded={!isCollapsed} onClick={() => toggleTaskCollapse(task.id)}>
                          <ChevronDown size={16} aria-hidden="true" className={`mt-[3px] shrink-0 text-[var(--ink-muted)] transition-transform duration-200 motion-reduce:transition-none ${!isCollapsed ? "rotate-180" : ""}`} />
                          <ItemNumber value={index + 1} />
                          <span className="min-w-0 flex-1">
                            <span className={`block truncate text-[13.5px] font-semibold leading-[22px] ${task.title.trim() ? "text-[var(--ink-primary)]" : "text-[var(--ink-muted)]"}`}>{task.title.trim() || "Tugas baru"}</span>
                            {isCollapsed && summary && <span className="mt-0.5 block truncate text-[12px] font-normal text-[var(--ink-muted)]">{summary}</span>}
                            <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              {task.project && <ProjectPill name={task.project} />}
                              <TaskStatusBadge state={task.state} />
                              <TaskPriorityBadge priority={task.priority || "Medium"} />
                              {origin && <span className="rounded-md border border-[var(--line)] px-1.5 py-0.5 text-[10.5px] font-medium text-[var(--ink-muted)]">{origin}</span>}
                              {missing.length > 0 && <CompletionNote missing={missing} />}
                            </span>
                          </span>
                        </button>
                        <button type="button" className={`${DELETE_BUTTON} mt-2`} onClick={() => removeTask(task.id)} aria-label={`Hapus tugas #${index + 1}`} title="Hapus tugas">
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </div>

                      {!isCollapsed && (
                        <div className="grid gap-4 bg-[var(--bg)] p-5 max-[660px]:p-4">
                          <Field label="Apa tugasnya?" required>
                            <span className="group/shell relative block w-full min-w-0">
                              <ListTodo className={FIELD_ICON} size={16} aria-hidden="true" />
                              <input id={`task-title-${task.id}`} className={INPUT} value={task.title} onChange={(event) => updateTask(task.id, { title: event.target.value })} placeholder="Contoh: Periksa alarm dan laporan SIEM" />
                            </span>
                          </Field>
                          <div className="grid items-start gap-4 min-[761px]:grid-cols-3">
                            <Field label="Proyek" required htmlFor={`task-project-${task.id}`} hint={PROJECT_HINT}>
                              <ProjectSelect id={`task-project-${task.id}`} value={task.project} onChange={(project) => updateTask(task.id, { project })} />
                            </Field>
                            <ChoiceSelect label="Seberapa penting?" value={task.priority || "Medium"} choices={TASK_PRIORITIES} onChange={(priority) => updateTask(task.id, { priority })} />
                            <ChoiceSelect label="Bagaimana statusnya?" value={task.state} choices={TASK_STATES} onChange={(state) => updateTask(task.id, { state })} />
                          </div>
                          <Field label="Apa yang perlu dilakukan shift penerima?" optional>
                            <span className="group/shell relative block w-full min-w-0">
                              <AlignLeft className={FIELD_ICON} size={16} aria-hidden="true" />
                              <textarea rows={3} className={TEXTAREA} value={task.detail} onChange={(event) => updateTask(task.id, { detail: event.target.value })} placeholder="Tulis langkah berikutnya, batas waktu bila ada, dan informasi yang diperlukan." />
                            </span>
                          </Field>
                        </div>
                      )}
                    </article>
                  );
                })}
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
            <span className="text-[11.5px] text-[var(--ink-muted)] max-[660px]:hidden">Langkah {step} dari 4</span>
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
