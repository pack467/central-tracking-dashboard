"use client";
import { paths, isActivePath } from "@/app/lib/routes";
import { usePathname } from "next/navigation";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { BookOpen, Users, User, MoreHorizontal, Edit3, SlidersHorizontal, LogOut, Check, ChevronLeft, ChevronRight, PanelLeft, Sun, Sunset, Moon } from "lucide-react";
import { BrandLogo } from "@/app/components/ui/BrandLogo";
import { Avatar } from "@/app/components/ui/Avatar";
import { useToast } from "@/app/components/ui/Toast";
import { useActiveShift } from "@/app/hooks/useLiveClock";
import { useUserStatus } from "@/app/hooks/useUserStatus";
import { useAuth } from "@/app/lib/auth";
import { initials } from "@/app/lib/data";

export { operationalNavItems, managementNavItems, navItems } from "@/app/lib/routes";
import { navItems } from "@/app/lib/routes";
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
  onPrepareHandover: () => void;
  openTicketCount: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  shiftPanelOpen?: boolean;
}

export function Sidebar({
  activeNav,
  onPrepareHandover,
  openTicketCount,
  collapsed = false,
  onToggleCollapse,
  shiftPanelOpen = false,
}: SidebarProps) {
  const pathname = usePathname();
  const notify = useToast();
  const { user, logout } = useAuth();
  const activeShift = useActiveShift();
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


  return (
    <>
      <aside
        className={`sidebar ${
          collapsed
            ? "sidebar-collapsed w-[68px] p-[20px_12px]"
            : "w-[250px] p-[20px_12px]"
        } fixed top-0 bottom-0 left-0 text-[var(--sidebar-text)] bg-[var(--sidebar-bg)] [border-right:1px_solid_rgba(255,_255,_255,_0.06)] flex flex-col z-[20] overflow-x-hidden overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent] will-change-[width] [transform:translateZ(0)] [backface-visibility:hidden] [transition:width_0.35s_cubic-bezier(0.16,_1,_0.3,_1)]`}
        aria-label="Primary navigation"
      >
      <div className={`sidebar-top-row flex items-center min-h-[40px] mb-[14px] relative ${collapsed ? "justify-center px-0 h-[40px]" : "px-[4px]"}`}>
        <BrandLogo size={28} showText={!collapsed} />
      </div>

      {/* ── Main Navigation List (Continuous without section dividers) ── */}
      <nav className="nav-list grid gap-[2px]" aria-label="Navigasi Utama">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isActivePath(pathname, item.path);

          return (
            <Link href={item.path}
              className={`nav-item flex items-center text-left rounded-[8px] text-[13px] [transition:color_0.15s,_background_0.15s,_border-color_0.15s] overflow-hidden relative cursor-pointer hover:text-[var(--sidebar-active-text)] hover:bg-[var(--sidebar-hover)] ${
                collapsed
                  ? `w-[44px] h-[44px] p-0 m-[0_auto_2px] justify-center items-center gap-0 rounded-[10px] ${
                      isActive ? "active text-[var(--sidebar-active-text)] bg-[var(--sidebar-active)] font-semibold [border-left:none]" : "bg-transparent text-[var(--sidebar-muted)] font-medium"
                    }`
                  : `w-full gap-[11px] p-[9px_12px] ${
                      isActive ? "active text-[var(--sidebar-active-text)] bg-[var(--sidebar-active)] font-semibold border-l-[3px] border-l-[var(--sidebar-active-border)]" : "bg-transparent text-[var(--sidebar-muted)] font-medium"
                    }`
              }`}
              key={item.label}
              aria-current={isActive ? "page" : undefined}
              title={item.label}
            >
              <span className={`nav-icon inline-flex items-center justify-center w-[20px] h-[20px] shrink-0 text-currentColor [transition:color_0.15s] ${collapsed ? "m-[0_auto]" : ""}`} aria-hidden="true">
                <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <span className={`nav-label whitespace-nowrap text-[13px] text-inherit ${collapsed ? "hidden" : ""}`}>{item.label}</span>
            </Link>
          );
        })}

        <Link href={paths.runbooks}
          className={`nav-item flex items-center text-left rounded-[8px] text-[13px] [transition:color_0.15s,_background_0.15s,_border-color_0.15s] overflow-hidden relative cursor-pointer hover:text-[var(--sidebar-active-text)] hover:bg-[var(--sidebar-hover)] ${
            collapsed
              ? `w-[44px] h-[44px] p-0 m-[0_auto_2px] justify-center items-center gap-0 rounded-[10px] ${
                  activeNav === "Runbooks" ? "active text-[var(--sidebar-active-text)] bg-[var(--sidebar-active)] font-semibold [border-left:none]" : "bg-transparent text-[var(--sidebar-muted)] font-medium"
                }`
              : `w-full gap-[11px] p-[9px_12px] ${
                  activeNav === "Runbooks" ? "active text-[var(--sidebar-active-text)] bg-[var(--sidebar-active)] font-semibold border-l-[3px] border-l-[var(--sidebar-active-border)]" : "bg-transparent text-[var(--sidebar-muted)] font-medium"
                }`
          }`}
          aria-current={isActivePath(pathname, paths.runbooks) ? "page" : undefined}
          title="Runbooks"
        >
          <span className={`nav-icon inline-flex items-center justify-center w-[20px] h-[20px] shrink-0 text-currentColor [transition:color_0.15s] ${collapsed ? "m-[0_auto]" : ""}`} aria-hidden="true">
            <BookOpen size={18} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <span className={`nav-label whitespace-nowrap text-[13px] text-inherit ${collapsed ? "hidden" : ""}`}>Runbooks</span>
        </Link>
      </nav>

      <section
        className={`shift-card shift-card-${activeShift.id} ${
          collapsed
            ? `w-[44px] h-[44px] min-h-[44px] p-0 m-[auto_auto_12px_auto] flex items-center justify-center rounded-[12px] cursor-pointer box-border relative [transition:all_0.2s_ease] ${
                activeShift.id === "subuh"
                  ? "bg-[rgba(56,189,248,0.12)] border border-[rgba(56,189,248,0.32)] text-[#38bdf8] hover:bg-[rgba(56,189,248,0.22)] hover:border-[rgba(56,189,248,0.5)]"
                  : activeShift.id === "pagi"
                    ? "bg-[rgba(245,158,11,0.12)] border border-[rgba(245,158,11,0.32)] text-[#f59e0b] hover:bg-[rgba(245,158,11,0.22)] hover:border-[rgba(245,158,11,0.5)]"
                    : "bg-[rgba(168,85,247,0.12)] border border-[rgba(168,85,247,0.32)] text-[#a855f7] hover:bg-[rgba(168,85,247,0.22)] hover:border-[rgba(168,85,247,0.5)]"
              }`
            : "m-[auto_0_14px] p-[14px] text-[#e2e8f0] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-[10px]"
        }`}
        title={collapsed ? `${activeShift.label} (${activeShift.period}) · Klik untuk Siapkan Handover` : undefined}
        onClick={
          collapsed
            ? () =>
                throttleAction("prepare-handover", () => {
                  onPrepareHandover();
                  notify(`Persiapan handover ${activeShift.label} dibuka.`, "info", {
                    id: "handover-prepare",
                  });
                })
            : undefined
        }
      >
        {/* Collapsed Tile View */}
        <div className={`shift-card-collapsed-view ${collapsed ? "flex items-center justify-center w-full h-full relative" : "hidden"}`} aria-hidden={!collapsed}>
          {(() => {
            const ShiftIcon = activeShift.id === "subuh" ? Moon : activeShift.id === "pagi" ? Sun : Sunset;
            return <ShiftIcon size={19} className={`shift-card-collapsed-icon ${collapsed ? "block" : ""}`} aria-hidden="true" />;
          })()}
          <span className={`shift-card-collapsed-dot live-dot live-dot-pulse ${collapsed ? `absolute top-[7px] right-[7px] w-[6px] h-[6px] rounded-[99px] ${activeShift.id === "subuh" ? "bg-[var(--accent-blue)]" : activeShift.id === "pagi" ? "bg-[var(--orange)]" : "bg-[var(--purple)]"}` : ""}`} aria-hidden="true" />
        </div>

        <div className={`shift-card-top flex items-center gap-[7px] mb-[8px] text-[9px] font-bold tracking-[1px] font-['JetBrains_Mono',monospace] ${activeShift.id === "subuh" ? "text-[var(--accent-blue)]" : activeShift.id === "pagi" ? "text-[var(--orange)]" : "text-[var(--purple)]"} ${collapsed ? "hidden" : ""}`}>
          <span className={`live-dot live-dot-pulse inline-block w-[7px] h-[7px] rounded-[99px] ${activeShift.id === "subuh" ? "bg-[var(--accent-blue)]" : activeShift.id === "pagi" ? "bg-[var(--orange)]" : "bg-[var(--purple)]"}`} />
          <span className="shift-card-title-text">ACTIVE SHIFT</span>
        </div>
        <div className={`shift-card-body ${collapsed ? "hidden" : ""}`}>
          <strong className="block text-[#ffffff] text-[13px]">{activeShift.label}</strong>
          <p className="m-[2px_0_10px] text-[#94a3b8] text-[11px] font-['JetBrains_Mono',monospace]">{activeShift.period}</p>
          <div className="shift-people flex mb-[12px]">
            <div
              className="shift-people-ring-wrapper relative inline-flex items-center justify-center rounded-full shrink-0 box-border bg-transparent w-[25px] h-[25px] min-w-[25px] min-h-[25px] -mr-[6px] z-[2] [box-shadow:0_0_0_1px_#090d16,_0_0_0_3px_var(--status-ring-color,_#22c55e),_0_0_7px_var(--status-ring-glow,_rgba(34,_197,_94,_0.5))] transition-[box-shadow] duration-250 ease-out"
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
            <Avatar size={25} initials="+2" className="more bg-[var(--avatar-bg,#3a3a3e)] text-[#f8fafc]" ariaLabel="2 operator lainnya" />
          </div>
          <button
            className={`flex justify-between items-center w-full p-[6px_10px] text-[11px] font-semibold rounded-[6px] [transition:all_0.15s_ease] cursor-pointer ${
              activeShift.id === "subuh"
                ? "text-[var(--accent-blue)] bg-[var(--accent-blue-soft)] border border-[var(--accent-blue-border)] hover:bg-[rgba(56,189,248,0.18)] hover:text-[var(--sidebar-active-text)]"
                : activeShift.id === "pagi"
                  ? "text-[var(--orange)] bg-[var(--orange-soft)] border border-[var(--orange-border)] hover:bg-[rgba(245,158,11,0.18)] hover:text-[var(--sidebar-active-text)]"
                  : "text-[var(--purple)] bg-[var(--purple-soft)] border border-[var(--purple-border)] hover:bg-[rgba(168,85,247,0.18)] hover:text-[var(--sidebar-active-text)]"
            }`}
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
        </div>
      </section>

      <div className={`profile-container relative w-full mt-0 box-border ${collapsed ? "flex justify-center items-center" : ""}`}>
        <div
          ref={profileCardRef}
          className={`profile-card flex items-center text-left bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] box-border [transition:background-color_0.15s,_border-color_0.15s] hover:bg-[rgba(255,255,255,0.065)] hover:border-[rgba(255,255,255,0.14)] ${activeNav === "Profile" || activeNav === "Profil" ? "active bg-[rgba(56,189,248,0.08)] border-[rgba(56,189,248,0.35)]" : ""} ${
            collapsed
              ? "justify-center w-[44px] h-[44px] min-h-[44px] p-0 m-[0_auto] rounded-[12px]"
              : "gap-[10px] p-[10px_12px] min-h-[56px] text-[#ffffff] rounded-[10px]"
          }`}
        >
          <Link href={paths.profile}
            className={`profile-main-btn flex items-center p-0 m-0 bg-transparent border-none text-left cursor-pointer text-inherit font-inherit ${
              collapsed ? "justify-center w-full h-full gap-0 flex-none min-w-0" : "gap-[10px] flex-1 min-w-0"
            }`}
            aria-current={isActivePath(pathname, paths.profile) ? "page" : undefined}
            title="Buka Halaman Profil Pengguna"
            aria-label="Buka profil pengguna"
          >
            <div
              className={`profile-avatar-ring-wrapper relative inline-flex items-center justify-center rounded-full shrink-0 box-border bg-transparent w-[32px] h-[32px] min-w-[32px] min-h-[32px] cursor-pointer [box-shadow:0_0_0_1.5px_#090d16,_0_0_0_3.5px_var(--status-ring-color,_#22c55e),_0_0_8px_var(--status-ring-glow,_rgba(34,_197,_94,_0.45))] transition-[box-shadow] duration-250 ease-out ${collapsed ? "m-[0_auto]" : ""}`}
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
              <Avatar
                size="md"
                name={user?.name ?? "Mhd. Galih Khairi"}
                initials={initials(user?.name ?? "Galih Khairi")}
                style={user?.avatarBg ? ({ "--avatar-bg": user.avatarBg } as React.CSSProperties) : undefined}
                shape="circle"
                className="profile-avatar grid place-items-center !w-full !h-full !min-w-full !min-h-full rounded-full bg-[var(--avatar-bg,#3a3a3e)] text-[var(--avatar-text,#f8fafc)] font-bold text-[11px] font-['JetBrains_Mono',monospace] ![box-shadow:none] border border-[rgba(148,163,184,0.22)] shrink-0 box-border m-0 outline-none"
              />
              <span
                className="profile-status-badge absolute -bottom-[1px] -right-[1px] w-[8px] h-[8px] rounded-full border-[1.5px] border-[#090d16] [box-shadow:0_1px_2px_rgba(0,0,0,0.5)] transition-[background-color] duration-250 ease-out z-[2] pointer-events-none"
                style={{ backgroundColor: currentStatusConfig.color }}
              />
            </div>
            <span className={`profile-info min-w-0 flex-1 ${collapsed ? "hidden" : "flex flex-col"}`}>
              <strong className="block text-[12.5px] font-semibold text-[#ffffff] whitespace-nowrap overflow-hidden text-ellipsis leading-[1.25]">
                {user?.name ?? "Galih Khairi"}
              </strong>
              <small className="profile-status-row flex items-center gap-[5px] text-[10.5px] mt-[2px] text-[#94a3b8] whitespace-nowrap overflow-hidden text-ellipsis leading-[1.2]">
                <span
                  className="profile-status-indicator-dot w-[6px] h-[6px] rounded-full shrink-0 transition-[background-color] duration-250 ease-out"
                  style={{ backgroundColor: currentStatusConfig.color }}
                />
                <span
                  className="font-semibold"
                  style={{ color: currentStatusConfig.color }}
                >
                  {userStatus}
                </span>
                <span className="profile-status-sep text-[#64748b] opacity-70">·</span>
                <span>{user?.role ?? "Operator NOC"}</span>
              </small>
            </span>
          </Link>

          <button
            ref={moreBtnRef}
            type="button"
            className={`profile-more-btn items-center justify-center w-[28px] h-[28px] min-w-[28px] min-h-[28px] p-0 m-[0_0_0_auto] rounded-[6px] border cursor-pointer [transition:all_0.15s_ease] shrink-0 hover:text-[#ffffff] hover:bg-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.15)] ${
              profileMenuOpen
                ? "active text-[#ffffff] bg-[rgba(255,255,255,0.1)] border-[rgba(255,255,255,0.15)]"
                : "text-[#64748b] bg-transparent border-transparent"
            } ${collapsed ? "hidden" : "inline-flex"}`}
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
              className="profile-menu-backdrop fixed inset-0 z-[90] bg-transparent"
              onClick={() => setProfileMenuOpen(false)}
              role="presentation"
            />
            <div
              className="profile-dropdown-menu fixed z-[95] p-[6px] border border-[var(--panel-border)] rounded-[10px] bg-[var(--modal-bg)] [box-shadow:var(--shadow-elevated),_0_10px_30px_rgba(0,_0,_0,_0.55)] flex flex-col gap-[2px] box-border animate-[profileDropdownUp_0.15s_cubic-bezier(0.16,1,0.3,1)] [transform-origin:bottom_center]"
              style={{
                left: `${menuPosition.left}px`,
                width: `${menuPosition.width}px`,
                bottom: `${menuPosition.bottom}px`,
              }}
              role="menu"
              aria-label="Menu Opsi Profil dan Status"
            >
              <div className="profile-dropdown-header p-[6px_8px_8px] [border-bottom:1px_solid_var(--line)] mb-[4px]">
                <span className="profile-dropdown-operator-label block text-[9.5px] text-[var(--ink-muted)] font-['JetBrains_Mono',monospace] font-bold tracking-[0.6px]">
                  {user?.role ? user.role.toUpperCase() : "OPERATOR NOC"}
                </span>
                <strong className="profile-dropdown-operator-name block text-[13px] text-[var(--ink-primary)] font-semibold mt-[2px]">
                  {user?.name ?? "Galih Khairi"}
                </strong>
                <span className="profile-dropdown-operator-emp block text-[11px] text-[var(--accent-blue)] font-['JetBrains_Mono',monospace] mt-[1px]">
                  {user?.employeeId ?? "EMP-1001"} · Console
                </span>
              </div>

              {/* Status Presence Selector */}
              <div className="profile-status-picker-section p-[6px_6px_8px] mb-[4px] [border-bottom:1px_solid_var(--line)] flex flex-col gap-[6px]">
                <div className="profile-status-picker-title flex items-center justify-between text-[9.5px] text-[var(--ink-muted)] font-['JetBrains_Mono',monospace] font-bold tracking-[0.5px] px-[4px]">
                  <span>PILIH STATUS</span>
                  <span
                    className="profile-status-pill-badge inline-flex items-center gap-[4.5px] text-[10px] font-semibold px-[7px] py-[2px] rounded-[9999px] border leading-[1.2] [transition:all_0.2s_ease]"
                    style={{
                      color: currentStatusConfig.color,
                      backgroundColor: currentStatusConfig.badgeBg,
                      borderColor: `${currentStatusConfig.color}40`,
                    }}
                  >
                    <span
                      className="profile-status-pill-dot w-[5.5px] h-[5.5px] rounded-[50%] shrink-0"
                      style={{ backgroundColor: currentStatusConfig.color }}
                    />
                    {userStatus}
                  </span>
                </div>

                <div className="profile-status-options-list flex flex-col gap-[2px]" role="radiogroup" aria-label="Pilih Status Kehadiran">
                  {STATUS_OPTIONS.map((opt) => {
                    const isSelected = userStatus === opt.label;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        className={`profile-status-option-btn flex items-center gap-[8px] w-full p-[6px_8px] rounded-[6px] border text-[11.5px] font-[var(--font-sans)] text-left cursor-pointer [transition:background-color_0.12s,_border-color_0.12s,_color_0.12s] box-border hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--ink-primary)] ${
                          isSelected
                            ? "selected bg-[rgba(255,255,255,0.08)] text-[#ffffff] border-[rgba(255,255,255,0.12)] font-semibold"
                            : "bg-transparent border-transparent text-[var(--ink-secondary)] font-medium"
                        }`}
                        onClick={() => handleStatusChange(opt.label)}
                        title={opt.desc}
                      >
                        <span
                          className={`profile-status-option-bullet w-[7.5px] h-[7.5px] rounded-[50%] shrink-0 [transition:box-shadow_0.2s_ease] ${
                            isSelected ? "[box-shadow:0_0_6px_var(--profile-status-option-color)]" : ""
                          }`}
                          style={{ "--profile-status-option-color": opt.color } as React.CSSProperties}
                        />
                        <span className="profile-status-option-label flex-1 min-w-0">{opt.label}</span>
                        {isSelected && (
                          <Check
                            size={13}
                            strokeWidth={2.5}
                            className="ml-auto"
                            style={{ color: opt.color }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Link href={paths.profile} onClick={() => setProfileMenuOpen(false)}
                role="menuitem"
                className="profile-dropdown-item flex items-center gap-[9px] w-full p-[7px_9px] rounded-[6px] bg-transparent border-none text-[var(--ink-primary)] text-[12px] font-[var(--font-sans)] font-medium text-left cursor-pointer [transition:background-color_0.12s,_color_0.12s] box-border hover:bg-[var(--accent-blue-soft)] hover:text-[var(--accent-blue)] [&_svg]:shrink-0 [&_svg]:text-[var(--ink-muted)] [&_svg]:[transition:color_0.12s] hover:[&_svg]:text-[var(--accent-blue)]"
              >
                <User size={14} />
                <span>Lihat Profil</span>
              </Link>

              <Link href={paths.profile} onClick={() => setProfileMenuOpen(false)}
                role="menuitem"
                className="profile-dropdown-item flex items-center gap-[9px] w-full p-[7px_9px] rounded-[6px] bg-transparent border-none text-[var(--ink-primary)] text-[12px] font-[var(--font-sans)] font-medium text-left cursor-pointer [transition:background-color_0.12s,_color_0.12s] box-border hover:bg-[var(--accent-blue-soft)] hover:text-[var(--accent-blue)] [&_svg]:shrink-0 [&_svg]:text-[var(--ink-muted)] [&_svg]:[transition:color_0.12s] hover:[&_svg]:text-[var(--accent-blue)]"
              >
                <Edit3 size={14} />
                <span>Ubah Informasi</span>
              </Link>

              <Link href={paths.profile} onClick={() => setProfileMenuOpen(false)}
                role="menuitem"
                className="profile-dropdown-item flex items-center gap-[9px] w-full p-[7px_9px] rounded-[6px] bg-transparent border-none text-[var(--ink-primary)] text-[12px] font-[var(--font-sans)] font-medium text-left cursor-pointer [transition:background-color_0.12s,_color_0.12s] box-border hover:bg-[var(--accent-blue-soft)] hover:text-[var(--accent-blue)] [&_svg]:shrink-0 [&_svg]:text-[var(--ink-muted)] [&_svg]:[transition:color_0.12s] hover:[&_svg]:text-[var(--accent-blue)]"
              >
                <SlidersHorizontal size={14} />
                <span>Preferensi &amp; Notifikasi</span>
              </Link>

              <Link
                href={paths.team}
                role="menuitem"
                className="profile-dropdown-item flex items-center gap-[9px] w-full p-[7px_9px] rounded-[6px] bg-transparent border-none text-[var(--ink-primary)] text-[12px] font-[var(--font-sans)] font-medium text-left cursor-pointer [transition:background-color_0.12s,_color_0.12s] box-border hover:bg-[var(--accent-blue-soft)] hover:text-[var(--accent-blue)] [&_svg]:shrink-0 [&_svg]:text-[var(--ink-muted)] [&_svg]:[transition:color_0.12s] hover:[&_svg]:text-[var(--accent-blue)]"
                onClick={() => setProfileMenuOpen(false)}
              >
                <Users size={14} />
                <span>Our Team</span>
              </Link>

              <div className="profile-dropdown-divider h-[1px] bg-[var(--line)] my-[4px]" />

              <button
                type="button"
                role="menuitem"
                className="profile-dropdown-item danger flex items-center gap-[9px] w-full p-[7px_9px] rounded-[6px] bg-transparent border-none text-[var(--ink-primary)] text-[12px] font-[var(--font-sans)] font-medium text-left cursor-pointer transition-[background-color,color] duration-120 box-border hover:bg-[var(--red-soft)] hover:text-[var(--red)] [&_svg]:shrink-0 [&_svg]:text-[var(--ink-muted)] [&_svg]:transition-colors [&_svg]:duration-120 hover:[&_svg]:text-[var(--red)]"
                onClick={() => {
                  setProfileMenuOpen(false);
                  logout();
                  notify.info("Sesi konsol telah ditutup. Mengalihkan ke halaman login...", {
                    id: "logout-session-hint",
                    duration: 3000,
                  });
                  setTimeout(() => {
                    window.location.href = paths.login;
                  }, 400);
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

      {/* ── Sidebar Toggle Tab Handle (matching right shift-panel-toggle-tab) ── */}
      {onToggleCollapse && (
        <button
          type="button"
          disabled={shiftPanelOpen}
          tabIndex={shiftPanelOpen ? -1 : 0}
          aria-disabled={shiftPanelOpen}
          className={`sidebar-toggle-tab fixed top-1/2 [transform:translateY(-50%)] z-[80] flex flex-col items-center gap-[6px] py-[12px] px-[6px] rounded-r-[10px] cursor-pointer bg-[var(--panel-bg,#1e293b)] border border-[var(--line,rgba(255,255,255,0.08))] [border-left:none] text-[var(--ink-muted,#94a3b8)] font-['Plus_Jakarta_Sans',sans-serif] text-[10px] font-semibold will-change-[left] [box-shadow:2px_0_12px_rgba(0,_0,_0,_0.15)] hover:bg-[var(--panel-bg-hover,#283548)] hover:text-[var(--ink-primary,#e2e8f0)] hover:pl-[10px] focus-visible:outline-2 focus-visible:outline-[var(--accent,#6366f1)] focus-visible:outline-offset-2 ${
            collapsed
              ? "sidebar-toggle-tab-collapsed left-[68px] [transition:left_0.35s_cubic-bezier(0.16,_1,_0.3,_1)]"
              : "left-[250px] [transition:left_0.35s_cubic-bezier(0.16,_1,_0.3,_1),_background_0.2s_ease,_color_0.2s_ease,_border-color_0.2s_ease,_padding-left_0.2s_ease]"
          } ${
            shiftPanelOpen
              ? "!z-[20] !pointer-events-none !cursor-default select-none"
              : "[.shift-panel-is-open_&]:!z-[20] [.shift-panel-is-open_&]:!pointer-events-none [.shift-panel-is-open_&]:!cursor-default [.shift-panel-is-open_&]:select-none"
          }`}
          onClick={shiftPanelOpen ? undefined : onToggleCollapse}
          aria-label={collapsed ? "Lebarkan sidebar" : "Ciutkan sidebar"}
          title={shiftPanelOpen ? undefined : (collapsed ? "Lebarkan sidebar" : "Ciutkan sidebar")}
        >
          <PanelLeft size={16} strokeWidth={2} />
          {collapsed ? (
            <ChevronRight size={12} className="sidebar-toggle-chevron opacity-50 [transition:opacity_0.2s] group-hover:opacity-100" />
          ) : (
            <ChevronLeft size={12} className="sidebar-toggle-chevron opacity-50 [transition:opacity_0.2s] group-hover:opacity-100" />
          )}
        </button>
      )}
    </>
  );
}
