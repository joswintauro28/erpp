"use client";

import { useState, useMemo, useCallback } from "react";

interface UsePaginationOptions {
  /** Default page size. Default: 25 */
  pageSize?: number;
  /** Available page sizes for the user to choose from */
  pageSizeOptions?: number[];
}

interface UsePaginationReturn<T> {
  page: number;
  pageSize: number;
  setPageSize: (size: number) => void;
  setPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  goToFirst: () => void;
  goToLast: () => void;
  /** The sliced items for the current page */
  paginated: T[];
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Pagination hook that manages page state and slices items.
 *
 * @example
 * ```tsx
 * const { page, setPage, paginated, totalPages } = usePagination(filtered, { pageSize: 20 });
 * ```
 */
export function usePagination<T>(
  items: T[],
  options: UsePaginationOptions = {}
): UsePaginationReturn<T> {
  const { pageSize: defaultPageSize = 25 } = options;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeRaw] = useState(defaultPageSize);

  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Clamp page when total pages changes
  const clampedPage = useMemo(() => {
    if (page > totalPages) return totalPages;
    if (page < 1) return 1;
    return page;
  }, [page, totalPages]);

  const paginated = useMemo(() => {
    const start = (clampedPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, clampedPage, pageSize]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeRaw(size);
    setPage(1);
  }, []);

  const nextPage = useCallback(() => {
    setPage((p) => Math.min(p + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPage((p) => Math.max(p - 1, 1));
  }, []);

  const goToFirst = useCallback(() => setPage(1), []);
  const goToLast = useCallback(() => setPage(totalPages), [totalPages]);

  return {
    page: clampedPage,
    pageSize,
    setPageSize,
    setPage,
    nextPage,
    prevPage,
    goToFirst,
    goToLast,
    paginated,
    totalCount,
    totalPages,
    hasNext: clampedPage < totalPages,
    hasPrev: clampedPage > 1,
  };
}
