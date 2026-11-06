// Load a page in a real browser and look for the server's RSC compatibility id inside the JavaScript the browser actually received.
const { launch, open } = require("./pw.cjs");
const base = process.argv[2];
(async () => {
  const rsc = await fetch(`${base}/tickets?_rsc`, { headers: { RSC: "1", Accept: "text/x-component" } });
  const serverId = rsc.headers.get("x-vinext-rsc-compatibility-id");
  const browser = await launch();
  const page = await open(browser, { width: 1200, height: 800, noAuth: true });
  const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
  const hits = new Map();
  page.on("response", async r => {
    try {
      if (!/javascript/.test(r.headers()["content-type"] || "")) return;
      const text = await r.text();
      for (const id of text.match(uuid) || []) if (!hits.has(id)) hits.set(id, r.url().replace(base, "").slice(0, 80));
    } catch {}
  });
  await page.goto(`${base}/login`, { waitUntil: "networkidle" }); await page.waitForTimeout(1500);
  console.log(`${base}  server id: ${serverId}`);
  for (const [id, url] of hits) console.log(`   in browser JS: ${id}  ${id === serverId ? "<== SAME as the server" : "(differs)"}  ${url}`);
  if (!hits.size) console.log("   no UUID in the JavaScript the browser received");
  await browser.close();
})().catch(e => console.log("ERR", e.message));
