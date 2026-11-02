import type { CheckpointAssessment, HistoricalAssessmentEntry, MonitoringEntry, Ticket } from "./types";
import { DEFAULT_REPORT_CONFIG, resolveReportConfig, type ReportConfig, type SignatoryConfig } from "./weekly-report-config";

export { DEFAULT_REPORT_CONFIG, resolveReportConfig, type ReportConfig, type SignatoryConfig } from "./weekly-report-config";

export const REPORT_REFERENCE_URL = "/reports/laporan-serah-terima-2026-39.pdf";
export const REPORT_COLORS = DEFAULT_REPORT_CONFIG.master_projects.map((project) => DEFAULT_REPORT_CONFIG.project_colors[project]);
// Contract-specific application names for Tritronik; other clients use their configured projects.
export const REPORT_SCOPE = ["Single Mediation", "Message Broker", "APH Mediation", "Unified Network Mediation", "Umbrella SIEM", "Enterprise Product Catalog", "Device Management", "B2B Surveillance"];
const TRITRONIK_APPLICATIONS: Record<string, string> = {
  SM: REPORT_SCOPE[0], MB: REPORT_SCOPE[1], APH: REPORT_SCOPE[2], UNEM: REPORT_SCOPE[3],
  USIEM: REPORT_SCOPE[4], EPC: REPORT_SCOPE[5], "EPC Tools": REPORT_SCOPE[5], "EPC Core": REPORT_SCOPE[5],
  DM: REPORT_SCOPE[6], B2B: REPORT_SCOPE[7], "SM/ActiveMQ": REPORT_SCOPE[0],
};
export const REPORT_TICKET_COLUMNS = ["Ticket", "Date Created", "Subject", "Project", "Deskripsi Tugas (Reason # Action # Resp. Time)", "Date Closed", "Status", "Agent", "Category"];
export const REPORT_MONITORING_COLUMNS = ["Date", "Project", "Check Point", "Agent Assigned", "List Activity Monitoring", "Result dan Noted", "New Update (hh:mm)"];
export function reportDurationColumns(clientName = "Tritronik"): string[] {
  return ["Projects", "Average of Value Duration", "SLA < 30 Mins", "Total Ticket Hutabyte", `Total Ticket Hutabyte x ${clientName}`];
}
export const REPORT_DURATION_COLUMNS = reportDurationColumns();
export const REPORT_DURATION_NOTE = "Durasi: jam:menit dari tiket selesai yang memiliki data durasi. SLA: respons < 30 menit dari tiket yang memiliki data respons.";
export type ReportLogKind = "tickets" | "monitoring";

export interface ReportPeriod { start: string; end: string }
export interface ReportIdentity { clientId: string; clientName: string; clientCode: string; author: string; authorRole: string; approver: string; approverRole: string; date: string; prepared_by?: SignatoryConfig; approved_by?: SignatoryConfig }
export interface ReportMonitoringEntry extends Omit<HistoricalAssessmentEntry, "verdict"> {
  verdict: "ok" | "nok" | "unknown";
  /** Original result cell, including an intentionally blank cell, takes precedence over verdict/note. */
  resultText?: string;
  newUpdate?: string;
}
export type ReportMonitoringInput = Omit<ReportMonitoringEntry, "verdict"> & { verdict?: ReportMonitoringEntry["verdict"] };
export interface ProjectReport { project: string; total: number; open: number; closed: number; averageMinutes: number | null; slaPercent: number | null; responseCount: number; days: number[]; clickupCount: number | null }
export interface WeeklyReportOptions {
  config?: Partial<ReportConfig>;
  /** Already-combined Hutabyte/client counts. Do not add the local ticket count again. */
  combined_ticket_counts?: Record<string, number>;
  /** Backward-compatible name for the same combined source totals. */
  clickup_counts?: Record<string, number>;
}
export interface WeeklyReport {
  config: ReportConfig;
  period: ReportPeriod;
  days: string[];
  tickets: Ticket[];
  monitoring: ReportMonitoringEntry[];
  projects: ProjectReport[];
  categories: { category: string; counts: number[]; total: number }[];
  monitoringCounts: { project: string; count: number }[];
  scope: string[];
  selectedProject: string;
  total: number;
  open: number;
  closed: number;
  averageMinutes: number | null;
  slaPercent: number | null;
  responseCount: number;
  monitoringOk: number;
  clickupTotal: number | null;
}

export function jakartaDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  return ["year", "month", "day"].map((key) => parts.find((part) => part.type === key)?.value).join("-");
}

export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function addDays(value: string, amount: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function periodError(period: ReportPeriod): string {
  if (!validDate(period.start) || !validDate(period.end)) return "Pilih tanggal mulai dan tanggal selesai yang valid.";
  if (period.start > period.end) return "Tanggal selesai harus sama atau setelah tanggal mulai.";
  if ((Date.parse(period.end) - Date.parse(period.start)) / 86400000 > 30) return "Maksimal 31 hari per laporan. Pilih periode yang lebih singkat.";
  return "";
}

export function latestDataDate(tickets: Ticket[], monitoring: ReportMonitoringInput[]): string {
  return [...tickets.map((ticket) => ticketDate(ticket)), ...monitoring.map((entry) => entry.date)].filter(validDate).sort().at(-1) ?? jakartaDate();
}

export function ticketDate(ticket: Ticket): string {
  if (ticket.date && validDate(ticket.date)) return ticket.date;
  const date = ticket.created?.slice(0, 10);
  return validDate(date) ? date : "";
}

export function openTicket(ticket: Ticket): boolean {
  if (typeof ticket.isStillOpen === "boolean") return ticket.isStillOpen;
  return !["closed", "resolved", "done", "selesai", "ditutup", "cancelled", "canceled"].includes(ticket.status.trim().toLowerCase());
}

export function ticketCategory(ticket: Ticket, config: Pick<ReportConfig, "severity_map"> = DEFAULT_REPORT_CONFIG): string {
  const rawSeverity = ticket.severity?.trim() || "Low";
  const severity = Object.entries(config.severity_map).find(([key]) => key.toLowerCase() === rawSeverity.toLowerCase())?.[1] ?? rawSeverity;
  return `${severity} - ${(ticket.category || ticket.type || "Other").trim()}`;
}

const projectKey = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();

export function canonicalReportProject(value: string, config: Pick<ReportConfig, "master_projects" | "project_aliases"> = DEFAULT_REPORT_CONFIG): string {
  const name = value.trim().replace(/\s+/g, " ");
  const alias = Object.entries(config.project_aliases).find(([key]) => projectKey(key) === projectKey(name))?.[1];
  return config.master_projects.find((project) => projectKey(project) === projectKey(alias ?? name)) ?? alias ?? name;
}

/** Keep the full monitoring label: “DM - Grafana” and “DM - Zabbix” are separate groups. */
export function normalizeMonitoringProject(value: string, config: ReportConfig = DEFAULT_REPORT_CONFIG): string {
  const name = value.trim().replace(/\s+/g, " ");
  const exact = canonicalReportProject(name, config);
  if (exact !== name || config.master_projects.some((project) => projectKey(project) === projectKey(name))) return exact;
  const separator = name.includes(" - ") ? /\s+-\s+/ : /\s*-\s*/;
  if (!name.includes(" - ") && !config.master_projects.some((project) => projectKey(name).startsWith(`${projectKey(project)}-`))) return name;
  const parts = name.split(separator);
  if (parts.length < 2) return name;
  const prefix = canonicalReportProject(parts.shift()!, config);
  const detail = parts.join(" - ").replace(/\b[a-zA-Z][a-zA-Z0-9]*\b/g, (word) => word === word.toLowerCase() ? word[0].toUpperCase() + word.slice(1) : word);
  return `${prefix} - ${detail}`;
}

function monitoringBaseProject(value: string, config: ReportConfig): string {
  const normalized = normalizeMonitoringProject(value, config);
  return canonicalReportProject(normalized.split(" - ")[0], config);
}

export function weekPeriod(date: string, weekStartDay = DEFAULT_REPORT_CONFIG.week_start_day): ReportPeriod {
  if (!validDate(date)) throw new RangeError("Tanggal awal minggu tidak valid.");
  if (!Number.isInteger(weekStartDay) || weekStartDay < 0 || weekStartDay > 6) throw new RangeError("week_start_day harus berupa bilangan 0–6.");
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  const start = addDays(date, -((day - weekStartDay + 7) % 7));
  return { start, end: addDays(start, 6) };
}

function measured(values: (number | undefined)[]): number[] {
  return values.filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0);
}

function metrics(tickets: Ticket[]) {
  const durations = measured(tickets.filter((ticket) => !openTicket(ticket)).map((ticket) => ticket.resolutionMinutes));
  const responses = measured(tickets.map((ticket) => ticket.responseMinutes));
  return {
    averageMinutes: durations.length ? durations.reduce((sum, value) => sum + value, 0) / durations.length : null,
    slaPercent: responses.length ? Math.round(responses.filter((value) => value < 30).length * 100 / responses.length) : null,
    responseCount: responses.length,
  };
}

export function mergeReportMonitoring(history: HistoricalAssessmentEntry[], schedule: MonitoringEntry[], assessments: Record<string, CheckpointAssessment>, clientId: string, date: string): HistoricalAssessmentEntry[] {
  const records = history.filter((entry) => (entry.clientId || "tritronik") === clientId);
  const live = schedule.filter((entry) => !entry.clientId || entry.clientId === clientId).flatMap((entry) => {
    const key = `${entry.time}-${entry.project}-${entry.task}`;
    const assessment = assessments[key];
    if (!assessment) return [];
    return [{ id: `live-${key}`, date, time: entry.time, project: entry.project, task: entry.task, owner: entry.owner, verdict: assessment.verdict === "ok" || assessment.verdict === "adequate" ? "ok" as const : "nok" as const, note: assessment.note || "", clientId }];
  });
  return [...records.filter((entry) => !live.some((current) => current.date === entry.date && current.time === entry.time && current.project === entry.project && current.task === entry.task)), ...live];
}

export function buildWeeklyReport(allTickets: Ticket[], allMonitoring: ReportMonitoringInput[], period: ReportPeriod, clientId: string, project = "all", configuredProjects: string[] = [], options: WeeklyReportOptions = {}): WeeklyReport {
  const config = resolveReportConfig(options.config);
  const days: string[] = [];
  if (!periodError(period)) for (let day = period.start; day <= period.end; day = addDays(day, 1)) days.push(day);
  const inPeriod = (date: string) => days.length > 0 && validDate(date) && date >= period.start && date <= period.end;
  const selectedProject = canonicalReportProject(project, config);
  const ticketProject = (ticket: Ticket) => canonicalReportProject(ticket.project, config);
  const tickets = allTickets.filter((ticket) => (ticket.clientId || "tritronik") === clientId && inPeriod(ticketDate(ticket)) && (project === "all" || ticketProject(ticket) === selectedProject)).sort((a, b) => ticketDate(a).localeCompare(ticketDate(b)) || (a.created.match(/\d{2}:\d{2}/)?.[0] ?? "").localeCompare(b.created.match(/\d{2}:\d{2}/)?.[0] ?? "") || a.id.localeCompare(b.id));
  const monitoring: ReportMonitoringEntry[] = allMonitoring
    .filter((entry) => (entry.clientId || "tritronik") === clientId && inPeriod(entry.date) && (project === "all" || monitoringBaseProject(entry.project, config) === selectedProject || projectKey(normalizeMonitoringProject(entry.project, config)) === projectKey(normalizeMonitoringProject(project, config))))
    .map((entry) => ({ ...entry, project: normalizeMonitoringProject(entry.project, config), verdict: entry.verdict ?? "unknown" }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.project.localeCompare(b.project));
  const dataProjects = [...new Set(tickets.map(ticketProject))];
  const emptyProjects = config.show_empty_projects ? (project === "all" ? (clientId === "tritronik" ? config.master_projects : configuredProjects) : [selectedProject]) : [];
  const allNames = [...new Set([...dataProjects, ...emptyProjects.map((name) => canonicalReportProject(name, config))])];
  const names = [
    ...config.master_projects.filter((name) => allNames.includes(name)),
    ...allNames.filter((name) => !config.master_projects.includes(name)).sort((a, b) => a.localeCompare(b)),
  ];
  const clickupCounts = new Map<string, number>();
  for (const [name, count] of Object.entries(options.combined_ticket_counts ?? options.clickup_counts ?? {})) {
    if (!Number.isSafeInteger(count) || count < 0) continue;
    const canonical = canonicalReportProject(name, config);
    clickupCounts.set(canonical, (clickupCounts.get(canonical) ?? 0) + count);
  }
  const projects = names.map((name) => {
    const rows = tickets.filter((ticket) => ticketProject(ticket) === name);
    const open = rows.filter(openTicket).length;
    return { project: name, total: rows.length, open, closed: rows.length - open, days: days.map((date) => rows.filter((ticket) => ticketDate(ticket) === date).length), clickupCount: clickupCounts.get(name) ?? null, ...metrics(rows) };
  });
  const categoryKey = (ticket: Ticket) => ticketCategory(ticket, config).toLocaleLowerCase("id-ID");
  const categoryLabels = new Map<string, string>();
  for (const ticket of tickets) if (!categoryLabels.has(categoryKey(ticket))) categoryLabels.set(categoryKey(ticket), ticketCategory(ticket, config));
  const categories = [...categoryLabels].sort((a, b) => a[1].localeCompare(b[1])).map(([key, category]) => ({ category, counts: names.map((name) => tickets.filter((ticket) => ticketProject(ticket) === name && categoryKey(ticket) === key).length), total: tickets.filter((ticket) => categoryKey(ticket) === key).length }));
  const monitoringCounts = [...new Set(monitoring.map((entry) => entry.project))].sort((a, b) => a.localeCompare(b)).map((name) => ({ project: name, count: monitoring.filter((entry) => entry.project === name).length }));
  const availableProjects = configuredProjects.length ? configuredProjects : [...new Set([
    ...allTickets.filter((ticket) => (ticket.clientId || "tritronik") === clientId).map((ticket) => ticket.project),
    ...allMonitoring.filter((entry) => (entry.clientId || "tritronik") === clientId).map((entry) => entry.project),
  ])];
  const scope = project !== "all" ? [clientId === "tritronik" ? TRITRONIK_APPLICATIONS[selectedProject] || selectedProject : selectedProject]
    : clientId === "tritronik" ? [...REPORT_SCOPE] : availableProjects;
  const open = tickets.filter(openTicket).length;
  const clickupTotal = projects.length && projects.every((row) => row.clickupCount !== null) ? projects.reduce((total, row) => total + row.clickupCount!, 0) : null;
  return { config, period, days, tickets, monitoring, projects, categories, monitoringCounts, scope, selectedProject: project, total: tickets.length, open, closed: tickets.length - open, monitoringOk: monitoring.filter((entry) => entry.verdict === "ok").length, clickupTotal, ...metrics(tickets) };
}

export function formatReportDate(value: string, short = false): string {
  if (!validDate(value)) return "—";
  return new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", day: "numeric", month: short ? "short" : "long", year: "numeric" }).format(new Date(`${value}T00:00:00Z`));
}

/** Full Indonesian month names, with only the repeated month/year omitted. */
export function formatReportDateRange(start: string, end: string): string {
  if (!validDate(start) || !validDate(end) || start > end) return "—";
  if (start === end) return formatReportDate(start);
  const [startYear, startMonth, startDay] = start.split("-");
  const [endYear, endMonth] = end.split("-");
  if (startYear === endYear && startMonth === endMonth) return `${Number(startDay)} – ${formatReportDate(end)}`;
  if (startYear === endYear) return `${formatReportDate(start).replace(/ \d{4}$/, "")} – ${formatReportDate(end)}`;
  return `${formatReportDate(start)} – ${formatReportDate(end)}`;
}

export function numericDate(value: string): string { return validDate(value) ? value.split("-").reverse().join("/") : "—"; }
export function shortDate(value: string): string {
  if (!validDate(value)) return "—";
  const parts = value.split("-");
  return `${parts[2]}/${parts[1]}`;
}
export function formatDuration(minutes: number | null): string {
  if (minutes === null) return "—";
  const rounded = Math.round(minutes);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}

export function reportWeek(date: string): { year: number; week: number } {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + 4 - (day.getUTCDay() || 7));
  const year = day.getUTCFullYear();
  return { year, week: Math.ceil(((day.getTime() - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7) };
}

export function reportFilename(report: WeeklyReport, code: string, extension = "pdf"): string {
  const week = reportWeek(report.period.start);
  const safeCode = code.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  return `[${week.year}-${String(week.week).padStart(2, "0")}] Laporan Serah Terima Kerja Mingguan - ${safeCode} - ${report.period.start}_${report.period.end}.${extension}`;
}

export function ticketClosedDate(ticket: Ticket, short = false): string {
  if (openTicket(ticket)) return "—";
  const entry = ticket.history?.filter((item) => item.type === "status_change" && /ditutup|closed|resolved|selesai/i.test(item.action)).at(-1);
  const time = ticket.completionTime || entry?.time;
  if (!time) {
    if (ticket.resolutionMinutes && ticket.created) {
      const match = ticket.created.match(/(\d{2}):(\d{2})/);
      if (match) {
        const total = parseInt(match[1], 10) * 60 + parseInt(match[2], 10) + Math.round(ticket.resolutionMinutes);
        const h = Math.floor(total / 60) % 24;
        const m = total % 60;
        const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        const d = total >= 1440 ? addDays(ticketDate(ticket), Math.floor(total / 1440)) : ticketDate(ticket);
        return short ? `${shortDate(d)} ${timeStr}`.trim() : `${numericDate(d)} ${timeStr}`.trim();
      }
    }
    const last = ticket.history?.at(-1)?.time;
    if (last) {
      const d = ticketDate(ticket);
      return short ? `${shortDate(d)} ${last}`.trim() : `${numericDate(d)} ${last}`.trim();
    }
    return "—";
  }
  if (validDate(time.slice(0, 10))) {
    const d = time.slice(0, 10);
    const t = time.slice(11, 16);
    return short ? `${shortDate(d)} ${t}`.trim() : `${numericDate(d)} ${t}`.trim();
  }
  const date = ticketDate(ticket);
  const createdTime = ticket.created.match(/\d{2}:\d{2}/)?.[0];
  const closedTime = time.match(/\d{2}:\d{2}/)?.[0];
  const finalDate = date && createdTime && closedTime && closedTime < createdTime ? addDays(date, 1) : date;
  return short ? `${shortDate(finalDate)} ${time}`.trim() : `${numericDate(finalDate)} ${time}`.trim();
}

export function ticketReportRows(report: WeeklyReport, options: { shortDates?: boolean } = {}): string[][] {
  const short = Boolean(options.shortDates);
  const formatDate = (date: string, time: string) => {
    const d = short ? shortDate(date) : numericDate(date);
    return `${d} ${time}`.trim();
  };
  return report.tickets.map((ticket) => [
    ticket.id,
    formatDate(ticketDate(ticket), ticket.created.match(/\d{2}:\d{2}/)?.[0] || ""),
    ticket.subject,
    ticket.project,
    ticket.description || "—",
    ticketClosedDate(ticket, short),
    ticket.status,
    ticket.owners?.join(", ") || ticket.owner || "—",
    ticketCategory(ticket, report.config),
  ]);
}

export function monitoringReportRows(report: WeeklyReport, options: { shortDates?: boolean } = {}): string[][] {
  const short = Boolean(options.shortDates);
  return report.monitoring.map((entry) => [
    short ? shortDate(entry.date) : numericDate(entry.date),
    entry.project,
    entry.time,
    entry.owner || "—",
    entry.task,
    entry.resultText !== undefined ? entry.resultText : `${entry.verdict === "unknown" ? "" : entry.verdict.toUpperCase()}${entry.note ? `${entry.verdict === "unknown" ? "" : "\n"}${entry.note}` : ""}` || "—",
    entry.newUpdate ?? "—",
  ]);
}

export function reportCsv(report: WeeklyReport, kind: ReportLogKind = "tickets"): string {
  const headers = kind === "tickets" ? REPORT_TICKET_COLUMNS : REPORT_MONITORING_COLUMNS;
  const records = kind === "tickets" ? ticketReportRows(report) : monitoringReportRows(report);
  const rows = [headers, ...(records.length ? records : [headers.map((_, index) => index === 0 ? "Tidak ada data pada periode ini." : "—")])];
  const escape = (value: string) => `"${(/^(?:\s*[=+@-]|[\t\r])/.test(value) ? "'" : "") + value.replace(/"/g, '""')}"`;
  return `\uFEFF${rows.map((row) => row.map(escape).join(";")).join("\r\n")}`;
}

/** Browser download helper kept separate from the heavy PDF dependencies. */
export function downloadReportBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename;
  document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
