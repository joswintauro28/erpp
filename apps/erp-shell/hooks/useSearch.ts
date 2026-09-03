"use client";

import { useState, useMemo, useCallback } from "react";

interface UseSearchOptions<T> {
  /** Fields to search across. If not provided, uses JSON.stringify on the entire object */
  keys?: (keyof T | string)[];
  /** Debounce delay in ms. Default: 0 (no debounce) */
  debounceMs?: number;
  /** Additional filter function applied after text search */
  filterFn?: (item: T, filters: Record<string, string>) => boolean;
}

interface UseSearchReturn<T> {
  search: string;
  setSearch: (value: string) => void;
  filters: Record<string, string>;
  setFilter: (key: string, value: string) => void;
  clearFilters: () => void;
  filtered: T[];
  totalCount: number;
  resultCount: number;
}

/**
 * Search hook that filters items by text across specified fields.
 *
 * @example
 * ```tsx
 * const { search, setSearch, filtered } = useSearch(leads, {
 *   keys: ["name", "company", "status"],
 * });
 * ```
 */
export function useSearch<T>(
  items: T[],
  options: UseSearchOptions<T> = {}
): UseSearchReturn<T> {
  const { keys, filterFn } = options;
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});

  const matchesSearch = useCallback(
    (item: T, query: string): boolean => {
      if (!query) return true;
      const lower = query.toLowerCase();
      if (keys && keys.length > 0) {
        return keys.some((key) => {
          const value = (item as Record<string, unknown>)[key as string];
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(lower);
        });
      }
      return JSON.stringify(item).toLowerCase().includes(lower);
    },
    [keys]
  );

  const filtered = useMemo(() => {
    let result = items;
    if (search) {
      result = result.filter((item) => matchesSearch(item, search));
    }
    if (filterFn) {
      result = result.filter((item) => filterFn(item, filters));
    }
    return result;
  }, [items, search, filters, matchesSearch, filterFn]);

  const setFilter = useCallback((key: string, value: string) => {
    setFilters((prev) => {
      if (!value) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: value };
    });
  }, []);

  const clearFilters = useCallback(() => {
    setSearch("");
    setFilters({});
  }, []);

  return {
    search,
    setSearch,
    filters,
    setFilter,
    clearFilters,
    filtered,
    totalCount: items.length,
    resultCount: filtered.length,
  };
}
