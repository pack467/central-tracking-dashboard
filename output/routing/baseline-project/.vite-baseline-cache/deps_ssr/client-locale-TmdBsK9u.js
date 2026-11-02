import { r as getDeploymentId, t as NEXT_DEPLOYMENT_ID_HEADER } from "./deployment-id-DLqJDCJ3.js";
import { C as getLocalePathPrefix, N as removeTrailingSlash, P as stripBasePath, h as matchRoutePattern, v as routePatternParts, x as detectDomainLocale, y as isUnknownRecord } from "./app-prefetch-fetch-queue-DNONto9g.js";
//#region ../../../frontend/node_modules/vinext/dist/shims/internal/pages-data-url.js
/**
* Client-side helpers for the Pages Router `/_next/data/<buildId>/<page>.json`
* endpoint.
*
* Ported from Next.js:
*   - `packages/next/src/client/page-loader.ts` (`getDataHref`)
*   - `packages/next/src/shared/lib/router/utils/get-asset-path-from-route.ts`
*
* The server-side counterpart lives in `server/pages-data-route.ts` and parses
* the URL shape this module generates. Keep the two in sync — they are the
* wire-format contract between vinext's client navigation and its data
* endpoint.
*/
/**
* Append `.json` and the `/_next/data/<buildId>` prefix to a page pathname.
*
* Mirrors Next.js' `getAssetPathFromRoute` + `getDataHref` behaviour:
*   `/`            → `/_next/data/<id>/index.json`
*   `/about`       → `/_next/data/<id>/about.json`
*   `/index`       → `/_next/data/<id>/index/index.json`  (explicit `/index` page)
*   `/blog/foo`    → `/_next/data/<id>/blog/foo.json`
*
* `pagePath` is the resolved page pathname (already including any locale
* prefix and dynamic-param substitution), with a leading slash and NO
* trailing slash. The function does not URL-encode — the caller is expected
* to have produced a server-routable path.
*/
function buildPagesDataPath(buildId, pagePath) {
	let path = pagePath;
	if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
	let asset;
	if (path === "/") asset = "/index";
	else if (path === "/index" || path.startsWith("/index/")) asset = "/index" + path;
	else asset = path;
	return `/_next/data/${buildId}${asset}.json`;
}
/**
* Build the full data URL including the basePath, the search string, and the
* `/_next/data/<buildId>/<page>.json` segment.
*
* `pagePath` must already be the resolved pathname (param-substituted,
* locale-prefixed where applicable). `search` includes the leading `?`.
*/
function buildPagesDataHref(basePath, buildId, pagePath, search) {
	const dataPath = buildPagesDataPath(buildId, pagePath);
	return `${basePath ? basePath : ""}${dataPath}${search}`;
}
/**
* Find the route pattern (Next.js bracket format) that matches `pathname`.
*
* Patterns are tried in `patterns` order — callers should pre-sort so more
* specific patterns come before catch-alls. Returns `null` when no pattern
* matches, so the caller can fall back to a hard navigation (this is how
* vinext handles routes that exist on the server but are not in the
* client-side loader map, e.g. dev-only pages).
*/
function matchPagesPattern(pathname, patterns) {
	const urlParts = pathname.split("/").filter(Boolean);
	for (const pattern of patterns) {
		const params = matchRoutePattern(urlParts, routePatternParts(pattern));
		if (params !== null) return {
			pattern,
			params
		};
	}
	return null;
}
//#endregion
//#region ../../../frontend/node_modules/vinext/dist/shims/internal/pages-data-fetch-dedup.js
/**
* In-flight request dedup for the Pages Router `/_next/data/<id>/<page>.json`
* endpoint.
*
* Why this exists: when a user (or app code) triggers several near-simultaneous
* navigations to the same gSSP route — e.g. clicking the same `<Link>` multiple
* times before the first navigation lands — each call to `Router.push` would
* otherwise enter its own `navigateClientData()` flow and dispatch its own
* `fetch()` against the data endpoint. That balloons server load and breaks
* Next.js' documented "one fetch per unique data URL" guarantee.
*
* Ported from Next.js: `fetchNextData()` in
* `packages/next/src/shared/lib/router/router.ts`. Next.js maintains an
* `inflightCache` (keyed by the resolved data URL) and reuses the existing
* Promise when a concurrent caller asks for the same URL. The entry is
* dropped once the fetch settles (success or rejection) so the next
* navigation re-fetches fresh.
*
* Design notes:
*
* - Callers receive a cloned Response, so each can independently consume the
*   body (`.json()`, `.text()`, etc.). The originating Response is never read
*   directly by anyone, which keeps subsequent clones legal even after one
*   caller has consumed its copy.
*
* - Each caller owns one waiter. Cancelling a waiter rejects only that caller;
*   the shared request continues and self-evicts when it settles. This mirrors
*   Next.js: a superseded data request may still reach the server, but its
*   result is ignored by the cancelled navigation.
*
* - The map is module-scoped (one per realm). The Pages Router runs in the
*   browser only, so a single `Map` is sufficient.
*/
/** Inflight fetch entries keyed by the resolved data request identity. */
var inflight = /* @__PURE__ */ new Map();
var staticDataCache = Object.create(null);
var staticDataSources = /* @__PURE__ */ new Map();
function getStaticDataKey(dataHref) {
	if (typeof window === "undefined") return dataHref;
	const previewVariant = window.__NEXT_DATA__?.isPreview === true ? "preview" : "normal";
	try {
		return `${new URL(dataHref, window.location.href).href}\n${previewVariant}`;
	} catch {
		return `${dataHref}\n${previewVariant}`;
	}
}
function cloneStaticResponse(cached, signal) {
	if (signal?.aborted) return Promise.reject(new DOMException("Aborted", "AbortError"));
	if (!signal) return cached.then((response) => response.clone());
	return new Promise((resolve, reject) => {
		const abort = () => reject(new DOMException("Aborted", "AbortError"));
		signal.addEventListener("abort", abort, { once: true });
		cached.then((response) => {
			signal.removeEventListener("abort", abort);
			resolve(response.clone());
		}, (error) => {
			signal.removeEventListener("abort", abort);
			reject(error);
		});
	});
}
function getPagesStaticDataCache() {
	return staticDataCache;
}
function fetchCachedPagesData(dataHref, init) {
	const key = getStaticDataKey(dataHref);
	let cached = staticDataSources.get(key);
	if (cached === void 0) {
		const { signal: _signal, ...sharedInit } = init ?? {};
		cached = dedupedPagesDataFetch(dataHref, sharedInit).then((response) => {
			const expectedDeploymentId = getDeploymentId() ?? null;
			const responseDeploymentId = response.headers.get("x-nextjs-deployment-id");
			if (!response.ok || response.headers.get("x-middleware-cache") === "no-cache" || response.headers.get("x-middleware-skip") !== null || responseDeploymentId !== null && responseDeploymentId !== expectedDeploymentId) {
				delete staticDataCache[key];
				staticDataSources.delete(key);
			}
			return response;
		}).catch((error) => {
			delete staticDataCache[key];
			staticDataSources.delete(key);
			throw error;
		});
		staticDataSources.set(key, cached);
		const publicCached = cached.then((response) => response.clone());
		publicCached.catch(() => {});
		staticDataCache[key] = publicCached;
	}
	return cloneStaticResponse(cached, init?.signal ?? void 0);
}
function fetchStaticPagesData(dataHref, init) {
	return fetchCachedPagesData(dataHref, init);
}
function fetchUncachedPagesData(dataHref, init) {
	return fetch(dataHref, init).then(async (response) => {
		const body = await response.arrayBuffer();
		return new Response(body, {
			headers: response.headers,
			status: response.status,
			statusText: response.statusText
		});
	});
}
function evictPagesDataCache(dataHref) {
	const key = getStaticDataKey(dataHref);
	delete staticDataCache[key];
	staticDataSources.delete(key);
}
function getInflightKey(dataHref, init) {
	let resolvedHref = dataHref;
	if (typeof window !== "undefined") try {
		resolvedHref = new URL(dataHref, window.location.href).href;
	} catch {}
	const deploymentId = new Headers(init?.headers).get("x-deployment-id") ?? "";
	const previewVariant = typeof window !== "undefined" && window.__NEXT_DATA__?.isPreview === true ? "preview" : "normal";
	return `${resolvedHref}\n${deploymentId}\n${previewVariant}`;
}
function cloneSharedResponse(key, entry, signal) {
	entry.waiters += 1;
	return new Promise((resolve, reject) => {
		let released = false;
		const release = () => {
			if (released) return;
			released = true;
			entry.waiters -= 1;
		};
		const abort = () => {
			release();
			reject(new DOMException("Aborted", "AbortError"));
		};
		signal?.addEventListener("abort", abort, { once: true });
		entry.promise.then((response) => {
			signal?.removeEventListener("abort", abort);
			release();
			resolve(response.clone());
		}, (error) => {
			signal?.removeEventListener("abort", abort);
			release();
			reject(error);
		});
	});
}
/**
* Dedupe a `fetch()` against the `_next/data` endpoint. Multiple concurrent
* callers for the same resolved URL and deployment ID share one underlying
* network request.
*
* Each call returns a freshly-cloned `Response` so consumers can read the
* body independently. Once the in-flight Promise settles (resolve or reject)
* the entry is removed, and the next call will hit the network again.
*
* Errors propagate to every concurrent caller — the in-flight entry is
* dropped on failure so the next navigation can retry.
*/
function dedupedPagesDataFetch(dataHref, init) {
	const key = getInflightKey(dataHref, init);
	const signal = init?.signal ?? void 0;
	if (signal?.aborted) return Promise.reject(new DOMException("Aborted", "AbortError"));
	let entry = inflight.get(key);
	if (!entry) {
		const controller = new AbortController();
		let currentEntry;
		currentEntry = {
			controller,
			promise: fetch(dataHref, {
				...init,
				signal: controller.signal
			}).finally(() => {
				currentEntry.settled = true;
				if (inflight.get(key) === currentEntry) inflight.delete(key);
			}),
			settled: false,
			waiters: 0
		};
		inflight.set(key, currentEntry);
		entry = currentEntry;
	}
	return cloneSharedResponse(key, entry, signal);
}
//#endregion
//#region ../../../frontend/node_modules/vinext/dist/shims/internal/pages-data-target.js
/**
* Shared decision helper for the Pages Router `/_next/data/<id>/<page>.json`
* navigation fast path. Used by both the router shim (for `navigateClient` and
* `Router.prefetch`) and the Link shim (for hover/viewport prefetch).
*
* Lives in `shims/internal/` so neither caller pulls in the router shim at
* module init time — link.tsx and router.ts must remain free of circular
* imports and SSR-side router-init side effects.
*/
function hasVinextMiddleware(nextData) {
	if (!isUnknownRecord(nextData)) return false;
	const vinext = nextData.__vinext;
	return isUnknownRecord(vinext) && vinext.hasMiddleware === true;
}
function isClientMiddlewareMatcherObject(value) {
	if (!isUnknownRecord(value)) return false;
	if (typeof value.source !== "string") return false;
	if (value.locale !== void 0 && value.locale !== false) return false;
	if (value.has !== void 0 && !Array.isArray(value.has)) return false;
	if (value.missing !== void 0 && !Array.isArray(value.missing)) return false;
	return true;
}
function stripLocaleForMiddlewareMatcher(pathname) {
	const locales = window.__VINEXT_LOCALES__;
	if (!locales || locales.length === 0 || pathname === "/") return pathname;
	const firstSegment = pathname.split("/")[1];
	if (!firstSegment || !locales.includes(firstSegment)) return pathname;
	return "/" + pathname.split("/").slice(2).join("/");
}
function clientMiddlewareSourceMatches(pathname, source) {
	if (!/[\\():*+?]/.test(source)) return removeTrailingSlash(pathname) === removeTrailingSlash(source);
	if (source.includes("(") || source.includes("\\")) return true;
	const sourceParts = source.split("/").filter(Boolean);
	const pathParts = pathname.split("/").filter(Boolean);
	let pathIndex = 0;
	for (const sourcePart of sourceParts) {
		if (sourcePart.startsWith(":")) {
			if (sourcePart.endsWith("*")) return true;
			if (sourcePart.endsWith("+")) return pathIndex < pathParts.length;
			if (pathIndex >= pathParts.length) return false;
			pathIndex++;
			continue;
		}
		if (pathParts[pathIndex] !== sourcePart) return false;
		pathIndex++;
	}
	return pathIndex === pathParts.length;
}
function clientMiddlewareMatcherMatches(pathname, matcher) {
	if (matcher === void 0) return true;
	if (typeof matcher === "string") return clientMiddlewareSourceMatches(stripLocaleForMiddlewareMatcher(pathname), matcher);
	if (!Array.isArray(matcher)) return true;
	for (const item of matcher) {
		if (typeof item === "string") {
			if (clientMiddlewareSourceMatches(stripLocaleForMiddlewareMatcher(pathname), item)) return true;
			continue;
		}
		if (!isClientMiddlewareMatcherObject(item)) return true;
		if (clientMiddlewareSourceMatches(item.locale === false ? pathname : stripLocaleForMiddlewareMatcher(pathname), item.source)) return true;
	}
	return false;
}
function getPagesMiddlewareDataHref(browserUrl, basePath) {
	const nextData = window.__NEXT_DATA__;
	if (!nextData || !hasVinextMiddleware(nextData)) return null;
	const buildId = nextData.buildId;
	if (typeof buildId !== "string" || buildId.length === 0) return null;
	let parsed;
	try {
		parsed = new URL(browserUrl, window.location.href);
	} catch {
		return null;
	}
	if (parsed.origin !== window.location.origin) return null;
	const pathname = stripBasePath(parsed.pathname, basePath);
	if (!clientMiddlewareMatcherMatches(pathname, window.__VINEXT_MIDDLEWARE_MATCHER__)) return null;
	return buildPagesDataHref(basePath, buildId, pathname, parsed.search);
}
/**
* Decide whether the JSON data-endpoint navigation path is usable for this
* browser URL. We require:
*   - A registered code-split loader for the matched route pattern. Without
*     this, the client has no chunk URL to import for the new page.
*   - A buildId on the current `__NEXT_DATA__`, since the data URL embeds it.
*   - Same-origin (cross-origin URLs do not hit our data endpoint).
*
* Locale handling: route patterns in `__VINEXT_PAGE_PATTERNS__` are
* locale-unaware (`/about`, not `/fr/about`), but the browser URL for a
* locale-prefixed page is `/fr/about`. We strip the locale prefix before
* pattern matching so locale transitions hit the JSON fast path. The data URL
* itself keeps the locale prefix because the server uses it to pick
* locale-specific gSSP data.
*
* Returns the resolved target, or `null` to signal the caller should fall
* back to the HTML extraction path (dev server, or a route that exists on the
* server but is not in the client loader map).
*
* Ported from Next.js: `packages/next/src/client/page-loader.ts`
* (`getDataHref`). vinext's equivalent uses an in-memory loader map instead
* of Next.js' `_buildManifest.js`.
*/
function resolvePagesDataNavigationTarget(browserUrl, basePath, options = {}) {
	if (typeof window === "undefined") return null;
	const loaders = window.__VINEXT_PAGE_LOADERS__;
	const patterns = window.__VINEXT_PAGE_PATTERNS__;
	if (!loaders || !patterns || patterns.length === 0) return null;
	const buildId = window.__NEXT_DATA__?.buildId ?? void 0;
	if (!buildId) return null;
	let parsed;
	try {
		parsed = new URL(browserUrl, window.location.href);
	} catch {
		return null;
	}
	if (parsed.origin !== window.location.origin) return null;
	const pagePath = stripBasePath(parsed.pathname, basePath);
	const locale = getLocalePathPrefix(pagePath, window.__VINEXT_LOCALES__);
	const match = matchPagesPattern(locale ? pagePath.slice(locale.length + 1) || "/" : pagePath, patterns);
	if (!match) return null;
	const loader = loaders[match.pattern];
	if (!loader) return null;
	const ssgPatterns = window.__VINEXT_PAGES_SSG_PATTERNS__;
	const sspPatterns = window.__VINEXT_PAGES_SSP_PATTERNS__;
	const dataKind = ssgPatterns?.includes(match.pattern) ? "static" : sspPatterns?.includes(match.pattern) ? "server" : ssgPatterns === void 0 || sspPatterns === void 0 ? "server" : "none";
	const explicitLocale = options.locale === false ? window.__VINEXT_DEFAULT_LOCALE__ : options.locale;
	const currentLocale = locale ?? explicitLocale ?? window.__VINEXT_LOCALE__;
	const prefetchPagePath = locale || !currentLocale || !window.__VINEXT_LOCALES__?.includes(currentLocale) ? pagePath : `/${currentLocale}${pagePath === "/" ? "" : pagePath}`;
	return {
		dataHref: buildPagesDataHref(basePath, buildId, pagePath, parsed.search),
		prefetchDataHref: buildPagesDataHref(basePath, buildId, prefetchPagePath, parsed.search),
		pattern: match.pattern,
		params: match.params,
		loader,
		dataKind,
		middlewareDataHref: getPagesMiddlewareDataHref(browserUrl, basePath) ?? void 0,
		buildId,
		pagePath,
		search: parsed.search,
		prefetchLocale: currentLocale,
		locale
	};
}
/**
* Kick off the code-split loader and, for SSG pages, prefetch the data JSON so
* the chunk and payload are warm by the time the user clicks.
*
* Used by both `Router.prefetch()` and `<Link>` hover/viewport prefetch.
* Matches Next.js Pages Router prefetch: non-SSG routes only warm the page
* chunk, while `getStaticProps` routes also fetch `/_next/data`.
*
* loader's returned Promise is intentionally discarded — `import()` caches the
* result, so a subsequent navigation re-invocation hits the cache without
* paying for a second round trip. Errors are swallowed: prefetch is
* best-effort and must never break the page.
*/
function prefetchPagesData(target) {
	if (typeof document === "undefined") return;
	target.loader().catch(() => {});
	if (target.dataKind !== "static" && !target.middlewareDataHref) return;
	const headers = {
		Accept: "application/json",
		purpose: "prefetch",
		"x-nextjs-data": "1"
	};
	if (target.middlewareDataHref) headers["x-middleware-prefetch"] = "1";
	const deploymentId = getDeploymentId();
	if (deploymentId) headers[NEXT_DEPLOYMENT_ID_HEADER] = deploymentId;
	if (target.dataKind === "static") {
		fetchStaticPagesData(target.middlewareDataHref && target.middlewareDataHref !== target.dataHref ? target.middlewareDataHref : target.prefetchDataHref ?? target.middlewareDataHref ?? target.dataHref, { headers }).then((response) => response.arrayBuffer()).catch(() => {});
		return;
	}
	if (target.middlewareDataHref) fetchUncachedPagesData(target.middlewareDataHref, { headers }).catch(() => {});
}
//#endregion
//#region ../../../frontend/node_modules/vinext/dist/shims/internal/pages-router-components.js
var COMPONENTS_KEY = Symbol.for("vinext.pagesRouter.components");
function getPagesRouterComponentsMap() {
	const globalState = globalThis;
	let components = globalState[COMPONENTS_KEY];
	if (!components) {
		components = {};
		globalState[COMPONENTS_KEY] = components;
	}
	return components;
}
//#endregion
//#region ../../../frontend/node_modules/vinext/dist/shims/internal/app-route-detection.js
/**
* Resolve a prefetch href to a same-origin pathname (basePath-stripped),
* suitable as the key used by Next.js for `router.components[urlPathname]`.
*
* Returns null for external URLs, malformed URLs, or non-browser contexts.
*/
function resolveSameOriginPathname(href, basePath) {
	if (typeof window === "undefined") return null;
	let url;
	try {
		url = new URL(href, window.location.href);
	} catch {
		return null;
	}
	if (url.origin !== window.location.origin) return null;
	const pathname = stripBasePath(url.pathname, basePath);
	const locale = getLocalePathPrefix(pathname, window.__VINEXT_LOCALES__);
	if (!locale) return pathname;
	const localePrefixLength = locale.length + 1;
	return pathname.length === localePrefixLength ? "/" : pathname.slice(localePrefixLength);
}
/**
* Record `components[pathname] = { __appRouter: true }` on the shared
* Pages Router map when the href matches an App Router route. No-op when the
* manifest is absent, the URL is external, or no app route matches.
*
* `pathname` is the basePath-stripped, trailing-slash-stripped path —
* matching Next.js's `removeTrailingSlash(removeBasePath(pathname))` key used
* at read time (router.ts:1442). Stripping here ensures the write and read
* keys agree regardless of whether the caller normalised trailing slashes
* first (e.g. `link.tsx` normalises to match `trailingSlash` config before
* calling, while `router.prefetch()` passes the raw user-supplied URL).
*/
async function markAppRouteDetectedOnPrefetch(href, basePath) {
	if (typeof window === "undefined") return;
	if (!window.__VINEXT_LINK_PREFETCH_ROUTES__?.length) return;
	const { resolveHybridClientRouteOwner } = await import("./hybrid-client-route-owner-BhWlGx8C.js");
	if (resolveHybridClientRouteOwner(href, basePath) !== "app") return;
	const rawPathname = resolveSameOriginPathname(href, basePath);
	if (rawPathname === null) return;
	const pathname = removeTrailingSlash(rawPathname);
	getPagesRouterComponentsMap()[pathname] = { __appRouter: true };
}
//#endregion
//#region ../../../frontend/node_modules/vinext/dist/shims/internal/interpolate-as.js
/**
* Port of Next.js' Pages Router `interpolateAs` helper, plus the minimal
* subset of its transitive dependencies (`getRouteRegex` + `getRouteMatcher`
* and the parameter-pattern parsers they rely on).
*
* Upstream sources:
*   - packages/next/src/shared/lib/router/utils/interpolate-as.ts
*   - packages/next/src/shared/lib/router/utils/route-regex.ts
*   - packages/next/src/shared/lib/router/utils/route-matcher.ts
*   - packages/next/src/shared/lib/router/utils/get-dynamic-param.ts
*   - packages/next/src/shared/lib/router/utils/remove-trailing-slash.ts
*   - packages/next/src/shared/lib/escape-regexp.ts
*
* Used by the Pages Router shim to project a route pattern + `as` pathname +
* query back into a fully-interpolated browser URL (the `<Link href as>`
* masking path). Interception-route markers (`(.)`, `(..)`, `(...)`,
* `(..)(..)`) are intentionally omitted — they only apply to App Router and
* never appear in Pages Router patterns.
*/
function normalizeQuery(query) {
	const normalized = {};
	if (!query) return normalized;
	for (const [key, value] of Object.entries(query)) {
		if (value === void 0) continue;
		normalized[key] = Array.isArray(value) ? value.map(String) : String(value);
	}
	return normalized;
}
function parseRouteHrefQuery(routeHref, queryIndex, hashIndex) {
	const query = {};
	if (queryIndex === -1 || hashIndex !== -1 && queryIndex > hashIndex) return query;
	const searchEnd = hashIndex === -1 ? routeHref.length : hashIndex;
	for (const [key, value] of new URLSearchParams(routeHref.slice(queryIndex + 1, searchEnd))) {
		const existing = query[key];
		if (existing === void 0) query[key] = value;
		else if (Array.isArray(existing)) existing.push(value);
		else query[key] = [existing, value];
	}
	return query;
}
var reHasRegExp = /[|\\{}()[\]^$+*?.-]/;
var reReplaceRegExp = /[|\\{}()[\]^$+*?.-]/g;
function escapeStringRegexp(str) {
	if (reHasRegExp.test(str)) return str.replace(reReplaceRegExp, "\\$&");
	return str;
}
/**
* Regular expression pattern used to match route parameters.
* Matches both single parameters and parameter groups.
* Examples:
*   - `[[...slug]]` matches parameter group with key 'slug', repeat: true, optional: true
*   - `[...slug]` matches parameter group with key 'slug', repeat: true, optional: false
*   - `[[foo]]` matches parameter with key 'foo', repeat: false, optional: true
*   - `[bar]` matches parameter with key 'bar', repeat: false, optional: false
*/
var PARAMETER_PATTERN = /^([^[]*)\[((?:\[[^\]]*\])|[^\]]+)\](.*)$/;
/**
* Parses a matched parameter from the PARAMETER_PATTERN regex.
* Examples:
*   - `[...slug]` -> `{ key: 'slug', repeat: true, optional: true }`
*   - `...slug`   -> `{ key: 'slug', repeat: true, optional: false }`
*   - `[foo]`     -> `{ key: 'foo',  repeat: false, optional: true }`
*   - `bar`       -> `{ key: 'bar',  repeat: false, optional: false }`
*/
function parseMatchedParameter(param) {
	const optional = param.startsWith("[") && param.endsWith("]");
	if (optional) param = param.slice(1, -1);
	const repeat = param.startsWith("...");
	if (repeat) param = param.slice(3);
	return {
		key: param,
		repeat,
		optional
	};
}
function getParametrizedRoute(route) {
	const groups = {};
	let groupIndex = 1;
	const segments = [];
	for (const segment of removeTrailingSlash(route).slice(1).split("/")) {
		const paramMatches = segment.match(PARAMETER_PATTERN);
		if (paramMatches && paramMatches[2]) {
			const { key, repeat, optional } = parseMatchedParameter(paramMatches[2]);
			groups[key] = {
				pos: groupIndex++,
				repeat,
				optional
			};
			const s = repeat ? optional ? "(?:/(.+?))?" : "/(.+?)" : "/([^/]+?)";
			segments.push(s);
		} else segments.push(`/${escapeStringRegexp(segment)}`);
	}
	return {
		parameterizedRoute: segments.join(""),
		groups
	};
}
/**
* From a normalized route this function generates a regular expression and a
* corresponding groups object intended to be used to store matching groups
* from the regular expression.
*/
function getRouteRegex(normalizedRoute) {
	const { parameterizedRoute, groups } = getParametrizedRoute(normalizedRoute);
	return {
		re: new RegExp(`^${parameterizedRoute}(?:/)?$`),
		groups
	};
}
/**
* Compile a route regex into a function that extracts decoded params from a
* pathname. Returns `false` if the pathname does not match the route.
*
* The `safeRouteMatcher`/`stripParameterSeparators` wrapper that Next.js
* applies (for adjacent-parameter normalization) is omitted — Pages Router
* patterns never contain adjacent parameters, so the wrapper is a no-op for
* this caller.
*/
function getRouteMatcher({ re, groups }) {
	return (pathname) => {
		const routeMatch = re.exec(pathname);
		if (!routeMatch) return false;
		const decode = (param) => {
			try {
				return decodeURIComponent(param);
			} catch {
				throw new Error("failed to decode param");
			}
		};
		const params = {};
		for (const [key, group] of Object.entries(groups)) {
			const match = routeMatch[group.pos];
			if (match !== void 0) if (group.repeat) params[key] = match.split("/").map((entry) => decode(entry));
			else params[key] = decode(match);
		}
		return params;
	};
}
/**
* Project a `(route, asPathname, query)` triple back into a fully-interpolated
* browser URL. Used by the `<Link href as>` masking path in the Pages Router
* shim: extract param values from the rendered `as` path when it differs from
* the route pattern, otherwise fall back to reading them from the href query.
*
* Returns `{ params, result }`. `result` is the interpolated URL, or the empty
* string when one or more required params could not be resolved. Callers warn
* (in dev) on the empty-string case; this helper deliberately stays silent —
* matching Next.js' behavior, where `<Link>` itself owns the dev warning.
*/
function interpolateAs(route, asPathname, query) {
	let interpolatedRoute = "";
	const dynamicRegex = getRouteRegex(route);
	const dynamicGroups = dynamicRegex.groups;
	const dynamicMatches = (asPathname !== route ? getRouteMatcher(dynamicRegex)(asPathname) : "") || query;
	interpolatedRoute = route;
	const params = Object.keys(dynamicGroups);
	if (!params.every((param) => {
		let value = dynamicMatches[param] || "";
		const { repeat, optional } = dynamicGroups[param];
		let replaced = `[${repeat ? "..." : ""}${param}]`;
		if (optional) replaced = `${!value ? "/" : ""}[${replaced}]`;
		if (repeat && !Array.isArray(value)) value = [value];
		return (optional || param in dynamicMatches) && (interpolatedRoute = interpolatedRoute.replace(replaced, repeat ? value.map((segment) => encodeURIComponent(segment)).join("/") : encodeURIComponent(value)) || "/");
	})) interpolatedRoute = "";
	return {
		params,
		result: interpolatedRoute
	};
}
/**
* Resolve a bracket-pattern route href against its displayed href. Query
* values can be supplied directly (object-form hrefs) or parsed from the route
* href (string-form hrefs). A `?` after `#` is part of the fragment, not a
* query delimiter.
*/
function interpolateDynamicRouteHref(routeHref, asHref, queryInput) {
	if (!routeHref.includes("[")) return null;
	const hashIndex = routeHref.indexOf("#");
	const queryIndex = routeHref.indexOf("?");
	const pathEnd = [hashIndex, queryIndex].filter((index) => index !== -1).reduce((earliest, index) => Math.min(earliest, index), routeHref.length);
	const routePathname = routeHref.slice(0, pathEnd);
	const trailing = routeHref.slice(pathEnd);
	const asPathname = asHref.split(/[?#]/, 1)[0];
	const query = queryInput ? normalizeQuery(queryInput) : parseRouteHrefQuery(routeHref, queryIndex, hashIndex);
	const { result, params } = interpolateAs(routePathname, asPathname, query);
	return {
		href: result ? `${result}${trailing}` : "",
		params,
		query,
		routePathname
	};
}
//#endregion
//#region ../../../frontend/node_modules/vinext/dist/shims/client-locale.js
function getCurrentBrowserLocale({ basePath, domainLocales, hostname }) {
	if (typeof window === "undefined") return void 0;
	const pathnameLocale = getLocalePathPrefix(stripBasePath(window.location.pathname, basePath), window.__VINEXT_LOCALES__);
	if (pathnameLocale) return pathnameLocale;
	return detectDomainLocale(domainLocales, hostname ?? void 0)?.defaultLocale ?? window.__VINEXT_LOCALE__ ?? window.__VINEXT_DEFAULT_LOCALE__;
}
//#endregion
export { getPagesMiddlewareDataHref as a, dedupedPagesDataFetch as c, fetchStaticPagesData as d, getPagesStaticDataCache as f, getPagesRouterComponentsMap as i, evictPagesDataCache as l, interpolateDynamicRouteHref as n, prefetchPagesData as o, markAppRouteDetectedOnPrefetch as r, resolvePagesDataNavigationTarget as s, getCurrentBrowserLocale as t, fetchCachedPagesData as u };

//# sourceMappingURL=client-locale-TmdBsK9u.js.map