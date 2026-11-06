import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { buildWeeklyReport, formatDuration, jakartaDate } from '../app/lib/weekly-report.ts';
import { createWeeklyReportPdf } from '../app/lib/weekly-report-pdf.ts';

const output = resolve('../output/pdf');
await mkdir(output, { recursive: true });
const loadAsset = async (path) => new Uint8Array(await readFile(path.startsWith('/reports/') ? resolve('public' + path) : isAbsolute(path) ? path : resolve(path)));
const audit = [];
for (const week of [36, 39]) {
  const source = JSON.parse(await readFile('.report-qa/' + (week === 36 ? 'pdf-week36' : 'word-week39') + '.json', 'utf8'));
  const report = buildWeeklyReport(source.tickets, source.monitoring, source.period, 'tritronik', 'all', [], week === 39 ? { combined_ticket_counts: source.sourceClickupCounts } : {});
  const identity = { ...source.identity, date: jakartaDate() };
  // Week 36 contained no names. Exercise the explicit example configuration supplied by the user;
  // leave both signature areas unsigned. Production always uses the document settings.
  identity.prepared_by = { name: week === 36 ? 'Dimas Yudistira' : identity.author, title: identity.authorRole, signature_image_path: null, ...(week === 39 ? { date: source.identity.date } : {}) };
  identity.approved_by = { name: week === 36 ? 'Nicholas Bima Nooka Putra' : identity.approver, title: identity.approverRole, signature_image_path: null, ...(week === 39 ? { date: source.identity.date } : {}) };
  const bytes = await createWeeklyReportPdf(report, identity, loadAsset);
  const file = resolve(output, '[2026-' + week + '] Laporan Serah Terima Kerja Mingguan - diperbaiki.pdf');
  await writeFile(file, bytes);
  const pages = (await PDFDocument.load(bytes)).getPageCount();
  const checks = { totalTickets: report.total, dailyTotal: report.projects.flatMap(p => p.days).reduce((a,b)=>a+b,0), categoryTotal: report.categories.reduce((a,b)=>a+b.total,0), durationTableTotal: report.projects.reduce((a,b)=>a+b.total,0), monitoringTotal: report.monitoring.length, monitoringSummary: report.monitoringCounts.reduce((a,b)=>a+b.count,0) };
  if (new Set([checks.totalTickets,checks.dailyTotal,checks.categoryTotal,checks.durationTableTotal]).size !== 1 || checks.monitoringTotal !== checks.monitoringSummary) throw new Error('Reconciliation failed');
  if (week === 36 && (report.total !== 17 || formatDuration(report.averageMinutes) !== '0:34' || report.slaPercent !== 100)) throw new Error('Week36 metrics changed');
  if (week === 39 && (report.total !== 138 || report.monitoring.length !== 864)) throw new Error('Week39 incomplete');
  audit.push({ week, file, pages, checks, averageDuration: formatDuration(report.averageMinutes), slaPercent: report.slaPercent, clickupTotal: report.clickupTotal, projects: report.projects, categories: report.categories, monitoringCounts: report.monitoringCounts });
  console.log(JSON.stringify({ week, file, pages, checks }));
}
await writeFile('.report-qa/reference-validation.json', JSON.stringify(audit, null, 2));
// Signature-image branch uses the source report's own signatories, date and images in QA only.
const source39 = JSON.parse(await readFile('.report-qa/word-week39.json', 'utf8'));
const previewReport = buildWeeklyReport([], [], source39.period, 'tritronik');
const signedIdentity = { ...source39.identity,
  prepared_by: { name: source39.identity.author, title: source39.identity.authorRole, date: source39.identity.date, signature_image_path: resolve('../.codex-tmp/reports-v2/image5.png') },
  approved_by: { name: source39.identity.approver, title: source39.identity.approverRole, date: source39.identity.date, signature_image_path: resolve('../.codex-tmp/reports-v2/image7.png') },
};
await writeFile('.report-qa/signature-layout-only.pdf', await createWeeklyReportPdf(previewReport, signedIdentity, loadAsset));
