import { paths, routes } from "./routes";

/**
 * Where an anonymous visitor goes, or null when the request may continue. Pure, so it can be tested without a server.
 * Only app pages are guarded; /login, /team, /about, /offline and /error stay public.
 */
const APP_PREFIXES = [paths.dashboard, paths.tickets, paths.monitoring, paths.shiftLog, paths.reports, paths.teamRoster, paths.runbooks, paths.notifications, paths.profile, paths.masterData];
const isAppPage = (pathname: string) => APP_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));

export function loginRedirect(pathname: string, search: string, hasSession: boolean, guardOn: boolean): string | null {
  if (!guardOn || hasSession) return null;
  const clean = pathname.toLowerCase().replace(/\/+$/, "") || "/";
  return isAppPage(clean) ? routes.login(`${pathname}${search}`) : null;
}
