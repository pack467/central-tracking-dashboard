"use client";
import { paths } from "@/app/lib/routes";
import Link from "next/link";

import { useUrlQuery, useUrlSearch } from "@/app/hooks/useUrlQuery";
import { reportsSchema } from "@/app/lib/query-state";
import { routes, reportPaths } from "@/app/lib/routes";

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileCheck2,
  FileText,
  FolderKanban,
  LoaderCircle,
  MoreHorizontal,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { DatePicker } from "@/app/components/ui/DatePicker";
import { StatCard } from "@/app/components/ui/StatCard";
import { useToast } from "@/app/components/ui/Toast";
import { useClient } from "@/app/context/ClientContext";
import { getClientHistoricalAssessments, getClientMonitoringSchedule, getClientProjects } from "@/app/lib/clientData";
import { useAuth } from "@/app/lib/auth";
import {
  reportDurationColumns,
  REPORT_DURATION_NOTE,
  REPORT_REFERENCE_URL,
  addDays,
  buildWeeklyReport,
  downloadReportBlob,
  formatDuration,
  formatReportDate,
  jakartaDate,
  latestDataDate,
  mergeReportMonitoring,
  numericDate,
  periodError,
  reportCsv,
  reportFilename,
  ticketCategory,
  ticketClosedDate,
  ticketDate,
  type ReportIdentity,
  type ReportLogKind,
  type ReportPeriod,
} from "@/app/lib/weekly-report";
import type { CheckpointAssessment, Ticket } from "@/app/lib/types";
import {
  ReportDailyChart as DailyChart,
  ReportDataTable as DataTable,
  ReportEmptyState as EmptyReport,
  ReportPanel as Panel,
  ReportProjectChart as ProjectChart,
} from "@/app/components/reports/ReportContent";
import { ReportCsvExport } from "@/app/components/reports/ReportCsvExport";
import { ReportSignatoryFields } from "@/app/components/reports/ReportSignatoryFields";
import {
  reportButtonClass,
  reportInputClass,
  reportPrimaryButtonClass,
} from "@/app/components/reports/report-styles";

const ReportPdfPreview = lazy(() =>
  import("@/app/components/reports/ReportPdfPreview").then((module) => ({ default: module.ReportPdfPreview }))
);

interface ReportsViewProps {
  tickets: Ticket[];
  assessments: Record<string, CheckpointAssessment>;
  handoverCount: number;
}

type ReportTab = "summary" | "tickets" | "monitoring" | "preview";

export function ReportsView({ tickets, assessments }: ReportsViewProps) {
  const { activeClient, activeClientId } = useClient();
  const { user } = useAuth();
  const notify = useToast();

  const historical = useMemo(() => getClientHistoricalAssessments(activeClientId), [activeClientId]);
  const latest = useMemo(
    () => latestDataDate(tickets, historical.filter((entry) => (entry.clientId || "tritronik") === activeClientId)),
    [tickets, historical, activeClientId]
  );
  const monitoring = useMemo(
    () => mergeReportMonitoring(historical, getClientMonitoringSchedule(activeClientId), assessments, activeClientId, "2026-08-31"),
    [historical, assessments, activeClientId]
  );

  const schema = useMemo(() => reportsSchema(addDays(latest, -6), latest, [...new Set([...getClientProjects(activeClientId).map(p => p.name), ...tickets.map(t => t.project), ...monitoring.map(m => m.project)])]), [latest, activeClientId, tickets, monitoring]);
  const url = useUrlQuery(schema, paths.reports);
  const periodStart = url.values.range === "empty" ? "" : url.values.from;
  const periodEnd = url.values.range === "empty" ? "" : url.values.to;
  const period: ReportPeriod = { start: periodStart, end: periodEnd };
  const project = url.values.project;
  const tab: ReportTab = (Object.keys(reportPaths) as ReportTab[]).find(key => reportPaths[key] === url.pathname) ?? "summary";
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
  const configuredProjects = useMemo(() => getClientProjects(activeClientId).map((entry) => entry.name), [activeClientId]);
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

  const datePickerValue = useMemo(() => {
    if (!period.start && !period.end) return "";
    if (period.start === period.end) return period.start;
    return `${period.start}..${period.end}`;
  }, [period.start, period.end]);

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

  const tabs: { id: ReportTab; label: string; count?: number }[] = [
    { id: "summary", label: "Ringkasan" },
    { id: "tickets", label: "Ticket log", count: report.total },
    { id: "monitoring", label: "Monitoring log", count: report.monitoring.length },
    { id: "preview", label: "Pratinjau PDF" },
  ];

  const filteredTickets = report.tickets.filter((ticket) =>
    `${ticket.id} ${ticket.subject} ${ticket.project} ${ticket.owner} ${ticket.status}`
      .toLowerCase()
      .includes(logQuery.toLowerCase())
  );
  const filteredMonitoring = report.monitoring.filter((entry) =>
    `${entry.project} ${entry.owner} ${entry.task} ${entry.note} ${entry.verdict}`
      .toLowerCase()
      .includes(logQuery.toLowerCase())
  );
  const logTotal = tab === "monitoring" ? filteredMonitoring.length : filteredTickets.length;
  const logPages = Math.max(1, Math.ceil(logTotal / 10));
  const safePage = Math.min(logPage, logPages);
  const offset = (safePage - 1) * 10;

  const isCustomSettings =
    author !== null ||
    approver !== "" ||
    authorRole !== "Jr. Engineer" ||
    approverRole !== "IT Services Lead" ||
    Boolean(preparedDate || approvedDate || preparedSignature || approvedSignature);

  // Reusable filter bar component integrated into the top panel header of each tab
  const filterBar = (
    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full lg:w-auto">
      {/* 1. Rentang Tanggal Terpadu */}
      <div className="relative min-w-[190px] flex-1 sm:flex-initial">
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
          className="w-full [&_[role='button']]:!h-[32px] sm:[&_[role='button']]:!h-[32px] max-sm:[&_[role='button']]:!h-[40px] [&_[role='button']]:!rounded-[7px] [&_[role='button']]:!border-[#334155] [&_[role='button']]:!bg-[#0f172a] hover:[&_[role='button']]:!border-[#64748b] hover:[&_[role='button']]:!bg-[#0f172a] [&_[role='button']]:!px-2.5 [&_[role='button']]:!text-[11.5px] [&_[role='button']]:!font-semibold font-mono"
        />
      </div>

      {/* 2. Filter Proyek */}
      <div className="relative min-w-[165px] flex-1 sm:flex-initial">
        <label htmlFor="filter-project" className="sr-only">Proyek</label>
        <div className="relative flex items-center">
          <FolderKanban size={13} className="absolute left-2.5 text-[#94a3b8] pointer-events-none z-10" />
          <select
            id="filter-project"
            aria-label="Filter proyek laporan"
            value={project}
            disabled={busy}
            onChange={(event) => {
              url.update({ project: event.target.value, page: 1 });
            }}
            className="h-[32px] max-sm:h-[40px] w-full appearance-none rounded-[7px] border border-[#334155] bg-[#0f172a] pl-8 pr-8 text-[11.5px] font-semibold text-[#cbd5e1] hover:border-[#64748b] hover:text-[#f8fafc] focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8] focus:outline-none transition-all cursor-pointer [color-scheme:dark] [&_option]:bg-[#1e293b] [&_option]:text-[#f8fafc]"
          >
            <option value="all">Semua proyek ({projectOptions.length})</option>
            {projectOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 text-[#94a3b8] pointer-events-none z-10" />
        </div>
      </div>

      {/* Separator */}
      <div className="hidden lg:block h-4 w-px bg-[#334155]" aria-hidden="true" />

      {/* 3. Pengaturan Dokumen Toggle Button */}
      <button
        type="button"
        className={`inline-flex items-center justify-center gap-1.5 h-[32px] max-sm:h-[40px] px-3 rounded-[7px] border text-[11.5px] font-semibold transition-all cursor-pointer select-none whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#38bdf8] ${
          showSettings
            ? "border-[#38bdf8] bg-[#38bdf8]/15 text-[#38bdf8] shadow-[0_0_8px_rgba(56,189,248,0.2)]"
            : "border-[#334155] bg-[#0f172a] text-[#cbd5e1] hover:border-[#64748b] hover:text-[#f8fafc]"
        }`}
        onClick={() => setShowSettings((prev) => !prev)}
        aria-expanded={showSettings}
        aria-controls="report-document-settings"
        aria-label="Pengaturan dokumen dan penandatangan"
      >
        <SlidersHorizontal size={13} className={showSettings ? "text-[#38bdf8]" : "text-[#94a3b8]"} />
        <span>Pengaturan Dokumen</span>
        {isCustomSettings && (
          <span className="h-1.5 w-1.5 rounded-full bg-[#38bdf8] shadow-[0_0_6px_#38bdf8]" title="Pengaturan dokumen khusus aktif" />
        )}
      </button>
    </div>
  );

  // Document settings drawer rendered smoothly beneath panel header
  const documentSettingsDrawer = (
    <>
      {/* Validation error message if period invalid */}
      {validation && (
        <div role="alert" className="flex items-center gap-2 border-b border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.12)] px-4 py-2.5 text-xs text-[#f87171] sm:px-5">
          <AlertCircle size={14} className="shrink-0" />
          <span>{validation}</span>
        </div>
      )}

      {/* Expandable Document Settings */}
      {showSettings && (
        <div id="report-document-settings" className="border-b border-[#334155] bg-[#0f172a]/70 p-4 sm:p-5 animate-in fade-in duration-150">
          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#38bdf8]">
              Pengaturan Dokumen & Penandatangan Laporan
            </h3>
            <span className="text-[11px] text-[#94a3b8]">
              Data ini dicetak pada lembar pengesahan PDF resmi
            </span>
          </div>

          <div className="grid gap-3.5 lg:grid-cols-2">
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

          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#334155]/50 pt-3 text-[11px] text-[#94a3b8]">
            <span>
              Tanggal tanda tangan bawaan:{" "}
              <strong className="text-[#f8fafc] font-semibold">{formatReportDate(creationDate)}</strong>. Tanggal masing-masing penandatangan dapat diubah bebas.
            </span>
            <span>Nama penandatangan yang dikosongkan tetap tampil sebagai garis kosong pada PDF.</span>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="min-w-0 space-y-5 pb-12 sm:space-y-6">
      {/* ── 1. Page Header ── */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[1px] text-[#94a3b8]">
            <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-[#4ade80] animate-pulse" />
            <span>REPORTS · {activeClient.code}</span>
          </div>
          <h1 className="my-[6px_4px] text-[24px] sm:text-[28px] font-bold tracking-[-0.4px] text-[#f8fafc] leading-[1.2]">
            Reports
          </h1>
        </div>

        {/* Action Group: Lainnya / PDF acuan, Ekspor CSV, Ekspor PDF */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto max-sm:grid max-sm:grid-cols-[auto_1fr_1fr]">
          {/* Menu Lainnya */}
          <details className="group relative">
            <summary
              className={`${reportButtonClass} cursor-pointer list-none text-[#94a3b8] hover:text-[#f8fafc] max-sm:h-[40px] [&::-webkit-details-marker]:hidden`}
              aria-label="Menu opsi lainnya"
            >
              <MoreHorizontal size={14} />
              <span className="hidden sm:inline">Lainnya</span>
              <ChevronDown size={12} className="transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <div className="absolute right-0 top-full z-40 mt-1.5 w-64 rounded-[10px] border border-[#334155] bg-[#1e293b] p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
              <a
                href={REPORT_REFERENCE_URL}
                download="[2026-39] Laporan Serah Terima Kerja Mingguan.pdf"
                className="flex w-full items-center gap-3 rounded-[8px] px-3 py-2 text-left text-xs text-[#cbd5e1] transition hover:bg-[#243044] hover:text-[#38bdf8]"
              >
                <FileCheck2 size={16} className="shrink-0 text-[#38bdf8]" />
                <span className="flex flex-col gap-0.5">
                  <strong className="font-semibold text-[#f8fafc]">PDF Dokumen Acuan Asli</strong>
                  <span className="text-[11px] text-[#94a3b8]">Unduh format referensi A4</span>
                </span>
              </a>
            </div>
          </details>

          {/* Secondary Action: CSV Export */}
          <ReportCsvExport disabled={busy || Boolean(validation)} onExport={exportCsv} />

          {/* Primary Action: PDF Export */}
          <button
            type="button"
            className={`${reportPrimaryButtonClass} max-sm:h-[40px]`}
            onClick={() => void generatePdf(true)}
            disabled={busy || signatureBusy || Boolean(validation)}
          >
            {busy ? <LoaderCircle size={14} className="animate-spin" /> : <ArrowDownToLine size={14} />}
            <span>{busy ? "Menyiapkan PDF…" : "Ekspor PDF"}</span>
          </button>
        </div>
      </section>

      {/* ── 2. KPI Metric Stat Cards (Aligned bottom badges) ── */}
      <section
        className="grid grid-cols-1 min-[560px]:grid-cols-2 min-[1100px]:grid-cols-4 gap-3 sm:gap-4 [&_.sc]:h-full [&_.sc]:flex [&_.sc]:flex-col [&_.sc-footer]:mt-auto"
        aria-label="Ringkasan statistik laporan"
      >
        <StatCard
          label="TIKET TERCATAT"
          value={report.total}
          accentColor="blue"
          icon={<ClipboardList size={15} />}
          subtitle={report.total ? `${report.projects.length} proyek aktif tercatat` : "Belum ada tiket"}
          badgeText={report.total ? `${report.projects.length} Proyek` : "0 Proyek"}
          badgeTone="blue"
          className="h-full flex flex-col [&_.sc-footer]:mt-auto"
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
          className="h-full flex flex-col [&_.sc-footer]:mt-auto"
        />

        <StatCard
          label="SLA RESPONS < 30M"
          value={report.slaPercent === null ? "—" : `${report.slaPercent}%`}
          accentColor="purple"
          icon={<ShieldCheck size={15} />}
          subtitle={report.responseCount ? `${report.responseCount} tiket terukur respons` : "Belum ada respons"}
          badgeText={report.slaPercent !== null ? `${report.slaPercent}% SLA` : "No Data"}
          badgeTone="purple"
          className="h-full flex flex-col [&_.sc-footer]:mt-auto"
        />

        <StatCard
          label="CHECKPOINT MONITORING"
          value={report.monitoring.length ? `${report.monitoringOk}/${report.monitoring.length}` : "—"}
          accentColor={nokCount > 0 ? "rose" : "green"}
          icon={<CheckCircle2 size={15} />}
          subtitle={
            report.monitoring.length
              ? nokCount > 0
                ? `${nokCount} anomali NOK terdeteksi`
                : "100% checkpoint normal"
              : "Belum ada monitoring"
          }
          badgeText={
            report.monitoring.length
              ? nokCount > 0
                ? `${nokCount} NOK`
                : "All OK"
              : "No Data"
          }
          badgeTone={nokCount > 0 ? "rose" : "green"}
          className="h-full flex flex-col [&_.sc-footer]:mt-auto"
        />
      </section>

      {/* ── 3. Tab Navigation Switcher ── */}
      <section className="border-b border-[#334155] pb-3">
        <div className="flex min-w-0 max-w-full overflow-x-auto snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Bagian laporan">
          <div className="flex min-w-0 gap-1.5 sm:gap-2">
            {tabs.map((item) => (
              <Link
                key={item.id}
                id={`report-tab-${item.id}`}
                role="tab"
                aria-selected={tab === item.id}
                aria-controls={`report-panel-${item.id}`}
                className={`snap-start inline-flex items-center gap-2 px-3.5 py-2 rounded-[8px] border text-[12px] font-semibold transition-all cursor-pointer select-none whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8] ${
                  tab === item.id
                    ? "bg-[#1e293b] border-[#334155] text-[#38bdf8] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.25)] ring-1 ring-[#38bdf8]/20"
                    : "border-transparent bg-transparent text-[#94a3b8] hover:bg-[#243044] hover:text-[#f8fafc]"
                }`}
                href={routes.reports.tab(item.id, url.query)}
                scroll={false}
                tabIndex={tab === item.id ? 0 : -1}
              >
                <span>{item.label}</span>
                {item.count !== undefined && (
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded-[5px] font-mono text-[10px] font-bold leading-none ${
                      tab === item.id
                        ? "bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/25"
                        : "bg-[#0f172a] text-[#94a3b8] border border-[#334155]/60"
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. Tab Panels ── */}
      <div id={`report-panel-${tab}`} role="tabpanel" aria-labelledby={`report-tab-${tab}`} className="space-y-5 sm:space-y-6">
        {tab === "summary" && (
          <>
            {/* 1. Durasi pemrosesan & SLA: Moved to top with filter in header */}
            <Panel
              title="Durasi pemrosesan & SLA"
              headerAction={filterBar}
              className="overflow-visible relative z-30"
            >
              {documentSettingsDrawer}
              <DataTable
                headers={reportDurationColumns(identity.clientName)}
                total
                alignments={["left", "right", "right", "right", "right"]}
                stickyFirstCol
                rows={[
                  ...report.projects.map((row) => [
                    <span key={row.project} className="inline-flex items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: report.config.project_colors[row.project] ?? "#38bdf8" }}
                      />
                      <span>{row.project}</span>
                    </span>,
                    formatDuration(row.averageMinutes),
                    row.slaPercent === null ? <span className="text-[#64748b]">—</span> : `${row.slaPercent}%`,
                    row.total,
                    row.clickupCount ?? <span className="text-[#64748b]">—</span>,
                  ]),
                  [
                    "Grand Total",
                    formatDuration(report.averageMinutes),
                    report.slaPercent === null ? <span className="text-[#64748b]">—</span> : `${report.slaPercent}%`,
                    report.total,
                    report.clickupTotal ?? <span className="text-[#64748b]">—</span>,
                  ],
                ]}
              />
              {report.config.show_footnotes && (
                <p className="border-t border-[#334155]/60 px-4 py-3 text-[11px] leading-relaxed text-[#94a3b8] sm:px-5">
                  {REPORT_DURATION_NOTE}
                </p>
              )}
            </Panel>

            {/* 2. Charts Grid: Project Distribution & Daily Activity */}
            <div className="grid gap-5 lg:grid-cols-2 sm:gap-6 items-stretch">
              <Panel title="Tiket berdasarkan proyek" note={`${report.total} tiket`} className="h-full">
                <ProjectChart report={report} />
              </Panel>
              <Panel title="Aktivitas tiket harian" note="Distribusi per proyek" className="h-full">
                <DailyChart report={report} />
              </Panel>
            </div>

            {/* 3. Kategori Tiket: Full Width Panel */}
            <Panel title="Kategori tiket" note="Severity & Category">
              {report.categories.length ? (
                <DataTable
                  headers={["Severity - Category", ...report.projects.map((row) => row.project), "Grand Total"]}
                  total
                  alignments={["left", ...report.projects.map(() => "center" as const), "right"]}
                  stickyFirstCol
                  minWidth="min-w-[720px]"
                  rows={[
                    ...report.categories.map((row) => [
                      <span key={row.category} className="block min-w-[220px] max-w-[280px] truncate" title={row.category}>
                        {row.category}
                      </span>,
                      ...row.counts.map((count, cIdx) => count || <span key={cIdx} className="text-[#64748b]/40">—</span>),
                      row.total,
                    ]),
                    ["Grand Total", ...report.projects.map((row) => row.total || ""), report.total],
                  ]}
                />
              ) : (
                <EmptyReport kind="categories" compact />
              )}
            </Panel>

            {/* 4. Ringkasan Monitoring: Full Width Panel */}
            <Panel title="Ringkasan monitoring" note={`${report.monitoring.length} catatan`}>
              {report.monitoringCounts.length ? (
                <DataTable
                  headers={["Project", "Count of Agent"]}
                  total
                  alignments={["left", "right"]}
                  stickyFirstCol
                  rows={[
                    ...report.monitoringCounts.map((row) => [
                      <span key={row.project} className="inline-flex items-center gap-2">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: report.config.project_colors[row.project] ?? "#38bdf8" }}
                        />
                        <span>{row.project}</span>
                      </span>,
                      row.count,
                    ]),
                    ["Grand Total", report.monitoring.length],
                  ]}
                />
              ) : (
                <EmptyReport kind="monitoring" compact />
              )}
            </Panel>
          </>
        )}

        {(tab === "tickets" || tab === "monitoring") && (
          <Panel
            title={tab === "tickets" ? "Ticket log / Tiket di minggu ini" : "Monitoring Log"}
            note={`${logTotal} catatan`}
            headerAction={filterBar}
            className="overflow-visible relative z-30"
          >
            {documentSettingsDrawer}

            {/* Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#334155] bg-[rgba(15,23,42,0.35)] p-3.5 sm:p-4">
              <div className="relative flex-1 sm:max-w-md">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
                <input
                  aria-label="Cari catatan laporan"
                  className={`${reportInputClass} h-[36px] pl-9`}
                  placeholder="Cari proyek, subjek, agen, atau status…"
                  value={logSearch.input}
                  onChange={(event) => {
                    setLogQuery(event.target.value);
                  }}
                />
              </div>
              <span className="text-[11.5px] font-mono text-[#94a3b8]">
                {logTotal} data ditemukan
              </span>
            </div>

            {!logTotal ? (
              <EmptyReport kind={tab === "monitoring" ? "monitoringLog" : "tickets"} />
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="space-y-3 p-4 sm:hidden">
                  {tab === "tickets"
                    ? filteredTickets.slice(offset, offset + 10).map((ticket, index) => (
                        <article key={`${ticket.id}-${offset + index}`} className="rounded-[10px] border border-[#334155] bg-[#0f172a]/70 p-3.5">
                          <div className="mb-1.5 flex items-center justify-between gap-2">
                            <span className="font-mono text-xs font-bold text-[#38bdf8]">{ticket.id}</span>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-mono font-bold ${
                                ticket.status?.toLowerCase().includes("close")
                                  ? "bg-[#4ade80]/15 text-[#4ade80] border border-[#4ade80]/25"
                                  : ticket.status?.toLowerCase().includes("escalat")
                                  ? "bg-[#f87171]/15 text-[#f87171] border border-[#f87171]/25"
                                  : "bg-[#fbbf24]/15 text-[#fbbf24] border border-[#fbbf24]/25"
                              }`}
                            >
                              {ticket.status}
                            </span>
                          </div>
                          <h3 className="break-words text-xs font-semibold leading-snug text-[#f8fafc]">
                            {ticket.subject}
                          </h3>
                          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#94a3b8]">
                            <span className="font-semibold text-[#cbd5e1]">{ticket.project}</span>
                            <span>·</span>
                            <span>{ticket.owner}</span>
                            <span>·</span>
                            <span>{numericDate(ticketDate(ticket))} {ticket.created}</span>
                          </div>
                        </article>
                      ))
                    : filteredMonitoring.slice(offset, offset + 10).map((entry) => (
                        <article key={entry.id} className="rounded-[10px] border border-[#334155] bg-[#0f172a]/70 p-3.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-[#f8fafc]">{entry.project}</span>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[10.5px] font-bold ${
                                entry.verdict === "ok"
                                  ? "bg-[#4ade80]/15 text-[#4ade80] border border-[#4ade80]/25"
                                  : entry.verdict === "nok"
                                  ? "bg-[#f87171]/15 text-[#f87171] border border-[#f87171]/25"
                                  : "bg-[#334155] text-[#94a3b8]"
                              }`}
                            >
                              {entry.verdict === "unknown" ? "Belum dinilai" : entry.verdict.toUpperCase()}
                            </span>
                          </div>
                          <p className="mt-1.5 break-words text-xs leading-relaxed text-[#cbd5e1]">
                            {entry.task}
                          </p>
                          <div className="mt-2 text-[11px] text-[#94a3b8]">
                            <span>{entry.owner} · {numericDate(entry.date)} {entry.time}</span>
                            {(entry.resultText ?? entry.note) && (
                              <p className="mt-1 text-[#94a3b8]/90 italic">{entry.resultText ?? entry.note}</p>
                            )}
                          </div>
                        </article>
                      ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden sm:block">
                  {tab === "tickets" ? (
                    <DataTable
                      headers={["Ticket / Created", "Subject / Deskripsi", "Project", "Date Closed", "Status", "Agent", "Category"]}
                      stickyFirstCol
                      rows={filteredTickets.slice(offset, offset + 10).map((ticket) => [
                        <div key="id" className="min-w-24">
                          <span className="font-mono text-xs font-bold text-[#38bdf8]">{ticket.id}</span>
                          <p className="mt-0.5 text-[11px] font-mono text-[#94a3b8]">
                            {numericDate(ticketDate(ticket))}
                            <br />
                            {ticket.created}
                          </p>
                        </div>,
                        <div key="subject" className="min-w-44 max-w-md break-words">
                          <strong className="font-semibold leading-5 text-[#f8fafc]">{ticket.subject}</strong>
                          <p className="mt-1 text-[11px] leading-relaxed text-[#94a3b8]">{ticket.description || "—"}</p>
                        </div>,
                        <span key="project" className="font-semibold text-[#f8fafc]">{ticket.project}</span>,
                        <span key="closed" className="font-mono text-[11px] text-[#cbd5e1]">{ticketClosedDate(ticket)}</span>,
                        <span
                          key="status"
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-mono font-bold ${
                            ticket.status?.toLowerCase().includes("close")
                              ? "bg-[#4ade80]/15 text-[#4ade80] border border-[#4ade80]/25"
                              : ticket.status?.toLowerCase().includes("escalat")
                              ? "bg-[#f87171]/15 text-[#f87171] border border-[#f87171]/25"
                              : "bg-[#fbbf24]/15 text-[#fbbf24] border border-[#fbbf24]/25"
                          }`}
                        >
                          {ticket.status}
                        </span>,
                        <span key="agent" className="text-[11.5px] text-[#cbd5e1]">{ticket.owners?.join(", ") || ticket.owner}</span>,
                        <span key="category" className="text-[11.5px] text-[#cbd5e1]">{ticketCategory(ticket)}</span>,
                      ])}
                    />
                  ) : (
                    <DataTable
                      headers={["Date / Check Point", "Project", "Agent Assigned", "List Activity Monitoring", "Result dan Noted", "New Update"]}
                      stickyFirstCol
                      rows={filteredMonitoring.slice(offset, offset + 10).map((entry) => [
                        <div key="date" className="min-w-20 font-mono text-[11px] text-[#94a3b8]">
                          <span className="text-[#cbd5e1] font-semibold">{numericDate(entry.date)}</span>
                          <br />
                          {entry.time}
                        </div>,
                        <span key="project" className="font-semibold text-[#f8fafc]">{entry.project}</span>,
                        <span key="owner" className="text-[11.5px] text-[#cbd5e1]">{entry.owner}</span>,
                        <div key="task" className="max-w-xs break-words text-[11.5px] text-[#cbd5e1]">{entry.task}</div>,
                        <div key="result" className="max-w-md break-words">
                          {entry.resultText === undefined && (
                            <span
                              className={`inline-block font-mono text-[10.5px] font-bold px-1.5 py-0.5 rounded ${
                                entry.verdict === "ok"
                                  ? "bg-[#4ade80]/15 text-[#4ade80]"
                                  : entry.verdict === "nok"
                                  ? "bg-[#f87171]/15 text-[#f87171]"
                                  : "text-[#94a3b8]"
                              }`}
                            >
                              {entry.verdict === "unknown" ? "Belum dinilai" : entry.verdict.toUpperCase()}
                            </span>
                          )}
                          <p className="mt-0.5 text-[11px] leading-relaxed text-[#94a3b8]">{entry.resultText ?? entry.note}</p>
                        </div>,
                        <span key="update" className="font-mono text-[11px] text-[#94a3b8]">{entry.newUpdate ?? "—"}</span>,
                      ])}
                    />
                  )}
                </div>

                {/* Pagination Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#334155] bg-[rgba(15,23,42,0.4)] px-4 py-3 sm:px-5">
                  <span className="text-[11.5px] text-[#94a3b8]">
                    Menampilkan <strong className="text-[#f8fafc]">{offset + 1}</strong>–<strong className="text-[#f8fafc]">{Math.min(offset + 10, logTotal)}</strong> dari <strong className="text-[#f8fafc]">{logTotal}</strong> catatan (PDF memuat seluruh data)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#334155] bg-[#1e293b] text-[#94a3b8] transition hover:bg-[#243044] hover:text-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
                      aria-label="Halaman log sebelumnya"
                      disabled={safePage === 1}
                      onClick={() => setLogPage(safePage - 1)}
                    >
                      <ArrowLeft size={13} />
                    </button>
                    <span className="px-2 font-mono text-[11px] font-semibold text-[#f8fafc]">
                      {safePage} / {logPages}
                    </span>
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#334155] bg-[#1e293b] text-[#94a3b8] transition hover:bg-[#243044] hover:text-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
                      aria-label="Halaman log berikutnya"
                      disabled={safePage === logPages}
                      onClick={() => setLogPage(safePage + 1)}
                    >
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </Panel>
        )}

        {tab === "preview" && (
          <Panel
            title="Pratinjau Dokumen PDF"
            note="Format A4 Resmi"
            headerAction={filterBar}
            className="overflow-visible relative z-30"
          >
            {documentSettingsDrawer}

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#334155] bg-[rgba(15,23,42,0.45)] px-4 py-3 sm:px-5">
              <p className="text-xs text-[#94a3b8]">
                {preview?.key === sourceKey
                  ? "Pratinjau telah sinkron dengan periode dan pengaturan laporan saat ini."
                  : "Buat atau perbarui pratinjau untuk melihat tata letak dokumen cetak A4 lengkap."}
              </p>
              <button
                type="button"
                className={reportButtonClass}
                disabled={busy || signatureBusy || Boolean(validation)}
                onClick={() => void generatePdf(false)}
              >
                {busy ? <LoaderCircle size={14} className="animate-spin text-[#38bdf8]" /> : <RefreshCw size={14} />}
                <span>{busy ? "Menyiapkan…" : preview ? "Perbarui Pratinjau" : "Buat Pratinjau"}</span>
              </button>
            </div>

            {previewError && (
              <p role="alert" className="border-b border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.12)] px-5 py-3 text-xs font-semibold text-[#f87171]">
                {previewError}
              </p>
            )}

            {preview?.key === sourceKey ? (
              <>
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
                <div className="border-t border-[#334155] p-3.5 sm:px-5 bg-[rgba(15,23,42,0.45)]">
                  <a
                    className="inline-flex items-center gap-2 text-xs font-semibold text-[#38bdf8] transition hover:underline"
                    href={preview.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FileText size={14} />
                    <span>Buka PDF di tab baru</span>
                  </a>
                </div>
              </>
            ) : (
              <div className="flex min-h-72 flex-col items-center justify-center gap-3 px-5 py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-[12px] border border-[#334155] bg-[#0f172a] text-[#38bdf8] shadow-md">
                  <FileText size={26} />
                </div>
                <h3 className="text-[14px] font-bold text-[#f8fafc]">Laporan Siap Dikompilasi</h3>
                <p className="max-w-md text-xs leading-relaxed text-[#94a3b8]">
                  {report.total} tiket dan {report.monitoring.length} catatan monitoring akan disusun ke dalam format A4 resmi, lengkap dengan grafik, tabel data per hari, matriks kategori, dan lembar pengesahan.
                </p>
              </div>
            )}
          </Panel>
        )}
      </div>
    </div>
  );
}

