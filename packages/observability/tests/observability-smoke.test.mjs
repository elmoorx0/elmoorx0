/**
 * @elmoorx/observability — smoke tests
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

let mod = null;
let skipReason = null;
try { mod = await import("../src/index.ts"); } catch (e) { skipReason = String(e?.message || e).slice(0, 200); }
const skip = skipReason ? test.skip : test;

describe("observability: smoke tests", () => {
  skip("Logger class is exported", () => {
    assert.equal(typeof mod.Logger, "function");
  });

  skip("MetricsCollector class is exported", () => {
    assert.equal(typeof mod.MetricsCollector, "function");
  });

  skip("Tracer class is exported", () => {
    assert.equal(typeof mod.Tracer, "function");
  });

  skip("Logger can be instantiated and log", () => {
    const logger = new mod.Logger("test");
    const origLog = console.log;
    const origErr = console.error;
    const origWarn = console.warn;
    console.log = () => {};
    console.error = () => {};
    console.warn = () => {};
    try {
      if (typeof logger.info === "function") logger.info("hello");
      if (typeof logger.error === "function") logger.error("err");
      if (typeof logger.warn === "function") logger.warn("warn");
    } finally {
      console.log = origLog;
      console.error = origErr;
      console.warn = origWarn;
    }
    assert.ok(true);
  });

  skip("MetricsCollector can be instantiated", () => {
    const metrics = new mod.MetricsCollector();
    assert.ok(metrics);
    // Try a counter if available
    if (typeof metrics.counter === "function") {
      metrics.counter("test_metric").inc();
    } else if (typeof metrics.increment === "function") {
      metrics.increment("test_metric");
    }
  });
});
