/**
 * Central Tracking Dashboard - Environment Configuration & Validation
 *
 * Centralizes configuration for API communication, NestJS readiness,
 * and mock simulation parameters.
 */

export interface AppApiConfig {
  apiUrl: string;
  useMock: boolean;
  mockDelayMin: number;
  mockDelayMax: number;
  apiTimeoutMs: number;
}

function parsePositiveInt(val: string | undefined, fallback: number): number {
  if (!val) return fallback;
  const parsed = parseInt(val, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function getApiConfig(): AppApiConfig {
  const rawApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:3001/api/v1";
  const rawUseMock = process.env.NEXT_PUBLIC_USE_MOCK?.toLowerCase()?.trim();
  
  // By default, use mock adapter until explicitly disabled via NEXT_PUBLIC_USE_MOCK=false
  const useMock = rawUseMock === "false" ? false : true;

  const mockDelayMin = parsePositiveInt(process.env.NEXT_PUBLIC_MOCK_DELAY_MIN, 500);
  const mockDelayMax = parsePositiveInt(process.env.NEXT_PUBLIC_MOCK_DELAY_MAX, 1500);
  const apiTimeoutMs = parsePositiveInt(process.env.NEXT_PUBLIC_API_TIMEOUT_MS, 15000);

  return {
    apiUrl: rawApiUrl,
    useMock,
    mockDelayMin,
    mockDelayMax: Math.max(mockDelayMin, mockDelayMax),
    apiTimeoutMs: Math.max(1000, apiTimeoutMs),
  };
}

export const apiConfig = getApiConfig();

export function isMockMode(): boolean {
  return getApiConfig().useMock;
}

/**
 * The parts of the app that can talk to the real backend, switched one by one so that what is connected can grow without breaking what
 * is not yet. NEXT_PUBLIC_USE_MOCK=false turns every module on (the whole app uses the backend). Otherwise
 * NEXT_PUBLIC_API_MODULES="auth,tickets,people,roles" turns on only the ones listed, and everything else keeps the local mock data.
 */
export type ApiModule = "auth" | "tickets" | "people" | "roles";
export const API_MODULES: readonly ApiModule[] = ["auth", "tickets", "people", "roles"];
export function apiModuleEnabled(module: ApiModule): boolean {
  if (!getApiConfig().useMock) return true;
  const listed = (process.env.NEXT_PUBLIC_API_MODULES || "").split(",").map(value => value.trim().toLowerCase());
  return listed.includes(module);
}

export function getApiUrl(): string {
  return getApiConfig().apiUrl;
}

/**
 * Returns a realistic random delay in milliseconds between configured min and max.
 * In development, special URL search param `?mock=0` or `?mock=instant` forces 0ms for testing.
 */
export function getMockDelay(overrideMs?: number): number {
  if (typeof overrideMs === "number" && overrideMs >= 0) {
    return overrideMs;
  }
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const mockParam = params.get("mock");
    if (mockParam === "0" || mockParam === "instant" || mockParam === "none") {
      return 0;
    }
    if (mockParam === "slow") {
      return 3000;
    }
  }

  const { mockDelayMin, mockDelayMax } = getApiConfig();
  if (mockDelayMin === mockDelayMax) return mockDelayMin;
  return Math.floor(Math.random() * (mockDelayMax - mockDelayMin + 1)) + mockDelayMin;
}
