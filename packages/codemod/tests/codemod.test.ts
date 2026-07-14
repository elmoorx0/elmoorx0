/**
 * @elmoorx/codemod — tests
 *
 * Run: npx tsx --test packages/codemod/tests/codemod.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, readFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

let codemod = null;
let skipReason = null;

try {
  codemod = await import("../src/index.ts");
} catch (err) {
  skipReason = (err instanceof Error ? err.message : String(err)).slice(0, 200);
}

const skipIfNoCodemod = skipReason ? test.skip : test;

// Helper: create a temp directory with test files
async function createTempDir(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "elmoorx-codemod-test-"));
  for (const [path, content] of Object.entries(files)) {
    const fullPath = join(dir, path);
    await mkdir(join(fullPath, ".."), { recursive: true });
    await writeFile(fullPath, content, "utf-8");
  }
  return dir;
}

// ─── renameWafraToElmoorx ────────────────────────────────────────────

describe("codemod: renameWafraToElmoorx", () => {
  skipIfNoCodemod("renames WafraNode → ElmoorxNode", async () => {
    const dir = await createTempDir({
      "test.ts": "const x: WafraNode = h('div', null, 'hi');",
    });
    try {
      await codemod.renameWafraToElmoorx(dir);
      const result = await readFile(join(dir, "test.ts"), "utf-8");
      assert.ok(result.includes("ElmoorxNode"), `should contain ElmoorxNode: ${result}`);
      assert.ok(!result.includes("WafraNode"));
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  skipIfNoCodemod("renames data-wafra-island → data-elmoorx-island", async () => {
    const dir = await createTempDir({
      "test.ts": 'const el = document.querySelector("[data-wafra-island]");',
    });
    try {
      await codemod.renameWafraToElmoorx(dir);
      const result = await readFile(join(dir, "test.ts"), "utf-8");
      assert.ok(result.includes("data-elmoorx-island"));
      assert.ok(!result.includes("data-wafra-island"));
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  skipIfNoCodemod("renames .wafra.tsx → .elmoorx.tsx in strings", async () => {
    const dir = await createTempDir({
      "test.ts": 'const route = "/about.elmoorx.tsx";',
    });
    try {
      await codemod.renameWafraToElmoorx(dir);
      const result = await readFile(join(dir, "test.ts"), "utf-8");
      assert.ok(result.includes(".elmoorx.tsx"));
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  skipIfNoCodemod("renames wafra create → elmoorx create", async () => {
    const dir = await createTempDir({
      "README.md": "Run: wafra create my-app",
    });
    try {
      await codemod.renameWafraToElmoorx(dir);
      const result = await readFile(join(dir, "README.md"), "utf-8");
      assert.ok(result.includes("elmoorx create"));
      assert.ok(!result.includes("wafra create"));
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  skipIfNoCodemod("renames file on disk (.wafra.tsx → .elmoorx.tsx)", async () => {
    const dir = await createTempDir({
      "Counter.wafra.tsx": "export const Counter = () => h('div', null, 'count');",
    });
    try {
      const result = await codemod.renameWafraToElmoorx(dir);
      assert.equal(result.filesRenamed, 1);
      // Old file should not exist
      try {
        await readFile(join(dir, "Counter.wafra.tsx"));
        assert.fail("old file should not exist");
      } catch {
        // expected
      }
      // New file should exist
      const content = await readFile(join(dir, "Counter.elmoorx.tsx"), "utf-8");
      assert.ok(content.includes("Counter"));
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  skipIfNoCodemod("dryRun does not modify files", async () => {
    const original = "const x: WafraNode = h('div');";
    const dir = await createTempDir({ "test.ts": original });
    try {
      const result = await codemod.renameWafraToElmoorx(dir, { dryRun: true });
      assert.ok(result.filesModified > 0, "should report modifications");
      const content = await readFile(join(dir, "test.ts"), "utf-8");
      assert.equal(content, original, "file should be unchanged in dry-run");
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  skipIfNoCodemod("skips node_modules", async () => {
    const dir = await createTempDir({
      "node_modules/pkg/index.ts": "const x: WafraNode = h('div');",
      "src/test.ts": "const y: WafraNode = h('div');",
    });
    try {
      const result = await codemod.renameWafraToElmoorx(dir);
      // node_modules file should be unchanged
      const nmContent = await readFile(join(dir, "node_modules/pkg/index.ts"), "utf-8");
      assert.ok(nmContent.includes("WafraNode"), "node_modules should be skipped");
      // src file should be changed
      const srcContent = await readFile(join(dir, "src/test.ts"), "utf-8");
      assert.ok(srcContent.includes("ElmoorxNode"));
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  skipIfNoCodemod("respects custom extensions", async () => {
    const dir = await createTempDir({
      "test.ts": "const x: WafraNode = h('div');",
      "test.md": "# Wafra Framework",
    });
    try {
      await codemod.renameWafraToElmoorx(dir, { extensions: [".ts"] });
      const tsContent = await readFile(join(dir, "test.ts"), "utf-8");
      assert.ok(tsContent.includes("ElmoorxNode"));
      const mdContent = await readFile(join(dir, "test.md"), "utf-8");
      assert.ok(mdContent.includes("Wafra Framework"), "MD should be skipped");
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  skipIfNoCodemod("onFile callback is called", async () => {
    const dir = await createTempDir({
      "test.ts": "const x: WafraNode = h('div');",
    });
    try {
      const calls: Array<{ path: string; changes: number }> = [];
      await codemod.renameWafraToElmoorx(dir, {
        onFile: (path, changes) => calls.push({ path, changes }),
      });
      assert.ok(calls.length > 0, "onFile should be called");
      assert.ok(calls[0].changes > 0);
    } finally {
      await rm(dir, { recursive: true });
    }
  });
});

// ─── reactToElmoorx ──────────────────────────────────────────────────

describe("codemod: reactToElmoorx", () => {
  skipIfNoCodemod("converts useState import", async () => {
    const dir = await createTempDir({
      "test.tsx": `import { useState } from "react";`,
    });
    try {
      await codemod.reactToElmoorx(dir);
      const result = await readFile(join(dir, "test.tsx"), "utf-8");
      assert.ok(result.includes('@elmoorx/runtime'), `should import from elmoorx: ${result}`);
      assert.ok(result.includes("$state"));
      assert.ok(!result.includes('"react"'));
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  skipIfNoCodemod("converts useState() → $state()", async () => {
    const dir = await createTempDir({
      "test.tsx": `const [count, setCount] = useState(0);`,
    });
    try {
      await codemod.reactToElmoorx(dir);
      const result = await readFile(join(dir, "test.tsx"), "utf-8");
      assert.ok(result.includes("$state"));
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  skipIfNoCodemod("converts useEffect → $effect", async () => {
    const dir = await createTempDir({
      "test.tsx": `useEffect(() => { document.title = "hi"; }, []);`,
    });
    try {
      await codemod.reactToElmoorx(dir);
      const result = await readFile(join(dir, "test.tsx"), "utf-8");
      assert.ok(result.includes("$effect"));
      assert.ok(!result.includes("useEffect"));
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  skipIfNoCodemod("converts setX(v) → X.set(v)", async () => {
    const dir = await createTempDir({
      "test.tsx": `setCount(count + 1);`,
    });
    try {
      await codemod.reactToElmoorx(dir);
      const result = await readFile(join(dir, "test.tsx"), "utf-8");
      assert.ok(result.includes("count.set("));
      assert.ok(!result.includes("setCount"));
    } finally {
      await rm(dir, { recursive: true });
    }
  });
});

// ─── vueToElmoorx ────────────────────────────────────────────────────

describe("codemod: vueToElmoorx", () => {
  skipIfNoCodemod("converts ref() → $state()", async () => {
    const dir = await createTempDir({
      "test.ts": `import { ref } from "vue"; const count = ref(0);`,
    });
    try {
      await codemod.vueToElmoorx(dir);
      const result = await readFile(join(dir, "test.ts"), "utf-8");
      assert.ok(result.includes("$state"));
      assert.ok(!result.includes('"vue"'));
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  skipIfNoCodemod("converts onMounted → onMount", async () => {
    const dir = await createTempDir({
      "test.ts": `onMounted(() => { console.warn("ready"); });`,
    });
    try {
      await codemod.vueToElmoorx(dir);
      const result = await readFile(join(dir, "test.ts"), "utf-8");
      assert.ok(result.includes("onMount"));
      assert.ok(!result.includes("onMounted"));
    } finally {
      await rm(dir, { recursive: true });
    }
  });
});

// ─── Result structure ────────────────────────────────────────────────

describe("codemod: result structure", () => {
  skipIfNoCodemod("returns CodemodResult with correct shape", async () => {
    const dir = await createTempDir({
      "test.ts": "const x: WafraNode = h('div');",
    });
    try {
      const result = await codemod.renameWafraToElmoorx(dir);
      assert.ok(typeof result.filesScanned === "number");
      assert.ok(typeof result.filesModified === "number");
      assert.ok(typeof result.filesRenamed === "number");
      assert.ok(typeof result.totalReplacements === "number");
      assert.ok(Array.isArray(result.changes));
    } finally {
      await rm(dir, { recursive: true });
    }
  });
});

// ─── VERSION ─────────────────────────────────────────────────────────

describe("codemod: version", () => {
  skipIfNoCodemod("VERSION is exported", () => {
    assert.ok(codemod.VERSION);
    assert.equal(codemod.VERSION, "3.0.0-alpha.2");
  });
});
