"use client";
import Link from "next/link";
import { paths } from "@/app/lib/routes";


import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { IconBell } from "@/app/components/ui/Icons";
import { Badge } from "@/app/components/ui/Badge";
import { useNotifications } from "@/app/context/NotificationContext";
import { useClient } from "@/app/context/ClientContext";

export function NotificationDropdown() {
  const { activeClientId } = useClient();
  const { getClientNotifications, getClientUnreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  
  const notifications = useMemo(
    () => getClientNotifications(activeClientId),
    [getClientNotifications, activeClientId]
  );

  const unreadCount = useMemo(
    () => getClientUnreadCount(activeClientId),
    [getClientUnreadCount, activeClientId]
  );

  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [positionStyle, setPositionStyle] = useState<React.CSSProperties>({});
  const [caretOffset, setCaretOffset] = useState<number>(0);

  // Collision detection and dynamic anchoring
  const updatePosition = useCallback(() => {
    if (!buttonRef.current || !isOpen) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const dropdownWidth = Math.min(380, window.innerWidth - 24);
    const viewportWidth = window.innerWidth;
    const safeMargin = 12;

    // Ideal right alignment with button's right edge
    let right = viewportWidth - buttonRect.right;

    // Check right edge overflow
    if (right < safeMargin) {
      right = safeMargin;
    }

    // Check left edge overflow
    if (viewportWidth - right - dropdownWidth < safeMargin) {
      // Shift leftwards to stay inside screen
      right = Math.max(safeMargin, viewportWidth - dropdownWidth - safeMargin);
    }

    const top = buttonRect.bottom + 10;

    // Calculate caret position relative to bell button center
    const buttonCenter = buttonRect.left + buttonRect.width / 2;
    const panelRightEdge = viewportWidth - right;
    const panelLeftEdge = panelRightEdge - dropdownWidth;
    const caretPos = buttonCenter - panelLeftEdge;

    setCaretOffset(Math.max(16, Math.min(caretPos, dropdownWidth - 16)));

    setPositionStyle({
      top: `${top}px`,
      right: `${right}px`,
      width: `${dropdownWidth}px`,
    });
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleResize = () => updatePosition();
      const handleScroll = () => updatePosition();

      window.addEventListener("resize", handleResize, { passive: true });
      window.addEventListener("scroll", handleScroll, { passive: true });

      return () => {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("scroll", handleScroll);
      };
    }
  }, [isOpen, updatePosition]);

  // Click outside & Escape key listeners
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const toggleOpen = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <div className="relative inline-flex">
      <button
        ref={buttonRef}
        className={`icon-button relative w-[34px] h-[34px] grid place-items-center text-[var(--ink-secondary)] border border-[var(--panel-border)] rounded-[7px] bg-[var(--panel-bg)] text-[14px] transition-all duration-150 cursor-pointer hover:text-[var(--accent-blue)] hover:border-[var(--accent-blue-border)] hover:bg-[var(--accent-blue-soft)] ${
          isOpen ? "active text-[var(--accent-blue)] border-[var(--accent-blue-border)] bg-[var(--accent-blue-soft)]" : ""
        }`}
        onClick={toggleOpen}
        aria-label="Notifikasi sistem"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Notifikasi sistem aktif"
        type="button"
      >
        <IconBell size={17} />
        {unreadCount > 0 && (
          <i
            className="absolute -top-[3px] -right-[3px] grid place-items-center w-[15px] h-[15px] text-[#ffffff] rounded-[99px] bg-[var(--red)] text-[9px] not-italic font-bold"
            aria-label={`${unreadCount} notifikasi belum dibaca`}
          >
            {unreadCount}
          </i>
        )}
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="modal-pop fixed z-[55] border border-[var(--panel-border)] rounded-[14px] bg-[var(--modal-bg)] [box-shadow:var(--shadow-elevated)] text-[var(--ink-primary)] flex flex-col overflow-visible"
          style={positionStyle}
          role="dialog"
          aria-label="Panel Notifikasi"
        >
          {/* Arrow / Caret pointing to the bell icon */}
          <div
            className="absolute -top-[6px] w-[12px] h-[12px] bg-[var(--panel-bg)] border-l border-t border-[var(--panel-border)] [transform:rotate(45deg)] pointer-events-none z-[4]"
            style={{ left: `${caretOffset}px` }}
            aria-hidden="true"
          />

          {/* Header */}
          <div className="flex items-center justify-between gap-[12px] p-[13px_18px] border-b border-[var(--line)] bg-[var(--panel-bg)] rounded-t-[14px] relative z-[3]">
            <div className="flex items-center gap-[8px]">
              <strong className="text-[13.5px] font-bold text-[var(--ink-primary)]">Notifikasi</strong>
              {unreadCount > 0 ? (
                <span className="p-[2px_7px] rounded-[99px] bg-[var(--accent-blue-soft)] text-[var(--accent-blue)] border border-[var(--accent-blue-border)] text-[10px] font-bold [font-family:var(--font-mono)] leading-none">{unreadCount} baru</span>
              ) : (
                <span className="p-[2px_7px] rounded-[99px] bg-[var(--green-soft)] text-[var(--green)] border border-[var(--green-border)] text-[9.5px] font-semibold [font-family:var(--font-mono)] leading-none">Semua dibaca</span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                className="text-[var(--accent-blue)] text-[11px] font-semibold bg-transparent p-[3px_6px] rounded-[5px] transition-all duration-150 cursor-pointer hover:bg-[var(--accent-blue-soft)] hover:underline"
                onClick={() => markAllAsRead(activeClientId)}
                type="button"
              >
                Tandai dibaca
              </button>
            )}
          </div>

          {/* Notification List with Max-Height Scrolling */}
          <div className="max-h-[290px] overflow-y-auto flex flex-col py-[4px] overscroll-contain [scrollbar-width:thin] [scrollbar-color:rgba(56,189,248,0.25)_transparent]" role="list">
            {notifications.length > 0 ? (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-[10px] p-[12px_18px] border-b border-[var(--line)] cursor-pointer text-left transition-colors duration-150 last:border-b-0 ${
                    item.unread
                      ? "bg-[color-mix(in_srgb,var(--accent-blue-soft)_45%,transparent)] hover:bg-[color-mix(in_srgb,var(--accent-blue-soft)_70%,transparent)]"
                      : "hover:bg-[var(--panel-bg-hover)]"
                  }`}
                  onClick={() => markAsRead(item.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      markAsRead(item.id);
                    }
                  }}
                >
                  <div className="pt-[5px] shrink-0">
                    <span
                      className={`block w-[7px] h-[7px] rounded-[99px] ${item.unread ? "bg-[var(--accent-blue)] [box-shadow:0_0_0_2.5px_var(--accent-blue-border)]" : "bg-[var(--ink-muted)] opacity-35"}`}
                      title={item.unread ? "Belum dibaca" : "Sudah dibaca"}
                      aria-hidden="true"
                    />
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col gap-[2px]">
                    <div className="flex items-baseline justify-between gap-[8px]">
                      <strong className="block overflow-hidden text-[var(--ink-primary)] text-[12.5px] font-semibold leading-[1.35] text-ellipsis whitespace-nowrap">{item.title}</strong>
                      <span className="shrink-0 text-[var(--ink-muted)] text-[10px] [font-family:var(--font-mono)]">{item.time}</span>
                    </div>

                    <p className="m-[2px_0_0] text-[var(--ink-secondary)] text-[11.5px] leading-[1.45]">{item.message}</p>

                    <div className="flex items-center gap-[6px] mt-[6px]">
                      <Badge tone={item.severity}>{item.category}</Badge>
                      {item.unread && (
                        <span className="text-[9.5px] font-bold text-[var(--accent-blue)] [font-family:var(--font-mono)] uppercase">Baru</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center gap-[6px] p-[34px_20px] text-center">
                <span className="grid place-items-center w-[38px] h-[38px] rounded-[99px] bg-[var(--green-soft)] border border-[var(--green-border)] text-[var(--green)] text-[16px] font-extrabold mb-[4px]">✓</span>
                <strong className="text-[13px] text-[var(--ink-primary)]">Tidak ada notifikasi aktif</strong>
                <p className="m-0 text-[11.5px] text-[var(--ink-muted)] max-w-[260px] leading-[1.4]">Semua alert dan pemeriksaan sistem dalam kondisi nominal.</p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-[10px_14px] border-t border-[var(--line)] bg-[var(--bg)] rounded-b-[14px] flex flex-col gap-[6px]">
            <Link href={paths.notifications} onClick={() => setIsOpen(false)}
              className="w-full h-[32px] inline-flex items-center justify-center gap-[6px] px-[12px] text-[11.5px] font-semibold text-[var(--accent-blue)] border border-[var(--accent-blue-border)] rounded-[7px] bg-[var(--accent-blue-soft)] cursor-pointer transition-all duration-150 hover:bg-[color-mix(in_srgb,var(--accent-blue-soft)_120%,var(--accent-blue)_25%)] hover:border-[var(--accent-blue)]"
            >
              <span>Lihat Semua Notifikasi</span>
              <ArrowRight size={13} />
            </Link>
            {notifications.length > 0 && (
              <button
                className="w-full h-[28px] inline-flex items-center justify-center px-[12px] text-[11px] font-medium text-[var(--ink-secondary)] border border-transparent rounded-[6px] bg-transparent cursor-pointer transition-all duration-150 hover:text-[var(--red)] hover:border-[var(--red-border)] hover:bg-[var(--red-soft)]"
                onClick={() => clearAll(activeClientId)}
                type="button"
              >
                Bersihkan semua notifikasi
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
