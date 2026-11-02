// Header at every size, 20 open/close cycles that include the date popover, CLS while switching tabs inside the page.
const { launch, open, BASE } = require("./pw.cjs");
const ok = (cond, label, extra = "") => { console.log(`${cond ? "PASS" : "FAIL"}  ${label}${extra ? "  " + extra : ""}`); if (!cond) process.exitCode = 1; };
(async () => {
  const browser = await launch();
  for (const [w, h, touch] of [[1920, 1080, false], [1440, 900, false], [1280, 800, false], [1024, 768, false], [768, 1024, false], [390, 844, true], [844, 390, true]]) {
    const page = await open(browser, { width: w, height: h, touch });
    let bad = [];
    for (const [group, tab] of [["services", "systems"], ["tickets", "categories"], ["team", "roles"]]) {
      await page.goto(`${BASE}/master-data?group=${group}&tab=${tab}&mock=instant`, { waitUntil: "networkidle" });
      await page.waitForSelector("[data-master-id]:visible"); await page.waitForTimeout(400);
      const r = await page.evaluate(() => { const hd = document.querySelector("[data-master-data-v2] header"), hr = hd.getBoundingClientRect(); const over = [...hd.querySelectorAll("*")].filter(e => e.offsetParent && e.getBoundingClientRect().right > hr.right + 0.5).length; return { hscroll: document.documentElement.scrollWidth > innerWidth, over, h: Math.round(hr.height) }; });
      if (r.hscroll || r.over) bad.push(`${tab} ${JSON.stringify(r)}`);
    }
    ok(!bad.length, `${w}x${h}: header fits (no h-scroll, nothing beyond the band)`, bad.join(" ; "));
    await page.context().close();
  }
  // 20 cycles
  const page = await open(browser, { width: 1440, height: 900 });
  page.setDefaultTimeout(8000);
  await page.goto(`${BASE}/master-data?group=team&tab=people&mock=instant`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-master-id]:visible"); await page.waitForTimeout(500);
  for (let i = 0; i < 20; i++) {
    await page.getByRole("button", { name: "Tambah Personel" }).first().click();
    await page.waitForSelector("form");
    await page.getByRole("button", { name: "Buka kalender" }).click();
    await page.getByRole("dialog", { name: "Pilih tanggal" }).waitFor();
    await page.keyboard.press("Escape");           // popover only
    await page.keyboard.press("Escape");           // the form
    await page.waitForSelector("form", { state: "detached" });
    await page.locator("[data-master-id]:visible").first().click({ position: { x: 60, y: 20 } });
    await page.waitForSelector("section[role=dialog]");
    await page.keyboard.press("Escape");
    await page.waitForSelector("section[role=dialog]", { state: "detached" });
  }
  await page.waitForTimeout(500);
  const st = await page.evaluate(() => ({ body: getComputedStyle(document.body).overflow, html: getComputedStyle(document.documentElement).overflow, dialogs: document.querySelectorAll("[role=dialog]").length, inert: document.querySelectorAll("[inert]").length }));
  ok(st.body !== "hidden" && st.html !== "hidden" && st.dialogs === 0 && st.inert === 0, "20 cycles of form + date popover + drawer: page scrolls, nothing left open", JSON.stringify(st));
  const y0 = await page.evaluate(() => window.scrollY); await page.mouse.wheel(0, 400); await page.waitForTimeout(300);
  ok((await page.evaluate(() => window.scrollY)) > y0, "wheel scrolls the page after the cycles");
  const errs = page.errors.filter(e => !/preload/.test(e));
  ok(!errs.length, "no console errors or hydration warnings", JSON.stringify(errs.slice(0, 3)));
  await page.context().close();
  // CLS while switching groups and tabs inside the app
  const p2 = await open(browser, { width: 1440, height: 900 });
  await p2.addInitScript(() => { window.__cls = 0; new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput && e.sources.some(s => s.node && s.node.closest && s.node.closest("[data-master-data-v2]"))) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true }); });
  await p2.goto(`${BASE}/master-data?group=services&tab=organizations&mock=instant`, { waitUntil: "networkidle" });
  await p2.waitForSelector("[data-master-id]:visible"); await p2.waitForTimeout(800);
  const clsStart = await p2.evaluate(() => window.__cls);
  for (const name of [/Referensi Tiket/, /Tim & Operasional/, /Organisasi & Layanan/, /Referensi Tiket/]) { await p2.getByRole("button", { name }).first().click().catch(() => {}); await p2.waitForTimeout(700); }
  const cls = await p2.evaluate(() => window.__cls);
  ok(cls - clsStart < 0.001, "CLS inside Master Data while switching groups (header numbers and caption included)", `${(cls - clsStart).toFixed(4)} (initial load ${clsStart.toFixed(4)})`);
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.replace(/\s+/g, " ").slice(0, 300)); process.exitCode = 1; });
