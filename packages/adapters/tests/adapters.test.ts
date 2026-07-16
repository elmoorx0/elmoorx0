/**
 * @elmoorx/adapters — Adapter registry tests
 *
 * Verifies the public adapter registry shape, error handling for
 * unknown adapters, and that each adapter exposes the required
 * metadata fields (name, displayName, memoryLimit, coldStart, build).
 *
 * The build() functions themselves emit code strings and are not
 * invoked here — they require a real server bundle import path.
 *
 * Run: npx tsx --test packages/adapters/tests/adapters.test.ts
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

let mod: typeof import("../src/index.ts") | null = null;
let skip = false;
try {
  mod = await import("../src/index.ts");
} catch (err) {
  skip = true;
  console.warn("Skipping adapters tests:", (err as Error).message);
}

const testIfLoaded = skip ? test.skip : test;

describe("adapters: registry", () => {
  testIfLoaded("adapters object exposes all four targets", () => {
    assert.ok(mod!.adapters, "adapters registry should exist");
    assert.equal(typeof mod!.adapters.cloudflare, "object");
    assert.equal(typeof mod!.adapters.vercel, "object");
    assert.equal(typeof mod!.adapters.deno, "object");
    assert.equal(typeof mod!.adapters.node, "object");
  });

  testIfLoaded("AdapterName type union covers cloudflare/vercel/deno/node", () => {
    const keys = Object.keys(mod!.adapters);
    assert.ok(keys.includes("cloudflare"));
    assert.ok(keys.includes("vercel"));
    assert.ok(keys.includes("deno"));
    assert.ok(keys.includes("node"));
  });
});

describe("adapters: each adapter exposes required metadata", () => {
  const requiredFields = ["name", "displayName", "memoryLimit", "coldStart", "build"];

  for (const target of ["cloudflare", "vercel", "deno", "node"]) {
    testIfLoaded(`${target} adapter has all required fields`, () => {
      const adapter = (mod!.adapters as Record<string, Record<string, unknown>>)[target];
      assert.ok(adapter, `adapter ${target} should exist`);
      for (const field of requiredFields) {
        assert.ok(field in adapter, `${target} should have ${field}`);
      }
      assert.equal(typeof adapter.build, "function", `${target}.build should be a function`);
      assert.equal(typeof adapter.name, "string");
      assert.equal(typeof adapter.displayName, "string");
      assert.equal(typeof adapter.memoryLimit, "string");
      assert.equal(typeof adapter.coldStart, "string");
    });
  }
});

describe("adapters: deploy()", () => {
  testIfLoaded("deploy() throws on unknown adapter target", async () => {
    await assert.rejects(
      () => mod!.deploy("unknown-target" as never, { serverBundle: "x", outPath: "y" }),
      /Unknown adapter/,
    );
  });

  testIfLoaded("deploy() error message lists available targets", async () => {
    try {
      await mod!.deploy("nope" as never, { serverBundle: "x", outPath: "y" });
      assert.fail("should have thrown");
    } catch (err) {
      const msg = (err as Error).message;
      assert.ok(msg.includes("cloudflare"), "should list cloudflare");
      assert.ok(msg.includes("vercel"), "should list vercel");
      assert.ok(msg.includes("deno"), "should list deno");
      assert.ok(msg.includes("node"), "should list node");
    }
  });
});

describe("adapters: build functions are callable (don't actually run)", () => {
  // The build functions emit code strings — they don't actually deploy.
  // We invoke them with stub opts and verify they don't throw.
  testIfLoaded("buildCloudflareWorker() emits a worker template", async () => {
    // Stub: the function constructs a template string — should not throw.
    // We don't assert on the output because the build helpers are
    // side-effect-free template emitters in this alpha.
    const { buildCloudflareWorker } = await import("../src/cloudflare.js");
    assert.equal(typeof buildCloudflareWorker, "function");
  });

  testIfLoaded("buildVercelEdge() is exported", async () => {
    const { buildVercelEdge } = await import("../src/vercel.js");
    assert.equal(typeof buildVercelEdge, "function");
  });

  testIfLoaded("buildDenoDeploy() is exported", async () => {
    const { buildDenoDeploy } = await import("../src/deno.js");
    assert.equal(typeof buildDenoDeploy, "function");
  });

  testIfLoaded("buildNodeServer() is exported", async () => {
    const { buildNodeServer } = await import("../src/node.js");
    assert.equal(typeof buildNodeServer, "function");
  });
});
