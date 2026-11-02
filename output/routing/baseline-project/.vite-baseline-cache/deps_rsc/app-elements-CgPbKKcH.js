import { r as __toESM } from "./chunk-CYJPkc-J.js";
import { t as require_react_react_server } from "./react.js";
import { t as require_jsx_runtime_react_server } from "./react_jsx-runtime.js";
import { t as isUnknownRecord } from "./record-ybEiyKbN.js";
//#region ../../../frontend/node_modules/vinext/dist/server/normalize-path.js
function isInterceptionMatchedUrlPath(value) {
	return value.startsWith("/") && !value.startsWith("//") && !value.includes("?") && !value.includes("#") && !value.includes("\0");
}
//#endregion
//#region ../../../frontend/node_modules/vinext/dist/utils/compare.js
var compareStrings = (left, right) => {
	if (left < right) return -1;
	if (left > right) return 1;
	return 0;
};
//#endregion
//#region ../../../frontend/node_modules/vinext/dist/server/artifact-compatibility.js
function createArtifactCompatibilityEnvelope(input = {}) {
	return {
		schemaVersion: 1,
		graphVersion: input.graphVersion ?? null,
		deploymentVersion: input.deploymentVersion ?? null,
		appElementsSchemaVersion: 1,
		rscPayloadSchemaVersion: 1,
		rootBoundaryId: input.rootBoundaryId ?? null,
		renderEpoch: input.renderEpoch ?? null
	};
}
function isStringOrNull(value) {
	return typeof value === "string" || value === null;
}
function hasCurrentSchemaVersions(record) {
	return record.schemaVersion === 1 && record.appElementsSchemaVersion === 1 && record.rscPayloadSchemaVersion === 1;
}
function parseArtifactCompatibilityEnvelope(value) {
	if (!isUnknownRecord(value)) return null;
	if (!hasCurrentSchemaVersions(value)) return null;
	if (!isStringOrNull(value.graphVersion)) return null;
	if (!isStringOrNull(value.deploymentVersion)) return null;
	if (!isStringOrNull(value.rootBoundaryId)) return null;
	if (!isStringOrNull(value.renderEpoch)) return null;
	return {
		schemaVersion: 1,
		graphVersion: value.graphVersion,
		deploymentVersion: value.deploymentVersion,
		appElementsSchemaVersion: 1,
		rscPayloadSchemaVersion: 1,
		rootBoundaryId: value.rootBoundaryId,
		renderEpoch: value.renderEpoch
	};
}
require_jsx_runtime_react_server();
var appElementRenderDependencies = /* @__PURE__ */ new WeakMap();
function releaseAppElementRenderDependency(elements, elementId) {
	appElementRenderDependencies.get(elements)?.get(elementId)?.release();
}
//#endregion
//#region ../../../frontend/node_modules/vinext/dist/server/app-elements-wire.js
var import_react_react_server = /* @__PURE__ */ __toESM(require_react_react_server(), 1);
var APP_INTERCEPTION_SEPARATOR = "\0";
var APP_ARTIFACT_COMPATIBILITY_KEY = "__artifactCompatibility";
var APP_CACHE_ENTRY_REUSE_PROOF_KEY = "__cacheEntryReuseProof";
var APP_DYNAMIC_STALE_TIME_KEY = "__dynamicStaleTime";
var APP_INTERCEPTION_KEY = "__interception";
var APP_INTERCEPTION_CONTEXT_KEY = "__interceptionContext";
var APP_LAYOUT_IDS_KEY = "__layoutIds";
var APP_LAYOUT_FLAGS_KEY = "__layoutFlags";
var APP_RENDER_OBSERVATION_KEY = "__renderObservation";
var APP_ROUTE_KEY = "__route";
var APP_ROOT_LAYOUT_KEY = "__rootLayout";
var APP_SKIPPED_LAYOUT_IDS_KEY = "__skippedLayoutIds";
var APP_SOURCE_PAGE_KEY = "__sourcePage";
var APP_SLOT_BINDINGS_KEY = "__slotBindings";
/**
* Static sibling segment names for the matched route, surfaced so the client
* router can determine if a cached prefetch of a dynamic route can be reused
* when navigating to a static sibling URL.
*
* Mirrors Next.js's `staticSiblings` tuple element on the loader-tree dynamic
* segments (issue cloudflare/vinext#1525).
*/
var APP_STATIC_SIBLINGS_KEY = "__staticSiblings";
var APP_UNMATCHED_SLOT_WIRE_VALUE = "__VINEXT_UNMATCHED_SLOT__";
var UNMATCHED_SLOT = Symbol.for("vinext.unmatchedSlot");
var EMPTY_SKIPPED_LAYOUT_IDS = /* @__PURE__ */ new Set();
function createCacheProofRejectionCodeSet(codes) {
	return new Set(codes);
}
var CACHE_PROOF_REJECTION_CODES = createCacheProofRejectionCodeSet([
	"CP_CACHE_ENTRY_PROOF_MISSING",
	"CP_MODEL_DISABLED",
	"CP_ARTIFACT_COMPATIBILITY_INCOMPATIBLE",
	"CP_ARTIFACT_COMPATIBILITY_UNKNOWN",
	"CP_DIMENSION_COUNT_EXCEEDED",
	"CP_DIMENSION_NAME_MISSING",
	"CP_DIMENSION_NAME_TOO_LONG",
	"CP_DIMENSION_VALUE_COUNT_EXCEEDED",
	"CP_DIMENSION_VALUE_TOO_LONG",
	"CP_DIMENSION_VALUES_MISSING",
	"CP_ENCODED_VARIANT_TOO_LONG",
	"CP_INVALID_VARIANT_BUDGET",
	"CP_ROUTE_VARIANT_BUDGET_ROUTE_MISMATCH",
	"CP_ROUTE_VARIANT_CEILING_EXCEEDED",
	"CP_UNSAFE_PUBLIC_DIMENSION",
	"CP_BOUNDARY_OUTCOME_MISMATCH",
	"CP_BOUNDARY_OUTCOME_UNKNOWN",
	"CP_PRIVATE_DYNAMIC_DOWNGRADE",
	"CP_STATIC_LAYOUT_CANDIDATE_OUTPUT_KIND",
	"CP_STATIC_LAYOUT_CURRENT_OUTPUT_KIND",
	"CP_STATIC_LAYOUT_ID_MISMATCH",
	"CP_STATIC_LAYOUT_OBSERVATION_OUTPUT_KIND",
	"CP_STATIC_LAYOUT_OBSERVATION_OUTPUT_MISMATCH",
	"CP_STATIC_LAYOUT_PRIVATE_DYNAMIC_DOWNGRADE",
	"CP_STATIC_LAYOUT_REQUEST_API_OBSERVED",
	"CP_STATIC_LAYOUT_REQUEST_API_UNKNOWN",
	"CP_STATIC_LAYOUT_ROOT_BOUNDARY_MISMATCH",
	"CP_STATIC_LAYOUT_ROOT_BOUNDARY_UNKNOWN",
	"CP_STATIC_LAYOUT_VARIANT_DIMENSION_UNPROVEN"
]);
var compareAppElementsSlotIds = compareStrings;
function compareAppElementsSlotBindingsBySlotId(left, right) {
	return compareAppElementsSlotIds(left.slotId, right.slotId);
}
function normalizeAppElementsSlotBindings(slotBindings, options = {}) {
	const ownerLayoutIds = options.layoutIds ? new Set(options.layoutIds) : null;
	const seenSlotIds = /* @__PURE__ */ new Set();
	const normalized = [];
	for (const binding of slotBindings) {
		if (seenSlotIds.has(binding.slotId)) throw new Error("[vinext] Invalid __slotBindings in App Router payload: duplicate slot id");
		seenSlotIds.add(binding.slotId);
		if (ownerLayoutIds && binding.ownerLayoutId !== null && !ownerLayoutIds.has(binding.ownerLayoutId)) throw new Error("[vinext] Invalid __slotBindings in App Router payload: owner layout id missing from __layoutIds");
		normalized.push({ ...binding });
	}
	return normalized.sort(compareAppElementsSlotBindingsBySlotId);
}
function appendInterceptionContext(identity, interceptionContext) {
	return interceptionContext === null ? identity : `${identity}${APP_INTERCEPTION_SEPARATOR}${interceptionContext}`;
}
function createAppPayloadRouteId(routePath, interceptionContext) {
	return appendInterceptionContext(`route:${routePath}`, interceptionContext);
}
function createAppPayloadPageId(routePath, interceptionContext) {
	return appendInterceptionContext(`page:${routePath}`, interceptionContext);
}
function createAppPayloadLayoutId(treePath) {
	return `layout:${treePath}`;
}
function createAppPayloadTemplateId(treePath) {
	return `template:${treePath}`;
}
function createAppPayloadSlotId(slotName, treePath) {
	return `slot:${slotName}:${treePath}`;
}
function createAppPayloadCacheKey(rscUrl, interceptionContext) {
	return appendInterceptionContext(rscUrl, interceptionContext);
}
function parsePathWithInterception(input) {
	const separatorIndex = input.indexOf(APP_INTERCEPTION_SEPARATOR);
	const path = separatorIndex === -1 ? input : input.slice(0, separatorIndex);
	if (!path.startsWith("/")) return null;
	return {
		interceptionContext: separatorIndex === -1 ? null : input.slice(separatorIndex + 1),
		path
	};
}
/**
* AppElements tree paths are absolute route-tree paths on the wire.
* Bare segment names are not valid layout/template/slot tree identities.
*/
function parseTreePath(input) {
	return input.startsWith("/") ? input : null;
}
function parseAppElementsWireElementKey(key) {
	if (key.startsWith("route:")) {
		const parsed = parsePathWithInterception(key.slice(6));
		if (!parsed) return null;
		return {
			interceptionContext: parsed.interceptionContext,
			kind: "route",
			path: parsed.path
		};
	}
	if (key.startsWith("page:")) {
		const parsed = parsePathWithInterception(key.slice(5));
		if (!parsed) return null;
		return {
			interceptionContext: parsed.interceptionContext,
			kind: "page",
			path: parsed.path
		};
	}
	if (key.startsWith("layout:")) {
		const treePath = parseTreePath(key.slice(7));
		return treePath ? {
			kind: "layout",
			treePath
		} : null;
	}
	if (key.startsWith("template:")) {
		const treePath = parseTreePath(key.slice(9));
		return treePath ? {
			kind: "template",
			treePath
		} : null;
	}
	if (key.startsWith("slot:")) {
		const body = key.slice(5);
		const separatorIndex = body.indexOf(":");
		if (separatorIndex <= 0) return null;
		const name = body.slice(0, separatorIndex);
		const treePath = parseTreePath(body.slice(separatorIndex + 1));
		return treePath ? {
			kind: "slot",
			name,
			treePath
		} : null;
	}
	return null;
}
function isAppElementsWireSlotId(key) {
	if (!key.startsWith("slot:")) return false;
	const body = key.slice(5);
	const separatorIndex = body.indexOf(":");
	return separatorIndex > 0 && body.charCodeAt(separatorIndex + 1) === 47;
}
function createAppElementsWireMetadataEntries(input) {
	const layoutIds = [...input.layoutIds ?? []];
	const entries = {
		[APP_ROUTE_KEY]: input.routeId,
		[APP_INTERCEPTION_CONTEXT_KEY]: input.interceptionContext,
		[APP_LAYOUT_IDS_KEY]: layoutIds,
		[APP_ROOT_LAYOUT_KEY]: input.rootLayoutTreePath,
		...input.dynamicStaleTimeSeconds === void 0 ? {} : { [APP_DYNAMIC_STALE_TIME_KEY]: input.dynamicStaleTimeSeconds },
		...input.sourcePage === null || input.sourcePage === void 0 ? {} : { [APP_SOURCE_PAGE_KEY]: input.sourcePage }
	};
	const entriesWithInterception = input.interception ? {
		...entries,
		[APP_INTERCEPTION_KEY]: input.interception
	} : entries;
	if (input.slotBindings && input.slotBindings.length > 0) return {
		...entriesWithInterception,
		[APP_SLOT_BINDINGS_KEY]: normalizeAppElementsSlotBindings(input.slotBindings, { layoutIds })
	};
	return entriesWithInterception;
}
function normalizeAppElements(elements) {
	let needsNormalization = false;
	for (const [key, value] of Object.entries(elements)) if (isAppElementsWireSlotId(key) && value === "__VINEXT_UNMATCHED_SLOT__") {
		needsNormalization = true;
		break;
	}
	if (!needsNormalization) return elements;
	const normalized = {};
	for (const [key, value] of Object.entries(elements)) normalized[key] = isAppElementsWireSlotId(key) && value === "__VINEXT_UNMATCHED_SLOT__" ? UNMATCHED_SLOT : value;
	return normalized;
}
function isLayoutFlagsRecord(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
	for (const v of Object.values(value)) if (v !== "s" && v !== "d") return false;
	return true;
}
function parseLayoutFlags(value) {
	if (isLayoutFlagsRecord(value)) return value;
	return {};
}
function parseLayoutIdList(value, fieldName) {
	if (value === void 0) return [];
	if (!Array.isArray(value)) throw new Error(`[vinext] Invalid ${fieldName} in App Router payload: expected layout id string[]`);
	const layoutIds = [];
	for (const entry of value) {
		if (typeof entry !== "string") throw new Error(`[vinext] Invalid ${fieldName} in App Router payload: expected layout id string[]`);
		if (parseAppElementsWireElementKey(entry)?.kind !== "layout") throw new Error(`[vinext] Invalid ${fieldName} in App Router payload: expected layout ids`);
		layoutIds.push(entry);
	}
	return layoutIds;
}
function parseLayoutIds(value) {
	return parseLayoutIdList(value, APP_LAYOUT_IDS_KEY);
}
function parseSkippedLayoutIds(value) {
	return parseLayoutIdList(value, APP_SKIPPED_LAYOUT_IDS_KEY);
}
function isSlotBindingState(value) {
	return value === "active" || value === "default" || value === "unmatched";
}
function parseSlotBindings(value, options = {}) {
	if (value === void 0) return [];
	if (!Array.isArray(value)) throw new Error("[vinext] Invalid __slotBindings in App Router payload: expected array");
	const slotBindings = [];
	for (const entry of value) {
		if (!isUnknownRecord(entry)) throw new Error("[vinext] Invalid __slotBindings in App Router payload: expected objects");
		const slotId = entry.slotId;
		if (typeof slotId !== "string" || parseAppElementsWireElementKey(slotId)?.kind !== "slot") throw new Error("[vinext] Invalid __slotBindings in App Router payload: expected slot ids");
		const ownerLayoutId = entry.ownerLayoutId;
		if (ownerLayoutId !== null && (typeof ownerLayoutId !== "string" || parseAppElementsWireElementKey(ownerLayoutId)?.kind !== "layout")) throw new Error("[vinext] Invalid __slotBindings in App Router payload: expected owner layout ids");
		const state = entry.state;
		if (!isSlotBindingState(state)) throw new Error("[vinext] Invalid __slotBindings in App Router payload: expected state");
		const activeRouteId = entry.activeRouteId;
		if (activeRouteId !== void 0 && activeRouteId !== null && (typeof activeRouteId !== "string" || parseAppElementsWireElementKey(activeRouteId)?.kind !== "route")) throw new Error("[vinext] Invalid __slotBindings in App Router payload: expected route ids");
		slotBindings.push({
			...activeRouteId !== void 0 ? { activeRouteId } : {},
			ownerLayoutId,
			slotId,
			state
		});
	}
	return normalizeAppElementsSlotBindings(slotBindings, options);
}
function readRequiredInterceptionString(entry, fieldName) {
	const value = entry[fieldName];
	if (typeof value !== "string") throw new Error("[vinext] Invalid __interception in App Router payload: expected strings");
	return value;
}
function parseInterceptionMatchedUrl(value) {
	if (!isInterceptionMatchedUrlPath(value)) throw new Error("[vinext] Invalid __interception in App Router payload: expected path URLs");
	return value;
}
function parseInterceptionRouteId(value, matchedUrl) {
	const parsed = parseAppElementsWireElementKey(value);
	if (parsed?.kind !== "route" || parsed.path !== matchedUrl || parsed.interceptionContext !== null) throw new Error("[vinext] Invalid __interception in App Router payload: expected route ids");
	return value;
}
function parseInterceptionSlotId(value) {
	if (parseAppElementsWireElementKey(value)?.kind !== "slot") throw new Error("[vinext] Invalid __interception in App Router payload: expected slot id");
	return value;
}
function parseInterceptionMetadata(value) {
	if (value === void 0 || value === null) return null;
	if (!isUnknownRecord(value)) throw new Error("[vinext] Invalid __interception in App Router payload: expected object");
	const sourceMatchedUrl = parseInterceptionMatchedUrl(readRequiredInterceptionString(value, "sourceMatchedUrl"));
	const targetMatchedUrl = parseInterceptionMatchedUrl(readRequiredInterceptionString(value, "targetMatchedUrl"));
	return {
		sourceMatchedUrl,
		sourceRouteId: parseInterceptionRouteId(readRequiredInterceptionString(value, "sourceRouteId"), sourceMatchedUrl),
		slotId: parseInterceptionSlotId(readRequiredInterceptionString(value, "slotId")),
		targetMatchedUrl,
		targetRouteId: parseInterceptionRouteId(readRequiredInterceptionString(value, "targetRouteId"), targetMatchedUrl)
	};
}
/**
* Type predicate for a plain (non-null, non-array) record of app payload values.
* Used to distinguish the App Router payload object from bare React elements at
* the render boundary. Narrows to `Readonly<Record<string, unknown>>` because
* the outgoing payload carries heterogeneous values (ReactNodes for the rendered
* tree, plus metadata like `__layoutFlags` which is a plain object). Delegates
* to React's canonical `isValidElement` so we don't depend on React's internal
* `$$typeof` marker scheme.
*/
function isAppElementsRecord(value) {
	if (typeof value !== "object" || value === null) return false;
	if (Array.isArray(value)) return false;
	if ((0, import_react_react_server.isValidElement)(value)) return false;
	return true;
}
function withLayoutFlags(elements, layoutFlags) {
	return {
		...elements,
		[APP_LAYOUT_FLAGS_KEY]: layoutFlags
	};
}
function buildOutgoingAppPayload(input) {
	if (!isAppElementsRecord(input.element)) return input.element;
	const skippedLayoutIds = createSkippedLayoutIds(input.skipDisposition);
	const payload = {};
	for (const [key, value] of Object.entries(input.element)) {
		if (skippedLayoutIds.has(key)) {
			releaseAppElementRenderDependency(input.element, key);
			continue;
		}
		payload[key] = value === UNMATCHED_SLOT ? APP_UNMATCHED_SLOT_WIRE_VALUE : value;
	}
	payload[APP_LAYOUT_FLAGS_KEY] = input.layoutFlags;
	if (skippedLayoutIds.size > 0) payload[APP_SKIPPED_LAYOUT_IDS_KEY] = [...skippedLayoutIds];
	payload[APP_ARTIFACT_COMPATIBILITY_KEY] = input.artifactCompatibility ?? createArtifactCompatibilityEnvelope();
	if (input.cacheEntryReuseProof) payload[APP_CACHE_ENTRY_REUSE_PROOF_KEY] = input.cacheEntryReuseProof;
	if (input.dynamicStaleTimeSeconds !== void 0) payload[APP_DYNAMIC_STALE_TIME_KEY] = input.dynamicStaleTimeSeconds;
	if (input.renderObservation) payload[APP_RENDER_OBSERVATION_KEY] = input.renderObservation;
	return payload;
}
function createSkippedLayoutIds(skipDisposition) {
	if (skipDisposition?.enabled !== true) return EMPTY_SKIPPED_LAYOUT_IDS;
	const skippedLayoutIds = /* @__PURE__ */ new Set();
	for (const id of skipDisposition.skippedEntryIds) if (parseAppElementsWireElementKey(id)?.kind === "layout") skippedLayoutIds.add(id);
	return skippedLayoutIds;
}
function readArtifactCompatibilityMetadata(value) {
	if (value === void 0) return createArtifactCompatibilityEnvelope();
	return parseArtifactCompatibilityEnvelope(value) ?? createArtifactCompatibilityEnvelope();
}
function readSourcePageMetadata(value) {
	if (value === void 0 || value === null) return null;
	if (typeof value !== "string" || !value.startsWith("/")) return null;
	return value;
}
function createMissingCacheEntryReuseProof() {
	return {
		kind: "runtime-cache-entry",
		decision: null
	};
}
function isCacheProofRejectionCode(value) {
	return typeof value === "string" && CACHE_PROOF_REJECTION_CODES.has(value);
}
function isCacheProofFallbackMode(value) {
	return value === "renderFresh" || value === "privateUncacheable";
}
function isCacheProofFallbackScope(value) {
	return value === "affectedOutput" || value === "route";
}
function parseCacheEntryReuseProofMetadata(value) {
	if (value === void 0) return null;
	if (!isUnknownRecord(value) || value.kind !== "runtime-cache-entry") return createMissingCacheEntryReuseProof();
	const decision = value.decision;
	if (decision === null) return createMissingCacheEntryReuseProof();
	if (!isUnknownRecord(decision)) return createMissingCacheEntryReuseProof();
	if (decision.kind === "reuse" && decision.canReuse === true && decision.code === "CP_STATIC_LAYOUT_REUSE_PROVEN" && decision.reuseClass === "static-layout") return {
		kind: "runtime-cache-entry",
		decision: {
			canReuse: true,
			code: decision.code,
			kind: "reuse",
			reuseClass: decision.reuseClass
		}
	};
	if (decision.kind === "reject" && decision.canReuse === false && isCacheProofRejectionCode(decision.code) && isCacheProofFallbackMode(decision.mode) && isCacheProofFallbackScope(decision.scope)) return {
		kind: "runtime-cache-entry",
		decision: {
			canReuse: false,
			code: decision.code,
			kind: "reject",
			mode: decision.mode,
			scope: decision.scope
		}
	};
	return createMissingCacheEntryReuseProof();
}
function readAppElementsMetadata(elements) {
	const routeId = elements[APP_ROUTE_KEY];
	if (typeof routeId !== "string") throw new Error("[vinext] Missing __route string in App Router payload");
	const interceptionContext = elements[APP_INTERCEPTION_CONTEXT_KEY];
	if (interceptionContext !== void 0 && interceptionContext !== null && typeof interceptionContext !== "string") throw new Error("[vinext] Invalid __interceptionContext in App Router payload");
	const rootLayoutTreePath = elements[APP_ROOT_LAYOUT_KEY];
	if (rootLayoutTreePath === void 0) throw new Error("[vinext] Missing __rootLayout key in App Router payload");
	if (rootLayoutTreePath !== null && typeof rootLayoutTreePath !== "string") throw new Error("[vinext] Invalid __rootLayout in App Router payload: expected string or null");
	const layoutFlags = parseLayoutFlags(elements[APP_LAYOUT_FLAGS_KEY]);
	const layoutIds = parseLayoutIds(elements[APP_LAYOUT_IDS_KEY]);
	const skippedLayoutIds = parseSkippedLayoutIds(elements[APP_SKIPPED_LAYOUT_IDS_KEY]);
	const slotBindings = parseSlotBindings(elements[APP_SLOT_BINDINGS_KEY], { layoutIds });
	const interception = parseInterceptionMetadata(elements[APP_INTERCEPTION_KEY]);
	const artifactCompatibility = readArtifactCompatibilityMetadata(elements[APP_ARTIFACT_COMPATIBILITY_KEY]);
	const cacheEntryReuseProof = parseCacheEntryReuseProofMetadata(elements[APP_CACHE_ENTRY_REUSE_PROOF_KEY]);
	const dynamicStaleTime = elements[APP_DYNAMIC_STALE_TIME_KEY];
	const dynamicStaleTimeSeconds = typeof dynamicStaleTime === "number" && Number.isFinite(dynamicStaleTime) && dynamicStaleTime >= 0 ? dynamicStaleTime : void 0;
	const sourcePage = readSourcePageMetadata(elements[APP_SOURCE_PAGE_KEY]);
	return {
		artifactCompatibility,
		...cacheEntryReuseProof ? { cacheEntryReuseProof } : {},
		...dynamicStaleTimeSeconds === void 0 ? {} : { dynamicStaleTimeSeconds },
		interception,
		interceptionContext: interceptionContext ?? null,
		layoutIds,
		layoutFlags,
		routeId,
		rootLayoutTreePath,
		skippedLayoutIds,
		slotBindings,
		sourcePage
	};
}
var AppElementsWire = {
	keys: {
		artifactCompatibility: APP_ARTIFACT_COMPATIBILITY_KEY,
		cacheEntryReuseProof: APP_CACHE_ENTRY_REUSE_PROOF_KEY,
		dynamicStaleTime: APP_DYNAMIC_STALE_TIME_KEY,
		interception: APP_INTERCEPTION_KEY,
		interceptionContext: APP_INTERCEPTION_CONTEXT_KEY,
		layoutIds: APP_LAYOUT_IDS_KEY,
		layoutFlags: APP_LAYOUT_FLAGS_KEY,
		renderObservation: APP_RENDER_OBSERVATION_KEY,
		rootLayout: APP_ROOT_LAYOUT_KEY,
		route: APP_ROUTE_KEY,
		skippedLayoutIds: APP_SKIPPED_LAYOUT_IDS_KEY,
		slotBindings: APP_SLOT_BINDINGS_KEY,
		sourcePage: APP_SOURCE_PAGE_KEY
	},
	unmatchedSlotValue: APP_UNMATCHED_SLOT_WIRE_VALUE,
	createMetadataEntries: createAppElementsWireMetadataEntries,
	decode: normalizeAppElements,
	encodeCacheKey: createAppPayloadCacheKey,
	encodeLayoutId: createAppPayloadLayoutId,
	encodeOutgoingPayload: buildOutgoingAppPayload,
	encodePageId: createAppPayloadPageId,
	encodeRouteId: createAppPayloadRouteId,
	encodeSlotId: createAppPayloadSlotId,
	encodeTemplateId: createAppPayloadTemplateId,
	isSlotId: isAppElementsWireSlotId,
	parseElementKey: parseAppElementsWireElementKey,
	readMetadata: readAppElementsMetadata,
	withLayoutFlags
};
//#endregion
//#region ../../../frontend/node_modules/vinext/dist/server/app-mounted-slots-header.js
/**
* Normalize the `x-vinext-mounted-slots` header for request handling and cache keying.
*
* The browser sends mounted slot ids as a space-separated list in the order slots were
* rendered, which changes across navigations. This normalizes to a canonical form
* (sorted, deduplicated) so equivalent slot sets map to the same RSC cache entry.
*
* Security: the value flows into the ISR RSC cache key (`appIsrRscKey`). Without
* bounds, an attacker who controls this header can fabricate unbounded distinct
* values to fan out KV writes (per-write billing) or fragment the cache. See
* `SECURITY-AUDIT-2026-05.md` finding F-PROD-1. The legitimate wire format is a
* whitespace-separated list of `slot:<name>:<treePath>` tokens (see
* `createAppPayloadSlotId` in `app-elements-wire.ts`); anything else is rejected.
*
* Bounds applied:
*   - Total raw header value capped at MAX_RAW_HEADER_LENGTH bytes (returns null
*     if exceeded so the request is treated as if the header were absent).
*   - Each token capped at MAX_TOKEN_LENGTH bytes.
*   - Token count capped at MAX_SLOT_TOKENS (extras are dropped after sort + dedup).
*   - Each token must match the legitimate slot-id shape, as defined by the
*     AppElements wire codec (`AppElementsWire.isSlotId`). Wire-format details
*     are intentionally kept inside the codec so this module does not duplicate
*     them. Malformed tokens are dropped silently rather than rejecting the
*     whole request — this matches the prior forgiving behavior for browsers
*     that send legitimate but stale formats during rolling deploys.
*
* Consumed by:
*   - app-rsc-request-normalization (request lifecycle, reads incoming header)
*   - app-elements (outgoing x-vinext-mounted-slots construction)
*   - isr-cache (RSC cache key generation)
*/
/** Hard cap on the raw header value byte length. Real values are <1 KB. */
var MAX_RAW_HEADER_LENGTH = 4096;
/** Hard cap on a single slot token byte length. */
var MAX_TOKEN_LENGTH = 256;
/** Hard cap on the number of slot tokens kept after normalization. */
var MAX_SLOT_TOKENS = 16;
/**
* Validate a single mounted-slot token. Shape validation is delegated to the
* AppElements wire codec so the wire format definition lives in exactly one
* place. This module only enforces the additional security cap on token byte
* length to bound cache-key cardinality.
*/
function isValidSlotToken(token) {
	if (token.length === 0 || token.length > MAX_TOKEN_LENGTH) return false;
	return AppElementsWire.isSlotId(token);
}
function normalizeMountedSlotsHeader(raw) {
	if (!raw) return null;
	if (raw.length > MAX_RAW_HEADER_LENGTH) return null;
	const validTokens = raw.split(/\s+/).filter((token) => token && isValidSlotToken(token));
	if (validTokens.length === 0) return null;
	return Array.from(new Set(validTokens)).sort().slice(0, MAX_SLOT_TOKENS).join(" ") || null;
}
//#endregion
//#region ../../../frontend/node_modules/vinext/dist/server/app-elements.js
var APP_PREFETCH_LOADING_SHELL_MARKER_KEY = "__prefetchLoadingShell";
function getMountedSlotIds(elements) {
	return Object.keys(elements).filter((key) => {
		const value = elements[key];
		const parsed = AppElementsWire.parseElementKey(key);
		return parsed?.kind === "slot" && parsed.name !== "children" && value !== null && value !== void 0 && value !== UNMATCHED_SLOT;
	}).sort();
}
function getMountedSlotIdsHeader(elements) {
	return normalizeMountedSlotsHeader(getMountedSlotIds(elements).join(" "));
}
function resolveVisitedResponseInterceptionContext(requestInterceptionContext, payloadInterceptionContext) {
	return payloadInterceptionContext ?? requestInterceptionContext;
}
//#endregion
export { APP_ARTIFACT_COMPATIBILITY_KEY, APP_CACHE_ENTRY_REUSE_PROOF_KEY, APP_DYNAMIC_STALE_TIME_KEY, APP_INTERCEPTION_CONTEXT_KEY, APP_INTERCEPTION_KEY, APP_LAYOUT_FLAGS_KEY, APP_LAYOUT_IDS_KEY, APP_PREFETCH_LOADING_SHELL_MARKER_KEY, APP_RENDER_OBSERVATION_KEY, APP_ROOT_LAYOUT_KEY, APP_ROUTE_KEY, APP_SKIPPED_LAYOUT_IDS_KEY, APP_SLOT_BINDINGS_KEY, APP_SOURCE_PAGE_KEY, APP_STATIC_SIBLINGS_KEY, APP_UNMATCHED_SLOT_WIRE_VALUE, AppElementsWire, UNMATCHED_SLOT, buildOutgoingAppPayload, compareAppElementsSlotIds, getMountedSlotIds, getMountedSlotIdsHeader, isAppElementsRecord, normalizeAppElements, normalizeAppElementsSlotBindings, readAppElementsMetadata, resolveVisitedResponseInterceptionContext, withLayoutFlags };

//# sourceMappingURL=app-elements-CgPbKKcH.js.map