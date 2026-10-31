import { QueryClient } from "@tanstack/react-query";
import { ApiError, isAbortError } from "@/app/lib/api/errors";

/**
 * Server data (TanStack Query): one cache for everything loaded from the backend, with one rule for asking again.
 *
 * Asked again: a network failure, a timeout, 429 (after the server's Retry-After when the browser may read it), and 5xx, up to three times
 * after 5, 15 and 45 seconds. Never asked again: other 4xx (the same request gets the same answer: 401 already logs out, 403 and 404 do not
 * change), "not connected" (501) and an answer that does not have the agreed shape (it would not change either).
 * The app checks the session itself (lib/auth.tsx), so a query is not fetched again only because the window got the focus.
 */
const RETRY_MS = [5_000, 15_000, 45_000];

export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= RETRY_MS.length || isAbortError(error)) return false;
  if (!(error instanceof ApiError)) return true;
  if (error.code === "INVALID_RESPONSE" || error.status === 501) return false;
  return error.status === 0 || error.status === 408 || error.status === 429 || error.status >= 500;
}

export function retryDelay(attempt: number, error: unknown): number {
  const wait = error instanceof ApiError && error.retryAfterMs ? error.retryAfterMs : RETRY_MS[Math.min(attempt, RETRY_MS.length - 1)];
  // a little jitter so tabs and colleagues behind one address do not ask in step
  return wait + Math.random() * 1000;
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, gcTime: 5 * 60_000, retry: shouldRetry, retryDelay, refetchOnWindowFocus: false, refetchOnReconnect: true },
      mutations: { retry: false },
    },
  });
}

let browserClient: QueryClient | undefined;
/**
 * In the browser, one client for the whole tab, so code outside React (lib/session-data.ts) can drop a person's data at logout. On the
 * server, a new one for every render: a shared one would keep one visitor's data for the next.
 */
export function getQueryClient(): QueryClient {
  if (typeof window === "undefined") return makeQueryClient();
  return (browserClient ??= makeQueryClient());
}
