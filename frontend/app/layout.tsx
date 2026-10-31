import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { AppSplash } from "@/app/components/ui/AppSplash";
import { RouteProgress } from "@/app/components/ui/RouteProgress";
import { ClientErrorGuard } from "@/app/components/ui/ClientErrorGuard";
import { QueryProvider } from "@/app/components/QueryProvider";
import "./globals.css";

/** The public https address of this site, from the build (NEXT_PUBLIC_SITE_URL). Null when none is configured or it is not https. */
function configuredSite(): URL | null {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SITE_URL || "");
    return url.protocol === "https:" ? url : null;
  } catch { return null; }
}

/**
 * Runs before anything else loads. A page opened over plain http (not localhost) on a site declared https is sent to the same path on
 * the https address; without this the browser would ask for every script and stylesheet over https and the page would load broken.
 * The only value written into the script is the origin from the build, as a JSON string.
 */
function httpsRedirectScript(site: URL): string {
  const origin = JSON.stringify(site.origin).replace(/</g, "\\u003c");
  return `(function(){var h=location.hostname;if(location.protocol==="http:"&&h!=="localhost"&&h!=="127.0.0.1"&&h!=="[::1]"){location.replace(${origin}+location.pathname+location.search+location.hash);}})();`;
}

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  // the host comes from request headers a visitor can write: only a plain host[:port] and http/https are used for the links in the metadata
  const rawHost = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "";
  const host = /^[a-z0-9.-]+(:\d{1,5})?$/i.test(rawHost) ? rawHost : "localhost:3000";
  const rawProtocol = requestHeaders.get("x-forwarded-proto");
  const protocol = rawProtocol === "http" || rawProtocol === "https" ? rawProtocol : host.startsWith("localhost") ? "http" : "https";
  const metadataBase = configuredSite() ?? new URL(`${protocol}://${host}`);
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const site = configuredSite();
  // the nonce proxy.ts made for this response: without it the browser refuses this script (production only)
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="id" className="dark [&:has([data-panel-viewer])]:overflow-hidden [&:has([data-sheet-open])]:overflow-hidden [&:has([data-memo-open])]:overflow-hidden [&:has([data-user-modal])]:overflow-hidden">
      <head>
        {site && <script nonce={nonce} dangerouslySetInnerHTML={{ __html: httpsRedirectScript(site) }} />}
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
      {/* App-wide focus. Buttons, links, tabs and checkboxes get a keyboard-only ring; text fields and textareas never get an outline, only a soft border and fill. These are descendant utilities, so they also beat a component's own outline-none. An element that draws its own indicator (a chart segment, an editor) sets data-focus-ring="none". */}
      <body className="[-webkit-tap-highlight-color:transparent] [&_:is(input:not([type=checkbox],[type=radio],[type=range],[type=file],[type=button],[type=submit],[type=reset],[type=color],[type=image],[type=hidden]),textarea):not([data-focus-ring=none]):focus]:outline-none [&_:is(input:not([type=checkbox],[type=radio],[type=range],[type=file],[type=button],[type=submit],[type=reset],[type=color],[type=image],[type=hidden]),textarea):not([data-focus-ring=none]):focus]:ring-0 [&_:is(input:not([type=checkbox],[type=radio],[type=range],[type=file],[type=button],[type=submit],[type=reset],[type=color],[type=image],[type=hidden]),textarea):not([data-focus-ring=none]):focus]:shadow-none [&_:is(input:not([type=checkbox],[type=radio],[type=range],[type=file],[type=button],[type=submit],[type=reset],[type=color],[type=image],[type=hidden]),textarea):not([data-focus-ring=none]):focus]:border-[rgba(56,189,248,0.4)] [&_:is(input:not([type=checkbox],[type=radio],[type=range],[type=file],[type=button],[type=submit],[type=reset],[type=color],[type=image],[type=hidden]),textarea):not([data-focus-ring=none]):focus]:[background-image:linear-gradient(rgba(255,255,255,0.035),rgba(255,255,255,0.035))] [&_:is(input:not([type=checkbox],[type=radio],[type=range],[type=file],[type=button],[type=submit],[type=reset],[type=color],[type=image],[type=hidden]),textarea)]:transition-[border-color,background-color] [&_:is(input:not([type=checkbox],[type=radio],[type=range],[type=file],[type=button],[type=submit],[type=reset],[type=color],[type=image],[type=hidden]),textarea)]:duration-150 motion-reduce:[&_:is(input:not([type=checkbox],[type=radio],[type=range],[type=file],[type=button],[type=submit],[type=reset],[type=color],[type=image],[type=hidden]),textarea)]:transition-none [&_button]:touch-manipulation [&_a]:touch-manipulation [&_[role=button]]:touch-manipulation [&_:is(button,a,select,[tabindex],input:is([type=checkbox],[type=radio],[type=range],[type=file],[type=button],[type=submit],[type=reset])):not([data-focus-ring=none]):focus-visible]:outline-2 [&_:is(button,a,select,[tabindex],input:is([type=checkbox],[type=radio],[type=range],[type=file],[type=button],[type=submit],[type=reset])):not([data-focus-ring=none]):focus-visible]:outline-solid [&_:is(button,a,select,[tabindex],input:is([type=checkbox],[type=radio],[type=range],[type=file],[type=button],[type=submit],[type=reset])):not([data-focus-ring=none]):focus-visible]:outline-offset-2 [&_:is(button,a,select,[tabindex],input:is([type=checkbox],[type=radio],[type=range],[type=file],[type=button],[type=submit],[type=reset])):not([data-focus-ring=none]):focus-visible]:outline-sky-400/80 max-lg:[&_:is(button,a,[role=button]):active]:bg-[#243044] max-lg:[&_:is(button,a,[role=button]):active]:scale-[0.98] max-lg:[&_:is(button,a,[role=button]):not(.fab-new-ticket)]:duration-100 motion-reduce:[&_*]:transition-none motion-reduce:[&_*]:animate-none antialiased bg-[#0f172a] text-[#f8fafc] [&:has([data-panel-viewer])]:overflow-hidden [&:has([data-sheet-open])]:overflow-hidden [&:has([data-memo-open])]:overflow-hidden [&:has([data-user-modal])]:overflow-hidden">
        <ClientErrorGuard />
        <AppSplash />
        <RouteProgress />
        <div id="app-root" className="w-full min-h-screen flex flex-col">
          <QueryProvider>{children}</QueryProvider>
        </div>
      </body>
    </html>
  );
}
