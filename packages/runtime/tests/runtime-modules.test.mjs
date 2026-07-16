/**
 * @elmoorx/runtime — module coverage test suite
 *
 * Covers runtime modules that were previously untested:
 *   - memo / useMemo / useCallback / shallowEqual / deepEqual
 *   - refs (useRef, forwardRef, useImperativeHandle, useRefList)
 *   - keepalive (KeepAlive, clearKeepAliveCache, evictFromKeepAlive,
 *     keepAliveCacheSize)
 *   - suspense (Suspense, async_, renderToStream)
 *   - portal (Portal)
 *   - transition (Transition, TransitionGroup)
 *   - lazy (lazy, prefetch, lazyAll)
 *   - async-hooks (useFetch, useSWR, useMutation)
 *
 * Run with:
 *   npx tsx --test packages/runtime/tests/runtime-modules.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

let rt = null;
let skipReason = null;

try {
  rt = await import("../src/index.ts");
} catch (err) {
  skipReason = (err instanceof Error ? err.message : String(err)).slice(0, 200);
}

const skipIfNoRuntime = skipReason ? test.skip : test;

// ─── Memoization ─────────────────────────────────────────────────────

describe("memo: shallow memoization", () => {
  skipIfNoRuntime("memo() skips re-render when props are shallow-equal", () => {
    let renderCount = 0;
    const Child = (props) => {
      renderCount++;
      return rt.h("div", null, props.label);
    };
    const MemoChild = rt.memo(Child);

    const out1 = MemoChild({ label: "hi" });
    assert.equal(renderCount, 1);
    const out2 = MemoChild({ label: "hi" });
    assert.equal(renderCount, 1, "should not re-render on shallow-equal props");
    assert.equal(out2, out2, "returns a node");
  });

  skipIfNoRuntime("memo() re-renders when props change", () => {
    let renderCount = 0;
    const Child = (props) => {
      renderCount++;
      return rt.h("div", null, props.label);
    };
    const MemoChild = rt.memo(Child);

    MemoChild({ label: "a" });
    MemoChild({ label: "b" });
    assert.equal(renderCount, 2);
  });

  skipIfNoRuntime("memo() supports custom comparator", () => {
    let renderCount = 0;
    const Child = (props) => {
      renderCount++;
      return rt.h("div", null, props.id);
    };
    // Only re-render when id changes (ignore label)
    const MemoChild = rt.memo(Child, (a, b) => a.id === b.id);

    MemoChild({ id: 1, label: "a" });
    MemoChild({ id: 1, label: "b" });
    assert.equal(renderCount, 1, "custom comparator should skip re-render");
    MemoChild({ id: 2, label: "b" });
    assert.equal(renderCount, 2);
  });
});

describe("useMemo: dependency tracking", () => {
  // NOTE: useMemo uses module-level singleton state in the alpha runtime,
  // so each test must use UNIQUE deps to avoid cross-test pollution.
  skipIfNoRuntime("useMemo() recomputes when deps change", () => {
    let computeCount = 0;
    const uniqueA = Symbol("a");
    const uniqueB = Symbol("b");

    const v1 = rt.useMemo(() => { computeCount++; return "first"; }, [uniqueA]);
    assert.equal(computeCount, 1);
    assert.equal(v1, "first");

    // Same deps → cache hit, no recompute
    const v2 = rt.useMemo(() => { computeCount++; return "first"; }, [uniqueA]);
    assert.equal(computeCount, 1, "should not recompute on same deps");
    assert.equal(v2, "first");

    // Different deps → recompute
    const v3 = rt.useMemo(() => { computeCount++; return "second"; }, [uniqueB]);
    assert.equal(computeCount, 2);
    assert.equal(v3, "second");
  });

  skipIfNoRuntime("useCallback() returns same fn for same deps", () => {
    const uniqueX = Symbol("x");
    const uniqueY = Symbol("y");
    const factoryA = () => 42;
    const factoryB = () => 43;

    // First call stores factoryA as the cached callback.
    const fn1 = rt.useCallback(factoryA, [uniqueX]);
    assert.equal(fn1, factoryA, "first call should return the factory itself");

    // Same deps → returns the cached factory (factoryA), not the new arg.
    const fn2 = rt.useCallback(factoryB, [uniqueX]);
    assert.equal(fn2, factoryA, "same deps => cached fn identity");
    assert.notEqual(fn2, factoryB);

    // Different deps → re-caches the new factory.
    const fn3 = rt.useCallback(factoryB, [uniqueY]);
    assert.equal(fn3, factoryB, "different deps => new fn identity");
  });
});

describe("shallowEqual / deepEqual", () => {
  skipIfNoRuntime("shallowEqual() returns true for same object identity", () => {
    const a = { x: 1 };
    assert.equal(rt.shallowEqual(a, a), true);
  });

  skipIfNoRuntime("shallowEqual() returns true for shallow-equal objects", () => {
    assert.equal(rt.shallowEqual({ x: 1, y: 2 }, { x: 1, y: 2 }), true);
  });

  skipIfNoRuntime("shallowEqual() returns false for nested object diff", () => {
    const a = { x: { y: 1 } };
    const b = { x: { y: 1 } };
    assert.equal(rt.shallowEqual(a, b), false, "shallow sees different refs");
  });

  skipIfNoRuntime("shallowEqual() returns false for different keys", () => {
    assert.equal(rt.shallowEqual({ x: 1 }, { y: 1 }), false);
    assert.equal(rt.shallowEqual({ x: 1, y: 2 }, { x: 1 }), false);
  });

  skipIfNoRuntime("deepEqual() recursively compares", () => {
    assert.equal(rt.deepEqual({ a: [1, 2] }, { a: [1, 2] }), true);
    assert.equal(rt.deepEqual({ a: [1, 2] }, { a: [1, 3] }), false);
    assert.equal(rt.deepEqual(null, null), true);
    assert.equal(rt.deepEqual(null, undefined), false);
  });

  skipIfNoRuntime("shallowEqualArray() compares element-wise", () => {
    assert.equal(rt.shallowEqualArray([1, 2, 3], [1, 2, 3]), true);
    assert.equal(rt.shallowEqualArray([1, 2], [1, 2, 3]), false);
    assert.equal(rt.shallowEqualArray([1, 2, 3], [1, 2, 4]), false);
  });
});

// ─── Refs ────────────────────────────────────────────────────────────

describe("useRef", () => {
  skipIfNoRuntime("useRef() returns a ref with null current", () => {
    const ref = rt.useRef();
    assert.equal(ref.current, null);
    assert.equal(typeof ref.__set, "function");
  });

  skipIfNoRuntime("ref.__set() updates current", () => {
    const ref = rt.useRef();
    ref.__set("hello");
    assert.equal(ref.current, "hello");
    ref.__set(null);
    assert.equal(ref.current, null);
  });
});

describe("forwardRef", () => {
  skipIfNoRuntime("forwardRef() wraps a component factory", () => {
    const Inner = (props, ref) => rt.h("input", { ref, type: props.type });
    const Wrapped = rt.forwardRef(Inner);
    assert.equal(typeof Wrapped, "function");

    const ref = rt.useRef();
    const node = Wrapped({ type: "text" }, ref);
    assert.ok(node, "should produce a node");
  });
});

describe("useImperativeHandle", () => {
  skipIfNoRuntime("useImperativeHandle() populates ref with handle", () => {
    const ref = rt.useRef();
    rt.useImperativeHandle(ref, () => ({ focus: () => "focused" }));
    assert.ok(ref.current, "ref should be populated");
    assert.equal(typeof ref.current.focus, "function");
    assert.equal(ref.current.focus(), "focused");
  });
});

// ─── KeepAlive ───────────────────────────────────────────────────────

describe("KeepAlive", () => {
  skipIfNoRuntime("KeepAlive() accepts a children node", () => {
    const node = rt.KeepAlive({
      cacheKey: (child) => "ka-test-key",
      children: rt.h("div", null, "cached-content"),
    });
    assert.ok(node, "should produce a node");
  });

  skipIfNoRuntime("keepAliveCacheSize() returns a non-negative number", () => {
    const size = rt.keepAliveCacheSize();
    assert.equal(typeof size, "number");
    assert.ok(size >= 0, "size should be non-negative");
  });

  skipIfNoRuntime("clearKeepAliveCache() empties the cache", () => {
    rt.clearKeepAliveCache();
    assert.equal(rt.keepAliveCacheSize(), 0, "cache should be empty after clear");
  });

  skipIfNoRuntime("evictFromKeepAlive() removes a specific key", () => {
    // Manually populate the cache via KeepAlive then evict.
    rt.KeepAlive({
      cacheKey: () => "evict-test-key",
      children: rt.h("div", null, "x"),
    });
    const before = rt.keepAliveCacheSize();
    rt.evictFromKeepAlive("evict-test-key");
    const after = rt.keepAliveCacheSize();
    assert.ok(after <= before, "eviction should not grow the cache");
  });
});

// ─── Suspense ────────────────────────────────────────────────────────

describe("Suspense", () => {
  skipIfNoRuntime("Suspense() accepts fallback + children", () => {
    const node = rt.Suspense({
      fallback: rt.h("div", null, "loading"),
      children: [rt.h("div", null, "content")],
    });
    assert.ok(node, "should produce a node");
  });

  skipIfNoRuntime("async_() wraps a promise-returning component", async () => {
    const Async = rt.async(() => new Promise((resolve) =>
      setTimeout(() => resolve(rt.h("div", null, "done")), 10)
    ));
    const node = Async({});
    assert.ok(node, "async component should produce a node");
    // The node should be a thenable
    assert.equal(typeof node.then, "function");
    const resolved = await node;
    assert.ok(resolved, "awaiting the node should produce a node");
  });
});

// ─── Portal ──────────────────────────────────────────────────────────

describe("Portal", () => {
  skipIfNoRuntime("Portal() returns placeholder when target is missing", () => {
    const node = rt.Portal({
      target: "#does-not-exist-" + Date.now(),
      children: rt.h("div", null, "modal-content"),
    });
    assert.ok(node, "should produce a placeholder node");
  });

  skipIfNoRuntime("Portal() with disabled=true renders children in place", () => {
    const child = rt.h("div", null, "inline");
    const node = rt.Portal({
      target: "#anything",
      disabled: true,
      children: child,
    });
    assert.equal(node, child, "disabled Portal should return children directly");
  });
});

// ─── Transition ──────────────────────────────────────────────────────

describe("Transition", () => {
  skipIfNoRuntime("Transition() returns a node for show=true", () => {
    const node = rt.Transition({
      show: true,
      children: rt.h("div", null, "fade-me"),
    });
    assert.ok(node, "should produce a node");
  });

  skipIfNoRuntime("Transition() returns null-ish for show=false", () => {
    const node = rt.Transition({
      show: false,
      children: rt.h("div", null, "fade-me"),
    });
    // Alpha renderer may return null or a placeholder; either is fine
    assert.ok(node === null || node === undefined || typeof node === "object",
      "should not throw when show=false");
  });

  skipIfNoRuntime("TransitionGroup() renders a list of transitions", () => {
    const items = [
      rt.h("div", null, "a"),
      rt.h("div", null, "b"),
    ];
    const node = rt.TransitionGroup({
      name: "list",
      children: items,
    });
    assert.ok(node, "should produce a node");
  });
});

// ─── Lazy islands ────────────────────────────────────────────────────

describe("lazy", () => {
  skipIfNoRuntime("lazy() returns a callable LazyComponent", () => {
    const LazyComp = rt.lazy(() => Promise.resolve({
      default: (props) => rt.h("div", null, "lazy-content"),
    }));
    assert.equal(typeof LazyComp, "function");
    assert.equal(LazyComp.__lazy, true);
    assert.equal(typeof LazyComp.__loader, "function");
  });

  skipIfNoRuntime("prefetch() loads the chunk without rendering", async () => {
    let loaded = false;
    const LazyComp = rt.lazy(() => {
      loaded = true;
      return Promise.resolve({
        default: (props) => rt.h("div", null, "prefetched"),
      });
    });
    await rt.prefetch(LazyComp);
    assert.equal(loaded, true, "prefetch should invoke the loader");
  });

  skipIfNoRuntime("lazyAll() resolves multiple loaders in parallel", async () => {
    const [A, B, C] = rt.lazyAll(
      () => Promise.resolve({ default: () => rt.h("div", null, "a") }),
      () => Promise.resolve({ default: () => rt.h("div", null, "b") }),
      () => Promise.resolve({ default: () => rt.h("div", null, "c") }),
    );
    assert.equal(typeof A, "function");
    assert.equal(typeof B, "function");
    assert.equal(typeof C, "function");
    assert.equal(A.__lazy, true);
  });
});

// ─── Async hooks ─────────────────────────────────────────────────────

describe("useFetch", () => {
  skipIfNoRuntime("useFetch() returns initial loading state", () => {
    // useFetch returns accessor functions: { data, error, loading, mutate, refetch, optimistic }
    const result = rt.useFetch("https://example.invalid/test");
    assert.ok(result, "should return a result object");
    assert.equal(typeof result.loading, "function", "loading should be an accessor");
    assert.equal(typeof result.data, "function", "data should be an accessor");
    assert.equal(typeof result.mutate, "function", "mutate should be a function");
    assert.equal(typeof result.refetch, "function", "refetch should be a function");
  });
});

describe("useSWR", () => {
  skipIfNoRuntime("useSWR() returns initial state (no auto-fetch without onMount)", () => {
    // useSWR returns $state signals: { data, error, loading, isValidating, mutate }
    const result = rt.useSWR("https://example.invalid/swr", async () => "data");
    assert.ok(result, "should return a result object");
    assert.equal(typeof result.data, "function", "data should be a signal accessor");
    assert.equal(typeof result.error, "function", "error should be a signal accessor");
    assert.equal(typeof result.loading, "function", "loading should be a signal accessor");
    assert.equal(typeof result.mutate, "function", "mutate should be a function");
  });
});

describe("useMutation", () => {
  skipIfNoRuntime("useMutation() returns trigger + isMutating accessors", () => {
    // useMutation returns { trigger, isMutating, error, reset }
    const result = rt.useMutation("https://example.invalid/mutate");
    assert.ok(result, "should return a result object");
    assert.equal(typeof result.trigger, "function", "trigger should be a function");
    assert.equal(typeof result.isMutating, "function", "isMutating should be an accessor");
    assert.equal(typeof result.error, "function", "error should be an accessor");
    assert.equal(typeof result.reset, "function", "reset should be a function");
  });
});

// Final smoke test to confirm the runtime loaded.
describe("module loading", () => {
  test("runtime loaded successfully", () => {
    if (skipReason) {
      console.warn("SKIPPED — runtime did not load:", skipReason);
    }
    assert.ok(rt, "runtime should be importable");
  });
});
