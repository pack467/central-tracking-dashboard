"use client";

import { useState } from "react";
import { MomComparison } from "@/app/components/dashboard/MomComparison";
import { useMasterReferences } from "@/app/hooks/useMasterReferences";
import { useClient } from "@/app/context/ClientContext";
import { formatDeltaPct, monthShort, type MomComparison as MomData } from "@/app/lib/mom-comparison";

interface TicketMomViewProps {
  momData: MomData;
  mode: "chart" | "table";
  projectColors?: Record<string, string>;
}

const nf = (value: number) => value.toLocaleString("id-ID");

/** The expanded "Bulan Lalu vs Bulan Ini": the same component as the dashboard card with its summary cards, or the numbers as tables. */
export function TicketMomView({ momData, mode, projectColors = {} }: TicketMomViewProps) {
  const [view, setView] = useState<"trajectory" | "project">("trajectory");
  const { activeClientId } = useClient();
  const { projectLabel } = useMasterReferences();
  const label = (project: string) => projectLabel(project, activeClientId);
  const color = (project: string) => projectColors[project] || "#94a3b8";

  if (mode === "chart") {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <MomComparison data={momData} variant="full" view={view} onViewChange={setView} projectLabel={label} projectColor={color} />
      </div>
    );
  }

  const { current, previous, throughDay, days, projects } = momData;
  const currShort = monthShort(current.key), prevShort = monthShort(previous.key);
  return (
    <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 max-[980px]:grid-cols-1">
      <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/40">
        <h2 className="m-0 border-b border-slate-700/60 px-4 py-2.5 text-[12px] font-bold text-slate-200">Per sistem · tanggal 1–{throughDay}</h2>
        <div className="overflow-auto">
          <table className="w-full border-collapse font-mono text-xs">
            <thead className="sticky top-0 bg-slate-900/95 text-slate-300">
              <tr className="h-9">
                <th scope="col" className="px-4 text-left font-semibold">Sistem</th>
                <th scope="col" className="px-3 text-right font-semibold text-violet-300">{previous.label}</th>
                <th scope="col" className="px-3 text-right font-semibold text-sky-300">{current.label}</th>
                <th scope="col" className="px-4 text-right font-semibold">Selisih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {projects.map((row) => (
                <tr key={row.project} className="h-10 hover:bg-slate-800/40">
                  <th scope="row" className="px-4 text-left font-sans font-semibold text-slate-200">
                    <span className="inline-flex items-center gap-2"><i className="inline-block size-2.5 rounded-sm" style={{ background: color(row.project) }} />{label(row.project)}</span>
                  </th>
                  <td className="px-3 text-right tabular-nums text-slate-300">{nf(row.prev)}</td>
                  <td className="px-3 text-right tabular-nums font-bold text-slate-100">{nf(row.curr)}</td>
                  <td className={`px-4 text-right tabular-nums ${row.delta > 0 ? "text-sky-300" : row.delta < 0 ? "text-violet-300" : "text-slate-400"}`}>{row.delta > 0 ? `+${row.delta}` : row.delta} · {formatDeltaPct(row.curr, row.prev)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="sticky bottom-0 border-t-2 border-slate-700 bg-slate-900/95 font-bold text-slate-100">
              <tr className="h-10">
                <th scope="row" className="px-4 text-left font-sans">Total</th>
                <td className="px-3 text-right tabular-nums">{nf(previous.total)}</td>
                <td className="px-3 text-right tabular-nums">{nf(current.total)}</td>
                <td className="px-4 text-right tabular-nums">{formatDeltaPct(current.total, previous.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
      <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/40">
        <h2 className="m-0 border-b border-slate-700/60 px-4 py-2.5 text-[12px] font-bold text-slate-200">Per tanggal</h2>
        <div className="max-h-[calc(100vh-260px)] overflow-auto">
          <table className="w-full border-collapse font-mono text-xs">
            <thead className="sticky top-0 bg-slate-900/95 text-slate-300">
              <tr className="h-9">
                <th scope="col" className="px-4 text-left font-semibold">Tanggal</th>
                <th scope="col" className="px-3 text-right font-semibold text-violet-300">{prevShort}</th>
                <th scope="col" className="px-3 text-right font-semibold text-violet-300/80">Σ {prevShort}</th>
                <th scope="col" className="px-3 text-right font-semibold text-sky-300">{currShort}</th>
                <th scope="col" className="px-4 text-right font-semibold text-sky-300/80">Σ {currShort}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {days.map((day) => (
                <tr key={day.day} className={`h-9 ${day.day === throughDay ? "bg-sky-400/[0.06]" : "hover:bg-slate-800/40"}`}>
                  <th scope="row" className="px-4 text-left font-semibold text-slate-200">{day.day}{day.day === throughDay ? " · hari ini" : ""}</th>
                  <td className="px-3 text-right tabular-nums text-slate-300">{day.prev ?? "—"}</td>
                  <td className="px-3 text-right tabular-nums text-slate-400">{day.prevCum ?? "—"}</td>
                  <td className="px-3 text-right tabular-nums text-slate-100">{day.curr ?? "—"}</td>
                  <td className="px-4 text-right tabular-nums text-slate-300">{day.currCum ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
