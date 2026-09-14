"use client";

import { useEffect } from "react";
import { BrandLogo } from "@/app/components/ui/BrandLogo";
import { operationalNavItems, managementNavItems } from "./Sidebar";
import { useActiveShift } from "@/app/hooks/useLiveClock";
import { useNotifications } from "@/app/context/NotificationContext";
import type { HandoverRecordData } from "@/app/lib/types";

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  activeNav: string;
  onNavigate: (label: string) => void;
  handoverRecord: HandoverRecordData;
  openTicketCount?: number;
}

export function MobileNav({
  open,
  onClose,
  activeNav,
  onNavigate,
  handoverRecord,
  openTicketCount = 0,
}: MobileNavProps) {
  const activeShift = useActiveShift();
  const { unreadCount: unreadNotifCount } = useNotifications();

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const isItemActive = (label: string) => {
    if (activeNav === label) return true;
    if ((activeNav === "Utama" || activeNav === "Overview") && label === "Overview") return true;
    if ((activeNav === "Ticket" || activeNav === "Tickets") && label === "Tickets") return true;
    if ((activeNav === "Log shift" || activeNav === "Shift Log") && label === "Shift Log") return true;
    if ((activeNav === "Laporan" || activeNav === "Reports") && label === "Reports") return true;
    if ((activeNav === "Notifications" || activeNav === "Notifikasi") && label === "Notifikasi") return true;
    if (activeNav === "Team Roster" && label === "Team Roster") return true;
    return false;
  };

  return (
    <div
      className="mobile-nav-backdrop anim-fade"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="mobile-drawer anim-slide-right" role="dialog" aria-modal="true" aria-label="Navigasi mobile">
        <div className="mobile-drawer-head">
          <BrandLogo size={26} />
          <button className="mobile-drawer-close" onClick={onClose} aria-label="Tutup menu">
            ×
          </button>
        </div>

        {/* ── Section 1: Operasional ── */}
        <div className="sidebar-label">OPERASIONAL</div>
        <div className="nav-list">
          {operationalNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = isItemActive(item.label);

            return (
              <button
                key={item.label}
                className={`nav-item ${isActive ? "active" : ""}`}
                onClick={() => {
                  onNavigate(item.label);
                  onClose();
                }}
              >
                <span className="nav-icon" aria-hidden="true">
                  <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span>{item.label}</span>
                {item.label === "Tickets" && openTicketCount > 0 && (
                  <span className="nav-count" suppressHydrationWarning>{openTicketCount}</span>
                )}
                {item.label === "Notifikasi" && unreadNotifCount > 0 && (
                  <span className="nav-count" suppressHydrationWarning>{unreadNotifCount}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Section 2: Manajemen ── */}
        <div className="sidebar-label sidebar-label-lower" style={{ paddingTop: "14px" }}>
          MANAJEMEN
        </div>
        <div className="nav-list">
          {managementNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = isItemActive(item.label);

            return (
              <button
                key={item.label}
                className={`nav-item ${isActive ? "active" : ""}`}
                onClick={() => {
                  onNavigate(item.label);
                  onClose();
                }}
              >
                <span className="nav-icon" aria-hidden="true">
                  <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Bottom Active Shift Card ── */}
        <section className={`shift-card shift-card-${activeShift.id}`}>
          <div className="shift-card-top">
            <span className="live-dot live-dot-pulse" /> ACTIVE SHIFT
          </div>
          <strong>{activeShift.label}</strong>
          <p>{activeShift.period} · {handoverRecord.sourceShift} → {handoverRecord.targetShift}</p>
          <button
            onClick={() => {
              onNavigate("Overview");
              onClose();
            }}
          >
            Buka dashboard <span>→</span>
          </button>
        </section>

        <button className="profile" onClick={onClose}>
          <span className="profile-avatar">GK</span>
          <span>
            <strong>Galih Khairi</strong>
            <small>Operator NOC</small>
          </span>
        </button>
      </div>
    </div>
  );
}
