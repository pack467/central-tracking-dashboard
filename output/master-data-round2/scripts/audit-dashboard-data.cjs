// Read-only audit of what the dashboard shows: logs in, lets the app load its tickets, then reads the app's own cached copy
// (sessionStorage "ctd.backendTickets.v1") and the rendered page. Nothing is written to the backend or the database.
const fs = require("fs");
const { launch, open } = require("./pw.cjs");
const BASE = process.env.CTD_BASE || "http://localhost:3000";
const OUT = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/master-data-round2/r3/audit-";
const B = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/backend/";
const env = Object.fromEntries(fs.readFileSync(B + ".env", "utf8").split("\n").map(l => l.trim()).filter(l => /^[A-Z_]+=/.test(l)).map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
const users = (l => l.users || l)(JSON.parse(fs.readFileSync(B + "prisma/seed-data/users.json", "utf8")));
const account = users.find(u => u.role_id === "1" && u.email);
(async () => {
  const browser = await launch();
  if (process.env.WAIT) { console.log("(waiting 65 s for the backend's rate window)"); await new Promise(r => setTimeout(r, 65000)); }
  const page = await open(browser, { width: 1920, height: 1080, noAuth: true });
  page.setDefaultTimeout(120000);
  const responses = []; page.on("response", r => { if (r.url().includes(":3001")) responses.push(r.status()); });
  await page.goto(BASE + "/login", { waitUntil: "networkidle" }); await page.waitForTimeout(1200);
  await page.getByLabel("Email atau ID Karyawan").fill(account.email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(env.SEED_DEFAULT_PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL(u => u.pathname === "/dashboard");
  await page.waitForFunction(() => /Menampilkan\s+\d+\s+dari\s+[1-9]/.test(document.body.textContent));
  await page.waitForTimeout(2500);

  const data = await page.evaluate(() => {
    const stored = JSON.parse(sessionStorage.getItem("ctd.backendTickets.v1") || "{}");
    const t = stored.tickets || [];
    const count = (f) => t.filter(f).length;
    const by = (key) => t.reduce((m, x) => (m[x[key] ?? "(kosong)"] = (m[x[key] ?? "(kosong)"] || 0) + 1, m), {});
    const ids = new Set(); let dup = 0; for (const x of t) { if (ids.has(x.id)) dup++; ids.add(x.id); }
    const dates = t.map(x => x.date).filter(Boolean).sort();
    const closed = (x) => ["closed", "ditutup"].includes((x.status || "").toLowerCase());
    const res = t.filter(x => typeof x.resolutionMinutes === "number").map(x => x.resolutionMinutes);
    return {
      total: t.length, duplicates: dup, dateFrom: dates[0], dateTo: dates[dates.length - 1],
      noDate: count(x => !x.date), noShift: count(x => !x.shift), ownerDash: count(x => !x.owner || x.owner === "—"), projectDash: count(x => !x.project || x.project === "—"),
      status: by("status"), severity: by("severity"), client: by("clientId"), category: Object.keys(by("category")).length,
      openNotClosedStatus: count(x => !closed(x) && x.isStillOpen === false),
      notClosedButHasResolution: count(x => !closed(x) && typeof x.resolutionMinutes === "number"),
      closedNoResolution: count(x => closed(x) && typeof x.resolutionMinutes !== "number"),
      resolutionZero: res.filter(m => m === 0).length, resolutionOver1Day: res.filter(m => m > 1440).length, resolutionOver7Days: res.filter(m => m > 10080).length, resolutionMax: Math.max(0, ...res),
      openActivityMeeting: count(x => !closed(x) && ["activity", "meeting"].includes((x.status || "").toLowerCase())),
      formulaLikeSubjects: count(x => /^[=+\-@\t\r]/.test(x.subject || "")),
      htmlLikeSubjects: count(x => /<[a-z!/]/i.test(x.subject || "")),
      owners: Object.keys(by("owner")).length,
    };
  });

  const ui = await page.evaluate(() => {
    const text = document.body.innerText;
    const todayCount = (text.match(/Tiket Hari Ini[\s\S]{0,80}?(\d+)\s+tiket/) || [])[1];
    const recap = [...document.querySelectorAll("*")].find(el => /^Rekap Tiket per User/.test(el.textContent || "") && el.tagName === "ARTICLE");
    const monitoring = (text.match(/(\d+)\s*OK[\s\S]{0,20}?(\d+)\s*NOK/) || []).slice(1, 3);
    return { todayCount: todayCount && Number(todayCount), recapStaff: (text.match(/(\d+)\s+Staf/) || [])[1], monitoring };
  });

  // the per-user recap: the first visible card's numbers next to the hard-coded base numbers in TicketReportView.tsx
  const source = fs.readFileSync("E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/components/tickets/TicketReportView.tsx", "utf8");
  const roster = [...source.matchAll(/\{ name: "([^"]+)", role: "[^"]*", baseMonth: (\d+), baseYear: (\d+) \}/g)].map(m => ({ name: m[1], baseMonth: +m[2], baseYear: +m[3] }));
  const recapCards = await page.evaluate(() => [...document.querySelectorAll("button, div")].filter(el => /Detail/.test(el.textContent || "") && /HARI INI/.test(el.textContent || "") && el.textContent.length < 400).map(el => el.innerText.replace(/\s+/g, " ")).slice(0, 4));
  const rosterInTickets = await page.evaluate((names) => { const t = (JSON.parse(sessionStorage.getItem("ctd.backendTickets.v1") || "{}").tickets) || []; const owners = new Set(t.map(x => (x.owner || "").toLowerCase())); return names.map(n => ({ name: n, hasTickets: [...owners].some(o => o.includes(n.toLowerCase().replace(/^(mhd\.|m\.)\s+/i, ""))) })); }, roster.map(r => r.name));

  await page.screenshot({ path: OUT + "dashboard-top.png" });
  const errors = page.errors.filter(e => !/favicon|preload/.test(e));
  const statusCounts = responses.reduce((m, s) => (m[s] = (m[s] || 0) + 1, m), {});
  console.log(JSON.stringify({ data, ui, roster: roster.map(r => `${r.name} ${r.baseMonth}/${r.baseYear}`), rosterInTickets, recapCards, backendResponses: statusCounts, consoleErrors: errors.slice(0, 5) }, null, 1));
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.replace(/\s+/g, " ").slice(0, 400)); process.exitCode = 1; });
