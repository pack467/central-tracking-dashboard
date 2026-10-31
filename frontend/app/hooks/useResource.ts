"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/app/lib/api/errors";
import { shouldRetry } from "@/app/lib/query-client";
import { useSessionUserId } from "@/app/hooks/useSessionUserId";

/**
 * A screen's data from a service call, on the shared server data cache (TanStack Query). The same contract as before the cache was
 * shared, so the screens did not change:
 *  - The call runs whenever the screen opens, and when `key` or `deps` change; meanwhile the data already known stays on screen and
 *    `isStale` is true (stale-while-revalidate).
 *  - Screens asking with the same key and deps share one request.
 *  - The key also carries the logged-in person, and lib/session-data.ts empties the cache when the person changes, so a screen never shows
 *    the previous person's data.
 *  - A failure is tried again once (network, timeout, 429, 5xx; see lib/query-client.ts), then shown in `error`.
 */
export interface ResourceOptions<T> {
  deps?: unknown[];
  enabled?: boolean;
  timeoutMs?: number;
  initialData?: T | null;
  staleWhileRevalidate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: ApiError | Error) => void;
}

export interface ResourceResult<T> {
  data: T | null;
  status: "idle" | "loading" | "success" | "error";
  error: ApiError | Error | null;
  isLoading: boolean;
  isStale: boolean;
  isEmpty: boolean;
  isTimeout: boolean;
  refetch: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

function checkIfEmpty(val: unknown): boolean {
  if (val === null || val === undefined) return true;
  if (Array.isArray(val)) return val.length === 0;
  if (typeof val === "object") return Object.keys(val as object).length === 0;
  return false;
}

/** The call with a time limit: past `timeoutMs` it is cancelled and fails with a 408 (TIMEOUT). */
async function withTimeout<T>(call: (signal: AbortSignal) => Promise<T>, signal: AbortSignal, timeoutMs?: number): Promise<T> {
  if (!timeoutMs) return call(signal);
  const timer = AbortSignal.timeout(timeoutMs);
  try {
    return await call(AbortSignal.any([signal, timer]));
  } catch (cause) {
    if (timer.aborted && !signal.aborted) throw new ApiError({ status: 408, code: "TIMEOUT", message: `Request timeout setelah ${timeoutMs}ms. Backend tidak merespons.` });
    throw cause;
  }
}

export function useResource<T>(
  key: string,
  fetcher: (signal: AbortSignal) => Promise<T>,
  options: ResourceOptions<T> = {}
): ResourceResult<T> {
  const { deps = [], enabled = true, timeoutMs, initialData = null, staleWhileRevalidate = true, onSuccess, onError } = options;
  const userId = useSessionUserId();
  const client = useQueryClient();
  const depsKey = JSON.stringify(deps);
  const queryKey = useMemo(() => ["resource", userId, key, depsKey] as const, [userId, key, depsKey]);
  // the latest fetcher and callbacks, without making them part of the key
  const latest = useRef({ fetcher, onSuccess, onError });
  useEffect(() => { latest.current = { fetcher, onSuccess, onError }; });

  const query = useQuery<T, Error, T, typeof queryKey>({
    queryKey,
    queryFn: ({ signal }) => withTimeout(latest.current.fetcher, signal, timeoutMs),
    enabled,
    staleTime: 0,
    retry: (failureCount, error) => failureCount < 1 && shouldRetry(failureCount, error),
    placeholderData: (previous) => (staleWhileRevalidate && previous !== undefined ? previous : ((initialData ?? undefined) as typeof previous)),
  });

  useEffect(() => { if (query.isSuccess && !query.isPlaceholderData) latest.current.onSuccess?.(query.data); }, [query.isSuccess, query.isPlaceholderData, query.data]);
  useEffect(() => { if (query.error) latest.current.onError?.(query.error); }, [query.error]);

  const data = query.data ?? null;
  const error = query.error ?? null;
  // as before: data on screen is "success" (isStale says it is being renewed); nothing yet is "loading", or "idle" when not asked for
  const status: ResourceResult<T>["status"] = query.isError ? "error" : data !== null ? "success" : enabled ? "loading" : "idle";

  const refetch = useCallback(async () => { await query.refetch(); }, [query]);
  const setData: React.Dispatch<React.SetStateAction<T | null>> = useCallback((action) => {
    client.setQueryData<T>(queryKey, (previous) => {
      const next = typeof action === "function" ? (action as (value: T | null) => T | null)(previous ?? null) : action;
      return next ?? undefined;
    });
  }, [client, queryKey]);

  const isLoading = status === "loading" && data === null;
  const isStale = query.isFetching && data !== null;
  return {
    data,
    status,
    error,
    isLoading,
    isStale,
    isEmpty: status === "success" && checkIfEmpty(data),
    isTimeout: status === "error" && error instanceof ApiError && (error.isTimeout || error.status === 408),
    refetch,
    setData,
  };
}
