"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { Badge } from "@/app/components/ui/Badge";
import { ProjectMark } from "@/app/components/ui/ProjectMark";
import { useToast } from "@/app/components/ui/Toast";
import { useNotifications, type NotificationItem } from "@/app/context/NotificationContext";
import { useClient } from "@/app/context/ClientContext";

interface AttentionPanelProps {
  onGoToNotifications?: () => void;
  // Kept optional for backward compatibility
  acknowledged?: string[];
  onAcknowledge?: (title: string) => void;
  onUnacknowledge?: (title: string) => void;
}

const UNDO_WINDOW_MS = 6500;

function getBadgeTone(item: NotificationItem): "warning" | "critical" | "info" | "success" {
  if (item.severity === "critical") return "critical";
  if (item.severity === "warning") return "warning";
  if (item.severity === "success") return "success";
  return "info";
}

function getProjectName(item: NotificationItem): string {
  if (item.project) return item.project;
  const combined = (item.title + " " + item.category).toLowerCase();
  if (combined.includes("bni mobile") || combined.includes("atm")) return "BNI Mobile";
  if (combined.includes("mytelkomsel") || combined.includes("ocs")) return "MyTelkomsel";
  if (combined.includes("sm") || combined.includes("activemq")) return "SM";
  if (combined.includes("b2b") || combined.includes("kafka")) return "B2B";
  if (combined.includes("ticket") || combined.includes("epc")) return "EPC Tools";
  if (combined.includes("siem") || combined.includes("usiem")) return "USIEM";
  if (combined.includes("database") || combined.includes("d1")) return "DM";
  if (combined.includes("network") || combined.includes("switch")) return "UNEM";
  return "NOC";
}

const MAX_ATTENTION_ITEMS = 4;

export function AttentionPanel({
  onGoToNotifications,
  onAcknowledge,
  onUnacknowledge,
}: AttentionPanelProps) {
  const { notifications, markAsRead, markAsUnread } = useNotifications();
  const { activeClientId } = useClient();
  const notify = useToast();
  const [recentAcks, setRecentAcks] = useState<Record<string, number>>({});
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Clean up timers on unmount
  useEffect(() => {
    const activeTimers = timersRef.current;
    return () => {
      Object.values(activeTimers).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const clientNotifications = useMemo(() => {
    return notifications.filter((n) => !n.clientId || n.clientId === activeClientId);
  }, [notifications, activeClientId]);

  // Filter for only unacknowledged items requiring action (or active in undo window)
  const activeAttentionItems = useMemo(() => {
    return clientNotifications.filter((n) => {
      const isUrgent = n.severity === "warning" || n.severity === "critical";
      const isAlertCategory = ["Monitoring", "Ticket", "Temuan", "SLA", "Queue", "Kafka", "Tickets", "API", "Cache"].includes(n.category);
      const isPending = n.unread || Boolean(recentAcks[n.id]);
      return (isUrgent || isAlertCategory || Boolean(n.project)) && isPending;
    });
  }, [clientNotifications, recentAcks]);

  const unreadAttentionCount = useMemo(() => {
    return clientNotifications.filter((n) => {
      const isUrgent = n.severity === "warning" || n.severity === "critical";
      const isAlertCategory = ["Monitoring", "Ticket", "Temuan", "SLA", "Queue", "Kafka", "Tickets", "API", "Cache"].includes(n.category);
      return (isUrgent || isAlertCategory || Boolean(n.project)) && n.unread;
    }).length;
  }, [clientNotifications]);

  // Capped at MAX_ATTENTION_ITEMS for a compact preview
  const displayedItems = useMemo(() => {
    return activeAttentionItems.slice(0, MAX_ATTENTION_ITEMS);
  }, [activeAttentionItems]);

  const overflowCount = Math.max(0, activeAttentionItems.length - MAX_ATTENTION_ITEMS);

  const handleAcknowledge = (item: NotificationItem) => {
    markAsRead(item.id);
    if (onAcknowledge) {
      onAcknowledge(item.title);
    }

    // Track active undo window for this item
    const expiresAt = Date.now() + UNDO_WINDOW_MS;
    setRecentAcks((prev) => ({ ...prev, [item.id]: expiresAt }));

    if (timersRef.current[item.id]) {
      clearTimeout(timersRef.current[item.id]);
    }

    timersRef.current[item.id] = setTimeout(() => {
      setRecentAcks((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      delete timersRef.current[item.id];
    }, UNDO_WINDOW_MS);

    notify.success(`ACK: ${item.title}`, {
      id: `ack-${item.id}`,
      duration: UNDO_WINDOW_MS,
      action: {
        label: "Undo",
        onClick: () => handleUndo(item),
      },
    });
  };

  const handleUndo = (item: NotificationItem) => {
    if (timersRef.current[item.id]) {
      clearTimeout(timersRef.current[item.id]);
      delete timersRef.current[item.id];
    }

    setRecentAcks((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });

    if (markAsUnread) {
      markAsUnread(item.id);
    }
    if (onUnacknowledge) {
      onUnacknowledge(item.title);
    }

    notify.info(`ACK dibatalkan untuk ${item.title}.`, { id: `ack-${item.id}` });
  };

  return (
    <article className="panel attention-panel">
      <div className="panel-heading">
        <div className="panel-title">
          <span className="attention-icon [display:grid] [place-items:center] [width:20px] [height:20px] [color:var(--orange)] [border-radius:99px] [background:var(--orange-soft)] [border:1px_solid_var(--orange-border)] [font-size:11px] [font-weight:800]">!</span> Perlu Perhatian{" "}
          <Badge tone={unreadAttentionCount > 0 ? "warning" : "success"}>
            {unreadAttentionCount}
          </Badge>
        </div>
        {onGoToNotifications && (
          <button
            type="button"
            className="text-button [padding:2px_0] [color:var(--accent-blue)] [background:transparent] [font-size:11.5px] [font-weight:600] [white-space:nowrap]"
            onClick={onGoToNotifications}
            title="Buka daftar lengkap notifikasi & alert sistem"
          >
            {overflowCount > 0
              ? `+${overflowCount} lainnya · Lihat Semua →`
              : "Lihat Semua Notifikasi →"}
          </button>
        )}
      </div>

      <div className="attention-list [padding:0_20px]">
        {displayedItems.length === 0 ? (
          <div className="[padding:24px_20px] [text-align:center] [color:var(--ink-secondary)] [font-size:12px]">
            Semua anomali operasional telah di-acknowledge dan berstatus nominal.
          </div>
        ) : (
          displayedItems.map((item) => {
            const isAcknowledged = !item.unread;
            const isRecentlyAcked = Boolean(recentAcks[item.id]);
            const projectName = getProjectName(item);
            const badgeTone = getBadgeTone(item);

            return (
              <div
                className={`attention-row [display:grid] [grid-template-columns:28px_minmax(0,_1fr)_auto] [gap:12px] [align-items:center] [padding:14px_0] [border-bottom:1px_solid_var(--line)] ${isAcknowledged ? "resolved" : ""} ${isRecentlyAcked ? "pending-ack" : ""}`}
                key={item.id}
              >
                <ProjectMark name={projectName} />
                <div className="attention-copy">
                  <div className="[display:flex] [align-items:center] [gap:7px] [margin-bottom:3px]">
                    <Badge tone={badgeTone}>{item.category}</Badge>
                    <span className="attention-time [color:var(--ink-muted)] [font-size:10px] [font-family:var(--font-mono)]">{item.time}</span>
                  </div>
                  <strong className="[display:block] [overflow:hidden] [color:var(--ink-primary)] [font-size:12.5px] [font-weight:600] [text-overflow:ellipsis] [white-space:nowrap]">{item.title}</strong>
                  <p className="[margin:2px_0_0] [color:var(--ink-secondary)] [font-size:11px] [line-height:1.4]">
                    {isAcknowledged
                      ? isRecentlyAcked
                        ? "Acknowledged — dapat dibatalkan (Undo)."
                        : "Acknowledged — tercatat pada log notifikasi."
                      : item.message}
                  </p>
                </div>

                <div className="ack-action-group">
                  <button
                    className={`ack-button [height:26px] [padding:0_10px] [color:var(--ink-secondary)] [border:1px_solid_var(--panel-border)]! [border-radius:5px] [background:var(--panel-bg)]! [font-size:10.5px]! [font-weight:600] [transition:all_0.15s_ease] ${isAcknowledged ? "ack-active" : ""} ${isRecentlyAcked ? "undo-available" : ""}`}
                    onClick={() => {
                      if (isAcknowledged) {
                        handleUndo(item);
                      } else {
                        handleAcknowledge(item);
                      }
                    }}
                    title={
                      isAcknowledged
                        ? "Klik untuk membatalkan ACK (Undo)"
                        : "Tandai isu ini sebagai Acknowledged"
                    }
                  >
                    {isAcknowledged ? (isRecentlyAcked ? "✓ Ack (Undo?)" : "✓ Acknowledged") : "Ack"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </article>
  );
}
