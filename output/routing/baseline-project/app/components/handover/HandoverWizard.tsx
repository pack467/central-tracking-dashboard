"use client";

import { useRef, useState } from "react";
import {
  ArrowRightLeft,
  ArrowRight,
  Check,
  Calendar,
  Users,
  ShieldCheck,
  Plus,
  Trash2,
  ChevronDown,
  CheckSquare,
  ChevronsUpDown,
  FileText,
  Clock3,
  UserRound,
  FolderKanban,
  Activity,
  Type,
  AlignLeft,
  ListTodo,
  Flag,
} from "lucide-react";
import { Modal } from "@/app/components/ui/Modal";
import { ModalCloseButton } from "@/app/components/ui/ModalCloseButton";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { ProjectMark } from "@/app/components/ui/ProjectMark";
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

const SHIFT_ROTATIONS = [
  { from: "Subuh", to: "Pagi", label: "Subuh → Pagi" },
  { from: "Pagi", to: "Malam", label: "Pagi → Malam" },
  { from: "Malam", to: "Subuh", label: "Malam → Subuh" },
];

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
  const [step, setStep] = useState<1 | 2 | 3 | 4>(initialStep);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [collapsedTasks, setCollapsedTasks] = useState<Record<number, boolean>>({});
  const formScrollRef = useRef<HTMLDivElement>(null);

  const title = mode === "edit" ? "Edit Catatan Handover" : mode === "prepare" ? "Siapkan Handover" : "Buat Handover Baru";

  const requestClose = () => {
    if (saving) return;
    if (dirty && !draftSaved) setConfirmDiscard(true);
    else onClose();
  };

  const handleStepChange = (targetStep: 1 | 2 | 3 | 4) => {
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

  return (
    <>
      <Modal open={open} onClose={requestClose} label={title} variant="form" width={920}>
        {/* Modern Modal Header */}
        <header className="flex justify-between items-start gap-[24px] max-[660px]:gap-[12px] p-[22px_28px_20px] max-[660px]:p-[18px_16px] border-b border-[var(--line)] bg-[linear-gradient(135deg,var(--accent-blue-soft),transparent_70%)]">
          <div className="flex flex-col gap-[7px]">
            <div className="flex items-center gap-[7px] text-[var(--accent-blue)] font-mono text-[10px] font-bold tracking-[0.75px]">
              <span className="w-[6px] h-[6px] rounded-full bg-[var(--green)] animate-[liveDotPulse_2s_infinite_ease-in-out] inline-block" />{" "}
              {mode === "prepare" ? "PERSIAPAN SERAH TERIMA SHIFT" : "CATATAN SERAH TERIMA"}
            </div>
            <div className="flex items-center gap-[9px]">
              <span className="inline-grid place-items-center w-[28px] h-[28px] rounded-[7px] bg-[var(--accent-blue-soft)] text-[var(--accent-blue)] border border-[var(--accent-blue-border)] shrink-0">
                <ArrowRightLeft size={16} />
              </span>
              <h2 className="m-0 text-[var(--ink-primary)] text-[20px] font-bold leading-[1.25] tracking-[-0.35px]">{title}</h2>
            </div>
            <p className="m-0 text-[13px] text-[var(--ink-secondary)] leading-[1.5]">Siapkan informasi yang perlu diketahui shift penerima, lalu periksa kembali sebelum menyimpan.</p>
            <p className="inline-flex items-center gap-[7px] w-fit mt-[4px] px-[9px] py-[6px] border border-[var(--line)] rounded-[6px] bg-[var(--panel-bg)] text-[11px] text-[var(--ink-secondary)]" role="status">
              <span className={`w-[7px] h-[7px] shrink-0 rounded-full ${draftSaved ? "bg-[var(--green)]" : "bg-[var(--orange)]"}`} />
              {draftSaved ? "Draf tersimpan otomatis di perangkat ini" : "Draf belum tersimpan — jangan tutup halaman"}
              {mode === "edit" && <span> · Revisi akan mengulang checklist penerimaan.</span>}
            </p>
          </div>
          <ModalCloseButton onClose={requestClose} />
        </header>

        {/* 4-Step Interactive Progress Stepper */}
        <div className="px-[28px] py-[12px] max-[660px]:px-[16px] max-[660px]:py-[10px] bg-[var(--bg)] border-b border-[var(--line)]" role="navigation" aria-label="Langkah handover">
          <div className="grid grid-cols-4 max-[660px]:grid-cols-2 gap-[8px] w-full relative">
            {/* Step 1 */}
            <button
              type="button"
              className={`flex items-center gap-[9px] min-w-0 min-h-[52px] p-[9px_11px] rounded-[8px] border cursor-pointer transition-all duration-150 z-[2] ${
                step === 1
                  ? "bg-[var(--accent-blue-soft)] border-[var(--accent-blue)]"
                  : "bg-[var(--panel-bg)] border-[var(--line)] hover:bg-[var(--panel-bg-hover)] hover:border-[var(--accent-blue-border)]"
              }`}
              onClick={() => handleStepChange(1)}
              aria-current={step === 1 ? "step" : undefined}
            >
              <div
                className={`inline-grid place-items-center w-[30px] h-[30px] rounded-full text-[12px] font-bold font-mono border-[1.5px] transition-all duration-200 shrink-0 ${
                  step === 1
                    ? "bg-[var(--accent-blue)] border-[var(--accent-blue)] text-white shadow-[0_0_0_3px_var(--accent-blue-soft)]"
                    : "bg-[var(--panel-bg)] border-[var(--line)] text-[var(--ink-muted)]"
                }`}
              >
                1
              </div>
              <div className="flex flex-col items-start text-left leading-[1.2]">
                <span className={`text-[10px] font-bold uppercase tracking-[0.5px] font-mono ${step === 1 ? "text-[var(--accent-blue)]" : "text-[var(--ink-muted)]"}`}>
                  Langkah 1
                </span>
                <span className={`text-[12.5px] flex items-center gap-[5px] ${step === 1 ? "text-[var(--ink-primary)] font-bold" : "text-[var(--ink-secondary)] font-semibold"}`}>
                  Shift &amp; PIC
                </span>
              </div>
            </button>

            {/* Step 2 */}
            <button
              type="button"
              className={`flex items-center gap-[9px] min-w-0 min-h-[52px] p-[9px_11px] rounded-[8px] border cursor-pointer transition-all duration-150 z-[2] ${
                step === 2
                  ? "bg-[var(--accent-blue-soft)] border-[var(--accent-blue)]"
                  : "bg-[var(--panel-bg)] border-[var(--line)] hover:bg-[var(--panel-bg-hover)] hover:border-[var(--accent-blue-border)]"
              }`}
              onClick={() => handleStepChange(2)}
              aria-current={step === 2 ? "step" : undefined}
            >
              <div
                className={`inline-grid place-items-center w-[30px] h-[30px] rounded-full text-[12px] font-bold font-mono border-[1.5px] transition-all duration-200 shrink-0 ${
                  step === 2
                    ? "bg-[var(--accent-blue)] border-[var(--accent-blue)] text-white shadow-[0_0_0_3px_var(--accent-blue-soft)]"
                    : "bg-[var(--panel-bg)] border-[var(--line)] text-[var(--ink-muted)]"
                }`}
              >
                2
              </div>
              <div className="flex flex-col items-start text-left leading-[1.2]">
                <span className={`text-[10px] font-bold uppercase tracking-[0.5px] font-mono ${step === 2 ? "text-[var(--accent-blue)]" : "text-[var(--ink-muted)]"}`}>
                  Langkah 2
                </span>
                <span className={`text-[12.5px] flex items-center gap-[5px] ${step === 2 ? "text-[var(--ink-primary)] font-bold" : "text-[var(--ink-secondary)] font-semibold"}`}>
                  Catatan
                </span>
              </div>
            </button>

            {/* Step 3 */}
            <button
              type="button"
              className={`flex items-center gap-[9px] min-w-0 min-h-[52px] p-[9px_11px] rounded-[8px] border cursor-pointer transition-all duration-150 z-[2] ${
                step === 3
                  ? "bg-[var(--accent-blue-soft)] border-[var(--accent-blue)]"
                  : "bg-[var(--panel-bg)] border-[var(--line)] hover:bg-[var(--panel-bg-hover)] hover:border-[var(--accent-blue-border)]"
              }`}
              onClick={() => handleStepChange(3)}
              aria-current={step === 3 ? "step" : undefined}
            >
              <div
                className={`inline-grid place-items-center w-[30px] h-[30px] rounded-full text-[12px] font-bold font-mono border-[1.5px] transition-all duration-200 shrink-0 ${
                  step === 3
                    ? "bg-[var(--accent-blue)] border-[var(--accent-blue)] text-white shadow-[0_0_0_3px_var(--accent-blue-soft)]"
                    : "bg-[var(--panel-bg)] border-[var(--line)] text-[var(--ink-muted)]"
                }`}
              >
                3
              </div>
              <div className="flex flex-col items-start text-left leading-[1.2]">
                <span className={`text-[10px] font-bold uppercase tracking-[0.5px] font-mono ${step === 3 ? "text-[var(--accent-blue)]" : "text-[var(--ink-muted)]"}`}>
                  Langkah 3
                </span>
                <span className={`text-[12.5px] flex items-center gap-[5px] ${step === 3 ? "text-[var(--ink-primary)] font-bold" : "text-[var(--ink-secondary)] font-semibold"}`}>
                  Temuan{" "}
                  <span
                    className={`inline-flex items-center justify-center px-[5px] py-[1px] rounded-full text-[9.5px] font-bold font-mono ${
                      step === 3 ? "bg-[var(--accent-blue)] text-white" : "bg-[var(--panel-border)] text-[var(--ink-muted)]"
                    }`}
                  >
                    {draft.findings.length}
                  </span>
                </span>
              </div>
            </button>

            {/* Step 4 */}
            <button
              type="button"
              className={`flex items-center gap-[9px] min-w-0 min-h-[52px] p-[9px_11px] rounded-[8px] border cursor-pointer transition-all duration-150 z-[2] ${
                step === 4
                  ? "bg-[var(--accent-blue-soft)] border-[var(--accent-blue)]"
                  : "bg-[var(--panel-bg)] border-[var(--line)] hover:bg-[var(--panel-bg-hover)] hover:border-[var(--accent-blue-border)]"
              }`}
              onClick={() => handleStepChange(4)}
              aria-current={step === 4 ? "step" : undefined}
            >
              <div
                className={`inline-grid place-items-center w-[30px] h-[30px] rounded-full text-[12px] font-bold font-mono border-[1.5px] transition-all duration-200 shrink-0 ${
                  step === 4
                    ? "bg-[var(--accent-blue)] border-[var(--accent-blue)] text-white shadow-[0_0_0_3px_var(--accent-blue-soft)]"
                    : "bg-[var(--panel-bg)] border-[var(--line)] text-[var(--ink-muted)]"
                }`}
              >
                4
              </div>
              <div className="flex flex-col items-start text-left leading-[1.2]">
                <span className={`text-[10px] font-bold uppercase tracking-[0.5px] font-mono ${step === 4 ? "text-[var(--accent-blue)]" : "text-[var(--ink-muted)]"}`}>
                  Langkah 4
                </span>
                <span className={`text-[12.5px] flex items-center gap-[5px] ${step === 4 ? "text-[var(--ink-primary)] font-bold" : "text-[var(--ink-secondary)] font-semibold"}`}>
                  Tugas{" "}
                  <span
                    className={`inline-flex items-center justify-center px-[5px] py-[1px] rounded-full text-[9.5px] font-bold font-mono ${
                      step === 4 ? "bg-[var(--accent-blue)] text-white" : "bg-[var(--panel-border)] text-[var(--ink-muted)]"
                    }`}
                  >
                    {draft.tasks.length}
                  </span>
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Form Body Scroll Area */}
        <div ref={formScrollRef} className="flex-1 overflow-y-auto p-[24px_28px_28px] max-[660px]:p-[18px_16px_24px]" inert={saving}>
          {/* ══════════════════════════════════════
              STEP 1: INFORMASI SHIFT
             ══════════════════════════════════════ */}
          {step === 1 && (
            <section className="flex flex-col">
              <div className="mb-[20px]">
                <span className="block mb-[5px] text-[11px] font-bold text-[var(--accent-blue)]">Langkah 1 dari 4</span>
                <h3 className="m-0 mb-[5px] text-[20px] max-[660px]:text-[18px] font-bold leading-[1.3] text-[var(--ink-primary)]">
                  Siapa yang menyerahkan dan menerima shift?
                </h3>
                <p className="m-0 text-[13px] leading-[1.5] text-[var(--ink-secondary)]">
                  Pastikan tanggal, arah pergantian shift, dan penanggung jawab sudah benar.
                </p>
              </div>

              {/* Card 1: Tanggal & Rotasi Shift */}
              <div className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-[10px] p-[20px_22px] max-[660px]:p-[16px] mb-[16px] last:mb-0 shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
                <div className="flex items-center justify-between mb-[18px] max-[660px]:flex-col max-[660px]:items-start max-[660px]:gap-[6px]">
                  <span className="flex items-center gap-[8px] text-[14px] font-bold text-[var(--ink-primary)] [&>svg]:text-[var(--accent-blue)]">
                    <Calendar size={15} /> Tanggal &amp; Rotasi Shift
                  </span>
                  <span className="text-[11.5px] text-[var(--ink-muted)]">Tentukan tanggal dan arah serah terima</span>
                </div>

                <div className="mb-[14px]">
                  <div className="grid gap-[5px] text-[12px] text-[var(--ink-secondary)] font-bold mb-[10px]">
                    <span>Tanggal serah terima</span>
                    <DatePicker
                      value={draft.date}
                      onChange={(date) => onDraftChange((prev) => ({ ...prev, date }))}
                      mode="single"
                      required
                      aria-label="Tanggal serah terima"
                    />
                  </div>
                </div>

                {/* Shift Pengirim & Penerima with directional arrow */}
                <div className="flex items-center gap-[12px] max-[660px]:flex-col max-[660px]:items-stretch">
                  <div className="flex-1 min-w-0">
                    <label className="grid gap-[5px] text-[12px] text-[var(--ink-secondary)] font-bold mb-[10px]">
                      Shift yang menyerahkan
                      <span className="group/shell block relative w-full min-w-0">
                        <Clock3 className="absolute z-[1] left-[13px] top-[21px] -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none transition-colors duration-150 group-focus-within/shell:text-[var(--accent-blue)]" size={16} aria-hidden="true" />
                        <input
                          className="w-full min-h-[42px] pl-[40px] pr-[12px] py-[10px] rounded-[7px] text-[13px] bg-[var(--input-bg)] border border-[var(--panel-border)] text-[var(--ink-primary)] font-normal placeholder:text-[var(--ink-muted)] placeholder:opacity-85 focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] focus:outline-none transition-all duration-150"
                          value={draft.sourceShift}
                          onChange={(event) => onDraftChange((prev) => ({ ...prev, sourceShift: event.target.value }))}
                          placeholder="Contoh: Subuh"
                          required
                        />
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center justify-center w-[32px] h-[32px] mt-[14px] rounded-full bg-[var(--accent-blue-soft)] border border-[var(--accent-blue-border)] text-[var(--accent-blue)] shrink-0 max-[660px]:self-center max-[660px]:my-[4px] max-[660px]:rotate-90" title="Arah serah terima tugas">
                    <ArrowRight size={16} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <label className="grid gap-[5px] text-[12px] text-[var(--ink-secondary)] font-bold mb-[10px]">
                      Shift yang menerima
                      <span className="group/shell block relative w-full min-w-0">
                        <Clock3 className="absolute z-[1] left-[13px] top-[21px] -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none transition-colors duration-150 group-focus-within/shell:text-[var(--accent-blue)]" size={16} aria-hidden="true" />
                        <input
                          className="w-full min-h-[42px] pl-[40px] pr-[12px] py-[10px] rounded-[7px] text-[13px] bg-[var(--input-bg)] border border-[var(--panel-border)] text-[var(--ink-primary)] font-normal placeholder:text-[var(--ink-muted)] placeholder:opacity-85 focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] focus:outline-none transition-all duration-150"
                          value={draft.targetShift}
                          onChange={(event) => onDraftChange((prev) => ({ ...prev, targetShift: event.target.value }))}
                          placeholder="Contoh: Pagi"
                          required
                        />
                      </span>
                    </label>
                  </div>
                </div>

                {/* Quick Shift Rotation Presets */}
                <div className="flex items-center gap-[6px] mt-[12px] flex-wrap">
                  <span className="text-[10.5px] text-[var(--ink-muted)] font-mono">Pilih rotasi yang sesuai:</span>
                  {SHIFT_ROTATIONS.map((rotation) => {
                    const isSelected =
                      draft.sourceShift.toLowerCase() === rotation.from.toLowerCase() &&
                      draft.targetShift.toLowerCase() === rotation.to.toLowerCase();
                    return (
                      <button
                        key={rotation.label}
                        type="button"
                        className={`inline-flex items-center gap-[4px] p-[4px_9px] rounded-[6px] text-[11px] cursor-pointer transition-all duration-150 border ${
                          isSelected
                            ? "bg-[var(--accent-blue-soft)] border-[var(--accent-blue)] text-[var(--accent-blue)] font-bold"
                            : "bg-[var(--bg)] border-[var(--line)] text-[var(--ink-secondary)] font-semibold hover:bg-[var(--accent-blue-soft)] hover:border-[var(--accent-blue-border)] hover:text-[var(--accent-blue)]"
                        }`}
                        onClick={() => applyShiftRotation(rotation.from, rotation.to)}
                      >
                        {rotation.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Card 2: Personil / PIC */}
              <div className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-[10px] p-[20px_22px] max-[660px]:p-[16px] mb-[16px] last:mb-0 shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
                <div className="flex items-center justify-between mb-[18px] max-[660px]:flex-col max-[660px]:items-start max-[660px]:gap-[6px]">
                  <span className="flex items-center gap-[8px] text-[14px] font-bold text-[var(--ink-primary)] [&>svg]:text-[var(--accent-blue)]">
                    <Users size={15} /> Personil Penanggung Jawab (PIC)
                  </span>
                  <span className="text-[11.5px] text-[var(--ink-muted)]">Identitas pelaksana serah terima</span>
                </div>

                <div className="grid grid-cols-2 max-[660px]:grid-cols-1 gap-[14px] items-start">
                  <label className="grid gap-[5px] text-[12px] text-[var(--ink-secondary)] font-bold mb-[10px]">
                    Penanggung jawab shift pengirim
                    <span className="group/shell block relative w-full min-w-0">
                      <UserRound className="absolute z-[1] left-[13px] top-[21px] -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none transition-colors duration-150 group-focus-within/shell:text-[var(--accent-blue)]" size={16} aria-hidden="true" />
                      <input
                        className="w-full min-h-[42px] pl-[40px] pr-[12px] py-[10px] rounded-[7px] text-[13px] bg-[var(--input-bg)] border border-[var(--panel-border)] text-[var(--ink-primary)] font-normal placeholder:text-[var(--ink-muted)] placeholder:opacity-85 focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] focus:outline-none transition-all duration-150"
                        value={draft.sourcePic}
                        onChange={(event) => onDraftChange((prev) => ({ ...prev, sourcePic: event.target.value }))}
                        placeholder="Nama penanggung jawab shift saat ini"
                        required
                      />
                    </span>
                  </label>
                  <label className="grid gap-[5px] text-[12px] text-[var(--ink-secondary)] font-bold mb-[10px]">
                    Penanggung jawab shift penerima
                    <span className="group/shell block relative w-full min-w-0">
                      <UserRound className="absolute z-[1] left-[13px] top-[21px] -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none transition-colors duration-150 group-focus-within/shell:text-[var(--accent-blue)]" size={16} aria-hidden="true" />
                      <input
                        className="w-full min-h-[42px] pl-[40px] pr-[12px] py-[10px] rounded-[7px] text-[13px] bg-[var(--input-bg)] border border-[var(--panel-border)] text-[var(--ink-primary)] font-normal placeholder:text-[var(--ink-muted)] placeholder:opacity-85 focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] focus:outline-none transition-all duration-150"
                        value={draft.targetPic}
                        onChange={(event) => onDraftChange((prev) => ({ ...prev, targetPic: event.target.value }))}
                        placeholder="Nama penerima, contoh: Budi, Andi"
                        required
                      />
                    </span>
                  </label>
                </div>
              </div>
            </section>
          )}

          {/* ══════════════════════════════════════
              STEP 2: CATATAN SHIFT
             ══════════════════════════════════════ */}
          {step === 2 && (
            <section className="flex flex-col">
              <div className="mb-[20px]">
                <span className="block mb-[5px] text-[11px] font-bold text-[var(--accent-blue)]">Langkah 2 dari 4</span>
                <h3 className="m-0 mb-[5px] text-[20px] max-[660px]:text-[18px] font-bold leading-[1.3] text-[var(--ink-primary)]">
                  Apa yang perlu diketahui shift berikutnya?
                </h3>
                <p className="m-0 text-[13px] leading-[1.5] text-[var(--ink-secondary)]">
                  Tulis konteks umum atau pengingat. Kendala spesifik bisa dicatat pada langkah Temuan.
                </p>
              </div>
              <div className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-[10px] p-[20px_22px] max-[660px]:p-[16px] mb-[16px] last:mb-0 shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
                <div className="flex items-center justify-between mb-[18px] max-[660px]:flex-col max-[660px]:items-start max-[660px]:gap-[6px]">
                  <span className="flex items-center gap-[8px] text-[14px] font-bold text-[var(--ink-primary)] [&>svg]:text-[var(--accent-blue)]">
                    <FileText size={15} /> Catatan untuk Shift Berikutnya
                  </span>
                  <span className="text-[11.5px] text-[var(--ink-muted)]">Pesan, konteks operasional, atau pengingat penting</span>
                </div>

                <div>
                  <label className="grid gap-[5px] text-[12px] text-[var(--ink-secondary)] font-bold mb-[10px]">
                    Catatan untuk shift penerima <span className="ml-[5px] text-[11px] font-normal text-[var(--ink-muted)]">Opsional</span>
                    <span className="group/shell block relative w-full min-w-0">
                      <FileText className="absolute z-[1] left-[13px] top-[20px] -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none transition-colors duration-150 group-focus-within/shell:text-[var(--accent-blue)]" size={16} aria-hidden="true" />
                      <textarea
                        rows={6}
                        className="w-full min-h-[96px] pl-[40px] pr-[12px] py-[10px] rounded-[7px] text-[13px] bg-[var(--input-bg)] border border-[var(--panel-border)] text-[var(--ink-primary)] font-normal placeholder:text-[var(--ink-muted)] placeholder:opacity-85 leading-[1.5] resize-y focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] focus:outline-none transition-all duration-150"
                        value={draft.notes ?? ""}
                        onChange={(event) =>
                          onDraftChange((prev) => ({ ...prev, notes: event.target.value }))
                        }
                        placeholder="Contoh: Pantau lonjakan trafik setelah pukul 20.00 dan cek laporan monitoring sebelum pergantian shift."
                      />
                    </span>
                    <small className="block mt-[6px] text-[var(--ink-muted)] text-[11px] font-normal">
                      Gunakan untuk informasi umum. Temuan dan tugas memiliki kolom tersendiri di langkah berikutnya.
                    </small>
                  </label>
                </div>
              </div>
            </section>
          )}

          {/* ══════════════════════════════════════
              STEP 3: TEMUAN & PENGECUALIAN
             ══════════════════════════════════════ */}
          {step === 3 && (
            <section className="flex flex-col">
              <div className="mb-[20px]">
                <span className="block mb-[5px] text-[11px] font-bold text-[var(--accent-blue)]">Langkah 3 dari 4</span>
                <h3 className="m-0 mb-[5px] text-[20px] max-[660px]:text-[18px] font-bold leading-[1.3] text-[var(--ink-primary)]">
                  Adakah kendala atau hal yang perlu dipantau?
                </h3>
                <p className="m-0 text-[13px] leading-[1.5] text-[var(--ink-secondary)]">
                  Catat satu temuan per kartu. Jika tidak ada, lanjutkan ke langkah Tugas.
                </p>
              </div>
              <div className="flex items-center justify-between gap-[12px] mb-[14px] max-[660px]:flex-col max-[660px]:items-start">
                <div className="flex items-center gap-[8px] text-[13px] font-bold text-[var(--ink-primary)] [&>svg]:text-[var(--accent-blue)]">
                  <ShieldCheck size={16} /> Temuan yang perlu diteruskan{" "}
                  <span className="inline-grid place-items-center min-w-[22px] h-[22px] px-[5px] rounded-[6px] bg-[var(--accent-blue-soft)] text-[var(--accent-blue)] text-[11px] font-bold font-mono">
                    {draft.findings.length}
                  </span>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-[6px] min-h-[32px] px-[13px] py-[6px] text-[#38bdf8] border border-[rgba(56,189,248,0.4)] rounded-[7px] bg-[rgba(56,189,248,0.12)] text-[11.5px] font-bold tracking-[0.2px] cursor-pointer transition-all duration-200 shadow-[0_1px_3px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)] hover:text-white hover:bg-[rgba(56,189,248,0.25)] hover:border-[#38bdf8] hover:shadow-[0_0_14px_rgba(56,189,248,0.35),inset_0_1px_0_rgba(255,255,255,0.1)] hover:-translate-y-[1px] active:translate-y-0 active:bg-[rgba(56,189,248,0.32)]"
                  onClick={addFinding}
                >
                  <Plus size={13} strokeWidth={2.5} /> Tambah Temuan
                </button>
              </div>

              <div className="flex flex-col gap-[12px]">
                {draft.findings.length > 0 ? (
                  draft.findings.map((finding, index) => (
                    <article className="p-[18px_20px] bg-[var(--panel-bg)] border border-[var(--line)] rounded-[10px] mb-[12px]" key={`finding-${index}`}>
                      <div className="flex items-center justify-between pb-[12px] mb-[16px] border-b border-[var(--line)]">
                        <div className="flex items-center gap-[8px]">
                          <span className="inline-grid place-items-center min-w-[26px] h-[22px] px-[5px] rounded-[5px] bg-[var(--accent-blue-soft)] text-[var(--accent-blue)] border border-[var(--accent-blue-border)] text-[10.5px] font-extrabold font-mono shrink-0">
                            #{index + 1}
                          </span>
                          <strong className="text-[12.5px] font-bold text-[var(--ink-primary)]">
                            {finding.title ? finding.title : `Temuan ${index + 1} · Belum diberi judul`}
                          </strong>
                          {finding.project && <ProjectMark name={finding.project} />}
                        </div>
                        <button
                          type="button"
                          className="inline-flex items-center gap-[4px] p-[4px_8px] rounded-[6px] bg-transparent border border-transparent text-[var(--ink-muted)] text-[12px] font-semibold cursor-pointer transition-all duration-150 hover:bg-[var(--red-soft)] hover:border-[var(--red-border)] hover:text-[var(--red)]"
                          onClick={() => removeFinding(index)}
                          aria-label="Hapus temuan"
                        >
                          <Trash2 size={13} /> Hapus
                        </button>
                      </div>

                      <div className="grid grid-cols-2 max-[660px]:grid-cols-1 gap-[14px] items-start">
                        <label className="grid gap-[5px] text-[12px] text-[var(--ink-secondary)] font-bold mb-[10px]" htmlFor={`finding-project-${index}`}>
                          Proyek terkait
                          <div className="group/shell block relative w-full min-w-0">
                            <FolderKanban className="absolute z-[1] left-[13px] top-[21px] -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none transition-colors duration-150 group-focus-within/shell:text-[var(--accent-blue)]" size={16} aria-hidden="true" />
                            <ProjectSelect
                              id={`finding-project-${index}`}
                              value={finding.project}
                              onChange={(project) => updateFinding(index, { project })}
                              placeholder="Pilih atau ketik proyek"
                            />
                          </div>
                          <small className="block mt-[2px] text-[11px] font-normal leading-[1.4] text-[var(--ink-muted)]">
                            Pilih dari saran atau ketik nama proyek lain.
                          </small>
                        </label>
                        <label className="grid gap-[5px] text-[12px] text-[var(--ink-secondary)] font-bold mb-[10px]">
                          Kondisi saat ini
                          <span className="group/shell block relative w-full min-w-0">
                            <Activity className="absolute z-[1] left-[13px] top-[21px] -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none transition-colors duration-150 group-focus-within/shell:text-[var(--accent-blue)]" size={16} aria-hidden="true" />
                            <select
                              className="w-full min-h-[42px] pl-[40px] pr-[42px] py-[10px] rounded-[7px] text-[13px] bg-[var(--input-bg)] border border-[var(--panel-border)] text-[var(--ink-primary)] font-normal appearance-none cursor-pointer focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] focus:outline-none transition-all duration-150"
                              value={finding.state}
                              onChange={(event) =>
                                updateFinding(index, { state: event.target.value as "waiting" | "in-progress" })
                              }
                            >
                              <option value="waiting">Perlu dipantau</option>
                              <option value="in-progress">Sedang ditindaklanjuti</option>
                            </select>
                            <ChevronDown className="absolute right-[14px] top-1/2 -translate-y-1/2 text-[var(--ink-secondary)] pointer-events-none group-focus-within/shell:text-[var(--accent-blue)]" size={16} aria-hidden="true" />
                          </span>
                        </label>
                        <label className="col-span-2 max-[660px]:col-span-1 grid gap-[5px] text-[12px] text-[var(--ink-secondary)] font-bold mb-[10px]">
                          Ringkasan temuan
                          <span className="group/shell block relative w-full min-w-0">
                            <Type className="absolute z-[1] left-[13px] top-[21px] -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none transition-colors duration-150 group-focus-within/shell:text-[var(--accent-blue)]" size={16} aria-hidden="true" />
                            <input
                              className="w-full min-h-[42px] pl-[40px] pr-[12px] py-[10px] rounded-[7px] text-[13px] bg-[var(--input-bg)] border border-[var(--panel-border)] text-[var(--ink-primary)] font-normal placeholder:text-[var(--ink-muted)] placeholder:opacity-85 focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] focus:outline-none transition-all duration-150"
                              value={finding.title}
                              onChange={(event) => updateFinding(index, { title: event.target.value })}
                              placeholder="Contoh: Checkpoint SIEM belum menerima data terbaru"
                            />
                          </span>
                        </label>
                      </div>

                      <label className="grid gap-[5px] text-[12px] text-[var(--ink-secondary)] font-bold mb-[10px] mt-[10px]">
                        Kondisi terakhir dan tindak lanjut
                        <span className="group/shell block relative w-full min-w-0">
                          <AlignLeft className="absolute z-[1] left-[13px] top-[20px] -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none transition-colors duration-150 group-focus-within/shell:text-[var(--accent-blue)]" size={16} aria-hidden="true" />
                          <textarea
                            rows={3}
                            className="w-full min-h-[96px] pl-[40px] pr-[12px] py-[10px] rounded-[7px] text-[13px] bg-[var(--input-bg)] border border-[var(--panel-border)] text-[var(--ink-primary)] font-normal placeholder:text-[var(--ink-muted)] placeholder:opacity-85 leading-[1.5] resize-y focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] focus:outline-none transition-all duration-150"
                            value={finding.detail}
                            onChange={(event) => updateFinding(index, { detail: event.target.value })}
                            placeholder="Apa yang sudah diperiksa? Apa yang harus dipantau atau dilakukan shift penerima?"
                          />
                        </span>
                      </label>
                    </article>
                  ))
                ) : (
                  /* Inviting Empty State Card */
                  <div className="flex flex-col items-center justify-center text-center p-[36px_24px] bg-[var(--panel-bg)] border-[1.5px] border-dashed border-[var(--line)] rounded-[12px] my-[6px]">
                    <div className="grid place-items-center w-[50px] h-[50px] rounded-full bg-[var(--green-soft)] border border-[var(--green-border)] text-[var(--green)] mb-[14px]">
                      <ShieldCheck size={26} />
                    </div>
                    <div className="text-[14px] font-bold text-[var(--ink-primary)] mb-[4px]">Belum ada temuan</div>
                    <div className="text-[12px] text-[var(--ink-secondary)] max-w-[360px] mb-[18px] leading-[1.45]">
                      Jika ada kendala atau anomali yang perlu diketahui shift berikutnya, tambahkan di sini. Jika tidak ada, Anda bisa langsung melanjutkan.
                    </div>
                    <button
                      type="button"
                      className="inline-flex items-center gap-[7px] p-[9px_18px] rounded-[7px] bg-[var(--accent-blue)] text-white text-[12px] font-bold border-none cursor-pointer transition-all duration-150 shadow-[0_2px_8px_rgba(0,114,245,0.25)] hover:bg-[var(--accent-blue-hover)] hover:brightness-110 hover:-translate-y-[1px]"
                      onClick={addFinding}
                    >
                      <Plus size={15} strokeWidth={2.5} /> Tambah Temuan Baru
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
            <section className="flex flex-col">
              <div className="mb-[20px]">
                <span className="block mb-[5px] text-[11px] font-bold text-[var(--accent-blue)]">Langkah 4 dari 4</span>
                <h3 className="m-0 mb-[5px] text-[20px] max-[660px]:text-[18px] font-bold leading-[1.3] text-[var(--ink-primary)]">
                  Pekerjaan apa yang harus dilanjutkan?
                </h3>
                <p className="m-0 text-[13px] leading-[1.5] text-[var(--ink-secondary)]">
                  Periksa tugas yang sudah terisi dari dashboard. Buka kartu untuk mengubah rincian, status, atau prioritasnya.
                </p>
              </div>
              <div className="flex items-center justify-between mb-[14px] gap-[14px] max-[660px]:flex-col max-[660px]:items-start">
                <div className="flex flex-col gap-[2px]">
                  <span className="flex items-center gap-[8px] text-[13px] font-bold text-[var(--ink-primary)] [&>svg]:text-[var(--accent-blue)]">
                    <CheckSquare size={16} /> Tugas untuk shift penerima{" "}
                    <span className="inline-grid place-items-center min-w-[22px] h-[22px] px-[5px] rounded-[6px] bg-[var(--accent-blue-soft)] text-[var(--accent-blue)] text-[11px] font-bold font-mono">
                      {draft.tasks.length}
                    </span>
                  </span>
                  <span className="text-[11.5px] text-[var(--ink-muted)]">
                    Tugas rutin dan pekerjaan yang masih berjalan.
                  </span>
                </div>

                <div className="flex items-center gap-[8px]">
                  {draft.tasks.length > 1 && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-[5px] p-[4px_9px] rounded-[6px] bg-[var(--panel-bg)] border border-[var(--panel-border)] text-[var(--ink-secondary)] text-[11px] font-semibold cursor-pointer transition-all duration-150 hover:bg-[var(--panel-bg-hover)] hover:text-[var(--ink-primary)] hover:border-[var(--line)]"
                      onClick={() => toggleAllTasks(!areAllTasksCollapsed)}
                    >
                      <ChevronsUpDown size={13} />
                      {areAllTasksCollapsed ? "Buka Semua" : "Tutup Semua"}
                    </button>
                  )}
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-[6px] min-h-[32px] px-[13px] py-[6px] text-[#38bdf8] border border-[rgba(56,189,248,0.4)] rounded-[7px] bg-[rgba(56,189,248,0.12)] text-[11.5px] font-bold tracking-[0.2px] cursor-pointer transition-all duration-200 shadow-[0_1px_3px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)] hover:text-white hover:bg-[rgba(56,189,248,0.25)] hover:border-[#38bdf8] hover:shadow-[0_0_14px_rgba(56,189,248,0.35),inset_0_1px_0_rgba(255,255,255,0.1)] hover:-translate-y-[1px] active:translate-y-0 active:bg-[rgba(56,189,248,0.32)]"
                    onClick={addTask}
                  >
                    <Plus size={13} strokeWidth={2.5} /> Tambah Tugas
                  </button>
                </div>
              </div>

              {/* Collapsible Task Cards List */}
              <div className="flex flex-col gap-[12px]">
                {draft.tasks.map((task, index) => {
                  const isCollapsed = collapsedTasks[task.id] ?? index > 0;
                  return (
                    <article
                      className="border border-[var(--panel-border)] rounded-[9px] bg-[var(--panel-bg)] mb-[12px] overflow-hidden transition-all duration-150 hover:border-[var(--accent-blue-border)]"
                      key={task.id}
                    >
                      {/* Accordion Header */}
                      <div
                        className={`flex items-center justify-between min-h-[56px] p-[12px_16px] cursor-pointer bg-[var(--bg)] border-b transition-colors duration-150 select-none hover:bg-[var(--panel-bg-hover)] ${
                          !isCollapsed ? "border-b-[var(--line)]" : "border-b-transparent"
                        }`}
                        onClick={() => toggleTaskCollapse(task.id, index)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleTaskCollapse(task.id, index);
                          }
                        }}
                      >
                        <div className="flex items-center gap-[10px] flex-wrap min-w-0 flex-1">
                          <span className="inline-grid place-items-center min-w-[26px] h-[22px] px-[5px] rounded-[5px] bg-[var(--accent-blue-soft)] text-[var(--accent-blue)] border border-[var(--accent-blue-border)] text-[10.5px] font-extrabold font-mono shrink-0">
                            #{index + 1}
                          </span>
                          {task.project && <ProjectMark name={task.project} />}
                          <span className="text-[13px] font-semibold text-[var(--ink-primary)] whitespace-nowrap overflow-hidden text-ellipsis max-w-[400px] max-[660px]:max-w-[140px]">
                            {task.title.trim() ? task.title : `Tugas #${index + 1} (Belum ada judul)`}
                          </span>
                          <TaskStatusBadge state={task.state} />
                          <TaskPriorityBadge priority={task.priority} />
                        </div>

                        <div className="flex items-center gap-[8px] shrink-0">
                          <button
                            type="button"
                            className="inline-flex items-center gap-[4px] p-[4px_8px] rounded-[6px] bg-transparent border border-transparent text-[var(--ink-muted)] text-[12px] font-semibold cursor-pointer transition-all duration-150 hover:bg-[var(--red-soft)] hover:border-[var(--red-border)] hover:text-[var(--red)]"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeTask(task.id);
                            }}
                            aria-label={`Hapus Tugas #${index + 1}`}
                          >
                            <Trash2 size={13} />
                          </button>
                          <span className={`text-[var(--ink-muted)] transition-transform duration-200 flex items-center ${!isCollapsed ? "rotate-180" : ""}`}>
                            <ChevronDown size={16} />
                          </span>
                        </div>
                      </div>

                      {/* Accordion Body */}
                      {!isCollapsed && (
                        <div className="p-[18px_20px] bg-[var(--panel-bg)]">
                          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] max-[660px]:grid-cols-1 gap-[14px] items-start">
                            <label className="grid gap-[5px] text-[12px] text-[var(--ink-secondary)] font-bold mb-[10px]" htmlFor={`task-project-${task.id}`}>
                              Proyek
                              <div className="group/shell block relative w-full min-w-0">
                                <FolderKanban className="absolute z-[1] left-[13px] top-[21px] -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none transition-colors duration-150 group-focus-within/shell:text-[var(--accent-blue)]" size={16} aria-hidden="true" />
                                <ProjectSelect
                                  id={`task-project-${task.id}`}
                                  value={task.project}
                                  onChange={(project) => updateTask(task.id, { project })}
                                  placeholder="Pilih atau ketik proyek"
                                />
                              </div>
                            </label>
                            <label className="grid gap-[5px] text-[12px] text-[var(--ink-secondary)] font-bold mb-[10px]">
                              Judul Tugas
                              <span className="group/shell block relative w-full min-w-0">
                                <ListTodo className="absolute z-[1] left-[13px] top-[21px] -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none transition-colors duration-150 group-focus-within/shell:text-[var(--accent-blue)]" size={16} aria-hidden="true" />
                                <input
                                  className="w-full min-h-[42px] pl-[40px] pr-[12px] py-[10px] rounded-[7px] text-[13px] bg-[var(--input-bg)] border border-[var(--panel-border)] text-[var(--ink-primary)] font-normal placeholder:text-[var(--ink-muted)] placeholder:opacity-85 focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] focus:outline-none transition-all duration-150"
                                  value={task.title}
                                  onChange={(event) => updateTask(task.id, { title: event.target.value })}
                                  placeholder="Contoh: Periksa alarm dan laporan SIEM"
                                  required
                                />
                              </span>
                            </label>
                            <label className="grid gap-[5px] text-[12px] text-[var(--ink-secondary)] font-bold mb-[10px]">
                              Kondisi tugas
                              <span className="group/shell block relative w-full min-w-0">
                                <Activity className="absolute z-[1] left-[13px] top-[21px] -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none transition-colors duration-150 group-focus-within/shell:text-[var(--accent-blue)]" size={16} aria-hidden="true" />
                                <select
                                  className="w-full min-h-[42px] pl-[40px] pr-[42px] py-[10px] rounded-[7px] text-[13px] bg-[var(--input-bg)] border border-[var(--panel-border)] text-[var(--ink-primary)] font-normal appearance-none cursor-pointer focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] focus:outline-none transition-all duration-150"
                                  value={task.state}
                                  onChange={(event) =>
                                    updateTask(task.id, { state: event.target.value as HandoverState })
                                  }
                                >
                                  <option value="repeat">Rutin / berulang</option>
                                  <option value="waiting">Menunggu tindak lanjut</option>
                                  <option value="in-progress">Sedang dikerjakan</option>
                                  <option value="done">Selesai</option>
                                  <option value="escalated">Dieskalasi</option>
                                  <option value="blocked">Terhambat</option>
                                  <option value="waiting-vendor">Menunggu Vendor</option>
                                  <option value="activity">Aktivitas</option>
                                </select>
                                <ChevronDown className="absolute right-[14px] top-1/2 -translate-y-1/2 text-[var(--ink-secondary)] pointer-events-none group-focus-within/shell:text-[var(--accent-blue)]" size={16} aria-hidden="true" />
                              </span>
                            </label>
                            <label className="grid gap-[5px] text-[12px] text-[var(--ink-secondary)] font-bold mb-[10px]">
                              Prioritas
                              <span className="group/shell block relative w-full min-w-0">
                                <Flag className="absolute z-[1] left-[13px] top-[21px] -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none transition-colors duration-150 group-focus-within/shell:text-[var(--accent-blue)]" size={16} aria-hidden="true" />
                                <select
                                  className="w-full min-h-[42px] pl-[40px] pr-[42px] py-[10px] rounded-[7px] text-[13px] bg-[var(--input-bg)] border border-[var(--panel-border)] text-[var(--ink-primary)] font-normal appearance-none cursor-pointer focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] focus:outline-none transition-all duration-150"
                                  value={task.priority || "Medium"}
                                  onChange={(event) =>
                                    updateTask(task.id, { priority: event.target.value })
                                  }
                                >
                                  <option value="Critical">Kritis</option>
                                  <option value="High">Tinggi</option>
                                  <option value="Medium">Sedang</option>
                                  <option value="Low">Rendah</option>
                                </select>
                                <ChevronDown className="absolute right-[14px] top-1/2 -translate-y-1/2 text-[var(--ink-secondary)] pointer-events-none group-focus-within/shell:text-[var(--accent-blue)]" size={16} aria-hidden="true" />
                              </span>
                            </label>
                          </div>

                          <label className="grid gap-[5px] text-[12px] text-[var(--ink-secondary)] font-bold mb-[10px] mt-[10px]">
                            Apa yang perlu dilakukan shift penerima?
                            <span className="group/shell block relative w-full min-w-0">
                              <AlignLeft className="absolute z-[1] left-[13px] top-[20px] -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none transition-colors duration-150 group-focus-within/shell:text-[var(--accent-blue)]" size={16} aria-hidden="true" />
                              <textarea
                                rows={3}
                                className="w-full min-h-[96px] pl-[40px] pr-[12px] py-[10px] rounded-[7px] text-[13px] bg-[var(--input-bg)] border border-[var(--panel-border)] text-[var(--ink-primary)] font-normal placeholder:text-[var(--ink-muted)] placeholder:opacity-85 leading-[1.5] resize-y focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] focus:outline-none transition-all duration-150"
                                value={task.detail}
                                onChange={(event) => updateTask(task.id, { detail: event.target.value })}
                                placeholder="Tulis langkah berikutnya, batas waktu bila ada, dan informasi yang diperlukan untuk mengerjakannya."
                              />
                            </span>
                          </label>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Modal Footer & Navigation Helper */}
        <footer className="flex items-center justify-between gap-[16px] p-[14px_24px] bg-[var(--panel-bg)] border-t border-[var(--line)] max-[660px]:items-stretch max-[660px]:flex-col max-[660px]:p-[12px_16px] max-[660px]:gap-[10px]">
          <div className="flex items-center gap-[8px] max-[660px]:flex-wrap">
            {step > 1 && (
              <button
                type="button"
                className="inline-flex items-center justify-center min-h-[36px] px-[15px] rounded-[7px] text-[12px] font-semibold cursor-pointer transition-all duration-150 border border-[var(--line)] bg-[var(--panel-bg)] text-[var(--ink-secondary)] hover:bg-[var(--panel-bg-hover)] hover:text-[var(--ink-primary)]"
                onClick={() => handleStepChange((step - 1) as 1 | 2 | 3 | 4)}
              >
                ← Kembali
              </button>
            )}
            <button
              type="button"
              className="inline-flex items-center justify-center min-h-[36px] px-[15px] rounded-[7px] text-[12px] font-semibold cursor-pointer transition-all duration-150 border border-[var(--line)] bg-[var(--panel-bg)] text-[var(--ink-secondary)] hover:bg-[var(--panel-bg-hover)] hover:text-[var(--ink-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={requestClose}
              disabled={saving}
            >
              Tutup Draf
            </button>
            <button
              type="button"
              className="py-[2px] px-0 bg-transparent text-[11.5px] font-semibold whitespace-nowrap text-[var(--red)] hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving}
              onClick={() => setConfirmDiscard(true)}
            >
              Buang Draf
            </button>
          </div>

          <div className="flex items-center gap-[14px] max-[660px]:flex-wrap max-[660px]:w-full [&>button]:max-[660px]:w-full">
            {step < 4 ? (
              <button
                type="button"
                className="inline-flex items-center justify-center gap-[6px] min-h-[36px] px-[15px] rounded-[7px] text-[12px] font-semibold cursor-pointer transition-all duration-150 border-none bg-[var(--accent-blue)] text-white hover:bg-[var(--accent-blue-hover)] max-[660px]:w-full"
                onClick={() => {
                  handleStepChange((step + 1) as 1 | 2 | 3 | 4);
                }}
              >
                {step === 1 ? "Lanjut ke Catatan" : step === 2 ? "Lanjut ke Temuan" : "Lanjut ke Tugas"} →
              </button>
            ) : (
              <button
                type="button"
                className="inline-flex items-center justify-center gap-[6px] min-h-[36px] px-[15px] rounded-[7px] text-[12px] font-bold cursor-pointer transition-all duration-150 border-none bg-[var(--accent-blue)] text-white shadow-[0_2px_10px_rgba(0,114,245,0.3)] hover:bg-[var(--accent-blue-hover)] disabled:opacity-50 disabled:cursor-not-allowed max-[660px]:w-full"
                onClick={onSave}
                disabled={saving}
              >
                {saving ? (
                  "Menyimpan…"
                ) : (
                  <>
                    <Check size={16} strokeWidth={2.5} /> Simpan &amp; Buka Handover
                  </>
                )}
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
