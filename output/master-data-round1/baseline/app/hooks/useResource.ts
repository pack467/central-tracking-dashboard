"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, isAbortError } from "@/app/lib/api/errors";

// In-memory cache & in-flight promise tracker for deduplication & StrictMode safety
const resourceCache = new Map<string, { data: unknown; timestamp: number }>();
const inFlightRequests = new Map<string, Promise<unknown>>();

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

export function useResource<T>(
  key: string,
  fetcher: (signal: AbortSignal) => Promise<T>,
  options: ResourceOptions<T> = {}
): ResourceResult<T> {
  const {
    deps = [],
    enabled = true,
    timeoutMs,
    initialData = null,
    staleWhileRevalidate = true,
    onSuccess,
    onError,
  } = options;

  // Check cache for initial hydration
  const cached = resourceCache.get(key);
  const startData = (cached ? (cached.data as T) : initialData) ?? null;

  const [data, setData] = useState<T | null>(startData);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    startData ? "success" : enabled ? "loading" : "idle"
  );
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [isStale, setIsStale] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const activeKeyRef = useRef(key);
  const depsKey = JSON.stringify(deps);

  useEffect(() => {
    activeKeyRef.current = key;
  }, [key]);

  const executeFetch = useCallback(
    async (isManualRefetch = false) => {
      if (!enabled) return;

      // Abort previous in-flight request for this component
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      // SWR strategy: If previous data exists, keep it visible and mark isStale
      if (data !== null && staleWhileRevalidate) {
        setIsStale(true);
      } else {
        setStatus("loading");
      }
      setError(null);

      try {
        let fetchPromise = inFlightRequests.get(key) as Promise<T> | undefined;

        if (!fetchPromise || isManualRefetch) {
          fetchPromise = fetcher(controller.signal);
          inFlightRequests.set(key, fetchPromise);
        }

        const result = await fetchPromise;

        // Ensure key hasn't changed while awaiting
        if (activeKeyRef.current === key) {
          resourceCache.set(key, { data: result, timestamp: Date.now() });
          setData(result);
          setStatus("success");
          setIsStale(false);
          setError(null);
          onSuccess?.(result);
        }
      } catch (err: unknown) {
        if (isAbortError(err)) {
          // Normal abort on unmount/parameter change, do not update error state
          return;
        }

        if (activeKeyRef.current === key) {
          const formattedError =
            err instanceof ApiError
              ? err
              : err instanceof Error
              ? err
              : new Error("Gagal mengambil data dari server");

          setError(formattedError);
          setStatus("error");
          setIsStale(false);
          onError?.(formattedError);
        }
      } finally {
        inFlightRequests.delete(key);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, enabled, staleWhileRevalidate, depsKey]
  );

  useEffect(() => {
    executeFetch();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [executeFetch]);

  const refetch = useCallback(async () => {
    await executeFetch(true);
  }, [executeFetch]);

  const isLoading = status === "loading" && !data;
  const isEmpty = status === "success" && checkIfEmpty(data);
  const isTimeout =
    status === "error" &&
    error instanceof ApiError &&
    (error.isTimeout || error.status === 408);

  return {
    data,
    status,
    error,
    isLoading,
    isStale,
    isEmpty,
    isTimeout,
    refetch,
    setData,
  };
}
