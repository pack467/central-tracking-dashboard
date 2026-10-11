"use client";
import Link from "next/link";
import { useUrlQuery } from "@/app/hooks/useUrlQuery";
import { monitoringSchema } from "@/app/lib/query-state";
import { paths, withQuery } from "@/app/lib/routes";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Layers,
  Clock,
  Activity,
  Server,
  HardDrive,
  Radio,
  Cpu,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Grid,
  SlidersHorizontal,
} from "lucide-react";
import { MonitoringSchedule, rowKey, matchesProject, CLIENT_MONITORING_SYSTEMS } from "@/app/components/dashboard/MonitoringSchedule";
import { MonitoringHistorySection } from "@/app/components/monitoring/MonitoringHistorySection";
import { StatCard, type StatAccentColor } from "@/app/components/ui/StatCard";
import { useActiveShift } from "@/app/hooks/useLiveClock";
import type { CheckpointAssessment } from "@/app/lib/types";
import { useClient } from "@/app/context/ClientContext";
import { getClientMonitoringSchedule, getClientProjects } from "@/app/lib/clientData";

interface MonitoringViewProps {
  assessments: Record<string, CheckpointAssessment>;
  onAssess: (key: string, verdict: "ok" | "nok" | "adequate" | "not-adequate" | null) => void;
  onRequestNote: (key: string) => void;
  onUpdateNote?: (key: string, note: string) => void;
  onOpenGuide: () => void;
  currentHour: string;
}

export function MonitoringView({
  assessments,
  onAssess,
  onRequestNote,
  onUpdateNote,
  onOpenGuide,
  currentHour,
}: MonitoringViewProps) {
  const { activeClient, activeClientId } = useClient();
  const schedule = useMemo(() => getClientMonitoringSchedule(activeClientId), [activeClientId]);
  const projects = useMemo(() => getClientProjects(activeClientId), [activeClientId]);

  const schema = useMemo(() => monitoringSchema(projects.map(p => p.name), CLIENT_MONITORING_SYSTEMS[activeClientId] ?? CLIENT_MONITORING_SYSTEMS.tritronik), [projects, schedule]);
  const url = useUrlQuery(schema, paths.monitoring);
  const activeShift = useActiveShift();
  const shiftAccent: StatAccentColor = activeShift.id === "subuh" ? "blue" : activeShift.id === "pagi" ? "amber" : "purple";
  const activeTab = url.pathname === paths.monitoringHistory ? "history" : "live";
  const selectedProject = url.values.project || null;
  const setSelectedProject = (value: string | null) => url.update({ project: value ?? "" });

  // Status filter for project cards: "all" | "urgent" | "healthy"
  const statusFilter = url.values.health;
  const setStatusFilter = url.field("health", "replace");
  // Expanded mode (multi-row grid) vs carousel mode (single-row with scroll)
  const [isExpanded, setIsExpanded] = useState(false);

  // Carousel scroll ref & states
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [scrollIndex, setScrollIndex] = useState(0);
  const [visibleCardsCount, setVisibleCardsCount] = useState(4);

  // Auto-reset project filter when active client changes


  // Assessed entries list
  const assessedEntries = useMemo(
    () =>
      Object.entries(assessments)
        .map(([key, assessment]) => ({
          key,
          assessment,
          entry: schedule.find((item) => rowKey(item) === key),
        }))
        .filter(
          (item): item is { key: string; assessment: CheckpointAssessment; entry: (typeof schedule)[number] } =>
            Boolean(item.entry),
        )
        .reverse(),
    [assessments, schedule],
  );

  // Summary Metrics
  const totalCheckpoints = schedule.length;
  const adequateCount = assessedEntries.filter(
    (item) => item.assessment.verdict === "ok" || item.assessment.verdict === "adequate",
  ).length;
  const notAdequateCount = assessedEntries.filter(
    (item) => item.assessment.verdict === "nok" || item.assessment.verdict === "not-adequate",
  ).length;
  const totalAssessed = adequateCount + notAdequateCount;

  // Percentage & proportion calculations
  const okRate = totalAssessed > 0 ? Math.round((adequateCount / totalAssessed) * 100) : 100;
  const nokRate = totalAssessed > 0 ? Math.round((notAdequateCount / totalAssessed) * 100) : 0;
  const completedPct = Math.round((totalAssessed / totalCheckpoints) * 100);

  const hours = useMemo(() => Array.from(new Set(schedule.map((item) => item.time))), [schedule]);

  // Project breakdown stats with health and OK/NOK breakdown
  const projectStats = useMemo(() => {
    return projects.map((projEntry) => {
      const projectName = projEntry.name;
      const items = schedule.filter((item) => matchesProject(item.project, projectName));
      const total = items.length;

      let okCount = 0;
      let nokCount = 0;

      items.forEach((item) => {
        const key = rowKey(item);
        const a = assessments[key];
        if (a) {
          if (a.verdict === "ok" || a.verdict === "adequate") okCount++;
          if (a.verdict === "nok" || a.verdict === "not-adequate") nokCount++;
        } else if (item.tone === "warning") {
          // If unassessed but scheduled as warning in base data
          nokCount++;
        }
      });

      const hasNok = nokCount > 0;

      return {
        project: projectName,
        detail: projEntry.detail,
        total,
        okCount,
        nokCount,
        hasNok,
      };
    });
  }, [projects, schedule, assessments]);

  // Tally of projects with NOK vs All OK
  const urgentCount = useMemo(() => projectStats.filter((p) => p.hasNok).length, [projectStats]);
  const healthyCount = useMemo(() => projectStats.filter((p) => !p.hasNok).length, [projectStats]);

  // Distressed/NOK projects first (matching Overview priority triage)
  const sortedProjectStats = useMemo(() => {
    return [...projectStats].sort((a, b) => {
      if (a.hasNok && !b.hasNok) return -1;
      if (!a.hasNok && b.hasNok) return 1;
      return a.project.localeCompare(b.project);
    });
  }, [projectStats]);

  // Apply filter
  const displayStats = useMemo(() => {
    if (statusFilter === "urgent") {
      return sortedProjectStats.filter((p) => p.hasNok);
    }
    if (statusFilter === "healthy") {
      return sortedProjectStats.filter((p) => !p.hasNok);
    }
    return sortedProjectStats;
  }, [sortedProjectStats, statusFilter]);

  const displayCount = displayStats.length;

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    // 2px tolerance for subpixel rounding
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 2);

    const firstCard = el.querySelector(".system-compact-card") as HTMLElement | null;
    const cardWidth = firstCard ? firstCard.offsetWidth + 12 : 258;
    const visible = firstCard ? Math.max(1, Math.floor((clientWidth + 12) / cardWidth)) : 5;
    setVisibleCardsCount(visible);
    const idx = Math.min(Math.round(scrollLeft / cardWidth), Math.max(0, displayCount - 1));
    setScrollIndex(Math.max(0, idx));
  }, [displayCount]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateScrollState();

    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        updateScrollState();
      });
      ro.observe(el);
      const firstCard = el.querySelector(".system-compact-card");
      if (firstCard) {
        ro.observe(firstCard);
      }
    }

    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      ro?.disconnect();
    };
  }, [updateScrollState, isExpanded, displayCount]);

  // Recalculate accurately after DOM reflow and 200ms card transition when toggling back from grid to carousel
  useEffect(() => {
    if (isExpanded) return;
    updateScrollState();
    const frameId = requestAnimationFrame(() => {
      updateScrollState();
    });
    const t1 = setTimeout(updateScrollState, 100);
    const t2 = setTimeout(updateScrollState, 250);
    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isExpanded, updateScrollState]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const firstCard = el.querySelector(".system-compact-card") as HTMLElement | null;
    const cardStride = firstCard ? firstCard.offsetWidth + 12 : 258;
    const step = cardStride * Math.max(1, Math.min(3, visibleCardsCount));
    el.scrollBy({
      left: direction === "left" ? -step : step,
      behavior: "smooth",
    });
  };

  // Project icon helper
  const getProjectIcon = (name: string) => {
    switch (name) {
      case "Core Banking":
      case "OCS Billing":
      case "SM":
        return <Server size={14} />;
      case "Switching ATM":
      case "SMSC Core":
      case "B2B":
        return <Radio size={14} />;
      case "BNI Mobile":
      case "MyTelkomsel":
      case "MB":
        return <Activity size={14} />;
      case "Fraud Shield":
      case "5G Edge":
      case "USIEM":
        return <Cpu size={14} />;
      case "Card Mgmt":
      case "HLR/HSS":
      case "DM":
        return <HardDrive size={14} />;
      default:
        return <Layers size={14} />;
    }
  };

  return (
    <>
      {/* ── Page Header ── */}
      <section className="flex flex-wrap justify-between items-end gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono font-bold tracking-[1px] text-[#94a3b8] uppercase">
            <span className="w-[7px] h-[7px] rounded-full bg-[#4ade80] animate-pulse shrink-0" />
            <span>MONITORING · {activeClient.code}</span>
          </div>
          <h1 className="text-[24px] font-bold text-[#f8fafc] leading-[1.2] tracking-[-0.4px] my-[6px_4px]">Monitoring</h1>
        </div>
        <div className="flex gap-[9px]">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 h-[34px] px-3.5 rounded-[8px] text-[12px] font-semibold text-[#f8fafc] border border-[#334155] bg-[#1e293b] hover:bg-[#243044] hover:border-[#475569] shadow-sm transition-all duration-150 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f172a] active:scale-[0.98]"
            onClick={onOpenGuide}
          >
            <BookOpen size={14} className="text-[#38bdf8]" />
            <span>Panduan Penilaian (Guide)</span>
          </button>
        </div>
      </section>

      {/* ── Sub-Navigation Switcher (Monitoring Sekarang / Log Monitoring) ── */}
      <div className="flex items-center gap-2 mb-6 border-b border-[#334155] pb-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Navigasi view monitoring">
        <Link

          role="tab"
          aria-selected={activeTab === "live"}
          className={`inline-flex items-center text-center gap-2 px-3.5 py-[7px] rounded-[8px] border text-[12px] font-semibold transition-all cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f172a] ${
            activeTab === "live"
              ? "bg-[#1e293b] border-[#334155] text-[#38bdf8] font-bold shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
              : "border-transparent bg-transparent text-[#94a3b8] hover:bg-[#243044] hover:text-[#f8fafc]"
          }`}
          href={withQuery(paths.monitoring, url.query)} scroll={false}
        >
          <Activity size={14} className={activeTab === "live" ? "text-[#38bdf8]" : "text-[#94a3b8]"} />
          <span>Monitoring Sekarang</span>
          <span
            className={`inline-flex items-center px-1.5 py-[1px] rounded-full text-[10px] font-mono font-bold leading-none ${
              activeTab === "live"
                ? "bg-[rgba(56,189,248,0.15)] text-[#38bdf8]"
                : "bg-[rgba(148,163,184,0.12)] text-[#94a3b8]"
            }`}
          >
            {totalCheckpoints}
          </span>
        </Link>

        <Link

          role="tab"
          aria-selected={activeTab === "history"}
          className={`inline-flex items-center text-center gap-2 px-3.5 py-[7px] rounded-[8px] border text-[12px] font-semibold transition-all cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f172a] ${
            activeTab === "history"
              ? "bg-[#1e293b] border-[#334155] text-[#38bdf8] font-bold shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
              : "border-transparent bg-transparent text-[#94a3b8] hover:bg-[#243044] hover:text-[#f8fafc]"
          }`}
          href={withQuery(paths.monitoringHistory, url.query)} scroll={false}
        >
          <Clock size={14} className={activeTab === "history" ? "text-[#38bdf8]" : "text-[#94a3b8]"} />
          <span>Log Monitoring</span>
          {notAdequateCount > 0 ? (
            <span className="inline-flex items-center px-1.5 py-[1px] rounded-full text-[10px] font-mono font-bold leading-none bg-[rgba(248,113,113,0.15)] text-[#f87171] border border-[rgba(248,113,113,0.3)]">
              {notAdequateCount} NOK
            </span>
          ) : (
            <span
              className={`inline-flex items-center px-1.5 py-[1px] rounded-full text-[10px] font-mono font-bold leading-none ${
                activeTab === "history"
                  ? "bg-[rgba(56,189,248,0.15)] text-[#38bdf8]"
                  : "bg-[rgba(148,163,184,0.12)] text-[#94a3b8]"
              }`}
            >
              {totalAssessed > 0 ? `${totalAssessed} Selesai` : "Log Riwayat"}
            </span>
          )}
        </Link>
      </div>

      {activeTab === "live" && (
        <div className="animate-in fade-in duration-200 pb-24 md:pb-5">
          {/* ── 1. Top Stat Cards (OK / NOK / Checkpoint Hari Ini / Jam Pemeriksaan) ── */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6" aria-label="Statistik pemeriksaan monitoring">
            {/* Card 1: STATUS OK */}
            <StatCard
              label="STATUS OK"
              value={adequateCount}
              accentColor="green"
              icon={<CheckCircle2 size={15} strokeWidth={2} />}
              subtitle={`${okRate}% compliance rate (${adequateCount} of ${totalAssessed || totalCheckpoints})`}
              progress={{
                value: okRate,
                segments: totalAssessed > 0 ? [
                  { label: "OK", percentage: okRate, color: "#4ade80" },
                  { label: "NOK", percentage: nokRate, color: "#f87171" },
                ] : [{ label: "OK Baseline", percentage: 100, color: "#4ade80" }],
              }}
              badgeText={adequateCount > 0 ? `${adequateCount} Passed Normal` : "Baseline OK"}
              badgeTone="green"
              className="!border-[#334155] hover:!border-[#475569] !border-l-[#334155]"
            />

            {/* Card 2: STATUS NOK (Persistent visual emphasis if NOK > 0 + Trend indicator) */}
            <StatCard
              label="STATUS NOK (ANOMALI)"
              value={notAdequateCount}
              accentColor={notAdequateCount > 0 ? "rose" : "green"}
              icon={<AlertTriangle size={15} strokeWidth={2} />}
              subtitle={
                notAdequateCount > 0
                  ? "↓ 1 fewer NOK vs yesterday (30 Aug)"
                  : "0 anomali aktif terdeteksi hari ini"
              }
              progress={{
                value: nokRate,
                segments: totalAssessed > 0 ? [
                  { label: "NOK", percentage: nokRate, color: "#f87171" },
                  { label: "OK", percentage: okRate, color: "#4ade80" },
                ] : undefined,
              }}
              badgeText={notAdequateCount > 0 ? `${notAdequateCount} Needs Investigation` : "All Systems Nominal"}
              badgeTone={notAdequateCount > 0 ? "rose" : "green"}
              className={
                notAdequateCount > 0
                  ? "!border-l-[3px] !border-l-[#f87171] !bg-[color-mix(in_srgb,rgba(248,113,113,0.12)_35%,#1e293b)] !border-[#f87171]/40 !shadow-[0_0_0_1px_rgba(248,113,113,0.25)]"
                  : "!border-[#334155] hover:!border-[#475569] !border-l-[#334155]"
              }
            />

            {/* Card 3: CHECKPOINT HARI INI (With Completion Progress Bar) */}
            <StatCard
              label="CHECKPOINT HARI INI"
              value={totalCheckpoints}
              accentColor="blue"
              icon={<Layers size={15} strokeWidth={2} />}
              subtitle={`${totalAssessed} of ${totalCheckpoints} evaluated (${completedPct}%)`}
              progress={{
                value: completedPct,
                color: "#38bdf8",
              }}
              badgeText={`${totalAssessed}/${totalCheckpoints} Selesai`}
              badgeTone="blue"
              className="!border-[#334155] hover:!border-[#475569] !border-l-[#334155]"
            />

            {/* Card 4: JAM PEMERIKSAAN */}
            <StatCard
              label="JAM PEMERIKSAAN"
              value={hours.length}
              unit="Slots"
              accentColor={shiftAccent}
              icon={<Clock size={15} strokeWidth={2} />}
              subtitle={`Slot ${activeShift.period} (${activeShift.label})`}
              badgeText={`${activeShift.label} Active`}
              badgeTone={shiftAccent}
              className="!border-[#334155] hover:!border-[#475569] !border-l-[#334155]"
            />
          </section>

          {/* ── 2. Project / Service Breakdown Row ── */}
          <section className="flex flex-col gap-3 mb-6" aria-label="Cakupan proyek dan layanan monitoring">
            {/* ── Header: Title + Triage Tally + Filter Chips & Carousel Nav Controls ── */}
            <div className="flex justify-between items-center flex-wrap gap-3 px-0">
              <div className="flex flex-col gap-[3px]">
                <div className="flex items-center gap-2 flex-wrap min-h-6">
                  <span className="inline-flex items-center h-6 text-[11.5px] font-bold font-sans tracking-[0.04em] uppercase text-[#94a3b8] leading-none whitespace-nowrap">
                    STATUS BERDASARKAN PROYEK/LAYANAN ({projectStats.length} TERPANTAU)
                  </span>

                  {/* Triage Summary Badges */}
                  <div className="inline-flex items-center gap-2" aria-label="Ringkasan status proyek">
                    {urgentCount > 0 && (
                      <span
                        className="inline-flex items-center justify-center gap-1.5 h-[26px] px-2.5 rounded-[6px] text-[10.5px] font-bold font-mono tracking-wide text-[#f87171] bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.3)] uppercase select-none whitespace-nowrap"
                        title={`${urgentCount} proyek memerlukan mitigasi karena ada checkpoint NOK`}
                      >
                        <Flame size={12} strokeWidth={2.5} className="shrink-0" />
                        <span>{urgentCount} PERLU MITIGASI</span>
                      </span>
                    )}
                    <span
                      className="inline-flex items-center justify-center gap-1.5 h-[26px] px-2.5 rounded-[6px] text-[10.5px] font-bold font-mono tracking-wide text-[#4ade80] bg-[rgba(34,197,94,0.12)] border border-[rgba(34,197,94,0.28)] uppercase select-none whitespace-nowrap"
                      title={`${healthyCount} proyek dalam kondisi normal tanpa anomali`}
                    >
                      <Check size={12} strokeWidth={2.5} className="shrink-0" />
                      <span>{healthyCount} NORMAL</span>
                    </span>

                    {/* Carousel Position Counter Badge */}
                    {!isExpanded && displayCount > 0 && (
                      <span className="inline-flex items-center justify-center h-[26px] px-2.5 rounded-[6px] text-[10.5px] font-bold font-mono tracking-wide text-[#38bdf8] bg-[rgba(56,189,248,0.12)] border border-[rgba(56,189,248,0.28)] uppercase select-none whitespace-nowrap">
                        {scrollIndex + 1}–{Math.min(scrollIndex + visibleCardsCount, displayCount)} DARI {displayCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Strip: Filter Chips + Carousel Nav & View Toggle Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Filter Chips */}
                {projectStats.length > 3 && (
                  <div
                    className="inline-flex items-center gap-[3px] h-[30px] bg-slate-900/60 px-[3px] py-[2px] rounded-[7px] border border-[#334155] select-none"
                    role="tablist"
                    aria-label="Filter status proyek"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={statusFilter === "all"}
                      className={`inline-flex items-center justify-center gap-1 h-6 px-[9px] rounded-[5px] font-sans text-[12px] font-semibold transition-all cursor-pointer leading-none whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8] ${
                        statusFilter === "all"
                          ? "bg-[rgba(56,189,248,0.16)] text-[#38bdf8] border border-[rgba(56,189,248,0.35)] font-bold"
                          : "border border-transparent bg-transparent text-[#cbd5e1] hover:text-[#f8fafc] hover:bg-white/[0.06]"
                      }`}
                      onClick={() => setStatusFilter("all")}
                    >
                      <span>Semua</span>
                      <span className="text-[11.5px] opacity-85">({projectStats.length})</span>
                    </button>

                    <button
                      type="button"
                      role="tab"
                      aria-selected={statusFilter === "urgent"}
                      className={`inline-flex items-center justify-center gap-1 h-6 px-[9px] rounded-[5px] font-sans text-[12px] font-semibold transition-all cursor-pointer leading-none whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8] ${
                        statusFilter === "urgent"
                          ? "bg-[rgba(56,189,248,0.16)] text-[#38bdf8] border border-[rgba(56,189,248,0.35)] font-bold"
                          : "border border-transparent bg-transparent text-[#cbd5e1] hover:text-[#f8fafc] hover:bg-white/[0.06]"
                      }`}
                      onClick={() => setStatusFilter("urgent")}
                      title="Tampilkan hanya proyek yang memerlukan tindakan atau mitigasi"
                    >
                      {urgentCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-[#f87171] inline-block mr-[1px] shrink-0" />}
                      <span>Perlu Tindakan</span>
                      <span className="text-[11.5px] opacity-85">({urgentCount})</span>
                    </button>

                    <button
                      type="button"
                      role="tab"
                      aria-selected={statusFilter === "healthy"}
                      className={`inline-flex items-center justify-center gap-1 h-6 px-[9px] rounded-[5px] font-sans text-[12px] font-semibold transition-all cursor-pointer leading-none whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8] ${
                        statusFilter === "healthy"
                          ? "bg-[rgba(56,189,248,0.16)] text-[#38bdf8] border border-[rgba(56,189,248,0.35)] font-bold"
                          : "border border-transparent bg-transparent text-[#cbd5e1] hover:text-[#f8fafc] hover:bg-white/[0.06]"
                      }`}
                      onClick={() => setStatusFilter("healthy")}
                    >
                      <span>Normal</span>
                      <span className="text-[11.5px] opacity-85">({healthyCount})</span>
                    </button>
                  </div>
                )}

                {/* Navigation Controls: Prev/Next Buttons + View Mode Toggle */}
                <div className="flex items-center gap-2">
                  {!isExpanded && (
                    <div className="relative z-10 inline-flex items-center gap-1" role="group" aria-label="Navigasi carousel proyek">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-[6px] bg-slate-800/80 border border-[#334155] text-[#cbd5e1] hover:text-[#38bdf8] hover:bg-[rgba(56,189,248,0.15)] hover:border-[rgba(56,189,248,0.4)] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]"
                        onClick={() => scroll("left")}
                        disabled={!canScrollLeft}
                        aria-label="Proyek sebelumnya"
                        title="Gulir ke proyek sebelumnya"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-[6px] bg-slate-800/80 border border-[#334155] text-[#cbd5e1] hover:text-[#38bdf8] hover:bg-[rgba(56,189,248,0.15)] hover:border-[rgba(56,189,248,0.4)] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]"
                        onClick={() => scroll("right")}
                        disabled={!canScrollRight}
                        aria-label="Proyek berikutnya"
                        title="Gulir ke proyek berikutnya"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}

                  {/* View Mode Toggle */}
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-1.5 h-[30px] px-2.5 rounded-[7px] font-sans bg-slate-800/80 border border-[#334155] text-[#cbd5e1] hover:text-[#38bdf8] hover:bg-[rgba(56,189,248,0.12)] hover:border-[rgba(56,189,248,0.35)] text-[11.5px] font-semibold transition-all cursor-pointer whitespace-nowrap leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]"
                    onClick={() => setIsExpanded(!isExpanded)}
                    title={isExpanded ? "Kembali ke mode baris geser" : "Buka semua proyek dalam grid bertingkat"}
                  >
                    {isExpanded ? (
                      <>
                        <SlidersHorizontal size={13} />
                        <span>Mode Geser</span>
                      </>
                    ) : (
                      <>
                        <Grid size={13} />
                        <span>Lihat Semua ({displayCount})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* ── Carousel Cards Container with Edge Fades ── */}
            <div className="relative w-full">
              {!isExpanded && (
                <>
                  <div className={`absolute left-0 top-0 bottom-2 w-10 bg-gradient-to-r from-[#0f172a] to-transparent pointer-events-none z-10 transition-opacity duration-200 ${canScrollLeft ? "opacity-100" : "opacity-0"}`} />
                  <div className={`absolute right-0 top-0 bottom-2 w-10 bg-gradient-to-l from-[#0f172a] to-transparent pointer-events-none z-10 transition-opacity duration-200 ${canScrollRight ? "opacity-100" : "opacity-0"}`} />
                </>
              )}

              <div
                ref={scrollRef}
                className={
                  isExpanded
                    ? "grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3 px-0 pt-1 pb-3 w-full"
                    : "flex flex-nowrap overflow-x-auto snap-x snap-proximity scroll-smooth gap-3 px-0 pt-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden w-full"
                }
              >
                {displayStats.map(({ project, total, okCount, nokCount, hasNok }) => {
                  const isSelected = selectedProject?.toLowerCase() === project.toLowerCase();

                  return (
                    <button
                      type="button"
                      key={project}
                      className={[
                        "system-compact-card flex flex-col gap-2 p-[13px_14px] rounded-[10px] border text-left cursor-pointer transition-all duration-200 select-none shadow-[0_2px_8px_rgba(0,0,0,0.18)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.28)] hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f172a]",
                        isExpanded
                          ? "w-full"
                          : "flex-[0_0_calc((100%-60px)/6)] min-w-[190px] max-[1560px]:flex-[0_0_calc((100%-48px)/5)] max-[1200px]:flex-[0_0_calc((100%-36px)/4)] max-[900px]:flex-[0_0_calc((100%-24px)/3)] max-[640px]:flex-[0_0_calc((100%-12px)/2)] max-[480px]:min-w-[155px] max-[380px]:min-w-[140px] shrink-0 snap-start box-border",
                        isSelected
                          ? "!border-[#38bdf8] !bg-[rgba(56,189,248,0.12)] !shadow-[0_0_0_1px_#38bdf8]"
                          : "border-[#334155] bg-[#1e293b] hover:border-[rgba(56,189,248,0.3)] hover:bg-[#243044]",
                      ].join(" ")}
                      onClick={() => setSelectedProject(isSelected ? null : project)}
                      aria-pressed={isSelected}
                      title={`Klik untuk memfilter checkpoint proyek ${project}`}
                    >
                      <div className="flex items-center gap-[7px]">
                        <span
                          className={`w-[7px] h-[7px] rounded-full shrink-0 ${
                            hasNok
                              ? "bg-[#f87171] shadow-[0_0_0_2px_rgba(248,113,113,0.2)]"
                              : "bg-[#4ade80] shadow-[0_0_0_2px_rgba(74,222,128,0.2)]"
                          }`}
                          aria-hidden="true"
                        />
                        <span className="inline-flex items-center justify-center text-[#cbd5e1]">
                          {getProjectIcon(project)}
                        </span>
                        <span className="text-[12px] font-bold text-[#f8fafc] truncate">{project}</span>
                        {isSelected && (
                          <span className="ml-auto text-[9px] font-bold text-[#38bdf8] bg-[rgba(56,189,248,0.12)] border border-[rgba(56,189,248,0.3)] rounded-[4px] px-1.5 py-0.5 font-mono uppercase">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="flex items-baseline gap-[6px] mt-1">
                        <strong className="font-mono text-[22px] font-extrabold text-[#f8fafc] leading-none tracking-tight">{total}</strong>
                        <span className="text-[10.5px] text-[#94a3b8] font-normal leading-none">
                          {total === 1 ? "checkpoint" : "checkpoints"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-[6px] mt-1 pt-2 border-t border-[#334155]">
                        <span
                          className={`inline-flex items-center gap-[3px] text-[10px] font-bold font-mono rounded-[4px] px-[6px] py-[1.5px] leading-tight border ${
                            hasNok
                              ? "text-[#f87171] bg-[rgba(248,113,113,0.12)] border-[rgba(248,113,113,0.25)]"
                              : "text-[#4ade80] bg-[rgba(74,222,128,0.12)] border-[rgba(74,222,128,0.25)]"
                          }`}
                        >
                          {hasNok ? (
                            <>
                              <AlertTriangle size={11} className="shrink-0" />
                              <span>{nokCount} NOK</span>
                            </>
                          ) : (
                            <>
                              <Check size={11} className="shrink-0" />
                              <span>{okCount || total} OK</span>
                            </>
                          )}
                        </span>
                        <span className="text-[10.5px] font-medium text-[#94a3b8] leading-none whitespace-nowrap">
                          {hasNok ? "Perlu mitigasi" : "All Normal"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {displayCount === 0 && (
                <div className="flex flex-col items-center justify-center gap-2 p-8 text-center bg-slate-900/40 border border-[#334155] rounded-xl text-slate-400 text-xs">
                  <span>Tidak ada proyek yang cocok dengan filter ini.</span>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg bg-sky-500/15 border border-sky-500/35 text-sky-400 font-semibold hover:bg-sky-500/25 transition-all cursor-pointer"
                    onClick={() => setStatusFilter("all")}
                  >
                    Reset Filter
                  </button>
                </div>
              )}
            </div>
          </section>

      {/* ── 3. Monitoring Schedule Table ── */}
      <MonitoringSchedule
        entries={schedule}
        assessments={assessments}
        onAssess={onAssess}
        onRequestNote={onRequestNote}
        onUpdateNote={onUpdateNote}
        currentHour={currentHour}
        selectedProject={selectedProject}
        onSelectProject={setSelectedProject}
        selectedSystem={url.values.system || null}
        onSelectSystem={value => url.update({ system: value ?? "" })}
        selectedStatus={url.values.status}
        onSelectStatus={value => url.update({ status: value })}
      />
        </div>
      )}

      {/* ── 4. Riwayat Asesmen Checkpoint (History Section) ── */}
      {activeTab === "history" && (
        <div className="anim-tab-fade pb-24 md:pb-6">
          <MonitoringHistorySection
            todayEntries={schedule}
            todayAssessments={assessments}
          />
        </div>
      )}
    </>
  );
}


