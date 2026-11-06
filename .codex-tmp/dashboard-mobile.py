from pathlib import Path
import re
p=Path('frontend/app/components/tickets/TicketReportView.tsx')
s=p.read_text(encoding='utf-8')
s=s.replace('import { paths }', 'import { BottomSheet, ResponsiveSheet } from "@/app/components/ui/BottomSheet";\nimport { useMobileLayout } from "@/app/hooks/useMobileLayout";\nimport { useContainerDimensions } from "@/app/hooks/useContainerDimensions";\nimport { paths }',1)
s=s.replace('  const { activeClient, activeClientId } = useClient();','''  const mobile = useMobileLayout();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [ticketsExpanded, setTicketsExpanded] = useState(false);
  const [monitoringExpanded, setMonitoringExpanded] = useState(false);
  const [staffExpanded, setStaffExpanded] = useState(false);
  const [volumeChartRef, volumeSize] = useContainerDimensions<HTMLDivElement>();
  const [velocityChartRef, velocitySize] = useContainerDimensions<HTMLDivElement>();
  const [trafficChartRef, trafficSize] = useContainerDimensions<HTMLDivElement>();
  const { activeClient, activeClientId } = useClient();''',1)
# Retire only conflicting legacy hook classes in this view; keep other views' CSS intact.
rename=['ticket-report-container','ops-focus-header-left','ops-section-title','chart-heading-left','today-ticket-row','today-ticket-id-col','today-ticket-subject','today-ticket-badges','today-ticket-owner','today-pagination','today-pagination-left','today-pagination-actions','today-page-size-selector','today-page-info','today-page-numbers','engineer-workload-footer','engineer-workload-stats','velocity-legend-item']
for cls in sorted(rename,key=len,reverse=True):
    s=re.sub(r'(?<![\w-])'+re.escape(cls)+r'(?![\w-])', 'compact-'+cls,s)
# Explicit small typography utility per element, without affecting desktop text.
s=re.sub(r'(?<![\w:-])text-\[(\d+(?:\.\d+)?)px\]',lambda m:m.group(0)+(' max-md:text-[11px]' if float(m[1])<11 else ''),s)
s=s.replace('p-0 flex flex-col gap-5 w-full compact-ticket-report-container','p-0 flex flex-col gap-5 w-full compact-ticket-report-container max-md:gap-3 max-md:text-[13px] max-md:[&_svg_text]:text-[11px] max-md:[&_button]:min-h-10 max-md:[&_button]:min-w-10 max-md:[&_button]:touch-manipulation max-md:[&_button]:shrink-0 max-md:[&_.report-panel-body]:p-3 max-md:[&_.report-panel-heading]:flex-nowrap max-md:[&_.panel-title]:min-w-0 max-md:[&_.panel-title]:truncate max-md:[&_.panel-title]:text-[14px] max-md:[&_.panel-view-action-btn]:h-10 max-md:[&_.panel-view-action-btn_span]:inline motion-reduce:[&_*]:transition-none motion-reduce:[&_*]:animate-none')
s=s.replace('text-[24px] leading-[1.2]','text-[24px] max-md:text-[22px] leading-[1.2]',1)
s=s.replace('mb-[22px] max-[660px]','mb-[22px] max-md:mb-0 max-[660px]',1)
s=s.replace('ops-focus-header">','ops-focus-header max-md:flex-nowrap max-md:overflow-x-auto max-md:overscroll-x-contain max-md:[scrollbar-width:none]">',1)
s=s.replace('compact-ops-section-title"','compact-ops-section-title max-md:hidden"',1)
s=s.replace('compact-ops-focus-header-left"','compact-ops-focus-header-left max-md:shrink-0"',1)
s=s.replace('gap-[16px] items-stretch w-full ops-focus-grid','gap-[16px] items-stretch w-full ops-focus-grid max-md:gap-3 sm:max-md:grid-cols-2 max-md:items-start',1)
s=s.replace('ops-today-panel`}', 'ops-today-panel max-md:min-h-0 max-md:max-h-none`}',1)
s=s.replace('ops-right-column">','ops-right-column max-md:min-h-0 max-md:max-h-none">',1)
s=s.replace('ops-engineer-panel`}', 'ops-engineer-panel max-md:min-h-0 max-md:max-h-none`}',1)
s=s.replace('skeleton={<TodayTicketsSkeleton />}','skeleton={<TodayTicketsSkeleton />}')
# Single ticket list; responsive visibility leaves desktop pagination and URL logic unchanged.
s=s.replace('today-ticket-list"','today-ticket-list max-md:flex-none max-md:overflow-visible max-md:pr-0 max-md:[scrollbar-gutter:auto]"',1)
s=s.replace('paginatedTodayTickets.map((ticket) =>','paginatedTodayTickets.map((ticket, ticketIndex) =>',1)
s=s.replace('<div className="grid grid-cols-[88px_1fr_auto]', '<div className={`grid grid-cols-[88px_1fr_auto]',1)
s=s.replace('shrink-0 compact-today-ticket-row" key={ticket.id}', 'shrink-0 compact-today-ticket-row max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-1.5 max-md:p-2 max-md:h-[92px] ${!ticketsExpanded && ticketIndex >= 5 ? "max-md:hidden" : ""}`} key={ticket.id}',1)
s=s.replace('compact-today-ticket-id-col"','compact-today-ticket-id-col max-md:flex-row max-md:items-center max-md:gap-1.5 max-md:min-w-0 max-md:[&_.today-ticket-proj]:truncate"',1)
s=s.replace('compact-today-ticket-subject"','compact-today-ticket-subject max-md:col-span-2 max-md:row-start-2"',1)
s=s.replace('today-ticket-title"','today-ticket-title max-md:whitespace-normal max-md:line-clamp-2 max-md:text-[13px] max-md:leading-4"',1)
s=s.replace('today-ticket-meta"','today-ticket-meta max-md:truncate max-md:whitespace-nowrap max-md:gap-1.5"',1)
s=s.replace('compact-today-ticket-badges"','compact-today-ticket-badges max-md:col-start-2 max-md:row-start-1 max-md:gap-1 max-md:[&_span]:text-[11px] max-md:[&_span]:px-1.5"',1)
s=s.replace('compact-today-pagination">','compact-today-pagination max-md:hidden">',1)
marker='                    {/* Pagination & Page Size Controls */}'
s=s.replace(marker,'''                    <div className="flex flex-col gap-2 pt-2 md:hidden">
                      {paginatedTodayTickets.length > 5 && <button type="button" aria-expanded={ticketsExpanded} onClick={() => setTicketsExpanded(!ticketsExpanded)} className="w-full rounded-lg border border-slate-700 bg-slate-900/50 text-[12px] font-semibold text-sky-400">{ticketsExpanded ? "Ringkas" : `Lihat semua (${displayedTodayTickets.length})`}</button>}
                      <div className="flex items-center justify-between gap-2 border-t border-slate-700/60 pt-2">
                        <button type="button" aria-label="Halaman tiket sebelumnya" disabled={currentTodayPage <= 1} onClick={() => setTodayPage(p => Math.max(1,p-1))} className="grid size-10 place-items-center rounded-lg border border-slate-700 disabled:opacity-30"><ChevronLeft size={16} /></button>
                        <span className="font-mono text-[12px] text-slate-300">{currentTodayPage} / {totalTodayPages}</span>
                        <button type="button" aria-label="Halaman tiket berikutnya" disabled={currentTodayPage >= totalTodayPages} onClick={() => setTodayPage(p => Math.min(totalTodayPages,p+1))} className="grid size-10 place-items-center rounded-lg border border-slate-700 disabled:opacity-30"><ChevronRight size={16} /></button>
                        <select aria-label="Jumlah tiket per halaman" value={todayPageSize} onChange={e => setTodayPageSize(Number(e.target.value))} className="h-10 max-w-[100px] rounded-lg border border-slate-700 bg-slate-900 px-2 text-[12px] text-slate-200"><option value={10}>10 / hal.</option><option value={15}>15 / hal.</option><option value={25}>25 / hal.</option><option value={0}>Semua</option></select>
                      </div>
                    </div>
'''+marker,1)
# Memo preview is the same text, with the existing editor opened by View.
s=s.replace('<textarea\n                      className=', '<p className="line-clamp-3 whitespace-pre-line text-[13px] leading-5 text-slate-300 md:hidden">{shiftMemo}</p>\n                    <textarea\n                      aria-label="Catatan shift"\n                      className="hidden md:block '+ '"PLACEHOLDER',1) if False else s
s=s.replace('<textarea\n                      className="', '<p className="line-clamp-3 whitespace-pre-line text-[13px] leading-5 text-slate-300 md:hidden">{shiftMemo}</p>\n                    <textarea\n                      aria-label="Catatan shift"\n                      className="hidden md:block ',1)
s=s.replace('memo-notepad-wrap"','memo-notepad-wrap max-md:p-2"',1)
# Monitoring compact preview and real status control, using the existing handler.
s=s.replace('engineer-workload-list"','engineer-workload-list max-md:flex-none max-md:overflow-visible max-md:max-h-none max-md:pr-0 max-md:[scrollbar-gutter:auto]"',1)
s=s.replace('monitoringItems.map((item) =>','monitoringItems.map((item, monitoringIndex) =>',1)
s=s.replace('monitoring-check-card ${','monitoring-check-card max-md:p-1.5 max-md:gap-2 ${!monitoringExpanded && monitoringIndex >= 4 ? "max-md:hidden" : ""} ${',1)
s=s.replace('<span\n                            className={`inline-flex items-center justify-center gap-[5px] h-[24px]', '<button\n                            type="button"\n                            onClick={() => toggleMonitoringStatus(item.id)}\n                            aria-label={`Status ${item.project}: ${item.task}, ${item.status}`}\n                            className={`inline-flex items-center justify-center gap-[5px] h-[24px]',1)
s=s.replace('{item.status}\n                          </span>','{item.status}\n                          </button>',1)
s=s.replace('                  {/* Footer summary bar */}', '''                  <button type="button" aria-expanded={monitoringExpanded} onClick={() => setMonitoringExpanded(!monitoringExpanded)} className="md:hidden mt-2 w-full rounded-lg border border-slate-700 text-[12px] font-semibold text-sky-400">{monitoringExpanded ? "Ringkas" : `Lihat semua (${monitoringItems.length})`}</button>
                  {/* Footer summary bar */}''',1)
s=s.replace('compact-engineer-workload-footer"','compact-engineer-workload-footer max-md:pt-2 max-md:[&_.compact-engineer-workload-stats]:text-[11px]"',1)
s=s.replace('Total: <strong>{monitoringItems.length} dari 13 Checklist</strong>','<span className="hidden md:inline">Total: <strong>{monitoringItems.length} dari 13 Checklist</strong></span><span className="md:hidden">{okCount}/{monitoringItems.length} OK</span>',1)
s=s.replace('Rata-rata: <strong>{((okCount / (monitoringItems.length || 1)) * 100).toFixed(0)}%</strong> Kesiapan','<span className="hidden md:inline">Rata-rata: </span><strong>{((okCount / (monitoringItems.length || 1)) * 100).toFixed(0)}%</strong> Kesiapan',1)
# One filter control tree moves into the reusable responsive sheet.
s=s.replace('<span>Filter Laporan &amp; Analitik Tiket</span>','<span className="hidden md:inline">Filter Laporan &amp; Analitik Tiket</span><span className="md:hidden">Filter</span>',1)
s=s.replace('analytics-filter-header">','analytics-filter-header max-md:flex-nowrap max-md:gap-2">',1)
s=s.replace('Menampilkan <strong>{analyticsTickets.length}</strong> dari <strong>{tickets.length}</strong> Tiket','<span className="hidden md:inline">Menampilkan <strong>{analyticsTickets.length}</strong> dari <strong>{tickets.length}</strong> Tiket</span><span className="md:hidden"><strong>{analyticsTickets.length}</strong> tiket{isAnyAnalyticsFilterActive ? " · aktif" : ""}</span>',1)
s=s.replace('analytics-filter-reset-action-btn"','analytics-filter-reset-action-btn max-md:hidden"',1)
target='          <div className="flex items-center gap-[8px] analytics-filter-header-right">'
s=s.replace(target,target+'\n            <button type="button" onClick={() => setFiltersOpen(true)} className="order-last md:hidden min-h-10 px-3 rounded-lg border border-sky-500/30 bg-sky-500/10 text-[12px] font-semibold text-sky-300">Ubah</button>',1)
start=s.index('        <div className="grid grid-cols-[minmax(210px,1.3fr)')
end=s.index('\n      </div>\n\n\n      {/* ── 2.',start)
s=s[:start]+'''        <ResponsiveSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filter analitik" dataSheetId="analytics-sheet" footer={<div className="grid grid-cols-2 gap-3"><button type="button" onClick={resetAllAnalyticsFilters} className="h-11 rounded-lg border border-slate-700 text-[13px] text-slate-200">Reset</button><button type="button" onClick={() => setFiltersOpen(false)} className="h-11 rounded-lg bg-sky-400 font-semibold text-[13px] text-slate-950">Terapkan</button></div>}>
'''+s[start:end]+'''\n        </ResponsiveSheet>'''+s[end:]
s=s.replace('analytics-filter-grid"','analytics-filter-grid max-md:gap-3 max-md:[&_select]:h-11 max-md:[&_.analytics-shifter-trigger]:h-11 max-md:[&_.date-picker-input-wrapper]:h-11 max-md:[&_.analytics-shifter-popover]:static max-md:[&_.analytics-shifter-popover]:w-full"',1)
s=s.replace('showAllTimePreset={false}','showAllTimePreset={false}\n                inlineCalendar={mobile}',1)
# Compact staff cards, no duplicate data or requests.
s=s.replace('user-summary-wrapper"','user-summary-wrapper max-md:h-auto max-md:min-h-0"',1)
s=s.replace('user-summary-panel`}','user-summary-panel max-md:relative max-md:h-auto`}',1)
s=s.replace('user-summary-list"','user-summary-list max-md:flex-none max-md:overflow-visible max-md:pb-0 max-md:pr-0"',1)
s=s.replace('userSummaries.map((user) =>','userSummaries.map((user, staffIndex) =>',1)
s=s.replace('className="flex flex-col gap-1.5 p-2 sm:p-2.5','className={`flex flex-col gap-1.5 p-2 sm:p-2.5',1)
s=s.replace('shrink-0 user-summary-card"','shrink-0 user-summary-card max-md:p-2 max-md:h-[130px] ${!staffExpanded && staffIndex >= 3 ? "max-md:hidden" : ""}`}',1)
s=s.replace('user-avatar-sm"','user-avatar-sm max-md:size-8 max-md:text-[11px]"',1)
s=s.replace('user-today-projects"','user-today-projects max-md:overflow-x-auto max-md:whitespace-nowrap max-md:overscroll-x-contain"',1)
s=s.replace('user-proj-pills-wrap"','user-proj-pills-wrap max-md:flex-nowrap"',1)
s=s.replace('user-detail-link"','user-detail-link max-md:min-h-10"',1)
s=s.replace('              </div>\n              </PanelSkeletonWrapper>\n            </div>\n          </article>\n        </div>','''              </div>
              <button type="button" aria-expanded={staffExpanded} onClick={() => setStaffExpanded(!staffExpanded)} className="md:hidden mt-2 w-full rounded-lg border border-slate-700 text-[12px] font-semibold text-sky-400">{staffExpanded ? "Ringkas" : `Lihat semua (${userSummaries.length})`}</button>
              </PanelSkeletonWrapper>
            </div>
          </article>
        </div>''',1)
# Distribution anatomy.
s=s.replace('donut-and-list-grid"','donut-and-list-grid max-md:gap-3"',1)
s=s.replace('relative w-[130px] h-[130px] donut-chart-wrap','relative w-[130px] h-[130px] max-md:size-[150px] donut-chart-wrap',1)
s=s.replace('category-dist-row"','category-dist-row max-md:grid max-md:grid-cols-[minmax(0,1fr)_1fr] max-md:items-center max-md:gap-2"',1)
s=s.replace('category-dist-info"','category-dist-info max-md:contents"',1)
s=s.replace('category-dist-name"','category-dist-name max-md:col-start-1 max-md:row-start-1 max-md:truncate"',1)
s=s.replace('category-dist-count"','category-dist-count max-md:col-start-3 max-md:row-start-1 max-md:whitespace-nowrap"',1)
s=s.replace('category-dist-track"','category-dist-track max-md:col-start-2 max-md:row-start-1"',1)
s=s.replace('priority-spectrum-list"','priority-spectrum-list max-md:grid-cols-2 max-md:gap-2"',1)
s=s.replace('h-full priority-spec-box','h-full max-md:p-2 max-md:h-[86px] priority-spec-box',1)
s=s.replace('my-1 spec-count"','my-1 spec-count max-md:text-[22px]"',1)
s=s.replace('gap-[18px] report-charts-grid','gap-[18px] max-md:gap-3 report-charts-grid',1)
s=s.replace('gap-[16px] items-stretch w-full report-primary-chart-grid','gap-[16px] items-stretch w-full max-md:gap-3 report-primary-chart-grid',1)
s=s.replace('min-h-[580px] primary-chart-panel','min-h-[580px] max-md:min-h-0 primary-chart-panel',1)
# Truncate verbose chart headings using the same desktop strings, short mobile labels.
labels={
'Ticket Volume per Project (Stacked by System)':'Volume Tiket',
'Distribusi Kategori / Tipe Tiket':'Distribusi Kategori',
'Distribusi Berdasarkan Severity':'Distribusi Severity',
'Tren Durasi Penyelesaian (Resolution Velocity)':'Tren Durasi',
'Tren Trafik Beban per Shift (Shift Traffic Velocity)':'Tren Trafik',
}
for desktop, short in labels.items():
    s=s.replace('>'+desktop+'<','><span className="hidden md:inline">'+desktop+'</span><span className="md:hidden">'+short+'</span><')
# In some titles text follows an icon/newline.
s=s.replace('                  Ticket Volume per Project (Stacked by System)','                  <span className="hidden md:inline">Ticket Volume per Project (Stacked by System)</span><span className="md:hidden">Volume Tiket</span>')
s=s.replace('                  Tren Trafik Beban per Shift (Shift Traffic Velocity)','                  <span className="hidden md:inline">Tren Trafik Beban per Shift (Shift Traffic Velocity)</span><span className="md:hidden">Tren Trafik</span>')
s=s.replace('chart-tab-controls"','chart-tab-controls max-md:gap-2"',1)
s=s.replace('velocity-legend-strip"','velocity-legend-strip max-md:[&_.compact-velocity-legend-item]:hidden"',1)
s=s.replace('velocity-metric-val"','velocity-metric-val max-md:text-[20px] max-md:[&_small]:text-[11px]"')
s=s.replace('shift-traffic-metric-val','max-md:text-[20px] shift-traffic-metric-val')
s=s.replace('velocity-metrics-strip"','velocity-metrics-strip max-md:auto-rows-fr"',1)
s=s.replace('shift-traffic-metrics-strip"','shift-traffic-metrics-strip max-md:auto-rows-fr max-md:[&_.shift-traffic-metric-sub]:hidden"',1)
# Geometry: reuse the viewer's ResizeObserver hook with one coordinate per CSS pixel.
s=s.replace('const svgViewBoxWidth = Math.max(760, n * 48 + 80);','const svgViewBoxWidth = mobile ? Math.max(volumeSize.width, n * 44 + 48) : Math.max(760, n * 48 + 80);',1)
s=s.replace('const startX = 55;','const startX = mobile ? 48 : 55;',1)
s=s.replace('const viewBoxHeight = 270;','const viewBoxHeight = mobile ? 240 : 270;',1)
s=s.replace('const baselineY = 225;','const baselineY = mobile ? 212 : 225;',1)
s=s.replace('const topY = 22;','const topY = mobile ? 12 : 22;',1)
s=s.replace('<div className="w-full overflow-x-auto overflow-y-hidden flex-1 flex flex-col justify-start min-h-[270px] svg-barchart-wrap">','<div ref={volumeChartRef} className="w-full overflow-x-auto overflow-y-hidden flex-1 flex flex-col justify-start min-h-[270px] svg-barchart-wrap max-md:overscroll-x-contain max-md:snap-x max-md:snap-proximity max-md:touch-auto max-md:[scrollbar-width:thin]">',1)
s=s.replace('className="w-full h-full min-h-[270px] max-h-[390px] block report-bar-svg-lg"','style={mobile ? { width: svgViewBoxWidth, height: 240, flexShrink: 0 } : undefined}\n                            className="w-full h-full min-h-[270px] max-h-[390px] block report-bar-svg-lg"',1)
s=s.replace('project-legend-pills"','project-legend-pills max-md:flex-nowrap max-md:overflow-x-auto max-md:overscroll-x-contain max-md:[&_.project-legend-pill]:shrink-0"',1)
s=s.replace('const svgViewBoxWidth = Math.max(860, n * 48 + 90);','const svgViewBoxWidth = mobile ? velocitySize.width || 320 : Math.max(860, n * 48 + 90);',1)
s=s.replace('const startX = 64;','const startX = mobile ? 36 : 64;',1)
s=s.replace('const endX = svgViewBoxWidth - 90;','const endX = svgViewBoxWidth - (mobile ? 12 : 90);',1)
s=s.replace('const svgViewBoxWidth = Math.max(860, n * 50 + 60);','const svgViewBoxWidth = mobile ? trafficSize.width || 320 : Math.max(860, n * 50 + 60);',1)
s=s.replace('const startX = 46;','const startX = mobile ? 36 : 46;',1)
s=s.replace('const endX = svgViewBoxWidth - 36;','const endX = svgViewBoxWidth - (mobile ? 12 : 36);',1)
# All three major chart heights use 1:1 mobile coordinates.
s=s.replace('const viewBoxHeight = 280;','const viewBoxHeight = mobile ? 240 : 280;')
s=s.replace('const baselineY = 226;','const baselineY = mobile ? 212 : 226;')
s=s.replace('const topY = 32;','const topY = mobile ? 12 : 32;')
s=s.replace('const topY = 38;','const topY = mobile ? 12 : 38;')
s=s.replace('const dateStride = n > 22 ? 3 : n > 12 ? 2 : 1;','const dateStride = mobile ? Math.max(1, Math.ceil(n / 4)) : n > 22 ? 3 : n > 12 ? 2 : 1;')
s=s.replace('className="relative w-full h-[290px]', 'ref={velocityChartRef}\n                  className="relative w-full h-[290px]',1)
s=s.replace('className="relative w-full h-[275px]', 'ref={trafficChartRef}\n              className="relative w-full h-[275px]',1)
# Remove only conflicting mobile legacy geometry hooks, preserving identical desktop utility dimensions.
for cls in ['svg-barchart-wrap','report-bar-svg-lg','velocity-chart-container','velocity-chart-svg','shift-traffic-chart-container','shift-traffic-chart-svg']:
    s=re.sub(r'(?<![\w-])'+cls+r'(?![\w-])','compact-'+cls,s)
s=s.replace('compact-svg-barchart-wrap ','compact-svg-barchart-wrap max-md:min-h-[240px] max-md:h-[240px] max-md:flex-none ')
s=s.replace('compact-report-bar-svg-lg"','compact-report-bar-svg-lg max-md:min-h-[240px] max-md:h-[240px]"',1)
for cls in ['compact-velocity-chart-container','compact-shift-traffic-chart-container']:
    s=s.replace(cls+'"',cls+' max-md:h-[240px] max-md:min-h-[240px] max-md:flex-none max-md:touch-pan-y"',1)
for cls in ['compact-velocity-chart-svg','compact-shift-traffic-chart-svg']:
    s=s.replace(cls+'"',cls+' max-md:min-h-[240px] max-md:[&_text]:text-[11px]"',1)
# Calm annotations at narrow widths; touch tooltip replaces tiny callouts.
s=s.replace('velocity-milestone-pill','max-md:hidden velocity-milestone-pill')
s=s.replace('shift-traffic-filter-bar"','shift-traffic-filter-bar max-md:flex-nowrap max-md:[&_.shift-filter-buttons]:flex-nowrap max-md:overflow-x-auto max-md:overscroll-x-contain max-md:[&_.shift-filter-buttons>span]:hidden"',1)
p.write_text(s,encoding='utf-8')
