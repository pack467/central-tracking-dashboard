"use client";

import { Sparkline } from "@/app/components/ui/Sparkline";
import { Badge } from "@/app/components/ui/Badge";
import type { Ticket } from "@/app/lib/types";

interface MetricCardsProps {
  tickets: Ticket[];
  onGoToTickets: () => void;
  attentionCount: number;
}

export function MetricCards({ tickets, onGoToTickets, attentionCount }: MetricCardsProps) {
  const open = tickets.filter((ticket) => ticket.status === "Aktivitas" || ticket.status === "Activity" || ticket.status === "Open").length;
  const closedToday = tickets.filter((ticket) => ticket.status === "Ditutup" || ticket.status === "Closed").length;

  return (
    <section className="metrics-grid" aria-label="Metrik operasional">
      <article className="metric-card">
        <div className="metric-top">
          <span>CHECKPOINT SUCCESS RATE</span>
          <Badge tone="success">+2,1% vs kemarin</Badge>
        </div>
        <div className="metric-number">
          94<span>%</span>
        </div>
        <p>128 dari 136 pemeriksaan monitoring terjadwal selesai dengan baik.</p>
        <div className="progress-line">
          <i style={{ width: "94%" }} />
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
          <Badge tone={attentionCount > 0 ? "warning" : "success"}>
            {attentionCount > 0 ? "Action Required" : "Nominal"}
          </Badge>
        </div>
        <div className="metric-number">{attentionCount}</div>
        <p>{attentionCount} anomali atau tugas ad-hoc yang memerlukan tindak lanjut.</p>
        <div className="metric-foot">
          <span className={`status-dot ${attentionCount > 0 ? "warning" : "success"}`} />
          <span>2 anomali monitoring</span>
        </div>
        <Sparkline color="#fbbf24" points="0,20 20,12 40,28 60,15 80,22 100,10 120,18 140,12 160,8" />
      </article>

      <article className="metric-card">
        <div className="metric-top">
          <span>NEXT CHECKPOINT</span>
        </div>
        <div className="metric-time">
          23:00 <small>WIB</small>
        </div>
        <p>Tinjauan kesiapan shift malam dan handover log final terjadwal.</p>
        <div className="metric-foot">
          <span className="status-dot success" />
          <span>Tinjauan kesiapan shift malam</span>
        </div>
        <Sparkline color="#a78bfa" points="0,10 20,15 40,12 60,22 80,18 100,25 120,20 140,28 160,30" />
      </article>
    </section>
  );
}
