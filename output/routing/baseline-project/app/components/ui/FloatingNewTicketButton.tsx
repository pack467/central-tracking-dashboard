"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

interface FloatingNewTicketButtonProps {
  onClick: () => void;
  isOpen?: boolean;
}

export function FloatingNewTicketButton({ onClick, isOpen = false }: FloatingNewTicketButtonProps) {
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

  const isExpanded = isHovered || isOpen;

  return (
    <button
      type="button"
      className={`fab-new-ticket group fixed bottom-[28px] right-[28px] z-[90] inline-flex items-center justify-center gap-0 h-[48px] min-w-[48px] border border-[rgba(255,255,255,0.16)] rounded-[9999px] cursor-pointer bg-[linear-gradient(135deg,#6366f1_0%,#7c3aed_100%)] text-[#ffffff] font-['Plus_Jakarta_Sans',sans-serif] text-[13.5px] font-bold tracking-[0.02em] [box-shadow:0_4px_14px_rgba(0,0,0,0.28),_0_1px_3px_rgba(0,0,0,0.15)] [will-change:right,_transform,_padding] [transition:right_0.35s_cubic-bezier(0.16,_1,_0.3,_1),_transform_0.2s_cubic-bezier(0.16,_1,_0.3,_1),_padding_0.3s_cubic-bezier(0.16,_1,_0.3,_1),_background_0.2s_ease,_box-shadow_0.2s_ease] overflow-hidden whitespace-nowrap hover:gap-[8px] hover:p-[0_18px_0_14px] hover:[transform:translateY(-2px)] hover:bg-[linear-gradient(135deg,#6d70f5_0%,#8b5cf6_100%)] hover:[box-shadow:0_6px_18px_rgba(0,0,0,0.35),_0_2px_6px_rgba(0,0,0,0.2)] active:[transform:translateY(0)_scale(0.97)] active:[box-shadow:0_2px_8px_rgba(0,0,0,0.25)] [.shift-panel-is-open_&]:right-[328px] [.shift-panel-is-open_&]:[transition:right_0.35s_cubic-bezier(0.16,_1,_0.3,_1)] max-[940px]:[.shift-panel-is-open_&]:right-[328px] max-[940px]:[.shift-panel-is-open_&]:[transform:none] max-[940px]:[.shift-panel-is-open_&]:opacity-0 max-[940px]:[.shift-panel-is-open_&]:pointer-events-none max-[940px]:h-[46px] max-[940px]:min-w-[46px] max-[940px]:p-[0_14px] max-[940px]:bottom-[20px] max-[940px]:right-[20px] max-[660px]:h-[46px] max-[660px]:min-w-[46px] max-[660px]:p-0 max-[660px]:justify-center max-[660px]:bottom-[16px] max-[660px]:right-[16px] max-[660px]:rounded-[50%] max-[660px]:gap-0 ${
        isExpanded ? "fab-expanded gap-[8px] p-[0_18px_0_14px] [transform:translateY(-2px)] bg-[linear-gradient(135deg,#6d70f5_0%,#8b5cf6_100%)] [box-shadow:0_6px_18px_rgba(0,0,0,0.35),_0_2px_6px_rgba(0,0,0,0.2)]" : "p-[0_14px]"
      } ${isHovered ? "fab-hovered gap-[8px] p-[0_18px_0_14px] [transform:translateY(-2px)] bg-[linear-gradient(135deg,#6d70f5_0%,#8b5cf6_100%)] [box-shadow:0_6px_18px_rgba(0,0,0,0.35),_0_2px_6px_rgba(0,0,0,0.2)]" : ""} ${
        isOpen
          ? "fab-modal-open [box-shadow:0_0_0_3px_rgba(99,102,241,0.4),_0_6px_20px_rgba(0,0,0,0.35)]"
          : ""
      }`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="Buat tiket baru (Ctrl+N)"
      title="New Ticket (Ctrl+N)"
    >
      <span className="fab-icon-wrap flex items-center justify-center w-[20px] h-[20px] shrink-0 [transition:transform_0.3s_cubic-bezier(0.34,_1.56,_0.64,_1)] group-hover:[transform:rotate(90deg)] [.fab-hovered_&]:[transform:rotate(90deg)]">
        <Plus size={20} strokeWidth={2.5} />
      </span>
      <span
        className={`fab-label inline-block overflow-hidden whitespace-nowrap text-[13.5px] font-bold tracking-[0.02em] text-[#ffffff] leading-none [transition:max-width_0.35s_cubic-bezier(0.16,_1,_0.3,_1),_opacity_0.25s_ease,_margin-left_0.35s_ease] group-hover:max-w-[120px] group-hover:opacity-100 group-hover:ml-[8px] max-[660px]:hidden ${
          isExpanded
            ? "fab-label-visible max-w-[120px] opacity-100 ml-[8px]"
            : "max-w-0 opacity-0 ml-0"
        }`}
      >
        New Ticket
      </span>
    </button>
  );
}
