import {readFileSync,writeFileSync} from 'node:fs';
const file='frontend/app/components/tickets/TicketReportView.tsx';let s=readFileSync(file,'utf8').replaceAll('\r\n','\n');
function replace(a,b){if(!s.includes(a))throw Error('Missing '+a.slice(0,100));s=s.replaceAll(a,b);}
replace('import { useContainerDimensions }','import { HorizontalScroll } from "@/app/components/ui/HorizontalScroll";\nimport { useScrollEdges } from "@/app/hooks/useScrollEdges";\nimport { useContainerDimensions }');
replace('const [volumeChartRef, volumeSize] = useContainerDimensions<HTMLDivElement>();','const [volumeChartRef, volumeSize] = useContainerDimensions<HTMLDivElement>();\n  const volumeFade = useScrollEdges(volumeChartRef, volumeSize.width);');
replace('const stackedYTicks = useMemo(() => computeYTicks(maxDayCreated), [maxDayCreated]);',`const stackedYTicks = useMemo(() => {
    if (!mobile) return computeYTicks(maxDayCreated);
    const peak = Math.max(1, ...volumeByDate.map(day => Object.entries(day.projectCounts).reduce((sum, [project, count]) => sum + (hiddenCardProjects.has(project) ? 0 : count), 0)));
    const yMax = Math.max(4, Math.ceil(peak * 1.1));
    return { yMax, ticks: Array.from({ length: 5 }, (_, index) => Math.round(yMax * index / 4)) };
  }, [mobile, maxDayCreated, volumeByDate, hiddenCardProjects]);`);
replace('Math.max(volumeSize.width, n * 44 + 48)','Math.max(volumeSize.width, n * 44 + 12)');
replace('const startX = mobile ? 48 : 55','const startX = mobile ? 24 : 55');
replace('const viewBoxHeight = mobile ? 220 : 270','const viewBoxHeight = mobile ? 252 : 270');
replace('const baselineY = mobile ? 192 : 225','const baselineY = mobile ? 216 : 225');
replace('const topY = mobile ? 12 : 22','const topY = mobile ? 22 : 22');
replace('<div ref={volumeChartRef} className="w-full overflow-x-auto overflow-y-hidden flex-1 flex flex-col justify-start min-h-[270px] compact-svg-barchart-wrap max-lg:min-h-[220px] max-lg:h-[220px] max-lg:flex-none max-lg:overscroll-x-contain max-lg:snap-x max-lg:snap-proximity max-lg:touch-auto max-lg:[scrollbar-width:thin]">',`<div className="relative w-full max-lg:pl-9 max-lg:h-[252px]">
                        <svg aria-hidden="true" viewBox="0 0 36 252" className="hidden max-lg:block absolute left-0 top-0 h-[252px] w-9 text-slate-400">
                          {stackedYTicks.ticks.map(tick => <text key={tick} x="30" y={216 - tick / stackedYTicks.yMax * 194 + 4} textAnchor="end" fill="currentColor" fontSize="11" fontFamily="var(--font-mono)">{tick}</text>)}
                        </svg>
                        <div ref={volumeChartRef} aria-label="Volume tiket, geser untuk tanggal sebelumnya" tabIndex={0} className={"w-full overflow-x-auto overflow-y-hidden flex-1 flex flex-col justify-start min-h-[270px] compact-svg-barchart-wrap max-lg:min-h-[252px] max-lg:h-[252px] max-lg:flex-none max-lg:overscroll-x-contain max-lg:snap-x max-lg:snap-proximity max-lg:touch-auto max-lg:[scrollbar-width:none] max-lg:[&::-webkit-scrollbar]:hidden " + volumeFade}>`);
replace('width: svgViewBoxWidth, height: 220, flexShrink: 0','width: svgViewBoxWidth, height: 252, flexShrink: 0');
replace('compact-report-bar-svg-lg max-lg:min-h-[220px] max-lg:h-[220px]','compact-report-bar-svg-lg max-lg:min-h-[252px] max-lg:h-[252px]');
// Scope modifications to the stacked chart only.
const begin=s.indexOf('{/* View A: Stacked Bar Chart'),end=s.indexOf('{/* View B: Month-over-Month');
let a=s.slice(begin,end);
a=a.replaceAll('x1="45"','x1={mobile ? 0 : 45}').replace('x="38"','className="max-lg:hidden"\n                                    x="38"');
a=a.replace('const x = n > 1 ?', 'const visibleTotal = Object.entries(item.projectCounts).reduce((sum, [project, count]) => sum + (hiddenCardProjects.has(project) ? 0 : count), 0);\n                              const x = n > 1 ?');
a=a.replace('className={`stacked-bar-group','className={`max-lg:snap-center max-lg:touch-pan-y max-lg:focus-visible:outline-2 max-lg:focus-visible:outline-sky-400 stacked-bar-group');
a=a.replace('const segmentHeight = Math.max(5, Math.round((count / stackedYTicks.yMax) * chartHeight));','const segmentHeight = mobile ? count / Math.max(1, visibleTotal) * Math.max(visibleTotal > 0 ? 6 : 0, visibleTotal / stackedYTicks.yMax * chartHeight) : Math.max(5, Math.round((count / stackedYTicks.yMax) * chartHeight));');
a=a.replace('{/* Total count badge above bar */}\n                                  <text','{/* Total count badge above bar */}\n                                  {(!mobile || idx === n - 1 || item.created === maxDayCreated) && <text');
a=a.replace('{item.created}\n                                  </text>', '{mobile ? visibleTotal : item.created}\n                                  </text>}');
a=a.replace('{/* Date label on X-axis */}\n                                  <text','{/* Date label on X-axis */}\n                                  {(!mobile || idx % 2 === 0 || idx === n - 1) && <text');
a=a.replace('{item.date.slice(5)}\n                                  </text>', '{item.date.slice(5)}\n                                  </text>}');
a=a.replace('y={baselineY + 22}','y={baselineY + 22}');
a=a.replace('</svg>\n                        </div>','</svg>\n                        </div>\n                        </div>');
a=a.replace('<div className="flex items-center gap-[8px] flex-wrap pt-[10px]','<HorizontalScroll className="flex items-center gap-[8px] flex-wrap pt-[10px]');
a=a.replace('))}\n                    </div>\n\n                    {/* Interactive Selected', '))}\n                    </HorizontalScroll>\n\n                    {/* Interactive Selected');
a=a.replace('project-legend-pill max-lg:min-h-10','project-legend-pill max-lg:min-h-10');
s=s.slice(0,begin)+a+s.slice(end);
replace('minHeight={mobile ? 287.25 : 300}','minHeight={mobile ? 315 : 300}');
// Category layout follows card width, including tablets with a wide card.
replace('className={`${REPORT_PANEL_CARD} report-panel`}', 'className={`${REPORT_PANEL_CARD} report-panel @container`}');
replace('donut-and-list-grid max-lg:gap-3','donut-and-list-grid max-lg:gap-3 max-lg:grid-cols-1 max-lg:justify-items-center max-lg:@min-[440px]:grid-cols-[140px_1fr]');
replace('max-lg:size-[150px] donut-chart-wrap','max-lg:size-[140px] donut-chart-wrap');
replace('category-distribution-list max-lg:gap-1','category-distribution-list max-lg:gap-0');
replace('category-dist-row max-lg:grid','category-dist-row max-lg:min-h-9 max-lg:grid');
replace('category-dist-name max-lg:col-start-1 max-lg:row-start-1 max-lg:truncate"','category-dist-name max-lg:col-start-1 max-lg:row-start-1 max-lg:truncate" title={type}');
replace('priority-spec-box priority-${key.toLowerCase().slice(0, 4)}','priority-spec-box');
replace('max-lg:h-[72px] priority-spec-box','max-lg:h-[108px] priority-spec-box');
replace('max-lg:[scrollbar-width:thin] max-lg:[&>article]', 'max-lg:[scrollbar-width:none] max-lg:[&::-webkit-scrollbar]:hidden max-lg:items-start max-lg:[&>article]');
// Line charts use measured width and height with deliberate insets for labels.
replace('max-lg:h-[220px] max-lg:min-h-[220px] max-lg:flex-none max-lg:touch-pan-y','max-lg:h-[252px] max-lg:min-h-[252px] max-lg:flex-none max-lg:touch-pan-y');
replace('const viewBoxHeight = mobile ? 220 : 280','const viewBoxHeight = mobile ? velocitySize.height || 252 : 280');
// Traffic uses its own observed height (same expression occurs after velocity).
const trafficStart=s.indexOf('const svgViewBoxWidth = mobile ? trafficSize.width');
s=s.slice(0,trafficStart)+s.slice(trafficStart).replace('mobile ? velocitySize.height || 252 : 280','mobile ? trafficSize.height || 252 : 280');
replace('const baselineY = mobile ? 192 : 226','const baselineY = mobile ? viewBoxHeight - 36 : 226');
replace('const startX = mobile ? 36 : 64','const startX = mobile ? 42 : 64');
replace('const startX = mobile ? 36 : 46','const startX = mobile ? 42 : 46');
replace('const endX = svgViewBoxWidth - (mobile ? 12 : 90)','const endX = svgViewBoxWidth - (mobile ? 24 : 90)');
replace('const endX = svgViewBoxWidth - (mobile ? 12 : 36)','const endX = svgViewBoxWidth - (mobile ? 24 : 36)');
replace('const topY = mobile ? 12 : 32','const topY = mobile ? 30 : 32');
replace('const topY = mobile ? 12 : 38','const topY = mobile ? 38 : 38');
replace('compact-velocity-chart-svg max-lg:min-h-[220px]','compact-velocity-chart-svg max-lg:min-h-[252px]');
replace('compact-shift-traffic-chart-svg max-lg:min-h-[220px]','compact-shift-traffic-chart-svg max-lg:min-h-[252px]');
replace('x={startX - 16}','x={mobile ? startX - 12 : startX - 16}');
replace('x={p.x}\n                                      y={baselineY + 18}','x={mobile ? Math.min(svgViewBoxWidth - 19, Math.max(19, p.x)) : p.x}\n                                      y={baselineY + 22}');
// Show SLA labels inside the mobile plot, away from their dashed line.
replace('<g className="max-lg:hidden" transform={`translate(${endX + 10}, ${y90 - 8})`}>','<g transform={`translate(${mobile ? endX - 82 : endX + 10}, ${mobile ? Math.max(topY, y90 - 24) : y90 - 8})`}>');
replace('<g className="max-lg:hidden" transform={`translate(${endX + 10}, ${y60 - 8})`}>','<g transform={`translate(${mobile ? endX - 82 : endX + 10}, ${mobile ? y60 - 24 : y60 - 8})`}>');
// Mobile threshold label boxes accommodate 11px type.
const b=s.indexOf('{/* Right threshold tag for 90m */}'),e=s.indexOf('{/* ── 3. Gradient Area');
if(e<0)throw Error('threshold boundary');
let labels=s.slice(b,e).replaceAll('width="68"','width={mobile ? 82 : 68}').replaceAll('height="16"','height={mobile ? 20 : 16}').replaceAll('x="34"','x={mobile ? 41 : 34}').replaceAll('y="11"','y={mobile ? 14 : 11}');
s=s.slice(0,b)+labels+s.slice(e);
replace('!mobile && isMax && !isHovered','isMax && !hoveredVelocityPoint');
replace('!mobile && isMin && !isHovered','isMin && !hoveredVelocityPoint');
replace('isBreach && !isMax && !isHovered','!mobile && isBreach && !isMax && !isHovered');
replace('Math.max(halfW + 6, Math.min(svgViewBoxWidth - halfW - 6, p.x))','Math.max((mobile ? startX : 0) + halfW + 6, Math.min((mobile ? endX : svgViewBoxWidth) - halfW - 6, p.x))');
replace('const maxBadgeHeight = 17;','const maxBadgeHeight = mobile ? 22 : 17;');
replace('const minBadgeHeight = 17;','const minBadgeHeight = mobile ? 22 : 17;');
replace('const rectY = placeBelow ? p.y + 8 : p.y - 8 - maxBadgeHeight;','const rawY = placeBelow ? p.y + 8 : p.y - 8 - maxBadgeHeight;\n                                  const rectY = mobile ? Math.max(topY, Math.min(baselineY - maxBadgeHeight, rawY)) : rawY;');
replace('const rectY = placeAbove ? p.y - 8 - minBadgeHeight : p.y + 8;','const rawY = placeAbove ? p.y - 8 - minBadgeHeight : p.y + 8;\n                                  const rectY = mobile ? Math.max(topY, Math.min(baselineY - minBadgeHeight, rawY)) : rawY;');
// Suppress extra callouts when they collide with the SLA label band or each other.
replace('isMax && !hoveredVelocityPoint && (() => {','isMax && !hoveredVelocityPoint && (() => {');
replace('fill="#0f172a"\n                                        stroke=', 'fill={mobile ? "rgba(15,23,42,0.9)" : "#0f172a"}\n                                        stroke=');
// Clamp mobile HTML tooltips to the measured container; desktop geometry is unchanged.
replace('left: `${hoveredVelocityPoint.percentX}%`,','left: mobile ? Math.max(112, Math.min(velocitySize.width - 112, hoveredVelocityPoint.x)) : `${hoveredVelocityPoint.percentX}%`,');
replace('top: `${hoveredVelocityPoint.percentY}%`,','top: mobile ? 108 : `${hoveredVelocityPoint.percentY}%`,');
replace('left: `${hoveredShiftTrafficPoint.percentX}%`,','left: mobile ? Math.max(112, Math.min(trafficSize.width - 112, hoveredShiftTrafficPoint.x)) : `${hoveredShiftTrafficPoint.percentX}%`,');
replace('top: `${hoveredShiftTrafficPoint.percentY}%`,','top: mobile ? 170 : `${hoveredShiftTrafficPoint.percentY}%`,');
replace('velocity-chart-tooltip"','velocity-chart-tooltip max-lg:w-[220px] max-lg:min-w-0 max-lg:whitespace-normal max-lg:animate-none"');
replace('shift-traffic-tooltip"','shift-traffic-tooltip max-lg:w-[220px] max-lg:min-w-0 max-lg:whitespace-normal"');
// Use actual plot insets when resolving touch coordinates; keyboard uses the same selection.
replace('box.left - 36) / Math.max(1, box.width - 48)','box.left - 42) / Math.max(1, box.width - 66)');
replace('x: 36 + idx * (box.width - 48)','x: 42 + idx * (box.width - 66)');
// Short peak annotation; leave room above the point and clamp its full width.
replace('const clampedPercentX = Math.max(6, Math.min(94, percentX));','const clampedPercentX = Math.max(6, Math.min(94, percentX));\n                      const mobilePeakX = Math.max(startX + 55, Math.min(endX - 55, peak.x));');
replace('shift-traffic-peak-badge"','shift-traffic-peak-badge max-lg:flex max-lg:h-6 max-lg:px-2"');
replace('left: `${clampedPercentX}%`,','left: mobile ? mobilePeakX : `${clampedPercentX}%`,');
replace('top: `${percentY}%`,\n                            transform: isNearTop','top: mobile ? Math.max(0, peak.y - 32) : `${percentY}%`,\n                            transform: mobile ? "translateX(-50%)" : isNearTop');
replace('Lonjakan: <strong>{peak.count} Tiket</strong> ({peak.shiftName})','{mobile ? <>Lonjakan <strong>{peak.count}</strong></> : <>Lonjakan: <strong>{peak.count} Tiket</strong> ({peak.shiftName})</>}');
replace('style={{ left: `${percentX}%` }}','style={{ left: mobile ? Math.max(19, Math.min(svgViewBoxWidth - 19, x)) : `${percentX}%` }}');
replace('shift-traffic-filter-bar max-lg:flex-nowrap max-lg:[&_.shift-filter-buttons]:flex-nowrap max-lg:overflow-x-auto max-lg:overscroll-x-contain max-lg:[&_.shift-filter-buttons>span]:hidden','shift-traffic-filter-bar max-lg:pr-0 max-lg:flex-nowrap max-lg:[&_.shift-filter-buttons]:grid max-lg:[&_.shift-filter-buttons]:grid-cols-4 max-lg:[&_.shift-filter-buttons]:w-full max-lg:[&_.shift-filter-buttons]:gap-2 max-lg:[&_.shift-filter-buttons>span]:hidden max-lg:[&_.shift-filter-btn]:justify-center max-lg:[&_.shift-filter-btn]:min-w-0 max-lg:[&_.shift-filter-btn]:px-0 max-lg:[&_.shift-filter-btn]:gap-1');
for (const label of ['Semua Shift','Shift Pagi','Shift Malam','Shift Subuh']) {
 const short=label==='Semua Shift'?'Semua':label.replace('Shift ','');
 replace(`<span>${label}</span>`,`<span className="hidden lg:inline">${label}</span><span className="lg:hidden">${short}</span>`);
}
// Expose selection state for segmented controls without changing URL/filter behavior.
for(const value of ['all','Pagi','Malam','Subuh']) replace(`onClick={() => setActiveShiftLineFilter("${value}")}`,`aria-pressed={activeShiftLineFilter === "${value}"}\n                  onClick={() => setActiveShiftLineFilter("${value}")}`);
// Match compact staff project scrolling to the legend hints.
replace('<div className="flex items-center gap-[4px] text-[9px]', '<HorizontalScroll className="flex items-center gap-[4px] text-[9px]');
replace('max-lg:[mask-image:linear-gradient(to_right,black_calc(100%-16px),transparent)]','');
replace('</div>\n                  </button>\n                ))}', '</HorizontalScroll>\n                  </button>\n                ))}');
writeFileSync(file,s);
