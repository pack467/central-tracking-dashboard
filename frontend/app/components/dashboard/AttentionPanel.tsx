"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/app/components/ui/Badge";
import { ProjectMark } from "@/app/components/ui/ProjectMark";
import { useToast } from "@/app/components/ui/Toast";
import { attentionItems } from "@/app/lib/data";

interface AttentionPanelProps {
  acknowledged: string[];
  onAcknowledge: (title: string) => void;
  onUnacknowledge?: (title: string) => void;
}

const UNDO_WINDOW_MS = 6500;

export function AttentionPanel({ acknowledged, onAcknowledge, onUnacknowledge }: AttentionPanelProps) {
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

  const handleAcknowledge = (title: string) => {
    onAcknowledge(title);

    // Track active undo window for this item
    const expiresAt = Date.now() + UNDO_WINDOW_MS;
    setRecentAcks((prev) => ({ ...prev, [title]: expiresAt }));

    if (timersRef.current[title]) {
      clearTimeout(timersRef.current[title]);
    }

    timersRef.current[title] = setTimeout(() => {
      setRecentAcks((prev) => {
        const next = { ...prev };
        delete next[title];
        return next;
      });
      delete timersRef.current[title];
    }, UNDO_WINDOW_MS);

    notify.success(`ACK: ${title}`, {
      id: `ack-${title}`,
      duration: UNDO_WINDOW_MS,
      action: {
        label: "Undo",
        onClick: () => handleUndo(title),
      },
    });
  };

  const handleUndo = (title: string) => {
    if (timersRef.current[title]) {
      clearTimeout(timersRef.current[title]);
      delete timersRef.current[title];
    }

    setRecentAcks((prev) => {
      const next = { ...prev };
      delete next[title];
      return next;
    });

    if (onUnacknowledge) {
      onUnacknowledge(title);
    }

    notify.info(`ACK dibatalkan untuk ${title}.`, { id: `ack-${title}` });
  };

  return (
    <article className="panel attention-panel">
      <div className="panel-heading">
        <div className="panel-title">
          <span className="attention-icon">!</span> Perlu Perhatian{" "}
          <Badge tone="warning">{attentionItems.length - acknowledged.length}</Badge>
        </div>
      </div>
      <div className="attention-list">
        {attentionItems.map((item) => {
          const isAcknowledged = acknowledged.includes(item.title);
          const isRecentlyAcked = Boolean(recentAcks[item.title]);

          return (
            <div
              className={`attention-row ${isAcknowledged ? "resolved" : ""} ${isRecentlyAcked ? "pending-ack" : ""}`}
              key={item.title}
            >
              <ProjectMark name={item.project} />
              <div className="attention-copy">
                <div>
                  <Badge tone={item.tone}>{item.tag}</Badge>
                  <span className="attention-time">{item.time}</span>
                </div>
                <strong>{item.title}</strong>
                <p>
                  {isAcknowledged
                    ? isRecentlyAcked
                      ? "Acknowledged — dapat dibatalkan (Undo)."
                      : "Acknowledged — menunggu validasi berikutnya."
                    : item.note}
                </p>
              </div>

              <div className="ack-action-group">
                <button
                  className={`ack-button ${isAcknowledged ? "ack-active" : ""} ${isRecentlyAcked ? "undo-available" : ""}`}
                  onClick={() => {
                    if (isAcknowledged) {
                      handleUndo(item.title);
                    } else {
                      handleAcknowledge(item.title);
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
        })}
      </div>
    </article>
  );
}
