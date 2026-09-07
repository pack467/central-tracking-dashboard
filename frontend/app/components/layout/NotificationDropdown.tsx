"use client";

import { useEffect, useRef, useState } from "react";
import { IconBell } from "@/app/components/ui/Icons";
import { Badge } from "@/app/components/ui/Badge";
import { useToast } from "@/app/components/ui/Toast";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  category: string;
  severity: "warning" | "critical" | "success" | "info";
  unread: boolean;
}

const initialNotifications: NotificationItem[] = [
  {
    id: "notif-1",
    title: "Penumpukan Queue ActiveMQ 228",
    message: "Dilaporkan pada checkpoint 18:00 WIB. Memerlukan validasi penanggung jawab.",
    time: "10 menit lalu",
    category: "Queue",
    severity: "warning",
    unread: true,
  },
  {
    id: "notif-2",
    title: "Peringatan Aliran Pesan B2B",
    message: "Tidak ada pesan yang terdeteksi pada topik b2b-f... Periksa kesehatan producer.",
    time: "25 menit lalu",
    category: "Kafka",
    severity: "warning",
    unread: true,
  },
  {
    id: "notif-3",
    title: "Pemulihan Otomatis Gateway SIEM",
    message: "Uji kesehatan gateway log USIEM berhasil dipulihkan secara otomatis.",
    time: "1 jam lalu",
    category: "USIEM",
    severity: "success",
    unread: false,
  },
];

interface NotificationDropdownProps {
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
}

export function NotificationDropdown() {
  const notify = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [positionStyle, setPositionStyle] = useState<React.CSSProperties>({});
  const [caretOffset, setCaretOffset] = useState<number>(0);

  const unreadCount = notifications.filter((n) => n.unread).length;

  // Collision detection and dynamic anchoring
  const updatePosition = () => {
    if (!buttonRef.current || !isOpen) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const dropdownWidth = Math.min(380, window.innerWidth - 24);
    const viewportWidth = window.innerWidth;
    const safeMargin = 12;

    // Ideal right alignment with button's right edge
    let right = viewportWidth - buttonRect.right;
    let left: number | undefined;

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
  };

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
  }, [isOpen]);

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

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    notify.success("Semua notifikasi ditandai sudah dibaca.", { id: "notif-mark-all-read" });
  };

  const clearAll = () => {
    setNotifications([]);
    setIsOpen(false);
    notify.info("Semua notifikasi telah dibersihkan.", { id: "notif-clear-all" });
  };

  return (
    <div className="notification-dropdown-wrapper">
      <button
        ref={buttonRef}
        className={`icon-button notification-button ${isOpen ? "active" : ""}`}
        onClick={toggleOpen}
        aria-label="Notifikasi sistem"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Notifikasi sistem aktif"
        type="button"
      >
        <IconBell size={17} />
        {unreadCount > 0 && <i aria-label={`${unreadCount} notifikasi belum dibaca`}>{unreadCount}</i>}
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="notification-panel modal-pop"
          style={positionStyle}
          role="dialog"
          aria-label="Panel Notifikasi"
        >
          {/* Arrow / Caret pointing to the bell icon */}
          <div
            className="notification-caret"
            style={{ left: `${caretOffset}px` }}
            aria-hidden="true"
          />

          {/* Header */}
          <div className="notification-header">
            <div className="notification-header-title">
              <strong>Notifikasi</strong>
              {unreadCount > 0 ? (
                <span className="notification-unread-pill">{unreadCount} baru</span>
              ) : (
                <span className="notification-allread-pill">Semua dibaca</span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                className="notification-header-action"
                onClick={markAllAsRead}
                type="button"
              >
                Tandai dibaca
              </button>
            )}
          </div>

          {/* Notification List with Max-Height Scrolling */}
          <div className="notification-list" role="list">
            {notifications.length > 0 ? (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className={`notification-item ${item.unread ? "unread" : "read"}`}
                  onClick={() => markAsRead(item.id)}
                  role="listitem"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      markAsRead(item.id);
                    }
                  }}
                >
                  <div className="notification-status-col">
                    <span
                      className={`notification-read-dot ${item.unread ? "unread-dot" : "read-dot"}`}
                      title={item.unread ? "Belum dibaca" : "Sudah dibaca"}
                      aria-hidden="true"
                    />
                  </div>

                  <div className="notification-content">
                    <div className="notification-top-row">
                      <strong className="notification-title">{item.title}</strong>
                      <span className="notification-time">{item.time}</span>
                    </div>

                    <p className="notification-message">{item.message}</p>

                    <div className="notification-meta-row">
                      <Badge tone={item.severity}>{item.category}</Badge>
                      {item.unread && (
                        <span className="notification-unread-label">Baru</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="notification-empty">
                <span className="notification-empty-icon">✓</span>
                <strong>Tidak ada notifikasi aktif</strong>
                <p>Semua alert dan pemeriksaan sistem dalam kondisi nominal.</p>
              </div>
            )}
          </div>

          {/* Footer Action */}
          {notifications.length > 0 && (
            <div className="notification-footer">
              <button
                className="notification-clear-button"
                onClick={clearAll}
                type="button"
              >
                Bersihkan semua notifikasi
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
