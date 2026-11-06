// Round 5 (dev server on 3000, local backend, real login): steady volume-chart hover with a styled tooltip, the compact per-person recap and
// its detail, the new month-over-month comparison (card and expanded panel), and three severities on every page.
const fs = require("fs");
const { launch, open } = require("./pw.cjs");
const BASE = process.env.CTD_BASE || "http://localhost:3000";
const OUT = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/master-data-round2/r3/r5-";
const ok = (c, l, e = "") => { console.log(`${c ? "PASS" : "FAIL"}  ${l}${e ? "  " + e : ""}`); if (!c) process.exitCode = 1; };
const B = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/backend/";
const env = Object.fromEntries(fs.readFileSync(B + ".env", "utf8").split("\n").map(l => l.trim()).filter(l => /^[A-Z_]+=/.test(l)).map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
const users = (l => l.users || l)(JSON.parse(fs.readFileSync(B + "prisma/seed-data/users.json", "utf8")));
const account = users.find(u => u.role_id === "1" && u.email);
const ready = page => page.waitForFunction(() => /Menampilkan\s+\d+\s+dari\s+[1-9]/.test(document.body.textContent), null, { timeout: 120000 }).then(() => page.waitForTimeout(2000));
(async () => {
  const browser = await launch();
  if (process.env.WAIT) { console.log("(waiting 65 s for the backend's rate window)"); await new Promise(r => setTimeout(r, 65000)); }
  const page = await open(browser, { width: 1920, height: 1080, noAuth: true });
  page.setDefaultTimeout(90000);
  await page.goto(BASE + "/login", { waitUntil: "networkidle", timeout: 120000 }); await page.waitForTimeout(1200);
  await page.getByLabel("Email atau ID Karyawan").fill(account.email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(env.SEED_DEFAULT_PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL(u => u.pathname === "/dashboard", { timeout: 90000 });
  await page.goto(`${BASE}/dashboard?date=2026-09-01..2026-09-30`, { waitUntil: "networkidle", timeout: 120000 });
  await ready(page);

  // 1. volume chart: wider, labels apart, hover is CSS only with a tooltip on top, nothing re-renders
  const panel = page.locator("article.primary-chart-panel");
  await panel.scrollIntoViewIfNeeded();
  const geo = await panel.evaluate(el => {
    const svg = el.querySelector(".compact-svg-barchart-wrap svg"), box = svg.getBoundingClientRect();
    const labels = [...el.querySelectorAll(".stacked-bar text")].filter(t => getComputedStyle(t).opacity !== "0").map(t => t.getBoundingClientRect()).filter(r => r.width && r.top > box.bottom - 30).sort((a, b) => a.left - b.left);
    let overlaps = 0; for (let i = 1; i < labels.length; i++) if (labels[i].left < labels[i - 1].right - 1) overlaps++;
    return { width: Math.round(el.getBoundingClientRect().width), bars: el.querySelectorAll(".stacked-bar").length, hit: el.querySelectorAll(".stacked-bar-group").length, labels: labels.length, overlaps, titles: el.querySelectorAll(".stacked-bar-group title").length };
  });
  ok(geo.width >= 1150 && geo.bars === 30 && geo.hit === 30 && geo.overlaps === 0 && geo.titles === 0, "volume card is wider, 30 bars, labels apart, no native browser tooltip", JSON.stringify(geo));
  await page.evaluate(() => { window.__long = []; new PerformanceObserver(l => { for (const e of l.getEntries()) window.__long.push(Math.round(e.duration)); }).observe({ entryTypes: ["longtask"] }); window.__mut = 0; new MutationObserver(m => { window.__mut += m.length; }).observe(document.querySelector("article.primary-chart-panel"), { subtree: true, childList: true, attributes: true }); });
  const hits = panel.locator(".stacked-bar-group");
  for (let i = 0; i < 30; i++) { const b = await hits.nth(i).boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height - 20); await page.waitForTimeout(25); }
  const tipBox = await hits.nth(12).boundingBox();
  await page.mouse.move(tipBox.x + tipBox.width / 2, tipBox.y + tipBox.height - 20); await page.waitForTimeout(250);
  const cost = await page.evaluate(() => ({ long: window.__long.length, mutations: window.__mut }));
  const tip = await hits.nth(12).evaluate(g => { const t = g.querySelector("g.opacity-0"); return { opacity: getComputedStyle(t).opacity, text: t.textContent }; });
  ok(cost.long === 0 && cost.mutations === 0, "sweeping all bars: no long task, no DOM change", JSON.stringify(cost));
  ok(tip.opacity === "1" && /13 Sep|2026-09-13/.test(tip.text) && /tiket/.test(tip.text), "the hovered bar shows its styled tooltip (date, total, systems)", tip.text.slice(0, 80));
  await panel.screenshot({ path: OUT + "volume-hover.png" });
  await page.mouse.move(5, 5);

  // 2. recap: Total and Saat ini only, matching the tickets; the detail has five periods and a per-project table
  const cards = page.locator(".user-summary-card");
  const first = (await cards.first().innerText()).replace(/\s+/g, " ");
  ok(/total/i.test(first) && /saat ini/i.test(first) && !/bulan ini|tahun ini/i.test(first), "a recap card shows Total and Saat ini only", first);
  const expected = await page.evaluate(() => {
    const tickets = JSON.parse(sessionStorage.getItem("ctd.backendTickets.v1")).tickets;
    const today = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
    const d = new Date(today + "T00:00:00Z"); const monday = new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 864e5).toISOString().slice(0, 10);
    const per = {};
    for (const t of tickets) { if (!t.owner || t.owner === "—") continue; const p = per[t.owner] = per[t.owner] || { total: 0, year: 0, month: 0, week: 0, today: 0 }; p.total++; if ((t.date || "").startsWith(today.slice(0, 4))) p.year++; if ((t.date || "").startsWith(today.slice(0, 7))) p.month++; if (t.date >= monday && t.date <= today) p.week++; if (t.date === today) p.today++; }
    return per;
  });
  const cardTexts = await cards.allInnerTexts();
  let compared = 0; const wrong = [];
  for (const raw of cardTexts) {
    const text = raw.replace(/\s+/g, " ");
    const name = Object.keys(expected).find(n => text.includes(n)); if (!name) continue;
    const m = text.match(/([\d.]+)\s*Total\s*(\d+)\s*Saat ini/i); if (!m) { wrong.push("unparsed " + text); continue; }
    compared++;
    if (Number(m[1].replace(/\./g, "")) !== expected[name].total || Number(m[2]) !== expected[name].today) wrong.push(`${name}: ${m[1]}/${m[2]} vs ${expected[name].total}/${expected[name].today}`);
  }
  ok(compared >= 10 && !wrong.length, `recap totals match the tickets (${compared} people)`, wrong.slice(0, 2).join(" ; "));
  await page.locator("article.user-summary-panel").screenshot({ path: OUT + "recap-cards.png" });
  const target = Object.keys(expected).sort((a, b) => expected[b].total - expected[a].total)[0];
  await cards.filter({ hasText: target }).first().click();
  const dialog = page.getByRole("dialog", { name: new RegExp(`Detail tiket ${target}`) });
  await dialog.waitFor();
  const tiles = (await dialog.locator(".user-period-card").allInnerTexts()).map(t => t.replace(/\s+/g, " ").trim());
  const want = expected[target];
  const shown = Object.fromEntries(tiles.map(t => { const m = t.match(/^(TOTAL|TAHUN INI|BULAN INI|MINGGU INI|SAAT INI) ([\d.]+)/i); return m ? [m[1].toUpperCase(), Number(m[2].replace(/\./g, ""))] : [t, NaN]; }));
  ok(tiles.length === 5 && shown.TOTAL === want.total && shown["TAHUN INI"] === want.year && shown["BULAN INI"] === want.month && shown["MINGGU INI"] === want.week && shown["SAAT INI"] === want.today, `the detail shows Total, Tahun, Bulan, Minggu and Saat Ini for ${target}`, JSON.stringify({ shown, want }));
  const rows = await dialog.locator("table tbody tr").count();
  ok(rows > 0, "and a per-project breakdown table", `${rows} projects`);
  await dialog.screenshot({ path: OUT + "recap-detail.png" });
  await page.keyboard.press("Escape"); await page.waitForTimeout(400);

  // 3. month over month on the dashboard
  await page.getByRole("button", { name: /Bulan Lalu vs Bulan Ini/ }).first().click(); await page.waitForTimeout(1200);
  const mom = page.locator(".mom-chart-container").first();
  const head = (await mom.locator(".mom-subview-toggle-bar").innerText()).replace(/\s+/g, " ");
  ok(/Oktober 2026/.test(head) && /September 2026/.test(head) && /tanggal 1–30/.test(head), "MoM names both months and compares the same days", head);
  const svg = mom.locator("svg[role=img]");
  const svgText = await svg.textContent();
  ok(/Hari ini · tgl 30/.test(svgText), "the trend marks today; this month's line stops there");
  const sb = await svg.boundingBox();
  await page.mouse.move(sb.x + sb.width * 0.5, sb.y + sb.height * 0.5); await page.waitForTimeout(300);
  const tipText = await mom.locator("[role=status]").first().innerText().catch(() => "");
  ok(/Tanggal \d+/.test(tipText) && /Okt/.test(tipText) && /Sep/.test(tipText), "hovering the trend shows both months for that date", tipText.replace(/\s+/g, " "));
  await page.locator("article.primary-chart-panel").screenshot({ path: OUT + "mom-trend.png" });
  await page.mouse.move(5, 5);
  await mom.getByRole("button", { name: /Per Sistem/ }).click(); await page.waitForTimeout(600);
  await page.locator("article.primary-chart-panel").screenshot({ path: OUT + "mom-system.png" });
  ok(/Sistem/.test(await page.locator("article.primary-chart-panel").innerText()), "the per-system comparison renders");

  // expanded panel
  await page.goto(`${BASE}/dashboard?date=2026-09-01..2026-09-30&panel=ticket-mom`, { waitUntil: "networkidle", timeout: 120000 });
  await page.locator(".mom-chart-container").waitFor({ timeout: 90000 }); await page.waitForTimeout(1500);
  // the subtitle sits in the panel header, outside its <main>: read the whole page
  const viewerText = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  console.log("      viewer:", (viewerText.match(/September 2026 vs Oktober 2026[^A-Z]{0,20}/i) || ["(no subtitle)"])[0], "|", (viewerText.match(/tiket dibuka.{0,30}/i) || ["(no cards)"])[0]);
  ok(/tiket dibuka/i.test(viewerText) && /kepatuhan sla/i.test(viewerText) && /September 2026 vs Oktober 2026/.test(viewerText), "the expanded panel has the summary cards and a subtitle from the data");
  await page.screenshot({ path: OUT + "mom-view.png" });

  // 4. three severities: dashboard, tickets, master data
  await page.goto(`${BASE}/dashboard?date=2026-09-01..2026-09-30`, { waitUntil: "networkidle", timeout: 120000 }); await ready(page);
  const dashText = await page.locator("main").last().innerText();
  ok(!/\bCritical\b|CRIT/.test(dashText), "the dashboard shows no Critical severity");
  const sevCards = await page.locator(".priority-spectrum-list > div").count();
  ok(sevCards === 3, "the severity distribution has three cards", String(sevCards));
  await page.locator(".priority-spectrum-list").first().scrollIntoViewIfNeeded();
  await page.locator(".priority-spectrum-list").first().locator("xpath=ancestor::article[1]").screenshot({ path: OUT + "severity.png" });
  await page.getByRole("link", { name: "Tickets", exact: true }).first().click();
  await page.waitForURL(u => u.pathname === "/tickets"); await page.waitForTimeout(2500);
  const ticketsText = await page.locator("main").last().innerText();
  ok(!/\bCritical\b/.test(ticketsText), "the tickets page shows no Critical");
  await page.goto(`${BASE}/master-data?group=catalog&tab=severities`, { waitUntil: "networkidle", timeout: 120000 }); await page.waitForTimeout(2500);
  const mdText = await page.locator("main").last().innerText();
  ok(!/Critical \(Kritis\)/.test(mdText) && /High \(Tinggi\)/.test(mdText) && /Low \(Rendah\)/.test(mdText), "Master Data lists High, Medium and Low only");
  await page.screenshot({ path: OUT + "master-severities.png" });
  const errors = page.errors.filter(e => !/favicon|401|Failed to load resource|preload/.test(e));
  ok(errors.length === 0, "no console errors", JSON.stringify(errors.slice(0, 3)));
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.replace(/\s+/g, " ").slice(0, 500)); process.exitCode = 1; });
