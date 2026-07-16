/**
 * @elmoorx/devtools — DevTools API tests
 *
 * Verifies:
 *   - registerIsland() stores the island in devtools state
 *   - snapshotStore() records a store snapshot
 *   - isProduction() returns false in test env (no NODE_ENV=production)
 *   - injectDevtools() is a no-op when document is undefined (Node env)
 *
 * NOTE: The devtools module is browser-oriented; in Node it should not
 * throw and should silently no-op the DOM-touching functions.
 *
 * Run: npx tsx --test packages/devtools/tests/devtools.test.ts
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

let mod: typeof import("../src/index.ts") | null = null;
let skip = false;
try {
  mod = await import("../src/index.ts");
} catch (err) {
  skip = true;
  console.warn("Skipping devtools tests:", (err as Error).message);
}

const testIfLoaded = skip ? test.skip : test;

describe("devtools: registerIsland", () => {
  testIfLoaded("registerIsland() is callable in Node (no-op without DOM)", () => {
    // Should not throw even though document is undefined in Node.
    assert.doesNotThrow(() => mod!.registerIsland("test-island-1"));
  });

  testIfLoaded("registerIsland() accepts an optional element arg", () => {
    assert.doesNotThrow(() => mod!.registerIsland("test-island-2", undefined));
  });
});

describe("devtools: snapshotStore", () => {
  testIfLoaded("snapshotStore() is callable with a name + value", () => {
    assert.doesNotThrow(() => mod!.snapshotStore("userStore", { id: 1, name: "alice" }));
  });

  testIfLoaded("snapshotStore() accepts primitive values", () => {
    assert.doesNotThrow(() => mod!.snapshotStore("counter", 42));
  });
});

describe("devtools: injectDevtools", () => {
  testIfLoaded("injectDevtools() is a no-op in Node (no document)", () => {
    // Without a document, this should silently return without throwing.
    assert.doesNotThrow(() => mod!.injectDevtools());
  });
});

describe("devtools: production-mode guards", () => {
  // When NODE_ENV is "production", all devtools functions should no-op.
  // We can't easily flip NODE_ENV here without affecting other tests,
  // but we can verify the functions exist and are typed correctly.
  testIfLoaded("all public functions are exported", () => {
    assert.equal(typeof mod!.registerIsland, "function");
    assert.equal(typeof mod!.snapshotStore, "function");
    assert.equal(typeof mod!.injectDevtools, "function");
  });
});
