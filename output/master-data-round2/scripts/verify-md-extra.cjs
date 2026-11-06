// CLS of the Master Data tabs, damaged / blocked storage, a new category reaching the ticket filter in another tab, 20 open/close cycles.
const { launch, open, BASE } = require("./pw.cjs");
const ok = (cond, label, extra = "") => { console.log(`${cond ? "PASS" : "FAIL"}  ${label}${extra ? "  " + extra : ""}`); if (!cond) process.exitCode = 1; };
const TABS = [["services", "organizations"], ["services", "projects"], ["services", "systems"], ["tickets", "categories"], ["tickets", "severities"], ["team", "people"], ["team", "roles"]];
(async () => {
  const browser = await launch();

  // A. CLS, skeleton included, at both sizes
  for (const [w, h, touch] of [[1440, 900, false], [390, 844, true]]) {
    const page = await open(browser, { width: w, height: h, touch });
    await page.addInitScript(() => {
      window.__cls = 0;
      // the shell's top bar (client switcher / shift badge) settles by itself on a cold load; only shifts inside the page content are counted
      new PerformanceObserver(list => { for (const entry of list.getEntries()) if (!entry.hadRecentInput && entry.sources.some(source => !source.node?.closest?.(".app-topbar-actions, .app-topbar") && source.node?.nodeName !== "#text" || source.node?.parentElement && !source.node.parentElement.closest(".app-topbar-actions, .app-topbar"))) window.__cls += entry.value; }).observe({ type: "layout-shift", buffered: true });
    });
    let worst = 0;
    for (const [group, tab] of TABS) {
      await page.goto(`${BASE}/master-data?group=${group}&tab=${tab}&mock=instant`, { waitUntil: "load" });
      await page.waitForSelector("[data-master-id]:visible", { timeout: 15000 });
      await page.waitForTimeout(1200);
      worst = Math.max(worst, await page.evaluate(() => window.__cls));
    }
    ok(worst < 0.001, `${w}px: CLS across all seven tabs`, worst.toFixed(4));
    await page.context().close();
  }

  // B. storage: damaged data falls back to the seed with a warning; blocked storage says "Hanya sesi ini"
  {
    const page = await open(browser, { width: 1440, height: 900 });
    await page.goto(`${BASE}/master-data?group=tickets&tab=categories&mock=instant`, { waitUntil: "networkidle" });
    await page.evaluate(() => localStorage.setItem("ctd.masterData.v2", '{"version":2,"categories":"rusak"'));
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector("[data-master-id]:visible"); await page.waitForTimeout(600);
    const rows = await page.locator("tbody tr").count();
    ok(rows === 7, "damaged storage: the list falls back to the 7 seed categories", `${rows} rows`);
    ok(await page.evaluate(() => !!localStorage.getItem("ctd.masterData.invalid.v1")), "damaged storage: the broken copy is kept aside");
    await page.evaluate(() => { localStorage.removeItem("ctd.masterData.v2"); localStorage.removeItem("ctd.masterData.invalid.v1"); });
    await page.context().close();
    const blocked = await open(browser, { width: 1440, height: 900 });
    await blocked.addInitScript(() => {
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) { if (String(key).startsWith("ctd.masterData")) throw new DOMException("blocked", "QuotaExceededError"); return set.call(this, key, value); };
    });
    await blocked.goto(`${BASE}/master-data?group=tickets&tab=categories&mock=instant`, { waitUntil: "networkidle" });
    await blocked.waitForSelector("[data-master-id]:visible"); await blocked.waitForTimeout(800);
    ok(/Hanya sesi ini/.test(await blocked.locator("body").innerText()), "blocked storage: the header says 'Hanya sesi ini'");
    await blocked.getByRole("button", { name: /^Ubah Maintenance/ }).first().click();
    await blocked.waitForSelector("form");
    await blocked.getByRole("radio", { name: "Merah", exact: true }).click();
    await blocked.getByRole("button", { name: "Simpan", exact: true }).click();
    await blocked.waitForTimeout(800);
    ok(/Hanya sesi ini/.test(await blocked.locator("body").innerText()), "blocked storage: still works for the session after a save");
    await blocked.context().close();
  }

  // C. a new category reaches the ticket filter of another tab without a reload; inactive ones leave it
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } }); await require("./pw.cjs").seedAuth(context);
    await context.addInitScript(() => { window.__TEST_CLOCK__ = "2026-10-28T03:00:00.000Z"; });
    const a = await context.newPage(), b = await context.newPage();
    await a.goto(`${BASE}/master-data?group=tickets&tab=categories&mock=instant`, { waitUntil: "networkidle" });
    await a.evaluate(() => localStorage.removeItem("ctd.masterData.v2"));
    await a.reload({ waitUntil: "networkidle" });
    await b.goto(`${BASE}/tickets?mock=instant`, { waitUntil: "networkidle" });
    await b.waitForTimeout(1500);
    const typeOptions = async () => {
      await b.locator("button[data-select-trigger]", { hasText: "All Types" }).first().click();
      const options = await b.getByRole("option").allInnerTexts();
      await b.keyboard.press("Escape");
      return options.map(text => text.trim());
    };
    const before = await typeOptions();
    await a.waitForSelector("[data-master-id]:visible");
    await a.getByRole("button", { name: "Tambah Kategori" }).click();
    await a.waitForSelector("form");
    await a.getByLabel("Nama", { exact: false }).first().fill("Gangguan Jaringan");
    await a.getByRole("button", { name: "Simpan", exact: true }).click();
    await a.waitForSelector("form", { state: "detached" });
    await b.waitForTimeout(1500);
    const after = await typeOptions();
    ok(!before.includes("Gangguan Jaringan") && after.includes("Gangguan Jaringan"), "ticket filter in the other tab lists the new category without reload", `${before.length} -> ${after.length} options`);
    // deactivate it: the picker no longer offers it
    await a.locator("tbody tr", { hasText: "Gangguan Jaringan" }).getByRole("button", { name: /^Aksi/ }).click();
    await a.getByRole("menuitem", { name: /Nonaktifkan/ }).click();
    await a.waitForTimeout(600);
    await a.getByRole("button", { name: /Ya|Nonaktifkan|Simpan/ }).last().click().catch(() => {});
    await a.waitForTimeout(1200);
    await a.evaluate(() => localStorage.removeItem("ctd.masterData.v2"));
    await context.close();
  }

  // D. 20 quick open/close cycles of the drawer, the form and the order sheet
  {
    const page = await open(browser, { width: 1440, height: 900 });
    await page.goto(`${BASE}/master-data?group=tickets&tab=categories&mock=instant`, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-master-id]:visible"); await page.waitForTimeout(500);
    for (let i = 0; i < 20; i++) {
      await page.getByRole("button", { name: /^Detail Maintenance/ }).first().click();
      await page.waitForSelector("[role=dialog]", { timeout: 4000 });
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Tambah Kategori" }).click();
      await page.waitForSelector("form", { timeout: 4000 });
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Atur urutan kategori" }).click();
      await page.waitForSelector("[data-sheet-id=category-order]", { timeout: 4000 });
      await page.keyboard.press("Escape");
    }
    await page.waitForTimeout(600);
    const state = await page.evaluate(() => ({ body: getComputedStyle(document.body).overflow, html: getComputedStyle(document.documentElement).overflow, dialogs: document.querySelectorAll("[role=dialog]").length, inert: document.querySelectorAll("[inert]").length, hidden: document.querySelector("main")?.getAttribute("aria-hidden") }));
    ok(state.body !== "hidden" && state.html !== "hidden" && state.dialogs === 0 && state.inert === 0 && state.hidden !== "true", "after 20 cycles of drawer, form and sheet: page scrolls, nothing left open", JSON.stringify(state));
    const before = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 400); await page.waitForTimeout(300);
    ok((await page.evaluate(() => window.scrollY)) > before, "wheel scrolls the page after the cycles");
    ok(!page.errors.filter(e => !/preload/.test(e)).length, "no console errors or hydration warnings", JSON.stringify(page.errors.filter(e => !/preload/.test(e)).slice(0, 3)));
    await page.context().close();
  }
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.replace(/\s+/g, " ").slice(0, 300)); process.exitCode = 1; });
