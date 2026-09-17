"use client";

import { Badge } from "@/app/components/ui/Badge";
import { isOpenTicket } from "@/app/lib/data";
import type { Ticket } from "@/app/lib/types";

interface MetricCardsProps {
  tickets: Ticket[];
  onGoToTickets: () => void;
  onGoToNotifications?: () => void;
  attentionCount: number;
  checkpointPassed?: number;
  checkpointTotal?: number;
  pendingTasksCount?: number;
  totalTasksCount?: number;
  currentTaskTitle?: string;
  onGoToTasks?: () => void;
}

export function MetricCards({
  tickets,
  onGoToTickets,
  onGoToNotifications,
  attentionCount,
  checkpointPassed = 128,
  checkpointTotal = 136,
  pendingTasksCount = 0,
  totalTasksCount = 9,
  currentTaskTitle,
  onGoToTasks,
}: MetricCardsProps) {
  const open = tickets.filter(isOpenTicket).length;
  const closedToday = tickets.filter((ticket) => ticket.status === "Ditutup" || ticket.status === "Closed").length;
  const successRate = checkpointTotal > 0 ? Math.round((checkpointPassed / checkpointTotal) * 100) : 100;
  const pendingCount = pendingTasksCount ?? 0;
  const totalCount = totalTasksCount ?? 0;

  return (
    <section className="metrics-grid" aria-label="Metrik operasional">
      <article className="metric-card">
        <div className="metric-top">
          <span>CHECKPOINT SUCCESS RATE</span>
          <Badge tone={successRate >= 90 ? "success" : "warning"}>{successRate}% Compliant</Badge>
        </div>
        <div className="metric-number">
          {successRate}<span>%</span>
        </div>
        <p>{checkpointPassed} dari {checkpointTotal} pemeriksaan monitoring terjadwal selesai dengan baik.</p>
        <div className="progress-line">
          <i style={{ width: `${Math.min(100, Math.max(0, successRate))}%` }} />
        </div>
      </article>

      <article className="metric-card">
        <div className="metric-top">
          <span>OPEN TICKETS</span>
          <button onClick={onGoToTickets}>Lihat queue →</button>
        </div>
        <div className="metric-number">{open}</div>
        <p>
          {open} ticket dalam tahap penanganan aktif, {closedToday} ticket selesai hari ini.
        </p>
        <div className="metric-foot">
          <Badge tone={open > 0 ? "warning" : "success"}>{open} Active</Badge>
          <span>{closedToday} Closed today</span>
        </div>
      </article>

      <article className="metric-card">
        <div className="metric-top">
          <span>NEEDS ATTENTION</span>
          {onGoToNotifications && (
            <button onClick={onGoToNotifications}>Lihat notifikasi →</button>
          )}
        </div>
        <div className="metric-number">{attentionCount}</div>
        <p>{attentionCount} anomali atau tugas ad-hoc yang memerlukan tindak lanjut.</p>
        <div className="metric-foot">
          <Badge tone={attentionCount > 0 ? "warning" : "success"}>
            {attentionCount > 0 ? "Action Required" : "Nominal"}
          </Badge>
          <span>{attentionCount} anomali monitoring</span>
        </div>
      </article>

      <article className="metric-card">
        <div className="metric-top">
          <span>TUGAS SAAT INI</span>
          {onGoToTasks && (
            <button onClick={onGoToTasks}>Lihat tugas →</button>
          )}
        </div>
        <div className="metric-number">
          {pendingCount}
          {totalCount > 0 && (
            <span style={{ fontSize: "15px", color: "var(--ink-muted)", fontWeight: 500, marginLeft: "5px" }}>
              / {totalCount}
            </span>
          )}
        </div>
        <p>
          {pendingCount > 0
            ? `${pendingCount} tugas operasional shift saat ini perlu dikerjakan & diselesaikan.`
            : `Seluruh ${totalCount > 0 ? `${totalCount} ` : ""}tugas operasional shift saat ini telah selesai dikerjakan.`}
        </p>
        <div className="metric-foot">
          <Badge tone={pendingCount > 0 ? "warning" : "success"}>
            {pendingCount > 0 ? `${pendingCount} Perlu Dikerjakan` : "Semua Selesai"}
          </Badge>
          <span
            title={
              pendingCount > 0 && currentTaskTitle
                ? `Tugas: ${currentTaskTitle}`
                : pendingCount > 0
                ? `${pendingCount} tugas operasional aktif`
                : "Semua tugas shift tuntas & terpantau"
            }
          >
            {pendingCount > 0 && currentTaskTitle
              ? currentTaskTitle
              : pendingCount > 0
              ? `${pendingCount} tugas operasional aktif`
              : "Semua tugas shift tuntas & terpantau"}
          </span>
        </div>
      </article>
    </section>
  );
}

