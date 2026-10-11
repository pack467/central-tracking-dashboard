import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { AppSplash } from "@/app/components/ui/AppSplash";
import { RouteProgress } from "@/app/components/ui/RouteProgress";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);
  const title = "Central Tracking Dashboard";
  const description = "Pusat komando operasional untuk monitoring NOC, ticketing, dan handover shift.";

  return {
    metadataBase,
    title: { default: title, template: "%s · Central Tracking Dashboard" },
    robots: { index: false, follow: false },
    description,
    icons: {
      icon: "/hutabyte_icon_transparent.png",
      shortcut: "/hutabyte_icon_transparent.png",
      apple: "/hutabyte_icon_transparent.png",
    },
    openGraph: {
      title,
      description,
      images: [{ url: "/og-id.png", width: 1200, height: 630, alt: "Central Tracking Dashboard — pusat komando NOC" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-id.png"],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Browser tab / address bar icon (hutabyte_icon_transparent) */}
        <link rel="icon" type="image/png" href="/hutabyte_icon_transparent.png" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="shortcut icon" href="/hutabyte_icon_transparent.png" type="image/png" />
        <link rel="apple-touch-icon" href="/hutabyte_icon_transparent.png" />
        {/* The App Router owns the document head; this keeps the existing font rendering while loading only used weights. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-[#0f172a] text-[#f8fafc]">
        <AppSplash />
        <RouteProgress />
        <div id="app-root" className="w-full min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
