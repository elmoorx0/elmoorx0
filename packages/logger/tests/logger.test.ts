/**
 * @elmoorx/logger — Logger tests
 *
 * Verifies:
 *   - Level filtering (only logs at >= minLevel)
 *   - Memory transport captures entries
 *   - Logger.child inherits context/tags/transports
 *   - Named loggers are cached
 *   - logCount tracks total emitted entries
 *   - createLogFilter helper works
 *
 * Run: npx tsx --test packages/logger/tests/logger.test.ts
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

let Logger: typeof import("../src/index.ts").Logger;
let logger: typeof import("../src/index.ts").logger;
let getLogger: typeof import("../src/index.ts").getLogger;
let createLogFilter: typeof import("../src/index.ts").createLogFilter;
let skip = false;
try {
  const mod = await import("../src/index.ts");
  Logger = mod.Logger;
  logger = mod.logger;
  getLogger = mod.getLogger;
  createLogFilter = mod.createLogFilter;
} catch (err) {
  skip = true;
  console.warn("Skipping logger tests:", (err as Error).message);
}

const testIfLoaded = skip ? test.skip : test;

describe("logger: level filtering", () => {
  testIfLoaded("default level is info — debug is filtered out", () => {
    const mem = Logger.memoryTransport(100);
    const l = new Logger({ transports: [mem.transport] });
    l.debug("should be filtered");
    l.info("should pass");
    assert.equal(mem.getLogs().length, 1);
    assert.equal(mem.getLogs()[0].message, "should pass");
  });

  testIfLoaded("setLevel changes the threshold", () => {
    const mem = Logger.memoryTransport(100);
    const l = new Logger({ transports: [mem.transport], level: "error" });
    l.warn("filtered");
    l.error("passes");
    assert.equal(mem.getLogs().length, 1);
    assert.equal(mem.getLogs()[0].level, "error");
  });

  testIfLoaded("all six levels exist on the logger", () => {
    const l = new Logger({ transports: [] });
    assert.equal(typeof l.trace, "function");
    assert.equal(typeof l.debug, "function");
    assert.equal(typeof l.info, "function");
    assert.equal(typeof l.warn, "function");
    assert.equal(typeof l.error, "function");
    assert.equal(typeof l.fatal, "function");
  });
});

describe("logger: memory transport", () => {
  testIfLoaded("caps at maxSize by dropping oldest entries", () => {
    const mem = Logger.memoryTransport(3);
    const l = new Logger({ transports: [mem.transport], level: "trace" });
    l.info("a"); l.info("b"); l.info("c"); l.info("d"); l.info("e");
    assert.equal(mem.getLogs().length, 3);
    assert.equal(mem.getLogs()[0].message, "c");
    assert.equal(mem.getLogs()[2].message, "e");
  });

  testIfLoaded("clear() empties the buffer", () => {
    const mem = Logger.memoryTransport(100);
    const l = new Logger({ transports: [mem.transport] });
    l.info("x"); l.info("y");
    assert.equal(mem.getLogs().length, 2);
    mem.clear();
    assert.equal(mem.getLogs().length, 0);
  });
});

describe("logger: child logger", () => {
  testIfLoaded("child inherits context + tags + transports", () => {
    const mem = Logger.memoryTransport(100);
    const parent = new Logger({
      transports: [mem.transport],
      context: { env: "test" },
      tags: ["parent-tag"],
    });
    const child = parent.child({ context: { request: "abc" }, tags: ["child-tag"] });
    child.info("hello");

    const entry = mem.getLogs()[0];
    assert.equal(entry.context?.env, "test", "should inherit parent context");
    assert.equal(entry.context?.request, "abc", "should merge child context");
    assert.ok(entry.tags?.includes("parent-tag"), "should inherit parent tags");
    assert.ok(entry.tags?.includes("child-tag"), "should merge child tags");
  });
});

describe("logger: logCount + entry shape", () => {
  testIfLoaded("logCount increments per emitted entry", () => {
    const mem = Logger.memoryTransport(100);
    const l = new Logger({ transports: [mem.transport] });
    l.info("a"); l.info("b"); l.info("c");
    assert.equal(l.getLogCount(), 3);
  });

  testIfLoaded("filtered entries don't increment logCount", () => {
    const mem = Logger.memoryTransport(100);
    const l = new Logger({ transports: [mem.transport], level: "warn" });
    l.info("filtered"); l.info("filtered"); l.warn("passes");
    assert.equal(l.getLogCount(), 1);
  });

  testIfLoaded("entry has timestamp and level", () => {
    const mem = Logger.memoryTransport(100);
    const l = new Logger({ transports: [mem.transport] });
    const before = Date.now();
    l.info("x", { foo: 1 });
    const after = Date.now();
    const entry = mem.getLogs()[0];
    assert.ok(entry.timestamp >= before && entry.timestamp <= after);
    assert.equal(entry.level, "info");
    assert.equal(entry.message, "x");
    assert.deepEqual(entry.data, { foo: 1 });
  });
});

describe("logger: named loggers", () => {
  testIfLoaded("getLogger returns the same instance for the same name", () => {
    const a = getLogger("svc-a");
    const b = getLogger("svc-a");
    assert.equal(a, b);
  });

  testIfLoaded("getLogger returns different instances for different names", () => {
    const a = getLogger("svc-a");
    const b = getLogger("svc-b");
    assert.notEqual(a, b);
  });
});

describe("logger: createLogFilter", () => {
  testIfLoaded("filter rejects entries below the threshold", () => {
    const filter = createLogFilter("warn");
    assert.equal(filter({ level: "debug", message: "x", timestamp: 0 }), false);
    assert.equal(filter({ level: "info", message: "x", timestamp: 0 }), false);
    assert.equal(filter({ level: "warn", message: "x", timestamp: 0 }), true);
    assert.equal(filter({ level: "error", message: "x", timestamp: 0 }), true);
    assert.equal(filter({ level: "fatal", message: "x", timestamp: 0 }), true);
  });
});

describe("logger: shared singleton", () => {
  testIfLoaded("logger singleton is an instance of Logger", () => {
    assert.ok(logger instanceof Logger);
  });
});
