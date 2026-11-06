import { t as isUnknownRecord } from "./record-ybEiyKbN.js";
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
export { registerNavigationRuntimeFunctions as a, hasAppNavigationRuntime as i, scheduleAppPrefetchFetch as n, isBotUserAgent as o, getNavigationRuntime as r, releaseAppPrefetchFetchSlot as t };

//# sourceMappingURL=app-prefetch-fetch-queue-jp9O8Mh3.js.map