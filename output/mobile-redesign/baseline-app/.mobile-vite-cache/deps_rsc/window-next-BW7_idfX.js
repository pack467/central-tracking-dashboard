import { r as __toESM } from "./chunk-CYJPkc-J.js";
import { t as require_react_react_server } from "./react.js";
//#region ../../../frontend/node_modules/vinext/dist/shims/internal/app-router-context.js
var import_react_react_server = /* @__PURE__ */ __toESM(require_react_react_server(), 1);
/**
* Shim for next/dist/shared/lib/app-router-context.shared-runtime
*
* Used by: @clerk/nextjs, next-intl, next-nprogress-bar, nextjs-toploader,
* next-view-transitions. Mostly type-only imports in published .d.ts files.
*
* We export the types and minimal context objects so these libraries resolve.
*/
var APP_ROUTER_CONTEXT_KEY = Symbol.for("vinext.appRouterContext");
var GLOBAL_LAYOUT_ROUTER_CONTEXT_KEY = Symbol.for("vinext.globalLayoutRouterContext");
var LAYOUT_ROUTER_CONTEXT_KEY = Symbol.for("vinext.layoutRouterContext");
var MISSING_SLOT_CONTEXT_KEY = Symbol.for("vinext.missingSlotContext");
var TEMPLATE_CONTEXT_KEY = Symbol.for("vinext.templateContext");
function getOrCreateContext(key, defaultValue) {
	if (typeof import_react_react_server.createContext !== "function") return null;
	const globalState = globalThis;
	if (!globalState[key]) globalState[key] = import_react_react_server.createContext(defaultValue);
	return globalState[key] ?? null;
}
var AppRouterContext = getOrCreateContext(APP_ROUTER_CONTEXT_KEY, null);
getOrCreateContext(GLOBAL_LAYOUT_ROUTER_CONTEXT_KEY, null);
getOrCreateContext(LAYOUT_ROUTER_CONTEXT_KEY, null);
getOrCreateContext(MISSING_SLOT_CONTEXT_KEY, /* @__PURE__ */ new Set());
getOrCreateContext(TEMPLATE_CONTEXT_KEY, null);
//#endregion
//#region ../../../frontend/node_modules/vinext/dist/shims/hash-scroll.js
function decodeHashFragment(fragment) {
	try {
		return decodeURIComponent(fragment);
	} catch {
		return fragment;
	}
}
function scrollToHashTarget(hash) {
	const fragment = decodeHashFragment(hash.startsWith("#") ? hash.slice(1) : hash);
	if (fragment === "" || fragment === "top") {
		window.scrollTo(0, 0);
		return;
	}
	const idElement = document.getElementById(fragment);
	if (idElement) {
		idElement.scrollIntoView({ behavior: "auto" });
		return;
	}
	const namedElement = document.getElementsByName(fragment)[0];
	if (namedElement) {
		namedElement.scrollIntoView({ behavior: "auto" });
		return;
	}
	window.scrollTo(0, 0);
}
function retryScrollTo(x, y, opts) {
	const minFrames = opts?.minFrames ?? 0;
	const shouldContinue = opts?.shouldContinue ?? (() => true);
	let attempts = 0;
	const restore = () => {
		if (!shouldContinue()) return;
		window.scrollTo(x, y);
		const reachedTarget = Math.abs(window.scrollY - y) <= 1;
		if (!shouldContinue() || reachedTarget && attempts >= minFrames || attempts >= 60) return;
		attempts += 1;
		requestAnimationFrame(restore);
	};
	restore();
}
//#endregion
//#region ../../../frontend/node_modules/vinext/dist/client/window-next.js
/**
* Build-time replacement for the vinext package version, injected by the
* Vite plugin via `define` (see `index.ts` — `process.env.__NEXT_VERSION`
* is mirrored from `packages/vinext/package.json#version` so library
* callers that read `process.env.__NEXT_VERSION` see a real value).
*
* In environments where the define did not run (standalone unit tests
* that import this module without going through the plugin), the
* `?? "vinext"` fallback prevents a literal `undefined` from landing on
* `window.next.version`.
*/
var VINEXT_VERSION = process.env.__NEXT_VERSION ?? "vinext";
/**
* Install `window.next` if it has not already been installed in this
* document. Subsequent calls update fields in place so both the Pages
* Router and the App Router bootstraps can call this without clobbering
* each other (e.g. for hybrid `pages/` + `app/` setups).
*
* When called a second time, `router` and `appDir` overwrite the previous
* values. This mirrors Next.js's load order: in a hybrid app the App
* Router's `app-bootstrap.ts` runs after Pages Router's `next.ts` and the
* App Router instance wins.
*
* No module-level cache: we read and write through `window.next` directly
* so that a test (or userland code) that deletes `window.next` cleanly
* resets state.
*/
function installWindowNext(fields) {
	if (typeof window === "undefined") return;
	const existing = window.next;
	if (existing) {
		if (fields.version !== void 0) existing.version = fields.version;
		if (fields.appDir !== void 0) existing.appDir = fields.appDir;
		if (fields.router !== void 0) existing.router = fields.router;
		if (fields.__pendingUrl !== void 0) existing.__pendingUrl = fields.__pendingUrl;
		if (fields.__internal_src_page !== void 0) existing.__internal_src_page = fields.__internal_src_page;
		return;
	}
	window.next = {
		version: fields.version ?? VINEXT_VERSION,
		...fields
	};
}
//#endregion
export { AppRouterContext as i, retryScrollTo as n, scrollToHashTarget as r, installWindowNext as t };

//# sourceMappingURL=window-next-BW7_idfX.js.map