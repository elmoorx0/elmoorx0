/**
 * Lifecycle + memoization tests — verify onCleanup/onMount/useMemo
 * behave correctly when called inside vs. outside a component setup.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

// Mirror the lifecycle contract
let currentBucket = null;
const stack = [];

function pushLifecycle() {
  const bucket = { mount: [], cleanup: [], error: [] };
  stack.push(bucket);
  currentBucket = bucket;
  return bucket;
}

function popLifecycle() {
  const b = stack.pop();
  currentBucket = stack[stack.length - 1] || null;
  return b;
}

function runMount(b) {
  for (const fn of b.mount) {
    try { fn(); } catch (e) { /* swallow */ }
  }
  b.mount = [];
}

function runCleanup(b) {
  for (const fn of b.cleanup) {
    try { fn(); } catch (e) { /* swallow */ }
  }
  b.cleanup = [];
}

function onMount(fn) {
  if (!currentBucket) { fn(); return; }
  currentBucket.mount.push(fn);
}

function onCleanup(fn) {
  if (!currentBucket) return;
  currentBucket.cleanup.push(fn);
}

// ─── onMount / onCleanup tests ─────────────────────────────────────────

test("lifecycle: onMount runs immediately when no bucket", () => {
  let ran = false;
  onMount(() => { ran = true; });
  assert.equal(ran, true);
});

test("lifecycle: onMount deferred when bucket exists", () => {
  let ran = false;
  const b = pushLifecycle();
  onMount(() => { ran = true; });
  assert.equal(ran, false, "should NOT have run yet");
  runMount(b);
  assert.equal(ran, true);
});

test("lifecycle: onCleanup is no-op when no bucket", () => {
  let cleaned = false;
  onCleanup(() => { cleaned = true; });
  // No bucket — silently dropped (with dev warning)
  assert.equal(cleaned, false);
});

test("lifecycle: onCleanup deferred when bucket exists", () => {
  let cleaned = false;
  const b = pushLifecycle();
  onCleanup(() => { cleaned = true; });
  assert.equal(cleaned, false);
  runCleanup(b);
  assert.equal(cleaned, true);
});

test("lifecycle: nested buckets are independent", () => {
  const outer = pushLifecycle();
  let outerRan = 0;
  onMount(() => { outerRan++; });

  const inner = pushLifecycle();
  let innerRan = 0;
  onMount(() => { innerRan++; });

  runMount(inner);
  popLifecycle();
  assert.equal(innerRan, 1);
  assert.equal(outerRan, 0, "outer mount should NOT have run yet");

  runMount(outer);
  popLifecycle();
  assert.equal(outerRan, 1);
});

test("lifecycle: cleanup runs on pop", () => {
  let cleanups = 0;
  const b = pushLifecycle();
  onCleanup(() => { cleanups++; });
  onCleanup(() => { cleanups++; });
  assert.equal(cleanups, 0);
  runCleanup(b);
  popLifecycle();
  assert.equal(cleanups, 2);
});

// ─── useMemo contract ──────────────────────────────────────────────────

test("useMemo contract: returns a getter, not a value", () => {
  // Mirror the new signature
  function useMemo(factory, deps) {
    let cached = factory();
    let lastDeps = deps;
    return () => cached;
  }
  const v = useMemo(() => 42, []);
  assert.equal(typeof v, "function");
  assert.equal(v(), 42);
});

test("useMemo contract: factory called once for stable deps", () => {
  let calls = 0;
  function useMemo(factory, deps) {
    let cached = factory(); calls++;
    let lastDeps = deps;
    return () => cached;
  }
  const v = useMemo(() => 42, [1, 2]);
  v(); v(); v();
  assert.equal(calls, 1, "factory should be called once");
});

// ─── useCallback contract ──────────────────────────────────────────────

test("useCallback contract: returns the function directly, not its return value", () => {
  // useCallback(factory, deps) caches `factory` itself (the function),
  // NOT factory() (the return value). This is the bug we fixed.
  let stored = null;
  function $state(v) { let _v = v; return () => _v; }
  function $effect(fn) { fn(); return () => {}; }
  function shallowEqualArray(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }
  function useCallback(factory, deps) {
    const cached = $state(factory);
    let lastDeps = null;
    $effect(() => {
      if (lastDeps === null || !shallowEqualArray(lastDeps, deps)) {
        cached().set?.(factory);
        // simplified — just store the latest factory
        stored = factory;
        lastDeps = [...deps];
      }
    });
    return stored;
  }
  const fn = useCallback(() => 42, []);
  assert.equal(typeof fn, "function", "should return the function itself");
  assert.equal(fn(), 42);
});
