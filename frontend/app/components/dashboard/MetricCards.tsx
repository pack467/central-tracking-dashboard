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
    <section className="metrics-grid [display:grid] [grid-template-columns:1.2fr_1fr_1fr_1fr] [gap:16px] [margin-bottom:20px]" aria-label="Metrik operasional">
      <article className="metric-card [position:relative] [padding:18px_20px] [background:var(--panel-bg)] [border:1px_solid_var(--panel-border)] [border-radius:10px] [box-shadow:var(--shadow-panel)] [transition:all_0.15s_ease]">
        <div className="metric-top [display:flex] [justify-content:space-between] [align-items:center] [gap:8px] [color:var(--ink-muted)] [font-size:10px] [font-weight:700] [letter-spacing:0.7px] [font-family:var(--font-mono)] [text-transform:uppercase]">
          <span>CHECKPOINT SUCCESS RATE</span>
          <Badge tone={successRate >= 90 ? "success" : "warning"}>{successRate}% Compliant</Badge>
        </div>
        <div className="metric-number [margin-top:10px] [color:var(--ink-primary)] [font-size:32px] [font-weight:700] [letter-spacing:-1px] [line-height:1]">
          {successRate}<span className="[margin-left:2px] [color:var(--ink-muted)] [font-size:16px] [font-weight:600]">%</span>
        </div>
        <p className="[margin:8px_0_10px] [color:var(--ink-secondary)] [font-size:11.5px] [line-height:1.4]">{checkpointPassed} dari {checkpointTotal} pemeriksaan monitoring terjadwal selesai dengan baik.</p>
        <div className="progress-line [height:5px] [overflow:hidden] [border-radius:99px] [background:var(--line)]">
          <i className="[display:block] [height:100%] [border-radius:inherit] [background:var(--green)]" style={{ width: `${Math.min(100, Math.max(0, successRate))}%` }} />
        </div>
      </article>

      <article className="metric-card [position:relative] [padding:18px_20px] [background:var(--panel-bg)] [border:1px_solid_var(--panel-border)] [border-radius:10px] [box-shadow:var(--shadow-panel)] [transition:all_0.15s_ease]">
        <div className="metric-top [display:flex] [justify-content:space-between] [align-items:center] [gap:8px] [color:var(--ink-muted)] [font-size:10px] [font-weight:700] [letter-spacing:0.7px] [font-family:var(--font-mono)] [text-transform:uppercase]">
          <span>OPEN TICKETS</span>
          <button className="[padding:0] [color:var(--accent-blue)] [background:none]! [font-size:11px]! [font-weight:600]" onClick={onGoToTickets}>Lihat queue →</button>
        </div>
        <div className="metric-number [margin-top:10px] [color:var(--ink-primary)] [font-size:32px] [font-weight:700] [letter-spacing:-1px] [line-height:1]">{open}</div>
        <p className="[margin:8px_0_10px] [color:var(--ink-secondary)] [font-size:11.5px] [line-height:1.4]">
          {open} ticket dalam tahap penanganan aktif, {closedToday} ticket selesai hari ini.
        </p>
        <div className="metric-foot [display:flex] [align-items:center] [gap:7px] [margin-top:14px] [color:var(--ink-secondary)] [font-size:11px]">
          <Badge tone={open > 0 ? "warning" : "success"}>{open} Active</Badge>
          <span className="[white-space:nowrap] [overflow:hidden] [text-overflow:ellipsis]">{closedToday} Closed today</span>
        </div>
      </article>

      <article className="metric-card [position:relative] [padding:18px_20px] [background:var(--panel-bg)] [border:1px_solid_var(--panel-border)] [border-radius:10px] [box-shadow:var(--shadow-panel)] [transition:all_0.15s_ease]">
        <div className="metric-top [display:flex] [justify-content:space-between] [align-items:center] [gap:8px] [color:var(--ink-muted)] [font-size:10px] [font-weight:700] [letter-spacing:0.7px] [font-family:var(--font-mono)] [text-transform:uppercase]">
          <span>NEEDS ATTENTION</span>
          {onGoToNotifications && (
            <button className="[padding:0] [color:var(--accent-blue)] [background:none]! [font-size:11px]! [font-weight:600]" onClick={onGoToNotifications}>Lihat notifikasi →</button>
          )}
        </div>
        <div className="metric-number [margin-top:10px] [color:var(--ink-primary)] [font-size:32px] [font-weight:700] [letter-spacing:-1px] [line-height:1]">{attentionCount}</div>
        <p className="[margin:8px_0_10px] [color:var(--ink-secondary)] [font-size:11.5px] [line-height:1.4]">{attentionCount} anomali atau tugas ad-hoc yang memerlukan tindak lanjut.</p>
        <div className="metric-foot [display:flex] [align-items:center] [gap:7px] [margin-top:14px] [color:var(--ink-secondary)] [font-size:11px]">
          <Badge tone={attentionCount > 0 ? "warning" : "success"}>
            {attentionCount > 0 ? "Action Required" : "Nominal"}
          </Badge>
          <span className="[white-space:nowrap] [overflow:hidden] [text-overflow:ellipsis]">{attentionCount} anomali monitoring</span>
        </div>
      </article>

      <article className="metric-card [position:relative] [padding:18px_20px] [background:var(--panel-bg)] [border:1px_solid_var(--panel-border)] [border-radius:10px] [box-shadow:var(--shadow-panel)] [transition:all_0.15s_ease]">
        <div className="metric-top [display:flex] [justify-content:space-between] [align-items:center] [gap:8px] [color:var(--ink-muted)] [font-size:10px] [font-weight:700] [letter-spacing:0.7px] [font-family:var(--font-mono)] [text-transform:uppercase]">
          <span>TUGAS SAAT INI</span>
          {onGoToTasks && (
            <button className="[padding:0] [color:var(--accent-blue)] [background:none]! [font-size:11px]! [font-weight:600]" onClick={onGoToTasks}>Lihat tugas →</button>
          )}
        </div>
        <div className="metric-number [margin-top:10px] [color:var(--ink-primary)] [font-size:32px] [font-weight:700] [letter-spacing:-1px] [line-height:1]">
          {pendingCount}
          {totalCount > 0 && (
            <span className="[margin-left:5px] [color:var(--ink-muted)] [font-size:15px] [font-weight:500]">
              / {totalCount}
            </span>
          )}
        </div>
        <p className="[margin:8px_0_10px] [color:var(--ink-secondary)] [font-size:11.5px] [line-height:1.4]">
          {pendingCount > 0
            ? `${pendingCount} tugas operasional shift saat ini perlu dikerjakan & diselesaikan.`
            : `Seluruh ${totalCount > 0 ? `${totalCount} ` : ""}tugas operasional shift saat ini telah selesai dikerjakan.`}
        </p>
        <div className="metric-foot [display:flex] [align-items:center] [gap:7px] [margin-top:14px] [color:var(--ink-secondary)] [font-size:11px]">
          <Badge tone={pendingCount > 0 ? "warning" : "success"}>
            {pendingCount > 0 ? `${pendingCount} Perlu Dikerjakan` : "Semua Selesai"}
          </Badge>
          <span
            className="[white-space:nowrap] [overflow:hidden] [text-overflow:ellipsis]"
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
