/**
 * Real login against the backend (NestJS): the session lives in an httpOnly cookie (ctd.sid) that this code never sees, and every write
 * carries the session's CSRF token in X-CSRF-Token. Endpoints (backend/src/auth/auth.controller.ts):
 *   POST /auth/login   { identifier, password } -> { user, csrf_token }     (5 tries per minute per IP)
 *   GET  /auth/me      -> user with role and permissions, 401 when not logged in
 *   GET  /auth/csrf    -> { csrf_token }
 *   POST /auth/logout  -> 204 (needs X-CSRF-Token)
 */
import { getApiConfig } from "@/app/lib/config";
import type { z } from "zod";
import { authUserSchema, csrfResponseSchema, loginResponseSchema, parseResponse } from "@/app/lib/api/schemas";

export type AuthErrorKind = "invalid" | "throttled" | "forbidden" | "network" | "server" | "unavailable";

export class AuthError extends Error {
  constructor(public kind: AuthErrorKind, message: string) { super(message); this.name = "AuthError"; }
}

/** The user as the backend returns it (GET /auth/me); the shape is checked on arrival (lib/api/schemas.ts). */
export type BackendUser = z.output<typeof authUserSchema>;
/** The CSRF token from a GET /auth/csrf answer, or null when the answer is not one. */
async function csrfFrom(response: Response): Promise<string | null> {
  if (!response.ok) return null;
  const parsed = csrfResponseSchema.safeParse(await response.json().catch(() => null));
  return parsed.success ? parsed.data.csrf_token : null;
}

const base = () => getApiConfig().apiUrl.replace(/\/+$/, "");
let csrfToken: string | null = null;
export const getCsrfToken = () => csrfToken;
export const setCsrfToken = (value: string | null) => { csrfToken = value; };

/**
 * When the server last answered a request of this session with a success (here or through the API client). The session check on
 * navigation skips while this is recent, so a working app never sends extra GET /auth/me requests.
 */
let confirmedAt = 0;
export const markSessionConfirmed = () => { confirmedAt = Date.now(); };
export const sessionConfirmedAt = () => confirmedAt;

async function call(path: string, init: RequestInit = {}): Promise<Response> {
  try {
    const response = await fetch(`${base()}${path}`, {
      ...init,
      credentials: "include",
      headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...(init.headers as Record<string, string> | undefined) },
    });
    if (response.ok && path === "/auth/me") markSessionConfirmed();
    return response;
  } catch {
    throw new AuthError("network", "Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.");
  }
}

/** The same words for an unknown account and a wrong password, as the backend does: nothing says which accounts exist. */
export const BAD_CREDENTIALS = "Email/ID karyawan atau kata sandi salah.";

export async function loginRequest(identifier: string, password: string): Promise<{ user: BackendUser; csrf: string }> {
  const response = await call("/auth/login", { method: "POST", body: JSON.stringify({ identifier, password }) });
  if (response.status === 401 || response.status === 400) throw new AuthError("invalid", BAD_CREDENTIALS);
  if (response.status === 429) throw new AuthError("throttled", "Terlalu banyak percobaan. Tunggu satu menit lalu coba lagi.");
  if (response.status === 403) throw new AuthError("forbidden", "Permintaan ditolak oleh server. Muat ulang halaman lalu coba lagi.");
  if (!response.ok) throw new AuthError("server", "Server sedang bermasalah. Coba lagi nanti.");
  const parsed = loginResponseSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new AuthError("server", "Jawaban server tidak dikenali.");
  const body = parsed.data;
  // The session lives only in a cookie. If the browser did not keep it (the API on another site, cookies blocked), the person would be
  // logged in here and logged out again by the next request, over and over. Check once that the cookie comes back and say what is wrong.
  const kept = await call("/auth/me").then(check => check.ok, () => false);
  if (!kept) throw new AuthError("unavailable", "Login berhasil, tetapi browser tidak menyimpan sesinya (cookie). Hubungi administrator: alamat aplikasi dan API harus satu situs, dan cookie harus diizinkan.");
  csrfToken = body.csrf_token;
  justLoggedIn = { user: body.user, at: Date.now() };
  return { user: body.user, csrf: body.csrf_token };
}

/**
 * The login page and the app each have their own AuthProvider, so the app asked GET /auth/me and /auth/csrf again a second after the login
 * had checked both. A login this recent is taken instead, once.
 */
const JUST_LOGGED_IN_MS = 10_000;
let justLoggedIn: { user: BackendUser; at: number } | null = null;

/** The logged-in user, or null when there is no (valid) session. A network failure is also "not logged in" here. */
export async function fetchSession(): Promise<BackendUser | null> {
  const recent = justLoggedIn;
  justLoggedIn = null;
  if (recent && csrfToken && Date.now() - recent.at < JUST_LOGGED_IN_MS) return recent.user;
  try {
    const me = await call("/auth/me");
    if (!me.ok) { csrfToken = null; return null; }
    // an answer that is not a user counts as no session (the reason is written to the console)
    const user = parseResponse(authUserSchema, await me.json(), "sesi login");
    csrfToken = await csrfFrom(await call("/auth/csrf"));
    return user;
  } catch {
    csrfToken = null;
    return null;
  }
}

/**
 * Is the session still alive? A single GET /auth/me (no CSRF fetch), for the check on navigation and on returning to the tab.
 * "unknown" when the server could not be reached or failed: that is not a logout.
 */
export async function checkSession(): Promise<"valid" | "ended" | "unknown"> {
  try {
    const me = await call("/auth/me", { signal: AbortSignal.timeout(8000) });
    if (me.status === 401) { csrfToken = null; return "ended"; }
    return me.ok ? "valid" : "unknown";
  } catch { return "unknown"; }
}

/**
 * Ends the session on the server and says whether it really ended: "ended" for 204, or 401 (it already had). Anything else means the
 * session may still be alive there; the caller must not pretend the person is logged out, or the login page would find the session and log
 * them in again. "throttled" is the backend's limit of requests per address (429), worth its own words: the connection is fine.
 * A missing or stale CSRF token (403) is fetched once more and the logout retried. Every request has a time limit, so it never hangs.
 */
export async function logoutRequest(): Promise<"ended" | "throttled" | "failed"> {
  justLoggedIn = null;
  const send = () => call("/auth/logout", { method: "POST", keepalive: true, signal: AbortSignal.timeout(8000), headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {} });
  try {
    let response = await send();
    if (response.status === 403) {
      csrfToken = await csrfFrom(await call("/auth/csrf", { signal: AbortSignal.timeout(8000) }));
      if (csrfToken) response = await send();
    }
    if (response.ok || response.status === 401) { csrfToken = null; confirmedAt = 0; return "ended"; }
    return response.status === 429 ? "throttled" : "failed";
  } catch { return "failed"; }
}

/** Backend role names as people read them. */
const ROLE_LABELS: Record<string, string> = { SUPER_ADMIN: "Super Admin", ADMIN: "Admin", TEAM_LEAD: "Shift Lead", AGENT: "Operator NOC", VIEWER: "Viewer" };
export const roleLabel = (role: string | null | undefined): string => (role ? ROLE_LABELS[role] ?? role : "Tanpa peran");
