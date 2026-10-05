"use client";

import { useEffect } from "react";
import { ErrorState } from "@/app/components/ErrorState";
import { errorContent } from "@/app/lib/error-content";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error secara internal/telemetri tanpa mengekspos pesan stack trace ke UI pengguna
    console.error("[Central Tracking Dashboard] Caught runtime error:", error);
  }, [error]);

  const content = errorContent["500"];

  return (
    <ErrorState
      code="500"
      title={content.title}
      description={content.description}
      primaryAction={{ label: content.primaryAction.label, isReset: true }}
      onReset={reset}
      badge={content.badge}
    />
  );
}
