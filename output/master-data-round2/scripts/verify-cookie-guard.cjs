// Real backend through the test proxy: if the browser does not keep the session cookie, login says so instead of logging in and out again.
const fs = require("fs");
const { launch, open } = require("./pw.cjs");
const BASE = "http://localhost:3100";
const ok = (c, l, e = "") => { console.log(`${c ? "PASS" : "FAIL"}  ${l}${e ? "  " + e : ""}`); if (!c) process.exitCode = 1; };
const B = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/backend/";
const env = Object.fromEntries(fs.readFileSync(B + ".env", "utf8").split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l)).map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
const users = (l => l.users || l)(JSON.parse(fs.readFileSync(B + "prisma/seed-data/users.json", "utf8")));
const account = users.find(u => u.role_id === "1" && u.email);
(async () => {
  const browser = await launch();
  const page = await open(browser, { width: 1440, height: 900, noAuth: true });
  page.setDefaultTimeout(12000);
  // the login answer arrives without its Set-Cookie: what a browser that drops the cookie would see
  await page.route("**/__api/auth/login", async route => {
    const response = await route.fetch();
    const headers = { ...response.headers() }; delete headers["set-cookie"];
    // route.fetch stores Set-Cookie in the browser context itself: remove it there too, so the browser really never gets the cookie
    await page.context().clearCookies();
    await route.fulfill({ response, headers });
  });
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" }); await page.waitForTimeout(900);
  await page.getByLabel("Email atau ID Karyawan").fill(account.email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(env.SEED_DEFAULT_PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click(); await page.waitForTimeout(2500);
  const text = await page.locator("body").innerText();
  ok(new URL(page.url()).pathname === "/login", "stays on /login when the cookie did not come back", page.url().replace(BASE, ""));
  ok(/browser tidak menyimpan sesinya/.test(text), "says why: the browser did not keep the session cookie");
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.replace(/\s+/g, " ").slice(0, 300)); process.exitCode = 1; });
