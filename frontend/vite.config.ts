import vinext from "vinext";
import { defineConfig, loadEnv, type ViteDevServer } from "vite";
import hostingConfig from "./.openai/hosting.json";
import { sites } from "./build/sites-vite-plugin";
import { canonicalRoute } from "./app/lib/canonical-route";
import { vinextNavigationCompat } from "./build/vinext-navigation-compat";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "site-creator-d1",
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

export default defineConfig(async ({ mode }) => {
  // An unset NEXT_PUBLIC_* variable is left as `{}.NAME` in the browser code, which the bundler cannot evaluate. This one decides whether the
  // demo accounts (a known password) are in the build at all, so it is always written in, empty when unset (see lib/auth.tsx).
  const publicEnv = { ...loadEnv(mode, process.cwd(), ["NEXT_PUBLIC_", "CTD_"]), ...process.env };
  const demoLogin = String(publicEnv.NEXT_PUBLIC_ALLOW_DEMO_LOGIN ?? "").trim();
  // Dev server only. Vite already answers to localhost and to IP addresses (so opening it by LAN IP works). Other host names (a tunnel, a
  // shared dev domain) must be named in CTD_DEV_ALLOWED_HOSTS, comma separated; "*" allows any (anyone who can reach the port can then use it).
  const devHosts = String(publicEnv.CTD_DEV_ALLOWED_HOSTS ?? "").split(",").map(host => host.trim()).filter(Boolean);

  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    define: { "process.env.NEXT_PUBLIC_ALLOW_DEMO_LOGIN": JSON.stringify(demoLogin) },
    server: {
      ...(isCodexSeatbeltSandbox ? { watch: { useFsEvents: false, usePolling: true } } : {}),
      allowedHosts: devHosts.includes("*") ? (true as const) : devHosts,
    },
    plugins: [
      {
        name: "ctd-canonical-navigation",
        enforce: "pre",
        configureServer(server: ViteDevServer) {
          server.middlewares.use((request, response, next) => {
            const canonical = canonicalRoute(new URL(request.url ?? "/", "http://localhost"));
            if (!canonical) { next(); return; }
            response.statusCode = canonical.status;
            response.setHeader("Location", canonical.url.pathname + canonical.url.search);
            response.end();
          });
        },
      },
      vinext(),
      vinextNavigationCompat(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
      }),
    ],
  };
});
