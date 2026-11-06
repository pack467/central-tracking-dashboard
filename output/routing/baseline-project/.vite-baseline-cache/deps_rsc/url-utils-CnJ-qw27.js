import { c as decodeMatchedParams, d as hasBasePath, p as stripBasePath } from "./domain-locale-CmOjdifF.js";
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
export { toBrowserNavigationHref as a, fillRoutePatternSegments as c, matchRoutePatternWithOptionalDynamicSegments as d, routePatternParts as f, reportBlockedDangerousNavigation as h, normalizePathTrailingSlash as i, matchRoutePattern as l, isDangerousScheme as m, isAbsoluteOrProtocolRelativeUrl as n, toSameOriginAppPath as o, assertSafeNavigationUrl as p, isHashOnlyBrowserUrlChange as r, withBasePath as s, getWindowOrigin as t, matchRoutePatternPrefix as u };

//# sourceMappingURL=url-utils-CnJ-qw27.js.map