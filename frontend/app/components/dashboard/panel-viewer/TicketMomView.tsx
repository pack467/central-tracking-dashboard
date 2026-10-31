"use client";

import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
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

/**
 * How this month stands against last month, as a small tag: the arrow and the number of tickets, then the percentage. More tickets than last
 * month is amber, fewer is green, no change is grey. The colour says "more work" or "less work", not good or bad.
 */
function Change({ curr, prev }: { curr: number; prev: number }) {
  const delta = curr - prev;
  const tone = delta > 0 ? "bg-amber-400/10 text-amber-300" : delta < 0 ? "bg-emerald-400/10 text-emerald-300" : "bg-slate-700/40 text-slate-400";
  const Icon = delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Minus;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-[12px] font-semibold tabular-nums ${tone}`} title={delta > 0 ? `${delta} tiket lebih banyak dari bulan lalu` : delta < 0 ? `${-delta} tiket lebih sedikit dari bulan lalu` : "Sama dengan bulan lalu"}>
      <Icon size={12} aria-hidden="true" />{Math.abs(delta)}<span className="font-normal">{formatDeltaPct(curr, prev)}</span>
    </span>
  );
}

function SummaryCard({ label, value, hint, tone, ring }: { label: string; value: ReactNode; hint?: string; tone: string; ring: string }) {
  return (
    <div className={`flex min-w-0 flex-col justify-center gap-1 rounded-xl border px-4 py-3 ${ring}`}>
      <span className="truncate text-[12px] text-slate-400">{label}</span>
      <strong className={`font-mono text-[24px] font-bold leading-none tabular-nums ${tone}`}>{value}</strong>
      {hint && <span className="truncate text-[11.5px] text-slate-500">{hint}</span>}
    </div>
  );
}

// alignment is chosen per cell (never two text-align classes on one cell: the stylesheet order, not the class order, decides which wins)
const TH = "bg-[#0f172a] px-3 py-2.5 text-[12px] font-semibold";
const R = `${TH} text-right`, L = `${TH} text-left`, C = `${TH} text-center`;
// under 980px the two tables stack and the page scrolls (nothing is squeezed into a short box); above it each table scrolls inside its own panel
const SECTION = "flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-700/60 bg-[#0f172a] max-[980px]:flex-none";
const SCROLL = "min-h-0 flex-1 overflow-auto [scrollbar-width:thin] max-[980px]:max-h-[70vh] max-[980px]:flex-none";

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
  const delta = current.total - previous.total;
  const peak = Math.max(1, ...projects.map((row) => Math.max(row.prev, row.curr)));
  const deltaTone = delta > 0 ? "text-amber-300" : delta < 0 ? "text-emerald-300" : "text-slate-300";
  const deltaRing = delta > 0 ? "border-amber-400/25 bg-amber-400/[0.06]" : delta < 0 ? "border-emerald-400/25 bg-emerald-400/[0.06]" : "border-slate-500/30 bg-slate-400/[0.06]";
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 max-[980px]:flex-none">
      {/* the answer first: this month against last month, over the same days */}
      <div className="grid shrink-0 grid-cols-2 gap-2.5 min-[900px]:grid-cols-4">
        <SummaryCard label={previous.label} value={nf(previous.total)} hint={`Tanggal 1–${throughDay}`} tone="text-violet-300" ring="border-violet-400/25 bg-violet-400/[0.06]" />
        <SummaryCard label={current.label} value={nf(current.total)} hint={`Tanggal 1–${throughDay}`} tone="text-sky-300" ring="border-sky-400/30 bg-sky-400/[0.07]" />
        <SummaryCard label="Selisih tiket" value={`${delta > 0 ? "+" : delta < 0 ? "−" : ""}${nf(Math.abs(delta))}`} hint={delta > 0 ? "Lebih banyak dari bulan lalu" : delta < 0 ? "Lebih sedikit dari bulan lalu" : "Sama dengan bulan lalu"} tone={deltaTone} ring={deltaRing} />
        <SummaryCard label="Perubahan" value={formatDeltaPct(current.total, previous.total)} hint="Dibanding bulan lalu" tone={deltaTone} ring="border-slate-500/30 bg-slate-400/[0.06]" />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 max-[980px]:flex-none max-[980px]:grid-cols-1">
        <section className={SECTION}>
          <header className="border-b border-slate-700/60 px-4 py-3">
            <h2 className="m-0 text-[14px] font-semibold text-slate-100">Per sistem</h2>
            <p className="m-0 mt-0.5 text-[12px] text-slate-400">Tiket yang dibuka pada tanggal 1–{throughDay} di kedua bulan. Panah ke atas berarti lebih banyak dari bulan lalu.</p>
          </header>
          <div className={SCROLL}>
            <table className="w-full min-w-[460px] border-collapse text-[13px]">
              <thead className="sticky top-0 z-10 shadow-[0_1px_0_#334155]">
                <tr>
                  <th scope="col" className={L}>Sistem</th>
                  <th scope="col" className={`${R} text-violet-300`}>{prevShort}</th>
                  <th scope="col" className={`${R} text-sky-300`}>{currShort}</th>
                  <th scope="col" className={`${L} hidden w-[120px] text-slate-400 sm:table-cell`}>Perbandingan</th>
                  <th scope="col" className={R}>Perubahan</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((row) => (
                  <tr key={row.project} className="h-[52px] border-b border-slate-800/80 hover:bg-[#18233a]">
                    <th scope="row" className="px-3 text-left font-semibold text-slate-100">
                      <span className="inline-flex items-center gap-2"><i className="inline-block size-2.5 shrink-0 rounded-sm" style={{ background: color(row.project) }} />{label(row.project)}</span>
                    </th>
                    <td className="px-3 text-right font-mono tabular-nums text-violet-200">{nf(row.prev)}</td>
                    <td className="px-3 text-right font-mono font-bold tabular-nums text-sky-200">{nf(row.curr)}</td>
                    <td className="hidden px-3 sm:table-cell" aria-hidden="true">
                      <span className="flex w-[104px] flex-col gap-1">
                        <span className="block h-1.5 overflow-hidden rounded-full bg-slate-800"><span className="block h-full rounded-full bg-violet-400" style={{ width: `${row.prev ? Math.max(4, (row.prev / peak) * 100) : 0}%` }} /></span>
                        <span className="block h-1.5 overflow-hidden rounded-full bg-slate-800"><span className="block h-full rounded-full bg-sky-400" style={{ width: `${row.curr ? Math.max(4, (row.curr / peak) * 100) : 0}%` }} /></span>
                      </span>
                    </td>
                    <td className="px-3 text-right"><Change curr={row.curr} prev={row.prev} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="sticky bottom-0 z-10 shadow-[0_-1px_0_#334155]">
                <tr className="h-[52px] font-bold">
                  <th scope="row" className="bg-[#0f172a] px-3 text-left text-slate-100">Total</th>
                  <td className="bg-[#0f172a] px-3 text-right font-mono tabular-nums text-violet-300">{nf(previous.total)}</td>
                  <td className="bg-[#0f172a] px-3 text-right font-mono tabular-nums text-sky-300">{nf(current.total)}</td>
                  <td className="hidden bg-[#0f172a] sm:table-cell" />
                  <td className="bg-[#0f172a] px-3 text-right"><Change curr={current.total} prev={previous.total} /></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <section className={SECTION}>
          <header className="border-b border-slate-700/60 px-4 py-3">
            <h2 className="m-0 text-[14px] font-semibold text-slate-100">Per tanggal</h2>
            <p className="m-0 mt-0.5 text-[12px] text-slate-400">Jumlah tiket tiap tanggal, dan jumlah berjalannya sejak tanggal 1. Hari ini ditandai biru.</p>
          </header>
          <div className={SCROLL}>
            <table className="w-full min-w-[480px] border-collapse text-[13px]">
              <thead className="sticky top-0 z-10 shadow-[0_1px_0_#334155]">
                <tr>
                  <th scope="col" rowSpan={2} className={`${L} align-bottom`}>Tgl</th>
                  <th scope="colgroup" colSpan={3} className={`${C} border-l border-slate-800 pb-1 text-slate-300`}>Harian</th>
                  <th scope="colgroup" colSpan={2} className={`${C} border-l border-slate-800 pb-1 text-slate-300`}>Kumulatif</th>
                </tr>
                <tr>
                  <th scope="col" className={`${R} border-l border-slate-800 pt-0 text-violet-300`}>{prevShort}</th>
                  <th scope="col" className={`${R} pt-0 text-sky-300`}>{currShort}</th>
                  <th scope="col" className={`${R} pt-0 text-slate-400`}>Selisih</th>
                  <th scope="col" className={`${R} border-l border-slate-800 pt-0 text-violet-300`}>{prevShort}</th>
                  <th scope="col" className={`${R} pt-0 text-sky-300`}>{currShort}</th>
                </tr>
              </thead>
              <tbody>
                {days.map((day) => {
                  const today = day.day === throughDay;
                  const diff = day.curr !== null && day.prev !== null ? day.curr - day.prev : null;
                  return (
                    <tr key={day.day} className={`h-10 border-b border-slate-800/80 ${today ? "bg-[#12263f]" : "hover:bg-[#18233a]"}`} aria-current={today ? "date" : undefined}>
                      <th scope="row" className="px-3 text-left font-semibold text-slate-100">
                        <span className="inline-flex items-center gap-2">{day.day}{today && <span className="rounded bg-sky-400/15 px-1.5 py-0.5 text-[10.5px] font-semibold text-sky-300">Hari ini</span>}</span>
                      </th>
                      <td className={`border-l border-slate-800 px-3 text-right font-mono tabular-nums ${day.prev ? "text-violet-200" : "text-slate-600"}`}>{day.prev ?? "—"}</td>
                      <td className={`px-3 text-right font-mono tabular-nums ${day.curr ? "font-bold text-sky-200" : "text-slate-600"}`}>{day.curr ?? "—"}</td>
                      <td className={`px-3 text-right font-mono tabular-nums ${diff === null || diff === 0 ? "text-slate-600" : diff > 0 ? "text-amber-300" : "text-emerald-300"}`}>{diff === null ? "—" : diff > 0 ? `+${diff}` : diff < 0 ? `−${-diff}` : "0"}</td>
                      <td className="border-l border-slate-800 px-3 text-right font-mono tabular-nums text-slate-400">{day.prevCum ?? "—"}</td>
                      <td className="px-3 text-right font-mono tabular-nums text-slate-200">{day.currCum ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
