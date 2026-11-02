// Hovering anything in Master Data must not move it, scale it, or add a shadow.
const { launch, open, BASE } = require("./pw.cjs");
(async () => {
  const browser = await launch();
  const page = await open(browser, { width: 1440, height: 900 });
  let bad = 0, checked = 0;
  const probe = async (label, locator) => {
    const el = locator.first(); if (!(await el.count())) { console.log("SKIP", label); return; }
    await page.mouse.move(5, 5); await page.waitForTimeout(250);
    const read = () => el.evaluate(n => { const r = n.getBoundingClientRect(), c = getComputedStyle(n); return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), transform: c.transform, shadow: c.boxShadow, translate: c.translate, scale: c.scale }; });
    const before = await read();
    await el.hover(); await page.waitForTimeout(400);
    const after = await read();
    const same = JSON.stringify(before) === JSON.stringify(after); checked++;
    if (!same) { bad++; console.log("FAIL", label, JSON.stringify(before), JSON.stringify(after)); } else console.log("PASS", label);
  };
  for (const [q, items] of [
    ["group=services&tab=organizations", [["stat tile", page.locator('button[aria-label*="Buka daftar"]')], ["table row", page.locator("tbody tr")], ["tab", page.locator('button[role="tab"]:not([aria-selected="true"]):not([disabled])')], ["add button", page.getByRole("button", { name: /Tambah Organisasi/ })], ["filter select", page.locator("#master-filter-status")], ["chip/reset", page.locator("main a, nav a")]]],
    ["group=team&tab=people", [["people row", page.locator("tbody tr")]]],
    ["group=team&tab=roles", [["role row", page.locator("tbody tr")]]],
  ]) {
    await page.goto(`${BASE}/master-data?${q}&mock=instant`, { waitUntil: "networkidle" }); await page.waitForTimeout(600);
    for (const [label, loc] of items) await probe(label, loc);
  }
  await page.goto(`${BASE}/master-data?group=services&tab=organizations&mock=instant`, { waitUntil: "networkidle" }); await page.waitForSelector("tbody tr");
  await page.locator("tbody tr").first().click(); await page.getByRole("dialog").waitFor(); await page.waitForTimeout(600);
  await probe("drawer Ubah data button", page.getByRole("button", { name: "Ubah data" }));
  await probe("drawer tab", page.getByRole("dialog").getByRole("tab").nth(1));
  await page.keyboard.press("Escape");
    console.log(bad ? `${bad} of ${checked} moved on hover` : `no movement/shadow/scale on hover (${checked} checked)`);
  // static: no hover lift classes anywhere in master-data sources
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
