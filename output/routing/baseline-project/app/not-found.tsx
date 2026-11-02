import type { Metadata } from "next";
import { ErrorState } from "@/app/components/ErrorState";
import { errorContent } from "@/app/lib/error-content";

export const metadata: Metadata = {
  title: "404 — Halaman Tidak Ditemukan | Central Tracking Dashboard",
  description: "Halaman yang Anda tuju tidak tersedia atau telah dipindahkan.",
};

export default function NotFound() {
  const content = errorContent["404"];

  return (
    <ErrorState
      code="404"
      title={content.title}
      description={content.description}
      primaryAction={content.primaryAction}
      badge={content.badge}
    />
  );
}
