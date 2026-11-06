"use client";
import { MasterProjectName } from "@/app/components/ui/MasterProjectName";
import { paths } from "@/app/lib/routes";
import { useUrlQuery, useUrlSearch } from "@/app/hooks/useUrlQuery";
import { monitoringSchema } from "@/app/lib/query-state";
import { getClientProjects } from "@/app/lib/clientData";
import { CLIENT_MONITORING_SYSTEMS } from "@/app/components/dashboard/MonitoringSchedule";

import { useMemo, useCallback, useState } from "react";
import { Search, Download, User, X, Check, Globe } from "lucide-react";
import { DatePicker } from "@/app/components/ui/DatePicker";
import { ProjectTile } from "@/app/components/monitoring/ProjectTile";
import { Avatar } from "@/app/components/ui/Avatar";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { PaginationBar } from "@/app/components/ui/PaginationBar";
import { useToast } from "@/app/components/ui/Toast";
import { MonitoringLinksModal } from "@/app/components/monitoring/MonitoringLinksModal";
import { getOwnerRole } from "@/app/lib/data";
import type { CheckpointAssessment, HistoricalAssessmentEntry, MonitoringEntry } from "@/app/lib/types";
import { useClient } from "@/app/context/ClientContext";
import { getClientHistoricalAssessments } from "@/app/lib/clientData";

interface MonitoringHistorySectionProps {
  todayEntries: MonitoringEntry[];
  todayAssessments: Record<string, CheckpointAssessment>;
}

const MONTH_NAMES_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function formatDateHeader(dateStr: string) {
  const today = "2026-08-31";
  const yesterday = "2026-08-30";
  if (dateStr === today) return "Hari Ini · 31 Agustus 2026 (Shift Malam)";
  if (dateStr === yesterday) return "Kemarin · 30 Agustus 2026 (Shift Pagi & Malam)";

  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const day = parseInt(parts[2], 10);
    const mIdx = parseInt(parts[1], 10) - 1;
    const year = parts[0];
    const month = MONTH_NAMES_ID[mIdx] || parts[1];
    return `${day} ${month} ${year}`;
  }
  return dateStr;
}

export function MonitoringHistorySection({ todayEntries, todayAssessments }: MonitoringHistorySectionProps) {
  const { activeClientId } = useClient();
  const seedHistorical = useMemo(() => getClientHistoricalAssessments(activeClientId), [activeClientId]);
  const notify = useToast();
  const schema = useMemo(() => monitoringSchema(getClientProjects(activeClientId).map(p => p.name), CLIENT_MONITORING_SYSTEMS[activeClientId] ?? CLIENT_MONITORING_SYSTEMS.tritronik), [activeClientId]);
  const url = useUrlQuery(schema, paths.monitoring);
  const searchDraft = useUrlSearch(url.values.q, url.field("q"));
  const searchQuery = searchDraft.effective;
  const setSearchQuery = searchDraft.set;
  const verdictFilter = url.values.verdict;
  const setVerdictFilter = url.field("verdict", "replace");
  const dateFilter = url.values.date;
  const setDateFilter = url.field("date", "replace");

  // Pagination state (default: 10 rows per page)
  const pageSize = url.values.size;
  const setPageSize = url.field("size", "replace");
  const currentPage = url.values.page;
  const setCurrentPage = url.field("page", "push");
  const [activeLinksModal, setActiveLinksModal] = useState<{
    project: string;
    task?: string;
    clientId?: string;
  } | null>(null);

  // Reset pagination to page 1 whenever any filter changes


  // Merge today's live assessments into the history list
  const allHistory = useMemo(() => {
    const liveTodayRecords: HistoricalAssessmentEntry[] = [];

    // Generate records from today's live assessments
    Object.entries(todayAssessments).forEach(([key, assessment]) => {
      const match = todayEntries.find((e) => `${e.time}-${e.project}-${e.task}` === key);
      if (match) {
        liveTodayRecords.push({
          id: `live-${key}`,
          date: "2026-08-31",
          time: match.time,
          project: match.project,
          task: match.task,
          owner: match.owner,
          verdict: assessment.verdict === "ok" || assessment.verdict === "adequate" ? "ok" : "nok",
          note: assessment.note || (assessment.verdict === "ok" ? "Evaluasi status normal terverifikasi." : "Anomali terdeteksi."),
        });
      }
    });

    // Combine with seed historical assessments (avoid duplicates if matching today's key)
    const filteredSeed = seedHistorical.filter(
      (seed) => !liveTodayRecords.some((live) => live.time === seed.time && live.project === seed.project && live.date === seed.date)
    );

    const merged = [...liveTodayRecords, ...filteredSeed];

    // Sort by date DESC, then time DESC
    return merged.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.time.localeCompare(a.time);
    });
  }, [todayEntries, todayAssessments, seedHistorical]);

  // Apply Date and Search Query filters (for top summary counts)
  const dateAndSearchFiltered = useMemo(() => {
    return allHistory.filter((entry) => {
      // Date filter (single date or range)
      if (dateFilter) {
        if (dateFilter.includes("..")) {
          const [start, end] = dateFilter.split("..");
          if (start && entry.date < start) return false;
          if (end && entry.date > end) return false;
        } else {
          if (entry.date !== dateFilter) return false;
        }
      }

      // Search text filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const haystack = `${entry.project} ${entry.task} ${entry.owner} ${entry.note} ${entry.time} ${entry.verdict}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [allHistory, dateFilter, searchQuery]);

  // Top summary counts across all pages for the current search/date filters
  const totalFilteredCount = dateAndSearchFiltered.length;
  const okFilteredCount = useMemo(
    () => dateAndSearchFiltered.filter((i) => i.verdict === "ok").length,
    [dateAndSearchFiltered]
  );
  const nokFilteredCount = useMemo(
    () => dateAndSearchFiltered.filter((i) => i.verdict === "nok").length,
    [dateAndSearchFiltered]
  );

  // Apply verdict filter
  const filteredHistory = useMemo(() => {
    if (verdictFilter === "all") return dateAndSearchFiltered;
    return dateAndSearchFiltered.filter((entry) => entry.verdict === verdictFilter);
  }, [dateAndSearchFiltered, verdictFilter]);

  // Pagination calculations
  const totalCount = filteredHistory.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIdx = (safeCurrentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalCount);
  const paginatedHistory = useMemo(
    () => filteredHistory.slice(startIdx, endIdx),
    [filteredHistory, startIdx, endIdx]
  );

  const pageNumbers = useMemo(() => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) pages.push("...");
      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(totalPages - 1, safeCurrentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safeCurrentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, safeCurrentPage]);

  // Precompute per-date summary stats across the filtered dataset
  const dateStatsMap = useMemo(() => {
    const map = new Map<string, { ok: number; nok: number; total: number }>();
    filteredHistory.forEach((item) => {
      const s = map.get(item.date) || { ok: 0, nok: 0, total: 0 };
      s.total += 1;
      if (item.verdict === "ok") s.ok += 1;
      else if (item.verdict === "nok") s.nok += 1;
      map.set(item.date, s);
    });
    return map;
  }, [filteredHistory]);

  // Group paginated items sequentially by date
  const groupedPageEntries = useMemo(() => {
    const groups: Array<{
      date: string;
      header: string;
      items: HistoricalAssessmentEntry[];
    }> = [];
    let currentGroup: {
      date: string;
      header: string;
      items: HistoricalAssessmentEntry[];
    } | null = null;

    for (const entry of paginatedHistory) {
      if (!currentGroup || currentGroup.date !== entry.date) {
        currentGroup = {
          date: entry.date,
          header: formatDateHeader(entry.date),
          items: [entry],
        };
        groups.push(currentGroup);
      } else {
        currentGroup.items.push(entry);
      }
    }
    return groups;
  }, [paginatedHistory]);

  // Export to CSV Function (exports full filtered dataset across all pages)
  const handleExportCSV = useCallback(() => {
    if (filteredHistory.length === 0) {
      notify.warning("Tidak ada data riwayat yang dapat diekspor.", { id: "export-empty" });
      return;
    }

    const headers = ["ID", "Tanggal", "Waktu", "Project / Sistem", "Tugas Checkpoint", "Status Verdict", "Pemeriksa", "Peran", "Catatan Anomali"];
    const csvRows = [
      headers.join(","),
      ...filteredHistory.map((row) => {
        const clean = (text: string) => `"${(text || "").replace(/"/g, '""')}"`;
        return [
          clean(row.id),
          clean(row.date),
          clean(row.time),
          clean(row.project),
          clean(row.task),
          clean(row.verdict.toUpperCase()),
          clean(row.owner),
          clean(getOwnerRole(row.owner)),
          clean(row.note),
        ].join(",");
      }),
    ];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `checkpoint-assessment-history-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    notify.success(`${filteredHistory.length} entri riwayat checkpoint berhasil diekspor ke CSV.`, {
      id: "export-success",
    });
  }, [filteredHistory, notify]);

  return (
    <article className="[background:var(--panel-bg)] [border:1px_solid_var(--panel-border)] rounded-[10px] [box-shadow:var(--shadow-panel)] [scroll-margin-top:var(--sticky-content-offset)] [margin-top:24px] mb-5 min-[1920px]:-mb-9">
      {/* 1. Header & Title */}
      <div className="rounded-t-[10px] [display:flex] [align-items:center] [justify-content:space-between] [gap:14px] [padding:var(--space-4)_var(--space-5)] max-md:px-3 max-md:py-3 [border-bottom:1px_solid_var(--line)]">
        <div>
          <div className="panel-title">Riwayat Asesmen Checkpoint</div>
        </div>

        <div className="history-head-actions">
          <button
            type="button"
            className="[height:30px] [display:inline-flex] [align-items:center] [justify-content:center] [gap:6px] [padding:0_10px] [border-radius:7px] [font-size:12px]! [font-weight:600] [transition:all_0.15s_ease] [color:var(--ink-primary)] [border:1px_solid_var(--panel-border)]! [background:var(--panel-bg)]! hover:[background:var(--panel-bg-hover)]!"
            onClick={handleExportCSV}
            title="Download log asesmen ke format CSV"
          >
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* 2. Filter & Search Toolbar */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 max-md:gap-y-2.5 p-[16px_20px] max-md:p-3 bg-[#0f172a] border-b border-[#334155]">
        {/* Search input (order-1 w-full xl:w-[380px], rata kiri di desktop) */}
        <div className="relative flex items-center order-1 w-full xl:w-[380px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b] pointer-events-none shrink-0" />
          <input
            type="text"
            className="w-full h-[38px] pl-9 pr-8 bg-[#0f172a] border border-[#334155] rounded-[7px] text-[13px] text-[#f1f5f9] placeholder-[#64748b] transition-all focus-visible:border-[#38bdf8]/60 focus-visible:ring-2 focus-visible:ring-[#38bdf8]/25 focus-visible:outline-none"
            placeholder="Cari checkpoint, pemeriksa, catatan…"
            value={searchDraft.input}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Cari riwayat checkpoint"
          />
          {searchQuery && (
            <button
              type="button"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-5 h-5 text-[#94a3b8] hover:text-[#f8fafc] rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
              onClick={() => setSearchQuery("")}
              aria-label="Bersihkan pencarian"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filter Group: Segmented Filter + DatePicker (order-2 xl:ml-auto, rata kanan di desktop) */}
        <div className="flex flex-wrap items-center gap-3 order-2 xl:ml-auto max-md:w-full">
          {/* Segmented Filter (Semua / OK / NOK) */}
          <div
            className="inline-flex items-center gap-[3px] p-[3px] rounded-[7px] bg-[#0f172a] border border-[#334155] h-[38px] box-border select-none shrink-0 max-md:w-full max-md:justify-between"
            role="group"
            aria-label="Filter status verdict"
          >
            <button
              type="button"
              className={`inline-flex items-center justify-center gap-1.5 h-full px-3 rounded-[5px] text-[12px] font-semibold transition-all cursor-pointer whitespace-nowrap leading-none max-md:flex-1 ${
                verdictFilter === "all"
                  ? "bg-[#1e293b] text-[#38bdf8] font-bold border border-[#334155]/80 shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
                  : "border border-transparent bg-transparent text-[#94a3b8] hover:text-[#f8fafc] hover:bg-white/[0.04]"
              }`}
              onClick={() => setVerdictFilter("all")}
            >
              <span>Semua</span>
              <span className="font-normal opacity-85">({totalFilteredCount})</span>
            </button>
            <button
              type="button"
              className={`inline-flex items-center justify-center gap-1.5 h-full px-3 rounded-[5px] text-[12px] font-semibold transition-all cursor-pointer whitespace-nowrap leading-none max-md:flex-1 ${
                verdictFilter === "ok"
                  ? "bg-[#1e293b] text-[#4ade80] font-bold border border-[#334155]/80 shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
                : "border border-transparent bg-transparent text-[#94a3b8] hover:text-[#f8fafc] hover:bg-white/[0.04]"
              }`}
              onClick={() => setVerdictFilter("ok")}
            >
              <Check size={13} strokeWidth={2.5} className="shrink-0 text-[#4ade80]" />
              <span>OK</span>
              <span className="font-normal opacity-85">({okFilteredCount})</span>
            </button>
            <button
              type="button"
              className={`inline-flex items-center justify-center gap-1.5 h-full px-3 rounded-[5px] text-[12px] font-semibold transition-all cursor-pointer whitespace-nowrap leading-none max-md:flex-1 ${
                verdictFilter === "nok"
                  ? "bg-[#1e293b] text-[#f87171] font-bold border border-[#334155]/80 shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
                  : "border border-transparent bg-transparent text-[#94a3b8] hover:text-[#f8fafc] hover:bg-white/[0.04]"
              }`}
              onClick={() => setVerdictFilter("nok")}
            >
              <X size={13} strokeWidth={2.5} className="shrink-0 text-[#f87171]" />
              <span>NOK</span>
              <span className="font-normal opacity-85">({nokFilteredCount})</span>
            </button>
          </div>

          {/* Date Filter Picker */}
          <div className="w-[160px] max-md:w-full shrink-0">
            <DatePicker
              value={dateFilter}
              onChange={setDateFilter}
              placeholder="Semua Waktu"
              referenceDate="2026-08-31"
              align="right"
              aria-label="Filter rentang tanggal"
            />
          </div>
        </div>
      </div>

      {/* 3. Grouped History List */}
      {totalCount > 0 ? (
        <div className="rounded-b-[10px] overflow-hidden [display:flex] [flex-direction:column]">
          {groupedPageEntries.map((group) => {
            const stats = dateStatsMap.get(group.date);
            return (
              <div key={group.date} className="[display:flex] [flex-direction:column]">
                <div className="box-border pt-3 px-4 pb-1.5 max-md:px-3 max-md:pb-0 flex items-center bg-[var(--panel-bg)]">
                  <div className="w-full flex flex-wrap items-center justify-between gap-x-2.5 gap-y-1.5 py-1.5 px-3 max-md:py-2 bg-[color-mix(in_srgb,var(--accent-blue-soft)_30%,var(--bg))] border border-[var(--line)] rounded-md max-md:rounded-lg">
                    <span className="text-[11px] max-md:text-[12px] font-bold text-[var(--ink-primary)] font-mono">{group.header}</span>
                    <div className="flex items-center gap-1.5 [&>span]:whitespace-nowrap [&>span]:text-[9.5px] max-md:[&>span]:text-[10.5px] [&>span]:font-bold [&>span]:font-mono [&>span]:px-[5px] max-md:[&>span]:px-1.5 [&>span]:py-px [&>span]:rounded">
                      <span className="text-[var(--green)] bg-[var(--green-soft)]">✓ {stats?.ok ?? 0} OK</span>
                      <span className="text-[var(--red)] bg-[var(--red-soft)]">✗ {stats?.nok ?? 0} NOK</span>
                      <span className="text-[var(--ink-muted)] bg-[rgba(148,163,184,0.15)]">{stats?.total ?? 0} total</span>
                    </div>
                  </div>
                </div>

                <div className="history-group-items">
                  {group.items.map((entry) => {
                    const isOk = entry.verdict === "ok";
                    const ownerRole = getOwnerRole(entry.owner);

                    return (
                      <div
                        key={entry.id}
                        className={`box-border grid border-b border-[var(--line)] transition-colors duration-150
                          min-[941px]:grid-cols-[70px_minmax(160px,1.4fr)_80px_minmax(0,2.2fr)] min-[941px]:items-center min-[941px]:gap-3 min-[941px]:px-4 min-[941px]:py-2
                          max-[940px]:grid-cols-[minmax(0,1fr)_auto] max-[940px]:[grid-template-areas:'time_verdict''project_project''note_note'] max-[940px]:gap-x-3 max-[940px]:gap-y-2.5 max-[940px]:p-[12px_14px]
                          max-md:mx-3 max-md:my-2 max-md:rounded-xl max-md:border max-md:border-[#334155] ${
                          isOk
                            ? "bg-[color-mix(in_srgb,var(--green-soft)_20%,var(--panel-bg))]"
                            : "bg-[color-mix(in_srgb,var(--red-soft)_25%,var(--panel-bg))] border-l-[3px] border-l-[var(--red)]"
                        }`}
                      >
                        {/* Time */}
                        <span className="flex flex-col max-[940px]:[grid-area:time] max-[940px]:flex-row max-[940px]:items-center max-[940px]:gap-2">
                          <strong className="text-[12px] max-[940px]:text-[14px] font-bold font-mono text-[var(--ink-primary)] tabular-nums">{entry.time}</strong>
                          <small className="text-[9px] max-[940px]:text-[11px] text-[var(--ink-muted)] font-mono">{entry.date.slice(5)}</small>
                        </span>

                        {/* Project & Task */}
                        <div className="flex items-center gap-2 max-[940px]:gap-2.5 min-w-0 max-[940px]:[grid-area:project]">
                          <ProjectTile name={entry.project} clientId={entry.clientId} size="xs" />
                          <div className="flex flex-col min-w-0 flex-1">
                            <strong className="text-[12px] max-[940px]:text-[13px] font-bold text-[var(--ink-primary)] truncate"><MasterProjectName value={entry.project} historical /></strong>
                            <span className="text-[10.5px] max-[940px]:text-[11.5px] text-[var(--ink-secondary)] min-[941px]:truncate leading-snug">{entry.task}</span>
                          </div>
                          <button
                            type="button"
                            aria-haspopup="dialog"
                            onClick={() => {
                              setActiveLinksModal({
                                project: entry.project,
                                task: entry.task,
                                clientId: entry.clientId || activeClientId,
                              });
                            }}
                            title={`Buka link monitoring ${entry.project}`}
                            aria-label={`Buka link monitoring ${entry.project}`}
                            className="size-7 max-[940px]:size-10 [@media(pointer:coarse)]:size-10 grid place-items-center [&>svg]:block rounded-lg border border-[#38bdf8]/30 bg-[#38bdf8]/10 text-[#38bdf8] hover:bg-[#38bdf8]/20 hover:border-[#38bdf8]/60 shrink-0 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]"
                          >
                            <Globe size={16} strokeWidth={1.75} absoluteStrokeWidth />
                          </button>
                        </div>

                        {/* Verdict Badge */}
                        <div className="history-verdict-cell max-[940px]:[grid-area:verdict] max-[940px]:justify-self-end">
                          <span
                            className={`inline-flex items-center justify-center gap-1 px-[7px] py-[2px] max-[940px]:px-2.5 max-[940px]:py-1 rounded-[5px] max-[940px]:rounded-full text-[10px] max-[940px]:text-[11px] font-extrabold font-mono leading-[1.2] border ${
                              isOk
                                ? "text-[var(--green)] bg-[var(--green-soft)] border-[var(--green-border)]"
                                : "text-[var(--red)] bg-[var(--red-soft)] border-[var(--red-border)]"
                            }`}
                          >
                            {isOk ? <Check size={11} strokeWidth={3} /> : <X size={11} strokeWidth={3} />}
                            {isOk ? "OK" : "NOK"}
                          </span>
                        </div>

                        {/* Note & Checker */}
                        <div className="flex flex-col min-w-0 gap-0.5 max-[940px]:gap-2 max-[940px]:[grid-area:note]">
                          <span
                            className={`text-[11.5px] text-[var(--ink-primary)] min-[941px]:truncate max-[940px]:text-[12.5px] max-[940px]:leading-relaxed max-[940px]:rounded-lg max-[940px]:px-3 max-[940px]:py-2 max-[940px]:border ${
                              isOk ? "max-[940px]:bg-[#0f172a]/60 max-[940px]:border-[#334155]/70" : "max-[940px]:bg-[#f87171]/[0.07] max-[940px]:border-[#f87171]/25"
                            } ${entry.note ? "" : "text-[var(--ink-muted)] italic"}`}
                            title={entry.note}
                          >
                            {entry.note || "Tanpa catatan tambahan."}
                          </span>
                          <div className="flex items-center gap-1 max-[940px]:gap-2 min-w-0 text-[9.5px] max-[940px]:text-[11.5px] text-[var(--ink-muted)] font-mono max-[940px]:font-sans">
                            <User size={11} className="shrink-0 max-[940px]:hidden" />
                            <span className="contents min-[941px]:hidden"><Avatar size="xs" name={entry.owner} /></span>
                            <span className="font-semibold max-[940px]:font-medium max-[940px]:text-[var(--ink-primary)] truncate min-w-0">{entry.owner}</span>
                            <span className="history-checker-role truncate min-w-0">· {ownerRole}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* 4. Pagination Controls Bar */}
          <PaginationBar
            pageSize={pageSize}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
            }}
            currentPage={safeCurrentPage}
            onPageChange={setCurrentPage}
            totalCount={totalCount}
            startIdx={startIdx}
            endIdx={endIdx}
            totalPages={totalPages}
            pageNumbers={pageNumbers}
            pageSizeOptions={[10, 30, 50, 100]}
            itemLabel="entri"
            selectAriaLabel="Jumlah entri riwayat per halaman"
          />
        </div>
      ) : (
        <div className="rounded-b-[10px] overflow-hidden" style={{ padding: "32px 16px" }}>
          <EmptyState
            icon="◷"
            title="Tidak ada riwayat asesmen yang cocok"
            message={
              searchQuery || verdictFilter !== "all" || dateFilter
                ? "Coba sesuaikan kata kunci pencarian atau reset filter di atas."
                : "Tandai checkpoint pada jadwal di atas sebagai OK atau NOK untuk mulai merekam riwayat."
            }
          />
        </div>
      )}

      {activeLinksModal && (
        <MonitoringLinksModal
          open
          project={activeLinksModal.project}
          task={activeLinksModal.task}
          clientId={activeLinksModal.clientId}
          onClose={() => setActiveLinksModal(null)}
        />
      )}
    </article>
  );
}

