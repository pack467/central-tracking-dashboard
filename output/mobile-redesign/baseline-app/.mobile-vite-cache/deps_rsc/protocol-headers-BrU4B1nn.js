//#region ../../../frontend/node_modules/vinext/dist/utils/protocol-headers.js
/** Serialized middleware context (JSON) forwarded from dev server to RSC entry. */
var VINEXT_MW_CTX_HEADER = "x-vinext-mw-ctx";
/** Build-time prerender authentication secret. */
var VINEXT_PRERENDER_SECRET_HEADER = "x-vinext-prerender-secret";
/** URL-encoded JSON route params for build-time prerender renders. */
var VINEXT_PRERENDER_ROUTE_PARAMS_HEADER = "x-vinext-prerender-route-params";
/** Indicates a build-time prerender render is probing whether a route can be static. */
var VINEXT_PRERENDER_SPECULATIVE_HEADER = "x-vinext-prerender-speculative";
/** Prefix for forwarded request headers (e.g. `x-middleware-request-cookie`). */
var MIDDLEWARE_REQUEST_HEADER_PREFIX = "x-middleware-request-";
/** Comma-separated list of header names that middleware wants to override. */
var MIDDLEWARE_OVERRIDE_HEADERS = "x-middleware-override-headers";
/** Carries cookies set by middleware for same-render reads. */
var MIDDLEWARE_SET_COOKIE_HEADER = "x-middleware-set-cookie";
/** Skip-middleware signal. */
var MIDDLEWARE_SKIP_HEADER = "x-middleware-skip";
/** Generic prefix for all middleware internal headers. */
var MIDDLEWARE_HEADER_PREFIX = "x-middleware-";
//#endregion
export { MIDDLEWARE_SKIP_HEADER as a, VINEXT_PRERENDER_SECRET_HEADER as c, MIDDLEWARE_SET_COOKIE_HEADER as i, VINEXT_PRERENDER_SPECULATIVE_HEADER as l, MIDDLEWARE_OVERRIDE_HEADERS as n, VINEXT_MW_CTX_HEADER as o, MIDDLEWARE_REQUEST_HEADER_PREFIX as r, VINEXT_PRERENDER_ROUTE_PARAMS_HEADER as s, MIDDLEWARE_HEADER_PREFIX as t };

//# sourceMappingURL=protocol-headers-BrU4B1nn.js.map