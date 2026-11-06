// "Tanggal bergabung": typed or picked, floating popover, quick month/year, keyboard, Esc, flip, bottom sheet.
const { launch, open, BASE } = require("./pw.cjs");
const ok = (cond, label, extra = "") => { console.log(`${cond ? "PASS" : "FAIL"}  ${label}${extra ? "  " + extra : ""}`); if (!cond) process.exitCode = 1; };
const OUT = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/master-data-round2/r3/";
async function openForm(page) {
  await page.goto(`${BASE}/master-data?group=team&tab=people&mock=instant`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-master-id]:visible"); await page.waitForTimeout(400);
  await page.getByRole("button", { name: "Tambah Personel" }).first().click();
  await page.waitForSelector("form"); await page.waitForTimeout(500);
}
(async () => {
  const browser = await launch();
  const page = await open(browser, { width: 1440, height: 900 });
  page.setDefaultTimeout(8000);
  await openForm(page);
  const input = page.getByLabel("Tanggal bergabung", { exact: false }).first();
  const dialog = page.locator("section[role=dialog]").first();
  const box0 = await dialog.boundingBox();
  const scroller = page.locator("form > div").first();
  const top0 = await scroller.evaluate(el => el.scrollTop);
  const formText = () => page.locator("form").innerText();
  // typed
  await input.click();
  await input.pressSequentially("04012023");
  ok((await input.inputValue()) === "04/01/2023", "typing 04012023 gives 04/01/2023 with slashes added", await input.inputValue());
  ok(/Rabu, 4 Januari 2023/.test(await formText()), "readable date shown under the input");
  await input.fill(""); await input.pressSequentially("31022023");
  ok(/Tanggal tidak valid/.test(await formText()), "31/02/2023 is invalid");
  await input.fill(""); await input.pressSequentially("01012099");
  ok(/Tidak boleh di masa depan/.test(await formText()), "a future date is refused");
  ok(await page.getByRole("button", { name: "Simpan", exact: true }).isDisabled(), "Simpan stays disabled with an invalid date");
  await input.fill(""); await input.pressSequentially("1/2"); await page.keyboard.press("Tab");
  ok(/Lengkapi tanggal/.test(await formText()), "a half date says it is incomplete after blur");
  await input.fill("");
  // popover
  await page.getByRole("button", { name: "Buka kalender" }).click();
  const pop = page.getByRole("dialog", { name: "Pilih tanggal" });
  await pop.waitFor();
  const box1 = await dialog.boundingBox(), top1 = await scroller.evaluate(el => el.scrollTop);
  ok(Math.abs(box1.height - box0.height) < 1 && top1 === top0, "popover floats: modal height and scroll position unchanged", `${box0.height}->${box1.height}, scroll ${top0}->${top1}`);
  const pb = await pop.boundingBox(), ib = await input.boundingBox();
  ok((pb.y >= ib.y + ib.height - 2 || pb.y + pb.height <= ib.y + 2) && pb.width >= 300 && pb.width <= 320, "popover sits beside the field without covering it (below or flipped above), ~312px wide", `y ${Math.round(pb.y)} w ${pb.width}`);
  ok(!/dipilih|Selesai/.test(await pop.innerText()), "no '... dipilih' line and no Selesai button");
  await page.screenshot({ path: OUT + "tanggal-popover-desktop-after.png" });
  // quick pick: Maret 2019 in 3 clicks (year button, 2019, Maret)
  await pop.getByRole("button", { name: /^20\d\d$/ }).click();
  await pop.getByRole("option", { name: "2019", exact: true }).click();
  await pop.getByRole("option", { name: "Maret", exact: true }).click();
  const popText = await pop.innerText();
  ok(/Maret/.test(popText) && /2019/.test(popText), "March 2019 reached in 3 clicks (year, 2019, Maret)");
  await pop.getByRole("gridcell", { name: /15 Maret 2019/ }).click();
  ok((await input.inputValue()) === "15/03/2019", "clicking a day fills the input", await input.inputValue());
  ok(await pop.count() === 0, "the popover closed");
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => !!document.activeElement?.id?.endsWith("-joinDate")), "focus is back on the input");
  // Hari ini
  await page.getByRole("button", { name: "Buka kalender" }).click(); await pop.waitFor();
  await pop.getByRole("button", { name: "Hari ini" }).click();
  const d = new Date(); const expect = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  ok((await input.inputValue()) === expect, "Hari ini fills today", await input.inputValue());
  // keyboard
  await page.getByRole("button", { name: "Buka kalender" }).click(); await pop.waitFor();
  await page.waitForTimeout(250);
  ok(await page.evaluate(() => document.activeElement?.getAttribute("role") === "gridcell"), "focus enters the day grid");
  const label = () => page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
  const seen = [await label()];
  for (const key of ["ArrowLeft", "ArrowUp", "PageUp", "Shift+PageUp", "Home", "End"]) { await page.keyboard.press(key); await page.waitForTimeout(60); seen.push(await label()); }
  ok(new Set(seen).size >= 6, "arrows, PageUp, Shift+PageUp, Home and End all move the focus", seen.join(" | "));
  ok(/^Minggu/.test(seen[6] || ""), "End goes to the end of the week (Minggu)", seen[6]);
  ok(/^Senin/.test(seen[5] || ""), "Home goes to Monday", seen[5]);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  ok(await pop.count() === 0 && (await input.inputValue()).length === 10, "Enter picks the focused day", await input.inputValue());
  // Esc closes only the popover
  await page.getByRole("button", { name: "Buka kalender" }).click(); await pop.waitFor();
  await page.keyboard.press("Escape"); await page.waitForTimeout(250);
  ok(await pop.count() === 0 && await page.locator("form").count() === 1, "Esc closes only the popover, the form stays");
  // modal header gap
  await scroller.evaluate(el => { el.scrollTop = 0; });
  const gap = await page.evaluate(() => { const h = document.querySelector("section[role=dialog] header").getBoundingClientRect(); const l = document.querySelector("form label").getBoundingClientRect(); return l.top - h.bottom; });
  ok(gap >= 16, "first label is >= 16px below the modal header", `${Math.round(gap)}px`);
  await page.screenshot({ path: OUT + "form-personel-desktop-after.png" });
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Buang perubahan" }).click().catch(() => {});
  await page.waitForTimeout(500);
  const released = await page.evaluate(() => getComputedStyle(document.body).overflow !== "hidden" && !document.querySelector("[role=dialog]") && !document.querySelector("[inert]"));
  ok(released, "scroll lock and inert released after closing the form");
  const errs = page.errors.filter(e => !/preload/.test(e));
  ok(!errs.length, "no console errors", JSON.stringify(errs.slice(0, 3)));
  await page.context().close();

  // flip up: a short window pushes the field near the bottom
  const small = await open(browser, { width: 1440, height: 560 });
  small.setDefaultTimeout(8000);
  await openForm(small);
  await small.locator("form > div").first().evaluate(el => { el.scrollTop = el.scrollHeight; });
  await small.getByRole("button", { name: "Buka kalender" }).click();
  const spop = small.getByRole("dialog", { name: "Pilih tanggal" }); await spop.waitFor();
  await small.waitForTimeout(200);
  const sb = await spop.boundingBox(), sib = await small.getByLabel("Tanggal bergabung", { exact: false }).first().boundingBox();
  ok(sb.y + sb.height <= 560 && sb.y >= 0, "popover stays inside a 560px-high window", `y ${Math.round(sb.y)}..${Math.round(sb.y + sb.height)}`);
  ok(sb.y + sb.height <= sib.y + 1 || sb.y >= sib.y + sib.height - 1, "popover does not cover the input (flipped when needed)");
  await small.screenshot({ path: OUT + "tanggal-flip-desktop-after.png" });
  await small.context().close();

  // phone: bottom sheet
  const phone = await open(browser, { width: 390, height: 844, touch: true });
  phone.setDefaultTimeout(8000);
  await openForm(phone);
  await phone.getByRole("button", { name: "Buka kalender" }).click();
  await phone.waitForSelector("[data-sheet-id=date-field]");
  await phone.waitForTimeout(400);
  const cell = await phone.getByRole("gridcell").first().boundingBox();
  ok(cell.height >= 40, "phone: day cells are 40px", `${cell.width}x${cell.height}`);
  const nav = await phone.getByRole("button", { name: "Bulan berikutnya" }).boundingBox();
  ok(nav.width >= 43.5 && nav.height >= 43.5, "phone: month arrows are 44px", `${nav.width}x${nav.height}`);
  await phone.screenshot({ path: OUT + "tanggal-sheet-mobile-after.png" });
  await phone.getByRole("button", { name: "Hari ini" }).click();
  await phone.waitForTimeout(400);
  ok(await phone.locator("[data-sheet-id=date-field]").count() === 0, "phone: the sheet closes after a pick");
  ok(await phone.locator("form").count() === 1, "phone: the form is still open");
  await phone.screenshot({ path: OUT + "form-personel-mobile-after.png" });
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.replace(/\s+/g, " ").slice(0, 300)); process.exitCode = 1; });
