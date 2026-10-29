/**
 * Central Tracking Dashboard - Standard NestJS API Types
 *
 * Sesuai dengan format response standar NestJS Interceptor dan Global Filter:
 * - Single item: { data: T }
 * - Paginated list: { data: T[], meta: PaginationMeta }
 * - Error: { statusCode: number, message: string | string[], error?: string }
 */

export interface ApiResponse<T> {
  data: T;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

export interface ApiPaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
  timestamp?: string;
  path?: string;
}

export interface ApiQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  order?: "asc" | "desc";
  clientId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  project?: string;
  severity?: string;
  [key: string]: string | number | boolean | undefined;
}
