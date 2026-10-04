"use client";

import { useMemo } from "react";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { useToast } from "@/app/components/ui/Toast";
import { isOpenTicket, projectHealthWeekly } from "@/app/lib/data";
import type { CheckpointAssessment, Ticket } from "@/app/lib/types";
import { useClient } from "@/app/context/ClientContext";
import { getClientSystems } from "@/app/lib/clientData";

interface ReportsViewProps {
  tickets: Ticket[];
  assessments: Record<string, CheckpointAssessment>;
  handoverCount: number;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function ReportsView({ tickets, assessments, handoverCount }: ReportsViewProps) {
  const { activeClient, activeClientId } = useClient();
  const clientSystems = useMemo(() => getClientSystems(activeClientId), [activeClientId]);
  const notify = useToast();

  const weekly = useMemo(() => {
    if (activeClientId === "tritronik") {
      return projectHealthWeekly.map((row) => ({
        project: row.project,
        days: row.days,
        average: average(row.days),
      }));
    }
    const sampleDays = [
      [99, 100, 99, 98, 100, 100, 99],
      [100, 99, 100, 100, 99, 100, 100],
      [98, 97, 99, 99, 98, 99, 98],
      [100, 100, 100, 99, 100, 100, 100],
      [99, 99, 98, 100, 99, 100, 99],
      [100, 99, 100, 99, 99, 100, 100],
      [99, 98, 99, 99, 100, 99, 99],
    ];
    return clientSystems.map((sys, idx) => {
      const days = sampleDays[idx % sampleDays.length];
      return {
        project: sys,
        days,
        average: average(days),
      };
    });
  }, [activeClientId, clientSystems]);

  const overallAverage = useMemo(
    () => Math.round(weekly.reduce((sum, row) => sum + row.average, 0) / (weekly.length || 1)),
    [weekly],
  );

  const adequateCount = Object.values(assessments).filter(
    (item) => item.verdict === "ok" || item.verdict === "adequate",
  ).length;
  const notAdequateCount = Object.values(assessments).length - adequateCount;

  const exportCsv = () => {
    const rows = [
      ["Proyek", "Rata-rata Kesehatan (%)", ...weekly[0].days.map((_, index) => `Hari ${index + 1}`)],
      ...weekly.map((row) => [row.project, String(row.average), ...row.days.map(String)]),
    ];
    const csv = rows.map((row) => row.join(";")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `laporan-operasional-${activeClient.code.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify.success(`Laporan operasional ${activeClient.shortName} diekspor sebagai file CSV.`, { id: "report-export-csv" });
  };

  const printReport = () => {
    notify.info(`Dialog cetak laporan ${activeClient.shortName} dibuka — simpan sebagai PDF bila diperlukan.`, { id: "report-print-pdf" });
    window.setTimeout(() => window.print(), 250);
  };

  return (
    <>
      <section className="page-heading flex justify-between items-end mb-[22px] max-[660px]:flex-col max-[660px]:items-start max-[660px]:gap-[12px] max-[640px]:mb-0">
        <div>
          <div className="eyebrow flex items-center gap-[8px] text-[var(--ink-muted)] text-[10px] tracking-[1px] font-bold font-mono uppercase">
            <span className="live-dot live-dot-pulse" /> REPORTS · {activeClient.code}
          </div>
          <h1 className="m-[6px_0_4px] text-[var(--ink-primary)] text-[24px] leading-[1.2] tracking-[-0.4px] font-bold">Reports</h1>
        </div>
        <div className="page-actions flex gap-[9px]">
          <button className="button button-secondary" onClick={printReport}>
            Cetak / PDF
          </button>
          <button className="button button-primary" onClick={exportCsv}>
            <span>↓</span> Ekspor CSV
          </button>
        </div>
      </section>

      <section className="grid grid-cols-[repeat(auto-fit,_minmax(130px,_1fr))] gap-[10px] mb-[20px] max-[600px]:grid-cols-2">
        <article className="p-[12px_14px] border border-[var(--green-border)] rounded-[10px] bg-[var(--panel-bg)] shadow-[var(--shadow-panel)]">
          <strong className="block text-[var(--green)] font-mono text-[22px] font-bold leading-[1.1]">{overallAverage}%</strong>
          <span className="block mt-[2px] text-[var(--ink-muted)] text-[10px] font-bold tracking-[0.6px] uppercase">Kesehatan mingguan</span>
        </article>
        <article className="p-[12px_14px] border border-[var(--green-border)] rounded-[10px] bg-[var(--panel-bg)] shadow-[var(--shadow-panel)]">
          <strong className="block text-[var(--green)] font-mono text-[22px] font-bold leading-[1.1]">{adequateCount}</strong>
          <span className="block mt-[2px] text-[var(--ink-muted)] text-[10px] font-bold tracking-[0.6px] uppercase">Checkpoint OK</span>
        </article>
        <article className="p-[12px_14px] border border-[var(--red-border)] rounded-[10px] bg-[var(--panel-bg)] shadow-[var(--shadow-panel)]">
          <strong className="block text-[var(--red)] font-mono text-[22px] font-bold leading-[1.1]">{notAdequateCount}</strong>
          <span className="block mt-[2px] text-[var(--ink-muted)] text-[10px] font-bold tracking-[0.6px] uppercase">Checkpoint NOK</span>
        </article>
        <article className="p-[12px_14px] border border-[var(--orange-border)] rounded-[10px] bg-[var(--panel-bg)] shadow-[var(--shadow-panel)]">
          <strong className="block text-[var(--orange)] font-mono text-[22px] font-bold leading-[1.1]">{tickets.filter(isOpenTicket).length}</strong>
          <span className="block mt-[2px] text-[var(--ink-muted)] text-[10px] font-bold tracking-[0.6px] uppercase">Open Tickets</span>
        </article>
        <article className="p-[12px_14px] border border-[var(--panel-border)] rounded-[10px] bg-[var(--panel-bg)] shadow-[var(--shadow-panel)]">
          <strong className="block text-[var(--ink-primary)] font-mono text-[22px] font-bold leading-[1.1]">{handoverCount}</strong>
          <span className="block mt-[2px] text-[var(--ink-muted)] text-[10px] font-bold tracking-[0.6px] uppercase">Catatan handover</span>
        </article>
      </section>

      <article className="panel view-panel mb-[20px] overflow-hidden bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-[10px] shadow-[var(--shadow-panel)]">
        <div className="panel-heading flex justify-between items-start gap-[16px] p-[16px_20px_14px] border-b border-[var(--line)]">
          <div className="panel-title flex items-center gap-[8px] text-[var(--ink-primary)] text-[14px] font-bold">Kesehatan sistem per proyek · 7 hari terakhir</div>
        </div>
        <div className="grid gap-[12px] p-[16px_20px_20px]">
          {weekly.map((row) => (
            <div className="grid grid-cols-[84px_minmax(160px,_1fr)_minmax(0,_1fr)] items-center gap-[14px] max-[640px]:grid-cols-[70px_1fr] max-[640px]:gap-[10px]" key={row.project}>
              <span className="text-[var(--ink-primary)] text-[12px] font-bold truncate">{row.project}</span>
              <div className="relative h-[14px] rounded-[99px] bg-[var(--bg)] border border-[var(--line)] overflow-hidden">
                <i
                  className={`absolute inset-y-0 left-0 rounded-[inherit] transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    row.average >= 97 ? "bg-[var(--green)]" : row.average >= 93 ? "bg-[var(--orange)]" : "bg-[var(--red)]"
                  }`}
                  style={{ width: `${row.average}%` }}
                />
                <em className="absolute right-[6px] top-1/2 -translate-y-1/2 text-[var(--ink-secondary)] font-mono text-[9px] not-italic font-bold select-none">{row.average}%</em>
              </div>
              <span className="overflow-hidden text-[var(--ink-muted)] font-mono text-[10px] text-ellipsis whitespace-nowrap max-[640px]:hidden">
                {row.days.join(" · ")}
              </span>
            </div>
          ))}
        </div>
      </article>

      <article className="panel view-panel mb-[20px] overflow-hidden bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-[10px] shadow-[var(--shadow-panel)]">
        <div className="panel-heading flex justify-between items-start gap-[16px] p-[16px_20px_14px] border-b border-[var(--line)]">
          <div className="panel-title flex items-center gap-[8px] text-[var(--ink-primary)] text-[14px] font-bold">Ringkasan naratif</div>
        </div>
        <div className="p-[20px] text-[var(--ink-secondary)] text-[13px] leading-[1.6] flex flex-col gap-[12px] [&_strong]:text-[var(--ink-primary)]">
          <p>
            Selama tujuh hari terakhir rata-rata kesehatan seluruh proyek berada pada{" "}
            <strong>{overallAverage}%</strong>.
            {weekly.length > 0 && (
              <>
                {" "}Proyek dengan performa tertinggi adalah{" "}
                <strong>{[...weekly].sort((a, b) => b.average - a.average)[0].project}</strong>, sementara{" "}
                <strong>{[...weekly].sort((a, b) => a.average - b.average)[0].project}</strong> memerlukan perhatian
                lebih pada checkpoint berikutnya.
              </>
            )}
          </p>
          <p>
            Dari {Object.keys(assessments).length} checkpoint yang dinilai hari ini, {adequateCount} dinyatakan
            memadai{notAdequateCount ? ` dan ${notAdequateCount} tidak memadai dengan catatan tindak lanjut.` : "."}{" "}
            Terdapat {tickets.length} ticket tercatat ({tickets.filter(isOpenTicket).length} aktif)
            serta {handoverCount} catatan handover tersimpan di database.
          </p>
        </div>
        {Object.keys(assessments).length === 0 && tickets.length === 0 && (
          <EmptyState
            icon="▦"
            title="Data laporan masih kosong"
            message="Lakukan asesmen checkpoint dan buat ticket terlebih dahulu agar laporan memiliki data."
          />
        )}
      </article>
    </>
  );
}
