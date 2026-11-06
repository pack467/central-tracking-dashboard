/**
 * Reports DTO (NestJS Ready)
 */

export interface WeeklyReportSummaryDto {
  periodStart: string;
  periodEnd: string;
  totalTickets: number;
  resolvedTickets: number;
  slaAdherenceRate: number;
  mttrMinutes: number;
  incidentCount: number;
  serviceHealthScore: number;
}
