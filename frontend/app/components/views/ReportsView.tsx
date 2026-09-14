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
      <section className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="live-dot live-dot-pulse" /> ANALITIK OPERASIONAL · {activeClient.code}
          </div>
          <h1>Laporan — {activeClient.name}</h1>
          <p>Rekap kesehatan sistem mingguan, asesmen checkpoint, dan ringkasan tiket untuk klien {activeClient.name}.</p>
        </div>
        <div className="page-actions">
          <button className="button button-secondary" onClick={printReport}>
            Cetak / PDF
          </button>
          <button className="button button-primary" onClick={exportCsv}>
            <span>↓</span> Ekspor CSV
          </button>
        </div>
      </section>

      <section className="ticket-stats">
        <article className="stat-chip stat-success">
          <strong>{overallAverage}%</strong>
          <span>Kesehatan mingguan</span>
        </article>
        <article className="stat-chip stat-success">
          <strong>{adequateCount}</strong>
          <span>Checkpoint OK</span>
        </article>
        <article className="stat-chip stat-critical">
          <strong>{notAdequateCount}</strong>
          <span>Checkpoint NOK</span>
        </article>
        <article className="stat-chip stat-warning">
          <strong>{tickets.filter(isOpenTicket).length}</strong>
          <span>Open Tickets</span>
        </article>
        <article className="stat-chip">
          <strong>{handoverCount}</strong>
          <span>Catatan handover</span>
        </article>
      </section>

      <article className="panel view-panel">
        <div className="panel-heading">
          <div className="panel-title">Kesehatan sistem per proyek · 7 hari terakhir</div>
        </div>
        <div className="report-bars">
          {weekly.map((row) => (
            <div className="report-row" key={row.project}>
              <span className="report-project">{row.project}</span>
              <div className="report-bar-track">
                <i
                  className={row.average >= 97 ? "" : row.average >= 93 ? "warn" : "crit"}
                  style={{ width: `${row.average}%` }}
                />
                <em>{row.average}%</em>
              </div>
              <span className="report-days">
                {row.days.join(" · ")}
              </span>
            </div>
          ))}
        </div>
      </article>

      <article className="panel view-panel">
        <div className="panel-heading">
          <div className="panel-title">Ringkasan naratif</div>
        </div>
        <div className="report-narrative">
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
