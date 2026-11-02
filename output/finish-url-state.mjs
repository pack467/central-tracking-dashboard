import {readFileSync as read,writeFileSync as write} from 'node:fs';
const root='frontend/app/';
const edit=(p,fn)=>write(root+p,fn(read(root+p,'utf8').replaceAll('\r\n','\n')));
edit('lib/query-state.ts',s=>s.replace("verdict: choice(['all', 'ok', 'nok', 'adequate', 'not-adequate'], 'all')", "verdict: choice(['all', 'ok', 'nok'], 'all')").replace("category: choice(['All', 'Monitoring', 'Incident', 'Handover', 'Maintenance', 'General'], 'All'), project: optionalChoice([])", "category: choice(['All', 'Monitoring', 'Incident', 'Handover', 'Maintenance', 'General', 'Website', 'VPN', 'SSH', 'API', 'Dashboard', 'Ticketing', 'Internal', 'Vendor'], 'All'), project: optionalChoice(['EPC Core', 'SM/ActiveMQ', 'B2B', 'USIEM', 'UNEM', 'DM', 'MB'], 'All')"));
edit('components/monitoring/MonitoringHistorySection.tsx',s=> {
  s=s.replace('"use client";', '"use client";\nimport { useUrlQuery, useUrlSearch } from "@/app/hooks/useUrlQuery";\nimport { monitoringSchema } from "@/app/lib/query-state";\nimport { getClientProjects } from "@/app/lib/clientData";\nimport { CLIENT_MONITORING_SYSTEMS } from "@/app/components/dashboard/MonitoringSchedule";');
  s=s.replace('  const [searchQuery, setSearchQuery] = useState("");', '  const schema = useMemo(() => monitoringSchema(getClientProjects(activeClientId).map(p => p.name), CLIENT_MONITORING_SYSTEMS[activeClientId] ?? CLIENT_MONITORING_SYSTEMS.tritronik), [activeClientId]);\n  const url = useUrlQuery(schema);\n  const searchDraft = useUrlSearch(url.values.q, url.field("q"));\n  const searchQuery = searchDraft.effective;\n  const setSearchQuery = searchDraft.set;').replace('value={searchQuery}','value={searchDraft.input}');
  for(const [n,set,k,h] of [['verdictFilter','setVerdictFilter','verdict'],['dateFilter','setDateFilter','date'],['pageSize','setPageSize','size'],['currentPage','setCurrentPage','page','push']])s=s.replace(new RegExp(`  const \\[${n}, ${set}\\] = useState[^;]+;`),`  const ${n} = url.values.${k};\n  const ${set} = url.field("${k}", "${h??'replace'}");`);
  s=s.replace(/  useEffect\(\(\) => \{\n    setCurrentPage\(1\);\n  \}, \[searchQuery[^;]+;/,'').replace(/^[ \t]*setCurrentPage\(1\);\n/gm,'');
  return s;
});
for(const p of ['components/runbooks/CredentialsSection.tsx','components/runbooks/LinksToolsSection.tsx','components/runbooks/EscalationSection.tsx'])edit(p,s=> {
  s=s.replace('"use client";', '"use client";\nimport { useUrlQuery } from "@/app/hooks/useUrlQuery";\nimport { runbooksSchema } from "@/app/lib/query-state";');
  if(p.includes('Escalation'))s=s.replace('  const [projectFilter, setProjectFilter] = useState<string>("All");','  const url = useUrlQuery(runbooksSchema);\n  const projectFilter = url.values.project;\n  const setProjectFilter = url.field("project");');
  else s=s.replace(/  const \[catFilter, setCatFilter\] = useState[^;]+;/,'  const url = useUrlQuery(runbooksSchema);\n  const catFilter = url.values.category;\n  const setCatFilter = url.field("category");');
  return s;
});
edit('components/views/RunbooksView.tsx',s=>s.replace('const [sopEntries, setSopEntries]','const [sopEntries, setSopEntries, sopReady]').replace('            entries={sopEntries}','            entries={sopEntries}\n            dataReady={sopReady}'));
edit('components/runbooks/SopSection.tsx',s=>s.replace('interface SopSectionProps {','interface SopSectionProps {\n  dataReady?: boolean;').replace('  entries,\n  search,','  entries,\n  dataReady = true,\n  search,').replace('{routeId && !expandedId &&','{dataReady && routeId && !expandedId &&').replace('  const catFilter = url.values.category;','  const catFilter = url.values.category;'));
edit('components/layout/ShiftTransitionBadge.tsx',s=> {
  s=s.replace('"use client";', '"use client";\nimport Link from "next/link";\nimport { paths } from "@/app/lib/routes";');
  return s.replace(/<button\b[\s\S]*?<\/button>/g,b=>b.includes('onClick={handleOpenRoster}')?b.replace('<button','<Link href={paths.teamRoster}').replace('</button>','</Link>').replace('type="button"','').replace('onClick={handleOpenRoster}','onClick={() => setIsOpen(false)}'):b);
});
edit('components/search/CommandPalette.tsx',s=> {
  s=s.replace('"use client";', '"use client";\nimport Link from "next/link";\nimport { routes, pathForLabel } from "@/app/lib/routes";');
  return s.replace(/<button\b[\s\S]*?<\/button>/g,b=>b.includes('command-item-nav')||b.includes('command-item-ticket')?b.replace('<button',`<Link href={${b.includes('command-item-nav')?'pathForLabel(result.navLabel ?? result.label)':'routes.ticket(result.ticket.id)'}}`).replace('</button>','</Link>').replace('type="button"','').replace('onClick={() => activate(result)}','onClick={onClose}'):b);
});
// Recovery and public-page links share the canonical dashboard destination.
for(const p of ['components/ErrorState.tsx','components/ui/AppSplash.tsx','lib/error-content.ts','team/page.tsx'])edit(p,s=> {
  const pref=s.startsWith('"use client";')?'"use client";':'import';
  s=s.replace(pref,pref==='import'?'import { paths } from "@/app/lib/routes";\nimport':'"use client";\nimport { paths } from "@/app/lib/routes";');
  return s.replaceAll('href="/"','href={paths.dashboard}').replaceAll('window.location.href = "/"','window.location.href = paths.dashboard').replaceAll('href: "/"','href: paths.dashboard').replaceAll('href: "/login"','href: paths.login');
});
