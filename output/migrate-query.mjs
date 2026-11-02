import { readFileSync as read, writeFileSync as write, mkdirSync as mkdir } from 'node:fs';
const root='frontend/app/';
const edit=(p,fn)=> { let s=read(root+p,'utf8').replaceAll('\r\n','\n'); mkdir(('output/routing/source-before/'+p).slice(0,('output/routing/source-before/'+p).lastIndexOf('/')),{recursive:true}); write('output/routing/source-before/'+p,s); write(root+p,fn(s)); };
const imports=(s,schema)=>s.replace('"use client";','"use client";\nimport Link from "next/link";\nimport { usePathname, useRouter, useSearchParams } from "next/navigation";\nimport { useUrlQuery, useUrlSearch } from "@/app/hooks/useUrlQuery";\nimport { '+schema+' } from "@/app/lib/query-state";\nimport { paths, routes, withQuery, reportPaths, runbookPaths, detailId } from "@/app/lib/routes";');
const field=(s,name,setter,key,history='replace')=>s.replace(new RegExp(`  const \\[${name}, ${setter}\\] = useState[^;]+;`),`  const ${name} = url.values.${key};\n  const ${setter} = url.field("${key}", "${history}");`);
edit('lib/auth.tsx',s=>s.replace('  user: AuthUser | null;','  user: AuthUser | null;\n  ready: boolean;').replace('  const [token, setToken]', '  const [ready, setReady] = useState(false);\n  const [token, setToken]').replace('    } catch {\n      setUser(DEFAULT_OPERATOR);\n    }','    } catch {\n      setUser(DEFAULT_OPERATOR);\n    } finally { setReady(true); }').replace('        user,\n','        user,\n        ready,\n'));
edit('layout.tsx',s=>s.replace('    title,\n    description,','    title: { default: title, template: "%s · Central Tracking Dashboard" },\n    robots: { index: false, follow: false },\n    description,'));
edit('components/views/TicketsView.tsx',s=> {
  s=imports(s,'ticketsSchema');
  s=s.replace('  // Main view tab', '  const schema = useMemo(() => ticketsSchema([...new Set(tickets.map(t => t.project))]), [tickets]);\n  const url = useUrlQuery(schema);\n  const router = useRouter();\n  // Main view tab');
  s=s.replace('  const [activeTab, setActiveTab] = useState<MainViewTab>("queue");','  const activeTab: MainViewTab = url.pathname === paths.escalations || url.values.list === "escalations" ? "escalations" : "queue";\n  const setActiveTab = (tab: MainViewTab) => router.push(withQuery(tab === "escalations" ? paths.escalations : paths.tickets, url.query), { scroll: false });');
  for(const [n,set,k,h] of [['statusFilter','setStatusFilter','status'],['dateFilter','setDateFilter','date'],['typeFilter','setTypeFilter','type'],['priorityFilter','setPriorityFilter','priority'],['projectFilter','setProjectFilter','project'],['shiftFilter','setShiftFilter','shift'],['sort','setSort','sort'],['pageSize','setPageSize','size'],['currentPage','setCurrentPage','page','push']]) s=field(s,n,set,k,h);
  s=s.replace('  const [search, setSearch] = useState("");','  const searchDraft = useUrlSearch(url.values.q, url.field("q"));\n  const search = searchDraft.effective;\n  const setSearch = searchDraft.set;').replace('value={search}','value={searchDraft.input}');
  s=s.replace(/  useEffect\(\(\) => \{\n    setCurrentPage\(1\);\n  \}, \[search[^;]+;/,'');
  // Existing multi-action reset composes into one URL operation via the hook.
  return s;
});
edit('components/views/ReportsView.tsx',s=> {
  s=imports(s,'reportsSchema');
  s=s.replace('type ReportTab = "summary" | "tickets" | "monitoring" | "preview";', 'type ReportTab = "summary" | "tickets" | "monitoring" | "preview";');
  const a=s.indexOf('  const [periods,'); const b=s.indexOf('  const [showSettings',a);
  s=s.slice(0,a)+`  const schema = useMemo(() => reportsSchema(addDays(latest, -6), latest, [...new Set([...getClientProjects(activeClientId).map(p => p.name), ...tickets.map(t => t.project), ...monitoring.map(m => m.project)])]), [latest, activeClientId, tickets, monitoring]);
  const url = useUrlQuery(schema);
  const period: ReportPeriod = { start: url.values.from, end: url.values.to };
  const project = url.values.project;
  const tab: ReportTab = (Object.keys(reportPaths) as ReportTab[]).find(key => reportPaths[key] === url.pathname) ?? "summary";
`+s.slice(b);
  s=field(s,'logPage','setLogPage','page','push');
  s=s.replace('  const [logQuery, setLogQuery] = useState("");','  const logSearch = useUrlSearch(url.values.q, url.field("q"));\n  const logQuery = logSearch.effective;\n  const setLogQuery = logSearch.set;').replace('value={logQuery}','value={logSearch.input}');
  s=s.replace('setPeriods((prev) => ({ ...prev, [activeClientId]: next }));\n    setLogPage(1);','url.update({ from: next.start || schema.from.default, to: next.end || schema.to.default, page: 1 });');
  s=s.replace('setProjects((prev) => ({ ...prev, [activeClientId]: event.target.value }));\n              setLogPage(1);','url.update({ project: event.target.value, page: 1 });');
  const start=s.indexOf('              <button\n                key={item.id}'); const end=s.indexOf('              </button>',start);
  let tab=s.slice(start,end+'              </button>'.length).replace('<button','<Link').replace('</button>','</Link>').replace(/                onClick=\{\(\) => \{[\s\S]+?                \}\}/,'                href={routes.reports.tab(item.id, url.query)}\n                scroll={false}');
  s=s.slice(0,start)+tab+s.slice(end+'              </button>'.length);
  return s;
});
edit('components/views/MonitoringView.tsx',s=> {
  s=imports(s,'monitoringSchema');
  s=s.replace('  const activeShift =', '  const schema = useMemo(() => monitoringSchema(projects.map(p => p.name), [...new Set(schedule.map(e => e.system).filter(Boolean))] as string[]), [projects, schedule]);\n  const url = useUrlQuery(schema);\n  const router = useRouter();\n  const activeShift =');
  s=s.replace('  const [activeTab, setActiveTab] = useState<"live" | "history">("live");','  const activeTab = url.pathname === paths.monitoringHistory ? "history" : "live";\n  const setActiveTab = (tab: "live" | "history") => router.push(withQuery(tab === "history" ? paths.monitoringHistory : paths.monitoring, url.query), { scroll: false });');
  s=s.replace('  const [selectedProject, setSelectedProject] = useState<string | null>(null);','  const selectedProject = url.values.project || null;\n  const setSelectedProject = (value: string | null) => url.update({ project: value ?? "" });');
  s=field(s,'statusFilter','setStatusFilter','health');
  s=s.replace(/  useEffect\(\(\) => \{\n    setSelectedProject\(null\);\n  \}, \[activeClientId\]\);/,'');
  s=s.replace('        onSelectProject={setSelectedProject}','        onSelectProject={setSelectedProject}\n        selectedSystem={url.values.system || null}\n        onSelectSystem={value => url.update({ system: value ?? "" })}\n        selectedStatus={url.values.status}\n        onSelectStatus={value => url.update({ status: value })}');
  return s;
});
edit('components/dashboard/MonitoringSchedule.tsx',s=>s.replace('interface MonitoringScheduleProps {','interface MonitoringScheduleProps {\n  selectedStatus?: MonitoringFilter;\n  onSelectStatus?: (value: MonitoringFilter) => void;').replace('  showFilter = true,','  selectedStatus,\n  onSelectStatus,\n  showFilter = true,').replace('  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Semua");','  const [localFilter, setLocalFilter] = useState<(typeof FILTERS)[number]>("Semua");\n  const filter = selectedStatus ?? localFilter;\n  const setFilter = (value: MonitoringFilter) => { if (onSelectStatus) onSelectStatus(value); else setLocalFilter(value); };'));
edit('components/views/TeamRosterView.tsx',s=> {
  s=imports(s,'rosterSchema');
  s=s.replace('  const activeShift =', '  const url = useUrlQuery(rosterSchema);\n  const router = useRouter();\n  const activeShift =');
  s=s.replace('  const [search, setSearch] = useState("");','  const searchDraft = useUrlSearch(url.values.q, url.field("q"));\n  const search = searchDraft.effective;\n  const setSearch = searchDraft.set;').replace('value={search}','value={searchDraft.input}');
  for(const [n,set,k] of [['roleFilter','setRoleFilter','role'],['statusFilter','setStatusFilter','status'],['shiftFilter','setShiftFilter','shift']]) s=field(s,n,set,k);
  s=s.replace('  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");','  const viewMode = url.values.view === "table" ? "table" : "calendar";\n  const setViewMode = (mode: "table" | "calendar") => url.update({ view: mode === "table" ? "table" : "weekly", page: 1 }, "push");');
  s=s.replace('  const [selectedMember, setSelectedMember] = useState<RosterMember | null>(null);','  const selectedId = detailId(url.pathname, paths.teamRoster);\n  const selectedMember = derivedMembers.find(m => m.id.toLowerCase() === selectedId?.toLowerCase()) ?? null;\n  const closeMember = () => router.push(routes.teamRoster(url.query), { scroll: false });');
  s=s.replace('    setSelectedMember(member);','    router.push(routes.member(member.id, url.query), { scroll: false });').replace('  }, [markOverlayLoaded]);\n\n  const openSwap','  }, [markOverlayLoaded, router, url.query]);\n\n  const openSwap');
  s=s.replace('    setSelectedMember((prev) => (prev?.id === savedMember.id ? savedMember : prev));','');
  s=s.replace('{loadedOverlays.memberDetail && (','{selectedMember && (').replace('onClose={() => setSelectedMember(null)}','onClose={closeMember}');
  s=s.replace('      {/* Drawers & modals', '      {selectedId && !selectedMember && <DetailNotFound title="Anggota tidak ditemukan" href={routes.teamRoster(url.query)} />}\n      {/* Drawers & modals');
  s=s.replace('import Link from','import { DetailNotFound } from "@/app/components/routing/RouteEffects";\nimport Link from');
  return s;
});
for(const p of ['components/team/RosterTable.tsx','components/team/RosterCalendarView.tsx']) edit(p,s=> {
  s=imports(s,'rosterSchema, weekStart, isoWeek');
  const fn=p.includes('RosterTable')?'export function RosterTable':'export function RosterCalendarView';
  const pos=s.indexOf('\n',s.indexOf(fn));
  s=s.slice(0,pos)+ '\n  const url = useUrlQuery(rosterSchema);'+s.slice(pos);
  s=field(s,'currentPage','setCurrentPage','page','push'); s=field(s,'pageSize','setPageSize','size');
  s=s.replace(/  useEffect\(\(\) => \{\n    setCurrentPage\(1\);\n  \}, \[members\]\);/,'');
  const a=s.indexOf('  const [prevMembers,'); if(a>=0) { const b=s.indexOf('  const totalCount',a); s=s.slice(0,a)+s.slice(b); }
  if(p.includes('Calendar')) {
    s=s.replace('  const [calMode, setCalMode] = useState<"weekly" | "monthly">("weekly");','  const calMode = url.values.view === "monthly" ? "monthly" : "weekly";\n  const setCalMode = (mode: "weekly" | "monthly") => url.update({ view: mode, page: 1 }, "push");');
    s=s.replace('  const [weekOffset, setWeekOffset] = useState(0);','  const weekOffset = Math.round((weekStart(url.values.week).getTime() - weekStart(rosterSchema.week.default).getTime()) / 604800000);\n  const setWeekOffset = (next: number | ((old: number) => number)) => {\n    const offset = typeof next === "function" ? next(weekOffset) : next;\n    url.update({ week: isoWeek(new Date(weekStart(rosterSchema.week.default).getTime() + offset * 604800000)) }, "push");\n  };');
    s=s.replace('  const [monthDate, setMonthDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));','  const monthDate = useMemo(() => new Date(`${url.values.month}-01T12:00:00`), [url.values.month]);\n  const setMonthDate = (next: Date | ((old: Date) => Date)) => { const date = typeof next === "function" ? next(monthDate) : next; url.update({ month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` }, "push"); };');
    const a=s.indexOf('  const weekDays = ['); const b=s.indexOf('\n\n',a);
    s=s.slice(0,a)+`  const weekDays = Array.from({ length: 7 }, (_, dow) => {
    const d = new Date(weekStart(url.values.week).getTime() + dow * 86400000);
    return { short: DOW_LABELS[dow], date: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" }), dow, isToday: d.toISOString().slice(0,10) === "2026-08-28" };
  });`+s.slice(b);
    s=s.replace('Week 34 · 24 Aug – 30 Aug 2026','{url.values.week === rosterSchema.week.default ? "Week 34 · 24 Aug – 30 Aug 2026" : `Week ${Number(url.values.week.slice(-2))} · ${weekDays[0].date} – ${weekDays[6].date} ${url.values.week.slice(0,4)}`}');
  }
  return s;
});
edit('components/views/RunbooksView.tsx',s=> {
  s=imports(s,'runbooksSchema');
  s=s.replace('  const [activeTab, setActiveTab] = useState<RunbookTab>("sop");','  const url = useUrlQuery(runbooksSchema);\n  const activeTab = (Object.keys(runbookPaths) as RunbookTab[]).find(key => runbookPaths[key] === url.pathname) ?? "sop";');
  s=s.replace('  const [search, setSearch] = useState("");','  const searchDraft = useUrlSearch(url.values.q, url.field("q"));\n  const search = searchDraft.effective;\n  const setSearch = searchDraft.set;').replace('value={search}','value={searchDraft.input}');
  s=s.replace(/  const switchTab = useCallback\([\s\S]*?  \}, \[\]\);/,'');
  const a=s.indexOf('            <button\n              key={key}'); const b=s.indexOf('            </button>',a);
  const t=s.slice(a,b+'            </button>'.length).replace('<button','<Link').replace('</button>','</Link>').replace('              type="button"','              href={withQuery(runbookPaths[key], url.query)}\n              scroll={false}').replace('              onClick={() => switchTab(key)}','');
  return s.slice(0,a)+t+s.slice(b+'            </button>'.length);
});
edit('components/runbooks/SopSection.tsx',s=> {
  s=imports(s,'runbooksSchema');
  s=s.replace('  const [expandedId, setExpandedId] = useState<string | null>(null);','  const url = useUrlQuery(runbooksSchema);\n  const router = useRouter();\n  const routeId = detailId(url.pathname, paths.runbooks, ["credentials", "links", "escalation"]);\n  const expandedId = entries.find(e => e.id.toLowerCase() === routeId?.toLowerCase())?.id ?? null;\n  const setExpandedId = (next: string | null | ((old: string | null) => string | null)) => { const id = typeof next === "function" ? next(expandedId) : next; router.push(id ? routes.runbook(id, url.query) : withQuery(paths.runbooks, url.query), { scroll: false }); };');
  s=field(s,'catFilter','setCatFilter','category');
  s=s.replace('  const toggleExpanded = useCallback(', '  const toggleExpanded = (');
  s=s.replace('    [],\n  );','  );');
  // Missing detail has the same overlay convention as the other list details.
  s=s.replace('import Link from','import { DetailNotFound } from "@/app/components/routing/RouteEffects";\nimport Link from');
  s=s.replace('  return (\n    <>','  return (\n    <>\n      {routeId && !expandedId && <DetailNotFound title="Runbook tidak ditemukan" href={withQuery(paths.runbooks, url.query)} />}');
  return s;
});
edit('components/views/NotificationsView.tsx',s=> {
  s=imports(s,'notificationsSchema');
  s=s.replace('  const [search, setSearch] = useState("");','  const url = useUrlQuery(notificationsSchema);\n  const searchDraft = useUrlSearch(url.values.q, url.field("q"));\n  const search = searchDraft.effective;\n  const setSearch = searchDraft.set;').replace('value={search}','value={searchDraft.input}');
  for(const [n,set,k,h] of [['dateFilter','setDateFilter','date'],['statusFilter','setStatusFilter','status'],['categoryFilter','setCategoryFilter','category'],['sortBy','setSortBy','sort'],['currentPage','setCurrentPage','page','push'],['pageSize','setPageSize','size']]) s=field(s,n,set,k,h);
  s=s.replace(/  useEffect\(\(\) => \{\n    setCurrentPage\(1\);\n  \}, \[[^\]]+\]\);/g,'');
  return s;
});
edit('components/views/ShiftLogView.tsx',s=> {
  s=imports(s,'shiftLogSchema');
  s=s.replace('  const [pageSize,', '  const url = useUrlQuery(shiftLogSchema);\n  const [pageSize,');
  s=field(s,'pageSize','setPageSize','size'); s=field(s,'currentPage','setCurrentPage','page','push');
  s=s.replace(/  useEffect\(\(\) => \{\n    setCurrentPage\(1\);\n  \}, \[workflow.filters[^;]+;/,'');
  return s;
});
// Shift filters feed the existing fetch hook directly. PICs deliberately remain
// private memory state; names have never been serialized into navigable URLs.
edit('hooks/useHandoverWorkflow.ts',s=> {
  s=s.replace('import { useToast }', 'import { usePathname } from "next/navigation";\nimport { useUrlQuery } from "@/app/hooks/useUrlQuery";\nimport { shiftLogSchema } from "@/app/lib/query-state";\nimport { paths } from "@/app/lib/routes";\nimport { useToast }');
  // A shell hook must not canonicalize other pages with the shift-log schema.
  s=s.replace('  const [filters, setFilters] = useState({ date: "", shift: "", pic: "" });', '  const [privateFilters, setPrivateFilters] = useState({ date: "", shift: "", pic: "" });\n  const pathname = usePathname();\n  const query = useUrlQuery(shiftLogSchema, pathname === paths.shiftLog);\n  const filters = useMemo(() => pathname === paths.shiftLog ? { date: query.values.date, shift: query.values.shift, pic: privateFilters.pic } : privateFilters, [pathname, query.values.date, query.values.shift, privateFilters]);\n  const setFilters = (next: typeof privateFilters) => { setPrivateFilters(next); if (pathname === paths.shiftLog) query.update({ date: next.date, shift: next.shift, page: 1 }); };');
  return s;
});
