"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  MoreHorizontal,
  Users,
  ArrowRight,
  Sun,
  Sunset,
  Moon,
  ShieldCheck,
} from "lucide-react";
import { isActivePath, operationalNavItems as PRIMARY_NAV, mobileMoreNavItems as MORE_LINKS } from "@/app/lib/routes";
import { BottomSheet } from "@/app/components/ui/BottomSheet";
import { useActiveShift, useLiveClock } from "@/app/hooks/useLiveClock";

interface BottomNavProps {
  openTicketCount?: number;
  keyboardOpen?: boolean;
  onOpenHandover?: () => void;
  onOpenShiftCoverage?: () => void;
}

export function BottomNav({
  openTicketCount = 0,
  keyboardOpen = false,
  onOpenHandover,
  onOpenShiftCoverage,
}: BottomNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const activeShift = useActiveShift();
  const clock = useLiveClock();

  const isMoreActive = MORE_LINKS.some((m) => isActivePath(pathname, m.path));
  const ShiftIcon = activeShift.id === "subuh" ? Moon : activeShift.id === "pagi" ? Sun : Sunset;

  return (
    <>
      <nav
        aria-label="Navigasi bawah mobile"
        data-keyboard-open={keyboardOpen}
        className="fixed bottom-0 left-0 right-0 z-[85] md:hidden [@media(max-height:499px)_and_(max-width:1023px)]:block data-[keyboard-open=true]:invisible data-[keyboard-open=true]:pointer-events-none bg-[#0f172a]/92 backdrop-blur-sm border-t border-[#334155]/80 pb-[var(--ctd-safe-bottom,env(safe-area-inset-bottom,0px))] print:hidden"
      >
        <div className="flex items-center justify-around gap-2 h-[56px] px-1 max-w-lg mx-auto [@media(max-height:499px)]:h-11 [@media(max-height:499px)]:[&_a]:min-h-11 [@media(max-height:499px)]:[&_button]:min-h-11 [@media(max-height:499px)]:[&_.bottom-nav-label]:hidden">
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(pathname, item.path);

            return (
              <Link
                key={item.label}
                href={item.path}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center justify-center flex-1 h-full py-1 min-w-[56px] transition-colors ${
                  active ? "text-sky-400" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <div className="relative flex items-center justify-center w-6 h-6">
                  <Icon size={20} strokeWidth={active ? 2.3 : 1.8} />
                  {item.label === "Tickets" && openTicketCount > 0 && (
                    <span className="absolute -top-1.5 -right-3 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white font-mono text-[11px] font-bold flex items-center justify-center leading-none">
                      {openTicketCount}
                    </span>
                  )}
                </div>
                <span className="bottom-nav-label text-[11px] font-medium tracking-tight mt-0.5 whitespace-nowrap">
                  {item.label}
                </span>
                {active && (
                  <span className="absolute bottom-1 w-4 h-0.5 rounded-full bg-sky-400 shadow-[0_0_6px_#38bdf8]" />
                )}
              </Link>
            );
          })}

          {/* Lainnya Button */}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-expanded={moreOpen}
            aria-current={isMoreActive ? "page" : undefined}
            className={`relative flex flex-col items-center justify-center flex-1 h-full py-1 min-w-[56px] transition-colors cursor-pointer ${
              isMoreActive || moreOpen ? "text-sky-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <div className="relative flex items-center justify-center w-6 h-6">
              <MoreHorizontal size={20} strokeWidth={isMoreActive ? 2.3 : 1.8} />
            </div>
            <span className="bottom-nav-label text-[11px] font-medium tracking-tight mt-0.5 whitespace-nowrap">
              Lainnya
            </span>
            {isMoreActive && (
              <span className="absolute bottom-1 w-4 h-0.5 rounded-full bg-sky-400 shadow-[0_0_6px_#38bdf8]" />
            )}
          </button>
        </div>
      </nav>

      {/* Sheet Menu Lainnya */}
      <BottomSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title={
          <span className="flex items-center gap-2">
            <MoreHorizontal size={18} className="text-sky-400" />
            Lainnya
          </span>
        }
        dataSheetId="more-nav-sheet"
      >
        <div className="flex flex-col gap-4 pb-2">
          {/* Active Shift & Handover Quick Card */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-700/70 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <ShiftIcon size={15} />
                </span>
                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-400 font-medium">Shift Aktif</span>
                  <strong className="text-xs font-bold text-slate-100">{activeShift.name}</strong>
                </div>
              </div>

              {clock && (
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 font-mono block">{clock.time} WIB</span>
                  <span className="text-[11px] text-slate-500 truncate block">{clock.dateShort}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {onOpenHandover && (
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    onOpenHandover();
                  }}
                  className="flex items-center justify-center gap-1.5 min-h-10 py-2 px-3 rounded-lg text-xs font-semibold bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 transition-colors cursor-pointer"
                >
                  <ShieldCheck size={13} />
                  <span>Handover</span>
                </button>
              )}

              {onOpenShiftCoverage && (
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    onOpenShiftCoverage();
                  }}
                  className="flex items-center justify-center gap-1.5 min-h-10 py-2 px-3 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer"
                >
                  <Users size={13} />
                  <span>Tim Online</span>
                </button>
              )}
            </div>
          </div>

          {/* More Navigation Links */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
              Halaman Lainnya
            </span>
            <div className="flex flex-col divide-y divide-slate-800/80 rounded-xl bg-slate-900/60 border border-slate-800 overflow-hidden">
              {MORE_LINKS.map((item) => {
                const Icon = item.icon;
                const active = isActivePath(pathname, item.path);

                return (
                  <Link
                    key={item.label}
                    href={item.path}
                    onClick={() => setMoreOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center justify-between p-3 transition-colors ${
                      active
                        ? "bg-sky-500/10 text-sky-300 font-semibold"
                        : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          active
                            ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                            : "bg-slate-800 text-slate-400 border border-slate-700/60"
                        }`}
                      >
                        <Icon size={16} />
                      </span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold truncate">{item.label}</span>
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-slate-500 shrink-0 ml-2" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
