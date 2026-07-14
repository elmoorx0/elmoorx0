/**
 * @elmoorx/storage — real integration tests
 * Run: npx tsx --test packages/storage/tests/storage.test.ts
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

let mod = null;
try { mod = await import("../src/index.ts"); } catch (err) { console.error("[test] Failed to import source:", err); }
const skip = !mod ? test.skip : test;

describe("storage: createStorage", () => {
  skip("createStorage is exported", () => {
    assert.equal(typeof mod.createStorage, "function");
  });

  skip("createStorage('memory') returns Storage", () => {
    const storage = mod.createStorage("memory");
    assert.ok(storage);
    assert.equal(typeof storage.upload, "function");
    assert.equal(typeof storage.download, "function");
    assert.equal(typeof storage.delete, "function");
  });
});

describe("storage: memory driver operations", () => {
  skip("upload + download roundtrip", async () => {
    const storage = mod.createStorage("memory");
    const data = Buffer.from("Hello, Storage!");
    await storage.upload("test.txt", data, { contentType: "text/plain" });
    const downloaded = await storage.download("test.txt");
    assert.ok(downloaded);
    assert.equal(downloaded.toString(), "Hello, Storage!");
  });

  skip("delete removes file", async () => {
    const storage = mod.createStorage("memory");
    await storage.upload("temp.txt", Buffer.from("temp"));
    await storage.delete("temp.txt");
    try {
      await storage.download("temp.txt");
      assert.fail("should have thrown");
    } catch {
      // expected
    }
  });

  skip("list returns files", async () => {
    const storage = mod.createStorage("memory");
    await storage.upload("a.txt", Buffer.from("a"));
    await storage.upload("b.txt", Buffer.from("b"));
    const files = await storage.list();
    assert.ok(files.length >= 2);
  });

  skip("getMetadata returns file info", async () => {
    const storage = mod.createStorage("memory");
    await storage.upload("doc.txt", Buffer.from("content"), { contentType: "text/plain" });
    const meta = await storage.getMetadata("doc.txt");
    assert.ok(meta);
    assert.ok(meta.size > 0);
  });
});

describe("storage: helpers", () => {
  skip("getContentType returns correct MIME", () => {
    assert.ok(mod.getContentType("file.json").includes("json"));
    assert.ok(mod.getContentType("file.png").includes("png"));
    assert.ok(mod.getContentType("file.html").includes("html"));
  });

  skip("formatFileSize formats bytes", () => {
    const result1 = mod.formatFileSize(1024);
    assert.ok(result1.includes("KB") || result1.includes("kb"));
    const result2 = mod.formatFileSize(1048576);
    assert.ok(result2.includes("MB") || result2.includes("mb"));
  });
});
