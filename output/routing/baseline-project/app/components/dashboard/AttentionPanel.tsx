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
    <article className="panel attention-panel bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-[10px] overflow-hidden shadow-[var(--shadow-panel)]">
      <div className="panel-heading flex justify-between items-start gap-[16px] px-[20px] pt-[16px] pb-[14px] border-b border-[var(--line)]">
        <div className="panel-title flex items-center gap-[8px] text-[var(--ink-primary)] text-[14px] font-bold">
          <span className="attention-icon grid place-items-center w-[20px] h-[20px] text-[var(--orange)] rounded-[99px] bg-[var(--orange-soft)] border border-[var(--orange-border)] text-[11px] font-extrabold">!</span> Perlu Perhatian{" "}
          <Badge tone={unreadAttentionCount > 0 ? "warning" : "success"}>
            {unreadAttentionCount}
          </Badge>
        </div>
        {onGoToNotifications && (
          <button
            type="button"
            className="text-button py-[2px] px-0 text-[var(--accent-blue)] bg-transparent text-[11.5px] font-semibold whitespace-nowrap hover:underline cursor-pointer"
            onClick={onGoToNotifications}
            title="Buka daftar lengkap notifikasi & alert sistem"
          >
            {overflowCount > 0
              ? `+${overflowCount} lainnya · Lihat Semua →`
              : "Lihat Semua Notifikasi →"}
          </button>
        )}
      </div>

      <div className="attention-list px-[20px] py-0">
        {displayedItems.length === 0 ? (
          <div className="px-[20px] py-[24px] text-center text-[var(--ink-secondary)] text-[12px]">
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
                className={`attention-row grid grid-cols-[28px_minmax(0,1fr)_auto] gap-[12px] items-center py-[14px] px-0 border-b border-[var(--line)] last:border-b-0 ${
                  isAcknowledged ? "resolved opacity-[0.55] transition-opacity duration-300 ease" : ""
                } ${isRecentlyAcked ? "pending-ack opacity-[0.8]" : ""}`}
                key={item.id}
              >
                <ProjectMark name={projectName} />
                <div className="attention-copy">
                  <div className="flex items-center gap-[7px] mb-[3px]">
                    <Badge tone={badgeTone}>{item.category}</Badge>
                    <span className="attention-time text-[var(--ink-muted)] text-[10px] font-mono">{item.time}</span>
                  </div>
                  <strong className="block overflow-hidden text-[var(--ink-primary)] text-[12.5px] font-semibold text-ellipsis whitespace-nowrap">{item.title}</strong>
                  <p className="mt-[2px] mr-0 mb-0 ml-0 text-[var(--ink-secondary)] text-[11px] leading-[1.4]">
                    {isAcknowledged
                      ? isRecentlyAcked
                        ? "Acknowledged — dapat dibatalkan (Undo)."
                        : "Acknowledged — tercatat pada log notifikasi."
                      : item.message}
                  </p>
                </div>

                <div className="ack-action-group">
                  <button
                    className={`ack-button h-[26px] px-[10px] py-0 rounded-[5px] text-[10.5px] font-semibold transition-all duration-150 cursor-pointer border ${
                      isAcknowledged
                        ? "ack-active text-[var(--green)] border-[var(--green-border)] bg-[var(--green-soft)] hover:text-[var(--orange)] hover:border-[var(--orange-border)] hover:bg-[var(--orange-soft)]"
                        : "text-[var(--ink-secondary)] border-[var(--panel-border)] bg-[var(--panel-bg)] hover:text-[var(--accent-blue)] hover:border-[var(--accent-blue-border)] hover:bg-[var(--accent-blue-soft)]"
                    } ${isRecentlyAcked ? "undo-available animate-[ack-pulse_2s_infinite_ease-in-out]" : ""}`}
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
