"use client";

import { useRef } from "react";
import {
  LayoutDashboard,
  Ticket,
  Activity,
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
import type { HandoverRecordData } from "@/app/lib/types";

export interface NavItemConfig {
  icon: LucideIcon;
  label: string;
}

export const navItems: readonly NavItemConfig[] = [
  { icon: LayoutDashboard, label: "Overview" },
  { icon: Ticket, label: "Tickets" },
  { icon: Activity, label: "Monitoring" },
  { icon: History, label: "Shift Log" },
  { icon: BarChart2, label: "Reports" },
] as const;

interface SidebarProps {
  activeNav: string;
  onNavigate: (label: string) => void;
  onOpenHandover: () => void;
  openTicketCount: number;
  handoverRecord: HandoverRecordData;
}

export function Sidebar({ activeNav, onNavigate, onOpenHandover, openTicketCount, handoverRecord }: SidebarProps) {
  const notify = useToast();
  const activeShift = useActiveShift();
  const lastActionTimeRef = useRef<Record<string, number>>({});

  const throttleAction = (key: string, fn: () => void, limitMs = 300) => {
    const now = Date.now();
    if (now - (lastActionTimeRef.current[key] ?? 0) < limitMs) {
      return;
    }
    lastActionTimeRef.current[key] = now;
    fn();
  };

  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <BrandLogo size={28} />

      <div className="sidebar-label">WORKSPACE</div>
      <nav className="nav-list">
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
              className={`nav-item ${isActive ? "active" : ""}`}
              key={item.label}
              onClick={() => onNavigate(item.label)}
            >
              <span className="nav-icon" aria-hidden="true">
                <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <span>{item.label}</span>
              {item.label === "Tickets" && openTicketCount > 0 && (
                <span className="nav-count">{openTicketCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-label sidebar-label-lower">OPERATIONS</div>
      <nav className="nav-list">
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
        <button
          className={`nav-item ${activeNav === "Team Roster" ? "active" : ""}`}
          onClick={() => onNavigate("Team Roster")}
        >
          <span className="nav-icon" aria-hidden="true">
            <Users size={18} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <span>Team Roster</span>
        </button>
      </nav>

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
              onOpenHandover();
              notify(`Handover ${handoverRecord.sourceShift} → ${handoverRecord.targetShift} dibuka.`, "info", {
                id: "handover-open",
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
