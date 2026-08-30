"use client";

import { useEffect } from "react";
import { Users } from "lucide-react";
import { BrandLogo } from "@/app/components/ui/BrandLogo";
import { navItems } from "./Sidebar";
import type { HandoverRecordData } from "@/app/lib/types";

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  activeNav: string;
  onNavigate: (label: string) => void;
  handoverRecord: HandoverRecordData;
}

export function MobileNav({ open, onClose, activeNav, onNavigate, handoverRecord }: MobileNavProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

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

        <div className="sidebar-label">WORKSPACE</div>
        <div className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              activeNav === item.label ||
              (activeNav === "Utama" && item.label === "Overview") ||
              (activeNav === "Ticket" && item.label === "Tickets") ||
              (activeNav === "Log shift" && item.label === "Shift Log") ||
              (activeNav === "Laporan" && item.label === "Reports");

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

        <div className="sidebar-label sidebar-label-lower" style={{ paddingTop: "14px" }}>OPERATIONS</div>
        <div className="nav-list">
          <button
            className={`nav-item ${activeNav === "Team Roster" ? "active" : ""}`}
            onClick={() => {
              onNavigate("Team Roster");
              onClose();
            }}
          >
            <span className="nav-icon" aria-hidden="true">
              <Users size={18} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <span>Team Roster</span>
          </button>
        </div>

        <section className="shift-card">
          <div className="shift-card-top">
            <span className="live-dot live-dot-pulse" /> ACTIVE SHIFT
          </div>
          <strong>Shift sore</strong>
          <p>13:00 – 22:59 WIB · {handoverRecord.sourceShift} → {handoverRecord.targetShift}</p>
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
