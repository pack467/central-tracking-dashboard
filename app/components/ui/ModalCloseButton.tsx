"use client";

import React from "react";
import { X } from "lucide-react";

export interface ModalCloseButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onClose: () => void;
  size?: number;
  className?: string;
  label?: string;
}

export function ModalCloseButton({
  onClose,
  size = 15,
  className = "",
  label = "Tutup",
  ...props
}: ModalCloseButtonProps) {
  return (
    <button
      type="button"
      className={`modal-close-btn ${className}`}
      onClick={onClose}
      aria-label={label}
      title={label}
      {...props}
    >
      <X size={size} strokeWidth={2.2} />
    </button>
  );
}
