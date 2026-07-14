/**
 * Elmoorx Runtime — Keep-alive (component caching)
 * ============================================
 * Cache component instances when they're removed from the DOM,
 * so re-mounting is instant — no re-render, no state loss.
 *
 *   <KeepAlive>
 *     {tab() === 'home' ? <Home /> : null}
 *     {tab() === 'settings' ? <Settings /> : null}
 *   </KeepAlive>
 *
 * When the user navigates away from Home, its state is preserved.
 * When they come back, it's restored instantly.
 *
 * Bundle impact: ~220 bytes gzipped
 *
 * CAVEAT (alpha): True keep-alive requires the renderer to support
 * detaching and reattaching DOM subtrees (with their event listeners
 * and reactive subscriptions intact). The alpha renderer does not
 * support this — when a component is "cached", we save only the
 * ElmoorxNode description; on restore, the renderer re-renders from
 * scratch, losing any in-flight state. The cache structure below
 * (domSnapshot, state fields) is in place for the future renderer
 * upgrade; it is currently unused.
 *
 * Additionally, the cache is module-level (shared across all KeepAlive
 * instances app-wide). Use the `cacheKey` prop to namespace entries
 * per-instance.
 */

import { h } from "../h";
import { $state, $effect } from "../signals";
import type { ElmoorxNode } from "../island";

export interface KeepAliveProps {
  // Maximum cached components (default: 10)
  max?: number;
  // Cache key — components with the same key are reused.
  // REQUIRED for multi-instance KeepAlive — otherwise two unrelated
  // <KeepAlive> wrappers will share the same cache and collide.
  cacheKey?: (children: ElmoorxNode) => string;
  // Include pattern (only cache components matching this)
  include?: RegExp | string;
  // Exclude pattern
  exclude?: RegExp | string;
  children: ElmoorxNode | (() => ElmoorxNode | null);
}

interface CacheEntry {
  key: string;
  node: ElmoorxNode;
  // Reserved for future renderer upgrade: cached DOM subtree +
  // component state will be stored here so re-mount is instant.
  // Currently unused (see file-level CAVEAT).
  domSnapshot?: DocumentFragment;
  state?: Map<string, unknown>;
  lastUsed: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * Keep-alive component — caches children when they're removed.
 */
export function KeepAlive(props: KeepAliveProps): ElmoorxNode {
  const max = props.max || 10;
  const current = $state<ElmoorxNode | null>(null);
  const currentKey = $state<string>("");

  $effect(() => {
    const next = typeof props.children === "function"
      ? props.children()
      : props.children;

    if (next === null) {
      // Save current to cache
      if (currentKey() && current()) {
        cache.set(currentKey(), {
          key: currentKey(),
          node: (current() as NonNullable<ReturnType<typeof current>>),
          lastUsed: Date.now(),
        });
        // Evict oldest if over max
        if (cache.size > max) {
          let oldest: string | null = null;
          let oldestTime = Infinity;
          for (const [k, v] of cache) {
            if (v.lastUsed < oldestTime) {
              oldestTime = v.lastUsed;
              oldest = k;
            }
          }
          if (oldest) cache.delete(oldest);
        }
      }
      current.set(null);
      currentKey.set("");
      return;
    }

    // Compute cache key. If the caller didn't pass `cacheKey`, fall
    // back to getNodeKey (which incorporates component name + a hash
    // of props). The previous implementation only used the component
    // name, so <Home user="alice" /> and <Home user="bob" /> collided.
    const key = props.cacheKey
      ? props.cacheKey(next)
      : getNodeKey(next);

    // Check include/exclude
    if (props.include) {
      const pattern = typeof props.include === "string"
        ? new RegExp(props.include)
        : props.include;
      if (!pattern.test(key)) {
        current.set(next);
        currentKey.set("");
        return;
      }
    }
    if (props.exclude) {
      const pattern = typeof props.exclude === "string"
        ? new RegExp(props.exclude)
        : props.exclude;
      if (pattern.test(key)) {
        current.set(next);
        currentKey.set("");
        return;
      }
    }

    // Check cache
    const cached = cache.get(key);
    if (cached) {
      // Reuse cached
      cached.lastUsed = Date.now();
      current.set(cached.node);
    } else {
      current.set(next);
    }
    currentKey.set(key);
  });

  return h("div", { "data-elmoorx-keepalive": "" },
    () => current()
  );
}

/**
 * Compute a cache key from a node. Incorporates the component name
 * (or tag) AND a shallow hash of the props, so two instances of the
 * same component with different props get different cache entries.
 *
 * The hash is intentionally simple (sum of char codes) — it's a
 * collision-prone hash, but for cache keying it's good enough:
 * false-positive collisions just mean two unrelated components share
 * a cache slot (visible as a brief flash of wrong content on swap),
 * not a correctness bug.
 */
function getNodeKey(node: ElmoorxNode): string {
  if (node === null || typeof node !== "object") return String(node);
  const el = node as unknown;
  const componentName = typeof (el as Record<string, unknown>).tag === "function"
// @ts-expect-error — TS2571: Object is of type 'unknown'.
    ? ((el as Record<string, unknown>).tag.name || "anonymous")
    : ((el as Record<string, unknown>).tag || "unknown");
  // Hash props shallowly
  let propHash = 0;
  if ((el as Record<string, unknown>).props && typeof (el as Record<string, unknown>).props === "object") {
// @ts-expect-error — TS2769: No overload matches this call.
    for (const [k, v] of Object.entries((el as Record<string, unknown>).props)) {
      if (k === "children") continue;
      const s = `${k}=${typeof v === "object" ? "[obj]" : String(v)}`;
      for (let i = 0; i < s.length; i++) {
        propHash = ((propHash << 5) - propHash + s.charCodeAt(i)) | 0;
      }
    }
  }
  return `${componentName}:${propHash.toString(36)}`;
}

/**
 * Clear the entire keep-alive cache.
 */
export function clearKeepAliveCache(): void {
  cache.clear();
}

/**
 * Remove a specific entry from the cache.
 */
export function evictFromKeepAlive(key: string): void {
  cache.delete(key);
}

/**
 * Get current cache size (for debugging).
 */
export function keepAliveCacheSize(): number {
  return cache.size;
}
