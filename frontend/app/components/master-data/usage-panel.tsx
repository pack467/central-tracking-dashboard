"use client";
import { useAppData } from "@/app/components/routing/AppShell";
import type { Severity, TicketCategory } from "@/app/types/master-data";
import { UsageBar } from "./master-ui";

/**
 * "Penggunaan" of a category or a severity: how many tickets use it, split by status, and the five projects that use it most.
 * The Tickets page has no filter by category or severity yet, so these are numbers, not a link.
 */
export function TicketUsage({ entity, row, fill }: { entity: "category" | "severity"; row: TicketCategory | Severity; fill: string }) {
  const tickets = useAppData()?.tickets ?? [];
  const used = tickets.filter(ticket => entity === "category"
    ? (ticket.type || ticket.category) === (row as TicketCategory).key
    : String(ticket.severity).toLowerCase() === (row as Severity).code);
  const count = (pick: (ticket: (typeof used)[number]) => string) => {
    const map = new Map<string, number>();
    for (const ticket of used) { const key = pick(ticket) || "Tanpa proyek"; map.set(key, (map.get(key) ?? 0) + 1); }
    return [...map].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "id"));
  };
  const byStatus = count(ticket => String(ticket.status));
  const byProject = count(ticket => ticket.project).slice(0, 5);
  const top = byProject[0]?.[1] ?? 1;
  return (
    <section aria-label="Penggunaan" className="space-y-4">
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">Penggunaan</h3>
        <p className="mt-2 font-dashboard-mono text-2xl font-semibold tabular-nums text-slate-50">
          {used.length}
          <span className="ml-1.5 font-sans text-[12px] font-normal text-slate-400">tiket</span>
        </p>
        <p className="mt-0.5 text-[11px] text-slate-400">Dihitung dari semua tiket di semua klien.</p>
      </div>
      {used.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-700/80 bg-[#0f172a]/25 px-4 py-6 text-center text-xs text-slate-400">Belum dipakai oleh tiket mana pun.</p>
      ) : (
        <>
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">Menurut status</h4>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {byStatus.map(([status, total]) => (
                <li key={status} className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-800 px-2.5 py-0.5 text-[12px] text-slate-200">
                  {status}
                  <span className="font-dashboard-mono font-semibold tabular-nums text-slate-50">{total}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">Proyek teratas</h4>
            <ul className="mt-2 space-y-2.5">
              {byProject.map(([project, total]) => (
                <li key={project} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate text-[13px] text-slate-200" title={project}>{project}</span>
                  <span className="w-16 shrink-0 text-right font-dashboard-mono text-[12px] tabular-nums text-slate-100">{total} tiket</span>
                  <UsageBar value={total} max={top} fill={fill} label={`Tiket ${project}`} />
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
