// Finds class strings where two display utilities of the same variant fight (e.g. "hidden" + "inline-flex").
const fs = require("fs"), path = require("path");
const APP = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/";
const files = [...fs.readdirSync(APP + "components/master-data").filter(f => f.endsWith(".tsx")).map(f => APP + "components/master-data/" + f), APP + "components/views/MasterDataView.tsx"];
const DISPLAY = new Set(["hidden", "block", "inline-block", "inline", "flex", "inline-flex", "grid", "inline-grid", "table", "contents", "flow-root"]);
// Known class constants (their text is expanded where they are interpolated).
const consts = {};
for (const f of files) { const src = fs.readFileSync(f, "utf8"); for (const m of src.matchAll(/(?:export )?const (\w+Class)\s*=\s*"([^"]+)"/g)) consts[m[1]] = m[2]; }
let issues = 0;
for (const f of files) {
  const lines = fs.readFileSync(f, "utf8").split("\n");
  lines.forEach((line, n) => {
    for (const m of line.matchAll(/(?:className=|["`'])((?:"[^"]*")|(?:\{`[^`]*`\})|(?:`[^`]*`))/g)) {
      let text = m[1].replace(/^\{?[`"]|[`"]\}?$/g, "");
      if (!/\bhidden\b|\bflex\b|\bgrid\b|\bblock\b/.test(text)) continue;
      text = text.replace(/\$\{(\w+Class)\}/g, (_, name) => " " + (consts[name] || "") + " ").replace(/\$\{[^}]*\}/g, " ");
      const byVariant = {};
      for (const token of text.split(/\s+/).filter(Boolean)) {
        const idx = token.lastIndexOf(":"), variant = idx >= 0 ? token.slice(0, idx) : "", util = idx >= 0 ? token.slice(idx + 1) : token;
        if (DISPLAY.has(util)) (byVariant[variant] ||= []).push(util);
      }
      for (const [variant, utils] of Object.entries(byVariant)) {
        const uniq = [...new Set(utils)];
        if (uniq.length > 1) { issues++; console.log(`${path.basename(f)}:${n + 1}  variant "${variant || "base"}": ${uniq.join(" + ")}   ${text.trim().slice(0, 110)}`); }
      }
    }
  });
}
console.log(issues ? `${issues} conflicting display class sets` : "no conflicting display classes");
