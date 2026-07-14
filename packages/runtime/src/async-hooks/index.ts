/**
 * Elmoorx Runtime — Async Data Hooks
 * ============================================
 * Reactive data fetching with caching, revalidation, and optimistic updates.
 *
 *   const { data, error, loading, mutate } = useFetch<User[]>('/api/users');
 *
 *   // SWR-style
 *   const { data } = useSWR('/api/posts', fetcher, {
 *     refreshInterval: 5000,
 *     revalidateOnFocus: true,
 *   });
 *
 * Bundle impact: ~420 bytes gzipped
 */

import { $state } from "../signals";
import { onMount, onCleanup } from "../lifecycle";

export interface FetchResult<T> {
  data: () => T | undefined;
  error: () => Error | undefined;
  loading: () => boolean;
  // Revalidate (re-fetch). Alias: refetch.
  mutate: () => Promise<void>;
  // Alias for mutate() — re-fetch without changing args.
  refetch: () => Promise<void>;
  // Optimistic update
  optimistic: (newData: T | ((prev: T | undefined) => T)) => void;
}

interface CacheEntry {
  data?: unknown;
  error?: Error;
  timestamp: number;
  promise?: Promise<void>;
}

const cache = new Map<string, CacheEntry>();
// Subscriber registry — when a cache entry is updated (e.g. via
// optimistic()), all subscribers for that URL are notified so they
// can re-read. Previously this was declared but never used.
const subscribers = new Map<string, Set<() => void>>();

function notifySubscribers(url: string): void {
  const subs = subscribers.get(url);
  if (subs) {
    for (const fn of subs) {
      try { fn(); } catch { /* swallow subscriber errors */ }
    }
  }
}

/**
 * useFetch — fetch JSON with reactive state.
 *
 *   const { data, error, loading } = useFetch<User>('/api/user/1');
 */
export function useFetch<T = unknown>(
  url: string | (() => string),
  opts: RequestInit & {
    // Auto-fetch on mount (default: true)
    immediate?: boolean;
    // Refetch interval (ms)
    refreshInterval?: number;
    // Refetch on window focus
    refreshOnFocus?: boolean;
    // Initial data
    initialData?: T;
    // Cache TTL in ms (default: 5000). Set to 0 to disable caching.
    cacheTtl?: number;
  } = {}
): FetchResult<T> {
  const cacheTtl = opts.cacheTtl ?? 5000;
  const data = $state<T | undefined>(opts.initialData);
  const error = $state<Error | undefined>(undefined);
  const loading = $state(false);

  const getUrl = () => (typeof url === "function" ? url() : url);

  const fetchData = async () => {
    const u = getUrl();
    if (!u) return;

    loading.set(true);
    error.set(undefined);

    try {
      // Check cache — respect opts.cacheTtl (was hardcoded to 5000ms).
      const cached = cache.get(u);
      if (cached?.data && (cacheTtl === 0 || Date.now() - cached.timestamp < cacheTtl)) {
        data.set(cached.data as T);
        loading.set(false);
        return;
      }

      const res = await fetch(u, opts);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      cache.set(u, { data: json, timestamp: Date.now() });
      notifySubscribers(u);

      data.set(json as T);
    } catch (err) {
      error.set(err as Error);
    } finally {
      loading.set(false);
    }
  };

  // Initial fetch
  if (opts.immediate !== false) {
    onMount(() => {
      fetchData();
    });
  }

  // Refresh interval
  if (opts.refreshInterval) {
    onMount(() => {
      const id = setInterval(fetchData, opts.refreshInterval);
      onCleanup(() => clearInterval(id));
    });
  }

  // Refresh on focus
  if (opts.refreshOnFocus) {
    onMount(() => {
      const handler = () => fetchData();
      window.addEventListener("focus", handler);
      onCleanup(() => window.removeEventListener("focus", handler));
    });
  }

  return {
    data,
    error,
    loading,
    mutate: fetchData,
    refetch: fetchData, // alias for clarity (mutate is a misleading name for re-fetch)
    optimistic: (newData) => {
      const prev = data();
      const next = typeof newData === "function" ? (newData as (p: T | undefined) => T)(prev) : newData;
      data.set(next);
      // Update cache + notify subscribers
      const u = getUrl();
      cache.set(u, { data: next, timestamp: Date.now() });
      notifySubscribers(u);
    },
  };
}

export interface SWRConfig {
  fetcher?: (url: string) => Promise<unknown>;
  refreshInterval?: number;
  refreshOnFocus?: boolean;
  refreshOnReconnect?: boolean;
  dedupingInterval?: number;
  initialData?: unknown;
  onError?: (err: Error) => void;
  onSuccess?: (data: unknown) => void;
}

export interface SWRResult<T> {
  data: () => T | undefined;
  error: () => Error | undefined;
  loading: () => boolean;
  isValidating: () => boolean;
  mutate: (newData?: T, revalidate?: boolean) => Promise<void>;
}

/**
 * useSWR — stale-while-revalidate data fetching.
 *
 *   const { data, error, mutate } = useSWR('/api/posts', fetcher, {
 *     refreshInterval: 5000,
 *   });
 */
export function useSWR<T = unknown>(
  key: string | (() => string | null),
  fetcher: (url: string) => Promise<T> = (u) => fetch(u).then((r) => r.json()),
  config: SWRConfig = {}
): SWRResult<T> {
  const data = $state<T | undefined>(config.initialData as T);
  const error = $state<Error | undefined>(undefined);
  const loading = $state(false);
  const isValidating = $state(false);

  const getKey = () => (typeof key === "function" ? key() : key);
  const dedupingInterval = config.dedupingInterval ?? 2000;

  const revalidate = async () => {
    const k = getKey();
    if (!k) return;

    // Dedupe — skip if we just fetched
    const cached = cache.get(k);
    if (cached?.promise) {
      await cached.promise;
      return;
    }
    if (cached?.timestamp && Date.now() - cached.timestamp < dedupingInterval) {
      return;
    }

    isValidating.set(true);
    if (!data()) loading.set(true);

    const promise = (async () => {
      try {
        const result = await fetcher(k);
        cache.set(k, { data: result, timestamp: Date.now() });
        data.set(result as T);
        config.onSuccess?.(result);
      } catch (err) {
        error.set(err as Error);
        config.onError?.(err as Error);
      } finally {
        isValidating.set(false);
        loading.set(false);
        const c = cache.get(k);
        if (c) c.promise = undefined;
      }
    })();

    if (cached) cached.promise = promise;
    else cache.set(k, { promise, timestamp: 0 });

    await promise;
  };

  // Initial fetch
  onMount(() => {
    // Show cached data immediately if available
    const k = getKey();
    if (k) {
      const cached = cache.get(k);
      if (cached?.data) {
        data.set(cached.data as T);
      }
    }
    revalidate();
  });

  // Refresh interval
  if (config.refreshInterval) {
    onMount(() => {
      const id = setInterval(revalidate, config.refreshInterval);
      onCleanup(() => clearInterval(id));
    });
  }

  if (config.refreshOnFocus) {
    onMount(() => {
      const handler = () => revalidate();
      window.addEventListener("focus", handler);
      onCleanup(() => window.removeEventListener("focus", handler));
    });
  }

  if (config.refreshOnReconnect !== false) {
    onMount(() => {
      const handler = () => revalidate();
      window.addEventListener("online", handler);
      onCleanup(() => window.removeEventListener("online", handler));
    });
  }

  return {
    data,
    error,
    loading,
    isValidating,
    mutate: async (newData, revalidateAfter = true) => {
      if (newData !== undefined) {
        const k = getKey();
        if (k) cache.set(k, { data: newData, timestamp: Date.now() });
        data.set(newData);
      }
      if (revalidateAfter) await revalidate();
    },
  };
}

/**
 * useMutation — for POST/PUT/DELETE with optimistic updates.
 *
 *   const { trigger, isMutating } = useMutation('/api/posts', {
 *     method: 'POST',
 *     optimisticData: (prev) => [...prev, newItem],
 *   });
 */
export interface MutationResult<T, P> {
  trigger: (payload: P) => Promise<T>;
  isMutating: () => boolean;
  error: () => Error | undefined;
  reset: () => void;
}

export function useMutation<T = unknown, P = unknown>(
  url: string,
  opts: {
    method?: "POST" | "PUT" | "PATCH" | "DELETE";
    optimisticData?: (prev: T | undefined) => T;
    onSuccess?: (data: T) => void;
    onError?: (err: Error) => void;
  } = {}
): MutationResult<T, P> {
  const isMutating = $state(false);
  const error = $state<Error | undefined>(undefined);

  const trigger = async (payload: P): Promise<T> => {
    isMutating.set(true);
    error.set(undefined);

    try {
      const res = await fetch(url, {
        method: opts.method || "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as T;
      opts.onSuccess?.(data);
      return data;
    } catch (err) {
      error.set(err as Error);
      opts.onError?.(err as Error);
      throw err;
    } finally {
      isMutating.set(false);
    }
  };

  return {
    trigger,
    isMutating,
    error,
    reset: () => error.set(undefined),
  };
}
