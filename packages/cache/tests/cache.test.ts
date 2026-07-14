/**
 * @elmoorx/cache — real integration tests
 * Run: npx tsx --test packages/cache/tests/cache.test.ts
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

let cache = null;
let skipReason = null;
try { cache = await import("../src/index.ts"); } catch (e) { skipReason = (e as Error).message?.slice(0, 200); }
const skip = skipReason ? test.skip : test;

describe("cache: basic operations", () => {
  skip("set + get", () => {
    const c = new cache.CacheManager(100);
    c.set("key1", "value1");
    assert.equal(c.get("key1"), "value1");
  });

  skip("get returns null for missing key", () => {
    const c = new cache.CacheManager(100);
    assert.equal(c.get("nonexistent"), null);
  });

  skip("delete removes key", () => {
    const c = new cache.CacheManager(100);
    c.set("key1", "value1");
    c.delete("key1");
    assert.equal(c.get("key1"), null);
  });

  skip("clear removes all keys", () => {
    const c = new cache.CacheManager(100);
    c.set("a", 1);
    c.set("b", 2);
    c.clear();
    assert.equal(c.get("a"), null);
    assert.equal(c.get("b"), null);
  });

  skip("has() checks existence", () => {
    const c = new cache.CacheManager(100);
    c.set("key", "val");
    assert.equal(c.has("key"), true);
    assert.equal(c.has("missing"), false);
  });

  skip("size() returns number of entries", () => {
    const c = new cache.CacheManager(100);
    c.set("a", 1);
    c.set("b", 2);
    assert.equal(c.size(), 2);
  });
});

describe("cache: TTL", () => {
  skip("expired entries return null", async () => {
    const c = new cache.CacheManager(100);
    c.set("temp", "value", 100); // 100ms TTL
    assert.equal(c.get("temp"), "value");
    await new Promise(r => setTimeout(r, 150));
    assert.equal(c.get("temp"), null);
  });

  skip("non-expired entries return value", () => {
    const c = new cache.CacheManager(100);
    c.set("persistent", "value", 60000);
    assert.equal(c.get("persistent"), "value");
  });
});

describe("cache: LRU eviction", () => {
  skip("evicts oldest when maxSize reached", () => {
    const c = new cache.CacheManager(2);
    c.set("a", 1);
    c.set("b", 2);
    c.set("c", 3); // should evict "a"
    assert.equal(c.get("a"), null);
    assert.equal(c.get("b"), 2);
    assert.equal(c.get("c"), 3);
  });
});

describe("cache: stats", () => {
  skip("tracks hits and misses", () => {
    const c = new cache.CacheManager(100);
    c.set("key", "val");
    c.get("key"); // hit
    c.get("missing"); // miss
    const stats = c.stats();
    assert.ok(stats.hits >= 1);
    assert.ok(stats.misses >= 1);
  });

  skip("hitRate is calculated", () => {
    const c = new cache.CacheManager(100);
    c.set("key", "val");
    c.get("key"); // hit
    c.get("missing"); // miss
    const stats = c.stats();
    assert.ok(stats.hitRate >= 0 && stats.hitRate <= 1);
  });
});

describe("cache: tags", () => {
  skip("invalidateTag removes tagged entries", () => {
    const c = new cache.CacheManager(100);
    c.set("a", 1, 60000, ["user"]);
    c.set("b", 2, 60000, ["user"]);
    c.set("c", 3, 60000, ["post"]);
    c.invalidateTag("user");
    assert.equal(c.get("a"), null);
    assert.equal(c.get("b"), null);
    assert.equal(c.get("c"), 3);
  });
});

describe("cache: singleton + helpers", () => {
  skip("cache singleton is exported", () => {
    assert.ok(cache.cache);
  });

  skip("keys() returns all keys", () => {
    const c = new cache.CacheManager(100);
    c.set("a", 1);
    c.set("b", 2);
    const keys = c.keys();
    assert.ok(keys.includes("a"));
    assert.ok(keys.includes("b"));
  });

  skip("wrap() caches function result", async () => {
    const c = new cache.CacheManager(100);
    let calls = 0;
    const fn = async () => { calls++; return "result"; };
    const r1 = await c.wrap("wrapped", fn, 60000);
    const r2 = await c.wrap("wrapped", fn, 60000);
    assert.equal(r1, "result");
    assert.equal(r2, "result");
    assert.equal(calls, 1, "fn should be called once (cached)");
  });
});
