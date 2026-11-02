// Drawer of a category and a severity: Ringkasan facts, the Penggunaan tab opened from the count, history label "Warna".
const { launch, open, BASE } = require("./pw.cjs");
const ok = (cond, label, extra = "") => { console.log(`${cond ? "PASS" : "FAIL"}  ${label}${extra ? "  " + extra : ""}`); if (!cond) process.exitCode = 1; };
const OUT = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/master-data-round2/master-data-tables/";
(async () => {
  const browser = await launch();
  for (const [size, w, h, touch] of [["desktop", 1440, 900, false], ["mobile", 390, 844, true]]) {
    const page = await open(browser, { width: w, height: h, touch }); page.setDefaultTimeout(9000);
    await page.goto(`${BASE}/master-data?mock=instant`, { waitUntil: "networkidle" });
    await page.evaluate(() => localStorage.removeItem("ctd.masterData.v2"));
    await page.goto(`${BASE}/master-data?group=tickets&tab=categories&mock=instant`, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-master-id]:visible"); await page.waitForTimeout(400);
    // colour change so there is a history entry
    const direct = page.getByRole("button", { name: /^Ubah Maintenance/ });
    if (await direct.count() && await direct.first().isVisible()) await direct.first().click();
    else { await page.getByRole("button", { name: /^Aksi Maintenance/ }).first().click(); await page.getByRole("menuitem", { name: "Ubah" }).click(); }
    await page.waitForSelector("form");
    await page.getByRole("radio", { name: "Merah", exact: true }).click();
    await page.getByRole("button", { name: "Simpan", exact: true }).click();
    await page.waitForSelector("form", { state: "detached" });
    await page.waitForTimeout(500);
    // usage count opens the drawer on the usage tab
    if (touch) { await page.getByRole("button", { name: /^Detail Maintenance/ }).first().click(); await page.waitForSelector("[role=dialog]"); await page.getByRole("tab", { name: /Penggunaan/ }).click(); }
    else await page.getByRole("button", { name: /^Lihat penggunaan Maintenance/ }).click();
    await page.waitForSelector("[role=dialog]"); await page.waitForTimeout(700);
    const dialog = page.locator("[role=dialog]").last();
    let text = await dialog.innerText();
    ok(/Penggunaan/i.test(text) && /Menurut status/i.test(text) && /Proyek teratas/i.test(text) && /22\s*tiket/.test(text), `${size}: count opens Penggunaan with total, status split and top projects`);
    ok(/semua klien/i.test(text), `${size}: the basis of the count is stated`);
    await page.screenshot({ path: OUT + `md-drawer-penggunaan-${size}-after.png` });
    await page.getByRole("tab", { name: /Ringkasan/ }).click();
    text = await dialog.innerText();
    ok(/Kode/.test(text) && /Warna/.test(text) && /Merah/.test(text) && !/Urutan/.test(text), `${size}: Ringkasan has Kode and Warna (Merah), no Urutan`);
    await page.screenshot({ path: OUT + `md-drawer-kategori-${size}-after.png` });
    await page.getByRole("tab", { name: /Riwayat/ }).click();
    await page.waitForTimeout(500);
    text = await dialog.innerText();
    ok(/Warna/.test(text) && /Biru muda/.test(text) && /Merah/.test(text), `${size}: history reads 'Warna: Biru muda -> Merah'`, text.replace(/\s+/g, " ").slice(0, 0));
    await page.screenshot({ path: OUT + `md-drawer-riwayat-${size}-after.png` });
    await page.keyboard.press("Escape");
    // the lock goes with the closing animation: wait for it, up to 2 s, instead of a fixed pause
    const released = await page.waitForFunction(() => getComputedStyle(document.body).overflow !== "hidden" && getComputedStyle(document.documentElement).overflow !== "hidden" && !document.querySelector("[role=dialog]"), null, { timeout: 2000 }).then(() => true, () => false);
    ok(released, `${size}: scroll released after the drawer closes`);
    // severity drawer
    await page.goto(`${BASE}/master-data?group=tickets&tab=severities&mock=instant`, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-master-id]:visible"); await page.waitForTimeout(400);
    if (touch) { await page.getByRole("button", { name: /^Detail Critical/ }).first().click(); await page.waitForSelector("[role=dialog]"); await page.getByRole("tab", { name: /Penggunaan/ }).click(); }
    else await page.getByRole("button", { name: /^Lihat penggunaan Critical/ }).click();
    await page.waitForSelector("[role=dialog]"); await page.waitForTimeout(600);
    text = await page.locator("[role=dialog]").last().innerText();
    ok(/Penggunaan/.test(text) && /14\s*tiket/.test(text), `${size}: severity usage drawer shows 14 tiket`);
    await page.getByRole("tab", { name: /Ringkasan/ }).click();
    text = await page.locator("[role=dialog]").last().innerText();
    ok(/P1/.test(text) && /Kode/.test(text), `${size}: severity Ringkasan shows Kode and Tingkat P1`);
    await page.screenshot({ path: OUT + `md-drawer-severity-${size}-after.png` });
    await page.keyboard.press("Escape");
    await page.evaluate(() => localStorage.removeItem("ctd.masterData.v2"));
    console.log("page errors:", JSON.stringify(page.errors.filter(e => !/preload/.test(e)).slice(0, 3)));
    await page.context().close();
  }
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.split("\n").slice(0, 2).join(" | ")); process.exitCode = 1; });
