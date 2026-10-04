"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { Search, Download, User, X, Check } from "lucide-react";
import { DatePicker } from "@/app/components/ui/DatePicker";
import { ProjectMark } from "@/app/components/ui/ProjectMark";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { PaginationBar } from "@/app/components/ui/PaginationBar";
import { useToast } from "@/app/components/ui/Toast";
import { getOwnerRole } from "@/app/lib/data";
import type { CheckpointAssessment, HistoricalAssessmentEntry, MonitoringEntry } from "@/app/lib/types";
import { useClient } from "@/app/context/ClientContext";
import { getClientHistoricalAssessments } from "@/app/lib/clientData";

interface MonitoringHistorySectionProps {
  todayEntries: MonitoringEntry[];
  todayAssessments: Record<string, CheckpointAssessment>;
}

type VerdictFilter = "all" | "ok" | "nok";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>("all");
  const [dateFilter, setDateFilter] = useState<string>("");

  // Pagination state (default: 10 rows per page)
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset pagination to page 1 whenever any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, verdictFilter, dateFilter, pageSize]);

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
  }, [todayEntries, todayAssessments]);

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
      <div className="rounded-t-[10px] [display:flex] [align-items:center] [justify-content:space-between] [gap:14px] [flex-wrap:wrap] [padding:var(--space-4)_var(--space-5)] [border-bottom:1px_solid_var(--line)]">
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
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 p-[16px_20px] bg-[#0f172a] border-b border-[#334155]">
        {/* Search input (order-1 w-full xl:w-[380px], rata kiri di desktop) */}
        <div className="relative flex items-center order-1 w-full xl:w-[380px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b] pointer-events-none shrink-0" />
          <input
            type="text"
            className="w-full h-[38px] pl-9 pr-8 bg-[#0f172a] border border-[#334155] rounded-[7px] text-[13px] text-[#f1f5f9] placeholder-[#64748b] transition-all focus-visible:border-[#38bdf8]/60 focus-visible:ring-2 focus-visible:ring-[#38bdf8]/25 focus-visible:outline-none"
            placeholder="Cari checkpoint, sistem, pemeriksa, atau catatan..."
            value={searchQuery}
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
                <div className="[box-sizing:border-box] [padding:12px_16px_6px] [display:flex] [align-items:center] [background:var(--panel-bg)]">
                  <div className="[width:100%] [display:flex] [align-items:center] [justify-content:space-between] [gap:10px] [padding:6px_12px] [background:color-mix(in_srgb,_var(--accent-blue-soft)_30%,_var(--bg))] [border:1px_solid_var(--line)] [border-radius:6px]">
                    <span className="[font-size:11px] [font-weight:700] [color:var(--ink-primary)] [font-family:var(--font-mono)]">{group.header}</span>
                    <div className="[display:flex] [align-items:center] [gap:6px]">
                      <span className="[font-size:9.5px] [font-weight:700] [font-family:var(--font-mono)] [padding:1px_5px] [border-radius:4px] [color:var(--green)] [background:var(--green-soft)]">✓ {stats?.ok ?? 0} OK</span>
                      <span className="[font-size:9.5px] [font-weight:700] [font-family:var(--font-mono)] [padding:1px_5px] [border-radius:4px] [color:var(--red)] [background:var(--red-soft)]">✗ {stats?.nok ?? 0} NOK</span>
                      <span className="[font-size:9.5px] [font-weight:700] [font-family:var(--font-mono)] [padding:1px_5px] [border-radius:4px] [color:var(--ink-muted)] [background:rgba(148,_163,_184,_0.15)]">{stats?.total ?? 0} total</span>
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
                        className={`[box-sizing:border-box] [display:grid] [grid-template-columns:70px_minmax(160px,_1.4fr)_80px_minmax(0,_2.2fr)] [align-items:center] [gap:12px] [padding:8px_16px] [border-bottom:1px_solid_var(--line)] [transition:background_0.15s_ease] [@media(max-width:940px)]:[grid-template-columns:58px_minmax(0,_1fr)_auto] [@media(max-width:940px)]:[grid-template-areas:'time_project_verdict'_'time_note_note'] [@media(max-width:940px)]:[align-items:start] [@media(max-width:940px)]:[gap:8px] [@media(max-width:940px)]:[height:auto]! [@media(max-width:940px)]:[position:relative]! [@media(max-width:940px)]:[transform:none]! [@media(max-width:940px)]:[padding:10px_14px] ${
                          isOk
                            ? "[background:color-mix(in_srgb,_var(--green-soft)_20%,_var(--panel-bg))]"
                            : "[background:color-mix(in_srgb,_var(--red-soft)_25%,_var(--panel-bg))] [border-left:3px_solid_var(--red)]"
                        }`}
                      >
                        {/* Time */}
                        <span className="[display:flex] [flex-direction:column] [@media(max-width:940px)]:[grid-area:time] [@media(max-width:940px)]:[padding-top:2px]">
                          <strong className="[font-size:12px] [font-weight:700] [font-family:var(--font-mono)] [color:var(--ink-primary)]">{entry.time}</strong>
                          <small className="[font-size:9px] [color:var(--ink-muted)] [font-family:var(--font-mono)]">{entry.date.slice(5)}</small>
                        </span>

                        {/* Project & Task */}
                        <div className="[display:flex] [align-items:center] [gap:8px] [min-width:0] [@media(max-width:940px)]:[grid-area:project]">
                          <ProjectMark name={entry.project} />
                          <div className="[display:flex] [flex-direction:column] [min-width:0]">
                            <strong className="[font-size:12px] [font-weight:700] [color:var(--ink-primary)]">{entry.project}</strong>
                            <span className="[font-size:10.5px] [color:var(--ink-secondary)] [overflow:hidden] [text-overflow:ellipsis] [white-space:nowrap]">{entry.task}</span>
                          </div>
                        </div>

                        {/* Verdict Badge */}
                        <div className="history-verdict-cell [@media(max-width:940px)]:[grid-area:verdict] [@media(max-width:940px)]:[justify-self:end]">
                          <span
                            className={`[display:inline-flex] [align-items:center] [justify-content:center] [padding:2px_7px] [border-radius:5px] [font-size:10px] [font-weight:800] [font-family:var(--font-mono)] [line-height:1.2] ${
                              isOk
                                ? "[color:var(--green)] [background:var(--green-soft)] [border:1px_solid_var(--green-border)]"
                                : "[color:var(--red)] [background:var(--red-soft)] [border:1px_solid_var(--red-border)]"
                            }`}
                          >
                            {isOk ? "✓ OK" : "✗ NOK"}
                          </span>
                        </div>

                        {/* Note & Checker */}
                        <div className="[display:flex] [flex-direction:column] [min-width:0] [gap:2px] [@media(max-width:940px)]:[grid-area:note]">
                          <span className="[font-size:11.5px] [color:var(--ink-primary)] [overflow:hidden] [text-overflow:ellipsis] [white-space:nowrap]" title={entry.note}>
                            {entry.note || "Tanpa catatan tambahan."}
                          </span>
                          <div className="[display:flex] [align-items:center] [gap:4px] [font-size:9.5px] [color:var(--ink-muted)] [font-family:var(--font-mono)]">
                            <span className="[display:inline-flex] [align-items:center] [gap:3px] [font-weight:600]">
                              <User size={11} /> {entry.owner}
                            </span>
                            <span className="history-checker-role">· {ownerRole}</span>
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
              setCurrentPage(1);
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
    </article>
  );
}
