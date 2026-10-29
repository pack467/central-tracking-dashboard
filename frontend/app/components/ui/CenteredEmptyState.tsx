import type { ReactNode } from "react";

interface Props {
  icon: ReactNode;
  title: string;
  description?: string;
  /** Sizing that belongs to the place it is used: fill the parent (flex-1), a fixed phone height, and so on. */
  className?: string;
}

/**
 * An empty panel body: a soft green check in a circle, a short title and one quiet line, centred both ways in whatever room the panel gives it.
 * The text stays narrow so it never stretches across a wide card.
 */
export function CenteredEmptyState({ icon, title, description, className = "" }: Props) {
  return (
    <div
      role="status"
      className={`flex min-h-[160px] w-full flex-col items-center justify-center gap-3 rounded-xl bg-[radial-gradient(circle_at_50%_42%,rgba(74,222,128,0.07),transparent_62%)] px-6 py-8 text-center ${className}`}
    >
      <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-full border border-emerald-400/25 bg-emerald-400/10 text-emerald-300 shadow-[0_0_0_6px_rgba(74,222,128,0.05)]">
        {icon}
      </span>
      <div className="flex max-w-[260px] flex-col gap-1">
        <p className="m-0 text-[15px] font-semibold leading-snug text-[#f8fafc]">{title}</p>
        {description && <p className="m-0 text-[13px] leading-snug text-[#94a3b8]">{description}</p>}
      </div>
    </div>
  );
}
