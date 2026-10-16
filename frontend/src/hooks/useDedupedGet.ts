// useDedupedGet - hook cho phep goi GET API voi tu dong:
//   1. Dedup in-flight requests (cung URL+params = 1 request)
//   2. Cancel khi component unmount
//   3. Stale time: khong refetch neu data con fresh
//   4. Refetch on demand
//
// Khong phu thuoc TanStack Query. Dung axios + AbortController.

import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/lib/axios";

const inflightGets = new Map<string, Promise<unknown>>();

const buildKey = (url: string, params?: Record<string, unknown>) =>
  `${url}|${JSON.stringify(params || {})}`;

interface UseDedupedGetOptions<T> {
  url: string;
  params?: Record<string, unknown>;
  enabled?: boolean;
  staleTimeMs?: number; // mac dinh 30s
  onSuccess?: (data: T) => void;
  onError?: (err: unknown) => void;
}

interface UseDedupedGetResult<T> {
  data: T | null;
  loading: boolean;
  error: unknown;
  refetch: () => Promise<void>;
}

const cache = new Map<string, { data: unknown; at: number }>();

export function useDedupedGet<T = unknown>({
  url,
  params,
  enabled = true,
  staleTimeMs = 30_000,
  onSuccess,
  onError,
}: UseDedupedGetOptions<T>): UseDedupedGetResult<T> {
  const key = buildKey(url, params);
  const [data, setData] = useState<T | null>(
    () => (cache.get(key)?.data as T) || null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    // Cancel request cu neu co
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      // Kiem tra stale time
      const cached = cache.get(key);
      if (cached && Date.now() - cached.at < staleTimeMs) {
        setData(cached.data as T);
        setLoading(false);
        onSuccess?.(cached.data as T);
        return;
      }

      // In-flight dedup
      let promise = inflightGets.get(key) as Promise<{ data: T }> | undefined;
      if (!promise) {
        promise = api.get<T>(url, {
          params,
          signal: controller.signal,
        });
        inflightGets.set(key, promise);
        // Cleanup khi xong
        promise.finally(() => inflightGets.delete(key));
      }
      const res = await promise;
      cache.set(key, { data: res.data, at: Date.now() });
      setData(res.data);
      onSuccess?.(res.data);
    } catch (err: any) {
      if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") {
        // Bo qua - bi huy
        return;
      }
      setError(err);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  }, [key, staleTimeMs, url, JSON.stringify(params || {})]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!enabled) return;
    fetchData();
    return () => {
      abortRef.current?.abort();
    };
  }, [enabled, fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/** Xoa cache cu (vi du: sau khi POST/PUT/DELETE thanh cong) */
export function invalidateGetCache(urlPattern?: string | RegExp) {
  if (!urlPattern) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (typeof urlPattern === "string" ? key.startsWith(urlPattern) : urlPattern.test(key)) {
      cache.delete(key);
    }
  }
}
