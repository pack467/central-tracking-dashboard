"use client";
import { useMasterReferences } from "@/app/hooks/useMasterReferences";
import { durationScale, SLA_BREACH_MINUTES, SLA_TARGET_MINUTES, wholeStep } from "@/app/lib/chart-scale";
import { resolveCategoryColor } from "@/app/lib/category-colors";

import { Select, MultiSelect } from "@/app/components/ui/Select";
import { ResponsiveSheet } from "@/app/components/ui/BottomSheet";
import { useMobileLayout, useCompactLayout } from "@/app/hooks/useMobileLayout";
import { placeChartCallout, type ChartBox } from "@/app/lib/chart-layout";
import { HorizontalScroll } from "@/app/components/ui/HorizontalScroll";
import { useScrollEdges } from "@/app/hooks/useScrollEdges";
import { useContainerDimensions } from "@/app/hooks/useContainerDimensions";
import { paths } from "@/app/lib/routes";
import { useUrlQuery } from "@/app/hooks/useUrlQuery";
import { useWholeRowViewport } from "@/app/hooks/useWholeRowViewport";
import dynamic from "next/dynamic";
import { dashboardSchema, type PanelId } from "@/app/lib/query-state";
import { PanelViewButton } from "@/app/components/dashboard/PanelViewButton";
import { TodayTicketRow } from "@/app/components/dashboard/TodayTicketRow";
import { MemoCard } from "@/app/components/dashboard/MemoCard";
import { CenteredEmptyState } from "@/app/components/ui/CenteredEmptyState";
import { MemoModal } from "@/app/components/dashboard/MemoModal";

const PanelViewer = dynamic(
  () =>
    import("@/app/components/dashboard/panel-viewer/PanelViewer").then(
      (m) => m.PanelViewer
    ),
  { ssr: false }
);

import { useResource } from "@/app/hooks/useResource";
import { ticketsService } from "@/app/services/tickets";
import { Skeleton, PanelSkeletonWrapper, DashboardLiveOpsCommandBarSkeleton, TodayTicketsSkeleton, ShiftMemoNotesSkeleton, MonitoringChecklistSkeleton, TicketVolumeChartSkeleton, StaffRecapSkeleton, CategoryDistributionSkeleton, SeverityDistributionSkeleton, ResolutionVelocitySkeleton, ShiftTrafficSkeleton } from "@/app/components/ui/skeleton";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";

import { createPortal } from "react-dom";
import { Clock, CheckCircle2, AlertTriangle, ShieldCheck, Activity, TrendingUp, Calendar, Zap, BarChart3, ListChecks, Users, X, ChevronRight, ChevronLeft, Moon, Sun, Sunset, StickyNote, RotateCcw, Check, FolderKanban, SlidersHorizontal, ListFilter } from "lucide-react";
import { useToast } from "@/app/components/ui/Toast";
import { Avatar } from "@/app/components/ui/Avatar";
import { ModalCloseButton } from "@/app/components/ui/ModalCloseButton";
import { DatePicker } from "@/app/components/ui/DatePicker";
import { useActiveShift } from "@/app/hooks/useLiveClock";
import { useUserStatus, getStatusRingStyle } from "@/app/hooks/useUserStatus";
import { useClient } from "@/app/context/ClientContext";
import { useWibToday } from "@/app/hooks/useWibToday";
import { dateFilterLabel, dateFilterMatches, dateFilterToPickerValue, lastSevenDaysFilter, pickerValueToDateFilter } from "@/app/lib/date-filter";
import { bucketAxisLabel, bucketKeyOf, bucketRanges, bucketTitle, bucketVolume, chooseGranularity, formatDay, granularityBadge, granularityNote } from "@/app/lib/volume-buckets";
import { ChartModeNote } from "@/app/components/ui/ChartModeNote";
import { ChartEmptyState } from "@/app/components/ui/ChartEmptyState";
import { useActivePeople, useRoles } from "@/app/hooks/useMasterData";
import { useOrgCatalog } from "@/app/hooks/useOrgCatalog";
import { itemOf } from "@/app/lib/org-catalog";
import { getClientMonitoringSchedule } from "@/app/lib/clientData";
import { rowKey as checkpointKey } from "@/app/components/dashboard/MonitoringSchedule";
import { isTicketDone, matchesPerson, newestFirst, normalizeName, periodCounts, slaCompliance, slaStatus, slaTargetFor, ticketDateOf } from "@/app/lib/ticket-metrics";
import { csvLine } from "@/app/lib/csv";
import { buildMomComparison } from "@/app/lib/mom-comparison";
import { MomComparison } from "@/app/components/dashboard/MomComparison";
import type { CheckpointAssessment, Ticket } from "@/app/lib/types";

interface TicketReportViewProps {
  tickets: Ticket[];
  onGoToTickets?: () => void;
  /** The checkpoint verdicts operators gave on the Monitoring page (read only here). */
  assessments?: Record<string, CheckpointAssessment>;
}

/** A person the dashboard lists: the shifter filter and the per-person recap. */
interface RosterPerson { id?: string; name: string; role: string }

// Standard project color map for consistent visual identity across dashboard
const PROJECT_COLORS: Record<string, string> = {
  "EPC Tools": "#38bdf8", // Sky Blue
  "EPC": "#38bdf8",
  "USIEM": "#a855f7",    // Purple
  "SM": "#f59e0b",       // Amber
  "MB": "#ec4899",       // Pink
  "B2B": "#06b6d4",      // Cyan
  "APH": "#10b981",      // Emerald
  "DM": "#6366f1",       // Indigo
  "UNEM": "#84cc16",     // Lime
};



const PRIORITY_COLORS = {
  High: "#f97316",
  Medium: "#f59e0b",
  Low: "#2dd4bf",
};

const SEVERITY_CARD_STYLES = {
  High: {
    borderLeft: "border-l-[#f97316]",
    dot: "bg-[#f97316]",
    bar: "bg-[#f97316]",
  },
  Medium: {
    borderLeft: "border-l-[#f59e0b]",
    dot: "bg-[#f59e0b]",
    bar: "bg-[#f59e0b]",
  },
  Low: {
    borderLeft: "border-l-[#2dd4bf]",
    dot: "bg-[#2dd4bf]",
    bar: "bg-[#2dd4bf]",
  },
} as const;

// Reusable standard panel card and header utilities matching legacy dashboard specifications
const REPORT_PANEL_CARD =
  "bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-[12px] shadow-[var(--shadow-panel)] overflow-hidden flex flex-col max-lg:min-w-0";

const REPORT_PANEL_HEADING =
  "flex justify-between items-center flex-wrap gap-[12px] max-[768px]:gap-[10px] p-[14px_20px] max-[768px]:p-[12px_14px] border-b border-[var(--line)] max-lg:h-[73px] max-lg:gap-2 max-lg:px-3.5 max-lg:py-3.5 max-lg:shrink-0";

const REPORT_PANEL_TITLE =
  "flex items-center gap-[8px] text-[14px] font-bold text-[var(--ink-primary)] max-lg:text-[15px] max-lg:font-semibold";

const MOBILE_OPS_CARD = "max-lg:rounded-2xl max-lg:border-[#334155]/60 max-lg:bg-[#1e293b] max-lg:[&.ops-today-panel_[data-ops-body]]:p-0 max-lg:[&.ops-shift-panel_[data-ops-body]]:p-4 max-lg:[&.ops-engineer-panel_[data-ops-body]]:p-4";
const MOBILE_OPS_HEADING = "max-lg:[&[data-ops-header]]:h-[77px] max-lg:[&[data-ops-header]]:min-h-[77px] max-lg:[&[data-ops-header]]:flex-nowrap max-lg:[&[data-ops-header]]:gap-3 max-lg:[&[data-ops-header]]:p-4 max-lg:[&[data-ops-header]]:border-[#334155]/50 max-lg:[&_[data-ops-title]]:gap-3 max-lg:[&_[data-ops-title]]:leading-5";

// Helper for generating clean Y-axis ticks
function computeYTicks(maxVal: number) {
  const safeMax = Math.max(1, maxVal);
  let yMax = 4;
  let step = 1;

  if (safeMax <= 4) {
    yMax = 4;
    step = 1;
  } else if (safeMax <= 8) {
    yMax = 8;
    step = 2;
  } else if (safeMax <= 12) {
    yMax = 12;
    step = 3;
  } else if (safeMax <= 20) {
    yMax = 20;
    step = 5;
  } else if (safeMax <= 40) {
    yMax = Math.ceil(safeMax / 10) * 10;
    step = 10;
  } else {
    yMax = Math.ceil(safeMax / 20) * 20;
    step = Math.ceil(yMax / 4);
  }

  const ticks: number[] = [];
  for (let i = 0; i <= yMax; i += step) {
    ticks.push(i);
  }
  return { yMax, ticks };
}

// Format ISO date (e.g. "2026-09-07") into short Indonesian day and date
function formatHeatmapDate(dateStr: string) {
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
      return { dayName: days[d.getDay()], dateShort: `${parts[1]}-${parts[2]}` };
    }
  } catch {}
  return { dayName: "", dateShort: dateStr.slice(5) };
}

function getTicketShiftLocal(ticket: Ticket): "Subuh" | "Pagi" | "Malam" {
  const rawShift = (ticket as any).createdDuringShift || ticket.shift;
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

function AnalyticsShifterMultiSelect({ selectedList, onChange, staffList }: { selectedList: string[]; onChange: (list: string[]) => void; staffList: RosterPerson[] }) {
  return <MultiSelect label="Shifter (PIC)" aria-label="Filter Shifter / PIC" value={selectedList} onChange={onChange} options={staffList.map(staff => ({ value: staff.name, label: staff.name }))} icon={<Users size={16} />} className="analytics-shifter-trigger h-[34px] w-full text-[11.5px]" title={selectedList.length ? selectedList.join(", ") : "Filter Shifter / PIC"} formatValue={values => {
    if (!values.length) return `Semua Shifter (${staffList.length})`;
    if (values.length === 1) return values[0].split(" ").slice(0, 2).join(" ");
    if (values.length === 2) return values[0].split(" ").slice(0, 2).map((part, index) => index ? part[0] + "." : part).join(" ") + " +1";
    return values.length + " Shifter Terpilih";
  }} />;
}

const SHIFT_BADGE_STYLES = {
  subuh: "bg-[rgba(56,189,248,0.12)] border-[rgba(56,189,248,0.28)] text-[#cbd5e1] [&_strong]:text-[#38bdf8]",
  pagi: "bg-[rgba(245,158,11,0.12)] border-[rgba(245,158,11,0.28)] text-[#cbd5e1] [&_strong]:text-[#fbbf24]",
  malam: "bg-[rgba(168,85,247,0.12)] border-[rgba(168,85,247,0.28)] text-[#cbd5e1] [&_strong]:text-[#c084fc]",
} as const;

const OPS_PRIORITY_PILL_STYLES = {
  crit: "inline-flex items-center px-[7px] py-[2px] rounded-[99px] font-mono text-[9.5px] max-lg:text-[11px] font-bold whitespace-nowrap bg-[rgba(239,68,68,0.15)] text-[#f87171] border border-[rgba(239,68,68,0.3)] max-lg:h-[22px] max-lg:px-2 max-lg:py-0 max-lg:font-sans max-lg:font-semibold max-lg:leading-none max-lg:bg-[rgba(239,68,68,0.18)] max-lg:border-[rgba(239,68,68,0.5)] priority-pill priority-pill-crit",
  high: "inline-flex items-center px-[7px] py-[2px] rounded-[99px] font-mono text-[9.5px] max-lg:text-[11px] font-bold whitespace-nowrap bg-[rgba(249,115,22,0.15)] text-[#fb923c] border border-[rgba(249,115,22,0.3)] max-lg:h-[22px] max-lg:px-2 max-lg:py-0 max-lg:font-sans max-lg:font-semibold max-lg:leading-none max-lg:bg-[rgba(249,115,22,0.18)] max-lg:border-[rgba(249,115,22,0.5)] priority-pill priority-pill-high",
  med: "inline-flex items-center px-[7px] py-[2px] rounded-[99px] font-mono text-[9.5px] max-lg:text-[11px] font-bold whitespace-nowrap bg-[rgba(245,158,11,0.15)] text-[#fbbf24] border border-[rgba(245,158,11,0.3)] max-lg:h-[22px] max-lg:px-2 max-lg:py-0 max-lg:font-sans max-lg:font-semibold max-lg:leading-none max-lg:bg-[rgba(245,158,11,0.18)] max-lg:border-[rgba(245,158,11,0.5)] priority-pill priority-pill-med",
  low: "inline-flex items-center px-[7px] py-[2px] rounded-[99px] font-mono text-[9.5px] max-lg:text-[11px] font-bold whitespace-nowrap bg-[rgba(45,212,191,0.15)] text-[#2dd4bf] border border-[rgba(45,212,191,0.3)] max-lg:h-[22px] max-lg:px-2 max-lg:py-0 max-lg:font-sans max-lg:font-semibold max-lg:leading-none max-lg:bg-[rgba(45,212,191,0.18)] max-lg:border-[rgba(45,212,191,0.5)] priority-pill priority-pill-low",
} as const;

const OPS_STATUS_PILL_STYLES: Record<string, string> = {
  open: "inline-flex items-center px-[7px] py-[2px] rounded-[99px] font-mono text-[9.5px] max-lg:text-[11px] font-bold whitespace-nowrap bg-[rgba(56,189,248,0.15)] text-[#38bdf8] border border-[rgba(56,189,248,0.25)] max-lg:h-[22px] max-lg:px-2 max-lg:py-0 max-lg:font-sans max-lg:font-semibold max-lg:leading-none max-lg:bg-[rgba(56,189,248,0.18)] max-lg:border-[rgba(56,189,248,0.5)] status-pill status-pill-open",
  active: "inline-flex items-center px-[7px] py-[2px] rounded-[99px] font-mono text-[9.5px] max-lg:text-[11px] font-bold whitespace-nowrap bg-[rgba(56,189,248,0.15)] text-[#38bdf8] border border-[rgba(56,189,248,0.25)] max-lg:h-[22px] max-lg:px-2 max-lg:py-0 max-lg:font-sans max-lg:font-semibold max-lg:leading-none max-lg:bg-[rgba(56,189,248,0.18)] max-lg:border-[rgba(56,189,248,0.5)] status-pill status-pill-active",
  activity: "inline-flex items-center px-[7px] py-[2px] rounded-[99px] font-mono text-[9.5px] max-lg:text-[11px] font-bold whitespace-nowrap bg-[rgba(56,189,248,0.15)] text-[#38bdf8] border border-[rgba(56,189,248,0.25)] max-lg:h-[22px] max-lg:px-2 max-lg:py-0 max-lg:font-sans max-lg:font-semibold max-lg:leading-none max-lg:bg-[rgba(56,189,248,0.18)] max-lg:border-[rgba(56,189,248,0.5)] status-pill status-pill-activity",
  meeting: "inline-flex items-center px-[7px] py-[2px] rounded-[99px] font-mono text-[9.5px] max-lg:text-[11px] font-bold whitespace-nowrap bg-[rgba(45,212,191,0.15)] text-[#2dd4bf] border border-[rgba(45,212,191,0.25)] max-lg:h-[22px] max-lg:px-2 max-lg:py-0 max-lg:font-sans max-lg:font-semibold max-lg:leading-none max-lg:bg-[rgba(45,212,191,0.18)] max-lg:border-[rgba(45,212,191,0.5)] status-pill status-pill-meeting",
  "re-open": "inline-flex items-center px-[7px] py-[2px] rounded-[99px] font-mono text-[9.5px] max-lg:text-[11px] font-bold whitespace-nowrap bg-[rgba(248,113,113,0.15)] text-[#f87171] border border-[rgba(248,113,113,0.25)] max-lg:h-[22px] max-lg:px-2 max-lg:py-0 max-lg:font-sans max-lg:font-semibold max-lg:leading-none max-lg:bg-[rgba(248,113,113,0.18)] max-lg:border-[rgba(248,113,113,0.5)] status-pill status-pill-reopen",
  pending: "inline-flex items-center px-[7px] py-[2px] rounded-[99px] font-mono text-[9.5px] max-lg:text-[11px] font-bold whitespace-nowrap bg-[rgba(245,158,11,0.15)] text-[#fbbf24] border border-[rgba(245,158,11,0.25)] max-lg:h-[22px] max-lg:px-2 max-lg:py-0 max-lg:font-sans max-lg:font-semibold max-lg:leading-none max-lg:bg-[rgba(245,158,11,0.18)] max-lg:border-[rgba(245,158,11,0.5)] status-pill status-pill-pending",
  rca: "inline-flex items-center px-[7px] py-[2px] rounded-[99px] font-mono text-[9.5px] max-lg:text-[11px] font-bold whitespace-nowrap bg-[rgba(249,115,22,0.15)] text-[#fb923c] border border-[rgba(249,115,22,0.25)] max-lg:h-[22px] max-lg:px-2 max-lg:py-0 max-lg:font-sans max-lg:font-semibold max-lg:leading-none max-lg:bg-[rgba(249,115,22,0.18)] max-lg:border-[rgba(249,115,22,0.5)] status-pill status-pill-rca",
  escalated: "inline-flex items-center px-[7px] py-[2px] rounded-[99px] font-mono text-[9.5px] max-lg:text-[11px] font-bold whitespace-nowrap bg-[rgba(168,85,247,0.15)] text-[#c084fc] border border-[rgba(168,85,247,0.25)] max-lg:h-[22px] max-lg:px-2 max-lg:py-0 max-lg:font-sans max-lg:font-semibold max-lg:leading-none max-lg:bg-[rgba(168,85,247,0.18)] max-lg:border-[rgba(168,85,247,0.5)] status-pill status-pill-escalated",
  inprogress: "inline-flex items-center px-[7px] py-[2px] rounded-[99px] font-mono text-[9.5px] max-lg:text-[11px] font-bold whitespace-nowrap bg-[rgba(56,189,248,0.15)] text-[#38bdf8] border border-[rgba(56,189,248,0.25)] max-lg:h-[22px] max-lg:px-2 max-lg:py-0 max-lg:font-sans max-lg:font-semibold max-lg:leading-none max-lg:bg-[rgba(56,189,248,0.18)] max-lg:border-[rgba(56,189,248,0.5)] status-pill status-pill-inprogress",
  closed: "inline-flex items-center px-[7px] py-[2px] rounded-[99px] font-mono text-[9.5px] max-lg:text-[11px] font-bold whitespace-nowrap bg-[rgba(148,163,184,0.15)] text-[#cbd5e1] border border-[rgba(148,163,184,0.25)] max-lg:h-[22px] max-lg:px-2 max-lg:py-0 max-lg:font-sans max-lg:font-semibold max-lg:leading-none max-lg:bg-[rgba(148,163,184,0.18)] max-lg:border-[rgba(148,163,184,0.5)] status-pill status-pill-closed",
};

// The 10px minimum wins on narrow phones; dense ranges keep a 14px slot.
function compactVolumeGeometry(count: number, available: number) {
  const fits = count <= 31 && available >= count * 10 + 16;
  const width = fits ? available : Math.max(available, count * 14 + 16);
  const bar = Math.min(24, Math.max(10, (width - 16 - Math.max(0, count - 1) * 3) / Math.max(1, count)));
  const step = count > 1 ? (width - 16 - bar) / (count - 1) : 0;
  return { fits, width, bar, step, start: count > 1 ? 8 + bar / 2 : width / 2 };
}

export function TicketReportView({ tickets: propTickets, onGoToTickets, assessments }: TicketReportViewProps) {
  const mobile = useCompactLayout();
  const phone = useMobileLayout();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [ticketsExpanded, setTicketsExpanded] = useState(false);
  const [monitoringExpanded, setMonitoringExpanded] = useState(false);
  const [staffExpanded, setStaffExpanded] = useState(false);
  const toggleCompactPreview = (panel: HTMLElement | null, expanded: boolean, setExpanded: (value: boolean) => void) => {
    setExpanded(!expanded);
    if (expanded) requestAnimationFrame(() => panel?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }));
  };
  const [hiddenCardProjects, setHiddenCardProjects] = useState<Set<string>>(() => new Set());
  const toggleCardProject = (project: string) => setHiddenCardProjects(previous => {
    const next = new Set(previous);
    if (next.has(project)) next.delete(project); else next.add(project);
    return next;
  });
  const [distributionIndex, setDistributionIndex] = useState(0);
  const distributionRef = useRef<HTMLDivElement>(null);
  const [volumeChartRef, volumeSize] = useContainerDimensions<HTMLDivElement>();
  const volumeFade = useScrollEdges(volumeChartRef, volumeSize.width);
  const [velocityChartRef, velocitySize] = useContainerDimensions<HTMLDivElement>();
  const [trafficChartRef, trafficSize] = useContainerDimensions<HTMLDivElement>();
  const { activeClient, activeClientId } = useClient();
  const { catalog, categoryLabel, severityLabel, projectLabel } = useMasterReferences();
  const notify = useToast();

  const {
    data: fetchedTickets,
    isLoading,
    isStale,
    error,
    refetch,
  } = useResource<Ticket[]>(
    `dashboard-tickets-${activeClientId}`,
    (signal) => ticketsService.list({ clientId: activeClientId }, signal),
    {
      deps: [activeClientId],
    }
  );

  const tickets = fetchedTickets ?? (isLoading ? [] : propTickets);
  const newProjectFilters = catalog.projects.filter(p => !p.legacy && p.organizationId === activeClientId && p.status === "active").map(p => p.legacyKey);
  const schema = dashboardSchema([...new Set([...tickets.map(t => t.project), ...newProjectFilters])]);
  const url = useUrlQuery(schema, paths.dashboard);

  const activeShift = useActiveShift();
  const { userStatus } = useUserStatus();

  // Memo Modal open state
  const [memoModalOpen, setMemoModalOpen] = useState(false);

  // Panel Viewer state from URL
  const activePanelId = (url.values.panel as PanelId) || null;
  const viewerMode = (url.values.mode as "chart" | "table") || "chart";

  const handleOpenPanel = useCallback((id: PanelId) => {
    url.update({ panel: id });
  }, [url]);

  const handleClosePanel = useCallback(() => {
    url.update({ panel: "", mode: "chart" });
  }, [url]);

  const handlePanelModeChange = useCallback((mode: "chart" | "table") => {
    url.update({ mode });
  }, [url]);

  // List Monitoring Shift: the day's checkpoints with the verdicts the operators gave on the Monitoring page. The list only shows them;
  // assessing happens there. A checkpoint nobody has assessed yet says so ("Belum") instead of showing a made-up result.
  const monitoringItems = useMemo(
    () => [...getClientMonitoringSchedule(activeClientId)]
      .sort((a, b) => a.time.localeCompare(b.time) || a.task.localeCompare(b.task))
      .map((entry) => {
        const key = checkpointKey(entry);
        const verdict = assessments?.[key]?.verdict;
        const status: "OK" | "NOK" | "Belum" = verdict === "ok" || verdict === "adequate" ? "OK" : verdict === "nok" || verdict === "not-adequate" ? "NOK" : "Belum";
        return { id: key, project: entry.project, task: entry.task, time: entry.time, status };
      }),
    [activeClientId, assessments]
  );
  const okCount = monitoringItems.filter((i) => i.status === "OK").length;
  const nokCount = monitoringItems.filter((i) => i.status === "NOK").length;
  const assessedCount = okCount + nokCount;

  // Active hover and click selection states for charts
  const [volumeTouch, setVolumeTouch] = useState<{ index: number; x: number } | null>(null);
  const selectedDate = url.values.day || null;
  const setSelectedDate = (next: string | null | ((previous: string | null) => string | null)) => {
    const value = typeof next === "function" ? next(selectedDate) : next;
    url.update({ day: value ?? "" });
  };
  const selectedChartTab = url.values.chart;
  const setSelectedChartTab = url.field("chart", "push");
  const momSubView = url.values.mom;
  const setMomSubView = url.field("mom", "push");
  const [hoveredVelocityPoint, setHoveredVelocityPoint] = useState<{
    x: number;
    y: number;
    date: string;
    avgResolution: number;
    closed: number;
    percentX: number;
    percentY: number;
  } | null>(null);
  const [hoveredShiftTrafficPoint, setHoveredShiftTrafficPoint] = useState<{
    x: number;
    y: number;
    date: string;
    subuh: number;
    pagi: number;
    malam: number;
    total: number;
    percentX: number;
    percentY: number;
  } | null>(null);
  const activeShiftLineFilter = url.values.line;
  const setActiveShiftLineFilter = url.field("line", "replace");

  // ── Analytics Filter State (controls all charts & reports below LIVE OPS VIEW) ──
  // The default is today (WIB): the charts show the day's operation instead of every ticket there ever was. "all" is an explicit choice.
  const todayWib = useWibToday();
  const analyticsDateFilter = url.values.date;
  const setAnalyticsDateFilter = url.field("date", "replace");
  const analyticsProjectFilter = url.values.project;
  const setAnalyticsProjectFilter = url.field("project", "replace");
  const analyticsShiftFilter = url.values.shift;
  const setAnalyticsShiftFilter = url.field("shift", "replace");
  const [analyticsSelectedShifters, setAnalyticsSelectedShifters] = useState<string[]>([]);
  const analyticsStatusFilter: string = url.values.status;
  const setAnalyticsStatusFilter = url.field("status", "replace");
  const analyticsSeverityFilter = url.values.priority;
  const setAnalyticsSeverityFilter = url.field("priority", "replace");

  const isAnyAnalyticsFilterActive = useMemo(() => {
    return (
      analyticsDateFilter !== "today" ||
      analyticsProjectFilter !== "All" ||
      analyticsShiftFilter !== "All" ||
      analyticsSelectedShifters.length > 0 ||
      analyticsStatusFilter !== "All" ||
      analyticsSeverityFilter !== "All"
    );
  }, [
    analyticsDateFilter,
    analyticsProjectFilter,
    analyticsShiftFilter,
    analyticsSelectedShifters,
    analyticsStatusFilter,
    analyticsSeverityFilter,
  ]);
  // Any filter other than the date: an empty chart then says "nothing matches" rather than "nothing in this period"
  const isNonDateAnalyticsFilterActive = isAnyAnalyticsFilterActive && (analyticsProjectFilter !== "All" || analyticsShiftFilter !== "All" || analyticsSelectedShifters.length > 0 || analyticsStatusFilter !== "All" || analyticsSeverityFilter !== "All");
  // The empty charts share one headline and the same way out: widen the dates, or clear the filters.
  const emptyTitle = () => isNonDateAnalyticsFilterActive ? "Tidak ada tiket yang cocok" : analyticsDateFilter === "today" ? "Belum ada tiket hari ini" : "Tidak ada tiket pada rentang ini";
  const emptyActions = () => (
    <>
      {analyticsDateFilter === "today" && !isAnyAnalyticsFilterActive && <button type="button" onClick={() => setAnalyticsDateFilter(lastSevenDaysFilter(todayWib))} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-sky-400/40 bg-sky-400/10 px-3.5 text-[12.5px] font-semibold text-sky-300 transition-colors hover:border-sky-400/70 hover:bg-sky-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 max-lg:min-h-11"><Calendar size={14} aria-hidden="true" />Lihat 7 hari terakhir</button>}
      {!isNonDateAnalyticsFilterActive && analyticsDateFilter !== "today" && analyticsDateFilter !== "all" && <button type="button" onClick={() => setAnalyticsDateFilter("all")} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-sky-400/40 bg-sky-400/10 px-3.5 text-[12.5px] font-semibold text-sky-300 transition-colors hover:border-sky-400/70 hover:bg-sky-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 max-lg:min-h-11"><Calendar size={14} aria-hidden="true" />Lihat semua waktu</button>}
      {isAnyAnalyticsFilterActive && <button type="button" onClick={resetAllAnalyticsFilters} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-600 bg-[#243044] px-3.5 text-[12.5px] font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:bg-[#2c3a52] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 max-lg:min-h-11"><RotateCcw size={14} aria-hidden="true" />Reset filter</button>}
    </>
  );

  const activeFilterChips = useMemo(() => {
    const chips: { label: string; value: string }[] = [];
    if (analyticsDateFilter !== "today") chips.push({ label: "Tanggal", value: dateFilterLabel(analyticsDateFilter, todayWib) });
    if (analyticsProjectFilter && analyticsProjectFilter !== "All") chips.push({ label: "Proyek", value: analyticsProjectFilter });
    if (analyticsShiftFilter && analyticsShiftFilter !== "All") chips.push({ label: "Shift", value: analyticsShiftFilter });
    if (analyticsSelectedShifters.length > 0) chips.push({ label: "PIC", value: `${analyticsSelectedShifters.length} dipilih` });
    if (analyticsStatusFilter && analyticsStatusFilter !== "All") chips.push({ label: "Status", value: analyticsStatusFilter });
    if (analyticsSeverityFilter && analyticsSeverityFilter !== "All") chips.push({ label: "Severity", value: analyticsSeverityFilter });
    return chips;
  }, [
    analyticsDateFilter,
    todayWib,
    analyticsProjectFilter,
    analyticsShiftFilter,
    analyticsSelectedShifters,
    analyticsStatusFilter,
    analyticsSeverityFilter,
  ]);

  const resetAllAnalyticsFilters = () => {
    setAnalyticsDateFilter("today");
    setAnalyticsProjectFilter("All");
    setAnalyticsShiftFilter("All");
    setAnalyticsSelectedShifters([]);
    setAnalyticsStatusFilter("All");
    setAnalyticsSeverityFilter("All");
    notify.info("Filter analitik dikembalikan ke default.", { id: "reset-analytics-filters" });
  };

  // Filtered tickets for all analytics charts & reports below LIVE OPS VIEW
  // Everyone the dashboard lists (the shifter filter and the per-person recap): the active people of the team (the backend's own list when it
  // is connected), plus anybody who owns a ticket without being on that list, so no ticket falls outside every person.
  const people = useActivePeople();
  const roles = useRoles();
  const positions = useOrgCatalog("position");
  const roster = useMemo<RosterPerson[]>(() => {
    const roleName = (key: string) => roles.find((role) => role.key === key)?.name ?? key;
    const shiftName = { subuh: "Shift Subuh", pagi: "Shift Pagi", malam: "Shift Malam" } as const;
    // the office position (Jabatan) leads, then the role in the app and the shift
    const rows: RosterPerson[] = people.map((person) => ({ id: person.id, name: person.fullName, role: [itemOf(positions, person.id)?.name, roleName(person.roleKey), person.defaultShift ? shiftName[person.defaultShift] : ""].filter(Boolean).join(" · ") }));
    const strays = new Set<string>();
    for (const ticket of tickets) {
      const owner = (ticket.owner || "").trim();
      if (owner && owner !== "—" && !rows.some((row) => matchesPerson(ticket, row))) strays.add(owner);
    }
    for (const name of strays) rows.push({ name, role: "Tidak ada di daftar personel aktif" });
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }, [people, roles, positions, tickets]);

  // The filters that are not the date. The per-person recap counts its own day, month and year on top of these.
  const matchesOtherFilters = useCallback((t: Ticket) => {
    // Project
    if (analyticsProjectFilter !== "All" && t.project !== analyticsProjectFilter) return false;

    // Shift
    if (analyticsShiftFilter !== "All" && (t.shift || getTicketShiftLocal(t)) !== analyticsShiftFilter) return false;

    // Shifter / PIC: by id when the ticket has one, otherwise by the exact name
    if (analyticsSelectedShifters.length > 0) {
      const chosen = roster.filter((person) => analyticsSelectedShifters.includes(person.name));
      if (!chosen.some((person) => matchesPerson(t, person))) return false;
    }

    // Status
    if (analyticsStatusFilter !== "All") {
      const s = (t.status || "").toLowerCase().replace(/[\s_]+/g, "-");
      const target = analyticsStatusFilter.toLowerCase();
      if (target === "closed") {
        if (!isTicketDone(t)) return false;
      } else if (target === "re-open") {
        if (s !== "re-open" && s !== "reopen") return false;
      } else if (s !== target) {
        return false;
      }
    }

    // Severity
    if (analyticsSeverityFilter !== "All" && (t.severity || "").toLowerCase() !== analyticsSeverityFilter.toLowerCase()) return false;

    return true;
  }, [analyticsProjectFilter, analyticsShiftFilter, analyticsSelectedShifters, analyticsStatusFilter, analyticsSeverityFilter, roster]);

  const ticketsWithoutDateFilter = useMemo(() => tickets.filter(matchesOtherFilters), [tickets, matchesOtherFilters]);

  // Date range: "today" (the default), "all", one day or from..to (lib/date-filter.ts). A ticket without a day only appears under "all".
  const analyticsTickets = useMemo(
    () => ticketsWithoutDateFilter.filter((t) => dateFilterMatches(analyticsDateFilter, ticketDateOf(t), todayWib)),
    [ticketsWithoutDateFilter, analyticsDateFilter, todayWib]
  );

  // 1. Overall Aggregates (Downstream charts use analyticsTickets)
  const total = analyticsTickets.length;
  const closedTickets = useMemo(() => analyticsTickets.filter(isTicketDone), [analyticsTickets]);
  const activeTickets = useMemo(() => analyticsTickets.filter((t) => !isTicketDone(t)), [analyticsTickets]);

  // 2. Project List & Colors
  const allProjects = useMemo(() => {
    const set = new Set<string>();
    for (const t of tickets) {
      if (t.project && t.project !== "L2") {
        set.add(t.project);
      }
    }
    return Array.from(set).sort();
  }, [tickets]);

  // 3. Volume Bucketed By Date (Per Project Stacked & Created/Closed/Backlog)
  const volumeByDate = useMemo(() => {
    const map: Record<
      string,
      {
        created: number;
        closed: number;
        projectCounts: Record<string, number>;
        avgResolution: number;
        resolutionTimes: number[];
      }
    > = {};

    for (const t of analyticsTickets) {
      if (t.project === "L2") continue;
      const d = ticketDateOf(t);
      if (!d) continue; // a ticket without a day has no place on a day chart (no made-up date)
      if (!map[d]) {
        map[d] = {
          created: 0,
          closed: 0,
          projectCounts: {},
          avgResolution: 0,
          resolutionTimes: [],
        };
      }
      map[d].created += 1;
      map[d].projectCounts[t.project] = (map[d].projectCounts[t.project] || 0) + 1;

      if (isTicketDone(t)) {
        map[d].closed += 1;
        if (typeof t.resolutionMinutes === "number") {
          map[d].resolutionTimes.push(t.resolutionMinutes);
        }
      }
    }

    const sortedEntries = Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));

    let cumulativeBacklog = 0;
    return sortedEntries.map(([date, data]) => {
      cumulativeBacklog += data.created - data.closed;
      // a day without a closed ticket has no average (0 here, and the duration charts leave such days out)
      const avgRes = data.resolutionTimes.length
        ? Math.round(data.resolutionTimes.reduce((a, b) => a + b, 0) / data.resolutionTimes.length)
        : 0;
      return {
        date,
        created: data.created,
        closed: data.closed,
        backlog: Math.max(0, cumulativeBacklog),
        projectCounts: data.projectCounts,
        avgResolution: avgRes,
        resolutionSum: data.resolutionTimes.reduce((a, b) => a + b, 0),
        resolvedCount: data.resolutionTimes.length,
      };
    });
  }, [analyticsTickets]);

  // 3B. Bulan Lalu vs Bulan Ini: this month (WIB) against the same days of last month (lib/mom-comparison.ts). All tickets, like before:
  // the comparison is about the two months, not about the analytics filter.
  const momComparison = useMemo(() => buildMomComparison(tickets, todayWib), [tickets, todayWib]);

  // 4. Breakdown by Category / Type
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of analyticsTickets) {
      const type = t.type || t.category || "Incident";
      counts[type] = (counts[type] || 0) + 1;
    }
    // No tickets match the filter: keep the known categories listed with 0 (0%)
    if (analyticsTickets.length === 0) {
      for (const t of tickets) {
        const type = t.type || t.category || "Incident";
        counts[type] = 0;
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [analyticsTickets, tickets]);

  // 5. Breakdown by Priority
  const priorityCounts = useMemo(() => {
    const counts: Record<keyof typeof PRIORITY_COLORS, number> = {
      High: 0,
      Medium: 0,
      Low: 0,
    };
    for (const t of analyticsTickets) {
      const s = t.severity.toLowerCase();
      // three levels: an old "Critical" counts as High (lib/severity.ts)
      if (s === "critical" || s === "kritis" || s === "high" || s === "tinggi") counts.High += 1;
      else if (s === "medium" || s === "sedang") counts.Medium += 1;
      else counts.Low += 1;
    }
    return counts;
  }, [analyticsTickets]);

  // 8. Shift Load Matrix (Heatmap: Shift Subuh, Pagi, Malam vs Dates)
  const shiftHeatmapData = useMemo(() => {
    const shiftDefs = [
      { id: "Subuh", name: "Shift Subuh", time: "00:00–08:30 WIB", color: "#38bdf8" },
      { id: "Pagi", name: "Shift Pagi", time: "08:00–16:30 WIB", color: "#fbbf24" },
      { id: "Malam", name: "Shift Malam", time: "16:00–00:30 WIB", color: "#a855f7" },
    ];
    // Every day of the filtered range (days without tickets are zeros), so the totals below are the whole range's;
    // the dashboard chart groups these days into weeks or months when they do not fit (trafficView)
    const dateList = volumeByDate.length ? bucketRanges(volumeByDate[0].date, volumeByDate[volumeByDate.length - 1].date, "day").map((range) => range.date) : [];
    if (!dateList.length) dateList.push(todayWib);

    const dateSet = new Set(dateList);

    const matrix: Record<string, Record<string, number>> = {
      Subuh: {},
      Pagi: {},
      Malam: {},
    };
    for (const s of shiftDefs) {
      for (const d of dateList) matrix[s.id][d] = 0;
    }

    for (const t of analyticsTickets) {
      const d = ticketDateOf(t);
      if (!dateSet.has(d)) continue;

      let s = t.shift;
      if (!s && t.created && t.created.includes(":")) {
        const [h] = t.created.split(":").map(Number);
        if (h >= 0 && h < 8) s = "Subuh";
        else if (h >= 8 && h < 16) s = "Pagi";
        else s = "Malam";
      }

      if (s === "Subuh" || s?.toLowerCase().includes("subuh")) {
        matrix.Subuh[d] = (matrix.Subuh[d] || 0) + 1;
      } else if (s === "Pagi" || s?.toLowerCase().includes("pagi")) {
        matrix.Pagi[d] = (matrix.Pagi[d] || 0) + 1;
      } else {
        matrix.Malam[d] = (matrix.Malam[d] || 0) + 1;
      }
    }

    // Totals per shift
    const shiftTotals: Record<string, number> = {
      Subuh: Object.values(matrix.Subuh).reduce((a, b) => a + b, 0),
      Pagi: Object.values(matrix.Pagi).reduce((a, b) => a + b, 0),
      Malam: Object.values(matrix.Malam).reduce((a, b) => a + b, 0),
    };
    const grandTotal = shiftTotals.Subuh + shiftTotals.Pagi + shiftTotals.Malam;

    // Totals per date
    const dateTotals: Record<string, number> = {};
    for (const d of dateList) {
      dateTotals[d] = (matrix.Subuh[d] || 0) + (matrix.Pagi[d] || 0) + (matrix.Malam[d] || 0);
    }

    // Busiest shift
    let peakShift = shiftDefs[1]; // default Pagi
    let maxShiftCount = -1;
    for (const s of shiftDefs) {
      if (shiftTotals[s.id] > maxShiftCount) {
        maxShiftCount = shiftTotals[s.id];
        peakShift = s;
      }
    }

    return { shiftDefs, dateList, matrix, shiftTotals, dateTotals, grandTotal, peakShift };
  }, [analyticsTickets, volumeByDate, todayWib]);

  // The shift traffic chart on the dashboard: the same days, summed per week or month when a point per day would not fit its width
  const trafficGranularity = chooseGranularity(shiftHeatmapData.dateList[0], shiftHeatmapData.dateList[shiftHeatmapData.dateList.length - 1], Math.max(7, Math.floor(((trafficSize.width || 1000) - (mobile ? 66 : 82)) / (mobile ? 14 : 26)))) ?? "month";
  const trafficView = useMemo(() => {
    const { dateList, matrix } = shiftHeatmapData;
    const first = dateList[0];
    const buckets = bucketRanges(first, dateList[dateList.length - 1], trafficGranularity);
    const summed: Record<"Subuh" | "Pagi" | "Malam", Record<string, number>> = { Subuh: {}, Pagi: {}, Malam: {} };
    for (const bucket of buckets) for (const shift of ["Subuh", "Pagi", "Malam"] as const) summed[shift][bucket.date] = 0;
    for (const day of dateList) {
      const key = bucketKeyOf(day, trafficGranularity, first);
      for (const shift of ["Subuh", "Pagi", "Malam"] as const) summed[shift][key] = (summed[shift][key] || 0) + (matrix[shift][day] || 0);
    }
    const byKey = new Map(buckets.map((bucket) => [bucket.date, bucket]));
    const label = (key: string) => { const bucket = byKey.get(key); return bucket ? bucketAxisLabel(bucket, trafficGranularity) : key.slice(5); };
    const title = (key: string) => { const bucket = byKey.get(key); return bucket ? bucketTitle(bucket, trafficGranularity) : key; };
    return { dateList: buckets.map((bucket) => bucket.date), matrix: summed, label, title, first, last: dateList[dateList.length - 1] };
  }, [shiftHeatmapData, trafficGranularity]);

  // Resolution velocity: one point per day, week or month (a weighted average of every closed ticket in it); periods without a
  // closed ticket have no point instead of a made-up one
  const velocityGranularity = volumeByDate.length ? chooseGranularity(volumeByDate[0].date, volumeByDate[volumeByDate.length - 1].date, Math.max(7, Math.floor(((velocitySize.width || 1000) - (mobile ? 66 : 154)) / (mobile ? 14 : 26)))) ?? "month" : "day";
  const velocitySeries = useMemo(
    () => bucketVolume(volumeByDate, velocityGranularity).filter((bucket) => bucket.resolvedCount > 0).map((bucket) => ({ ...bucket, avgResolution: Math.round(bucket.resolutionSum / bucket.resolvedCount), title: bucketTitle(bucket, velocityGranularity), label: bucketAxisLabel(bucket, velocityGranularity) })),
    [volumeByDate, velocityGranularity]
  );
  // The four numbers above the chart are per closed ticket, so they do not move when the chart groups days into weeks
  const velocityKpis = useMemo(() => {
    const finished = analyticsTickets.filter((t) => t.project !== "L2" && isTicketDone(t) && typeof t.resolutionMinutes === "number");
    if (!finished.length) return null;
    const times = finished.map((t) => t.resolutionMinutes as number);
    // compliance against each ticket's own target (60 minutes for High, 120 for Medium/Low: lib/ticket-metrics.ts)
    return { avg: Math.round(times.reduce((a, b) => a + b, 0) / times.length), compliancePct: slaCompliance(finished).rate ?? 0, min: Math.min(...times), max: Math.max(...times), count: times.length };
  }, [analyticsTickets]);

  // Max volumes for scaling charts
  // The volume chart sums days into weeks or months when a bar per day would not fit its width (see volume-buckets.ts)
  const volumeMaxBars = mobile ? 45 : Math.max(7, Math.floor(((volumeSize.width || 1000) - 60) / 16));
  const volumeGranularity = volumeByDate.length ? chooseGranularity(volumeByDate[0].date, volumeByDate[volumeByDate.length - 1].date, volumeMaxBars) : "day";
  const volumeBars = useMemo(() => (volumeGranularity ? bucketVolume(volumeByDate, volumeGranularity) : []), [volumeByDate, volumeGranularity]);
  const maxDayCreated = Math.max(1, ...volumeBars.map((v) => v.created));
  const maxDayThroughput = Math.max(1, ...volumeByDate.map((v) => Math.max(v.created, v.closed, v.backlog)));
  const maxResTime = Math.max(70, ...volumeByDate.map((v) => v.avgResolution));

  // Compute Y-Ticks for main primary charts
  const stackedYTicks = useMemo(() => {
    if (!mobile) return computeYTicks(maxDayCreated);
    const peak = Math.max(1, ...volumeBars.map(day => Object.entries(day.projectCounts).reduce((sum, [project, count]) => sum + (hiddenCardProjects.has(project) ? 0 : count), 0)));
    const yMax = Math.max(4, Math.ceil(peak * 1.1));
    return { yMax, ticks: Array.from({ length: 5 }, (_, index) => Math.round(yMax * index / 4)) };
  }, [mobile, maxDayCreated, volumeBars, hiddenCardProjects]);
  const trajectoryYTicks = useMemo(() => computeYTicks(maxDayThroughput), [maxDayThroughput]);
  const resolutionYTicks = useMemo(() => computeYTicks(maxResTime), [maxResTime]);

  useEffect(() => {
    if (!mobile || !volumeChartRef.current) return;
    if (selectedChartTab !== "stacked-project") { volumeChartRef.current.scrollLeft = volumeChartRef.current.scrollWidth; return; }
    const geometry = compactVolumeGeometry(volumeBars.length, volumeSize.width);
    const peakIndex = volumeBars.findIndex(day => day.created === maxDayCreated);
    volumeChartRef.current.scrollLeft = geometry.fits ? 0 : Math.max(0, geometry.start + peakIndex * geometry.step - volumeSize.width / 2);
  }, [mobile, volumeBars, maxDayCreated, volumeSize.width, volumeChartRef, selectedChartTab]);

  useEffect(() => {
    if (!mobile || !volumeTouch) return;
    const outside = (event: PointerEvent) => { if (!(event.target as Element).closest("[data-volume-plot]")) setVolumeTouch(null); };
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") setVolumeTouch(null); };
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [mobile, volumeTouch]);

  // ── Operational Focus Computations ──

  // Selected Engineer Filter for quick ops coordination
  const [selectedEngineerFilter, setSelectedEngineerFilter] = useState<string | null>(null);

  // The two lists of the "Tiket Hari Ini" panel (not affected by the analytics filters):
  //  - "today": the tickets opened today, in WIB (not "the newest day in the data")
  //  - "open": every ticket that is not done yet, whatever day it was opened. A ticket with a completion time is done, whatever its status.
  const [todayView, setTodayView] = useState<"today" | "open">("today");
  const openedTodayTickets = useMemo(() => tickets.filter((t) => ticketDateOf(t) === todayWib).sort(newestFirst), [tickets, todayWib]);
  const stillOpenTickets = useMemo(() => tickets.filter((t) => !isTicketDone(t)).sort(newestFirst), [tickets]);
  const latestTicketDate = useMemo(() => tickets.reduce((latest, t) => { const day = ticketDateOf(t); return day > latest ? day : latest; }, ""), [tickets]);
  const todayTickets = todayView === "today" ? openedTodayTickets : stillOpenTickets;

  // Filtered today's tickets based on engineer selection
  const displayedTodayTickets = useMemo(() => {
    if (!selectedEngineerFilter) return todayTickets;
    return todayTickets.filter((t) =>
      normalizeName(t.owner) === normalizeName(selectedEngineerFilter)
    );
  }, [todayTickets, selectedEngineerFilter]);

  // Pagination for Today's Tickets (reactive local state + synchronized URL query)
  const [todayPage, setLocalTodayPage] = useState<number>(() => url.values.page || 1);
  const [todayPageSize, setLocalTodayPageSize] = useState<number>(() => url.values.size !== undefined ? url.values.size : 10);

  useEffect(() => {
    if (url.values.page && url.values.page !== todayPage) {
      setLocalTodayPage(url.values.page);
    }
  }, [url.values.page]);

  useEffect(() => {
    if (url.values.size !== undefined && url.values.size !== todayPageSize) {
      setLocalTodayPageSize(url.values.size);
    }
  }, [url.values.size]);

  const setTodayPage = useCallback((next: number | ((p: number) => number)) => {
    setLocalTodayPage((prev) => {
      const val = typeof next === "function" ? next(prev) : next;
      url.update({ page: val }, "push");
      return val;
    });
  }, [url]);

  const setTodayPageSize = useCallback((size: number) => {
    setLocalTodayPageSize(size);
    setLocalTodayPage(1);
    url.update({ size, page: 1 }, "replace");
  }, [url]);

  const todayTicketListRef = useRef<HTMLDivElement>(null);

  const effectivePageSize = todayPageSize === 0 ? displayedTodayTickets.length || 1 : todayPageSize;
  const totalTodayPages = Math.max(1, Math.ceil(displayedTodayTickets.length / effectivePageSize));
  const currentTodayPage = Math.min(todayPage, totalTodayPages);

  // Reset scroll to top when page, page size, or engineer filter changes
  useEffect(() => {
    if (todayTicketListRef.current) {
      todayTicketListRef.current.scrollTop = 0;
    }
  }, [currentTodayPage, todayPageSize, selectedEngineerFilter]);

  // Only show whole rows at rest (no half-cut row at the bottom of the scroll areas)
  const monitoringListRef = useRef<HTMLDivElement>(null);
  useWholeRowViewport(todayTicketListRef, [isLoading, isStale, currentTodayPage, todayPageSize, selectedEngineerFilter, displayedTodayTickets.length]);
  useWholeRowViewport(monitoringListRef, [isLoading, isStale, monitoringItems.length]);

  const paginatedTodayTickets = useMemo(() => {
    if (todayPageSize === 0) return displayedTodayTickets;
    const startIdx = (currentTodayPage - 1) * effectivePageSize;
    return displayedTodayTickets.slice(startIdx, startIdx + effectivePageSize);
  }, [displayedTodayTickets, currentTodayPage, effectivePageSize, todayPageSize]);

  // The shift on duty now (the only part of the old workload snapshot the page shows)
  const shiftWorkload = { currentShift: activeShift.shortLabel };

  // ── Task 3: Rekap Tiket per User (Today, Month, Year Breakdown & Detail Modal) ──
  interface UserSummaryData {
    name: string;
    role: string;
    initials: string;
    todayCount: number;
    weekCount: number;
    monthCount: number;
    yearCount: number;
    totalCount: number;
    todayBreakdown: Record<string, number>;
    weekBreakdown: Record<string, number>;
    monthBreakdown: Record<string, number>;
    yearBreakdown: Record<string, number>;
    totalBreakdown: Record<string, number>;
    recentTickets: Ticket[];
  }

  const [selectedUserDetail, setSelectedUserDetail] = useState<UserSummaryData | null>(null);
  const userModalRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // The data attribute owns the scroll lock; lifecycle cleanup restores focus.
  useEffect(() => {
    if (selectedUserDetail) {
      const trigger = document.activeElement as HTMLElement | null;
      const frame = requestAnimationFrame(() => userModalRef.current?.querySelector<HTMLElement>('button, [href]')?.focus({ preventScroll: true }));
      const closeOnBack = () => setSelectedUserDetail(null);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          setSelectedUserDetail(null);
        }
        if (e.key === "Tab" && userModalRef.current) {
          const items = [...userModalRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input, select, textarea, [tabindex="0"]')].filter(el => el.checkVisibility());
          const first = items[0], last = items[items.length - 1];
          if (e.shiftKey && (document.activeElement === first || !userModalRef.current.contains(document.activeElement))) { e.preventDefault(); last?.focus(); }
          else if (!e.shiftKey && (document.activeElement === last || !userModalRef.current.contains(document.activeElement))) { e.preventDefault(); first?.focus(); }
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("popstate", closeOnBack);
      return () => {
        cancelAnimationFrame(frame);
        window.removeEventListener("popstate", closeOnBack);
        window.removeEventListener("keydown", handleKeyDown);
        trigger?.focus({ preventScroll: true });
      };
    }
  }, [selectedUserDetail]);

  // Per person: the tickets they own that were opened today, this month and this year (WIB), counted from the tickets themselves.
  // The project, shift, status and severity filters apply; the date filter does not (these are fixed periods). Nobody gets a made-up figure:
  // a person without tickets has zeros.
  const userSummaries = useMemo<UserSummaryData[]>(() => {
    const getInitials = (name: string) => {
      const clean = name.replace(/^(Mhd\.|M\.)\s+/i, "").trim();
      const parts = clean.split(/\s+/);
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return clean.slice(0, 2).toUpperCase();
    };

    const rosterToUse = analyticsSelectedShifters.length > 0
      ? roster.filter((person) => analyticsSelectedShifters.includes(person.name))
      : roster;

    return rosterToUse.map((person) => {
      const staffTickets = ticketsWithoutDateFilter.filter((t) => matchesPerson(t, person)).sort(newestFirst);
      const counts = periodCounts(staffTickets, todayWib);

      return {
        name: person.name,
        role: person.role,
        initials: getInitials(person.name),
        todayCount: counts.today,
        weekCount: counts.week,
        monthCount: counts.month,
        yearCount: counts.year,
        totalCount: counts.total,
        todayBreakdown: counts.byProject.today,
        weekBreakdown: counts.byProject.week,
        monthBreakdown: counts.byProject.month,
        yearBreakdown: counts.byProject.year,
        totalBreakdown: counts.byProject.total,
        recentTickets: staffTickets.slice(0, 10),
      };
    }).sort((a, b) => a.name.localeCompare(b.name)); // Strictly alphabetical
  }, [ticketsWithoutDateFilter, roster, todayWib, analyticsSelectedShifters]);

  // CSV Export with enriched auditable fields
  const exportCsv = () => {
    const headers = [
      "ID",
      "Date",
      "Created Time",
      "Shift",
      "Project",
      "Category/Type",
      "Severity",
      "Status",
      "Response Time (mins)",
      "Resolution Time (mins)",
      "SLA Target (mins)",
      "SLA Met",
      "Aging (hours)",
      "Root Cause Category",
      "Subject",
    ];

    const rows = analyticsTickets.map((t) => {
      const status = slaStatus(t);
      return [
        `#${t.id}`,
        ticketDateOf(t),
        t.created,
        t.shift ?? "",
        t.project,
        t.type || t.category || "",
        t.severity,
        t.status,
        t.responseMinutes ?? "",
        t.resolutionMinutes ?? "",
        slaTargetFor(t),
        status === "met" ? "YES" : status === "breached" ? "NO (BREACHED)" : "PENDING",
        t.agingHours ? t.agingHours.toFixed(1) : "",
        t.rootCauseCategory ?? "",
        t.subject,
      ];
    });

    const csvContent = [csvLine(headers), ...rows.map((r) => csvLine(r))].join("\n");
    const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `noc-ticket-analytics-${dateFilterLabel(analyticsDateFilter, todayWib).toLowerCase().replace(/[^a-z0-9]/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify.success(`NOC Ticket Analytics (${dateFilterLabel(analyticsDateFilter, todayWib)}) berhasil diekspor ke CSV.`, {
      id: "ticket-report-csv",
    });
  };

  const printReport = () => {
    notify.info("Menyiapkan dialog cetak / PDF presentation-ready...", { id: "ticket-report-print" });
    window.setTimeout(() => window.print(), 250);
  };

  // Helper for Donut chart paths
  const renderDonutSlices = (
    data: { label: string; count: number; color: string }[],
    cx: number,
    cy: number,
    radius: number,
    strokeWidth: number,
    gapAngle: number = 0
  ) => {
    const totalVal = data.reduce((acc, curr) => acc + curr.count, 0);
    if (totalVal === 0) {
      return (
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="rgba(148, 163, 184, 0.2)"
          strokeWidth={strokeWidth}
        />
      );
    }

    const circumference = 2 * Math.PI * radius;
    let accumulatedAngle = 0;
    const nonZeroCount = data.filter((item) => item.count > 0).length;
    const effectiveGap = nonZeroCount > 1 ? gapAngle : 0;
    const gapLength = (effectiveGap / 360) * circumference;

    return data.map((item, idx) => {
      if (item.count === 0) return null;
      const slicePct = item.count / totalVal;
      const totalSliceLength = slicePct * circumference;
      const visibleLength = Math.max(0.5, totalSliceLength - gapLength);
      const strokeDasharray = `${visibleLength} ${circumference}`;
      const strokeDashoffset = -(accumulatedAngle * circumference + gapLength / 2);
      accumulatedAngle += slicePct;

      return (
        <circle
          key={item.label + idx}
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={item.color}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="donut-segment [transition:stroke-width_0.2s_ease,opacity_0.2s_ease] hover:[stroke-width:17] hover:opacity-95"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      );
    });
  };

  return (
    <div className="p-0 flex flex-col gap-5 w-full compact-ticket-report-container max-lg:gap-3 max-lg:[&_article]:scroll-mt-16 max-lg:text-[13px] max-lg:[&_[role=status]_span]:text-[11px] max-lg:[&_svg_text]:text-[11px] max-lg:[&_button:not(.monitoring-status-btn):not(.shift-filter-btn)]:min-h-11 max-lg:[&_button:not(.monitoring-status-btn):not(.shift-filter-btn)]:min-w-11 max-lg:[&_button]:touch-manipulation max-lg:[&_button]:shrink-0 max-lg:[&_.report-panel-body]:p-3.5 max-lg:[&_.report-panel-heading]:flex-nowrap max-lg:[&_.compact-chart-heading-left]:min-w-0 max-lg:[&_.compact-chart-heading-left]:flex-1 max-lg:[&_.panel-sub-count]:hidden max-lg:[&_small]:text-[11px] max-lg:[&_.ui-avatar]:[font-size:11px] max-lg:[&_.panel-title]:min-w-0 max-lg:[&_.panel-title]:whitespace-normal max-lg:[&_.panel-title]:text-[15px] max-lg:[&_.panel-title]:font-semibold max-lg:[&_.panel-title_svg]:shrink-0 max-lg:[&_.panel-view-action-btn]:h-11 max-lg:[&_.panel-view-action-btn]:min-h-11 max-lg:[&_.panel-view-action-btn_span]:inline motion-reduce:[&_*]:transition-none motion-reduce:[&_*]:animate-none">
      {/* ── Page Header ── */}
      <section className="page-heading flex justify-between items-end mb-[22px] max-lg:mb-0 max-[660px]:flex-col max-[660px]:items-start max-[660px]:gap-[12px] max-[640px]:mb-0">
        <div>
          <div className="eyebrow flex items-center gap-[8px] text-[var(--ink-muted)] text-[10px] max-lg:text-[11px] tracking-[1px] font-bold font-mono uppercase">
            <span className="inline-block w-[6px] h-[6px] min-w-[6px] min-h-[6px] rounded-[50%] bg-[#10b981] shrink-0 [animation:livePulse_1.8s_ease-in-out_infinite] live-dot live-dot-pulse" /> DASHBOARD · {activeClient.code}
          </div>
          <h1 className="m-[6px_0_4px] text-[var(--ink-primary)] text-[24px] max-lg:text-[22px] leading-[1.2] tracking-[-0.4px] font-bold">Dashboard</h1>
        </div>
      </section>

      {/* className="ops-focus-section" */}
      <div className="flex flex-col gap-[14px] bg-transparent border-none rounded-none p-0 ops-focus-section max-lg:gap-3">
        <PanelSkeletonWrapper
          reserveLoading={mobile}
          isLoading={isLoading}
          isStale={isStale}
          skeleton={<DashboardLiveOpsCommandBarSkeleton />}
          liveRegionText="Memuat status live ops..."
        >
          <div className="flex items-center justify-between gap-[12px] flex-wrap p-[2px_0_4px] ops-focus-header max-lg:flex-wrap max-lg:gap-2 max-lg:p-0 max-lg:min-h-7">
            <div className="inline-flex items-center gap-[10px] leading-none compact-ops-focus-header-left max-lg:shrink-0">
              <span className="inline-flex items-center justify-center gap-[6px] h-[22px] px-[9px] bg-[rgba(16,185,129,0.14)] border border-[rgba(16,185,129,0.32)] rounded-[99px] text-[10px] max-lg:text-[11px] font-extrabold text-[#10b981] tracking-[0.04em] whitespace-nowrap shrink-0 leading-none box-border ops-live-badge">
                <span className="inline-block w-[6px] h-[6px] min-w-[6px] min-h-[6px] rounded-[50%] bg-[#10b981] shrink-0 [animation:livePulse_1.8s_ease-in-out_infinite] live-dot live-dot-pulse" />
                LIVE OPS VIEW
              </span>
              <span className="inline-flex items-center text-[14px] font-bold text-[#f8fafc] leading-none m-0 tracking-[-0.01em] compact-ops-section-title max-lg:hidden">Operational Focus — Pantauan Real-Time &amp; Koordinasi Shift</span>
            </div>
            <span className={`inline-flex items-center gap-[6px] h-[26px] px-[12px] border rounded-[6px] text-[11.5px] text-[#cbd5e1] whitespace-nowrap shrink-0 leading-none box-border [&_strong]:font-bold ops-shift-badge ${SHIFT_BADGE_STYLES[shiftWorkload.currentShift.toLowerCase() as keyof typeof SHIFT_BADGE_STYLES] || "bg-[rgba(99,102,241,0.12)] border-[rgba(99,102,241,0.25)] text-[#cbd5e1] [&_strong]:text-[#818cf8]"}`}>
              Shift Aktif: <strong>Shift {shiftWorkload.currentShift}</strong>
            </span>
          </div>
        </PanelSkeletonWrapper>

        <div className="grid grid-cols-[minmax(0,1fr)_410px] max-[1140px]:grid-cols-1 gap-[16px] items-stretch w-full ops-focus-grid max-lg:gap-3 max-lg:grid-cols-1 max-lg:items-start">
          {/* Widget A — Today's Tickets Monitor (Tiket Hari Ini) */}
          <article className={`${REPORT_PANEL_CARD} ${MOBILE_OPS_CARD} flex flex-col h-full min-h-[580px] max-h-[660px] max-[1140px]:max-h-none max-[1140px]:h-auto ops-today-panel max-lg:order-2 max-lg:min-h-0 max-lg:max-h-none`}>
            <div data-ops-header className={`${REPORT_PANEL_HEADING} ${MOBILE_OPS_HEADING} shrink-0`}>
              <div className="flex flex-col gap-[2px] compact-chart-heading-left">
                <h2 data-ops-title className={`${REPORT_PANEL_TITLE} panel-title m-0`}>
                  <span className="max-lg:inline-flex max-lg:size-8 max-lg:shrink-0 max-lg:items-center max-lg:justify-center max-lg:rounded-[10px] max-lg:bg-sky-400/12 lg:contents"><ListChecks size={15} className="text-sky-400 max-lg:size-4" /></span>
                  <span className="max-lg:hidden">{todayView === "today" ? "Tiket Hari Ini" : "Tiket Masih Terbuka"}</span><span className="lg:hidden">Tiket</span>
                </h2>
              </div>
              <div className="flex items-center gap-[8px] max-lg:min-w-0 max-lg:justify-end">
                {!isLoading && (
                  <div role="group" aria-label="Pilih daftar tiket" className="inline-flex items-center gap-[2px] rounded-[7px] border border-[var(--line)] bg-[rgba(15,23,42,0.4)] p-[2px]">
                    {([["today", "Hari ini", "Hari ini", openedTodayTickets.length], ["open", "Masih terbuka", "Terbuka", stillOpenTickets.length]] as const).map(([id, label, shortLabel, count]) => (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={todayView === id}
                        title={id === "today" ? "Tiket yang dibuka hari ini (WIB)" : "Semua tiket yang belum selesai, dari hari mana pun"}
                        onClick={() => { setTodayView(id); setTodayPage(1); }}
                        className={`inline-flex items-center gap-[5px] rounded-[5px] px-[8px] py-[3px] text-[10.5px] font-semibold cursor-pointer transition-colors duration-150 max-lg:min-h-9 max-lg:text-[11px] ${todayView === id ? "bg-[rgba(56,189,248,0.18)] text-[#38bdf8]" : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"}`}
                      >
                        <span className="max-lg:hidden">{label}</span><span className="lg:hidden">{shortLabel}</span>
                        <span className="font-mono text-[10px] opacity-80">{count}</span>
                      </button>
                    ))}
                  </div>
                )}
                {selectedEngineerFilter && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-[4px] p-[2px_8px] rounded-[6px] border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.1)] text-[#f87171] text-[10px] max-lg:text-[11px] font-semibold cursor-pointer transition-all duration-150 ease-[ease] hover:bg-[rgba(239,68,68,0.2)] ops-filter-reset-btn"
                    onClick={() => {
                      setSelectedEngineerFilter(null);
                      setTodayPage(1);
                    }}
                    title="Hapus filter engineer"
                  >
                    <X size={11} /> Reset Filter ({selectedEngineerFilter})
                  </button>
                )}
                {isLoading ? (
                  <Skeleton width={56} height={20} borderRadius={99} tone="subtle" />
                ) : (
                  <span className="inline-flex px-[10px] py-[2px] rounded-[99px] text-[10px] max-lg:text-[11px] font-bold text-[#38bdf8] max-lg:text-[12px] max-lg:font-semibold bg-[rgba(56,189,248,0.12)] border border-[rgba(56,189,248,0.25)] whitespace-nowrap shrink-0 ops-count-badge">{displayedTodayTickets.length} tiket</span>
                )}
              </div>
            </div>
            <div data-ops-body className="report-panel-body p-3 sm:p-4 flex flex-col flex-1 min-h-0">
              <PanelSkeletonWrapper
          reserveLoading={mobile}
                isLoading={isLoading}
                isStale={isStale}
                error={error}
                onRetry={refetch}
                minHeight={mobile ? 647 : 520}
                className="h-full"
                loadingClassName="max-lg:flex-none max-lg:h-[647px] lg:min-h-[520px]"
                skeleton={<TodayTicketsSkeleton />}
                liveRegionText="Memuat tiket hari ini..."
              >
                {paginatedTodayTickets.length > 0 ? (
                  <>
                    <div
                      ref={todayTicketListRef}
                      role="list" aria-label={todayView === "today" ? "Tiket hari ini" : "Tiket yang masih terbuka"}
                      className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-2 [scrollbar-gutter:stable] [scrollbar-width:thin] [scrollbar-color:#334155_transparent] [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-slate-600 flex flex-col gap-[6px] today-ticket-list max-lg:gap-0 max-lg:flex-none max-lg:overflow-visible max-lg:pr-0 max-lg:[scrollbar-gutter:auto]"
                    >
                      {(mobile ? displayedTodayTickets : paginatedTodayTickets).map((ticket, ticketIndex) => {
                        const projColor = PROJECT_COLORS[ticket.project] || "#94a3b8";
                        const sev = ticket.severity.toLowerCase();
                        const priorityKey =
                          sev === "critical" || sev === "kritis"
                            ? "crit"
                            : sev === "high" || sev === "tinggi"
                            ? "high"
                            : sev === "medium" || sev === "sedang"
                            ? "med"
                            : "low";

                        const st = (ticket.status || "").toLowerCase().replace(/[\s_]+/g, "-");
                        const statusKey =
                          st === "closed" || st === "ditutup"
                            ? "closed"
                            : st === "open"
                            ? "open"
                            : st === "activity" || st === "aktivitas"
                            ? "activity"
                            : st === "meeting"
                            ? "meeting"
                            : st === "re-open" || st === "reopen"
                            ? "re-open"
                            : st === "pending"
                            ? "pending"
                            : st === "rca"
                            ? "rca"
                            : st === "escalated"
                            ? "escalated"
                            : "open";

                        const statusLabel = ticket.status || "Open";

                        return (
                          <TodayTicketRow key={ticket.id} ticket={ticket} projectColor={projColor} priorityStyle={OPS_PRIORITY_PILL_STYLES[priorityKey]} statusStyle={OPS_STATUS_PILL_STYLES[statusKey]} statusLabel={statusLabel} mobile={mobile} previewVisible={ticketsExpanded || (mobile ? ticketIndex >= (currentTodayPage - 1) * effectivePageSize && ticketIndex < (currentTodayPage - 1) * effectivePageSize + 4 : ticketIndex < 4)} lastVisible={ticketsExpanded ? ticketIndex === displayedTodayTickets.length - 1 : mobile ? ticketIndex === Math.min(displayedTodayTickets.length - 1, (currentTodayPage - 1) * effectivePageSize + 3) : ticketIndex === Math.min(paginatedTodayTickets.length - 1, 3)} />
                        );
                      })}
                    </div>

                    <div className="flex flex-col gap-3 p-4 pt-0 lg:hidden [&_button]:min-h-11 [&_[data-select-trigger]]:h-11">
                      {displayedTodayTickets.length > 4 && <button type="button" aria-expanded={ticketsExpanded} onClick={event => toggleCompactPreview(event.currentTarget.closest("article"), ticketsExpanded, setTicketsExpanded)} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-[#243044] px-3 text-[13px] font-semibold text-slate-300 hover:bg-slate-700 active:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">{ticketsExpanded ? "Ringkas" : `Lihat semua (${displayedTodayTickets.length})`}<ChevronRight size={16} /></button>}
                      <div className={ticketsExpanded ? "hidden" : "flex items-center justify-between gap-2 border-t border-slate-700/50 pt-3"}>
                        <div className="inline-flex h-11 min-w-0 items-center gap-1">
                          <button type="button" aria-label="Halaman tiket sebelumnya" disabled={currentTodayPage <= 1} onClick={() => setTodayPage(p => Math.max(1,p-1))} className="grid size-11 place-items-center rounded-lg border border-slate-700 disabled:opacity-30"><ChevronLeft size={16} /></button>
                          <span className="grid h-11 min-w-11 place-items-center font-mono text-[12px] text-slate-300">{currentTodayPage} / {totalTodayPages}</span>
                          <button type="button" aria-label="Halaman tiket berikutnya" disabled={currentTodayPage >= totalTodayPages} onClick={() => setTodayPage(p => Math.min(totalTodayPages,p+1))} className="grid size-11 place-items-center rounded-lg border border-slate-700 disabled:opacity-30"><ChevronRight size={16} /></button>
                        </div>
                        <Select label="Tampilkan" icon={<ListFilter size={16} />} aria-label="Jumlah tiket per halaman" value={todayPageSize} onChange={e => setTodayPageSize(Number(e.target.value))} className="h-11 w-[92px] min-w-[92px] max-w-[92px]"><option value={10}>10</option><option value={15}>15</option><option value={25}>25</option><option value={0}>Semua</option></Select>
                      </div>
                    </div>
                    {/* Pagination & Page Size Controls */}
                    <div className="flex items-center justify-between gap-[8px] shrink-0 pt-3 pb-1 border-t border-slate-700/50 compact-today-pagination max-lg:hidden">
                      <div className="flex items-center gap-[12px] flex-wrap compact-today-pagination-left">
                        <span className="font-mono text-[11px] text-[#94a3b8] [&_strong]:text-[#f8fafc] [&_strong]:font-bold compact-today-page-info">
                          Halaman <strong>{currentTodayPage}</strong> dari <strong>{totalTodayPages}</strong>
                          <span className="text-[#94a3b8] today-total-info"> ({displayedTodayTickets.length} tiket)</span>
                        </span>

                        <div className="inline-flex items-center gap-[3px] bg-[rgba(148,163,184,0.05)] p-[2px_4px] rounded-[6px] border border-[rgba(148,163,184,0.1)] compact-today-page-size-selector">
                          <span className="text-[10px] max-lg:text-[11px] text-[#94a3b8] font-medium mr-[2px] pl-[2px] page-size-label">Tampilkan:</span>
                          {[10, 15, 25].map((size) => {
                            const isActive = todayPageSize === size;
                            return (
                              <button
                                key={size}
                                type="button"
                                className={
                                  isActive
                                    ? "border-none p-[2px_6px] rounded-[4px] cursor-pointer text-[10px] max-lg:text-[11px] font-bold font-mono transition-all duration-150 ease-[ease] bg-[rgba(56,189,248,0.22)] text-[#38bdf8] page-size-btn active"
                                    : "border-none p-[2px_6px] rounded-[4px] cursor-pointer text-[10px] max-lg:text-[11px] font-semibold font-mono transition-all duration-150 ease-[ease] bg-transparent text-[#cbd5e1] hover:bg-[rgba(56,189,248,0.12)] hover:text-[#38bdf8] page-size-btn"
                                }
                                onClick={() => {
                                  setTodayPageSize(size);
                                }}
                                title={`Tampilkan ${size} tiket per halaman`}
                              >
                                {size}
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            className={
                              todayPageSize === 0
                                ? "border-none p-[2px_6px] rounded-[4px] cursor-pointer text-[10px] max-lg:text-[11px] font-bold font-mono transition-all duration-150 ease-[ease] bg-[rgba(56,189,248,0.22)] text-[#38bdf8] page-size-btn active"
                                : "border-none p-[2px_6px] rounded-[4px] cursor-pointer text-[10px] max-lg:text-[11px] font-semibold font-mono transition-all duration-150 ease-[ease] bg-transparent text-[#cbd5e1] hover:bg-[rgba(56,189,248,0.12)] hover:text-[#38bdf8] page-size-btn"
                            }
                            onClick={() => {
                              setTodayPageSize(0);
                            }}
                            title="Tampilkan semua tiket hari ini"
                          >
                            Semua
                          </button>
                        </div>
                      </div>

                      {totalTodayPages > 1 && (
                        <div className="flex items-center gap-[5px] compact-today-pagination-actions">
                          <button
                            type="button"
                            className="inline-flex items-center justify-center gap-[3px] p-[3px_8px] rounded-[6px] text-[10.5px] max-lg:text-[11px] font-semibold font-mono bg-[rgba(148,163,184,0.06)] border border-[rgba(148,163,184,0.15)] text-[#cbd5e1] cursor-pointer transition-all duration-150 ease-[ease] select-none enabled:hover:bg-[rgba(56,189,248,0.12)] enabled:hover:border-[rgba(56,189,248,0.35)] enabled:hover:text-[#38bdf8] disabled:opacity-30 disabled:cursor-not-allowed disabled:bg-[rgba(148,163,184,0.03)] disabled:border-[rgba(148,163,184,0.08)] disabled:text-[#94a3b8] today-page-btn today-page-nav"
                            onClick={() => setTodayPage((p) => Math.max(1, p - 1))}
                            disabled={currentTodayPage <= 1}
                            title="Halaman Sebelumnya"
                          >
                            <ChevronLeft size={13} />
                            <span>Prev</span>
                          </button>

                          <div className="flex items-center gap-[3px] compact-today-page-numbers">
                            {Array.from({ length: totalTodayPages }, (_, i) => i + 1).map((pageNum) => {
                              const isCurrent = pageNum === currentTodayPage;
                              return (
                                <button
                                  key={pageNum}
                                  type="button"
                                  className={
                                    isCurrent
                                      ? "inline-flex items-center justify-center gap-[3px] min-w-[24px] h-[24px] p-0 rounded-[6px] text-[10.5px] max-lg:text-[11px] font-bold font-mono cursor-pointer transition-all duration-150 ease-[ease] select-none bg-[rgba(56,189,248,0.18)] border border-[rgba(56,189,248,0.5)] text-[#38bdf8] today-page-btn today-page-num active"
                                      : "inline-flex items-center justify-center gap-[3px] min-w-[24px] h-[24px] p-0 rounded-[6px] text-[10.5px] max-lg:text-[11px] font-semibold font-mono cursor-pointer transition-all duration-150 ease-[ease] select-none bg-[rgba(148,163,184,0.06)] border border-[rgba(148,163,184,0.15)] text-[#cbd5e1] hover:bg-[rgba(56,189,248,0.12)] hover:border-[rgba(56,189,248,0.35)] hover:text-[#38bdf8] today-page-btn today-page-num"
                                  }
                                  onClick={() => setTodayPage(pageNum)}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}
                          </div>

                          <button
                            type="button"
                            className="inline-flex items-center justify-center gap-[3px] p-[3px_8px] rounded-[6px] text-[10.5px] max-lg:text-[11px] font-semibold font-mono bg-[rgba(148,163,184,0.06)] border border-[rgba(148,163,184,0.15)] text-[#cbd5e1] cursor-pointer transition-all duration-150 ease-[ease] select-none enabled:hover:bg-[rgba(56,189,248,0.12)] enabled:hover:border-[rgba(56,189,248,0.35)] enabled:hover:text-[#38bdf8] disabled:opacity-30 disabled:cursor-not-allowed disabled:bg-[rgba(148,163,184,0.03)] disabled:border-[rgba(148,163,184,0.08)] disabled:text-[#94a3b8] today-page-btn today-page-nav"
                            onClick={() => setTodayPage((p) => Math.min(totalTodayPages, p + 1))}
                            disabled={currentTodayPage >= totalTodayPages}
                            title="Halaman Berikutnya"
                          >
                            <span>Next</span>
                            <ChevronRight size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <CenteredEmptyState
                    className="flex-1 min-h-0 chart-empty-hint ops-empty-hint max-lg:h-[388.5px] max-lg:min-h-0 max-lg:flex-none"
                    icon={<CheckCircle2 size={24} />}
                    title={selectedEngineerFilter ? "Tidak ada tiket aktif" : todayView === "today" ? "Belum ada tiket hari ini" : "Tidak ada tiket yang masih terbuka"}
                    description={selectedEngineerFilter ? `Tidak ada tiket aktif yang ditugaskan ke ${selectedEngineerFilter}.` : todayView === "today" ? (latestTicketDate ? `Tiket terakhir masuk pada ${latestTicketDate}.` : "Belum ada tiket sama sekali.") : "Semua tiket sudah selesai."}
                  />
                )}
              </PanelSkeletonWrapper>
            </div>
          </article>

          {/* Right Column: Shift Notepad Memo & Monitoring Checklist (OK/NOK) */}
          <div className="flex flex-col gap-[12px] h-full min-h-[580px] max-h-[660px] max-[1140px]:min-h-0 max-[1140px]:h-auto ops-right-column max-lg:contents max-lg:min-h-0 max-lg:max-h-none">
            {/* Widget B — Shift Notepad / Memo */}
            <article className={`${REPORT_PANEL_CARD} ${MOBILE_OPS_CARD} shrink-0 ops-shift-panel flex flex-col max-lg:order-1 max-lg:[&.ops-shift-panel_.panel-view-action-btn]:size-11 max-lg:[&.ops-shift-panel_.panel-view-action-btn]:min-h-11 max-lg:[&.ops-shift-panel_.panel-view-action-btn]:min-w-11 max-lg:[&.ops-shift-panel_.panel-view-action-btn_span]:hidden max-lg:[&.ops-shift-panel_.panel-view-action-btn_svg]:size-4`}>
              <div data-ops-header className={`${REPORT_PANEL_HEADING} ${MOBILE_OPS_HEADING} flex items-center justify-between`}>
                <div className="flex flex-col gap-[2px] compact-chart-heading-left">
                  <h2 data-ops-title className={`${REPORT_PANEL_TITLE} panel-title m-0`}>
                    <span className="max-lg:inline-flex max-lg:size-8 max-lg:shrink-0 max-lg:items-center max-lg:justify-center max-lg:rounded-[10px] max-lg:bg-amber-400/12 lg:contents"><StickyNote size={14} className="text-amber-400 max-lg:size-4" /></span>
                    Memo &amp; Catatan Shift
                  </h2>
                </div>
                <PanelViewButton
                  panelTitle="Memo & Catatan Shift"
                  onClick={() => setMemoModalOpen(true)}
                  disabled={isLoading}
                />
              </div>
              <div data-ops-body className="flex flex-col flex-1 min-h-0 p-[10px_12px] report-panel-body">
                <PanelSkeletonWrapper
          reserveLoading={mobile}
                  isLoading={isLoading}
                  isStale={isStale}
                  error={error}
                  onRetry={refetch}
                  minHeight={mobile ? 172 : 160}
                  className="h-full"
                  loadingClassName="max-lg:flex-none lg:min-h-[160px]"
                skeleton={<ShiftMemoNotesSkeleton memo="" />}
                  liveRegionText="Memuat memo catatan shift..."
                >
                  <div className="flex flex-col flex-1 min-h-0 p-[10px_12px] bg-[#0b1120] border border-[rgba(148,163,184,0.12)] rounded-[8px] relative box-border memo-notepad-wrap max-lg:p-0 max-lg:border-0 max-lg:bg-transparent">
                    <MemoCard mobile={mobile} onOpen={() => setMemoModalOpen(true)} />
                  </div>
                </PanelSkeletonWrapper>
              </div>
            </article>

            {/* Widget C — Monitoring Checklist (OK / NOK) */}
            <article className={`${REPORT_PANEL_CARD} ${MOBILE_OPS_CARD} flex flex-col flex-1 min-h-[360px] max-h-[440px] max-[1140px]:max-h-none ops-engineer-panel max-lg:order-3 max-lg:min-h-0 max-lg:max-h-none`}>
              <div data-ops-header className={`${REPORT_PANEL_HEADING} ${MOBILE_OPS_HEADING}`}>
                <div className="flex flex-col gap-[2px] compact-chart-heading-left">
                  <h2 data-ops-title className={`${REPORT_PANEL_TITLE} panel-title m-0`}>
                    <span className="max-lg:inline-flex max-lg:size-8 max-lg:shrink-0 max-lg:items-center max-lg:justify-center max-lg:rounded-[10px] max-lg:bg-emerald-400/12 lg:contents"><ShieldCheck size={14} className="text-emerald-400 max-lg:size-4" /></span>
                    List Monitoring Shift
                  </h2>
                </div>
                <div className="flex items-center gap-[6px]">
                  {isLoading ? (
                    <>
                      <Skeleton width={48} height={20} borderRadius={99} tone="subtle" />
                      <Skeleton width={52} height={20} borderRadius={99} tone="subtle" />
                    </>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-[4px] p-[2px_8px] rounded-[99px] text-[10.5px] max-lg:text-[11px] font-bold bg-[rgba(16,185,129,0.14)] text-[#34d399] border border-[rgba(16,185,129,0.3)] mon-counter-badge ok max-lg:hidden">
                        <Check size={10} strokeWidth={2.5} /> {okCount} OK
                      </span>
                      <span className="inline-flex items-center gap-[4px] p-[2px_8px] rounded-[99px] text-[10.5px] max-lg:text-[11px] font-bold bg-[rgba(244,63,94,0.15)] text-[#fb7185] border border-[rgba(244,63,94,0.35)] mon-counter-badge nok max-lg:hidden">
                        <AlertTriangle size={10} strokeWidth={2.5} /> {nokCount} NOK
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div data-ops-body className="report-panel-body p-3 sm:p-4 flex flex-col flex-1 min-h-0 justify-start">
                <PanelSkeletonWrapper
          reserveLoading={mobile}
                  isLoading={isLoading}
                  isStale={isStale}
                  error={error}
                  onRetry={refetch}
                  minHeight={mobile ? 364 : 260}
                  className="h-full"
                  loadingClassName="max-lg:flex-none max-lg:h-[355.5px] lg:min-h-[260px]"
                skeleton={<MonitoringChecklistSkeleton />}
                  liveRegionText="Memuat checklist monitoring..."
                >
                  <div ref={monitoringListRef} role="list" aria-label="Checklist monitoring shift" className="flex flex-col gap-[7px] flex-1 min-h-0 overflow-y-auto max-h-[340px] pr-[6px] pb-2 [scrollbar-gutter:stable] [scrollbar-width:thin] [scrollbar-color:rgba(56,189,248,0.35)_transparent] [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-slate-800/20 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-600/70 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-sky-500/80 engineer-workload-list max-lg:flex-none max-lg:overflow-visible max-lg:max-h-none max-lg:pr-0 max-lg:[scrollbar-gutter:auto]">
                    {monitoringItems.map((item, monitoringIndex) => {
                      const isOk = item.status === "OK";
                      const isPending = item.status === "Belum";
                      return (
                        <div
                          key={item.id}
                          role="listitem" aria-label={`${item.task}, ${item.status}`}
                          className={`flex items-center justify-between gap-[10px] p-[7px_11px] rounded-[8px] shrink-0 cursor-default monitoring-check-card max-lg:p-0 max-lg:pl-1.5 max-lg:gap-2 ${!monitoringExpanded && monitoringIndex >= 5 ? "max-lg:hidden" : ""} ${
                            isOk || isPending
                              ? "bg-[rgba(255,255,255,0.025)] border border-[rgba(255,255,255,0.07)] hover:bg-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.12)]"
                              : "bg-[rgba(244,63,94,0.05)] border border-[rgba(244,63,94,0.25)] border-l-[3.5px] max-lg:border-l-[3px] [&.is-nok.is-nok]:border-l-[#f43f5e] hover:bg-[rgba(244,63,94,0.08)] hover:border-[rgba(244,63,94,0.32)] is-nok"
                          }`}
                        >
                          <div className="flex items-center gap-[10px] min-w-0 flex-1 monitoring-card-left">
                            <span className="inline-flex items-center justify-center min-w-[62px] p-[2.5px_8px] rounded-[5px] text-[10px] max-lg:text-[11px] font-bold font-mono bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.09)] text-[#cbd5e1] shrink-0 whitespace-nowrap text-center monitoring-proj-tag max-lg:min-w-[48px] max-lg:px-1" title={item.project}>
                              {item.project}
                            </span>
                            <div className="flex flex-col min-w-0 flex-1 gap-[1px] monitoring-card-content">
                              <span className="text-[11.5px] font-medium text-[#f8fafc] whitespace-nowrap overflow-hidden text-ellipsis leading-[1.3] monitoring-task-text max-lg:text-[13px]" title={item.task}>
                                {item.task}
                              </span>

                            </div>
                          </div>
                          <span
                            className={`inline-flex items-center justify-center gap-[5px] h-[24px] p-[0_9px] rounded-[6px] text-[10.5px] max-lg:text-[11px] font-bold font-mono cursor-default select-none shrink-0 tracking-[0.02em] monitoring-status-btn max-lg:h-11 max-lg:min-h-11 max-lg:w-14 max-lg:min-w-14 max-lg:px-1 ${
                              isOk
                                ? "bg-[rgba(16,185,129,0.12)] border border-[rgba(16,185,129,0.3)] text-[#34d399] btn-ok"
                                : isPending
                                ? "bg-[rgba(148,163,184,0.08)] border border-[rgba(148,163,184,0.22)] text-[#94a3b8] btn-pending"
                                : "bg-[rgba(244,63,94,0.14)] border border-[rgba(244,63,94,0.35)] text-[#fb7185] btn-nok"
                            }`}
                            title={isPending ? "Belum dinilai di halaman Monitoring" : `Status: ${item.status}`}
                          >
                            {isOk ? <Check size={11} strokeWidth={2.5} /> : isPending ? <Clock size={11} strokeWidth={2.5} /> : <X size={11} strokeWidth={2.5} />}
                            {item.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <button type="button" aria-expanded={monitoringExpanded} onClick={event => toggleCompactPreview(event.currentTarget.closest("article"), monitoringExpanded, setMonitoringExpanded)} className="lg:hidden mt-2 min-h-11 w-full rounded-lg border border-slate-700 text-[13px] font-semibold text-sky-400">{monitoringExpanded ? "Ringkas" : `Lihat semua (${monitoringItems.length})`}</button>
                  {/* Footer summary bar */}
                  <div className="flex items-center justify-between mt-auto pt-3 pb-1 border-t border-slate-700/50 shrink-0 gap-[8px] compact-engineer-workload-footer max-lg:mt-2 max-lg:pt-2 max-lg:[&_.compact-engineer-workload-stats]:text-[11px]">
                    <div className="flex items-center gap-[6px] text-[10.5px] max-lg:text-[11px] text-[#94a3b8] font-mono whitespace-nowrap shrink-0 [&_strong]:text-[#f8fafc] [&_strong]:font-bold compact-engineer-workload-stats">
                      <span
                        className="engineer-workload-stat-item"
                        title={`${assessedCount} dari ${monitoringItems.length} checkpoint sudah dinilai di halaman Monitoring (${okCount} OK, ${nokCount} NOK)`}
                      >
                        <span className="hidden lg:inline">Dinilai: <strong>{assessedCount} dari {monitoringItems.length} Checkpoint</strong></span><span className="lg:hidden">{assessedCount}/{monitoringItems.length} dinilai</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-[6px] text-[10.5px] max-lg:text-[11px] text-[#94a3b8] font-mono whitespace-nowrap shrink-0 [&_strong]:text-[#f8fafc] [&_strong]:font-bold compact-engineer-workload-stats">
                      <span className="engineer-workload-stat-item">
                        <span className="hidden lg:inline">Rata-rata: </span><strong>{assessedCount ? `${Math.round((okCount / assessedCount) * 100)}%` : "—"}</strong> Kesiapan
                      </span>
                    </div>
                  </div>
                </PanelSkeletonWrapper>
              </div>
            </article>
          </div>
        </div>
      </div>

      {/* ── ANALYTICS FILTER SECTION (Controls all charts & tables below, does NOT affect LIVE OPS VIEW) ── */}
      {/* className="analytics-filter-section" */}
      <div id="analytics-filter-section" className="flex flex-col gap-[12px] p-[14px_16px] bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-[12px] shadow-[var(--shadow-panel)] [transition:all_0.2s_ease] my-[6px] max-lg:my-0 hover:border-[rgba(56,189,248,0.25)] analytics-filter-section">
        <div className="flex items-center justify-between gap-[12px] flex-wrap analytics-filter-header max-lg:flex-nowrap max-lg:gap-2">
          <div className="flex flex-col gap-[2px] analytics-filter-title-wrap">
            <div className="inline-flex items-center gap-[7px] text-[13px] font-bold text-[#f8fafc] analytics-filter-title">
              <SlidersHorizontal size={14} className="text-sky-400" />
              <span className="hidden md:inline">Filter Laporan &amp; Analitik Tiket</span><span className="md:hidden">Filter</span>
            </div>
          </div>
          <div className="flex items-center gap-[8px] analytics-filter-header-right">
            <button type="button" onClick={() => setFiltersOpen(true)} className="order-last md:hidden min-h-11 px-3 rounded-lg border border-sky-500/30 bg-sky-500/10 text-[12px] font-semibold text-sky-300">Ubah</button>
            {isLoading ? (
              <Skeleton width={140} height={22} borderRadius={99} tone="subtle" />
            ) : (
              <span className="inline-flex items-center gap-[4px] p-[3px_10px] rounded-[99px] text-[11px] font-mono bg-[rgba(56,189,248,0.08)] border border-[rgba(56,189,248,0.22)] text-[#cbd5e1] [&_strong]:text-[#38bdf8] [&_strong]:font-bold analytics-filter-counter-badge">
                <span className="hidden md:inline">Menampilkan <strong>{analyticsTickets.length}</strong> dari <strong>{tickets.length}</strong> Tiket</span><span className="md:hidden"><strong>{analyticsTickets.length}</strong> tiket{activeFilterChips.length ? ` · ${activeFilterChips.length} filter` : ""}</span>
              </span>
            )}
            {isAnyAnalyticsFilterActive && (
              <button
                type="button"
                className="inline-flex items-center gap-[5px] p-[3px_9px] rounded-[6px] text-[11px] font-semibold text-[#f87171] bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] cursor-pointer [transition:all_0.15s_ease] hover:bg-[rgba(239,68,68,0.2)] hover:border-[rgba(239,68,68,0.4)] analytics-filter-reset-action-btn max-lg:hidden"
                onClick={resetAllAnalyticsFilters}
                title="Kembalikan semua filter ke default"
              >
                <RotateCcw size={12} /> Reset Filter
              </button>
            )}
          </div>
        </div>

        {activeFilterChips.length > 0 && <div aria-label="Filter aktif" className="flex gap-2 overflow-x-auto overscroll-x-contain md:hidden">{activeFilterChips.map(chip => <span key={chip.label} className="shrink-0 rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-1 text-[11px] text-sky-300">{chip.label}: {chip.value}</span>)}</div>}

        <ResponsiveSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filter analitik" dataSheetId="analytics-sheet" footer={<div className="grid grid-cols-2 gap-3"><button type="button" onClick={resetAllAnalyticsFilters} className="h-11 rounded-lg border border-slate-700 text-[13px] text-slate-200">Reset</button><button type="button" onClick={() => setFiltersOpen(false)} className="h-11 rounded-lg bg-sky-400 font-semibold text-[13px] text-slate-950">Terapkan</button></div>}>
        <div className="grid grid-cols-[minmax(210px,1.3fr)_repeat(auto-fit,minmax(140px,1fr))] max-[1024px]:grid-cols-2 max-[640px]:grid-cols-1 gap-[10px] items-end w-full analytics-filter-grid max-lg:gap-3 max-lg:[&_[data-select-trigger]]:h-11 max-lg:[&_.analytics-shifter-trigger]:h-11 max-lg:[&_.date-picker-input-wrapper]:h-11 max-lg:[&_.analytics-shifter-popover]:static max-lg:[&_.analytics-shifter-popover]:w-full max-lg:[&_.analytics-shifter-item]:min-h-11 max-lg:[&_.analytics-shifter-action]:min-h-10 max-lg:[&_.analytics-shifter-action]:min-w-10">
          {/* 1. Date Range Picker */}
          <div className="flex flex-col gap-[4px] min-w-0 analytics-filter-field date-field">
            <label className="text-[10.5px] max-lg:text-[11px] font-semibold text-[#94a3b8] tracking-[0.02em] analytics-filter-label">Rentang Tanggal</label>
            <div className="relative w-full lg:[&_.date-picker-input-wrapper]:h-[34px] lg:[&_[role='button']]:h-[34px] max-lg:[&_.date-picker-input-wrapper]:h-11 analytics-date-picker-wrap">
              <DatePicker
                value={dateFilterToPickerValue(analyticsDateFilter, todayWib)}
                onChange={value => setAnalyticsDateFilter(pickerValueToDateFilter(value, todayWib))}
                placeholder="Semua Waktu"
                referenceDate={todayWib}
                inlineCalendar={phone}
                aria-label="Filter tanggal analitik tiket"
              />
            </div>
          </div>

          {/* 2. Project Filter */}
          <div className="flex flex-col gap-[4px] min-w-0 analytics-filter-field">
            <label className="text-[10.5px] max-lg:text-[11px] font-semibold text-[#94a3b8] tracking-[0.02em] analytics-filter-label">Proyek</label>
            <div className="relative flex items-center w-full analytics-select-wrap">
              
              <Select icon={<FolderKanban size={16}  />}
                value={analyticsProjectFilter}
                onChange={(e) => setAnalyticsProjectFilter(e.target.value)}
                aria-label="Filter proyek"
                className="w-full h-[34px] p-[0_28px_0_30px] bg-[rgba(15,23,42,0.85)] border border-[rgba(148,163,184,0.16)] rounded-[7px] text-[11.5px] text-[#f8fafc] [appearance:none] [-webkit-appearance:none] cursor-pointer [transition:all_0.15s_ease] [outline:none] whitespace-nowrap overflow-hidden text-ellipsis [color-scheme:dark] hover:border-[rgba(56,189,248,0.3)] hover:bg-[rgba(15,23,42,0.95)] focus:border-[#38bdf8] focus:shadow-[0_0_0_2px_rgba(56,189,248,0.2)] [&_option]:bg-[#0f172a] [&_option]:text-[#f8fafc] [&_option]:p-[6px_10px] data-[active=true]:border-[rgba(56,189,248,0.45)] data-[active=true]:bg-[rgba(56,189,248,0.08)] data-[active=true]:text-[#38bdf8] data-[active=true]:font-semibold analytics-select-input"
                data-active={analyticsProjectFilter !== "All" ? "true" : undefined}
              >
                <option value="All">Semua Proyek</option>
                {[...new Set([...allProjects, ...newProjectFilters])].sort().map((p) => (
                  <option key={p} value={p}>{projectLabel(p, activeClientId, true)}</option>
                ))}
              </Select>
              
            </div>
          </div>

          {/* 3. Shift Filter */}
          <div className="flex flex-col gap-[4px] min-w-0 analytics-filter-field">
            <label className="text-[10.5px] max-lg:text-[11px] font-semibold text-[#94a3b8] tracking-[0.02em] analytics-filter-label">Shift</label>
            <div className="relative flex items-center w-full analytics-select-wrap">
              
              <Select icon={<Clock size={16}  />}
                value={analyticsShiftFilter}
                onChange={(e) => setAnalyticsShiftFilter(e.target.value)}
                aria-label="Filter shift"
                className="w-full h-[34px] p-[0_28px_0_30px] bg-[rgba(15,23,42,0.85)] border border-[rgba(148,163,184,0.16)] rounded-[7px] text-[11.5px] text-[#f8fafc] [appearance:none] [-webkit-appearance:none] cursor-pointer [transition:all_0.15s_ease] [outline:none] whitespace-nowrap overflow-hidden text-ellipsis [color-scheme:dark] hover:border-[rgba(56,189,248,0.3)] hover:bg-[rgba(15,23,42,0.95)] focus:border-[#38bdf8] focus:shadow-[0_0_0_2px_rgba(56,189,248,0.2)] [&_option]:bg-[#0f172a] [&_option]:text-[#f8fafc] [&_option]:p-[6px_10px] data-[active=true]:border-[rgba(56,189,248,0.45)] data-[active=true]:bg-[rgba(56,189,248,0.08)] data-[active=true]:text-[#38bdf8] data-[active=true]:font-semibold analytics-select-input"
                data-active={analyticsShiftFilter !== "All" ? "true" : undefined}
              >
                <option value="All">Semua Shift</option>
                <option value="Subuh">Shift Subuh (00:00–08:30)</option>
                <option value="Pagi">Shift Pagi (08:00–16:30)</option>
                <option value="Malam">Shift Malam (16:00–00:30)</option>
              </Select>
              
            </div>
          </div>

          {/* 4. Shifter (PIC) Multi-Select */}
          <div className="flex flex-col gap-[4px] min-w-0 analytics-filter-field shifter-field">
            <label className="text-[10.5px] max-lg:text-[11px] font-semibold text-[#94a3b8] tracking-[0.02em] analytics-filter-label">Shifter (PIC)</label>
            <AnalyticsShifterMultiSelect
              selectedList={analyticsSelectedShifters}
              onChange={setAnalyticsSelectedShifters}
              staffList={roster}
            />
          </div>

          {/* 5. Status Filter */}
          <div className="flex flex-col gap-[4px] min-w-0 analytics-filter-field">
            <label className="text-[10.5px] max-lg:text-[11px] font-semibold text-[#94a3b8] tracking-[0.02em] analytics-filter-label">Status Tiket</label>
            <div className="relative flex items-center w-full analytics-select-wrap">
              
              <Select icon={<Activity size={16}  />}
                value={
                  analyticsStatusFilter === "All"
                    ? "All"
                    : ["Open", "Closed", "Activity", "Meeting", "Re-Open", "Pending", "RCA"].find(
                        (opt) => opt.toLowerCase() === analyticsStatusFilter.toLowerCase()
                      ) || analyticsStatusFilter
                }
                onChange={(e) => setAnalyticsStatusFilter(e.target.value)}
                aria-label="Filter status tiket"
                className="w-full h-[34px] p-[0_28px_0_30px] bg-[rgba(15,23,42,0.85)] border border-[rgba(148,163,184,0.16)] rounded-[7px] text-[11.5px] text-[#f8fafc] [appearance:none] [-webkit-appearance:none] cursor-pointer [transition:all_0.15s_ease] [outline:none] whitespace-nowrap overflow-hidden text-ellipsis [color-scheme:dark] hover:border-[rgba(56,189,248,0.3)] hover:bg-[rgba(15,23,42,0.95)] focus:border-[#38bdf8] focus:shadow-[0_0_0_2px_rgba(56,189,248,0.2)] [&_option]:bg-[#0f172a] [&_option]:text-[#f8fafc] [&_option]:p-[6px_10px] data-[active=true]:border-[rgba(56,189,248,0.45)] data-[active=true]:bg-[rgba(56,189,248,0.08)] data-[active=true]:text-[#38bdf8] data-[active=true]:font-semibold analytics-select-input"
                data-active={analyticsStatusFilter !== "All" ? "true" : undefined}
              >
                <option value="All">Semua Status</option>
                <option value="Open">Open</option>
                <option value="Closed">Closed</option>
                <option value="Activity">Activity</option>
                <option value="Meeting">Meeting</option>
                <option value="Re-Open">Re-Open</option>
                <option value="Pending">Pending</option>
                <option value="RCA">RCA</option>
              </Select>
              
            </div>
          </div>

          {/* 6. Severity Filter */}
          <div className="flex flex-col gap-[4px] min-w-0 analytics-filter-field">
            <label className="text-[10.5px] max-lg:text-[11px] font-semibold text-[#94a3b8] tracking-[0.02em] analytics-filter-label">Keparahan</label>
            <div className="relative flex items-center w-full analytics-select-wrap">
              
              <Select icon={<AlertTriangle size={16}  />}
                value={analyticsSeverityFilter}
                onChange={(e) => setAnalyticsSeverityFilter(e.target.value)}
                aria-label="Filter keparahan"
                className="w-full h-[34px] p-[0_28px_0_30px] bg-[rgba(15,23,42,0.85)] border border-[rgba(148,163,184,0.16)] rounded-[7px] text-[11.5px] text-[#f8fafc] [appearance:none] [-webkit-appearance:none] cursor-pointer [transition:all_0.15s_ease] [outline:none] whitespace-nowrap overflow-hidden text-ellipsis [color-scheme:dark] hover:border-[rgba(56,189,248,0.3)] hover:bg-[rgba(15,23,42,0.95)] focus:border-[#38bdf8] focus:shadow-[0_0_0_2px_rgba(56,189,248,0.2)] [&_option]:bg-[#0f172a] [&_option]:text-[#f8fafc] [&_option]:p-[6px_10px] data-[active=true]:border-[rgba(56,189,248,0.45)] data-[active=true]:bg-[rgba(56,189,248,0.08)] data-[active=true]:text-[#38bdf8] data-[active=true]:font-semibold analytics-select-input"
                data-active={analyticsSeverityFilter !== "All" ? "true" : undefined}
              >
                <option value="All">Semua Severity</option>
                <option value="High">{severityLabel("High")}</option>
                <option value="Medium">{severityLabel("Medium")}</option>
                <option value="Low">{severityLabel("Low")}</option>
              </Select>
              
            </div>
          </div>
        </div>
        </ResponsiveSheet>
      </div>


      {/* ── 2. Primary Charts Section: Enhanced Stacked Bar per Project & Trajectory + Rekap Tiket per User ── */}
      {/* className="report-primary-chart-grid" */}
      <div className="grid grid-cols-[minmax(0,1fr)_340px] max-[1140px]:grid-cols-1 gap-[16px] items-stretch w-full max-lg:items-start max-lg:gap-3 report-primary-chart-grid">
        {/* Left: Volume per Project / Trajectory Chart (Tabs) */}
        <article className={`${REPORT_PANEL_CARD} flex flex-col h-full min-h-[580px] max-lg:min-h-0 primary-chart-panel max-lg:[&.primary-chart-panel.primary-chart-panel_.panel-view-action-btn]:size-10 max-lg:[&.primary-chart-panel.primary-chart-panel_.panel-view-action-btn]:min-h-10 max-lg:[&.primary-chart-panel.primary-chart-panel_.panel-view-action-btn]:min-w-10 max-lg:[&.primary-chart-panel.primary-chart-panel_.panel-view-action-btn_span]:hidden`}>
          <div className={`${REPORT_PANEL_HEADING} report-panel-heading`}>
            <div className="flex flex-col gap-[2px] compact-chart-heading-left">
              <div className="flex items-center gap-[8px] text-[14px] font-bold text-[var(--ink-primary)] panel-title">
                <span className="hidden lg:inline">{selectedChartTab === "stacked-project" ? "Ticket Volume per Project (Stacked by System)" : "Perbandingan Tiket: Bulan Lalu vs Bulan Ini (MoM)"}</span><span className="lg:hidden">{selectedChartTab === "stacked-project" ? "Volume Tiket" : "Tiket MoM"}</span>
              </div>
            </div>

            <div className="flex items-center gap-[8px]">
              <div className="flex gap-[6px] bg-[rgba(15,23,42,0.4)] p-[3px] rounded-[8px] border border-[var(--line)] chart-tab-controls max-lg:gap-2 max-lg:p-0 max-lg:border-0 max-lg:bg-transparent">
                <button
                  type="button"
                  className={`inline-flex items-center gap-[6px] p-[4px_10px] rounded-[6px] text-[11.5px] border border-transparent cursor-pointer [transition:all_0.15s_ease] ${
                    selectedChartTab === "stacked-project"
                      ? "bg-[rgba(56,189,248,0.14)] border-[#38bdf8]/40 text-[#38bdf8] font-bold active"
                      : "bg-transparent text-[var(--ink-secondary)] font-semibold hover:text-[var(--ink-primary)]"
                  } chart-tab-btn max-lg:px-2`}
                  onClick={() => setSelectedChartTab("stacked-project")}
                >
                  <BarChart3 size={12} className="max-lg:hidden" /><span className="hidden lg:inline">Volume per Project</span><span className="lg:hidden">Vol</span>
                </button>
                <button
                  type="button"
                  className={`inline-flex items-center gap-[6px] p-[4px_10px] rounded-[6px] text-[11.5px] border border-transparent cursor-pointer [transition:all_0.15s_ease] ${
                    selectedChartTab === "trajectory"
                      ? "bg-[rgba(56,189,248,0.14)] border-[#38bdf8]/40 text-[#38bdf8] font-bold active"
                      : "bg-transparent text-[var(--ink-secondary)] font-semibold hover:text-[var(--ink-primary)]"
                  } chart-tab-btn max-lg:px-2`}
                  onClick={() => setSelectedChartTab("trajectory")}
                >
                  <TrendingUp size={12} className="max-lg:hidden" /><span className="hidden lg:inline">Bulan Lalu vs Bulan Ini</span><span className="lg:hidden">MoM</span>
                </button>
              </div>
              <PanelViewButton
                panelTitle={
                  selectedChartTab === "stacked-project"
                    ? "Ticket Volume per Project"
                    : "Perbandingan Tiket: Bulan Lalu vs Bulan Ini"
                }
                onClick={() =>
                  handleOpenPanel(
                    selectedChartTab === "stacked-project"
                      ? "ticket-volume"
                      : "ticket-mom"
                  )
                }
                ariaLabel={
                  selectedChartTab === "stacked-project"
                    ? "Perbesar panel Volume Tiket per Project"
                    : "Perbesar panel Perbandingan Bulan Lalu vs Bulan Ini"
                }
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="flex flex-col flex-1 justify-start p-[16px_20px] gap-[12px] report-panel-body">
            <PanelSkeletonWrapper
          reserveLoading={mobile}
              isLoading={isLoading}
              isStale={isStale}
              error={error}
              onRetry={refetch}
              minHeight={mobile ? 303 : 300}
              className="h-full"
              loadingClassName="max-lg:flex-none max-lg:h-[303px] lg:min-h-[300px]"
                skeleton={<TicketVolumeChartSkeleton />}
              liveRegionText="Memuat volume tiket..."
            >
            {/* View A: Stacked Bar Chart per Project (Enhanced Sizing, Wide Bars, Distinct Gridlines & Y-Axis Scale) */}
            {selectedChartTab === "stacked-project" && (
              <div className="relative flex flex-col flex-1 w-full justify-start gap-[12px] stacked-chart-container">
                {volumeByDate.length > 0 && !volumeGranularity ? (
                  <div role="status" className="flex flex-1 min-h-[300px] w-full flex-col items-center justify-center gap-4 rounded-xl px-6 py-10 text-center bg-[radial-gradient(circle_at_50%_45%,rgba(251,191,36,0.06),transparent_60%)] max-lg:min-h-[260px]">
                    <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-full border border-amber-400/25 bg-amber-400/10 text-amber-300 shadow-[0_0_0_6px_rgba(251,191,36,0.05)]"><Calendar size={20} /></span>
                    <div className="flex max-w-[360px] flex-col gap-1">
                      <p className="m-0 text-[15px] font-semibold leading-snug text-[#f8fafc]">Rentang terlalu panjang untuk grafik ini</p>
                      <p className="m-0 text-[13px] leading-snug text-[#94a3b8]">{analyticsTickets.length} tiket dari {volumeByDate[0].date} sampai {volumeByDate[volumeByDate.length - 1].date} tidak muat ditampilkan, bahkan per bulan. Persempit rentang tanggal untuk melihat grafiknya.</p>
                    </div>
                  </div>
                ) : volumeByDate.length > 0 ? (
                  <>
                    {volumeGranularity && volumeGranularity !== "day" && (
                      <ChartModeNote badge={granularityBadge(volumeGranularity)} detail="Klik batang untuk melihat rincian periodenya.">
                        {granularityNote(volumeByDate[0].date, volumeByDate[volumeByDate.length - 1].date, volumeGranularity)}
                      </ChartModeNote>
                    )}
                    <div className="hidden h-4 shrink-0 items-center justify-between gap-2 whitespace-nowrap text-[11px] leading-4 text-slate-400 max-lg:flex">
                      <span>Total {analyticsTickets.length} · Puncak {maxDayCreated} ({(() => { const peak = volumeBars.find(day => day.created === maxDayCreated); return peak ? bucketAxisLabel(peak, volumeGranularity ?? "day") : ""; })()})</span>
                      <span className="font-mono">{volumeBars[0].date.slice(5)}–{volumeBars.at(-1)?.to.slice(5)}</span>
                    </div>
                    {(() => {
                      const granularity = volumeGranularity ?? "day";
                      const n = volumeBars.length;
                      const compact = compactVolumeGeometry(n, volumeSize.width);
                      // Desktop draws in real pixels (the viewBox is the measured width), so nothing is stretched: bars share the width evenly.
                      const svgViewBoxWidth = mobile ? compact.width : Math.max(320, Math.round(volumeSize.width || 760));
                      const plotLeft = 48;
                      const slot = (svgViewBoxWidth - 12 - plotLeft) / Math.max(1, n);
                      const stepX = mobile ? compact.step : slot;
                      const barWidth = mobile ? compact.bar : Math.max(4, Math.min(48, Math.round(slot * 0.62)));
                      const centerX = (idx: number) => (mobile ? compact.start + idx * compact.step : plotLeft + slot * (idx + 0.5));
                      const labelEvery = Math.max(1, Math.ceil((granularity === "day" ? 42 : 52) / slot));
                      // On a phone the last bar always gets its label, so the regular label just before it steps aside when it would collide
                      const mobileLabelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(volumeSize.width / 55))));
                      const showAllValues = slot >= 26;

                      // ...and in the height the panel gives it (the svg is laid over its box, so it never pushes the panel taller)
                      const viewBoxHeight = mobile ? 220 : Math.max(280, Math.round(volumeSize.height || 360));
                      const baselineY = mobile ? 184 : viewBoxHeight - 38;
                      const topY = mobile ? 16 : 26;
                      const chartHeight = baselineY - topY;

                      // Where every bar and its segments sit, computed once for the drawing layer and the hover layer
                      const barGeometry = volumeBars.map((item, idx) => {
                        const visibleTotal = Object.entries(item.projectCounts).reduce((sum, [project, count]) => sum + (hiddenCardProjects.has(project) ? 0 : count), 0);
                        const x = mobile ? centerX(idx) - barWidth / 2 : Math.round(centerX(idx) - barWidth / 2);
                        let top = baselineY;
                        const segments = Object.entries(item.projectCounts)
                          .filter(([project]) => !(mobile && hiddenCardProjects.has(project)))
                          .map(([project, count]) => {
                            const height = mobile ? count / Math.max(1, visibleTotal) * Math.max(visibleTotal > 0 ? 3 : 0, visibleTotal / stackedYTicks.yMax * chartHeight) : Math.max(2, (count / stackedYTicks.yMax) * chartHeight);
                            top -= height;
                            return { project, count, y: top, height, color: PROJECT_COLORS[project] || "#94a3b8" };
                          });
                        return { item, x, center: x + barWidth / 2, top, visibleTotal, segments };
                      });

                      return (
                        <div data-volume-plot className="contents max-lg:block max-lg:relative max-lg:w-full max-lg:pl-9 max-lg:h-[220px]" onPointerDown={event => {
                          if (!mobile) return;
                          const box = event.currentTarget.getBoundingClientRect();
                          const x = event.clientX - box.left - 36 + (volumeChartRef.current?.scrollLeft ?? 0);
                          setVolumeTouch({ index: Math.max(0, Math.min(n - 1, Math.round((x - compact.start) / (compact.step || 1)))), x: Math.max(4, Math.min(box.width - Math.min(220, box.width - 8) - 4, event.clientX - box.left - 110)) });
                        }} onPointerMove={event => {
                          if (!mobile || !event.buttons) return;
                          const box = event.currentTarget.getBoundingClientRect();
                          const x = event.clientX - box.left - 36 + (volumeChartRef.current?.scrollLeft ?? 0);
                          setVolumeTouch({ index: Math.max(0, Math.min(n - 1, Math.round((x - compact.start) / (compact.step || 1)))), x: Math.max(4, Math.min(box.width - Math.min(220, box.width - 8) - 4, event.clientX - box.left - 110)) });
                        }}>
                        {mobile && <svg aria-hidden="true" viewBox="0 0 36 220" className="hidden max-lg:block absolute left-0 top-0 h-[220px] w-9 text-slate-400">
                          {stackedYTicks.ticks.map(tick => <text key={tick} x="30" y={184 - tick / stackedYTicks.yMax * 168 + 4} textAnchor="end" fill="currentColor" fontSize="11" fontFamily="var(--font-mono)">{tick}</text>)}
                        </svg>}
                        <div ref={volumeChartRef} aria-label="Volume tiket per tanggal; ketuk atau geser untuk rincian" className={"relative w-full overflow-x-auto overflow-y-hidden flex-1 flex flex-col justify-start min-h-[300px] compact-svg-barchart-wrap max-lg:min-h-[220px] max-lg:h-[220px] max-lg:flex-none max-lg:overscroll-x-contain max-lg:[scrollbar-width:none] max-lg:[&::-webkit-scrollbar]:hidden " + (compact.fits ? " max-lg:touch-pan-y " : " max-lg:touch-auto ") + volumeFade}>
                          <svg
                            style={mobile ? { width: svgViewBoxWidth, height: 220, flexShrink: 0 } : undefined}
                            className={mobile ? "w-full block compact-report-bar-svg-lg max-lg:min-h-[220px] max-lg:h-[220px]" : "absolute inset-0 size-full block compact-report-bar-svg-lg"}
                            viewBox={`0 0 ${svgViewBoxWidth} ${viewBoxHeight}`}
                            preserveAspectRatio={mobile ? "none" : "xMidYMid meet"}
                          >
                            {/* Subtle Horizontal Gridlines & Y-Axis Scale */}
                            {stackedYTicks.ticks.map((tick) => {
                              const yPos = baselineY - Math.round((tick / stackedYTicks.yMax) * chartHeight);
                              return (
                                <g key={`grid-stacked-${tick}`}>
                                  <line
                                    x1={mobile ? 0 : plotLeft - 4}
                                    y1={yPos}
                                    x2={svgViewBoxWidth - (mobile ? 15 : 8)}
                                    y2={yPos}
                                    stroke="rgba(255, 255, 255, 0.08)"
                                    strokeWidth="1"
                                    strokeDasharray={tick === 0 ? undefined : "4 4"}
                                  />
                                  {!mobile && <text
                                    className="max-lg:hidden"
                                    x={plotLeft - 12}
                                    y={yPos + 4}
                                    textAnchor="end"
                                    fill="var(--ink-muted)"
                                    fontSize="10"
                                    fontWeight="600"
                                    fontFamily="var(--font-mono)"
                                  >
                                    {tick}
                                  </text>}
                                </g>
                              );
                            })}

                            {/* Solid Floor Baseline */}
                            <line x1={mobile ? 0 : plotLeft - 4} y1={baselineY} x2={svgViewBoxWidth - (mobile ? 15 : 8)} y2={baselineY} stroke="var(--line)" strokeWidth="1.5" />

                            {/* Bars. Drawing only: the hover layer below takes the pointer, so moving across the segments of a bar changes nothing */}
                            {barGeometry.map((bar, idx) => {
                              const item = bar.item;
                              const isSelected = Boolean(selectedDate && selectedDate >= item.date && selectedDate <= item.to);
                              const regularLabel = idx % labelEvery === 0;
                              const showLabel = mobile ? (idx % mobileLabelEvery === 0 && n - 1 - idx >= mobileLabelEvery) || idx === n - 1 : regularLabel || isSelected;
                              return (
                                <g key={item.date} className="stacked-bar" aria-hidden="true" pointerEvents="none">
                                  {/* Background selected highlight column */}
                                  {isSelected && (
                                    <rect
                                      x={bar.x - 6}
                                      y={topY}
                                      width={barWidth + 12}
                                      height={chartHeight + 4}
                                      fill="rgba(56, 189, 248, 0.15)"
                                      stroke="rgba(56, 189, 248, 0.65)"
                                      strokeWidth="1.5"
                                      strokeDasharray="4 3"
                                      rx={8}
                                    />
                                  )}

                                  {/* Stacked Project segments */}
                                  {bar.segments.map((segment) => (
                                    <rect
                                      key={segment.project}
                                      x={bar.x}
                                      y={segment.y}
                                      width={barWidth}
                                      height={segment.height}
                                      fill={segment.color}
                                      rx={barWidth >= 12 ? 3 : 1.5}
                                      opacity={isSelected ? 1 : 0.92}
                                      stroke={isSelected ? "rgba(255, 255, 255, 0.4)" : "var(--panel-bg)"}
                                      strokeWidth={mobile || barWidth < 12 ? "0.5" : isSelected ? "1" : "1.5"}
                                    />
                                  ))}

                                  {/* Total count badge above bar */}
                                  {(mobile ? idx === n - 1 || item.created === maxDayCreated : item.created > 0 && (showAllValues || item.created === maxDayCreated || isSelected)) && <text
                                    x={mobile ? Math.min(svgViewBoxWidth - 18, Math.max(18, bar.center)) : bar.center}
                                    y={bar.top - 8}
                                    textAnchor="middle"
                                    fill={isSelected ? "#38bdf8" : "var(--ink-primary)"}
                                    fontSize="11"
                                    fontWeight="800"
                                    fontFamily="var(--font-mono)"
                                  >
                                    {mobile ? bar.visibleTotal : item.created}
                                  </text>}

                                  {/* Date label on X-axis: the regular ones (the hovered bar names its date in its tooltip) */}
                                  {showLabel && <text
                                    x={mobile ? Math.min(svgViewBoxWidth - 20, Math.max(20, bar.center)) : Math.min(svgViewBoxWidth - 26, Math.max(22, bar.center))}
                                    y={baselineY + 22}
                                    textAnchor="middle"
                                    fill={isSelected ? "var(--accent-blue)" : "var(--ink-primary)"}
                                    fontSize={mobile ? "11" : "10.5"}
                                    fontWeight={isSelected ? "800" : "600"}
                                    fontFamily="var(--font-mono)"
                                    paintOrder="stroke"
                                    stroke={!mobile && !regularLabel ? "var(--panel-bg)" : undefined}
                                    strokeWidth={6}
                                  >
                                    {bucketAxisLabel(item, granularity)}
                                  </text>}

                                  {/* Selected indicator dot */}
                                  {isSelected && <circle cx={bar.center} cy={baselineY + 33} r={2.5} fill="var(--accent-blue)" />}
                                </g>
                              );
                            })}

                            {/* Hover layer, on top of every bar. Each column covers its whole slot (no dead gaps, no overlap with its neighbours),
                                and its highlight and tooltip are shown by CSS (:hover / :focus-visible): no React state, so hovering re-renders nothing. */}
                            {barGeometry.map((bar) => {
                              const item = bar.item;
                              const isSelected = Boolean(selectedDate && selectedDate >= item.date && selectedDate <= item.to);
                              const title = granularity === "day" ? formatDay(item.date) : bucketTitle(item, granularity);
                              const toggleSelected = () => setSelectedDate(isSelected ? null : item.date);
                              const slot = Math.max(barWidth, stepX);
                              const top = [...bar.segments].sort((a, b) => b.count - a.count);
                              const rows = top.slice(0, 3);
                              const rest = top.slice(3).reduce((sum, segment) => sum + segment.count, 0);
                              const tipWidth = 184;
                              const tipHeight = 46 + (rows.length + (rest ? 1 : 0)) * 16;
                              // above the bar when there is room, otherwise beside it (to the right, or to the left near the right edge)
                              const roomAbove = bar.top - 10 - tipHeight >= 4;
                              const besideRight = bar.center + barWidth / 2 + 10 + tipWidth <= svgViewBoxWidth - 4;
                              const tipX = roomAbove
                                ? Math.min(svgViewBoxWidth - tipWidth - 4, Math.max(plotLeft, bar.center - tipWidth / 2))
                                : besideRight ? bar.center + barWidth / 2 + 10 : bar.center - barWidth / 2 - 10 - tipWidth;
                              const tipY = roomAbove ? bar.top - 10 - tipHeight : Math.max(4, Math.min(baselineY - tipHeight, bar.top));
                              return (
                                <g
                                  key={item.date}
                                  role="button"
                                  tabIndex={0}
                                  data-focus-ring="none"
                                  aria-label={`Rincian tiket ${title}: ${item.created} tiket`}
                                  aria-pressed={isSelected}
                                  onClick={toggleSelected}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      toggleSelected();
                                    }
                                  }}
                                  className={`group outline-none max-lg:snap-center stacked-bar-group [cursor:pointer]! ${isSelected ? "is-selected" : ""}`}
                                >
                                  <rect x={bar.center - slot / 2} y={topY - 4} width={slot} height={chartHeight + 34} fill="transparent" />
                                  {!isSelected && (
                                    <rect
                                      x={bar.x - 6}
                                      y={topY}
                                      width={barWidth + 12}
                                      height={chartHeight + 4}
                                      fill="rgba(56, 189, 248, 0.1)"
                                      stroke="rgba(56, 189, 248, 0.35)"
                                      strokeWidth="1"
                                      rx={8}
                                      pointerEvents="none"
                                      className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                                    />
                                  )}
                                  {!mobile && (
                                    <g pointerEvents="none" className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">
                                      <rect x={tipX} y={tipY} width={tipWidth} height={tipHeight} rx={8} fill="#0b1220" fillOpacity="0.96" stroke="rgba(56, 189, 248, 0.4)" strokeWidth="1" />
                                      <text x={tipX + 12} y={tipY + 19} fill="#f8fafc" fontSize="11.5" fontWeight="700">{title}</text>
                                      <text x={tipX + 12} y={tipY + 36} fill="#38bdf8" fontSize="11" fontWeight="700" fontFamily="var(--font-mono)">{item.created} tiket</text>
                                      {rows.map((segment, rowIndex) => (
                                        <g key={segment.project}>
                                          <rect x={tipX + 12} y={tipY + 46 + rowIndex * 16} width={8} height={8} rx={2} fill={segment.color} />
                                          <text x={tipX + 26} y={tipY + 54 + rowIndex * 16} fill="#cbd5e1" fontSize="10.5">{projectLabel(segment.project, activeClientId)}</text>
                                          <text x={tipX + tipWidth - 12} y={tipY + 54 + rowIndex * 16} textAnchor="end" fill="#f8fafc" fontSize="10.5" fontWeight="700" fontFamily="var(--font-mono)">{segment.count}</text>
                                        </g>
                                      ))}
                                      {rest > 0 && (
                                        <text x={tipX + 26} y={tipY + 54 + rows.length * 16} fill="#94a3b8" fontSize="10.5">+{top.length - rows.length} sistem lain · {rest}</text>
                                      )}
                                    </g>
                                  )}
                                </g>
                              );
                            })}
                          </svg>
                        </div>
                        {mobile && volumeTouch && volumeBars[volumeTouch.index] && <div role="status" aria-live="polite" className="pointer-events-none absolute top-1 z-10 w-[220px] max-w-[calc(100%-8px)] rounded-lg border border-sky-400/40 bg-slate-900/95 p-2 text-[11px] leading-4 text-slate-200 shadow-lg" style={{ left: volumeTouch.x }}>
                          <div className="font-semibold text-sky-300">{bucketTitle(volumeBars[volumeTouch.index], granularity)} · Total {volumeBars[volumeTouch.index].created}</div>
                          <div>{Object.entries(volumeBars[volumeTouch.index].projectCounts).slice(0, 3).map(([project, count]) => project + ": " + count).join(" · ")}</div>
                        </div>}
                        </div>
                      );
                    })()}

                    {/* Stacked Bar Legend */}
                    <HorizontalScroll className="flex items-center gap-[8px] flex-wrap pt-[10px] mt-0 [border-top:1px_solid_var(--line)] project-legend-pills max-lg:flex-nowrap max-lg:overflow-x-auto max-lg:overscroll-x-contain max-lg:[&_.project-legend-pill]:shrink-0">
                      <span className="text-[11px] font-bold font-mono text-[var(--ink-muted)] legend-pills-label">Sistem:</span>
                      {allProjects.map((proj) => (
                        <div role={mobile ? "button" : undefined} tabIndex={mobile ? 0 : undefined} aria-pressed={mobile ? !hiddenCardProjects.has(proj) : undefined} onClick={mobile ? () => toggleCardProject(proj) : undefined} onKeyDown={mobile ? event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggleCardProject(proj); } } : undefined} className={`inline-flex items-center gap-[6px] p-[3px_9px] rounded-[6px] bg-[rgba(15,23,42,0.4)] border border-[var(--line)] text-[11.5px] text-[var(--ink-primary)] [transition:border-color_0.15s_ease,background_0.15s_ease] hover:border-[rgba(56,189,248,0.4)] hover:bg-[rgba(15,23,42,0.7)] project-legend-pill max-lg:h-8 max-lg:min-h-8 max-lg:min-w-8 max-lg:cursor-pointer ${mobile && hiddenCardProjects.has(proj) ? "opacity-40" : ""}`} key={proj}>
                          <span
                            className="w-[9px] h-[9px] rounded-[2.5px] inline-block shrink-0 legend-color-dot"
                            style={{ background: PROJECT_COLORS[proj] || "#94a3b8" }}
                          />
                          <span className="legend-proj-name">{projectLabel(proj, activeClientId)}</span>
                        </div>
                      ))}
                    </HorizontalScroll>

                    {/* Interactive Selected Detail Popover Card (muncul saat bar ditekan/diklik) */}
                    {selectedDate ? (
                      (() => {
                        const selectedItem = volumeBars.find((v) => selectedDate >= v.date && selectedDate <= v.to);
                        if (!selectedItem) return null;
                        const isPeriod = selectedItem.date !== selectedItem.to;
                        return (
                          <div className="mt-[14px] p-[12px_16px] bg-[rgba(15,23,42,0.92)] [backdrop-filter:blur(10px)] [-webkit-backdrop-filter:blur(10px)] border border-[rgba(56,189,248,0.4)] [box-shadow:0_4px_20px_rgba(0,0,0,0.35)] rounded-[10px] flex flex-col gap-[8px] chart-hover-popover anim-fade">
                            <div className="flex items-center justify-between gap-[8px] text-[12px] text-[var(--accent-blue)] border-b border-[rgba(255,255,255,0.08)] pb-[6px] popover-header">
                              <div className="flex items-center gap-[8px] popover-title-left">
                                <Calendar size={13} /> {isPeriod ? "Periode" : "Tanggal"}: <strong>{bucketTitle(selectedItem, volumeGranularity ?? "day")}</strong> · Total: <strong>{selectedItem.created} Tiket</strong>
                              </div>
                              <button
                                type="button"
                                className="bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] text-[var(--ink-muted)] rounded-[6px] w-[28px] h-[28px] min-w-[28px] min-h-[28px] inline-grid place-items-center cursor-pointer p-0 [transition:all_0.15s_ease] shrink-0 hover:bg-[rgba(239,68,68,0.2)] hover:border-[rgba(239,68,68,0.5)] hover:text-[#f87171] focus-visible:[outline:none] focus-visible:border-[var(--accent-blue-border)] focus-visible:[box-shadow:0_0_0_3px_rgba(56,189,248,0.18)] chart-popover-close-btn"
                                onClick={() => setSelectedDate(null)}
                                title="Tutup detail tanggal"
                                aria-label="Tutup detail tanggal"
                              >
                                <X size={13} className="block w-[14px] h-[14px] shrink-0 pointer-events-none" />
                              </button>
                            </div>
                            <div className="flex gap-[14px] flex-wrap popover-project-list">
                              {Object.entries(selectedItem.projectCounts || {}).map(([proj, cnt]) => {
                                const dayTotal = selectedItem.created || 1;
                                const pct = Math.round((cnt / dayTotal) * 100);
                                return (
                                  <span className="inline-flex items-center gap-[6px] text-[12px] text-[var(--ink-primary)] bg-[rgba(255,255,255,0.03)] p-[3px_8px] rounded-[5px] border border-[rgba(255,255,255,0.05)] popover-item" key={proj}>
                                    <i
                                      className="w-[9px] h-[9px] rounded-[2.5px] inline-block shrink-0 legend-color-dot"
                                      style={{ background: PROJECT_COLORS[proj] || "#94a3b8" }}
                                    />
                                    <strong>{projectLabel(proj, activeClientId)}:</strong> {cnt} ({pct}%)
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()
                    ) : null}
                  </>
                ) : (
                  <div role="status" className="flex flex-1 min-h-[300px] w-full flex-col items-center justify-center gap-4 rounded-xl px-6 py-10 text-center bg-[radial-gradient(circle_at_50%_45%,rgba(56,189,248,0.06),transparent_60%)] chart-empty-hint max-lg:h-[303px] max-lg:min-h-[220px] max-lg:flex-none max-lg:py-6">
                    <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-full border border-sky-400/25 bg-sky-400/10 text-sky-300 shadow-[0_0_0_6px_rgba(56,189,248,0.05)]"><BarChart3 size={20} /></span>
                    <div className="flex max-w-[340px] flex-col gap-1">
                      <p className="m-0 text-[15px] font-semibold leading-snug text-[#f8fafc]">{isNonDateAnalyticsFilterActive ? "Tidak ada tiket yang cocok" : analyticsDateFilter === "today" ? "Belum ada tiket hari ini" : "Tidak ada tiket pada rentang ini"}</p>
                      <p className="m-0 text-[13px] leading-snug text-[#94a3b8]">{isNonDateAnalyticsFilterActive ? "Ubah atau reset filter untuk melihat volume tiket." : analyticsDateFilter === "today" ? "Grafik terisi otomatis saat tiket baru masuk hari ini." : `Tidak ada tiket pada ${dateFilterLabel(analyticsDateFilter, todayWib)}. Pilih rentang lain untuk melihat volume tiket.`}</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        {!isNonDateAnalyticsFilterActive && analyticsDateFilter !== "today" && analyticsDateFilter !== "all" && <button type="button" onClick={() => setAnalyticsDateFilter("all")} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-sky-400/40 bg-sky-400/10 px-3.5 text-[12.5px] font-semibold text-sky-300 transition-colors hover:border-sky-400/70 hover:bg-sky-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 max-lg:min-h-11"><Calendar size={14} aria-hidden="true" />Lihat semua waktu</button>}
                        {analyticsDateFilter === "today" && !isAnyAnalyticsFilterActive && <button type="button" onClick={() => setAnalyticsDateFilter(lastSevenDaysFilter(todayWib))} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-sky-400/40 bg-sky-400/10 px-3.5 text-[12.5px] font-semibold text-sky-300 transition-colors hover:border-sky-400/70 hover:bg-sky-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 max-lg:min-h-11"><Calendar size={14} aria-hidden="true" />Lihat 7 hari terakhir</button>}
                        {isAnyAnalyticsFilterActive && <button type="button" onClick={resetAllAnalyticsFilters} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-600 bg-[#243044] px-3.5 text-[12.5px] font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:bg-[#2c3a52] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 max-lg:min-h-11"><RotateCcw size={14} aria-hidden="true" />Reset filter</button>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* View B: Month-over-Month (MoM) Comparison Chart (Bulan Lalu vs Bulan Ini) */}
            {selectedChartTab === "trajectory" && (
              <MomComparison
                data={momComparison}
                variant="compact"
                view={momSubView === "project" ? "project" : "trajectory"}
                onViewChange={setMomSubView}
                projectLabel={(project) => projectLabel(project, activeClientId)}
                projectColor={(project) => PROJECT_COLORS[project] || "#94a3b8"}
              />
            )}
            </PanelSkeletonWrapper>
          </div>
        </article>

        {/* Right: Rekap Tiket per User (Task 3) */}
        <div className="relative w-full h-full min-h-[580px] max-[1140px]:h-[580px] user-summary-wrapper max-lg:h-auto max-lg:min-h-0">
          <article className={`absolute inset-0 w-full h-full flex flex-col ${REPORT_PANEL_CARD} user-summary-panel max-lg:relative max-lg:h-auto max-lg:[&.user-summary-panel_.report-panel-heading]:h-[69px] max-lg:[&.user-summary-panel.user-summary-panel_.panel-view-action-btn]:size-10 max-lg:[&.user-summary-panel.user-summary-panel_.panel-view-action-btn]:min-h-10 max-lg:[&.user-summary-panel.user-summary-panel_.panel-view-action-btn]:min-w-10 max-lg:[&.user-summary-panel.user-summary-panel_.panel-view-action-btn_span]:hidden max-lg:[&.user-summary-panel_.panel-sub-count]:inline`}>
            <div className={`${REPORT_PANEL_HEADING} report-panel-heading`}>
              <div className="flex flex-col gap-[2px] compact-chart-heading-left">
                <div className="flex items-center gap-[8px] text-[14px] font-bold text-[var(--ink-primary)] panel-title">
                  <Users size={14} className="text-sky-400" />
                  Rekap Tiket per User
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isLoading ? (
                  <Skeleton width={48} height={16} borderRadius={99} tone="subtle" />
                ) : (
                  <span className="text-[11px] font-mono text-[var(--ink-muted)] font-semibold panel-sub-count">{userSummaries.length} Staf</span>
                )}
                <PanelViewButton
                  panelTitle="Rekap Tiket per User"
                  onClick={() => handleOpenPanel("user-recap")}
                  ariaLabel="Perbesar panel Rekap Tiket per User"
                  disabled={isLoading}
                />
              </div>
            </div>
            <div className="flex flex-col flex-1 p-3.5 sm:p-4 min-h-0 overflow-hidden report-panel-body user-summary-body">
              <PanelSkeletonWrapper
          reserveLoading={mobile}
                isLoading={isLoading}
                isStale={isStale}
                error={error}
                onRetry={refetch}
                minHeight={300}
                className="h-full"
                loadingClassName="max-lg:flex-none max-lg:h-[352px] lg:min-h-[300px]"
                skeleton={<StaffRecapSkeleton />}
                liveRegionText="Memuat rekap tiket per user..."
              >
              <div className="flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto pr-1 pb-3 [scrollbar-width:thin] [scrollbar-color:rgba(56,189,248,0.25)_transparent] [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-track]:bg-[rgba(148,163,184,0.05)] [&::-webkit-scrollbar-track]:rounded-[4px] [&::-webkit-scrollbar-thumb]:bg-[rgba(56,189,248,0.25)] [&::-webkit-scrollbar-thumb]:rounded-[4px] user-summary-list max-lg:gap-0 max-lg:flex-none max-lg:overflow-visible max-lg:pb-0 max-lg:pr-0">
                {userSummaries.map((user, staffIndex) => (
                  <button
                    type="button"
                    key={user.name}
                    className={`group grid grid-cols-[32px_minmax(0,1fr)_auto_14px] items-center gap-x-2.5 px-2.5 py-2.5 rounded-xl bg-[rgba(148,163,184,0.04)] border border-[rgba(148,163,184,0.1)] cursor-pointer text-left w-full transition-colors duration-150 hover:bg-[rgba(56,189,248,0.07)] hover:border-[rgba(56,189,248,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 shrink-0 user-summary-card max-lg:min-h-[64px] max-lg:grid-cols-[32px_minmax(0,1fr)_auto_16px] max-lg:rounded-none max-lg:border-0 max-lg:border-b max-lg:border-slate-700/50 max-lg:bg-transparent max-lg:px-0 ${!staffExpanded && staffIndex >= 5 ? "max-lg:hidden" : ""}`}
                    aria-label={`Detail ${user.name}: ${user.totalCount} tiket total, ${user.todayCount} tiket hari ini`}
                    onClick={() => setSelectedUserDetail(user)}
                  >
                    <Avatar size="md" initials={user.initials} name={user.name} className="size-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 user-avatar-sm" />
                    <span className="flex flex-col min-w-0 gap-[3px]">
                      <span className="text-[12.5px] font-semibold leading-tight text-[var(--ink-primary)] truncate user-summary-name max-lg:text-[14px]" title={user.name}>{user.name}</span>
                      <span className="text-[10.5px] leading-tight text-[var(--ink-muted)] truncate user-summary-role max-lg:text-[11px]" title={user.role}>{user.role || "—"}</span>
                    </span>
                    <span className="flex items-start gap-3 user-metrics-row">
                      <span className="flex w-[52px] flex-col items-center gap-[5px] leading-none user-metric-col metric-total" title="Semua tiket orang ini pada filter yang dipilih">
                        <strong className={`font-mono text-[16px] font-extrabold tabular-nums metric-val ${user.totalCount ? "text-[var(--ink-primary)]" : "text-slate-500"}`}>{user.totalCount.toLocaleString("id-ID")}</strong>
                        <span className="text-balance text-center text-[9.5px] font-semibold leading-[1.15] text-[var(--ink-muted)] metric-lbl max-lg:text-[10px]">Total Tiket</span>
                      </span>
                      <span className="flex w-[52px] flex-col items-center gap-[5px] leading-none user-metric-col metric-today" title="Tiket yang dibuka hari ini (WIB)">
                        <strong className={`font-mono text-[16px] font-extrabold tabular-nums metric-val ${user.todayCount ? "text-[#38bdf8]" : "text-slate-500"}`}>{user.todayCount}</strong>
                        <span className="text-balance text-center text-[9.5px] font-semibold leading-[1.15] text-[var(--ink-muted)] metric-lbl max-lg:text-[10px]">Tiket Saat Ini</span>
                      </span>
                    </span>
                    <ChevronRight size={14} className="text-slate-500 transition-colors group-hover:text-sky-300 user-detail-link" aria-hidden="true" />
                  </button>
                ))}
              </div>
              <button type="button" aria-expanded={staffExpanded} onClick={event => toggleCompactPreview(event.currentTarget.closest("article"), staffExpanded, setStaffExpanded)} className="lg:hidden mt-2 min-h-11 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-[#243044] text-[13px] font-semibold text-slate-300">{staffExpanded ? "Ringkas" : `Lihat semua (${userSummaries.length})`}<ChevronRight size={16} /></button>
              </PanelSkeletonWrapper>
            </div>
          </article>
        </div>
      </div>


      {/* ── 5. Distributions: Category Donut & Priority Donut ── */}
      <div role="group" aria-label="Pilih distribusi" className="flex gap-2 lg:hidden">
        {["Kategori", "Severity"].map((label, index) => <button key={label} type="button" aria-pressed={distributionIndex === index} onClick={() => {
          const target = distributionRef.current;
          if (target && !mobile) target.scrollTo({ left: index * (target.clientWidth + 12) });
          setDistributionIndex(index);
        }} className={`min-h-11 flex-1 rounded-lg border text-[13px] font-semibold ${distributionIndex === index ? "border-sky-500/40 bg-sky-500/10 text-sky-300" : "border-slate-700 bg-slate-900/50 text-slate-400"}`}>{label}</button>)}
      </div>
      <div ref={distributionRef} className="grid grid-cols-2 max-[960px]:grid-cols-1 gap-[18px] max-lg:gap-3 report-charts-grid max-lg:block max-lg:[scrollbar-width:none] max-lg:[&::-webkit-scrollbar]:hidden max-lg:items-start max-lg:[&>article]:w-full max-lg:[&>article]:min-w-full max-lg:[&>article]:snap-center max-lg:[&>article]:shrink-0">
        {/* Category Distribution (Donut + Ranked Bars) */}
        <article className={`${REPORT_PANEL_CARD} report-panel @container ${distributionIndex === 0 ? "" : "max-lg:hidden"}`}>
          <div className={`${REPORT_PANEL_HEADING} report-panel-heading`}>
            <div className={`${REPORT_PANEL_TITLE} panel-title`}><span className="hidden lg:inline">Distribusi Kategori / Tipe Tiket</span><span className="lg:hidden">Distribusi Kategori</span></div>
            <div className="flex items-center gap-2">
              {isLoading ? (
                <Skeleton width={64} height={16} borderRadius={99} tone="subtle" />
              ) : (
                <span className="text-[11px] font-mono text-[var(--ink-muted)] font-semibold panel-sub-count">{typeCounts.length} Kategori</span>
              )}
              <PanelViewButton
                panelTitle="Distribusi Kategori / Tipe Tiket"
                onClick={() => handleOpenPanel("category-distribution")}
                ariaLabel="Perbesar panel Distribusi Kategori"
                disabled={isLoading}
              />
            </div>
          </div>
          <div className="flex flex-col flex-1 min-h-0 p-5 report-panel-body">
            <PanelSkeletonWrapper
          reserveLoading={mobile}
              isLoading={isLoading}
              isStale={isStale}
              error={error}
              onRetry={refetch}
              minHeight={180}
              className="h-full"
              loadingClassName="max-lg:flex-none max-lg:h-[404px] lg:min-h-[180px]"
                skeleton={<CategoryDistributionSkeleton />}
              liveRegionText="Memuat distribusi kategori..."
            >
              <div className="grid grid-cols-[140px_1fr] max-[540px]:grid-cols-1 max-[540px]:justify-items-center gap-[20px] items-center h-full flex-1 min-h-0 donut-and-list-grid max-lg:gap-3 max-lg:justify-items-center @max-[439px]:max-lg:grid-cols-1 @min-[440px]:max-lg:grid-cols-[140px_1fr]">
              {/* Donut Chart */}
              <div className="flex items-center justify-center shrink-0">
                <div className="relative w-[130px] h-[130px] max-lg:size-[140px] donut-chart-wrap">
                  <svg className="w-full h-full donut-svg" viewBox="0 0 160 160">
                    {renderDonutSlices(
                      typeCounts.map(([type, count], idx) => ({
                        label: categoryLabel(type),
                        count,
                        color: resolveCategoryColor(type, catalog.categories).hex,
                      })),
                      80,
                      80,
                      55,
                      14,
                      2
                    )}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center donut-center-content">
                    <span className="text-[20px] font-extrabold font-mono text-[var(--ink-primary)] leading-none donut-total-num">{total}</span>
                    <span className="text-[8px] max-lg:text-[11px] font-bold font-mono tracking-[0.8px] text-[var(--ink-muted)] mt-[2px] donut-total-label">TOTAL</span>
                  </div>
                </div>
              </div>

              {/* Ranked Category Bars */}
              <div className="flex flex-col justify-between h-full gap-2 w-full category-distribution-list max-lg:gap-0">
                {typeCounts.map(([type, count], idx) => {
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  const color = resolveCategoryColor(type, catalog.categories).hex;

                  return (
                    <div className="flex flex-col gap-[4px] category-dist-row max-lg:min-h-9 max-lg:grid max-lg:grid-cols-[minmax(0,112px)_minmax(24px,1fr)_68px] max-lg:items-center max-lg:gap-2" key={type}>
                      <div className="flex justify-between text-[11.5px] font-medium text-[var(--ink-primary)] category-dist-info max-lg:contents">
                        <span className="inline-flex items-center gap-[6px] category-dist-name max-lg:col-start-1 max-lg:row-start-1 max-lg:truncate" title={categoryLabel(type)}>
                          <i className="w-[9px] h-[9px] rounded-[2.5px] inline-block legend-dot" style={{ background: color }} /> {categoryLabel(type)}
                        </span>
                        <span className="font-mono text-[11px] text-[var(--ink-muted)] category-dist-count max-lg:col-start-3 max-lg:row-start-1 max-lg:whitespace-nowrap">{count} ({pct}%)</span>
                      </div>
                      <div className="h-[5px] w-full bg-[rgba(148,163,184,0.15)] rounded-[99px] overflow-hidden category-dist-track max-lg:col-start-2 max-lg:row-start-1">
                        <div className="h-full rounded-[99px] category-dist-fill" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            </PanelSkeletonWrapper>
          </div>
        </article>

        {/* Severity Distribution */}
        <article className={`${REPORT_PANEL_CARD} report-panel @container ${distributionIndex === 1 ? "" : "max-lg:hidden"}`}>
          <div className={`${REPORT_PANEL_HEADING} report-panel-heading`}>
            <div className={`${REPORT_PANEL_TITLE} panel-title`}><span className="hidden lg:inline">Distribusi Berdasarkan Severity</span><span className="lg:hidden">Distribusi Severity</span></div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-[var(--ink-muted)] font-semibold panel-sub-count">Severity Ratios</span>
              <PanelViewButton
                panelTitle="Distribusi Berdasarkan Severity"
                onClick={() => handleOpenPanel("severity-distribution")}
                ariaLabel="Perbesar panel Distribusi Severity"
                disabled={isLoading}
              />
            </div>
          </div>
          <div className="flex flex-col flex-1 min-h-0 p-5 report-panel-body">
            <PanelSkeletonWrapper
          reserveLoading={mobile}
              isLoading={isLoading}
              isStale={isStale}
              error={error}
              onRetry={refetch}
              minHeight={180}
              className="h-full"
              loadingClassName="max-lg:flex-none max-lg:h-[372px] lg:min-h-[180px]"
                skeleton={<SeverityDistributionSkeleton />}
              liveRegionText="Memuat distribusi severity..."
            >
              <div className="flex flex-col @[520px]:grid @[520px]:grid-cols-[auto_1fr] @[520px]:items-stretch gap-4 @[520px]:gap-6 flex-1 min-h-0 justify-center">
              {/* Donut Chart for Priority */}
              <div className="flex items-center justify-center shrink-0">
                <div className="relative shrink-0 w-[120px] h-[120px] max-lg:size-[120px] @[340px]:w-[132px] @[340px]:h-[132px] @[520px]:w-[148px] @[520px]:h-[148px] donut-chart-wrap">
                  <svg className="w-full h-full donut-svg" viewBox="0 0 160 160">
                    {renderDonutSlices(
                      [
                        { label: "High", count: priorityCounts.High, color: PRIORITY_COLORS.High },
                        { label: "Medium", count: priorityCounts.Medium, color: PRIORITY_COLORS.Medium },
                        { label: "Low", count: priorityCounts.Low, color: PRIORITY_COLORS.Low },
                      ],
                      80,
                      80,
                      55,
                      14,
                      2
                    )}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none donut-center-content">
                    <span className="text-[28px] font-bold font-mono text-[#f8fafc] leading-none tabular-nums donut-total-num">
                      {priorityCounts.High}
                    </span>
                    <span className="text-[10px] max-lg:text-[11px] font-mono uppercase tracking-[0.12em] text-[#94a3b8] mt-1 donut-total-label">
                      HIGH
                    </span>
                  </div>
                </div>
              </div>

              {/* Priority Summary Grid */}
              <div className="grid grid-cols-1 @[340px]:grid-cols-3 gap-3 w-full h-full priority-spectrum-list max-lg:grid-cols-3 max-lg:gap-2">
                {(["High", "Medium", "Low"] as const).map((key) => {
                  const count = priorityCounts[key];
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  const style = SEVERITY_CARD_STYLES[key];

                  return (
                    <div
                      key={key}
                      className={`p-3.5 rounded-lg bg-slate-950/40 border border-[#334155] border-l-[3px] ${style.borderLeft} flex flex-col justify-between min-w-0 h-full max-lg:p-2 max-lg:h-[108px] priority-spec-box`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 spec-top">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                        <strong className="text-xs font-semibold text-[#f8fafc] truncate">{key}</strong>
                      </div>
                      <span className="text-[28px] font-bold font-mono text-[#f8fafc] leading-none tabular-nums my-1 spec-count max-lg:text-[22px]">
                        {count}
                      </span>
                      <div className="flex flex-col gap-1.5 w-full mt-auto">
                        <span className="text-[11px] font-mono text-[#94a3b8] tabular-nums leading-tight spec-pct">
                          {pct}% share
                        </span>
                        <div className="w-full h-1 bg-[#334155] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${style.bar}`}
                            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            </PanelSkeletonWrapper>
          </div>
        </article>
      </div>

      {/* ── 6. Operational Velocity Trajectory ── */}
      <article className={`${REPORT_PANEL_CARD} flex flex-col w-full mgmt-velocity-panel`}>
        <div className={`${REPORT_PANEL_HEADING} report-panel-heading`}>
          <div>
            <div className={`${REPORT_PANEL_TITLE} panel-title`}><span className="hidden lg:inline">Tren Durasi Penyelesaian (Resolution Velocity)</span><span className="lg:hidden">Tren Durasi</span></div>
          </div>
          {/* the legend only explains lines that are drawn; with nothing to draw it is hidden */}
          <div className={`flex items-center gap-[16px] flex-wrap velocity-legend-strip max-lg:[&_.compact-velocity-legend-item]:hidden ${velocityKpis && velocitySeries.length > 0 ? "" : "[&_.compact-velocity-legend-item]:hidden"}`}>
            <div className="flex items-center gap-[6px] text-[11px] font-semibold text-[var(--ink-secondary)] compact-velocity-legend-item">
              <span className="inline-block w-[16px] h-[3px] rounded-[2px] bg-[#38bdf8] shadow-[0_0_8px_rgba(56,189,248,0.4)] velocity-legend-line velocity-legend-blue" />
              <span>Rata-rata Resolusi</span>
            </div>
            <div className="flex items-center gap-[6px] text-[11px] font-semibold text-[var(--ink-secondary)] compact-velocity-legend-item">
              <span className="inline-block w-[16px] h-0 rounded-[2px] bg-[#f59e0b] border-t-[2px] border-t-dashed border-t-[#f59e0b] border-transparent velocity-legend-line velocity-legend-orange" />
              <span>Target High (60m)</span>
            </div>
            <div className="flex items-center gap-[6px] text-[11px] font-semibold text-[var(--ink-secondary)] compact-velocity-legend-item">
              <span className="inline-block w-[16px] h-0 rounded-[2px] bg-[#f87171] border-t-[2px] border-t-dashed border-t-[#f87171] border-transparent velocity-legend-line velocity-legend-red" />
              <span>Target Medium/Low (120m)</span>
            </div>
            <PanelViewButton
              panelTitle="Tren Durasi Penyelesaian"
              onClick={() => handleOpenPanel("resolution-trend")}
              ariaLabel="Perbesar panel Tren Durasi Penyelesaian"
              disabled={isLoading}
            />
          </div>
        </div>
          <div className="flex flex-col flex-1 p-[16px_20px] gap-[10px] justify-between report-panel-body velocity-panel-body">
            <PanelSkeletonWrapper
          reserveLoading={mobile}
              isLoading={isLoading}
              isStale={isStale}
              error={error}
              onRetry={refetch}
              minHeight={280}
              className="h-full"
              loadingClassName="max-lg:flex-none max-lg:h-[381px] lg:min-h-[280px]"
                skeleton={<ResolutionVelocitySkeleton />}
              liveRegionText="Memuat tren durasi penyelesaian..."
            >
            {velocityKpis && velocitySeries.length > 0 ? (
              <>
                {/* 4 Summary Stat Pills for Quick Velocity Intelligence (per closed ticket) */}
                {(() => {
                  const { avg, min, max, compliancePct } = velocityKpis;

                  return (
                    <div className="grid grid-cols-4 max-[860px]:grid-cols-2 gap-[10px] mb-[2px] velocity-metrics-strip max-lg:auto-rows-fr">
                      <div className="flex flex-col gap-[3px] p-[8px_12px] bg-[rgba(15,23,42,0.55)] border border-[rgba(255,255,255,0.08)] rounded-[8px] velocity-metric-pill">
                        <span className="text-[10px] max-lg:text-[11px] text-[var(--ink-muted)] font-semibold whitespace-nowrap overflow-hidden text-ellipsis velocity-metric-label">Rata-rata Resolusi</span>
                        <span className="font-mono text-[15px] font-extrabold text-[var(--ink-primary)] leading-[1.1] [&_small]:text-[10px] [&_small]:font-medium [&_small]:text-[var(--ink-muted)] velocity-metric-val max-lg:text-[20px] max-lg:[&_small]:text-[11px]">{avg} <small>menit</small></span>
                      </div>
                      <div className="flex flex-col gap-[3px] p-[8px_12px] bg-[rgba(15,23,42,0.55)] border border-[rgba(255,255,255,0.08)] rounded-[8px] velocity-metric-pill">
                        <span className="text-[10px] max-lg:text-[11px] text-[var(--ink-muted)] font-semibold whitespace-nowrap overflow-hidden text-ellipsis velocity-metric-label max-lg:whitespace-normal" title="Tiket selesai yang memenuhi targetnya sendiri: 60 menit untuk High, 120 menit untuk Medium/Low">Kepatuhan SLA</span>
                        <span className="font-mono text-[15px] font-extrabold text-[var(--ink-primary)] leading-[1.1] [&_small]:text-[10px] [&_small]:font-medium velocity-metric-val max-lg:text-[20px] max-lg:[&_small]:text-[11px]">{compliancePct}%</span>
                      </div>
                      <div className="flex flex-col gap-[3px] p-[8px_12px] bg-[rgba(15,23,42,0.55)] border border-[rgba(255,255,255,0.08)] rounded-[8px] velocity-metric-pill">
                        <span className="text-[10px] max-lg:text-[11px] text-[var(--ink-muted)] font-semibold whitespace-nowrap overflow-hidden text-ellipsis velocity-metric-label">Durasi Tercepat</span>
                        <span className="font-mono text-[15px] font-extrabold text-[var(--ink-primary)] leading-[1.1] [&_small]:text-[10px] [&_small]:font-medium velocity-metric-val max-lg:text-[20px] max-lg:[&_small]:text-[11px]">{min} <small>menit</small></span>
                      </div>
                      <div className="flex flex-col gap-[3px] p-[8px_12px] bg-[rgba(15,23,42,0.55)] border border-[rgba(255,255,255,0.08)] rounded-[8px] velocity-metric-pill">
                        <span className="text-[10px] max-lg:text-[11px] text-[var(--ink-muted)] font-semibold whitespace-nowrap overflow-hidden text-ellipsis velocity-metric-label">Durasi Tertinggi</span>
                        <span className="font-mono text-[15px] font-extrabold leading-[1.1] [&_small]:text-[10px] [&_small]:font-medium velocity-metric-val text-[var(--ink-primary)]">
                          {max} <small>menit</small>
                        </span>
                      </div>
                    </div>
                  );
                })()}
                <ChartModeNote
                  className="mt-[14px] mb-[6px]"
                  badge={granularityBadge(velocityGranularity)}
                  detail={<>Kartu di atas dihitung dari <strong className="font-semibold text-[#cbd5e1]">{velocityKpis.count.toLocaleString("id-ID")} tiket selesai</strong>. Periode tanpa tiket selesai tidak diberi titik.</>}
                >
                  {velocityGranularity === "day"
                    ? "Rata-rata durasi penyelesaian tiap hari."
                    : `Rata-rata durasi penyelesaian tiap ${velocityGranularity === "week" ? "minggu (Senin–Minggu)" : "bulan"}, dari rentang ${bucketRanges(volumeByDate[0].date, volumeByDate[volumeByDate.length - 1].date, "day").length} hari.`}
                </ChartModeNote>

                {/* Clean, Prominent Line Chart with Collision-Free Labels & Interactive Hover */}
                <div
                  ref={velocityChartRef}
                  role={mobile ? "slider" : undefined}
                  aria-valuemin={mobile ? 0 : undefined}
                  aria-valuemax={mobile ? Math.max(0, velocitySeries.length - 1) : undefined}
                  aria-valuenow={mobile ? hoveredVelocityPoint ? Math.max(0, velocitySeries.findIndex(item => item.date === hoveredVelocityPoint.date)) : Math.max(0, velocitySeries.length - 1) : undefined}
                  aria-valuetext={mobile ? hoveredVelocityPoint?.date : undefined}
                  tabIndex={mobile ? 0 : undefined}
                  aria-label="Tren durasi; gunakan panah kiri atau kanan untuk rincian"
                  onBlur={() => { if (mobile) setHoveredVelocityPoint(null); }}
                  onKeyDown={event => {
                    if (!mobile) return;
                    if (event.key === "Escape") { setHoveredVelocityPoint(null); return; }
                    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                    event.preventDefault();
                    const dates = velocitySeries.map(item => item.date); if (!dates.length) return;
                    const current = hoveredVelocityPoint ? dates.indexOf(hoveredVelocityPoint.date) : dates.length - 1;
                    const index = event.key === "Home" ? 0 : event.key === "End" ? dates.length - 1 : Math.max(0, Math.min(dates.length - 1, current + (event.key === "ArrowRight" ? 1 : -1)));
                    const x = 42 + index * (velocitySize.width - 66) / Math.max(1, dates.length - 1);
                    const item = velocitySeries[index]; setHoveredVelocityPoint({ x, y: 100, date: item.date, avgResolution: item.avgResolution, closed: item.closed, percentX: 50, percentY: 60 });
                  }}
                  className="relative w-full h-[290px] min-h-[280px] flex flex-col flex-1 overflow-visible compact-velocity-chart-container max-lg:h-[252px] max-lg:min-h-[252px] max-lg:flex-none max-lg:touch-pan-y"
                  onPointerDown={(event) => {
                    if (!mobile || !velocitySeries.length) return;
                    const box = event.currentTarget.getBoundingClientRect();
                    const idx = Math.max(0, Math.min(velocitySeries.length - 1, Math.round((event.clientX - box.left - 42) / Math.max(1, box.width - 66) * (velocitySeries.length - 1))));
                    const item = velocitySeries[idx];
                    setHoveredVelocityPoint({ x: 42 + idx * (box.width - 66) / Math.max(1, velocitySeries.length - 1), y: 100, date: item.date, avgResolution: item.avgResolution, closed: item.closed, percentX: 50, percentY: 60 });
                  }}
                  onPointerMove={(event) => {
                    if (!mobile || event.pointerType !== "touch" || !event.buttons || !velocitySeries.length) return;
                    const box = event.currentTarget.getBoundingClientRect();
                    const idx = Math.max(0, Math.min(velocitySeries.length - 1, Math.round((event.clientX - box.left - 42) / Math.max(1, box.width - 66) * (velocitySeries.length - 1))));
                    const item = velocitySeries[idx];
                    setHoveredVelocityPoint({ x: 42 + idx * (box.width - 66) / Math.max(1, velocitySeries.length - 1), y: 100, date: item.date, avgResolution: item.avgResolution, closed: item.closed, percentX: 50, percentY: 60 });
                  }}
                  onMouseLeave={() => setHoveredVelocityPoint(null)}
                >
                  {(() => {
                    const n = velocitySeries.length;
                    // The viewBox is the measured box, so text and dots are drawn at their real size (nothing is stretched)
                    const svgViewBoxWidth = mobile ? velocitySize.width || 320 : Math.max(480, velocitySize.width || 860);
                    const viewBoxHeight = mobile ? velocitySize.height || 252 : Math.max(260, velocitySize.height || 290);
                    const startX = mobile ? 42 : 64;
                    const endX = svgViewBoxWidth - (mobile ? 24 : 90); // room for threshold tags on the right
                    const totalSpan = endX - startX;
                    const stepX = n > 1 ? totalSpan / (n - 1) : totalSpan / 2;

                    const baselineY = mobile ? viewBoxHeight - 36 : viewBoxHeight - 40;
                    const topY = mobile ? 30 : 32;
                    const chartHeight = baselineY - topY;

                    // A bounded set of round ticks; far above the SLA lines the axis is compressed so one outlier cannot flatten them (lib/chart-scale.ts)
                    const scale = durationScale(Math.max(70, ...velocitySeries.map((v) => v.avgResolution)));
                    const ticks = scale.ticks;
                    const yFor = (minutes: number) => baselineY - Math.round(scale.ratio(minutes) * chartHeight);

                    const points = velocitySeries.map((item, idx) => {
                      const x = n > 1 ? Math.round(startX + idx * stepX) : Math.round((startX + endX) / 2);
                      const y = yFor(item.avgResolution);
                      return { x, y, idx, ...item };
                    });

                    const firstX = points[0]?.x ?? startX;
                    const lastX = points[points.length - 1]?.x ?? endX;
                    const pathD = `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`;
                    const areaD = `M ${firstX},${baselineY} L ${points.map((p) => `${p.x},${p.y}`).join(" L ")} L ${lastX},${baselineY} Z`;

                    // Min & max identifiers for milestone callouts
                    const allResolutions = points.map((p) => p.avgResolution);
                    const maxRes = Math.max(...allResolutions);
                    const minRes = Math.min(...allResolutions);

                    const maxPoint = points.find((p) => p.avgResolution === maxRes);
                    const minPoint = points.find((p) => p.avgResolution === minRes && p.avgResolution !== maxRes);

                    const calloutBounds: ChartBox = { x: startX, y: 6, width: endX - startX, height: baselineY - 10 };
                    const occupied: ChartBox[] = [SLA_TARGET_MINUTES, SLA_BREACH_MINUTES].map(value => ({ x: endX - 82, y: yFor(value) - 24, width: 82, height: 24 }));
                    // Reserve the actual line segments, not only their end points.
                    points.slice(1).forEach((point, index) => {
                      const previous = points[index];
                      occupied.push({ x: previous.x - 2, y: Math.min(point.y, previous.y) - 3, width: point.x - previous.x + 4, height: Math.abs(point.y - previous.y) + 6 });
                    });
                    const maxCallout = maxPoint ? placeChartCallout(maxPoint.x, maxPoint.y, 72, 22, calloutBounds, occupied) : null;
                    const minCallout = minPoint ? placeChartCallout(minPoint.x, minPoint.y, 68, 22, calloutBounds, maxCallout ? [...occupied, maxCallout] : occupied) : null;
                    // X-axis stride to avoid crowding
                    const dateStride = mobile ? Math.max(1, Math.ceil(n / 4)) : Math.max(1, Math.ceil((velocityGranularity === "day" ? 44 : 54) / Math.max(1, stepX)));

                    return (
                      <>
                        <svg
                          className="w-full h-full min-h-[260px] block select-none !overflow-visible compact-velocity-chart-svg max-lg:min-h-[252px] max-lg:[&_text]:text-[11px]"
                          viewBox={`0 0 ${svgViewBoxWidth} ${viewBoxHeight}`}
                          preserveAspectRatio="none"
                        >
                          <defs>
                            <linearGradient id="gradVelocity" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.28" />
                              <stop offset="85%" stopColor="#38bdf8" stopOpacity="0.04" />
                              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                            </linearGradient>
                            <filter id="glow-halo" x="-50%" y="-50%" width="200%" height="200%">
                              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#38bdf8" floodOpacity="0.6" />
                            </filter>
                          </defs>

                          {/* ── 1. Horizontal Gridlines & Y-Axis Ticks ── */}
                          {ticks.map((tick) => {
                            const yPos = yFor(tick);
                            const isSLA = tick === 60;
                            const isBaseline = tick === 0;

                            return (
                              <g key={`grid-res-${tick}`}>
                                <line
                                  x1={startX - 10}
                                  y1={yPos}
                                  x2={endX + 6}
                                  y2={yPos}
                                  stroke={
                                    isBaseline
                                      ? "var(--line, rgba(255, 255, 255, 0.12))"
                                      : isSLA
                                      ? "rgba(245, 158, 11, 0.75)"
                                      : "rgba(255, 255, 255, 0.05)"
                                  }
                                  strokeWidth={isBaseline ? "1.5" : isSLA ? "1.5" : "1"}
                                  strokeDasharray={isBaseline ? undefined : isSLA ? "5 4" : "3 4"}
                                />

                                {/* Left Y-Axis Label */}
                                <text
                                  x={mobile ? startX - 12 : startX - 16}
                                  y={yPos + 3.5}
                                  textAnchor="end"
                                  fill={isSLA ? "#f59e0b" : "var(--ink-muted, #94a3b8)"}
                                  fontSize={isSLA ? "10.5" : "9"}
                                  fontWeight={isSLA ? "800" : "600"}
                                  fontFamily="var(--font-mono)"
                                >
                                  {tick}m
                                </text>
                              </g>
                            );
                          })}

                          {/* The axis above 120m is compressed when one value is far above the SLA lines: say so */}
                          {scale.broken && (
                            <text
                              x={startX - 10}
                              y={topY - 12}
                              fill="var(--ink-muted, #94a3b8)"
                              fontSize="8.5"
                              fontWeight="600"
                              fontFamily="var(--font-mono)"
                              opacity="0.85"
                            >
                              Skala di atas {scale.breakAt}m diperkecil
                            </text>
                          )}

                          {/* ── 2. Reference line: the Medium/Low target (SLA_BREACH_MINUTES = 120m) ── */}
                          {(() => {
                            const y90 = yFor(SLA_BREACH_MINUTES);
                            return (
                              <g key="grid-breach-90">
                                <line
                                  x1={startX - 10}
                                  y1={y90}
                                  x2={endX + 6}
                                  y2={y90}
                                  stroke="rgba(248, 113, 113, 0.7)"
                                  strokeWidth="1.5"
                                  strokeDasharray="5 4"
                                />
                                {/* Right threshold tag for 90m */}
                                <g transform={`translate(${mobile ? endX - 82 : endX + 10}, ${mobile ? Math.max(topY, y90 - 24) : y90 - 8})`}>
                                  <rect
                                    width={mobile ? 82 : 68}
                                    height={mobile ? 20 : 16}
                                    rx="4"
                                    fill="rgba(239, 68, 68, 0.16)"
                                    stroke="rgba(239, 68, 68, 0.45)"
                                    strokeWidth="1"
                                  />
                                  <text
                                    x={mobile ? 41 : 34}
                                    y={mobile ? 14 : 11}
                                    textAnchor="middle"
                                    fill="#f87171"
                                    fontSize="8.5"
                                    fontWeight="700"
                                    fontFamily="var(--font-mono)"
                                  >
                                    Target 120m
                                  </text>
                                </g>
                              </g>
                            );
                          })()}

                          {/* Right threshold tag for 60m (Target SLA) */}
                          {(() => {
                            const y60 = yFor(SLA_TARGET_MINUTES);
                            return (
                              <g transform={`translate(${mobile ? endX - 82 : endX + 10}, ${mobile ? y60 - 24 : y60 - 8})`}>
                                <rect
                                  width={mobile ? 82 : 68}
                                  height={mobile ? 20 : 16}
                                  rx="4"
                                  fill="rgba(245, 158, 11, 0.16)"
                                  stroke="rgba(245, 158, 11, 0.45)"
                                  strokeWidth="1"
                                />
                                <text
                                  x={mobile ? 41 : 34}
                                  y={mobile ? 14 : 11}
                                  textAnchor="middle"
                                  fill="#f59e0b"
                                  fontSize="8.5"
                                  fontWeight="700"
                                  fontFamily="var(--font-mono)"
                                >
                                  Target 60m
                                </text>
                              </g>
                            );
                          })()}

                          {/* ── 3. Gradient Area & Trend Path ── */}
                          <path d={areaD} fill="url(#gradVelocity)" />
                          <path
                            d={pathD}
                            fill="none"
                            stroke="#38bdf8"
                            strokeWidth={mobile ? 2.5 : "2.8"}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {/* ── 4. Vertical Cursor Guideline for Hovered Point ── */}
                          {hoveredVelocityPoint && (
                            <line
                              x1={hoveredVelocityPoint.x}
                              y1={topY}
                              x2={hoveredVelocityPoint.x}
                              y2={baselineY}
                              stroke="rgba(56, 189, 248, 0.4)"
                              strokeWidth="1.5"
                              strokeDasharray="3 3"
                            />
                          )}

                          {/* ── 5. Data Points & Milestone Badges ── */}
                          {points.map((p, idx) => {
                            const isBreach = p.avgResolution > SLA_BREACH_MINUTES;
                            const isHovered = hoveredVelocityPoint?.date === p.date;
                            const isMax = maxPoint?.date === p.date;
                            const isMin = minPoint?.date === p.date;

                            // X-axis tick & label display
                            const showXLabel = idx === n - 1 || (idx % dateStride === 0 && n - 1 - idx >= dateStride) || isHovered;

                            return (
                              <g key={p.date}>
                                {/* X-axis Tick & Label */}
                                {showXLabel && (
                                  <>
                                    <line
                                      x1={p.x}
                                      y1={baselineY}
                                      x2={p.x}
                                      y2={baselineY + 4}
                                      stroke="rgba(255, 255, 255, 0.2)"
                                      strokeWidth="1"
                                    />
                                    <text
                                      x={mobile ? Math.min(svgViewBoxWidth - 19, Math.max(19, p.x)) : p.x}
                                      y={baselineY + (mobile ? 22 : 20)}
                                      textAnchor="middle"
                                      fill={isHovered ? "#38bdf8" : "var(--ink-muted, #94a3b8)"}
                                      fontSize={mobile ? "9" : "10.5"}
                                      fontWeight={isHovered ? "700" : "500"}
                                      fontFamily="var(--font-mono)"
                                      paintOrder="stroke"
                                      stroke={isHovered ? "var(--panel-bg)" : undefined}
                                      strokeWidth={6}
                                    >
                                      {p.label}
                                    </text>
                                  </>
                                )}

                                {/* Milestone Callout Badge (Peak Max point) */}
                                {isMax && (mobile ? !hoveredVelocityPoint : !isHovered) && (() => {
                                  const maxBadgeText = `${p.avgResolution}m Max`;
                                  const maxBadgeWidth = Math.max(72, maxBadgeText.length * 6.5 + 16);
                                  const maxBadgeHeight = mobile ? 22 : 17;
                                  const halfW = maxBadgeWidth / 2;
                                  const clampedX = Math.max((mobile ? startX : 0) + halfW + 6, Math.min((mobile ? endX : svgViewBoxWidth) - halfW - 6, p.x));
                                  const placeBelow = p.y < 30;
                                  const rawY = placeBelow ? p.y + 8 : p.y - 8 - maxBadgeHeight;
                                  if (mobile && !maxCallout) return null;
                                  const rectY = mobile ? maxCallout!.y : rawY;
                                  const badgeX = mobile ? maxCallout!.x + halfW : clampedX;

                                  return (
                                    <g style={{ pointerEvents: "none" }}>
                                      <rect
                                        x={badgeX - halfW}
                                        y={rectY}
                                        width={maxBadgeWidth}
                                        height={maxBadgeHeight}
                                        rx="4"
                                        fill={mobile ? "rgba(15,23,42,0.9)" : "#0f172a"}
                                        stroke={isBreach ? "#ef4444" : "#f59e0b"}
                                        strokeWidth="1.2"
                                      />
                                      <text
                                        x={badgeX}
                                        y={rectY + maxBadgeHeight / 2}
                                        dominantBaseline="central"
                                        textAnchor="middle"
                                        fill={isBreach ? "#f87171" : "#fbbf24"}
                                        fontSize="8.5"
                                        fontWeight="800"
                                        fontFamily="var(--font-mono)"
                                      >
                                        {maxBadgeText}
                                      </text>
                                    </g>
                                  );
                                })()}

                                {/* Milestone Callout Badge (Fastest Min point) */}
                                {isMin && (mobile ? !hoveredVelocityPoint : !isHovered) && (() => {
                                  const minBadgeText = `${p.avgResolution}m Min`;
                                  const minBadgeWidth = Math.max(68, minBadgeText.length * 6.5 + 16);
                                  const minBadgeHeight = mobile ? 22 : 17;
                                  const halfW = minBadgeWidth / 2;
                                  const clampedX = Math.max((mobile ? startX : 0) + halfW + 6, Math.min((mobile ? endX : svgViewBoxWidth) - halfW - 6, p.x));
                                  const placeAbove = p.y > baselineY - 24;
                                  const rawY = placeAbove ? p.y - 8 - minBadgeHeight : p.y + 8;
                                  if (mobile && !minCallout) return null;
                                  const rectY = mobile ? minCallout!.y : rawY;
                                  const badgeX = mobile ? minCallout!.x + halfW : clampedX;

                                  return (
                                    <g style={{ pointerEvents: "none" }}>
                                      <rect
                                        x={badgeX - halfW}
                                        y={rectY}
                                        width={minBadgeWidth}
                                        height={minBadgeHeight}
                                        rx="4"
                                        fill={mobile ? "rgba(15,23,42,0.9)" : "#0f172a"}
                                        stroke="#38bdf8"
                                        strokeWidth="1.2"
                                      />
                                      <text
                                        x={badgeX}
                                        y={rectY + minBadgeHeight / 2}
                                        dominantBaseline="central"
                                        textAnchor="middle"
                                        fill="#38bdf8"
                                        fontSize="8.5"
                                        fontWeight="800"
                                        fontFamily="var(--font-mono)"
                                      >
                                        {minBadgeText}
                                      </text>
                                    </g>
                                  );
                                })()}

                                {/* Transparent Wide Hover Target Column */}
                                <rect
                                  x={p.x - stepX / 2}
                                  y={topY}
                                  width={stepX}
                                  height={chartHeight + 25}
                                  fill="transparent"
                                  className="[cursor:pointer]!"
                                  onMouseEnter={() => {
                                    setHoveredVelocityPoint({
                                      x: p.x,
                                      y: p.y,
                                      date: p.date,
                                      avgResolution: p.avgResolution,
                                      closed: p.closed,
                                      percentX: mobile ? 50 : (p.x / svgViewBoxWidth) * 100,
                                      percentY: mobile ? 60 : (p.y / viewBoxHeight) * 100,
                                    });
                                  }}
                                />
                              </g>
                            );
                          })}
                        </svg>

                        {/* ── Data Points & Nodes (HTML Overlay - Zero SVG Distortion, 100% Perfect Round Circles) ── */}
                        <div
                          className="velocity-nodes-layer [position:absolute]! [inset:0]! [pointer-events:none]! [overflow:visible]! [z-index:4]!"
                          aria-hidden="true"
                        >
                          {points.map((p) => {
                            const isBreach = p.avgResolution > SLA_BREACH_MINUTES;
                            const isHovered = hoveredVelocityPoint?.date === p.date;
                            const percentX = (p.x / svgViewBoxWidth) * 100;
                            const percentY = (p.y / viewBoxHeight) * 100;
                            const dotSize = mobile ? (isHovered ? 8 : 6) : isHovered ? 13 : isBreach ? 9 : 7;
                            const dotColor = isHovered ? "#ffffff" : isBreach ? "#ef4444" : "#38bdf8";
                            const borderColor = isHovered
                              ? isBreach
                                ? "#ef4444"
                                : "#0284c7"
                              : "var(--panel-bg, #0f172a)";

                            return (
                              <span
                                key={`vel-html-dot-${p.date}`}
                                className="velocity-node-dot"
                                style={{
                                  position: "absolute",
                                  left: `${percentX}%`,
                                  top: `${percentY}%`,
                                  width: `${dotSize}px`,
                                  height: `${dotSize}px`,
                                  minWidth: `${dotSize}px`,
                                  minHeight: `${dotSize}px`,
                                  maxWidth: `${dotSize}px`,
                                  maxHeight: `${dotSize}px`,
                                  borderRadius: "50%",
                                  transform: "translate(-50%, -50%)",
                                  backgroundColor: dotColor,
                                  border: isHovered ? `3px solid ${borderColor}` : `1.8px solid ${borderColor}`,
                                  boxShadow: isHovered
                                    ? `0 0 14px 2px ${isBreach ? "#ef4444" : "#38bdf8"}, 0 0 4px ${isBreach ? "#ef4444" : "#38bdf8"}`
                                    : "none",
                                  transition: "width 0.15s ease, height 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease",
                                  zIndex: isHovered ? 10 : 4,
                                }}
                              />
                            );
                          })}
                        </div>

                        {/* Floating Interactive Tooltip Overlay */}
                        {hoveredVelocityPoint && (
                          <div
                            role="status" aria-live="polite" className="absolute pointer-events-none z-[99] -translate-x-1/2 -translate-y-full -mt-[12px] bg-[rgba(15,23,42,0.94)] backdrop-blur-[8px] border border-[rgba(56,189,248,0.35)] rounded-[8px] p-[8px_12px] shadow-[0_8px_24px_rgba(0,0,0,0.45),0_0_12px_rgba(56,189,248,0.15)] min-w-[150px] whitespace-nowrap [animation:tooltipFade_0.15s_ease-out] velocity-chart-tooltip max-lg:w-[220px] max-lg:min-w-0 max-lg:whitespace-normal max-lg:animate-none"
                            style={{
                              left: mobile ? Math.max(112, Math.min(velocitySize.width - 112, hoveredVelocityPoint.x)) : `${hoveredVelocityPoint.percentX}%`,
                              top: mobile ? 108 : `${hoveredVelocityPoint.percentY}%`,
                            }}
                          >
                            <div className="text-[11px] font-bold text-[var(--ink-primary)] mb-[4px] border-b border-[rgba(255,255,255,0.08)] pb-[3px] flex items-center justify-between gap-[8px] velocity-tooltip-header">
                              <span>📅 {velocitySeries.find((item) => item.date === hoveredVelocityPoint.date)?.title ?? hoveredVelocityPoint.date}</span>
                              <span
                                className={`inline-block text-[9.5px] max-lg:text-[11px] font-bold p-[2px_6px] rounded-[4px] mt-[4px] velocity-tooltip-badge ${
                                  hoveredVelocityPoint.avgResolution <= SLA_TARGET_MINUTES ? "bg-[rgba(16,185,129,0.15)] text-[#34d399] border border-[rgba(16,185,129,0.3)] sla-ok" : hoveredVelocityPoint.avgResolution <= SLA_BREACH_MINUTES ? "bg-[rgba(245,158,11,0.15)] text-[#fbbf24] border border-[rgba(245,158,11,0.3)] sla-mid" : "bg-[rgba(239,68,68,0.15)] text-[#f87171] border border-[rgba(239,68,68,0.3)] sla-breach"
                                }`}
                              >
                                {hoveredVelocityPoint.avgResolution <= SLA_TARGET_MINUTES ? `✓ ≤ ${SLA_TARGET_MINUTES}m` : hoveredVelocityPoint.avgResolution <= SLA_BREACH_MINUTES ? `${SLA_TARGET_MINUTES}–${SLA_BREACH_MINUTES}m` : `⚠ > ${SLA_BREACH_MINUTES}m`}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-[12px] text-[11px] mt-[3px] text-[var(--ink-secondary)] velocity-tooltip-row">
                              <span>Rata-rata Resolusi:</span>
                              <span className="font-bold font-mono text-[#38bdf8] velocity-tooltip-val">
                                {hoveredVelocityPoint.avgResolution} Menit
                              </span>
                            </div>
                            {hoveredVelocityPoint.closed > 0 && (
                              <div className="flex items-center justify-between gap-[12px] text-[11px] mt-[3px] text-[var(--ink-secondary)] velocity-tooltip-row">
                                <span>Tiket Selesai:</span>
                                <span className="[font-weight:600]! [color:var(--ink-primary)]!">
                                  {hoveredVelocityPoint.closed} Tiket
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </>
            ) : (
              <ChartEmptyState
                icon={<Clock size={18} />}
                title={velocitySeries.length ? "Belum ada tiket selesai" : emptyTitle()}
                text={velocitySeries.length ? "Ada tiket pada rentang ini, tetapi belum ada yang ditutup. Durasi penyelesaian muncul setelah tiket ditutup." : "Durasi penyelesaian per hari muncul setelah ada tiket yang ditutup pada rentang ini."}
                actions={emptyActions()}
                className="min-h-[240px] max-lg:min-h-[220px]"
              />
            )}
            </PanelSkeletonWrapper>
          </div>
        </article>

      {/* ── 7. Shift Traffic Velocity (Multi-Line Trajectory Chart) ── */}
      <div className="heatmap-standalone-section mt-[18px] max-lg:mt-0">
        <article className="bg-[var(--panel-bg)] border border-[rgba(16,185,129,0.18)] rounded-[12px] shadow-[var(--shadow-panel)] overflow-hidden flex flex-col shift-traffic-panel">
          <div className={`${REPORT_PANEL_HEADING} report-panel-heading`}>
            <div className={`${REPORT_PANEL_TITLE} panel-title`}>
              <Activity size={16} className="text-emerald-400" />
              <span className="hidden lg:inline">Tren Trafik Beban per Shift (Shift Traffic Velocity)</span><span className="lg:hidden">Tren Trafik</span>
            </div>
            <PanelViewButton
              panelTitle="Tren Trafik Beban per Shift"
              onClick={() => handleOpenPanel("shift-traffic")}
              ariaLabel="Perbesar panel Tren Trafik Beban per Shift"
              disabled={isLoading}
            />
          </div>
          <div className="flex flex-col flex-1 justify-between p-[16px_20px] gap-[12px] report-panel-body shift-traffic-panel-body">
            <PanelSkeletonWrapper
          reserveLoading={mobile}
              isLoading={isLoading}
              isStale={isStale}
              error={error}
              onRetry={refetch}
              minHeight={280}
              className="h-full"
              loadingClassName="max-lg:flex-none max-lg:h-[453px] lg:min-h-[280px]"
                skeleton={<ShiftTrafficSkeleton />}
              liveRegionText="Memuat tren trafik shift..."
            >
            {shiftHeatmapData.grandTotal > 0 ? (
              <>
            {/* 4 Summary Stat Pills for Quick Shift Intelligence */}
            {(() => {
              const pagiTotal = shiftHeatmapData.shiftTotals["Pagi"] || 0;
              const malamTotal = shiftHeatmapData.shiftTotals["Malam"] || 0;
              const subuhTotal = shiftHeatmapData.shiftTotals["Subuh"] || 0;
              const grand = shiftHeatmapData.grandTotal || 1;
              const pagiPct = Math.round((pagiTotal / grand) * 100);
              const malamPct = Math.round((malamTotal / grand) * 100);
              const subuhPct = Math.round((subuhTotal / grand) * 100);

              return (
                <div className="grid grid-cols-4 max-[900px]:grid-cols-2 gap-[12px] mb-[14px] shift-traffic-metrics-strip max-lg:[&_.shift-traffic-metric-pill]:h-[64px] max-lg:[&_.shift-traffic-metric-pill]:gap-1 max-lg:auto-rows-fr max-lg:[&_.shift-traffic-metric-sub]:hidden">
                  <div className="flex flex-col gap-[8px] p-[12px_15px] rounded-[10px] bg-[rgba(15,23,42,0.55)] border border-[rgba(148,163,184,0.12)] min-w-0 shadow-[0_2px_8px_rgba(0,0,0,0.18)] transition-all duration-150 hover:bg-[rgba(15,23,42,0.75)] hover:border-[rgba(56,189,248,0.3)] hover:-translate-y-[1px] shift-traffic-metric-pill">
                    <div className="text-[11px] font-semibold text-[var(--ink-muted,#94a3b8)] flex items-center gap-[6px] whitespace-nowrap leading-[1.3] shift-traffic-metric-label">
                      <Sun size={13} className="[color:#fbbf24]! [flex-shrink:0]!" />
                      <span className="text-[var(--ink-primary,#f8fafc)] font-semibold shift-traffic-metric-name">Shift Pagi</span>
                      <span className="text-[10px] max-lg:text-[11px] text-[var(--ink-muted,#94a3b8)] font-mono font-medium opacity-80 ml-[2px] shift-traffic-metric-hours">(08:00–16:30)</span>
                    </div>
                    <div className="text-[18px] font-extrabold font-mono leading-[1.2] flex items-baseline gap-[6px] max-lg:text-[20px] shift-traffic-metric-val [color:#fbbf24]!">
                      {pagiTotal} <small className="text-[11.5px] font-medium text-[var(--ink-muted,#94a3b8)] shift-metric-unit">tiket</small>
                    </div>
                    <div className="text-[10.5px] max-lg:text-[11px] text-[var(--ink-muted,#94a3b8)] font-mono leading-[1.35] whitespace-nowrap overflow-hidden text-ellipsis shift-traffic-metric-sub">{pagiPct}% dari total beban</div>
                  </div>

                  <div className="flex flex-col gap-[8px] p-[12px_15px] rounded-[10px] bg-[rgba(15,23,42,0.55)] border border-[rgba(148,163,184,0.12)] min-w-0 shadow-[0_2px_8px_rgba(0,0,0,0.18)] transition-all duration-150 hover:bg-[rgba(15,23,42,0.75)] hover:border-[rgba(56,189,248,0.3)] hover:-translate-y-[1px] shift-traffic-metric-pill">
                    <div className="text-[11px] font-semibold text-[var(--ink-muted,#94a3b8)] flex items-center gap-[6px] whitespace-nowrap leading-[1.3] shift-traffic-metric-label">
                      <Sunset size={13} className="[color:#c084fc]! [flex-shrink:0]!" />
                      <span className="text-[var(--ink-primary,#f8fafc)] font-semibold shift-traffic-metric-name">Shift Malam</span>
                      <span className="text-[10px] max-lg:text-[11px] text-[var(--ink-muted,#94a3b8)] font-mono font-medium opacity-80 ml-[2px] shift-traffic-metric-hours">(16:00–00:30)</span>
                    </div>
                    <div className="text-[18px] font-extrabold font-mono leading-[1.2] flex items-baseline gap-[6px] max-lg:text-[20px] shift-traffic-metric-val [color:#c084fc]!">
                      {malamTotal} <small className="text-[11.5px] font-medium text-[var(--ink-muted,#94a3b8)] shift-metric-unit">tiket</small>
                    </div>
                    <div className="text-[10.5px] max-lg:text-[11px] text-[var(--ink-muted,#94a3b8)] font-mono leading-[1.35] whitespace-nowrap overflow-hidden text-ellipsis shift-traffic-metric-sub">{malamPct}% dari total beban</div>
                  </div>

                  <div className="flex flex-col gap-[8px] p-[12px_15px] rounded-[10px] bg-[rgba(15,23,42,0.55)] border border-[rgba(148,163,184,0.12)] min-w-0 shadow-[0_2px_8px_rgba(0,0,0,0.18)] transition-all duration-150 hover:bg-[rgba(15,23,42,0.75)] hover:border-[rgba(56,189,248,0.3)] hover:-translate-y-[1px] shift-traffic-metric-pill">
                    <div className="text-[11px] font-semibold text-[var(--ink-muted,#94a3b8)] flex items-center gap-[6px] whitespace-nowrap leading-[1.3] shift-traffic-metric-label">
                      <Moon size={13} className="[color:#38bdf8]! [flex-shrink:0]!" />
                      <span className="text-[var(--ink-primary,#f8fafc)] font-semibold shift-traffic-metric-name">Shift Subuh</span>
                      <span className="text-[10px] max-lg:text-[11px] text-[var(--ink-muted,#94a3b8)] font-mono font-medium opacity-80 ml-[2px] shift-traffic-metric-hours">(00:00–08:30)</span>
                    </div>
                    <div className="text-[18px] font-extrabold font-mono leading-[1.2] flex items-baseline gap-[6px] max-lg:text-[20px] shift-traffic-metric-val [color:#38bdf8]!">
                      {subuhTotal} <small className="text-[11.5px] font-medium text-[var(--ink-muted,#94a3b8)] shift-metric-unit">tiket</small>
                    </div>
                    <div className="text-[10.5px] max-lg:text-[11px] text-[var(--ink-muted,#94a3b8)] font-mono leading-[1.35] whitespace-nowrap overflow-hidden text-ellipsis shift-traffic-metric-sub">{subuhPct}% dari total beban</div>
                  </div>

                  <div className="flex flex-col gap-[8px] p-[12px_15px] rounded-[10px] bg-[rgba(15,23,42,0.55)] border border-[rgba(148,163,184,0.12)] min-w-0 shadow-[0_2px_8px_rgba(0,0,0,0.18)] transition-all duration-150 hover:bg-[rgba(15,23,42,0.75)] hover:border-[rgba(56,189,248,0.3)] hover:-translate-y-[1px] shift-traffic-metric-pill">
                    <div className="text-[11px] font-semibold text-[var(--ink-muted,#94a3b8)] flex items-center gap-[6px] whitespace-nowrap leading-[1.3] shift-traffic-metric-label">
                      <Zap size={13} className="[color:#f87171]! [flex-shrink:0]!" />
                      <span className="text-[var(--ink-primary,#f8fafc)] font-semibold shift-traffic-metric-name"><span className="hidden lg:inline">Total Beban Terbanyak</span><span className="lg:hidden">Puncak</span></span>
                      <span className="text-[10px] max-lg:text-[11px] text-[var(--ink-muted,#94a3b8)] font-mono font-medium opacity-80 ml-[2px] shift-traffic-metric-hours">(Kumulatif)</span>
                    </div>
                    <div className="text-[18px] font-extrabold font-mono leading-[1.2] flex items-baseline gap-[6px] max-lg:text-[20px] shift-traffic-metric-val text-rose-400">
                      {shiftHeatmapData.peakShift.name}
                    </div>
                    <div className="text-[10.5px] max-lg:text-[11px] text-[var(--ink-muted,#94a3b8)] font-mono leading-[1.35] whitespace-nowrap overflow-hidden text-ellipsis shift-traffic-metric-sub">
                      {shiftHeatmapData.shiftTotals[shiftHeatmapData.peakShift.id]} tiket (
                      {grand > 0
                        ? Math.round(
                            (shiftHeatmapData.shiftTotals[shiftHeatmapData.peakShift.id] / grand) * 100
                          )
                        : 0}
                      % total)
                    </div>
                  </div>
                </div>
              );
            })()}

            {trafficGranularity !== "day" && (
              <ChartModeNote badge={granularityBadge(trafficGranularity)} detail="Kartu di atas mencakup seluruh rentang, bukan hanya yang terlihat di grafik." className="-mt-[2px]">
                {granularityNote(trafficView.first, trafficView.last, trafficGranularity)}
              </ChartModeNote>
            )}
            {/* Clean, Prominent Multi-Line Chart Modeled After Resolution Velocity */}
            <div
              ref={trafficChartRef}
                  role={mobile ? "slider" : undefined}
                  aria-valuemin={mobile ? 0 : undefined}
                  aria-valuemax={mobile ? Math.max(0, trafficView.dateList.length - 1) : undefined}
                  aria-valuenow={mobile ? hoveredShiftTrafficPoint ? Math.max(0, trafficView.dateList.indexOf(hoveredShiftTrafficPoint.date)) : Math.max(0, trafficView.dateList.length - 1) : undefined}
                  aria-valuetext={mobile ? hoveredShiftTrafficPoint?.date : undefined}
                  tabIndex={mobile ? 0 : undefined}
                  aria-label="Tren trafik; gunakan panah kiri atau kanan untuk rincian"
                  onBlur={() => { if (mobile) setHoveredShiftTrafficPoint(null); }}
                  onKeyDown={event => {
                    if (!mobile) return;
                    if (event.key === "Escape") { setHoveredShiftTrafficPoint(null); return; }
                    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                    event.preventDefault();
                    const dates = trafficView.dateList; if (!dates.length) return;
                    const current = hoveredShiftTrafficPoint ? dates.indexOf(hoveredShiftTrafficPoint.date) : dates.length - 1;
                    const index = event.key === "Home" ? 0 : event.key === "End" ? dates.length - 1 : Math.max(0, Math.min(dates.length - 1, current + (event.key === "ArrowRight" ? 1 : -1)));
                    const x = 42 + index * (trafficSize.width - 66) / Math.max(1, dates.length - 1);
                    const date = dates[index]; const subuh = trafficView.matrix.Subuh[date] || 0, pagi = trafficView.matrix.Pagi[date] || 0, malam = trafficView.matrix.Malam[date] || 0; setHoveredShiftTrafficPoint({ x, y: 100, date, subuh, pagi, malam, total: subuh + pagi + malam, percentX: 50, percentY: 80 });
                  }}
              className="relative w-full h-[275px] min-h-[265px] max-h-[310px] flex flex-col flex-1 overflow-visible compact-shift-traffic-chart-container max-lg:h-[252px] max-lg:min-h-[252px] max-lg:flex-none max-lg:touch-pan-y"
              onPointerDown={(event) => {
                if (!mobile || !trafficView.dateList.length) return;
                const box = event.currentTarget.getBoundingClientRect();
                const dates = trafficView.dateList;
                const idx = Math.max(0, Math.min(dates.length - 1, Math.round((event.clientX - box.left - 42) / Math.max(1, box.width - 66) * (dates.length - 1))));
                const date = dates[idx];
                const subuh = trafficView.matrix.Subuh[date] || 0, pagi = trafficView.matrix.Pagi[date] || 0, malam = trafficView.matrix.Malam[date] || 0;
                setHoveredShiftTrafficPoint({ x: 42 + idx * (box.width - 66) / Math.max(1, dates.length - 1), y: 100, date, subuh, pagi, malam, total: subuh + pagi + malam, percentX: 50, percentY: 80 });
              }}
              onPointerMove={(event) => {
                if (!mobile || event.pointerType !== "touch" || !event.buttons || !trafficView.dateList.length) return;
                const box = event.currentTarget.getBoundingClientRect();
                const dates = trafficView.dateList;
                const idx = Math.max(0, Math.min(dates.length - 1, Math.round((event.clientX - box.left - 42) / Math.max(1, box.width - 66) * (dates.length - 1))));
                const date = dates[idx];
                const subuh = trafficView.matrix.Subuh[date] || 0, pagi = trafficView.matrix.Pagi[date] || 0, malam = trafficView.matrix.Malam[date] || 0;
                setHoveredShiftTrafficPoint({ x: 42 + idx * (box.width - 66) / Math.max(1, dates.length - 1), y: 100, date, subuh, pagi, malam, total: subuh + pagi + malam, percentX: 50, percentY: 80 });
              }}
              onMouseLeave={() => setHoveredShiftTrafficPoint(null)}
            >
              {(() => {
                const dateList = trafficView.dateList;
                const n = dateList.length;
                // The viewBox is the measured box (labels are HTML on top), so the lines and dots keep their real proportions
                const svgViewBoxWidth = mobile ? trafficSize.width || 320 : Math.max(480, trafficSize.width || 860);
                const viewBoxHeight = mobile ? trafficSize.height || 252 : Math.max(250, trafficSize.height || 280);
                const startX = mobile ? 42 : 46;
                const endX = svgViewBoxWidth - (mobile ? 24 : 36);
                const totalSpan = endX - startX;
                const stepX = n > 1 ? totalSpan / (n - 1) : totalSpan / 2;

                const baselineY = mobile ? viewBoxHeight - 36 : viewBoxHeight - 46;
                const topY = mobile ? 38 : 38;
                const chartHeight = baselineY - topY;

                // Y ticks calculation - tight scaling to prevent empty top rows!
                const allCounts = dateList.flatMap((d) => [
                  trafficView.matrix.Subuh[d] || 0,
                  trafficView.matrix.Pagi[d] || 0,
                  trafficView.matrix.Malam[d] || 0,
                ]);
                const maxCount = Math.max(3, ...allCounts);
                // up to 8 the axis is fitted tightly; above that it uses round whole-number steps (0, 10, 20, 30 rather than 0, 7, 14, 21, 26)
                const fittedMax = maxCount <= 3 ? 3 : maxCount <= 6 ? maxCount : Math.ceil(maxCount / 2) * 2;
                const stepTick = fittedMax <= 4 ? 1 : fittedMax <= 8 ? 2 : wholeStep(fittedMax / 4);
                const yMax = fittedMax <= 8 ? fittedMax : Math.ceil(maxCount / stepTick) * stepTick;
                const ticks: number[] = [];
                for (let i = 0; i <= yMax; i += stepTick) ticks.push(i);
                if (ticks[ticks.length - 1] !== yMax) ticks.push(yMax);

                // Coordinates generator for shifts
                type ShiftKey = "Subuh" | "Pagi" | "Malam";
                const shiftsMeta: { id: ShiftKey; name: string; color: string; gradId: string }[] = [
                  { id: "Subuh", name: "Shift Subuh", color: "#38bdf8", gradId: "gradShiftSubuh" },
                  { id: "Pagi", name: "Shift Pagi", color: "#fbbf24", gradId: "gradShiftPagi" },
                  { id: "Malam", name: "Shift Malam", color: "#c084fc", gradId: "gradShiftMalam" },
                ];

                const shiftSeries = shiftsMeta.map((s) => {
                  const points = dateList.map((d, idx) => {
                    const x = n > 1 ? Math.round(startX + idx * stepX) : Math.round((startX + endX) / 2);
                    const count = trafficView.matrix[s.id][d] || 0;
                    const y = baselineY - Math.round((count / yMax) * chartHeight);
                    return { x, y, count, date: d, idx };
                  });

                  const firstX = points[0]?.x ?? startX;
                  const lastX = points[points.length - 1]?.x ?? endX;
                  const pathD = `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`;
                  const areaD = `M ${firstX},${baselineY} L ${points.map((p) => `${p.x},${p.y}`).join(" L ")} L ${lastX},${baselineY} Z`;

                  return {
                    ...s,
                    points,
                    pathD,
                    areaD,
                  };
                });

                // Overall peak point identifier
                type ShiftPeakPoint = { x: number; y: number; count: number; shiftName: string; date: string };
                let maxOverallCount = -1;
                let foundPeak: ShiftPeakPoint | null = null;
                shiftSeries.forEach((series) => {
                  series.points.forEach((p) => {
                    if (p.count > maxOverallCount && p.count > 0) {
                      maxOverallCount = p.count;
                      foundPeak = { x: p.x, y: p.y, count: p.count, shiftName: series.name, date: p.date };
                    }
                  });
                });
                const peakPointMeta: ShiftPeakPoint | null = foundPeak;

                // X-axis stride to prevent label congestion
                const dateStride = mobile ? Math.max(1, Math.ceil(n / 4)) : Math.max(1, Math.ceil((trafficGranularity === "day" ? 48 : 58) / Math.max(1, stepX)));

                return (
                  <>
                    <svg
                      className="w-full h-full min-h-[250px] block select-none overflow-visible compact-shift-traffic-chart-svg max-lg:min-h-[252px] max-lg:[&_text]:text-[11px]"
                      viewBox={`0 0 ${svgViewBoxWidth} ${viewBoxHeight}`}
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id="gradShiftSubuh" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.2" />
                          <stop offset="85%" stopColor="#38bdf8" stopOpacity="0.03" />
                          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="gradShiftPagi" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.2" />
                          <stop offset="85%" stopColor="#fbbf24" stopOpacity="0.03" />
                          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="gradShiftMalam" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#c084fc" stopOpacity="0.2" />
                          <stop offset="85%" stopColor="#c084fc" stopOpacity="0.03" />
                          <stop offset="100%" stopColor="#c084fc" stopOpacity="0.0" />
                        </linearGradient>

                        <filter id="glow-shift-subuh" x="-50%" y="-50%" width="200%" height="200%">
                          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#38bdf8" floodOpacity="0.6" />
                        </filter>
                        <filter id="glow-shift-pagi" x="-50%" y="-50%" width="200%" height="200%">
                          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#fbbf24" floodOpacity="0.6" />
                        </filter>
                        <filter id="glow-shift-malam" x="-50%" y="-50%" width="200%" height="200%">
                          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#c084fc" floodOpacity="0.6" />
                        </filter>
                      </defs>

                      {/* ── 1. Horizontal Gridlines ── */}
                      {ticks.map((tick) => {
                        const yPos = baselineY - Math.round((tick / yMax) * chartHeight);
                        const isBaseline = tick === 0;

                        return (
                          <line
                            key={`grid-shift-${tick}`}
                            x1={startX - 8}
                            y1={yPos}
                            x2={endX + 6}
                            y2={yPos}
                            stroke={
                              isBaseline
                                ? "var(--line, rgba(255, 255, 255, 0.12))"
                                : "rgba(255, 255, 255, 0.05)"
                            }
                            strokeWidth={isBaseline ? "1.2" : "1"}
                            strokeDasharray={isBaseline ? undefined : "3 4"}
                          />
                        );
                      })}

                      {/* ── 2. Multi-Line Paths and Area Gradients ── */}
                      {shiftSeries.map((series) => {
                        const isFiltered =
                          activeShiftLineFilter !== "all" && activeShiftLineFilter !== series.id;
                        const isTargeted = activeShiftLineFilter === series.id;
                        const opacity = isFiltered ? 0.12 : 1;

                        return (
                          <g
                            key={`series-${series.id}`}
                            style={{ opacity, transition: "opacity 0.2s ease" }}
                          >
                            <path d={series.areaD} fill={`url(#${series.gradId})`} />
                            <path
                              d={series.pathD}
                              fill="none"
                              stroke={series.color}
                              strokeWidth={isTargeted ? "2.6" : "2"}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </g>
                        );
                      })}

                      {/* ── 3. Vertical Cursor Guideline for Hovered Column ── */}
                      {hoveredShiftTrafficPoint && (
                        <line
                          x1={hoveredShiftTrafficPoint.x}
                          y1={topY}
                          x2={hoveredShiftTrafficPoint.x}
                          y2={baselineY}
                          stroke="rgba(56, 189, 248, 0.4)"
                          strokeWidth="1.2"
                          strokeDasharray="3 3"
                        />
                      )}

                      {/* ── 5. X-Axis Tick Marks & Hover Hit Columns ── */}
                      {dateList.map((d, idx) => {
                        const x =
                          n > 1 ? Math.round(startX + idx * stepX) : Math.round((startX + endX) / 2);
                        const showXLabel = idx === n - 1 || (idx % dateStride === 0 && n - 1 - idx >= dateStride);
                        const subuh = trafficView.matrix.Subuh[d] || 0;
                        const pagi = trafficView.matrix.Pagi[d] || 0;
                        const malam = trafficView.matrix.Malam[d] || 0;
                        const total = subuh + pagi + malam;

                        // Calculate y of highest shift for tooltip positioning
                        const topShiftCount = Math.max(subuh, pagi, malam);
                        const topShiftY =
                          baselineY - Math.round((topShiftCount / yMax) * chartHeight);

                        return (
                          <g key={`col-${d}`}>
                            {showXLabel && (
                              <line
                                x1={x}
                                y1={baselineY}
                                x2={x}
                                y2={baselineY + 4}
                                stroke="rgba(255, 255, 255, 0.18)"
                                strokeWidth="1"
                              />
                            )}

                            {/* Transparent Wide Hover Target Column */}
                            <rect
                              x={x - stepX / 2}
                              y={topY}
                              width={stepX}
                              height={chartHeight + 24}
                              fill="transparent"
                              className="[cursor:pointer]!"
                              onMouseEnter={() => {
                                setHoveredShiftTrafficPoint({
                                  x,
                                  y: topShiftY,
                                  date: d,
                                  subuh,
                                  pagi,
                                  malam,
                                  total,
                                  percentX: mobile ? 50 : (x / svgViewBoxWidth) * 100,
                                  percentY: mobile ? 80 : (topShiftY / viewBoxHeight) * 100,
                                });
                              }}
                            />
                          </g>
                        );
                      })}
                    </svg>

                    {/* ── Data Points & Nodes per Shift (HTML Overlay - Zero SVG Distortion, 100% Perfect Round Circles) ── */}
                    <div
                      className="shift-traffic-nodes-layer [position:absolute]! [inset:0]! [pointer-events:none]! [overflow:visible]! [z-index:4]!"
                      aria-hidden="true"
                    >
                      {shiftSeries.map((series) => {
                        const isFiltered =
                          activeShiftLineFilter !== "all" && activeShiftLineFilter !== series.id;
                        if (isFiltered) return null;

                        return series.points.map((p) => {
                          const isColHovered = hoveredShiftTrafficPoint?.date === p.date;
                          const percentX = (p.x / svgViewBoxWidth) * 100;
                          const percentY = (p.y / viewBoxHeight) * 100;
                          const dotSize = isColHovered ? 11 : 6;

                          return (
                            <span
                              key={`html-node-${series.id}-${p.date}`}
                              className="shift-traffic-node-dot"
                              style={{
                                position: "absolute",
                                left: `${percentX}%`,
                                top: `${percentY}%`,
                                width: `${dotSize}px`,
                                height: `${dotSize}px`,
                                minWidth: `${dotSize}px`,
                                minHeight: `${dotSize}px`,
                                maxWidth: `${dotSize}px`,
                                maxHeight: `${dotSize}px`,
                                borderRadius: "50%",
                                transform: "translate(-50%, -50%)",
                                backgroundColor: isColHovered ? "#ffffff" : series.color,
                                border: isColHovered
                                  ? `2.5px solid ${series.color}`
                                  : "1.5px solid var(--panel-bg, #0f172a)",
                                boxShadow: isColHovered
                                  ? `0 0 12px 2px ${series.color}, 0 0 4px ${series.color}`
                                  : "none",
                                transition: "width 0.15s ease, height 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease",
                                zIndex: isColHovered ? 10 : 4,
                              }}
                            />
                          );
                        });
                      })}
                    </div>

                    {/* Y-Axis Tick Labels (HTML Overlay - Zero SVG Distortion) */}
                    <div
                      className="absolute left-0 top-0 bottom-0 pointer-events-none z-[5] shift-traffic-y-axis"
                      style={{ width: `${(startX / svgViewBoxWidth) * 100}%` }}
                    >
                      {ticks.map((tick) => {
                        const yPos = baselineY - Math.round((tick / yMax) * chartHeight);
                        const percentY = (yPos / viewBoxHeight) * 100;
                        return (
                          <span
                            key={`y-label-${tick}`}
                            className="absolute right-[10px] -translate-y-1/2 text-[11px] font-semibold font-mono text-[var(--ink-muted,#94a3b8)] leading-none text-right select-none tracking-[-0.02em] shift-traffic-y-label"
                            style={{ top: `${percentY}%` }}
                          >
                            {tick}
                          </span>
                        );
                      })}
                    </div>

                    {/* X-Axis Date Labels (HTML Overlay - Zero SVG Distortion) */}
                    <div
                      className="absolute left-0 right-0 h-[24px] pointer-events-none z-[5] shift-traffic-x-axis"
                      style={{ top: `${(baselineY / viewBoxHeight) * 100}%` }}
                    >
                      {dateList.map((d, idx) => {
                        const x =
                          n > 1 ? Math.round(startX + idx * stepX) : Math.round((startX + endX) / 2);
                        const showXLabel = idx === n - 1 || (idx % dateStride === 0 && n - 1 - idx >= dateStride);
                        if (!showXLabel) return null;
                        const percentX = (x / svgViewBoxWidth) * 100;
                        const isHovered = hoveredShiftTrafficPoint?.date === d;

                        return (
                          <span
                            key={`x-label-${d}`}
                            className={`absolute -translate-x-1/2 translate-y-[6px] text-[11px] font-medium font-mono text-[var(--ink-muted,#94a3b8)] whitespace-nowrap select-none transition-[color,font-weight] duration-150 tracking-[-0.01em] shift-traffic-x-label ${isHovered ? "text-[#38bdf8] font-bold hovered" : ""}`}
                            style={{ left: mobile ? Math.max(19, Math.min(svgViewBoxWidth - 19, x)) : `${percentX}%` }}
                          >
                            {trafficView.label(d)}
                          </span>
                        );
                      })}
                    </div>

                    {/* Milestone Peak Callout Badge (HTML Overlay - Zero SVG Distortion) */}
                    {peakPointMeta && !hoveredShiftTrafficPoint && ((peak: ShiftPeakPoint) => {
                      const percentX = (peak.x / svgViewBoxWidth) * 100;
                      const percentY = (peak.y / viewBoxHeight) * 100;
                      // near the right edge the label grows leftwards, near the left edge rightwards, so it is never cut off by the card
                      const clampedPercentX = Math.max(2, Math.min(98, percentX));
                      const anchorX = percentX > 68 ? "-100%" : percentX < 32 ? "0%" : "-50%";
                      const nudgeX = percentX > 68 ? "14px" : percentX < 32 ? "-14px" : "0px";
                      const mobilePeakX = Math.max(startX + 55, Math.min(endX - 55, peak.x));
                      const isNearTop = percentY < 12;

                      return (
                        <div
                          className="absolute pointer-events-none z-[15] inline-flex items-center gap-[5px] p-[3px_9px] rounded-[6px] bg-[rgba(15,23,42,0.95)] border-[1.2px] border-solid border-[#f59e0b] text-[11px] font-bold font-mono leading-[1.2] text-[#fbbf24] shadow-[0_4px_12px_rgba(0,0,0,0.5),0_0_10px_rgba(245,158,11,0.25)] whitespace-nowrap [&_strong]:text-[#fef08a] [&_strong]:font-extrabold shift-traffic-peak-badge max-lg:flex max-lg:h-6 max-lg:px-2"
                          style={{
                            left: mobile ? mobilePeakX : `${clampedPercentX}%`,
                            top: mobile ? Math.max(0, peak.y - 32) : `${percentY}%`,
                            transform: mobile ? "translateX(-50%)" : isNearTop
                              ? `translate(calc(${anchorX} + ${nudgeX}), 12px)`
                              : `translate(calc(${anchorX} + ${nudgeX}), calc(-100% - 10px))`,
                          }}
                        >
                          <span className="w-[5px] h-[5px] rounded-[50%] bg-[#f59e0b] shadow-[0_0_6px_#f59e0b] shrink-0 shift-traffic-peak-dot" />
                          <span>
                            {mobile ? <>Lonjakan <strong>{peak.count}</strong></> : <>Lonjakan: <strong>{peak.count} Tiket</strong> ({peak.shiftName})</>}
                          </span>
                        </div>
                      );
                    })(peakPointMeta)}

                    {/* Floating Interactive Hover Tooltip */}
                    {hoveredShiftTrafficPoint && (
                      <div
                        role="status" aria-live="polite" className="absolute pointer-events-none z-[99] -translate-x-1/2 -translate-y-full -mt-[12px] bg-[rgba(15,23,42,0.94)] backdrop-blur-[8px] border border-[rgba(56,189,248,0.35)] rounded-[8px] p-[8px_12px] shadow-[0_8px_24px_rgba(0,0,0,0.45),0_0_12px_rgba(56,189,248,0.15)] min-w-[160px] whitespace-nowrap shift-traffic-tooltip max-lg:w-[220px] max-lg:min-w-0 max-lg:whitespace-normal"
                        style={{
                          left: mobile ? Math.max(112, Math.min(trafficSize.width - 112, hoveredShiftTrafficPoint.x)) : `${hoveredShiftTrafficPoint.percentX}%`,
                          top: mobile ? 170 : `${hoveredShiftTrafficPoint.percentY}%`,
                        }}
                      >
                        <div className="text-[11px] font-bold text-[var(--ink-primary)] mb-[4px] border-b border-[rgba(255,255,255,0.08)] pb-[3px] flex items-center justify-between gap-[8px] shift-traffic-tooltip-header">
                          <span>📅 {trafficView.title(hoveredShiftTrafficPoint.date)}</span>
                          <span className="[color:#38bdf8]! [font-weight:700]!">
                            {hoveredShiftTrafficPoint.total} Tiket
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-[12px] text-[11px] mt-[3px] text-[var(--ink-secondary)] shift-traffic-tooltip-row">
                          <span className="[display:inline-flex]! [align-items:center]! [gap:6px]!">
                            <span className="w-[8px] h-[8px] rounded-[50%] inline-block bg-[#fbbf24] shadow-[0_0_6px_rgba(251,191,36,0.6)] shift-legend-dot dot-pagi" /> Shift Pagi:
                          </span>
                          <span className="font-bold font-mono shift-traffic-tooltip-val [color:#fbbf24]!">
                            {hoveredShiftTrafficPoint.pagi} Tiket
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-[12px] text-[11px] mt-[3px] text-[var(--ink-secondary)] shift-traffic-tooltip-row">
                          <span className="[display:inline-flex]! [align-items:center]! [gap:6px]!">
                            <span className="w-[8px] h-[8px] rounded-[50%] inline-block bg-[#c084fc] shadow-[0_0_6px_rgba(192,132,252,0.6)] shift-legend-dot dot-malam" /> Shift Malam:
                          </span>
                          <span className="font-bold font-mono shift-traffic-tooltip-val [color:#c084fc]!">
                            {hoveredShiftTrafficPoint.malam} Tiket
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-[12px] text-[11px] mt-[3px] text-[var(--ink-secondary)] shift-traffic-tooltip-row">
                          <span className="[display:inline-flex]! [align-items:center]! [gap:6px]!">
                            <span className="w-[8px] h-[8px] rounded-[50%] inline-block bg-[#38bdf8] shadow-[0_0_6px_rgba(56,189,248,0.6)] shift-legend-dot dot-subuh" /> Shift Subuh:
                          </span>
                          <span className="font-bold font-mono shift-traffic-tooltip-val [color:#38bdf8]!">
                            {hoveredShiftTrafficPoint.subuh} Tiket
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-[12px] text-[11px] border-t border-[rgba(255,255,255,0.08)] pt-[3px] mt-[4px] font-bold text-[var(--ink-primary)] shift-traffic-tooltip-row shift-traffic-tooltip-total">
                          <span>{trafficGranularity === "day" ? "Total Harian:" : "Total Periode:"}</span>
                          <span className="font-bold font-mono shift-traffic-tooltip-val">
                            {hoveredShiftTrafficPoint.total} Tiket
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Filter and Shift Legend Bar */}
            <div className="flex items-center justify-between flex-wrap gap-[8px] mt-[4px] pt-[10px] pr-[20px] border-t border-[rgba(148,163,184,0.1)] shift-traffic-filter-bar max-lg:pr-0 max-lg:flex-nowrap max-lg:[&_.shift-filter-buttons]:grid max-lg:[&_.shift-filter-buttons]:grid-cols-4 max-lg:[&_.shift-filter-buttons]:w-full max-lg:[&_.shift-filter-buttons]:gap-2 max-lg:[&_.shift-filter-buttons>span]:hidden max-lg:[&_.shift-filter-btn]:justify-center max-lg:[&_.shift-filter-btn]:min-w-0 max-lg:[&_.shift-filter-btn]:px-0 max-lg:[&_.shift-filter-btn]:gap-1">
              <div className="flex items-center gap-[5px] flex-wrap shift-filter-buttons">
                <span className="text-[11px] font-semibold text-[var(--ink-muted)] mr-[4px]">
                  Tampilkan Garis:
                </span>
                <button
                  type="button"
                  className={`inline-flex items-center gap-[4px] p-[2px_8px] rounded-[5px] text-[10.5px] max-lg:text-[11px] font-semibold cursor-pointer transition-all duration-150 ease-out select-none border shift-filter-btn max-lg:min-h-10 ${activeShiftLineFilter === "all" ? "bg-[rgba(56,189,248,0.18)] text-white border-[#38bdf8] shadow-[0_0_8px_rgba(56,189,248,0.2)] active" : "bg-[rgba(148,163,184,0.06)] border-[rgba(148,163,184,0.15)] text-[var(--ink-secondary)] hover:bg-[rgba(56,189,248,0.1)] hover:text-[#38bdf8] hover:border-[rgba(56,189,248,0.3)]"}`}
                  aria-pressed={activeShiftLineFilter === "all"}
                  onClick={() => setActiveShiftLineFilter("all")}
                >
                  <span className="hidden lg:inline">Semua Shift</span><span className="lg:hidden">Semua</span>
                </button>
                <button
                  type="button"
                  className={`inline-flex items-center gap-[4px] p-[2px_8px] rounded-[5px] text-[10.5px] max-lg:text-[11px] font-semibold cursor-pointer transition-all duration-150 ease-out select-none border shift-filter-btn max-lg:min-h-10 ${activeShiftLineFilter === "Pagi" ? "bg-[rgba(56,189,248,0.18)] text-white border-[#38bdf8] shadow-[0_0_8px_rgba(56,189,248,0.2)] active" : "bg-[rgba(148,163,184,0.06)] border-[rgba(148,163,184,0.15)] text-[var(--ink-secondary)] hover:bg-[rgba(56,189,248,0.1)] hover:text-[#38bdf8] hover:border-[rgba(56,189,248,0.3)]"}`}
                  aria-pressed={activeShiftLineFilter === "Pagi"}
                  onClick={() => setActiveShiftLineFilter("Pagi")}
                >
                  <span className="inline-block w-[8px] h-[8px] rounded-[50%] shrink-0 bg-[#fbbf24] shadow-[0_0_6px_rgba(251,191,36,0.6)] shift-legend-dot dot-pagi" />
                  <span className="hidden lg:inline">Shift Pagi</span><span className="lg:hidden">Pagi</span>
                </button>
                <button
                  type="button"
                  className={`inline-flex items-center gap-[4px] p-[2px_8px] rounded-[5px] text-[10.5px] max-lg:text-[11px] font-semibold cursor-pointer transition-all duration-150 ease-out select-none border shift-filter-btn max-lg:min-h-10 ${activeShiftLineFilter === "Malam" ? "bg-[rgba(56,189,248,0.18)] text-white border-[#38bdf8] shadow-[0_0_8px_rgba(56,189,248,0.2)] active" : "bg-[rgba(148,163,184,0.06)] border-[rgba(148,163,184,0.15)] text-[var(--ink-secondary)] hover:bg-[rgba(56,189,248,0.1)] hover:text-[#38bdf8] hover:border-[rgba(56,189,248,0.3)]"}`}
                  aria-pressed={activeShiftLineFilter === "Malam"}
                  onClick={() => setActiveShiftLineFilter("Malam")}
                >
                  <span className="inline-block w-[8px] h-[8px] rounded-[50%] shrink-0 bg-[#c084fc] shadow-[0_0_6px_rgba(192,132,252,0.6)] shift-legend-dot dot-malam" />
                  <span className="hidden lg:inline">Shift Malam</span><span className="lg:hidden">Malam</span>
                </button>
                <button
                  type="button"
                  className={`inline-flex items-center gap-[4px] p-[2px_8px] rounded-[5px] text-[10.5px] max-lg:text-[11px] font-semibold cursor-pointer transition-all duration-150 ease-out select-none border shift-filter-btn max-lg:min-h-10 ${activeShiftLineFilter === "Subuh" ? "bg-[rgba(56,189,248,0.18)] text-white border-[#38bdf8] shadow-[0_0_8px_rgba(56,189,248,0.2)] active" : "bg-[rgba(148,163,184,0.06)] border-[rgba(148,163,184,0.15)] text-[var(--ink-secondary)] hover:bg-[rgba(56,189,248,0.1)] hover:text-[#38bdf8] hover:border-[rgba(56,189,248,0.3)]"}`}
                  aria-pressed={activeShiftLineFilter === "Subuh"}
                  onClick={() => setActiveShiftLineFilter("Subuh")}
                >
                  <span className="inline-block w-[8px] h-[8px] rounded-[50%] shrink-0 bg-[#38bdf8] shadow-[0_0_6px_rgba(56,189,248,0.6)] shift-legend-dot dot-subuh" />
                  <span className="hidden lg:inline">Shift Subuh</span><span className="lg:hidden">Subuh</span>
                </button>
              </div>
            </div>
              </>
            ) : (
              <ChartEmptyState
                tone="emerald"
                icon={<Activity size={18} />}
                title={emptyTitle()}
                text="Trafik tiket per shift (Pagi, Malam, Subuh) muncul setelah ada tiket pada rentang ini."
                actions={emptyActions()}
                className="min-h-[220px]"
              />
            )}
            </PanelSkeletonWrapper>
          </div>
        </article>
      </div>



      {/* ── 8. User Ticket Detail Modal (Task 2: Fixed Viewport Portal Modal) ── */}
      {isMounted &&
        selectedUserDetail &&
        typeof document !== "undefined" &&
        createPortal(
          <div data-user-modal="true" className="fixed inset-0 w-screen h-screen bg-black/80 backdrop-blur-[6px] z-[999999] flex items-center justify-center p-[24px_16px] overflow-y-auto overscroll-contain animate-[modalFadeIn_0.15s_ease-out] user-modal-overlay max-lg:h-dvh max-lg:p-0 max-lg:[&_button]:min-h-10 max-lg:[&_button]:min-w-10" onClick={() => setSelectedUserDetail(null)}>
            <div ref={userModalRef} role="dialog" aria-modal="true" aria-label={`Detail tiket ${selectedUserDetail.name}`} className="relative w-full max-w-[780px] max-h-[86vh] bg-[#0f172a] border border-[rgba(56,189,248,0.35)] rounded-[14px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.05)] flex flex-col overflow-hidden m-auto animate-[modalScaleUp_0.15s_ease-out] user-modal-card max-lg:max-h-full max-lg:h-full max-lg:rounded-none max-lg:pt-[var(--ctd-safe-top,env(safe-area-inset-top,0px))] max-lg:pb-[var(--ctd-safe-bottom,env(safe-area-inset-bottom,0px))]" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-[16px_20px] border-b border-[rgba(148,163,184,0.12)] bg-[rgba(148,163,184,0.04)] shrink-0 user-modal-header">
                <div className="flex items-center gap-[12px] user-modal-profile">
                  <div
                    className="drawer-avatar-ring-wrapper"
                    style={getStatusRingStyle(
                      undefined,
                      selectedUserDetail.name.toLowerCase().includes("galih"),
                      userStatus
                    ) as React.CSSProperties}
                  >
                    <Avatar size="lg" initials={selectedUserDetail.initials} name={selectedUserDetail.name} className="w-[42px] h-[42px] rounded-full flex items-center justify-center text-[15px] font-extrabold text-white user-avatar-lg" />
                    <span
                      className="drawer-avatar-status-badge"
                      style={{
                        backgroundColor: (getStatusRingStyle(
                          undefined,
                          selectedUserDetail.name.toLowerCase().includes("galih"),
                          userStatus
                        ) as any)["--status-ring-color"]
                      }}
                    />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-extrabold text-[var(--ink-primary)] m-0 user-modal-title">{selectedUserDetail.name}</h3>
                    <p className="text-[11.5px] text-[var(--ink-muted)] m-[2px_0_0] user-modal-sub">{selectedUserDetail.role}</p>
                  </div>
                </div>
                <ModalCloseButton
                  onClose={() => setSelectedUserDetail(null)}
                  label="Tutup Detail (Esc)"
                />
              </div>

              <div className="p-[16px_20px] flex flex-col gap-[14px] overflow-y-auto flex-1 user-modal-body">
                {/* Five periods, from all tickets down to today */}
                {(() => {
                  const user = selectedUserDetail;
                  const periods = [
                    { key: "total", label: "Total", hint: "Semua tiket pada filter yang dipilih", value: user.totalCount, breakdown: user.totalBreakdown, tone: "text-[var(--ink-primary)]", ring: "border-slate-500/30 bg-slate-400/[0.06]" },
                    { key: "year", label: "Tahun Ini", hint: `Sejak 1 Januari ${todayWib.slice(0, 4)}`, value: user.yearCount, breakdown: user.yearBreakdown, tone: "text-[#a78bfa]", ring: "border-violet-400/25 bg-violet-400/[0.06]" },
                    { key: "month", label: "Bulan Ini", hint: "Sejak tanggal 1 bulan ini", value: user.monthCount, breakdown: user.monthBreakdown, tone: "text-[#34d399]", ring: "border-emerald-400/25 bg-emerald-400/[0.06]" },
                    { key: "week", label: "Minggu Ini", hint: "Senin sampai hari ini", value: user.weekCount, breakdown: user.weekBreakdown, tone: "text-[#fbbf24]", ring: "border-amber-400/25 bg-amber-400/[0.06]" },
                    { key: "today", label: "Saat Ini", hint: "Tiket yang dibuka hari ini", value: user.todayCount, breakdown: user.todayBreakdown, tone: "text-[#38bdf8]", ring: "border-sky-400/30 bg-sky-400/[0.07]" },
                  ];
                  const projects = Object.entries(user.totalBreakdown).sort((a, b) => b[1] - a[1]).map(([project]) => project);
                  return (
                    <>
                      <div className="grid grid-cols-5 gap-2.5 max-[720px]:grid-cols-3 max-[420px]:grid-cols-2 user-modal-periods-grid">
                        {periods.map((period) => (
                          <div key={period.key} className={`flex flex-col gap-1 rounded-[10px] border p-[10px_12px] user-period-card ${period.ring}`} title={period.hint}>
                            <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--ink-muted)]">{period.label}</span>
                            <strong className={`font-mono text-[22px] font-extrabold leading-none tabular-nums ${period.tone}`}>{period.value.toLocaleString("id-ID")}</strong>
                            <span className="text-[10px] text-[var(--ink-muted)]">tiket</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-col gap-2 user-modal-breakdown">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[12px] font-bold text-[var(--ink-primary)]">Rincian per Proyek</span>
                          <span className="text-[10.5px] text-[var(--ink-muted)]">{projects.length} proyek</span>
                        </div>
                        {projects.length ? (
                          <div className="overflow-x-auto rounded-[10px] border border-[rgba(148,163,184,0.12)]">
                            <table className="w-full min-w-[460px] border-collapse text-[11.5px]">
                              <thead>
                                <tr className="bg-[rgba(148,163,184,0.06)] text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--ink-muted)]">
                                  <th scope="col" className="px-3 py-2 text-left">Proyek</th>
                                  {periods.map((period) => <th key={period.key} scope="col" className="px-3 py-2 text-right whitespace-nowrap">{period.label}</th>)}
                                </tr>
                              </thead>
                              <tbody>
                                {projects.map((project) => (
                                  <tr key={project} className="border-t border-[rgba(148,163,184,0.08)]">
                                    <th scope="row" className="px-3 py-[7px] text-left font-semibold text-[var(--ink-secondary)]">
                                      <span className="inline-flex items-center gap-2">
                                        <i className="inline-block size-[9px] shrink-0 rounded-[2.5px]" style={{ background: PROJECT_COLORS[project] || "#94a3b8" }} />
                                        {projectLabel(project, activeClientId)}
                                      </span>
                                    </th>
                                    {periods.map((period) => {
                                      const count = period.breakdown[project] || 0;
                                      return <td key={period.key} className={`px-3 py-[7px] text-right font-mono tabular-nums ${count ? `font-bold ${period.tone}` : "text-slate-600"}`}>{count || "–"}</td>;
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="rounded-[10px] border border-dashed border-[rgba(148,163,184,0.18)] px-4 py-5 text-center text-[12px] text-[var(--ink-muted)]">Belum ada tiket untuk orang ini pada filter yang dipilih.</div>
                        )}
                      </div>
                    </>
                  );
                })()}

                {/* Recent Activity / Assigned Tickets */}
                <div className="flex flex-col gap-[8px] user-modal-tickets-section">
                  <div className="text-[11.5px] font-bold text-[var(--ink-primary)] user-tickets-title">Tiket Terbaru ({selectedUserDetail.recentTickets.length})</div>
                  {selectedUserDetail.recentTickets.length > 0 ? (
                    <div className="flex flex-col gap-[4px] max-h-[160px] overflow-y-auto pr-[4px] user-modal-tickets-list">
                      {selectedUserDetail.recentTickets.map((t) => {
                        const pColor = PROJECT_COLORS[t.project] || "#94a3b8";
                        const sLower = t.severity.toLowerCase();
                        const pClass =
                          sLower === "critical" || sLower === "kritis"
                            ? "priority-pill-crit"
                            : sLower === "high" || sLower === "tinggi"
                            ? "priority-pill-high"
                            : sLower === "low" || sLower === "rendah"
                            ? "priority-pill-low"
                            : "priority-pill-med";

                        return (
                          <div className="grid grid-cols-[75px_75px_1fr_60px_70px] items-center gap-[8px] p-[6px_10px] rounded-[6px] bg-[rgba(148,163,184,0.04)] text-[10.5px] max-lg:text-[11px] user-modal-ticket-row" key={t.id}>
                            <span className="font-mono font-bold text-[var(--ink-primary)] user-modal-ticket-id">#{t.id}</span>
                            <span className="font-semibold user-modal-ticket-proj" style={{ color: pColor }}>● {t.project}</span>
                            <span className="text-[var(--ink-secondary)] whitespace-nowrap overflow-hidden text-ellipsis user-modal-ticket-sub" title={t.subject}>{t.subject}</span>
                            <span className={`priority-pill ${pClass}`}>{t.severity}</span>
                            <span className="text-[9.5px] max-lg:text-[11px] text-[#38bdf8] font-semibold user-modal-ticket-st">{t.status}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="user-tickets-empty">Tidak ada tiket detail khusus pada filter saat ini.</div>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Memo Modal (large window) */}
      <MemoModal isOpen={memoModalOpen} onClose={() => setMemoModalOpen(false)} />

      {/* Grafana-style Full-screen Panel Viewer */}
      {activePanelId && (
        <PanelViewer
          panelId={activePanelId}
          mode={viewerMode}
          onModeChange={handlePanelModeChange}
          onClose={handleClosePanel}
          onNavigatePanel={handleOpenPanel}
          activeFilters={activeFilterChips}
          analyticsTicketCount={analyticsTickets.length}
          totalTicketCount={tickets.length}
          volumeByDate={volumeByDate}
          allProjects={allProjects}
          projectColors={PROJECT_COLORS}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          momData={momComparison}
          userSummaries={userSummaries}
          onSelectUserDetail={setSelectedUserDetail}
          typeCounts={typeCounts}
          totalTickets={total}
          renderDonutSlices={renderDonutSlices}
          priorityCounts={priorityCounts}
          priorityColors={PRIORITY_COLORS}
          severityStyles={SEVERITY_CARD_STYLES}
          shiftTrafficData={shiftHeatmapData}
          activeShiftLineFilter={activeShiftLineFilter}
          onShiftLineFilterChange={setActiveShiftLineFilter}
          resolutionKpis={velocityKpis}
        />
      )}
    </div>
  );
}


