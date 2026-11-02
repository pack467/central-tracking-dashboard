// Menu behaviour after the shared hook: focus moves in, arrows cycle, Escape closes and returns focus, an outside press closes.
const { launch, open, BASE } = require("./pw.cjs");
let failed = 0;
const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) failed++; };
(async () => {
  const browser = await launch();
  const page = await open(browser);
  const go = async q => { await page.goto(`${BASE}/master-data?${q}&mock=instant`, { waitUntil: "networkidle" }); await page.waitForSelector("tbody tr"); };
  const focusedText = () => page.evaluate(() => (document.activeElement?.textContent || document.activeElement?.getAttribute("aria-label") || "").trim());
  for (const [label, q] of [["catalog row menu", "group=services&tab=organizations"], ["team row menu", "group=team&tab=people"]]) {
    await go(q);
    const row = page.locator("tbody tr").first(); await row.hover();
    const trigger = row.getByRole("button", { name: /^Aksi/ });
    await trigger.click(); await page.getByRole("menu").waitFor();
    ok((await focusedText()).length > 0 && await page.evaluate(() => document.activeElement?.getAttribute("role") === "menuitem"), `${label}: first item gets focus`);
    const first = await focusedText(); await page.keyboard.press("ArrowDown"); const second = await focusedText();
    ok(second !== first, `${label}: ArrowDown moves focus (${first} -> ${second})`);
    await page.keyboard.press("End"); const last = await focusedText(); await page.keyboard.press("ArrowDown");
    ok((await focusedText()) === first, `${label}: ArrowDown on the last item wraps to the first`);
    await page.keyboard.press("Escape"); await page.getByRole("menu").waitFor({ state: "detached" });
    ok(await page.evaluate(() => document.activeElement?.getAttribute("aria-haspopup") === "menu"), `${label}: Escape closes and focus returns to the trigger`);
    await trigger.click(); await page.getByRole("menu").waitFor();
    await page.mouse.click(700, 120); await page.getByRole("menu").waitFor({ state: "detached" });
    ok(true, `${label}: a press outside closes it`);
  }
  for (const [label, q] of [["catalog detail menu", "group=services&tab=organizations"], ["person detail menu", "group=team&tab=people"]]) {
    await go(q);
    await page.locator("[data-master-id]:visible").first().click(); await page.getByRole("dialog").waitFor(); await page.waitForTimeout(500);
    await page.getByRole("button", { name: "Aksi detail" }).click(); await page.getByRole("menu").waitFor();
    await page.keyboard.press("Escape");
    await page.getByRole("menu").waitFor({ state: "detached" });
    ok((await page.getByRole("dialog").count()) === 1, `${label}: Escape closes only the menu, the drawer stays`);
    ok(await page.evaluate(() => document.activeElement?.getAttribute("aria-label") === "Aksi detail"), `${label}: focus returns to the trigger`);
    await page.keyboard.press("Escape"); await page.getByRole("dialog").waitFor({ state: "detached" });
  }
  console.log("errors:", page.errors.filter(e => !/preload/.test(e)));
  await browser.close();
  console.log(failed ? `${failed} FAILED` : "ALL PASS"); process.exit(failed ? 1 : 0);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
