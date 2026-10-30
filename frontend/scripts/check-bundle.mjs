// Run after every build (npm "postbuild"). Everything in dist/client is downloadable by anyone, with no login. This looks through it for
// things that must not be there: the demo password, internal host names, company email addresses, phone numbers that look real and
// private IP addresses. Values are never printed, only which rule matched and in which file.
// With CTD_DEPLOY_ENV=production a finding stops the build; without it the findings are warnings.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const RULES = [
  { name: "demo account password", pattern: /password123/g },
  { name: "internal host name", pattern: /\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.internal\.[a-z0-9.-]+\b/gi },
  { name: "company email address", pattern: /[A-Za-z0-9._%+-]+@tritronik\.com/gi },
  // the fictional numbers in the sample data are all +62 811-0000-xxx
  { name: "phone number that looks real", pattern: /\+62 ?8(?!11-0000-)\d{2}-\d{4}-\d{3}/g },
  { name: "private IP address", pattern: /\b(?:10\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])|192\.168)\.\d{1,3}\.\d{1,3}\b/g },
];
const TEXT_FILE = /\.(js|mjs|css|html|json|map|txt|svg)$/i;

function* files(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(full);
    else if (TEXT_FILE.test(entry.name) && statSync(full).size < 30_000_000) yield full;
  }
}

/** Returns [{ rule, file, count }] for every rule that matches in a file under `dir`. */
export function scanBundle(dir, rules = RULES) {
  const findings = [];
  for (const file of files(dir)) {
    const text = readFileSync(file, "utf8");
    for (const { name, pattern } of rules) {
      const count = (text.match(pattern) || []).length;
      if (count) findings.push({ rule: name, file: relative(dir, file).replace(/\\/g, "/"), count });
    }
  }
  return findings;
}

function main() {
  const dir = resolve(process.cwd(), "dist/client");
  if (!existsSync(dir)) { console.log("[bundle] no dist/client to check"); return; }
  const strict = process.env.CTD_DEPLOY_ENV === "production";
  const findings = scanBundle(dir);
  if (!findings.length) { console.log(`[bundle] public bundle clean${strict ? " (production checks on)" : ""}`); return; }
  const out = strict ? console.error : console.warn;
  for (const { rule, file, count } of findings) out(`[bundle] ${strict ? "error" : "warning"}: ${rule} x${count} in ${file}`);
  if (strict) {
    console.error("[bundle] Build stopped: the files above are downloadable by anyone. Remove the data from the source, or build without it.");
    process.exit(1);
  }
  console.warn("[bundle] CTD_DEPLOY_ENV is not 'production', so these are warnings. The pipeline that builds for users must set it.");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
