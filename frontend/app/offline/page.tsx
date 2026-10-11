"use client";

import { useSyncExternalStore, useEffect } from "react";
import { ErrorState } from "@/app/components/ErrorState";
import { errorContent } from "@/app/lib/error-content";
import { paths } from "@/app/lib/routes";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

export default function OfflinePage() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const content = errorContent["offline"];

  useEffect(() => {
    if (isOnline) {
      // Jika jaringan pulih, arahkan kembali ke dashboard secara otomatis setelah jeda singkat
      const timer = setTimeout(() => {
        window.location.href = paths.dashboard;
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  const handleRetry = () => {
    if (typeof window !== "undefined") {
      if (navigator.onLine) {
        window.location.href = paths.dashboard;
      } else {
        window.location.reload();
      }
    }
  };

  const badgeText = isOnline
    ? "Jaringan Pulih — Menghubungkan..."
    : "Koneksi Terputus";

  return (
    <ErrorState
      code="offline"
      title={content.title}
      description={content.description}
      primaryAction={{ label: content.primaryAction.label, isReset: true }}
      onReset={handleRetry}
      badge={badgeText}
    />
  );
}
