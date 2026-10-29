/**
 * Real login against the backend (NestJS): the session lives in an httpOnly cookie (ctd.sid) that this code never sees, and every write
 * carries the session's CSRF token in X-CSRF-Token. Endpoints (backend/src/auth/auth.controller.ts):
 *   POST /auth/login   { identifier, password } -> { user, csrf_token }     (5 tries per minute per IP)
 *   GET  /auth/me      -> user with role and permissions, 401 when not logged in
 *   GET  /auth/csrf    -> { csrf_token }
 *   POST /auth/logout  -> 204 (needs X-CSRF-Token)
 */
import { getApiConfig } from "@/app/lib/config";

export type AuthErrorKind = "invalid" | "throttled" | "forbidden" | "network" | "server" | "unavailable";

export class AuthError extends Error {
  constructor(public kind: AuthErrorKind, message: string) { super(message); this.name = "AuthError"; }
}

/** The user as the backend returns it (GET /auth/me). */
export interface BackendUser {
  id: string;
  name: string | null;
  nik: string | null;
  email: string | null;
  role: string | null;
  permissions: string[];
  is_active?: boolean;
  photo_url?: string | null;
}

const base = () => getApiConfig().apiUrl.replace(/\/+$/, "");
let csrfToken: string | null = null;
export const getCsrfToken = () => csrfToken;
export const setCsrfToken = (value: string | null) => { csrfToken = value; };

async function call(path: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(`${base()}${path}`, {
      ...init,
      credentials: "include",
      headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...(init.headers as Record<string, string> | undefined) },
    });
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
  const body = await response.json().catch(() => null) as { user?: BackendUser; csrf_token?: string } | null;
  if (!body?.user || typeof body.csrf_token !== "string") throw new AuthError("server", "Jawaban server tidak dikenali.");
  csrfToken = body.csrf_token;
  return { user: body.user, csrf: body.csrf_token };
}

/** The logged-in user, or null when there is no (valid) session. A network failure is also "not logged in" here. */
export async function fetchSession(): Promise<BackendUser | null> {
  try {
    const me = await call("/auth/me");
    if (!me.ok) { csrfToken = null; return null; }
    const user = await me.json() as BackendUser;
    const csrf = await call("/auth/csrf");
    csrfToken = csrf.ok ? ((await csrf.json()) as { csrf_token?: string }).csrf_token ?? null : null;
    return user;
  } catch {
    csrfToken = null;
    return null;
  }
}

export async function logoutRequest(): Promise<void> {
  try {
    await call("/auth/logout", { method: "POST", keepalive: true, headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {} });
  } catch { /* the cookie is cleared by the server; locally the user is gone either way */ }
  csrfToken = null;
}

/** Backend role names as people read them. */
const ROLE_LABELS: Record<string, string> = { SUPER_ADMIN: "Super Admin", ADMIN: "Admin", TEAM_LEAD: "Shift Lead", AGENT: "Operator NOC", VIEWER: "Viewer" };
export const roleLabel = (role: string | null | undefined): string => (role ? ROLE_LABELS[role] ?? role : "Tanpa peran");
