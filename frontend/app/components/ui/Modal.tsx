"use client";

import { useEffect } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  label?: string;
  width?: number | string;
  variant?: "centered" | "wide" | "form";
  children: React.ReactNode;
}

export function Modal({ open, onClose, label, width, variant = "centered", children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  const className =
    variant === "wide" ? "handover-modal" : variant === "form" ? "handover-form-modal" : "ticket-modal";

  return (
    <div
      className="modal-backdrop anim-fade"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`${className} modal-pop`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        style={
          width
            ? { width: `min(${typeof width === "number" ? `${width}px` : width}, calc(100vw - 32px))` }
            : undefined
        }
      >
        {children}
      </section>
    </div>
  );
}
