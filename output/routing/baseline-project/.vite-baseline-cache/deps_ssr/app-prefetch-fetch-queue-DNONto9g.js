//#region ../../../frontend/node_modules/vinext/dist/utils/base-path.js
/**
* Shared basePath helpers.
*
* Next.js only treats a pathname as being under basePath when it is an exact
* match ("/app") or starts with the basePath followed by a path separator
* ("/app/..."). Prefix-only matches like "/application" must be left intact.
*/
/**
* Check whether a pathname is inside the configured basePath.
*/
function hasBasePath(pathname, basePath) {
	if (!basePath) return false;
	return pathname === basePath || pathname.startsWith(basePath + "/");
}
/**
* Strip the basePath prefix from a pathname when it matches on a segment
* boundary. Returns the original pathname when it is outside the basePath.
*/
function stripBasePath(pathname, basePath) {
	if (!hasBasePath(pathname, basePath)) return pathname;
	return pathname.slice(basePath.length) || "/";
}
/**
* Remove trailing slashes from a pathname while preserving the root "/".
* Collapses any number of trailing slashes ("/a//" → "/a"). Used by the
* trailing-slash redirect path and route pattern normalization.
*/
function removeTrailingSlash(pathname) {
	if (pathname === "/") return "/";
	let end = pathname.length;
	while (end > 0 && pathname.charCodeAt(end - 1) === 47) end--;
	return end === 0 ? "/" : pathname.slice(0, end);
}
//#endregion
//#region ../../../frontend/node_modules/vinext/dist/routing/utils.js
/**
* Single source of truth for hybrid App/Pages route ownership.
*
* Mirrors Next.js's DefaultRouteMatcherManager ordering: Pages providers
* are registered before App providers, then merged dynamic matchers sort
* together. Returns the router that should own a request/navigation to
* a URL that matched BOTH routers.
*
* Centralised so the server's request handling and the client's link /
* prefetch / programmatic-navigation paths all reach the same owner for
* the same (pages pattern, app pattern) pair. This intentionally implements
* Next.js's segment-tree ordering directly instead of vinext's broader
* `sortRoutes()` score heuristic. It only arbitrates two routes that already
* matched the same URL; each router's own trie ordering remains unchanged.
*
* Usage:
*   compareHybridRoutePatterns("/:slug", true, "/:slug", true)  // → "pages"
*   compareHybridRoutePatterns("/_sites/:slug*", true, "/:slug*", true)  // → "pages"
*   compareHybridRoutePatterns("/:path+", true, "/dashboard", false)  // → "app"
*   compareHybridRoutePatterns("/", false, "/", false)  // → "app"
*/
function compareHybridRoutePatterns(pagesPattern, pagesIsDynamic, appPattern, appIsDynamic) {
	if (pagesPattern === appPattern) throw new Error(`Conflicting app and page routes found for "${pagesPattern}"`);
	if (!pagesIsDynamic) return appIsDynamic ? "pages" : "app";
	if (!appIsDynamic) return "app";
	const pagesSegments = pagesPattern.split("/").filter(Boolean);
	const appSegments = appPattern.split("/").filter(Boolean);
	const segmentRank = (segment) => {
		if (!segment.startsWith(":")) return 0;
		if (segment.endsWith("*")) return 3;
		if (segment.endsWith("+")) return 2;
		return 1;
	};
	for (let index = 0; index < Math.min(pagesSegments.length, appSegments.length); index++) {
		const pagesRank = segmentRank(pagesSegments[index]);
		const appRank = segmentRank(appSegments[index]);
		if (pagesRank !== appRank) return pagesRank < appRank ? "pages" : "app";
	}
	if (pagesSegments.length !== appSegments.length) return pagesSegments.length < appSegments.length ? "pages" : "app";
	return "pages";
}
var PATH_DELIMITER_REGEX = /([/#?\\]|%(2f|23|3f|5c))/gi;
function encodePathDelimiters(segment) {
	return segment.replace(PATH_DELIMITER_REGEX, (char) => encodeURIComponent(char));
}
/**
* Decode a filesystem or URL path segment while preserving encoded path delimiters.
* Mirrors Next.js segment-wise decoding so "%5F" becomes "_" but "%2F" stays "%2F".
*/
function decodeRouteSegment(segment) {
	try {
		return encodePathDelimiters(decodeURIComponent(segment));
	} catch {
		return segment;
	}
}
/**
* Normalize a pathname for route matching by decoding each segment independently.
* This prevents encoded slashes from turning into real path separators.
*/
function normalizePathnameForRouteMatch(pathname) {
	return pathname.split("/").map((segment) => decodeRouteSegment(segment)).join("/");
}
function splitPathnameForRouteMatch(pathname) {
	return normalizePathnameForRouteMatch(pathname).split("/").filter(Boolean);
}
function decodeMatchedParam(value) {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}
/**
* Build a params object from ordered entries, preserving insertion order.
*
* Used by trie matchers to reconstruct the params Record after collecting
* entries in declaration order via DFS backtracking. Object.create(null)
* avoids prototype pollution.
*
* @param entries - Ordered [paramName, value] tuples from forward traversal
*/
function buildParams(entries) {
	const params = Object.create(null);
	for (const [key, value] of entries) params[key] = value;
	return params;
}
/**
* Decode captured route params with `decodeURIComponent`, mirroring Next.js
* route-matcher.ts:25-27. Mutates the params object in place. Catch-all
* arrays are decoded element-wise. Malformed escapes are preserved (the
* strict normalization layer rejects them at the request boundary).
*/
function decodeMatchedParams(params) {
	for (const key of Object.keys(params)) {
		const value = params[key];
		if (Array.isArray(value)) params[key] = value.map(decodeMatchedParam);
		else params[key] = decodeMatchedParam(value);
	}
}
/** Split a pathname into its non-empty segments without decoding. */
function splitPathSegments(pathname) {
	return pathname.split("/").filter(Boolean);
}
//#endregion
//#region ../../../frontend/node_modules/vinext/dist/routing/route-trie.js
function createNode() {
	return {
		staticChildren: /* @__PURE__ */ new Map(),
		dynamicChild: null,
		catchAllChild: null,
		optionalCatchAllChild: null,
		route: null
	};
}
/**
* Build a trie from pre-sorted routes.
*
* Routes must have a `patternParts` property (string[] of URL segments).
* Pattern segment conventions:
*   - `:name`  — dynamic segment
*   - `:name+` — catch-all (1+ segments)
*   - `:name*` — optional catch-all (0+ segments)
*   - anything else — static segment
*
* First route to claim a terminal position wins (routes are pre-sorted
* by precedence, so insertion order preserves correct priority).
*/
function buildRouteTrie(routes) {
	const root = createNode();
	for (const route of routes) {
		const parts = route.patternParts;
		if (parts.length === 0) {
			if (root.route === null) root.route = route;
			continue;
		}
		let node = root;
		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			if (part.endsWith("+") && part.startsWith(":")) {
				if (i !== parts.length - 1) break;
				const paramName = part.slice(1, -1);
				if (node.catchAllChild === null) node.catchAllChild = {
					paramName,
					route
				};
				break;
			}
			if (part.endsWith("*") && part.startsWith(":")) {
				if (i !== parts.length - 1) break;
				const paramName = part.slice(1, -1);
				if (node.optionalCatchAllChild === null) node.optionalCatchAllChild = {
					paramName,
					route
				};
				break;
			}
			if (part.startsWith(":")) {
				const paramName = part.slice(1);
				if (node.dynamicChild === null) node.dynamicChild = {
					paramName,
					node: createNode()
				};
				node = node.dynamicChild.node;
				if (i === parts.length - 1) {
					if (node.route === null) node.route = route;
				}
				continue;
			}
			let child = node.staticChildren.get(part);
			if (!child) {
				child = createNode();
				node.staticChildren.set(part, child);
			}
			node = child;
			if (i === parts.length - 1) {
				if (node.route === null) node.route = route;
			}
		}
	}
	return root;
}
/**
* Match a URL against the trie.
*
* Returns decoded param values — `decodeURIComponent` is applied to
* individual param entries so that `%2F` → `/`, `%23` → `#`, etc.
* Segment boundaries (the original `/` splits) are preserved by the
* upstream normalization layer; this step only decodes the captured
* param strings the caller sees.
*
* Mirrors Next.js route-matcher.ts:25-27.
*
* @param root - Trie root built by `buildRouteTrie`
* @param urlParts - Pre-split URL segments (no empty strings)
* @returns Match result with route and extracted params, or null
*/
function trieMatch(root, urlParts) {
	const result = trieMatchRaw(root, urlParts);
	if (result) decodeMatchedParams(result.params);
	return result;
}
function trieMatchRaw(root, urlParts) {
	return match(root, urlParts, 0, []);
}
function match(node, urlParts, index, entries) {
	if (index === urlParts.length) {
		if (node.route !== null) return {
			route: node.route,
			params: buildParams(entries)
		};
		if (node.optionalCatchAllChild !== null) return {
			route: node.optionalCatchAllChild.route,
			params: buildParams(entries)
		};
		return null;
	}
	const segment = urlParts[index];
	const staticChild = node.staticChildren.get(segment);
	if (staticChild) {
		const result = match(staticChild, urlParts, index + 1, entries);
		if (result !== null) return result;
	}
	if (node.dynamicChild !== null) {
		entries.push([node.dynamicChild.paramName, segment]);
		const result = match(node.dynamicChild.node, urlParts, index + 1, entries);
		if (result !== null) return result;
		entries.pop();
	}
	if (node.catchAllChild !== null) {
		const remaining = urlParts.slice(index);
		const params = buildParams(entries);
		params[node.catchAllChild.paramName] = remaining;
		return {
			route: node.catchAllChild.route,
			params
		};
	}
	if (node.optionalCatchAllChild !== null) {
		const params = buildParams(entries);
		params[node.optionalCatchAllChild.paramName] = urlParts.slice(index);
		return {
			route: node.optionalCatchAllChild.route,
			params
		};
	}
	return null;
}
//#endregion
//#region ../../../frontend/node_modules/vinext/dist/routing/route-matching.js
/**
* Shared route-match preamble used by both Pages Router and App Router.
*
* Both routers normalize URLs and call `trieMatch` with nearly-identical
* preamble: strip query, trailing-slash normalize, run
* `normalizePathnameForRouteMatch`, split into url parts, then look up via a
* per-routes-array trie cache. This module factors that out so each router
* just calls `matchRouteWithTrie(url, routes)`.
*/
function createRouteTrieCache() {
	return /* @__PURE__ */ new WeakMap();
}
function getOrBuildTrie(cache, routes) {
	let trie = cache.get(routes);
	if (!trie) {
		trie = buildRouteTrie(routes);
		cache.set(routes, trie);
	}
	return trie;
}
/**
* Match a URL path against a list of routes via the shared preamble:
*   1. strip query string
*   2. trailing-slash normalize (preserving root "/")
*   3. run `normalizePathnameForRouteMatch`
*   4. split into url parts and look up via the (cached) trie
*
* Generic over the route shape; both Pages `Route` and App `AppRoute`
* satisfy `{ patternParts: string[] }`.
*/
function matchRouteWithTrie(url, routes, cache) {
	const pathname = url.split("?")[0];
	let normalizedUrl = pathname === "/" ? "/" : pathname.replace(/\/$/, "");
	normalizedUrl = normalizePathnameForRouteMatch(normalizedUrl);
	const urlParts = normalizedUrl.split("/").filter(Boolean);
	return trieMatch(getOrBuildTrie(cache, routes), urlParts);
}
//#endregion
//#region ../../../frontend/node_modules/vinext/dist/shims/url-safety.js
/**
* Shared URL safety utilities for Link, Form, and navigation shims.
*
* Centralizes dangerous URI scheme detection so all components and
* navigation functions use the same validation logic.
*/
/**
* Detect dangerous URI schemes that should never be navigated to.
*
* Adapted from Next.js's javascript URL detector:
* packages/next/src/client/lib/javascript-url.ts
* https://github.com/vercel/next.js/blob/canary/packages/next/src/client/lib/javascript-url.ts
*
* URL parsing ignores leading C0 control characters / spaces, and treats
* embedded tab/newline characters in the scheme as insignificant. We mirror
* that behavior here so obfuscated values like `java\nscript:` and
* `\x00javascript:` are still blocked.
*
* Vinext intentionally extends this handling to `data:` and `vbscript:` too,
* since both are also dangerous navigation targets.
*/
var LEADING_IGNORED = "[\\u0000-\\u001F \\u200B\\uFEFF]*";
var SCHEME_IGNORED = "[\\r\\n\\t]*";
function buildDangerousSchemeRegex(scheme) {
	const chars = scheme.split("").join(SCHEME_IGNORED);
	return new RegExp(`^${LEADING_IGNORED}${chars}${SCHEME_IGNORED}:`, "i");
}
var DANGEROUS_SCHEME_RES = [
	buildDangerousSchemeRegex("javascript"),
	buildDangerousSchemeRegex("data"),
	buildDangerousSchemeRegex("vbscript")
];
var DANGEROUS_URL_BLOCK_MESSAGE = "Next.js has blocked a javascript: URL as a security precaution.";
function isDangerousScheme(url) {
	const str = "" + url;
	return DANGEROUS_SCHEME_RES.some((re) => re.test(str));
}
/**
* Emit a `console.error` matching Next.js's blocked-navigation message.
*
* Next.js's `router.push` / `router.replace` / `router.prefetch` (and the
* Pages Router equivalents) throw an `Error` when the URL has a dangerous
* scheme. In the browser, React's event-handler runtime catches that throw
* and reports it through `console.error`, which is what the Next.js E2E
* `test/e2e/app-dir/javascript-urls` suite asserts on.
*
* Vinext's navigation guards run synchronously inside async event handlers
* (e.g. Link's `void handleClick(event)`), so a raw throw is dropped on the
* floor instead of bubbling up to React. Emitting the same `console.error`
* explicitly keeps observable behaviour aligned with Next.js — the test
* matcher uses `.includes("has blocked a javascript: URL as a security
* precaution.")` so any message containing that phrase satisfies it.
*
* Source reference (Next.js):
*   packages/next/src/client/components/segment-cache/navigation.ts:537
*   packages/next/src/client/components/app-router-instance.ts:345,402,442,460
*   packages/next/src/shared/lib/router/router.ts:1025,1057
*/
function reportBlockedDangerousNavigation() {
	console.error(DANGEROUS_URL_BLOCK_MESSAGE);
}
function assertSafeNavigationUrl(url, ErrorConstructor = Error) {
	if (isDangerousScheme(url)) {
		reportBlockedDangerousNavigation();
		throw new ErrorConstructor(DANGEROUS_URL_BLOCK_MESSAGE);
	}
}
//#endregion
//#region ../../../frontend/node_modules/vinext/dist/utils/domain-locale.js
function normalizeDomainHostname(hostname) {
	if (!hostname) return void 0;
	return hostname.split(",", 1)[0]?.trim().split(":", 1)[0]?.toLowerCase() || void 0;
}
/**
* Match a configured domain either by hostname or locale.
* When both are provided, the checks intentionally use OR semantics so the
* same helper can cover Next.js's hostname lookup and preferred-locale lookup.
* If both are passed, the first domain matching either input wins, so callers
* should pass hostname or detectedLocale, not both.
*/
function detectDomainLocale(domainItems, hostname, detectedLocale) {
	if (!domainItems?.length) return void 0;
	const normalizedHostname = normalizeDomainHostname(hostname);
	const normalizedLocale = detectedLocale?.toLowerCase();
	for (const item of domainItems) if (normalizedHostname === normalizeDomainHostname(item.domain) || normalizedLocale === item.defaultLocale.toLowerCase() || item.locales?.some((locale) => locale.toLowerCase() === normalizedLocale)) return item;
}
function addLocalePrefix(path, locale, localeDefault) {
	const normalizedLocale = locale.toLowerCase();
	if (normalizedLocale === localeDefault.toLowerCase()) return path;
	const pathWithLeadingSlash = path.startsWith("/") ? path : `/${path}`;
	const normalizedPathname = (pathWithLeadingSlash.split(/[?#]/, 1)[0] ?? pathWithLeadingSlash).toLowerCase();
	const localePrefix = `/${normalizedLocale}`;
	if (normalizedPathname === localePrefix || normalizedPathname.startsWith(`${localePrefix}/`)) return path.startsWith("/") ? path : pathWithLeadingSlash;
	return `/${locale}${pathWithLeadingSlash}`;
}
function getLocalePathPrefix(path, locales) {
	if (!locales?.length) return void 0;
	const pathWithLeadingSlash = path.startsWith("/") ? path : `/${path}`;
	const firstSegment = (pathWithLeadingSlash.split(/[?#]/, 1)[0] ?? pathWithLeadingSlash).split("/").find(Boolean);
	if (!firstSegment) return void 0;
	const normalizedSegment = firstSegment.toLowerCase();
	return locales.find((locale) => locale.toLowerCase() === normalizedSegment);
}
function prefixBasePath(path, basePath = "") {
	if (!basePath) return path;
	return basePath + path;
}
function getDomainLocaleUrl(url, locale, { basePath, currentHostname, domainItems }) {
	if (!domainItems?.length) return void 0;
	const targetDomain = detectDomainLocale(domainItems, void 0, locale);
	if (!targetDomain) return void 0;
	const currentDomain = detectDomainLocale(domainItems, currentHostname ?? void 0);
	const localizedPath = addLocalePrefix(url, locale, targetDomain.defaultLocale);
	if (currentDomain && normalizeDomainHostname(currentDomain.domain) === normalizeDomainHostname(targetDomain.domain)) return;
	return `${`http${targetDomain.http ? "" : "s"}://`}${targetDomain.domain}${prefixBasePath(localizedPath, basePath)}`;
}
//#endregion
//#region ../../../frontend/node_modules/vinext/dist/utils/record.js
function isUnknownRecord(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}
//#endregion
//#region ../../../frontend/node_modules/vinext/dist/routing/route-pattern.js
function routePatternPart(segment) {
	if (segment.startsWith("[[...") && segment.endsWith("]]")) return `:${segment.slice(5, -2)}*`;
	if (segment.startsWith("[...") && segment.endsWith("]")) return `:${segment.slice(4, -1)}+`;
	if (segment.startsWith("[") && segment.endsWith("]")) return `:${segment.slice(1, -1)}`;
	return segment;
}
function routePatternParts(pathname) {
	return pathname.split("/").filter(Boolean).map(routePatternPart);
}
function appendParamValue(target, value) {
	if (Array.isArray(value)) {
		for (const entry of value) target.push(entry);
		return;
	}
	target.push(value);
}
function fillRoutePatternSegments(pathname, params) {
	const segments = pathname.split("/").filter(Boolean);
	const resolvedSegments = [];
	for (const segment of segments) {
		if (segment.startsWith("[[...") && segment.endsWith("]]")) {
			const value = params[segment.slice(5, -2)];
			if (value !== void 0 && value !== "") {
				if (Array.isArray(value) && value.length === 0) continue;
				appendParamValue(resolvedSegments, value);
			}
			continue;
		}
		if (segment.startsWith("[...") && segment.endsWith("]")) {
			const value = params[segment.slice(4, -1)];
			if (value === void 0 || (Array.isArray(value) ? value.length === 0 : value === "")) return null;
			appendParamValue(resolvedSegments, value);
			continue;
		}
		if (segment.startsWith("[") && segment.endsWith("]")) {
			const value = params[segment.slice(1, -1)];
			if (typeof value === "string") {
				resolvedSegments.push(value);
				continue;
			}
			if (Array.isArray(value) && value.length > 0) {
				if (value.length > 1) return null;
				resolvedSegments.push(value[0]);
				continue;
			}
			return null;
		}
		resolvedSegments.push(segment);
	}
	return resolvedSegments.length > 0 ? `/${resolvedSegments.join("/")}` : "/";
}
function matchRoutePattern(urlParts, patternParts) {
	const params = matchRoutePatternRaw(urlParts, patternParts);
	if (params) decodeMatchedParams(params);
	return params;
}
function matchRoutePatternRaw(urlParts, patternParts) {
	const params = Object.create(null);
	function matchFrom(urlIndex, patternIndex) {
		if (patternIndex === patternParts.length) return urlIndex === urlParts.length;
		const patternPart = patternParts[patternIndex];
		if (patternPart.startsWith(":") && (patternPart.endsWith("+") || patternPart.endsWith("*"))) {
			const paramName = patternPart.slice(1, -1);
			const minLength = patternPart.endsWith("+") ? 1 : 0;
			for (let endIndex = urlIndex + minLength; endIndex <= urlParts.length; endIndex++) {
				const value = urlParts.slice(urlIndex, endIndex);
				if (value.length > 0) params[paramName] = value;
				else delete params[paramName];
				if (matchFrom(endIndex, patternIndex + 1)) return true;
			}
			delete params[paramName];
			return false;
		}
		if (patternPart.startsWith(":")) {
			if (urlIndex >= urlParts.length) return false;
			const paramName = patternPart.slice(1);
			params[paramName] = urlParts[urlIndex];
			if (matchFrom(urlIndex + 1, patternIndex + 1)) return true;
			delete params[paramName];
			return false;
		}
		if (urlIndex >= urlParts.length || urlParts[urlIndex] !== patternPart) return false;
		return matchFrom(urlIndex + 1, patternIndex + 1);
	}
	return matchFrom(0, 0) ? params : null;
}
function matchRoutePatternPrefix(pathParts, patternParts) {
	let pathIndex = 0;
	for (let patternIndex = 0; patternIndex < patternParts.length; patternIndex++) {
		const patternPart = patternParts[patternIndex];
		const isTerminal = patternIndex === patternParts.length - 1;
		if (patternPart.startsWith(":") && patternPart.endsWith("+")) return isTerminal && pathParts.length - pathIndex >= 1;
		if (patternPart.startsWith(":") && patternPart.endsWith("*")) return isTerminal;
		if (pathIndex >= pathParts.length) return false;
		if (patternPart.startsWith(":")) {
			pathIndex++;
			continue;
		}
		if (pathParts[pathIndex] !== patternPart) return false;
		pathIndex++;
	}
	return true;
}
function matchRoutePatternWithOptionalDynamicSegments(pathParts, patternParts) {
	function matchFrom(pathIndex, patternIndex) {
		if (patternIndex === patternParts.length) return pathIndex === pathParts.length;
		const patternPart = patternParts[patternIndex];
		if (patternPart.startsWith(":") && (patternPart.endsWith("+") || patternPart.endsWith("*"))) {
			const minLength = patternPart.endsWith("+") ? 1 : 0;
			for (let endIndex = pathIndex + minLength; endIndex <= pathParts.length; endIndex++) if (matchFrom(endIndex, patternIndex + 1)) return true;
			return false;
		}
		if (patternPart.startsWith(":")) return matchFrom(pathIndex, patternIndex + 1) || pathIndex < pathParts.length && matchFrom(pathIndex + 1, patternIndex + 1);
		if (pathIndex >= pathParts.length || pathParts[pathIndex] !== patternPart) return false;
		return matchFrom(pathIndex + 1, patternIndex + 1);
	}
	return matchFrom(0, 0);
}
//#endregion
//#region ../../../frontend/node_modules/vinext/dist/shims/url-utils.js
/**
* Shared URL utilities for same-origin detection.
*
* Used by link.tsx, navigation.ts, and router.ts to normalize
* same-origin absolute URLs to local paths for client-side navigation.
*/
var ABSOLUTE_URL_REGEX = /^[a-zA-Z][a-zA-Z\d+\-.]*?:/;
function isAbsoluteUrl(url) {
	const firstChar = url.charCodeAt(0);
	return (firstChar >= 65 && firstChar <= 90 || firstChar >= 97 && firstChar <= 122) && ABSOLUTE_URL_REGEX.test(url);
}
function isAbsoluteOrProtocolRelativeUrl(url) {
	return isAbsoluteUrl(url) || url.startsWith("//");
}
function getWindowOrigin() {
	if (typeof window === "undefined") return null;
	const { origin, href } = window.location;
	if (origin) return origin;
	try {
		return new URL(href).origin;
	} catch {
		return null;
	}
}
/**
* If `url` is an absolute same-origin URL, return the local path
* (pathname + search + hash). Returns null for truly external URLs
* or on the server (where origin is unknown).
*/
function toSameOriginPath(url) {
	const origin = getWindowOrigin();
	if (!origin) return null;
	try {
		const parsed = url.startsWith("//") ? new URL(url, origin) : new URL(url);
		if (parsed.origin === origin) return parsed.pathname + parsed.search + parsed.hash;
	} catch {}
	return null;
}
/**
* If `url` is an absolute same-origin URL, return the app-relative path
* (basePath stripped from the pathname, if configured). Returns null for
* truly external URLs or on the server.
*/
function toSameOriginAppPath(url, basePath) {
	const localPath = toSameOriginPath(url);
	if (localPath == null || !basePath) return localPath;
	try {
		const parsed = new URL(localPath, "http://vinext.local");
		if (!hasBasePath(parsed.pathname, basePath)) return null;
		return stripBasePath(parsed.pathname, basePath) + parsed.search + parsed.hash;
	} catch {
		return localPath;
	}
}
/**
* Split a path string into pathname, query, and hash without depending on
* the URL constructor (which would resolve relative paths against an origin).
*
* Ported from Next.js: packages/next/src/shared/lib/router/utils/parse-path.ts
*/
function parsePath(path) {
	const hashIndex = path.indexOf("#");
	const queryIndex = path.indexOf("?");
	const hasQuery = queryIndex > -1 && (hashIndex < 0 || queryIndex < hashIndex);
	if (hasQuery || hashIndex > -1) return {
		pathname: path.substring(0, hasQuery ? queryIndex : hashIndex),
		query: hasQuery ? path.substring(queryIndex, hashIndex > -1 ? hashIndex : void 0) : "",
		hash: hashIndex > -1 ? path.slice(hashIndex) : ""
	};
	return {
		pathname: path,
		query: "",
		hash: ""
	};
}
/**
* Drop trailing slashes from a route while preserving the bare root.
*
* Ported from Next.js: packages/next/src/shared/lib/router/utils/remove-trailing-slash.ts
*/
function removeRouteTrailingSlash(route) {
	return route.replace(/\/$/, "") || "/";
}
/**
* Normalise the trailing slash of a local URL according to the
* `trailingSlash` config option in `next.config.js`. Used by the `<Link>`
* shim so that rendered `href` attributes match the canonical URL form
* (which is what the server-side redirect would otherwise enforce).
*
* Behaviour matches Next.js's client-side `normalizePathTrailingSlash`:
* packages/next/src/client/normalize-trailing-slash.ts
*
* - Absolute URLs (`http://`, `https://`, `//`) and non-local strings are
*   returned unchanged.
* - Paths whose final segment looks like a filename (`...\.ext`) have any
*   trailing slash stripped even when `trailingSlash: true`, mirroring the
*   `.well-known`-aware redirect rule shipped in `routes-manifest.json`.
* - Query strings and hash fragments are preserved verbatim.
* - Idempotent: already-canonical paths round-trip unchanged.
*/
function normalizePathTrailingSlash(path, trailingSlash) {
	if (!path.startsWith("/") || path.startsWith("//")) return path;
	const { pathname, query, hash } = parsePath(path);
	if (trailingSlash) {
		if (/\.[^/]+\/?$/.test(pathname)) return `${removeRouteTrailingSlash(pathname)}${query}${hash}`;
		if (pathname.endsWith("/")) return `${pathname}${query}${hash}`;
		return `${pathname}/${query}${hash}`;
	}
	return `${removeRouteTrailingSlash(pathname)}${query}${hash}`;
}
/**
* Prepend basePath to a local path for browser URLs / fetches.
*/
function withBasePath(path, basePath) {
	if (!basePath || !path.startsWith("/") || isAbsoluteOrProtocolRelativeUrl(path)) return path;
	return basePath + path;
}
/**
* Resolve a potentially relative href against the current URL.
* Handles: "#hash", "?query", "?query#hash", and relative paths.
*/
function resolveRelativeHref(href, currentUrl, basePath = "") {
	const base = currentUrl ?? (typeof window !== "undefined" ? window.location.href : void 0);
	if (!base) return href;
	if (href.startsWith("/") || isAbsoluteOrProtocolRelativeUrl(href)) return href;
	try {
		const resolved = new URL(href, base);
		return (basePath && resolved.pathname === basePath ? "" : basePath ? stripBasePath(resolved.pathname, basePath) : resolved.pathname) + resolved.search + resolved.hash;
	} catch {
		return href;
	}
}
/**
* Convert a local navigation target into the browser URL that should be used
* for history entries, fetches, and onNavigate callbacks.
*/
function toBrowserNavigationHref(href, currentUrl, basePath = "") {
	const resolved = resolveRelativeHref(href, currentUrl, basePath);
	if (!basePath) return withBasePath(resolved, basePath);
	if (resolved === "") return basePath;
	if (resolved.startsWith("?") || resolved.startsWith("#")) return basePath + resolved;
	return withBasePath(resolved, basePath);
}
function isHashOnlyBrowserUrlChange(href, currentHref, basePath = "") {
	try {
		const current = new URL(currentHref);
		const next = new URL(href, currentHref);
		return stripBasePath(current.pathname, basePath) === stripBasePath(next.pathname, basePath) && current.search === next.search && next.hash !== "";
	} catch {
		return false;
	}
}
//#endregion
//#region ../../../frontend/node_modules/vinext/dist/utils/html-limited-bots.js
var HTML_LIMITED_BOT_UA_RE_STRING = String.raw`[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight`;
var HEADLESS_BROWSER_BOT_UA_RE = /Googlebot(?!-)|Googlebot$/i;
var htmlLimitedBotRegexCache = /* @__PURE__ */ new Map();
function getHtmlLimitedBotRegex(htmlLimitedBots) {
	const source = htmlLimitedBots || HTML_LIMITED_BOT_UA_RE_STRING;
	const cached = htmlLimitedBotRegexCache.get(source);
	if (cached) return cached;
	const regex = new RegExp(source, "i");
	htmlLimitedBotRegexCache.set(source, regex);
	return regex;
}
/**
* Returns true when the User-Agent matches a known crawler/bot. Combines
* Next.js's "headless browser bot" check (Googlebot proper) with the
* "HTML-limited bot" list (Bingbot, DuckDuckBot, facebookexternalhit, …).
*
* Used by the Pages Router fallback path: a bot hitting an unlisted
* `fallback: true` route should get a synchronous render (real content) and
* not the loading shell, so the crawler indexes the actual page. Mirrors
* Next.js's `isBot()` in `.nextjs-ref/packages/next/src/shared/lib/router/utils/is-bot.ts`
* and the bot-aware fallback flip in
* `.nextjs-ref/packages/next/src/server/route-modules/pages/pages-handler.ts`.
*
* `htmlLimitedBots` allows next.config to override the HTML-limited list
* (same flag that drives `getHtmlLimitedBotRegex`), so a custom list applies
* to both streaming metadata gating and bot-aware fallback rendering.
*/
function isBotUserAgent(userAgent, htmlLimitedBots) {
	if (!userAgent) return false;
	if (HEADLESS_BROWSER_BOT_UA_RE.test(userAgent)) return true;
	return getHtmlLimitedBotRegex(htmlLimitedBots).test(userAgent);
}
var NAVIGATION_RUNTIME_KEY = Symbol.for("vinext.navigationRuntime");
var ROUTE_MANIFEST_SEGMENT_GRAPH_MAP_KEYS = [
	"boundaries",
	"defaults",
	"interceptions",
	"interceptionsBySlotId",
	"layouts",
	"pages",
	"rootBoundaries",
	"routeHandlers",
	"routes",
	"slotBindings",
	"slots",
	"templates"
];
function createNavigationRuntime() {
	return {
		bootstrap: {
			routeManifest: null,
			rsc: void 0
		},
		functions: {}
	};
}
function readRuntimeWindow() {
	if (typeof window === "undefined") return null;
	return window;
}
function isNavigationRuntimeFunctions(value) {
	if (!isUnknownRecord(value)) return false;
	return isOptionalRuntimeFunction(Reflect.get(value, "clearNavigationCaches")) && isOptionalRuntimeFunction(Reflect.get(value, "commitHashNavigation")) && isOptionalRuntimeFunction(Reflect.get(value, "navigateExternal")) && isOptionalRuntimeFunction(Reflect.get(value, "navigate")) && isOptionalRuntimeFunction(Reflect.get(value, "notifyLinkNavigationStart")) && isOptionalRuntimeFunction(Reflect.get(value, "pingVisibleLinks"));
}
function isNavigationRuntimeRscChunk(value) {
	if (typeof value === "string") return true;
	return Array.isArray(value) && value.length === 2 && value[0] === 3 && typeof value[1] === "string";
}
function isNavigationRuntimeSnapshot(value) {
	if (!isUnknownRecord(value)) return false;
	const pathname = Reflect.get(value, "pathname");
	const searchParams = Reflect.get(value, "searchParams");
	return typeof pathname === "string" && Array.isArray(searchParams) && searchParams.every((entry) => Array.isArray(entry) && entry.length === 2 && typeof entry[0] === "string" && typeof entry[1] === "string");
}
function isNavigationRuntimeParams(value) {
	if (!isUnknownRecord(value)) return false;
	return Object.values(value).every((entry) => typeof entry === "string" || Array.isArray(entry) && entry.every((part) => typeof part === "string"));
}
function isNavigationRuntimeRscBootstrap(value) {
	if (!isUnknownRecord(value)) return false;
	const done = Reflect.get(value, "done");
	const dynamicStaleTimeSeconds = Reflect.get(value, "dynamicStaleTimeSeconds");
	const initialCacheKind = Reflect.get(value, "initialCacheKind");
	const nav = Reflect.get(value, "nav");
	const params = Reflect.get(value, "params");
	const rsc = Reflect.get(value, "rsc");
	return (done === void 0 || typeof done === "boolean") && (dynamicStaleTimeSeconds === void 0 || typeof dynamicStaleTimeSeconds === "number" && Number.isFinite(dynamicStaleTimeSeconds) && dynamicStaleTimeSeconds >= 0) && (initialCacheKind === void 0 || initialCacheKind === "dynamic" || initialCacheKind === "static") && (nav === void 0 || isNavigationRuntimeSnapshot(nav)) && (params === void 0 || isNavigationRuntimeParams(params)) && Array.isArray(rsc) && rsc.every(isNavigationRuntimeRscChunk);
}
function isReadonlyStringArray(value) {
	return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}
function isNullableString(value) {
	return value === null || typeof value === "string";
}
function isNavigationRuntimeInterception(value) {
	if (!isUnknownRecord(value)) return false;
	return typeof value.id === "string" && typeof value.sourcePattern === "string" && isReadonlyStringArray(value.sourcePatternParts) && typeof value.targetPattern === "string" && isReadonlyStringArray(value.targetPatternParts) && typeof value.slotId === "string" && isNullableString(value.ownerLayoutId) && isNullableString(value.interceptingRouteId) && isNullableString(value.targetRouteId);
}
function isNavigationRuntimeInterceptionArray(value) {
	return Array.isArray(value) && value.every(isNavigationRuntimeInterception);
}
function isNavigationRuntimeRouteManifest(value) {
	if (!isUnknownRecord(value)) return false;
	const graphVersion = Reflect.get(value, "graphVersion");
	const segmentGraph = Reflect.get(value, "segmentGraph");
	if (typeof graphVersion !== "string" || !isUnknownRecord(segmentGraph)) return false;
	const interceptions = Reflect.get(segmentGraph, "interceptions");
	const interceptionsBySlotId = Reflect.get(segmentGraph, "interceptionsBySlotId");
	if (!ROUTE_MANIFEST_SEGMENT_GRAPH_MAP_KEYS.every((key) => Reflect.get(segmentGraph, key) instanceof Map) || !(interceptions instanceof Map) || !(interceptionsBySlotId instanceof Map)) return false;
	for (const interception of interceptions.values()) if (!isNavigationRuntimeInterception(interception)) return false;
	for (const slotInterceptions of interceptionsBySlotId.values()) if (!isNavigationRuntimeInterceptionArray(slotInterceptions)) return false;
	return true;
}
function isNavigationRuntimeBootstrap(value) {
	if (!isUnknownRecord(value)) return false;
	const routeManifest = Reflect.get(value, "routeManifest");
	const rsc = Reflect.get(value, "rsc");
	return (routeManifest === null || isNavigationRuntimeRouteManifest(routeManifest)) && (rsc === void 0 || isNavigationRuntimeRscBootstrap(rsc));
}
function isNavigationRuntime(value) {
	if (!isUnknownRecord(value)) return false;
	if (!("bootstrap" in value) || !("functions" in value)) return false;
	const { bootstrap, functions } = value;
	return isNavigationRuntimeBootstrap(bootstrap) && isNavigationRuntimeFunctions(functions);
}
function isOptionalRuntimeFunction(value) {
	return value === void 0 || typeof value === "function";
}
function getNavigationRuntime() {
	const runtimeWindow = readRuntimeWindow();
	if (runtimeWindow === null) return null;
	const runtime = Reflect.get(runtimeWindow, NAVIGATION_RUNTIME_KEY);
	return isNavigationRuntime(runtime) ? runtime : null;
}
/**
* Returns the registered browser runtime, creating it when a window exists.
* Without a window, callers receive a detached runtime and must retain the
* returned reference themselves; server calls are intentionally not global.
*/
function ensureNavigationRuntime() {
	const runtimeWindow = readRuntimeWindow();
	if (runtimeWindow === null) return createNavigationRuntime();
	const existingRuntime = Reflect.get(runtimeWindow, NAVIGATION_RUNTIME_KEY);
	const runtime = isNavigationRuntime(existingRuntime) ? existingRuntime : createNavigationRuntime();
	Reflect.set(runtimeWindow, NAVIGATION_RUNTIME_KEY, runtime);
	return runtime;
}
function registerNavigationRuntimeFunctions(functions) {
	const runtime = ensureNavigationRuntime();
	runtime.functions = {
		...runtime.functions,
		...functions
	};
	return runtime;
}
function hasAppNavigationRuntime() {
	return typeof getNavigationRuntime()?.functions.navigate === "function";
}
//#endregion
//#region ../../../frontend/node_modules/vinext/dist/shims/internal/app-prefetch-fetch-queue.js
var APP_PREFETCH_FETCH_SLOT_RELEASE_KEY = Symbol.for("vinext.appPrefetchFetchSlotRelease");
var MAX_DEFAULT_APP_PREFETCH_REQUESTS = 4;
var defaultAppPrefetchQueue = [];
var activeDefaultAppPrefetchRequests = 0;
var defaultAppPrefetchDrainScheduled = false;
function drainDefaultAppPrefetchQueue() {
	defaultAppPrefetchDrainScheduled = false;
	while (activeDefaultAppPrefetchRequests < MAX_DEFAULT_APP_PREFETCH_REQUESTS) {
		const run = defaultAppPrefetchQueue.shift();
		if (!run) return;
		activeDefaultAppPrefetchRequests += 1;
		run();
	}
}
function scheduleDefaultAppPrefetchDrain() {
	if (defaultAppPrefetchDrainScheduled) return;
	defaultAppPrefetchDrainScheduled = true;
	queueMicrotask(drainDefaultAppPrefetchQueue);
}
function releaseAppPrefetchFetchSlot(response) {
	const release = response[APP_PREFETCH_FETCH_SLOT_RELEASE_KEY];
	if (release === void 0) return;
	response[APP_PREFETCH_FETCH_SLOT_RELEASE_KEY] = void 0;
	release();
}
/**
* Low-priority App Router prefetches share a small request queue. The consumer
* must either snapshot the returned Response with snapshotRscResponse() or call
* releaseAppPrefetchFetchSlot() when it drops the response without consuming it.
*/
function scheduleAppPrefetchFetch(fetcher, priority) {
	if (priority === "high") return fetcher();
	return new Promise((resolve, reject) => {
		defaultAppPrefetchQueue.push(() => {
			let didRelease = false;
			const release = () => {
				if (didRelease) return;
				didRelease = true;
				activeDefaultAppPrefetchRequests -= 1;
				drainDefaultAppPrefetchQueue();
			};
			try {
				fetcher().then((response) => {
					response[APP_PREFETCH_FETCH_SLOT_RELEASE_KEY] = release;
					resolve(response);
				}, (error) => {
					release();
					reject(error);
				});
			} catch (error) {
				release();
				reject(error);
			}
		});
		scheduleDefaultAppPrefetchDrain();
	});
}
//#endregion
export { splitPathSegments as A, getLocalePathPrefix as C, createRouteTrieCache as D, reportBlockedDangerousNavigation as E, hasBasePath as M, removeTrailingSlash as N, matchRouteWithTrie as O, stripBasePath as P, getDomainLocaleUrl as S, isDangerousScheme as T, matchRoutePatternWithOptionalDynamicSegments as _, registerNavigationRuntimeFunctions as a, addLocalePrefix as b, isAbsoluteOrProtocolRelativeUrl as c, toBrowserNavigationHref as d, toSameOriginAppPath as f, matchRoutePatternPrefix as g, matchRoutePattern as h, hasAppNavigationRuntime as i, splitPathnameForRouteMatch as j, compareHybridRoutePatterns as k, isHashOnlyBrowserUrlChange as l, fillRoutePatternSegments as m, scheduleAppPrefetchFetch as n, isBotUserAgent as o, withBasePath as p, getNavigationRuntime as r, getWindowOrigin as s, releaseAppPrefetchFetchSlot as t, normalizePathTrailingSlash as u, routePatternParts as v, assertSafeNavigationUrl as w, detectDomainLocale as x, isUnknownRecord as y };

//# sourceMappingURL=app-prefetch-fetch-queue-DNONto9g.js.map