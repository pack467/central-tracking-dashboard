import { A as renderServerInsertedHTML, C as clearServerInsertedHTML, D as getLayoutSegmentContext, O as getNavigationContext, _ as unauthorized, a as RedirectType, b as ServerInsertedHTMLContext, c as getAccessFallbackHTTPStatus, d as isHTTPAccessFallbackError, f as isNextRouterError, g as redirect, h as permanentRedirect, i as HTTP_ERROR_FALLBACK_ERROR_CODE, j as setNavigationContext, l as isBailoutToCSRError, m as notFound, n as BailoutToCSRError, p as isRedirectError, r as DynamicServerError, s as forbidden, t as ReadonlyURLSearchParams, u as isDynamicServerError, v as unstable_rethrow, w as flushServerInsertedHTML, x as _registerStateAccessors, y as GLOBAL_ACCESSORS_KEY } from "./readonly-url-search-params-DPvBE-en.js";
//#region ../../../frontend/node_modules/vinext/dist/shims/client-hook-error.js
/**
* Shared error helper for client-only hooks called in Server Components.
*
* Used by `.react-server.ts` shim variants to provide a clear, actionable
* error message when a developer forgets the "use client" directive.
*
* @see https://github.com/cloudflare/vinext/issues/834
*/
function buildClientHookErrorMessage(hookName) {
	return `${hookName} only works in Client Components. Add the "use client" directive at the top of the file to use it. Read more: https://nextjs.org/docs/messages/react-client-hook-in-server-component`;
}
function throwClientHookError(hookName) {
	throw new Error(buildClientHookErrorMessage(hookName));
}
//#endregion
//#region ../../../frontend/node_modules/vinext/dist/shims/navigation.react-server.js
function usePathname() {
	throwClientHookError("usePathname()");
}
function useSearchParams() {
	throwClientHookError("useSearchParams()");
}
function useParams() {
	throwClientHookError("useParams()");
}
function useRouter() {
	throwClientHookError("useRouter()");
}
function useSelectedLayoutSegment() {
	throwClientHookError("useSelectedLayoutSegment()");
}
function useSelectedLayoutSegments() {
	throwClientHookError("useSelectedLayoutSegments()");
}
function useServerInsertedHTML() {
	throwClientHookError("useServerInsertedHTML()");
}
function unstable_isUnrecognizedActionError() {
	throw new Error("`unstable_isUnrecognizedActionError` can only be used on the client.");
}
//#endregion
export { BailoutToCSRError, DynamicServerError, GLOBAL_ACCESSORS_KEY, HTTP_ERROR_FALLBACK_ERROR_CODE, ReadonlyURLSearchParams, RedirectType, ServerInsertedHTMLContext, _registerStateAccessors, clearServerInsertedHTML, flushServerInsertedHTML, forbidden, getAccessFallbackHTTPStatus, getLayoutSegmentContext, getNavigationContext, isBailoutToCSRError, isDynamicServerError, isHTTPAccessFallbackError, isNextRouterError, isRedirectError, notFound, permanentRedirect, redirect, renderServerInsertedHTML, setNavigationContext, unauthorized, unstable_isUnrecognizedActionError, unstable_rethrow, useParams, usePathname, useRouter, useSearchParams, useSelectedLayoutSegment, useSelectedLayoutSegments, useServerInsertedHTML };

//# sourceMappingURL=next_navigation.js.map