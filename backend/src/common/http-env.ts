// CORS_ORIGIN: comma-separated browser origins (e.g. the frontend) allowed to
// call the API with cookies. OriginCheckMiddleware accepts writes from them too.
export const parseOrigins = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

// TRUST_PROXY → Express 'trust proxy', needed behind a reverse proxy for the
// client IP (rate limits, session list) and for secure cookies over a proxied
// HTTPS connection. "true", a hop count ("1"), or addresses/subnets
// ("loopback", "10.0.0.0/8"). Unset or "false" = off: X-Forwarded-* headers are
// then ignored, since clients can forge them.
export function parseTrustProxy(value: string | undefined): boolean | number | string | undefined {
  const v = value?.trim();
  if (!v || v === 'false') return undefined;
  if (v === 'true') return true;
  if (/^\d+$/.test(v)) return Number(v);
  return v;
}
