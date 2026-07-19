/**
 * Elmoorx Runtime — Signals Core
 * ============================================
 * A tiny reactive primitive inspired by SolidJS / Angular signals.
 * Tracks dependencies at property granularity — only the exact DOM
 * nodes that read a signal will re-render when it changes. No vdom.
 *
 * Bundle impact: ~620 bytes minified+gzipped
 */

export type Computed<T> = () => T;
export type EffectFn = () => void | (() => void);

let activeObserver: EffectFn | null = null;
let batchDepth = 0;
let pendingEffects = new Set<EffectFn>();

/**
 * Reverse registry: each effect knows which signals it depends on,
 * so we can detach on disposal. This is required to avoid memory
 * leaks.
 */
const effectDeps = new WeakMap<EffectFn, Set<Set<EffectFn>>>();

/**
 * Per-effect cleanup function returned by the effect's user callback.
 * When an effect re-runs (because a dep changed), the previous cleanup
 * is invoked BEFORE the new effect body runs — matching SolidJS / React
 * useEffect semantics.
 */
const effectCleanups = new WeakMap<EffectFn, () => void>();

export interface Signal<T> {
  (): T;
  set(v: T | ((prev: T) => T)): void;
  _deps: Set<EffectFn>;
  _value: T;
}

/**
 * Create a reactive signal. Reads track; writes trigger.
 *
 *   const count = $state(0);
 *   count()           // → 0
 *   count.set(1)      // triggers effects
 *   count.set(c => c + 1)
 */
export function $state<T>(initial: T): Signal<T> {
  const deps = new Set<EffectFn>();
  let value = initial;

  const read = (() => {
    if (activeObserver) {
      deps.add(activeObserver);
      // Track this signal as a dependency of the active observer
      let depSet = effectDeps.get(activeObserver);
      if (!depSet) {
        depSet = new Set();
        effectDeps.set(activeObserver, depSet);
      }
      depSet.add(deps);
    }
    return value;
  }) as Signal<T>;

  read._deps = deps;
  read._value = value;

  read.set = (next: T | ((prev: T) => T)) => {
    const resolved =
      typeof next === "function" ? (next as (p: T) => T)(value) : next;
    if (Object.is(resolved, value)) return;
    value = resolved;
    read._value = value;
    // Snapshot to avoid mutation during iteration
    for (const dep of [...deps]) schedule(dep);
  };

  return read;
}

/**
 * Derived value that auto-updates when its dependencies change.
 *
 *   const total = $computed(() => price() * qty());
 *
 * How it works:
 *   - On first read, an internal $effect re-runs `fn()` whenever any
 *     upstream signal changes, and writes the new value into `signal`.
 *   - When the computed is read inside another effect, the reader
 *     subscribes to `signal` (just like any other signal), so changes
 *     propagate transitively.
 *   - The internal $effect is registered lazily on first read so
 *     unused computeds cost nothing.
 */
export function $computed<T>(fn: () => T): Computed<T> {
  const signal = $state<T>(undefined as T);

  // Register an effect that re-runs `fn()` whenever deps change and
  // pushes the new value into `signal`. This effect is created lazily
  // on first read so we don't pay for unused computeds.
  let effectRegistered = false;

  const wrapped = (() => {
    if (!effectRegistered) {
      effectRegistered = true;
      $effect(() => {
        const next = fn();
        // Push into the signal so downstream effects subscribed to
        // this computed get notified.
        signal.set(next);
      });
    }
    // Read through the signal so the current observer (if any)
    // registers as a downstream subscriber.
    return signal();
  }) as Computed<T>;

  return wrapped;
}

/**
 * Side-effect that re-runs when its dependencies change.
 * Returns a cleanup/dispose function that:
 *   1. Invokes the user-returned cleanup (if any)
 *   2. Detaches the effect from all signals it depends on
 *
 * When a dep changes and the effect re-runs, the previous user-cleanup
 * is invoked BEFORE the new effect body runs — matching the semantics
 * of SolidJS createEffect and React useEffect.
 *
 *   const dispose = $effect(() => {
 *     const id = setInterval(() => console.warn(count()), 1000);
 *     return () => clearInterval(id);  // ← cleanup, called on re-run + dispose
 *   });
 *   dispose(); // detach — count changes no longer re-run this effect
 */
export function $effect(fn: EffectFn): () => void {
  const run: EffectFn = () => {
    // Run the previous cleanup before re-running (matches React/Solid semantics).
    // This is critical for effects that return setInterval/setTimeout/listeners:
    // without it, every re-run would leak a new timer/listener.
    const prevCleanup = effectCleanups.get(run);
    if (prevCleanup) {
      try { prevCleanup(); } catch { /* swallow cleanup errors */ }
      effectCleanups.delete(run);
    }
    // Detach from previous deps (effect is about to re-track)
    dispose(run);
    const prev = activeObserver;
    activeObserver = run;
    let cleanup: void | (() => void);
    try {
      cleanup = fn();
    } finally {
      activeObserver = prev;
    }
    // If the effect returns a cleanup, stash it for the next re-run / dispose.
    if (typeof cleanup === "function") {
      effectCleanups.set(run, cleanup);
    }
  };

  run();
  return () => {
    const c = effectCleanups.get(run);
    if (c) {
      try { c(); } catch { /* swallow cleanup errors */ }
      effectCleanups.delete(run);
    }
    dispose(run);
  };
}

/**
 * Detach an effect from all signals it depends on. Safe to call
 * multiple times — once deps are cleared, subsequent calls are no-ops.
 */
function dispose(effect: EffectFn): void {
  const deps = effectDeps.get(effect);
  if (!deps) return;
  for (const depSet of deps) {
    depSet.delete(effect);
  }
  deps.clear();
}

/**
 * Batch multiple signal writes — effects fire once at the end.
 *
 *   $batch(() => {
 *     x.set(1);
 *     y.set(2);   // does NOT trigger twice
 *   });
 */
export function $batch(fn: () => void): void {
  batchDepth++;
  try {
    fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      const queued = pendingEffects;
      pendingEffects = new Set();
      for (const eff of queued) eff();
    }
  }
}

function schedule(eff: EffectFn): void {
  if (batchDepth > 0) {
    pendingEffects.add(eff);
  } else {
    eff();
  }
}
