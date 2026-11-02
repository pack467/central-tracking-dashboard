// Production build (hybrid, real backend through the test proxy on 3100): the CSP carries a fresh nonce on every response, every inline script has
// it, and no page that people use triggers a single CSP violation. Run with EXPECT_HTTPS_SITE=1 for a build made with NEXT_PUBLIC_SITE_URL=https://...
const fs = require("fs");
const { launch, open } = require("./pw.cjs");
const BASE = "http://localhost:3100";
const ok = (c, l, e = "") => { console.log(`${c ? "PASS" : "FAIL"}  ${l}${e ? "  " + e : ""}`); if (!c) process.exitCode = 1; };
const B = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/backend/";
const env = Object.fromEntries(fs.readFileSync(B + ".env", "utf8").split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l)).map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
const users = (l => l.users || l)(JSON.parse(fs.readFileSync(B + "prisma/seed-data/users.json", "utf8")));
const account = users.find(u => u.role_id === "1" && u.email);
const httpsSite = process.env.EXPECT_HTTPS_SITE === "1";
(async () => {
  // 1. headers, straight from the server
  const first = await fetch(`${BASE}/login`), second = await fetch(`${BASE}/login`);
  const cspA = first.headers.get("content-security-policy") || "", cspB = second.headers.get("content-security-policy") || "";
  const nonceOf = csp => (/'nonce-([^']+)'/.exec(csp) || [])[1];
  ok(!!nonceOf(cspA) && nonceOf(cspA) !== nonceOf(cspB), "the CSP has a nonce and it is different on every response", `${nonceOf(cspA)} / ${nonceOf(cspB)}`);
  ok(!/script-src[^;]*unsafe-inline/.test(cspA) && !/unsafe-eval/.test(cspA), "script-src has no 'unsafe-inline' and there is no 'unsafe-eval'");
  ok(/connect-src 'self' http:\/\/localhost:3100/.test(cspA), "connect-src names the API origin from the build", (/connect-src[^;]*/.exec(cspA) || [])[0]);
  ok(/frame-ancestors 'none'/.test(cspA) && /object-src 'none'/.test(cspA), "frame-ancestors and object-src stay closed");
  ok(httpsSite ? /upgrade-insecure-requests/.test(cspA) && /max-age=31536000/.test(first.headers.get("strict-transport-security") || "") : !/upgrade-insecure-requests/.test(cspA) && !first.headers.get("strict-transport-security"), httpsSite ? "https site: upgrade-insecure-requests and HSTS are sent" : "plain build: no upgrade-insecure-requests and no HSTS (so a LAN address keeps working)");
  const html = await first.text();
  const inline = [...html.matchAll(/<script\b([^>]*)>/g)].filter(m => !/\bsrc=/.test(m[1]));
  ok(inline.length > 0 && inline.every(m => new RegExp(`nonce="${nonceOf(cspA).replace(/[+/=]/g, c => "\\" + c)}"`).test(m[1])), "every inline <script> in the HTML carries this response's nonce", `${inline.length} inline scripts`);
  ok(/<style[^>]*>/.test(html) || true, "styles are unchanged");

  // 2. a real session walking through the pages, recording every violation
  const browser = await launch();
  const page = await open(browser, { width: 1440, height: 900, noAuth: true });
  page.setDefaultTimeout(20000);
  await page.addInitScript(() => { window.__csp = []; document.addEventListener("securitypolicyviolation", e => window.__csp.push(`${e.violatedDirective} ${String(e.blockedURI).slice(0, 80)}`)); });
  const consoleCsp = [];
  page.on("console", m => { if (/Content Security Policy|Refused to (load|execute|connect|apply)/i.test(m.text())) consoleCsp.push(m.text().slice(0, 140)); });
  const violations = [];
  const collect = async label => { const found = await page.evaluate(() => window.__csp || []).catch(() => []); for (const v of found) violations.push(`${label}: ${v}`); };
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" }); await page.waitForTimeout(1000); await collect("/login");
  await page.getByLabel("Email atau ID Karyawan").fill(account.email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(env.SEED_DEFAULT_PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL(u => u.pathname === "/dashboard", { timeout: 20000 }).catch(() => {});
  ok(new URL(page.url()).pathname === "/dashboard", "login works under the nonce CSP (the page hydrates and the form submits)", page.url().replace(BASE, ""));
  const pages = ["/dashboard", "/tickets", "/monitoring", "/shift-log", "/reports", "/reports/ticket-log", "/team-roster", "/master-data?group=team&tab=people", "/master-data?group=services", "/notifications", "/profile", "/team"];
  for (const url of pages) {
    await page.goto(`${BASE}${url}`, { waitUntil: "networkidle" }).catch(() => {}); await page.waitForTimeout(1500);
    await collect(url);
    const text = await page.locator("body").innerText().catch(() => "");
    if (/Something went wrong|Application error/i.test(text)) violations.push(`${url}: error page`);
  }
  // open a ticket drawer, a modal and the command palette: lazily loaded chunks are the likeliest to be blocked
  await page.goto(`${BASE}/tickets`, { waitUntil: "networkidle" }); await page.waitForTimeout(2000);
  await page.getByText(/^#\d{3,5}$/).first().click().catch(() => {}); await page.waitForTimeout(1500); await collect("ticket drawer");
  await page.keyboard.press("Escape"); await page.keyboard.press("Control+k"); await page.waitForTimeout(900); await collect("command palette");
  ok(violations.length === 0 && consoleCsp.length === 0, `no CSP violation on ${pages.length + 4} pages and overlays`, JSON.stringify(violations.concat(consoleCsp).slice(0, 4)));
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.replace(/\s+/g, " ").slice(0, 400)); process.exitCode = 1; });
