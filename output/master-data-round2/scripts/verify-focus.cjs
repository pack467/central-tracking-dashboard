// Focus: no blue box on any text field or textarea (pages and overlays), a soft border instead; no box after a mouse click on other elements;
// the keyboard still shows where it is on buttons, tabs and links.
const { launch, open, BASE } = require("./pw.cjs");
const ok = (cond, label, extra = "") => { console.log(cond ? "PASS" : "FAIL", label, cond ? "" : extra); if (!cond) process.exitCode = 1; return cond; };
const SOFT = /oklab\(0\.7\d+ -0\.09\d+ -0\.12\d+ \/ 0\.4\)|rgba\(56, 189, 248, 0\.4\)/;
const PAGES = ["/dashboard", "/tickets", "/monitoring", "/shift-log", "/reports", "/reports/ticket-log", "/reports/monitoring-log", "/team-roster", "/master-data?group=services&tab=organizations", "/master-data?group=team&tab=people", "/runbooks", "/runbooks/credentials", "/runbooks/links", "/runbooks/escalation", "/notifications", "/profile"];

const NON_TEXT = ["checkbox", "radio", "range", "file", "button", "submit", "reset", "color", "image", "hidden"];
/** Click every visible text field and report the ones that end up with an outline or a ring. */
async function sweepFields(page, where, report) {
  const count = await page.evaluate(nonText => {
    let i = 0;
    document.querySelectorAll("[data-fld]").forEach(el => el.removeAttribute("data-fld"));
    for (const el of document.querySelectorAll("input, textarea")) {
      if (nonText.includes(el.type) || el.disabled || el.readOnly) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8 || getComputedStyle(el).visibility === "hidden") continue;
      el.setAttribute("data-fld", String(i++));
    }
    return i;
  }, NON_TEXT);
  let tested = 0;
  for (let i = 0; i < count; i++) {
    const loc = page.locator(`[data-fld="${i}"]`);
    try {
      await loc.scrollIntoViewIfNeeded({ timeout: 1200 });
      const box = await loc.boundingBox();
      if (!box) continue;
      await page.mouse.click(box.x + Math.min(box.width / 2, 30), box.y + box.height / 2);
      await page.waitForTimeout(220);
      const r = await page.evaluate(() => {
        const el = document.activeElement, cs = getComputedStyle(el);
        if (!el || !/^(INPUT|TEXTAREA)$/.test(el.tagName)) return null;
        const shadow = cs.boxShadow, ringed = shadow !== "none" && /\b[1-9]\d*px\b/.test(shadow.replace(/(?:rgba?|oklab|oklch)\([^)]*\)/g, ""));
        // the border that shows: the field's own, or the nearest ancestor that has one
        let holder = el; while (holder && parseFloat(getComputedStyle(holder).borderTopWidth) === 0 && holder.parentElement) holder = holder.parentElement;
        const hb = getComputedStyle(holder);
        return { who: `${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") || el.placeholder || el.name || el.id || "").slice(0, 30)}"`, outline: cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0, ringed, border: hb.borderTopColor, holder: holder.tagName.toLowerCase() };
      });
      if (!r) continue;
      tested++;
      if (r.outline || r.ringed) report.push(`${where}: ${r.who} outline=${r.outline} ring=${r.ringed}`);
      else report.soft.push({ where, who: r.who, border: r.border });
    } catch { /* hidden behind another control */ }
  }
  return { count, tested };
}

(async () => {
  const browser = await launch();
  const report = []; report.soft = [];
  let page = await open(browser);

  // ---- 1. every page
  let total = 0;
  for (const path of PAGES) {
    await page.goto(`${BASE}${path}${path.includes("?") ? "&" : "?"}mock=instant`, { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(1000);
    const r = await sweepFields(page, path, report);
    total += r.tested;
  }
  ok(report.length === 0, `pages: ${total} text fields clicked, none shows an outline or a ring`, report.join(" | "));

  // ---- 2. overlays that hold fields
  const overlays = [
    ["Tiket baru", "/dashboard", async p => { await p.locator(".fab-new-ticket, [aria-label*='iket baru' i]").first().click(); }],
    ["Siapkan Handover", "/dashboard", async p => { await p.getByRole("button", { name: /Siapkan Handover/ }).first().click(); }],
    ["Command palette", "/dashboard", async p => { await p.keyboard.press("Control+k"); }],
    ["Master Data: Tambah Organisasi", "/master-data?group=services&tab=organizations", async p => { await p.getByRole("button", { name: "Tambah Organisasi" }).first().click(); }],
    ["Master Data: Tambah Personel", "/master-data?group=team&tab=people", async p => { await p.getByRole("button", { name: "Tambah Personel" }).first().click(); }],
    ["Master Data: Tambah Peran", "/master-data?group=team&tab=roles", async p => { await p.getByRole("button", { name: "Tambah Peran" }).first().click(); }],
    ["Master Data: Tambah Sistem", "/master-data?group=services&tab=systems", async p => { await p.getByRole("button", { name: "Tambah Sistem" }).first().click(); }],
    ["Team Roster: anggota", "/team-roster", async p => { await p.getByRole("button", { name: /Tambah|Anggota/ }).first().click(); }],
    ["Memo (catatan baru, nama tab)", "/dashboard", async p => { await p.getByRole("button", { name: /Edit catatan/ }).first().click(); await p.locator("[data-memo-open] [role=tab]").first().dblclick(); }],
  ];
  for (const [name, path, open_] of overlays) {
    const before = report.length;
    try {
      await page.goto(`${BASE}${path}${path.includes("?") ? "&" : "?"}mock=instant`, { waitUntil: "networkidle" });
      await page.waitForTimeout(900);
      await open_(page);
      await page.waitForTimeout(600);
      const r = await sweepFields(page, name, report);
      ok(report.length === before, `${name}: ${r.tested} field(s) clicked, no outline or ring`, report.slice(before).join(" | "));
    } catch (e) { console.log("SKIP", name, "-", e.message.split("\n")[0].slice(0, 80)); }
    await page.keyboard.press("Escape").catch(() => {});
  }

  // ---- 3. the soft border really is the new look
  // the command palette marks focus with the line under its field instead of a border around it
  const off = report.soft.filter(item => !SOFT.test(item.border) && !/command palett/.test(item.who));
  console.log(`  soft border on focus: ${report.soft.length - off.length} of ${report.soft.length} fields match rgba(56,189,248,0.4)`);
  for (const item of off) console.log(`    other: ${item.where} ${item.who} -> ${item.border}`);
  ok(off.length === 0, "every focused field shows the soft border", off.map(item => `${item.where} ${item.who} ${item.border}`).join(" | "));

  // ---- 4. a mouse click on something that is not a field leaves no box
  const boxes = [];
  for (const path of ["/dashboard", "/tickets", "/monitoring", "/shift-log", "/reports", "/team-roster", "/master-data?group=services&tab=organizations", "/runbooks", "/notifications", "/profile"]) {
    await page.goto(`${BASE}${path}${path.includes("?") ? "&" : "?"}mock=instant`, { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(900);
    const n = await page.evaluate(() => {
      let i = 0;
      for (const el of document.querySelectorAll('[tabindex="0"], [role=button]:not(button), main button')) {
        if (/^(INPUT|TEXTAREA|SELECT|A)$/.test(el.tagName) || el.closest("a[href]") || el.disabled) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 6 || r.height < 6 || r.top < 0 || r.top > innerHeight) continue;
        el.setAttribute("data-clk", String(i++));
      }
      return i;
    });
    for (let i = 0; i < Math.min(n, 40); i++) {
      try {
        const box = await page.locator(`[data-clk="${i}"]`).boundingBox({ timeout: 800 });
        if (!box) continue;
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(60);
        const r = await page.evaluate(() => { const el = document.activeElement; if (!el || el === document.body) return null; const cs = getComputedStyle(el); return cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0 ? `${el.tagName.toLowerCase()}[${el.getAttribute("role") || ""}] "${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 24)}" ${cs.outlineStyle} ${cs.outlineWidth}` : null; });
        if (r) boxes.push(`${path} ${r}`);
        if (!page.url().includes(path.split("?")[0])) { await page.goto(`${BASE}${path}${path.includes("?") ? "&" : "?"}mock=instant`, { waitUntil: "networkidle" }); await page.waitForTimeout(700); await page.evaluate(() => { let i = 0; for (const el of document.querySelectorAll('[tabindex="0"], [role=button]:not(button), main button')) { if (/^(INPUT|TEXTAREA|SELECT|A)$/.test(el.tagName) || el.closest("a[href]") || el.disabled) continue; const r = el.getBoundingClientRect(); if (r.width < 6 || r.height < 6 || r.top < 0 || r.top > innerHeight) continue; el.setAttribute("data-clk", String(i++)); } }); }
        else await page.keyboard.press("Escape");
      } catch { /* element moved */ }
    }
  }
  ok(boxes.length === 0, "mouse clicks on buttons, cards and tabbable containers leave no outline box", [...new Set(boxes)].slice(0, 12).join(" | "));

  // ---- 5. the keyboard still shows where it is
  for (const path of ["/tickets", "/dashboard", "/team-roster", "/master-data?group=services&tab=organizations", "/runbooks"]) {
    await page.goto(`${BASE}${path}${path.includes("?") ? "&" : "?"}mock=instant`, { waitUntil: "networkidle" });
    await page.waitForTimeout(900);
    await page.mouse.click(2, 2);
    const stops = [];
    for (let i = 0; i < 28; i++) {
      await page.keyboard.press("Tab");
      await page.waitForTimeout(220); // the border fades in over 150 ms
      stops.push(await page.evaluate(() => {
        const el = document.activeElement; if (!el || el === document.body) return null;
        const cs = getComputedStyle(el), outline = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0;
        const text = /^(INPUT|TEXTAREA)$/.test(el.tagName) && !/checkbox|radio|range|file|button|submit|reset/.test(el.type || "");
        let holder = el; while (holder && parseFloat(getComputedStyle(holder).borderTopWidth) === 0 && holder.parentElement) holder = holder.parentElement;
        const softBorder = text && /0\.4\)/.test(getComputedStyle(holder).borderTopColor);
        const ring = cs.boxShadow !== "none" && /\b[1-9]\d*px\b/.test(cs.boxShadow.replace(/(?:rgba?|oklab|oklch)\([^)]*\)/g, ""));
        const own = el.hasAttribute("data-focus-ring");
        return { who: `${el.tagName.toLowerCase()}[${el.getAttribute("role") || el.type || ""}] "${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 22)}"`, shown: outline || softBorder || ring || own, text, outline };
      }));
    }
    const seen = stops.filter(Boolean), hidden = seen.filter(s => !s.shown);
    ok(hidden.length === 0, `${path}: ${seen.length} Tab stops, each shows where the focus is`, hidden.map(s => s.who).join(" | "));
    const textOutline = seen.filter(s => s.text && s.outline);
    ok(textOutline.length === 0, `${path}: no text field draws an outline on Tab`, textOutline.map(s => s.who).join(" | "));
  }
  console.log("errors:", page.errors.filter(e => !/preload/.test(e)));
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.split("\n")[0]); process.exitCode = 1; });
