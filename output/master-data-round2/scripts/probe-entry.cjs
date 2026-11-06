// Follow the browser entry module graph with plain HTTP (no browser cache) and report where the RSC compatibility id literal appears.
const base = process.argv[2];
(async () => {
  const serverId = (await fetch(`${base}/tickets?_rsc`, { headers: { RSC: "1", Accept: "text/x-component" } })).headers.get("x-vinext-rsc-compatibility-id");
  const seen = new Set(), found = [];
  const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
  async function scan(url, depth) {
    if (seen.has(url) || seen.size > 120 || depth > 4) return;
    seen.add(url);
    let text; try { const r = await fetch(new URL(url, base)); if (!r.ok) return; text = await r.text(); } catch { return; }
    const ids = [...new Set(text.match(uuid) || [])];
    if (/COMPATIBILITY|compat/i.test(text) || ids.length) found.push({ url: url.slice(0, 110), ids, hasCompatName: /getVinextRscCompatibilityId|RSC_COMPATIBILITY/.test(text) });
    for (const m of text.matchAll(/(?:from|import\()\s*["']([^"']+)["']/g)) { const next = m[1]; if (next.startsWith("/") && !/\.(css|png|svg)$/.test(next)) await scan(next, depth + 1); }
  }
  await scan("/@id/__x00__virtual:vite-rsc/entry-browser", 0);
  console.log(`${base}  server id ${serverId}  | scanned ${seen.size} modules`);
  for (const f of found) console.log(`  ${f.hasCompatName ? "[compat code] " : "             "}${f.url}  ids=${f.ids.map(i => i.slice(0, 8) + (i === serverId ? "(=server)" : "(other)")).join(",") || "-"}`);
})().catch(e => console.log("ERR", e.message));
