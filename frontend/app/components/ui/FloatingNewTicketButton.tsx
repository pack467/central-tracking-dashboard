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
      className={`fab-new-ticket ${isHovered ? "fab-hovered" : ""}`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="Buat tiket baru (Ctrl+N)"
      title="New Ticket (Ctrl+N)"
    >
      <span className="fab-icon-wrap">
        <Plus size={20} strokeWidth={2.5} />
      </span>
      <span className={`fab-label ${isHovered ? "fab-label-visible" : ""}`}>
        New Ticket
      </span>
    </button>
  );
}
