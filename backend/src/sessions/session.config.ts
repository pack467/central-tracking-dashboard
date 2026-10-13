export const SESSION_COOKIE = 'ctd.sid';
// Readable by browser JS (not httpOnly) so Swagger UI can echo it in X-CSRF-Token.
export const CSRF_COOKIE = 'ctd.csrf';
export const CSRF_HEADER = 'x-csrf-token';

export const SESSION_CONFIG = Symbol('SESSION_CONFIG');

export interface SessionConfig {
  // The first signs new cookies; all of them verify, so a secret can be rotated
  // without logging everyone out.
  secrets: string[];
  // Absolute lifetime, counted from login however active the user is.
  maxAgeMs: number;
  // Logout after this long without a request; null = no idle logout.
  idleTimeoutMs: number | null;
  // HTTPS-only cookies. Behind a TLS-terminating proxy this needs TRUST_PROXY,
  // or express-session refuses to send the cookie.
  secureCookie: boolean;
}

// Attributes shared by the session cookie and the CSRF cookie (clearing a cookie
// only works with the same path/domain it was set with).
export const cookieOptions = (config: SessionConfig) => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: config.secureCookie,
  path: '/',
});

const UNIT_MS ={ ms: 1, s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;

// "30m", "12h", "7d". A unit is required, so "12" can't be misread as seconds or ms.
export function parseDuration(value: string, name: string): number {
  const match = /^(\d+)\s*(ms|s|m|h|d)$/.exec(value.trim());
  const ms = match ? Number(match[1]) * UNIT_MS[match[2] as keyof typeof UNIT_MS] : 0;
  if (!ms) throw new Error(`${name} must be a positive duration with a unit, e.g. 30m, 12h or 7d`);
  return ms;
}

// Reads the session settings from env and refuses to start on a bad value.
export function loadSessionConfig(get: (key: string) => string | undefined): SessionConfig {
  const secrets = (get('SESSION_SECRET') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!secrets.length || secrets.some((s) => s.length < 32)) {
    throw new Error('SESSION_SECRET must be set, at least 32 characters (comma-separate several to rotate)');
  }

  const maxAgeMs = parseDuration(get('SESSION_MAX_AGE') || '12h', 'SESSION_MAX_AGE');
  const idle = get('SESSION_IDLE_TIMEOUT');
  const idleTimeoutMs = idle ? parseDuration(idle, 'SESSION_IDLE_TIMEOUT') : null;
  if (idleTimeoutMs !== null && idleTimeoutMs > maxAgeMs) {
    throw new Error('SESSION_IDLE_TIMEOUT must not be longer than SESSION_MAX_AGE');
  }

  return { secrets, maxAgeMs, idleTimeoutMs, secureCookie: get('NODE_ENV') === 'production' };
}
