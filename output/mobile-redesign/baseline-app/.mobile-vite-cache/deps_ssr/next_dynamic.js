import { r as __toESM } from "./chunk-CYJPkc-J.js";
import { t as require_react } from "./react.js";
import { t as require_react_dom } from "./react-dom.js";
import { n as appendAssetDeploymentIdQuery } from "./deployment-id-Ctqw21wm.js";
import { getPagesClientAssets } from "vinext/server/pages-client-assets";
//#region ../../../frontend/node_modules/vinext/dist/shims/script-nonce-context.js
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var ScriptNonceContext = typeof import_react.createContext === "function" ? import_react.createContext(void 0) : null;
function createScriptNonceHook(context) {
	if (!context || typeof import_react.useContext !== "function") return function useScriptNonceFromContext() {};
	return function useScriptNonceFromContext() {
		return import_react.useContext(context);
	};
}
var useScriptNonceFromContext = createScriptNonceHook(ScriptNonceContext);
function useScriptNonce() {
	return useScriptNonceFromContext();
}
//#endregion
//#region ../../../frontend/node_modules/vinext/dist/shims/dynamic-preload-chunks.js
var import_react_dom = /* @__PURE__ */ __toESM(require_react_dom(), 1);
/**
* Preload links for rendered next/dynamic() boundaries.
*
* This MUST be a "use client" component. next/dynamic() can be called from
* either a Server Component or a Client Component. If this rendered in the
* environment of the call site, a Server-Component call site would render it in
* the RSC environment, where the script-nonce React context is unavailable
* (createContext is not callable in react-server), so emitted preload links
* would drop the request CSP nonce — a CSP violation under
* `script-src 'nonce-…' 'strict-dynamic'`.
*
* Marking it "use client" forces it into the SSR pass (where vinext installs
* the ScriptNonceProvider via withScriptNonce()), so the nonce is available
* regardless of whether the dynamic() call site is a Server or Client
* Component. This mirrors Next.js's <PreloadChunks> ('use client') and vinext's
* own next/script shim.
*
* Deliberate divergence from Next.js: for CSS we render
* `<link rel="stylesheet">` WITHOUT `as="style"`. Next.js emits `as="style"`,
* but per the HTML spec `as` is only meaningful on `rel="preload"`/`modulepreload`
* — on `rel="stylesheet"` it is ignored by browsers and is semantically wrong.
* React keys stylesheet resources on href + precedence, not `as`, so omitting it
* is safe. This is an intentional, documented difference, not a parity bug.
*/
function dynamicPreloadHref(file) {
	if (file.startsWith("/") || file.startsWith("http://") || file.startsWith("https://") || file.startsWith("//")) return file;
	return `/${file}`;
}
function resolveDynamicPreloadFiles(moduleIds) {
	if (!moduleIds || moduleIds.length === 0) return [];
	const preloadMap = getPagesClientAssets().dynamicPreloads;
	if (!preloadMap) return [];
	const files = [];
	const seen = /* @__PURE__ */ new Set();
	for (const moduleId of moduleIds) for (const file of preloadMap[moduleId] ?? []) {
		if (seen.has(file)) continue;
		seen.add(file);
		files.push(file);
	}
	return files;
}
function DynamicPreloadChunks(props) {
	const nonce = useScriptNonce();
	if (typeof window !== "undefined") return null;
	const files = resolveDynamicPreloadFiles(props.moduleIds);
	if (files.length === 0) return null;
	const stylesheets = [];
	for (const file of files) {
		const assetHref = dynamicPreloadHref(file);
		if (assetHref.endsWith(".css")) {
			const href = appendAssetDeploymentIdQuery(assetHref);
			stylesheets.push(import_react.createElement("link", {
				key: href,
				rel: "stylesheet",
				href,
				nonce,
				precedence: "dynamic"
			}));
			continue;
		}
		if (assetHref.endsWith(".js") && typeof import_react_dom.preload === "function") {
			const preloadOptions = {
				as: "script",
				fetchPriority: "low",
				nonce
			};
			import_react_dom.preload(assetHref, preloadOptions);
		}
	}
	return stylesheets.length > 0 ? import_react.createElement(import_react.Fragment, null, ...stylesheets) : null;
}
//#endregion
//#region ../../../frontend/node_modules/vinext/dist/shims/dynamic.js
/**
* next/dynamic shim
*
* SSR-safe dynamic imports. On the server, uses React.lazy + Suspense so that
* renderToReadableStream suspends until the dynamically-imported component is
* available. On the client, also uses React.lazy for code splitting.
*
* Works in RSC, SSR, and client environments:
* - RSC: Uses React.lazy + Suspense (available in React 19.x react-server).
*   Falls back to async component pattern if a future React version
*   strips lazy from react-server.
* - SSR: React.lazy + Suspense (renderToReadableStream suspends)
* - Client: React.lazy + Suspense (standard code splitting)
*
* Supports:
* - dynamic(import('./Component'))
* - dynamic(() => import('./Component'))
* - dynamic({ loader })
* - dynamic(() => import('./Component'), { loading: () => <Spinner /> })
* - dynamic(() => import('./Component'), { ssr: false })
*/
var noopRetry = () => {};
function createDynamicLoadingProps(overrides = {}) {
	return {
		error: null,
		isLoading: true,
		pastDelay: true,
		retry: noopRetry,
		timedOut: false,
		...overrides
	};
}
function hasDefaultExport(mod) {
	return (typeof mod === "object" || typeof mod === "function") && mod !== null && "default" in mod;
}
function normalizeLoader(loader) {
	if (typeof loader === "function") return loader;
	return () => loader;
}
function normalizeDynamicOptions(dynamicInput, options) {
	let normalizedOptions;
	if (dynamicInput instanceof Promise || typeof dynamicInput === "function") normalizedOptions = { loader: normalizeLoader(dynamicInput) };
	else normalizedOptions = dynamicInput;
	return {
		...normalizedOptions,
		...options
	};
}
function createLazyComponent(loader) {
	return import_react.lazy(async () => {
		const mod = await loader();
		if (hasDefaultExport(mod)) return mod;
		return { default: mod };
	});
}
function useRetryableLazyComponent(loader, initialLazyComponent) {
	const [LazyComponent, setLazyComponent] = import_react.useState(() => initialLazyComponent);
	const [retryKey, setRetryKey] = import_react.useState(0);
	return {
		LazyComponent,
		retry: import_react.useCallback(() => {
			setLazyComponent(() => createLazyComponent(loader));
			setRetryKey((key) => key + 1);
		}, [loader]),
		retryKey
	};
}
function createElementWithProps(Component, props) {
	return import_react.createElement(Component, props);
}
/**
* Lightweight error boundary that renders the loading component with the error
* when a dynamic() loader rejects. Without this, loader failures would propagate
* uncaught through React's rendering — this preserves the Next.js behavior where
* the `loading` component can display errors.
*
* Lazily created because React.Component is not available in the RSC environment
* (server components use a slimmed-down React that doesn't include class components).
*/
var DynamicErrorBoundary;
function getDynamicErrorBoundary() {
	if (DynamicErrorBoundary) return DynamicErrorBoundary;
	if (!import_react.Component) return null;
	DynamicErrorBoundary = class extends import_react.Component {
		constructor(props) {
			super(props);
			this.state = {
				error: null,
				resetKey: props.resetKey
			};
		}
		static getDerivedStateFromProps(props, state) {
			if (props.resetKey !== state.resetKey) return {
				error: null,
				resetKey: props.resetKey
			};
			return null;
		}
		static getDerivedStateFromError(error) {
			return { error: error instanceof Error ? error : new Error(String(error)) };
		}
		render() {
			if (this.state.error) return import_react.createElement(this.props.fallback, createDynamicLoadingProps({
				isLoading: false,
				error: this.state.error,
				retry: this.props.retry
			}));
			return this.props.children;
		}
	};
	return DynamicErrorBoundary;
}
var isServer = typeof window === "undefined";
var preloadQueue = [];
/**
* Wait for all pending dynamic() preloads to resolve, then clear the queue.
* Called by the Pages Router SSR handler before rendering.
* No-op for the App Router path which uses React.lazy + Suspense.
*/
function flushPreloads() {
	const pending = preloadQueue.splice(0);
	return Promise.all(pending);
}
function dynamic(dynamicInput, options) {
	const normalizedOptions = normalizeDynamicOptions(dynamicInput, options);
	const { loader: dynamicLoader, loadableGenerated, loading: LoadingComponent, ssr = true } = normalizedOptions;
	if (dynamicLoader && typeof dynamicLoader === "object" && !(dynamicLoader instanceof Promise)) throw new Error("next/dynamic loader maps are not supported by vinext");
	const loader = dynamicLoader ? normalizeLoader(dynamicLoader) : () => Promise.resolve(() => null);
	const generatedModules = loadableGenerated?.modules;
	const optionModules = normalizedOptions.modules;
	const configuredModules = generatedModules ?? optionModules;
	const preloadModuleIds = typeof configuredModules === "function" ? Object.keys(configuredModules()) : configuredModules;
	if (!ssr) {
		if (isServer) {
			const SSRFalse = (_props) => LoadingComponent ? import_react.createElement(LoadingComponent, createDynamicLoadingProps()) : null;
			SSRFalse.displayName = "DynamicSSRFalse";
			return SSRFalse;
		}
		const InitialLazyComponent = createLazyComponent(loader);
		const ClientSSRFalse = (props) => {
			const [mounted, setMounted] = import_react.useState(false);
			const { LazyComponent, retry, retryKey } = useRetryableLazyComponent(loader, InitialLazyComponent);
			import_react.useEffect(() => setMounted(true), []);
			if (!mounted) return LoadingComponent ? import_react.createElement(LoadingComponent, createDynamicLoadingProps({ retry })) : null;
			const fallback = LoadingComponent ? import_react.createElement(LoadingComponent, createDynamicLoadingProps({ retry })) : null;
			const lazyElement = createElementWithProps(LazyComponent, props);
			let content = lazyElement;
			if (LoadingComponent) {
				const ErrorBoundary = getDynamicErrorBoundary();
				if (ErrorBoundary) content = import_react.createElement(ErrorBoundary, {
					fallback: LoadingComponent,
					retry,
					resetKey: retryKey
				}, lazyElement);
			}
			return import_react.createElement(import_react.Suspense, { fallback }, content);
		};
		ClientSSRFalse.displayName = "DynamicClientSSRFalse";
		return ClientSSRFalse;
	}
	if (isServer) {
		if (typeof import_react.lazy !== "function") {
			const AsyncServerDynamic = async (props) => {
				const mod = await loader();
				return createElementWithProps("default" in mod ? mod.default : mod, props);
			};
			AsyncServerDynamic.displayName = "DynamicAsyncServer";
			return AsyncServerDynamic;
		}
		const LazyServer = createLazyComponent(loader);
		const ServerDynamic = (props) => {
			const fallback = LoadingComponent ? import_react.createElement(LoadingComponent, createDynamicLoadingProps()) : null;
			const lazyElement = createElementWithProps(LazyServer, props);
			let content = lazyElement;
			if (LoadingComponent) {
				const ErrorBoundary = getDynamicErrorBoundary();
				if (ErrorBoundary) content = import_react.createElement(ErrorBoundary, {
					fallback: LoadingComponent,
					retry: noopRetry,
					resetKey: 0
				}, lazyElement);
			}
			return import_react.createElement(import_react.Fragment, null, import_react.createElement(DynamicPreloadChunks, { moduleIds: preloadModuleIds }), import_react.createElement(import_react.Suspense, { fallback }, content));
		};
		ServerDynamic.displayName = "DynamicServer";
		return ServerDynamic;
	}
	const InitialLazyComponent = createLazyComponent(loader);
	const ClientDynamic = (props) => {
		const { LazyComponent, retry, retryKey } = useRetryableLazyComponent(loader, InitialLazyComponent);
		const fallback = LoadingComponent ? import_react.createElement(LoadingComponent, createDynamicLoadingProps({ retry })) : null;
		const lazyElement = createElementWithProps(LazyComponent, props);
		let content = lazyElement;
		if (LoadingComponent) {
			const ErrorBoundary = getDynamicErrorBoundary();
			if (ErrorBoundary) content = import_react.createElement(ErrorBoundary, {
				fallback: LoadingComponent,
				retry,
				resetKey: retryKey
			}, lazyElement);
		}
		return import_react.createElement(import_react.Suspense, { fallback }, content);
	};
	ClientDynamic.displayName = "DynamicClient";
	return ClientDynamic;
}
function noSSR(LoadableInitializer, loadableOptions) {
	delete loadableOptions.webpack;
	delete loadableOptions.modules;
	if (!isServer) return LoadableInitializer(loadableOptions);
	const Loading = loadableOptions.loading;
	const NoSSR = () => import_react.createElement(Loading, {
		error: null,
		isLoading: true,
		pastDelay: false,
		timedOut: false
	});
	NoSSR.displayName = "NoSSR";
	return NoSSR;
}
//#endregion
export { dynamic as default, flushPreloads, noSSR };

//# sourceMappingURL=next_dynamic.js.map