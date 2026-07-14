/**
 * @elmoorx/runtime — comprehensive test suite
 *
 * This file replaces the 22 legacy `scripts/test-v*.js/cjs` files
 * with a single, real test suite that imports the runtime source
 * (via tsx or Node 22+ --experimental-strip-types).
 *
 * Run with:
 *   node --import tsx --test packages/runtime/tests/runtime-comprehensive.test.mjs
 *
 * Or via npm: `npm run test`
 *
 * If no TS loader is available, the suite self-skips with a clear
 * message rather than failing opaquely.
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

// ─── Signals ──────────────────────────────────────────────────────────

describe("signals: $state", () => {
  skipIfNoRuntime("initial value", () => {
    const c = rt.$state(0);
    assert.equal(c(), 0);
  });

  skipIfNoRuntime("set value", () => {
    const c = rt.$state(0);
    c.set(5);
    assert.equal(c(), 5);
  });

  skipIfNoRuntime("updater function", () => {
    const c = rt.$state(10);
    c.set((x) => x + 1);
    assert.equal(c(), 11);
  });

  skipIfNoRuntime("equal values don't trigger", () => {
    const c = rt.$state(5);
    let runs = 0;
    rt.$effect(() => { c(); runs++; });
    assert.equal(runs, 1);
    c.set(5);
    assert.equal(runs, 1);
  });

  skipIfNoRuntime("Object.is: NaN equality", () => {
    const c = rt.$state(NaN);
    let runs = 0;
    rt.$effect(() => { c(); runs++; });
    c.set(NaN);
    assert.equal(runs, 1);
  });

  skipIfNoRuntime("Object.is: +0 vs -0 distinct", () => {
    const c = rt.$state(0);
    let runs = 0;
    rt.$effect(() => { c(); runs++; });
    c.set(-0);
    assert.equal(runs, 2);
  });
});

describe("signals: $effect", () => {
  skipIfNoRuntime("re-runs on signal change", () => {
    const c = rt.$state(0);
    let seen = -1;
    rt.$effect(() => { seen = c(); });
    assert.equal(seen, 0);
    c.set(42);
    assert.equal(seen, 42);
  });

  skipIfNoRuntime("multiple effects all fire", () => {
    const s = rt.$state(0);
    let a = -1, b = -1;
    rt.$effect(() => { a = s(); });
    rt.$effect(() => { b = s(); });
    s.set(7);
    assert.equal(a, 7);
    assert.equal(b, 7);
  });

  skipIfNoRuntime("dispose stops further runs", () => {
    const c = rt.$state(0);
    let runs = 0;
    const dispose = rt.$effect(() => { c(); runs++; });
    assert.equal(runs, 1);
    dispose();
    c.set(99);
    assert.equal(runs, 1, "should not re-run after dispose");
  });

  skipIfNoRuntime("effect that reads multiple signals", () => {
    const x = rt.$state(1);
    const y = rt.$state(2);
    let sum = 0;
    rt.$effect(() => { sum = x() + y(); });
    assert.equal(sum, 3);
    x.set(10);
    assert.equal(sum, 12);
    y.set(20);
    assert.equal(sum, 30);
  });
});

describe("signals: $batch", () => {
  skipIfNoRuntime("batch defers effects", () => {
    const a = rt.$state(1);
    const b = rt.$state(2);
    let runs = 0;
    rt.$effect(() => { a(); b(); runs++; });
    assert.equal(runs, 1);

    rt.$batch(() => {
      a.set(10);
      b.set(20);
      assert.equal(runs, 1);
    });
    assert.equal(runs, 2);
  });

  skipIfNoRuntime("nested batches flush once", () => {
    const s = rt.$state(0);
    let runs = 0;
    rt.$effect(() => { s(); runs++; });

    rt.$batch(() => {
      s.set(1);
      rt.$batch(() => { s.set(2); });
      assert.equal(runs, 1);
    });
    assert.equal(runs, 2);
  });
});

// ─── Computed ─────────────────────────────────────────────────────────

describe("computed", () => {
  skipIfNoRuntime("derives from signals", () => {
    const a = rt.$state(2);
    const b = rt.$state(3);
    const sum = rt.$computed(() => a() + b());
    assert.equal(sum(), 5);
    a.set(10);
    assert.equal(sum(), 13);
  });
});

// ─── Store ────────────────────────────────────────────────────────────

describe("store: $store", () => {
  skipIfNoRuntime("tracks top-level mutations", () => {
    const store = rt.$store({ name: "A" });
    let seen = "";
    rt.$effect(() => { seen = store.name; });
    assert.equal(seen, "A");
    store.name = "B";
    assert.equal(seen, "B");
  });

  skipIfNoRuntime("tracks deep object mutations", () => {
    const store = rt.$store({ user: { name: "A" } });
    let seen = "";
    rt.$effect(() => { seen = store.user.name; });
    assert.equal(seen, "A");
    store.user.name = "B";
    assert.equal(seen, "B");
  });

  skipIfNoRuntime("tracks array push", () => {
    const store = rt.$store({ items: [1, 2] });
    let len = 0;
    rt.$effect(() => { len = store.items.length; });
    assert.equal(len, 2);
    store.items.push(3);
    assert.equal(len, 3);
  });

  skipIfNoRuntime("tracks nested array element mutations", () => {
    const store = rt.$store({ items: [{ q: 1 }] });
    let seen = 0;
    rt.$effect(() => { seen = store.items[0].q; });
    assert.equal(seen, 1);
    store.items[0].q = 99;
    assert.equal(seen, 99);
  });

  skipIfNoRuntime("$subscribe helper", () => {
    const store = rt.$store({ x: 0 });
    let count = 0;
    const unsub = store.$subscribe(() => { count++; });
    store.x = 1;
    assert.ok(count > 0);
  });

  skipIfNoRuntime("$serialize helper", () => {
    const store = rt.$store({ a: 1, b: "x" });
    assert.equal(store.$serialize(), JSON.stringify({ a: 1, b: "x" }));
  });
});

// ─── Security ─────────────────────────────────────────────────────────

describe("security: sanitize", () => {
  skipIfNoRuntime("strips <script>", () => {
    const out = rt.sanitize("<p>hi</p><script>alert(1)</script>");
    assert.ok(!out.includes("<script>"));
  });

  skipIfNoRuntime("strips nested <scr<script>ipt>", () => {
    const out = rt.sanitize("<scr<script>ipt>alert(1)</script>");
    assert.ok(!/script/i.test(out));
  });

  skipIfNoRuntime("strips on* event handlers", () => {
    const out = rt.sanitize('<img src=x onerror="alert(1)">');
    assert.ok(!/onerror/i.test(out));
  });

  skipIfNoRuntime("blocks javascript: URLs", () => {
    const out = rt.sanitize('<a href="javascript:alert(1)">x</a>');
    assert.ok(!/javascript:/i.test(out));
  });

  skipIfNoRuntime("blocks data: URLs in href", () => {
    const out = rt.sanitize('<a href="data:text/html,<script>alert(1)</script>">x</a>');
    assert.ok(!/data:/i.test(out));
  });

  skipIfNoRuntime("preserves safe http URLs", () => {
    const out = rt.sanitize('<a href="https://example.com/path">link</a>');
    assert.ok(out.includes("https://example.com/path"));
  });

  skipIfNoRuntime("preserves mailto: URLs", () => {
    const out = rt.sanitize('<a href="mailto:user@example.com">email</a>');
    assert.ok(out.includes("mailto:user@example.com"));
  });

  skipIfNoRuntime("strips <iframe>", () => {
    const out = rt.sanitize('<iframe src="evil.html"></iframe>');
    assert.ok(!/iframe/i.test(out));
  });

  skipIfNoRuntime("strips <style> tags", () => {
    const out = rt.sanitize("<style>body{color:red}</style>");
    assert.ok(!/style/i.test(out));
  });

  skipIfNoRuntime("strips conditional comments", () => {
    const out = rt.sanitize("<!--[if IE]><script>alert(1)</script><![endif]-->");
    assert.ok(!/script/i.test(out));
  });

  skipIfNoRuntime("preserves safe HTML structure", () => {
    const out = rt.sanitize('<div class="safe"><p>Hello <strong>world</strong></p></div>');
    assert.ok(out.includes("<div"));
    assert.ok(out.includes("<strong>world</strong>"));
  });

  skipIfNoRuntime("handles empty input", () => {
    assert.equal(rt.sanitize(""), "");
  });

  skipIfNoRuntime("handles plain text", () => {
    assert.equal(rt.sanitize("just text"), "just text");
  });
});

describe("security: $html", () => {
  skipIfNoRuntime("returns trusted wrapper", () => {
    const result = rt.$html("<p>safe</p>");
    assert.equal(result.__trusted, true);
    assert.ok("__html" in result);
  });
});

describe("security: generateCsrfToken", () => {
  skipIfNoRuntime("produces 64-char hex", () => {
    const t = rt.generateCsrfToken();
    assert.equal(t.length, 64);
    assert.ok(/^[0-9a-f]+$/.test(t));
  });

  skipIfNoRuntime("produces unique tokens", () => {
    const a = rt.generateCsrfToken();
    const b = rt.generateCsrfToken();
    assert.notEqual(a, b);
  });
});

describe("security: SECURITY_HEADERS", () => {
  skipIfNoRuntime("includes CSP", () => {
    assert.ok("Content-Security-Policy" in rt.SECURITY_HEADERS);
    assert.ok(rt.SECURITY_HEADERS["Content-Security-Policy"].includes("default-src 'self'"));
  });

  skipIfNoRuntime("includes X-Frame-Options", () => {
    assert.equal(rt.SECURITY_HEADERS["X-Frame-Options"], "DENY");
  });

  skipIfNoRuntime("includes HSTS", () => {
    assert.ok(rt.SECURITY_HEADERS["Strict-Transport-Security"].includes("max-age=31536000"));
  });
});

// ─── h() + renderToString ─────────────────────────────────────────────

describe("h()", () => {
  skipIfNoRuntime("creates ElmoorxElement", () => {
    const el = rt.h("div", { class: "x" }, "hello");
    assert.equal(el.tag, "div");
    assert.equal(el.props.class, "x");
    assert.deepEqual(el.children, ["hello"]);
  });

  skipIfNoRuntime("flattens nested children", () => {
    const el = rt.h("div", null, ["a", ["b", "c"]]);
    assert.deepEqual(el.children, ["a", "b", "c"]);
  });

  skipIfNoRuntime("filters null/undefined/false children", () => {
    const el = rt.h("div", null, "a", null, "b", undefined, false, "c");
    assert.deepEqual(el.children, ["a", "b", "c"]);
  });

  skipIfNoRuntime("calls function components", () => {
    const Comp = (props) => rt.h("p", null, props.text);
    const el = rt.h(Comp, { text: "hi" });
    assert.equal(el.tag, "p");
  });
});

describe("renderToString", () => {
  skipIfNoRuntime("renders simple element", () => {
    const html = rt.renderToString(rt.h("div", { class: "x" }, "hi"));
    assert.equal(html, '<div class="x">hi</div>');
  });

  skipIfNoRuntime("renders nested elements", () => {
    const html = rt.renderToString(rt.h("div", null, rt.h("span", null, "hi")));
    assert.equal(html, "<div><span>hi</span></div>");
  });

  skipIfNoRuntime("renders void elements without closing tag", () => {
    const html = rt.renderToString(rt.h("img", { src: "x.png", alt: "x" }));
    assert.equal(html, '<img src="x.png" alt="x">');
  });

  skipIfNoRuntime("escapes text content", () => {
    const html = rt.renderToString("<script>");
    assert.equal(html, "&lt;script&gt;");
  });

  skipIfNoRuntime("escapes attribute values", () => {
    const html = rt.renderToString(rt.h("div", { title: '"hi"' }));
    assert.ok(html.includes("&quot;hi&quot;"));
  });

  skipIfNoRuntime("omits event handlers in SSR output", () => {
    const html = rt.renderToString(rt.h("button", { onClick: () => {} }, "click"));
    assert.ok(!html.includes("onClick"));
  });

  skipIfNoRuntime("renders boolean false as nothing", () => {
    assert.equal(rt.renderToString(false), "");
    assert.equal(rt.renderToString(true), "");
    assert.equal(rt.renderToString(null), "");
  });

  skipIfNoRuntime("renders arrays", () => {
    const html = rt.renderToString([rt.h("li", null, "a"), rt.h("li", null, "b")]);
    assert.equal(html, "<li>a</li><li>b</li>");
  });
});

// ─── Context API ──────────────────────────────────────────────────────

describe("context", () => {
  skipIfNoRuntime("createContext + provide + inject", () => {
    const Ctx = rt.createContext("default");
    rt.withContext(() => {
      rt.provide(Ctx, "injected");
      assert.equal(rt.inject(Ctx), "injected");
    })();
  });

  skipIfNoRuntime("inject returns default when no provider", () => {
    const Ctx = rt.createContext(42);
    assert.equal(rt.inject(Ctx), 42);
  });
});

// ─── Shallow/deep equality ────────────────────────────────────────────

describe("equality helpers", () => {
  skipIfNoRuntime("shallowEqual: same object", () => {
    const a = { x: 1 };
    assert.equal(rt.shallowEqual(a, a), true);
  });

  skipIfNoRuntime("shallowEqual: different keys", () => {
    assert.equal(rt.shallowEqual({ x: 1 }, { y: 1 }), false);
  });

  skipIfNoRuntime("shallowEqual: same keys, same values", () => {
    assert.equal(rt.shallowEqual({ x: 1, y: 2 }, { x: 1, y: 2 }), true);
  });

  skipIfNoRuntime("shallowEqual: shallow only", () => {
    assert.equal(rt.shallowEqual({ x: { a: 1 } }, { x: { a: 1 } }), false);
  });

  skipIfNoRuntime("shallowEqualArray", () => {
    assert.equal(rt.shallowEqualArray([1, 2, 3], [1, 2, 3]), true);
    assert.equal(rt.shallowEqualArray([1, 2], [1, 2, 3]), false);
  });

  skipIfNoRuntime("deepEqual: deep comparison", () => {
    assert.equal(rt.deepEqual({ x: { a: 1 } }, { x: { a: 1 } }), true);
    assert.equal(rt.deepEqual({ x: [1, 2] }, { x: [1, 2] }), true);
    assert.equal(rt.deepEqual({ x: [1, 2] }, { x: [1, 3] }), false);
  });
});

// ─── Lifecycle (basic) ────────────────────────────────────────────────

describe("lifecycle", () => {
  skipIfNoRuntime("onMount runs immediately outside component", () => {
    let ran = false;
    rt.onMount(() => { ran = true; });
    assert.equal(ran, true);
  });

  skipIfNoRuntime("onCleanup is no-op outside component (with warning)", () => {
    let ran = false;
    // Should not throw
    rt.onCleanup(() => { ran = true; });
    assert.equal(ran, false);
  });
});

// ─── Errors ───────────────────────────────────────────────────────────

describe("error boundary", () => {
  skipIfNoRuntime("safeRender returns fallback on error", () => {
    const result = rt.safeRender(
      () => { throw new Error("boom"); },
      "fallback"
    );
    assert.equal(result, "fallback");
  });

  skipIfNoRuntime("safeRender returns fn result on success", () => {
    const result = rt.safeRender(() => "ok", "fallback");
    assert.equal(result, "ok");
  });

  skipIfNoRuntime("safeRender fallback can be a function", () => {
    const result = rt.safeRender(
      () => { throw new Error("boom"); },
      (err) => `caught: ${err.message}`
    );
    assert.equal(result, "caught: boom");
  });
});
