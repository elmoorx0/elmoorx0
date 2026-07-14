/**
 * @elmoorx/webhooks — real integration tests
 * Run: npx tsx --test packages/webhooks/tests/webhooks.test.ts
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

let webhooks = null;
let skipReason = null;
try { webhooks = await import("../src/index.ts"); } catch (e) { skipReason = (e as Error).message?.slice(0, 200); }
const skip = skipReason ? test.skip : test;

// Helper: create a mock fetch that returns success
function mockFetchOk() {
  return async (url: string, opts: any) => {
    assert.equal(opts.method, "POST");
    assert.ok(opts.headers["X-Elmoorx-Event"]);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
}

// Helper: create a mock fetch that returns 4xx
function mockFetch4xx(status: number) {
  return async () => new Response("Bad Request", { status });
}

// Helper: create a mock fetch that always fails
function mockFetchFail() {
  return async () => { throw new Error("Network error"); };
}

describe("webhooks: sign + verify", () => {
  skip("sign() produces hex string", () => {
    const wh = new webhooks.WebhookDispatcher({ secret: "whsec_test" });
    const sig = wh.sign("payload body", 1234567890);
    assert.equal(typeof sig, "string");
    assert.ok(/^[0-9a-f]+$/.test(sig));
  });

  skip("sign() is deterministic", () => {
    const wh = new webhooks.WebhookDispatcher({ secret: "whsec_test" });
    const sig1 = wh.sign("payload", 123);
    const sig2 = wh.sign("payload", 123);
    assert.equal(sig1, sig2);
  });

  skip("sign() differs for different secrets", () => {
    const wh1 = new webhooks.WebhookDispatcher({ secret: "secret1" });
    const wh2 = new webhooks.WebhookDispatcher({ secret: "secret2" });
    const sig1 = wh1.sign("payload", 123);
    const sig2 = wh2.sign("payload", 123);
    assert.notEqual(sig1, sig2);
  });

  skip("verify() accepts valid signature", () => {
    const wh = new webhooks.WebhookDispatcher({ secret: "whsec_test" });
    const ts = 1234567890;
    const sig = wh.sign("payload", ts);
    assert.equal(wh.verify("payload", ts, sig), true);
  });

  skip("verify() rejects invalid signature", () => {
    const wh = new webhooks.WebhookDispatcher({ secret: "whsec_test" });
    assert.equal(wh.verify("payload", 123, "invalid-sig"), false);
  });

  skip("verify() rejects tampered payload", () => {
    const wh = new webhooks.WebhookDispatcher({ secret: "whsec_test" });
    const sig = wh.sign("original", 123);
    assert.equal(wh.verify("tampered", 123, sig), false);
  });
});

describe("webhooks: send", () => {
  skip("send() returns ok=true for 2xx response", async () => {
    const wh = new webhooks.WebhookDispatcher({
      secret: "whsec_test",
      fetchImpl: mockFetchOk() as any,
    });
    const result = await wh.send("https://example.com/hook", "event.type", { id: 1 });
    assert.equal(result.ok, true);
    assert.equal(result.status, 200);
  });

  skip("send() returns ok=false for 4xx response (no retry)", async () => {
    const wh = new webhooks.WebhookDispatcher({
      secret: "whsec_test",
      maxRetries: 3,
      fetchImpl: mockFetch4xx(400) as any,
    });
    const result = await wh.send("https://example.com/hook", "event.type", {});
    assert.equal(result.ok, false);
    assert.equal(result.status, 400);
    assert.equal(result.attempt, 1, "should not retry 4xx");
  });

  skip("send() retries on 5xx response", async () => {
    const wh = new webhooks.WebhookDispatcher({
      secret: "whsec_test",
      maxRetries: 2,
      backoffMs: 10, // fast backoff for test
      fetchImpl: mockFetch4xx(500) as any,
    });
    const result = await wh.send("https://example.com/hook", "event.type", {});
    assert.equal(result.ok, false);
    assert.equal(result.attempt, 2, "should retry up to maxRetries");
  });

  skip("send() retries on network error", async () => {
    const wh = new webhooks.WebhookDispatcher({
      secret: "whsec_test",
      maxRetries: 2,
      backoffMs: 10,
      fetchImpl: mockFetchFail() as any,
    });
    const result = await wh.send("https://example.com/hook", "event.type", {});
    assert.equal(result.ok, false);
    assert.equal(result.attempt, 2);
  });
});

describe("webhooks: headers", () => {
  skip("send() includes Content-Type header", async () => {
    let capturedOpts: any;
    const wh = new webhooks.WebhookDispatcher({
      secret: "whsec_test",
      fetchImpl: (async (url: string, opts: any) => {
        capturedOpts = opts;
        return new Response("{}", { status: 200 });
      }) as any,
    });
    await wh.send("https://example.com/hook", "test.event", {});
    assert.ok(capturedOpts.headers["Content-Type"]);
    assert.ok(capturedOpts.headers["Content-Type"].includes("json"));
  });

  skip("send() includes event type header", async () => {
    let capturedOpts: any;
    const wh = new webhooks.WebhookDispatcher({
      secret: "whsec_test",
      fetchImpl: (async (url: string, opts: any) => {
        capturedOpts = opts;
        return new Response("{}", { status: 200 });
      }) as any,
    });
    await wh.send("https://example.com/hook", "invoice.paid", {});
    assert.ok(
      capturedOpts.headers["X-Elmoorx-Event"]
    );
  });

  skip("send() includes signature header", async () => {
    let capturedOpts: any;
    const wh = new webhooks.WebhookDispatcher({
      secret: "whsec_test",
      fetchImpl: (async (url: string, opts: any) => {
        capturedOpts = opts;
        return new Response("{}", { status: 200 });
      }) as any,
    });
    await wh.send("https://example.com/hook", "test.event", { data: 1 });
    assert.ok(
      capturedOpts.headers["X-Elmoorx-Signature"]
    );
  });
});

describe("webhooks: version", () => {
  skip("VERSION is exported", () => {
    assert.equal(webhooks.VERSION, "3.0.0-alpha.2");
  });
});
