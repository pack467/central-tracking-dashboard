"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  label?: string;
  width?: number | string;
  variant?: "centered" | "wide" | "form" | "master-form" | "master-drawer";
  viewport?: { height: number; top: number };
  children: React.ReactNode;
}

export function Modal({ open, onClose, label, width, variant = "centered", viewport, children }: ModalProps) {
  const modalRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    // Save triggering element before modal takes focus
    triggerRef.current = (document.activeElement as HTMLElement) || null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const inertSiblings = variant === "master-form" || variant === "master-drawer"
      ? [...document.body.children].filter((element): element is HTMLElement => element instanceof HTMLElement && !element.contains(modalRef.current)).map(element => ({ element, wasInert: element.inert }))
      : [];
    inertSiblings.forEach(({ element }) => { element.inert = true; });

    // Auto-focus first focusable element inside modal if not already focused
    const timer = setTimeout(() => {
      if (!modalRef.current) return;
      const focusables = [...modalRef.current.querySelectorAll<HTMLElement>(
        'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      )].filter((element) => element.offsetParent !== null || element.getClientRects().length > 0);
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        modalRef.current.focus();
      }
    }, 50);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key === "Tab" && modalRef.current) {
        const focusables = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(
            'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);

        if (focusables.length === 0) return;

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement || !modalRef.current.contains(document.activeElement)) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement || !modalRef.current.contains(document.activeElement)) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      inertSiblings.forEach(({ element, wasInert }) => { element.inert = wasInert; });
      window.removeEventListener("keydown", handleKeyDown);
      triggerRef.current?.focus?.();
    };
  }, [open, variant]);

  if (!open) return null;

  const master = variant === "master-form" || variant === "master-drawer";
  const className = variant === "master-drawer"
    ? "flex h-full max-h-full w-full flex-col overflow-hidden bg-slate-900 text-slate-100 shadow-2xl lg:w-[560px] lg:border-l lg:border-slate-700 motion-safe:lg:transition-[opacity,transform] lg:duration-[180ms] lg:ease-out lg:starting:translate-x-6 lg:starting:opacity-0"
    : variant === "master-form"
    ? "flex h-full max-h-full w-full flex-col overflow-hidden bg-slate-900 text-slate-100 shadow-2xl lg:h-auto lg:max-h-[calc(100dvh-32px)] lg:w-[760px] lg:rounded-2xl lg:border lg:border-slate-700 motion-safe:lg:transition-[opacity,transform] lg:duration-[180ms] lg:ease-out lg:starting:scale-[0.98] lg:starting:opacity-0"
    : variant === "wide" || variant === "form"
      ? "flex flex-col w-[min(900px,calc(100vw-32px))] max-h-[calc(100vh-32px)] max-[660px]:w-full max-[660px]:max-h-[calc(100vh-20px)] max-[660px]:rounded-[11px] overflow-hidden text-[var(--ink-primary)] border border-[var(--panel-border)] rounded-[14px] bg-[var(--modal-bg)] shadow-[var(--shadow-elevated)] [&_button:disabled]:opacity-50 [&_button:disabled]:cursor-not-allowed"
      : "ticket-modal";
  const ticketModalTailwindClass =
    variant === "centered"
      ? "[width:min(600px,_calc(100vw_-_32px))] [overflow:hidden] [border:1px_solid_var(--panel-border)] [border-radius:14px] [background:var(--modal-bg)] [box-shadow:var(--shadow-elevated)] [color:var(--ink-primary)] [padding:22px_24px]"
      : "";

  const content = (
    <div
      className={master ? variant === "master-drawer" ? "fixed inset-0 z-[100] grid justify-items-end bg-black/65 backdrop-blur-sm motion-safe:transition-opacity duration-[180ms] starting:opacity-0" : "fixed inset-0 z-[100] grid place-items-center bg-black/65 backdrop-blur-sm motion-safe:transition-opacity duration-[180ms] starting:opacity-0 lg:p-4" : "fixed inset-0 z-[100] grid place-items-center bg-[var(--modal-backdrop)] backdrop-blur-[4px] p-[16px] box-border anim-fade"}
      style={viewport ? { height: viewport.height, top: viewport.top } : undefined}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={modalRef}
        className={master ? className : `${className} modal-pop ${ticketModalTailwindClass}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
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
  return master && typeof document !== "undefined" ? createPortal(content, document.body) : content;
}

