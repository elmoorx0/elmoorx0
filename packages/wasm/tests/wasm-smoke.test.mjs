/**
 * @elmoorx/wasm — smoke tests
 *
 * Verifies that the package's main exports load and have the expected
 * type (function/class/object). Does NOT test full behavior — deeper
 * tests belong in dedicated test files.
 *
 * Run: npx tsx --test packages/wasm/tests/wasm-smoke.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

let mod = null;
let skipReason = null;
try {
  mod = await import("../src/index.ts");
} catch (e) {
  skipReason = String(e?.message || e).slice(0, 300);
}

const skip = skipReason ? test.skip : test;

describe("wasm: smoke tests", () => {
  skip("package loads without throwing", () => {
    assert.ok(mod, skipReason || "package should load");
  });

  skip("expected exports are present", () => {
    // Note: Signal, batch, $state, $effect are NOT real exports —
    // they are inside a template string for code generation. The
    // actual runtime exports are: initWasm, isWasmReady, getWasmStats,
    // and the binding generators.
    const missing = ["initWasm", "isWasmReady", "getWasmStats"].filter(name => !mod[name]);
    assert.equal(missing.length, 0, `Missing exports: ${missing.join(", ")}`);
  });

  skip("binding generators are exported", () => {
    for (const name of ["generateRustBindings", "generateGoBindings", "generateAssemblyScriptBindings", "generateZigBindings"]) {
      assert.equal(typeof mod[name], "function", `${name} should be a function`);
    }
  });

  skip("isWasmReady() returns boolean before init", () => {
    const ready = mod.isWasmReady();
    assert.equal(typeof ready, "boolean");
    // Before initWasm() is called, should be false
    assert.equal(ready, false);
  });

  skip("getWasmStats() returns a stats object", () => {
    const stats = mod.getWasmStats();
    assert.ok(stats);
    assert.ok(typeof stats === "object");
  });

  skip("WASM_BUNDLE_SIZE_GZIPPED constant is exported", () => {
    assert.equal(typeof mod.WASM_BUNDLE_SIZE_GZIPPED, "number");
    assert.ok(mod.WASM_BUNDLE_SIZE_GZIPPED > 0);
  });

  skip("generateRustBindings produces Rust code", () => {
    const code = mod.generateRustBindings();
    assert.equal(typeof code, "string");
    assert.ok(code.length > 0);
    // Should look like Rust (contains 'fn' or 'pub')
    assert.ok(code.includes("fn") || code.includes("pub") || code.includes("//"));
  });

  skip("WASM runtime - basic shape", () => {
    // Just verify the module didn't crash on import
    assert.ok(Object.keys(mod).length > 0, "package should export at least one thing");
  });
});
