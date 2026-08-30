"use client";

import { useState } from "react";
import { Modal } from "@/app/components/ui/Modal";

export function NotAdequateModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (note: string) => void;
}) {
  const [note, setNote] = useState("");

  const submit = () => {
    onSubmit(note.trim());
    setNote("");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} label="Tambah catatan anomali checkpoint (NOK)" width={520}>
      <div className="modal-title">
        <div>
          <strong style={{ color: "var(--red)" }}>Tandai Checkpoint sebagai NOK</strong>
          <small>Masukkan penjelasan atau observasi anomali untuk log handover shift</small>
        </div>
        <button onClick={onClose}>×</button>
      </div>

      <div
        style={{
          marginBottom: "14px",
          background: "var(--red-soft)",
          border: "1px solid var(--red-border)",
          borderRadius: "8px",
          padding: "10px 12px",
          fontSize: "12px",
          color: "var(--red)",
        }}
      >
        <strong>Format rekomendasi:</strong> Jelaskan gejala yang terlihat (misalnya queue buildup, traffic drop,
        high CPU), komponen terdampak, dan status penanganan / ID ticket.
      </div>

      <label>
        Alasan NOK &amp; catatan tindakan:
        <textarea
          rows={4}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Contoh: Queue ActiveMQ 228 menumpuk 4.200 pesan. Proses consumer di-restart pukul 22:05; pantau laju pengurangan queue."
        />
      </label>

      <div className="modal-actions">
        <button className="button button-secondary" onClick={onClose}>
          Batal
        </button>
        <button
          className="button button-danger"
          style={{ background: "var(--red)", borderColor: "var(--red-border)" }}
          onClick={submit}
        >
          Simpan Catatan NOK
        </button>
      </div>
    </Modal>
  );
}

export function AdequacyGuideModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} label="Panduan penilaian checkpoint (OK / NOK)" width={620}>
      <div className="modal-title">
        <div>
          <strong>Panduan Penilaian Checkpoint (OK / NOK)</strong>
          <small>SOP dan kriteria evaluasi kesehatan monitoring layanan NOC</small>
        </div>
        <button onClick={onClose}>×</button>
      </div>

      <div style={{ display: "grid", gap: "14px", fontSize: "12.5px", color: "var(--ink-primary)", lineHeight: 1.5 }}>
        <div style={{ padding: "12px", background: "var(--green-soft)", border: "1px solid var(--green-border)", borderRadius: "8px" }}>
          <strong style={{ color: "var(--green)", fontSize: "13px" }}>✓ Kriteria OK (Passed / Normal)</strong>
          <ul style={{ margin: "6px 0 0", paddingLeft: "18px", color: "var(--ink-secondary)" }}>
            <li><strong>Metrik sesuai SLA:</strong> Utilisasi CPU di bawah 85%, memori stabil, dan latensi respons dalam baseline normal.</li>
            <li><strong>Aliran pesan aktif:</strong> Topik Kafka aktif mengonsumsi dan menghasilkan pesan tanpa lag tak terduga.</li>
            <li><strong>Queue nominal:</strong> Kedalaman queue ActiveMQ/RabbitMQ dalam parameter operasi normal.</li>
            <li><strong>Log &amp; stream:</strong> Stream log Graylog/SIEM terus diperbarui tanpa rangkaian error yang tidak tertangani.</li>
          </ul>
        </div>

        <div style={{ padding: "12px", background: "var(--red-soft)", border: "1px solid var(--red-border)", borderRadius: "8px" }}>
          <strong style={{ color: "var(--red)", fontSize: "13px" }}>✗ Kriteria NOK (Failed / Action Required)</strong>
          <ul style={{ margin: "6px 0 0", paddingLeft: "18px", color: "var(--ink-secondary)" }}>
            <li><strong>Penumpukan queue:</strong> Penumpukan pesan pending atau deadlock terdeteksi pada queue layanan.</li>
            <li><strong>Traffic hilang:</strong> Tidak ada produksi pesan pada topik Kafka aktif atau stream socket terputus.</li>
            <li><strong>Alert sumber daya:</strong> Lonjakan CPU atau memori berkelanjutan melebihi ambang alert.</li>
            <li><strong>Error belum selesai:</strong> Respons error sistem berulang tanpa pemulihan otomatis.</li>
          </ul>
        </div>

        <div style={{ padding: "12px", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "8px" }}>
          <strong style={{ fontSize: "12.5px" }}>📝 Prosedur pencatatan saat status NOK:</strong>
          <ol style={{ margin: "6px 0 0", paddingLeft: "18px", color: "var(--ink-secondary)" }}>
            <li>Klik tombol <strong>&quot;NOK&quot;</strong> pada baris checkpoint di jadwal monitoring.</li>
            <li>
              Di modal, masukkan 3 elemen utama: <strong>Gejala</strong>, <strong>Komponen terdampak</strong>, dan{" "}
              <strong>Tindakan penanganan</strong> (atau ID ticket terkait).
            </li>
            <li>Simpan catatan agar tampil langsung di baris monitoring dan terangkum otomatis pada handover shift.</li>
          </ol>
        </div>
      </div>

      <div className="modal-actions">
        <button className="button button-primary" onClick={onClose}>
          Mengerti, tutup panduan
        </button>
      </div>
    </Modal>
  );
}
