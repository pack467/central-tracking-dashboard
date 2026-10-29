"use client";

import { useEffect } from "react";

/**
 * ClientErrorGuard
 *
 * Suppresses benign browser notifications that should never crash the dev overlay or user session:
 * - "ResizeObserver loop completed with undelivered notifications."
 * - "ResizeObserver loop limit exceeded"
 */
export function ClientErrorGuard() {
  useEffect(() => {
    const handleWindowError = (event: ErrorEvent) => {
      const msg = typeof event.message === "string" ? event.message : "";
      if (
        msg.includes("ResizeObserver loop completed with undelivered notifications") ||
        msg.includes("ResizeObserver loop limit exceeded")
      ) {
        event.stopImmediatePropagation();
        event.preventDefault();
        return true;
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const msg =
        typeof reason?.message === "string"
          ? reason.message
          : typeof reason === "string"
          ? reason
          : "";
      if (
        msg.includes("ResizeObserver loop completed with undelivered notifications") ||
        msg.includes("ResizeObserver loop limit exceeded")
      ) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    };

    window.addEventListener("error", handleWindowError, true);
    window.addEventListener("unhandledrejection", handleUnhandledRejection, true);

    return () => {
      window.removeEventListener("error", handleWindowError, true);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection, true);
    };
  }, []);

  return null;
}
