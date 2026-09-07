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
      <div className={`confirm-hint ${danger ? "confirm-hint-danger" : ""}`}>
        <strong>This action requires confirmation</strong> to prevent unintended changes.
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
