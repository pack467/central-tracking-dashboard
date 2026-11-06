// Sizes, touch targets, text size, contrast, scroll lock release, 20 quick cycles, CLS, long press, roles.
const { launch, ok, BASE, EDITOR, start, openModal, clearEditorAndType, save } = require("./memo-helpers.cjs");

const note = (id, title, text) => ({ id, title, doc: { v: 1, blocks: text ? [{ k: "p", r: [{ t: text }] }] : [] }, createdAt: "2026-10-29T00:00:00.000Z", updatedAt: "2026-10-29T00:00:00.000Z" });
const many = n => ({ v: 2, notes: Array.from({ length: n }, (_, i) => note(`n${i}`, `Catatan nomor ${i + 1} yang cukup panjang`, `isi ${i + 1}`)), activeId: "n0", rev: 1 });
const SHOTS = process.env.SHOT_DIR;

const measure = page => page.evaluate(() => {
  const modal = document.querySelector("[data-memo-open] [role=dialog]");
  const r = modal.getBoundingClientRect();
  const small = [...modal.querySelectorAll("button, [role=tab], input")].filter(el => el.offsetParent !== null).map(el => { const b = el.getBoundingClientRect(); return { who: (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 30), w: Math.round(b.width), h: Math.round(b.height) }; }).filter(item => Math.min(item.w, item.h) < 44);
  const sizes = [...modal.querySelectorAll("*")].filter(el => el.children.length === 0 && el.textContent.trim() && getComputedStyle(el).visibility !== "hidden" && el.getBoundingClientRect().width > 0 && !el.closest(".sr-only")).map(el => parseFloat(getComputedStyle(el).fontSize));
  return {
    hscroll: document.documentElement.scrollWidth > innerWidth + 1,
    inside: r.left >= -0.5 && r.top >= -0.5 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5,
    modal: [Math.round(r.width), Math.round(r.height)],
    small, minFont: Math.min(...sizes),
    editorScrolls: (() => { const p = document.getElementById("memo-panel"); return p.scrollWidth <= p.clientWidth + 1; })(),
  };
});

const contrast = (page, selector) => page.evaluate(sel => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const pixel = document.createElement('canvas').getContext('2d', { willReadFrequently: true }); pixel.canvas.width = pixel.canvas.height = 1;
  const parse = css => { pixel.clearRect(0, 0, 1, 1); pixel.fillStyle = '#000'; pixel.fillStyle = css; pixel.fillRect(0, 0, 1, 1); const d = pixel.getImageData(0, 0, 1, 1).data; return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 }; };
  const over = (top, bottom) => ({ r: top.r * top.a + bottom.r * (1 - top.a), g: top.g * top.a + bottom.g * (1 - top.a), b: top.b * top.a + bottom.b * (1 - top.a), a: 1 });
  const layers = []; for (let n = el; n; n = n.parentElement) { const bg = parse(getComputedStyle(n).backgroundColor); if (bg.a > 0) layers.push(bg); if (bg.a === 1) break; }
  let back = layers.length && layers[layers.length - 1].a === 1 ? layers.pop() : { r: 15, g: 23, b: 42, a: 1 };
  while (layers.length) back = over(layers.pop(), back);
  const fg = over(parse(getComputedStyle(el).color), back);
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const a = lum(fg), b = lum(back);
  return Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100;
}, selector);

(async () => {
  const browser = await launch();

  // ---- every size, with a long bar of notes
  for (const [name, width, height, touch] of [["1920", 1920, 1080, false], ["1440", 1440, 900, false], ["1024", 1024, 768, false], ["768", 768, 1024, true], ["390", 390, 844, true], ["844x390 landscape", 844, 390, true]]) {
    const page = await start(browser, { width, height, touch, storage: { "ctd.memo.v2": many(14) } });
    await openModal(page);
    const m = await measure(page);
    ok(!m.hscroll && m.inside && m.editorScrolls, `${name}: no horizontal scroll, the modal sits inside the screen (${m.modal.join("x")})`);
    ok(m.minFont >= 11, `${name}: smallest text in the modal is ${m.minFont}px`);
    if (width < 640) ok(m.small.length === 0, `${name}: every control in the modal is at least 44px`, JSON.stringify(m.small));
    // the active tab is always fully visible, also the last of 14
    await page.getByRole("tablist", { name: "Catatan" }).getByRole("tab").last().click();
    await page.waitForTimeout(300);
    const visible = await page.evaluate(() => { const t = document.querySelector('[data-memo-open] [role=tab][aria-selected=true]').getBoundingClientRect(), l = document.querySelector('[data-memo-open] [role=tablist][aria-label=Catatan]').getBoundingClientRect(); return t.left >= l.left - 1 && t.right <= l.right + 1; });
    ok(visible, `${name}: the active tab (the 14th) is scrolled fully into view`);
    ok(await page.evaluate(() => /mask-image|linear-gradient/.test(getComputedStyle(document.querySelector("[role=tablist][aria-label=Catatan]")).maskImage || "")), `${name}: the bar fades at the edge it can still scroll to`);
    if (name === "1440" || name === "390") await page.screenshot({ path: `${SHOTS}/memo-modal-${name}-tabs-after.png` });
    await page.context().close();
  }

  // ---- long press on a phone opens the tab menu
  let page = await start(browser, { width: 390, height: 844, touch: true, storage: { "ctd.memo.v2": many(3) } });
  await openModal(page);
  const box = await page.getByRole("tablist", { name: "Catatan" }).getByRole("tab").nth(1).boundingBox();
  const touch = await page.context().newCDPSession(page);
  await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: box.x + 20, y: box.y + 10 }] });
  await page.waitForTimeout(650);
  // Android sends a context menu event with the long press; the menu must stay open
  await page.getByRole("tablist", { name: "Catatan" }).getByRole("tab").nth(1).dispatchEvent("contextmenu");
  await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(200);
  ok(await page.getByRole("menu").isVisible(), "a long press on a tab opens its menu and it stays open");
  ok((await page.getByRole("menuitem").first().evaluate(el => el.getBoundingClientRect().height)) >= 44, "menu items are 44px tall on a phone");
  await page.context().close();

  // ---- contrast of the badges and states
  page = await start(browser, { storage: { "ctd.memo.v2": many(2) } });
  const card = {
    "card info pill": '[data-memo-card] button[aria-label="Buka semua catatan"]',
    "card Edit": '[data-memo-card] button[aria-label^="Edit catatan"]',
    "card text": "[data-memo-card] [data-memo-copy]",
  };
  const ratios = {};
  for (const [label, selector] of Object.entries(card)) ratios[label] = await contrast(page, selector);
  await openModal(page);
  await page.locator(EDITOR).click();
  await page.keyboard.type("x");
  await page.waitForTimeout(500);
  Object.assign(ratios, {
    "footer status (Belum disimpan)": await contrast(page, "[data-memo-open] [role=status]"),
    "Simpan (enabled)": await contrast(page, "[data-memo-open] button.bg-sky-700"),
    "active tab": await contrast(page, '[role=tab][aria-selected="true"]'),
    "other tab": await contrast(page, '[role=tab][aria-selected="false"]'),
    "pressed tool": null,
    "counter": await contrast(page, "[data-memo-open] span.font-mono"),
  });
  await page.keyboard.press("Control+a");
  await page.getByRole("toolbar").getByRole("button", { name: "Tebal", exact: true }).click();
  ratios["pressed tool"] = await contrast(page, '[role=toolbar] button[aria-pressed="true"]');
  await save(page);
  ratios["Simpan (disabled)"] = await contrast(page, "[data-memo-open] button:disabled");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("[data-memo-card]");
  await openModal(page);
  await page.locator(EDITOR).click();
  await page.keyboard.type("draft");
  await page.waitForTimeout(500);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("[data-memo-card]");
  await openModal(page);
  ratios["badge Draft dipulihkan"] = await contrast(page, "[data-memo-open] span.rounded-full.border");
  const entries = Object.entries(ratios).filter(([, v]) => v !== null);
  const lowest = entries.reduce((a, b) => (b[1] < a[1] ? b : a));
  for (const [label, value] of entries) console.log("  contrast", String(value).padStart(5), label);
  ok(lowest[1] >= 4.5, `lowest contrast ratio is ${lowest[1]}:1 (${lowest[0]})`);
  await page.context().close();

  // ---- closing releases everything, 20 quick cycles, CLS
  page = await start(browser, { storage: { "ctd.memo.v2": many(3) } });
  await page.evaluate(() => { window.__memoShifts = 0; new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput && e.sources.some(s => s.node && s.node.parentElement && s.node.parentElement.closest("[data-memo-card], [data-memo-open]"))) window.__memoShifts += e.value; }).observe({ type: "layout-shift", buffered: true }); });
  for (let i = 0; i < 20; i++) {
    await page.getByRole("button", { name: /Edit catatan/ }).first().click();
    await page.waitForSelector("[data-memo-open] " + EDITOR.replace("[role=textbox]", "[role=textbox]"));
    await page.keyboard.press("Escape");
    await page.waitForSelector("[data-memo-open]", { state: "detached" });
  }
  const released = await page.evaluate(() => ({
    bodyOverflow: getComputedStyle(document.body).overflow, htmlOverflow: getComputedStyle(document.documentElement).overflow,
    inert: document.querySelectorAll("[inert]").length, hidden: [document.body, document.getElementById("app-root")].filter(el => el && el.getAttribute("aria-hidden") === "true").length,
    open: document.querySelectorAll("[data-memo-open]").length, focus: document.activeElement?.getAttribute("aria-label") || document.activeElement?.tagName,
  }));
  ok(released.open === 0 && released.inert === 0 && released.hidden === 0 && !/hidden/.test(released.bodyOverflow + released.htmlOverflow), "20 quick open/close cycles leave no overlay, inert or aria-hidden behind, and scrolling is released: " + JSON.stringify(released));
  await page.mouse.move(150, 500); // over the sidebar: the page body under some charts keeps the wheel for itself
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(250);
  ok(await page.evaluate(() => window.scrollY > 0), "the mouse wheel scrolls the page again");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.keyboard.press("PageDown");
  await page.waitForTimeout(250);
  ok(await page.evaluate(() => window.scrollY > 0), "the keyboard scrolls the page again");
  ok(await page.evaluate(() => window.__memoShifts) === 0, "CLS of the card and the modal is 0 (got " + (await page.evaluate(() => window.__memoShifts)) + ")");
  console.log("errors:", page.errors.filter(e => !/preload/.test(e)));
  await page.context().close();
  // the same on a phone, with touch scrolling released
  page = await start(browser, { width: 390, height: 844, touch: true, storage: { "ctd.memo.v2": many(3) } });
  for (let i = 0; i < 5; i++) { await page.getByRole("button", { name: /Edit catatan/ }).first().click(); await page.waitForSelector("[data-memo-open]"); await page.getByRole("button", { name: "Tutup" }).click(); await page.waitForSelector("[data-memo-open]", { state: "detached" }); }
  ok(await page.evaluate(() => !/hidden/.test(getComputedStyle(document.body).overflow)), "phone: the page can scroll again after closing");
  await page.context().close();
  await browser.close();
})().catch(error => { console.log("FAIL", error.message.split("\n")[0]); process.exitCode = 1; });
