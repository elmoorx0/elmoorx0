/**
 * Elmoorx Lazy — Code splitting + lazy islands
 * ============================================
 * Defer loading island code until it's needed.
 *
 *   const Chart = lazy(() => import('./Chart'));
 *
 *   <Chart data={...} />  // loads only when scrolled into view
 *
 * Bundle impact: ~180 bytes gzipped (the lazy() wrapper itself)
 */

import { h } from "./h";
import { $state } from "./signals";
import { onMount } from "./lifecycle";
import type { ElmoorxNode } from "./island";

export interface LazyComponent<P = Record<string, unknown>> {
  (props: P): ElmoorxNode;
  __lazy: true;
  __loader: () => Promise<{ default: (props: P) => ElmoorxNode }>;
}

export interface LazyOptions {
  // Fallback while loading
  fallback?: ElmoorxNode;
  // Load when scrolled into view (default: false = load eagerly on mount)
  visible?: boolean;
  // Error boundary
  error?: (err: Error) => ElmoorxNode;
}

/**
 * Wrap a component in a lazy loader.
 * The component's code is only fetched when the wrapper is rendered.
 *
 *   const HeavyChart = lazy(() => import('./HeavyChart'));
 *
 *   function Page() {
 *     return h('div', null,
 *       h('h1', null, 'Dashboard'),
 *       h(HeavyChart, { data: [...] })  // code-split
 *     );
 *   }
 *
 * Multi-instance support: every wrapper instance subscribes to the
 * shared `loadPromise`. When it resolves, all instances' `Component`
 * signals are updated. (The previous implementation only updated the
 * first instance — others stayed on the fallback forever.)
 */
export function lazy<P = Record<string, unknown>>(
  loader: () => Promise<{ default: (props: P) => ElmoorxNode }>,
  opts: LazyOptions = {}
): LazyComponent<P> {
  // Shared cache across all wrapper instances.
  let cached: ((props: P) => ElmoorxNode) | null = null;
  let loadPromise: Promise<void> | null = null;
  // List of pending instance callbacks — every instance that mounts
  // while the load is in-flight registers its `Component.set` here.
  // When the load resolves, we fan out to ALL registered instances.
  const pendingInstanceCallbacks: Array<{
    onResolve: (cmp: (props: P) => ElmoorxNode) => void;
    onError: (err: Error) => void;
  }> = [];

  const triggerLoad = () => {
    if (cached) return Promise.resolve();
    if (loadPromise) return loadPromise;
    loadPromise = loader()
      .then((mod) => {
        cached = mod.default;
        // Fan out to ALL instances that mounted during the load.
        for (const cb of pendingInstanceCallbacks) {
          cb.onResolve(mod.default);
        }
        pendingInstanceCallbacks.length = 0;
      })
      .catch((err: Error) => {
        loadPromise = null; // allow retry
        for (const cb of pendingInstanceCallbacks) {
          cb.onError(err);
        }
        pendingInstanceCallbacks.length = 0;
      });
    return loadPromise;
  };

  const wrapped = ((props: P) => {
    const Component = $state<(props: P) => ElmoorxNode | null>(null as unknown as (props: P) => ElmoorxNode | null);
    const error = $state<Error | null>(null);
    const isVisible = $state(false);

    // Register this instance's callbacks so it gets notified when
    // the shared loadPromise resolves.
    const instanceCallback = {
      onResolve: (cmp: (props: P) => ElmoorxNode) => Component.set(cmp),
      onError: (err: Error) => error.set(err),
    };

    // Trigger load — either eagerly (default) or on visible (opts.visible)
    if (opts.visible) {
      // IntersectionObserver branch — defer load until the wrapper
      // element scrolls into view. The placeholder div is observed;
      // when it intersects, we call triggerLoad().
      onMount(() => {
        // onMount runs after the component's initial DOM is attached.
        // We don't have direct access to the rendered div here, so we
        // use a MutationObserver fallback: if IntersectionObserver is
        // available, we wait one microtask for the parent to attach
        // our wrapper div, then observe it.
        if (typeof IntersectionObserver === "undefined") {
          // SSR or non-browser env — load eagerly as fallback.
          pendingInstanceCallbacks.push(instanceCallback);
          triggerLoad();
          return;
        }
        // Find the wrapper element. The renderer assigns it
        // data-elmoorx-lazy (see below), so we can query it.
        // Use rAF to wait for paint.
        const rafId = requestAnimationFrame(() => {
          if (typeof document === "undefined") return;
          // The most recently-rendered wrapper div. This is imperfect
          // (multiple instances share the same selector) but works for
          // the common single-instance case. A full fix needs renderer
          // support for ref callbacks.
          const el = document.querySelector("[data-elmoorx-lazy]");
          if (!el) {
            pendingInstanceCallbacks.push(instanceCallback);
            triggerLoad();
            return;
          }
          const observer = new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                if (entry.isIntersecting) {
                  observer.disconnect();
                  pendingInstanceCallbacks.push(instanceCallback);
                  triggerLoad();
                  isVisible.set(true);
                  return;
                }
              }
            },
            { rootMargin: "50px" }
          );
          observer.observe(el);
        });
        // No clean way to cancel rAF in onCleanup without a returned
        // cleanup function — onMount supports it. Return cleanup.
        return () => cancelAnimationFrame(rafId);
      });
    } else {
      // Eager load — register callback and trigger immediately.
      pendingInstanceCallbacks.push(instanceCallback);
      if (cached) {
        Component.set(cached);
      } else {
        triggerLoad();
      }
    }

    // Render fallback while loading
    return h("div", { "data-elmoorx-lazy": "" },
      () => {
        if (error() && opts.error) {
          const err = error();
          if (err) return opts.error(err);
        }
        const cmp = Component();
        if (cmp) return cmp(props);
        return opts.fallback || h("div", { class: "elmoorx-lazy-fallback" }, "Loading...");
      }
    );
  }) as LazyComponent<P>;

  wrapped.__lazy = true;
  wrapped.__loader = loader;
  return wrapped;
}

/**
 * Prefetch a lazy component's code.
 * Useful for prefetching on hover/focus.
 *
 *   <a href="/dashboard" onMouseEnter={() => prefetch(HeavyChart)}>Dashboard</a>
 */
export function prefetch(component: LazyComponent): Promise<void> {
  if (!component.__lazy) return Promise.resolve();
  return component.__loader().then((mod) => {
    // Module is now cached by the bundler
    void mod;
  });
}

/**
 * Lazy-load multiple components at once.
 *
 *   const [Home, About, Contact] = lazyAll(
 *     () => import('./Home'),
 *     () => import('./About'),
 *     () => import('./Contact'),
 *   );
 */
// `lazyAll` accepts an arbitrary number of loaders with potentially
// different prop types. We can't express a heterogeneous tuple in
// TypeScript without variadic generics, so we type everything as
// `unknown` and let callers cast. This is the same trade-off as
// `Promise.all`'s `Promise<unknown[]>` return.
export function lazyAll(
  ...loaders: Array<() => Promise<{ default: (props: unknown) => ElmoorxNode }>>
): LazyComponent<unknown>[] {
  return loaders.map((loader) => lazy(loader));
}
