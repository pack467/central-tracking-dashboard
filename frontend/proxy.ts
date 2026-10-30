import { NextResponse, type NextRequest } from "next/server";
import { canonicalRoute } from "./app/lib/canonical-route";
import { loginRedirect } from "./app/lib/auth-guard";
import { buildContentSecurityPolicy, isHttpsUrl, newNonce, originOf } from "./app/lib/csp";

/**
 * Optional server-side gate: with AUTH_COOKIE_GUARD=true (server env, not NEXT_PUBLIC), a request for an app page without the backend's
 * session cookie (ctd.sid) is sent to /login before any page is rendered. This only keeps anonymous visitors out of the app shell; the
 * backend still checks the session on every API call. It needs the cookie to reach this server (same host as the API, e.g. localhost
 * in development, or a shared parent domain): turn it on only then. See app/lib/auth-guard.ts for which pages are guarded.
 */
const SESSION_COOKIE = "ctd.sid";
const isProduction = process.env.NODE_ENV === "production";

export function proxy(request: NextRequest) {
  const target = canonicalRoute(new URL(request.url));
  if (target) return NextResponse.redirect(target.url, target.status);
  const url = request.nextUrl;
  const login = loginRedirect(url.pathname, url.search, !!request.cookies.get(SESSION_COOKIE)?.value, process.env.AUTH_COOKIE_GUARD === "true");
  if (login) return NextResponse.redirect(new URL(login, request.url), 307);
  // Dev server: no CSP (it needs eval and a websocket for hot reload). Production: a policy with a nonce made for this response only.
  if (!isProduction) return NextResponse.next();
  const nonce = newNonce();
  const policy = buildContentSecurityPolicy({ nonce, apiOrigin: originOf(process.env.NEXT_PUBLIC_API_URL), httpsSite: isHttpsUrl(process.env.NEXT_PUBLIC_SITE_URL) });
  // the request copy is what the framework reads the nonce from for its own inline scripts, and what the layout reads for its own
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", policy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}
export const config = { matcher: ["/((?!api|_next|_vinext|.*\\..*).*)"] };
