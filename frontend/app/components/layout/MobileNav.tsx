"use client";
import Link from "next/link";
import { paths, isActivePath } from "@/app/lib/routes";
import { usePathname } from "next/navigation";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { BrandLogo } from "@/app/components/ui/BrandLogo";
import { Avatar } from "@/app/components/ui/Avatar";
import { navItems, USER_STATUS_CONFIG, type UserPresenceStatus } from "./Sidebar";
import { useActiveShift } from "@/app/hooks/useLiveClock";
import type { HandoverRecordData } from "@/app/lib/types";

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  activeNav: string;
  onPrepareHandover: () => void;
  handoverRecord: HandoverRecordData;
  openTicketCount?: number;
}

export function MobileNav({
  open,
  onClose,
  activeNav,
  onPrepareHandover,
  handoverRecord,
  openTicketCount = 0,
}: MobileNavProps) {
  const activeShift = useActiveShift();
  const pathname = usePathname();
  const [userStatus, setUserStatus] = useState<UserPresenceStatus>("Online");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ctd.user.status") as string | null;
      if (saved === "On Leave") {
        setUserStatus("AFK");
      } else if (saved && USER_STATUS_CONFIG[saved as UserPresenceStatus]) {
        setUserStatus(saved as UserPresenceStatus);
      }
    }
  }, [open]);

  const currentStatusConfig = USER_STATUS_CONFIG[userStatus] || USER_STATUS_CONFIG["Online"];

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
      className="mobile-nav-backdrop anim-fade [position:fixed] [inset:0] [z-index:70] [display:flex] [justify-content:flex-start] [background:var(--overlay-bg)]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="mobile-drawer anim-slide-right [display:flex] [flex-direction:column] [gap:14px] [width:min(300px,_86vw)] [height:100%] [padding:20px_14px_18px] [overflow-y:auto] [color:var(--sidebar-text)] [background:var(--sidebar-bg)] [box-shadow:var(--shadow-elevated)]" role="dialog" aria-modal="true" aria-label="Navigasi mobile">
        <div className="mobile-drawer-head [display:flex] [align-items:center] [justify-content:space-between] [gap:8px]">
          <BrandLogo size={26} />
          <button className="mobile-drawer-close [display:grid] [place-items:center] [width:44px] [height:44px] [min-width:44px] [padding:0] [color:var(--sidebar-muted)] [border:1px_solid_rgba(56,_189,_248,_0.2)]! [border-radius:7px]" onClick={onClose} aria-label="Tutup menu">
            <X size={18} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>

        {/* ── Main Navigation List ── */}
        <div className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActivePath(pathname, item.path);

            return (
              <Link href={item.path} onClick={onClose}
                key={item.label}
                aria-current={isActive ? "page" : undefined}
                className={`nav-item [min-height:44px] ${isActive ? "active" : ""}`}
              >
                <span className="nav-icon" aria-hidden="true">
                  <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span>{item.label}</span>
                {item.label === "Tickets" && openTicketCount > 0 && (
                  <span className="nav-count nav-count-tickets" suppressHydrationWarning>{openTicketCount}</span>
                )}
              </Link>
            );
          })}

          {/* Runbooks — standalone nav item */}
          <Link aria-current={activeNav === "Runbooks" ? "page" : undefined} href={paths.runbooks} onClick={onClose}
            className={`nav-item [min-height:44px] ${activeNav === "Runbooks" ? "active" : ""}`}
          >
            <span className="nav-icon" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            </span>
            <span>Runbooks</span>
          </Link>
        </div>

        {/* ── Bottom Active Shift Card ── */}
        <section className={`shift-card [margin:auto_0_12px] shift-card-${activeShift.id}`}>
          <div className="shift-card-top">
            <span className="live-dot live-dot-pulse" /> ACTIVE SHIFT
          </div>
          <strong>{activeShift.label}</strong>
          <p>{activeShift.period} · {handoverRecord.sourceShift} → {handoverRecord.targetShift}</p>
          <button
            onClick={() => {
              onPrepareHandover();
              onClose();
            }}
          >
            Siapkan Handover <span>→</span>
          </button>
        </section>

        <Link href={paths.profile} onClick={onClose}
          className="profile"
          title="Buka Profil Pengguna"
        >
          <div
            className="profile-avatar-ring-wrapper"
            style={{
              "--status-ring-color": currentStatusConfig.color,
              "--status-ring-glow": currentStatusConfig.glow,
            } as React.CSSProperties}
          >
            <Avatar size="md" initials="GK" shape="circle" className="profile-avatar" />
            <span
              className="profile-status-badge"
              style={{ backgroundColor: currentStatusConfig.color }}
            />
          </div>
          <span>
            <strong>Galih Khairi</strong>
            <small className="profile-status-row">
              <span
                className="profile-status-indicator-dot"
                style={{ backgroundColor: currentStatusConfig.color }}
              />
              <span style={{ color: currentStatusConfig.color, fontWeight: 600 }}>{userStatus}</span>
              <span className="profile-status-sep">·</span>
              <span>Operator NOC</span>
            </small>
          </span>
        </Link>
      </div>
    </div>
  );
}
