import { NextResponse, type NextRequest } from "next/server";
import { canonicalRoute } from "./app/lib/canonical-route";
import { loginRedirect } from "./app/lib/auth-guard";

/**
 * Optional server-side gate: with AUTH_COOKIE_GUARD=true (server env, not NEXT_PUBLIC), a request for an app page without the backend's
 * session cookie (ctd.sid) is sent to /login before any page is rendered. This only keeps anonymous visitors out of the app shell; the
 * backend still checks the session on every API call. It needs the cookie to reach this server (same host as the API, e.g. localhost
 * in development, or a shared parent domain): turn it on only then. See app/lib/auth-guard.ts for which pages are guarded.
 */
const SESSION_COOKIE = "ctd.sid";

export function proxy(request: NextRequest) {
  const target = canonicalRoute(new URL(request.url));
  if (target) return NextResponse.redirect(target.url, target.status);
  const url = request.nextUrl;
  const login = loginRedirect(url.pathname, url.search, !!request.cookies.get(SESSION_COOKIE)?.value, process.env.AUTH_COOKIE_GUARD === "true");
  return login ? NextResponse.redirect(new URL(login, request.url), 307) : NextResponse.next();
}
export const config = { matcher: ["/((?!api|_next|_vinext|.*\\..*).*)"] };
