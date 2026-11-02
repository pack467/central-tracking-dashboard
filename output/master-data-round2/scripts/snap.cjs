// Proves "the UI did not change" during refactors: captures normalised rendered HTML and a screenshot for ~40 states
// at 1440 and 390, then compares a run against a stored baseline.
//   node snap.cjs baseline [dir]     store the baseline
//   node snap.cjs compare  [dir]     capture again and compare with the baseline
const fs = require("fs");
const path = require("path");
const { launch, open, BASE } = require("./pw.cjs");
const MODE = process.argv[2] || "compare";
const ROOT = process.argv[3] || path.join(process.env.SNAP_DIR || __dirname, "snap");
const DIR = path.join(ROOT, MODE === "baseline" ? "baseline" : "current");
fs.mkdirSync(DIR, { recursive: true });

const TOKEN = /(?:_r_|«r|:r)[0-9a-z]+(?:_|»|:)/g;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
function normalise(html) {
  const ids = new Map();
  html = html.replace(/(\s(?:id|for|data-sheet-id|aria-[a-z]+)=")([^"]*)(")/g, (m, a, v, c) => a + v.replace(TOKEN, t => { if (!ids.has(t)) ids.set(t, `ID${ids.size}`); return ids.get(t); }) + c);
  return html.replace(UUID, "UUID").replace(/\s+/g, " ");
}
const TABS = [["services", "organizations"], ["services", "projects"], ["services", "systems"], ["tickets", "categories"], ["tickets", "severities"], ["team", "people"], ["team", "roles"]];
const ADD = { organizations: /Tambah Organisasi/, projects: /Tambah Proyek/, systems: /Tambah Sistem/, categories: /Tambah Kategori/, people: /Tambah Personel/, roles: /Tambah Peran/ };

async function run(browser, width, height, touch) {
  const tag = String(width), result = {};
  const page = await open(browser, { width, height, touch });
  const go = async (q, ready = "[data-master-id]:visible") => { await page.goto(`${BASE}/master-data?${q}&mock=instant`, { waitUntil: "networkidle" }); await page.waitForSelector(ready, { timeout: 15000 }); await page.waitForTimeout(500); };
  const capture = async name => {
    await page.waitForTimeout(700);
    const key = `${tag}-${name}`;
    const html = await page.evaluate(() => {
      const root = document.querySelector("[data-master-data-v2]");
      const popups = [...document.querySelectorAll('[role="dialog"], [data-sheet-id], [role="listbox"], [role="menu"]')].map(el => el.outerHTML);
      return [root ? root.outerHTML : "", ...popups].join("\n<!--next-->\n");
    });
    result[key] = normalise(name === "dialog-delete" ? html.replace(/background-color: rgb([^)]*)/g, "background-color: COLOR") : html); // the new category's dot colour comes from its random id
    await page.screenshot({ path: path.join(DIR, `${key}.png`) });
  };
  const closeAll = async () => { for (let i = 0; i < 3; i++) { await page.keyboard.press("Escape"); await page.waitForTimeout(150); const discard = page.getByRole("button", { name: "Buang perubahan" }); if (await discard.count()) await discard.click(); } await page.waitForTimeout(300); };

  // lists
  for (const [group, tab] of TABS) { await go(`group=${group}&tab=${tab}`); await capture(`list-${tab}`); }
  await go("group=services&tab=systems&status=active&org=bni"); await capture("list-systems-filtered");
  await go("group=services&tab=organizations&q=zzzzzz", "text=Tidak ada hasil"); await capture("list-empty");
  await go("group=services&tab=organizations&sort=-name"); await capture("list-orgs-sorted");
  if (touch) { await go("group=services&tab=systems"); await page.getByRole("button", { name: /Filter & urutan/ }).click(); await capture("filter-sheet"); await closeAll(); await page.getByRole("button", { name: /^Organisasi/ }).first().click().catch(() => {}); await page.waitForTimeout(300); await capture("category-sheet"); await closeAll(); }
  else { await go("group=services&tab=systems"); await page.locator("#master-filter-status").click(); await capture("filter-select-open"); await closeAll(); }
  // forms
  for (const [group, tab] of TABS) {
    if (!ADD[tab]) continue;
    await go(`group=${group}&tab=${tab}`);
    await page.getByRole("button", { name: ADD[tab] }).first().click(); await page.waitForSelector("form");
    await capture(`form-${tab}`);
    if (tab === "organizations") {
      await page.getByRole("button", { name: /Tambahan/ }).click();
      await page.locator("form").getByLabel("Leader", { exact: true }).click(); await page.getByRole("option", { name: "Kontak eksternal" }).click();
      await page.locator("form").getByLabel("Nama kontak").fill("Budi"); await page.locator("form").getByLabel("Email kontak").fill("bukan-email"); await page.locator("form").getByLabel("Telepon kontak").focus();
      await capture("form-organizations-error");
      await page.keyboard.press("Escape"); await capture("form-organizations-discard");
    }
    if (tab !== "organizations") { await page.locator("form input:not([type=hidden])").first().fill("x"); await page.keyboard.press("Escape"); await capture(`form-${tab}-discard`); }
    await closeAll();
  }
  // detail drawers
  for (const [group, tab] of TABS) {
    if (tab === "roles") continue;
    await go(`group=${group}&tab=${tab}`);
    await page.locator("[data-master-id]:visible").first().click(); await page.getByRole("dialog").waitFor();
    await capture(`detail-${tab}`);
    if (tab === "people") for (const name of ["Penggunaan", "Riwayat"]) { await page.getByRole("dialog").getByRole("tab", { name: new RegExp(name) }).click(); await capture(`detail-people-${name.toLowerCase()}`); }
    if (tab === "organizations") { await page.getByRole("dialog").getByRole("tab", { name: /Riwayat/ }).click(); await capture("detail-organizations-history"); }
    await closeAll();
  }
  // detail header menus (MasterDetail and PersonDetail share the same header pattern)
  for (const [group, tab] of [["services", "organizations"], ["team", "people"]]) {
    await go(`group=${group}&tab=${tab}`);
    await page.locator("[data-master-id]:visible").first().click(); await page.getByRole("dialog").waitFor(); await page.waitForTimeout(500);
    await page.getByRole("button", { name: "Aksi detail" }).click(); await capture(`detail-menu-${tab}`);
    await page.keyboard.press("Escape"); await page.waitForTimeout(200);
    await closeAll();
  }
  // edit form: changing the status asks for confirmation with the impact
  await go("group=services&tab=organizations");
  await page.locator("[data-master-id]:visible").first().click(); await page.getByRole("dialog").waitFor(); await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Ubah data" }).click(); await page.waitForSelector("form"); await page.waitForTimeout(500);
  await capture("form-edit-organization");
  await page.locator("form").getByRole("radio", { name: "Nonaktif" }).click(); await page.locator("form").getByRole("button", { name: "Simpan" }).click();
  await page.getByText("Ubah status data?").waitFor(); await capture("form-status-confirm");
  await closeAll();
  // menus and dialogs
  await go("group=team&tab=people");
  const row = page.locator("[data-master-id]:visible").first();
  await row.hover(); await row.getByRole("button", { name: /^Aksi/ }).click(); await capture("menu-people");
  await page.getByRole("menuitem", { name: "Nonaktifkan" }).click().catch(() => {}); await page.waitForTimeout(400); await capture("dialog-people-status"); await closeAll();
  await go("group=services&tab=organizations");
  const mrow = page.locator("[data-master-id]:visible").first();
  await mrow.hover(); await mrow.getByRole("button", { name: /^Aksi/ }).click(); await capture("menu-organizations"); await page.keyboard.press("Escape");
  const orow = page.locator("[data-master-id]:visible").first();
  await orow.hover(); await orow.getByRole("button", { name: /^Aksi/ }).click();
  await page.getByRole("menuitem", { name: /Arsipkan|Nonaktifkan/ }).first().click().catch(() => {}); await page.waitForTimeout(500); await capture("dialog-org-status"); await closeAll();
  // delete dialog on a freshly created, never-used category
  await go("group=tickets&tab=categories");
  await page.getByRole("button", { name: ADD.categories }).first().click(); await page.waitForSelector("form");
  await page.locator("form").getByLabel("Nama").first().fill("Uji Hapus Snapshot"); await page.locator("form").getByRole("button", { name: "Simpan" }).click(); await page.waitForSelector("form", { state: "detached" });
  await go("group=tickets&tab=categories&q=Uji%20Hapus%20Snapshot");
  const crow = page.locator("[data-master-id]:visible").first();
  await crow.hover(); await crow.getByRole("button", { name: /^Aksi/ }).click(); await page.getByRole("menuitem", { name: "Hapus" }).click(); await page.waitForTimeout(600); await capture("dialog-delete"); await closeAll();
  const errors = page.errors.filter(e => !/preload/.test(e));
  await page.context().close();
  return { result, errors };
}

async function pngDiff(browser, a, b) {
  if (fs.readFileSync(a).equals(fs.readFileSync(b))) return 0;
  const page = await browser.newPage();
  const ratio = await page.evaluate(async ([x, y]) => {
    const load = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = src; });
    const [ia, ib] = await Promise.all([load(x), load(y)]);
    if (ia.width !== ib.width || ia.height !== ib.height) return 1;
    const draw = i => { const c = document.createElement("canvas"); c.width = i.width; c.height = i.height; const g = c.getContext("2d"); g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height).data; };
    const da = draw(ia), db = draw(ib); let n = 0;
    const wide = ia.width >= 1280; // the live clock (top bar) and the shift widget (sidebar) are not frozen, so they are not compared
    for (let p = 60 * ia.width * 4; p < da.length; p += 4) if ((!wide || (p / 4) % ia.width >= 250) && Math.abs(da[p] - db[p]) + Math.abs(da[p + 1] - db[p + 1]) + Math.abs(da[p + 2] - db[p + 2]) > 6) n++;
    return n / (da.length / 4);
  }, ["data:image/png;base64," + fs.readFileSync(a).toString("base64"), "data:image/png;base64," + fs.readFileSync(b).toString("base64")]);
  await page.close();
  return ratio;
}

(async () => {
  const browser = await launch();
  const dom = {}; const errors = [];
  for (const [w, h, touch] of [[1440, 900, false], [390, 844, true]]) {
    const { result, errors: e } = await run(browser, w, h, touch);
    Object.assign(dom, result); errors.push(...e);
    console.log(`captured ${Object.keys(result).length} states at ${w}`);
  }
  fs.writeFileSync(path.join(DIR, "dom.json"), JSON.stringify(dom));
  if (errors.length) console.log("console errors:", errors.slice(0, 5));
  if (MODE === "baseline") { console.log(`baseline stored: ${Object.keys(dom).length} states in ${DIR}`); await browser.close(); return; }
  const baseDir = path.join(ROOT, "baseline"), base = JSON.parse(fs.readFileSync(path.join(baseDir, "dom.json"), "utf8"));
  let domDiff = 0, pixDiff = 0;
  for (const key of new Set([...Object.keys(base), ...Object.keys(dom)])) {
    if (base[key] !== dom[key]) {
      domDiff++;
      const a = base[key] || "", b = dom[key] || ""; let i = 0; while (i < a.length && a[i] === b[i]) i++;
      console.log(`DOM DIFF ${key} @${i}\n  base: ...${a.slice(Math.max(0, i - 60), i + 140)}\n  now : ...${b.slice(Math.max(0, i - 60), i + 140)}`);
    }
    const pa = path.join(baseDir, key + ".png"), pb = path.join(DIR, key + ".png");
    if (fs.existsSync(pa) && fs.existsSync(pb)) { const r = key.includes("dialog-delete") ? 0 : await pngDiff(browser, pa, pb); if (r > 0.0005) { pixDiff++; console.log(`PIXEL DIFF ${key}: ${(r * 100).toFixed(3)}%`); } }
  }
  console.log(domDiff || pixDiff ? `DIFFERENT: ${domDiff} DOM, ${pixDiff} pixel of ${Object.keys(dom).length} states` : `IDENTICAL: ${Object.keys(dom).length} states, DOM and pixels`);
  await browser.close();
  process.exit(domDiff || pixDiff ? 1 : 0);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
