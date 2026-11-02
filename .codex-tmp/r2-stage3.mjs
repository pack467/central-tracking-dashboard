import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';import {dirname,join} from 'node:path';
function edit(path,fn){const copy=join('output/mobile-round2/source-before',path);mkdirSync(dirname(copy),{recursive:true});copyFileSync(path,copy);let s=readFileSync(path,'utf8');const replace=(a,b)=>{if(!s.includes(a))throw Error('Missing '+a.slice(0,70));s=s.replaceAll(a,b);};fn(replace);writeFileSync(path,s);}
edit('frontend/app/components/routing/AppShell.tsx',replace=>{
 replace('import { BottomNav }','import { useMobileChrome } from "@/app/hooks/useMobileChrome";\nimport { BottomNav }');
 replace('const state = useShellState();','const state = useShellState();\n  const mobileChrome = useMobileChrome();');
 replace('max-[660px]:pb-[36px]','max-[660px]:pb-[36px] max-md:pt-3 max-md:px-4 max-[400px]:px-3');
 replace(' max-[400px]:-mx-1 max-[400px]:w-[calc(100%+8px)]','');
 replace('className="h-[calc(100px+var(--ctd-safe-bottom,env(safe-area-inset-bottom,0px)))] md:hidden"','className="h-[calc(112px+var(--ctd-safe-bottom,env(safe-area-inset-bottom,0px)))] md:hidden [@media(max-height:499px)_and_(max-width:1023px)]:block"');
 replace('<FloatingNewTicketButton onClick={openTicketCreate} isOpen={ticketModalOpen} />','<FloatingNewTicketButton onClick={openTicketCreate} isOpen={ticketModalOpen} scrollHidden={mobileChrome.scrollHidden} keyboardOpen={mobileChrome.keyboardOpen} onReveal={mobileChrome.revealFab} />');
 replace('<BottomNav openTicketCount={openTicketCount}','<BottomNav keyboardOpen={mobileChrome.keyboardOpen} openTicketCount={openTicketCount}');
});
edit('frontend/app/components/layout/BottomNav.tsx',replace=>{
 replace('openTicketCount?: number;','openTicketCount?: number;\n  keyboardOpen?: boolean;');
 replace('openTicketCount = 0,','openTicketCount = 0,\n  keyboardOpen = false,');
 replace('aria-label="Navigasi bawah mobile"','aria-label="Navigasi bawah mobile"\n        data-keyboard-open={keyboardOpen}');
 replace('fixed bottom-0 left-0 right-0 z-[85] md:hidden','fixed bottom-0 left-0 right-0 z-[85] md:hidden [@media(max-height:499px)_and_(max-width:1023px)]:block data-[keyboard-open=true]:invisible data-[keyboard-open=true]:pointer-events-none');
 replace('h-[56px] px-1 max-w-lg mx-auto','h-[56px] px-1 max-w-lg mx-auto [@media(max-height:499px)]:h-11 [@media(max-height:499px)]:[&_a]:min-h-11 [@media(max-height:499px)]:[&_button]:min-h-11 [@media(max-height:499px)]:[&_.bottom-nav-label]:hidden');
 replace('-top-1.5 -right-2','-top-1.5 -right-3');
 replace('className="text-[11px] font-medium tracking-tight mt-0.5 whitespace-nowrap"','className="bottom-nav-label text-[11px] font-medium tracking-tight mt-0.5 whitespace-nowrap"');
 replace('className="text-[11px] font-medium tracking-tight mt-0.5 truncate max-w-[68px]"','className="bottom-nav-label text-[11px] font-medium tracking-tight mt-0.5 whitespace-nowrap"');
});
edit('frontend/app/components/ui/FloatingNewTicketButton.tsx',replace=>{
 replace('isOpen?: boolean;','isOpen?: boolean;\n  scrollHidden?: boolean;\n  keyboardOpen?: boolean;\n  onReveal?: () => void;');
 replace('({ onClick, isOpen = false }: FloatingNewTicketButtonProps)','({ onClick, isOpen = false, scrollHidden = false, keyboardOpen = false, onReveal }: FloatingNewTicketButtonProps)');
 replace('type="button"\r\n      className=', 'type="button"\r\n      data-scroll-hidden={scrollHidden}\r\n      data-keyboard-open={keyboardOpen}\r\n      onFocus={onReveal}\r\n      className=');
 replace('motion-reduce:transition-none ${','motion-reduce:transition-none max-md:transition-[translate,opacity] max-md:duration-200 max-md:data-[scroll-hidden=true]:translate-y-4 max-md:data-[scroll-hidden=true]:opacity-0 max-md:data-[scroll-hidden=true]:pointer-events-none max-md:focus-visible:translate-y-0 max-md:focus-visible:opacity-100 max-md:focus-visible:pointer-events-auto max-lg:data-[keyboard-open=true]:invisible max-lg:data-[keyboard-open=true]:pointer-events-none [@media(max-height:499px)_and_(max-width:1023px)]:bottom-[calc(56px+env(safe-area-inset-bottom,0px))] [@media(max-height:499px)_and_(max-width:1023px)]:right-3 [@media(max-height:499px)_and_(max-width:1023px)]:data-[scroll-hidden=true]:opacity-0 [@media(max-height:499px)_and_(max-width:1023px)]:data-[scroll-hidden=true]:pointer-events-none ${');
});
edit('frontend/app/layout.tsx',replace=>{
 replace('<body className="antialiased','<body className="[-webkit-tap-highlight-color:transparent] [&_button]:touch-manipulation [&_a]:touch-manipulation [&_[role=button]]:touch-manipulation [&_:is(button,a,input,select,textarea,[tabindex]):focus-visible]:outline-2 [&_:is(button,a,input,select,textarea,[tabindex]):focus-visible]:outline-offset-2 [&_:is(button,a,input,select,textarea,[tabindex]):focus-visible]:outline-sky-400 max-lg:[&_:is(button,a,[role=button]):active]:bg-[#243044] max-lg:[&_:is(button,a,[role=button]):active]:scale-[0.98] max-lg:[&_:is(button,a,[role=button])]:duration-100 motion-reduce:[&_*]:transition-none motion-reduce:[&_*]:animate-none antialiased');
});
// Avoid a redundant extra tab stop; each bar already has a keyboard action.
const p='frontend/app/components/tickets/TicketReportView.tsx';let s=readFileSync(p,'utf8').replace('aria-label="Volume tiket, geser untuk tanggal sebelumnya" tabIndex={0}','aria-label="Volume tiket, geser untuk tanggal sebelumnya"');
s=s.replace('className="line-clamp-3 whitespace-pre-line text-[13px] leading-5 text-slate-300 lg:hidden"','title={shiftMemo} className="line-clamp-3 whitespace-pre-line text-[13px] leading-5 text-slate-300 lg:hidden"');
s=s.replace('velocity-metric-label">Kepatuhan SLA','velocity-metric-label max-lg:whitespace-normal" title="Kepatuhan SLA (≤60m)">Kepatuhan SLA');
writeFileSync(p,s);
