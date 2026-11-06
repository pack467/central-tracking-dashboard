// A dashboard whose active client has no tickets: make a client in Master Data, pick it in the client switcher, keep the browser storage,
// and replay that storage in any other viewport.
const { open, BASE } = require("./pw.cjs");

async function emptyStorage(browser) {
  const page = await open(browser, { width: 1440, height: 900 });
  await page.goto(`${BASE}/master-data?group=services&tab=organizations&mock=instant`, { waitUntil: "networkidle" });
  await page.waitForSelector("tbody tr, article");
  await page.getByRole("button", { name: "Tambah Organisasi" }).first().click();
  await page.getByLabel(/Nama resmi/).fill("Klien Uji Kosong");
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await page.waitForSelector("[role=dialog]", { state: "detached" }).catch(() => {});
  const state = await page.context().storageState();
  await page.context().close();
  return state;
}

/** The dashboard in a viewport, with the empty client already chosen. */
async function emptyDashboard(browser, state, { width = 1440, height = 900, touch = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1, storageState: state }); await require("./pw.cjs").seedAuth(context);
  await context.addInitScript(() => { window.__TEST_CLOCK__ = "2026-10-28T03:00:00.000Z"; });
  const page = await context.newPage();
  page.errors = [];
  page.on("console", message => { if (["error", "warning"].includes(message.type())) page.errors.push(`${message.type()}: ${message.text().slice(0, 300)}`); });
  page.on("pageerror", error => page.errors.push(`pageerror: ${String(error).slice(0, 300)}`));
  await page.goto(`${BASE}/dashboard?mock=instant`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1800);
  // the app does not restore a client that was made in this session, so the switch is done here
  await page.locator("header button, [data-client-switcher] button").filter({ hasText: /Tritronik/ }).first().click();
  await page.getByText("Klien Uji Kosong").first().click();
  await page.waitForTimeout(1500);
  return page;
}
module.exports = { emptyStorage, emptyDashboard };
