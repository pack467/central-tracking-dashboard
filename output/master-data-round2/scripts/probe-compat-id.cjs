// For each dev server: the compatibility id the server sends on an RSC request, and every UUID literal found in the client modules the page loads.
const base = process.argv[2];
(async () => {
  const rsc = await fetch(`${base}/tickets?_rsc`, { headers: { RSC: "1", Accept: "text/x-component" } });
  const serverId = rsc.headers.get("x-vinext-rsc-compatibility-id");
  const html = await (await fetch(`${base}/tickets`)).text();
  const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => m[1]).concat([...html.matchAll(/import\(["']([^"']+)["']\)/g)].map(m => m[1])).concat([...html.matchAll(/from ["'](\/[^"']+)["']/g)].map(m => m[1]));
  const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
  const found = new Map();
  const seen = new Set();
  async function scan(url, depth = 0) {
    if (seen.has(url) || depth > 2 || seen.size > 40) return;
    seen.add(url);
    let text = ""; try { text = await (await fetch(new URL(url, base))).text(); } catch { return; }
    for (const id of text.match(uuid) || []) found.set(id, (found.get(id) || new Set()).add(url.slice(0, 60)));
    if (depth < 2) for (const m of text.matchAll(/(?:from|import\()\s*["'](\/[^"']+)["']/g)) if (/vinext|app-browser|entry|rsc|navigation/.test(m[1])) await scan(m[1], depth + 1);
  }
  for (const s of scripts) await scan(s);
  console.log(`${base}\n  server RSC compatibility id: ${serverId}\n  scanned ${seen.size} modules`);
  for (const [id, where] of found) console.log(`  client UUID ${id}  ${id === serverId ? "<== matches the server" : ""}  in ${[...where][0]}`);
  if (!found.size) console.log("  no UUID literal found in the scanned client modules");
})().catch(e => console.log("ERR", e.message));
