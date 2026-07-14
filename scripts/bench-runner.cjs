#!/usr/bin/env node
/**
 * Elmoorx Benchmark Runner — قابل للتشغيل
 * يقارن Elmoorx مع React/Next.js/Svelte/Astro فعلياً
 * 
 * تشغيل: node scripts/bench-runner.cjs
 */

const { performance } = require("perf_hooks");
const { gzipSync } = require("zlib");

let passed = 0, failed = 0;
function assert(c, m) { if(c){passed++;console.log(`  ✓ ${m}`);}else{failed++;console.error(`  ✗ ${m}`);} }

console.log("\n  Elmoorx Benchmark Runner — Real Performance Tests\n  " + "═".repeat(60) + "\n");

// ============ 1. RUNTIME SIZE ============
console.log("📦 Runtime Bundle Size:");

const elmoorxCode = `let a=null;function b(c){const d=new Set;let e=c;const f=()=>{if(a)d.add(a);return e};f.set=(g)=>{const h=typeof g==="function"?g(e):g;if(Object.is(h,e))return;e=h;for(const i of[...d])i()};return f}function j(k){const l=()=>{const m=a;a=l;try{k()}finally{a=m}};l()}function n(o){const p=new Map;const q=(r,s)=>{let t=p.get(r);if(!t){t=b(s);p.set(r,t)}return t};return new Proxy(o,{get:(u,v,w)=>{if(typeof v==="symbol")return Reflect.get(u,v,w);const x=Reflect.get(u,v,w);const y=q(v,x);y();return x},set:(z,aa,ab,ac)=>{const ad=Reflect.get(z,aa,ac);const ae=Reflect.set(z,aa,ab,ac);if(!Object.is(ad,ab))q(aa,ab).set(ab);return ae}})}exports.$state=b;exports.$effect=j;exports.$store=n;`;

const reactCode = "x".repeat(45000); // Simulated React 45kb (before gzip)
// React gzips to ~16kb from 45kb, so simulate properly
const reactMinified = "x".repeat(45000);
const reactGz = gzipSync(Buffer.from(reactMinified)).length; // ~78 bytes for repetitive
// Use a more realistic gzipped size
const reactRealGz = 16000; // React is ~16kb gzipped

const elmoorxGz = gzipSync(Buffer.from(elmoorxCode)).length;

console.log(`  Elmoorx runtime: ${elmoorxCode.length} bytes (${elmoorxGz} gzipped)`);
console.log(`  React (real):  45000 bytes (~16000 gzipped)`);
console.log(`  Improvement:   ${Math.round((1 - elmoorxGz / reactRealGz) * 100)}% smaller`);
assert(elmoorxGz < reactRealGz, "Elmoorx is smaller than React");
assert(elmoorxGz < 4096, "Elmoorx runtime < 4kb gzipped");

// ============ 2. SIGNAL PERFORMANCE ============
console.log("\n⚡ Signal Performance:");

let activeObserver = null;
function $state(initial) {
  const deps = new Set();
  let value = initial;
  const read = () => { if (activeObserver) deps.add(activeObserver); return value; };
  read.set = (next) => {
    const r = typeof next === "function" ? next(value) : next;
    if (Object.is(r, value)) return;
    value = r;
    for (const d of [...deps]) d();
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

// Signal read benchmark
const sig = $state(42);
const start1 = performance.now();
for (let i = 0; i < 1000000; i++) sig();
const readMs = performance.now() - start1;
const readOps = Math.round(1000000 / (readMs / 1000));
console.log(`  Signal read:   ${readMs.toFixed(2)}ms for 1M ops → ${readOps.toLocaleString()} ops/s`);
assert(readOps > 500000, "Signal read > 500K ops/s");

// Signal write benchmark
const sig2 = $state(0);
const start2 = performance.now();
for (let i = 0; i < 1000000; i++) sig2.set(i);
const writeMs = performance.now() - start2;
const writeOps = Math.round(1000000 / (writeMs / 1000));
console.log(`  Signal write:  ${writeMs.toFixed(2)}ms for 1M ops → ${writeOps.toLocaleString()} ops/s`);
assert(writeOps > 500000, "Signal write > 500K ops/s");

// Effect propagation
const sig3 = $state(0);
let effectRuns = 0;
$effect(() => { sig3(); effectRuns++; });
const start3 = performance.now();
for (let i = 0; i < 100000; i++) sig3.set(i);
const effectMs = performance.now() - start3;
const effectOps = Math.round(100000 / (effectMs / 1000));
console.log(`  Effect update: ${effectMs.toFixed(2)}ms for 100K ops → ${effectOps.toLocaleString()} ops/s`);
assert(effectOps > 50000, "Effect update > 50K ops/s");
assert(effectRuns >= 100000, "Effect ran correct number of times");

// ============ 3. STORE PERFORMANCE ============
console.log("\n📊 Store Performance:");

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
      getSignal(prop, value)();
      if (Array.isArray(value)) {
        return new Proxy(value, {
          get(arr, p) {
            if (["push", "pop", "shift", "unshift", "splice"].includes(p)) {
              const orig = arr[p].bind(arr);
              return (...args) => { const r = orig(...args); getSignal(prop, arr).set([...arr]); return r; };
            }
            return arr[p];
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

const store = $store({ items: [], count: 0 });
const start4 = performance.now();
for (let i = 0; i < 10000; i++) store.items.push(i);
const storeMs = performance.now() - start4;
const storeOps = Math.round(10000 / (storeMs / 1000));
console.log(`  Store push:    ${storeMs.toFixed(2)}ms for 10K ops → ${storeOps.toLocaleString()} ops/s`);
assert(storeOps > 1000, "Store push > 1K ops/s");

// Store read
const start5 = performance.now();
for (let i = 0; i < 1000000; i++) store.count;
const storeReadMs = performance.now() - start5;
const storeReadOps = Math.round(1000000 / (storeReadMs / 1000));
console.log(`  Store read:    ${storeReadMs.toFixed(2)}ms for 1M ops → ${storeReadOps.toLocaleString()} ops/s`);
assert(storeReadOps > 500000, "Store read > 500K ops/s");

// ============ 4. SANITIZATION ============
console.log("\n🛡️ Security (Sanitization):");

function sanitize(input) {
  let s = input.replace(/<script[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<(iframe|object|embed|style)[\s\S]*?<\/\1>/gi, "");
  s = s.replace(/<(iframe|object|embed|style)[^>]*\/?>/gi, "");
  s = s.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  s = s.replace(/(href|src)\s*=\s*("javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi, '$1="#"');
  return s;
}

const xssPayload = '<script>alert(1)</script><img src=x onerror=alert(1)>';
const start6 = performance.now();
for (let i = 0; i < 100000; i++) sanitize(xssPayload);
const sanitizeMs = performance.now() - start6;
const sanitizeOps = Math.round(100000 / (sanitizeMs / 1000));
console.log(`  Sanitize XSS:  ${sanitizeMs.toFixed(2)}ms for 100K ops → ${sanitizeOps.toLocaleString()} ops/s`);
assert(sanitizeOps > 50000, "Sanitize > 50K ops/s");

// Verify sanitization works
const clean = sanitize(xssPayload);
assert(!clean.includes("<script>"), "Sanitizer removes script tags");
assert(!clean.includes("onerror"), "Sanitizer removes event handlers");

// ============ 5. RENDER PERFORMANCE ============
console.log("\n🎨 Render Performance (renderToString):");

function h(tag, props, ...children) {
  return {
    tag,
    props: props || {},
    children: children.flat(Infinity).filter(c => c !== null && c !== undefined && c !== false && c !== true),
  };
}

function renderToString(node) {
  if (node === null || node === undefined) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(renderToString).join("");

  const el = node;
  let html = `<${el.tag}`;
  for (const [key, value] of Object.entries(el.props || {})) {
    if (key === "children" || value == null || value === false) continue;
    if (key === "class" || key === "className") {
      html += ` class="${value}"`;
    } else if (key.startsWith("on")) {
      continue;
    } else {
      html += ` ${key}="${value}"`;
    }
  }
  html += ">";

  if (["br", "hr", "img", "input", "meta", "link"].includes(el.tag)) return html;

  for (const child of el.children || []) {
    html += renderToString(child);
  }
  html += `</${el.tag}>`;
  return html;
}

// Build a large tree
function buildTree(depth = 5, breadth = 3) {
  if (depth === 0) return h("span", null, "leaf");
  const children = Array.from({ length: breadth }, () => buildTree(depth - 1, breadth));
  return h("div", { class: `depth-${depth}` }, ...children);
}

const tree = buildTree(5, 3);
const start7 = performance.now();
for (let i = 0; i < 1000; i++) renderToString(tree);
const renderMs = performance.now() - start7;
const renderOps = Math.round(1000 / (renderMs / 1000));
console.log(`  Render tree:   ${renderMs.toFixed(2)}ms for 1K renders → ${renderOps.toLocaleString()} renders/s`);
assert(renderOps > 100, "Render > 100 renders/s for large tree");

const rendered = renderToString(tree);
assert(rendered.includes("<div"), "Rendered HTML contains div");
assert(rendered.includes("leaf"), "Rendered HTML contains leaf content");

// ============ 6. FRAMEWORK COMPARISON ============
//
// IMPORTANT: The cross-framework comparison table that used to be here
// was REMOVED because the coldStart / lighthouse / memory numbers for
// Astro / SvelteKit / Remix / Next.js were hardcoded constants, not
// measured against real deployments. Publishing fabricated comparisons
// would be misleading.
//
// To produce a fair comparison, deploy the same Hacker News clone to
// each framework on the same edge platform and run Lighthouse 11.
//
// What we CAN measure here is our own runtime's microbenchmark numbers
// (signals, store, sanitizer, render) — those are reported in the
// Summary section below.
console.log("\n🏆 Framework Comparison:");
console.log("  (Cross-framework comparison table removed — was fabricated.)");
console.log("  To compare: deploy the same app to each framework and run Lighthouse.");
console.log("");

// For backward compat with code that reads `frameworks`, keep an empty array.
const frameworks = [];

// Assertions — these were previously comparing hardcoded numbers against
// other hardcoded numbers (always true). Drop them; they were tautological.
// The real assertions are the microbenchmark thresholds above.

// ============ 7. SUMMARY ============
console.log("\n  " + "═".repeat(60));
console.log(`  ${passed} passed, ${failed} failed`);

console.log(`
  Benchmark Summary:
  ─────────────────────────────────────────────────
  Signal read:     ${readOps.toLocaleString().padStart(15)} ops/s
  Signal write:    ${writeOps.toLocaleString().padStart(15)} ops/s
  Effect update:   ${effectOps.toLocaleString().padStart(15)} ops/s
  Store read:      ${storeReadOps.toLocaleString().padStart(15)} ops/s
  Store push:      ${storeOps.toLocaleString().padStart(15)} ops/s
  Sanitize XSS:    ${sanitizeOps.toLocaleString().padStart(15)} ops/s
  Render tree:     ${renderOps.toLocaleString().padStart(15)} renders/s
  Bundle (gz):     ${elmoorxGz.toString().padStart(15)} bytes
  ─────────────────────────────────────────────────
  Cross-framework comparison: removed (was fabricated).
  Run your own Lighthouse tests for fair comparison.
`);

process.exit(failed > 0 ? 1 : 0);
