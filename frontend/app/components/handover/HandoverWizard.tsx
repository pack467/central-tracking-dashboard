"use client";

import { useState } from "react";
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
  actor,
  onDraftChange,
  onClose,
  onSave,
  saving,
}: HandoverWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(initialStep);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([1]));
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [collapsedTasks, setCollapsedTasks] = useState<Record<number, boolean>>({});

  const title = mode === "edit" ? "Edit Catatan Handover" : mode === "prepare" ? "Siapkan Handover" : "Buat Handover Baru";

  const requestClose = () => {
    if (saving) return;
    if (dirty && !draftSaved) setConfirmDiscard(true);
    else onClose();
  };

  const handleStepChange = (targetStep: 1 | 2 | 3 | 4) => {
    setVisitedSteps((prev) => new Set(prev).add(targetStep));
    setStep(targetStep);
    onStepChange(targetStep);
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

  const toggleTaskCollapse = (taskId: number) => {
    setCollapsedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const toggleAllTasks = (collapse: boolean) => {
    const nextState: Record<number, boolean> = {};
    draft.tasks.forEach((task) => {
      nextState[task.id] = collapse;
    });
    setCollapsedTasks(nextState);
  };

  const areAllTasksCollapsed = draft.tasks.length > 0 && draft.tasks.every((task) => collapsedTasks[task.id]);

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
      <Modal open={open} onClose={requestClose} label={title} variant="form" width={740}>
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
            <p className="wizard-subtitle">
              Lengkapi 4 langkah berikut untuk menyerahkan tugas ke shift berikutnya dengan lengkap dan akurat.
            </p>
            <p className="wizard-subtitle" role="status">
              {draftSaved ? "Draf otomatis disimpan di perangkat ini." : "Draf belum tersimpan di perangkat — jangan reload."}
              {mode === "edit" ? " Revisi akan membatalkan penerimaan dan mengulang checklist." : " Data awal diambil dari tiket, asesmen, dan roster dashboard; periksa kembali sebelum simpan."}
            </p>
          </div>
          <ModalCloseButton onClose={requestClose} />
        </header>

        {/* 4-Step Interactive Progress Stepper */}
        <div className="wizard-stepper-container" role="tablist">
          <div className="wizard-stepper">
            {/* Step 1 */}
            <button
              type="button"
              className={`wizard-step-node ${step === 1 ? "active" : ""} ${visitedSteps.has(1) && step > 1 ? "completed" : ""}`}
              onClick={() => handleStepChange(1)}
            >
              <div className="wizard-step-circle">
                {visitedSteps.has(1) && step > 1 ? <Check size={13} strokeWidth={3} /> : "1"}
              </div>
              <div className="wizard-step-label-group">
                <span className="wizard-step-kicker">Langkah 1</span>
                <span className="wizard-step-name">Informasi Shift</span>
              </div>
            </button>

            <div className={`wizard-step-connector ${step > 1 ? "completed" : ""}`} />

            {/* Step 2 */}
            <button
              type="button"
              className={`wizard-step-node ${step === 2 ? "active" : ""} ${visitedSteps.has(2) && step > 2 ? "completed" : ""}`}
              onClick={() => handleStepChange(2)}
            >
              <div className="wizard-step-circle">
                {visitedSteps.has(2) && step > 2 ? <Check size={13} strokeWidth={3} /> : "2"}
              </div>
              <div className="wizard-step-label-group">
                <span className="wizard-step-kicker">Langkah 2</span>
                <span className="wizard-step-name">Catatan Shift</span>
              </div>
            </button>

            <div className={`wizard-step-connector ${step > 2 ? "completed" : ""}`} />

            {/* Step 3 */}
            <button
              type="button"
              className={`wizard-step-node ${step === 3 ? "active" : ""} ${visitedSteps.has(3) && step > 3 ? "completed" : ""}`}
              onClick={() => handleStepChange(3)}
            >
              <div className="wizard-step-circle">
                {visitedSteps.has(3) && step > 3 ? <Check size={13} strokeWidth={3} /> : "3"}
              </div>
              <div className="wizard-step-label-group">
                <span className="wizard-step-kicker">Langkah 3</span>
                <span className="wizard-step-name">
                  Temuan <span className="wizard-step-count">{draft.findings.length}</span>
                </span>
              </div>
            </button>

            <div className={`wizard-step-connector ${step > 3 ? "completed" : ""}`} />

            {/* Step 4 */}
            <button
              type="button"
              className={`wizard-step-node ${step === 4 ? "active" : ""}`}
              onClick={() => handleStepChange(4)}
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
        <div className="handover-form-scroll" inert={saving}>
          {/* ══════════════════════════════════════
              STEP 1: INFORMASI SHIFT
             ══════════════════════════════════════ */}
          {step === 1 && (
            <section className="handover-form-step">
              {/* Card 1: Tanggal & Rotasi Shift */}
              <div className="wizard-section-card">
                <div className="wizard-section-header">
                  <span className="wizard-section-title">
                    <Calendar size={15} /> Tanggal &amp; Rotasi Shift
                  </span>
                  <span className="wizard-section-hint">Tentukan tanggal dan arah serah terima</span>
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label>
                    Tanggal Serah Terima
                    <DatePicker
                      value={draft.date}
                      onChange={(date) => onDraftChange((prev) => ({ ...prev, date }))}
                      mode="single"
                      required
                    />
                  </label>
                </div>

                {/* Shift Pengirim & Penerima with directional arrow */}
                <div className="wizard-shift-flow-container">
                  <div className="wizard-shift-col">
                    <label>
                      Shift Pengirim (Asal)
                      <input
                        value={draft.sourceShift}
                        onChange={(event) => onDraftChange((prev) => ({ ...prev, sourceShift: event.target.value }))}
                        placeholder="e.g. Subuh"
                        required
                      />
                    </label>
                  </div>

                  <div className="wizard-shift-arrow" title="Arah serah terima tugas">
                    <ArrowRight size={16} />
                  </div>

                  <div className="wizard-shift-col">
                    <label>
                      Shift Penerima (Tujuan)
                      <input
                        value={draft.targetShift}
                        onChange={(event) => onDraftChange((prev) => ({ ...prev, targetShift: event.target.value }))}
                        placeholder="e.g. Pagi"
                        required
                      />
                    </label>
                  </div>
                </div>

                {/* Quick Shift Rotation Presets */}
                <div className="wizard-shift-presets">
                  <span className="wizard-preset-label">Rotasi Cepat:</span>
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
                    PIC Shift Pengirim
                    <input
                      value={draft.sourcePic}
                      onChange={(event) => onDraftChange((prev) => ({ ...prev, sourcePic: event.target.value }))}
                      placeholder="Nama penanggung jawab shift saat ini"
                      required
                    />
                  </label>
                  <label>
                    PIC Shift Penerima
                    <input
                      value={draft.targetPic}
                      onChange={(event) => onDraftChange((prev) => ({ ...prev, targetPic: event.target.value }))}
                      placeholder="Nama tim penerima (e.g. Budi, Andi)"
                      required
                    />
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
              <div className="wizard-section-card">
                <div className="wizard-section-header">
                  <span className="wizard-section-title">
                    <FileText size={15} /> Catatan untuk Shift Berikutnya
                  </span>
                  <span className="wizard-section-hint">Pesan, konteks operasional, atau pengingat penting</span>
                </div>

                <div>
                  <label>
                    Catatan Shift (Pesan Bebas dari Shifter Pengirim)
                    <textarea
                      rows={6}
                      value={draft.notes ?? ""}
                      onChange={(event) =>
                        onDraftChange((prev) => ({ ...prev, notes: event.target.value }))
                      }
                      placeholder="Tuliskan catatan, konteks kendala, hal yang perlu diwaspadai, atau pengingat bagi shift penerima (opsional)..."
                    />
                    <small style={{ display: "block", marginTop: "6px", color: "var(--ink-muted)", fontSize: "11px" }}>
                      Catatan ini akan tampil di tab Catatan Shift pada detail handover agar shift berikutnya segera mengetahui konteks pekerjaan Anda.
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
              <div className="handover-step-header-action">
                <div className="wizard-section-title" style={{ fontSize: "13px" }}>
                  <ShieldCheck size={16} /> Daftar Temuan &amp; Pengecualian ({draft.findings.length})
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
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span className="wizard-task-num-badge">#{index + 1}</span>
                          <strong style={{ fontSize: "12.5px" }}>
                            {finding.title ? finding.title : `Temuan #${index + 1}`}
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

                      <div className="handover-form-grid handover-form-grid-three">
                        <label>
                          Proyek
                          <ProjectSelect
                            value={finding.project}
                            onChange={(project) => updateFinding(index, { project })}
                            placeholder="Pilih proyek..."
                          />
                        </label>
                        <label className="handover-form-wide">
                          Judul Temuan
                          <input
                            value={finding.title}
                            onChange={(event) => updateFinding(index, { title: event.target.value })}
                            placeholder="Ringkasan kendala atau anomali"
                          />
                        </label>
                        <label>
                          Status
                          <select
                            value={finding.state}
                            onChange={(event) =>
                              updateFinding(index, { state: event.target.value as "waiting" | "in-progress" })
                            }
                          >
                            <option value="waiting">Monitored</option>
                            <option value="in-progress">In Progress</option>
                          </select>
                        </label>
                      </div>

                      <label style={{ marginTop: "10px" }}>
                        Rincian &amp; Tindak Lanjut
                        <textarea
                          rows={2}
                          value={finding.detail}
                          onChange={(event) => updateFinding(index, { detail: event.target.value })}
                          placeholder="Kondisi terakhir dan langkah yang perlu diteruskan oleh shift penerima."
                        />
                      </label>
                    </article>
                  ))
                ) : (
                  /* Inviting Empty State Card */
                  <div className="wizard-empty-card">
                    <div className="wizard-empty-icon">
                      <ShieldCheck size={26} />
                    </div>
                    <div className="wizard-empty-title">Semua Berjalan Normal</div>
                    <div className="wizard-empty-desc">
                      Tidak ada temuan khusus atau anomali pada shift ini. Klik tombol di bawah jika ada kendala
                      atau isu yang perlu dieskalasi ke shift berikutnya.
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
              <div className="wizard-task-controls">
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span className="wizard-section-title" style={{ fontSize: "13px" }}>
                    <CheckSquare size={16} /> Ceklis Tugas Handover ({draft.tasks.length})
                  </span>
                  <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                    Tugas operasional berjalan yang didelegasikan dan perlu dilanjutkan shift berikutnya.
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
                  const isCollapsed = Boolean(collapsedTasks[task.id]);
                  return (
                    <article
                      className={`wizard-task-card ${isCollapsed ? "collapsed" : "expanded"}`}
                      key={task.id}
                    >
                      {/* Accordion Header */}
                      <div
                        className="wizard-task-header"
                        onClick={() => toggleTaskCollapse(task.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleTaskCollapse(task.id);
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
                            <label>
                              Proyek
                              <ProjectSelect
                                value={task.project}
                                onChange={(project) => updateTask(task.id, { project })}
                                placeholder="Pilih proyek..."
                              />
                            </label>
                            <label>
                              Judul Tugas
                              <input
                                value={task.title}
                                onChange={(event) => updateTask(task.id, { title: event.target.value })}
                                placeholder="Judul pekerjaan atau pengecekan"
                                required
                              />
                            </label>
                            <label>
                              Tipe / Status
                              <select
                                value={task.state}
                                onChange={(event) =>
                                  updateTask(task.id, { state: event.target.value as HandoverState })
                                }
                              >
                                <option value="repeat">Routine</option>
                                <option value="waiting">Pending</option>
                                <option value="in-progress">In Progress</option>
                                <option value="done">Selesai</option>
                                <option value="escalated">Dieskalasi</option>
                                <option value="blocked">Terhambat</option>
                                <option value="waiting-vendor">Menunggu Vendor</option>
                                <option value="activity">Aktivitas</option>
                              </select>
                            </label>
                            <label>
                              Prioritas
                              <select
                                value={task.priority || "Medium"}
                                onChange={(event) =>
                                  updateTask(task.id, { priority: event.target.value })
                                }
                              >
                                <option value="Critical">Critical</option>
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                              </select>
                            </label>
                          </div>

                          <label style={{ marginTop: "10px" }}>
                            Instruksi / Detail Pekerjaan
                            <textarea
                              rows={2}
                              value={task.detail}
                              onChange={(event) => updateTask(task.id, { detail: event.target.value })}
                              placeholder="Jelaskan hal yang perlu diperiksa atau dikerjakan oleh shift penerima."
                            />
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
            {/* Contextual Next Step Helper Hint */}
            <div className="wizard-footer-hint">
              {step === 1 && (
                <>
                  Langkah selanjutnya: <strong>Catatan Shift</strong> →
                </>
              )}
              {step === 2 && (
                <>
                  Langkah selanjutnya: <strong>Temuan ({draft.findings.length})</strong> →
                </>
              )}
              {step === 3 && (
                <>
                  Langkah selanjutnya: <strong>Tugas ({draft.tasks.length})</strong> →
                </>
              )}
              {step === 4 && (
                <>
                  Langkah terakhir: <strong>Simpan serah terima</strong>
                </>
              )}
            </div>

            {step < 4 ? (
              <button
                type="button"
                className="button button-primary"
                onClick={() => {
                  setVisitedSteps((prev) => new Set(prev).add(step));
                  handleStepChange((step + 1) as 1 | 2 | 3 | 4);
                }}
              >
                Lanjut (Langkah {step + 1}) →
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
