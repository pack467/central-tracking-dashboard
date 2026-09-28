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
    <article className="panel handover-panel [padding:18px_20px] [background:var(--accent-blue-soft)] [border:1px_solid_var(--accent-blue-border)]">
      <div className="handover-label [display:flex] [align-items:center] [gap:5px] [color:var(--accent-blue)] [font-size:9.5px] [font-weight:700] [letter-spacing:0.8px] [font-family:var(--font-mono)]">
        <span>⊙</span> HANDOVER READINESS
      </div>
      <strong className="[display:block] [margin-top:8px] [color:var(--ink-primary)] [font-size:14px] [font-weight:700]">{pendingCount} tugas perlu tindak lanjut</strong>
      <p className="[margin:5px_0_12px] [color:var(--ink-secondary)] [font-size:11px] [line-height:1.4]">
        {savedLabel
          ? `Handover ${savedLabel} ${accepted ? "sudah diterima." : "tersimpan dan menunggu penerimaan."}`
          : "Buat catatan baru untuk mendokumentasikan proses serah-terima shift."}
      </p>
      <div className="handover-progress [display:flex] [justify-content:space-between] [align-items:center] [gap:8px] [color:var(--ink-secondary)] [font-size:10.5px] [font-family:var(--font-mono)]">
        <span>{progressPercent}% checklist diperiksa</span>
        <i className="[display:block] [overflow:hidden] [width:75px] [height:5px] [border-radius:99px] [background:var(--line)]">
          <b className="[display:block] [height:100%] [border-radius:inherit] [background:var(--accent-blue)]" style={{ width: `${progressPercent}%` }} />
        </i>
      </div>
      <button className="[display:flex] [justify-content:space-between] [align-items:center] [width:100%] [margin-top:14px] [padding:9px_12px] [color:#ffffff] [border:1px_solid_var(--accent-blue)]! [border-radius:7px] [background:var(--accent-blue)]! [font-size:11px]! [font-weight:600] [transition:all_0.15s_ease]" onClick={() => onOpen()}>
        Buka catatan handover <span>→</span>
      </button>
      <button className="handover-create-button [display:flex] [justify-content:space-between] [align-items:center] [width:100%] [margin-top:14px] [padding:9px_12px] [color:#ffffff] [border:1px_solid_var(--accent-blue)]! [border-radius:7px] [background:var(--accent-blue)]! [font-size:11px]! [font-weight:600] [transition:all_0.15s_ease]" onClick={() => onCreate()}>
        <span>＋</span> Buat Handover Baru
      </button>
    </article>
  );
}
