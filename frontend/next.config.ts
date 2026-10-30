import type { NextConfig } from "next";

/**
 * Security headers for every response.
 *
 * - frame-ancestors 'none' + X-Frame-Options: nobody can put the login page (or any page) in a frame (clickjacking).
 * - Content-Security-Policy is not here: it carries a nonce that changes with every response, so proxy.ts builds it per request
 *   (app/lib/csp.ts), in production only (the dev server needs eval and a websocket for hot reload).
 * - HSTS, nosniff, Referrer-Policy, Permissions-Policy and COOP harden the rest.
 * - HSTS and the CSP's 'upgrade-insecure-requests' are sent only when the build says the site is served over https (NEXT_PUBLIC_SITE_URL=https://...).
 *   Sent for a site opened over plain http (a LAN address, an internal test server) they make the browser ask for every script and
 *   stylesheet over https, which fails, and the page loads without any of them. An http visit to a site declared https is sent to the
 *   https address by a small inline script in the layout.
 */
const isDev = process.env.NODE_ENV === "development";
const httpsSite = (() => {
  try { return new URL(process.env.NEXT_PUBLIC_SITE_URL || "").protocol === "https:"; } catch { return false; }
})();

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isDev ? [] : [
    ...(httpsSite ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
  ]),
];

const nextConfig: NextConfig = {
  trailingSlash: false,
  skipTrailingSlashRedirect: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
