"use client";

import { useState } from "react";
import { RefreshCw, Sun, Sunset, Moon, Clock } from "lucide-react";
import { IconMenu, IconMoon, IconSun } from "@/app/components/ui/Icons";
import { NotificationDropdown } from "@/app/components/layout/NotificationDropdown";
import { useLiveClock, useActiveShift } from "@/app/hooks/useLiveClock";
import { useToast } from "@/app/components/ui/Toast";

interface TopbarProps {
  activeNav: string;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onOpenSearch?: () => void;
  onOpenMobileNav: () => void;
  onRefresh?: () => void;
}

export function Topbar({
  activeNav,
  theme,
  onToggleTheme,
  onOpenMobileNav,
  onRefresh,
}: TopbarProps) {
  const currentTime = useLiveClock();
  const activeShift = useActiveShift();
  const notify = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);

    if (onRefresh) {
      onRefresh();
    }

    notify.info("Dashboard berhasil disinkronkan & data diperbarui.", {
      id: "topbar-refresh",
      duration: 3000,
    });

    setTimeout(() => {
      setIsRefreshing(false);
    }, 750);
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
        <div
          className={`topbar-shift-badge ${activeShift.badgeClass}`}
          title={`Shift Aktif: ${activeShift.name}`}
          aria-label={`Shift aktif ${activeShift.name}`}
        >
          <ShiftIcon size={13} className="shift-badge-icon" />
          <span className="shift-badge-label">
            <strong>{activeShift.label}</strong>
            <small>{activeShift.period}</small>
          </span>
        </div>

        {/* Live Clock Badge */}
        {currentTime && (
          <div className="live-clock-badge" title="Waktu server/sistem live">
            <span className="live-dot live-dot-pulse" />
            <Clock size={12} style={{ marginRight: "2px", opacity: 0.8 }} />
            {currentTime}
          </div>
        )}

        {/* Dedicated anchored notification dropdown */}
        <NotificationDropdown />

        {/* Light / Dark Mode Toggle */}
        <button
          className="theme-toggle-button"
          onClick={onToggleTheme}
          title={`Ubah ke mode ${theme === "dark" ? "terang" : "gelap"}`}
          aria-label={`Ubah ke mode ${theme === "dark" ? "terang" : "gelap"}`}
        >
          {theme === "dark" ? <IconSun /> : <IconMoon />}
        </button>

        {/* Website Refresh Button (Placed to the right of theme button, icon-only) */}
        <button
          className={`topbar-refresh-button ${isRefreshing ? "refreshing" : ""}`}
          onClick={handleRefresh}
          title="Segarkan data &amp; jadwal dashboard (Refresh)"
          aria-label="Segarkan data dashboard"
        >
          <RefreshCw size={15} className={isRefreshing ? "anim-spin" : ""} />
        </button>
      </div>
    </header>
  );
}
