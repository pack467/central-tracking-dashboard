"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

interface FloatingNewTicketButtonProps {
  onClick: () => void;
}

export function FloatingNewTicketButton({ onClick }: FloatingNewTicketButtonProps) {
  const [mounted, setMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+N or Cmd+N to open new ticket
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        // Don't trigger if user is typing in an input/textarea
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }
        e.preventDefault();
        onClick();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClick]);

  if (!mounted) return null;

  return (
    <button
      type="button"
      className={`fab-new-ticket [position:fixed] [bottom:28px] [right:28px] [z-index:90] [display:inline-flex] [align-items:center] [justify-content:center] [gap:0] [height:48px] [min-width:48px] [padding:0_14px] [border:1px_solid_rgba(255,_255,_255,_0.16)]! [border-radius:9999px] [cursor:pointer] [background:linear-gradient(135deg,_#6366f1_0%,_#7c3aed_100%)]! [color:#ffffff] [font-family:var(--font-primary,_'Plus_Jakarta_Sans',_sans-serif)]! [font-size:13.5px]! [font-weight:700] [letter-spacing:0.02em] [box-shadow:0_4px_14px_rgba(0,_0,_0,_0.28),_0_1px_3px_rgba(0,_0,_0,_0.15)] [will-change:right,_transform,_padding,_gap] [transition:right_0.35s_cubic-bezier(0.16,_1,_0.3,_1),_transform_0.2s_cubic-bezier(0.16,_1,_0.3,_1),_padding_0.3s_cubic-bezier(0.16,_1,_0.3,_1),_gap_0.3s_cubic-bezier(0.16,_1,_0.3,_1),_background_0.2s_ease,_box-shadow_0.2s_ease] [overflow:hidden] [white-space:nowrap] [animation:fab-entrance_0.5s_cubic-bezier(0.34,_1.56,_0.64,_1)_0.3s_both] ${isHovered ? "fab-hovered" : ""}`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="Buat tiket baru (Ctrl+N)"
      title="New Ticket (Ctrl+N)"
    >
      <span className="fab-icon-wrap [display:flex] [align-items:center] [justify-content:center] [width:20px] [height:20px] [flex-shrink:0] [transition:transform_0.3s_cubic-bezier(0.34,_1.56,_0.64,_1)]">
        <Plus size={20} strokeWidth={2.5} />
      </span>
      <span className={`fab-label [display:inline-block] [max-width:0] [opacity:0] [overflow:hidden] [white-space:nowrap] [font-size:13.5px] [font-weight:700] [letter-spacing:0.02em] [color:#ffffff] [line-height:1] [transition:max-width_0.35s_cubic-bezier(0.16,_1,_0.3,_1),_opacity_0.25s_ease] ${isHovered ? "fab-label-visible" : ""}`}>
        New Ticket
      </span>
    </button>
  );
}
