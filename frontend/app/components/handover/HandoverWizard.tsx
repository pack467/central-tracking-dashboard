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
        <header className="handover-modal-header">
          <div className="wizard-header-content">
            <div className="handover-modal-kicker">
              <span className="live-dot live-dot-pulse" />{" "}
              {mode === "prepare" ? "PERSIAPAN SERAH TERIMA SHIFT" : "CATATAN SERAH TERIMA"}
            </div>
            <div className="wizard-title-row">
              <span className="wizard-title-icon">
                <ArrowRightLeft size={16} />
              </span>
              <h2>{title}</h2>
            </div>
            <p className="wizard-subtitle">Siapkan informasi yang perlu diketahui shift penerima, lalu periksa kembali sebelum menyimpan.</p>
            <p className="wizard-save-status" role="status">
              <span className={draftSaved ? "wizard-save-dot saved" : "wizard-save-dot"} />
              {draftSaved ? "Draf tersimpan otomatis di perangkat ini" : "Draf belum tersimpan — jangan tutup halaman"}
              {mode === "edit" && <span> · Revisi akan mengulang checklist penerimaan.</span>}
            </p>
          </div>
          <ModalCloseButton onClose={requestClose} />
        </header>

        {/* 4-Step Interactive Progress Stepper */}
        <div className="wizard-stepper-container" role="navigation" aria-label="Langkah handover">
          <div className="wizard-stepper">
            {/* Step 1 */}
            <button
              type="button"
              className={`wizard-step-node ${step === 1 ? "active" : ""}`}
              onClick={() => handleStepChange(1)}
              aria-current={step === 1 ? "step" : undefined}
            >
              <div className="wizard-step-circle">1</div>
              <div className="wizard-step-label-group">
                <span className="wizard-step-kicker">Langkah 1</span>
                <span className="wizard-step-name">Shift &amp; PIC</span>
              </div>
            </button>

            <div className="wizard-step-connector" />

            {/* Step 2 */}
            <button
              type="button"
              className={`wizard-step-node ${step === 2 ? "active" : ""}`}
              onClick={() => handleStepChange(2)}
              aria-current={step === 2 ? "step" : undefined}
            >
              <div className="wizard-step-circle">2</div>
              <div className="wizard-step-label-group">
                <span className="wizard-step-kicker">Langkah 2</span>
                <span className="wizard-step-name">Catatan</span>
              </div>
            </button>

            <div className="wizard-step-connector" />

            {/* Step 3 */}
            <button
              type="button"
              className={`wizard-step-node ${step === 3 ? "active" : ""}`}
              onClick={() => handleStepChange(3)}
              aria-current={step === 3 ? "step" : undefined}
            >
              <div className="wizard-step-circle">3</div>
              <div className="wizard-step-label-group">
                <span className="wizard-step-kicker">Langkah 3</span>
                <span className="wizard-step-name">
                  Temuan <span className="wizard-step-count">{draft.findings.length}</span>
                </span>
              </div>
            </button>

            <div className="wizard-step-connector" />

            {/* Step 4 */}
            <button
              type="button"
              className={`wizard-step-node ${step === 4 ? "active" : ""}`}
              onClick={() => handleStepChange(4)}
              aria-current={step === 4 ? "step" : undefined}
            >
              <div className="wizard-step-circle">4</div>
              <div className="wizard-step-label-group">
                <span className="wizard-step-kicker">Langkah 4</span>
                <span className="wizard-step-name">
                  Tugas <span className="wizard-step-count">{draft.tasks.length}</span>
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Form Body Scroll Area */}
        <div ref={formScrollRef} className="handover-form-scroll" inert={saving}>
          {/* ══════════════════════════════════════
              STEP 1: INFORMASI SHIFT
             ══════════════════════════════════════ */}
          {step === 1 && (
            <section className="handover-form-step">
              <div className="wizard-step-intro">
                <span>Langkah 1 dari 4</span>
                <h3>Siapa yang menyerahkan dan menerima shift?</h3>
                <p>Pastikan tanggal, arah pergantian shift, dan penanggung jawab sudah benar.</p>
              </div>
              {/* Card 1: Tanggal & Rotasi Shift */}
              <div className="wizard-section-card">
                <div className="wizard-section-header">
                  <span className="wizard-section-title">
                    <Calendar size={15} /> Tanggal &amp; Rotasi Shift
                  </span>
                  <span className="wizard-section-hint">Tentukan tanggal dan arah serah terima</span>
                </div>

                <div className="[margin-bottom:14px]!">
                  <div className="wizard-date-field">
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
                <div className="wizard-shift-flow-container">
                  <div className="wizard-shift-col">
                    <label>
                      Shift yang menyerahkan
                      <span className="wizard-input-shell">
                        <Clock3 className="wizard-field-icon" size={16} aria-hidden="true" />
                        <input
                          value={draft.sourceShift}
                          onChange={(event) => onDraftChange((prev) => ({ ...prev, sourceShift: event.target.value }))}
                          placeholder="Contoh: Subuh"
                          required
                        />
                      </span>
                    </label>
                  </div>

                  <div className="wizard-shift-arrow" title="Arah serah terima tugas">
                    <ArrowRight size={16} />
                  </div>

                  <div className="wizard-shift-col">
                    <label>
                      Shift yang menerima
                      <span className="wizard-input-shell">
                        <Clock3 className="wizard-field-icon" size={16} aria-hidden="true" />
                        <input
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
                <div className="wizard-shift-presets">
                  <span className="wizard-preset-label">Pilih rotasi yang sesuai:</span>
                  {SHIFT_ROTATIONS.map((rotation) => {
                    const isSelected =
                      draft.sourceShift.toLowerCase() === rotation.from.toLowerCase() &&
                      draft.targetShift.toLowerCase() === rotation.to.toLowerCase();
                    return (
                      <button
                        key={rotation.label}
                        type="button"
                        className={`wizard-preset-btn ${isSelected ? "active" : ""}`}
                        onClick={() => applyShiftRotation(rotation.from, rotation.to)}
                      >
                        {rotation.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Card 2: Personil / PIC */}
              <div className="wizard-section-card">
                <div className="wizard-section-header">
                  <span className="wizard-section-title">
                    <Users size={15} /> Personil Penanggung Jawab (PIC)
                  </span>
                  <span className="wizard-section-hint">Identitas pelaksana serah terima</span>
                </div>

                <div className="handover-form-grid handover-form-grid-two">
                  <label>
                    Penanggung jawab shift pengirim
                    <span className="wizard-input-shell">
                      <UserRound className="wizard-field-icon" size={16} aria-hidden="true" />
                      <input
                        value={draft.sourcePic}
                        onChange={(event) => onDraftChange((prev) => ({ ...prev, sourcePic: event.target.value }))}
                        placeholder="Nama penanggung jawab shift saat ini"
                        required
                      />
                    </span>
                  </label>
                  <label>
                    Penanggung jawab shift penerima
                    <span className="wizard-input-shell">
                      <UserRound className="wizard-field-icon" size={16} aria-hidden="true" />
                      <input
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
            <section className="handover-form-step">
              <div className="wizard-step-intro">
                <span>Langkah 2 dari 4</span>
                <h3>Apa yang perlu diketahui shift berikutnya?</h3>
                <p>Tulis konteks umum atau pengingat. Kendala spesifik bisa dicatat pada langkah Temuan.</p>
              </div>
              <div className="wizard-section-card">
                <div className="wizard-section-header">
                  <span className="wizard-section-title">
                    <FileText size={15} /> Catatan untuk Shift Berikutnya
                  </span>
                  <span className="wizard-section-hint">Pesan, konteks operasional, atau pengingat penting</span>
                </div>

                <div>
                  <label>
                    Catatan untuk shift penerima <span className="wizard-optional">Opsional</span>
                    <span className="wizard-input-shell wizard-textarea-shell">
                      <FileText className="wizard-field-icon" size={16} aria-hidden="true" />
                      <textarea
                        rows={6}
                        value={draft.notes ?? ""}
                        onChange={(event) =>
                          onDraftChange((prev) => ({ ...prev, notes: event.target.value }))
                        }
                        placeholder="Contoh: Pantau lonjakan trafik setelah pukul 20.00 dan cek laporan monitoring sebelum pergantian shift."
                      />
                    </span>
                    <small className="[display:block]! [margin-top:6px]! [color:var(--ink-muted)]! [font-size:11px]!">
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
            <section className="handover-form-step">
              <div className="wizard-step-intro">
                <span>Langkah 3 dari 4</span>
                <h3>Adakah kendala atau hal yang perlu dipantau?</h3>
                <p>Catat satu temuan per kartu. Jika tidak ada, lanjutkan ke langkah Tugas.</p>
              </div>
              <div className="handover-step-header-action">
                <div className="wizard-section-title [font-size:13px]!">
                  <ShieldCheck size={16} /> Temuan yang perlu diteruskan <span className="wizard-list-count">{draft.findings.length}</span>
                </div>
                <button type="button" className="handover-inline-add" onClick={addFinding}>
                  <Plus size={13} strokeWidth={2.5} /> Tambah Temuan
                </button>
              </div>

              <div className="handover-form-repeat-list">
                {draft.findings.length > 0 ? (
                  draft.findings.map((finding, index) => (
                    <article className="handover-form-repeat" key={`finding-${index}`}>
                      <div className="handover-form-repeat-head">
                        <div className="[display:flex]! [align-items:center]! [gap:8px]!">
                          <span className="wizard-task-num-badge">#{index + 1}</span>
                          <strong className="[font-size:12.5px]!">
                            {finding.title ? finding.title : `Temuan ${index + 1} · Belum diberi judul`}
                          </strong>
                          {finding.project && <ProjectMark name={finding.project} />}
                        </div>
                        <button
                          type="button"
                          className="wizard-delete-btn"
                          onClick={() => removeFinding(index)}
                          aria-label="Hapus temuan"
                        >
                          <Trash2 size={13} /> Hapus
                        </button>
                      </div>

                      <div className="handover-form-grid wizard-finding-grid">
                        <label htmlFor={`finding-project-${index}`}>
                          Proyek terkait
                          <div className="wizard-input-shell">
                            <FolderKanban className="wizard-field-icon" size={16} aria-hidden="true" />
                            <ProjectSelect
                              id={`finding-project-${index}`}
                              value={finding.project}
                              onChange={(project) => updateFinding(index, { project })}
                              placeholder="Pilih atau ketik proyek"
                            />
                          </div>
                          <small className="wizard-field-help">Pilih dari saran atau ketik nama proyek lain.</small>
                        </label>
                        <label>
                          Kondisi saat ini
                          <span className="wizard-input-shell wizard-select-shell">
                            <Activity className="wizard-field-icon" size={16} aria-hidden="true" />
                            <select
                              value={finding.state}
                              onChange={(event) =>
                                updateFinding(index, { state: event.target.value as "waiting" | "in-progress" })
                              }
                            >
                              <option value="waiting">Perlu dipantau</option>
                              <option value="in-progress">Sedang ditindaklanjuti</option>
                            </select>
                            <ChevronDown className="wizard-select-chevron" size={16} aria-hidden="true" />
                          </span>
                        </label>
                        <label className="wizard-grid-full">
                          Ringkasan temuan
                          <span className="wizard-input-shell">
                            <Type className="wizard-field-icon" size={16} aria-hidden="true" />
                            <input
                              value={finding.title}
                              onChange={(event) => updateFinding(index, { title: event.target.value })}
                              placeholder="Contoh: Checkpoint SIEM belum menerima data terbaru"
                            />
                          </span>
                        </label>
                      </div>

                      <label className="[margin-top:10px]!">
                        Kondisi terakhir dan tindak lanjut
                        <span className="wizard-input-shell wizard-textarea-shell">
                          <AlignLeft className="wizard-field-icon" size={16} aria-hidden="true" />
                          <textarea
                            rows={3}
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
                  <div className="wizard-empty-card">
                    <div className="wizard-empty-icon">
                      <ShieldCheck size={26} />
                    </div>
                    <div className="wizard-empty-title">Belum ada temuan</div>
                    <div className="wizard-empty-desc">
                      Jika ada kendala atau anomali yang perlu diketahui shift berikutnya, tambahkan di sini. Jika tidak ada, Anda bisa langsung melanjutkan.
                    </div>
                    <button type="button" className="wizard-empty-cta" onClick={addFinding}>
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
            <section className="handover-form-step">
              <div className="wizard-step-intro">
                <span>Langkah 4 dari 4</span>
                <h3>Pekerjaan apa yang harus dilanjutkan?</h3>
                <p>Periksa tugas yang sudah terisi dari dashboard. Buka kartu untuk mengubah rincian, status, atau prioritasnya.</p>
              </div>
              <div className="wizard-task-controls">
                <div className="[display:flex]! [flex-direction:column]! [gap:2px]!">
                  <span className="wizard-section-title [font-size:13px]!">
                    <CheckSquare size={16} /> Tugas untuk shift penerima <span className="wizard-list-count">{draft.tasks.length}</span>
                  </span>
                  <span className="[font-size:11.5px]! [color:var(--text-muted)]!">
                    Tugas rutin dan pekerjaan yang masih berjalan.
                  </span>
                </div>

                <div className="[display:flex]! [align-items:center]! [gap:8px]!">
                  {draft.tasks.length > 1 && (
                    <button
                      type="button"
                      className="wizard-task-toggle-all"
                      onClick={() => toggleAllTasks(!areAllTasksCollapsed)}
                    >
                      <ChevronsUpDown size={13} />
                      {areAllTasksCollapsed ? "Buka Semua" : "Tutup Semua"}
                    </button>
                  )}
                  <button type="button" className="handover-inline-add" onClick={addTask}>
                    <Plus size={13} strokeWidth={2.5} /> Tambah Tugas
                  </button>
                </div>
              </div>

              {/* Collapsible Task Cards List */}
              <div className="handover-form-repeat-list">
                {draft.tasks.map((task, index) => {
                  const isCollapsed = collapsedTasks[task.id] ?? index > 0;
                  return (
                    <article
                      className={`wizard-task-card ${isCollapsed ? "collapsed" : "expanded"}`}
                      key={task.id}
                    >
                      {/* Accordion Header */}
                      <div
                        className="wizard-task-header"
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
                        <div className="wizard-task-header-left">
                          <span className="wizard-task-num-badge">#{index + 1}</span>
                          {task.project && <ProjectMark name={task.project} />}
                          <span className="wizard-task-header-title">
                            {task.title.trim() ? task.title : `Tugas #${index + 1} (Belum ada judul)`}
                          </span>
                          <TaskStatusBadge state={task.state} />
                          <TaskPriorityBadge priority={task.priority} />
                        </div>

                        <div className="wizard-task-header-right">
                          <button
                            type="button"
                            className="wizard-delete-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeTask(task.id);
                            }}
                            aria-label={`Hapus Tugas #${index + 1}`}
                          >
                            <Trash2 size={13} />
                          </button>
                          <span className={`wizard-task-chevron ${!isCollapsed ? "expanded" : ""}`}>
                            <ChevronDown size={16} />
                          </span>
                        </div>
                      </div>

                      {/* Accordion Body */}
                      {!isCollapsed && (
                        <div className="wizard-task-body">
                          <div className="handover-form-grid handover-form-grid-task">
                            <label htmlFor={`task-project-${task.id}`}>
                              Proyek
                              <div className="wizard-input-shell">
                                <FolderKanban className="wizard-field-icon" size={16} aria-hidden="true" />
                                <ProjectSelect
                                  id={`task-project-${task.id}`}
                                  value={task.project}
                                  onChange={(project) => updateTask(task.id, { project })}
                                  placeholder="Pilih atau ketik proyek"
                                />
                              </div>
                            </label>
                            <label>
                              Judul Tugas
                              <span className="wizard-input-shell">
                                <ListTodo className="wizard-field-icon" size={16} aria-hidden="true" />
                                <input
                                  value={task.title}
                                  onChange={(event) => updateTask(task.id, { title: event.target.value })}
                                  placeholder="Contoh: Periksa alarm dan laporan SIEM"
                                  required
                                />
                              </span>
                            </label>
                            <label>
                              Kondisi tugas
                              <span className="wizard-input-shell wizard-select-shell">
                                <Activity className="wizard-field-icon" size={16} aria-hidden="true" />
                                <select
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
                                <ChevronDown className="wizard-select-chevron" size={16} aria-hidden="true" />
                              </span>
                            </label>
                            <label>
                              Prioritas
                              <span className="wizard-input-shell wizard-select-shell">
                                <Flag className="wizard-field-icon" size={16} aria-hidden="true" />
                                <select
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
                                <ChevronDown className="wizard-select-chevron" size={16} aria-hidden="true" />
                              </span>
                            </label>
                          </div>

                          <label className="[margin-top:10px]!">
                            Apa yang perlu dilakukan shift penerima?
                            <span className="wizard-input-shell wizard-textarea-shell">
                              <AlignLeft className="wizard-field-icon" size={16} aria-hidden="true" />
                              <textarea
                                rows={3}
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
        <footer className="handover-modal-footer handover-form-footer">
          <div className="wizard-footer-left">
            {step > 1 && (
              <button
                type="button"
                className="button button-secondary"
                onClick={() => handleStepChange((step - 1) as 1 | 2 | 3 | 4)}
              >
                ← Kembali
              </button>
            )}
            <button type="button" className="button button-secondary" onClick={requestClose} disabled={saving}>
              Tutup Draf
            </button>
            <button type="button" className="text-button text-danger" disabled={saving} onClick={() => setConfirmDiscard(true)}>Buang Draf</button>
          </div>

          <div className="wizard-footer-right">
            {step < 4 ? (
              <button
                type="button"
                className="button button-primary"
                onClick={() => {
                  handleStepChange((step + 1) as 1 | 2 | 3 | 4);
                }}
              >
                {step === 1 ? "Lanjut ke Catatan" : step === 2 ? "Lanjut ke Temuan" : "Lanjut ke Tugas"} →
              </button>
            ) : (
              <button
                type="button"
                className="button button-primary wizard-submit-btn"
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
