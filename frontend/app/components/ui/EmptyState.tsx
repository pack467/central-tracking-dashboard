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

const EMPTY_STATE_CLASS = "empty-state [display:flex] [flex-direction:column] [align-items:center] [gap:4px] [padding:36px_20px] [text-align:center]";
const EMPTY_STATE_ICON_CLASS = "empty-state-icon [display:grid] [place-items:center] [width:52px] [height:52px] [margin-bottom:8px] [color:var(--ink-muted)] [border:1px_dashed_var(--panel-border)] [border-radius:99px] [background:var(--bg)] [font-size:22px]";
const EMPTY_STATE_TITLE_CLASS = "[color:var(--ink-primary)] [font-size:13.5px]";
const EMPTY_STATE_MESSAGE_CLASS = "[max-width:380px] [margin:0] [color:var(--ink-muted)] [font-size:11.5px] [line-height:1.5]";

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
    <div className={`${EMPTY_STATE_CLASS} empty-state-${tone} ${className}`}>
      <span className={`${EMPTY_STATE_ICON_CLASS} empty-icon-${tone}`} aria-hidden="true">
        {icon}
      </span>
      <strong className={EMPTY_STATE_TITLE_CLASS}>{title}</strong>
      <p className={EMPTY_STATE_MESSAGE_CLASS}>{message}</p>
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
