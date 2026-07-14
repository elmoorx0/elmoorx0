/**
 * @elmoorx/store-pro — Advanced State Management
 * ============================================
 * CRDT-based sync, undo/redo, time-travel, persistence, selectors.
 *
 *   import { h, createStore, select, sync } from "@elmoorx/store-pro";
 *   const store = createStore({ todos: [], filter: "all" });
 *   const todoCount = select(store, s => s.todos.length);
 *   await sync(store, "wss://sync.elmoorx.dev");
 */

import { h, $state, $effect, type ElmoorxNode } from "@elmoorx/runtime";

// ============ ADVANCED STORE ============

export interface StoreOptions {
  name?: string;
  persist?: boolean | string; // true or storage key
  sync?: string; // WebSocket URL
  maxHistory?: number;
  middleware?: Middleware[];
}

export type Middleware<T = unknown> = (state: T, action: Action) => T;

export interface Action {
  type: string;
  payload?: unknown;
  path?: string; // dot-notation path
}

export interface Selector<T, R> {
  (state: T): R;
}

class ProStore<T extends object> {
  private current = $state<T>({} as T);
  private history: T[] = [];
  private future: T[] = [];
  private maxHistory: number;
  private name: string;
  private listeners = new Set<(state: T) => void>();
  private middleware: Middleware<T>[];
  private ws: WebSocket | null = null;

  constructor(initial: T, opts: StoreOptions = {}) {
    this.name = opts.name || "store";
    this.maxHistory = opts.maxHistory || 50;
    this.middleware = (opts.middleware as Middleware<T>[]) || [];

    // Restore from persistence
    if (opts.persist) {
      const key = typeof opts.persist === "string" ? opts.persist : `elmoorx:${this.name}`;
      try {
        const saved = localStorage.getItem(key);
        if (saved) {
          this.current.set(JSON.parse(saved));
        } else {
          this.current.set(initial);
        }
      } catch {
        this.current.set(initial);
      }

      // Auto-save on changes
      $effect(() => {
        const state = this.current();
        try {
          localStorage.setItem(key, JSON.stringify(state));
        } catch {}
      });
    } else {
      this.current.set(initial);
    }

    // Sync via WebSocket
    if (opts.sync) {
      this.connectSync(opts.sync);
    }
  }

  // ============ GET / SET ============

  get(): T {
    return this.current();
  }

  set(updater: T | ((prev: T) => T)): void {
    const prev = this.current();
    const next = typeof updater === "function" ? (updater as (p: T) => T)(prev) : updater;

    // Apply middleware
    let processed = next;
    for (const mw of this.middleware) {
      processed = mw(processed, { type: "set", payload: next });
    }

    // Record history
    this.history.push(prev);
    if (this.history.length > this.maxHistory) this.history.shift();
    this.future = [];

    this.current.set(processed);
    this.notify(processed);
  }

  // Path-based update: store.set("todos.0.done", true)
  setPath(path: string, value: unknown): void {
    const state = { ...this.current() };
    const parts = path.split(".");
    let target: Record<string, unknown> = state as unknown as Record<string, unknown>;
    for (let i = 0; i < parts.length - 1; i++) {
      target = target[parts[i] as string] as Record<string, unknown>;
    }
    target[parts[parts.length - 1] as string] = value;
    this.set(state);
  }

  // Path-based get: store.getPath("todos.0.text")
  getPath(path: string): unknown {
    const parts = path.split(".");
    let target: unknown = this.current();
    for (const part of parts) {
      if (target && typeof target === 'object') {
        target = (target as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
    return target;
  }

  // ============ UNDO / REDO ============

  undo(): boolean {
    if (this.history.length === 0) return false;
    this.future.push(this.current());
    const prev = this.history.pop();
    if (prev === undefined) return false;
    this.current.set(prev);
    this.notify(prev);
    return true;
  }

  redo(): boolean {
    if (this.future.length === 0) return false;
    this.history.push(this.current());
    const next = this.future.pop();
    if (next === undefined) return false;
    this.current.set(next);
    this.notify(next);
    return true;
  }

  canUndo(): boolean { return this.history.length > 0; }
  canRedo(): boolean { return this.future.length > 0; }

  clearHistory(): void {
    this.history = [];
    this.future = [];
  }

  // ============ SELECTORS ============

  select<R>(selector: Selector<T, R>): () => R {
    return () => selector(this.current());
  }

  // ============ SUBSCRIPTIONS ============

  subscribe(listener: (state: T) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(state: T): void {
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  // ============ SYNC (CRDT) ============

  private connectSync(url: string): void {
    if (typeof WebSocket === "undefined") return;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.warn(`[store-pro] Connected to sync server: ${url}`);
        // Send initial state
        this.ws?.send(JSON.stringify({ type: "sync", state: this.current() }));
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "update") {
            // Merge incoming state (CRDT merge)
            this.merge(data.state);
          }
        } catch {}
      };

      this.ws.onclose = () => {
        console.warn("[store-pro] Sync disconnected, retrying in 3s...");
        setTimeout(() => this.connectSync(url), 3000);
      };
    } catch (err) {
      console.error("[store-pro] Sync failed:", err);
    }
  }

  // CRDT merge — last-write-wins per field
  private merge(incoming: T): void {
    const current = this.current();
    const merged = { ...current } as Record<string, unknown>;
    const incomingRecord = incoming as unknown as Record<string, unknown>;
    const currentRecord = current as unknown as Record<string, unknown>;

    for (const key of Object.keys(incomingRecord)) {
      const inVal = incomingRecord[key];
      const curVal = currentRecord[key];

      if (Array.isArray(inVal) && Array.isArray(curVal)) {
        const ids = new Set(curVal.map((i: { id?: unknown }) => i?.id));
        const merged_arr = [...curVal];
        for (const item of inVal) {
          const itemRecord = item as { id?: unknown };
          if (!ids.has(itemRecord.id)) merged_arr.push(item);
        }
        merged[key] = merged_arr;
      } else if (typeof inVal === "object" && typeof curVal === "object") {
        merged[key] = { ...curVal, ...inVal };
      } else {
        merged[key] = inVal;
      }
    }

    this.current.set(merged as unknown as T);
  }

  // ============ BATCH ============

  batch(updates: ((state: T) => T)[]): void {
    let state = this.current();
    this.history.push(state);
    for (const update of updates) {
      state = update(state);
    }
    this.current.set(state);
    this.notify(state);
  }

  // ============ RESET ============

  reset(initial: T): void {
    this.history.push(this.current());
    this.future = [];
    this.current.set(initial);
    this.notify(initial);
  }

  // ============ EXPORT / IMPORT ============

  export(): string {
    return JSON.stringify({
      name: this.name,
      state: this.current(),
      history: this.history,
      timestamp: Date.now(),
    });
  }

  import(json: string): void {
    try {
      const data = JSON.parse(json);
      this.current.set(data.state);
      this.history = data.history || [];
      this.future = [];
      this.notify(data.state);
    } catch (err) {
      console.error("[store-pro] Import failed:", err);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// ============ FACTORY ============

export function createStore<T extends object>(initial: T, opts?: StoreOptions): ProStore<T> {
  return new ProStore(initial, opts);
}

export function select<T extends object, R>(store: ProStore<T>, selector: Selector<T, R>): () => R {
  return store.select(selector);
}

export function sync<T extends object>(store: ProStore<T>, url: string): void {
  // Enable sync on an existing store
  (store as unknown as { connectSync(url: string): void }).connectSync(url);
}

// ============ MIDDLEWARE ============

export function loggingMiddleware<T>(state: T, action: Action): T {
  console.warn(`[store] ${action.type}:`, action.payload);
  return state;
}

export function debouncedMiddleware<T>(ms: number): Middleware<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (state: T) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {}, ms);
    return state;
  };
}

export function immutableMiddleware<T>(state: T, _action: Action): T {
  // Ensure immutability — deep clone before returning
  return JSON.parse(JSON.stringify(state));
}

// ============ DEVTOOLS ============

export function StoreDevtools<T extends object>(props: { store: ProStore<T> }): ElmoorxNode {
  const state = props.store.get();
  const canUndo = props.store.canUndo();
  const canRedo = props.store.canRedo();

  return h("div", {
    style: "position:fixed;bottom:0;left:0;right:0;height:200px;background:#0A0A0F;border-top:1px solid #A855F7;z-index:9999;display:flex;flex-direction:column;",
  },
    h("div", {
      style: "padding:8px 16px;background:#14141B;border-bottom:1px solid #2A2A38;display:flex;justify-content:space-between;align-items:center;",
    },
      h("div", { style: "display:flex;align-items:center;gap:12px;" },
        h("span", { style: "font-family:'Space Grotesk',sans-serif;font-weight:700;color:#E4E4E7;font-size:13px;" }, "🔧 Store DevTools"),
        h("span", { style: "background:#A855F7;color:white;padding:2px 8px;border-radius:10px;font-size:10px;font-family:monospace;" }, "Live"),
      ),
      h("div", { style: "display:flex;gap:4px;" },
        h("button", {
          onClick: () => props.store.undo(),
          disabled: !canUndo,
          style: `padding:4px 10px;background:${canUndo ? "#2A2A38" : "#1A1A24"};color:${canUndo ? "#E4E4E7" : "#71717A"};border:1px solid #2A2A38;border-radius:4px;cursor:pointer;font-size:11px;`,
        }, "↶ Undo"),
        h("button", {
          onClick: () => props.store.redo(),
          disabled: !canRedo,
          style: `padding:4px 10px;background:${canRedo ? "#2A2A38" : "#1A1A24"};color:${canRedo ? "#E4E4E7" : "#71717A"};border:1px solid #2A2A38;border-radius:4px;cursor:pointer;font-size:11px;`,
        }, "↷ Redo"),
        h("button", {
          onClick: () => console.warn(props.store.export()),
          style: "padding:4px 10px;background:#2A2A38;color:#E4E4E7;border:1px solid #2A2A38;border-radius:4px;cursor:pointer;font-size:11px;",
        }, "Export"),
      ),
    ),
    h("div", {
      style: "flex:1;overflow:auto;padding:12px 16px;",
    },
      h("pre", {
        style: "font-family:'JetBrains Mono',monospace;font-size:11px;color:#A1A1AA;line-height:1.5;white-space:pre-wrap;",
      }, JSON.stringify(state, null, 2)),
    ),
  );
}
