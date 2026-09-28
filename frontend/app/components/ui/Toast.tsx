"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ToastAction, ToastItem, ToastTone } from "@/app/lib/types";

export type { ToastAction };

export interface ToastOptions {
  id?: string | number;
  category?: string;
  duration?: number;
  dedupe?: boolean;
  action?: ToastAction;
}

export interface ToastNotifier {
  (message: string, tone?: ToastTone, options?: ToastOptions): string | number;
  (message: string, options?: ToastOptions): string | number;
  success: (message: string, options?: ToastOptions) => string | number;
  warning: (message: string, options?: ToastOptions) => string | number;
  critical: (message: string, options?: ToastOptions) => string | number;
  info: (message: string, options?: ToastOptions) => string | number;
  category: (category: string, message: string, tone?: ToastTone, options?: ToastOptions) => string | number;
  dismiss: (id: string | number) => void;
}

const ToastContext = createContext<ToastNotifier>(null as unknown as ToastNotifier);

export function useToast(): ToastNotifier {
  return useContext(ToastContext);
}

const TOAST_DURATION = 3400;
const MAX_STACK = 4;

interface RenderableToastItem extends ToastItem {
  duration: number;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<RenderableToastItem[]>([]);
  const counter = useRef(0);
  const timers = useRef<Map<string | number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string | number) => {
    const existingTimer = timers.current.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
      timers.current.delete(id);
    }
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (message: string, toneOrOptions?: ToastTone | ToastOptions, maybeOptions?: ToastOptions) => {
      let tone: ToastTone = "success";
      let options: ToastOptions = {};

      if (typeof toneOrOptions === "string") {
        tone = toneOrOptions;
        if (maybeOptions) {
          options = maybeOptions;
        }
      } else if (typeof toneOrOptions === "object" && toneOrOptions !== null) {
        options = toneOrOptions;
      }

      const duration = options.duration ?? (options.action ? 6500 : TOAST_DURATION);

      // Determine stable toast ID:
      let id: string | number;
      if (options.id !== undefined) {
        id = options.id;
      } else if (options.category) {
        id = `cat-${options.category}`;
      } else if (options.dedupe === false) {
        id = ++counter.current;
      } else {
        id = `msg-${message.trim().toLowerCase()}`;
      }

      // Clear existing auto-dismiss timer for this ID if already present
      const existingTimer = timers.current.get(id);
      if (existingTimer) {
        clearTimeout(existingTimer);
        timers.current.delete(id);
      }

      setToasts((previous) => {
        const newToast: RenderableToastItem = {
          id,
          message,
          tone,
          renderKey: Date.now() + Math.random(),
          action: options.action,
          duration,
        };

        const existingIndex = previous.findIndex((item) => item.id === id);
        if (existingIndex !== -1) {
          // Replace existing toast in place to prevent duplicate items and visual stacking
          const updated = [...previous];
          updated[existingIndex] = newToast;
          return updated;
        }

        // Append new toast while respecting max stack limit
        return [...previous.slice(-(MAX_STACK - 1)), newToast];
      });

      // Schedule auto-dismiss
      const timer = setTimeout(() => {
        dismiss(id);
      }, duration);
      timers.current.set(id, timer);

      return id;
    },
    [dismiss],
  );

  // Clean up all active timers on unmount
  useEffect(() => {
    const currentTimers = timers.current;
    return () => {
      currentTimers.forEach((timer) => clearTimeout(timer));
      currentTimers.clear();
    };
  }, []);

  const notifier = useMemo<ToastNotifier>(() => {
    const fn = ((message: string, toneOrOptions?: ToastTone | ToastOptions, maybeOptions?: ToastOptions) => {
      return push(message, toneOrOptions, maybeOptions);
    }) as ToastNotifier;

    fn.success = (message: string, options?: ToastOptions) => push(message, "success", options);
    fn.warning = (message: string, options?: ToastOptions) => push(message, "warning", options);
    fn.critical = (message: string, options?: ToastOptions) => push(message, "critical", options);
    fn.info = (message: string, options?: ToastOptions) => push(message, "info", options);
    fn.category = (category: string, message: string, tone: ToastTone = "info", options?: ToastOptions) =>
      push(message, tone, { ...options, category });
    fn.dismiss = (id: string | number) => dismiss(id);

    return fn;
  }, [push, dismiss]);

  return (
    <ToastContext.Provider value={notifier}>
      {children}
      <div
        className="toast-stack [position:fixed] [right:20px] [bottom:20px] [z-index:60] [display:flex] [flex-direction:column] [gap:8px] [pointer-events:none]"
        aria-live="polite"
        role="status"
      >
        {toasts.map((toast) => (
          <div
            key={toast.renderKey ?? toast.id}
            className={`toast toast-item toast-${toast.tone} [pointer-events:auto] [position:relative] [overflow:hidden] [display:flex] [align-items:center] [gap:10px] [padding:10px_14px] [color:var(--ink-primary)] [border:1px_solid_var(--panel-border)] [border-radius:9px] [background:var(--panel-bg)] [box-shadow:0_10px_30px_-5px_rgba(0,_0,_0,_0.25),_0_4px_6px_-2px_rgba(0,_0,_0,_0.1)] [font-size:12px] [min-width:270px] [max-width:min(360px,_calc(100vw_-_40px))] [animation:toastIn_0.22s_cubic-bezier(0.16,_1,_0.3,_1)]`}
          >
            <span
              className={`[display:grid] [place-items:center] [width:20px] [height:20px] [color:#ffffff] [border-radius:99px] [font-weight:800] [font-size:11px] [flex-shrink:0] ${
                toast.tone === "warning"
                  ? "[background:var(--orange)]"
                  : toast.tone === "critical"
                    ? "[background:var(--red)]"
                    : toast.tone === "info"
                      ? "[background:var(--accent-blue)]"
                      : "[background:var(--green)]"
              }`}
            >
              {toast.tone === "critical" || toast.tone === "warning" ? "!" : "✓"}
            </span>
            <p className="[margin:0] [flex:1] [line-height:1.35] [color:var(--ink-primary)] [font-weight:500]">
              {toast.message}
            </p>
            {toast.action && (
              <button
                className="toast-action-button [display:grid] [place-items:center] [width:18px] [height:18px] [color:var(--ink-muted)] [border-radius:5px] [font-size:14px]! [line-height:1] [flex-shrink:0] [padding:4px_10px] [font-weight:700] [background:var(--accent-blue-soft)]! [border:1px_solid_var(--accent-blue-border)]! [cursor:pointer] [transition:all_0.15s_ease] [user-select:none] [&:hover]:[background:var(--panel-bg-hover)]! [&:hover]:[border-color:var(--accent-blue)]!"
                onClick={() => {
                  toast.action?.onClick();
                  dismiss(toast.id);
                }}
              >
                {toast.action.label}
              </button>
            )}
            <button
              className="[display:grid] [place-items:center] [width:20px] [height:20px] [border-radius:4px] [background:transparent]! [color:var(--ink-muted)] [font-size:16px]! [line-height:1] [flex-shrink:0] [cursor:pointer] [transition:color_0.15s_ease] [&:hover]:[background:var(--bg)]!"
              onClick={() => dismiss(toast.id)}
              aria-label="Tutup notifikasi"
            >
              ×
            </button>
            <i
              className={`toast-progress [position:absolute] [bottom:0] [left:0] [height:3px] [border-radius:99px] [animation-name:toastCountdown] [animation-timing-function:linear] [animation-fill-mode:forwards] ${
                toast.tone === "warning"
                  ? "[background:var(--orange)]"
                  : toast.tone === "critical"
                    ? "[background:var(--red)]"
                    : toast.tone === "info"
                      ? "[background:var(--accent-blue)]"
                      : "[background:var(--green)]"
              }`}
              style={{ animationDuration: `${toast.duration}ms` }}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
