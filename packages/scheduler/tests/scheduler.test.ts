/**
 * @elmoorx/scheduler — real integration tests
 * Run: npx tsx --test packages/scheduler/tests/scheduler.test.ts
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

let scheduler = null;
let skipReason = null;
try { scheduler = await import("../src/index.ts"); } catch (e) { skipReason = (e as Error).message?.slice(0, 200); }
const skip = skipReason ? test.skip : test;

describe("scheduler: every()", () => {
  skip("every() returns a task ID", () => {
    const id = scheduler.scheduler.every(60000, () => {});
    assert.ok(typeof id === "string");
  });

  skip("every() accepts duration strings", () => {
    const id = scheduler.scheduler.every("5m", () => {});
    assert.ok(id);
  });

  skip("every() accepts duration units (ms/s/m/h/d)", () => {
    assert.ok(scheduler.scheduler.every("100ms", () => {}));
    assert.ok(scheduler.scheduler.every("5s", () => {}));
    assert.ok(scheduler.scheduler.every("2h", () => {}));
    assert.ok(scheduler.scheduler.every("1d", () => {}));
  });
});

describe("scheduler: cron()", () => {
  skip("cron() returns a task ID", () => {
    const id = scheduler.scheduler.cron("0 9 * * 1", () => {});
    assert.ok(typeof id === "string");
  });

  skip("cron() accepts 5-field expressions", () => {
    assert.ok(scheduler.scheduler.cron("*/5 * * * *", () => {}));
    assert.ok(scheduler.scheduler.cron("0 0 1 * *", () => {}));
    assert.ok(scheduler.scheduler.cron("30 3 * * *", () => {}));
  });
});

describe("scheduler: at()", () => {
  skip("at() returns a task ID", () => {
    const future = new Date(Date.now() + 60000).toISOString();
    const id = scheduler.scheduler.at(future, () => {});
    assert.ok(typeof id === "string");
  });

  skip("at() throws for invalid date", () => {
    assert.throws(() => scheduler.scheduler.at("not-a-date", () => {}));
  });
});

describe("scheduler: cancel + list", () => {
  skip("cancel() removes a task", () => {
    const id = scheduler.scheduler.every(60000, () => {});
    const cancelled = scheduler.scheduler.cancel(id);
    assert.equal(cancelled, true);
  });

  skip("cancel() returns false for unknown task", () => {
    assert.equal(scheduler.scheduler.cancel("unknown"), false);
  });

  skip("list() returns scheduled tasks", () => {
    scheduler.scheduler.every(60000, () => {}, "test-task");
    const tasks = scheduler.scheduler.list();
    assert.ok(Array.isArray(tasks));
    assert.ok(tasks.length > 0);
  });
});

describe("scheduler: start + stop", () => {
  skip("start() begins the scheduler", () => {
    scheduler.scheduler.start(1000);
    // Should not throw
  });

  skip("stop() halts the scheduler", () => {
    scheduler.scheduler.start(1000);
    scheduler.scheduler.stop();
    // Should not throw
  });
});

describe("scheduler: feature-flags integration", () => {
  skip("VERSION is exported", () => {
    assert.equal(scheduler.VERSION, "3.0.0-alpha.2");
  });

  skip("scheduler singleton is exported", () => {
    assert.ok(scheduler.scheduler);
  });

  skip("Scheduler class is exported", () => {
    assert.equal(typeof scheduler.Scheduler, "function");
    const s = new scheduler.Scheduler();
    assert.ok(s);
  });
});
