import type { ReactNode } from "react";

const TONES = {
  // closest-side: the glow fades out before it reaches the box, so no edge shows
  sky: { icon: "border-sky-400/25 bg-sky-400/10 text-sky-300 shadow-[0_0_0_6px_rgba(56,189,248,0.05)]", glow: "bg-[radial-gradient(closest-side,rgba(56,189,248,0.07),transparent)]" },
  emerald: { icon: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300 shadow-[0_0_0_6px_rgba(16,185,129,0.05)]", glow: "bg-[radial-gradient(closest-side,rgba(16,185,129,0.07),transparent)]" }
} as const;

/** The empty look shared by the dashboard charts: a soft icon, what is missing, why, and what to do about it. */
export function ChartEmptyState({ icon, title, text, actions, tone = "sky", className = "min-h-[260px]" }: { icon: ReactNode; title: string; text: string; actions?: ReactNode; tone?: keyof typeof TONES; className?: string }) {
  return (
    <div role="status" className={`flex flex-1 w-full flex-col items-center justify-center gap-3.5 rounded-xl px-6 py-8 text-center chart-empty-hint ${TONES[tone].glow} ${className}`}>
      <span aria-hidden="true" className={`grid size-11 shrink-0 place-items-center rounded-full border ${TONES[tone].icon}`}>{icon}</span>
      <div className="flex max-w-[360px] flex-col gap-1">
        <p className="m-0 text-[14.5px] font-semibold leading-snug text-[#f8fafc]">{title}</p>
        <p className="m-0 text-[12.5px] leading-snug text-[#94a3b8]">{text}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center justify-center gap-2">{actions}</div>}
    </div>
  );
}
