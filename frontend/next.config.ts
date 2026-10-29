import type { NextConfig } from "next";

/**
 * Security headers for every response.
 *
 * - frame-ancestors 'none' + X-Frame-Options: nobody can put the login page (or any page) in a frame (clickjacking).
 * - Content-Security-Policy (production only: the dev server needs eval and a websocket for hot reload):
 *     scripts and styles allow 'unsafe-inline' because the framework writes inline bootstrap scripts and the UI uses inline styles; a
 *     nonce-based policy is the next step. Everything else is closed: no plugins, no other <base>, forms only post to this site, and
 *     connections only go to this site and the backend named in NEXT_PUBLIC_API_URL.
 * - HSTS, nosniff, Referrer-Policy, Permissions-Policy and COOP harden the rest.
 */
const isDev = process.env.NODE_ENV === "development";

const apiOrigin = (() => {
  try { return new URL(process.env.NEXT_PUBLIC_API_URL || "").origin; } catch { return ""; }
})();

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  `connect-src 'self'${apiOrigin ? ` ${apiOrigin}` : ""}`,
  "worker-src 'self' blob:",
  "frame-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isDev ? [] : [
    { key: "Content-Security-Policy", value: contentSecurityPolicy },
    { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
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
