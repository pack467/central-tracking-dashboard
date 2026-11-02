// Shared helpers for the Memo verification scripts.
const { launch, open, BASE } = require("./pw.cjs");
const ok = (cond, label, extra = "") => { console.log(cond ? "PASS" : "FAIL", label, cond ? "" : extra); if (!cond) process.exitCode = 1; return cond; };
const EDITOR = "[role=textbox][aria-label^='Isi catatan']";
const NOTES_KEY = "ctd.memo.v2";

/** A page with the frozen clock; `seedStorage` runs before the app loads. */
async function start(browser, { width = 1440, height = 900, touch = false, storage = {}, extra } = {}) {
  const page = await open(browser, { width, height, touch });
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE }).catch(() => {});
  if (Object.keys(storage).length || extra) {
    await page.addInitScript(({ storage, extra }) => {
      if (!sessionStorage.getItem("__seeded")) {
        for (const [key, value] of Object.entries(storage)) localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
        sessionStorage.setItem("__seeded", "1");
      }
      if (extra) new Function(extra)();
    }, { storage, extra });
  }
  await page.goto(`${BASE}/dashboard?mock=instant`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-memo-card]", { timeout: 20000 });
  await page.waitForTimeout(400);
  return page;
}
async function openModal(page) {
  // an empty memo shows "Tulis catatan" instead of Edit
  const trigger = page.getByRole("button", { name: /Edit catatan|Tulis catatan/ }).first();
  await trigger.click();
  await page.waitForSelector("[data-memo-open]");
  await page.waitForSelector(EDITOR);
  await page.waitForTimeout(250);
}
const stored = page => page.evaluate(key => { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }, NOTES_KEY);
const editorHtml = page => page.locator(EDITOR).evaluate(el => el.innerHTML);
async function clearEditorAndType(page, text) {
  await page.locator(EDITOR).click();
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Delete");
  if (text) await page.keyboard.type(text);
}
const tool = (page, name) => page.getByRole("toolbar", { name: "Format catatan" }).getByRole("button", { name, exact: true });
const save = async page => { await page.getByRole("button", { name: "Simpan", exact: true }).first().click(); await page.waitForTimeout(550); };
module.exports = { launch, open, BASE, ok, EDITOR, NOTES_KEY, start, openModal, stored, editorHtml, clearEditorAndType, tool, save };
