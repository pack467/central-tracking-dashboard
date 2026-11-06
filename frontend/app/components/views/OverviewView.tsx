"use client";

import { TicketReportView } from "@/app/components/tickets/TicketReportView";
import type { CheckpointAssessment, Ticket } from "@/app/lib/types";

// Re-export getTicketShift for backward compatibility (used by TicketsView)
export function getTicketShift(ticket: Ticket): "Subuh" | "Pagi" | "Malam" {
  const rawShift = (ticket as Ticket & { createdDuringShift?: string }).createdDuringShift || ticket.shift;
  if (rawShift) {
    if (typeof rawShift === "string") {
      if (rawShift.includes("Subuh")) return "Subuh";
      if (rawShift.includes("Malam")) return "Malam";
      if (rawShift.includes("Pagi")) return "Pagi";
    }
  }
  if (ticket.created) {
    const match = ticket.created.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const totalMinutes = hours * 60 + minutes;
      if (totalMinutes >= 16 * 60) return "Malam";
      if (totalMinutes >= 8 * 60) return "Pagi";
      return "Subuh";
    }
  }
  return "Pagi";
}

interface OverviewViewProps {
  tickets: Ticket[];
  allTickets?: Ticket[];
  onGoToTickets: () => void;
  onGoToMonitoring?: () => void;
  assessments?: Record<string, CheckpointAssessment>;
}

export function OverviewView({ tickets, onGoToTickets, onGoToMonitoring, assessments }: OverviewViewProps) {
  return (
    <TicketReportView
      tickets={tickets}
      onGoToTickets={onGoToTickets}
      onGoToMonitoring={onGoToMonitoring}
      assessments={assessments}
    />
  );
}
