/**
 * Prints a Tailwind v4 equivalent of one legacy stylesheet to stdout.
 *
 * Each declaration becomes one unlayered arbitrary-property `@apply` rule.
 * Keeping one directive per declaration preserves declaration order and avoids
 * semantic rounding while CSS files coexist during the migration review.
 * This tool intentionally never writes to the workspace.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import postcss from "postcss";

const [sourcePath] = process.argv.slice(2);

if (!sourcePath) {
  throw new Error("Usage: node scripts/print-tailwind-migration.mjs <stylesheet>");
}

const source = sourcePath === "-" ? fs.readFileSync(0, "utf8") : fs.readFileSync(sourcePath, "utf8");
const root = postcss.parse(source, { from: sourcePath });

function encodeArbitraryValue(value) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/_/g, "\\_")
    .replace(/\]/g, "\\]")
    .replace(/\s+/g, "_");
}

function hasKeyframeAncestor(node) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (parent.type === "atrule" && parent.name === "keyframes") return true;
  }
  return false;
}

function mustRemainRaw(declaration) {
  const parentName = declaration.parent?.type === "atrule" ? declaration.parent.name : "";
  return hasKeyframeAncestor(declaration) || ["font-face", "property", "theme"].includes(parentName);
}

root.walkDecls((declaration) => {
  if (mustRemainRaw(declaration)) return;

  const important = declaration.important ? "!" : "";
  const utility = `${important}[${declaration.prop}:${encodeArbitraryValue(declaration.value)}]`;
  declaration.replaceWith(postcss.atRule({ name: "apply", params: utility }));
});

const header = [
  "/*",
  ` * Tailwind v4 migration of ${sourcePath === "-" ? "legacy source" : path.basename(sourcePath)}.`,
  " * Legacy declarations are represented one-for-one as arbitrary-property utilities.",
  " * Keep the matching legacy source file unimported until visual review is approved.",
  " */",
  "",
].join("\n");

process.stdout.write(`${header}${root.toString()}\n`);
