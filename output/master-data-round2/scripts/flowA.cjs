const { launch, open, shot, BASE } = require("./pw.cjs");
const ok = (cond, label) => { console.log(cond ? "PASS" : "FAIL", label); if (!cond) process.exitCode = 1; };
const pick = async (page, trigger, optionText) => { await trigger.click(); await page.getByRole("option", { name: optionText, exact: true }).click(); };
(async () => {
  const browser = await launch();
  const page = await open(browser);
  await page.goto(`${BASE}/master-data?group=team&tab=people`, { waitUntil: "networkidle" });
  await page.waitForSelector('table[aria-label="Daftar Personel"] tbody tr');

  // 1. validation, then add
  await page.getByRole("button", { name: "Tambah Personel" }).first().click();
  const form = page.locator("form");
  ok(await form.getByRole("button", { name: "Simpan" }).isDisabled(), "save disabled until valid");
  await form.getByLabel("Nama lengkap").fill("Orang Playwright");
  await form.getByLabel("ID pegawai").fill("emp-1001");
  await form.getByLabel("Email").fill("bukan-email");
  await form.getByLabel("Email").blur();
  ok(await form.getByRole("button", { name: "Simpan" }).isDisabled(), "still disabled: duplicate ID + bad email");
  await form.getByLabel("ID pegawai").fill("EMP-9001");
  await form.getByLabel("Email").fill("GALIH.KHAIRI@company.id");
  await form.getByRole("button", { name: "Simpan" }).isDisabled();
  await form.getByLabel("Email").fill("playwright@company.id");
  await pick(page, form.getByRole("combobox", { name: /Peran operasional/i }).first(), "Shift Lead");
  await pick(page, form.getByRole("combobox", { name: /Shift default/i }).first(), "Shift Pagi");
  await form.getByLabel("Tanggal bergabung").first().fill("05/10/2026");
  ok(/Senin, 5 Oktober 2026/.test(await form.innerText()), "joinDate typed: shown as a readable date");
  await shot(page, "04-person-form-filled");
  await form.getByRole("button", { name: "Simpan" }).click();
  await page.waitForSelector('form', { state: "detached" });
  await page.getByPlaceholder(/Cari nama/).fill("Playwright");
  await page.waitForSelector('table[aria-label="Daftar Personel"] tbody tr');
  ok(await page.locator('table[aria-label="Daftar Personel"] tbody tr').count() === 1, "new person listed");

  // 2. appears at once in Team Roster (client navigation, no reload)
  await page.getByRole("link", { name: /Team Roster/ }).first().click();
  await page.waitForURL(/team-roster/);
  await page.waitForSelector("text=Team Roster");
  await page.getByRole("button", { name: /Table/ }).click();
  await page.waitForTimeout(800);
  ok(await page.getByText("Orang Playwright").first().waitFor({ timeout: 8000 }).then(() => true, () => false), "new person visible in Team Roster without reload");
  const roleOptions = await page.locator('select, [role="combobox"]').first().innerText().catch(() => "");
  await shot(page, "05-roster-with-new-person");

  console.log("errors:", page.errors);
  await browser.close();
})().catch(error => { console.error("FAIL", error); process.exit(1); });
