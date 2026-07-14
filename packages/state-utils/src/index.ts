/**
 * Elmoorx State Utils — Persistence + Undo/Redo + Time travel
 * ============================================
 * Utilities for advanced state management.
 *
 *   // Persist to localStorage
 *   const persisted = persist($store({ count: 0 }), 'my-count');
 *
 *   // Undo/redo
 *   const history = useHistory($store({ text: '' }));
 *   history.undo();
 *   history.redo();
 */

import { $state, $effect, type Store } from "@elmoorx/runtime";

/**
 * Persist a store to localStorage (or any Storage-like API).
 *
 *   const store = persist($store({ theme: 'dark' }), 'app:theme');
 *   // Auto-saves on every change
 *   // Auto-restores on page reload
 */
export function persist<T extends object>(
  store: Store<T>,
  key: string,
  opts: {
    storage?: Storage;
    serialize?: (data: T) => string;
    deserialize?: (data: string) => T;
    // Debounce writes (ms, default: 100)
    debounce?: number;
  } = {}
): Store<T> {
  const storage = opts.storage || (typeof localStorage !== "undefined" ? localStorage : undefined);
  if (!storage) return store;

  const serialize = opts.serialize || JSON.stringify;
  const deserialize = opts.deserialize || JSON.parse;

  // Restore on init
  try {
    const saved = storage.getItem(key);
    if (saved) {
      const data = deserialize(saved);
      Object.assign(store, data);
    }
  } catch (err) {
    console.warn(`[elmoorx/persist] Failed to restore ${key}:`, err);
  }

  // Save on change (debounced)
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  $effect(() => {
    // Read all keys to track
    const snapshot = JSON.parse(JSON.stringify(store as unknown as Record<string, unknown>));
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        storage.setItem(key, serialize(snapshot as T));
      } catch (err) {
        console.warn(`[elmoorx/persist] Failed to save ${key}:`, err);
      }
    }, opts.debounce || 100);
  });

  return store;
}

export interface HistoryResult<T> {
  // Current value
  current: () => T;
  // Set new value (pushes to history)
  set: (value: T) => void;
  // Undo (revert to previous state)
  undo: () => void;
  // Redo (re-apply undone change)
  redo: () => void;
  // Can undo?
  canUndo: () => boolean;
  // Can redo?
  canRedo: () => boolean;
  // Clear history
  clear: () => void;
  // All past states (for time-travel debugging)
  past: () => T[];
  // All future states (after undo)
  future: () => T[];
}

/**
 * useHistory — undo/redo for any state.
 *
 *   const history = useHistory($state('hello'));
 *   history.set('world');
 *   history.undo();  // back to 'hello'
 *   history.redo();  // forward to 'world'
 */
export function useHistory<T>(
  initial: T | (() => T),
  opts: { maxHistory?: number } = {}
): HistoryResult<T> {
  const max = opts.maxHistory || 50;
  const past = $state<T[]>([]);
  const future = $state<T[]>([]);
  const current = $state<T>(typeof initial === "function" ? (initial as () => T)() : initial);

  const set = (value: T) => {
    past.set([...past(), current()].slice(-max));
    future.set([]);
    current.set(value);
  };

  const undo = () => {
    if (past().length === 0) return;
    const prev = past()[past().length - 1];
    past.set(past().slice(0, -1));
    future.set([current(), ...future()]);
    current.set(prev);
  };

  const redo = () => {
    if (future().length === 0) return;
    const next = future()[0];
    future.set(future().slice(1));
    past.set([...past(), current()]);
    current.set(next);
  };

  return {
    current,
    set,
    undo,
    redo,
    canUndo: () => past().length > 0,
    canRedo: () => future().length > 0,
    clear: () => { past.set([]); future.set([]); },
    past,
    future,
  };
}

/**
 * createMachine — tiny finite state machine.
 *
 *   const machine = createMachine({
 *     initial: 'idle',
 *     states: {
 *       idle: { on: { FETCH: 'loading' } },
 *       loading: { on: { SUCCESS: 'success', ERROR: 'error' } },
 *       success: { on: { RESET: 'idle' } },
 *       error: { on: { RETRY: 'loading', RESET: 'idle' } },
 *     },
 *   });
 *
 *   machine.state()         // → 'idle'
 *   machine.send('FETCH')   // → 'loading'
 *   machine.send('SUCCESS') // → 'success'
 */
export function createMachine<S extends string, E extends string>(config: {
  initial: S;
  states: Record<S, { on?: Partial<Record<E, S>> }>;
  onTransition?: (from: S, to: S, event: E) => void;
}) {
  const state = $state<S>(config.initial);

  const send = (event: E) => {
    const current = state();
    const next = config.states[current]?.on?.[event];
    if (next && next !== current) {
      config.onTransition?.(current, next, event);
      state.set(next);
    }
  };

  const matches = (s: S) => state() === s;

  return { state, send, matches };
}

/**
 * debounce — delay a function call until after a quiet period.
 *
 *   const debounced = debounce((value) => {
 *     saveToServer(value);
 *   }, 500);
 *   input.onInput = (e) => debounced(e.target.value);
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), waitMs);
  };
}

/**
 * throttle — limit a function to at most one call per period.
 *
 *   const throttled = throttle(onScroll, 16);  // 60fps
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = waitMs - (now - lastCall);
    if (remaining <= 0) {
      if (timer) { clearTimeout(timer); timer = null; }
      lastCall = now;
      fn(...args);
    } else if (!timer) {
      timer = setTimeout(() => {
        lastCall = Date.now();
        timer = null;
        fn(...args);
      }, remaining);
    }
  };
}

/**
 * computedOnce — like $computed but never re-computes after first call.
 * Useful for expensive initializations.
 */
export function computedOnce<T>(factory: () => T): () => T {
  let cached: T;
  let computed = false;
  return () => {
    if (!computed) {
      cached = factory();
      computed = true;
    }
    return cached;
  };
}
