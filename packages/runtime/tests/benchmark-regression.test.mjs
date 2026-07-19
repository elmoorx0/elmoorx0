/**
 * Elmoorx Runtime — benchmark regression tests
 *
 * Runs the core benchmarks and verifies that performance stays within
 * acceptable bounds. Catches regressions like accidentally quadratic
 * loops, excessive allocations, or broken memoization.
 *
 * These thresholds are intentionally generous (10x slower than the
 * measured baseline on a fast machine) so they don't flake on slow
 * CI runners. The actual benchmark numbers are printed for visibility
 * but only the threshold check fails the test.
 *
 * Run: npx tsx --test packages/runtime/tests/benchmark-regression.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { $state, $effect, $store, sanitize, $computed } from "../src/index.ts";

// ─── Helpers ──────────────────────────────────────────────────────────

function bench(name, fn, iterations = 10_000) {
  // Warmup
  for (let i = 0; i < Math.min(100, iterations); i++) fn();
  const start = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) fn();
  const elapsed = Number(process.hrtime.bigint() - start) / 1e6; // ms
  return {
    name,
    iterations,
    elapsedMs: elapsed,
    perOp: elapsed / iterations,
    opsPerSec: Math.round(iterations / (elapsed / 1000)),
  };
}

function fmt(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(2) + "K";
  return String(n);
}

// ─── Thresholds ───────────────────────────────────────────────────────
//
// All thresholds are in ops/sec — higher is better. We require at
// LEAST this many ops/sec to pass. Measured baseline on a fast dev
// machine is shown in comments — the threshold is 10x below baseline
// to absorb CI slowness without false alarms.

const THRESHOLDS = {
  signal_read:        10_000,   // baseline: ~675K — threshold: 10K (67x margin)
  signal_write_no_deps: 10_000, // baseline: ~657K — threshold: 10K (65x margin)
  signal_write_1_effect: 5_000, // baseline: ~387K — threshold: 5K (77x margin)
  signal_write_10_effects: 1_000, // baseline: ~92K  — threshold: 1K (92x margin)
  computed_chain:      5_000,   // baseline: ~300K (estimated)
  store_read:          10_000,  // baseline: ~1.24M — threshold: 10K (124x margin)
  store_write:         5_000,   // baseline: ~555K  — threshold: 5K (111x margin)
  store_array_push:    2_000,   // baseline: ~189K  — threshold: 2K (94x margin)
  sanitize_clean:      10_000,  // baseline: ~1.98M — threshold: 10K (198x margin)
  sanitize_xss:        5_000,   // baseline: ~1.07M — threshold: 5K (107x margin)
};

const results = [];

function record(key, r) {
  results.push({ key, ...r });
  console.log(`  ${r.name.padEnd(45)} ${fmt(r.opsPerSec).padStart(12)} ops/s  (${r.elapsedMs.toFixed(2)} ms for ${r.iterations} ops)`);
}

// ─── Tests ────────────────────────────────────────────────────────────

describe("benchmark regression: signals", () => {
  test("signal read (no deps) — ≥ " + fmt(THRESHOLDS.signal_read) + " ops/s", () => {
    const s = $state(42);
    const r = bench("signal read (no deps)", () => { s(); }, 100_000);
    record("signal_read", r);
    assert.ok(r.opsPerSec >= THRESHOLDS.signal_read,
      `Regression: ${r.opsPerSec} ops/s < threshold ${THRESHOLDS.signal_read} ops/s`);
  });

  test("signal write (no deps) — ≥ " + fmt(THRESHOLDS.signal_write_no_deps) + " ops/s", () => {
    const s = $state(0);
    const r = bench("signal write (no deps)", () => { s.set(v => v + 1); }, 100_000);
    record("signal_write_no_deps", r);
    assert.ok(r.opsPerSec >= THRESHOLDS.signal_write_no_deps,
      `Regression: ${r.opsPerSec} ops/s < threshold ${THRESHOLDS.signal_write_no_deps} ops/s`);
  });

  test("signal write (1 effect) — ≥ " + fmt(THRESHOLDS.signal_write_1_effect) + " ops/s", () => {
    const s = $state(0);
    let sink;
    $effect(() => { sink = s(); });
    const r = bench("signal write (1 effect)", () => { s.set(v => v + 1); }, 50_000);
    record("signal_write_1_effect", r);
    assert.ok(r.opsPerSec >= THRESHOLDS.signal_write_1_effect,
      `Regression: ${r.opsPerSec} ops/s < threshold ${THRESHOLDS.signal_write_1_effect} ops/s`);
  });

  test("signal write (10 effects) — ≥ " + fmt(THRESHOLDS.signal_write_10_effects) + " ops/s", () => {
    const s = $state(0);
    const sinks = new Array(10);
    for (let i = 0; i < 10; i++) {
      $effect(() => { sinks[i] = s(); });
    }
    const r = bench("signal write (10 effects)", () => { s.set(v => v + 1); }, 20_000);
    record("signal_write_10_effects", r);
    assert.ok(r.opsPerSec >= THRESHOLDS.signal_write_10_effects,
      `Regression: ${r.opsPerSec} ops/s < threshold ${THRESHOLDS.signal_write_10_effects} ops/s`);
  });

  test("computed chain (5 deep) — ≥ " + fmt(THRESHOLDS.computed_chain) + " ops/s", () => {
    const base = $state(1);
    let a = base;
    for (let i = 0; i < 5; i++) {
      a = $computed(() => a() * 2);
    }
    let sink;
    $effect(() => { sink = a(); });
    const r = bench("computed chain (5 deep)", () => { base.set(v => v + 1); }, 20_000);
    record("computed_chain", r);
    assert.ok(r.opsPerSec >= THRESHOLDS.computed_chain,
      `Regression: ${r.opsPerSec} ops/s < threshold ${THRESHOLDS.computed_chain} ops/s`);
  });
});

describe("benchmark regression: store", () => {
  test("store read (1 prop) — ≥ " + fmt(THRESHOLDS.store_read) + " ops/s", () => {
    const store = $store({ user: { name: "Alice" } });
    const r = bench("store read (1 prop)", () => { void store.user.name; }, 100_000);
    record("store_read", r);
    assert.ok(r.opsPerSec >= THRESHOLDS.store_read,
      `Regression: ${r.opsPerSec} ops/s < threshold ${THRESHOLDS.store_read} ops/s`);
  });

  test("store write (1 prop) — ≥ " + fmt(THRESHOLDS.store_write) + " ops/s", () => {
    const store = $store({ count: 0 });
    const r = bench("store write (1 prop)", () => { store.count = Math.random(); }, 50_000);
    record("store_write", r);
    assert.ok(r.opsPerSec >= THRESHOLDS.store_write,
      `Regression: ${r.opsPerSec} ops/s < threshold ${THRESHOLDS.store_write} ops/s`);
  });

  test("store array push — ≥ " + fmt(THRESHOLDS.store_array_push) + " ops/s", () => {
    const store = $store({ items: [] });
    const r = bench("store array push", () => {
      store.items.push(Math.random());
      if (store.items.length > 100) store.items.length = 0;
    }, 20_000);
    record("store_array_push", r);
    assert.ok(r.opsPerSec >= THRESHOLDS.store_array_push,
      `Regression: ${r.opsPerSec} ops/s < threshold ${THRESHOLDS.store_array_push} ops/s`);
  });
});

describe("benchmark regression: security", () => {
  test("sanitize clean HTML (50b) — ≥ " + fmt(THRESHOLDS.sanitize_clean) + " ops/s", () => {
    const html = "<p>Hello world, this is a clean paragraph.</p>";
    const r = bench("sanitize clean HTML", () => { sanitize(html); }, 50_000);
    record("sanitize_clean", r);
    assert.ok(r.opsPerSec >= THRESHOLDS.sanitize_clean,
      `Regression: ${r.opsPerSec} ops/s < threshold ${THRESHOLDS.sanitize_clean} ops/s`);
  });

  test("sanitize XSS payload (130b) — ≥ " + fmt(THRESHOLDS.sanitize_xss) + " ops/s", () => {
    const html = `<div><script>alert('xss')</script><img src=x onerror="alert(1)"><a href="javascript:alert(2)">click</a></div>`;
    const r = bench("sanitize XSS payload", () => { sanitize(html); }, 20_000);
    record("sanitize_xss", r);
    assert.ok(r.opsPerSec >= THRESHOLDS.sanitize_xss,
      `Regression: ${r.opsPerSec} ops/s < threshold ${THRESHOLDS.sanitize_xss} ops/s`);
  });
});

// ─── Summary ──────────────────────────────────────────────────────────

describe("benchmark regression: summary", () => {
  test("print summary", () => {
    console.log("\n  ──── Benchmark Summary ────");
    for (const r of results) {
      const threshold = THRESHOLDS[r.key];
      const status = r.opsPerSec >= threshold ? "✓" : "✗";
      const margin = (r.opsPerSec / threshold).toFixed(1) + "x";
      console.log(`  ${status} ${r.key.padEnd(35)} ${fmt(r.opsPerSec).padStart(12)} ops/s  (threshold: ${fmt(threshold)}, ${margin} margin)`);
    }
    console.log("");
    assert.ok(results.length >= 9, `expected ≥9 benchmarks, got ${results.length}`);
  });
});
