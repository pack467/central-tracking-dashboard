import type { Metadata } from "next";
import { ErrorState } from "@/app/components/ErrorState";
import { getErrorContent } from "@/app/lib/error-content";

export const metadata: Metadata = {
  title: "Error | Central Tracking Dashboard",
  description: "Terjadi kesalahan pada sistem.",
};

export default function ErrorIndexPage() {
  const content = getErrorContent("500");

  return (
    <ErrorState
      code="500"
      title={content.title}
      description={content.description}
      primaryAction={content.primaryAction}
      badge={content.badge}
    />
  );
}
