import { a as createRouteTrieCache, i as getLocalePathPrefix, o as matchRouteWithTrie, p as stripBasePath, s as compareHybridRoutePatterns } from "./domain-locale-CmOjdifF.js";
//#region ../../../frontend/node_modules/vinext/dist/utils/external-url.js
/** Detect an absolute URL with any scheme, or a protocol-relative URL. */
function isExternalUrl(url) {
	return /^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith("//");
}
//#endregion
//#region ../../../frontend/node_modules/vinext/dist/shims/internal/hybrid-client-route-owner-direct.js
var appRouteTrieCache = createRouteTrieCache();
var pagesRouteTrieCache = createRouteTrieCache();
function patternFromParts(parts) {
	return "/" + parts.join("/");
}
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
function matchDirectHybridClientRoutes(href, basePath) {
	const pathname = resolveSameOriginPathname(href, basePath);
	if (pathname === null) return {
		appMatch: null,
		pagesMatch: null
	};
	const appRoutes = window.__VINEXT_LINK_PREFETCH_ROUTES__;
	const pagesRoutes = window.__VINEXT_PAGES_LINK_PREFETCH_ROUTES__;
	return {
		appMatch: appRoutes ? matchRouteWithTrie(pathname, appRoutes, appRouteTrieCache)?.route ?? null : null,
		pagesMatch: pagesRoutes ? matchRouteWithTrie(pathname, pagesRoutes, pagesRouteTrieCache)?.route ?? null : null
	};
}
function resolveMatchedHybridClientRouteOwner({ appMatch, pagesMatch }) {
	if (appMatch === null && pagesMatch === null) return null;
	if (pagesMatch === null) return appMatch.documentOnly ? "document" : "app";
	if (appMatch === null) return pagesMatch.documentOnly ? "document" : "pages";
	const owner = compareHybridRoutePatterns(patternFromParts(pagesMatch.patternParts), pagesMatch.isDynamic, patternFromParts(appMatch.patternParts), appMatch.isDynamic);
	return (owner === "app" ? appMatch : pagesMatch).documentOnly ? "document" : owner;
}
function resolveDirectHybridClientRouteOwner(href, basePath) {
	if (typeof window === "undefined") return null;
	return resolveMatchedHybridClientRouteOwner(matchDirectHybridClientRoutes(href, basePath));
}
//#endregion
export { isExternalUrl as a, resolveSameOriginPathname as i, resolveDirectHybridClientRouteOwner as n, resolveMatchedHybridClientRouteOwner as r, matchDirectHybridClientRoutes as t };

//# sourceMappingURL=hybrid-client-route-owner-direct-BQX8XrU4.js.map