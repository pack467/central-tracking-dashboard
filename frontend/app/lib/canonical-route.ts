import { paths, reportPaths, pathForLabel } from './routes';

/** Raw-request canonicalization also runs before vinext's slash normalizer. */
export function canonicalRoute(input: URL) {
  const url = new URL(input);
  const original = url.pathname;
  if (/^\/(?:api|_next|_vinext|@|__)/i.test(original) || /\.[a-z0-9]+$/i.test(original)) return null;
  let path = original.toLowerCase().replace(/\/+$/, '') || '/';
  if (path === '/monitor') path = paths.monitoring;
  if (path === '/reports/overview') path = paths.reports;
  const legacy = url.searchParams.get('nav') ?? (path === '/' ? url.searchParams.get('tab') ?? url.searchParams.get('page') : null);
  if (legacy && !/^\d+$/.test(legacy)) {
    const names: Record<string, string> = { dashboard: 'Dashboard', tickets: 'Tickets', monitoring: 'Monitoring', reports: 'Reports', profile: 'Profile', profil: 'Profile', 'team-roster': 'Team Roster', 'shift-log': 'Shift Log', runbooks: 'Runbooks', notifications: 'Notifications' };
    if (names[legacy.toLowerCase()]) path = pathForLabel(names[legacy.toLowerCase()]);
    url.searchParams.delete('nav'); url.searchParams.delete('tab'); url.searchParams.delete('page');
  }
  if (path === paths.reports && url.searchParams.has('tab')) {
    const tab = url.searchParams.get('tab')!;
    const aliases: Record<string, keyof typeof reportPaths> = { summary: 'summary', overview: 'summary', tickets: 'tickets', 'ticket-log': 'tickets', monitoring: 'monitoring', 'monitoring-log': 'monitoring', preview: 'preview', 'pdf-preview': 'preview' };
    path = reportPaths[aliases[tab.toLowerCase()] ?? 'summary'];
    url.searchParams.delete('tab');
  }
  if (path === '/') path = paths.dashboard;
  url.pathname = path;
  return url.pathname !== original || url.search !== input.search ? { url, status: original === '/' ? 307 : 308 } : null;
}
