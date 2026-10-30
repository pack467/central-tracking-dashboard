"use client";

import { usePathname } from "next/navigation";
import { Info } from "lucide-react";
import { localDataNotice } from "@/app/lib/local-data-notice";

/** A thin note above a page whose data is not connected to the backend yet (see localDataNotice). */
export function LocalDataNotice() {
  const message = localDataNotice(usePathname());
  if (!message) return null;
  return (
    <div role="note" className="flex items-start gap-[10px] mb-[18px] px-[14px] py-[10px] rounded-[8px] border border-[var(--panel-border)] bg-[var(--panel-bg)] text-[12px] leading-[1.5] text-[var(--ink-muted)]">
      <Info size={14} className="mt-[2px] shrink-0 text-[var(--orange)]" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
