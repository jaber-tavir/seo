/**
 * Shared pagination primitives for repositories.
 * Large datasets are always paginated in SQL - never loaded into the browser.
 */

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  pagination: { total: number; page: number; pageSize: number; totalPages: number };
}

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;

export function normalizePagination(params?: PaginationParams): { page: number; pageSize: number; offset: number; limit: number } {
  const page = Math.max(1, Math.floor(params?.page ?? 1));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(params?.pageSize ?? DEFAULT_PAGE_SIZE)));
  return { page, pageSize, offset: (page - 1) * pageSize, limit: pageSize };
}

export function buildPaginatedResult<T>(rows: T[], total: number, page: number, pageSize: number): PaginatedResult<T> {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    rows,
    total,
    page,
    pageSize,
    totalPages,
    pagination: { total, page, pageSize, totalPages },
  };
}
