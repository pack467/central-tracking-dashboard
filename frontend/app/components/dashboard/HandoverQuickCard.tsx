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
    <article className="panel handover-panel p-[18px_20px] bg-[var(--accent-blue-soft)] border border-[var(--accent-blue-border)] rounded-[10px] overflow-hidden shadow-[var(--shadow-panel)]">
      <div className="handover-label flex items-center gap-[5px] text-[var(--accent-blue)] text-[9.5px] font-bold tracking-[0.8px] font-mono">
        <span>⊙</span> HANDOVER READINESS
      </div>
      <strong className="block mt-[8px] text-[var(--ink-primary)] text-[14px] font-bold">{pendingCount} tugas perlu tindak lanjut</strong>
      <p className="mt-[5px] mr-0 mb-[12px] ml-0 text-[var(--ink-secondary)] text-[11px] leading-[1.4]">
        {savedLabel
          ? `Handover ${savedLabel} ${accepted ? "sudah diterima." : "tersimpan dan menunggu penerimaan."}`
          : "Buat catatan baru untuk mendokumentasikan proses serah-terima shift."}
      </p>
      <div className="handover-progress flex justify-between items-center gap-[8px] text-[var(--ink-secondary)] text-[10.5px] font-mono">
        <span>{progressPercent}% checklist diperiksa</span>
        <i className="block overflow-hidden w-[75px] h-[5px] rounded-[99px] bg-[var(--line)] not-italic">
          <b className="block h-full rounded-[inherit] bg-[var(--accent-blue)]" style={{ width: `${progressPercent}%` }} />
        </i>
      </div>
      <button className="flex justify-between items-center w-full mt-[14px] px-[12px] py-[9px] text-[#ffffff] border border-[var(--accent-blue)] rounded-[7px] bg-[var(--accent-blue)] text-[11px] font-semibold transition-all duration-150 cursor-pointer" onClick={() => onOpen()}>
        Buka catatan handover <span>→</span>
      </button>
      <button className="handover-create-button flex justify-between items-center w-full mt-[14px] px-[12px] py-[9px] text-[#ffffff] border border-[var(--accent-blue)] rounded-[7px] bg-[var(--accent-blue)] text-[11px] font-semibold transition-all duration-150 cursor-pointer" onClick={() => onCreate()}>
        <span>＋</span> Buat Handover Baru
      </button>
    </article>
  );
}
