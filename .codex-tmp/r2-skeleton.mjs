import {readFileSync,writeFileSync} from 'node:fs';let p='frontend/app/components/tickets/TicketReportView.tsx',s=readFileSync(p,'utf8');
s=s.replaceAll('border shift-filter-btn ${','border shift-filter-btn max-lg:min-h-10 ${');
const heights=[['TodayTicketsSkeleton',553,520],['ShiftMemoNotesSkeleton',78,160],['MonitoringChecklistSkeleton',331.5,260],['TicketVolumeChartSkeleton',315,300],['StaffRecapSkeleton',488,300],['CategoryDistributionSkeleton',404,180],['SeverityDistributionSkeleton',372,180],['ResolutionVelocitySkeleton',381,280],['ShiftTrafficSkeleton',453,280]];
for(const [name,height,desktop] of heights){const target=`skeleton={<${name} />}`;s=s.replace(target,`loadingClassName="max-lg:h-[${height}px] lg:min-h-[${desktop}px]"\n                ${target}`);}
// Container breakpoints have disjoint ranges, so a narrow card always stacks.
s=s.replace('max-lg:grid-cols-1 max-lg:justify-items-center max-lg:@min-[440px]:grid-cols-[140px_1fr]','max-lg:justify-items-center @max-[439px]:max-lg:grid-cols-1 @min-[440px]:max-lg:grid-cols-[140px_1fr]');
writeFileSync(p,s);
p='frontend/app/components/ui/skeleton/DashboardSkeleton.tsx';s=readFileSync(p,'utf8');
function r(a,b){if(!s.includes(a))throw Error('Missing '+a.slice(0,90));s=s.replaceAll(a,b);}
r('max-lg:h-[525px]','max-lg:h-[553px]');
r('max-lg:h-[97px]','max-lg:h-[125px]');
r('max-lg:min-h-[344px] max-lg:h-[344px]','max-lg:min-h-[331.5px] max-lg:h-[331.5px]');
r('max-lg:min-h-[287.25px] max-lg:h-[287.25px]','max-lg:min-h-[315px] max-lg:h-[315px]');
r('height={mobile ? 220 : 260}','height={mobile ? 252 : 260}');
r('max-lg:min-h-[480px]','max-lg:min-h-[488px]');
r('max-lg:after:h-10','max-lg:after:h-11');
r('max-lg:h-[306.75px]','max-lg:h-[404px]');
r('max-lg:h-[17.25px]','max-lg:h-9');
r('height={mobile ? 150 : 140}','height={140}');
r('max-lg:[&>div>div]:size-[150px]','max-lg:[&>div>div]:size-[140px]');
r('max-lg:h-[349px]','max-lg:h-[381px]');
r('max-lg:h-[421px]','max-lg:h-[453px]');
r('height={mobile ? 220 : 190}','height={mobile ? 252 : 190}');
r('height={mobile ? 220 : 180}','height={mobile ? 252 : 180}');
r('max-lg:h-[628px]','max-lg:h-[656px]');
r('max-lg:h-[447px]','max-lg:h-[434.5px]');
r('max-lg:h-[378px]','max-lg:h-[418px]');
r('max-lg:h-[584px]','max-lg:h-[591px]');
r('max-lg:[&>div]:h-[398px]','max-lg:[&>div]:h-[507px]');
r('max-lg:h-[440px]','max-lg:h-[480px]');
r('max-lg:h-[512px]','max-lg:h-[552px]');
// The route fallback keeps the same section boxes until the real panels mount.
r('gap-4 w-full">','gap-4 w-full max-lg:gap-3">');
r('h-10 rounded-lg bg-slate-800 border border-slate-700 lg:hidden','h-11 rounded-lg bg-slate-800 border border-slate-700 lg:hidden');
r('h-[70px] items-center','h-[74px] items-center');
writeFileSync(p,s);
