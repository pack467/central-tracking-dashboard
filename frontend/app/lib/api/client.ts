/**
 * Central Tracking Dashboard - Centralized API Client (NestJS Ready)
 *
 * Mengelola komunikasi HTTP:
 * - Base URL dari NEXT_PUBLIC_API_URL via getApiConfig()
 * - JSON default & Headers
 * - AbortSignal & Timeout (AbortController)
 * - Format error seragam (ApiError)
 * - Callback onUnauthorized untuk status 401
 * - Helper buildQueryString aman
 */

import { getApiConfig } from "@/app/lib/config";
import { ApiError } from "./errors";

export interface RequestOptions extends Omit<RequestInit, "signal"> {
  params?: Record<string, string | number | boolean | undefined | null>;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export type AuthTokenProvider = () => string | null;
export type UnauthorizedHandler = () => void;

export function buildQueryString(params?: Record<string, string | number | boolean | undefined | null>): string {
  if (!params) return "";
  const query = new URLSearchParams();

  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== "") {
      query.append(key, String(val));
    }
  }

  const str = query.toString();
  return str ? `?${str}` : "";
}

export class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private tokenProvider: AuthTokenProvider | null = null;
  private onUnauthorized: UnauthorizedHandler | null = null;
  private csrfProvider: (() => string | null) | null = null;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl ?? getApiConfig().apiUrl).replace(/\/+$/, "");
  }

  setToken(token: string | null): void {
    this.token = token;
  }

  setAuthTokenProvider(provider: AuthTokenProvider): void {
    this.tokenProvider = provider;
  }

  /** The session's CSRF token (backend login). Sent as X-CSRF-Token on every write. */
  setCsrfTokenProvider(provider: () => string | null): void {
    this.csrfProvider = provider;
  }

  setOnUnauthorized(handler: UnauthorizedHandler): void {
    this.onUnauthorized = handler;
  }

  private getAuthHeader(): string | null {
    if (this.tokenProvider) {
      const t = this.tokenProvider();
      if (t) return `Bearer ${t}`;
    }
    if (this.token) {
      return `Bearer ${this.token}`;
    }
    return null;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { params, timeoutMs, signal: callerSignal, headers: customHeaders, ...fetchOptions } = options;
    const config = getApiConfig();
    const effectiveTimeoutMs = timeoutMs ?? config.apiTimeoutMs;

    const queryString = buildQueryString(params);
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const url = `${this.baseUrl}${cleanPath}${queryString}`;

    const headers = new Headers(customHeaders);
    if (!headers.has("Content-Type") && !(fetchOptions.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
    headers.set("Accept", "application/json");

    // writes carry the session's CSRF token; the session itself is the httpOnly cookie
    const csrf = this.csrfProvider?.();
    if (csrf && !/^(GET|HEAD|OPTIONS)$/i.test(fetchOptions.method ?? "GET") && !headers.has("X-CSRF-Token")) headers.set("X-CSRF-Token", csrf);
    const auth = this.getAuthHeader();
    if (auth && !headers.has("Authorization")) {
      headers.set("Authorization", auth);
    }

    // Set up AbortController with timeout and caller signal coordination
    const controller = new AbortController();
    let timeoutTriggered = false;

    const timeoutId = setTimeout(() => {
      timeoutTriggered = true;
      controller.abort();
    }, effectiveTimeoutMs);

    if (callerSignal) {
      if (callerSignal.aborted) {
        clearTimeout(timeoutId);
        controller.abort();
      } else {
        callerSignal.addEventListener("abort", () => {
          clearTimeout(timeoutId);
          controller.abort();
        }, { once: true });
      }
    }

    try {
      const response = await fetch(url, {
        credentials: "include",
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle 401 Unauthorized globally
      if (response.status === 401 && this.onUnauthorized) {
        this.onUnauthorized();
      }

      if (!response.ok) {
        let errorBody: Record<string, unknown> = {};
        try {
          errorBody = (await response.json()) as Record<string, unknown>;
        } catch {
          errorBody = { message: response.statusText };
        }

        const msgVal = errorBody.message;
        const message = Array.isArray(msgVal)
          ? msgVal.join(", ")
          : typeof msgVal === "string"
          ? msgVal
          : typeof errorBody.error === "string"
          ? errorBody.error
          : `HTTP ${response.status} Request Failed`;

        throw new ApiError({
          status: response.status,
          message,
          code:
            typeof errorBody.error === "string"
              ? errorBody.error
              : typeof errorBody.code === "string"
              ? errorBody.code
              : undefined,
          details: errorBody,
        });
      }

      if (response.status === 204) {
        return undefined as unknown as T;
      }

      return (await response.json()) as T;
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      if (err instanceof ApiError) {
        throw err;
      }

      if (timeoutTriggered) {
        throw new ApiError({
          status: 408,
          message: `Request timeout setelah ${effectiveTimeoutMs}ms. Backend tidak merespons.`,
          code: "TIMEOUT",
          details: { timeoutMs: effectiveTimeoutMs },
        });
      }

      if (callerSignal?.aborted) {
        // Normal client-side abort (unmount / param change)
        const abortErr = new Error("Request dibatalkan oleh klien");
        abortErr.name = "AbortError";
        throw abortErr;
      }

      const errMsg = err instanceof Error ? err.message : "Network error / Gagal terhubung ke server";
      throw new ApiError({
        status: 0,
        message: errMsg,
        code: "NETWORK_ERROR",
        details: err,
      });
    }
  }

  get<T>(path: string, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
    return this.request<T>(path, { ...options, method: "GET" });
  }

  post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(path: string, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
    return this.request<T>(path, { ...options, method: "DELETE" });
  }
}

export const apiClient = new ApiClient();
