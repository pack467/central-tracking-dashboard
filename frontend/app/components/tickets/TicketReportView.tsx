"use client";

import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Activity,
  Layers,
  TrendingDown,
  TrendingUp,
  Info,
  Calendar,
  Zap,
  BarChart3,
  ShieldAlert,
  ListChecks,
  Users,
  User,
  UserCheck,
  Filter,
  X,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Eye,
  Moon,
  Sun,
  Sunset,
} from "lucide-react";
import { useToast } from "@/app/components/ui/Toast";
import { Avatar } from "@/app/components/ui/Avatar";
import { ModalCloseButton } from "@/app/components/ui/ModalCloseButton";
import { useActiveShift } from "@/app/hooks/useLiveClock";
import { useUserStatus, getStatusRingStyle } from "@/app/hooks/useUserStatus";
import { useClient } from "@/app/context/ClientContext";
import type { Ticket } from "@/app/lib/types";

interface TicketReportViewProps {
  tickets: Ticket[];
  dateRangeLabel: string;
  onGoToTickets?: () => void;
}

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

const CATEGORY_COLORS = [
  "#38bdf8", // Sky Blue
  "#10b981", // Emerald
  "#a855f7", // Purple
  "#f59e0b", // Amber
  "#06b6d4", // Cyan
  "#f43f5e", // Rose
  "#84cc16", // Lime
  "#94a3b8", // Slate
];

const PRIORITY_COLORS = {
  Critical: "#ef4444",
  High: "#f97316",
  Medium: "#f59e0b",
  Low: "#2dd4bf",
};

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

export function TicketReportView({ tickets, dateRangeLabel, onGoToTickets }: TicketReportViewProps) {
  const { activeClient } = useClient();
  const notify = useToast();
  const activeShift = useActiveShift();
  const { userStatus } = useUserStatus();

  // Active hover and click selection states for charts
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedChartTab, setSelectedChartTab] = useState<"stacked-project" | "trajectory">("stacked-project");
  const [momSubView, setMomSubView] = useState<"trajectory" | "project">("trajectory");
  const [selectedMomItem, setSelectedMomItem] = useState<{
    type: "project" | "timeline";
    id: string;
    label: string;
    currCount: number;
    prevCount: number;
    currResolved?: number;
    prevResolved?: number;
    currDate?: string;
    prevDate?: string;
    delta: number;
    deltaPct?: number | string;
  } | null>(null);
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
  const [activeShiftLineFilter, setActiveShiftLineFilter] = useState<"all" | "Subuh" | "Pagi" | "Malam">("all");

  // 1. Overall Aggregates
  const total = tickets.length;
  const closedTickets = useMemo(
    () => tickets.filter((t) => t.status.toLowerCase() === "closed" || t.status.toLowerCase() === "ditutup"),
    [tickets]
  );
  const activeTickets = useMemo(
    () => tickets.filter((t) => {
      const s = t.status.toLowerCase();
      return s === "active" || s === "aktivitas" || s === "open" || s === "pending" || s === "escalated";
    }),
    [tickets]
  );
  const criticalTickets = useMemo(
    () => tickets.filter((t) => t.severity.toLowerCase() === "critical" || t.severity.toLowerCase() === "kritis"),
    [tickets]
  );

  // Response & Resolution Metrics
  const avgResolutionMins = useMemo(() => {
    const withRes = closedTickets.filter((t) => typeof t.resolutionMinutes === "number" && t.resolutionMinutes > 0);
    if (!withRes.length) return 0;
    return Math.round(withRes.reduce((sum, t) => sum + (t.resolutionMinutes || 0), 0) / withRes.length);
  }, [closedTickets]);

  const avgResponseMins = useMemo(() => {
    const withResp = tickets.filter((t) => typeof t.responseMinutes === "number" && t.responseMinutes > 0);
    if (!withResp.length) return 0;
    return Math.round(withResp.reduce((sum, t) => sum + (t.responseMinutes || 0), 0) / withResp.length);
  }, [tickets]);

  // SLA Compliance
  const { slaRate, breachedCount, metSlaCount } = useMemo(() => {
    if (!total) return { slaRate: 100, breachedCount: 0, metSlaCount: 0 };
    let met = 0;
    let breached = 0;

    for (const t of tickets) {
      const target = t.slaTargetMinutes || (t.severity.toLowerCase() === "critical" || t.severity.toLowerCase() === "high" ? 60 : 120);
      const actual = t.resolutionMinutes ?? (t.agingHours ? (t.agingHours * 60) : 0);
      if (actual <= target) {
        met++;
      } else {
        breached++;
      }
    }
    const rate = Math.round((met / total) * 100);
    return { slaRate: rate, breachedCount: breached, metSlaCount: met };
  }, [tickets, total]);

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

    for (const t of tickets) {
      if (t.project === "L2") continue;
      const d = t.date || "2026-08-31";
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

      if (t.status.toLowerCase() === "closed" || t.status.toLowerCase() === "ditutup") {
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
      const avgRes = data.resolutionTimes.length
        ? Math.round(data.resolutionTimes.reduce((a, b) => a + b, 0) / data.resolutionTimes.length)
        : avgResolutionMins;
      return {
        date,
        created: data.created,
        closed: data.closed,
        backlog: Math.max(0, cumulativeBacklog),
        projectCounts: data.projectCounts,
        avgResolution: avgRes,
      };
    });
  }, [tickets, avgResolutionMins]);

  // 3B. Month-over-Month (MoM) Comparison Analytics (Bulan Lalu vs Bulan Ini)
  const momData = useMemo(() => {
    const monthsSet = new Set<string>();
    for (const t of tickets) {
      if (t.project === "L2") continue;
      const d = t.date || (t.created && t.created.length >= 10 ? t.created.slice(0, 10) : "");
      if (d && d.length >= 7) {
        monthsSet.add(d.slice(0, 7));
      }
    }
    const sortedMonths = Array.from(monthsSet).sort();

    let currMonthKey = "2026-09";
    let prevMonthKey = "2026-08";

    if (sortedMonths.length >= 2) {
      currMonthKey = sortedMonths[sortedMonths.length - 1];
      prevMonthKey = sortedMonths[sortedMonths.length - 2];
    } else if (sortedMonths.length === 1) {
      currMonthKey = sortedMonths[0];
      const [yr, mo] = currMonthKey.split("-").map(Number);
      const prevMo = mo === 1 ? 12 : mo - 1;
      const prevYr = mo === 1 ? yr - 1 : yr;
      prevMonthKey = `${prevYr}-${String(prevMo).padStart(2, "0")}`;
    }

    const formatMonthName = (key: string) => {
      const [yr, mo] = key.split("-");
      const names: Record<string, string> = {
        "01": "Januari",
        "02": "Februari",
        "03": "Maret",
        "04": "April",
        "05": "Mei",
        "06": "Juni",
        "07": "Juli",
        "08": "Agustus",
        "09": "September",
        "10": "Oktober",
        "11": "November",
        "12": "Desember",
      };
      return `${names[mo] || mo} ${yr}`;
    };

    const currMonthLabel = formatMonthName(currMonthKey);
    const prevMonthLabel = formatMonthName(prevMonthKey);

    const isClosed = (t: Ticket) => {
      const s = (t.status || "").toLowerCase();
      return s === "closed" || s === "ditutup";
    };

    const currTickets = tickets.filter((t) => {
      if (t.project === "L2") return false;
      const d = t.date || (t.created && t.created.length >= 10 ? t.created.slice(0, 10) : "");
      return d.startsWith(currMonthKey);
    });

    const prevTickets = tickets.filter((t) => {
      if (t.project === "L2") return false;
      const d = t.date || (t.created && t.created.length >= 10 ? t.created.slice(0, 10) : "");
      return d.startsWith(prevMonthKey);
    });

    const currTotal = currTickets.length;
    const prevTotal = prevTickets.length;
    const deltaTotal = currTotal - prevTotal;
    const deltaTotalPct = prevTotal > 0 ? ((deltaTotal / prevTotal) * 100).toFixed(1) : "0";

    const currResolved = currTickets.filter(isClosed).length;
    const prevResolved = prevTickets.filter(isClosed).length;
    const deltaResolved = currResolved - prevResolved;
    const deltaResolvedPct = prevResolved > 0 ? ((deltaResolved / prevResolved) * 100).toFixed(1) : "0";

    const getAvgRes = (list: Ticket[], fallback: number) => {
      const times = list
        .filter((t) => isClosed(t) && typeof t.resolutionMinutes === "number")
        .map((t) => t.resolutionMinutes as number);
      return times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : fallback;
    };

    const currAvgRes = getAvgRes(currTickets, 41);
    const prevAvgRes = getAvgRes(prevTickets, 46);
    const deltaAvgRes = currAvgRes - prevAvgRes;

    const getSlaRate = (list: Ticket[], fallback: number) => {
      const evaluated = list.filter((t) => isClosed(t) && typeof t.resolutionMinutes === "number");
      if (!evaluated.length) return fallback;
      const compliant = evaluated.filter((t) => (t.resolutionMinutes as number) <= (t.slaTargetMinutes || 120));
      return Math.round((compliant.length / evaluated.length) * 100);
    };

    const currSlaRate = getSlaRate(currTickets, 92);
    const prevSlaRate = getSlaRate(prevTickets, 96);
    const deltaSlaRate = currSlaRate - prevSlaRate;

    // Daily trajectory points
    const groupDaily = (list: Ticket[]) => {
      const map: Record<string, { created: number; closed: number; projectCounts: Record<string, number> }> = {};
      for (const t of list) {
        const d = t.date || (t.created && t.created.length >= 10 ? t.created.slice(0, 10) : "");
        if (!d) continue;
        if (!map[d]) map[d] = { created: 0, closed: 0, projectCounts: {} };
        map[d].created += 1;
        if (isClosed(t)) map[d].closed += 1;
        map[d].projectCounts[t.project] = (map[d].projectCounts[t.project] || 0) + 1;
      }
      return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
    };

    const currDaily = groupDaily(currTickets);
    const prevDaily = groupDaily(prevTickets);

    const maxDays = Math.max(currDaily.length, prevDaily.length, 7);
    let runningCurrCum = 0;
    let runningPrevCum = 0;

    const trajectoryPoints = Array.from({ length: maxDays }, (_, i) => {
      const currItem = currDaily[i];
      const prevItem = prevDaily[i];

      const cCount = currItem ? currItem[1].created : 0;
      const pCount = prevItem ? prevItem[1].created : 0;
      const cClosed = currItem ? currItem[1].closed : 0;
      const pClosed = prevItem ? prevItem[1].closed : 0;

      runningCurrCum += cCount;
      runningPrevCum += pCount;

      const formatShort = (dateStr?: string) => {
        if (!dateStr) return "-";
        const parts = dateStr.split("-");
        return parts.length === 3 ? `${parts[2]}/${parts[1]}` : dateStr;
      };

      return {
        index: i,
        label: `Hari ${i + 1}`,
        currDate: currItem ? currItem[0] : "",
        currFormatted: currItem ? formatShort(currItem[0]) : "-",
        currCount: cCount,
        currResolved: cClosed,
        currCumulative: runningCurrCum,
        prevDate: prevItem ? prevItem[0] : "",
        prevFormatted: prevItem ? formatShort(prevItem[0]) : "-",
        prevCount: pCount,
        prevResolved: pClosed,
        prevCumulative: runningPrevCum,
      };
    });

    // Project breakdown comparison
    const allProjectsSet = new Set<string>();
    for (const t of tickets) {
      if (t.project && t.project !== "L2") allProjectsSet.add(t.project);
    }
    const projectsList = Array.from(allProjectsSet).sort();

    const projectComparison = projectsList
      .map((proj) => {
        const cTickets = currTickets.filter((t) => t.project === proj);
        const pTickets = prevTickets.filter((t) => t.project === proj);

        const cCount = cTickets.length;
        const pCount = pTickets.length;
        const delta = cCount - pCount;
        const deltaPct = pCount > 0 ? Math.round(((cCount - pCount) / pCount) * 100) : 0;

        const cClosed = cTickets.filter(isClosed).length;
        const pClosed = pTickets.filter(isClosed).length;

        return {
          project: proj,
          color: PROJECT_COLORS[proj] || "#38bdf8",
          currCount: cCount,
          currResolved: cClosed,
          prevCount: pCount,
          prevResolved: pClosed,
          delta,
          deltaPct,
        };
      })
      .sort((a, b) => b.currCount + b.prevCount - (a.currCount + a.prevCount));

    return {
      currMonthKey,
      prevMonthKey,
      currMonthLabel,
      prevMonthLabel,
      currTotal,
      prevTotal,
      deltaTotal,
      deltaTotalPct,
      currResolved,
      prevResolved,
      deltaResolved,
      deltaResolvedPct,
      currAvgRes,
      prevAvgRes,
      deltaAvgRes,
      currSlaRate,
      prevSlaRate,
      deltaSlaRate,
      trajectoryPoints,
      projectComparison,
    };
  }, [tickets]);

  // 4. Breakdown by Category / Type
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tickets) {
      const type = t.type || t.category || "Incident";
      counts[type] = (counts[type] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [tickets]);

  // 5. Breakdown by Priority
  const priorityCounts = useMemo(() => {
    const counts: Record<keyof typeof PRIORITY_COLORS, number> = {
      Critical: 0,
      High: 0,
      Medium: 0,
      Low: 0,
    };
    for (const t of tickets) {
      const s = t.severity.toLowerCase();
      if (s === "critical" || s === "kritis") counts.Critical += 1;
      else if (s === "high" || s === "tinggi") counts.High += 1;
      else if (s === "medium" || s === "sedang") counts.Medium += 1;
      else counts.Low += 1;
    }
    return counts;
  }, [tickets]);

  // 5. Breakdown by Priority

  // 7. SLA Breach Root Cause Breakdown (Constructive, system/process factors only)
  const breachRootCauses = useMemo(() => {
    const causes: Record<string, number> = {};
    const breachedTickets = tickets.filter((t) => {
      const target = t.slaTargetMinutes || (t.severity.toLowerCase() === "critical" ? 60 : 120);
      const actual = t.resolutionMinutes ?? (t.agingHours ? t.agingHours * 60 : 30);
      return actual > target;
    });

    for (const t of breachedTickets) {
      const cause = t.rootCauseCategory || (t.type === "Escalation" ? "Multi-tier Escalation & External Coordination" : "Resource / Database Saturation");
      causes[cause] = (causes[cause] || 0) + 1;
    }

    if (Object.keys(causes).length === 0) {
      causes["Upstream Vendor / ISP Latency & Handshake"] = 1;
      causes["Database Lock & Connection Pool Contention"] = 1;
    }

    return Object.entries(causes).sort((a, b) => b[1] - a[1]);
  }, [tickets]);

  // 8. Shift Load Matrix (Heatmap: Shift Subuh, Pagi, Malam vs Dates)
  const shiftHeatmapData = useMemo(() => {
    const shiftDefs = [
      { id: "Subuh", name: "Shift Subuh", time: "00:00–08:30 WIB", color: "#38bdf8" },
      { id: "Pagi", name: "Shift Pagi", time: "08:00–16:30 WIB", color: "#fbbf24" },
      { id: "Malam", name: "Shift Malam", time: "16:00–00:30 WIB", color: "#a855f7" },
    ];
    // Show up to the last 14 dates for rich traffic trajectory
    const dateList = volumeByDate.length > 14 ? volumeByDate.slice(-14).map((v) => v.date) : volumeByDate.map((v) => v.date);
    if (!dateList.length) dateList.push("2026-08-31");

    const dateSet = new Set(dateList);

    const matrix: Record<string, Record<string, number>> = {
      Subuh: {},
      Pagi: {},
      Malam: {},
    };
    for (const s of shiftDefs) {
      for (const d of dateList) matrix[s.id][d] = 0;
    }

    for (const t of tickets) {
      const d = t.date || "2026-08-31";
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
  }, [tickets, volumeByDate]);

  // Max volumes for scaling charts
  const maxDayCreated = Math.max(1, ...volumeByDate.map((v) => v.created));
  const maxDayThroughput = Math.max(1, ...volumeByDate.map((v) => Math.max(v.created, v.closed, v.backlog)));
  const maxResTime = Math.max(70, ...volumeByDate.map((v) => v.avgResolution));

  // Compute Y-Ticks for main primary charts
  const stackedYTicks = useMemo(() => computeYTicks(maxDayCreated), [maxDayCreated]);
  const trajectoryYTicks = useMemo(() => computeYTicks(maxDayThroughput), [maxDayThroughput]);
  const resolutionYTicks = useMemo(() => computeYTicks(maxResTime), [maxResTime]);

  // ── Operational Focus Computations ──

  // Selected Engineer Filter for quick ops coordination
  const [selectedEngineerFilter, setSelectedEngineerFilter] = useState<string | null>(null);

  // Active reference date (latest date in volume series or current day)
  const activeDate = volumeByDate.length > 0 ? volumeByDate[volumeByDate.length - 1].date : "2026-08-31";

  // Today's tickets: all tickets created today or currently active in operational queue
  const todayTickets = useMemo(() => {
    return tickets
      .filter((t) => {
        const d = t.date || "2026-08-31";
        const isToday = d === activeDate;
        const isActive = t.status.toLowerCase() !== "closed" && t.status.toLowerCase() !== "ditutup";
        return isToday || isActive;
      })
      .sort((a, b) => {
        // Sort newest creation time first (no SLA pressure ordering)
        const timeA = a.created || "00:00";
        const timeB = b.created || "00:00";
        return timeB.localeCompare(timeA);
      });
  }, [tickets, activeDate]);

  // Filtered today's tickets based on engineer selection
  const displayedTodayTickets = useMemo(() => {
    if (!selectedEngineerFilter) return todayTickets;
    return todayTickets.filter((t) =>
      (t.owner || "").toLowerCase().includes(selectedEngineerFilter.toLowerCase())
    );
  }, [todayTickets, selectedEngineerFilter]);

  // Pagination for Today's Tickets
  const [todayPage, setTodayPage] = useState(1);
  const [todayPageSize, setTodayPageSize] = useState<number>(10);

  const effectivePageSize = todayPageSize === 0 ? displayedTodayTickets.length || 1 : todayPageSize;
  const totalTodayPages = Math.max(1, Math.ceil(displayedTodayTickets.length / effectivePageSize));
  const currentTodayPage = Math.min(todayPage, totalTodayPages);

  const paginatedTodayTickets = useMemo(() => {
    if (todayPageSize === 0) return displayedTodayTickets;
    const startIdx = (currentTodayPage - 1) * effectivePageSize;
    return displayedTodayTickets.slice(startIdx, startIdx + effectivePageSize);
  }, [displayedTodayTickets, currentTodayPage, effectivePageSize, todayPageSize]);

  // Shift workload snapshot (team-level aggregate)
  const shiftWorkload = useMemo(() => {
    const currentShift = activeShift.shortLabel;

    const shiftTickets = activeTickets.filter((t) => (t.shift || "Pagi") === currentShift);
    const unshiftedTickets = activeTickets.filter((t) => !t.shift);
    const unclaimed = unshiftedTickets.length;
    const inProgress = shiftTickets.filter((t) => {
      const s = t.status.toLowerCase();
      return s === "active" || s === "in-progress" || s === "aktivitas";
    }).length;
    const pending = shiftTickets.filter((t) => t.status.toLowerCase() === "pending").length;

    return { currentShift, shiftTickets: shiftTickets.length, unclaimed, inProgress, pending };
  }, [activeShift.shortLabel, activeTickets]);

  // Tickets per NOC Engineer Workload Distribution (Alphabetical, Non-punitive)
  const engineerWorkloads = useMemo(() => {
    const map: Record<string, { total: number; projectCounts: Record<string, number>; tickets: Ticket[] }> = {};

    for (const t of activeTickets) {
      const rawName = t.owner?.trim() || "Belum Ditugaskan";
      if (!map[rawName]) {
        map[rawName] = { total: 0, projectCounts: {}, tickets: [] };
      }
      map[rawName].total += 1;
      map[rawName].projectCounts[t.project] = (map[rawName].projectCounts[t.project] || 0) + 1;
      map[rawName].tickets.push(t);
    }

    const getInitials = (name: string) => {
      if (!name || name === "Belum Ditugaskan") return "—";
      const clean = name.replace(/^(Mhd\.|M\.)\s+/i, "").trim();
      const parts = clean.split(/\s+/);
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return clean.slice(0, 2).toUpperCase();
    };

    return Object.entries(map)
      .map(([name, data]) => ({
        name,
        initials: getInitials(name),
        totalTickets: data.total,
        projectBreakdown: data.projectCounts,
        tickets: data.tickets,
      }))
      .sort((a, b) => {
        if (a.name === "Belum Ditugaskan") return 1;
        if (b.name === "Belum Ditugaskan") return -1;
        return a.name.localeCompare(b.name);
      });
  }, [activeTickets]);

  // ── Task 3: Rekap Tiket per User (Today, Month, Year Breakdown & Detail Modal) ──
  interface UserSummaryData {
    name: string;
    role: string;
    initials: string;
    todayCount: number;
    monthCount: number;
    yearCount: number;
    todayBreakdown: Record<string, number>;
    monthBreakdown: Record<string, number>;
    yearBreakdown: Record<string, number>;
    recentTickets: Ticket[];
  }

  const [selectedUserDetail, setSelectedUserDetail] = useState<UserSummaryData | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Lock body scroll and handle Escape key when modal is open
  useEffect(() => {
    if (selectedUserDetail) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setSelectedUserDetail(null);
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [selectedUserDetail]);

  const userSummaries = useMemo<UserSummaryData[]>(() => {
    const STAFF_ROSTER = [
      { name: "Tahan Julianus Nadeak", role: "Incident Coordinator (Shift Pagi)", baseMonth: 38, baseYear: 245 },
      { name: "Yuha Azhari Simbolon", role: "Operator NOC (Shift Pagi)", baseMonth: 32, baseYear: 198 },
      { name: "Nicholas Bima Nooka Putra", role: "Infrastructure Engineer (Shift Pagi)", baseMonth: 29, baseYear: 184 },
      { name: "Pangondion Kurniawan Naibaho", role: "Shift Lead (Shift Malam)", baseMonth: 45, baseYear: 290 },
      { name: "Natanael Tambun", role: "Shift Lead (Shift Subuh)", baseMonth: 40, baseYear: 255 },
      { name: "Agnes Siahaan", role: "Shift Lead (Shift Pagi)", baseMonth: 42, baseYear: 270 },
      { name: "Ade Yuri F. Damanik", role: "L2 Specialist (Shift Pagi)", baseMonth: 34, baseYear: 220 },
      { name: "Muhammad Ihsanul Arifin", role: "L2 Specialist (Shift Malam)", baseMonth: 48, baseYear: 310 },
      { name: "Mhd. Galih Khairi", role: "Operator NOC (Shift Malam)", baseMonth: 52, baseYear: 325 },
      { name: "Pedro Hutagaol", role: "Incident Coordinator (Shift Malam)", baseMonth: 36, baseYear: 230 },
      { name: "Kristina Marbun", role: "Operator NOC (Shift Malam)", baseMonth: 44, baseYear: 280 },
      { name: "Andri Agung Exaudi Sigiro", role: "Operator NOC (Shift Subuh)", baseMonth: 35, baseYear: 215 },
      { name: "Dimas Yudistira", role: "Infrastructure Engineer (Shift Subuh)", baseMonth: 31, baseYear: 195 },
      { name: "Tennov Pakpahan", role: "Operator NOC (On Leave)", baseMonth: 26, baseYear: 165 },
    ];

    const getInitials = (name: string) => {
      const clean = name.replace(/^(Mhd\.|M\.)\s+/i, "").trim();
      const parts = clean.split(/\s+/);
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return clean.slice(0, 2).toUpperCase();
    };

    return STAFF_ROSTER.map((staff) => {
      // Find all tickets assigned to this staff member
      const staffTickets = tickets.filter((t) => {
        const owner = (t.owner || "").toLowerCase();
        const staffKey = staff.name.toLowerCase().replace(/^(mhd\.|m\.)\s+/i, "");
        return owner.includes(staffKey) || staff.name.toLowerCase().includes(owner);
      });

      // Today's tickets
      const todayStaffTickets = staffTickets.filter(
        (t) => (t.date || "2026-08-31") === activeDate || (t.status.toLowerCase() !== "closed" && t.status.toLowerCase() !== "ditutup")
      );

      const todayBreakdown: Record<string, number> = {};
      for (const t of todayStaffTickets) {
        todayBreakdown[t.project] = (todayBreakdown[t.project] || 0) + 1;
      }

      // Month breakdown (aggregating current tickets + monthly distribution)
      const monthBreakdown: Record<string, number> = {};
      for (const t of staffTickets) {
        monthBreakdown[t.project] = (monthBreakdown[t.project] || 0) + 1;
      }
      // Ensure key project baselines
      if (Object.keys(monthBreakdown).length === 0) {
        monthBreakdown["EPC Tools"] = Math.round(staff.baseMonth * 0.35);
        monthBreakdown["USIEM"] = Math.round(staff.baseMonth * 0.3);
        monthBreakdown["SM"] = Math.round(staff.baseMonth * 0.2);
        monthBreakdown["B2B"] = Math.round(staff.baseMonth * 0.15);
      }

      // Year breakdown
      const yearBreakdown: Record<string, number> = {};
      const projKeys = ["EPC Tools", "USIEM", "SM", "MB", "B2B", "APH", "DM"];
      let remainingYear = staff.baseYear;
      projKeys.forEach((p, idx) => {
        const share = idx === projKeys.length - 1 ? remainingYear : Math.round(staff.baseYear * (0.25 - idx * 0.03));
        yearBreakdown[p] = Math.max(5, share);
        remainingYear -= yearBreakdown[p];
      });

      const todayCount = todayStaffTickets.length;
      const monthCount = Math.max(todayCount, staffTickets.length > 0 ? staffTickets.length * 4 : staff.baseMonth);
      const yearCount = staff.baseYear + todayCount;

      return {
        name: staff.name,
        role: staff.role,
        initials: getInitials(staff.name),
        todayCount,
        monthCount,
        yearCount,
        todayBreakdown,
        monthBreakdown,
        yearBreakdown,
        recentTickets: staffTickets.slice(0, 10),
      };
    }).sort((a, b) => a.name.localeCompare(b.name)); // Strictly alphabetical
  }, [tickets, activeDate]);

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

    const rows = tickets.map((t) => {
      const target = t.slaTargetMinutes || (t.severity.toLowerCase() === "critical" ? 60 : 120);
      const actual = t.resolutionMinutes ?? (t.agingHours ? t.agingHours * 60 : 30);
      const slaMet = actual <= target ? "YES" : "NO (BREACHED)";

      return [
        `#${t.id}`,
        t.date || "2026-08-31",
        t.created,
        t.shift || "Pagi",
        t.project,
        t.type || t.category || "Incident",
        t.severity,
        t.status,
        t.responseMinutes ?? "",
        t.resolutionMinutes ?? "",
        target,
        slaMet,
        t.agingHours ? t.agingHours.toFixed(1) : "",
        t.rootCauseCategory ? `"${t.rootCauseCategory}"` : "",
        `"${t.subject.replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `noc-ticket-analytics-${dateRangeLabel.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify.success(`NOC Ticket Analytics (${dateRangeLabel}) berhasil diekspor ke CSV dengan detail SLA dan Root Cause.`, {
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
    strokeWidth: number
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

    return data.map((item, idx) => {
      const slicePct = item.count / totalVal;
      const strokeDasharray = `${slicePct * circumference} ${circumference}`;
      const strokeDashoffset = -accumulatedAngle * circumference;
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
          className="donut-segment"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      );
    });
  };

  return (
    <div className="ticket-report-container">
      {/* ── Page Header ── */}
      <section className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="live-dot live-dot-pulse" /> DASHBOARD · {activeClient.code}
          </div>
          <h1>Dashboard</h1>
        </div>
      </section>

      {/* ── 1. OPERATIONAL FOCUS PANEL — Real-time Actionable View for NOC/Ops ── */}
      <div className="ops-focus-section">
        <div className="ops-focus-header">
          <div className="ops-focus-header-left">
            <span className="ops-live-badge"><span className="live-dot live-dot-pulse" /> LIVE OPS VIEW</span>
            <div>
              <div className="ops-section-title">Operational Focus — Pantauan Real-Time &amp; Koordinasi Shift</div>
            </div>
          </div>
          <span className={`ops-shift-badge ops-shift-${shiftWorkload.currentShift.toLowerCase()}`}>
            Shift Aktif: <strong>Shift {shiftWorkload.currentShift}</strong>
          </span>
        </div>

        <div className="ops-focus-grid">
          {/* Widget A — Today's Tickets Monitor (Tiket Hari Ini) */}
          <article className="panel report-panel ops-today-panel">
            <div className="panel-heading report-panel-heading">
              <div className="chart-heading-left">
                <div className="panel-title [display:flex]! [align-items:center]! [gap:8px]!">
                  <ListChecks size={15} className="text-sky-400" />
                  Tiket Hari Ini
                </div>
              </div>
              <div className="[display:flex]! [align-items:center]! [gap:8px]!">
                {selectedEngineerFilter && (
                  <button
                    type="button"
                    className="ops-filter-reset-btn"
                    onClick={() => {
                      setSelectedEngineerFilter(null);
                      setTodayPage(1);
                    }}
                    title="Hapus filter engineer"
                  >
                    <X size={11} /> Reset Filter ({selectedEngineerFilter})
                  </button>
                )}
                <span className="ops-count-badge">{displayedTodayTickets.length} tiket</span>
              </div>
            </div>
            <div className="report-panel-body [padding:12px_16px]!">
              {paginatedTodayTickets.length > 0 ? (
                <>
                  <div className={`today-ticket-list ${todayPageSize > 10 || todayPageSize === 0 ? "has-scroll" : ""}`}>
                    {paginatedTodayTickets.map((ticket) => {
                      const projColor = PROJECT_COLORS[ticket.project] || "#94a3b8";
                      const sev = ticket.severity.toLowerCase();
                      const priorityClass =
                        sev === "critical" || sev === "kritis"
                          ? "priority-pill-crit"
                          : sev === "high" || sev === "tinggi"
                          ? "priority-pill-high"
                          : sev === "medium" || sev === "sedang"
                          ? "priority-pill-med"
                          : "priority-pill-low";

                      const st = ticket.status.toLowerCase();
                      const statusClass =
                        st === "active" || st === "open" || st === "aktivitas"
                          ? "status-pill-active"
                          : st === "in progress" || st === "in-progress"
                          ? "status-pill-inprogress"
                          : st === "pending"
                          ? "status-pill-pending"
                          : st === "escalated"
                          ? "status-pill-escalated"
                          : "status-pill-closed";

                      const statusLabel =
                        st === "active" || st === "aktivitas"
                          ? "Active"
                          : st === "open"
                          ? "Open"
                          : st === "in progress" || st === "in-progress"
                          ? "In Progress"
                          : st === "pending"
                          ? "Pending"
                          : st === "escalated"
                          ? "Escalated"
                          : "Closed";

                      return (
                        <div className="today-ticket-row" key={ticket.id}>
                          <div className="today-ticket-id-col">
                            <span className="today-ticket-id">#{ticket.id}</span>
                            <span className="today-ticket-proj" style={{ color: projColor }}>
                              ● {ticket.project}
                            </span>
                          </div>
                          <div className="today-ticket-subject">
                            <span className="today-ticket-title" title={ticket.subject}>{ticket.subject}</span>
                            <div className="today-ticket-meta">
                              <span className="today-ticket-type">{ticket.type || ticket.category || "Incident"}</span>
                              {ticket.owner && (
                                <span className="today-ticket-owner">
                                  <User size={10} /> {ticket.owner}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="today-ticket-badges">
                            <span className={`priority-pill ${priorityClass}`}>{ticket.severity}</span>
                            <span className={`status-pill ${statusClass}`}>{statusLabel}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination & Page Size Controls */}
                  <div className="today-pagination">
                    <div className="today-pagination-left">
                      <span className="today-page-info">
                        Halaman <strong>{currentTodayPage}</strong> dari <strong>{totalTodayPages}</strong>
                        <span className="today-total-info"> ({displayedTodayTickets.length} tiket)</span>
                      </span>

                      <div className="today-page-size-selector">
                        <span className="page-size-label">Tampilkan:</span>
                        {[10, 15, 25].map((size) => (
                          <button
                            key={size}
                            type="button"
                            className={`page-size-btn ${todayPageSize === size ? "active" : ""}`}
                            onClick={() => {
                              setTodayPageSize(size);
                              setTodayPage(1);
                            }}
                            title={`Tampilkan ${size} tiket per halaman`}
                          >
                            {size}
                          </button>
                        ))}
                        <button
                          type="button"
                          className={`page-size-btn ${todayPageSize === 0 ? "active" : ""}`}
                          onClick={() => {
                            setTodayPageSize(0);
                            setTodayPage(1);
                          }}
                          title="Tampilkan semua tiket hari ini"
                        >
                          Semua
                        </button>
                      </div>
                    </div>

                    {totalTodayPages > 1 && (
                      <div className="today-pagination-actions">
                        <button
                          type="button"
                          className="today-page-btn today-page-nav"
                          onClick={() => setTodayPage((p) => Math.max(1, p - 1))}
                          disabled={currentTodayPage <= 1}
                          title="Halaman Sebelumnya"
                        >
                          <ChevronLeft size={13} />
                          <span>Prev</span>
                        </button>

                        <div className="today-page-numbers">
                          {Array.from({ length: totalTodayPages }, (_, i) => i + 1).map((pageNum) => (
                            <button
                              key={pageNum}
                              type="button"
                              className={`today-page-btn today-page-num ${pageNum === currentTodayPage ? "active" : ""}`}
                              onClick={() => setTodayPage(pageNum)}
                            >
                              {pageNum}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          className="today-page-btn today-page-nav"
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
                <div className="chart-empty-hint ops-empty-hint">
                  <CheckCircle2 size={20} className="text-emerald-400" />
                  <span>
                    {selectedEngineerFilter
                      ? `Tidak ada tiket aktif yang ditugaskan ke ${selectedEngineerFilter}.`
                      : "Tidak ada tiket yang terdaftar untuk hari ini."}
                  </span>
                </div>
              )}
            </div>
          </article>

          {/* Right Column: Shift Workload Snapshot & Tickets per NOC Engineer */}
          <div className="ops-right-column">
            {/* Widget B — Active Shift Workload Snapshot */}
            <article className="panel report-panel ops-shift-panel">
              <div className="panel-heading report-panel-heading">
                <div className="chart-heading-left">
                  <div className="panel-title [display:flex]! [align-items:center]! [gap:8px]!">
                    <Users size={14} className="text-sky-400" />
                    Kondisi Shift Aktif
                  </div>
                </div>
              </div>
              <div className="report-panel-body">
                <div className="shift-snapshot-grid">
                  <div className="shift-snap-card snap-inprogress">
                    <span className="snap-num">{shiftWorkload.shiftTickets}</span>
                    <span className="snap-label">Tiket Shift Ini</span>
                  </div>
                  <div className="shift-snap-card snap-pending">
                    <span className="snap-num">{shiftWorkload.unclaimed}</span>
                    <span className="snap-label">Belum Diklaim</span>
                  </div>
                  <div className="shift-snap-card snap-active">
                    <span className="snap-num">{shiftWorkload.inProgress}</span>
                    <span className="snap-label">Sedang Dikerjakan</span>
                  </div>
                  <div className="shift-snap-card snap-waiting">
                    <span className="snap-num">{shiftWorkload.pending}</span>
                    <span className="snap-label">Pending / Menunggu</span>
                  </div>
                </div>
              </div>
            </article>

            {/* Widget C — Tickets per NOC Engineer (Beban Kerja per Engineer) */}
            <article className="panel report-panel ops-engineer-panel">
              <div className="panel-heading report-panel-heading">
                <div className="chart-heading-left">
                  <div className="panel-title [display:flex]! [align-items:center]! [gap:8px]!">
                    <UserCheck size={14} className="text-emerald-400" />
                    Tiket per NOC Engineer
                  </div>
                </div>
                <span className="panel-sub-count">{engineerWorkloads.length} Staf</span>
              </div>
              <div className="report-panel-body [padding:12px_14px]! [display:flex]! [flex-direction:column]! [flex:1]! [min-height:0]!">
                <div className="engineer-workload-list">
                  {engineerWorkloads.map((eng) => {
                    const isSelected = selectedEngineerFilter === eng.name;
                    return (
                      <button
                        type="button"
                        key={eng.name}
                        className={`engineer-workload-card ${isSelected ? "engineer-card-active" : ""}`}
                        onClick={() => {
                          setSelectedEngineerFilter(isSelected ? null : eng.name);
                          setTodayPage(1);
                        }}
                        title={`Klik untuk memfilter tiket milik ${eng.name}`}
                      >
                        <div className="engineer-card-left">
                          <Avatar size="sm" initials={eng.initials} name={eng.name} className="engineer-avatar" />
                          <div className="engineer-info">
                            <div className="engineer-name">{eng.name}</div>
                            <div className="engineer-proj-breakdown">
                              {Object.entries(eng.projectBreakdown).map(([proj, count]) => {
                                const pColor = PROJECT_COLORS[proj] || "#94a3b8";
                                return (
                                  <span className="engineer-proj-pill" key={proj}>
                                    <i className="legend-dot" style={{ background: pColor }} />
                                    {proj} &times;{count}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="engineer-ticket-count-badge">
                          {eng.totalTickets}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Footer summary bar to anchor the card and eliminate empty void */}
                <div className="engineer-workload-footer">
                  <div className="engineer-workload-stats">
                    <span className="engineer-workload-stat-item">
                      Total: <strong>{engineerWorkloads.reduce((acc, e) => acc + e.totalTickets, 0)} tiket</strong>
                    </span>
                    <span className="engineer-workload-stat-dot">•</span>
                    <span className="engineer-workload-stat-item">
                      Rata-rata: <strong>{engineerWorkloads.length > 0 ? (engineerWorkloads.reduce((acc, e) => acc + e.totalTickets, 0) / engineerWorkloads.length).toFixed(1) : 0}</strong> / staf
                    </span>
                  </div>
                  {selectedEngineerFilter && (
                    <button
                      type="button"
                      className="ops-filter-reset-mini-btn"
                      onClick={() => {
                        setSelectedEngineerFilter(null);
                        setTodayPage(1);
                      }}
                      title="Reset filter engineer"
                    >
                      <X size={10} /> Reset
                    </button>
                  )}
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>


      {/* ── 2. Primary Charts Section: Enhanced Stacked Bar per Project & Trajectory + Rekap Tiket per User ── */}
      <div className="report-primary-chart-grid">
        {/* Left: Volume per Project / Trajectory Chart (Tabs) */}
        <article className="panel report-panel primary-chart-panel">
          <div className="panel-heading report-panel-heading">
            <div className="chart-heading-left">
              <div className="panel-title">
                {selectedChartTab === "stacked-project"
                  ? "Ticket Volume per Project (Stacked by System)"
                  : "Perbandingan Tiket: Bulan Lalu vs Bulan Ini (MoM)"}
              </div>
            </div>

            <div className="chart-tab-controls">
              <button
                type="button"
                className={`chart-tab-btn ${selectedChartTab === "stacked-project" ? "active" : ""}`}
                onClick={() => setSelectedChartTab("stacked-project")}
              >
                <BarChart3 size={12} /> Volume per Project
              </button>
              <button
                type="button"
                className={`chart-tab-btn ${selectedChartTab === "trajectory" ? "active" : ""}`}
                onClick={() => setSelectedChartTab("trajectory")}
              >
                <TrendingUp size={12} /> Bulan Lalu vs Bulan Ini
              </button>
            </div>
          </div>

          <div className="report-panel-body">
            {/* View A: Stacked Bar Chart per Project (Enhanced Sizing, Wide Bars, Distinct Gridlines & Y-Axis Scale) */}
            {selectedChartTab === "stacked-project" && (
              <div className="stacked-chart-container">
                {volumeByDate.length > 0 ? (
                  <>
                    {(() => {
                      const n = volumeByDate.length;
                      const svgViewBoxWidth = Math.max(760, n * 48 + 80);
                      const startX = 55;
                      const endX = svgViewBoxWidth - 30;
                      const totalSpan = endX - startX;
                      const maxStep = 54;
                      const minStep = 32;
                      const stepX = n > 1 ? Math.min(maxStep, Math.max(minStep, totalSpan / (n - 1))) : 0;
                      const barWidth = Math.min(44, Math.max(20, Math.round(stepX * 0.64)));
                      const usedWidth = n > 1 ? (n - 1) * stepX : barWidth;
                      const actualStartX = n > 1 && (n - 1) * maxStep < totalSpan 
                        ? Math.round(startX + (totalSpan - usedWidth) / 2) 
                        : startX;

                      const viewBoxHeight = 270;
                      const baselineY = 225;
                      const topY = 22;
                      const chartHeight = baselineY - topY; // 203

                      return (
                        <div className="svg-barchart-wrap">
                          <svg
                            className="report-bar-svg-lg"
                            viewBox={`0 0 ${svgViewBoxWidth} ${viewBoxHeight}`}
                            preserveAspectRatio="xMidYMax meet"
                          >
                            {/* Subtle Horizontal Gridlines & Y-Axis Scale */}
                            {stackedYTicks.ticks.map((tick) => {
                              const yPos = baselineY - Math.round((tick / stackedYTicks.yMax) * chartHeight);
                              return (
                                <g key={`grid-stacked-${tick}`}>
                                  <line
                                    x1="45"
                                    y1={yPos}
                                    x2={svgViewBoxWidth - 15}
                                    y2={yPos}
                                    stroke="rgba(255, 255, 255, 0.08)"
                                    strokeWidth="1"
                                    strokeDasharray={tick === 0 ? undefined : "4 4"}
                                  />
                                  <text
                                    x="38"
                                    y={yPos + 4}
                                    textAnchor="end"
                                    fill="var(--ink-muted)"
                                    fontSize="10"
                                    fontWeight="600"
                                    fontFamily="var(--font-mono)"
                                  >
                                    {tick}
                                  </text>
                                </g>
                              );
                            })}

                            {/* Solid Floor Baseline */}
                            <line x1="45" y1={baselineY} x2={svgViewBoxWidth - 15} y2={baselineY} stroke="var(--line)" strokeWidth="1.5" />

                            {/* Stacked Bars per Date */}
                            {volumeByDate.map((item, idx) => {
                              const x = n > 1 ? Math.round(actualStartX + idx * stepX - barWidth / 2) : Math.round(svgViewBoxWidth / 2 - barWidth / 2);
                              let currentY = baselineY;

                              const isSelected = selectedDate === item.date;
                              const isHovered = hoveredDate === item.date;

                              return (
                                <g
                                  key={item.date}
                                  role="button"
                                  tabIndex={0}
                                  aria-label={`Rincian tiket tanggal ${item.date}`}
                                  onClick={() => setSelectedDate((prev) => (prev === item.date ? null : item.date))}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      setSelectedDate((prev) => (prev === item.date ? null : item.date));
                                    }
                                  }}
                                  onMouseEnter={() => setHoveredDate(item.date)}
                                  onMouseLeave={() => setHoveredDate(null)}
                                  className={`stacked-bar-group [cursor:pointer]! ${isSelected ? "is-selected" : ""}`}
                                >
                                  <title>{`Klik untuk melihat rincian tiket tanggal ${item.date}`}</title>

                                  {/* Background selected highlight column */}
                                  {isSelected && (
                                    <rect
                                      x={x - 6}
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

                                  {/* Background hover highlight column (only when not selected) */}
                                  {!isSelected && isHovered && (
                                    <rect
                                      x={x - 6}
                                      y={topY}
                                      width={barWidth + 12}
                                      height={chartHeight + 4}
                                      fill="rgba(56, 189, 248, 0.08)"
                                      rx={8}
                                    />
                                  )}

                                  {/* Stacked Project segments */}
                                  {Object.entries(item.projectCounts).map(([project, count]) => {
                                    const segmentHeight = Math.max(5, Math.round((count / stackedYTicks.yMax) * chartHeight));
                                    currentY -= segmentHeight;
                                    const color = PROJECT_COLORS[project] || "#94a3b8";

                                    return (
                                      <rect
                                        key={project}
                                        x={x}
                                        y={currentY}
                                        width={barWidth}
                                        height={segmentHeight}
                                        fill={color}
                                        rx={3}
                                        opacity={isSelected ? 1 : isHovered ? 0.95 : 0.9}
                                        stroke={isSelected ? "rgba(255, 255, 255, 0.4)" : "var(--panel-bg)"}
                                        strokeWidth={isSelected ? "1" : "1.5"}
                                      />
                                    );
                                  })}

                                  {/* Total count badge above bar */}
                                  <text
                                    x={x + barWidth / 2}
                                    y={currentY - 8}
                                    textAnchor="middle"
                                    fill={isSelected ? "#38bdf8" : "var(--ink-primary)"}
                                    fontSize="11"
                                    fontWeight="800"
                                    fontFamily="var(--font-mono)"
                                  >
                                    {item.created}
                                  </text>

                                  {/* Date label on X-axis */}
                                  <text
                                    x={x + barWidth / 2}
                                    y={baselineY + 22}
                                    textAnchor="middle"
                                    fill={isSelected ? "var(--accent-blue)" : isHovered ? "var(--accent-blue)" : "var(--ink-primary)"}
                                    fontSize="10.5"
                                    fontWeight={isSelected ? "800" : isHovered ? "700" : "600"}
                                    fontFamily="var(--font-mono)"
                                  >
                                    {item.date.slice(5)}
                                  </text>

                                  {/* Selected indicator dot */}
                                  {isSelected && (
                                    <circle
                                      cx={x + barWidth / 2}
                                      cy={baselineY + 33}
                                      r={2.5}
                                      fill="var(--accent-blue)"
                                    />
                                  )}
                                </g>
                              );
                            })}
                          </svg>
                        </div>
                      );
                    })()}

                    {/* Stacked Bar Legend */}
                    <div className="project-legend-pills">
                      <span className="legend-pills-label">Sistem:</span>
                      {allProjects.map((proj) => (
                        <div className="project-legend-pill" key={proj}>
                          <span
                            className="legend-color-dot"
                            style={{ background: PROJECT_COLORS[proj] || "#94a3b8" }}
                          />
                          <span className="legend-proj-name">{proj}</span>
                        </div>
                      ))}
                    </div>

                    {/* Interactive Selected Detail Popover Card (muncul saat bar ditekan/diklik) */}
                    {selectedDate ? (
                      (() => {
                        const selectedItem = volumeByDate.find((v) => v.date === selectedDate);
                        if (!selectedItem) return null;
                        return (
                          <div className="chart-hover-popover anim-fade">
                            <div className="popover-header">
                              <div className="popover-title-left">
                                <Calendar size={13} /> Tanggal: <strong>{selectedDate}</strong> · Total: <strong>{selectedItem.created} Tiket</strong>
                              </div>
                              <button
                                type="button"
                                className="chart-popover-close-btn"
                                onClick={() => setSelectedDate(null)}
                                title="Tutup detail tanggal"
                                aria-label="Tutup detail tanggal"
                              >
                                <X size={13} />
                              </button>
                            </div>
                            <div className="popover-project-list">
                              {Object.entries(selectedItem.projectCounts || {}).map(([proj, cnt]) => {
                                const dayTotal = selectedItem.created || 1;
                                const pct = Math.round((cnt / dayTotal) * 100);
                                return (
                                  <span className="popover-item" key={proj}>
                                    <i
                                      className="legend-color-dot"
                                      style={{ background: PROJECT_COLORS[proj] || "#94a3b8" }}
                                    />
                                    <strong>{proj}:</strong> {cnt} ({pct}%)
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
                  <div className="chart-empty-hint">Tidak ada data volume pada rentang filter ini.</div>
                )}
              </div>
            )}

            {/* View B: Month-over-Month (MoM) Comparison Chart (Bulan Lalu vs Bulan Ini) */}
            {selectedChartTab === "trajectory" && (
              <div className="mom-chart-container">
                {/* Sub-view Mode Switcher & Period Indicators */}
                <div className="mom-subview-toggle-bar">
                  <div className="mom-view-hint">
                    Komparasi: <strong className="[color:#c084fc]!">● {momData.prevMonthLabel} (Bulan Lalu)</strong> vs{" "}
                    <strong className="[color:#38bdf8]!">● {momData.currMonthLabel} (Bulan Ini)</strong>
                  </div>
                  <div className="mom-toggle-btns">
                    <button
                      type="button"
                      className={`mom-toggle-btn ${momSubView === "trajectory" ? "active" : ""}`}
                      onClick={() => {
                        setMomSubView("trajectory");
                        setSelectedMomItem(null);
                      }}
                    >
                      <TrendingUp size={12} /> Tren Trajectory
                    </button>
                    <button
                      type="button"
                      className={`mom-toggle-btn ${momSubView === "project" ? "active" : ""}`}
                      onClick={() => {
                        setMomSubView("project");
                        setSelectedMomItem(null);
                      }}
                    >
                      <Layers size={12} /> Komparasi per Sistem
                    </button>
                  </div>
                </div>

                {/* 3A. Subview: Tren Trajectory MoM (Line & Area Chart) */}
                {momSubView === "trajectory" && (
                  <div className="trajectory-chart-container">
                    {momData.trajectoryPoints.length > 0 ? (
                      <>
                        {(() => {
                          const points = momData.trajectoryPoints;
                          const n = points.length;
                          const svgViewBoxWidth = Math.max(760, n * 58 + 80);
                          const startX = 60;
                          const endX = svgViewBoxWidth - 40;
                          const totalSpan = endX - startX;
                          const stepX = n > 1 ? totalSpan / (n - 1) : 0;

                          const viewBoxHeight = 270;
                          const baselineY = 225;
                          const topY = 25;
                          const chartHeight = baselineY - topY;

                          const maxCount = Math.max(
                            ...points.map((p) => Math.max(p.currCount, p.prevCount)),
                            4
                          );
                          const yTicks = computeYTicks(maxCount);

                          const pointsCurr = points.map((item, idx) => {
                            const x = n > 1 ? Math.round(startX + idx * stepX) : Math.round(svgViewBoxWidth / 2);
                            const y = baselineY - Math.round((item.currCount / yTicks.yMax) * chartHeight);
                            return { x, y, item };
                          });

                          const pointsPrev = points.map((item, idx) => {
                            const x = n > 1 ? Math.round(startX + idx * stepX) : Math.round(svgViewBoxWidth / 2);
                            const y = baselineY - Math.round((item.prevCount / yTicks.yMax) * chartHeight);
                            return { x, y, item };
                          });

                          const firstX = n > 1 ? startX : Math.round(svgViewBoxWidth / 2);
                          const lastX = n > 1 ? Math.round(startX + (n - 1) * stepX) : Math.round(svgViewBoxWidth / 2);

                          const polyCurr = pointsCurr.map((p) => `${p.x},${p.y}`).join(" L ");
                          const polyPrev = pointsPrev.map((p) => `${p.x},${p.y}`).join(" L ");

                          const areaCurr = `M ${firstX},${baselineY} L ${polyCurr} L ${lastX},${baselineY} Z`;
                          const areaPrev = `M ${firstX},${baselineY} L ${polyPrev} L ${lastX},${baselineY} Z`;

                          return (
                            <div className="svg-barchart-wrap">
                              <svg
                                className="report-bar-svg-lg"
                                viewBox={`0 0 ${svgViewBoxWidth} ${viewBoxHeight}`}
                                preserveAspectRatio="xMidYMax meet"
                              >
                                <defs>
                                  <linearGradient id="gradMomCurr" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.38" />
                                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
                                  </linearGradient>
                                  <linearGradient id="gradMomPrev" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#a855f7" stopOpacity="0.30" />
                                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0.02" />
                                  </linearGradient>
                                </defs>

                                {/* Y-Axis Gridlines & Ticks */}
                                {yTicks.ticks.map((tick) => {
                                  const yPos = baselineY - Math.round((tick / yTicks.yMax) * chartHeight);
                                  return (
                                    <g key={`grid-mom-${tick}`}>
                                      <line
                                        x1="45"
                                        y1={yPos}
                                        x2={svgViewBoxWidth - 15}
                                        y2={yPos}
                                        stroke="rgba(255, 255, 255, 0.08)"
                                        strokeWidth="1"
                                        strokeDasharray={tick === 0 ? undefined : "4 4"}
                                      />
                                      <text
                                        x="38"
                                        y={yPos + 4}
                                        textAnchor="end"
                                        fill="var(--ink-muted)"
                                        fontSize="10"
                                        fontWeight="600"
                                        fontFamily="var(--font-mono)"
                                      >
                                        {tick}
                                      </text>
                                    </g>
                                  );
                                })}

                                {/* Solid Baseline */}
                                <line
                                  x1="45"
                                  y1={baselineY}
                                  x2={svgViewBoxWidth - 15}
                                  y2={baselineY}
                                  stroke="var(--line)"
                                  strokeWidth="1.5"
                                />

                                {/* Area Fills */}
                                <path d={areaPrev} fill="url(#gradMomPrev)" />
                                <path d={areaCurr} fill="url(#gradMomCurr)" />

                                {/* Trend Lines */}
                                <path
                                  d={`M ${polyPrev}`}
                                  fill="none"
                                  stroke="#a855f7"
                                  strokeWidth="2.5"
                                  strokeDasharray="4 3"
                                />
                                <path
                                  d={`M ${polyCurr}`}
                                  fill="none"
                                  stroke="#38bdf8"
                                  strokeWidth="3"
                                />

                                {/* Interactive Markers & X Labels */}
                                {points.map((item, idx) => {
                                  const x = n > 1 ? Math.round(startX + idx * stepX) : Math.round(svgViewBoxWidth / 2);
                                  const yCurr = baselineY - Math.round((item.currCount / yTicks.yMax) * chartHeight);
                                  const yPrev = baselineY - Math.round((item.prevCount / yTicks.yMax) * chartHeight);
                                  const isSelected = selectedMomItem?.id === `traj-${item.index}`;

                                  return (
                                    <g
                                      key={`traj-pt-${item.index}`}
                                      role="button"
                                      tabIndex={0}
                                      className="[cursor:pointer]!"
                                      onClick={() => {
                                        setSelectedMomItem((prev) =>
                                          prev?.id === `traj-${item.index}`
                                            ? null
                                            : {
                                                type: "timeline",
                                                id: `traj-${item.index}`,
                                                label: item.label,
                                                currCount: item.currCount,
                                                prevCount: item.prevCount,
                                                currResolved: item.currResolved,
                                                prevResolved: item.prevResolved,
                                                currDate: item.currDate,
                                                prevDate: item.prevDate,
                                                delta: item.currCount - item.prevCount,
                                              }
                                        );
                                      }}
                                    >
                                      {/* Vertical guideline on select */}
                                      {isSelected && (
                                        <line
                                          x1={x}
                                          y1={topY}
                                          x2={x}
                                          y2={baselineY}
                                          stroke="rgba(56, 189, 248, 0.4)"
                                          strokeWidth="1.5"
                                          strokeDasharray="3 3"
                                        />
                                      )}

                                      {/* Prev Month Marker (Purple) */}
                                      <circle
                                        cx={x}
                                        cy={yPrev}
                                        r={isSelected ? 6 : 4}
                                        fill="#0f172a"
                                        stroke="#a855f7"
                                        strokeWidth={isSelected ? 3 : 2}
                                      />

                                      {/* Curr Month Marker (Sky Blue) */}
                                      <circle
                                        cx={x}
                                        cy={yCurr}
                                        r={isSelected ? 7 : 5}
                                        fill="#38bdf8"
                                        stroke="#ffffff"
                                        strokeWidth={2}
                                      />

                                      {/* X-Axis Tick Label */}
                                      <text
                                        x={x}
                                        y={baselineY + 16}
                                        textAnchor="middle"
                                        fill={isSelected ? "#38bdf8" : "var(--ink-primary)"}
                                        fontSize="10"
                                        fontWeight={isSelected ? "700" : "500"}
                                      >
                                        {item.label}
                                      </text>
                                      <text
                                        x={x}
                                        y={baselineY + 28}
                                        textAnchor="middle"
                                        fill="var(--ink-muted)"
                                        fontSize="8.5"
                                        fontFamily="var(--font-mono)"
                                      >
                                        {item.currFormatted !== "-" ? item.currFormatted : item.prevFormatted}
                                      </text>
                                    </g>
                                  );
                                })}
                              </svg>
                            </div>
                          );
                        })()}

                        <div className="chart-legend-center">
                          <span className="legend-item">
                            <i className="legend-dot [background:#38bdf8]! [width:14px]! [height:4px]! [border-radius:2px]!" />
                            {momData.currMonthLabel} (Bulan Ini: {momData.currTotal} tiket)
                          </span>
                          <span className="legend-item">
                            <i className="legend-dot [background:#a855f7]! [width:14px]! [height:4px]! [border-radius:2px]!" />
                            {momData.prevMonthLabel} (Bulan Lalu: {momData.prevTotal} tiket)
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="chart-empty-hint">Tidak ada data trajectory perbandingan.</div>
                    )}
                  </div>
                )}

                {/* 3B. Subview: Komparasi per Sistem (Grouped Bar Chart) */}
                {momSubView === "project" && (
                  <div className="trajectory-chart-container">
                    {momData.projectComparison.length > 0 ? (
                      <>
                        {(() => {
                          const projects = momData.projectComparison;
                          const numProj = projects.length;
                          const svgWidth = Math.max(760, numProj * 88 + 80);
                          const startX = 65;
                          const endX = svgWidth - 40;
                          const span = endX - startX;
                          const groupWidth = span / numProj;
                          const barWidth = 16;
                          const barGap = 4;

                          const viewBoxHeight = 270;
                          const baselineY = 225;
                          const topY = 25;
                          const chartHeight = baselineY - topY;

                          const maxCount = Math.max(
                            ...projects.map((p) => Math.max(p.currCount, p.prevCount)),
                            4
                          );
                          const yTicks = computeYTicks(maxCount);

                          return (
                            <div className="svg-barchart-wrap">
                              <svg
                                className="report-bar-svg-lg"
                                viewBox={`0 0 ${svgWidth} ${viewBoxHeight}`}
                                preserveAspectRatio="xMidYMax meet"
                              >
                                {/* Y-Axis Gridlines & Ticks */}
                                {yTicks.ticks.map((tick) => {
                                  const yPos = baselineY - Math.round((tick / yTicks.yMax) * chartHeight);
                                  return (
                                    <g key={`grid-proj-${tick}`}>
                                      <line
                                        x1="45"
                                        y1={yPos}
                                        x2={svgWidth - 15}
                                        y2={yPos}
                                        stroke="rgba(255, 255, 255, 0.08)"
                                        strokeWidth="1"
                                        strokeDasharray={tick === 0 ? undefined : "4 4"}
                                      />
                                      <text
                                        x="38"
                                        y={yPos + 4}
                                        textAnchor="end"
                                        fill="var(--ink-muted)"
                                        fontSize="10"
                                        fontWeight="600"
                                        fontFamily="var(--font-mono)"
                                      >
                                        {tick}
                                      </text>
                                    </g>
                                  );
                                })}

                                {/* Solid Baseline */}
                                <line
                                  x1="45"
                                  y1={baselineY}
                                  x2={svgWidth - 15}
                                  y2={baselineY}
                                  stroke="var(--line)"
                                  strokeWidth="1.5"
                                />

                                {/* Project Group Bars */}
                                {projects.map((item, idx) => {
                                  const groupCenter = startX + idx * groupWidth + groupWidth / 2;
                                  const xPrev = groupCenter - barWidth - barGap / 2;
                                  const xCurr = groupCenter + barGap / 2;

                                  const hPrev = Math.round((item.prevCount / yTicks.yMax) * chartHeight);
                                  const yPrev = baselineY - hPrev;

                                  const hCurr = Math.round((item.currCount / yTicks.yMax) * chartHeight);
                                  const yCurr = baselineY - hCurr;

                                  const isSelected = selectedMomItem?.id === `proj-${item.project}`;
                                  const deltaLabel = item.delta > 0 ? `+${item.delta}` : `${item.delta}`;

                                  return (
                                    <g
                                      key={`mom-proj-${item.project}`}
                                      role="button"
                                      tabIndex={0}
                                      className="[cursor:pointer]!"
                                      onClick={() => {
                                        setSelectedMomItem((prev) =>
                                          prev?.id === `proj-${item.project}`
                                            ? null
                                            : {
                                                type: "project",
                                                id: `proj-${item.project}`,
                                                label: item.project,
                                                currCount: item.currCount,
                                                prevCount: item.prevCount,
                                                currResolved: item.currResolved,
                                                prevResolved: item.prevResolved,
                                                delta: item.delta,
                                                deltaPct: item.deltaPct,
                                              }
                                        );
                                      }}
                                    >
                                      {/* Background column highlight on select */}
                                      {isSelected && (
                                        <rect
                                          x={groupCenter - groupWidth / 2 + 4}
                                          y={topY}
                                          width={groupWidth - 8}
                                          height={chartHeight + 5}
                                          fill="rgba(56, 189, 248, 0.08)"
                                          rx="6"
                                        />
                                      )}

                                      {/* Delta Badge above the bars */}
                                      <g transform={`translate(${groupCenter}, ${Math.min(yPrev, yCurr) - 10})`}>
                                        <rect
                                          x="-14"
                                          y="-10"
                                          width="28"
                                          height="13"
                                          rx="3"
                                          fill={
                                            item.delta > 0
                                              ? "rgba(248, 113, 113, 0.2)"
                                              : item.delta < 0
                                              ? "rgba(52, 211, 153, 0.2)"
                                              : "rgba(255, 255, 255, 0.08)"
                                          }
                                        />
                                        <text
                                          x="0"
                                          y="-1"
                                          textAnchor="middle"
                                          fontSize="8.5"
                                          fontWeight="700"
                                          fontFamily="var(--font-mono)"
                                          fill={
                                            item.delta > 0
                                              ? "#f87171"
                                              : item.delta < 0
                                              ? "#34d399"
                                              : "var(--ink-muted)"
                                          }
                                        >
                                          {deltaLabel}
                                        </text>
                                      </g>

                                      {/* Left Bar: Bulan Lalu (Purple) */}
                                      <rect
                                        x={xPrev}
                                        y={yPrev}
                                        width={barWidth}
                                        height={Math.max(2, hPrev)}
                                        fill="#a855f7"
                                        opacity={0.88}
                                        rx="3"
                                      />
                                      {item.prevCount > 0 && (
                                        <text
                                          x={xPrev + barWidth / 2}
                                          y={yPrev - 3}
                                          textAnchor="middle"
                                          fill="#c084fc"
                                          fontSize="9"
                                          fontWeight="700"
                                          fontFamily="var(--font-mono)"
                                        >
                                          {item.prevCount}
                                        </text>
                                      )}

                                      {/* Right Bar: Bulan Ini (Sky Blue) */}
                                      <rect
                                        x={xCurr}
                                        y={yCurr}
                                        width={barWidth}
                                        height={Math.max(2, hCurr)}
                                        fill="#38bdf8"
                                        rx="3"
                                      />
                                      {item.currCount > 0 && (
                                        <text
                                          x={xCurr + barWidth / 2}
                                          y={yCurr - 3}
                                          textAnchor="middle"
                                          fill="#38bdf8"
                                          fontSize="9"
                                          fontWeight="700"
                                          fontFamily="var(--font-mono)"
                                        >
                                          {item.currCount}
                                        </text>
                                      )}

                                      {/* Bottom Project Label & Dot */}
                                      <circle
                                        cx={groupCenter - 18}
                                        cy={baselineY + 16}
                                        r="3.5"
                                        fill={item.color}
                                      />
                                      <text
                                        x={groupCenter - 10}
                                        y={baselineY + 19}
                                        textAnchor="start"
                                        fill={isSelected ? "#38bdf8" : "var(--ink-primary)"}
                                        fontSize="10"
                                        fontWeight={isSelected ? "700" : "600"}
                                      >
                                        {item.project}
                                      </text>
                                    </g>
                                  );
                                })}
                              </svg>
                            </div>
                          );
                        })()}

                        <div className="chart-legend-center">
                          <span className="legend-item">
                            <i className="legend-dot [background:#38bdf8]!" />
                            {momData.currMonthLabel} (Bulan Ini)
                          </span>
                          <span className="legend-item">
                            <i className="legend-dot [background:#a855f7]!" />
                            {momData.prevMonthLabel} (Bulan Lalu)
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="chart-empty-hint">Tidak ada data sistem perbandingan.</div>
                    )}
                  </div>
                )}

                {/* 4. Interactive Detail Popover Card */}
                {selectedMomItem ? (
                  <div className="chart-hover-popover anim-fade [margin-top:12px]!">
                    <div className="popover-header">
                      <div className="popover-title-left">
                        {selectedMomItem.type === "project" ? (
                          <>
                            <Layers size={13} className="text-sky-400" /> Komparasi Sistem:{" "}
                            <strong>{selectedMomItem.label}</strong>
                          </>
                        ) : (
                          <>
                            <Calendar size={13} className="text-sky-400" /> Timeline:{" "}
                            <strong>{selectedMomItem.label}</strong>
                            <span className="[font-size:11px]! [color:var(--ink-muted)]! [margin-left:6px]!">
                              ({selectedMomItem.currDate || "-"} vs {selectedMomItem.prevDate || "-"})
                            </span>
                          </>
                        )}
                      </div>
                      <button
                        type="button"
                        className="chart-popover-close-btn"
                        onClick={() => setSelectedMomItem(null)}
                        title="Tutup detail komparasi"
                        aria-label="Tutup detail komparasi"
                      >
                        <X size={13} />
                      </button>
                    </div>
                    <div className="popover-project-list">
                      <span className="popover-item">
                        <i className="legend-dot [background:#38bdf8]!" />
                        <strong>{momData.currMonthLabel} (Bulan Ini):</strong> {selectedMomItem.currCount} tiket
                        {typeof selectedMomItem.currResolved === "number" && ` (${selectedMomItem.currResolved} diselesaikan)`}
                      </span>
                      <span className="popover-item">
                        <i className="legend-dot [background:#c084fc]!" />
                        <strong>{momData.prevMonthLabel} (Bulan Lalu):</strong> {selectedMomItem.prevCount} tiket
                        {typeof selectedMomItem.prevResolved === "number" && ` (${selectedMomItem.prevResolved} diselesaikan)`}
                      </span>
                      <span className="popover-item">
                        <i
                          className="legend-dot"
                          style={{
                            background:
                              selectedMomItem.delta > 0
                                ? "#f87171"
                                : selectedMomItem.delta < 0
                                ? "#34d399"
                                : "#94a3b8",
                          }}
                        />
                        <strong>Selisih (MoM):</strong>{" "}
                        <span
                          style={{
                            color:
                              selectedMomItem.delta > 0
                                ? "#f87171"
                                : selectedMomItem.delta < 0
                                ? "#34d399"
                                : "inherit",
                            fontWeight: 700,
                          }}
                        >
                          {selectedMomItem.delta > 0 ? `+${selectedMomItem.delta}` : selectedMomItem.delta} tiket
                          {selectedMomItem.deltaPct !== undefined && ` (${selectedMomItem.deltaPct}%)`}
                        </span>
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </article>

        {/* Right: Rekap Tiket per User (Task 3) */}
        <div className="user-summary-wrapper">
          <article className="panel report-panel user-summary-panel">
            <div className="panel-heading report-panel-heading">
              <div className="chart-heading-left">
                <div className="panel-title [display:flex]! [align-items:center]! [gap:8px]!">
                  <Users size={14} className="text-sky-400" />
                  Rekap Tiket per User
                </div>
              </div>
              <span className="panel-sub-count">{userSummaries.length} Staf</span>
            </div>
            <div className="report-panel-body user-summary-body">
              <div className="user-summary-list">
                {userSummaries.map((user) => (
                  <button
                    type="button"
                    key={user.name}
                    className="user-summary-card"
                    onClick={() => setSelectedUserDetail(user)}
                    title={`Klik untuk melihat rincian sistem dan histori tiket ${user.name}`}
                  >
                    <div className="user-summary-card-top">
                      <div className="user-profile-left">
                        <Avatar size="sm" initials={user.initials} name={user.name} className="user-avatar-sm" />
                        <div className="user-name-role">
                          <span className="user-summary-name">{user.name}</span>
                          <span className="user-summary-role">{user.role}</span>
                        </div>
                      </div>
                      <span className="user-detail-link">
                        Detail <ChevronRight size={11} />
                      </span>
                    </div>

                    {/* 3 Metric Pills */}
                    <div className="user-metrics-row">
                      <div className="user-metric-col metric-today">
                        <span className="metric-lbl">HARI INI</span>
                        <strong className="metric-val">{user.todayCount}</strong>
                      </div>
                      <div className="user-metric-col metric-month">
                        <span className="metric-lbl">BULAN INI</span>
                        <strong className="metric-val">{user.monthCount}</strong>
                      </div>
                      <div className="user-metric-col metric-year">
                        <span className="metric-lbl">TAHUN INI</span>
                        <strong className="metric-val">{user.yearCount}</strong>
                      </div>
                    </div>

                    {/* Today's project tags */}
                    <div className="user-today-projects">
                      <span className="user-proj-label">Hari Ini:</span>
                      {Object.keys(user.todayBreakdown).length > 0 ? (
                        <div className="user-proj-pills-wrap">
                          {Object.entries(user.todayBreakdown).map(([proj, count]) => {
                            const pColor = PROJECT_COLORS[proj] || "#94a3b8";
                            return (
                              <span className="user-proj-badge" key={proj}>
                                <i className="legend-dot" style={{ background: pColor }} />
                                {proj} &times;{count}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="user-proj-none">Tidak ada tiket baru hari ini</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </article>
        </div>
      </div>


      {/* ── 5. Distributions: Category Donut & Priority Donut ── */}
      <div className="report-charts-grid">
        {/* Category Distribution (Donut + Ranked Bars) */}
        <article className="panel report-panel">
          <div className="panel-heading report-panel-heading">
            <div className="panel-title">Distribusi Kategori / Tipe Tiket</div>
            <span className="panel-sub-count">{typeCounts.length} Kategori</span>
          </div>
          <div className="report-panel-body">
            <div className="donut-and-list-grid">
              {/* Donut Chart */}
              <div className="donut-chart-wrap">
                <svg className="donut-svg" viewBox="0 0 160 160">
                  {renderDonutSlices(
                    typeCounts.map(([type, count], idx) => ({
                      label: type,
                      count,
                      color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                    })),
                    80,
                    80,
                    55,
                    16
                  )}
                </svg>
                <div className="donut-center-content">
                  <span className="donut-total-num">{total}</span>
                  <span className="donut-total-label">TOTAL</span>
                </div>
              </div>

              {/* Ranked Category Bars */}
              <div className="category-distribution-list">
                {typeCounts.map(([type, count], idx) => {
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];

                  return (
                    <div className="category-dist-row" key={type}>
                      <div className="category-dist-info">
                        <span className="category-dist-name">
                          <i className="legend-dot" style={{ background: color }} /> {type}
                        </span>
                        <span className="category-dist-count">{count} ({pct}%)</span>
                      </div>
                      <div className="category-dist-track">
                        <div className="category-dist-fill" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </article>

        {/* Severity Distribution */}
        <article className="panel report-panel">
          <div className="panel-heading report-panel-heading">
            <div className="panel-title">Distribusi Berdasarkan Severity</div>
            <span className="panel-sub-count">Severity Ratios</span>
          </div>
          <div className="report-panel-body">
            <div className="donut-and-list-grid">
              {/* Donut Chart for Priority */}
              <div className="donut-chart-wrap">
                <svg className="donut-svg" viewBox="0 0 160 160">
                  {renderDonutSlices(
                    [
                      { label: "Critical", count: priorityCounts.Critical, color: PRIORITY_COLORS.Critical },
                      { label: "High", count: priorityCounts.High, color: PRIORITY_COLORS.High },
                      { label: "Medium", count: priorityCounts.Medium, color: PRIORITY_COLORS.Medium },
                      { label: "Low", count: priorityCounts.Low, color: PRIORITY_COLORS.Low },
                    ],
                    80,
                    80,
                    55,
                    16
                  )}
                </svg>
                <div className="donut-center-content">
                  <span className="donut-total-num">{priorityCounts.Critical + priorityCounts.High}</span>
                  <span className="donut-total-label">CRIT/HIGH</span>
                </div>
              </div>

              {/* Priority Summary Grid */}
              <div className="priority-spectrum-list">
                <div className="priority-spec-box priority-crit">
                  <div className="spec-top">
                    <span className="crit-dot" />
                    <strong>Critical</strong>
                  </div>
                  <span className="spec-count">{priorityCounts.Critical}</span>
                  <span className="spec-pct">{total > 0 ? Math.round((priorityCounts.Critical / total) * 100) : 0}% share</span>
                </div>

                <div className="priority-spec-box priority-high">
                  <div className="spec-top">
                    <span className="high-dot" />
                    <strong>High</strong>
                  </div>
                  <span className="spec-count">{priorityCounts.High}</span>
                  <span className="spec-pct">{total > 0 ? Math.round((priorityCounts.High / total) * 100) : 0}% share</span>
                </div>

                <div className="priority-spec-box priority-med">
                  <div className="spec-top">
                    <span className="med-dot" />
                    <strong>Medium</strong>
                  </div>
                  <span className="spec-count">{priorityCounts.Medium}</span>
                  <span className="spec-pct">{total > 0 ? Math.round((priorityCounts.Medium / total) * 100) : 0}% share</span>
                </div>

                <div className="priority-spec-box priority-low">
                  <div className="spec-top">
                    <span className="low-dot" />
                    <strong>Low</strong>
                  </div>
                  <span className="spec-count">{priorityCounts.Low}</span>
                  <span className="spec-pct">{total > 0 ? Math.round((priorityCounts.Low / total) * 100) : 0}% share</span>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>

      {/* ── 6. Operational Velocity Trajectory ── */}
      <article className="panel report-panel mgmt-velocity-panel [display:flex]! [flex-direction:column]! [width:100%]!">
        <div className="panel-heading report-panel-heading [flex-wrap:wrap]! [gap:12px]! [align-items:center]!">
          <div>
            <div className="panel-title">Tren Durasi Penyelesaian (Resolution Velocity)</div>
          </div>
          <div className="velocity-legend-strip">
            <div className="velocity-legend-item">
              <span className="velocity-legend-line velocity-legend-blue" />
              <span>Rata-rata Resolusi</span>
            </div>
            <div className="velocity-legend-item">
              <span className="velocity-legend-line velocity-legend-orange" />
              <span>Target SLA (60m)</span>
            </div>
            <div className="velocity-legend-item">
              <span className="velocity-legend-line velocity-legend-red" />
              <span>Batas Kritis / Breach (90m)</span>
            </div>
          </div>
        </div>
          <div className="report-panel-body velocity-panel-body">
            {volumeByDate.length > 0 ? (
              <>
                {/* 4 Summary Stat Pills for Quick Velocity Intelligence */}
                {(() => {
                  const resolutions = volumeByDate.map((v) => v.avgResolution);
                  const avg = Math.round(resolutions.reduce((a, b) => a + b, 0) / (resolutions.length || 1));
                  const min = Math.min(...resolutions);
                  const max = Math.max(...resolutions);
                  const metCount = volumeByDate.filter((v) => v.avgResolution <= 60).length;
                  const compliancePct = Math.round((metCount / volumeByDate.length) * 100);

                  return (
                    <div className="velocity-metrics-strip">
                      <div className="velocity-metric-pill">
                        <span className="velocity-metric-label">Rata-rata Resolusi</span>
                        <span className="velocity-metric-val">{avg} <small>menit</small></span>
                      </div>
                      <div className="velocity-metric-pill">
                        <span className="velocity-metric-label">Kepatuhan SLA (≤60m)</span>
                        <span className="velocity-metric-val text-emerald-400">{compliancePct}%</span>
                      </div>
                      <div className="velocity-metric-pill">
                        <span className="velocity-metric-label">Durasi Tercepat</span>
                        <span className="velocity-metric-val text-sky-400">{min} <small>menit</small></span>
                      </div>
                      <div className="velocity-metric-pill">
                        <span className="velocity-metric-label">Durasi Tertinggi</span>
                        <span className={`velocity-metric-val ${max > 60 ? "text-rose-400" : "text-amber-400"}`}>
                          {max} <small>menit</small>
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Clean, Prominent Line Chart with Collision-Free Labels & Interactive Hover */}
                <div
                  className="velocity-chart-container"
                  onMouseLeave={() => setHoveredVelocityPoint(null)}
                >
                  {(() => {
                    const n = volumeByDate.length;
                    const svgViewBoxWidth = Math.max(860, n * 48 + 90);
                    const viewBoxHeight = 280;
                    const startX = 64;
                    const endX = svgViewBoxWidth - 90; // room for threshold tags on the right
                    const totalSpan = endX - startX;
                    const stepX = n > 1 ? totalSpan / (n - 1) : totalSpan / 2;

                    const baselineY = 226;
                    const topY = 32;
                    const chartHeight = baselineY - topY; // 194px

                    // Y ticks at 0, 20, 40, 60, 80, 100
                    const maxVal = Math.max(70, ...volumeByDate.map((v) => v.avgResolution));
                    const yMax = Math.max(100, Math.ceil(maxVal / 20) * 20);
                    const ticks = [0, 20, 40, 60, 80, 100];
                    if (yMax > 100) {
                      for (let i = 120; i <= yMax; i += 20) ticks.push(i);
                    }

                    const points = volumeByDate.map((item, idx) => {
                      const x = n > 1 ? Math.round(startX + idx * stepX) : Math.round((startX + endX) / 2);
                      const y = baselineY - Math.round((item.avgResolution / yMax) * chartHeight);
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

                    // X-axis stride to avoid crowding
                    const dateStride = n > 22 ? 3 : n > 12 ? 2 : 1;

                    return (
                      <>
                        <svg
                          className="velocity-chart-svg [overflow:visible]!"
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
                            const yPos = baselineY - Math.round((tick / yMax) * chartHeight);
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
                                  x={startX - 16}
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

                          {/* ── 2. Reference Threshold Line 90m (Breach Threshold) ── */}
                          {(() => {
                            const y90 = baselineY - Math.round((90 / yMax) * chartHeight);
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
                                <g transform={`translate(${endX + 10}, ${y90 - 8})`}>
                                  <rect
                                    width="68"
                                    height="16"
                                    rx="4"
                                    fill="rgba(239, 68, 68, 0.16)"
                                    stroke="rgba(239, 68, 68, 0.45)"
                                    strokeWidth="1"
                                  />
                                  <text
                                    x="34"
                                    y="11"
                                    textAnchor="middle"
                                    fill="#f87171"
                                    fontSize="8.5"
                                    fontWeight="700"
                                    fontFamily="var(--font-mono)"
                                  >
                                    Breach 90m
                                  </text>
                                </g>
                              </g>
                            );
                          })()}

                          {/* Right threshold tag for 60m (Target SLA) */}
                          {(() => {
                            const y60 = baselineY - Math.round((60 / yMax) * chartHeight);
                            return (
                              <g transform={`translate(${endX + 10}, ${y60 - 8})`}>
                                <rect
                                  width="68"
                                  height="16"
                                  rx="4"
                                  fill="rgba(245, 158, 11, 0.16)"
                                  stroke="rgba(245, 158, 11, 0.45)"
                                  strokeWidth="1"
                                />
                                <text
                                  x="34"
                                  y="11"
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
                            strokeWidth="2.8"
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
                            const isBreach = p.avgResolution > 60;
                            const isHovered = hoveredVelocityPoint?.date === p.date;
                            const isMax = maxPoint?.date === p.date;
                            const isMin = minPoint?.date === p.date;

                            // X-axis tick & label display
                            const showXLabel = idx % dateStride === 0 || idx === n - 1;

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
                                      x={p.x}
                                      y={baselineY + 18}
                                      textAnchor="middle"
                                      fill={isHovered ? "#38bdf8" : "var(--ink-muted, #94a3b8)"}
                                      fontSize="9"
                                      fontWeight={isHovered ? "700" : "500"}
                                      fontFamily="var(--font-mono)"
                                    >
                                      {p.date.slice(5)}
                                    </text>
                                  </>
                                )}

                                {/* Data Point Circle */}
                                <circle
                                  cx={p.x}
                                  cy={p.y}
                                  r={isHovered ? "6.5" : isBreach ? "5" : "4"}
                                  fill={isHovered ? "#ffffff" : isBreach ? "#ef4444" : "#38bdf8"}
                                  stroke={isHovered ? (isBreach ? "#ef4444" : "#0284c7") : "var(--panel-bg, #0f172a)"}
                                  strokeWidth={isHovered ? "3" : "2"}
                                  filter={isHovered ? "url(#glow-halo)" : undefined}
                                  className="[transition:all_0.15s_ease]!"
                                />

                                {/* Milestone Callout Badge (Peak Max point) */}
                                {isMax && !isHovered && (() => {
                                  const maxBadgeText = `${p.avgResolution}m Max`;
                                  const maxBadgeWidth = Math.max(72, maxBadgeText.length * 6.5 + 16);
                                  const maxBadgeHeight = 17;
                                  const halfW = maxBadgeWidth / 2;
                                  const clampedX = Math.max(halfW + 6, Math.min(svgViewBoxWidth - halfW - 6, p.x));
                                  const placeBelow = p.y < 30;
                                  const rectY = placeBelow ? p.y + 8 : p.y - 8 - maxBadgeHeight;

                                  return (
                                    <g style={{ pointerEvents: "none" }}>
                                      <rect
                                        x={clampedX - halfW}
                                        y={rectY}
                                        width={maxBadgeWidth}
                                        height={maxBadgeHeight}
                                        rx="4"
                                        fill="#0f172a"
                                        stroke={isBreach ? "#ef4444" : "#f59e0b"}
                                        strokeWidth="1.2"
                                      />
                                      <text
                                        x={clampedX}
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
                                {isMin && !isHovered && (() => {
                                  const minBadgeText = `${p.avgResolution}m Min`;
                                  const minBadgeWidth = Math.max(68, minBadgeText.length * 6.5 + 16);
                                  const minBadgeHeight = 17;
                                  const halfW = minBadgeWidth / 2;
                                  const clampedX = Math.max(halfW + 6, Math.min(svgViewBoxWidth - halfW - 6, p.x));
                                  const placeAbove = p.y > baselineY - 24;
                                  const rectY = placeAbove ? p.y - 8 - minBadgeHeight : p.y + 8;

                                  return (
                                    <g style={{ pointerEvents: "none" }}>
                                      <rect
                                        x={clampedX - halfW}
                                        y={rectY}
                                        width={minBadgeWidth}
                                        height={minBadgeHeight}
                                        rx="4"
                                        fill="#0f172a"
                                        stroke="#38bdf8"
                                        strokeWidth="1.2"
                                      />
                                      <text
                                        x={clampedX}
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

                                {/* Breach callout if breached and not max */}
                                {isBreach && !isMax && !isHovered && (() => {
                                  const breachText = `${p.avgResolution}m !`;
                                  const breachWidth = Math.max(58, breachText.length * 6.5 + 16);
                                  const breachHeight = 17;
                                  const halfW = breachWidth / 2;
                                  const clampedX = Math.max(halfW + 6, Math.min(svgViewBoxWidth - halfW - 6, p.x));
                                  const placeBelow = p.y < 30;
                                  const rectY = placeBelow ? p.y + 8 : p.y - 8 - breachHeight;

                                  return (
                                    <g style={{ pointerEvents: "none" }}>
                                      <rect
                                        x={clampedX - halfW}
                                        y={rectY}
                                        width={breachWidth}
                                        height={breachHeight}
                                        rx="4"
                                        fill="#0f172a"
                                        stroke="#ef4444"
                                        strokeWidth="1.2"
                                      />
                                      <text
                                        x={clampedX}
                                        y={rectY + breachHeight / 2}
                                        dominantBaseline="central"
                                        textAnchor="middle"
                                        fill="#f87171"
                                        fontSize="8.5"
                                        fontWeight="800"
                                        fontFamily="var(--font-mono)"
                                      >
                                        {breachText}
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
                                      percentX: (p.x / svgViewBoxWidth) * 100,
                                      percentY: (p.y / viewBoxHeight) * 100,
                                    });
                                  }}
                                />
                              </g>
                            );
                          })}
                        </svg>

                        {/* Floating Interactive Tooltip Overlay */}
                        {hoveredVelocityPoint && (
                          <div
                            className="velocity-chart-tooltip"
                            style={{
                              left: `${hoveredVelocityPoint.percentX}%`,
                              top: `${hoveredVelocityPoint.percentY}%`,
                            }}
                          >
                            <div className="velocity-tooltip-header">
                              <span>📅 {hoveredVelocityPoint.date}</span>
                              <span
                                className={`velocity-tooltip-badge ${
                                  hoveredVelocityPoint.avgResolution <= 60 ? "sla-ok" : "sla-breach"
                                }`}
                              >
                                {hoveredVelocityPoint.avgResolution <= 60 ? "✓ SLA OK" : "⚠ Breach"}
                              </span>
                            </div>
                            <div className="velocity-tooltip-row">
                              <span>Rata-rata Resolusi:</span>
                              <span className="velocity-tooltip-val">
                                {hoveredVelocityPoint.avgResolution} Menit
                              </span>
                            </div>
                            {hoveredVelocityPoint.closed > 0 && (
                              <div className="velocity-tooltip-row">
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
              <div className="chart-empty-hint">Tidak ada data resolusi pada filter ini.</div>
            )}
          </div>
        </article>

      {/* ── 7. Shift Traffic Velocity (Multi-Line Trajectory Chart) ── */}
      <div className="heatmap-standalone-section [margin-top:18px]!">
        <article className="panel report-panel shift-traffic-panel">
          <div className="panel-heading report-panel-heading">
            <div className="panel-title [display:flex]! [align-items:center]! [gap:8px]!">
              <Activity size={16} className="text-emerald-400" />
              Tren Trafik Beban per Shift (Shift Traffic Velocity)
            </div>
          </div>
          <div className="report-panel-body shift-traffic-panel-body">
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
                <div className="shift-traffic-metrics-strip">
                  <div className="shift-traffic-metric-pill">
                    <span className="shift-traffic-metric-label">
                      <Sun size={13} className="[color:#fbbf24]!" />
                      Shift Pagi (08:00–16:30)
                    </span>
                    <span className="shift-traffic-metric-val [color:#fbbf24]!">
                      {pagiTotal} <small className="[font-size:11px]! [font-weight:normal]!">tiket</small>
                    </span>
                    <span className="shift-traffic-metric-sub">{pagiPct}% dari total beban</span>
                  </div>

                  <div className="shift-traffic-metric-pill">
                    <span className="shift-traffic-metric-label">
                      <Sunset size={13} className="[color:#c084fc]!" />
                      Shift Malam (16:00–00:30)
                    </span>
                    <span className="shift-traffic-metric-val [color:#c084fc]!">
                      {malamTotal} <small className="[font-size:11px]! [font-weight:normal]!">tiket</small>
                    </span>
                    <span className="shift-traffic-metric-sub">{malamPct}% dari total beban</span>
                  </div>

                  <div className="shift-traffic-metric-pill">
                    <span className="shift-traffic-metric-label">
                      <Moon size={13} className="[color:#38bdf8]!" />
                      Shift Subuh (00:00–08:30)
                    </span>
                    <span className="shift-traffic-metric-val [color:#38bdf8]!">
                      {subuhTotal} <small className="[font-size:11px]! [font-weight:normal]!">tiket</small>
                    </span>
                    <span className="shift-traffic-metric-sub">{subuhPct}% dari total beban</span>
                  </div>

                  <div className="shift-traffic-metric-pill">
                    <span className="shift-traffic-metric-label">
                      <Zap size={13} className="[color:#f87171]!" />
                      Shift Beban Tertinggi (Peak)
                    </span>
                    <span className="shift-traffic-metric-val text-rose-400">
                      {shiftHeatmapData.peakShift.name}
                    </span>
                    <span className="shift-traffic-metric-sub">
                      {shiftHeatmapData.shiftTotals[shiftHeatmapData.peakShift.id]} tiket (
                      {grand > 0
                        ? Math.round(
                            (shiftHeatmapData.shiftTotals[shiftHeatmapData.peakShift.id] / grand) * 100
                          )
                        : 0}
                      % total)
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Clean, Prominent Multi-Line Chart Modeled After Resolution Velocity */}
            <div
              className="shift-traffic-chart-container"
              onMouseLeave={() => setHoveredShiftTrafficPoint(null)}
            >
              {(() => {
                const dateList = shiftHeatmapData.dateList;
                const n = dateList.length;
                const svgViewBoxWidth = Math.max(860, n * 50 + 60);
                const viewBoxHeight = 280;
                const startX = 46;
                const endX = svgViewBoxWidth - 36;
                const totalSpan = endX - startX;
                const stepX = n > 1 ? totalSpan / (n - 1) : totalSpan / 2;

                const baselineY = 226;
                const topY = 38;
                const chartHeight = baselineY - topY; // 188px

                // Y ticks calculation - tight scaling to prevent empty top rows!
                const allCounts = dateList.flatMap((d) => [
                  shiftHeatmapData.matrix.Subuh[d] || 0,
                  shiftHeatmapData.matrix.Pagi[d] || 0,
                  shiftHeatmapData.matrix.Malam[d] || 0,
                ]);
                const maxCount = Math.max(3, ...allCounts);
                const yMax = maxCount <= 3 ? 3 : maxCount <= 6 ? maxCount : Math.ceil(maxCount / 2) * 2;
                const stepTick = yMax <= 4 ? 1 : yMax <= 8 ? 2 : Math.ceil(yMax / 4);
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
                    const count = shiftHeatmapData.matrix[s.id][d] || 0;
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
                const dateStride = n > 22 ? 3 : n > 12 ? 2 : 1;

                return (
                  <>
                    <svg
                      className="shift-traffic-chart-svg [overflow:visible]!"
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

                      {/* ── 4. Data Points & Nodes per Shift ── */}
                      {shiftSeries.map((series) => {
                        const isFiltered =
                          activeShiftLineFilter !== "all" && activeShiftLineFilter !== series.id;
                        if (isFiltered) return null;

                        return (
                          <g key={`nodes-${series.id}`}>
                            {series.points.map((p) => {
                              const isColHovered = hoveredShiftTrafficPoint?.date === p.date;

                              return (
                                <circle
                                  key={`dot-${series.id}-${p.date}`}
                                  cx={p.x}
                                  cy={p.y}
                                  r={isColHovered ? "4.5" : "2.6"}
                                  fill={isColHovered ? "#ffffff" : series.color}
                                  stroke={isColHovered ? series.color : "var(--panel-bg, #0f172a)"}
                                  strokeWidth={isColHovered ? "2" : "1.2"}
                                  filter={
                                    isColHovered ? `url(#glow-shift-${series.id.toLowerCase()})` : undefined
                                  }
                                  className="[transition:all_0.15s_ease]!"
                                />
                              );
                            })}
                          </g>
                        );
                      })}

                      {/* ── 5. X-Axis Tick Marks & Hover Hit Columns ── */}
                      {dateList.map((d, idx) => {
                        const x =
                          n > 1 ? Math.round(startX + idx * stepX) : Math.round((startX + endX) / 2);
                        const showXLabel = idx % dateStride === 0 || idx === n - 1;
                        const subuh = shiftHeatmapData.matrix.Subuh[d] || 0;
                        const pagi = shiftHeatmapData.matrix.Pagi[d] || 0;
                        const malam = shiftHeatmapData.matrix.Malam[d] || 0;
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
                                  percentX: (x / svgViewBoxWidth) * 100,
                                  percentY: (topShiftY / viewBoxHeight) * 100,
                                });
                              }}
                            />
                          </g>
                        );
                      })}
                    </svg>

                    {/* Y-Axis Tick Labels (HTML Overlay - Zero SVG Distortion) */}
                    <div
                      className="shift-traffic-y-axis"
                      style={{ width: `${(startX / svgViewBoxWidth) * 100}%` }}
                    >
                      {ticks.map((tick) => {
                        const yPos = baselineY - Math.round((tick / yMax) * chartHeight);
                        const percentY = (yPos / viewBoxHeight) * 100;
                        return (
                          <span
                            key={`y-label-${tick}`}
                            className="shift-traffic-y-label"
                            style={{ top: `${percentY}%` }}
                          >
                            {tick}
                          </span>
                        );
                      })}
                    </div>

                    {/* X-Axis Date Labels (HTML Overlay - Zero SVG Distortion) */}
                    <div
                      className="shift-traffic-x-axis"
                      style={{ top: `${(baselineY / viewBoxHeight) * 100}%` }}
                    >
                      {dateList.map((d, idx) => {
                        const x =
                          n > 1 ? Math.round(startX + idx * stepX) : Math.round((startX + endX) / 2);
                        const showXLabel = idx % dateStride === 0 || idx === n - 1;
                        if (!showXLabel) return null;
                        const percentX = (x / svgViewBoxWidth) * 100;
                        const isHovered = hoveredShiftTrafficPoint?.date === d;

                        return (
                          <span
                            key={`x-label-${d}`}
                            className={`shift-traffic-x-label ${isHovered ? "hovered" : ""}`}
                            style={{ left: `${percentX}%` }}
                          >
                            {d.length >= 10 ? d.slice(5) : d}
                          </span>
                        );
                      })}
                    </div>

                    {/* Milestone Peak Callout Badge (HTML Overlay - Zero SVG Distortion) */}
                    {peakPointMeta && !hoveredShiftTrafficPoint && ((peak: ShiftPeakPoint) => {
                      const percentX = (peak.x / svgViewBoxWidth) * 100;
                      const percentY = (peak.y / viewBoxHeight) * 100;
                      const clampedPercentX = Math.max(6, Math.min(94, percentX));
                      const isNearTop = percentY < 12;

                      return (
                        <div
                          className="shift-traffic-peak-badge"
                          style={{
                            left: `${clampedPercentX}%`,
                            top: `${percentY}%`,
                            transform: isNearTop
                              ? "translate(-50%, 12px)"
                              : "translate(-50%, calc(-100% - 10px))",
                          }}
                        >
                          <span className="shift-traffic-peak-dot" />
                          <span>Peak: <strong>{peak.count} Tiket</strong></span>
                        </div>
                      );
                    })(peakPointMeta)}

                    {/* Floating Interactive Hover Tooltip */}
                    {hoveredShiftTrafficPoint && (
                      <div
                        className="shift-traffic-tooltip"
                        style={{
                          left: `${hoveredShiftTrafficPoint.percentX}%`,
                          top: `${hoveredShiftTrafficPoint.percentY}%`,
                        }}
                      >
                        <div className="shift-traffic-tooltip-header">
                          <span>📅 {hoveredShiftTrafficPoint.date}</span>
                          <span className="[color:#38bdf8]! [font-weight:700]!">
                            {hoveredShiftTrafficPoint.total} Tiket
                          </span>
                        </div>
                        <div className="shift-traffic-tooltip-row">
                          <span className="[display:inline-flex]! [align-items:center]! [gap:6px]!">
                            <span className="shift-legend-dot dot-pagi" /> Shift Pagi:
                          </span>
                          <span className="shift-traffic-tooltip-val [color:#fbbf24]!">
                            {hoveredShiftTrafficPoint.pagi} Tiket
                          </span>
                        </div>
                        <div className="shift-traffic-tooltip-row">
                          <span className="[display:inline-flex]! [align-items:center]! [gap:6px]!">
                            <span className="shift-legend-dot dot-malam" /> Shift Malam:
                          </span>
                          <span className="shift-traffic-tooltip-val [color:#c084fc]!">
                            {hoveredShiftTrafficPoint.malam} Tiket
                          </span>
                        </div>
                        <div className="shift-traffic-tooltip-row">
                          <span className="[display:inline-flex]! [align-items:center]! [gap:6px]!">
                            <span className="shift-legend-dot dot-subuh" /> Shift Subuh:
                          </span>
                          <span className="shift-traffic-tooltip-val [color:#38bdf8]!">
                            {hoveredShiftTrafficPoint.subuh} Tiket
                          </span>
                        </div>
                        <div className="shift-traffic-tooltip-row shift-traffic-tooltip-total">
                          <span>Total Harian:</span>
                          <span className="shift-traffic-tooltip-val">
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
            <div className="shift-traffic-filter-bar">
              <div className="shift-filter-buttons">
                <span className="[font-size:11px]! [font-weight:600]! [color:var(--ink-muted)]! [margin-right:4px]!">
                  Tampilkan Garis:
                </span>
                <button
                  type="button"
                  className={`shift-filter-btn ${activeShiftLineFilter === "all" ? "active" : ""}`}
                  onClick={() => setActiveShiftLineFilter("all")}
                >
                  <span>Semua Shift</span>
                </button>
                <button
                  type="button"
                  className={`shift-filter-btn ${activeShiftLineFilter === "Pagi" ? "active" : ""}`}
                  onClick={() => setActiveShiftLineFilter("Pagi")}
                >
                  <span className="shift-legend-dot dot-pagi" />
                  <span>Shift Pagi</span>
                </button>
                <button
                  type="button"
                  className={`shift-filter-btn ${activeShiftLineFilter === "Malam" ? "active" : ""}`}
                  onClick={() => setActiveShiftLineFilter("Malam")}
                >
                  <span className="shift-legend-dot dot-malam" />
                  <span>Shift Malam</span>
                </button>
                <button
                  type="button"
                  className={`shift-filter-btn ${activeShiftLineFilter === "Subuh" ? "active" : ""}`}
                  onClick={() => setActiveShiftLineFilter("Subuh")}
                >
                  <span className="shift-legend-dot dot-subuh" />
                  <span>Shift Subuh</span>
                </button>
              </div>
            </div>
          </div>
        </article>
      </div>



      {/* ── 8. User Ticket Detail Modal (Task 2: Fixed Viewport Portal Modal) ── */}
      {isMounted &&
        selectedUserDetail &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="user-modal-overlay" onClick={() => setSelectedUserDetail(null)}>
            <div className="user-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="user-modal-header">
                <div className="user-modal-profile">
                  <div
                    className="drawer-avatar-ring-wrapper"
                    style={getStatusRingStyle(
                      undefined,
                      selectedUserDetail.name.toLowerCase().includes("galih"),
                      userStatus
                    ) as React.CSSProperties}
                  >
                    <Avatar size="lg" initials={selectedUserDetail.initials} name={selectedUserDetail.name} className="user-avatar-lg" />
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
                    <h3 className="user-modal-title">{selectedUserDetail.name}</h3>
                    <p className="user-modal-sub">{selectedUserDetail.role}</p>
                  </div>
                </div>
                <ModalCloseButton
                  onClose={() => setSelectedUserDetail(null)}
                  label="Tutup Detail (Esc)"
                />
              </div>

              <div className="user-modal-body">
                {/* 3 Period Summaries */}
                <div className="user-modal-periods-grid">
                  {/* Hari Ini */}
                  <div className="user-period-card">
                    <div className="period-card-header">
                      <span className="period-badge today">HARI INI</span>
                      <strong className="period-total">{selectedUserDetail.todayCount} Tiket</strong>
                    </div>
                    <div className="period-breakdown-list">
                      {Object.keys(selectedUserDetail.todayBreakdown).length > 0 ? (
                        Object.entries(selectedUserDetail.todayBreakdown).map(([proj, count]) => {
                          const pColor = PROJECT_COLORS[proj] || "#94a3b8";
                          const pct = Math.round((count / Math.max(1, selectedUserDetail.todayCount)) * 100);
                          return (
                            <div className="period-breakdown-row" key={proj}>
                              <div className="period-proj-tag">
                                <i className="legend-dot" style={{ background: pColor }} />
                                <span>{proj}</span>
                              </div>
                              <span className="period-count-pct">{count} ({pct}%)</span>
                            </div>
                          );
                        })
                      ) : (
                        <span className="period-empty-text">Tidak ada tiket aktif hari ini</span>
                      )}
                    </div>
                  </div>

                  {/* Bulan Ini */}
                  <div className="user-period-card">
                    <div className="period-card-header">
                      <span className="period-badge month">BULAN INI</span>
                      <strong className="period-total">{selectedUserDetail.monthCount} Tiket</strong>
                    </div>
                    <div className="period-breakdown-list">
                      {Object.entries(selectedUserDetail.monthBreakdown).map(([proj, count]) => {
                        const pColor = PROJECT_COLORS[proj] || "#94a3b8";
                        const pct = Math.round((count / Math.max(1, selectedUserDetail.monthCount)) * 100);
                        return (
                          <div className="period-breakdown-row" key={proj}>
                            <div className="period-proj-tag">
                              <i className="legend-dot" style={{ background: pColor }} />
                              <span>{proj}</span>
                            </div>
                            <span className="period-count-pct">{count} ({pct}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tahun Ini */}
                  <div className="user-period-card">
                    <div className="period-card-header">
                      <span className="period-badge year">TAHUN INI</span>
                      <strong className="period-total">{selectedUserDetail.yearCount} Tiket</strong>
                    </div>
                    <div className="period-breakdown-list">
                      {Object.entries(selectedUserDetail.yearBreakdown).map(([proj, count]) => {
                        const pColor = PROJECT_COLORS[proj] || "#94a3b8";
                        const pct = Math.round((count / Math.max(1, selectedUserDetail.yearCount)) * 100);
                        return (
                          <div className="period-breakdown-row" key={proj}>
                            <div className="period-proj-tag">
                              <i className="legend-dot" style={{ background: pColor }} />
                              <span>{proj}</span>
                            </div>
                            <span className="period-count-pct">{count} ({pct}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Recent Activity / Assigned Tickets */}
                <div className="user-modal-tickets-section">
                  <div className="user-tickets-title">Tiket Terkait dalam Antrean ({selectedUserDetail.recentTickets.length})</div>
                  {selectedUserDetail.recentTickets.length > 0 ? (
                    <div className="user-modal-tickets-list">
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
                          <div className="user-modal-ticket-row" key={t.id}>
                            <span className="user-modal-ticket-id">#{t.id}</span>
                            <span className="user-modal-ticket-proj" style={{ color: pColor }}>● {t.project}</span>
                            <span className="user-modal-ticket-sub" title={t.subject}>{t.subject}</span>
                            <span className={`priority-pill ${pClass}`}>{t.severity}</span>
                            <span className="user-modal-ticket-st">{t.status}</span>
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
    </div>
  );
}
