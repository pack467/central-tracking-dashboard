import {readFileSync as read, writeFileSync as write, mkdirSync as mkdir} from 'node:fs';
const root='frontend/app/';
const edit=(p,fn)=> { let s=read(root+p,'utf8').replaceAll('\r\n','\n'); const backup='output/routing/source-before/'+p; mkdir(backup.slice(0,backup.lastIndexOf('/')),{recursive:true});write(backup,s);write(root+p,fn(s)); };
const imports=s=>s.replace('"use client";', '"use client";\nimport { paths, routes, pathForLabel, isActivePath } from "@/app/lib/routes";\nimport { usePathname } from "next/navigation";')+(s.includes('import Link from')?'':'');
// Operate on whole button blocks, preserving every class, role and data attribute.
const buttons=(s,fn)=>s.replace(/<button\b[\s\S]*?<\/button>/g,fn);
const link=(s,href,click='')=>s.replace('<button','<Link').replace('</button>','</Link>').replace(/\s+type="button"/,'').replace(/\s+onClick=\{[\s\S]*?\}\}(?=\s*(?:[\w-]+=|>))/,'').replace(/\s+onClick=\{\w+\}/,'').replace('<Link',`<Link href={${href}}${click?' onClick={'+click+'}':''}`);
edit('components/layout/Sidebar.tsx',s=> {
  s=imports(s);
  const a=s.indexOf('export interface NavItemConfig'); const b=s.indexOf('export type UserPresenceStatus',a);
  s=s.slice(0,a)+'export { operationalNavItems, managementNavItems, navItems } from "@/app/lib/routes";\nimport { navItems } from "@/app/lib/routes";\n'+s.slice(b);
  s=s.replace('  const notify = useToast();','  const pathname = usePathname();\n  const notify = useToast();');
  s=s.replace('const isActive = isItemActive(item.label);','const isActive = isActivePath(pathname, item.path);');
  s=buttons(s,b=> {
    if(b.includes('onNavigate(item.label)')) return link(b,'item.path').replace('title={item.label}','aria-current={isActive ? "page" : undefined}\n              title={item.label}');
    if(b.includes('onNavigate("Runbooks")')) return link(b,'paths.runbooks').replace('title="Runbooks"','aria-current={isActivePath(pathname, paths.runbooks) ? "page" : undefined}\n          title="Runbooks"');
    if(b.includes('onNavigate("Profile")')) return link(b,'paths.profile',b.includes('setProfileMenuOpen(false)')?'() => setProfileMenuOpen(false)':'').replace('title="Buka Halaman Profil Pengguna"','aria-current={isActivePath(pathname, paths.profile) ? "page" : undefined}\n            title="Buka Halaman Profil Pengguna"');
    return b;
  });
  s=s.replace('href="/team"','href={paths.team}').replace('window.location.href = "/login"','window.location.href = paths.login');
  return s;
});
edit('components/layout/MobileNav.tsx',s=> {
  s=imports(s).replace('"use client";','"use client";\nimport Link from "next/link";');
  s=s.replace('  const [userStatus,','  const pathname = usePathname();\n  const [userStatus,');
  s=s.replace('const isActive = isItemActive(item.label);','const isActive = isActivePath(pathname, item.path);');
  s=buttons(s,b=> {
    if(b.includes('onNavigate(item.label)')) return link(b,'item.path','onClose').replace('key={item.label}','key={item.label}\n                aria-current={isActive ? "page" : undefined}');
    if(b.includes('onNavigate("Runbooks")')) return link(b,'paths.runbooks','onClose').replace('<Link','<Link aria-current={activeNav === "Runbooks" ? "page" : undefined}');
    if(b.includes('onNavigate("Profile")')) return link(b,'paths.profile','onClose');
    return b;
  });
  return s;
});
for(const p of ['components/views/TicketsView.tsx','components/views/MonitoringView.tsx']) edit(p,s=>buttons(s,b=>{
  const m=b.match(/onClick=\{\(\) => (?:setActiveTab|handleTabChange)\("(\w+)"\)\}/);
  if(!m) return b;
  const path={queue:'paths.tickets', escalations:'paths.escalations',live:'paths.monitoring',history:'paths.monitoringHistory'}[m[1]];
  return b.replace('<button',`<Link href={withQuery(${path}, url.query)} scroll={false}`).replace('</button>','</Link>').replace('          type="button"\n','').replace(m[0],'');
}));
edit('components/layout/NotificationDropdown.tsx',s=>{
  s=imports(s).replace('"use client";','"use client";\nimport Link from "next/link";');
  return buttons(s,b=>b.includes('onClick={handleViewAll}')?link(b,'paths.notifications','() => setIsOpen(false)'):b);
});
edit('components/layout/ShiftCoveragePanel.tsx',s=>{
  s=imports(s).replace('"use client";','"use client";\nimport Link from "next/link";');
  return buttons(s,b=>b.includes('onNavigateToRoster();')?link(b,'paths.teamRoster','() => { if (window.innerWidth <= 940) onToggle(); }'):b);
});
edit('components/views/ProfileView.tsx',s=>{
  s=imports(s).replace('"use client";','"use client";\nimport Link from "next/link";');
  return buttons(s,b=>b.includes('onNavigateToShiftSwap();')?link(b,'paths.teamRoster'):b);
});
edit('components/auth/LoginView.tsx',s=> {
  s=imports(s).replace('import { useRouter } from "next/navigation";','import { useRouter, useSearchParams } from "next/navigation";').replace('import { paths, routes, pathForLabel, isActivePath }','import { paths, routes, pathForLabel, isActivePath, safeNext }');
  s=s.replace('  const router = useRouter();','  const router = useRouter();\n  const next = useSearchParams().get("next");');
  s=s.replaceAll('router.push("/team?from=/login")','router.push(routes.publicTeam())').replace('href="/team?from=/login"','href={routes.publicTeam()}').replace('window.location.href = onSuccessRedirect','window.location.href = safeNext(next ?? onSuccessRedirect)');
  return s;
});
edit('components/team/TeamBackButton.tsx',s=>s.replace('import { ArrowLeft }','import { paths, safeNext } from "@/app/lib/routes";\nimport { ArrowLeft }').replace('router.push(fromParam)','router.push(safeNext(fromParam))').replace('router.push("/")','router.push(paths.dashboard)'));
// No progress for same-path filters or history entries. Programmatic navigation
// signals are also observed so opening details completes promptly.
edit('components/ui/RouteProgress.tsx',s=>s.replace('if (url.pathname === window.location.pathname && url.search === window.location.search) return;','if (url.pathname === window.location.pathname) return;').replace('    const handlePopState = () => {\n      startNavigation();\n    };','    let lastPath = window.location.pathname;\n    const handlePopState = () => {\n      if (window.location.pathname !== lastPath) startNavigation();\n      lastPath = window.location.pathname;\n    };').replace('      const target =','      lastPath = window.location.pathname;\n      const target ='));
edit('login/page.tsx',s=>'import type { Metadata } from "next";\nimport { Suspense } from "react";\nimport { AuthProvider } from "@/app/lib/auth";\nimport { ToastProvider } from "@/app/components/ui/Toast";\nimport { LoginView } from "@/app/components/auth/LoginView";\nimport { paths } from "@/app/lib/routes";\nexport const metadata: Metadata = { title: "Login" };\nexport default function LoginPage() { return <Suspense fallback={null}><AuthProvider><ToastProvider><LoginView onSuccessRedirect={paths.dashboard} /></ToastProvider></AuthProvider></Suspense>; }\n');
