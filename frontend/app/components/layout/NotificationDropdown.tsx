"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { IconBell } from "@/app/components/ui/Icons";
import { Badge } from "@/app/components/ui/Badge";
import { useNotifications } from "@/app/context/NotificationContext";
import { useClient } from "@/app/context/ClientContext";

interface NotificationDropdownProps {
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
  onNavigate?: (label: string) => void;
}

export function NotificationDropdown({ onNavigate }: NotificationDropdownProps = {}) {
  const { activeClient, activeClientId } = useClient();
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

  const handleViewAll = () => {
    setIsOpen(false);
    if (onNavigate) {
      onNavigate("Notifikasi");
    }
  };

  return (
    <div className="notification-dropdown-wrapper [position:relative] [display:inline-flex]">
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
        {unreadCount > 0 && (
          <i
            className="[position:absolute] [top:-3px] [right:-3px] [display:grid] [place-items:center] [width:15px] [height:15px] [color:#ffffff] [border-radius:99px] [background:var(--red)] [font-size:9px] [font-style:normal] [font-weight:700]"
            aria-label={`${unreadCount} notifikasi belum dibaca`}
          >
            {unreadCount}
          </i>
        )}
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="notification-panel modal-pop [position:fixed] [z-index:55] [border:1px_solid_var(--panel-border)] [border-radius:14px] [background:var(--modal-bg)] [box-shadow:var(--shadow-elevated)] [color:var(--ink-primary)] [display:flex] [flex-direction:column] [overflow:visible]"
          style={positionStyle}
          role="dialog"
          aria-label="Panel Notifikasi"
        >
          {/* Arrow / Caret pointing to the bell icon */}
          <div
            className="notification-caret [position:absolute] [top:-6px] [width:12px] [height:12px] [background:var(--panel-bg)] [border-left:1px_solid_var(--panel-border)] [border-top:1px_solid_var(--panel-border)] [transform:rotate(45deg)] [pointer-events:none] [z-index:4]"
            style={{ left: `${caretOffset}px` }}
            aria-hidden="true"
          />

          {/* Header */}
          <div className="notification-header [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [padding:13px_18px] [border-bottom:1px_solid_var(--line)] [background:var(--panel-bg)] [border-radius:14px_14px_0_0] [position:relative] [z-index:3]">
            <div className="notification-header-title [display:flex] [align-items:center] [gap:8px]">
              <strong className="[font-size:13.5px] [font-weight:700] [color:var(--ink-primary)]">Notifikasi</strong>
              {unreadCount > 0 ? (
                <span className="notification-unread-pill [padding:2px_7px] [border-radius:99px] [background:var(--accent-blue-soft)] [color:var(--accent-blue)] [border:1px_solid_var(--accent-blue-border)] [font-size:10px] [font-weight:700] [font-family:var(--font-mono)] [line-height:1]">{unreadCount} baru</span>
              ) : (
                <span className="notification-allread-pill [padding:2px_7px] [border-radius:99px] [background:var(--green-soft)] [color:var(--green)] [border:1px_solid_var(--green-border)] [font-size:9.5px] [font-weight:600] [font-family:var(--font-mono)] [line-height:1]">Semua dibaca</span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                className="notification-header-action [color:var(--accent-blue)] [font-size:11px] [font-weight:600] [background:transparent] [padding:3px_6px] [border-radius:5px] [transition:all_0.15s_ease]"
                onClick={() => markAllAsRead(activeClientId)}
                type="button"
              >
                Tandai dibaca
              </button>
            )}
          </div>

          {/* Notification List with Max-Height Scrolling */}
          <div className="notification-list [max-height:290px] [overflow-y:auto] [display:flex] [flex-direction:column] [padding:4px_0] [overscroll-behavior:contain] [scrollbar-width:thin] [scrollbar-color:rgba(56,_189,_248,_0.25)_transparent]" role="list">
            {notifications.length > 0 ? (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className={`notification-item [display:flex] [align-items:flex-start] [gap:10px] [padding:12px_18px] [border-bottom:1px_solid_var(--line)] [cursor:pointer] [text-align:left] [transition:background_0.15s_ease] ${item.unread ? "unread" : "read"}`}
                  onClick={() => markAsRead(item.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      markAsRead(item.id);
                    }
                  }}
                >
                  <div className="notification-status-col [padding-top:5px] [flex-shrink:0]">
                    <span
                      className={`notification-read-dot [display:block] [width:7px] [height:7px] [border-radius:99px] ${item.unread ? "unread-dot" : "read-dot"}`}
                      title={item.unread ? "Belum dibaca" : "Sudah dibaca"}
                      aria-hidden="true"
                    />
                  </div>

                  <div className="notification-content [flex:1] [min-width:0] [display:flex] [flex-direction:column] [gap:2px]">
                    <div className="notification-top-row [display:flex] [align-items:baseline] [justify-content:space-between] [gap:8px]">
                      <strong className="notification-title [display:block] [overflow:hidden] [color:var(--ink-primary)] [font-size:12.5px] [font-weight:600] [line-height:1.35] [text-overflow:ellipsis] [white-space:nowrap]">{item.title}</strong>
                      <span className="notification-time [flex-shrink:0] [color:var(--ink-muted)] [font-size:10px] [font-family:var(--font-mono)]">{item.time}</span>
                    </div>

                    <p className="notification-message [margin:2px_0_0] [color:var(--ink-secondary)] [font-size:11.5px] [line-height:1.45]">{item.message}</p>

                    <div className="notification-meta-row [display:flex] [align-items:center] [gap:6px] [margin-top:6px]">
                      <Badge tone={item.severity}>{item.category}</Badge>
                      {item.unread && (
                        <span className="notification-unread-label [font-size:9.5px] [font-weight:700] [color:var(--accent-blue)] [font-family:var(--font-mono)] [text-transform:uppercase]">Baru</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="notification-empty [display:flex] [flex-direction:column] [align-items:center] [gap:6px] [padding:34px_20px] [text-align:center]">
                <span className="notification-empty-icon [display:grid] [place-items:center] [width:38px] [height:38px] [border-radius:99px] [background:var(--green-soft)] [border:1px_solid_var(--green-border)] [color:var(--green)] [font-size:16px] [font-weight:800] [margin-bottom:4px]">✓</span>
                <strong className="[font-size:13px] [color:var(--ink-primary)]">Tidak ada notifikasi aktif</strong>
                <p className="[margin:0] [font-size:11.5px] [color:var(--ink-muted)] [max-width:260px] [line-height:1.4]">Semua alert dan pemeriksaan sistem dalam kondisi nominal.</p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="notification-footer [padding:10px_14px] [border-top:1px_solid_var(--line)] [background:var(--bg)] [border-radius:0_0_14px_14px] [display:flex] [flex-direction:column] [gap:6px]">
            <button
              className="notification-view-all-button [width:100%] [height:32px] [display:inline-flex] [align-items:center] [justify-content:center] [gap:6px] [padding:0_12px] [font-size:11.5px] [font-weight:600] [color:var(--accent-blue)] [border:1px_solid_var(--accent-blue-border)] [border-radius:7px] [background:var(--accent-blue-soft)] [cursor:pointer] [transition:all_0.15s_ease]"
              onClick={handleViewAll}
              type="button"
            >
              <span>Lihat Semua Notifikasi</span>
              <ArrowRight size={13} />
            </button>
            {notifications.length > 0 && (
              <button
                className="notification-clear-button [width:100%] [height:28px] [display:inline-flex] [align-items:center] [justify-content:center] [padding:0_12px] [font-size:11px] [font-weight:500] [color:var(--ink-secondary)] [border:1px_solid_transparent] [border-radius:6px] [background:transparent] [cursor:pointer] [transition:all_0.15s_ease]"
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
