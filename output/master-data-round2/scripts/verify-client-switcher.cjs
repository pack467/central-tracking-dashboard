const { launch, open, BASE } = require("./pw.cjs");
(async () => {
  const b = await launch();
  for (const [w, h, touch] of [[1440, 900, false], [390, 844, true], [360, 740, true]]) {
    const p = await open(b, { width: w, height: h, touch }); p.setDefaultTimeout(8000);
    await p.goto(`${BASE}/master-data?group=services&tab=organizations&mock=instant`, { waitUntil: "networkidle" });
    await p.waitForSelector("[data-master-id]:visible"); await p.waitForTimeout(500);
    const read = () => p.evaluate(() => { const t = document.querySelector("#active-client-select"); const n = t.querySelector(".app-client-name"); const ic = t.querySelector("[data-select-icon]"); const bar = document.querySelector(".app-topbar-actions"); return { text: n.textContent, clipped: n.scrollWidth > n.clientWidth + 1, icon: getComputedStyle(ic).color, w: Math.round(t.getBoundingClientRect().width), hscroll: document.documentElement.scrollWidth > innerWidth, barOverflow: bar ? Math.round(bar.scrollWidth - bar.clientWidth) : 0 }; });
    const names = [];
    const count = await (async () => { await p.locator("#active-client-select").click(); const n = await p.getByRole("option").count(); await p.keyboard.press("Escape"); return n; })();
    for (let i = 0; i < count; i++) {
      await p.locator("#active-client-select").click();
      await p.getByRole("option").nth(i).click(); await p.waitForTimeout(500);
      names.push(await read());
    }
    const bad = names.filter(r => r.clipped || r.hscroll || r.icon !== "oklch(0.746 0.16 232.661)" && r.icon !== "rgb(56, 189, 248)");
    console.log(`${bad.length ? "FAIL" : "PASS"}  ${w}px: ${count} clients, all coloured, none clipped`, JSON.stringify(names.map(r => `${r.text}${r.clipped ? "!" : ""} ${r.w}px`)), bad.length ? JSON.stringify(bad) : "");
    if (bad.length) process.exitCode = 1;
    await p.screenshot({ path: `../r3/client-switcher-${w}.png`, clip: { x: 0, y: 0, width: w, height: 70 } });
    await p.context().close();
  }
  await b.close();
})().catch(e => { console.log("FAIL", e.message.replace(/\s+/g, " ").slice(0, 250)); process.exitCode = 1; });
