"use client";

import { useState } from "react";
import { Modal } from "@/app/components/ui/Modal";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { IconFindings, IconMonitoring, IconShiftInfo, IconTasks } from "@/app/components/ui/Icons";
import type { HandoverDraft, HandoverState } from "@/app/lib/types";

interface HandoverWizardProps {
  open: boolean;
  draft: HandoverDraft;
  dirty: boolean;
  onDraftChange: (updater: (previous: HandoverDraft) => HandoverDraft) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}

export function HandoverWizard({ open, draft, dirty, onDraftChange, onClose, onSave, saving }: HandoverWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const requestClose = () => {
    if (dirty) setConfirmDiscard(true);
    else onClose();
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
    onDraftChange((previous) => ({
      ...previous,
      tasks: [...previous.tasks, { id: Date.now(), title: "", project: "NOC", detail: "", state: "repeat" as HandoverState, completed: false }],
    }));
  };

  const removeTask = (taskId: number) => {
    onDraftChange((previous) => ({ ...previous, tasks: previous.tasks.filter((task) => task.id !== taskId) }));
  };

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

  return (
    <>
      <Modal open={open} onClose={requestClose} label="Buat catatan handover baru" variant="form" width={680}>
        <header className="handover-modal-header">
          <div>
            <div className="handover-modal-kicker">
              <span className="live-dot live-dot-pulse" /> CATATAN BARU
            </div>
            <h2>Buat Handover Baru</h2>
          </div>
          <button className="handover-modal-close" onClick={requestClose} aria-label="Tutup">
            ×
          </button>
        </header>

        <div className="handover-wizard-nav" role="tablist">
          <button className={step === 1 ? "active" : ""} onClick={() => setStep(1)}>
            <IconShiftInfo /> Informasi Shift
          </button>
          <button className={step === 2 ? "active" : ""} onClick={() => setStep(2)}>
            <IconMonitoring /> Monitoring
          </button>
          <button className={step === 3 ? "active" : ""} onClick={() => setStep(3)}>
            <IconFindings /> Temuan ({draft.findings.length})
          </button>
          <button className={step === 4 ? "active" : ""} onClick={() => setStep(4)}>
            <IconTasks /> Tugas ({draft.tasks.length})
          </button>
        </div>

        <div className="handover-form-scroll">
          {step === 1 && (
            <section className="handover-form-step">
              <h3 className="handover-step-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <IconShiftInfo size={16} /> Langkah 1 dari 4: Identitas Shift &amp; Tim
              </h3>
              <div className="handover-form-grid handover-form-grid-three">
                <label>
                  Tanggal
                  <input
                    type="date"
                    value={draft.date}
                    onChange={(event) => onDraftChange((prev) => ({ ...prev, date: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  Shift Pengirim
                  <input
                    value={draft.sourceShift}
                    onChange={(event) => onDraftChange((prev) => ({ ...prev, sourceShift: event.target.value }))}
                    placeholder="e.g. Subuh / Pagi"
                    required
                  />
                </label>
                <label>
                  Shift Penerima
                  <input
                    value={draft.targetShift}
                    onChange={(event) => onDraftChange((prev) => ({ ...prev, targetShift: event.target.value }))}
                    placeholder="e.g. Pagi / Malam"
                    required
                  />
                </label>
              </div>
              <div className="handover-form-grid handover-form-grid-two" style={{ marginTop: "12px" }}>
                <label>
                  PIC Shift Pengirim
                  <input
                    value={draft.sourcePic}
                    onChange={(event) => onDraftChange((prev) => ({ ...prev, sourcePic: event.target.value }))}
                    placeholder="Nama penanggung jawab shift pengirim"
                    required
                  />
                </label>
                <label>
                  PIC Shift Penerima
                  <input
                    value={draft.targetPic}
                    onChange={(event) => onDraftChange((prev) => ({ ...prev, targetPic: event.target.value }))}
                    placeholder="Nama tim penerima (pisah koma)"
                    required
                  />
                </label>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="handover-form-step">
              <h3 className="handover-step-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <IconMonitoring size={16} /> Langkah 2 dari 4: Status &amp; Ringkasan Monitoring
              </h3>
              <div className="handover-form-grid handover-form-grid-two">
                <label>
                  Penanggung Jawab Monitoring
                  <input
                    value={draft.monitoringOwner}
                    onChange={(event) => onDraftChange((prev) => ({ ...prev, monitoringOwner: event.target.value }))}
                    placeholder="Nama PIC monitoring"
                  />
                </label>
                <label>
                  Proyek yang Dimonitor
                  <input
                    value={draft.monitoredProjects}
                    onChange={(event) => onDraftChange((prev) => ({ ...prev, monitoredProjects: event.target.value }))}
                    placeholder="B2B, DM, EPC, USIEM, SM, MB"
                  />
                </label>
              </div>
              <label style={{ marginTop: "12px" }}>
                Ringkasan Hasil Monitoring
                <textarea
                  rows={3}
                  value={draft.monitoringSummary}
                  onChange={(event) => onDraftChange((prev) => ({ ...prev, monitoringSummary: event.target.value }))}
                  placeholder="Jelaskan secara singkat hasil pemantauan dan laporan yang telah dikirim ke Telegram/Teams."
                />
              </label>
              <label style={{ marginTop: "12px" }}>
                Catatan Validasi Shift Penerima
                <textarea
                  rows={2}
                  value={draft.validationNote}
                  onChange={(event) => onDraftChange((prev) => ({ ...prev, validationNote: event.target.value }))}
                  placeholder="Catatan atau respon saat sesi serah terima berlangsung."
                />
              </label>
            </section>
          )}

          {step === 3 && (
            <section className="handover-form-step">
              <div className="handover-step-header-action">
                <h3 className="handover-step-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <IconFindings size={16} /> Langkah 3 dari 4: Temuan &amp; Pengecualian
                </h3>
                <button type="button" className="handover-inline-add" onClick={addFinding}>
                  ＋ Tambah Temuan
                </button>
              </div>
              <div className="handover-form-repeat-list">
                {draft.findings.length ? (
                  draft.findings.map((finding, index) => (
                    <article className="handover-form-repeat" key={`finding-${index}`}>
                      <div className="handover-form-repeat-head">
                        <strong>Temuan #{index + 1}</strong>
                        <button type="button" onClick={() => removeFinding(index)} aria-label="Hapus">
                          Hapus
                        </button>
                      </div>
                      <div className="handover-form-grid handover-form-grid-three">
                        <label>
                          Proyek
                          <input
                            value={finding.project}
                            onChange={(event) => updateFinding(index, { project: event.target.value })}
                            placeholder="USIEM / SM / B2B"
                          />
                        </label>
                        <label className="handover-form-wide">
                          Judul Temuan
                          <input
                            value={finding.title}
                            onChange={(event) => updateFinding(index, { title: event.target.value })}
                            placeholder="Ringkasan masalah"
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
                      <label style={{ marginTop: "8px" }}>
                        Rincian &amp; Tindak Lanjut
                        <textarea
                          rows={2}
                          value={finding.detail}
                          onChange={(event) => updateFinding(index, { detail: event.target.value })}
                          placeholder="Kondisi terakhir dan langkah yang perlu diteruskan."
                        />
                      </label>
                    </article>
                  ))
                ) : (
                  <div className="handover-form-empty">
                    Tidak ada temuan khusus. Klik <strong>&quot;＋ Tambah Temuan&quot;</strong> jika ada isu yang
                    perlu diteruskan ke shift berikutnya.
                  </div>
                )}
              </div>
            </section>
          )}

          {step === 4 && (
            <section className="handover-form-step">
              <div className="handover-step-header-action">
                <h3 className="handover-step-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <IconTasks size={16} /> Langkah 4 dari 4: Ceklis Tugas Shift
                </h3>
                <button type="button" className="handover-inline-add" onClick={addTask}>
                  ＋ Tambah Tugas
                </button>
              </div>
              <div className="handover-form-repeat-list">
                {draft.tasks.map((task, index) => (
                  <article className="handover-form-repeat handover-task-editor" key={task.id}>
                    <div className="handover-form-repeat-head">
                      <strong>Tugas #{index + 1}</strong>
                      <button type="button" onClick={() => removeTask(task.id)} aria-label="Hapus">
                        Hapus
                      </button>
                    </div>
                    <div className="handover-form-grid handover-form-grid-three">
                      <label>
                        Proyek
                        <input
                          value={task.project}
                          onChange={(event) => updateTask(task.id, { project: event.target.value })}
                          placeholder="SM / B2B / DM"
                        />
                      </label>
                      <label className="handover-form-wide">
                        Judul Tugas
                        <input
                          value={task.title}
                          onChange={(event) => updateTask(task.id, { title: event.target.value })}
                          placeholder="Judul pekerjaan / pengecekan"
                          required
                        />
                      </label>
                      <label>
                        Tipe / Status
                        <select
                          value={task.state}
                          onChange={(event) => updateTask(task.id, { state: event.target.value as HandoverState })}
                        >
                          <option value="repeat">Routine</option>
                          <option value="waiting">Pending</option>
                          <option value="in-progress">In Progress</option>
                        </select>
                      </label>
                    </div>
                    <label style={{ marginTop: "8px" }}>
                      Instruksi / Detail Pekerjaan
                      <textarea
                        rows={2}
                        value={task.detail}
                        onChange={(event) => updateTask(task.id, { detail: event.target.value })}
                        placeholder="Jelaskan hal yang perlu diperiksa atau dikerjakan oleh shift penerima."
                      />
                    </label>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>

        <footer className="handover-modal-footer handover-form-footer">
          <div style={{ display: "flex", gap: "8px" }}>
            {step > 1 && (
              <button
                className="button button-secondary"
                onClick={() => setStep((previous) => (previous - 1) as 1 | 2 | 3 | 4)}
              >
                ← Kembali
              </button>
            )}
            <button className="button button-secondary" onClick={requestClose} disabled={saving}>
              Batal
            </button>
          </div>

          <div>
            {step < 4 ? (
              <button
                className="button button-primary"
                onClick={() => setStep((previous) => (previous + 1) as 1 | 2 | 3 | 4)}
              >
                Lanjut (Langkah {step + 1}) →
              </button>
            ) : (
              <button className="button button-primary" onClick={onSave} disabled={saving}>
                {saving ? "Menyimpan…" : "Simpan & Buka Handover"}
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
          onClose();
        }}
      />
    </>
  );
}
