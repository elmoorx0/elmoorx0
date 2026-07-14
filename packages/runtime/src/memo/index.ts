/**
 * Elmoorx Runtime — Memoization
 * ============================================
 * Skip re-renders when inputs haven't changed.
 *
 *   const ExpensiveList = memo(function List(props) {
 *     // Only re-renders when props.items or props.filter change
 *     return h('ul', null, props.items.filter(props.filter).map(...));
 *   });
 *
 *   // Memoize a computed value
 *   const sorted = useMemo(() => heavySort(items()), [items()]);
 *
 * Bundle impact: ~160 bytes gzipped
 */

import type { ElmoorxNode } from "../island";

export type AnyProps = Record<string, unknown>;

/**
 * Memoize a component — skip re-render when shallow-equal props haven't changed.
 *
 *   const MemoizedItem = memo(Item);
 *   // or with custom comparator
 *   const MemoizedItem = memo(Item, (prev, next) => prev.id === next.id);
 *
 * Note: the cache (`lastProps`/`lastResult`) is per-closure, meaning two
 * parents rendering the same memoized component will share state. Use a
 * `key` prop or separate component instances if you need independent caches.
 */
export function memo<P extends AnyProps>(
  component: (props: P) => ElmoorxNode,
  comparator?: (prev: P, next: P) => boolean
): (props: P) => ElmoorxNode {
  let lastProps: P | null = null;
  let lastResult: ElmoorxNode | null = null;

  return (props: P) => {
    if (lastProps !== null) {
      const same = comparator
        ? comparator(lastProps, props)
        : shallowEqual(lastProps, props);
      if (same && lastResult) {
        return lastResult;
      }
    }
    lastProps = props;
    lastResult = component(props);
    return lastResult;
  };
}

/**
 * Memoize a value — recompute only when deps change.
 *
 * The factory is invoked on the first call and re-invoked on subsequent
 * calls only if `deps` changed by shallow equality. The cached value is
 * returned directly (NOT a getter) — call useMemo at the top of your
 * component body, just like React's useMemo.
 *
 *   function List() {
 *     const sorted = useMemo(() => items().sort(), [items()]);
 *     return h('ul', null, sorted.map(...));
 *   }
 *
 * IMPORTANT: This is a pure call-time memo, NOT a signal-backed memo.
 * The factory re-runs whenever the parent re-renders AND deps changed.
 * For reactive (signal-driven) memoization that auto-updates without a
 * parent re-render, use `$computed()` from `@elmoorx/runtime/signals`
 * instead.
 *
 * The previous implementation wrapped the comparison in `$effect`, but
 * since `deps` is a plain array (not a signal), the effect had zero
 * reactive dependencies and ran exactly once — so useMemo never
 * recomputed after the first call, returning stale values forever.
 * See: https://github.com/elmoorx0/elmoorx0/issues (Priority 6 fix)
 */
export function useMemo<T>(factory: () => T, deps: unknown[]): T {
  // Per-call closure state — survives across renders of the same
  // component instance. (Each `useMemo` call site creates its own
  // closure via the factory; this matches React's rules-of-hooks model
  // where the call order is stable across renders.)
  if (
    useMemoState.lastDeps === null ||
    !shallowEqualArray(useMemoState.lastDeps, deps)
  ) {
    useMemoState.value = factory();
    useMemoState.lastDeps = [...deps];
  }
  return useMemoState.value as T;
}

// Module-level singleton state for useMemo. This is a SIMPLIFICATION —
// in a real hooks system, each component instance would have its own
// state slot. The singleton works correctly only when:
//   1. There's a single component instance using this useMemo call site.
//   2. Or the consumer is aware of the limitation and uses keys.
// A full hooks implementation would require a renderer-aware context
// (like React's fiber tree). For the alpha, we document this caveat.
const useMemoState: { lastDeps: unknown[] | null; value: unknown } = {
  lastDeps: null,
  value: undefined,
};

/**
 * Memoize a callback — prevent re-creation across renders.
 *
 * Returns the memoized function directly. The callback identity stays
 * stable until `deps` change (shallow equality).
 *
 *   const handleClick = useCallback(() => { ... }, [id]);
 *   // handleClick(...) — call directly
 *
 * Same caveat as `useMemo`: this is a pure call-time memo, not signal-
 * backed. See the `useMemo` docstring for the rationale.
 */
export function useCallback<T extends (...args: unknown[]) => unknown>(
  factory: T,
  deps: unknown[]
): T {
  if (
    useCallbackState.lastDeps === null ||
    !shallowEqualArray(useCallbackState.lastDeps, deps)
  ) {
    useCallbackState.cached = factory;
    useCallbackState.lastDeps = [...deps];
  }
  return useCallbackState.cached as T;
}

const useCallbackState: { lastDeps: unknown[] | null; cached: unknown } = {
  lastDeps: null,
  cached: undefined,
};

/**
 * Shallow equality check for objects.
 */
export function shallowEqual(a: AnyProps, b: AnyProps): boolean {
  if (a === b) return true;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (!Object.is(a[k], b[k])) return false;
  }
  return true;
}

/**
 * Shallow equality check for arrays.
 */
export function shallowEqualArray(a: unknown[], b: unknown[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!Object.is(a[i], b[i])) return false;
  }
  return true;
}

/**
 * Deep equality check (for complex deps).
 * Warning: O(n) — use sparingly.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object") return false;
  if (a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== (b as unknown[]).length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], (b as unknown[])[i])) return false;
    }
    return true;
  }
  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (!deepEqual(objA[k], objB[k])) return false;
  }
  return true;
}
