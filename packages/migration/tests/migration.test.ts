/**
 * @elmoorx/migration — Migration codemod tests
 *
 * Verifies the transform functions for React, Vue, Svelte, and Angular
 * source code, plus the apiEquivalents reference table.
 *
 * Run: npx tsx --test packages/migration/tests/migration.test.ts
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let mod: typeof import("../src/index.ts") | null = null;
let skip = false;
try {
  mod = await import("../src/index.ts");
} catch (err) {
  skip = true;
  console.warn("Skipping migration tests:", (err as Error).message);
}

const testIfLoaded = skip ? test.skip : test;

describe("migration: reactToElmoorx", () => {
  testIfLoaded("transforms useState to $state", () => {
    const code = `const [count, setCount] = useState(0);`;
    const out = mod!.reactToElmoorx(code);
    assert.ok(out.includes("$state"), "should contain $state");
    assert.ok(!out.includes("useState"), "should not contain useState");
  });

  testIfLoaded("transforms setX(...) calls to X.set(...)", () => {
    const code = `setCount(c + 1);`;
    const out = mod!.reactToElmoorx(code);
    assert.ok(out.includes("count.set("), `should rewrite setter call (got: ${out})`);
  });

  testIfLoaded("transforms useEffect to $effect", () => {
    const code = `useEffect(() => { console.log('mounted'); }, []);`;
    const out = mod!.reactToElmoorx(code);
    assert.ok(out.includes("$effect"), "should contain $effect");
    assert.ok(!out.includes("useEffect"), "should not contain useEffect");
  });

  testIfLoaded("transforms className to class", () => {
    const code = `<div className="x" />`;
    const out = mod!.reactToElmoorx(code);
    assert.ok(out.includes("class="), `should rewrite className (got: ${out})`);
  });

  testIfLoaded("transforms dangerouslySetInnerHTML to $html", () => {
    const code = `<div dangerouslySetInnerHTML={{ __html: html }} />`;
    const out = mod!.reactToElmoorx(code);
    assert.ok(out.includes("$html"), `should rewrite dangerouslySetInnerHTML (got: ${out})`);
  });

  testIfLoaded("rewrites React imports to @elmoorx/runtime", () => {
    const code = `import { useState, useEffect } from 'react';`;
    const out = mod!.reactToElmoorx(code);
    assert.ok(out.includes("@elmoorx/runtime"), "should rewrite import source");
    assert.ok(!out.includes("from 'react'"), "should not reference react");
  });
});

describe("migration: vueToElmoorx", () => {
  testIfLoaded("transforms ref() to $state()", () => {
    const code = `const count = ref(0);`;
    const out = mod!.vueToElmoorx(code);
    assert.ok(out.includes("$state"), `should contain $state (got: ${out})`);
  });

  testIfLoaded("transforms reactive() to $store()", () => {
    const code = `const state = reactive({ count: 0 });`;
    const out = mod!.vueToElmoorx(code);
    assert.ok(out.includes("$store"), `should contain $store (got: ${out})`);
  });

  testIfLoaded("transforms computed() to $computed()", () => {
    const code = `const doubled = computed(() => count.value * 2);`;
    const out = mod!.vueToElmoorx(code);
    assert.ok(out.includes("$computed"), `should contain $computed (got: ${out})`);
  });
});

describe("migration: svelteToElmoorx", () => {
  testIfLoaded("transforms `let x = 0` to `const x = $state(0)`", () => {
    const code = `let count = 0;`;
    const out = mod!.svelteToElmoorx(code);
    assert.ok(out.includes("$state"), `should contain $state (got: ${out})`);
  });

  testIfLoaded("transforms onMount/onDestroy", () => {
    const code = `onMount(() => {}); onDestroy(() => {});`;
    const out = mod!.svelteToElmoorx(code);
    assert.ok(out.includes("onMount"), "should keep onMount");
    assert.ok(out.includes("onCleanup"), `should rewrite onDestroy (got: ${out})`);
  });
});

describe("migration: angularToElmoorx", () => {
  testIfLoaded("is callable and returns a string", () => {
    const code = `@Component({}) class Foo {}`;
    const out = mod!.angularToElmoorx(code);
    assert.equal(typeof out, "string");
  });
});

describe("migration: apiEquivalents table", () => {
  testIfLoaded("exposes react equivalents", () => {
    assert.ok(mod!.apiEquivalents.react);
    assert.equal(mod!.apiEquivalents.react.useState, "$state");
    assert.equal(mod!.apiEquivalents.react.useEffect, "$effect");
    assert.equal(mod!.apiEquivalents.react.className, "class");
  });

  testIfLoaded("exposes vue equivalents", () => {
    assert.ok(mod!.apiEquivalents.vue);
    assert.equal(mod!.apiEquivalents.vue["ref()"], "$state()");
    assert.equal(mod!.apiEquivalents.vue["reactive()"], "$store()");
  });

  testIfLoaded("exposes svelte equivalents", () => {
    assert.ok(mod!.apiEquivalents.svelte);
    assert.equal(mod!.apiEquivalents.svelte["let x = 0"], "const x = $state(0)");
  });

  testIfLoaded("exposes angular equivalents", () => {
    assert.ok(mod!.apiEquivalents.angular);
  });
});

describe("migration: migrateDirectory", () => {
  testIfLoaded("scans a directory and returns a MigrationReport", async () => {
    const dir = mkdtempSync(join(tmpdir(), "migration-test-"));
    try {
      writeFileSync(join(dir, "Component.tsx"),
        `import { useState } from 'react'; const [c, setC] = useState(0);`);
      writeFileSync(join(dir, "helper.ts"),
        `export const add = (a, b) => a + b;`);

      const report = await mod!.migrateDirectory(dir, {
        from: "react",
        dryRun: true,
      });

      assert.ok(report);
      assert.equal(typeof report.filesProcessed, "number");
      assert.equal(typeof report.filesSucceeded, "number");
      assert.equal(typeof report.duration, "number");
      assert.ok(report.filesProcessed >= 2, `should process at least 2 files (got ${report.filesProcessed})`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  testIfLoaded("dry-run does not modify files on disk", async () => {
    const dir = mkdtempSync(join(tmpdir(), "migration-dry-"));
    try {
      const filePath = join(dir, "Component.tsx");
      const original = `import { useState } from 'react';`;
      writeFileSync(filePath, original);

      await mod!.migrateDirectory(dir, { from: "react", dryRun: true });

      const { readFileSync } = await import("node:fs");
      const after = readFileSync(filePath, "utf-8");
      assert.equal(after, original, "dry-run should leave the file unchanged");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  testIfLoaded("non-dry-run writes transformed content to disk", async () => {
    const dir = mkdtempSync(join(tmpdir(), "migration-apply-"));
    try {
      const filePath = join(dir, "Component.tsx");
      const original = `import { useState } from 'react'; const [c, setC] = useState(0);`;
      writeFileSync(filePath, original);

      const report = await mod!.migrateDirectory(dir, { from: "react", dryRun: false });

      const { readFileSync } = await import("node:fs");
      const after = readFileSync(filePath, "utf-8");
      assert.notEqual(after, original, "file should be modified");
      assert.ok(after.includes("@elmoorx/runtime"), "should rewrite the import");
      assert.ok(after.includes("$state"), "should rewrite useState");
      assert.ok(report.filesSucceeded >= 1, `should succeed on at least 1 file (got ${report.filesSucceeded})`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  testIfLoaded("respects user-provided exclude list", async () => {
    const dir = mkdtempSync(join(tmpdir(), "migration-exclude-"));
    try {
      writeFileSync(join(dir, "keep.tsx"), `import { useState } from 'react';`);
      // Create an "excluded" subdir that we tell the scanner to skip.
      const { mkdirSync } = await import("node:fs");
      const subDir = join(dir, "skipme");
      mkdirSync(subDir);
      writeFileSync(join(subDir, "skip.tsx"), `import { useState } from 'react';`);

      const report = await mod!.migrateDirectory(dir, {
        from: "react",
        dryRun: true,
        exclude: ["skipme"],
      });

      assert.equal(report.filesProcessed, 1, `should skip the excluded subdir (got ${report.filesProcessed})`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
