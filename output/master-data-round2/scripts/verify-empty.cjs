// Tiket Hari Ini with no tickets: centred in the card body, sizes, text, shifts. Also the normal state for comparison.
const { launch, ok, BASE } = require("./memo-helpers.cjs");
const { emptyStorage, emptyDashboard } = require("./empty-helpers.cjs");
const { open } = require("./pw.cjs");
const SHOTS = process.env.SHOT_DIR;

const measure = page => page.evaluate(() => {
  const status = [...document.querySelectorAll(".ops-empty-hint")].find(el => /tiket/i.test(el.textContent));
  if (!status) return null;
  const card = status.closest("article"), body = card.querySelector("[data-ops-body]");
  const cr = card.getBoundingClientRect(), br = body.getBoundingClientRect();
  const range = document.createRange(); range.selectNodeContents(status.querySelector("div"));
  const text = range.getBoundingClientRect(), icon = status.querySelector("span").getBoundingClientRect(), group = new DOMRect(Math.min(icon.left, text.left), icon.top, Math.max(icon.right, text.right) - Math.min(icon.left, text.left), text.bottom - icon.top);
  const title = status.querySelector("p"), desc = status.querySelectorAll("p")[1];
  return {
    card: [Math.round(cr.width), Math.round(cr.height)],
    dx: Math.abs((group.left + group.width / 2) - (cr.left + cr.width / 2)),
    dyBody: Math.abs((group.top + group.height / 2) - (br.top + br.height / 2)),
    dyCard: (group.top + group.height / 2) - (cr.top + cr.height / 2),
    icon: [Math.round(icon.width), Math.round(icon.height)], textWidth: Math.round(text.width),
    titleSize: parseFloat(getComputedStyle(title).fontSize), descSize: desc ? parseFloat(getComputedStyle(desc).fontSize) : 0,
    gap: Math.round(text.top - icon.bottom), overlap: icon.bottom > text.top,
    hscroll: document.documentElement.scrollWidth > innerWidth + 1, title: title.textContent, desc: desc?.textContent,
  };
});

(async () => {
  const browser = await launch();
  const state = await emptyStorage(browser);
  for (const [name, w, h, touch] of [["1920", 1920, 1080, false], ["1440", 1440, 900, false], ["1024", 1024, 768, false], ["768", 768, 1024, true], ["390", 390, 844, true]]) {
    const page = await emptyDashboard(browser, state, { width: w, height: h, touch });
    await page.evaluate(() => { window.__shift = 0; new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput && e.sources.some(s => s.node && s.node.parentElement && s.node.parentElement.closest(".ops-today-panel"))) window.__shift += e.value; }).observe({ type: "layout-shift", buffered: false }); });
    await page.waitForTimeout(500);
    const m = await measure(page);
    if (!m) { ok(false, `${name}: the empty state is shown`); await page.context().close(); continue; }
    ok(m.dx <= 2, `${name}: centred horizontally in the card (off by ${m.dx.toFixed(1)}px)`);
    ok(m.dyBody <= 2, `${name}: centred vertically in the card body (off by ${m.dyBody.toFixed(1)}px; against the whole card incl. header ${m.dyCard.toFixed(0)}px)`);
    ok(m.icon.join("x") === "48x48" && !m.overlap && m.gap >= 8 && m.gap <= 14, `${name}: 48px icon, ${m.gap}px gap, icon does not touch the text`);
    ok(m.textWidth <= 262 && m.titleSize >= 15 && m.descSize >= 12, `${name}: text ${m.textWidth}px wide, title ${m.titleSize}px, line ${m.descSize}px`);
    ok(!m.hscroll && await page.evaluate(() => window.__shift) === 0, `${name}: no horizontal scroll, no layout shift in the card (card ${m.card.join("x")})`);
    if (w === 390) ok(m.card[1] >= 160 && m.card[1] - 51 >= 200, `${name}: not squashed on a phone (card ${m.card[1]}px)`);
    await page.locator(".ops-today-panel").first().screenshot({ path: `${SHOTS}/tiket-kosong-${name}-after.png` });
    console.log(`  ${name}: "${m.title}" / "${m.desc}"`);
    await page.context().close();
  }
  // contrast of the empty state text on its background
  const page = await emptyDashboard(browser, state);
  const ratios = await page.evaluate(() => {
    const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
    const px = document.createElement("canvas").getContext("2d", { willReadFrequently: true }); px.canvas.width = px.canvas.height = 1;
    const rgb = css => { px.clearRect(0, 0, 1, 1); px.fillStyle = css; px.fillRect(0, 0, 1, 1); const d = px.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]]; };
    const back = rgb("#1e293b"), ratio = (fg, bg) => { const a = lum(fg), b = lum(bg); return Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100; };
    const status = document.querySelector(".ops-empty-hint"), ps = status.querySelectorAll("p"), icon = status.querySelector("span");
    return { title: ratio(rgb(getComputedStyle(ps[0]).color), back), line: ratio(rgb(getComputedStyle(ps[1]).color), back), icon: ratio(rgb(getComputedStyle(icon).color), rgb("#243a3a")) };
  });
  console.log("  contrast", JSON.stringify(ratios));
  ok(Math.min(ratios.title, ratios.line) >= 4.5, `text contrast ${Math.min(ratios.title, ratios.line)}:1 or better`);
  console.log("errors:", page.errors.filter(e => !/preload|Weekly report/.test(e)));
  await page.context().close();
  // the normal state is untouched: tickets are listed and the card has its usual height
  const normal = await open(browser, { width: 1440, height: 900 });
  await normal.goto(`${BASE}/dashboard?mock=instant`, { waitUntil: "networkidle" });
  await normal.waitForTimeout(1500);
  ok(await normal.locator(".ops-empty-hint").count() === 0 && await normal.locator("[role=list][aria-label='Tiket hari ini']").count() === 1, "with tickets the card shows the list, no empty state");
  await normal.locator(".ops-today-panel").first().screenshot({ path: `${SHOTS}/tiket-normal-1440-after.png` });
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.split("\n")[0]); process.exitCode = 1; });
