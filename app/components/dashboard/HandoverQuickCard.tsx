"use client";

interface HandoverQuickCardProps {
  pendingCount: number;
  progressPercent: number;
  savedLabel: string | null;
  accepted?: boolean;
  onOpen: () => void;
  onCreate: () => void;
}

export function HandoverQuickCard({
  pendingCount,
  progressPercent,
  savedLabel,
  accepted,
  onOpen,
  onCreate,
}: HandoverQuickCardProps) {
  return (
    <article className="panel handover-panel">
      <div className="handover-label">
        <span>⊙</span> HANDOVER READINESS
      </div>
      <strong>{pendingCount} tugas perlu tindak lanjut</strong>
      <p>
        {savedLabel
          ? `Handover ${savedLabel} ${accepted ? "sudah diterima." : "tersimpan dan menunggu penerimaan."}`
          : "Buat catatan baru untuk mendokumentasikan proses serah-terima shift."}
      </p>
      <div className="handover-progress">
        <span>{progressPercent}% checklist diperiksa</span>
        <i>
          <b style={{ width: `${progressPercent}%` }} />
        </i>
      </div>
      <button onClick={() => onOpen()}>
        Buka catatan handover <span>→</span>
      </button>
      <button className="handover-create-button" onClick={() => onCreate()}>
        <span>＋</span> Buat Handover Baru
      </button>
    </article>
  );
}
