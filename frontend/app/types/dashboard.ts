/**
 * Dashboard Summary & Analytics DTOs (NestJS Ready)
 */

export interface DashboardShiftMetricsDto {
  activeShift: "Subuh" | "Pagi" | "Malam";
  dutyLead: string;
  handoverStatus: "Complete" | "Pending" | "In-Progress";
  slaCompliancePercent: number;
  openIncidentsCount: number;
}

export interface VolumeDataPointDto {
  date: string;
  total: number;
  byProject: Record<string, number>;
}

export interface StaffRecapDto {
  name: string;
  role: string;
  totalAssigned: number;
  resolved: number;
  open: number;
  avgResolutionMinutes: number;
  avatarBg?: string;
}

export interface CategoryDistributionDto {
  category: string;
  count: number;
  percentage: number;
}

export interface SeverityDistributionDto {
  severity: "High" | "Medium" | "Low";
  count: number;
  percentage: number;
  slaBreachedCount: number;
}

export interface ResolutionVelocityDto {
  avgMinutes: number;
  targetMinutes: number;
  p95Minutes: number;
  trendPercentage: number;
  history: Array<{ timestamp: string; value: number }>;
}

export interface ShiftTrafficDto {
  subuh: number;
  pagi: number;
  malam: number;
  peakHour: string;
  trendPercentage: number;
  history: Array<{ hour: string; count: number }>;
}

export interface DashboardSummaryDto {
  shiftMetrics: DashboardShiftMetricsDto;
  volumeByDate: VolumeDataPointDto[];
  staffRecaps: StaffRecapDto[];
  categoryDistribution: CategoryDistributionDto[];
  severityDistribution: SeverityDistributionDto[];
  resolutionVelocity: ResolutionVelocityDto;
  shiftTraffic: ShiftTrafficDto;
}
