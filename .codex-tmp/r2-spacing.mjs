import {readFileSync,writeFileSync} from 'node:fs';
let p='frontend/app/components/tickets/TicketReportView.tsx',s=readFileSync(p,'utf8');
s=s.replace('max-lg:[&_button]:min-h-10 max-lg:[&_button]:min-w-10','max-lg:[&_button:not(.monitoring-status-btn):not(.shift-filter-btn)]:min-h-11 max-lg:[&_button:not(.monitoring-status-btn):not(.shift-filter-btn)]:min-w-11');
s=s.replace('my-[6px] hover:border-','my-[6px] max-lg:my-0 hover:border-');
writeFileSync(p,s);
p='frontend/app/components/layout/Topbar.tsx';s=readFileSync(p,'utf8');s=s.replace('max-md:h-10 max-md:px-1.5 max-md:shrink-0','max-md:h-10 max-md:w-[72px] max-md:justify-center max-md:px-1.5 max-md:shrink-0');s=s.replace('max-md:border-0 max-md:p-0 max-md:gap-0','max-md:w-9 max-md:justify-center max-md:border-0 max-md:p-0 max-md:gap-0');writeFileSync(p,s);
