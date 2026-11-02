// Real-login mode against fake-backend.cjs (3999) and a backend-mode build served on 3100.
const { launch, open } = require("./pw.cjs");
const BASE = "http://localhost:3100", API = "http://localhost:3999";
const ok = (c, l, e = "") => { console.log(`${c ? "PASS" : "FAIL"}  ${l}${e ? "  " + e : ""}`); if (!c) process.exitCode = 1; };
async function login(page, id, pwd) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" }); await page.waitForTimeout(900);
  await page.getByLabel("Email atau ID Karyawan").fill(id); await page.getByLabel("Kata sandi", { exact: true }).fill(pwd);
  await page.getByRole("button", { name: "Masuk" }).click(); await page.waitForTimeout(1600);
}
const reset = () => fetch(`${API}/__reset`);
const backendLog = async () => (await fetch(`${API}/__log`)).json();
(async () => {
  const browser = await launch();
  const fresh = async () => { const p = await open(browser, { width: 1440, height: 900, noAuth: true }); p.setDefaultTimeout(9000); return p; };

  let p = await fresh();
  await p.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" }); await p.waitForURL(u => u.pathname === "/login", { timeout: 8000 }).catch(() => {});
  ok(new URL(p.url()).pathname === "/login", "no session: /dashboard goes to /login");
  ok(await p.getByRole("checkbox", { name: /Ingat saya/ }).count() === 0, "backend mode: no 'Ingat saya' (the server decides the session length)");

  // refused
  for (const [label, id, pwd] of [["unknown account", "siapasaja", "abc"], ["right user, wrong password", "dimas.yudistira@company.id", "salah"], ["demo password of the old build", "galih.khairi@company.id", "password123"], ["inactive account", "off@company.id", "Off!pass123"]]) {
    await login(p, id, pwd);
    const text = await p.locator("body").innerText(), cookies = await p.context().cookies();
    ok(new URL(p.url()).pathname === "/login" && /Email\/ID karyawan atau kata sandi salah/.test(text) && !cookies.some(c => c.name === "ctd.sid"), `refused by the server: ${label}`);
  }
  // the network is down
  await p.route(`${API}/auth/login`, route => route.abort());
  await login(p, "dimas.yudistira@company.id", "Passw0rd!test");
  ok(/Tidak dapat terhubung ke server/.test(await p.locator("body").innerText()), "network failure says so, not 'wrong password'");
  await p.unroute(`${API}/auth/login`);
  await p.context().close();

  // good login
  await reset();
  p = await fresh();
  await login(p, "dimas.yudistira@company.id", "Passw0rd!test");
  ok(new URL(p.url()).pathname === "/dashboard", "right account: in, on the dashboard", p.url().replace(BASE, ""));
  const cookies = await p.context().cookies();
  const sid = cookies.find(c => c.name === "ctd.sid"), csrf = cookies.find(c => c.name === "ctd.csrf");
  ok(!!sid && sid.httpOnly && sid.sameSite === "Lax", "session cookie ctd.sid is httpOnly and SameSite=Lax", JSON.stringify({ httpOnly: sid?.httpOnly, sameSite: sid?.sameSite }));
  ok(!(await p.evaluate(() => document.cookie)).includes("ctd.sid"), "page JavaScript cannot read the session cookie");
  const stored = await p.evaluate(() => ({ keys: Object.keys(localStorage).concat(Object.keys(sessionStorage)).filter(k => /auth|token|user/i.test(k)), all: JSON.stringify({ ...localStorage, ...sessionStorage }) }));
  ok(stored.keys.length === 0 && !/Passw0rd|dimas\.yudistira|ADMIN/.test(stored.all), "nothing about the session or the user in localStorage/sessionStorage", JSON.stringify(stored.keys));
  await p.waitForTimeout(800);
  const shown = await p.locator("body").innerText();
  ok(/Dimas Yudistira/.test(shown) && /Admin/.test(shown), "the shell shows the server's user and role", shown.includes("Dimas") ? "" : "name missing");
  await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(1500);
  ok(new URL(p.url()).pathname === "/dashboard", "reload keeps the session (restored from GET /auth/me)");
  await p.screenshot({ path: "../r3/real-login-dashboard.png" });

  // logout with the CSRF token
  await p.getByRole("button", { name: "Menu opsi profil" }).first().click();
  await p.getByRole("menuitem", { name: /Keluar Sesi/ }).click();
  await p.waitForURL(u => u.pathname === "/login", { timeout: 8000 }).catch(() => {});
  await p.waitForTimeout(600);
  const log = await backendLog();
  ok(log.includes("204 logout") && !log.some(l => l.startsWith("403 csrf")), "logout reached the server with a valid X-CSRF-Token (session ended there)", log.slice(-4).join(" | "));
  ok(!(await p.context().cookies()).some(c => c.name === "ctd.sid"), "the session cookie is gone after logout");
  await p.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" }); await p.waitForURL(u => u.pathname === "/login", { timeout: 8000 }).catch(() => {});
  ok(new URL(p.url()).pathname === "/login", "after logout /dashboard needs a login again");
  await p.context().close();

  // storage tampering does nothing in backend mode
  p = await fresh();
  await p.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await p.evaluate(() => { localStorage.setItem("ctd.auth_token", "ctd_token_fake"); localStorage.setItem("ctd.auth_user", JSON.stringify({ id: "1", name: "Hacker", employeeId: "E", role: "Admin", email: "h@x.y" })); });
  await p.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" }); await p.waitForURL(u => u.pathname === "/login", { timeout: 8000 }).catch(() => {});
  ok(new URL(p.url()).pathname === "/login", "a forged localStorage session does NOT log in (only the server's cookie counts)");
  await p.context().close();

  // a lost session (cookie cleared / expired) sends the person back to login
  await reset();
  p = await fresh();
  await login(p, "agnes.siahaan@company.id", "Agent!pass1");
  ok(new URL(p.url()).pathname === "/dashboard" && /Operator NOC/.test(await p.locator("body").innerText()), "second account (AGENT) logs in and shows as Operator NOC");
  await p.context().clearCookies();
  await p.reload({ waitUntil: "networkidle" }); await p.waitForURL(u => u.pathname === "/login", { timeout: 8000 }).catch(() => {});
  ok(new URL(p.url()).pathname === "/login", "cookie lost or expired: back to /login");
  const errs = p.errors.filter(e => !/preload|favicon|Failed to load resource/.test(e));
  ok(!errs.length, "no console errors", JSON.stringify(errs.slice(0, 3)));
  await p.context().close();

  // throttling
  await reset();
  p = await fresh();
  await p.goto(`${BASE}/login`, { waitUntil: "networkidle" }); await p.waitForTimeout(900);
  for (let i = 0; i < 7; i++) { await p.getByLabel("Email atau ID Karyawan").fill("x@y.z"); await p.getByLabel("Kata sandi", { exact: true }).fill("salah" + i); await p.getByRole("button", { name: "Masuk" }).click(); await p.waitForTimeout(500); }
  ok(/Terlalu banyak percobaan/.test(await p.locator("body").innerText()), "repeated failures: the form and the server both slow things down");
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.replace(/\s+/g, " ").slice(0, 300)); process.exitCode = 1; });
