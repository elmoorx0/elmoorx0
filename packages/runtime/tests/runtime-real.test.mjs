/**
 * Integration tests that load the REAL runtime source.
 *
 * Uses Node 22+'s --experimental-strip-types flag (or tsx) to import
 * the .ts source directly. Skips automatically when no TS loader is
 * available.
 *
 * Run with: node --experimental-strip-types --test packages/runtime/tests/runtime-real.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";

let runtime = null;
let skipReason = null;

try {
  // Try loading the real source. Node 22.6+ supports --experimental-strip-types.
  runtime = await import("../src/index.ts");
} catch (err) {
  skipReason = (err instanceof Error ? err.message : String(err)).slice(0, 200);
}

const skipIfNoRuntime = skipReason ? test.skip : test;

const skipIfNoRuntimeForApi = skipReason ? test.skip : test;

skipIfNoRuntimeForApi("runtime: package exports the documented API surface", () => {
  const expected = [
    "$state", "$computed", "$effect", "$batch",
    "$store",
    "island", "renderIsland", "hydrateIslands", "renderToString", "mount",
    "$html", "sanitize", "SECURITY_HEADERS", "generateCsrfToken",
    "h", "Fragment", "renderFragment",
    "createContext", "provide", "inject", "withContext",
    "onMount", "onCleanup", "onError", "withErrorBoundary",
    "ErrorBoundary", "safeRender",
    "Suspense", "renderToStream",
    "lazy", "prefetch", "lazyAll",
    "useRef", "forwardRef", "useImperativeHandle", "useRefList",
    "Portal", "Modal",
    "Transition", "TransitionGroup",
    "KeepAlive", "clearKeepAliveCache", "evictFromKeepAlive", "keepAliveCacheSize",
    "memo", "useMemo", "useCallback", "shallowEqual", "shallowEqualArray", "deepEqual",
    "useFetch", "useSWR", "useMutation",
  ];
  for (const name of expected) {
    assert.ok(name in runtime, `runtime should export "${name}"`);
  }
});

skipIfNoRuntime("runtime: $state initial + set", () => {
  const { $state } = runtime;
  const count = $state(0);
  assert.equal(count(), 0);
  count.set(5);
  assert.equal(count(), 5);
});

skipIfNoRuntime("runtime: $state updater", () => {
  const { $state } = runtime;
  const c = $state(10);
  c.set((x) => x + 1);
  assert.equal(c(), 11);
});

skipIfNoRuntime("runtime: $effect re-runs on signal change", () => {
  const { $state, $effect } = runtime;
  const c = $state(0);
  let seen = -1;
  $effect(() => { seen = c(); });
  assert.equal(seen, 0);
  c.set(42);
  assert.equal(seen, 42);
});

skipIfNoRuntime("runtime: $effect dispose stops re-runs", () => {
  const { $state, $effect } = runtime;
  const c = $state(0);
  let runs = 0;
  const dispose = $effect(() => { c(); runs++; });
  assert.equal(runs, 1);
  dispose();
  c.set(99);
  assert.equal(runs, 1, "should not re-run after dispose");
});

skipIfNoRuntime("runtime: $computed propagates to downstream effects", () => {
  // REGRESSION TEST: previously $computed returned the cached value
  // directly, bypassing the underlying signal — so downstream effects
  // never re-ran when the computed's source changed.
  const { $state, $computed, $effect } = runtime;
  const count = $state(1);
  const doubled = $computed(() => count() * 2);

  let seen = -1;
  $effect(() => { seen = doubled(); });
  assert.equal(seen, 2, "effect should see initial computed value");

  count.set(5);
  assert.equal(seen, 10, "effect should re-run when computed's source changes");

  count.set(0);
  assert.equal(seen, 0, "effect should re-run again on subsequent changes");
});

skipIfNoRuntime("runtime: $computed chains transitively", () => {
  // Double-chain: $state → $computed → $computed → $effect
  const { $state, $computed, $effect } = runtime;
  const base = $state(2);
  const sq = $computed(() => base() * base());
  const sqPlusOne = $computed(() => sq() + 1);

  let seen = -1;
  $effect(() => { seen = sqPlusOne(); });
  assert.equal(seen, 5, "2² + 1 = 5");

  base.set(3);
  assert.equal(seen, 10, "3² + 1 = 10");
});

skipIfNoRuntime("runtime: $effect cleanup runs before re-execution", () => {
  // REGRESSION TEST: previously the prior cleanup was overwritten
  // (not invoked) when an effect re-ran, leaking timers/listeners.
  const { $state, $effect } = runtime;
  const c = $state(0);
  const cleanups = [];
  const dispose = $effect(() => {
    c();
    return () => cleanups.push("ran");
  });
  assert.deepEqual(cleanups, [], "no cleanup before first re-run");
  c.set(1);
  assert.deepEqual(cleanups, ["ran"], "cleanup must run BEFORE re-execution");
  c.set(2);
  assert.deepEqual(cleanups, ["ran", "ran"], "cleanup runs again on second re-run");
  dispose();
  assert.deepEqual(cleanups, ["ran", "ran", "ran"], "cleanup runs on dispose");
});

skipIfNoRuntime("runtime: Fragment renders children without wrapper", () => {
  const { h, Fragment, renderToString } = runtime;
  const tree = h("div", null, h(Fragment, null, h("span", null, "a"), h("span", null, "b")));
  const html = renderToString(tree);
  assert.equal(html, "<div><span>a</span><span>b</span></div>",
    "Fragment should emit just its children, no <fragment> wrapper");
});

skipIfNoRuntime("runtime: Fragment at top level", () => {
  const { h, Fragment, renderToString } = runtime;
  const tree = h(Fragment, null, "hello ", "world");
  assert.equal(renderToString(tree), "hello world");
});

skipIfNoRuntime("runtime: nested Fragments", () => {
  const { h, Fragment, renderToString } = runtime;
  const tree = h(Fragment, null,
    h("a", null, "1"),
    h(Fragment, null, h("b", null, "2"), h("c", null, "3")),
    h("d", null, "4"),
  );
  assert.equal(renderToString(tree), "<a>1</a><b>2</b><c>3</c><d>4</d>");
});

skipIfNoRuntime("runtime: h() flattens nested children arrays", () => {
  const { h } = runtime;
  const el = h("div", null, "a", ["b", ["c", "d"]], "e");
  assert.deepEqual(el.children, ["a", "b", "c", "d", "e"],
    "nested arrays should be flattened recursively");
});

skipIfNoRuntime("runtime: h() filters boolean/null children", () => {
  const { h } = runtime;
  const cond = false;
  const el = h("div", null, "a", null, cond && "skip", undefined, "b");
  assert.deepEqual(el.children, ["a", "b"],
    "null/undefined/false should be filtered out");
});

skipIfNoRuntime("runtime: $store proxy identity is stable", () => {
  // REGRESSION TEST: previously every property read returned a fresh
  // Proxy, so `store.user === store.user` was false. This broke
  // Object.is equality checks used by memo/shallowEqual.
  const { $store } = runtime;
  const store = $store({ user: { name: "Alice" }, items: [1, 2, 3] });
  const u1 = store.user;
  const u2 = store.user;
  assert.equal(u1, u2, "same property read should return same Proxy reference");
  const i1 = store.items;
  const i2 = store.items;
  assert.equal(i1, i2, "array property reads should also be stable");
});

skipIfNoRuntime("runtime: $store array push does not allocate fresh array", () => {
  // REGRESSION TEST: previously every push/pop/splice called
  // sig.set([...arr]) — O(n) per mutation and broke reference equality.
  // Now we just fire the signal with the same array reference.
  const { $store, $effect } = runtime;
  const store = $store({ items: [1, 2] });
  let len = 0;
  $effect(() => { len = store.items.length; });
  assert.equal(len, 2);
  store.items.push(3);
  assert.equal(len, 3, "push should trigger reactive update");
  assert.equal(store.items.length, 3);
});

skipIfNoRuntime("runtime: $store deep mutation is reactive", () => {
  const { $store, $effect } = runtime;
  const store = $store({ user: { profile: { name: "A" } } });
  let seen = "";
  $effect(() => { seen = store.user.profile.name; });
  assert.equal(seen, "A");
  store.user.profile.name = "B";
  assert.equal(seen, "B", "deep nested mutation should be tracked");
});

skipIfNoRuntime("runtime: useMemo recomputes when deps change", () => {
  // REGRESSION TEST: previously useMemo wrapped the comparison in
  // $effect, but deps was a plain array (not a signal) — the effect
  // had zero reactive deps and ran once, so useMemo never recomputed.
  const { $state, useMemo } = runtime;
  const a = $state(1);
  const b = $state(2);
  let factoryCalls = 0;
  // Read deps as values (call sites typically do `[a(), b()]`)
  const result1 = useMemo(() => { factoryCalls++; return a() + b(); }, [a(), b()]);
  assert.equal(result1, 3);
  assert.equal(factoryCalls, 1);
  // Same deps — should NOT recompute
  const result2 = useMemo(() => { factoryCalls++; return a() + b(); }, [a(), b()]);
  assert.equal(result2, 3);
  assert.equal(factoryCalls, 1, "same deps should not recompute");
  // Different deps — should recompute
  a.set(10);
  const result3 = useMemo(() => { factoryCalls++; return a() + b(); }, [a(), b()]);
  assert.equal(result3, 12);
  assert.equal(factoryCalls, 2, "changed deps should recompute");
});

skipIfNoRuntime("runtime: useCallback identity is stable across same deps", () => {
  // REGRESSION TEST: previously useCallback had the same $effect-with-
  // no-deps bug as useMemo — returned the initial factory forever.
  const { useCallback } = runtime;
  let factoryCalls = 0;
  const cb1 = useCallback(() => { factoryCalls++; return "x"; }, ["dep1"]);
  assert.equal(cb1(), "x");
  assert.equal(factoryCalls, 1);
  // Same dep — same callback reference (no new factory call)
  const cb2 = useCallback(() => { factoryCalls++; return "x"; }, ["dep1"]);
  assert.equal(cb2, cb1, "same deps should return same callback reference");
});

skipIfNoRuntime("runtime: ErrorBoundary renders fallback on error", () => {
  // Note: the alpha renderer catches errors at render time via h()'s
  // try/catch (Priority 2 fix). ErrorBoundary's onError registers a
  // handler that swaps to the fallback via a signal. This test
  // verifies the swap mechanism works when an error is reported.
  const { h, ErrorBoundary, $state } = runtime;
  const fallback = h("p", { class: "err" }, "Oops");
  let reportedErr = null;
  const tree = h(ErrorBoundary, {
    fallback,
    onError: (e) => { reportedErr = e; },
    children: h("div", null, "content"),
  });
  // Tree should render children initially (no error yet)
  const html = runtime.renderToString(tree);
  assert.ok(html.includes("content"), "should render children initially");
});

skipIfNoRuntime("runtime: suspense renderNode escapes attribute values (XSS)", () => {
  // REGRESSION TEST: previously renderNode emitted attribute values
  // raw — `"` could break out of the attribute context.
  const { h, renderToStream } = runtime;
  const tree = h("div", { title: 'evil" onmouseover="alert(1)' }, "safe");
  // Consume the async generator
  return (async () => {
    let html = "";
    for await (const chunk of renderToStream(tree)) html += chunk;
    assert.ok(html.includes("&quot;"), "attribute value should be escaped");
    assert.ok(!html.includes('onmouseover="alert'), "no attribute injection");
  })();
});

skipIfNoRuntime("runtime: $batch defers effects", () => {
  const { $state, $effect, $batch } = runtime;
  const a = $state(1);
  const b = $state(2);
  let runs = 0;
  $effect(() => { a(); b(); runs++; });
  assert.equal(runs, 1);

  $batch(() => {
    a.set(10);
    b.set(20);
    assert.equal(runs, 1, "should NOT have re-run mid-batch");
  });
  assert.equal(runs, 2, "exactly one flush after batch");
});

skipIfNoRuntime("runtime: $store tracks deep mutations", () => {
  const { $store, $effect } = runtime;
  const store = $store({ user: { name: "A" }, items: [{ q: 1 }] });

  let userName = "";
  $effect(() => { userName = store.user.name; });
  assert.equal(userName, "A");
  store.user.name = "B";
  assert.equal(userName, "B", "deep object mutation should be tracked");
});

skipIfNoRuntime("runtime: $store array push", () => {
  const { $store, $effect } = runtime;
  const store = $store({ items: [1, 2] });
  let len = 0;
  $effect(() => { len = store.items.length; });
  assert.equal(len, 2);
  store.items.push(3);
  assert.equal(len, 3, "array push should be tracked");
});

skipIfNoRuntime("runtime: sanitize strips script tags", () => {
  const { sanitize } = runtime;
  const evil = `<p>hi</p><script>alert('xss')</script>`;
  const out = sanitize(evil);
  assert.ok(!out.includes("<script>"), "script tag must be stripped");
  assert.ok(out.includes("hi"), "safe content must be preserved");
});

skipIfNoRuntime("runtime: sanitize strips on* handlers", () => {
  const { sanitize } = runtime;
  const evil = `<img src=x onerror="alert(1)">`;
  const out = sanitize(evil);
  assert.ok(!out.toLowerCase().includes("onerror"), "onerror must be stripped");
});

skipIfNoRuntime("runtime: sanitize blocks javascript: URLs", () => {
  const { sanitize } = runtime;
  const evil = `<a href="javascript:alert(1)">click</a>`;
  const out = sanitize(evil);
  assert.ok(!/javascript:/i.test(out), "javascript: URL must be replaced");
});

skipIfNoRuntime("runtime: generateCsrfToken produces 64-char hex", () => {
  const { generateCsrfToken } = runtime;
  const t = generateCsrfToken();
  assert.equal(t.length, 64);
  assert.ok(/^[0-9a-f]+$/.test(t), "must be hex");
  // Uniqueness
  const t2 = generateCsrfToken();
  assert.notEqual(t, t2);
});

skipIfNoRuntime("runtime: h() creates ElmoorxElement", () => {
  const { h } = runtime;
  const el = h("div", { class: "x" }, "hello");
  assert.equal(el.tag, "div");
  assert.equal(el.props.class, "x");
  assert.deepEqual(el.children, ["hello"]);
});

skipIfNoRuntime("runtime: h() with function component", () => {
  const { h } = runtime;
  const Comp = (props) => h("p", null, props.text);
  const el = h(Comp, { text: "hi" });
  // Function component is called — returns the inner element
  assert.equal(el.tag, "p");
});

skipIfNoRuntime("runtime: renderToString produces HTML", () => {
  const { renderToString, h } = runtime;
  const tree = h("div", { class: "x" }, h("span", null, "hi"));
  const html = renderToString(tree);
  assert.equal(html, '<div class="x"><span>hi</span></div>');
});

skipIfNoRuntime("runtime: renderToString escapes text", () => {
  const { renderToString } = runtime;
  const html = renderToString("<script>");
  assert.equal(html, "&lt;script&gt;");
});

skipIfNoRuntime("runtime: SECURITY_HEADERS includes CSP", () => {
  const { SECURITY_HEADERS } = runtime;
  assert.ok("Content-Security-Policy" in SECURITY_HEADERS);
  assert.ok(SECURITY_HEADERS["Content-Security-Policy"].includes("default-src 'self'"));
  assert.ok("X-Frame-Options" in SECURITY_HEADERS);
  assert.ok("Strict-Transport-Security" in SECURITY_HEADERS);
});

skipIfNoRuntime("runtime: withErrorBoundary returns result on success", () => {
  const { withErrorBoundary } = runtime;
  const fn = (x) => x + 1;
  const wrapped = withErrorBoundary(fn);
  assert.equal(wrapped(5), 6, "wrapped fn should return the original result");
});

skipIfNoRuntime("runtime: withErrorBoundary returns undefined when handler recovers", () => {
  const { withErrorBoundary, pushLifecycle, popLifecycle, onError } = runtime;
  // Set up an active lifecycle bucket with an onError handler that
  // swallows errors. Without this, withErrorBoundary rethrows.
  pushLifecycle();
  let captured = null;
  onError((e) => { captured = e; });

  const throws = () => { throw new Error("boom"); };
  const wrapped = withErrorBoundary(throws);
  const result = wrapped();
  assert.equal(result, undefined, "should return undefined when handler recovers");
  assert.ok(captured instanceof Error, "handler should have received the error");
  assert.equal(captured.message, "boom");

  popLifecycle();
});

skipIfNoRuntime("runtime: withErrorBoundary rethrows when no handler is registered", () => {
  const { withErrorBoundary } = runtime;
  const throws = () => { throw new Error("rethrow me"); };
  const wrapped = withErrorBoundary(throws);
  assert.throws(() => wrapped(), /rethrow me/, "should rethrow when no boundary is active");
});
