// Login and Our Team: no way in without the right password, nothing stored that should not be, the team page scrolls when short.
const { launch, open, BASE } = require("./pw.cjs");
const ok = (cond, label, extra = "") => { console.log(`${cond ? "PASS" : "FAIL"}  ${label}${extra ? "  " + extra : ""}`); if (!cond) process.exitCode = 1; };
const OUT = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/master-data-round2/r3/";
async function attempt(page, id, pwd, { remember = true } = {}) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900); // let the page hydrate, or React throws the typed text away
  await page.getByLabel("Email atau ID Karyawan").fill(id);
  await page.getByLabel("Kata sandi", { exact: true }).fill(pwd);
  const box = page.getByRole("checkbox", { name: /Ingat saya/ });
  if ((await box.isChecked()) !== remember) await box.click();
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForTimeout(1400);
}
const stores = page => page.evaluate(() => ({ local: !!localStorage.getItem("ctd.auth_token"), session: !!sessionStorage.getItem("ctd.auth_token"), path: location.pathname }));
(async () => {
  const browser = await launch();
  const fresh = async () => { const p = await open(browser, { width: 1440, height: 900, noAuth: true }); p.setDefaultTimeout(9000); return p; };

  // 1. opening the app without a session no longer logs anybody in
  let p = await fresh();
  await p.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" }); await p.waitForURL(url => url.pathname === "/login", { timeout: 8000 }).catch(() => {});
  ok(new URL(p.url()).pathname === "/login" && /next=/.test(p.url()), "no session: /dashboard goes to /login (no automatic Galih)", p.url().replace(BASE, ""));
  ok(!(await stores(p)).local, "nothing is stored by merely opening the app");

  // 2. wrong ways in
  for (const [label, id, pwd] of [["unknown account, any password", "siapasaja", "abc"], ["one letter of a name", "a", "password123"], ["partial name", "galih", "password123"], ["real account, wrong password", "galih.khairi@company.id", "salah"], ["real account, empty-looking password", "galih.khairi@company.id", "   "]]) {
    await attempt(p, id, pwd);
    const s = await stores(p), text = await p.locator("body").innerText();
    ok(s.path === "/login" && !s.local && !s.session && /Email\/ID karyawan atau kata sandi salah|Masukkan kata sandi/.test(text), `refused: ${label}`);
  }
  const msgs = [];
  for (const id of ["siapasaja", "galih.khairi@company.id"]) { await attempt(p, id, "salah"); msgs.push((await p.getByRole("alert").innerText()).trim()); }
  ok(msgs[0] === msgs[1], "same message for an unknown account and a wrong password (no account enumeration)", msgs[0]);
  // lockout after 5 failures
  await p.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  for (let i = 0; i < 6; i++) {
    await p.getByLabel("Email atau ID Karyawan").fill("x@y.z"); await p.getByLabel("Kata sandi", { exact: true }).fill("salah" + i);
    await p.getByRole("button", { name: "Masuk" }).click(); await p.waitForTimeout(900);
  }
  ok(/Terlalu banyak percobaan/.test(await p.locator("body").innerText()), "five failures lock the form for 30 seconds");
  await p.context().close();

  // 3. storage tricks
  p = await fresh();
  await p.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await p.evaluate(() => localStorage.setItem("ctd.local_test_account", JSON.stringify({ email: "hacker@evil.id", password: "pw", role: "Admin" })));
  await attempt(p, "hacker@evil.id", "pw");
  ok((await stores(p)).path === "/login", "an account injected through localStorage cannot log in");
  await p.evaluate(() => { localStorage.setItem("ctd.auth_token", "x"); localStorage.setItem("ctd.auth_user", JSON.stringify({ role: "Admin" })); });
  await p.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" }); await p.waitForURL(url => url.pathname === "/login", { timeout: 6000 }).catch(() => {});
  ok(new URL(p.url()).pathname === "/login", "a stored session without a valid user is ignored", p.url().replace(BASE, ""));
  await p.context().close();

  // 4. the demo account that does exist (development), and "Ingat saya"
  p = await fresh();
  await attempt(p, "galih.khairi@company.id", "password123", { remember: true });
  let s = await stores(p);
  ok(s.path === "/dashboard" && s.local && !s.session, "right account and password: in, stored for later (Ingat saya on)", JSON.stringify(s));
  const user = await p.evaluate(() => localStorage.getItem("ctd.auth_user"));
  ok(!/password|demoPassword|badge/.test(user), "the stored session holds no password or demo labels");
  await p.context().close();
  p = await fresh();
  await attempt(p, "galih.khairi@company.id", "password123", { remember: false });
  s = await stores(p);
  ok(s.path === "/dashboard" && !s.local && s.session, "Ingat saya off: the session ends with the tab (sessionStorage only)", JSON.stringify(s));
  const errs = p.errors.filter(e => !/preload/.test(e));
  ok(!errs.length, "no console errors on login", JSON.stringify(errs.slice(0, 2)));
  await p.context().close();

  // 5. redirect after login stays on this site
  p = await fresh();
  await p.goto(`${BASE}/login?next=//evil.example/x`, { waitUntil: "networkidle" }); await p.waitForTimeout(900);
  await p.getByLabel("Email atau ID Karyawan").fill("galih.khairi@company.id"); await p.getByLabel("Kata sandi", { exact: true }).fill("password123");
  await p.getByRole("button", { name: "Masuk" }).click(); await p.waitForTimeout(1600);
  ok(new URL(p.url()).origin === BASE && new URL(p.url()).pathname === "/dashboard", "a hostile ?next= still lands on this site (the dashboard)", p.url().replace(BASE, ""));
  await p.context().close();

  // 6. Our Team
  p = await open(browser, { width: 1440, height: 900, noAuth: true }); p.setDefaultTimeout(9000);
  await p.goto(`${BASE}/team?from=//evil.example`, { waitUntil: "networkidle" }); await p.waitForTimeout(800);
  ok(await p.locator("style").evaluateAll(els => !els.some(e => /overflow:\s*hidden\s*!important/.test(e.textContent || ""))), "no inline style forcing overflow:hidden !important on html/body");
  const roomy = await p.evaluate(() => { const m = document.querySelector("main"); return { over: m.scrollHeight - m.clientHeight, htmlOverflow: getComputedStyle(document.documentElement).overflow }; });
  ok(roomy.over <= 1, "1440x900: everything fits, nothing to scroll", JSON.stringify(roomy));
  await p.screenshot({ path: OUT + "our-team-1440x900-after.png" });
  await p.setViewportSize({ width: 1440, height: 520 }); await p.waitForTimeout(500);
  const short = await p.evaluate(async () => { const m = document.querySelector("main"); const need = m.scrollHeight > m.clientHeight; m.scrollTop = m.scrollHeight; await new Promise(r => setTimeout(r, 100)); const last = [...m.querySelectorAll("*")].filter(e => e.getBoundingClientRect().height > 0).pop().getBoundingClientRect(); return { need, reachable: last.bottom <= m.getBoundingClientRect().bottom + 2, scrollbarShown: m.offsetWidth - m.clientWidth }; });
  ok(short.need && short.reachable, "1440x520: a short window scrolls inside the page and the bottom is reachable", JSON.stringify(short));
  await p.screenshot({ path: OUT + "our-team-1440x520-after.png" });
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "390px: no horizontal scroll");
  await p.getByRole("button", { name: /Kembali/ }).click(); await p.waitForTimeout(900);
  ok(new URL(p.url()).origin === BASE, "Kembali with a hostile ?from= stays on this site", p.url().replace(BASE, ""));
  const e2 = p.errors.filter(e => !/preload/.test(e));
  ok(!e2.length, "no console errors on Our Team", JSON.stringify(e2.slice(0, 2)));
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.replace(/\s+/g, " ").slice(0, 300)); process.exitCode = 1; });
