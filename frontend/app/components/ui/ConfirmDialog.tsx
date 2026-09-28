import { Modal } from "./Modal";
import { ModalCloseButton } from "./ModalCloseButton";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} label={title} width={440}>
      <div className="modal-title">
        <div>
          <strong style={danger ? { color: "var(--red)" } : undefined}>{title}</strong>
          <small>{message}</small>
        </div>
        <ModalCloseButton onClose={onCancel} />
      </div>
      <div
        className={`confirm-hint [padding:10px_12px] [border:1px_solid_var(--accent-blue-border)] [border-radius:8px] [background:var(--accent-blue-soft)] [color:var(--ink-secondary)] [font-size:11.5px] [line-height:1.45] ${danger ? "confirm-hint-danger [border-color:var(--red-border)] [background:var(--red-soft)] [color:#fca5a5]" : ""}`}
      >
        <strong className={danger ? "[color:#f87171]" : undefined}>This action requires confirmation</strong> to prevent unintended changes.
      </div>
      <div className="modal-actions">
        <button type="button" className="button button-secondary" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={danger ? "button button-danger" : "button button-primary"}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
