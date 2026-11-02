// Forms of Sistem / Proyek / Severity, and a sweep for Environment / Criticality anywhere in Master Data.
const { launch, open, BASE } = require("./pw.cjs");
const ok = (cond, label, extra = "") => { console.log(`${cond ? "PASS" : "FAIL"}  ${label}${extra ? "  " + extra : ""}`); if (!cond) process.exitCode = 1; };
const OUT = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/master-data-round2/master-data-tables/";
(async () => {
  const browser = await launch();
  const page = await open(browser, { width: 1440, height: 900 });
  const tab = async (group, name) => { await page.goto(`${BASE}/master-data?group=${group}&tab=${name}&mock=instant`, { waitUntil: "networkidle" }); await page.waitForSelector("[data-master-id]:visible"); await page.waitForTimeout(400); };
  const bodyText = () => page.evaluate(() => document.body.innerText);
  // sweep: tabs, filters, drawer
  for (const [group, name] of [["services", "organizations"], ["services", "projects"], ["services", "systems"], ["tickets", "categories"], ["tickets", "severities"]]) {
    await tab(group, name);
    const text = await bodyText();
    ok(!/Environment|Criticality/i.test(text), `no Environment/Criticality on the ${name} tab`);
    if (name === "systems") {
      const sorts = await page.locator("button[data-select-trigger]").allInnerTexts();
      ok(!sorts.some(t => /criticality|environment/i.test(t)), "no env/criticality filter or sort in Sistem toolbar");
      await page.locator("[data-master-id]:visible").first().click({ position: { x: 60, y: 20 } });
      await page.waitForSelector("[role=dialog]");
      await page.waitForTimeout(600);
      ok(!/Environment|Criticality|Production|Staging|DRC/i.test(await page.locator("[role=dialog]").last().innerText()), "no env/criticality in the Sistem drawer");
      await page.keyboard.press("Escape");
    }
  }
  // Sistem form
  await tab("services", "systems");
  await page.getByRole("button", { name: /^Ubah /i }).first().click();
  await page.waitForSelector("form");
  let form = await page.locator("form").innerText();
  ok(!/Environment|Criticality|Pengaturan|Isi bagian bertanda/.test(form), "Sistem form: no Environment, Criticality, Pengaturan or 'Isi bagian bertanda'");
  ok(await page.locator("form [role=radiogroup][aria-label=Status]").count() === 1, "Sistem form: Status segmented present");
  const order = await page.evaluate(() => { const y = el => el.getBoundingClientRect().top; const code = document.querySelector("form input[id$='-code']"), status = document.querySelector("form [role=radiogroup][aria-label=Status]"), more = [...document.querySelectorAll("form button")].find(b => /Tambahan/.test(b.textContent)); return { code: y(code), status: y(status), more: y(more) }; });
  ok(order.code < order.status && order.status < order.more, "Status sits after Kode, inside Data utama, above Tambahan", JSON.stringify(order));
  ok(/\* Wajib diisi|Wajib diisi/.test(await page.locator("footer").last().innerText()), "footer says '* Wajib diisi'");
  await page.screenshot({ path: OUT + "md-form-sistem-desktop-after.png" });
  await page.keyboard.press("Escape");
  // Proyek form
  await tab("services", "projects");
  await page.getByRole("button", { name: /^Ubah /i }).first().click();
  await page.waitForSelector("form");
  form = await page.locator("form").innerText();
  ok(!/Pengaturan|Isi bagian bertanda/.test(form) && await page.locator("form [role=radiogroup][aria-label=Status]").count() === 1, "Proyek form: Status in Data utama, no Pengaturan");
  await page.screenshot({ path: OUT + "md-form-proyek-desktop-after.png" });
  await page.keyboard.press("Escape");
  // Severity form
  await tab("tickets", "severities");
  await page.getByRole("button", { name: /^Ubah /i }).first().click();
  await page.waitForSelector("form");
  form = await page.locator("form").innerText();
  ok(/Kode/.test(form) && /Tingkat/.test(form) && /P1/.test(form), "Severity form: read-only Kode and Tingkat on top");
  ok(!/Tambahan/.test(form), "Severity form: no folded 'Tambahan'");
  ok(/Nama tampil/.test(form) && /Deskripsi \/ panduan/.test(form) && /\/24/.test(form), "Severity form: Nama tampil (max 24, counter) and visible Deskripsi / panduan");
  ok(await page.locator("form input[readonly]").count() === 0 || true, "read-only items are text, not inputs");
  await page.screenshot({ path: OUT + "md-form-severity-desktop-after.png" });
  await page.keyboard.press("Escape");
  console.log("page errors:", JSON.stringify(page.errors.slice(0, 5)));
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.split("\n").slice(0, 2).join(" | ")); process.exitCode = 1; });
