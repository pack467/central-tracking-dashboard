// Logo upload: pick a file in the Organisasi form, save, and see it in the list, after reload, in the detail and in the Proyek table.
const { launch, open, BASE } = require("./pw.cjs");
const ok = (cond, label) => { console.log(cond ? "PASS" : "FAIL", label); if (!cond) process.exitCode = 1; };
const SHOTS = process.env.SHOT_DIR || require("path").join(require("os").tmpdir(), "flowG");
require("fs").mkdirSync(SHOTS, { recursive: true });
(async () => {
  const browser = await launch();
  const page = await open(browser);
  await page.goto(`${BASE}/master-data?group=services&tab=organizations&mock=instant`, { waitUntil: "networkidle" });
  await page.waitForSelector("tbody tr");
  // a 600 x 300 PNG made from the page itself stands in for a real logo
  const png = await page.screenshot({ clip: { x: 0, y: 0, width: 600, height: 300 } });
  const name = (await page.locator("tbody tr").first().locator("td").first().innerText()).split("\n")[0];
  await page.getByRole("button", { name: `Ubah ${name}` }).first().click();
  const upload = page.getByRole("button", { name: "Unggah logo" });
  await upload.waitFor();
  ok(true, "form shows Unggah logo");

  // a file that is not an image is refused with a message
  await page.locator('input[type="file"]').setInputFiles({ name: "catatan.txt", mimeType: "text/plain", buffer: Buffer.from("bukan gambar") });
  await page.getByText("Pilih gambar PNG, JPG, atau WebP.").waitFor();
  ok(true, "non-image refused with a message");

  await page.locator('input[type="file"]').setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: "Ganti logo" }).waitFor();
  const src = await page.locator('[role="dialog"] img').first().getAttribute("src");
  ok(/^data:image\/(webp|png);base64,/.test(src || ""), `preview is a small data URL (${src?.slice(0, 22)}…, ${src?.length} chars)`);
  ok((src || "").length < 60000, "shrunk well below the storage cap");
  ok(!(await page.getByText("Pilih gambar PNG, JPG, atau WebP.").count()), "the earlier error is cleared");
  await page.screenshot({ path: `${SHOTS}/form-logo.png` });
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await page.locator('[role="dialog"]').waitFor({ state: "detached" });

  const row = page.locator("tbody tr", { hasText: name }).first();
  ok(await row.locator("img").count() === 1, "list row shows the logo");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("tbody tr");
  ok(await page.locator("tbody tr", { hasText: name }).first().locator("img").count() === 1, "logo survives a reload");
  await page.screenshot({ path: `${SHOTS}/list-logo.png` });

  await page.getByRole("button", { name: `Detail ${name}` }).first().click();
  await page.locator('[role="dialog"] img').first().waitFor();
  ok(true, "detail header shows the logo");
  await page.screenshot({ path: `${SHOTS}/detail-logo.png` });
  await page.keyboard.press("Escape");

  await page.goto(`${BASE}/master-data?group=services&tab=projects&mock=instant`, { waitUntil: "networkidle" });
  await page.waitForSelector("tbody tr");
  ok(await page.locator("tbody tr img").count() > 0, "Proyek table shows the owner organisation logo");

  // remove it again
  await page.goto(`${BASE}/master-data?group=services&tab=organizations&mock=instant`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: `Ubah ${name}` }).first().click();
  await page.getByRole("button", { name: "Hapus logo" }).click();
  await page.getByRole("button", { name: "Unggah logo" }).waitFor();
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await page.locator('[role="dialog"]').waitFor({ state: "detached" });
  ok(await page.locator("tbody tr", { hasText: name }).first().locator("img").count() === 0, "logo removed");
  console.log("errors:", page.errors.filter(e => !/preload/.test(e)));
  await browser.close();
})().catch(error => { console.log("FAIL", error.message.split("\n")[0]); process.exitCode = 1; });
