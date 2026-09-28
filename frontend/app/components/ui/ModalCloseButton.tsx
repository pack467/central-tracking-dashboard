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
      className={`modal-close-btn [display:inline-flex] [align-items:center] [justify-content:center] [width:30px] [height:30px] [min-width:30px] [min-height:30px] [max-width:30px] [max-height:30px] [padding:0] [margin:0] [color:var(--ink-muted)] [border-radius:7px] [border:1px_solid_var(--panel-border)] [background:var(--input-bg)] [cursor:pointer] [line-height:1] [flex-shrink:0] [transition:all_0.15s_ease] [box-sizing:border-box] ${className}`}
      onClick={onClose}
      aria-label={label}
      title={label}
      {...props}
    >
      <X className="[display:block] [width:15px] [height:15px] [margin:auto] [flex-shrink:0] [pointer-events:none]" size={size} strokeWidth={2.2} />
    </button>
  );
}
