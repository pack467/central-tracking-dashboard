"use client";

import { useRef } from "react";
import {
  LayoutDashboard,
  Ticket,
  Activity,
  Bell,
  History,
  BarChart2,
  AlertTriangle,
  BookOpen,
  Users,
  type LucideIcon,
} from "lucide-react";
import { BrandLogo } from "@/app/components/ui/BrandLogo";
import { useToast } from "@/app/components/ui/Toast";
import { useActiveShift } from "@/app/hooks/useLiveClock";
import { useNotifications } from "@/app/context/NotificationContext";

export interface NavItemConfig {
  icon: LucideIcon;
  label: string;
}

export const operationalNavItems: readonly NavItemConfig[] = [
  { icon: LayoutDashboard, label: "Overview" },
  { icon: Ticket, label: "Tickets" },
  { icon: Activity, label: "Monitoring" },
  { icon: Bell, label: "Notifikasi" },
  { icon: History, label: "Shift Log" },
] as const;

export const managementNavItems: readonly NavItemConfig[] = [
  { icon: BarChart2, label: "Reports" },
  { icon: Users, label: "Team Roster" },
] as const;

export const navItems: readonly NavItemConfig[] = [
  ...operationalNavItems,
  ...managementNavItems,
] as const;

interface SidebarProps {
  activeNav: string;
  onNavigate: (label: string) => void;
  onPrepareHandover: () => void;
  openTicketCount: number;
}

export function Sidebar({ activeNav, onNavigate, onPrepareHandover, openTicketCount }: SidebarProps) {
  const notify = useToast();
  const activeShift = useActiveShift();
  const { unreadCount: unreadNotifCount } = useNotifications();
  const lastActionTimeRef = useRef<Record<string, number>>({});

  const throttleAction = (key: string, fn: () => void, limitMs = 300) => {
    const now = Date.now();
    if (now - (lastActionTimeRef.current[key] ?? 0) < limitMs) {
      return;
    }
    lastActionTimeRef.current[key] = now;
    fn();
  };

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
    <aside className="sidebar" aria-label="Primary navigation">
      <BrandLogo size={28} />

      {/* ── Section 1: Operasional (Day-to-day shift operations) ── */}
      <div className="sidebar-label">OPERASIONAL</div>
      <nav className="nav-list" aria-label="Navigasi Operasional">
        {operationalNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = isItemActive(item.label);

          return (
            <button
              className={`nav-item ${isActive ? "active" : ""}`}
              key={item.label}
              onClick={() => onNavigate(item.label)}
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

        <button
          className="nav-item"
          onClick={() =>
            throttleAction("escalation", () =>
              notify("Eskalasi matrix dimuat.", "info", { id: "sidebar-escalation" }),
            )
          }
        >
          <span className="nav-icon" aria-hidden="true">
            <AlertTriangle size={18} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <span>Escalation</span>
        </button>
      </nav>

      {/* ── Section 2: Manajemen (Oversight, reporting, & team administration) ── */}
      <div className="sidebar-label sidebar-label-lower">MANAJEMEN</div>
      <nav className="nav-list" aria-label="Navigasi Manajemen">
        {managementNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = isItemActive(item.label);

          return (
            <button
              className={`nav-item ${isActive ? "active" : ""}`}
              key={item.label}
              onClick={() => onNavigate(item.label)}
            >
              <span className="nav-icon" aria-hidden="true">
                <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}

        <button
          className="nav-item"
          onClick={() =>
            throttleAction("runbooks", () =>
              notify("Runbooks & SOP dimuat.", "info", { id: "sidebar-runbooks" }),
            )
          }
        >
          <span className="nav-icon" aria-hidden="true">
            <BookOpen size={18} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <span>Runbooks</span>
        </button>
      </nav>

      {/* ── Bottom Anchored Cards: Active Shift & Profile ── */}
      <section className={`shift-card shift-card-${activeShift.id}`}>
        <div className="shift-card-top">
          <span className="live-dot live-dot-pulse" /> ACTIVE SHIFT
        </div>
        <strong>{activeShift.label}</strong>
        <p>{activeShift.period}</p>
        <div className="shift-people">
          <span>GK</span>
          <span>KM</span>
          <span>MI</span>
          <span className="more">+2</span>
        </div>
        <button
          onClick={() =>
            throttleAction("prepare-handover", () => {
              onPrepareHandover();
              notify(`Persiapan handover ${activeShift.label} dibuka.`, "info", {
                id: "handover-prepare",
              });
            })
          }
        >
          Siapkan Handover <span>→</span>
        </button>
      </section>

      <button
        className="profile"
        onClick={() =>
          throttleAction("profile", () =>
            notify("Profil Operator NOC aktif.", "info", { id: "user-profile" }),
          )
        }
      >
        <span className="profile-avatar">GK</span>
        <span>
          <strong>Galih Khairi</strong>
          <small>Operator NOC</small>
        </span>
        <span className="profile-more">•••</span>
      </button>
    </aside>
  );
}
