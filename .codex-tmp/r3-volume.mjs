import {readFileSync,writeFileSync} from 'node:fs';
const path='frontend/app/components/tickets/TicketReportView.tsx';let s=readFileSync(path,'utf8');
function replace(a,b){if(!s.includes(a))throw Error('Missing '+a.slice(0,100));s=s.replace(a,b);}
replace('export function TicketReportView(',`// The 10px minimum wins on narrow phones; dense ranges keep a 14px slot.
function compactVolumeGeometry(count: number, available: number) {
  const fits = count <= 31 && available >= count * 10 + 16;
  const width = fits ? available : Math.max(available, count * 14 + 16);
  const bar = Math.min(24, Math.max(10, (width - 16 - Math.max(0, count - 1) * 3) / Math.max(1, count)));
  const step = count > 1 ? (width - 16 - bar) / (count - 1) : 0;
  return { fits, width, bar, step, start: count > 1 ? 8 + bar / 2 : width / 2 };
}

export function TicketReportView(`);
replace('const [hoveredDate, setHoveredDate]', 'const [volumeTouch, setVolumeTouch] = useState<{ index: number; x: number } | null>(null);\n  const [hoveredDate, setHoveredDate]');
replace('    volumeChartRef.current.scrollLeft = volumeChartRef.current.scrollWidth;', `    if (selectedChartTab !== "stacked-project") { volumeChartRef.current.scrollLeft = volumeChartRef.current.scrollWidth; return; }
    const geometry = compactVolumeGeometry(volumeByDate.length, volumeSize.width);
    const peakIndex = volumeByDate.findIndex(day => day.created === maxDayCreated);
    volumeChartRef.current.scrollLeft = geometry.fits ? 0 : Math.max(0, geometry.start + peakIndex * geometry.step - volumeSize.width / 2);`);
replace('[mobile, volumeByDate, volumeSize.width, volumeChartRef, selectedChartTab]', '[mobile, volumeByDate, maxDayCreated, volumeSize.width, volumeChartRef, selectedChartTab]');
replace('  // ── Operational Focus Computations ──', `  useEffect(() => {
    if (!mobile || !volumeTouch) return;
    const outside = (event: PointerEvent) => { if (!(event.target as Element).closest("[data-volume-plot]")) setVolumeTouch(null); };
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") setVolumeTouch(null); };
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [mobile, volumeTouch]);

  // ── Operational Focus Computations ──`);
replace('primary-chart-panel`}', 'primary-chart-panel max-lg:[&.primary-chart-panel_.panel-view-action-btn]:size-10 max-lg:[&.primary-chart-panel_.panel-view-action-btn]:min-h-10 max-lg:[&.primary-chart-panel_.panel-view-action-btn]:min-w-10 max-lg:[&.primary-chart-panel_.panel-view-action-btn_span]:hidden`}');
replace('minHeight={mobile ? 315 : 300}','minHeight={mobile ? 303 : 300}');replace('max-lg:h-[315px]','max-lg:h-[303px]');
replace('                {volumeByDate.length > 0 ? (',`                {volumeByDate.length > 0 ? (`);
replace('                    {(() => {\n                      const n = volumeByDate.length;', `                    <div className="hidden h-4 shrink-0 items-center justify-between gap-2 whitespace-nowrap text-[11px] leading-4 text-slate-400 max-lg:flex">
                      <span>Total {analyticsTickets.length} · Puncak {maxDayCreated} ({volumeByDate.find(day => day.created === maxDayCreated)?.date.slice(5)})</span>
                      <span className="font-mono">{volumeByDate[0].date.slice(5)}–{volumeByDate.at(-1)?.date.slice(5)}</span>
                    </div>
                    {(() => {
                      const n = volumeByDate.length;
                      const compact = compactVolumeGeometry(n, volumeSize.width);`);
replace('mobile ? Math.max(volumeSize.width, n * 52 + 12)', 'mobile ? compact.width');
replace('const stepX = n > 1 ? Math.min(maxStep, Math.max(minStep, totalSpan / (n - 1))) : 0;', 'const stepX = mobile ? compact.step : n > 1 ? Math.min(maxStep, Math.max(minStep, totalSpan / (n - 1))) : 0;');
replace('const barWidth = Math.min(44, Math.max(20, Math.round(stepX * 0.64)));','const barWidth = mobile ? compact.bar : Math.min(44, Math.max(20, Math.round(stepX * 0.64)));');
replace('const actualStartX = n > 1 &&', 'const actualStartX = mobile ? compact.start : n > 1 &&');
replace('const viewBoxHeight = mobile ? 252 : 270;', 'const viewBoxHeight = mobile ? 220 : 270;');replace('const baselineY = mobile ? 216 : 225;','const baselineY = mobile ? 184 : 225;');replace('const topY = mobile ? 22 : 22;','const topY = mobile ? 16 : 22;');
replace('<div className="contents max-lg:block max-lg:relative max-lg:w-full max-lg:pl-9 max-lg:h-[252px]">', `<div data-volume-plot className="contents max-lg:block max-lg:relative max-lg:w-full max-lg:pl-9 max-lg:h-[220px]" onPointerDown={event => {
                          if (!mobile) return;
                          const box = event.currentTarget.getBoundingClientRect();
                          const x = event.clientX - box.left - 36 + (volumeChartRef.current?.scrollLeft ?? 0);
                          setVolumeTouch({ index: Math.max(0, Math.min(n - 1, Math.round((x - compact.start) / (compact.step || 1)))), x: Math.max(4, Math.min(box.width - Math.min(220, box.width - 8) - 4, event.clientX - box.left - 110)) });
                        }} onPointerMove={event => {
                          if (!mobile || !event.buttons) return;
                          const box = event.currentTarget.getBoundingClientRect();
                          const x = event.clientX - box.left - 36 + (volumeChartRef.current?.scrollLeft ?? 0);
                          setVolumeTouch({ index: Math.max(0, Math.min(n - 1, Math.round((x - compact.start) / (compact.step || 1)))), x: Math.max(4, Math.min(box.width - Math.min(220, box.width - 8) - 4, event.clientX - box.left - 110)) });
                        }}>`);
replace('viewBox="0 0 36 252"','viewBox="0 0 36 220"');replace('top-0 h-[252px] w-9','top-0 h-[220px] w-9');replace('y={216 - tick / stackedYTicks.yMax * 194 + 4}','y={184 - tick / stackedYTicks.yMax * 168 + 4}');
replace('aria-label="Volume tiket, geser untuk tanggal sebelumnya"','aria-label="Volume tiket per tanggal; ketuk atau geser untuk rincian"');
replace('max-lg:min-h-[252px] max-lg:h-[252px] max-lg:flex-none max-lg:overscroll-x-contain max-lg:snap-x max-lg:snap-proximity max-lg:touch-auto','max-lg:min-h-[220px] max-lg:h-[220px] max-lg:flex-none max-lg:overscroll-x-contain');
replace('" + volumeFade}>','" + (compact.fits ? " max-lg:touch-pan-y " : " max-lg:touch-auto ") + volumeFade}>');
replace('height: 252, flexShrink: 0','height: 220, flexShrink: 0');replace('max-lg:min-h-[252px] max-lg:h-[252px]','max-lg:min-h-[220px] max-lg:h-[220px]');
replace('const x = n > 1 ? Math.round(actualStartX + idx * stepX - barWidth / 2) : Math.round(svgViewBoxWidth / 2 - barWidth / 2);','const x = mobile ? actualStartX + idx * stepX - barWidth / 2 : n > 1 ? Math.round(actualStartX + idx * stepX - barWidth / 2) : Math.round(svgViewBoxWidth / 2 - barWidth / 2);');
replace('x={x - 6} y={topY} width={44}', 'x={x - Math.max(0, stepX - barWidth) / 2} y={topY} width={Math.max(barWidth, stepX)}');
replace('Math.max(visibleTotal > 0 ? 6 : 0,','Math.max(visibleTotal > 0 ? 3 : 0,');
replace('strokeWidth={isSelected ? "1" : "1.5"}','strokeWidth={mobile ? "0.5" : isSelected ? "1" : "1.5"}');
replace('x={x + barWidth / 2}\n                                    y={currentY - 8}', 'x={mobile ? Math.min(svgViewBoxWidth - 18, Math.max(18, x + barWidth / 2)) : x + barWidth / 2}\n                                    y={currentY - 8}');
replace('idx % 2 === 0 || idx === n - 1','idx % Math.max(1, Math.ceil(n / Math.max(2, Math.floor(volumeSize.width / 55)))) === 0 || idx === n - 1');
replace('x={x + barWidth / 2}\n                                    y={baselineY + 22}', 'x={mobile ? Math.min(svgViewBoxWidth - 20, Math.max(20, x + barWidth / 2)) : x + barWidth / 2}\n                                    y={baselineY + 22}');
replace('fontSize="10.5"\n                                    fontWeight={isSelected', 'fontSize={mobile ? "11" : "10.5"}\n                                    fontWeight={isSelected');
replace('                          </svg>\n                        </div>\n                        </div>\n                      );', `                          </svg>
                        </div>
                        {mobile && volumeTouch && volumeByDate[volumeTouch.index] && <div role="status" aria-live="polite" className="pointer-events-none absolute top-1 z-10 w-[220px] max-w-[calc(100%-8px)] rounded-lg border border-sky-400/40 bg-slate-900/95 p-2 text-[11px] leading-4 text-slate-200 shadow-lg" style={{ left: volumeTouch.x }}>
                          <div className="font-semibold text-sky-300">{volumeByDate[volumeTouch.index].date} · Total {volumeByDate[volumeTouch.index].created}</div>
                          <div>{Object.entries(volumeByDate[volumeTouch.index].projectCounts).slice(0, 3).map(([project, count]) => project + ": " + count).join(" · ")}</div>
                        </div>}
                        </div>
                      );`);
replace('project-legend-pill max-lg:min-h-10 max-lg:min-w-10','project-legend-pill max-lg:h-8 max-lg:min-h-8 max-lg:min-w-8');
replace('<div className="p-[40px_0] text-center text-[var(--ink-muted)] text-[12px] chart-empty-hint">Tidak ada data volume pada rentang filter ini.</div>', `<div className="flex min-h-[270px] flex-col items-center justify-center gap-3 text-[13px] text-slate-400 chart-empty-hint max-lg:h-[303px] max-lg:min-h-[220px]">
                    <BarChart3 size={24} className="text-slate-500" /><span>Tidak ada data</span>
                    {isAnyAnalyticsFilterActive && <button type="button" onClick={resetAllAnalyticsFilters} className="min-h-11 rounded-lg border border-slate-600 bg-[#243044] px-3 font-semibold text-slate-200">Reset filter</button>}
                  </div>`);
writeFileSync(path,s);
