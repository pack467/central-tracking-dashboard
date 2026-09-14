"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { Search, Download, User, X } from "lucide-react";
import { DatePicker } from "@/app/components/ui/DatePicker";
import { ProjectMark } from "@/app/components/ui/ProjectMark";
import { EmptyState } from "@/app/components/ui/EmptyState";
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
  const { activeClient, activeClientId } = useClient();
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
    <article className="panel view-panel history-panel">
      {/* 1. Header & Title */}
      <div className="panel-heading history-heading">
        <div>
          <div className="panel-title">Riwayat Asesmen Checkpoint</div>
          <span className="panel-subtitle">Log riwayat penilaian status OK / NOK per shift dan tanggal</span>
        </div>

        <div className="history-head-actions">
          <button
            type="button"
            className="button button-sm button-secondary history-export-btn"
            onClick={handleExportCSV}
            title="Download log asesmen ke format CSV"
          >
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* 2. Filter & Search Toolbar */}
      <div className="history-toolbar">
        {/* Search input */}
        <div className="history-search-wrap">
          <Search size={14} className="history-search-icon" />
          <input
            type="text"
            className="history-search-input"
            placeholder="Cari checkpoint, sistem, pemeriksa, atau catatan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="history-search-clear"
              onClick={() => setSearchQuery("")}
              aria-label="Bersihkan pencarian"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="history-filters-group">
          {/* Verdict Filter Pills */}
          <div className="history-filter-pill-group" role="group" aria-label="Filter status verdict">
            <button
              type="button"
              className={`filter-pill-btn ${verdictFilter === "all" ? "active" : ""}`}
              onClick={() => setVerdictFilter("all")}
            >
              Semua ({totalFilteredCount})
            </button>
            <button
              type="button"
              className={`filter-pill-btn ok ${verdictFilter === "ok" ? "active" : ""}`}
              onClick={() => setVerdictFilter("ok")}
            >
              ✓ OK ({okFilteredCount})
            </button>
            <button
              type="button"
              className={`filter-pill-btn nok ${verdictFilter === "nok" ? "active" : ""}`}
              onClick={() => setVerdictFilter("nok")}
            >
              ✗ NOK ({nokFilteredCount})
            </button>
          </div>

          {/* Date Filter Picker */}
          <div className="history-date-picker-wrap">
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
        <div className="history-entries-container">
          {groupedPageEntries.map((group) => {
            const stats = dateStatsMap.get(group.date);
            return (
              <div key={group.date} className="history-date-group">
                <div className="history-date-header">
                  <div className="history-date-header-inner">
                    <span className="history-date-title">{group.header}</span>
                    <div className="history-date-summary">
                      <span className="badge-stat ok">✓ {stats?.ok ?? 0} OK</span>
                      <span className="badge-stat nok">✗ {stats?.nok ?? 0} NOK</span>
                      <span className="badge-stat total">{stats?.total ?? 0} total</span>
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
                        className={`assessment-history-row-enhanced ${isOk ? "row-verdict-ok" : "row-verdict-nok"}`}
                      >
                        {/* Time */}
                        <span className="history-time-cell">
                          <strong>{entry.time}</strong>
                          <small>{entry.date.slice(5)}</small>
                        </span>

                        {/* Project & Task */}
                        <div className="history-project-cell">
                          <ProjectMark name={entry.project} />
                          <div className="history-project-text">
                            <strong>{entry.project}</strong>
                            <span className="history-task-name">{entry.task}</span>
                          </div>
                        </div>

                        {/* Verdict Badge */}
                        <div className="history-verdict-cell">
                          <span className={`assessment-verdict-badge ${isOk ? "verdict-ok" : "verdict-nok"}`}>
                            {isOk ? "✓ OK" : "✗ NOK"}
                          </span>
                        </div>

                        {/* Note & Checker */}
                        <div className="history-note-cell">
                          <span className="history-note-text" title={entry.note}>
                            {entry.note || "Tanpa catatan tambahan."}
                          </span>
                          <div className="history-checker-info">
                            <span className="history-checker-name">
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
          <div className="roster-pagination-bar ticket-pagination-bar">
            <div className="roster-pagination-left">
              <div className="roster-rows-per-page">
                <span className="roster-pagination-label">Rows per page:</span>
                <select
                  className="roster-filter-select roster-page-size-select"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  aria-label="Jumlah entri riwayat per halaman"
                >
                  <option value="10">10</option>
                  <option value="30">30</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>

              <span className="roster-pagination-info">
                Menampilkan <strong>{totalCount === 0 ? 0 : startIdx + 1}–{endIdx}</strong> dari{" "}
                <strong>{totalCount}</strong> entri
              </span>
            </div>

            <div className="roster-pagination-actions">
              <button
                type="button"
                className="roster-page-btn roster-page-nav"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
                aria-label="Halaman sebelumnya"
              >
                Prev
              </button>

              <div className="roster-page-numbers">
                {pageNumbers.map((p, idx) =>
                  p === "..." ? (
                    <span key={`ellipsis-${idx}`} className="roster-page-ellipsis">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      className={`roster-page-btn roster-page-num ${p === safeCurrentPage ? "active" : ""}`}
                      onClick={() => setCurrentPage(Number(p))}
                      aria-label={`Halaman ${p}`}
                      aria-current={p === safeCurrentPage ? "page" : undefined}
                    >
                      {p}
                    </button>
                  ),
                )}
              </div>

              <button
                type="button"
                className="roster-page-btn roster-page-nav"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages || totalPages <= 1}
                aria-label="Halaman berikutnya"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: "32px 16px" }}>
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
