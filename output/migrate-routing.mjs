import { readFileSync as read, writeFileSync as write, mkdirSync as mkdir, renameSync as move } from 'node:fs';
const root = 'frontend/app/';
const save = (path, value) => { mkdir(path.slice(0, path.lastIndexOf('/')), {recursive:true}); write(path, value); };
const edit = (path, fn) => { const file = root + path; const old = read(file, 'utf8'); save('output/routing/source-before/' + path, old); write(file, fn(old)); };
const original = read(root + 'page.tsx','utf8');
save('output/routing/source-before/page.tsx', original);
let shell = original.replace('lazy, startTransition, Suspense,', 'lazy, createContext, useContext, Suspense,');
shell = shell.replace('export default function Home() {', 'export function AppShell({ children }: { children: React.ReactNode }) {').replace('<Dashboard />', '<DashboardShell>{children}</DashboardShell>');
shell = shell.replace('export function Dashboard({ initialNav = "Dashboard" }: { initialNav?: string }) {', 'function useShellState() {\n  const pathname = usePathname();\n  const searchParams = useSearchParams();\n  const router = useRouter();\n  const activeNav = pageLabel(pathname);');
const navStart = shell.indexOf('  const [activeNav, setActiveNav]');
const navEnd = shell.indexOf('  const [tickets, setTickets]',navStart);
shell = shell.slice(0,navStart) + shell.slice(navEnd);
shell = shell.replace('const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);', 'const selectedTicketId = detailId(pathname, paths.tickets, ["escalations"]);\n  const closeTicket = useCallback(() => router.push(withQuery(searchParams.get("list") === "escalations" ? paths.escalations : paths.tickets, searchParams.toString()), { scroll: false }), [router, searchParams]);');
shell = shell.replace('const [tickets, setTickets]', 'const [tickets, setTickets, ticketsReady]');
shell = shell.replace('ticket.id === selectedTicketId', 'ticket.id.toLowerCase() === selectedTicketId?.toLowerCase()');
const keyStart = shell.indexOf('  const pageKey = useMemo(');
const keyEnd = shell.indexOf('  const handleAssess',keyStart);
shell = shell.slice(0,keyStart) + '  const pageKey = pathname.split("/")[1];\n  const handleNavigate = useCallback((label: string) => router.push(pathForLabel(label)), [router]);\n\n' + shell.slice(keyEnd);
shell = shell.replace('    setSelectedTicketId(ticket.id);', '    const query = new URLSearchParams(pathname.startsWith(paths.tickets) ? searchParams.toString() : "");\n    if (pathname === paths.escalations) query.set("list", "escalations");\n    router.push(routes.ticket(ticket.id, query.toString()), { scroll: false });').replace('[markOverlayLoaded]);\n\n  const openTicketCreate', '[markOverlayLoaded, pathname, router, searchParams]);\n\n  const openTicketCreate');
shell = shell.replace('setSelectedTicketId(null);', 'if (selectedTicketId) closeTicket();').replace('  }, []);\n\n  const handoverPendingCount', '  }, [selectedTicketId, closeTicket]);\n\n  const handoverPendingCount');
const contentStart = shell.indexOf('            <Suspense fallback={<DashboardViewSkeleton />}>');
const contentEnd = shell.indexOf('            </Suspense>',contentStart) + '            </Suspense>'.length;
shell = shell.slice(0,contentStart) + '            {children}' + shell.slice(contentEnd);
shell = shell.replace('key={pageKey} ', '');
shell = shell.replace('{loadedOverlays.ticketDetail && (', '{selectedTicketId && ticketsReady && (').replace('onClose={() => setSelectedTicketId(null)}', 'onClose={closeTicket}');
shell = shell.replace('onClose={() => if (selectedTicketId) closeTicket()}', 'onClose={closeTicket}');
const markupStart = shell.indexOf('  return (\n    <main');
const stateFields = 'activeNav, pageKey, tickets, setTickets, ticketsReady, clientTickets, assessments, handleAssess, setPendingNoteKey, handleUpdateNote, setGuideOpen, currentHour, handover, members, setMembers, selectTicket, openTicketCreate, handleNavigate, mobileNavOpen, setMobileNavOpen, shiftPanelOpen, setShiftPanelOpen, sidebarCollapsed, setSidebarCollapsed, openTicketCount, searchOpen, setSearchOpen, ticketModalOpen, setTicketModalOpen, loadedOverlays, activeClient, activeClientId, notify, addNotification, selectedTicketId, selectedTicket, closeTicket, pendingNoteKey, pendingEntry, setAssessments, guideOpen';
shell = shell.slice(0,markupStart) + `  return { ${stateFields} };\n}\n\nconst ShellContext = createContext<ReturnType<typeof useShellState> | null>(null);\nexport function useAppData() {\n  const context = useContext(ShellContext);\n  if (!context) throw new Error("Page requires the persistent application shell");\n  return context;\n}\nfunction DashboardShell({ children }: { children: React.ReactNode }) {\n  const state = useShellState();\n  const { ${stateFields} } = state;\n` + shell.slice(markupStart);
shell = shell.replace('    <main className=', '    <ShellContext.Provider value={state}>\n    <main data-shell="persistent" className=').replace('    </main>\n  );','    </main>\n    </ShellContext.Provider>\n  );');
shell = shell.replace('      <Sidebar', '      <RouteEffects />\n      <AuthGuard />\n      <Sidebar');
shell = shell.replace('        {selectedTicketId && ticketsReady && (', '        {selectedTicketId && ticketsReady && !selectedTicket && <DetailNotFound title="Tiket tidak ditemukan" href={withQuery(paths.tickets, searchParamsString())} />}\n        {selectedTicketId && ticketsReady && selectedTicket && (');
shell = shell.replace('searchParamsString()', 'state.closeTicketUrl');
// Keep the list/detail filter URL together; no local selected-ticket navigation state.
shell = shell.replace('  return { activeNav,', '  const closeTicketUrl = withQuery(searchParams.get("list") === "escalations" ? paths.escalations : paths.tickets, searchParams.toString());\n  return { closeTicketUrl, activeNav,');
shell = shell.replace('import { lazy,', 'import { usePathname, useRouter, useSearchParams } from "next/navigation";\nimport { paths, routes, withQuery, pathForLabel, pageLabel, detailId } from "@/app/lib/routes";\nimport { RouteEffects, AuthGuard, DetailNotFound } from "@/app/components/routing/RouteEffects";\nimport { lazy,');
// Page imports belong to the route client, not the persistent shell.
shell = shell.replace(/const (TicketsView|MonitoringView|ShiftLogView|ReportsView|TeamRosterView|ProfileView|NotificationsView|RunbooksView) = lazy\([^\n]+\);\r?\n/g,'').replace('import { OverviewView } from "@/app/components/views/OverviewView";\n','');
save(root + 'components/routing/AppShell.tsx',shell);
save(root + 'page.tsx', 'import { redirect } from "next/navigation";\nimport { paths } from "@/app/lib/routes";\nexport default function Home() { redirect(paths.dashboard); }\n');
// The root template would remount the whole shell. Place it BELOW the shell layout.
mkdir(root + '(app)',{recursive:true});
move(root + 'template.tsx', root + '(app)/template.tsx');
save(root + '(app)/layout.tsx', 'import { Suspense } from "react";\nimport { AppShell } from "@/app/components/routing/AppShell";\nimport { DashboardViewSkeleton } from "@/app/components/ui/LoadingSkeleton";\nexport default function AppLayout({ children }: { children: React.ReactNode }) {\n  return <Suspense fallback={<DashboardViewSkeleton />}><AppShell>{children}</AppShell></Suspense>;\n}\n');
// Existing wrappers are superseded by the shared shell. Preserve them in diagnostic backup.
for (const name of ['reports','profile']) move(root + name + '/page.tsx', 'output/routing/source-before/' + name + '-page.tsx');
const pages = { dashboard:'Dashboard', tickets:'Tickets', 'tickets/escalations':'Escalations · Tickets', 'tickets/[ticketId]':'Detail tiket · Tickets', monitoring:'Monitoring', 'monitoring/history':'History · Monitoring', 'shift-log':'Shift Log', reports:'Reports', 'reports/ticket-log':'Ticket log · Reports', 'reports/monitoring-log':'Monitoring log · Reports', 'reports/pdf-preview':'Pratinjau PDF · Reports', 'team-roster':'Team Roster', 'team-roster/[memberId]':'Detail anggota · Team Roster', runbooks:'Runbooks', 'runbooks/credentials':'Akses & Kredensial · Runbooks', 'runbooks/links':'Link & Tools · Runbooks', 'runbooks/escalation':'Kontak Eskalasi · Runbooks', 'runbooks/[runbookId]':'Detail SOP · Runbooks', notifications:'Notifications', profile:'Profile' };
const layoutLists = ['tickets','reports','team-roster','runbooks'];
for (const [path,title] of Object.entries(pages)) {
  const section = path.split('/')[0];
  const nested = layoutLists.includes(section);
  const pageName = {dashboard:'overview','shift-log':'shiftLog','team-roster':'teamRoster'}[section] || section;
  save(root + `(app)/${path}/page.tsx`, `import type { Metadata } from "next";\n${nested ? '' : 'import { RouteView } from "@/app/components/routing/RouteView";\n'}export const metadata: Metadata = { title: ${JSON.stringify(title)} };\nexport default function Page() { return ${nested ? 'null' : `<RouteView page="${pageName}" />`}; }\n`);
  save(root + `(app)/${path}/loading.tsx`, 'export { default } from "@/app/loading";\n');
}
for (const section of layoutLists) {
  const pageName = section === 'team-roster' ? 'teamRoster' : section;
  save(root + `(app)/${section}/layout.tsx`, `import { Suspense } from "react";\nimport { RouteView } from "@/app/components/routing/RouteView";\nimport { DashboardViewSkeleton } from "@/app/components/ui/LoadingSkeleton";\nexport default function ListLayout({ children }: { children: React.ReactNode }) { return <><Suspense fallback={<DashboardViewSkeleton />}><RouteView page="${pageName}" /></Suspense>{children}</>; }\n`);
}
save(root + '(app)/error.tsx','"use client";\nexport { default } from "@/app/error";\n');
save(root + '(app)/not-found.tsx','export { default } from "@/app/not-found";\n');
// Initial values must agree during SSR and hydration; effects still use live time.
edit('hooks/useLiveClock.ts',s=>s.replace('useState(() => getCurrentHour())','useState(() => getCurrentHour(new Date("2026-08-28T03:00:00Z")))').replace('getShiftInfo(new Date()))','getShiftInfo(new Date("2026-08-28T03:00:00Z")))').replace('getShiftTransitionState(new Date()))','getShiftTransitionState(new Date("2026-08-28T03:00:00Z")))'));
edit('hooks/useLocalStorage.ts',s=>s.replace('const hydrated = useRef(false);','const hydrated = useRef(false);\n  const [ready, setReady] = useState(false);').replace('hydrated.current = true;','hydrated.current = true;\n      setReady(true);').replace('return [value, setValue] as const','return [value, setValue, ready] as const'));
edit('layout.tsx',s=>s.replace('    title,\n    description,','    title: { default: title, template: "%s · Central Tracking Dashboard" },\n    robots: { index: false, follow: false },\n    description,'));
