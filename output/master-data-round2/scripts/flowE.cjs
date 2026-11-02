// C3: two filter changes made in the same tick (before the URL has updated) must both survive.
// A status pick and "Hapus pencarian" are fired from one synchronous script, which is faster than any user but exposes
// the lost update: both used to be built from the same stale route, so the second overwrote the first.
const { launch, open, BASE } = require("./pw.cjs");
(async () => {
  const browser = await launch();
  const ROUNDS = 5;
  let lost = 0;
  for (let round = 0; round < ROUNDS; round++) {
    const page = await open(browser);
    await page.goto(`${BASE}/master-data?group=services&tab=systems&q=abc&mock=instant`, { waitUntil: "networkidle" });
    await page.getByText("Tidak ada hasil").waitFor();
    await page.locator("#master-filter-status").click();
    const option = page.getByRole("option", { name: "Aktif", exact: true });
    await option.waitFor();
    await page.evaluate(() => {
      const aktif = [...document.querySelectorAll('[role="option"]')].find(el => el.textContent.trim() === "Aktif");
      aktif.click();
      document.querySelector('button[aria-label="Hapus pencarian"]').click();
    });
    await page.waitForTimeout(1200);
    const url = page.url(), ok = /status=active/.test(url) && !/q=abc/.test(url);
    console.log(`round ${round + 1}: ${ok ? "both changes kept" : "LOST an update"}  ${url.slice(url.indexOf("?"))}`);
    if (!ok) lost++;
    await page.context().close();
  }
  await browser.close();
  console.log(lost ? `FAIL ${lost} of ${ROUNDS} rounds lost an update` : `PASS all ${ROUNDS} rounds kept both changes`);
  process.exit(lost ? 1 : 0);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
