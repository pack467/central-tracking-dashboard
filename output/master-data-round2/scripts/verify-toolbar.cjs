// Toolbar fits its frame: right edge of the last control <= right edge of the toolbar; one row where there is room.
const { launch, open, BASE } = require("./pw.cjs");
(async () => {
  const browser = await launch();
  for (const width of [1920, 1440, 1280, 1180]) {
    const page = await open(browser, { width, height: 900 });
    for (const [group, tab] of [["services", "organizations"], ["services", "projects"], ["services", "systems"], ["tickets", "categories"], ["team", "people"], ["team", "roles"]]) {
      await page.goto(`${BASE}/master-data?group=${group}&tab=${tab}&mock=instant`, { waitUntil: "networkidle" });
      await page.waitForSelector("[data-master-id]:visible"); await page.waitForTimeout(300);
      const r = await page.evaluate(() => {
        const bar = document.querySelector("div[class*='sticky'][class*='top-[52px]']");
        const frame = bar.getBoundingClientRect();
        const items = [...bar.querySelectorAll("input[type=search], button[data-select-trigger], button")].filter(el => el.offsetParent !== null && !el.closest("[role=menu]")).map(el => el.getBoundingClientRect());
        const rows = new Set(items.map(i => Math.round(i.top + i.height / 2)));
        return { rows: rows.size, overflow: Math.max(...items.map(i => i.right)) - frame.right, height: Math.round(frame.height), hscroll: document.documentElement.scrollWidth > innerWidth };
      });
      console.log(`${width} ${tab.padEnd(14)} rows ${r.rows}  overflow ${r.overflow.toFixed(1)}px  bar ${r.height}px  hscroll ${r.hscroll}`);
    }
    await page.context().close();
  }
  await browser.close();
})().catch(e => console.log("FAIL", e.message));
