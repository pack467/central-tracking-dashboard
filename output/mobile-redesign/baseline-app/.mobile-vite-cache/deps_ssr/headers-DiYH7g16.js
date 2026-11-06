import { n as __exportAll } from "./chunk-CYJPkc-J.js";
import { a as MIDDLEWARE_SKIP_HEADER, c as VINEXT_PRERENDER_SECRET_HEADER, i as MIDDLEWARE_SET_COOKIE_HEADER, l as VINEXT_PRERENDER_SPECULATIVE_HEADER, n as MIDDLEWARE_OVERRIDE_HEADERS, o as VINEXT_MW_CTX_HEADER, s as VINEXT_PRERENDER_ROUTE_PARAMS_HEADER, t as MIDDLEWARE_HEADER_PREFIX } from "./protocol-headers-BrU4B1nn.js";
//#region ../../../frontend/node_modules/vinext/dist/server/headers.js
var headers_exports = /* @__PURE__ */ __exportAll({
	ACTION_FORWARDED_HEADER: () => ACTION_FORWARDED_HEADER,
	ACTION_REDIRECT_HEADER: () => ACTION_REDIRECT_HEADER,
	ACTION_REDIRECT_STATUS_HEADER: () => ACTION_REDIRECT_STATUS_HEADER,
	ACTION_REDIRECT_TYPE_HEADER: () => ACTION_REDIRECT_TYPE_HEADER,
	ACTION_REVALIDATED_HEADER: () => ACTION_REVALIDATED_HEADER,
	FLIGHT_HEADERS: () => FLIGHT_HEADERS,
	INTERNAL_HEADERS: () => INTERNAL_HEADERS,
	MIDDLEWARE_HEADER_PREFIX: () => MIDDLEWARE_HEADER_PREFIX,
	MIDDLEWARE_NEXT_HEADER: () => MIDDLEWARE_NEXT_HEADER,
	MIDDLEWARE_REWRITE_HEADER: () => MIDDLEWARE_REWRITE_HEADER,
	MIDDLEWARE_SET_COOKIE_HEADER: () => MIDDLEWARE_SET_COOKIE_HEADER,
	MIDDLEWARE_SKIP_HEADER: () => MIDDLEWARE_SKIP_HEADER,
	NEXTJS_ACTION_NOT_FOUND_HEADER: () => NEXTJS_ACTION_NOT_FOUND_HEADER,
	NEXTJS_CACHE_HEADER: () => NEXTJS_CACHE_HEADER,
	NEXTJS_DEPLOYMENT_ID_HEADER: () => NEXTJS_DEPLOYMENT_ID_HEADER,
	NEXT_ACTION_HEADER: () => NEXT_ACTION_HEADER,
	NEXT_HTML_REQUEST_ID_HEADER: () => NEXT_HTML_REQUEST_ID_HEADER,
	NEXT_REQUEST_ID_HEADER: () => NEXT_REQUEST_ID_HEADER,
	NEXT_ROUTER_PREFETCH_HEADER: () => NEXT_ROUTER_PREFETCH_HEADER,
	NEXT_ROUTER_SEGMENT_PREFETCH_HEADER: () => NEXT_ROUTER_SEGMENT_PREFETCH_HEADER,
	NEXT_ROUTER_STATE_TREE_HEADER: () => NEXT_ROUTER_STATE_TREE_HEADER,
	NEXT_URL_HEADER: () => NEXT_URL_HEADER,
	RSC_ACTION_HEADER: () => RSC_ACTION_HEADER,
	RSC_HEADER: () => "RSC",
	VINEXT_CACHE_HEADER: () => VINEXT_CACHE_HEADER,
	VINEXT_CLIENT_REUSE_MANIFEST_HEADER: () => VINEXT_CLIENT_REUSE_MANIFEST_HEADER,
	VINEXT_DYNAMIC_STALE_TIME_HEADER: () => VINEXT_DYNAMIC_STALE_TIME_HEADER,
	VINEXT_INTERCEPTION_CONTEXT_HEADER: () => VINEXT_INTERCEPTION_CONTEXT_HEADER,
	VINEXT_INTERNAL_HEADERS: () => VINEXT_INTERNAL_HEADERS,
	VINEXT_MOUNTED_SLOTS_HEADER: () => VINEXT_MOUNTED_SLOTS_HEADER,
	VINEXT_MW_CTX_HEADER: () => VINEXT_MW_CTX_HEADER,
	VINEXT_PARAMS_HEADER: () => VINEXT_PARAMS_HEADER,
	VINEXT_PRERENDER_CACHE_LIFE_HEADER: () => VINEXT_PRERENDER_CACHE_LIFE_HEADER,
	VINEXT_PRERENDER_PAGES_STATIC_PATHS_PATH: () => VINEXT_PRERENDER_PAGES_STATIC_PATHS_PATH,
	VINEXT_PRERENDER_ROUTE_PARAMS_HEADER: () => VINEXT_PRERENDER_ROUTE_PARAMS_HEADER,
	VINEXT_PRERENDER_SECRET_HEADER: () => VINEXT_PRERENDER_SECRET_HEADER,
	VINEXT_PRERENDER_SPECULATIVE_HEADER: () => VINEXT_PRERENDER_SPECULATIVE_HEADER,
	VINEXT_PRERENDER_STATIC_PARAMS_PATH: () => VINEXT_PRERENDER_STATIC_PARAMS_PATH,
	VINEXT_RENDERED_PATH_AND_SEARCH_HEADER: () => VINEXT_RENDERED_PATH_AND_SEARCH_HEADER,
	VINEXT_REVALIDATE_HEADER: () => VINEXT_REVALIDATE_HEADER,
	VINEXT_RSC_MARKER_HEADER: () => VINEXT_RSC_MARKER_HEADER,
	VINEXT_RSC_REDIRECT_HEADER: () => VINEXT_RSC_REDIRECT_HEADER,
	VINEXT_RSC_REDIRECT_TYPE_HEADER: () => VINEXT_RSC_REDIRECT_TYPE_HEADER,
	VINEXT_RSC_RENDER_MODE_HEADER: () => VINEXT_RSC_RENDER_MODE_HEADER,
	VINEXT_STATIC_FILE_HEADER: () => VINEXT_STATIC_FILE_HEADER,
	VINEXT_TIMING_HEADER: () => VINEXT_TIMING_HEADER
});
/**
* Internal HTTP header name constants used throughout vinext.
*
* Centralizes all custom header names so they are defined once and referenced
* everywhere via imports. Keeping them in one module prevents typos, makes
* rename-refactors trivial, and lets grep find every consumer instantly.
*
* Standard HTTP headers (Content-Type, Cache-Control, etc.) are intentionally
* omitted — only vinext-internal and Next.js-protocol headers belong here.
*/
/** ISR / page cache state indicator: "HIT" | "MISS" | "STALE" | "STATIC". */
var VINEXT_CACHE_HEADER = "X-Vinext-Cache";
/** Next.js public ISR / page cache state indicator. */
var NEXTJS_CACHE_HEADER = "x-nextjs-cache";
/** Static file signal — value is URL-encoded pathname. */
var VINEXT_STATIC_FILE_HEADER = "x-vinext-static-file";
/** Timing metrics: `handlerStart,compileMs,renderMs`. */
var VINEXT_TIMING_HEADER = "x-vinext-timing";
/** Internal endpoint used to evaluate App Router generateStaticParams exports. */
var VINEXT_PRERENDER_STATIC_PARAMS_PATH = "/__vinext/prerender/static-params";
/** Internal endpoint used to evaluate Pages Router getStaticPaths exports. */
var VINEXT_PRERENDER_PAGES_STATIC_PATHS_PATH = "/__vinext/prerender/pages-static-paths";
/** TPR (Tailored Per-Request) revalidation interval in seconds. */
var VINEXT_REVALIDATE_HEADER = "x-vinext-revalidate";
/** Marker on cached ISR entries indicating RSC payload (value "1"). */
var VINEXT_RSC_MARKER_HEADER = "x-vinext-rsc";
/** URL-encoded JSON route params carried on RSC responses. */
var VINEXT_PARAMS_HEADER = "X-Vinext-Params";
/** Deduplicated, sorted list of mounted layout slots for cache keying. */
var VINEXT_MOUNTED_SLOTS_HEADER = "X-Vinext-Mounted-Slots";
/** Per-page dynamic stale time in seconds for App Router RSC responses. */
var VINEXT_DYNAMIC_STALE_TIME_HEADER = "X-Vinext-Dynamic-Stale-Time";
/** URL-encoded rendered path and search after middleware/config rewrites. */
var VINEXT_RENDERED_PATH_AND_SEARCH_HEADER = "X-Vinext-Rendered-Path-And-Search";
/** Prerender-only JSON side channel carrying request cacheLife metadata. */
var VINEXT_PRERENDER_CACHE_LIFE_HEADER = "x-vinext-prerender-cache-life";
/** Route interception context for parallel/intercepting routes. */
var VINEXT_INTERCEPTION_CONTEXT_HEADER = "X-Vinext-Interception-Context";
/** RSC render mode (e.g. "navigation", "prefetch"). */
var VINEXT_RSC_RENDER_MODE_HEADER = "X-Vinext-Rsc-Render-Mode";
/** Disabled-by-default client hint describing already-held App Router payload entries. */
var VINEXT_CLIENT_REUSE_MANIFEST_HEADER = "X-Vinext-Client-Reuse-Manifest";
/**
* Side-channel signal that an RSC response (HTTP 200) encodes a `redirect()`
* thrown during render. The header value is the redirect target (path-only
* for same-origin, absolute for cross-origin). The flight body still carries
* the canonical `NEXT_REDIRECT;...` digest so Next.js's own tests can read it
* via response.body; this header is purely for vinext's own client
* (`navigateRsc` in app-browser-entry.ts) to follow the redirect inside the
* same navigation transaction — keeping `useTransition`'s pending state
* continuous across the hop. Pre-1347 vinext relied on `fetch`'s auto-follow
* of a 307 for that, but the new 200 + flight format leaves it without a
* cheap way to detect the redirect ahead of stream decode.
*/
var VINEXT_RSC_REDIRECT_HEADER = "X-Vinext-Rsc-Redirect";
/** History update mode encoded by a streamed RSC redirect. */
var VINEXT_RSC_REDIRECT_TYPE_HEADER = "X-Vinext-Rsc-Redirect-Type";
/** Server Action invocation header (vinext/vite-rsc protocol). */
var RSC_ACTION_HEADER = "x-rsc-action";
/** Next.js Server Action invocation header (fallback for x-rsc-action). */
var NEXT_ACTION_HEADER = "next-action";
/** Next.js action-not-found indicator (value "1"). */
var NEXTJS_ACTION_NOT_FOUND_HEADER = "x-nextjs-action-not-found";
/**
* Deployment ID header used by the Pages Router for deployment-skew
* protection. Set on every `/_next/data/` response so the client can detect
* when a new deployment has been rolled out and trigger a hard navigation.
* Mirrors `NEXT_NAV_DEPLOYMENT_ID_HEADER` from Next.js `lib/constants.ts`.
*/
var NEXTJS_DEPLOYMENT_ID_HEADER = "x-nextjs-deployment-id";
/** Forwarded action marker — set when a request has already been forwarded between workers. */
var ACTION_FORWARDED_HEADER = "x-action-forwarded";
/** Indicates revalidation occurred — value is JSON kind (1 = path/tag, 2 = dynamic-only). */
var ACTION_REVALIDATED_HEADER = "x-action-revalidated";
/** Redirect URL from a Server Action. */
var ACTION_REDIRECT_HEADER = "x-action-redirect";
/** Redirect type from a Server Action ("push" | "replace"). */
var ACTION_REDIRECT_TYPE_HEADER = "x-action-redirect-type";
/** HTTP status for a Server Action redirect (e.g. "308"). */
var ACTION_REDIRECT_STATUS_HEADER = "x-action-redirect-status";
/** Signal from `NextResponse.next()` — value "1" means "continue to next handler". */
var MIDDLEWARE_NEXT_HEADER = "x-middleware-next";
/** Rewrite destination URL set by `NextResponse.rewrite()`. */
var MIDDLEWARE_REWRITE_HEADER = "x-middleware-rewrite";
/** Redirect URL set by middleware. */
var MIDDLEWARE_REDIRECT_HEADER = "x-middleware-redirect";
var NEXT_ROUTER_STATE_TREE_HEADER = "Next-Router-State-Tree";
var NEXT_ROUTER_PREFETCH_HEADER = "Next-Router-Prefetch";
var NEXT_ROUTER_SEGMENT_PREFETCH_HEADER = "Next-Router-Segment-Prefetch";
var NEXT_URL_HEADER = "Next-Url";
var NEXT_REQUEST_ID_HEADER = "x-nextjs-request-id";
var NEXT_HTML_REQUEST_ID_HEADER = "x-nextjs-html-request-id";
/** Lowercase flight header variants used in middleware forwarding. */
var FLIGHT_HEADERS = [
	"rsc",
	"next-router-state-tree",
	"next-router-prefetch",
	"next-hmr-refresh",
	"next-router-segment-prefetch"
];
/**
* Headers that must be stripped from external requests before any handler
* processes them. An attacker could forge these to influence routing or
* impersonate internal data fetches.
*
* Ported from Next.js `INTERNAL_HEADERS`:
* https://github.com/vercel/next.js/blob/canary/packages/next/src/server/lib/server-ipc/utils.ts
*/
var INTERNAL_HEADERS = [
	MIDDLEWARE_REWRITE_HEADER,
	MIDDLEWARE_REDIRECT_HEADER,
	MIDDLEWARE_SET_COOKIE_HEADER,
	MIDDLEWARE_SKIP_HEADER,
	MIDDLEWARE_OVERRIDE_HEADERS,
	MIDDLEWARE_NEXT_HEADER,
	"x-now-route-matches",
	"x-matched-path",
	"x-nextjs-data",
	"x-next-resume-state-length",
	ACTION_FORWARDED_HEADER
];
/** Vinext-only internal headers stripped alongside Next.js protocol internals. */
var VINEXT_INTERNAL_HEADERS = [
	VINEXT_PRERENDER_ROUTE_PARAMS_HEADER,
	VINEXT_PRERENDER_SPECULATIVE_HEADER,
	VINEXT_PRERENDER_CACHE_LIFE_HEADER
];
//#endregion
export { NEXT_ROUTER_PREFETCH_HEADER as a, NEXT_URL_HEADER as c, VINEXT_INTERCEPTION_CONTEXT_HEADER as d, VINEXT_MOUNTED_SLOTS_HEADER as f, headers_exports as g, VINEXT_RSC_RENDER_MODE_HEADER as h, NEXT_REQUEST_ID_HEADER as i, VINEXT_CLIENT_REUSE_MANIFEST_HEADER as l, VINEXT_RENDERED_PATH_AND_SEARCH_HEADER as m, NEXTJS_DEPLOYMENT_ID_HEADER as n, NEXT_ROUTER_SEGMENT_PREFETCH_HEADER as o, VINEXT_PARAMS_HEADER as p, NEXT_HTML_REQUEST_ID_HEADER as r, NEXT_ROUTER_STATE_TREE_HEADER as s, FLIGHT_HEADERS as t, VINEXT_DYNAMIC_STALE_TIME_HEADER as u };

//# sourceMappingURL=headers-DiYH7g16.js.map