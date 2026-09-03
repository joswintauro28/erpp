"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/services/api";

interface UseFetchOptions<T> {
  /** If false, fetch is deferred (e.g. waiting for a dependency). Default: true */
  enabled?: boolean;
  /** Transform raw API response before storing */
  transform?: (raw: unknown) => T;
  /** Called on successful fetch */
  onSuccess?: (data: T) => void;
  /** Called on failed fetch */
  onError?: (error: unknown) => void;
  /** Auto-fetch on mount. Default: true */
  immediate?: boolean;
}

interface UseFetchReturn<T> {
  data: T | null;
  loading: boolean;
  error: unknown | null;
  refetch: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

/**
 * Generic data fetching hook that encapsulates the loading/error/data pattern.
 *
 * @example
 * ```tsx
 * const { data: leads, loading, refetch } = useFetch<Lead[]>("/leads");
 * ```
 */
export function useFetch<T>(
  url: string | null,
  options: UseFetchOptions<T> = {}
): UseFetchReturn<T> {
  const {
    enabled = true,
    transform,
    onSuccess,
    onError,
    immediate = true,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate && enabled && url !== null);
  const [error, setError] = useState<unknown | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!url || !enabled) return;
    setLoading(true);
    setError(null);
    try {
      const raw = await api.get<unknown>(url);
      const result = transform ? transform(raw) : (raw as T);
      if (mountedRef.current) {
        setData(result);
        onSuccess?.(result);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err);
        onError?.(err);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [url, enabled, transform, onSuccess, onError]);

  useEffect(() => {
    mountedRef.current = true;
    if (immediate && url && enabled) {
      fetchData();
    }
    return () => {
      mountedRef.current = false;
    };
  }, [url, enabled, immediate, fetchData]);

  return { data, loading, error, refetch: fetchData, setData };
}
