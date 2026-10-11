import { LayoutDashboard, Ticket, Activity, History, BarChart2, Users, type LucideIcon } from 'lucide-react';
import { serializeQuery, type Schema, type Query } from './query-state';

export const paths = {
  dashboard: '/dashboard', tickets: '/tickets', monitoring: '/monitoring', shiftLog: '/shift-log', reports: '/reports', teamRoster: '/team-roster', runbooks: '/runbooks', notifications: '/notifications', profile: '/profile', login: '/login', team: '/team',
  escalations: '/tickets/escalations', monitoringHistory: '/monitoring/history', ticketLog: '/reports/ticket-log', monitoringLog: '/reports/monitoring-log', pdfPreview: '/reports/pdf-preview', credentials: '/runbooks/credentials', links: '/runbooks/links', escalation: '/runbooks/escalation',
} as const;
export type ReportTab = 'summary' | 'tickets' | 'monitoring' | 'preview';
export type RunbookTab = 'sop' | 'credentials' | 'links' | 'escalation';
export const reportPaths: Record<ReportTab, string> = { summary: paths.reports, tickets: paths.ticketLog, monitoring: paths.monitoringLog, preview: paths.pdfPreview };
export const runbookPaths: Record<RunbookTab, string> = { sop: paths.runbooks, credentials: paths.credentials, links: paths.links, escalation: paths.escalation };
export function withQuery(path: string, query = '') { return query ? `${path}?${query}` : path; }
export function queryUrl<S extends Schema>(path: string, schema: S, values: Partial<Query<S>>) { return withQuery(path, serializeQuery(schema, values)); }
const detail = (path: string, id: string, query = '') => withQuery(`${path}/${encodeURIComponent(id.toLowerCase())}`, query);
export const routes = {
  tickets: <S extends Schema>(schema: S, filters: Partial<Query<S>>) => queryUrl(paths.tickets, schema, filters),
  ticket: (id: string, query = '') => detail(paths.tickets, id, query),
  ticketFromList: (id: string, pathname: string, query: string) => { const params = new URLSearchParams(isActivePath(pathname, paths.tickets) ? query : ""); if (pathname === paths.escalations) params.set("list", "escalations"); return detail(paths.tickets, id, params.toString()); },
  member: (id: string, query = '') => detail(paths.teamRoster, id, query),
  runbook: (id: string, query = '') => detail(paths.runbooks, id, query),
  reports: { tab: (tab: ReportTab, query = '') => withQuery(reportPaths[tab], query) },
  teamRoster: (query = '') => withQuery(paths.teamRoster, query),
  login: (next: string) => withQuery(paths.login, new URLSearchParams({ next: safeNext(next) }).toString()),
  publicTeam: (from = paths.login as string) => withQuery(paths.team, new URLSearchParams({ from: safeNext(from, true) }).toString()),
};
export interface NavItemConfig { icon: LucideIcon; label: string; path: string }
export const operationalNavItems: readonly NavItemConfig[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: paths.dashboard }, { icon: Ticket, label: 'Tickets', path: paths.tickets }, { icon: Activity, label: 'Monitoring', path: paths.monitoring }, { icon: History, label: 'Shift Log', path: paths.shiftLog },
];
export const managementNavItems: readonly NavItemConfig[] = [
  { icon: BarChart2, label: 'Reports', path: paths.reports }, { icon: Users, label: 'Team Roster', path: paths.teamRoster },
];
export const navItems = [...operationalNavItems, ...managementNavItems];
const labels: Record<string, string> = { Runbooks: paths.runbooks, Profile: paths.profile, Profil: paths.profile, 'Profil Pengguna': paths.profile, Notifications: paths.notifications, Notifikasi: paths.notifications, Overview: paths.dashboard, Utama: paths.dashboard, Laporan: paths.reports, Team: paths.teamRoster, Roster: paths.teamRoster, Ticket: paths.tickets, 'Log shift': paths.shiftLog, ...Object.fromEntries(navItems.map(item => [item.label, item.path])) };
export const pathForLabel = (label: string) => labels[label] ?? paths.dashboard;
export const isActivePath = (pathname: string, path: string) => pathname === path || pathname.startsWith(`${path}/`);
export const pageLabel = (pathname: string) => Object.entries(labels).find(([label, path]) => isActivePath(pathname, path) && !['Profil', 'Profil Pengguna', 'Notifikasi', 'Overview', 'Utama', 'Laporan', 'Team', 'Roster', 'Ticket', 'Log shift'].includes(label))?.[0] ?? 'Dashboard';
export function detailId(pathname: string, base: string, reserved: readonly string[] = []) {
  if (!pathname.startsWith(`${base}/`)) return null;
  const tail = pathname.slice(base.length + 1);
  if (reserved.includes(tail)) return null;
  try { return decodeURIComponent(tail); } catch { return null; }
}
const unsafe = (value: string) => [...value].some(c => c === "\\" || c.charCodeAt(0) <= 32);
export function safeNext(value: string | null | undefined, allowLogin = false) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || unsafe(value)) return paths.dashboard;
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith('//') || unsafe(decoded)) return paths.dashboard;
    const url = new URL(value, 'https://internal.invalid');
    if (url.origin !== 'https://internal.invalid' || (!allowLogin && isActivePath(url.pathname, paths.login))) return paths.dashboard;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return paths.dashboard; }
}
export const titles: Record<string, string> = { [paths.dashboard]: 'Dashboard', [paths.tickets]: 'Tickets', [paths.escalations]: 'Escalations · Tickets', [paths.monitoring]: 'Monitoring', [paths.monitoringHistory]: 'History · Monitoring', [paths.shiftLog]: 'Shift Log', [paths.reports]: 'Reports', [paths.ticketLog]: 'Ticket log · Reports', [paths.monitoringLog]: 'Monitoring log · Reports', [paths.pdfPreview]: 'Pratinjau PDF · Reports', [paths.teamRoster]: 'Team Roster', [paths.runbooks]: 'Runbooks', [paths.credentials]: 'Akses & Kredensial · Runbooks', [paths.links]: 'Link & Tools · Runbooks', [paths.escalation]: 'Kontak Eskalasi · Runbooks', [paths.notifications]: 'Notifications', [paths.profile]: 'Profile', [paths.login]: 'Login' };
