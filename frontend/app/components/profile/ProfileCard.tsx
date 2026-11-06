import type { ReactNode } from "react";

/** min-w-0: a card in the page grid must never grow with what is inside it, however long that is. */
export const PROFILE_CARD = "flex min-w-0 flex-col gap-4 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5 max-[660px]:p-4";

export function CardHeading({ id, icon, title, hint, action }: { id?: string; icon: ReactNode; title: string; hint: string; action?: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-[var(--accent-blue-border)] bg-[var(--accent-blue-soft)] text-[var(--accent-blue)]" aria-hidden="true">{icon}</span>
      <div className="min-w-0 flex-1">
        <h2 id={id} className="m-0 text-[14.5px] font-semibold text-[var(--ink-primary)]">{title}</h2>
        <p className="m-0 mt-0.5 text-[12px] leading-[1.45] text-[var(--ink-muted)]">{hint}</p>
      </div>
      {action && <div className="shrink-0 pt-0.5">{action}</div>}
    </div>
  );
}
