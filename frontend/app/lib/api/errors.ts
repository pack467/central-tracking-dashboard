/**
 * Central Tracking Dashboard - API Error Definitions & Type Guards
 *
 * Standarisasi error HTTP untuk integrasi NestJS backend:
 * - Status code parsing (401, 403, 404, 422, 500, etc.)
 * - Type guard `isApiError`
 * - Abort & Timeout classification
 */

export interface ApiErrorInit {
  message: string;
  status: number;
  code?: string;
  details?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(init: ApiErrorInit) {
    super(init.message);
    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code;
    this.details = init.details;

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isValidationError(): boolean {
    return this.status === 400 || this.status === 422;
  }

  get isTimeout(): boolean {
    return this.status === 408 || this.code === "TIMEOUT";
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }
}

/**
 * Type guard for ApiError
 */
export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError || (typeof err === "object" && err !== null && (err as { name?: string }).name === "ApiError");
}

export function isAbortError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === "AbortError") return true;
  if (typeof err === "object" && err !== null && (err as { name?: string }).name === "AbortError") return true;
  return false;
}
