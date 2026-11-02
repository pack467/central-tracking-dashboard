// A stand-in for the NestJS auth API, written from backend/src/auth/* (read only) so the frontend's real-login mode can be tested end to end.
// It lives here, not in the backend folder, and is never part of the app. Usage: node fake-backend.cjs <port> <allowed origin>[,<origin>]
// Behaviour copied from the source: POST /auth/login {identifier,password} (no other fields, 5 tries a minute per IP, 401 on bad credentials,
// 403 from a page on another origin), httpOnly SameSite=Lax cookie ctd.sid + readable cookie ctd.csrf, GET /auth/me, GET /auth/csrf,
// POST /auth/logout (needs the session and X-CSRF-Token), and a protected demo resource to check that writes need the CSRF token.
const http = require("http");
const crypto = require("crypto");
const PORT = Number(process.argv[2] || 3999);
const ALLOWED = (process.argv[3] || "http://localhost:3100").split(",");
const USERS = [
  { id: "10", name: "Dimas Yudistira", nik: "2026-8027", email: "dimas.yudistira@company.id", role: "ADMIN", password: "Passw0rd!test", is_active: true, permissions: ["tickets.read", "tickets.write", "users.read", "roles.read"] },
  { id: "11", name: "Agnes Siahaan", nik: "2026-8031", email: "agnes.siahaan@company.id", role: "AGENT", password: "Agent!pass1", is_active: true, permissions: ["tickets.read", "tickets.write"] },
  { id: "12", name: "Non Aktif", nik: "2026-8099", email: "off@company.id", role: "VIEWER", password: "Off!pass123", is_active: false, permissions: [] },
];
const sessions = new Map(); // sid -> { userId, csrf }
const tries = new Map(); // ip -> [timestamps]
const log = [];
const publicUser = u => { const { password, ...rest } = u; return rest; };
const cookiesOf = req => Object.fromEntries((req.headers.cookie || "").split(/;\s*/).filter(Boolean).map(c => { const i = c.indexOf("="); return [c.slice(0, i), decodeURIComponent(c.slice(i + 1))]; }));
function send(res, status, body, extra = {}) { res.writeHead(status, { "Content-Type": "application/json", ...extra }); res.end(body === undefined ? undefined : JSON.stringify(body)); }
const sessionOf = req => { const sid = cookiesOf(req)["ctd.sid"]; return sid && sessions.get(sid) ? { sid, ...sessions.get(sid) } : null; };

http.createServer((req, res) => {
  const origin = req.headers.origin;
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (origin && ALLOWED.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  }
  if (req.method === "OPTIONS") { res.writeHead(204, { "Access-Control-Allow-Headers": "content-type,x-csrf-token,authorization,accept", "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE" }); return res.end(); }
  // OriginCheckMiddleware: a write from a page on another origin is refused
  if (!/^(GET|HEAD|OPTIONS)$/.test(req.method) && origin !== undefined && !ALLOWED.includes(origin)) { log.push(`403 origin ${origin} ${req.method} ${url.pathname}`); return send(res, 403, { message: "Origin not allowed" }); }
  let raw = "";
  req.on("data", chunk => { raw += chunk; });
  req.on("end", () => {
    let body = {}; try { body = raw ? JSON.parse(raw) : {}; } catch { return send(res, 400, { message: "Bad JSON" }); }
    const session = sessionOf(req);
    const writes = !/^(GET|HEAD)$/.test(req.method);
    if (url.pathname === "/__log") return send(res, 200, log);
    if (url.pathname === "/__reset") { tries.clear(); return send(res, 200, { ok: true }); }
    if (url.pathname === "/auth/login" && req.method === "POST") {
      const ip = req.socket.remoteAddress || "x", now = Date.now();
      const recent = (tries.get(ip) || []).filter(t => now - t < 60_000); recent.push(now); tries.set(ip, recent);
      if (recent.length > 5) { log.push("429 login"); return send(res, 429, { message: "ThrottlerException: Too Many Requests" }); }
      const keys = Object.keys(body);
      if (typeof body.identifier !== "string" || typeof body.password !== "string" || !body.identifier || !body.password || body.password.length > 72 || keys.some(k => !["identifier", "password"].includes(k))) { log.push("400 login"); return send(res, 400, { message: ["validation failed"] }); }
      const user = USERS.find(u => (u.email.toLowerCase() === body.identifier.toLowerCase() || u.nik === body.identifier) && u.is_active && u.password === body.password);
      if (!user) { log.push("401 login"); return send(res, 401, { message: "Invalid credentials" }); }
      const sid = crypto.randomBytes(24).toString("hex"), csrf = crypto.randomBytes(24).toString("base64url");
      sessions.set(sid, { userId: user.id, csrf });
      log.push(`200 login ${user.email}`);
      return send(res, 200, { user: publicUser(user), csrf_token: csrf }, { "Set-Cookie": [`ctd.sid=${sid}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200`, `ctd.csrf=${csrf}; SameSite=Lax; Path=/; Max-Age=43200`] });
    }
    if (url.pathname.startsWith("/auth/") || url.pathname.startsWith("/tickets")) {
      if (!session) { log.push(`401 ${req.method} ${url.pathname}`); return send(res, 401, { message: "Unauthorized" }); }
      if (writes && req.headers["x-csrf-token"] !== session.csrf) { log.push(`403 csrf ${req.method} ${url.pathname}`); return send(res, 403, { message: "Invalid CSRF token" }); }
      const user = USERS.find(u => u.id === session.userId);
      if (url.pathname === "/auth/me") return send(res, 200, publicUser(user));
      if (url.pathname === "/auth/csrf") return send(res, 200, { csrf_token: session.csrf });
      if (url.pathname === "/auth/logout" && req.method === "POST") { sessions.delete(session.sid); log.push("204 logout"); return send(res, 204, undefined, { "Set-Cookie": ["ctd.sid=; Max-Age=0; Path=/; HttpOnly", "ctd.csrf=; Max-Age=0; Path=/"] }); }
      if (url.pathname === "/tickets") return send(res, 200, writes ? { created: true } : []);
    }
    send(res, 404, { message: "Not found" });
  });
}).listen(PORT, () => console.log(`fake backend on ${PORT}, allows ${ALLOWED.join(",")}`));
