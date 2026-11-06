// Run after every build (npm "postbuild"). Everything in dist/client is downloadable by anyone, with no login. This looks through it for
// things that must not be there: the demo password, internal or client host names, email addresses at real domains, phone numbers that look
// real, private IP addresses, and documents placed in public/. Values are never printed, only which rule matched and in which file.
// With CTD_DEPLOY_ENV=production a finding stops the build; without it the findings are warnings.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Addresses that are fine in public files: reserved example domains, the placeholders in the sample data and forms, and the helpdesk address
// shown on the login page. Anything else is treated as a real person's address.
const PUBLIC_EMAIL_DOMAINS = /@(?:example\.(?:com|org|net)|[a-z0-9-]+\.example|company\.id|perusahaan\.id|x\.id|hutabyte\.id)$/i;

export const RULES = [
  { name: "demo account password", pattern: /password123/g },
  // In a URL only: minified code is full of property chains like a.internal
  { name: "internal host name", pattern: /\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:internal|intranet|corp|lan)(?![a-z0-9-])|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.internal\.[a-z0-9.-]+\b/gi },
  { name: "client host name", pattern: /\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:co|go|ac)\.id(?![a-z0-9-])/gi },
  { name: "email address at a real domain", pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g, accept: text => PUBLIC_EMAIL_DOMAINS.test(text) },
  // the fictional numbers in the sample data are all +62 811-0000-xxx
  { name: "phone number that looks real", pattern: /\+62 ?8(?!11-0000-)\d{2}-\d{4}-\d{3}/g },
  { name: "private IP address", pattern: /\b(?:10\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])|192\.168)\.\d{1,3}\.\d{1,3}\b/g },
];
const TEXT_FILE = /\.(js|mjs|css|html|json|map|txt|svg)$/i;
/** A report, a spreadsheet or a note in public/ is served to anyone exactly as it is, and the rules above cannot read inside most of these. */
const DOCUMENT_FILE = /\.(pdf|docx?|xlsx?|pptx?|csv|md|sql|sqlite|db|bak|zip)$/i;

function* files(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(full);
    else yield full;
  }
}

/** Returns [{ rule, file, count }] for every rule that matches in a file under `dir`. */
export function scanBundle(dir, rules = RULES) {
  const findings = [];
  for (const file of files(dir)) {
    const name = relative(dir, file).replace(/\\/g, "/");
    if (DOCUMENT_FILE.test(file)) { findings.push({ rule: "document in the public folder", file: name, count: 1 }); continue; }
    if (!TEXT_FILE.test(file) || statSync(file).size >= 30_000_000) continue;
    const text = readFileSync(file, "utf8");
    for (const { name: rule, pattern, accept } of rules) {
      const count = (text.match(pattern) || []).filter(match => !accept?.(match)).length;
      if (count) findings.push({ rule, file: name, count });
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
