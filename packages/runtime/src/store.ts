/**
 * Elmoorx Runtime — Reactive Store
 * ============================================
 * A proxy-based reactive store. Mutations (push, splice, assign) are
 * automatically tracked — no setters, no immutability boilerplate.
 *
 * Bundle impact: ~480 bytes minified+gzipped
 */

import { $state, $effect, type Signal } from "./signals";

type Store<T> = T & {
  $subscribe(fn: () => void): () => void;
  $serialize(): string;
};

/**
 * WeakMap cache of raw-object → Proxy. Ensures that
 * `store.user === store.user` is `true` (the same Proxy reference is
 * returned on every read of the same underlying object). Without this,
 * every property read returned a fresh Proxy, breaking `Object.is`
 * equality checks used by memo / shallowEqual / external `===`.
 */
const proxyCache = new WeakMap<object, object>();

/**
 * Create a deep reactive store.
 *
 *   const store = $store({ user: null, cart: [], theme: 'dark' });
 *   store.cart.push(item)    // triggers reactive updates
 *   store.theme = 'light'    // triggers reactive updates
 */
export function $store<T extends object>(initial: T): Store<T> {
  // Track each accessed path with a signal — granular updates.
  const signals = new Map<string, Signal<unknown>>();

  const getSignal = (path: string, current: unknown): Signal<unknown> => {
    let s = signals.get(path);
    if (!s) {
      s = $state(current);
      signals.set(path, s);
    }
    return (s as NonNullable<typeof s>);
  };

  const proxy = new Proxy(initial as object, {
    get(target, prop: string, receiver) {
      // Internal helpers (non-reactive)
      if (prop === "$subscribe") {
        return (fn: () => void) => $effect(fn);
      }
      if (prop === "$serialize") {
        return () => JSON.stringify(target);
      }
      if (typeof prop === "symbol") {
        return Reflect.get(target, prop, receiver);
      }

      const value = Reflect.get(target, prop, receiver);

      // Track reads on this property
      const sig = getSignal(prop, value);
      sig();

      // Deep-proxy objects/arrays so nested mutations are tracked
      if (value && typeof value === "object") {
        if (Array.isArray(value)) {
          return arrayProxy(value as unknown[], prop, getSignal);
        }
        return deepProxy(value as object, `${prop}.`, getSignal);
      }
      return value;
    },

    set(target, prop: string, value, receiver) {
      const prev = Reflect.get(target, prop, receiver);
      const ok = Reflect.set(target, prop, value, receiver);
      // SECURITY/CORRECTNESS: if Reflect.set failed (non-writable prop,
      // frozen target), do NOT update the signal — the target doesn't
      // actually hold the new value, so notifying subscribers would
      // diverge signal state from object state.
      if (!ok) return false;
      if (!Object.is(prev, value)) {
        // Invalidate any cached proxy for the previous value at this path.
        if (prev && typeof prev === "object") {
          proxyCache.delete(prev);
        }
        const sig = getSignal(prop, value);
        sig.set(value);
      }
      return true;
    },
  });

  return proxy as Store<T>;
}

function deepProxy(
  obj: object,
  prefix: string,
  getSignal: (path: string, current: unknown) => Signal<unknown>
): object {
  // Cache lookup — return the same Proxy for the same raw object.
  const cached = proxyCache.get(obj);
  if (cached) return cached;

  const proxy = new Proxy(obj, {
    get(target, prop: string, receiver) {
      const path = `${prefix}${prop}`;
      const value = Reflect.get(target, prop, receiver);
      const sig = getSignal(path, value);
      sig();
      if (value && typeof value === "object") {
        if (Array.isArray(value)) {
          return arrayProxy(value, path, getSignal);
        }
        return deepProxy(value, `${path}.`, getSignal);
      }
      return value;
    },
    set(target, prop: string, value, receiver) {
      const path = `${prefix}${prop}`;
      const prev = Reflect.get(target, prop, receiver);
      const ok = Reflect.set(target, prop, value, receiver);
      if (!ok) return false;
      if (!Object.is(prev, value)) {
        if (prev && typeof prev === "object") {
          proxyCache.delete(prev);
        }
        const sig = getSignal(path, value);
        sig.set(value);
      }
      return true;
    },
  });
  proxyCache.set(obj, proxy);
  return proxy;
}

/**
 * Wrap an array so mutation methods (push/pop/splice/sort/reverse/
 * shift/unshift) trigger reactive updates. Index reads also track,
 * and index writes (`arr[i] = x`) trigger updates too.
 *
 * Element objects are themselves proxied via deepProxy so that
 * `arr[0].name = 'new'` is reactive.
 *
 * NOTE: We do NOT spread the array into a fresh one on every mutation
 * (the previous implementation did `sig.set([...arr])` after every
 * push/pop/etc., which was O(n) per mutation and broke reference
 * equality). Instead we just fire the per-path and length signals —
 * subscribers re-read via the Proxy and see the new length/contents
 * without an O(n) snapshot.
 */
function arrayProxy(
  arr: unknown[],
  path: string,
  getSignal: (path: string, current: unknown) => Signal<unknown>
): unknown[] {
  // Cache lookup — return the same Proxy for the same raw array.
  const cached = proxyCache.get(arr);
  if (cached) return cached as unknown[];

  const notify = () => {
    // Notify the whole-array signal (used by subscribers reading
    // `store.items` and then iterating). Pass the raw array —
    // subscribers re-read via the Proxy, which is identity-stable.
    const sig = getSignal(path, arr);
    sig.set(arr);
    const lengthSig = getSignal(`${path}.length`, arr.length);
    lengthSig.set(arr.length);
  };

  const wrap = (method: "push" | "pop" | "shift" | "unshift" | "splice" | "sort" | "reverse") => {
// @ts-expect-error — TS2571: Object is of type 'unknown'.
    const original = (arr as unknown)[method].bind(arr);
    return (...args: unknown[]) => {
      const result = original(...args);
      notify();
      return result;
    };
  };

  const proxy = new Proxy(arr, {
    get(target, prop: string, receiver) {
      if (prop === "push") return wrap("push");
      if (prop === "pop") return wrap("pop");
      if (prop === "shift") return wrap("shift");
      if (prop === "unshift") return wrap("unshift");
      if (prop === "splice") return wrap("splice");
      if (prop === "sort") return wrap("sort");
      if (prop === "reverse") return wrap("reverse");
      if (prop === "length") {
        const sig = getSignal(`${path}.length`, target.length);
        sig();
        return target.length;
      }
      // Numeric index — track + deep-proxy object elements
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        // Per-index signal — fine-grained updates for `arr[i].foo`
        const idxSig = getSignal(`${path}.${prop}`, value);
        idxSig();
        return deepProxy(value, `${path}.${prop}.`, getSignal);
      }
      // Primitives — track the index directly
      if (typeof prop === "string" && /^\d+$/.test(prop)) {
        const idxSig = getSignal(`${path}.${prop}`, value);
        idxSig();
      }
      return value;
    },
    set(target, prop: string, value, receiver) {
      const ok = Reflect.set(target, prop, value, receiver);
      if (!ok) return false;
      if (prop === "length") {
        notify();
      } else if (typeof prop === "string" && /^\d+$/.test(prop)) {
        // Index write — `arr[i] = x`
        const idxSig = getSignal(`${path}.${prop}`, value);
        idxSig.set(value);
        notify();
      }
      return true;
    },
  });
  proxyCache.set(arr, proxy);
  return proxy;
}

export type { Store };
