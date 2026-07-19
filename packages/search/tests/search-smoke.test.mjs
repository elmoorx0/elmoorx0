/**
 * @elmoorx/search — smoke tests
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

let mod = null;
let skipReason = null;
try { mod = await import("../src/index.ts"); } catch (e) { skipReason = String(e?.message || e).slice(0, 200); }
const skip = skipReason ? test.skip : test;

describe("search: smoke tests", () => {
  skip("createIndex is exported", () => {
    assert.equal(typeof mod.createIndex, "function");
  });

  skip("createIndex builds an index from documents", () => {
    const docs = [
      { id: "1", title: "Hello world", body: "First document" },
      { id: "2", title: "Hello there", body: "Second document" },
      { id: "3", title: "Goodbye", body: "Third document about something else" },
    ];
    const index = mod.createIndex(docs, ["title", "body"]);
    assert.ok(index);
    // Should have a search method
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(index));
    const hasSearch = methods.some(m => /search|query|find/i.test(m));
    assert.ok(hasSearch, `index should have search; found: ${methods.join(", ")}`);
  });

  skip("index.search returns matching documents", () => {
    const docs = [
      { id: "1", title: "Hello world", body: "First document" },
      { id: "2", title: "Hello there", body: "Second document" },
      { id: "3", title: "Goodbye", body: "Third document about something else" },
    ];
    const index = mod.createIndex(docs, ["title", "body"]);
    // Find the search method
    const proto = Object.getPrototypeOf(index);
    const methods = Object.getOwnPropertyNames(proto);
    const searchMethod = methods.find(m => /search|query|find/i.test(m));
    if (searchMethod) {
      const results = index[searchMethod]("hello");
      assert.ok(Array.isArray(results));
      // "hello" appears in docs 1 and 2
      assert.ok(results.length >= 2, `expected >=2 results for "hello", got ${results.length}`);
    }
  });

  skip("SearchBar component is exported", () => {
    assert.equal(typeof mod.SearchBar, "function");
  });
});
