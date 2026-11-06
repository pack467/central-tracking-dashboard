import { cpSync, mkdirSync, readFileSync, writeFileSync, readdirSync, symlinkSync, existsSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
const root=resolve('frontend'), target=resolve('output/routing/baseline-project');
mkdirSync(target,{recursive:true});
cpSync(root,target,{recursive:true,filter:source=>!relative(root,source).split(/[\\/]/).some(part=>['node_modules','dist','.next','.wrangler','(app)','proxy.ts'].includes(part))});
const saved=resolve('output/routing/source-before');
function overlay(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const source=join(dir,entry.name);if(entry.isDirectory())overlay(source);else if(!['reports-page.tsx','profile-page.tsx'].includes(entry.name)){const dest=join(target,'app',relative(saved,source));mkdirSync(resolve(dest,'..'),{recursive:true});cpSync(source,dest);}}}
overlay(saved);
for(const file of ['app/components/views/TicketsView.tsx','app/components/views/MonitoringView.tsx','app/components/tickets/TicketTable.tsx','app/components/tickets/TicketReportView.tsx','app/components/monitoring/MonitoringHistorySection.tsx','app/components/runbooks/CredentialsSection.tsx','app/components/runbooks/LinksToolsSection.tsx','app/components/runbooks/EscalationSection.tsx','app/components/search/CommandPalette.tsx']){
  writeFileSync(join(target,file),execFileSync('git',['show',`HEAD:frontend/${file}`]));
}
const config=readFileSync(join(target,'vite.config.ts'),'utf8').replace(/      \{\s*name: "ctd-canonical-navigation",[\s\S]*?      vinext\(\),/,'      vinext(),');
writeFileSync(join(target,'vite.config.ts'),config);
const worker=readFileSync(join(target,'worker/index.ts'),'utf8').replace('    if (canonical) return Response.redirect(canonical.url, canonical.status);','');
writeFileSync(join(target,'worker/index.ts'),worker);
// The route progress and deterministic hydration clock do not alter settled pixels.
if(!existsSync(join(target,'node_modules')))symlinkSync(join(root,'node_modules'),join(target,'node_modules'),'junction');
console.log(target);
