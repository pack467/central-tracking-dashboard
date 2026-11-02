// Master Data -> Tim & Operasional: Jabatan and Departemen tabs (browser-only), assigning them to a person, and the position on the dashboard recap.
const fs = require("fs");
const { launch, open } = require("./pw.cjs");
const BASE = process.env.CTD_BASE || "http://localhost:3000";
const OUT = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/master-data-round2/r6/org-";
fs.mkdirSync(OUT.slice(0, OUT.lastIndexOf("/")), { recursive: true });
const ok = (c, l, e = "") => { console.log(`${c ? "PASS" : "FAIL"}  ${l}${e ? "  " + e : ""}`); if (!c) process.exitCode = 1; };
const B = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/backend/";
const env = Object.fromEntries(fs.readFileSync(B + ".env", "utf8").split("\n").map(l => l.trim()).filter(l => /^[A-Z_]+=/.test(l)).map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
const users = (l => l.users || l)(JSON.parse(fs.readFileSync(B + "prisma/seed-data/users.json", "utf8")));
const account = users.find(u => u.role_id === "1" && u.email);
const text = page => page.evaluate(() => document.body.textContent.replace(/\s+/g, " "));
(async () => {
  const browser = await launch();
  if (process.env.WAIT) { console.log("      (waiting 65 s for the backend's rate window)"); await new Promise(r => setTimeout(r, 65000)); }
  const page = await open(browser, { width: 1366, height: 900, noAuth: true });
  page.setDefaultTimeout(60000);
  await page.goto(BASE + "/login", { waitUntil: "networkidle", timeout: 120000 }); await page.waitForTimeout(1200);
  await page.getByLabel("Email atau ID Karyawan").fill(account.email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(env.SEED_DEFAULT_PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL(u => u.pathname === "/dashboard", { timeout: 90000 });
  await page.evaluate(() => { localStorage.removeItem("ctd.positions.v1"); localStorage.removeItem("ctd.departments.v1"); });

  // the Jabatan tab: seeded list, the browser-only note
  await page.goto(BASE + "/master-data?group=team&tab=positions", { waitUntil: "networkidle", timeout: 120000 });
  await page.getByRole("table", { name: "Daftar Jabatan" }).waitFor();
  const rows = page.getByRole("table", { name: "Daftar Jabatan" }).locator("tbody tr");
  ok(await rows.count() === 6, "Jabatan: 6 seeded positions", String(await rows.count()));
  ok(/Jabatan belum ada di backend/.test(await text(page)), "Jabatan: the browser-only note is shown");
  ok(await page.getByRole("tab", { name: /Departemen/ }).count() > 0, "the Departemen tab is in the team group");
  await page.screenshot({ path: OUT + "positions-1366.png", fullPage: false });

  // adding one, and a duplicate is refused
  await page.getByRole("button", { name: "Tambah Jabatan" }).first().click();
  await page.getByLabel(/Nama jabatan/).fill("Network Engineer");
  await page.getByRole("button", { name: /Simpan/ }).click();
  await page.waitForTimeout(600);
  ok(await rows.count() === 7 && /Network Engineer/.test(await text(page)), "adding 'Network Engineer' puts it in the list");
  await page.getByRole("button", { name: "Tambah Jabatan" }).first().click();
  await page.getByLabel(/Nama jabatan/).fill("it lead");
  ok(/Jabatan "it lead" sudah ada/.test(await text(page)), "a duplicate name is flagged in the form");
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  const discard = page.getByRole("button", { name: /Buang/ });
  if (await discard.count()) await discard.first().click();
  await page.waitForTimeout(400);

  // Departemen
  await page.goto(BASE + "/master-data?group=team&tab=departments", { waitUntil: "networkidle", timeout: 120000 });
  await page.getByRole("table", { name: "Daftar Departemen" }).waitFor();
  ok(await page.getByRole("table", { name: "Daftar Departemen" }).locator("tbody tr").count() === 6, "Departemen: 6 seeded departments");
  await page.screenshot({ path: OUT + "departments-1366.png" });

  // assign both from a person's detail
  await page.goto(BASE + "/master-data?group=team&tab=people", { waitUntil: "networkidle", timeout: 120000 });
  const people = page.getByRole("table", { name: "Daftar Personel" });
  await people.waitFor();
  ok(/Jabatan \/ Departemen/.test(await people.locator("thead").textContent()), "Personel: a Jabatan / Departemen column");
  const firstName = (await people.locator("tbody tr").first().locator("td").first().textContent()).trim();
  await people.locator("tbody tr").first().click();
  await page.getByRole("combobox", { name: "Jabatan personel" }).click();
  await page.getByRole("option", { name: "IT Lead" }).click();
  await page.getByRole("combobox", { name: "Departemen personel" }).click();
  await page.getByRole("option", { name: "Network Operations Center" }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: OUT + "person-detail-1366.png" });
  const stored = await page.evaluate(() => [JSON.parse(localStorage.getItem("ctd.positions.v1")).assignments, JSON.parse(localStorage.getItem("ctd.departments.v1")).assignments]);
  ok(Object.values(stored[0]).includes("pos-it-lead") && Object.values(stored[1]).includes("dept-network-operations-center"), "the assignments are stored in this browser", JSON.stringify(stored));
  await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  const firstRow = (await people.locator("tbody tr").first().textContent()).replace(/\s+/g, " ");
  ok(/IT Lead/.test(firstRow) && /Network Operations Center/.test(firstRow), "the list shows the new Jabatan and Departemen", firstRow.slice(0, 160));

  // a held position cannot be deleted
  await page.goto(BASE + "/master-data?group=team&tab=positions", { waitUntil: "networkidle", timeout: 120000 });
  const itLead = page.getByRole("table", { name: "Daftar Jabatan" }).locator("tbody tr", { hasText: "IT Lead" }).first();
  ok(/1 personel/.test(await itLead.textContent()), "IT Lead counts 1 holder");
  await itLead.getByRole("button", { name: /Aksi lain|Menu|lainnya/i }).first().click().catch(() => itLead.locator("button").last().click());
  await page.waitForTimeout(300);
  const del = page.getByRole("menuitem", { name: /Hapus/ });
  ok(await del.count() > 0 && await del.first().isDisabled(), "deleting a held position is disabled");
  await page.keyboard.press("Escape");

  // the dashboard recap shows the position
  await page.goto(BASE + "/dashboard?date=all", { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForFunction(() => /Menampilkan\s+\d+\s+dari\s+[1-9]/.test(document.body.textContent), null, { timeout: 120000 });
  const roleLines = await page.locator(".user-summary-role").allTextContents();
  ok(roleLines.some(line => /^IT Lead · /.test(line)), "the dashboard recap shows 'IT Lead · …' for that person", `${firstName}: ${roleLines.find(l => /IT Lead/.test(l)) || roleLines.slice(0, 3).join(" | ")}`);
  const errors = page.errors.filter(e => !/favicon|401|Failed to load resource|preload/.test(e));
  ok(errors.length === 0, "no console errors", JSON.stringify(errors.slice(0, 2)));

  // phone: the tab and the cards
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } }).catch(() => null);
  if (phone) {
    await phone.context().addCookies(await page.context().cookies()).catch(() => undefined);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + "/master-data?group=team&tab=positions", { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(800);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "phone: no sideways scroll on the Jabatan tab");
  await page.screenshot({ path: OUT + "positions-390.png" });
  if (phone) await phone.close();

  await page.evaluate(() => { localStorage.removeItem("ctd.positions.v1"); localStorage.removeItem("ctd.departments.v1"); });
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.replace(/\s+/g, " ").slice(0, 400)); process.exitCode = 1; });
