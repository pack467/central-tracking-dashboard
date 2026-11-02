// Test-only reverse proxy: one origin (3100) for the built frontend (3101) and the real backend (3001) under /__api.
// The backend only allows the origins in its CORS_ORIGIN (3000/3001), so the Origin header of /__api calls is rewritten to the first of them.
const http = require("http");
const APP = 3101, API = 3001, ALLOWED_ORIGIN = "http://localhost:3000";
http.createServer((req, res) => {
  const isApi = req.url.startsWith("/__api/");
  const headers = { ...req.headers };
  if (isApi && headers.origin) headers.origin = ALLOWED_ORIGIN;
  const upstream = http.request({ host: "localhost", port: isApi ? API : APP, path: isApi ? req.url.slice("/__api".length) : req.url, method: req.method, headers }, up => { res.writeHead(up.statusCode, up.headers); up.pipe(res); });
  upstream.on("error", e => { res.writeHead(502); res.end(String(e.message)); });
  req.pipe(upstream);
}).listen(3100, () => console.log("proxy on 3100 -> app 3101, api 3001"));
