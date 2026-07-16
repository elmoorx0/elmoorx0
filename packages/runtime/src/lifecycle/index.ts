/**
 * Elmoorx Runtime — Lifecycle Hooks
 * ============================================
 *   onMount(fn)       — runs after the component's DOM is attached
 *   onCleanup(fn)     — runs before the component is removed
 *   onError(fn)       — catches errors in this component's subtree
 *
 * Bundle impact: ~220 bytes gzipped
 */

type CleanupFn = () => void;
type ErrorHandler = (err: unknown) => void;

export interface LifecycleBucket {
  mount: CleanupFn[];
  cleanup: CleanupFn[];
  error: ErrorHandler[];
}

let currentBucket: LifecycleBucket | null = null;
const stack: (LifecycleBucket | null)[] = [];

/**
 * Internal — called by the renderer when entering a component.
 */
export function pushLifecycle(): LifecycleBucket {
  const bucket: LifecycleBucket = { mount: [], cleanup: [], error: [] };
  stack.push(bucket);
  currentBucket = bucket;
  return bucket;
}

/**
 * Internal — called when leaving a component setup.
 */
export function popLifecycle(): LifecycleBucket | null {
  const bucket = stack.pop() ?? null;
  currentBucket = stack[stack.length - 1] ?? null;
  return bucket;
}

/**
 * Internal — called when the component's DOM is attached.
 *
 * Two calling conventions:
 *   runMount(bucket)     — explicit bucket (used by h.ts after pushing a fresh scope)
 *   runMount()           — use the current top-of-stack bucket (used by renderers
 *                          that manage their own push/pop)
 */
export function runMount(bucket?: LifecycleBucket): void {
  const b = bucket ?? currentBucket;
  if (!b) return;
  for (const fn of b.mount) {
    try {
      const cleanup = fn();
      if (typeof cleanup === "function") {
        b.cleanup.push(cleanup);
      }
    } catch (err) {
      handleError(b, err);
    }
  }
  b.mount = [];
}

/**
 * Internal — called when the component is removed from the DOM.
 */
export function runCleanup(bucket?: LifecycleBucket): void {
  const b = bucket ?? currentBucket;
  if (!b) return;
  for (const fn of b.cleanup) {
    try {
      fn();
    } catch {
      // swallow cleanup errors
    }
  }
  b.cleanup = [];
}

/**
 * Internal — propagate an error up the tree.
 *
 * Two calling conventions:
 *   handleError(bucket, err)   — explicit bucket (used by h.ts)
 *   handleError(err)           — use current top-of-stack bucket
 *
 * Returns true if a handler caught the error, false otherwise.
 * Callers (like h.ts) use the return value to decide whether to
 * re-throw.
 */
export function handleError(bucketOrErr: LifecycleBucket | unknown, maybeErr?: unknown): boolean {
  let bucket: LifecycleBucket | null;
  let err: unknown;
  if (maybeErr === undefined) {
    bucket = currentBucket;
    err = bucketOrErr;
  } else {
    bucket = bucketOrErr as LifecycleBucket;
    err = maybeErr;
  }
  if (bucket && bucket.error.length > 0) {
    for (const handler of bucket.error) {
      try {
        handler(err);
        return true;
      } catch {
        // try next handler
      }
    }
  }
  // No handler caught it — re-throw so the caller can decide.
  throw err;
}

/**
 * Register a function to run after the component's DOM is attached.
 * Can return a cleanup function that runs on unmount.
 *
 *   onMount(() => {
 *     const id = setInterval(tick, 1000);
 *     return () => clearInterval(id);
 *   });
 */
export function onMount(fn: CleanupFn): void {
  if (!currentBucket) {
    // Called outside a component — run immediately
    fn();
    return;
  }
  currentBucket.mount.push(fn);
}

/**
 * Register a function to run when the component is removed from the DOM.
 *
 *   onCleanup(() => {
 *     socket.close();
 *   });
 *
 * WARNING: Calling `onCleanup` outside a component setup (e.g. inside
 * a bare `$effect` with no lifecycle bucket) is a no-op — the cleanup
 * function will be silently dropped and the resource will leak. If
 * you need cleanup tied to an effect's lifetime, return the cleanup
 * function from the effect body — `$effect` will call it on dispose
 * or before re-running.
 */
export function onCleanup(fn: CleanupFn): void {
  if (!currentBucket) {
    if (typeof process !== "undefined" && process.env?.NODE_ENV !== "production") {
      console.warn(
        "[elmoorx/lifecycle] onCleanup called outside a component setup — the cleanup will be dropped. " +
        "To clean up an effect, return a cleanup function from the $effect body instead."
      );
    }
    return;
  }
  currentBucket.cleanup.push(fn);
}

/**
 * Register an error handler for this component's subtree.
 *
 *   onError((err) => {
 *     console.error('Component failed:', err);
 *     // Optionally send to error reporting service
 *   });
 */
export function onError(fn: ErrorHandler): void {
  if (!currentBucket) return;
  currentBucket.error.push(fn);
}

/**
 * Wrap a function so errors propagate to the nearest error boundary.
 */
export function withErrorBoundary<T extends (...args: unknown[]) => unknown>(fn: T): T {
  return ((...args: unknown[]) => {
    try {
      return fn(...args);
    } catch (err) {
      if (currentBucket) {
        handleError(currentBucket, err);
        return undefined as unknown;
      } else {
        throw err;
      }
    }
  }) as T;
}
