"use client";

import { useState } from "react";
import { RefreshCw, Sun, Sunset, Moon, Clock } from "lucide-react";
import { IconMenu } from "@/app/components/ui/Icons";
import { ClientSwitcher } from "@/app/components/layout/ClientSwitcher";
import { ShiftTransitionBadge } from "@/app/components/layout/ShiftTransitionBadge";
import { useLiveClock, useActiveShift } from "@/app/hooks/useLiveClock";
import { useToast } from "@/app/components/ui/Toast";

interface TopbarProps {
  activeNav: string;
  onOpenSearch?: () => void;
  onOpenMobileNav: () => void;
  onRefresh?: () => void | Promise<void>;
  onNavigate?: (label: string) => void;
  onOpenHandover?: () => void;
}

const SHIFT_THEME_CLASSES: Record<string, string> = {
  subuh: "bg-[var(--accent-blue-soft)] text-[var(--accent-blue)] border border-[var(--accent-blue-border)]",
  pagi: "bg-[var(--orange-soft)] text-[var(--orange)] border border-[var(--orange-border)]",
  malam: "bg-[var(--purple-soft)] text-[var(--purple)] border border-[var(--purple-border)]",
};

export function Topbar({
  activeNav,
  onOpenMobileNav,
  onRefresh,
  onNavigate,
  onOpenHandover,
}: TopbarProps) {
  const currentTime = useLiveClock();
  const activeShift = useActiveShift();
  const notify = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);

    const startTime = Date.now();
    let isError = false;

    try {
      if (onRefresh) {
        await onRefresh();
      }
    } catch {
      isError = true;
    } finally {
      // Keep rotation smooth for at least 800ms (one full 360 loop) so quick operations don't jitter
      const elapsed = Date.now() - startTime;
      const minDuration = 800;
      const remaining = Math.max(0, minDuration - elapsed);

      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }

      setIsRefreshing(false);

      if (isError) {
        notify.warning("Gagal menyinkronkan data dashboard. Silakan coba lagi.", {
          id: "topbar-refresh",
          duration: 3000,
        });
      } else {
        notify.info("Dashboard berhasil disinkronkan & data diperbarui.", {
          id: "topbar-refresh",
          duration: 3000,
        });
      }
    }
  };

  const ShiftIcon = activeShift.id === "subuh" ? Moon : activeShift.id === "pagi" ? Sun : Sunset;

  return (
    <header className="topbar h-[60px] px-[32px] flex items-center justify-between bg-[var(--topbar-bg)] [border-bottom:1px_solid_var(--line)] sticky top-0 z-[15]">
      <div className="breadcrumbs flex gap-[8px] items-center text-[var(--ink-muted)] text-[12px]">
        <button className="hamburger-button" onClick={onOpenMobileNav} aria-label="Buka menu navigasi">
          <IconMenu />
        </button>
      </div>

      <div className="topbar-actions flex items-center gap-[10px]">
        {/* Multi-tenant Client / Company Switcher */}
        <ClientSwitcher />

        {/* Handover Window / Pergantian Shift Indicator (Active during shift overlaps, e.g. 16:00 - 16:30) */}
        <ShiftTransitionBadge onOpenHandover={onOpenHandover} onNavigate={onNavigate} />

        <div
          className={`topbar-shift-badge ${activeShift.badgeClass} flex items-center gap-[7px] px-[10px] py-[4px] rounded-[7px] text-[11px] leading-[1.2] cursor-default transition-all duration-150 select-none max-[900px]:[&_small]:hidden max-[640px]:p-[4px_6px] ${SHIFT_THEME_CLASSES[activeShift.id] || ""}`}
          title={`Shift Aktif: ${activeShift.name}`}
          aria-label={`Shift aktif ${activeShift.name}`}
        >
          <ShiftIcon size={13} className="shift-badge-icon shrink-0" />
            <span className="shift-badge-label flex flex-col">
            <strong className="text-[11px] font-bold tracking-[0.2px]">{activeShift.label}</strong>
            <small className="shift-badge-period text-[9.5px] font-['JetBrains_Mono',monospace] opacity-85 inline-flex items-center gap-1">
              <span>{activeShift.period.replace(/\s*WIB$/, "").trim()}</span>
              {" "}
              <span className="inline-flex items-center justify-center text-[8px] font-bold leading-none p-[1px_3.5px] ml-[2px] rounded-[3px] self-center -translate-y-[0.5px] font-mono uppercase box-border select-none text-[var(--ink-muted)] bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] timezone-pill-badge">WIB</span>
            </small>
          </span>
        </div>

        {/* Live Clock & Date Badge */}
        {currentTime && currentTime.time && (
          <div
            className="live-clock-badge flex items-center gap-[7px] p-[5px_11px] bg-[var(--panel-bg)] border border-[var(--line)] rounded-[7px] text-[var(--accent-blue)] font-['JetBrains_Mono',monospace] text-[11.5px] font-semibold max-[640px]:hidden"
            suppressHydrationWarning
            title={`Waktu & Tanggal Sistem: ${currentTime.dateFull}, ${currentTime.timeWithZone}`}
            aria-label={`Waktu saat ini: ${currentTime.dateFull}, ${currentTime.timeWithZone}`}
          >
            <span className="live-dot live-dot-pulse inline-block w-[7px] h-[7px] rounded-[99px] bg-[var(--green)]" aria-hidden="true" />
            <span className="live-clock-date">
              <span className="live-clock-date-long max-[900px]:hidden" suppressHydrationWarning>{currentTime.dateLong}</span>
              <span className="live-clock-date-short hidden max-[900px]:inline" suppressHydrationWarning>{currentTime.dateShort}</span>
            </span>
            <span className="live-clock-divider" aria-hidden="true">·</span>
            <span className="live-clock-time-group inline-flex items-center gap-1">
              <Clock size={11} className="live-clock-icon" aria-hidden="true" />
              <span className="inline-flex items-center tabular-nums leading-none tracking-[0.3px] live-clock-digits" suppressHydrationWarning>{currentTime.time}</span>
              {" "}
              <span className="inline-flex items-center justify-center text-[8.5px] font-bold leading-none p-[1.5px_4px] ml-[2px] text-[var(--ink-muted)] bg-[rgba(56,189,248,0.08)] border border-[rgba(56,189,248,0.2)] rounded-[4px] self-center -translate-y-[0.5px] font-mono uppercase box-border select-none timezone-pill-badge">WIB</span>
            </span>
          </div>
        )}


        {/* Website Refresh Button (Placed to the right of theme button, icon-only) */}
        <button
          type="button"
          className={`topbar-refresh-button w-[34px] h-[34px] grid place-items-center rounded-[7px] border border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--ink-secondary)] cursor-pointer [transition:background_0.15s,_border-color_0.15s,_color_0.15s,_opacity_0.15s] enabled:hover:bg-[var(--accent-blue-soft)] enabled:hover:border-[var(--accent-blue-border)] enabled:hover:text-[var(--accent-blue)] disabled:border-[var(--accent-blue-border)] disabled:text-[var(--accent-blue)] disabled:bg-[var(--accent-blue-soft)] disabled:cursor-not-allowed ${isRefreshing ? "refreshing border-[var(--accent-blue-border)] text-[var(--accent-blue)] bg-[var(--accent-blue-soft)] cursor-not-allowed" : ""}`}
          onClick={handleRefresh}
          disabled={isRefreshing}
          title={isRefreshing ? "Sedang menyinkronkan data..." : "Segarkan data & jadwal dashboard (Refresh)"}
          aria-label="Segarkan data dashboard"
          aria-busy={isRefreshing}
        >
          <RefreshCw size={15} className={`topbar-refresh-icon inline-block [transform-origin:center] [transition:opacity_0.2s] ${isRefreshing ? "anim-spin animate-spin opacity-[0.82]" : ""}`} />
        </button>
      </div>
    </header>
  );
}
