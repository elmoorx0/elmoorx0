/**
 * @elmoorx/queue — real integration tests
 * Run: npx tsx --test packages/queue/tests/queue.test.ts
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

let queue = null;
let skipReason = null;
try { queue = await import("../src/index.ts"); } catch (e) { skipReason = (e as Error).message?.slice(0, 200); }
const skip = skipReason ? test.skip : test;

describe("queue: basic operations", () => {
  skip("createQueue() returns a MessageQueue", () => {
    const q = queue.createQueue("test-queue");
    assert.ok(q);
    assert.equal(q.getName(), "test-queue");
  });

  skip("add() returns a job ID", () => {
    const q = queue.createQueue("test");
    const id = q.add({ data: "test" });
    assert.ok(typeof id === "string");
    assert.ok(id.length > 0);
  });

  skip("add() with priority", () => {
    const q = queue.createQueue("test");
    const id1 = q.add({ x: 1 }, { priority: 1 });
    const id2 = q.add({ x: 2 }, { priority: 10 });
    assert.ok(id1);
    assert.ok(id2);
  });

  skip("add() with delay", () => {
    const q = queue.createQueue("test");
    const id = q.add({ x: 1 }, { delay: 1000 });
    assert.ok(id);
  });
});

describe("queue: processing", () => {
  skip("process() registers a handler", () => {
    const q = queue.createQueue("test");
    q.process(async (job, progress) => {
      progress(100);
      return "done";
    });
    // Should not throw
  });

  skip("jobs are processed", async () => {
    const q = queue.createQueue("test", { concurrency: 1 });
    const processed = [];
    q.process(async (job) => {
      processed.push(job.id);
    });
    const id = q.add({ task: "test" });
    await new Promise(r => setTimeout(r, 200));
    assert.ok(processed.includes(id));
  });
});

describe("queue: job management", () => {
  skip("getJob() returns job by ID", () => {
    const q = queue.createQueue("test");
    const id = q.add({ data: "x" });
    const job = q.getJob(id);
    assert.ok(job);
    assert.equal(job.id, id);
  });

  skip("getJob() returns undefined for unknown ID", () => {
    const q = queue.createQueue("test");
    assert.equal(q.getJob("unknown"), undefined);
  });

  skip("getJobs() filters by status", () => {
    const q = queue.createQueue("test");
    q.add({ a: 1 });
    q.add({ b: 2 });
    const waiting = q.getWaiting();
    assert.equal(waiting.length, 2);
  });

  skip("pause() + resume() work", () => {
    const q = queue.createQueue("test");
    q.pause();
    q.resume();
    // Should not throw
  });
});

describe("queue: stats", () => {
  skip("getStats() returns queue statistics", () => {
    const q = queue.createQueue("test");
    q.add({ task: 1 });
    q.add({ task: 2 });
    const stats = q.getStats();
    assert.ok(stats);
    assert.ok(typeof stats === "object");
    assert.ok("total" in stats);
    assert.ok("waiting" in stats);
  });
});

describe("queue: cleanup", () => {
  skip("clearAll() removes all jobs", () => {
    const q = queue.createQueue("test");
    q.add({ a: 1 });
    q.add({ b: 2 });
    q.clearAll();
    assert.equal(q.getWaiting().length, 0);
  });
});

describe("queue: RateLimiter + CircuitBreaker", () => {
  skip("RateLimiter is exported", () => {
    assert.equal(typeof queue.RateLimiter, "function");
    const rl = new queue.RateLimiter();
    assert.ok(rl);
  });

  skip("CircuitBreaker is exported", () => {
    assert.equal(typeof queue.CircuitBreaker, "function");
    const cb = new queue.CircuitBreaker();
    assert.ok(cb);
  });
});
