"use client";

import { useState } from "react";
import { RefreshCw, Sun, Sunset, Moon, Clock } from "lucide-react";
import { IconMenu } from "@/app/components/ui/Icons";
import { NotificationDropdown } from "@/app/components/layout/NotificationDropdown";
import { ClientSwitcher } from "@/app/components/layout/ClientSwitcher";
import { useLiveClock, useActiveShift } from "@/app/hooks/useLiveClock";
import { useToast } from "@/app/components/ui/Toast";

interface TopbarProps {
  activeNav: string;
  onOpenSearch?: () => void;
  onOpenMobileNav: () => void;
  onRefresh?: () => void | Promise<void>;
  onNavigate?: (label: string) => void;
}

export function Topbar({
  activeNav,
  onOpenMobileNav,
  onRefresh,
  onNavigate,
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
    <header className="topbar">
      <div className="breadcrumbs">
        <button className="hamburger-button" onClick={onOpenMobileNav} aria-label="Buka menu navigasi">
          <IconMenu />
        </button>
        <span>Operations</span>
        <b>/</b>
        <strong>{activeNav === "Utama" || activeNav === "Overview" ? "Command Center" : activeNav}</strong>
      </div>

      <div className="topbar-actions">
        {/* Multi-tenant Client / Company Switcher */}
        <ClientSwitcher />

        <div
          className={`topbar-shift-badge ${activeShift.badgeClass}`}
          title={`Shift Aktif: ${activeShift.name}`}
          aria-label={`Shift aktif ${activeShift.name}`}
        >
          <ShiftIcon size={13} className="shift-badge-icon" />
          <span className="shift-badge-label">
            <strong>{activeShift.label}</strong>
            <small className="shift-badge-period">
              <span>{activeShift.period.replace(/\s*WIB$/, "").trim()}</span>
              <span className="timezone-pill-badge">WIB</span>
            </small>
          </span>
        </div>

        {/* Live Clock & Date Badge */}
        {currentTime && currentTime.time && (
          <div
            className="live-clock-badge"
            suppressHydrationWarning
            title={`Waktu & Tanggal Sistem: ${currentTime.dateFull}, ${currentTime.timeWithZone}`}
            aria-label={`Waktu saat ini: ${currentTime.dateFull}, ${currentTime.timeWithZone}`}
          >
            <span className="live-dot live-dot-pulse" aria-hidden="true" />
            <span className="live-clock-date">
              <span className="live-clock-date-long" suppressHydrationWarning>{currentTime.dateLong}</span>
              <span className="live-clock-date-short" suppressHydrationWarning>{currentTime.dateShort}</span>
            </span>
            <span className="live-clock-divider" aria-hidden="true">·</span>
            <span className="live-clock-time-group">
              <Clock size={11} className="live-clock-icon" aria-hidden="true" />
              <span className="live-clock-digits" suppressHydrationWarning>{currentTime.time}</span>
              <span className="timezone-pill-badge">WIB</span>
            </span>
          </div>
        )}

        {/* Dedicated anchored notification dropdown */}
        <NotificationDropdown onNavigate={onNavigate} />

        {/* Website Refresh Button (Placed to the right of theme button, icon-only) */}
        <button
          type="button"
          className={`topbar-refresh-button ${isRefreshing ? "refreshing" : ""}`}
          onClick={handleRefresh}
          disabled={isRefreshing}
          title={isRefreshing ? "Sedang menyinkronkan data..." : "Segarkan data & jadwal dashboard (Refresh)"}
          aria-label="Segarkan data dashboard"
          aria-busy={isRefreshing}
        >
          <RefreshCw size={15} className={`topbar-refresh-icon ${isRefreshing ? "anim-spin" : ""}`} />
        </button>
      </div>
    </header>
  );
}
