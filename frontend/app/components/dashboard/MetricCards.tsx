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
    <section className="metrics-grid grid grid-cols-[1.2fr_1fr_1fr_1fr] gap-[16px] mb-[20px] max-[1240px]:grid-cols-2" aria-label="Metrik operasional">
      <article className="metric-card relative p-[18px_20px] bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-[10px] shadow-[var(--shadow-panel)] transition-all duration-150 hover:border-[var(--accent-blue-border)]">
        <div className="metric-top flex justify-between items-center gap-[8px] text-[var(--ink-muted)] text-[10px] font-bold tracking-[0.7px] font-mono uppercase">
          <span>CHECKPOINT SUCCESS RATE</span>
          <Badge tone={successRate >= 90 ? "success" : "warning"}>{successRate}% Compliant</Badge>
        </div>
        <div className="metric-number mt-[10px] text-[var(--ink-primary)] text-[32px] font-bold tracking-[-1px] leading-none">
          {successRate}<span className="ml-[2px] text-[var(--ink-muted)] text-[16px] font-semibold">%</span>
        </div>
        <p className="my-[8px_10px] text-[var(--ink-secondary)] text-[11.5px] leading-[1.4]">{checkpointPassed} dari {checkpointTotal} pemeriksaan monitoring terjadwal selesai dengan baik.</p>
        <div className="progress-line h-[5px] overflow-hidden rounded-full bg-[var(--line)]">
          <i className="block h-full rounded-[inherit] bg-[var(--green)]" style={{ width: `${Math.min(100, Math.max(0, successRate))}%` }} />
        </div>
      </article>

      <article className="metric-card relative p-[18px_20px] bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-[10px] shadow-[var(--shadow-panel)] transition-all duration-150 hover:border-[var(--accent-blue-border)]">
        <div className="metric-top flex justify-between items-center gap-[8px] text-[var(--ink-muted)] text-[10px] font-bold tracking-[0.7px] font-mono uppercase">
          <span>OPEN TICKETS</span>
          <button className="p-0 text-[var(--accent-blue)] bg-transparent text-[11px] font-semibold hover:underline" onClick={onGoToTickets}>Lihat queue →</button>
        </div>
        <div className="metric-number mt-[10px] text-[var(--ink-primary)] text-[32px] font-bold tracking-[-1px] leading-none">{open}</div>
        <p className="my-[8px_10px] text-[var(--ink-secondary)] text-[11.5px] leading-[1.4]">
          {open} ticket dalam tahap penanganan aktif, {closedToday} ticket selesai hari ini.
        </p>
        <div className="metric-foot flex items-center gap-[7px] mt-[14px] text-[var(--ink-secondary)] text-[11px]">
          <Badge tone={open > 0 ? "warning" : "success"}>{open} Active</Badge>
          <span className="whitespace-nowrap overflow-hidden text-ellipsis">{closedToday} Closed today</span>
        </div>
      </article>

      <article className="metric-card relative p-[18px_20px] bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-[10px] shadow-[var(--shadow-panel)] transition-all duration-150 hover:border-[var(--accent-blue-border)]">
        <div className="metric-top flex justify-between items-center gap-[8px] text-[var(--ink-muted)] text-[10px] font-bold tracking-[0.7px] font-mono uppercase">
          <span>NEEDS ATTENTION</span>
          {onGoToNotifications && (
            <button className="p-0 text-[var(--accent-blue)] bg-transparent text-[11px] font-semibold hover:underline" onClick={onGoToNotifications}>Lihat notifikasi →</button>
          )}
        </div>
        <div className="metric-number mt-[10px] text-[var(--ink-primary)] text-[32px] font-bold tracking-[-1px] leading-none">{attentionCount}</div>
        <p className="my-[8px_10px] text-[var(--ink-secondary)] text-[11.5px] leading-[1.4]">{attentionCount} anomali atau tugas ad-hoc yang memerlukan tindak lanjut.</p>
        <div className="metric-foot flex items-center gap-[7px] mt-[14px] text-[var(--ink-secondary)] text-[11px]">
          <Badge tone={attentionCount > 0 ? "warning" : "success"}>
            {attentionCount > 0 ? "Action Required" : "Nominal"}
          </Badge>
          <span className="whitespace-nowrap overflow-hidden text-ellipsis">{attentionCount} anomali monitoring</span>
        </div>
      </article>

      <article className="metric-card relative p-[18px_20px] bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-[10px] shadow-[var(--shadow-panel)] transition-all duration-150 hover:border-[var(--accent-blue-border)]">
        <div className="metric-top flex justify-between items-center gap-[8px] text-[var(--ink-muted)] text-[10px] font-bold tracking-[0.7px] font-mono uppercase">
          <span>TUGAS SAAT INI</span>
          {onGoToTasks && (
            <button className="p-0 text-[var(--accent-blue)] bg-transparent text-[11px] font-semibold hover:underline" onClick={onGoToTasks}>Lihat tugas →</button>
          )}
        </div>
        <div className="metric-number mt-[10px] text-[var(--ink-primary)] text-[32px] font-bold tracking-[-1px] leading-none">
          {pendingCount}
          {totalCount > 0 && (
            <span className="ml-[5px] text-[var(--ink-muted)] text-[15px] font-medium">
              / {totalCount}
            </span>
          )}
        </div>
        <p className="my-[8px_10px] text-[var(--ink-secondary)] text-[11.5px] leading-[1.4]">
          {pendingCount > 0
            ? `${pendingCount} tugas operasional shift saat ini perlu dikerjakan & diselesaikan.`
            : `Seluruh ${totalCount > 0 ? `${totalCount} ` : ""}tugas operasional shift saat ini telah selesai dikerjakan.`}
        </p>
        <div className="metric-foot flex items-center gap-[7px] mt-[14px] text-[var(--ink-secondary)] text-[11px]">
          <Badge tone={pendingCount > 0 ? "warning" : "success"}>
            {pendingCount > 0 ? `${pendingCount} Perlu Dikerjakan` : "Semua Selesai"}
          </Badge>
          <span
            className="whitespace-nowrap overflow-hidden text-ellipsis"
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
