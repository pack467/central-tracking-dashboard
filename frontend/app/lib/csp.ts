/**
 * The Content-Security-Policy of the pages, built per request in proxy.ts because scripts are allowed by a one-time nonce:
 * an inline script without the nonce of that very response does not run, so injected markup cannot start a script. Everything else is
 * closed as before: no plugins, no other <base>, forms post only to this site, connections go only to this site and the backend named
 * in NEXT_PUBLIC_API_URL. Styles still allow 'unsafe-inline' because the UI sets styles inline (style attributes, not scripts).
 */
export interface CspOptions {
  nonce: string;
  /** Origin of NEXT_PUBLIC_API_URL, when the API is on another origin than this site. */
  apiOrigin?: string;
  /** The build says the site is served over https: ask browsers to upgrade every request. */
  httpsSite?: boolean;
}

export function buildContentSecurityPolicy({ nonce, apiOrigin = "", httpsSite = false }: CspOptions): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
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
    ...(httpsSite ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

/** 128 random bits, base64: unguessable, and free of characters that need escaping in a header or an HTML attribute. */
export function newNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** The origin of an address from the build environment, or "" when it is empty or not a URL. */
export function originOf(value: string | undefined): string {
  try { return new URL(value || "").origin; } catch { return ""; }
}
export function isHttpsUrl(value: string | undefined): boolean {
  try { return new URL(value || "").protocol === "https:"; } catch { return false; }
}
