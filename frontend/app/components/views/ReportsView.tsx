"use client";
import { MasterProjectName } from "@/app/components/ui/MasterProjectName";

import { useMasterReferences } from "@/app/hooks/useMasterReferences";
import { Select } from "@/app/components/ui/Select";
import { paths } from "@/app/lib/routes";
import Link from "next/link";

import { useUrlQuery, useUrlSearch } from "@/app/hooks/useUrlQuery";
import { reportsSchema } from "@/app/lib/query-state";
import { routes, reportPaths } from "@/app/lib/routes";

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowDownToLine, ArrowLeft, ArrowRight, CheckCircle2, ClipboardList, ExternalLink, FileCheck2, FileText, FolderKanban, LoaderCircle, RefreshCw, Search, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import { DatePicker } from "@/app/components/ui/DatePicker";
import { StatCard } from "@/app/components/ui/StatCard";
import { useToast } from "@/app/components/ui/Toast";
import { useClient } from "@/app/context/ClientContext";
import { getClientHistoricalAssessments, getClientMonitoringSchedule, getClientProjects } from "@/app/lib/clientData";
import { useAuth } from "@/app/lib/auth";
import { reportDurationColumns, REPORT_DURATION_NOTE, addDays, buildWeeklyReport, downloadReportBlob, formatDuration, formatReportDate, formatReportDateRange, jakartaDate, latestDataDate, mergeReportMonitoring, numericDate, periodError, reportCsv, reportFilename, ticketCategory, ticketClosedDate, ticketDate, type ReportIdentity, type ReportLogKind, type ReportPeriod } from "@/app/lib/weekly-report";
import type { CheckpointAssessment, Ticket } from "@/app/lib/types";
import { ReportCategoryList as CategoryList, ReportDailyChart as DailyChart, ReportDataTable as DataTable, ReportDurationList as DurationList, ReportEmptyState as EmptyReport, ReportPanel as Panel, ReportProjectChart as ProjectChart } from "@/app/components/reports/ReportContent";
import { ReportCsvExport } from "@/app/components/reports/ReportCsvExport";
import { ReportSignatoryFields } from "@/app/components/reports/ReportSignatoryFields";
import { reportButtonClass, reportInputClass, reportPrimaryButtonClass } from "@/app/components/reports/report-styles";
import { useResource } from "@/app/hooks/useResource";
import { reportsService } from "@/app/services/reports";
import { PanelSkeletonWrapper, ReportsSkeleton } from "@/app/components/ui/skeleton";
import { ticketCode } from "@/app/lib/ticket-code";

const ReportPdfPreview = lazy(() =>
  import("@/app/components/reports/ReportPdfPreview").then((module) => ({ default: module.ReportPdfPreview }))
);

interface ReportsViewProps {
  tickets: Ticket[];
  assessments: Record<string, CheckpointAssessment>;
  handoverCount: number;
}

type ReportTab = "summary" | "tickets" | "monitoring" | "preview";

const LOG_PAGE_SIZE = 10;

const pagerButtonClass =
  "inline-flex h-8 w-8 max-sm:h-10 max-sm:w-10 items-center justify-center rounded-[7px] border border-[#334155] bg-[#1e293b] text-[#94a3b8] transition-colors hover:bg-[#243044] hover:text-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer";

function ticketStatusClass(status = "") {
  const value = status.toLowerCase();
  if (value.includes("close")) return "bg-[#4ade80]/15 text-[#4ade80] border-[#4ade80]/25";
  if (value.includes("escalat")) return "bg-[#f87171]/15 text-[#f87171] border-[#f87171]/25";
  return "bg-[#fbbf24]/15 text-[#fbbf24] border-[#fbbf24]/25";
}

function verdictClass(verdict: string) {
  if (verdict === "ok") return "bg-[#4ade80]/15 text-[#4ade80] border-[#4ade80]/25";
  if (verdict === "nok") return "bg-[#f87171]/15 text-[#f87171] border-[#f87171]/25";
  return "bg-[#334155]/60 text-[#94a3b8] border-[#475569]/60";
}

function verdictLabel(verdict: string) {
  return verdict === "unknown" ? "Belum dinilai" : verdict.toUpperCase();
}

export function ReportsView({ tickets, assessments }: ReportsViewProps) {
  const { activeClient, activeClientId, projects: masterProjects } = useClient();
  const { user } = useAuth();
  const { projectLabel } = useMasterReferences();
  const notify = useToast();

  const historical = useMemo(() => getClientHistoricalAssessments(activeClientId), [activeClientId]);
  const latest = useMemo(
    () => latestDataDate(tickets, historical.filter((entry) => (entry.clientId || "tritronik") === activeClientId)),
    [tickets, historical, activeClientId]
  );

  const {
    isLoading,
    isStale,
    error,
    refetch,
  } = useResource(
    `reports-view-${activeClientId}-${latest}`,
    (signal) => reportsService.getWeeklyReport(addDays(latest, -6), latest, activeClientId, signal),
    {
      deps: [activeClientId, latest, masterProjects],
    }
  );

  const monitoring = useMemo(
    () => mergeReportMonitoring(historical, getClientMonitoringSchedule(activeClientId), assessments, activeClientId, "2026-08-31"),
    [historical, assessments, activeClientId]
  );

  const configuredProjects = useMemo(() => {
    const list = masterProjects.filter((p) => p.clientId === activeClientId && p.status === "active").map((p) => p.name);
    if (list.length > 0) return list;
    return getClientProjects(activeClientId).map((entry) => entry.name);
  }, [activeClientId, masterProjects]);

  const schema = useMemo(
    () =>
      reportsSchema(
        addDays(latest, -6),
        latest,
        [...new Set([...configuredProjects, ...tickets.map((t) => t.project), ...monitoring.map((m) => m.project)])],
      ),
    [latest, configuredProjects, tickets, monitoring]
  );
  const url = useUrlQuery(schema, paths.reports);
  const periodStart = url.values.range === "empty" ? "" : url.values.from;
  const periodEnd = url.values.range === "empty" ? "" : url.values.to;
  const period: ReportPeriod = { start: periodStart, end: periodEnd };
  const project = url.values.project;
  const tab: ReportTab = (Object.keys(reportPaths) as ReportTab[]).find((key) => reportPaths[key] === url.pathname) ?? "summary";
  const [showSettings, setShowSettings] = useState(false);
  const [author, setAuthor] = useState<string | null>(null);
  const [approver, setApprover] = useState("");
  const [authorRole, setAuthorRole] = useState("Jr. Engineer");
  const [approverRole, setApproverRole] = useState("IT Services Lead");
  const [preparedDate, setPreparedDate] = useState<string>();
  const [approvedDate, setApprovedDate] = useState<string>();
  const [preparedSignature, setPreparedSignature] = useState<string | null>(null);
  const [approvedSignature, setApprovedSignature] = useState<string | null>(null);
  const [signatureLoading, setSignatureLoading] = useState({ prepared: false, approved: false });
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const signatureBusy = signatureLoading.prepared || signatureLoading.approved;
  const creationDate = jakartaDate();

  const [preview, setPreview] = useState<{ url: string; key: string } | null>(null);
  const [previewError, setPreviewError] = useState("");
  const logPage = url.values.page;
  const setLogPage = url.field("page", "push");
  const logSearch = useUrlSearch(url.values.q, url.field("q"));
  const logQuery = logSearch.effective;
  const setLogQuery = logSearch.set;

  const validation = periodError(period);
  const report = useMemo(
    () => buildWeeklyReport(tickets, monitoring, { start: periodStart, end: periodEnd }, activeClientId, project, configuredProjects),
    [tickets, monitoring, periodStart, periodEnd, activeClientId, project, configuredProjects]
  );

  const identity: ReportIdentity = {
    clientId: activeClientId,
    clientName: activeClientId === "tritronik" ? "Tritronik" : activeClient.name,
    clientCode: activeClient.code,
    author: author ?? user?.name ?? "",
    authorRole,
    approver,
    approverRole,
    date: creationDate,
    prepared_by: { name: author ?? user?.name ?? "", title: authorRole, signature_image_path: preparedSignature, date: preparedDate },
    approved_by: { name: approver, title: approverRole, signature_image_path: approvedSignature, date: approvedDate },
  };

  const sourceKey = JSON.stringify({ report, identity });
  const projectOptions = useMemo(
    () => [...new Set([...configuredProjects, ...tickets.map((t) => t.project), ...monitoring.map((m) => m.project)])].sort(),
    [tickets, monitoring, configuredProjects]
  );

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  function setPeriod(next: ReportPeriod) {
    url.update({ from: next.start || schema.from.default, to: next.end || schema.to.default, range: !next.start && !next.end ? "empty" : "period", page: 1 });
  }

  const datePickerValue = !periodStart && !periodEnd ? "" : periodStart === periodEnd ? periodStart : `${periodStart}..${periodEnd}`;

  function handleDateRangeChange(nextValue: string) {
    if (!nextValue) {
      setPeriod({ start: "", end: "" });
      return;
    }
    if (nextValue.includes("..")) {
      const [start, end] = nextValue.split("..");
      setPeriod({ start: start || "", end: end || start || "" });
    } else {
      setPeriod({ start: nextValue, end: nextValue });
    }
  }

  async function generatePdf(download: boolean) {
    if (busyRef.current || signatureBusy || validation) return;
    busyRef.current = true;
    setBusy(true);
    setPreviewError("");
    try {
      const { createWeeklyReportPdf } = await import("@/app/lib/weekly-report-pdf");
      const bytes = await createWeeklyReportPdf(report, identity);
      const blob = new Blob([new Uint8Array(bytes).buffer], { type: "application/pdf" });
      setPreview({ url: URL.createObjectURL(blob), key: sourceKey });
      if (download) {
        downloadReportBlob(blob, reportFilename(report, activeClient.code));
        notify.success("Laporan mingguan berhasil diekspor sebagai PDF.", { id: "weekly-report-pdf" });
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "PDF belum berhasil dibuat. Silakan coba kembali.";
      setPreviewError(message);
      notify.critical(message, { id: "weekly-report-error" });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function exportCsv(kind: ReportLogKind) {
    if (validation || busyRef.current) return;
    try {
      const filename = reportFilename(report, activeClient.code, "csv").replace(
        /\.csv$/,
        ` - ${kind === "tickets" ? "Ticket Log" : "Monitoring Log"}.csv`
      );
      downloadReportBlob(new Blob([reportCsv(report, kind)], { type: "text/csv;charset=utf-8" }), filename);
      notify.success(`${kind === "tickets" ? "Ticket" : "Monitoring"} log sesuai filter berhasil diekspor sebagai CSV.`, {
        id: "weekly-report-csv",
      });
    } catch {
      notify.critical("CSV belum berhasil diunduh. Silakan coba kembali.");
    }
  }

  const closedPct = report.total ? Math.round((report.closed / report.total) * 100) : 0;
  const nokCount = report.monitoring.length ? report.monitoring.length - report.monitoringOk : 0;
  const periodLabel = period.start && period.end ? formatReportDateRange(period.start, period.end) : "Periode belum dipilih";
  const scopeLabel = project === "all" ? "Semua proyek" : projectLabel(project, activeClientId, true);

  const tabs: { id: ReportTab; label: string; short: string; count?: number }[] = [
    { id: "summary", label: "Ringkasan", short: "Ringkasan" },
    { id: "tickets", label: "Ticket log", short: "Tiket", count: report.total },
    { id: "monitoring", label: "Monitoring log", short: "Monitoring", count: report.monitoring.length },
    { id: "preview", label: "Pratinjau PDF", short: "PDF" },
  ];

  const filteredTickets = report.tickets.filter((ticket) =>
    `${ticket.id} ${ticketCode(ticket)} ${ticket.subject} ${ticket.project} ${ticket.owner} ${ticket.status}`
      .toLowerCase()
      .includes(logQuery.toLowerCase())
  );
  const filteredMonitoring = report.monitoring.filter((entry) =>
    `${entry.project} ${entry.owner} ${entry.task} ${entry.note} ${entry.verdict}`
      .toLowerCase()
      .includes(logQuery.toLowerCase())
  );
  const logTotal = tab === "monitoring" ? filteredMonitoring.length : filteredTickets.length;
  const logPages = Math.max(1, Math.ceil(logTotal / LOG_PAGE_SIZE));
  const safePage = Math.min(logPage, logPages);
  const offset = (safePage - 1) * LOG_PAGE_SIZE;
  const pageTickets = filteredTickets.slice(offset, offset + LOG_PAGE_SIZE);
  const pageMonitoring = filteredMonitoring.slice(offset, offset + LOG_PAGE_SIZE);

  const isCustomSettings =
    author !== null ||
    approver !== "" ||
    authorRole !== "Jr. Engineer" ||
    approverRole !== "IT Services Lead" ||
    Boolean(preparedDate || approvedDate || preparedSignature || approvedSignature);

  // The combined ClickUp column only carries data when every project has a count; hide it on screen when it is empty.
  const hasCombinedCounts = report.projects.some((row) => row.clickupCount !== null);
  const durationHeaders = reportDurationColumns(identity.clientName).slice(0, hasCombinedCounts ? 5 : 4);
  const muted = <span className="text-[#64748b]">—</span>;
  const projectDot = (name: string) => (
    <span key={name} className="inline-flex items-center gap-2">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: report.config.project_colors[name] ?? "#38bdf8" }} />
      <span><MasterProjectName value={name} historical /></span>
    </span>
  );

  return (
    <div className="min-w-0 space-y-5 pb-12 sm:space-y-6">
      {/* ── 1. Page header ── */}
      <section className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[1px] text-[#94a3b8]">
            <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-[#4ade80]" />
            <span>REPORTS · {activeClient.code}</span>
          </div>
          <h1 className="mt-1.5 text-[24px] sm:text-[28px] font-bold tracking-[-0.4px] text-[#f8fafc] leading-[1.2]">Reports</h1>
          <p className="mt-1 text-[12.5px] text-[#94a3b8] max-sm:hidden">
            Laporan serah terima kerja mingguan · <span className="text-[#cbd5e1]">{periodLabel}</span>
 · {scopeLabel}
          </p>
        </div>

        <div className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-2 sm:flex sm:w-auto sm:items-center">
          <ReportCsvExport disabled={busy || Boolean(validation)} onExport={exportCsv} />

          <button
            type="button"
            className={`${reportPrimaryButtonClass} max-sm:h-11`}
            onClick={() => void generatePdf(true)}
            disabled={busy || signatureBusy || Boolean(validation)}
          >
            {busy ? <LoaderCircle size={14} className="animate-spin" /> : <ArrowDownToLine size={14} />}
            <span>{busy ? "Menyiapkan…" : "Ekspor PDF"}</span>
          </button>
        </div>
      </section>

      <PanelSkeletonWrapper
        isLoading={isLoading}
        isStale={isStale}
        error={error}
        onRetry={refetch}
        minHeight={620}
        skeleton={<ReportsSkeleton />}
        liveRegionText="Memuat analitik laporan..."
        className="gap-5 sm:gap-6"
      >
        {/* ── 2. KPI cards ── */}
        <section
          className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4 [&_.sc]:h-full [&_.sc-footer]:mt-auto max-sm:gap-2 max-sm:[&_.sc]:p-3 max-sm:[&_.sc]:gap-1.5 max-sm:[&_.sc-subtitle]:hidden max-sm:[&_.sc-value]:text-[26px] max-sm:[&_.sc-icon]:size-6 max-sm:[&_.sc-label]:text-[9px] max-sm:[&_.sc-label]:tracking-[0.5px]"
          aria-label="Ringkasan statistik laporan"
        >
          <StatCard
            label="TIKET TERCATAT"
            value={report.total}
            accentColor="blue"
            icon={<ClipboardList size={15} />}
            subtitle={report.total ? `${report.projects.length} proyek aktif tercatat` : "Belum ada tiket"}
            badgeText={`${report.projects.length} Proyek`}
            badgeTone="blue"
          />
          <StatCard
            label="TIKET SELESAI"
            value={report.closed}
            accentColor="green"
            icon={<FileCheck2 size={15} />}
            subtitle={report.total ? `${closedPct}% tiket telah ditutup` : "Menunggu aktivitas"}
            progress={{
              value: closedPct,
              segments: [
                { label: "Closed", percentage: closedPct, color: "#4ade80" },
                { label: "Open", percentage: 100 - closedPct, color: "#f87171" },
              ],
            }}
            badgeText={`${closedPct}% Done`}
            badgeTone="green"
          />
          <StatCard
            label="SLA RESPONS < 30M"
            value={report.slaPercent === null ? "—" : `${report.slaPercent}%`}
            accentColor="purple"
            icon={<ShieldCheck size={15} />}
            subtitle={report.responseCount ? `${report.responseCount} tiket terukur respons` : "Belum ada respons"}
            badgeText={report.slaPercent !== null ? `${report.slaPercent}% SLA` : "No Data"}
            badgeTone="purple"
          />
          <StatCard
            label="CHECKPOINT"
            value={report.monitoring.length ? `${report.monitoringOk}/${report.monitoring.length}` : "—"}
            accentColor={nokCount > 0 ? "rose" : "green"}
            icon={<CheckCircle2 size={15} />}
            subtitle={
              report.monitoring.length ? (nokCount > 0 ? `${nokCount} anomali NOK terdeteksi` : "100% checkpoint normal") : "Belum ada monitoring"
            }
            badgeText={report.monitoring.length ? (nokCount > 0 ? `${nokCount} NOK` : "All OK") : "No Data"}
            badgeTone={nokCount > 0 ? "rose" : "green"}
          />
        </section>

        {/* ── 3. Toolbar: tabs + shared filters ── */}
        <section className="relative z-30 flex flex-col gap-2 rounded-[12px] border border-[#334155] bg-[#1e293b] p-2 shadow-[0_4px_16px_rgba(0,0,0,0.2)] xl:flex-row xl:items-center xl:justify-between">
          <div
            className="grid grid-cols-4 gap-1 rounded-[9px] border border-[#334155]/70 bg-[#0f172a] p-1 xl:inline-grid xl:w-auto xl:grid-cols-[repeat(4,auto)]"
            role="tablist"
            aria-label="Bagian laporan"
          >
            {tabs.map((item) => {
              const active = tab === item.id;
              return (
                <Link
                  key={item.id}
                  id={`report-tab-${item.id}`}
                  role="tab"
                  aria-selected={active}
                  aria-controls={`report-panel-${item.id}`}
                  className={`inline-flex min-w-0 items-center justify-center gap-1.5 rounded-[6px] px-2 text-[11.5px] font-semibold whitespace-nowrap transition-colors h-9 max-sm:h-10 sm:px-3.5 sm:text-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8] ${
                    active ? "bg-[#1e293b] text-[#38bdf8] ring-1 ring-[#38bdf8]/30" : "text-[#94a3b8] hover:bg-[#1e293b] hover:text-[#f8fafc]"
                  }`}
                  href={routes.reports.tab(item.id, url.query)}
                  scroll={false}
                  tabIndex={active ? 0 : -1}
                >
                  <span className="truncate sm:hidden">{item.short}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                  {item.count !== undefined && (
                    <span
                      className={`hidden min-w-5 justify-center rounded-[5px] border px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none sm:inline-flex ${
                        active ? "border-[#38bdf8]/25 bg-[#38bdf8]/15 text-[#38bdf8]" : "border-[#334155]/60 bg-[#1e293b] text-[#94a3b8]"
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex sm:items-center xl:justify-end">
            <div className="col-span-2 min-w-0 sm:w-[230px]">
              <label htmlFor="filter-report-period" className="sr-only">Rentang tanggal</label>
              <DatePicker
                id="filter-report-period"
                value={datePickerValue}
                onChange={handleDateRangeChange}
                placeholder="Pilih rentang tanggal…"
                showAllTimePreset={false}
                referenceDate={latest}
                disabled={busy}
                aria-label="Filter rentang tanggal laporan"
                className="w-full"
              />
            </div>
            <div className="min-w-0 sm:w-[210px]">
              <label htmlFor="filter-project" className="sr-only">Proyek</label>
              <Select
                icon={<FolderKanban size={16} />}
                id="filter-project"
                aria-label="Filter proyek laporan"
                value={project}
                disabled={busy}
                onChange={(event) => url.update({ project: event.target.value, page: 1 })}
                className="w-full"
              >
                <option value="all">Semua proyek ({projectOptions.length})</option>
                {projectOptions.map((name) => (
                  <option key={name} value={name}>
                    {projectLabel(name, activeClientId, true)}
                  </option>
                ))}
              </Select>
            </div>
            <button
              type="button"
              className={`relative inline-flex h-[34px] shrink-0 items-center justify-center gap-1.5 rounded-[8px] border px-3 text-[11.5px] font-semibold whitespace-nowrap transition-colors cursor-pointer max-md:h-11 max-sm:w-11 max-sm:px-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#38bdf8] ${
                showSettings
                  ? "border-[#38bdf8] bg-[#0c2a3d] text-[#38bdf8]"
                  : "border-[#334155] bg-[#0f172a] text-[#cbd5e1] hover:border-[#64748b] hover:text-[#f8fafc]"
              }`}
              onClick={() => setShowSettings((prev) => !prev)}
              aria-expanded={showSettings}
              aria-controls="report-document-settings"
              aria-label="Pengaturan dokumen dan penandatangan"
              title="Pengaturan dokumen dan penandatangan"
            >
              <SlidersHorizontal size={14} className={showSettings ? "text-[#38bdf8]" : "text-[#94a3b8]"} />
              <span className="max-sm:hidden">Penandatangan</span>
              {isCustomSettings && (
                <span className="h-1.5 w-1.5 rounded-full bg-[#38bdf8] max-sm:absolute max-sm:right-2 max-sm:top-2" title="Pengaturan dokumen khusus aktif" />
              )}
            </button>
          </div>
        </section>

        {validation && (
          <div role="alert" className="flex items-center gap-2 rounded-[10px] border border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.12)] px-4 py-2.5 text-xs text-[#f87171]">
            <AlertCircle size={14} className="shrink-0" />
            <span>{validation}</span>
          </div>
        )}

        {showSettings && (
          <section id="report-document-settings" className="rounded-[12px] border border-[#334155] bg-[#1e293b] shadow-[0_4px_16px_rgba(0,0,0,0.2)]">
            <header className="flex items-start justify-between gap-3 border-b border-[#334155] bg-[rgba(15,23,42,0.45)] px-4 py-3 sm:px-5 rounded-t-[12px]">
              <div className="min-w-0">
                <h2 className="text-[14px] font-semibold text-[#f8fafc]">Penandatangan laporan</h2>
                <p className="mt-0.5 text-[11.5px] text-[#94a3b8]">Dicetak pada lembar pengesahan di halaman terakhir PDF.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] border border-[#334155] text-[#94a3b8] transition-colors hover:bg-[#243044] hover:text-[#f8fafc] max-sm:h-10 max-sm:w-10 cursor-pointer"
                aria-label="Tutup pengaturan penandatangan"
              >
                <X size={15} />
              </button>
            </header>
            <div className="grid gap-3.5 p-4 sm:p-5 lg:grid-cols-2">
              <ReportSignatoryFields
                kind="prepared"
                value={identity.prepared_by!}
                creationDate={creationDate}
                disabled={busy}
                onChange={(next) => {
                  setAuthor(next.name);
                  setAuthorRole(next.title);
                  setPreparedDate(next.date);
                  setPreparedSignature(next.signature_image_path);
                }}
                onLoadingChange={(loading) => setSignatureLoading((previous) => ({ ...previous, prepared: loading }))}
              />
              <ReportSignatoryFields
                kind="approved"
                value={identity.approved_by!}
                creationDate={creationDate}
                disabled={busy}
                onChange={(next) => {
                  setApprover(next.name);
                  setApproverRole(next.title);
                  setApprovedDate(next.date);
                  setApprovedSignature(next.signature_image_path);
                }}
                onLoadingChange={(loading) => setSignatureLoading((previous) => ({ ...previous, approved: loading }))}
              />
            </div>
            <p className="border-t border-[#334155]/60 px-4 py-3 text-[11px] leading-relaxed text-[#94a3b8] sm:px-5">
              Tanggal tanda tangan bawaan <strong className="font-semibold text-[#f8fafc]">{formatReportDate(creationDate)}</strong> dan dapat diubah per penandatangan. Nama yang dikosongkan tampil sebagai garis kosong pada PDF.
            </p>
          </section>
        )}

        {/* ── 4. Tab panels ── */}
        <div id={`report-panel-${tab}`} role="tabpanel" aria-labelledby={`report-tab-${tab}`} className="space-y-5 sm:space-y-6">
          {tab === "summary" && (
            <>
              <Panel title="Durasi pemrosesan & SLA" note={`${report.projects.length} proyek`}>
                <div className="sm:hidden">
                  <DurationList report={report} showCombined={hasCombinedCounts} />
                </div>
                <div className="hidden sm:block">
                  <DataTable
                    headers={durationHeaders}
                    total
                    alignments={["left", "right", "right", "right", "right"]}
                    stickyFirstCol
                    minWidth="min-w-[560px]"
                    rows={[
                      ...report.projects.map((row) => [
                        projectDot(row.project),
                        formatDuration(row.averageMinutes),
                        row.slaPercent === null ? muted : `${row.slaPercent}%`,
                        row.total,
                        ...(hasCombinedCounts ? [row.clickupCount ?? muted] : []),
                      ]),
                      [
                        "Grand Total",
                        formatDuration(report.averageMinutes),
                        report.slaPercent === null ? muted : `${report.slaPercent}%`,
                        report.total,
                        ...(hasCombinedCounts ? [report.clickupTotal ?? muted] : []),
                      ],
                    ]}
                  />
                </div>
                {report.config.show_footnotes && (
                  <p className="border-t border-[#334155]/60 px-4 py-3 text-[11px] leading-relaxed text-[#94a3b8] sm:px-5">{REPORT_DURATION_NOTE}</p>
                )}
              </Panel>

              <div className="grid items-stretch gap-5 sm:gap-6 xl:grid-cols-2">
                <Panel title="Tiket berdasarkan proyek" note={`${report.total} tiket`} className="h-full">
                  <ProjectChart report={report} />
                </Panel>
                <Panel title="Aktivitas tiket harian" note="Per proyek" className="h-full">
                  <DailyChart report={report} />
                </Panel>
              </div>

              <Panel title="Kategori tiket" note={`${report.categories.length} kategori`}>
                {report.categories.length ? (
                  <>
                    <div className="sm:hidden">
                      <CategoryList report={report} />
                    </div>
                    <div className="hidden sm:block">
                      <DataTable
                        headers={["Severity - Category", ...report.projects.map((row) => row.project), "Grand Total"]}
                        total
                        alignments={["left", ...report.projects.map(() => "center" as const), "right"]}
                        stickyFirstCol
                        minWidth="min-w-[720px]"
                        rows={[
                          ...report.categories.map((row) => [
                            <span key={row.category} className="block min-w-[200px] max-w-[280px] truncate" title={row.category}>
                              {row.category}
                            </span>,
                            ...row.counts.map((count, cIdx) => count || <span key={cIdx} className="text-[#475569]">—</span>),
                            row.total,
                          ]),
                          ["Grand Total", ...report.projects.map((row) => row.total || ""), report.total],
                        ]}
                      />
                    </div>
                  </>
                ) : (
                  <EmptyReport kind="categories" compact />
                )}
              </Panel>

              <Panel title="Ringkasan monitoring" note={`${report.monitoring.length} catatan`}>
                {report.monitoringCounts.length ? (
                  <DataTable
                    headers={["Project", "Count of Agent"]}
                    total
                    alignments={["left", "right"]}
                    stickyFirstCol
                    minWidth="min-w-0"
                    rows={[...report.monitoringCounts.map((row) => [projectDot(row.project), row.count]), ["Grand Total", report.monitoring.length]]}
                  />
                ) : (
                  <EmptyReport kind="monitoring" compact />
                )}
              </Panel>
            </>
          )}

          {(tab === "tickets" || tab === "monitoring") && (
            <Panel title={tab === "tickets" ? "Ticket log" : "Monitoring log"} note={`${logTotal} catatan`}>
              <div className="flex items-center gap-3 border-b border-[#334155] bg-[rgba(15,23,42,0.35)] p-3 sm:px-5">
                <div className="relative min-w-0 flex-1 sm:max-w-md">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                  <input
                    type="search"
                    aria-label="Cari catatan laporan"
                    className={`${reportInputClass} h-[36px] pl-9 max-md:h-11`}
                    placeholder={tab === "tickets" ? "Cari ID, subjek, proyek, agen…" : "Cari proyek, agen, aktivitas…"}
                    value={logSearch.input}
                    onChange={(event) => setLogQuery(event.target.value)}
                  />
                </div>
                <span className="ml-auto hidden whitespace-nowrap font-mono text-[11.5px] text-[#94a3b8] sm:inline">{logTotal} data ditemukan</span>
              </div>

              {!logTotal ? (
                <EmptyReport kind={tab === "monitoring" ? "monitoringLog" : "tickets"} />
              ) : (
                <>
                  {/* Phone: cards */}
                  <ul className="divide-y divide-[#334155]/60 sm:hidden">
                    {tab === "tickets"
                      ? pageTickets.map((ticket, index) => (
                          <li key={`${ticket.id}-${offset + index}`} className="px-4 py-3.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-[11.5px] font-bold text-[#38bdf8]">{ticketCode(ticket)}</span>
                              <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold ${ticketStatusClass(ticket.status)}`}>
                                {ticket.status}
                              </span>
                            </div>
                            <h3 className="mt-1.5 line-clamp-3 break-words text-[12.5px] font-semibold leading-snug text-[#f8fafc]">{ticket.subject}</h3>
                            <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                              <div className="min-w-0">
                                <dt className="text-[10px] uppercase tracking-[0.4px] text-[#64748b]">Proyek</dt>
                                <dd className="truncate font-semibold text-[#cbd5e1]"><MasterProjectName value={ticket.project} historical /></dd>
                              </div>
                              <div className="min-w-0">
                                <dt className="text-[10px] uppercase tracking-[0.4px] text-[#64748b]">Dibuat</dt>
                                <dd className="font-mono text-[#cbd5e1]">{numericDate(ticketDate(ticket))} {ticket.created}</dd>
                              </div>
                              <div className="min-w-0">
                                <dt className="text-[10px] uppercase tracking-[0.4px] text-[#64748b]">Agen</dt>
                                <dd className="truncate text-[#cbd5e1]">{ticket.owners?.join(", ") || ticket.owner}</dd>
                              </div>
                              <div className="min-w-0">
                                <dt className="text-[10px] uppercase tracking-[0.4px] text-[#64748b]">Kategori</dt>
                                <dd className="truncate text-[#cbd5e1]" title={ticketCategory(ticket)}>{ticketCategory(ticket)}</dd>
                              </div>
                            </dl>
                          </li>
                        ))
                      : pageMonitoring.map((entry) => (
                          <li key={entry.id} className="px-4 py-3.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="min-w-0 truncate text-[12.5px] font-bold text-[#f8fafc]"><MasterProjectName value={entry.project} historical /></span>
                              <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold ${verdictClass(entry.verdict)}`}>
                                {verdictLabel(entry.verdict)}
                              </span>
                            </div>
                            <p className="mt-1 font-mono text-[11px] text-[#94a3b8]">
                              {numericDate(entry.date)} · {entry.time} · <span className="font-sans">{entry.owner}</span>
                            </p>
                            <p className="mt-1.5 break-words text-[12px] leading-relaxed text-[#cbd5e1]">{entry.task}</p>
                            {(entry.resultText ?? entry.note) && (
                              <p className={`mt-2 rounded-[7px] border px-2.5 py-1.5 text-[11.5px] leading-relaxed ${entry.verdict === "nok" ? "border-[#f87171]/25 bg-[#f87171]/10 text-[#fecaca]" : "border-[#334155] bg-[#0f172a] text-[#94a3b8]"}`}>
                                {entry.resultText ?? entry.note}
                              </p>
                            )}
                          </li>
                        ))}
                  </ul>

                  {/* Tablet & desktop: table */}
                  <div className="hidden sm:block">
                    {tab === "tickets" ? (
                      <DataTable
                        headers={["Ticket / Created", "Subject / Deskripsi", "Project", "Date Closed", "Status", "Agent", "Category"]}
                        stickyFirstCol
                        minWidth="min-w-[980px]"
                        rows={pageTickets.map((ticket) => [
                          <div key="id" className="min-w-24">
                            <span className="font-mono text-xs font-bold text-[#38bdf8]">{ticketCode(ticket)}</span>
                            <p className="mt-0.5 font-mono text-[11px] text-[#94a3b8]">
                              {numericDate(ticketDate(ticket))}
                              <br />
                              {ticket.created}
                            </p>
                          </div>,
                          <div key="subject" className="min-w-56 max-w-md break-words font-sans" title={ticket.description || undefined}>
                            <strong className="line-clamp-2 text-[12.5px] font-semibold leading-5 text-[#f8fafc]">{ticket.subject}</strong>
                            {ticket.description && <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-[#94a3b8]">{ticket.description}</p>}
                          </div>,
                          <span key="project" className="whitespace-nowrap font-sans font-semibold text-[#f8fafc]"><MasterProjectName value={ticket.project} historical /></span>,
                          <span key="closed" className="whitespace-nowrap font-mono text-[11px] text-[#cbd5e1]">{ticketClosedDate(ticket)}</span>,
                          <span key="status" className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 font-mono text-[10.5px] font-bold ${ticketStatusClass(ticket.status)}`}>
                            {ticket.status}
                          </span>,
                          <span key="agent" className="block min-w-28 font-sans text-[12px] text-[#cbd5e1]">{ticket.owners?.join(", ") || ticket.owner}</span>,
                          <span key="category" className="block min-w-36 font-sans text-[12px] text-[#cbd5e1]">{ticketCategory(ticket)}</span>,
                        ])}
                      />
                    ) : (
                      <DataTable
                        headers={["Date / Check Point", "Project", "Agent Assigned", "List Activity Monitoring", "Result dan Noted", "New Update"]}
                        stickyFirstCol
                        minWidth="min-w-[900px]"
                        rows={pageMonitoring.map((entry) => [
                          <div key="date" className="min-w-20 font-mono text-[11px] text-[#94a3b8]">
                            <span className="font-semibold text-[#cbd5e1]">{numericDate(entry.date)}</span>
                            <br />
                            {entry.time}
                          </div>,
                          <span key="project" className="whitespace-nowrap font-sans font-semibold text-[#f8fafc]"><MasterProjectName value={entry.project} historical /></span>,
                          <span key="owner" className="font-sans text-[12px] text-[#cbd5e1]">{entry.owner}</span>,
                          <div key="task" className="max-w-xs break-words font-sans text-[12px] text-[#cbd5e1]">{entry.task}</div>,
                          <div key="result" className="max-w-md break-words font-sans">
                            {entry.resultText === undefined && (
                              <span className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[10.5px] font-bold ${verdictClass(entry.verdict)}`}>{verdictLabel(entry.verdict)}</span>
                            )}
                            <p className="mt-1 text-[11.5px] leading-relaxed text-[#94a3b8]">{entry.resultText ?? entry.note}</p>
                          </div>,
                          <span key="update" className="font-mono text-[11px] text-[#94a3b8]">{entry.newUpdate ?? "—"}</span>,
                        ])}
                      />
                    )}
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between gap-3 border-t border-[#334155] bg-[rgba(15,23,42,0.4)] px-4 py-3 sm:px-5">
                    <span className="text-[11.5px] text-[#94a3b8]">
                      <strong className="text-[#f8fafc]">{offset + 1}–{Math.min(offset + LOG_PAGE_SIZE, logTotal)}</strong> dari{" "}
                      <strong className="text-[#f8fafc]">{logTotal}</strong>
                      <span className="max-sm:hidden"> catatan · PDF memuat seluruh data</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button type="button" className={pagerButtonClass} aria-label="Halaman log sebelumnya" disabled={safePage === 1} onClick={() => setLogPage(safePage - 1)}>
                        <ArrowLeft size={14} />
                      </button>
                      <span className="min-w-12 px-1 text-center font-mono text-[11px] font-semibold text-[#f8fafc]">
                        {safePage} / {logPages}
                      </span>
                      <button type="button" className={pagerButtonClass} aria-label="Halaman log berikutnya" disabled={safePage === logPages} onClick={() => setLogPage(safePage + 1)}>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </Panel>
          )}

          {tab === "preview" && (
            <Panel title="Pratinjau dokumen PDF" note="A4">
              <div className="flex flex-col gap-3 border-b border-[#334155] bg-[rgba(15,23,42,0.45)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <p className="text-[12px] leading-relaxed text-[#94a3b8]">
                  {preview?.key === sourceKey
                    ? "Pratinjau sudah sesuai dengan periode, proyek, dan penandatangan saat ini."
                    : "Buat pratinjau untuk melihat dokumen A4 lengkap sebelum diekspor."}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                  {preview?.key === sourceKey && (
                    <a className={`${reportButtonClass} max-sm:h-11`} href={preview.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={14} />
                      <span>Buka di tab baru</span>
                    </a>
                  )}
                  <button
                    type="button"
                    className={`${reportButtonClass} max-sm:h-11 ${preview?.key === sourceKey ? "" : "col-span-2"}`}
                    disabled={busy || signatureBusy || Boolean(validation)}
                    onClick={() => void generatePdf(false)}
                  >
                    {busy ? <LoaderCircle size={14} className="animate-spin text-[#38bdf8]" /> : <RefreshCw size={14} />}
                    <span>{busy ? "Menyiapkan…" : preview ? "Perbarui pratinjau" : "Buat pratinjau"}</span>
                  </button>
                </div>
              </div>

              {previewError && (
                <p role="alert" className="border-b border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.12)] px-5 py-3 text-xs font-semibold text-[#f87171]">
                  {previewError}
                </p>
              )}

              {preview?.key === sourceKey ? (
                <Suspense
                  fallback={
                    <div className="flex min-h-72 items-center justify-center gap-2 text-xs text-[#94a3b8]">
                      <LoaderCircle size={16} className="animate-spin text-[#38bdf8]" />
                      Memuat pembaca PDF…
                    </div>
                  }
                >
                  <ReportPdfPreview key={preview.url} url={preview.url} />
                </Suspense>
              ) : (
                <div className="flex min-h-72 flex-col items-center justify-center gap-3 px-5 py-12 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[12px] border border-[#334155] bg-[#0f172a] text-[#38bdf8]">
                    <FileText size={26} />
                  </div>
                  <h3 className="text-[14px] font-bold text-[#f8fafc]">Laporan siap disusun</h3>
                  <p className="max-w-md text-xs leading-relaxed text-[#94a3b8]">
                    {report.total} tiket dan {report.monitoring.length} catatan monitoring akan disusun ke format A4, lengkap dengan grafik, tabel harian, matriks kategori, dan lembar pengesahan.
                  </p>
                </div>
              )}
            </Panel>
          )}
        </div>
      </PanelSkeletonWrapper>
    </div>
  );
}
