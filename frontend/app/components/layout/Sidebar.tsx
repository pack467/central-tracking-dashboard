"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  LayoutDashboard,
  Ticket,
  Activity,
  Bell,
  History,
  BarChart2,
  BookOpen,
  Users,
  User,
  MoreHorizontal,
  Edit3,
  SlidersHorizontal,
  LogOut,
  Check,
  type LucideIcon,
} from "lucide-react";
import { BrandLogo } from "@/app/components/ui/BrandLogo";
import { Avatar } from "@/app/components/ui/Avatar";
import { useToast } from "@/app/components/ui/Toast";
import { useActiveShift } from "@/app/hooks/useLiveClock";
import { useNotifications } from "@/app/context/NotificationContext";
import { useUserStatus } from "@/app/hooks/useUserStatus";

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

export type UserPresenceStatus = "Online" | "AFK" | "On Break" | "Busy";

export interface StatusConfig {
  key: UserPresenceStatus;
  label: UserPresenceStatus;
  color: string;
  glow: string;
  badgeBg: string;
  desc: string;
}

export const USER_STATUS_CONFIG: Record<UserPresenceStatus, StatusConfig> = {
  Online: {
    key: "Online",
    label: "Online",
    color: "#22c55e",
    glow: "rgba(34, 197, 94, 0.45)",
    badgeBg: "rgba(34, 197, 94, 0.15)",
    desc: "Tersedia & aktif bertugas",
  },
  Busy: {
    key: "Busy",
    label: "Busy",
    color: "#ef4444",
    glow: "rgba(239, 68, 68, 0.45)",
    badgeBg: "rgba(239, 68, 68, 0.15)",
    desc: "Fokus penanganan insiden",
  },
  "On Break": {
    key: "On Break",
    label: "On Break",
    color: "#f59e0b",
    glow: "rgba(245, 158, 11, 0.45)",
    badgeBg: "rgba(245, 158, 11, 0.15)",
    desc: "Istirahat / ISHOMA",
  },
  AFK: {
    key: "AFK",
    label: "AFK",
    color: "#a855f7",
    glow: "rgba(168, 85, 247, 0.45)",
    badgeBg: "rgba(168, 85, 247, 0.15)",
    desc: "Away From Keyboard (Sedang tidak di tempat)",
  },
};

export const STATUS_OPTIONS: StatusConfig[] = [
  USER_STATUS_CONFIG["Online"],
  USER_STATUS_CONFIG["Busy"],
  USER_STATUS_CONFIG["On Break"],
  USER_STATUS_CONFIG["AFK"],
];

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
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { userStatus, currentStatusConfig, setStatus } = useUserStatus();

  const handleStatusChange = (status: UserPresenceStatus) => {
    setStatus(status);
    notify.success(`Status kehadiran: ${status}`, {
      id: "user-status-toast",
      duration: 2500,
    });
  };

  const profileCardRef = useRef<HTMLDivElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ left: number; width: number; bottom: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateMenuPosition = () => {
    if (!profileCardRef.current) return;
    const rect = profileCardRef.current.getBoundingClientRect();
    setMenuPosition({
      left: Math.max(12, rect.left),
      width: rect.width || 218,
      bottom: Math.max(12, window.innerHeight - rect.top + 8),
    });
  };

  const toggleProfileMenu = () => {
    if (!profileMenuOpen) {
      updateMenuPosition();
      setProfileMenuOpen(true);
    } else {
      setProfileMenuOpen(false);
    }
  };

  useEffect(() => {
    if (!profileMenuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setProfileMenuOpen(false);
        moreBtnRef.current?.focus();
      }
    };

    const handleReposition = () => {
      updateMenuPosition();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [profileMenuOpen]);

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
                <span className="nav-count nav-count-tickets" suppressHydrationWarning>{openTicketCount}</span>
              )}
              {item.label === "Notifikasi" && unreadNotifCount > 0 && (
                <span className="nav-count nav-count-notif" suppressHydrationWarning>{unreadNotifCount}</span>
              )}
            </button>
          );
        })}
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
          <div
            className="shift-people-ring-wrapper"
            style={{
              "--status-ring-color": currentStatusConfig.color,
              "--status-ring-glow": currentStatusConfig.glow,
            } as React.CSSProperties}
            title={`Galih Khairi (${userStatus})`}
          >
            <Avatar size={25} initials="GK" ariaLabel={`Operator GK (${userStatus})`} />
          </div>
          <Avatar size={25} initials="KM" ariaLabel="Operator KM" />
          <Avatar size={25} initials="MI" ariaLabel="Operator MI" />
          <Avatar size={25} initials="+2" className="more" ariaLabel="2 operator lainnya" />
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

      <div className="profile-container">
        <div
          ref={profileCardRef}
          className={`profile-card ${activeNav === "Profile" || activeNav === "Profil" ? "active" : ""}`}
        >
          <button
            type="button"
            className="profile-main-btn"
            onClick={() => {
              throttleAction("profile", () => {
                onNavigate("Profile");
              });
            }}
            title="Buka Halaman Profil Pengguna"
            aria-label="Buka profil pengguna"
          >
            <div
              className="profile-avatar-ring-wrapper"
              style={{
                "--status-ring-color": currentStatusConfig.color,
                "--status-ring-glow": currentStatusConfig.glow,
              } as React.CSSProperties}
              onClick={(e) => {
                e.stopPropagation();
                toggleProfileMenu();
              }}
              title={`Status: ${userStatus} (Klik untuk ubah status)`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  toggleProfileMenu();
                }
              }}
            >
              <Avatar size="md" initials="GK" shape="circle" className="profile-avatar" />
              <span
                className="profile-status-badge"
                style={{ backgroundColor: currentStatusConfig.color }}
              />
            </div>
            <span className="profile-info">
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
          </button>

          <button
            ref={moreBtnRef}
            type="button"
            className={`profile-more-btn ${profileMenuOpen ? "active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleProfileMenu();
            }}
            title="Menu opsi profil & status"
            aria-label="Menu opsi profil dan status"
            aria-haspopup="true"
            aria-expanded={profileMenuOpen}
          >
            <MoreHorizontal size={16} />
          </button>
        </div>

        {mounted && profileMenuOpen && menuPosition && createPortal(
          <>
            <div
              className="profile-menu-backdrop"
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 90,
                background: "transparent",
              }}
              onClick={() => setProfileMenuOpen(false)}
              role="presentation"
            />
            <div
              className="profile-dropdown-menu"
              style={{
                position: "fixed",
                left: `${menuPosition.left}px`,
                width: `${menuPosition.width}px`,
                bottom: `${menuPosition.bottom}px`,
                zIndex: 95,
              }}
              role="menu"
              aria-label="Menu Opsi Profil dan Status"
            >
              <div className="profile-dropdown-header">
                <span className="profile-dropdown-operator-label">OPERATOR NOC</span>
                <strong className="profile-dropdown-operator-name">Galih Khairi</strong>
                <span className="profile-dropdown-operator-emp">EMP-1048 · Console</span>
              </div>

              {/* Status Presence Selector */}
              <div className="profile-status-picker-section">
                <div className="profile-status-picker-title">
                  <span>PILIH STATUS</span>
                  <span
                    className="profile-status-pill-badge"
                    style={{
                      color: currentStatusConfig.color,
                      backgroundColor: currentStatusConfig.badgeBg,
                      borderColor: `${currentStatusConfig.color}40`,
                    }}
                  >
                    <span
                      className="profile-status-pill-dot"
                      style={{ backgroundColor: currentStatusConfig.color }}
                    />
                    {userStatus}
                  </span>
                </div>

                <div className="profile-status-options-list" role="radiogroup" aria-label="Pilih Status Kehadiran">
                  {STATUS_OPTIONS.map((opt) => {
                    const isSelected = userStatus === opt.label;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        className={`profile-status-option-btn ${isSelected ? "selected" : ""}`}
                        onClick={() => handleStatusChange(opt.label)}
                        title={opt.desc}
                      >
                        <span
                          className="profile-status-option-bullet"
                          style={{
                            backgroundColor: opt.color,
                            boxShadow: isSelected ? `0 0 6px ${opt.color}` : undefined,
                          }}
                        />
                        <span className="profile-status-option-label">{opt.label}</span>
                        {isSelected && (
                          <Check size={13} strokeWidth={2.5} style={{ color: opt.color, marginLeft: "auto" }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                role="menuitem"
                className="profile-dropdown-item"
                onClick={() => {
                  setProfileMenuOpen(false);
                  onNavigate("Profile");
                }}
              >
                <User size={14} />
                <span>Lihat Profil</span>
              </button>

              <button
                type="button"
                role="menuitem"
                className="profile-dropdown-item"
                onClick={() => {
                  setProfileMenuOpen(false);
                  onNavigate("Profile");
                }}
              >
                <Edit3 size={14} />
                <span>Ubah Informasi</span>
              </button>

              <button
                type="button"
                role="menuitem"
                className="profile-dropdown-item"
                onClick={() => {
                  setProfileMenuOpen(false);
                  onNavigate("Profile");
                }}
              >
                <SlidersHorizontal size={14} />
                <span>Preferensi &amp; Notifikasi</span>
              </button>

              <div className="profile-dropdown-divider" />

              <button
                type="button"
                role="menuitem"
                className="profile-dropdown-item danger"
                onClick={() => {
                  setProfileMenuOpen(false);
                  notify.info("Sesi Operator NOC aktif. Gunakan serah terima shift (Handover) untuk pergantian konsol.", {
                    id: "logout-session-hint",
                    duration: 4000,
                  });
                }}
              >
                <LogOut size={14} />
                <span>Keluar Sesi</span>
              </button>
            </div>
          </>,
          document.body
        )}
      </div>
    </aside>
  );
}
