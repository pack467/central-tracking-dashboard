import { n as __exportAll } from "./chunk-CYJPkc-J.js";
//#region ../../../frontend/node_modules/vinext/dist/server/app-rsc-render-mode.js
var app_rsc_render_mode_exports = /* @__PURE__ */ __exportAll({
	APP_RSC_RENDER_MODE_NAVIGATION: () => APP_RSC_RENDER_MODE_NAVIGATION,
	APP_RSC_RENDER_MODE_PREFETCH_DYNAMIC_SHELL: () => APP_RSC_RENDER_MODE_PREFETCH_DYNAMIC_SHELL,
	APP_RSC_RENDER_MODE_PREFETCH_LOADING_SHELL: () => APP_RSC_RENDER_MODE_PREFETCH_LOADING_SHELL,
	getRscRenderModeCacheVariant: () => getRscRenderModeCacheVariant,
	parseAppRscRenderMode: () => parseAppRscRenderMode
});
var APP_RSC_RENDER_MODE_NAVIGATION = "navigation";
var APP_RSC_RENDER_MODE_PREFETCH_DYNAMIC_SHELL = "prefetch-dynamic-shell";
var APP_RSC_RENDER_MODE_PREFETCH_LOADING_SHELL = "prefetch-loading-shell";
function getRscRenderModeCacheVariant(mode) {
	if (mode === "prefetch-dynamic-shell") return "prefetch-dynamic-shell";
	if (mode === "prefetch-loading-shell") return "prefetch-loading-shell";
	return null;
}
function parseAppRscRenderMode(value) {
	switch (value) {
		case APP_RSC_RENDER_MODE_PREFETCH_DYNAMIC_SHELL: return APP_RSC_RENDER_MODE_PREFETCH_DYNAMIC_SHELL;
		case APP_RSC_RENDER_MODE_PREFETCH_LOADING_SHELL: return APP_RSC_RENDER_MODE_PREFETCH_LOADING_SHELL;
		default: return APP_RSC_RENDER_MODE_NAVIGATION;
	}
}
//#endregion
export { parseAppRscRenderMode as n, app_rsc_render_mode_exports as t };

//# sourceMappingURL=app-rsc-render-mode-C80FZ6gr.js.map