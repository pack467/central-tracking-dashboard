import { Layers } from "lucide-react";

interface Props {
  /** The mode in two words, shown as a pill: "Per minggu". */
  badge: string;
  /** The one sentence that matters. */
  children: React.ReactNode;
  /** A quieter second line (what the numbers above count, what is left out). */
  detail?: React.ReactNode;
  className?: string;
}

/**
 * The strip above a chart that says how its data is grouped: a pill with the mode, one clear sentence, and a quieter detail line.
 * It is a note, not an alert, so it stays low-contrast and takes one line on a wide card.
 */
export function ChartModeNote({ badge, children, detail, className = "" }: Props) {
  return (
    <div role="note" className={`flex shrink-0 items-start gap-3 rounded-[10px] border border-sky-400/15 bg-gradient-to-r from-sky-400/[0.07] to-sky-400/[0.02] px-3 py-2.5 ${className}`}>
      <span aria-hidden="true" className="mt-[1px] grid size-6 shrink-0 place-items-center rounded-full bg-sky-400/15 text-sky-300"><Layers size={13} /></span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className="inline-flex h-[20px] shrink-0 items-center rounded-full border border-sky-400/30 bg-sky-400/10 px-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-sky-300">{badge}</span>
        <p className="m-0 min-w-0 text-[12px] font-medium leading-snug text-[#e2e8f0]">{children}</p>
        {detail && <p className="m-0 basis-full text-[11px] leading-snug text-[#94a3b8]">{detail}</p>}
      </div>
    </div>
  );
}
