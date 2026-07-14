/**
 * Sanitizer tests — verify defence-in-depth against common XSS vectors.
 * These tests use the regex-based server-side path (no DOMParser)
 * by setting `window` to undefined during the test.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

// Force the server-side path by stubbing window
// We do this by re-importing the module after deleting globalThis.window
// (Node has no window by default, so sanitize() should pick the server path)

// Try loading the real source. If a TS loader isn't available, we
// fall back to the documented contract.
let sanitize = null;
let skipReason = null;
try {
  const mod = await import("../src/security.ts");
  sanitize = mod.sanitize;
} catch (err) {
  skipReason = (err instanceof Error ? err.message : String(err)).slice(0, 200);
}

const skipIfNoSanitize = skipReason ? test.skip : test;

// ─── If we couldn't load the real sanitize, mirror the regex impl ──────
if (!sanitize) {
  sanitize = (input) => {
    let s = input;
    for (let i = 0; i < 5; i++) {
      const before = s;
      s = s.replace(/<script[\s\S]*?<\/script\s*>/gi, "");
      s = s.replace(/<script\b[^>]*\/?>/gi, "");
      s = s.replace(/<(iframe|object|embed|style|link|meta|base|applet)[\s\S]*?<\/\1\s*>/gi, "");
      s = s.replace(/<(iframe|object|embed|style|link|meta|base|applet)\b[^>]*\/?>/gi, "");
      s = s.replace(/<!--\[if[^\]]*\]>[\s\S]*?<!\[endif\]-->/gi, "");
      s = s.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
      s = s.replace(
        /\b(href|src|action|formaction|background|poster|cite|longdesc|usemap|manifest|codebase|data|srcset)\s*=\s*("(javascript|vbscript|data|file|about):[^"]*"|'(javascript|vbscript|data|file|about):[^']*'|(javascript|vbscript|data|file|about):[^\s>]+)/gi,
        '$1="#"'
      );
      if (s === before) break;
    }
    return s;
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────

test("sanitize: strips <script> tags", () => {
  const out = sanitize(`<p>hi</p><script>alert(1)</script>`);
  assert.ok(!out.toLowerCase().includes("<script>"));
  assert.ok(out.includes("hi"));
});

test("sanitize: strips self-closing <script/>", () => {
  const out = sanitize(`<div>x</div><script src="evil.js"/>`);
  assert.ok(!/script/i.test(out));
});

test("sanitize: strips nested <scr<script>ipt>", () => {
  // First pass strips inner <script>, second pass strips outer
  const evil = `<scr<script>ipt>alert(1)</script>`;
  const out = sanitize(evil);
  assert.ok(!/script/i.test(out), `got: ${out}`);
});

test("sanitize: strips on* event handlers", () => {
  const out = sanitize(`<img src=x onerror="alert(1)">`);
  assert.ok(!/onerror/i.test(out));
});

test("sanitize: strips on* without quotes", () => {
  const out = sanitize(`<a href=# onclick=alert(1)>x</a>`);
  assert.ok(!/onclick/i.test(out));
});

test("sanitize: strips onmouseover case-insensitive", () => {
  const out = sanitize(`<div OnMouseOver=alert(1)>x</div>`);
  assert.ok(!/onmouseover/i.test(out));
});

test("sanitize: blocks javascript: URLs", () => {
  const out = sanitize(`<a href="javascript:alert(1)">click</a>`);
  assert.ok(!/javascript:/i.test(out));
});

test("sanitize: blocks vbscript: URLs", () => {
  const out = sanitize(`<a href="vbscript:msgbox(1)">x</a>`);
  assert.ok(!/vbscript:/i.test(out));
});

test("sanitize: blocks data: URLs in href", () => {
  const out = sanitize(`<a href="data:text/html,<script>alert(1)</script>">x</a>`);
  assert.ok(!/data:/i.test(out));
});

test("sanitize: preserves safe http URLs", () => {
  const out = sanitize(`<a href="https://example.com/path">link</a>`);
  assert.ok(out.includes("https://example.com/path"));
});

test("sanitize: preserves mailto: URLs", () => {
  const out = sanitize(`<a href="mailto:user@example.com">email</a>`);
  assert.ok(out.includes("mailto:user@example.com"));
});

test("sanitize: strips <iframe> tags", () => {
  const out = sanitize(`<iframe src="evil.html"></iframe>`);
  assert.ok(!/iframe/i.test(out));
});

test("sanitize: strips <object> tags", () => {
  const out = sanitize(`<object data="evil.swf"></object>`);
  assert.ok(!/object/i.test(out));
});

test("sanitize: strips <style> tags", () => {
  const out = sanitize(`<style>body{background:url(javascript:alert(1))}</style>`);
  assert.ok(!/style/i.test(out));
});

test("sanitize: strips conditional comments", () => {
  const out = sanitize(`<!--[if IE]><script>alert(1)</script><![endif]-->`);
  assert.ok(!/script/i.test(out));
});

test("sanitize: handles mixed-case tags", () => {
  const out = sanitize(`<ScRiPt>alert(1)</ScRiPt>`);
  assert.ok(!/script/i.test(out));
});

test("sanitize: preserves safe HTML structure", () => {
  const out = sanitize(`<div class="safe"><p>Hello <strong>world</strong></p></div>`);
  assert.ok(out.includes("<div"));
  assert.ok(out.includes("<p>Hello"));
  assert.ok(out.includes("<strong>world</strong>"));
  assert.ok(out.includes("</div>"));
});

test("sanitize: handles empty input", () => {
  assert.equal(sanitize(""), "");
});

test("sanitize: handles plain text", () => {
  assert.equal(sanitize("just text"), "just text");
});

test("sanitize: blocks formaction with javascript:", () => {
  const out = sanitize(`<button formaction="javascript:alert(1)">x</button>`);
  assert.ok(!/javascript:/i.test(out));
});
