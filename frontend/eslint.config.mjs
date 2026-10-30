import { defineConfig, globalIgnores } from "eslint/config";
import eslint from "@eslint/js";
import next from "@next/eslint-plugin-next";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  globalIgnores([
    ".next/**",
    "dist/**",
    "out/**",
    ".wrangler/**",
    "public/reports/pdf.worker.min.mjs",
    "build/**",
    "next-env.d.ts",
  ]),
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  react.configs.flat.recommended,
  react.configs.flat["jsx-runtime"],
  reactHooks.configs.flat["recommended-latest"],
  jsxA11y.flatConfigs.recommended,
  next.configs["core-web-vitals"],
  {
    // Markup is never built from data: React escapes text, and the few places that must write HTML say so here. Anything else that
    // assigns HTML to the page would let a stored note, name or link start a script.
    files: ["app/**/*.{ts,tsx}"],
    ignores: [
      "app/components/dashboard/memo/NoteEditor.tsx", // fills the editor from docToHtml, which escapes every character
      "app/components/dashboard/MemoModal.tsx",       // same
      "app/layout.tsx",                               // one static script built from the build's site address
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        { selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']", message: "Do not write HTML from data. Render elements; if a file really must, add it to the allow-list in eslint.config.mjs with the reason." },
        { selector: "AssignmentExpression[left.property.name=/^(innerHTML|outerHTML)$/]", message: "Do not assign HTML to the page. Build elements, or use textContent." },
        { selector: "CallExpression[callee.property.name='insertAdjacentHTML']", message: "Do not insert HTML from data." },
        { selector: "CallExpression[callee.object.name='document'][callee.property.name=/^(write|writeln)$/]", message: "document.write is not allowed." },
      ],
    },
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.serviceworker,
      },
    },
    settings: {
      "jsx-a11y": {
        components: { Select: "select", MultiSelect: "select" },
      },
      react: {
        version: "detect",
      },
    },
  },
]);

export default eslintConfig;
