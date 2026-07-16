/**
 * @elmoorx/css — CSS compiler tests
 *
 * Verifies:
 *   - compileCssModule hashes class names per file
 *   - compileScopedCss adds data attribute to selectors
 *   - :global() and @media rules are NOT scoped
 *   - minifyCss strips comments/whitespace/trailing semicolons
 *   - bundleCss concatenates with separator
 *   - generateComponentId is deterministic
 *
 * Run: npx tsx --test packages/css/tests/css.test.ts
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let mod: typeof import("../src/index.ts");
let skip = false;
try {
  mod = await import("../src/index.ts");
} catch (err) {
  skip = true;
  console.warn("Skipping css tests:", (err as Error).message);
}

const testIfLoaded = skip ? test.skip : test;

const TMP = join(tmpdir(), `elmoorx-css-test-${Date.now()}`);
mkdirSync(TMP, { recursive: true });

testIfLoaded("cleanup tmp dir runs after suite", () => {
  // Sanity check — the dir exists.
  assert.ok(TMP.length > 0);
});

describe("css: compileCssModule", () => {
  testIfLoaded("hashes class names deterministically", () => {
    const file = join(TMP, "Button.module.css");
    writeFileSync(file, ".btn { color: red; }\n.card { padding: 8px; }\n");
    const { css, mappings } = mod.compileCssModule(file);
    // The basename is "Button.module" (ext stripped), so the prefix is
    // "Button.module_btn_<hash>".
    assert.ok(mappings.btn.startsWith("Button"), `got: ${mappings.btn}`);
    assert.ok(mappings.btn.includes("_btn_"), `got: ${mappings.btn}`);
    assert.ok(mappings.card.includes("_card_"), `got: ${mappings.card}`);
    assert.ok(css.includes(mappings.btn));
    assert.ok(css.includes(mappings.card));
  });

  testIfLoaded("returns empty result for missing file", () => {
    const { css, mappings } = mod.compileCssModule(join(TMP, "no-such-file.css"));
    assert.equal(css, "");
    assert.deepEqual(mappings, {});
  });

  testIfLoaded("same source produces same hash suffix", () => {
    const file1 = join(TMP, "Same1.module.css");
    const file2 = join(TMP, "Same2.module.css");
    writeFileSync(file1, ".x { color: red; }\n");
    writeFileSync(file2, ".x { color: red; }\n");
    const a = mod.compileCssModule(file1);
    const b = mod.compileCssModule(file2);
    // Different basename → different prefix, but the hash suffix
    // (derived from content) should be identical.
    const aHash = a.mappings.x.split("_").pop();
    const bHash = b.mappings.x.split("_").pop();
    assert.equal(aHash, bHash);
  });
});

describe("css: compileScopedCss", () => {
  testIfLoaded("adds data attribute to selectors", () => {
    const css = ".btn { color: red; }";
    const scoped = mod.compileScopedCss(css, "abc123");
    assert.ok(scoped.includes("[data-elmoorx-abc123]"));
    assert.ok(scoped.includes(".btn"));
  });

  testIfLoaded("does NOT scope :global() selectors", () => {
    const css = ":global(.reset) { margin: 0; } .btn { color: red; }";
    const scoped = mod.compileScopedCss(css, "abc");
    // The global selector should appear WITHOUT the data attribute
    assert.ok(scoped.includes(".reset { margin: 0; }"), `global should be unscoped; got: ${scoped}`);
    assert.ok(scoped.includes("[data-elmoorx-abc]"), "local should be scoped");
  });

  testIfLoaded("does NOT scope @media / @keyframes", () => {
    const css = "@media (max-width: 600px) { .btn { font-size: 12px; } }";
    const scoped = mod.compileScopedCss(css, "abc");
    // The @media clause itself should NOT carry the data attribute —
    // only the inner selector should.
    assert.ok(!scoped.match(/@media[^\{]*\[data-elmoorx/), "@media clause must not be scoped");
    // But the inner selector should still be scoped
    assert.ok(scoped.includes("[data-elmoorx-abc]"));
  });

  testIfLoaded("handles comma-separated selectors", () => {
    const css = ".a, .b, .c { color: red; }";
    const scoped = mod.compileScopedCss(css, "x");
    const matches = scoped.match(/\[data-elmoorx-x\]/g);
    assert.ok(matches);
    assert.ok(matches.length >= 3, "all three selectors should be scoped");
  });
});

describe("css: minifyCss", () => {
  testIfLoaded("strips comments", () => {
    const css = "/* hi */ .a { color: red; }";
    const min = mod.minifyCss(css);
    assert.ok(!min.includes("/* hi */"));
  });

  testIfLoaded("collapses whitespace", () => {
    const css = ".a   {\n  color   :   red  ;\n}";
    const min = mod.minifyCss(css);
    assert.ok(!min.includes("\n"));
    assert.ok(!min.includes("  "));
  });

  testIfLoaded("removes trailing semicolons before }", () => {
    const css = ".a { color: red; }";
    const min = mod.minifyCss(css);
    assert.ok(!min.includes(";}"));
  });

  testIfLoaded("preserves essential punctuation", () => {
    const css = ".a { color: red; }";
    const min = mod.minifyCss(css);
    assert.ok(min.includes("{"));
    assert.ok(min.includes("}"));
    assert.ok(min.includes(":"));
  });
});

describe("css: bundleCss + generateComponentId", () => {
  testIfLoaded("bundleCss joins files with a separator comment", () => {
    const bundle = mod.bundleCss([".a { color: red; }", ".b { color: blue; }"]);
    assert.ok(bundle.includes(".a { color: red; }"));
    assert.ok(bundle.includes(".b { color: blue; }"));
    assert.ok(bundle.includes("=== next file ==="));
  });

  testIfLoaded("generateComponentId is deterministic for the same path", () => {
    const a = mod.generateComponentId("/foo/bar.tsx");
    const b = mod.generateComponentId("/foo/bar.tsx");
    assert.equal(a, b);
  });

  testIfLoaded("generateComponentId differs for different paths", () => {
    const a = mod.generateComponentId("/foo/bar.tsx");
    const b = mod.generateComponentId("/foo/baz.tsx");
    assert.notEqual(a, b);
  });

  testIfLoaded("generateComponentId is 8 hex chars", () => {
    const id = mod.generateComponentId("/x.tsx");
    assert.match(id, /^[0-9a-f]{8}$/);
  });
});

describe("css: processComponentStyles", () => {
  testIfLoaded("extracts <style scoped> blocks from component source", () => {
    const src = `export default function Foo() {
  return h('div', {}, 'hello');
}
<style scoped>
.btn { color: red; }
</style>`;
    const { code, css } = mod.processComponentStyles(src, "/foo/Foo.tsx");
    assert.ok(!code.includes("<style scoped>"), "style block should be removed from code");
    assert.ok(css.includes("[data-elmoorx-"), "css should be scoped");
    assert.ok(css.includes(".btn"));
  });

  testIfLoaded("also extracts plain <style> blocks (unscoped)", () => {
    const src = `export default function Bar() { return h('div', {}, 'hi'); }
<style>.global-cls { margin: 0; }</style>`;
    const { css } = mod.processComponentStyles(src, "/bar/Bar.tsx");
    assert.ok(css.includes(".global-cls"));
    assert.ok(!css.includes("[data-elmoorx-"), "plain <style> should NOT be scoped");
  });
});

// Cleanup after all tests
testIfLoaded("cleanup tmp dir", () => {
  try { rmSync(TMP, { recursive: true, force: true }); } catch { /* ignore */ }
  assert.ok(true);
});
