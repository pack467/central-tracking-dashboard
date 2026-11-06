"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  maxHeight?: string;
  dataSheetId?: string;
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
  className = "",
  maxHeight = "88dvh",
  dataSheetId = "generic-sheet",
}: BottomSheetProps) {
  const [mounted, setMounted] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchCurrentY = useRef<number | null>(null);
  const [translateY, setTranslateY] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Save activeElement before opening
  useEffect(() => {
    if (open) {
      triggerRef.current = (document.activeElement as HTMLElement) || null;
    } else {
      setTranslateY(0);
      if (triggerRef.current && typeof triggerRef.current.focus === "function") {
        triggerRef.current.focus();
      }
    }
  }, [open]);

  // Esc key & Focus Trap
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === "Tab" && sheetRef.current) {
        const focusables = Array.from(
          sheetRef.current.querySelectorAll<HTMLElement>(
            'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);

        if (focusables.length === 0) return;

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement || !sheetRef.current.contains(document.activeElement)) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement || !sheetRef.current.contains(document.activeElement)) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Swipe-down gestures
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const currentY = e.touches[0].clientY;
    touchCurrentY.current = currentY;
    const diff = currentY - touchStartY.current;
    if (diff > 0) {
      setTranslateY(diff);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchStartY.current !== null && touchCurrentY.current !== null) {
      const diff = touchCurrentY.current - touchStartY.current;
      if (diff > 75) {
        onClose();
      } else {
        setTranslateY(0);
      }
    }
    touchStartY.current = null;
    touchCurrentY.current = null;
  }, [onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      data-sheet-open="true"
      data-sheet-id={dataSheetId}
      className="fixed inset-0 z-[120] flex flex-col justify-end pointer-events-auto"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Container */}
      <div
        ref={sheetRef}
        style={{
          maxHeight,
          transform: translateY > 0 ? `translateY(${translateY}px)` : "none",
          transition: translateY > 0 ? "none" : "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        className={`relative z-10 w-full max-w-lg mx-auto bg-[#1e293b] text-[#f8fafc] rounded-t-[16px] border-t border-x border-[#334155] shadow-2xl flex flex-col overflow-hidden will-change-transform ${className}`}
      >
        {/* Drag Handle Bar */}
        <div
          className="w-full flex flex-col items-center pt-2.5 pb-1 cursor-grab active:cursor-grabbing select-none shrink-0"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-[36px] h-[4px] rounded-full bg-slate-600/80 hover:bg-slate-500 transition-colors" />
        </div>

        {/* Sheet Header */}
        <div
          className="flex items-center justify-between px-4 py-2 border-b border-[#334155]/60 shrink-0 select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="font-bold text-[15px] text-[#f8fafc] truncate flex items-center gap-2">
            {title}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 -mr-1 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Tutup sheet"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sheet Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 overscroll-contain">
          {children}
        </div>

        {/* Optional Sticky Footer with Safe Area */}
        {footer && (
          <div className="shrink-0 p-3 bg-slate-900/90 border-t border-[#334155]/60 pb-[calc(12px+env(safe-area-inset-bottom,0px))]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
