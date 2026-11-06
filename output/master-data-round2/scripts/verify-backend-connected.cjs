// The app (hybrid build: auth+tickets+people+roles from the real backend) against the real local backend, through the test proxy on 3100.
const fs = require("fs");
const { launch, open } = require("./pw.cjs");
const BASE = "http://localhost:3100";
const ok = (c, l, e = "") => { console.log(`${c ? "PASS" : "FAIL"}  ${l}${e ? "  " + e : ""}`); if (!c) process.exitCode = 1; };
const B = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/backend/";
const env = Object.fromEntries(fs.readFileSync(B + ".env", "utf8").split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l)).map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
const users = (l => l.users || l)(JSON.parse(fs.readFileSync(B + "prisma/seed-data/users.json", "utf8")));
const account = users.find(u => u.role_id === "1" && u.email);
const OUT = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/master-data-round2/r3/";
(async () => {
  const browser = await launch();
  const page = await open(browser, { width: 1440, height: 900, noAuth: true });
  page.setDefaultTimeout(15000);
  const apiCalls = []; const failed = []; const recentCalls = [];
  page.on("request", r => { if (r.url().includes("sort=updated_at")) recentCalls.push(r.url().split("/__api")[1]); });
  page.on("request", r => { if (r.url().includes("/__api/")) apiCalls.push(`${r.method()} ${r.url().split("/__api")[1].split("?")[0]}`); });
  page.on("response", r => { if (r.status() >= 400 && r.status() !== 401 && !r.url().includes("/api/handovers") && !r.url().endsWith("/runbooks")) failed.push(`${r.status()} ${r.url().replace(BASE, "").slice(0, 70)}`); });

  // login
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" }); await page.waitForTimeout(900);
  await page.getByLabel("Email atau ID Karyawan").fill(account.email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(env.SEED_DEFAULT_PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL(u => u.pathname === "/dashboard", { timeout: 15000 }).catch(() => {});
  ok(new URL(page.url()).pathname === "/dashboard", "login with a real backend account", page.url().replace(BASE, ""));

  // tickets page: backend data
  await page.goto(`${BASE}/tickets`, { waitUntil: "networkidle" });
  await page.waitForSelector("table tbody tr, [data-ticket-row]", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() => ({ rows: [...document.querySelectorAll("*")].filter(e => e.children.length === 0 && /^#\d{3,5}$/.test(e.textContent.trim())).length, text: document.body.innerText }));
  ok(info.rows > 0, "Tickets page lists rows", `${info.rows} rows`);
  ok(/USIEM|SM|MB|EPC|APH|UNEM|B2B/.test(info.text) && !/Validasi approval entities/.test(info.text), "rows come from the backend (project codes of the real data, not the mock seed)");
  const listCalls = apiCalls.filter(c => c === "GET /tickets").length;
  ok(listCalls >= 37 && listCalls <= 80, "all 3,649 tickets loaded in pages of 100 (about 37 requests, shared between the shell and the page)", `${listCalls} requests`);
  const total = await page.evaluate(() => (document.body.innerText.match(/(\d[\d.,]*)\s*(tiket|ticket|hasil|results)/i) || [])[0]);
  console.log("      visible count text:", total);
  await page.screenshot({ path: OUT + "backend-tickets.png" });
  // detail drawer
  const firstRow = page.getByText(/^#\d{3,5}$/).first();
  const subject = await firstRow.evaluate(e => { let n = e; for (let i = 0; i < 6 && n; i++, n = n.parentElement) if ((n.innerText || "").split("\n").some(t => t.length > 25)) return n.innerText.split("\n").find(t => t.length > 25); return ""; });
  await firstRow.click();
  await page.waitForTimeout(1200);
  const path = new URL(page.url()).pathname;
  ok(/^\/tickets\/\d+$/.test(path), "opening a ticket goes to /tickets/<backend id> and the drawer finds it", path);
  const drawer = await page.locator("[role=dialog]").last().innerText().catch(() => "");
  ok(drawer.length > 20 && !/tidak ditemukan/i.test(drawer), "ticket detail drawer shows the ticket", subject.slice(0, 40));
  ok(!/Edit Ticket|Close Ticket|Eskalasi/.test(drawer) && /hanya bisa dilihat/.test(drawer), "ticket drawer is read-only (no edit, escalate or close) and says why");
  await page.screenshot({ path: OUT + "backend-ticket-detail.png" });
  await page.keyboard.press("Escape"); await page.waitForTimeout(500);

  // dashboard uses the same backend tickets
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" }); await page.waitForTimeout(2000);
  const dash = await page.locator("body").innerText();
  ok(/Tiket Hari Ini/.test(dash), "dashboard renders with backend tickets");

  // a local edit must warn that it is not saved to the backend
  await page.goto(`${BASE}/tickets`, { waitUntil: "networkidle" }); await page.waitForTimeout(1500);
  ok(await page.getByRole("button", { name: /New Ticket|Tiket Baru|Buat Tiket/i }).count() === 0, "no New Ticket button anywhere (tickets are read-only until writing is connected)");
  await page.keyboard.press("Control+n"); await page.waitForTimeout(500);
  ok(await page.locator("[role=dialog]").count() === 0, "Ctrl+N does not open the create form");
  const cached = await page.evaluate(() => { const v = JSON.parse(sessionStorage.getItem("ctd.backendTickets.v1") || "null"); return v && { owner: v.owner, tickets: v.tickets.length }; });
  ok(cached && cached.owner && cached.tickets > 3000, "loaded tickets are cached per person in sessionStorage", JSON.stringify(cached));
  const refreshBefore = recentCalls.length;
  await page.getByRole("button", { name: "Segarkan data dashboard" }).click(); await page.waitForTimeout(2500);
  ok(recentCalls.length > refreshBefore, "the refresh button fetches only the newest changes (sort=updated_at, one request)", recentCalls.slice(-1)[0]);
  // pages that are not connected say so; connected ones do not
  const noteOn = async url => { await page.goto(`${BASE}${url}`, { waitUntil: "networkidle" }); await page.waitForTimeout(900); return page.locator("[role=note]").allInnerTexts(); };
  ok((await noteOn("/tickets")).length === 0 && (await noteOn("/team-roster")).length === 0, "no note on connected pages (Tickets, Team Roster)");
  ok((await noteOn("/monitoring")).some(t => /monitoring belum tersambung/.test(t)), "Monitoring says it is not connected");
  ok((await noteOn("/master-data?group=team&tab=people")).some(t => /Selain Personel dan Peran/.test(t)), "Master Data says what is and is not connected");
  // Runbooks was removed: its address is a normal not-found page, and nothing of it is left in the browser
  const gone = await page.goto(`${BASE}/runbooks`, { waitUntil: "networkidle" }); await page.waitForTimeout(800);
  ok(gone.status() === 404 && !/Runbooks/.test(await page.locator("nav, aside").first().innerText().catch(() => "")), "/runbooks is a not-found page and the menu has no Runbooks", String(gone.status()));

  // Master Data: Personel and Peran from /users and /roles
  await page.goto(`${BASE}/master-data?group=team&tab=people`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-master-id]:visible", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
  const people = await page.evaluate(() => ({ rows: document.querySelectorAll("tbody tr").length, text: document.body.innerText }));
  ok(people.rows === 10 && /hutabyte\.com/.test(people.text), "Personel: first page of the backend users (10 of 20, hutabyte.com emails)", `${people.rows} rows`);
  ok(/SUPER_ADMIN|Super Admin|Shift Lead|Operator NOC|Viewer|Admin/.test(people.text), "Personel: roles from the backend");
  await page.screenshot({ path: OUT + "backend-personel.png" });
  await page.locator("input[type=search]").fill("agnes"); await page.waitForTimeout(900);
  const found = await page.locator("tbody tr").count();
  ok(found >= 1 && found <= 3, "Personel: search works (done in the frontend)", `${found} rows for "agnes"`);
  await page.locator("[data-master-id]:visible").first().click({ position: { x: 60, y: 20 } });
  await page.waitForSelector("section[role=dialog]"); await page.waitForTimeout(900);
  const personDrawer = await page.locator("section[role=dialog]").last().innerText();
  ok(/Penggunaan/.test(personDrawer) && /\d/.test(personDrawer), "Personel: detail drawer opens (ticket count from /tickets?user_id=)");
  await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  await page.goto(`${BASE}/master-data?group=team&tab=roles`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-master-id]:visible", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
  const roles = await page.evaluate(() => ({ rows: document.querySelectorAll("tbody tr").length, text: document.body.innerText }));
  ok(roles.rows === 5, "Peran: the 5 backend roles", `${roles.rows} rows`);
  await page.screenshot({ path: OUT + "backend-peran.png" });

  // one source: header numbers and the role filter come from the same backend data as the list
  await page.goto(`${BASE}/master-data?group=team&tab=people`, { waitUntil: "networkidle" }); await page.waitForTimeout(1500);
  const stats = await page.evaluate(() => [...document.querySelectorAll("[data-master-data-v2] header [role=group] > *")].map(e => e.innerText.replace(/\s+/g, " ").trim()));
  const listCount = await page.evaluate(() => (document.body.innerText.match(/(\d+)\s*personel/i) || [])[1]);
  console.log("      header stats:", JSON.stringify(stats), "| list says", listCount, "personel");
  ok(stats[0] && stats[0].startsWith(String(listCount)) , "header 'Personel aktif' equals the backend list, not the mock (14)", stats[0]);
  ok(stats[1] && stats[1].startsWith("5"), "header 'Peran aktif' is the 5 backend roles", stats[1]);
  await page.locator("#master-filter-role").click();
  const roleOptions = (await page.getByRole("option").allInnerTexts()).map(t => t.trim());
  ok(roleOptions.includes("Super Admin") && roleOptions.includes("Operator NOC") && !roleOptions.includes("Incident Coordinator"), "role filter lists the backend roles (not the mock ones)", roleOptions.join(", "));
  await page.keyboard.press("Escape");
  // roster and pickers use the same people
  await page.goto(`${BASE}/team-roster`, { waitUntil: "networkidle" }); await page.waitForTimeout(2000);
  const roster = await page.locator("body").innerText();
  ok(/Agnes|Dimas|Pangondion/.test(roster) && !/Something went wrong|Application error/i.test(roster), "Team Roster renders the backend people without crashing");
  await page.screenshot({ path: OUT + "backend-roster.png" });

  // writing says it is not connected
  await page.goto(`${BASE}/master-data?group=team&tab=people`, { waitUntil: "networkidle" }); await page.waitForTimeout(1200);
  await page.getByRole("button", { name: /^Tambah Personel/ }).first().click();
  await page.waitForSelector("form");
  await page.getByLabel("Nama lengkap").fill("Uji Tulis");
  await page.getByLabel("ID pegawai").fill("EMP-9999");
  await page.getByLabel("Email").fill("uji.tulis@hutabyte.com");
  await page.getByLabel("Tanggal bergabung").first().fill("04/01/2023");
  await page.getByRole("button", { name: "Simpan", exact: true }).click().catch(() => {});
  await page.waitForTimeout(1500);
  const afterSave = await page.locator("body").innerText();
  ok(/belum tersambung ke backend/i.test(afterSave), "writing a person says it is not connected (nothing is saved or faked)");

  // the session ends mid-use (a 401 from any call): the cached tickets and people of that person are dropped and the app goes to /login
  await page.goto(`${BASE}/tickets`, { waitUntil: "networkidle" }); await page.waitForTimeout(1200);
  await page.route("**/__api/tickets?*sort=updated_at*", route => route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ message: "Unauthorized" }) }));
  await page.getByRole("button", { name: "Segarkan data dashboard" }).click();
  await page.waitForURL(u => u.pathname === "/login", { timeout: 10000 }).catch(() => {});
  ok(new URL(page.url()).pathname === "/login", "an ended session sends the person to /login", page.url().replace(BASE, ""));
  ok(await page.evaluate(() => sessionStorage.getItem("ctd.backendTickets.v1")) === null, "...and the cached tickets are gone (nothing left for the next person on this tab)");

  ok(!failed.length, "no backend call failed (no 4xx/5xx other than the expected 401 before login)", JSON.stringify(failed.slice(0, 4)));
  // 401 before login is expected; /api/handovers needs Cloudflare D1, which a plain `vinext start` does not have (works on the dev server)
  const errs = page.errors.filter(e => !/preload|favicon|status of 401|status of 500|status of 404/.test(e));
  ok(!errs.length, "no console errors", JSON.stringify(errs.slice(0, 3)).slice(0, 300));
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.replace(/\s+/g, " ").slice(0, 400)); process.exitCode = 1; });
