"use client";

import { useMemo, useState, useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Search, Download, Filter, Calendar, CheckCircle2, AlertTriangle, User, FileText, X } from "lucide-react";
import { ProjectMark } from "@/app/components/ui/ProjectMark";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { useToast } from "@/app/components/ui/Toast";
import { getOwnerRole, seedHistoricalAssessments } from "@/app/lib/data";
import type { CheckpointAssessment, HistoricalAssessmentEntry, MonitoringEntry } from "@/app/lib/types";

interface MonitoringHistorySectionProps {
  todayEntries: MonitoringEntry[];
  todayAssessments: Record<string, CheckpointAssessment>;
}

type VerdictFilter = "all" | "ok" | "nok";
type DateFilter = "all" | "today" | "yesterday" | "this_week";

function formatDateHeader(dateStr: string) {
  const today = "2026-08-31";
  const yesterday = "2026-08-30";
  if (dateStr === today) return "Hari Ini · 31 Agustus 2026 (Shift Malam)";
  if (dateStr === yesterday) return "Kemarin · 30 Agustus 2026 (Shift Pagi & Malam)";
  
  // Format DD/MM/YYYY
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function MonitoringHistorySection({ todayEntries, todayAssessments }: MonitoringHistorySectionProps) {
  const notify = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

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
    const filteredSeed = seedHistoricalAssessments.filter(
      (seed) => !liveTodayRecords.some((live) => live.time === seed.time && live.project === seed.project && live.date === seed.date)
    );

    const merged = [...liveTodayRecords, ...filteredSeed];

    // Sort by date DESC, then time DESC
    return merged.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.time.localeCompare(a.time);
    });
  }, [todayEntries, todayAssessments]);

  // Apply Search and Filters
  const filteredHistory = useMemo(() => {
    return allHistory.filter((entry) => {
      // Verdict filter
      if (verdictFilter === "ok" && entry.verdict !== "ok") return false;
      if (verdictFilter === "nok" && entry.verdict !== "nok") return false;

      // Date filter
      if (dateFilter === "today" && entry.date !== "2026-08-31") return false;
      if (dateFilter === "yesterday" && entry.date !== "2026-08-30") return false;
      if (dateFilter === "this_week" && (entry.date < "2026-08-25" || entry.date > "2026-08-31")) return false;

      // Search text filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const haystack = `${entry.project} ${entry.task} ${entry.owner} ${entry.note} ${entry.time} ${entry.verdict}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [allHistory, verdictFilter, dateFilter, searchQuery]);

  // Group filtered history by date
  const groupedByDate = useMemo(() => {
    const map = new Map<string, HistoricalAssessmentEntry[]>();
    filteredHistory.forEach((item) => {
      const list = map.get(item.date) || [];
      list.push(item);
      map.set(item.date, list);
    });
    return Array.from(map.entries()).map(([date, items]) => ({
      date,
      header: formatDateHeader(date),
      items,
      okCount: items.filter((i) => i.verdict === "ok").length,
      nokCount: items.filter((i) => i.verdict === "nok").length,
    }));
  }, [filteredHistory]);

  // Flatten items for virtual scrolling if list grows large
  const flatItems = useMemo(() => {
    type FlatItem =
      | { type: "header"; date: string; header: string; count: number; okCount: number; nokCount: number }
      | { type: "row"; entry: HistoricalAssessmentEntry };

    const result: FlatItem[] = [];
    groupedByDate.forEach((group) => {
      result.push({
        type: "header",
        date: group.date,
        header: group.header,
        count: group.items.length,
        okCount: group.okCount,
        nokCount: group.nokCount,
      });
      group.items.forEach((entry) => {
        result.push({ type: "row", entry });
      });
    });
    return result;
  }, [groupedByDate]);

  // Export to CSV Function (Requirement 5e)
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

  // Virtualizer setup for smooth scrolling
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => (flatItems[index].type === "header" ? 44 : 64),
    overscan: 6,
  });

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
          {/* Verdict Filter */}
          <div className="history-filter-pill-group" role="group" aria-label="Filter status verdict">
            <button
              type="button"
              className={`filter-pill-btn ${verdictFilter === "all" ? "active" : ""}`}
              onClick={() => setVerdictFilter("all")}
            >
              Semua ({allHistory.length})
            </button>
            <button
              type="button"
              className={`filter-pill-btn ok ${verdictFilter === "ok" ? "active" : ""}`}
              onClick={() => setVerdictFilter("ok")}
            >
              ✓ OK ({allHistory.filter((i) => i.verdict === "ok").length})
            </button>
            <button
              type="button"
              className={`filter-pill-btn nok ${verdictFilter === "nok" ? "active" : ""}`}
              onClick={() => setVerdictFilter("nok")}
            >
              ✗ NOK ({allHistory.filter((i) => i.verdict === "nok").length})
            </button>
          </div>

          {/* Date Filter Dropdown */}
          <div className="history-date-select-wrap">
            <Calendar size={13} className="history-date-icon" />
            <select
              className="history-date-select"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              aria-label="Filter rentang tanggal"
            >
              <option value="all">Semua Tanggal</option>
              <option value="today">Hari Ini (31 Aug)</option>
              <option value="yesterday">Kemarin (30 Aug)</option>
              <option value="this_week">Minggu Ini</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Grouped & Virtualized History List */}
      {flatItems.length > 0 ? (
        <div
          ref={parentRef}
          className="history-scroll-container"
          style={{
            maxHeight: "520px",
            overflowY: "auto",
            position: "relative",
          }}
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const item = flatItems[virtualRow.index];

              if (item.type === "header") {
                return (
                  <div
                    key={`header-${item.date}`}
                    className="history-date-header"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualRow.start}px)`,
                      height: `${virtualRow.size}px`,
                    }}
                  >
                    <div className="history-date-header-inner">
                      <span className="history-date-title">{item.header}</span>
                      <div className="history-date-summary">
                        <span className="badge-stat ok">✓ {item.okCount} OK</span>
                        <span className="badge-stat nok">✗ {item.nokCount} NOK</span>
                        <span className="badge-stat total">{item.count} total</span>
                      </div>
                    </div>
                  </div>
                );
              }

              const { entry } = item;
              const isOk = entry.verdict === "ok";
              const ownerRole = getOwnerRole(entry.owner);

              return (
                <div
                  key={entry.id}
                  className={`assessment-history-row-enhanced ${isOk ? "row-verdict-ok" : "row-verdict-nok"}`}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                    height: `${virtualRow.size}px`,
                  }}
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
      ) : (
        <div style={{ padding: "32px 16px" }}>
          <EmptyState
            icon="◷"
            title="Tidak ada riwayat asesmen yang cocok"
            message={
              searchQuery || verdictFilter !== "all" || dateFilter !== "all"
                ? "Coba sesuaikan kata kunci pencarian atau reset filter di atas."
                : "Tandai checkpoint pada jadwal di atas sebagai OK atau NOK untuk mulai merekam riwayat."
            }
          />
        </div>
      )}
    </article>
  );
}
