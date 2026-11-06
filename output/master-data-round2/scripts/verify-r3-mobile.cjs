// Round 3 on phones and tablets: header layout, cards with the entity cell, drawer and date field touch targets.
const { launch, open, BASE } = require("./pw.cjs");
const ok = (cond, label, extra = "") => { console.log(`${cond ? "PASS" : "FAIL"}  ${label}${extra ? "  " + extra : ""}`); if (!cond) process.exitCode = 1; };
const OUT = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/master-data-round2/r3/";
const go = async (page, group, tab) => { await page.goto(`${BASE}/master-data?group=${group}&tab=${tab}&mock=instant`, { waitUntil: "networkidle" }); await page.waitForSelector("[data-master-id]:visible"); await page.waitForTimeout(500); };
const small = (scope) => scope.evaluate(root => {
  const out = [];
  root.querySelectorAll("button, a[href], input, [role=tab], [role=gridcell], [role=option]").forEach(el => {
    if (el.offsetParent === null) return;
    const r = el.getBoundingClientRect();
    if (r.width && r.height && (r.width < 43.5 || r.height < 43.5) && r.bottom > 0 && r.top < innerHeight) out.push(`${(el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 24)} ${Math.round(r.width)}x${Math.round(r.height)}`);
  });
  return [...new Set(out)];
});
(async () => {
  const browser = await launch();
  // 390: header
  let page = await open(browser, { width: 390, height: 844, touch: true });
  page.setDefaultTimeout(9000);
  await go(page, "services", "systems");
  const h = await page.evaluate(() => {
    const header = document.querySelector("[data-master-data-v2] header"), title = header.querySelector("h1").getBoundingClientRect();
    const stats = [...header.querySelectorAll("[role=group] > *")].map(s => s.getBoundingClientRect());
    const caption = [...header.querySelectorAll("p")].find(p => p.offsetParent !== null && /Diperbarui/.test(p.textContent)).getBoundingClientRect();
    return { h1: Math.round(title.height), ys: [...new Set(stats.map(s => Math.round(s.y)))], widths: stats.map(s => Math.round(s.width)), numSize: getComputedStyle(header.querySelector("[role=group] span")).fontSize, captionBelow: caption.y > Math.max(...stats.map(s => s.bottom)) - 2, hscroll: document.documentElement.scrollWidth > innerWidth };
  });
  ok(h.h1 <= 32 && h.ys.length === 1 && h.captionBelow && !h.hscroll, "390: title one line, three stats in one row, caption below, no h-scroll", JSON.stringify(h));
  ok(parseFloat(h.numSize) >= 18 && parseFloat(h.numSize) <= 20, "390: stat numbers are 18-20px", h.numSize);
  await page.screenshot({ path: OUT + "header-layanan-mobile2-after.png" });
  // cards carry the entity cell
  const cards = await page.evaluate(() => { const c = [...document.querySelectorAll("article[data-master-id]")].filter(a => a.offsetParent !== null); return { n: c.length, withTile: c.filter(a => a.querySelectorAll("svg").length >= 2).length }; });
  ok(cards.n > 0 && cards.withTile === cards.n, "390: Sistem cards show the Proyek with its no-image tile", JSON.stringify(cards));
  await go(page, "services", "projects");
  const cards2 = await page.evaluate(() => { const c = [...document.querySelectorAll("article[data-master-id]")].filter(a => a.offsetParent !== null); return { n: c.length, withTile: c.filter(a => a.querySelectorAll("svg").length >= 2).length }; });
  ok(cards2.n > 0 && cards2.withTile === cards2.n, "390: Proyek cards show the Organisasi with its tile", JSON.stringify(cards2));
  // drawer on a phone
  await go(page, "tickets", "severities");
  await page.getByRole("button", { name: /^Detail Critical/ }).first().click();
  await page.waitForSelector("section[role=dialog]"); await page.waitForTimeout(600);
  const dlg = page.locator("section[role=dialog]").last();
  const tooSmall = await small(await dlg.elementHandle());
  ok(tooSmall.length === 0, "390: every drawer control is >= 44px", tooSmall.join("; "));
  await page.screenshot({ path: OUT + "drawer-severity-mobile-after.png" });
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  await page.context().close();

  // 768 tablet header
  page = await open(browser, { width: 768, height: 900 });
  await go(page, "services", "systems");
  const t = await page.evaluate(() => { const header = document.querySelector("[data-master-data-v2] header"); const g = header.querySelector("[role=group]").getBoundingClientRect(); const stats = [...header.querySelectorAll("[role=group] > *")].map(s => Math.round(s.getBoundingClientRect().width)); const title = header.querySelector("h1").getBoundingClientRect(); return { below: g.y > title.bottom, widths: stats, hscroll: document.documentElement.scrollWidth > innerWidth }; });
  ok(t.below && new Set(t.widths).size === 1 && !t.hscroll, "768: stats move to a second row, three equal columns", JSON.stringify(t));
  await page.screenshot({ path: OUT + "header-layanan-tablet-after.png" });
  await page.context().close();

  // phone: the date field
  page = await open(browser, { width: 390, height: 844, touch: true });
  page.setDefaultTimeout(9000);
  await go(page, "team", "people");
  await page.getByRole("button", { name: "Tambah Personel" }).first().click();
  await page.waitForSelector("form"); await page.waitForTimeout(500);
  const field = await page.getByLabel("Tanggal bergabung", { exact: false }).first().locator("xpath=..").boundingBox();
  const cal = await page.getByRole("button", { name: "Buka kalender" }).boundingBox();
  ok(field.height >= 43.5 && cal.width >= 43.5 && cal.height >= 43.5, "390: date input 44px tall, calendar button 44px", `${field.height} / ${cal.width}x${cal.height}`);
  await page.getByRole("button", { name: "Buka kalender" }).click();
  await page.waitForSelector("[data-sheet-id=date-field]"); await page.waitForTimeout(400);
  const sheetSmall = await small(await page.locator("[data-sheet-id=date-field]").elementHandle());
  ok(sheetSmall.filter(x => !/ 40x40$/.test(x)).length === 0, "390: date sheet controls are 44px (month arrows, titles, Hari ini) or 40px (days, the shared sheet close button)", sheetSmall.slice(0, 5).join("; "));
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  ok(await page.locator("form").count() === 1 && await page.locator("[data-sheet-id=date-field]").count() === 0, "390: Esc closes the sheet only");
  await page.context().close();

  // landscape phone: the popover fits a 390px-high screen and is usable
  page = await open(browser, { width: 844, height: 390, touch: true });
  page.setDefaultTimeout(9000);
  await go(page, "team", "people");
  await page.getByRole("button", { name: "Tambah Personel" }).first().click();
  await page.waitForSelector("form"); await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Buka kalender" }).scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Buka kalender" }).click();
  const pop = page.getByRole("dialog", { name: "Pilih tanggal" }); await pop.waitFor(); await page.waitForTimeout(250);
  const pb = await pop.boundingBox();
  ok(pb.y >= 0 && pb.y + pb.height <= 390, "844x390: the popover stays inside the screen (scrolls inside when needed)", `y ${Math.round(pb.y)}..${Math.round(pb.y + pb.height)}`);
  const hasToday = await pop.getByRole("button", { name: "Hari ini" }).evaluate(el => { el.scrollIntoView({ block: "nearest" }); const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= 390; });
  ok(hasToday, "844x390: Hari ini can be reached");
  await page.screenshot({ path: OUT + "tanggal-landscape-after.png" });
  await page.keyboard.press("Escape");
  await page.context().close();
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.replace(/\s+/g, " ").slice(0, 300)); process.exitCode = 1; });
