import {readFileSync,writeFileSync} from 'node:fs';
const path='frontend/app/components/tickets/TicketReportView.tsx';let s=readFileSync(path,'utf8');
function replace(a,b){if(!s.includes(a))throw Error('Missing '+a.slice(0,100));s=s.replace(a,b);}
replace('import { MemoModal }','import { MemoPreview } from "@/app/components/dashboard/MemoPreview";\nimport { MemoModal }');
replace('max-lg:h-[557px]','max-lg:h-[645px]');
replace('today-ticket-list max-lg:flex-none','today-ticket-list max-lg:gap-2 max-lg:flex-none');
replace('max-lg:grid-cols-[minmax(0,1fr)_auto] max-lg:gap-1.5 max-lg:p-2 max-lg:py-1.5 max-lg:gap-y-0.5 max-lg:h-[84px]', 'max-lg:relative max-lg:grid-cols-[auto_minmax(0,1fr)_auto] max-lg:grid-rows-[20px_minmax(0,1fr)_20px] max-lg:gap-x-2 max-lg:gap-y-0 max-lg:rounded-xl max-lg:p-3 max-lg:h-[100px] max-lg:before:absolute max-lg:before:inset-y-0 max-lg:before:left-0 max-lg:before:w-[3px] max-lg:before:rounded-l-xl ' + '${{crit: "max-lg:before:bg-[#f87171]", high: "max-lg:before:bg-[#fb923c]", med: "max-lg:before:bg-[#fbbf24]", low: "max-lg:before:bg-[#2dd4bf]"}[priorityKey]}');
replace('max-lg:leading-[14px] max-lg:flex-row max-lg:items-center max-lg:gap-1.5 max-lg:min-w-0 max-lg:[&_.today-ticket-proj]:truncate','max-lg:contents');
replace('today-ticket-id"','today-ticket-id max-lg:col-start-2 max-lg:row-start-1 max-lg:truncate max-lg:text-slate-400" title={`#${ticket.id}`}');
replace('font-semibold today-ticket-proj"','font-semibold today-ticket-proj max-lg:col-start-1 max-lg:row-start-1 max-lg:max-w-[90px] max-lg:truncate max-lg:font-mono"');
replace('max-lg:gap-0 max-lg:col-span-2 max-lg:row-start-2','max-lg:contents');
replace('max-lg:line-clamp-2 max-lg:text-[13px] max-lg:leading-4','max-lg:line-clamp-2 max-lg:text-[14px] max-lg:leading-4 max-lg:col-span-3 max-lg:row-start-2');
replace('max-lg:leading-[14px] max-lg:truncate max-lg:whitespace-nowrap max-lg:gap-1.5 max-lg:[&>span]:truncate','max-lg:col-span-2 max-lg:row-start-3 max-lg:min-w-0 max-lg:leading-5 max-lg:whitespace-nowrap max-lg:gap-1.5');
replace('text-[#94a3b8] today-ticket-type"','text-[#94a3b8] today-ticket-type max-lg:h-5 max-lg:max-w-[82px] max-lg:truncate max-lg:rounded max-lg:border max-lg:border-slate-600 max-lg:bg-slate-800 max-lg:px-1.5 max-lg:text-slate-300"');
replace('compact-today-ticket-owner"','compact-today-ticket-owner max-lg:min-w-0" title={ticket.owner}');
replace('<User size={10} /> {ticket.owner}','<User size={10} className="max-lg:hidden" /><span aria-hidden="true" className="hidden max-lg:inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-sky-400/15 text-[11px] font-semibold text-sky-200">{ticket.owner.split(/\\s+/).filter(Boolean).map(part => part[0]).slice(0, 2).join("")}</span><span className="truncate">{ticket.owner}</span>');
// Correct the regex in the generated TS source.
s=s.replace('ticket.owner.split(/\\s+/)', 'ticket.owner.split(/\u005cs+/)');
replace('max-lg:col-start-2 max-lg:row-start-1 max-lg:gap-1 max-lg:[&_span]:text-[11px] max-lg:[&_span]:leading-none max-lg:[&_span]:h-[18px] max-lg:[&_span]:py-0 max-lg:[&_span]:px-1.5','max-lg:contents');
replace('className={OPS_PRIORITY_PILL_STYLES[priorityKey]}','className={`${OPS_PRIORITY_PILL_STYLES[priorityKey]} max-lg:col-start-3 max-lg:row-start-1 max-lg:justify-self-end max-lg:h-5 max-lg:px-1.5 max-lg:py-0 max-lg:text-[11px] max-lg:leading-none`}');
replace('className={OPS_STATUS_PILL_STYLES[statusKey]}','className={`${OPS_STATUS_PILL_STYLES[statusKey]} max-lg:col-start-3 max-lg:row-start-3 max-lg:justify-self-end max-lg:h-5 max-lg:px-1.5 max-lg:py-0 max-lg:text-[11px] max-lg:leading-none`}');
replace('className="w-full rounded-lg border border-slate-700 bg-slate-900/50 text-[12px] font-semibold text-sky-400">{ticketsExpanded ? "Ringkas" : `Lihat semua (${displayedTodayTickets.length})`}</button>', 'className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-[#243044] text-[13px] font-semibold text-slate-300">{ticketsExpanded ? "Ringkas" : `Lihat semua (${displayedTodayTickets.length})`}<ChevronRight size={16} /></button>');
// Memo: keep the desktop textarea and its original geometry intact.
replace('ops-shift-panel flex flex-col`}', 'ops-shift-panel flex flex-col max-lg:[&.ops-shift-panel_.report-panel-heading]:h-[69px] max-lg:[&.ops-shift-panel_.panel-view-action-btn]:size-10 max-lg:[&.ops-shift-panel_.panel-view-action-btn]:min-h-10 max-lg:[&.ops-shift-panel_.panel-view-action-btn]:min-w-10 max-lg:[&.ops-shift-panel_.panel-view-action-btn_span]:hidden`}');
replace('minHeight={mobile ? 78 : 160}','minHeight={mobile ? 108 : 160}');replace('max-lg:h-[78px]','max-lg:h-[108px]');
replace('memo-notepad-wrap max-lg:p-2','memo-notepad-wrap max-lg:p-0 max-lg:border-0 max-lg:bg-transparent');
replace('<p title={shiftMemo} className="line-clamp-3 whitespace-pre-line text-[13px] leading-5 text-slate-300 lg:hidden">{shiftMemo}</p>', '<MemoPreview memo={shiftMemo} onOpen={() => setMemoModalOpen(true)} />');
// Staff rows: use contents so the original desktop DOM remains the same layout.
replace('user-summary-panel max-lg:relative max-lg:h-auto','user-summary-panel max-lg:relative max-lg:h-auto max-lg:[&.user-summary-panel_.report-panel-heading]:h-[69px] max-lg:[&.user-summary-panel_.panel-view-action-btn]:size-10 max-lg:[&.user-summary-panel_.panel-view-action-btn]:min-h-10 max-lg:[&.user-summary-panel_.panel-view-action-btn]:min-w-10 max-lg:[&.user-summary-panel_.panel-view-action-btn_span]:hidden max-lg:[&.user-summary-panel_.panel-sub-count]:inline');
replace('max-lg:h-[488px]','max-lg:h-[352px]');
replace('user-summary-list max-lg:flex-none','user-summary-list max-lg:gap-0 max-lg:flex-none');
replace('max-lg:p-2 max-lg:h-[140px] max-lg:gap-2 max-lg:[&_.user-metric-col]:flex-col max-lg:[&_.user-metric-col]:justify-center max-lg:[&_.user-metric-col]:gap-1 max-lg:[&_.metric-val]:text-[16px] ${!staffExpanded && staffIndex >= 3', 'max-lg:grid max-lg:grid-cols-[32px_minmax(0,1fr)_94px_40px] max-lg:grid-rows-1 max-lg:items-center max-lg:gap-x-2 max-lg:gap-y-0 max-lg:h-[60px] max-lg:rounded-none max-lg:border-0 max-lg:border-b max-lg:border-slate-700/50 max-lg:bg-transparent max-lg:p-0 max-lg:py-1.5 max-lg:[&_.metric-val]:text-[15px] max-lg:[&_.metric-lbl]:font-sans max-lg:[&_.metric-lbl]:tracking-normal max-lg:[&_.metric-lbl]:leading-[14px] ${!staffExpanded && staffIndex >= 5');
replace('onClick={() => setSelectedUserDetail(user)}','aria-label={`Detail ${user.name}`}\n                    onClick={() => setSelectedUserDetail(user)}');
replace('user-summary-card-top"','user-summary-card-top max-lg:contents"');replace('user-profile-left"','user-profile-left max-lg:contents"');
replace('user-avatar-sm max-lg:size-8','user-avatar-sm max-lg:col-start-1 max-lg:row-start-1 max-lg:size-8');
replace('className="flex flex-col min-w-0 user-name-role"','className={`flex flex-col min-w-0 user-name-role max-lg:col-start-2 max-lg:row-start-1 ${Object.keys(user.todayBreakdown).length ? "max-lg:self-start" : ""}`}');
replace('user-summary-name max-lg:text-[13px]','user-summary-name max-lg:text-[14px] max-lg:leading-[18px]');replace('user-summary-role"','user-summary-role max-lg:leading-[14px]"');
replace('user-detail-link max-lg:min-h-10 max-lg:min-w-10 max-lg:justify-end','user-detail-link max-lg:col-start-4 max-lg:row-start-1 max-lg:size-10 max-lg:justify-center');
replace('Detail <ChevronRight size={11} />','<span className="max-lg:hidden">Detail</span><ChevronRight size={11} className="max-lg:size-4" />');
replace('user-metrics-row"','user-metrics-row max-lg:col-start-3 max-lg:row-start-1 max-lg:gap-0 max-lg:border-0 max-lg:bg-transparent max-lg:p-0"');
replace('metric-lbl">HARI INI','metric-lbl">{mobile ? "Hari" : "HARI INI"}');replace('metric-lbl">BULAN INI','metric-lbl">{mobile ? "Bulan" : "BULAN INI"}');replace('metric-lbl">TAHUN INI','metric-lbl">{mobile ? "Tahun" : "TAHUN INI"}');
replace('text-[#38bdf8] metric-val">{user.todayCount}', 'text-[#38bdf8] metric-val ${user.todayCount === 0 ? "max-lg:text-slate-400" : ""}`}>{user.todayCount}');
// Switch just that attribute to template syntax.
replace('className="text-[12px] font-extrabold font-mono text-[#38bdf8] metric-val ${','className={`text-[12px] font-extrabold font-mono text-[#38bdf8] metric-val ${');
replace('text-[#10b981] metric-val','text-[#10b981] metric-val max-lg:text-[#4ade80]');replace('text-[#818cf8] metric-val','text-[#818cf8] metric-val max-lg:text-[#c084fc]');
replace('className="flex items-center gap-[4px] text-[9px] max-lg:text-[11px] text-[var(--ink-muted)] user-today-projects max-lg:overflow-x-auto max-lg:whitespace-nowrap max-lg:overscroll-x-contain max-lg:min-h-5 max-lg:[scrollbar-width:none] max-lg:[&::-webkit-scrollbar]:hidden "', 'className={`flex items-center gap-[4px] text-[9px] max-lg:text-[11px] text-[var(--ink-muted)] user-today-projects max-lg:col-start-2 max-lg:row-start-1 max-lg:self-end max-lg:h-[14px] max-lg:min-h-[14px] max-lg:overflow-x-auto max-lg:whitespace-nowrap max-lg:overscroll-x-contain max-lg:[scrollbar-width:none] max-lg:[&::-webkit-scrollbar]:hidden ${Object.keys(user.todayBreakdown).length ? "" : "max-lg:hidden"}`}');
replace('user-proj-label"','user-proj-label max-lg:hidden"');replace('user-proj-badge"','user-proj-badge max-lg:py-0 max-lg:leading-[14px]"');
replace('className="lg:hidden mt-2 min-h-11 w-full rounded-lg border border-slate-700 text-[13px] font-semibold text-sky-400">{staffExpanded ? "Ringkas" : `Lihat semua (${userSummaries.length})`}</button>','className="lg:hidden mt-2 min-h-11 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-[#243044] text-[13px] font-semibold text-slate-300">{staffExpanded ? "Ringkas" : `Lihat semua (${userSummaries.length})`}<ChevronRight size={16} /></button>');
// The Today header has no View button; align its title and count in 53px.
replace('ops-today-panel', 'ops-today-panel max-lg:[&.ops-today-panel_.report-panel-heading]:h-[53px]');
writeFileSync(path,s);
