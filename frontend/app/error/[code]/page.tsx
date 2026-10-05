import type { Metadata } from "next";
import { ErrorState } from "@/app/components/ErrorState";
import { getErrorContent } from "@/app/lib/error-content";

interface PageProps {
  params: Promise<{ code: string }> | { code: string };
}

export function generateStaticParams() {
  return [
    { code: "400" },
    { code: "401" },
    { code: "403" },
    { code: "404" },
    { code: "429" },
    { code: "500" },
    { code: "502" },
    { code: "503" },
    { code: "504" },
  ];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  const code = resolvedParams?.code || "500";
  const content = getErrorContent(code);

  return {
    title: `${content.code} — ${content.title} | Central Tracking Dashboard`,
    description: content.description,
  };
}

export default async function DynamicErrorPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const code = resolvedParams?.code || "500";
  const content = getErrorContent(code);

  return (
    <ErrorState
      code={content.code}
      title={content.title}
      description={content.description}
      primaryAction={content.primaryAction}
      badge={content.badge}
    />
  );
}
