import type { HandoverActor } from "./types";
import { HandoverError } from "./handover";
import { apiModuleEnabled, getApiConfig } from "./config";
import { authUserSchema } from "./api/schemas";

/**
 * Who is calling the handover API, and from where. Kept free of the database import so it can be tested on its own.
 *
 * With the backend login (auth module on), the caller is whoever the backend session says: the browser sends the session cookie (ctd.sid)
 * to this site too (same host in development, one address with /api in production), and it is checked with GET /auth/me on the backend.
 * There is then no built-in operator and no header to trust: no valid session, no handover.
 *
 * Without the backend login, nothing here is decided by a header a visitor can type:
 *  - Identity headers (oai-authenticated-user-*) are only believed when HANDOVER_TRUST_OAI_HEADERS=true, i.e. when a trusted proxy in front
 *    of this app sets them and strips any copy sent by the client. Otherwise anyone could write them.
 *  - The built-in "local operator" exists only in development, or when a demo deliberately sets HANDOVER_SIMULATED_ACTOR=true. It is no
 *    longer chosen by looking at the Host header (a visitor can send "Host: localhost" or a hostname containing "ngrok").
 *  - A write must come from this site: Origin is compared exactly, and a browser request that says it is cross-site is refused.
 */
const flag = (name: string) => process.env[name] === "true";
const isDev = () => process.env.NODE_ENV === "development";

export function handoverActor(request: Request): HandoverActor {
  if (flag("HANDOVER_TRUST_OAI_HEADERS")) {
    const id = request.headers.get("oai-authenticated-user-id");
    const email = request.headers.get("oai-authenticated-user-email");
    if (id && email) {
      let name = email;
      if (request.headers.get("oai-authenticated-user-full-name-encoding") === "percent-encoded-utf-8") {
        try { name = decodeURIComponent(request.headers.get("oai-authenticated-user-full-name") || email); } catch { /* use email */ }
      }
      return { id, email: email.toLowerCase(), name };
    }
  }
  if (isDev() || flag("HANDOVER_SIMULATED_ACTOR"))
    return { id: "local-operator", name: "Mhd. Galih Khairi", email: "galih.khairi@company.internal", local: true };
  throw new HandoverError("Masuk dengan akun Anda untuk mengakses handover.", 401);
}

const SESSION_COOKIE = "ctd.sid";
/**
 * A session the backend confirmed a moment ago is believed for this long without asking again, so a busy Handover page does not send
 * GET /auth/me for every request. The cost: a session ended elsewhere still works here for up to this long.
 */
const SESSION_CACHE_MS = 15_000;
const SESSION_CACHE_MAX = 500;
const confirmed = new Map<string, { at: number; actor: HandoverActor }>();

function sessionCookie(header: string | null): string | null {
  for (const part of (header ?? "").split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === SESSION_COOKIE && value.length) return value.join("=");
  }
  return null;
}
/** Where this server reaches the backend: HANDOVER_BACKEND_URL (an internal address), else the one the browser uses. */
const backendUrl = () => (process.env.HANDOVER_BACKEND_URL?.trim() || getApiConfig().apiUrl).replace(/\/+$/, "");

/** The handover caller: the backend session's user when the backend login is on, otherwise handoverActor() above. */
export async function requestActor(request: Request, fetcher: typeof fetch = fetch): Promise<HandoverActor> {
  if (!apiModuleEnabled("auth")) return handoverActor(request);
  const sid = sessionCookie(request.headers.get("cookie"));
  if (!sid) throw new HandoverError("Sesi login tidak ditemukan. Masuk kembali untuk mengakses handover.", 401);
  const known = confirmed.get(sid);
  if (known && Date.now() - known.at < SESSION_CACHE_MS) return known.actor;
  confirmed.delete(sid);
  let response: Response;
  try {
    // only the session cookie goes to the backend, nothing else this site may have set
    response = await fetcher(`${backendUrl()}/auth/me`, { headers: { Accept: "application/json", Cookie: `${SESSION_COOKIE}=${sid}` }, cache: "no-store", signal: AbortSignal.timeout(8000) });
  } catch {
    throw new HandoverError("Server login tidak dapat dihubungi. Coba lagi sebentar lagi.", 503);
  }
  if (response.status === 401) throw new HandoverError("Sesi login sudah berakhir. Masuk kembali untuk mengakses handover.", 401);
  if (!response.ok) throw new HandoverError("Server login sedang bermasalah. Coba lagi sebentar lagi.", 503);
  const parsed = authUserSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new HandoverError("Jawaban server login tidak dikenali.", 503);
  const user = parsed.data;
  const email = user.email?.trim().toLowerCase() ?? "";
  const actor: HandoverActor = { id: user.id, name: user.name?.trim() || email || "Pengguna", email };
  if (confirmed.size >= SESSION_CACHE_MAX) confirmed.delete(confirmed.keys().next().value!);
  confirmed.set(sid, { at: Date.now(), actor });
  return actor;
}

/** Origins that may write: this request's own origin, the ones listed in HANDOVER_ALLOWED_ORIGINS, and (behind a proxy) the forwarded host. */
function allowedOrigins(request: Request): Set<string> {
  const requestUrl = new URL(request.url);
  const allowed = new Set<string>([requestUrl.origin]);
  const host = request.headers.get("host");
  if (host) allowed.add(`${requestUrl.protocol}//${host}`);
  for (const origin of (process.env.HANDOVER_ALLOWED_ORIGINS || "").split(",").map(value => value.trim()).filter(Boolean)) allowed.add(origin);
  // a reverse proxy changes host and protocol; only believe its headers when told to
  if (flag("TRUST_FORWARDED_HEADERS")) {
    const forwardedHost = request.headers.get("x-forwarded-host");
    if (forwardedHost) allowed.add(`${request.headers.get("x-forwarded-proto") || requestUrl.protocol.replace(":", "")}://${forwardedHost}`);
  }
  return allowed;
}

export function assertSameOrigin(request: Request) {
  const refuse = () => { throw new HandoverError("Asal permintaan tidak diizinkan.", 403); };
  const site = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");
  // browsers say where a request comes from: a page on another site cannot pose as this one
  if (site && site !== "same-origin" && site !== "none") refuse();
  if (origin) {
    if (origin !== "null" && allowedOrigins(request).has(origin)) return;
    if (isDev()) return; // tunnels and LAN addresses while developing
    refuse();
  }
  // no Origin and no Sec-Fetch-Site: not a browser page (curl, a script), which carries no ambient credentials to abuse
}
