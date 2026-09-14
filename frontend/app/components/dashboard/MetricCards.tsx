"use client";

import { Sparkline } from "@/app/components/ui/Sparkline";
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
  nextCheckpointTime?: string;
  nextCheckpointDesc?: string;
}

export function MetricCards({
  tickets,
  onGoToTickets,
  onGoToNotifications,
  attentionCount,
  checkpointPassed = 128,
  checkpointTotal = 136,
  nextCheckpointTime = "23:00",
  nextCheckpointDesc = "Tinjauan kesiapan shift malam dan handover log final terjadwal.",
}: MetricCardsProps) {
  const open = tickets.filter(isOpenTicket).length;
  const closedToday = tickets.filter((ticket) => ticket.status === "Ditutup" || ticket.status === "Closed").length;
  const successRate = checkpointTotal > 0 ? Math.round((checkpointPassed / checkpointTotal) * 100) : 100;

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
        <Sparkline color="#22d3a0" points="0,28 20,22 40,25 60,18 80,20 100,12 120,15 140,8 160,5" />
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
        <Sparkline color="#38bdf8" points="0,15 20,25 40,10 60,20 80,12 100,18 120,8 140,14 160,10" />
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
        <Sparkline color="#fbbf24" points="0,20 20,12 40,28 60,15 80,22 100,10 120,18 140,12 160,8" />
      </article>

      <article className="metric-card">
        <div className="metric-top">
          <span>NEXT CHECKPOINT</span>
        </div>
        <div className="metric-time">
          <span className="metric-time-digits">{nextCheckpointTime}</span>
          <span className="timezone-pill-badge">WIB</span>
        </div>
        <p>{nextCheckpointDesc}</p>
        <div className="metric-foot">
          <span className="status-dot success" />
          <span>{nextCheckpointDesc.slice(0, 40)}...</span>
        </div>
        <Sparkline color="#a78bfa" points="0,10 20,15 40,12 60,22 80,18 100,25 120,20 140,28 160,30" />
      </article>
    </section>
  );
}

