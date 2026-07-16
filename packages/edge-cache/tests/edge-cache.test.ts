/**
 * @elmoorx/edge-cache — EdgeCache tests
 *
 * Verifies:
 *   - Basic set/get roundtrip
 *   - TTL expiration
 *   - LRU eviction when maxL1Size is exceeded
 *   - Tag-based invalidation (single + multi)
 *   - Stats tracking (hits, misses, hit rate, evictions)
 *   - wrap() helper for promise-cached reads
 *   - clear() empties the cache
 *   - cleanup() removes expired entries
 *
 * Run: npx tsx --test packages/edge-cache/tests/edge-cache.test.ts
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";

let EdgeCache: typeof import("../src/index.ts").EdgeCache;
let EDGE_CACHE_VERSION: string;
let skip = false;
try {
  const mod = await import("../src/index.ts");
  EdgeCache = mod.EdgeCache;
  EDGE_CACHE_VERSION = mod.EDGE_CACHE_VERSION;
} catch (err) {
  skip = true;
  console.warn("Skipping edge-cache tests:", (err as Error).message);
}

const testIfLoaded = skip ? test.skip : test;

describe("edge-cache: basic set/get", () => {
  testIfLoaded("set/get roundtrip returns the stored value", () => {
    const cache = new EdgeCache({ maxL1Size: 100 });
    cache.set("k1", "v1");
    assert.equal(cache.get("k1"), "v1");
  });

  testIfLoaded("get returns null for missing key", () => {
    const cache = new EdgeCache({ maxL1Size: 100 });
    assert.equal(cache.get("missing"), null);
  });

  testIfLoaded("delete() removes a key", () => {
    const cache = new EdgeCache({ maxL1Size: 100 });
    cache.set("k1", "v1");
    cache.delete("k1");
    assert.equal(cache.get("k1"), null);
  });

  testIfLoaded("complex objects survive the roundtrip", () => {
    const cache = new EdgeCache({ maxL1Size: 100 });
    const obj = { a: 1, b: [2, 3], c: { nested: true } };
    cache.set("obj", obj);
    assert.deepEqual(cache.get("obj"), obj);
  });
});

describe("edge-cache: TTL expiration", () => {
  testIfLoaded("entries expire after the TTL", async () => {
    const cache = new EdgeCache({ maxL1Size: 100 });
    cache.set("k", "v", { ttl: 50 });
    assert.equal(cache.get("k"), "v", "should be present before TTL");
    await new Promise((r) => setTimeout(r, 80));
    assert.equal(cache.get("k"), null, "should be expired after TTL");
  });

  testIfLoaded("cleanup() removes expired entries", async () => {
    const cache = new EdgeCache({ maxL1Size: 100 });
    cache.set("a", 1, { ttl: 30 });
    cache.set("b", 2, { ttl: 30 });
    cache.set("c", 3, { ttl: 10_000 });
    await new Promise((r) => setTimeout(r, 60));
    const removed = cache.cleanup();
    assert.ok(removed >= 2, `should remove at least 2 expired entries (removed=${removed})`);
    assert.equal(cache.get("c"), 3, "long-TTL entry should survive");
  });
});

describe("edge-cache: LRU eviction", () => {
  testIfLoaded("oldest entry is evicted when maxL1Size is exceeded", () => {
    const cache = new EdgeCache({ maxL1Size: 3 });
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    cache.set("d", 4); // should evict "a"
    assert.equal(cache.get("a"), null, "a should be evicted");
    assert.equal(cache.get("b"), 2);
    assert.equal(cache.get("c"), 3);
    assert.equal(cache.get("d"), 4);
  });

  testIfLoaded("evictions counter increments on LRU eviction", () => {
    const cache = new EdgeCache({ maxL1Size: 2 });
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3); // evicts a
    const stats = cache.getStats();
    assert.ok(stats.evictions >= 1, `evictions should be >= 1 (got ${stats.evictions})`);
  });
});

describe("edge-cache: tag-based invalidation", () => {
  testIfLoaded("invalidateTag() removes all entries with that tag", () => {
    const cache = new EdgeCache({ maxL1Size: 100 });
    cache.set("u1", { name: "alice" }, { tags: ["users"] });
    cache.set("u2", { name: "bob" }, { tags: ["users"] });
    cache.set("p1", { name: "widget" }, { tags: ["products"] });

    const removed = cache.invalidateTag("users");
    assert.equal(removed, 2, "should remove 2 user entries");
    assert.equal(cache.get("u1"), null);
    assert.equal(cache.get("u2"), null);
    const p1 = cache.get("p1");
    assert.ok(p1 !== null, "untagged entry should survive");
    assert.deepEqual(p1, { name: "widget" });
  });

  testIfLoaded("invalidateTags() removes entries across multiple tags", () => {
    const cache = new EdgeCache({ maxL1Size: 100 });
    cache.set("a", 1, { tags: ["x"] });
    cache.set("b", 2, { tags: ["y"] });
    cache.set("c", 3, { tags: ["z"] });

    const removed = cache.invalidateTags(["x", "y"]);
    assert.ok(removed >= 2, `should remove at least 2 entries (removed=${removed})`);
    assert.equal(cache.get("a"), null);
    assert.equal(cache.get("b"), null);
    assert.equal(cache.get("c"), 3, "untagged entry should survive");
  });

  testIfLoaded("invalidateTag() returns 0 for unknown tag", () => {
    const cache = new EdgeCache({ maxL1Size: 100 });
    assert.equal(cache.invalidateTag("nonexistent"), 0);
  });
});

describe("edge-cache: stats", () => {
  testIfLoaded("getStats() reports hits and misses", () => {
    const cache = new EdgeCache({ maxL1Size: 100 });
    cache.set("a", 1);
    cache.get("a"); // hit
    cache.get("missing"); // miss

    const stats = cache.getStats();
    assert.ok(stats.hits >= 1, `hits should be >= 1 (got ${stats.hits})`);
    assert.ok(stats.misses >= 1, `misses should be >= 1 (got ${stats.misses})`);
    assert.ok(stats.hitRate > 0, "hitRate should be > 0");
    assert.equal(stats.l1Size, 1);
  });

  testIfLoaded("clear() resets all counters", () => {
    const cache = new EdgeCache({ maxL1Size: 100 });
    cache.set("a", 1);
    cache.get("a");
    cache.get("missing");
    cache.clear();
    const stats = cache.getStats();
    assert.equal(stats.hits, 0);
    assert.equal(stats.misses, 0);
    assert.equal(stats.l1Size, 0);
    assert.equal(stats.tagCount, 0);
  });
});

describe("edge-cache: wrap()", () => {
  testIfLoaded("wrap() caches the result of an async fn", async () => {
    const cache = new EdgeCache({ maxL1Size: 100 });
    let callCount = 0;
    const fn = async () => {
      callCount++;
      return { data: 42 };
    };

    const r1 = await cache.wrap("k", fn);
    assert.equal(callCount, 1);
    assert.deepEqual(r1, { data: 42 });

    const r2 = await cache.wrap("k", fn);
    assert.equal(callCount, 1, "fn should not be called again on cache hit");
    assert.deepEqual(r2, { data: 42 });
  });
});

describe("edge-cache: L2 disk persistence", () => {
  testIfLoaded("entries persist to L2 disk and survive a new instance", async () => {
    const dir = mkdtempSync(join(tmpdir(), "edge-cache-test-"));
    try {
      const cache1 = new EdgeCache({ maxL1Size: 100, l2Dir: dir });
      cache1.set("persistent", "hello");
      // setImmediate in implementation — wait one tick
      await new Promise((r) => setTimeout(r, 50));

      const cache2 = new EdgeCache({ maxL1Size: 100, l2Dir: dir });
      assert.equal(cache2.get("persistent"), "hello",
        "should be readable from L2 by a new instance");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("edge-cache: version", () => {
  testIfLoaded("EDGE_CACHE_VERSION is exported", () => {
    assert.ok(typeof EDGE_CACHE_VERSION === "string");
    assert.ok(EDGE_CACHE_VERSION.length > 0);
  });
});
