import {readFileSync,writeFileSync} from 'node:fs';
const file='frontend/app/components/tickets/TicketReportView.tsx';let s=readFileSync(file,'utf8');
function replace(a,b){if(!s.includes(a))throw Error('Missing '+a.slice(0,100));s=s.replaceAll(a,b);}
replace('import { HorizontalScroll }','import { placeChartCallout, type ChartBox } from "@/app/lib/chart-layout";\nimport { HorizontalScroll }');
// One pair of panels, with only the selected compact panel participating in layout.
replace('if (target) target.scrollTo({ left: index * (target.clientWidth + 12), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });','if (target && !mobile) target.scrollTo({ left: index * (target.clientWidth + 12) });');
replace('if (mobile) setDistributionIndex(Math.round(event.currentTarget.scrollLeft / (event.currentTarget.clientWidth + 12)));','// Panel selection is controlled by the two accessible buttons.');
replace('const target = distributionRef.current;','const target = distributionRef.current;');
replace('max-lg:flex max-lg:overflow-x-auto max-lg:overscroll-x-contain max-lg:snap-x max-lg:snap-mandatory','max-lg:block');
replace('className={`${REPORT_PANEL_CARD} report-panel @container`}', 'className={`${REPORT_PANEL_CARD} report-panel @container ${distributionIndex === 0 ? "" : "max-lg:hidden"}`}');
// Severity has the same token as category; select by its following title.
const at=s.indexOf('{/* Severity Distribution */}');s=s.slice(0,at)+s.slice(at).replace('distributionIndex === 0','distributionIndex === 1');
replace('isMax && !hoveredVelocityPoint && (() => {','isMax && (mobile ? !hoveredVelocityPoint : !isHovered) && (() => {');
replace('isMin && !hoveredVelocityPoint && (() => {','isMin && (mobile ? !hoveredVelocityPoint : !isHovered) && (() => {');
const marker='// X-axis stride to avoid crowding';
replace(marker,`const calloutBounds: ChartBox = { x: startX, y: 6, width: endX - startX, height: baselineY - 10 };
                    const occupied: ChartBox[] = [60, 90].map(value => ({ x: endX - 82, y: baselineY - Math.round(value / yMax * chartHeight) - 24, width: 82, height: 24 }));
                    // Reserve the actual line segments, not only their end points.
                    points.slice(1).forEach((point, index) => {
                      const previous = points[index];
                      occupied.push({ x: previous.x - 2, y: Math.min(point.y, previous.y) - 3, width: point.x - previous.x + 4, height: Math.abs(point.y - previous.y) + 6 });
                    });
                    const maxCallout = maxPoint ? placeChartCallout(maxPoint.x, maxPoint.y, 72, 22, calloutBounds, occupied) : null;
                    const minCallout = minPoint ? placeChartCallout(minPoint.x, minPoint.y, 68, 22, calloutBounds, maxCallout ? [...occupied, maxCallout] : occupied) : null;
                    ${marker}`);
replace('const clampedX = Math.max((mobile ? startX : 0) + halfW + 6, Math.min((mobile ? endX : svgViewBoxWidth) - halfW - 6, p.x));\n                                  const placeBelow', 'const clampedX = Math.max((mobile ? startX : 0) + halfW + 6, Math.min((mobile ? endX : svgViewBoxWidth) - halfW - 6, p.x));\n                                  const placeBelow');
replace('const rectY = mobile ? Math.max(topY, Math.min(baselineY - maxBadgeHeight, rawY)) : rawY;', 'if (mobile && !maxCallout) return null;\n                                  const rectY = mobile ? maxCallout!.y : rawY;\n                                  const badgeX = mobile ? maxCallout!.x + halfW : clampedX;');
replace('const rectY = mobile ? Math.max(topY, Math.min(baselineY - minBadgeHeight, rawY)) : rawY;', 'if (mobile && !minCallout) return null;\n                                  const rectY = mobile ? minCallout!.y : rawY;\n                                  const badgeX = mobile ? minCallout!.x + halfW : clampedX;');
// Replace coordinates only inside the max/min badges.
const b=s.indexOf('{/* Milestone Callout Badge (Peak Max point) */}'),e=s.indexOf('{/* Breach callout if breached');
s=s.slice(0,b)+s.slice(b,e).replaceAll('x={clampedX - halfW}','x={badgeX - halfW}').replaceAll('x={clampedX}','x={badgeX}')+s.slice(e);
// Both measured charts support keyboard inspection, without adding more DOM.
for(const [name,dates,hover,setter,size] of [
 ['velocity','volumeByDate.map(item => item.date)','hoveredVelocityPoint','setHoveredVelocityPoint','velocitySize'],
 ['traffic','shiftHeatmapData.dateList','hoveredShiftTrafficPoint','setHoveredShiftTrafficPoint','trafficSize']]){
 const start=name==='velocity'?'ref={velocityChartRef}':'ref={trafficChartRef}';
 const selection=name==='velocity'
 ? `const item = volumeByDate[index]; ${setter}({ x, y: 100, date: item.date, avgResolution: item.avgResolution, closed: item.closed, percentX: 50, percentY: 60 });`
 : `const date = dates[index]; const subuh = shiftHeatmapData.matrix.Subuh[date] || 0, pagi = shiftHeatmapData.matrix.Pagi[date] || 0, malam = shiftHeatmapData.matrix.Malam[date] || 0; ${setter}({ x, y: 100, date, subuh, pagi, malam, total: subuh + pagi + malam, percentX: 50, percentY: 80 });`;
 replace(start,`${start}
                  role="group"
                  tabIndex={mobile ? 0 : undefined}
                  aria-label="${name==='velocity'?'Tren durasi':'Tren trafik'}; gunakan panah kiri atau kanan untuk rincian"
                  onBlur={() => { if (mobile) ${setter}(null); }}
                  onKeyDown={event => {
                    if (!mobile) return;
                    if (event.key === "Escape") { ${setter}(null); return; }
                    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                    event.preventDefault();
                    const dates = ${dates}; if (!dates.length) return;
                    const current = ${hover} ? dates.indexOf(${hover}.date) : dates.length - 1;
                    const index = event.key === "Home" ? 0 : event.key === "End" ? dates.length - 1 : Math.max(0, Math.min(dates.length - 1, current + (event.key === "ArrowRight" ? 1 : -1)));
                    const x = 42 + index * (${size}.width - 66) / Math.max(1, dates.length - 1);
                    ${selection}
                  }}`);
}
replace('className="absolute pointer-events-none z-[99] -translate-x-1/2 -translate-y-full -mt-[12px]','role="status" aria-live="polite" className="absolute pointer-events-none z-[99] -translate-x-1/2 -translate-y-full -mt-[12px]');
// Skeleton geometry is set by the same compact card sizes as the loaded state.
writeFileSync(file,s);
