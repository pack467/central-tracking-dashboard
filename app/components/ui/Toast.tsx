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

const ToastContext = createContext<ToastNotifier>(() => "");

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
      <div className="toast-stack" aria-live="polite" role="status">
        {toasts.map((toast) => (
          <div key={toast.renderKey ?? toast.id} className={`toast toast-item toast-${toast.tone}`}>
            <span>{toast.tone === "critical" || toast.tone === "warning" ? "!" : "✓"}</span>
            <p>{toast.message}</p>
            {toast.action && (
              <button
                className="toast-action-button"
                onClick={() => {
                  toast.action?.onClick();
                  dismiss(toast.id);
                }}
              >
                {toast.action.label}
              </button>
            )}
            <button onClick={() => dismiss(toast.id)} aria-label="Tutup notifikasi">
              ×
            </button>
            <i className="toast-progress" style={{ animationDuration: `${toast.duration}ms` }} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
