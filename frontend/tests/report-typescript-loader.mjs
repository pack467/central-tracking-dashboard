import { registerHooks } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const root = new URL("../", import.meta.url);
      const relative = specifier.slice(2);
      const base = new URL(relative, root);
      if (existsSync(fileURLToPath(base))) {
        return nextResolve(base.href, context);
      }
      if (existsSync(fileURLToPath(new URL(`${relative}.ts`, root)))) {
        return nextResolve(new URL(`${relative}.ts`, root).href, context);
      }
      if (existsSync(fileURLToPath(new URL(`${relative}.tsx`, root)))) {
        return nextResolve(new URL(`${relative}.tsx`, root).href, context);
      }
    }
    if (specifier.startsWith("./") && (context.parentURL?.endsWith(".ts") || context.parentURL?.endsWith(".tsx")) && !specifier.endsWith(".ts") && !specifier.endsWith(".tsx")) {
      const parentDir = new URL("./", context.parentURL);
      if (existsSync(fileURLToPath(new URL(`${specifier}.ts`, parentDir)))) {
        return nextResolve(`${specifier}.ts`, context);
      }
      if (existsSync(fileURLToPath(new URL(`${specifier}.tsx`, parentDir)))) {
        return nextResolve(`${specifier}.tsx`, context);
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if ((url.endsWith(".ts") || url.endsWith(".tsx")) && !url.includes("/node_modules/")) {
      const source = ts.transpileModule(readFileSync(new URL(url), "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
        },
      }).outputText;
      return { format: "module", source, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
