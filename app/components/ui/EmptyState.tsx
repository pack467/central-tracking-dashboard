import type React from "react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message: string;
  action?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "neutral" | "success" | "warning" | "info" | "critical";
  className?: string;
}

export function EmptyState({
  icon = "◌",
  title,
  message,
  action,
  actionLabel,
  onAction,
  tone = "neutral",
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`empty-state empty-state-${tone} ${className}`}>
      <span className={`empty-state-icon empty-icon-${tone}`} aria-hidden="true">
        {icon}
      </span>
      <strong>{title}</strong>
      <p>{message}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          className="button button-secondary button-sm"
          onClick={onAction}
          style={{ marginTop: "12px" }}
        >
          {actionLabel}
        </button>
      )}
      {action}
    </div>
  );
}
