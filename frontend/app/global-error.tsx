"use client";

import { useEffect } from "react";
import { ErrorState } from "@/app/components/ErrorState";
import { errorContent } from "@/app/lib/error-content";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Central Tracking Dashboard] Global root error caught:", error);
  }, [error]);

  const content = errorContent["500"];

  return (
    <html lang="id" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased m-0 p-0 selection:bg-sky-500/20 selection:text-sky-300">
        <ErrorState
          code="500"
          title={content.title}
          description={content.description}
          primaryAction={{ label: content.primaryAction.label, isReset: true }}
          onReset={reset}
          badge="Sistem Kritis"
        />
      </body>
    </html>
  );
}
