// Stage 3 audit: where does a mouse click or an automatic focus draw an outline box in the dashboard, its panel viewers and modals?
const { launch, open, BASE } = require("./pw.cjs");
const PANELS = ["ticket-volume", "ticket-mom", "severity-distribution", "category-distribution", "shift-traffic", "resolution-trend", "user-recap"];
const ring = el => {
  const cs = getComputedStyle(el), r = el.getBoundingClientRect();
  const painted = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0 && cs.outlineColor !== "rgba(0, 0, 0, 0)";
  const path = []; for (let n = el; n && path.length < 3; n = n.parentElement) path.unshift(n.tagName.toLowerCase() + (n.getAttribute("role") ? `[role=${n.getAttribute("role")}]` : "") + (n.getAttribute("aria-label") ? `("${n.getAttribute("aria-label").slice(0, 28)}")` : ""));
  return { painted, outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor.slice(0, 24)}`, size: `${Math.round(r.width)}x${Math.round(r.height)}`, who: path.join(" > "), focusVisible: el.matches(":focus-visible") };
};
const report = [];
async function mark(page) {
  return page.evaluate(() => [...document.querySelectorAll('[tabindex="0"]')].filter(el => !/^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(el.tagName) && el.getBoundingClientRect().width > 0 && !el.closest("a[href]"))
    .map((el, i) => { el.setAttribute("data-audit", String(i)); return i; }));
}
async function sweepClicks(page, where, url) {
  let targets = await mark(page);
  const seen = new Set();
  for (const i of targets.slice(0, 40)) {
    try {
      const loc = page.locator(`[data-audit="${i}"]`);
      if (!(await loc.count())) { await page.goto(url, { waitUntil: "networkidle" }); await page.waitForTimeout(700); await mark(page); }
      await loc.scrollIntoViewIfNeeded({ timeout: 2000 });
      const box = await loc.boundingBox();
      if (!box) continue;
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(80);
      const state = await page.evaluate(`(${ring})(document.activeElement)`);
      const key = state.who + state.painted;
      if (state.painted && !seen.has(key)) { seen.add(key); report.push({ where, kind: "mouse click leaves an outline", ...state }); }
      if (!page.url().includes(url.split("?")[0].split("localhost:3000")[1] || "/")) { await page.goto(url, { waitUntil: "networkidle" }); await page.waitForTimeout(700); await mark(page); }
    } catch { await page.goto(url, { waitUntil: "networkidle" }).catch(() => {}); await page.waitForTimeout(700); await mark(page).catch(() => {}); }
  }
  return targets.length;
}
(async () => {
  const browser = await launch();
  const page = await open(browser);
  // 1. the dashboard itself
  await page.goto(`${BASE}/dashboard?mock=instant`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  console.log("dashboard tabindex targets:", await sweepClicks(page, "/dashboard", `${BASE}/dashboard?mock=instant`));
  // 2. every panel viewer
  for (const id of PANELS) {
    await page.goto(`${BASE}/dashboard?panel=${id}&mock=instant`, { waitUntil: "networkidle" });
    await page.waitForTimeout(900);
    const first = await page.evaluate(`(${ring})(document.activeElement)`);
    if (first.painted && !/^body/.test(first.who)) report.push({ where: `panel ${id}`, kind: "automatic focus on open", ...first });
    console.log(id, "targets:", await sweepClicks(page, `panel ${id}`, `${BASE}/dashboard?panel=${id}&mock=instant`));
  }
  // 3. modals that focus a field on open
  await page.goto(`${BASE}/dashboard?mock=instant`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const opens = [
    ["Memo", async () => page.getByRole("button", { name: /Memo & Catatan Shift/ }).first().click()],
    ["Command palette (Ctrl+K)", async () => page.keyboard.press("Control+k")],
    ["Tiket baru (FAB)", async () => page.locator(".fab-new-ticket, [aria-label*='Tiket Baru' i], [aria-label*='tiket baru' i]").first().click()],
    ["Siapkan Handover", async () => page.getByRole("button", { name: /Siapkan Handover/ }).first().click()],
  ];
  for (const [name, act] of opens) {
    try {
      await act(); await page.waitForTimeout(700);
      const state = await page.evaluate(`(${ring})(document.activeElement)`);
      console.log(`modal ${name}: focused ${state.who} -> ${state.outline} (${state.size})`);
      if (state.painted && /^(textarea|input)/.test(state.who.split(" > ").pop())) report.push({ where: `modal ${name}`, kind: "automatic focus on open", ...state });
    } catch (e) { console.log(`modal ${name}: could not open (${e.message.split("\n")[0]})`); }
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    await page.goto(`${BASE}/dashboard?mock=instant`, { waitUntil: "networkidle" }); await page.waitForTimeout(800);
  }
  console.log("\nFINDINGS:", report.length ? "" : "none");
  for (const r of report) console.log(`- [${r.where}] ${r.kind}: ${r.who}  ${r.outline}  box ${r.size}  focus-visible=${r.focusVisible}`);
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.split("\n")[0]); process.exitCode = 1; });
