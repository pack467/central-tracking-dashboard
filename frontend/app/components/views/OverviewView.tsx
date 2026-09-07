"use client";

import { AttentionPanel } from "@/app/components/dashboard/AttentionPanel";
import { HandoverQuickCard } from "@/app/components/dashboard/HandoverQuickCard";
import { HealthStrip } from "@/app/components/dashboard/HealthStrip";
import { MetricCards } from "@/app/components/dashboard/MetricCards";
import { MonitoringSchedule } from "@/app/components/dashboard/MonitoringSchedule";
import { ShiftCoverageCard } from "@/app/components/dashboard/ShiftCoverageCard";
import { TicketTable } from "@/app/components/tickets/TicketTable";
import type { CheckpointAssessment, HandoverRecordData, Ticket } from "@/app/lib/types";
import { attentionItems, monitoringSchedule } from "@/app/lib/data";
import { useActiveShift } from "@/app/hooks/useLiveClock";

interface OverviewViewProps {
  tickets: Ticket[];
  assessments: Record<string, CheckpointAssessment>;
  acknowledged: string[];
  onAcknowledge: (title: string) => void;
  onUnacknowledge?: (title: string) => void;
  currentHour: string;
  handoverRecord: HandoverRecordData;
  handoverPendingCount: number;
  handoverProgressPercent: number;
  handoverSavedLabel: string | null;
  onAssess: (key: string, verdict: "ok" | "nok" | "adequate" | "not-adequate" | null) => void;
  onRequestNote: (key: string) => void;
  onOpenGuide: () => void;
  onGoToTickets: () => void;
  onGoToMonitoring: () => void;
  onSelectTicket: (ticket: Ticket) => void;
  onNewTicket: () => void;
  onExportReport: () => void;
  onOpenHandover: () => void;
  onCreateHandover: () => void;
}

export function OverviewView(props: OverviewViewProps) {
  const activeShift = useActiveShift();
  const overviewEntries = monitoringSchedule.filter((entry) => entry.overview);
  const pendingTasks = props.handoverRecord.tasks.filter((task) => !task.completed);

  return (
    <>
      <section className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="live-dot live-dot-pulse" /> ALL SYSTEMS NOMINAL · {activeShift.name.toUpperCase()}
          </div>
          <h1>Operation Dashboard</h1>
          <p>Status sistem, monitoring layanan, queue ticket, dan ringkasan handover shift.</p>
        </div>
        <div className="page-actions">
          <button className="button button-secondary" onClick={props.onExportReport}>
            <span>↓</span> Export Summary
          </button>
          <button className="button button-primary" onClick={props.onNewTicket}>
            <span>＋</span> New Ticket
          </button>
        </div>
      </section>

      <HealthStrip />

      <MetricCards
        tickets={props.tickets}
        attentionCount={attentionItems.length - props.acknowledged.length}
        onGoToTickets={props.onGoToTickets}
      />

      <section className="dashboard-grid">
        <div className="main-column">
          <AttentionPanel
            acknowledged={props.acknowledged}
            onAcknowledge={props.onAcknowledge}
            onUnacknowledge={props.onUnacknowledge}
          />

          <MonitoringSchedule
            entries={overviewEntries}
            assessments={props.assessments}
            onAssess={props.onAssess}
            onRequestNote={props.onRequestNote}
            currentHour={props.currentHour}
            footer={
              <div className="schedule-panel-footer">
                <button className="guide-trigger-btn" onClick={props.onOpenGuide}>
                  Panduan Penilaian (Guide)
                </button>
                <button className="schedule-more-button" onClick={props.onGoToMonitoring}>
                  Buka jadwal monitoring lengkap <span>→</span>
                </button>
              </div>
            }
          />
        </div>

        <aside className="side-column">
          <ShiftCoverageCard />
          <HandoverQuickCard
            pendingCount={pendingTasks.length}
            progressPercent={props.handoverProgressPercent}
            accepted={Boolean(props.handoverRecord.acceptance)}
            savedLabel={
              props.handoverSavedLabel
                ? `${props.handoverRecord.sourceShift} ke ${props.handoverRecord.targetShift}`
                : null
            }
            onOpen={props.onOpenHandover}
            onCreate={props.onCreateHandover}
          />
        </aside>
      </section>

      <article className="panel tickets-panel">
        <div className="panel-heading">
          <div className="panel-title">Ticket Terbaru</div>
          <button className="text-button" onClick={props.onGoToTickets}>
            Lihat semua <span>→</span>
          </button>
        </div>
        <TicketTable tickets={props.tickets} onSelect={props.onSelectTicket} compact />
      </article>
    </>
  );
}
