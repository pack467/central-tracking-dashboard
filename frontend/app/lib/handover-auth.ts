import type { HandoverActor } from "./types";
import { HandoverError } from "./handover";

/**
 * Who is calling the handover API, and from where. Kept free of the database import so it can be tested on its own.
 *
 * Nothing here is decided by a header a visitor can type:
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
