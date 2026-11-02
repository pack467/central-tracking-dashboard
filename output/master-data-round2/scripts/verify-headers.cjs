// Security headers on a production build (vinext start on 3100): present, no CSP violation on any page, framing refused.
const { launch, open } = require("./pw.cjs");
const BASE = process.env.HDR_BASE || "http://localhost:3100";
const ok = (c, l, e = "") => { console.log(`${c ? "PASS" : "FAIL"}  ${l}${e ? "  " + e : ""}`); if (!c) process.exitCode = 1; };
const PAGES = ["/login", "/team", "/dashboard", "/dashboard?panel=category-distribution", "/tickets", "/monitoring", "/shift-log", "/reports", "/reports/ticket-log", "/reports/pdf-preview", "/team-roster", "/notifications", "/profile", "/master-data?group=tickets&tab=categories", "/master-data?group=team&tab=people"];
(async () => {
  const browser = await launch();
  // headers
  const res = await fetch(`${BASE}/login`);
  const h = n => res.headers.get(n) || "";
  const csp = h("content-security-policy");
  ok(/frame-ancestors 'none'/.test(csp) && h("x-frame-options") === "DENY", "framing refused (frame-ancestors 'none' + X-Frame-Options: DENY)");
  ok(/default-src 'self'/.test(csp) && /object-src 'none'/.test(csp) && /base-uri 'self'/.test(csp) && /form-action 'self'/.test(csp), "CSP closes default-src, object-src, base-uri and form-action");
  ok(/connect-src 'self'(?!.*\*)/.test(csp), "connections only to this site (and the configured API)", (csp.match(/connect-src[^;]*/) || [""])[0]);
  ok(h("x-content-type-options") === "nosniff" && /strict-origin/.test(h("referrer-policy")) && /camera=\(\)/.test(h("permissions-policy")) && (process.env.HDR_HTTPS === "1" ? /max-age=\d{7,}/.test(h("strict-transport-security")) : !h("strict-transport-security")) && h("cross-origin-opener-policy") === "same-origin", "nosniff, Referrer-Policy, Permissions-Policy, HSTS and COOP are set");
  // even an error page carries them (the handover API itself needs Cloudflare D1, which a plain `vinext start` does not have)
  const missing = await fetch(`${BASE}/no-such-page`);
  ok(missing.status === 404 && !!missing.headers.get("x-frame-options") && /frame-ancestors/.test(missing.headers.get("content-security-policy") || ""), "error pages carry the headers too");

  // a page in another site cannot frame the app
  const framer = await open(browser, { width: 900, height: 600, noAuth: true });
  const frameErrors = [];
  framer.on("console", m => { if (/frame|X-Frame|Refused/i.test(m.text())) frameErrors.push(m.text().slice(0, 140)); });
  await framer.route("http://framer.test/", route => route.fulfill({ contentType: "text/html", body: `<iframe id="f" src="${BASE}/login" width="800" height="500"></iframe>` }));
  await framer.goto("http://framer.test/"); await framer.waitForTimeout(2000);
  const framed = framer.frames().find(f => f.url().startsWith(BASE));
  const framedText = framed ? await framed.evaluate(() => document.body?.innerText || "").catch(() => "") : "";
  ok(!framedText.includes("Selamat datang") && !framedText.includes("Kata sandi"), "the login page does not render inside another site's iframe", frameErrors[0] || "blocked");
  await framer.context().close();

  // no violations on any page
  const page = await open(browser, { width: 1440, height: 900 });
  page.setDefaultTimeout(12000);
  await page.addInitScript(() => { window.__csp = []; document.addEventListener("securitypolicyviolation", e => window.__csp.push(`${e.violatedDirective} blocked ${e.blockedURI || "inline"}`)); });
  const consoleCsp = [];
  page.on("console", m => { if (/Content Security Policy|Refused to/i.test(m.text())) consoleCsp.push(m.text().slice(0, 200)); });
  let total = 0;
  for (const path of PAGES) {
    await page.goto(`${BASE}${path}`, { waitUntil: "load" }).catch(() => {});
    await page.waitForTimeout(1800);
    const v = await page.evaluate(() => window.__csp || []);
    total += v.length;
    if (v.length) ok(false, `CSP violations on ${path}`, JSON.stringify([...new Set(v)].slice(0, 4)));
  }
  ok(total === 0 && consoleCsp.length === 0, `no CSP violation on ${PAGES.length} pages`, consoleCsp[0] || "");
  // fonts from Google, the pdf worker and blob previews are the things most likely to be blocked: check they work
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" }); await page.waitForTimeout(1500);
  const fonts = await page.evaluate(() => [...document.fonts].filter(f => f.status === "loaded").map(f => f.family));
  ok(fonts.length > 0, "web fonts still load under the policy", [...new Set(fonts)].join(", ").slice(0, 80));
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.replace(/\s+/g, " ").slice(0, 300)); process.exitCode = 1; });
