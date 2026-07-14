#!/usr/bin/env node
/**
 * Elmoorx Benchmark Suite
 * ============================================
 * Measures real performance of the Elmoorx runtime.
 * Run: node scripts/benchmark.js
 */

import { gzipSync } from "node:zlib";
import { RUNTIME_SOURCE_MINIFIED } from "./runtime-source.js";

console.log("\n  Elmoorx Framework — Benchmark Suite\n  " + "═".repeat(50) + "\n");

// ============ Inline runtime ============
let activeObserver = null;
function $state(initial) {
  const deps = new Set();
  let value = initial;
  const read = () => {
    if (activeObserver) deps.add(activeObserver);
    return value;
  };
  read.set = (next) => {
    const resolved = typeof next === "function" ? next(value) : next;
    if (Object.is(resolved, value)) return;
    value = resolved;
    for (const dep of [...deps]) dep();
  };
  return read;
}

function $effect(fn) {
  const run = () => {
    const prev = activeObserver;
    activeObserver = run;
    try { fn(); } finally { activeObserver = prev; }
  };
  run();
}

function $store(initial) {
  const signals = new Map();
  const getSignal = (path, current) => {
    let s = signals.get(path);
    if (!s) { s = $state(current); signals.set(path, s); }
    return s;
  };
  return new Proxy(initial, {
    get(target, prop, receiver) {
      if (typeof prop === "symbol") return Reflect.get(target, prop, receiver);
      const value = Reflect.get(target, prop, receiver);
      const sig = getSignal(prop, value);
      sig();
      if (Array.isArray(value)) {
        return new Proxy(value, {
          get(arr, p, r) {
            if (["push","pop","shift","unshift","splice"].includes(p)) {
              const orig = arr[p].bind(arr);
              return (...args) => {
                const res = orig(...args);
                getSignal(prop, arr).set([...arr]);
                return res;
              };
            }
            return Reflect.get(arr, p, r);
          },
          set(arr, p, v, r) {
            const ok = Reflect.set(arr, p, v, r);
            if (p !== "length") getSignal(prop, arr).set([...arr]);
            return ok;
          }
        });
      }
      return value;
    },
    set(target, prop, value, receiver) {
      const prev = Reflect.get(target, prop, receiver);
      const ok = Reflect.set(target, prop, value, receiver);
      if (!Object.is(prev, value)) getSignal(prop, value).set(value);
      return ok;
    }
  });
}

function sanitize(input) {
  let s = input.replace(/<script[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<(iframe|object|embed|style|link|meta)[\s\S]*?<\/\1>/gi, "");
  s = s.replace(/<(iframe|object|embed|style|link|meta)[^>]*\/?>/gi, "");
  s = s.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  s = s.replace(/(href|src)\s*=\s*("javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi, '$1="#"');
  return s;
}

// ============ Helpers ============
function bench(name, fn, iterations = 1000) {
  for (let i = 0; i < 100; i++) fn();
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const t1 = performance.now();
  const totalMs = t1 - t0;
  const perOp = totalMs / iterations;
  const opsPerSec = Math.round(iterations / (totalMs / 1000));
  console.log("  " + name.padEnd(40) + " " + perOp.toFixed(4).padStart(10) + " ms  " + formatOps(opsPerSec).padStart(15) + " ops/s");
  return { name, perOp, opsPerSec };
}

function formatOps(n) {
  if (n > 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n > 1_000) return (n / 1_000).toFixed(2) + "K";
  return String(n);
}

const results = [];

// ============ Signal benchmarks ============
console.log("  Signals:");
console.log("  " + "─".repeat(80));

results.push(bench("signal read (no deps)", () => {
  const s = $state(42);
  s();
}));

results.push(bench("signal write (no deps)", () => {
  const s = $state(0);
  s.set(1);
}));

results.push(bench("signal write (1 effect)", () => {
  const s = $state(0);
  $effect(() => s());
  s.set(1);
}));

results.push(bench("signal write (10 effects)", () => {
  const s = $state(0);
  for (let i = 0; i < 10; i++) $effect(() => s());
  s.set(1);
}));

results.push(bench("signal write (100 effects)", () => {
  const s = $state(0);
  for (let i = 0; i < 100; i++) $effect(() => s());
  s.set(1);
}, 100));

// ============ Store benchmarks ============
console.log("\n  Store:");
console.log("  " + "─".repeat(80));

results.push(bench("store read (1 prop)", () => {
  const store = $store({ a: 1, b: 2, c: 3 });
  store.a;
}));

results.push(bench("store write (1 prop)", () => {
  const store = $store({ a: 1, b: 2, c: 3 });
  store.a = 99;
}));

results.push(bench("store array push", () => {
  const store = $store({ items: [] });
  store.items.push(1);
}));

results.push(bench("store array push (10 items)", () => {
  const store = $store({ items: [] });
  for (let i = 0; i < 10; i++) store.items.push(i);
}, 1000));

// ============ Sanitization ============
console.log("\n  Security:");
console.log("  " + "─".repeat(80));

const cleanInput = "<p>Hello world, this is a <b>safe</b> HTML snippet with <i>some</i> formatting.</p>";
const xssInput = '<script>alert("xss")</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">click</a><iframe src="evil.com"></iframe>Hello';

results.push(bench("sanitize clean HTML (50b)", () => {
  sanitize(cleanInput);
}));

results.push(bench("sanitize XSS payload (130b)", () => {
  sanitize(xssInput);
}));

results.push(bench("sanitize 10kb input", () => {
  sanitize(cleanInput.repeat(200));
}, 100));

// ============ Bundle size ============
console.log("\n  Bundle Size:");
console.log("  " + "─".repeat(80));

const runtimeSource = RUNTIME_SOURCE_MINIFIED;
const minified = runtimeSource.length;
const gzipped = gzipSync(Buffer.from(runtimeSource)).length;

console.log("  " + "Runtime source (minified)".padEnd(40) + " " + String(minified).padStart(10) + " bytes");
console.log("  " + "Runtime source (gzipped)".padEnd(40) + " " + String(gzipped).padStart(10) + " bytes  (" + (gzipped/1024).toFixed(2) + " kb)");
// Removed fabricated React comparison (hardcoded 45000 bytes + "X% smaller").
// Priority 4 removed these from README; this script was missed.

// ============ Summary ============
console.log("\n  " + "═".repeat(50));
console.log("  Summary:\n");
console.log("  Total benchmarks: " + results.length);
console.log("  Fastest op:       " + Math.min(...results.map(r => r.perOp)).toFixed(6) + " ms");
console.log("  Throughput peak:  " + formatOps(Math.max(...results.map(r => r.opsPerSec))) + " ops/s");
console.log("  Bundle size:      " + (gzipped/1024).toFixed(2) + " kb gzipped\n");
// Removed "vs React: X% smaller" — fabricated comparison.
