import type { Plugin } from "vite";

/**
 * vinext beta.2's Link dynamically imports its navigation support modules.
 * The RSC/Rolldown build redirects that import to the browser entry chunk,
 * whose exports are chunk aliases rather than the navigation module namespace.
 * A static namespace keeps the same runtime and preserves those named exports.
 */
export function vinextNavigationCompat(): Plugin {
  return {
    name: "ctd-vinext-link-navigation",
    enforce: "pre",
    transform(source, id) {
      if (!id.replaceAll("\\", "/").split("?")[0].endsWith("/vinext/dist/shims/link.js")) return;
      if (!source.includes('import("./navigation.js")')) return;
      const specifiers = [...new Set([...source.matchAll(/import\("(\.\.?\/[^"\n]+)"\)/g)].map(match => match[1]))];
      let code = source;
      const namespaces = specifiers.map((specifier, index) => {
        const name = `ctdLinkModule${index}`;
        code = code.replaceAll(`import("${specifier}")`, `Promise.resolve(${name})`);
        return `import * as ${name} from "${specifier}";`;
      });
      return { code: namespaces.join("\n") + "\n" + code, map: null };
    },
  };
}
