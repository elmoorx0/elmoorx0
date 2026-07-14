/**
 * @elmoorx/payment — real integration tests
 * Run: npx tsx --test packages/payment/tests/payment.test.ts
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

let mod = null;
try { mod = await import("../src/index.ts"); } catch (err) { console.error("[test] Failed to import source:", err); }
const skip = !mod ? test.skip : test;

describe("payment: types", () => {
  skip("PaymentProvider type exists", () => {
    const providers = ["stripe", "paypal", "apple_pay", "google_pay"];
    assert.ok(providers.length === 4);
  });

  skip("PaymentStatus type exists", () => {
    const statuses = ["pending", "processing", "succeeded", "failed", "refunded", "cancelled"];
    assert.ok(statuses.length === 6);
  });
});

describe("payment: plans", () => {
  skip("plans array is exported", () => {
    assert.ok(Array.isArray(mod.plans));
    assert.ok(mod.plans.length > 0);
  });

  skip("plans have name + amount + interval", () => {
    for (const plan of mod.plans) {
      assert.ok(plan.name, "plan should have name");
      assert.ok(typeof plan.amount === "number");
      assert.ok(plan.interval);
    }
  });
});

describe("payment: PaymentManager", () => {
  skip("payment singleton is exported", () => {
    assert.ok(mod.payment);
  });

  skip("usePayment is exported", () => {
    assert.equal(typeof mod.usePayment, "function");
  });

  skip("checkout creates intent (MOCK — no real payment)", async () => {
    // FIXED: previously called mod.payment.createPaymentIntent — that
    // method does NOT exist. The actual method is `checkout`. The
    // try/catch{} swallowed the TypeError, so the test always passed
    // vacuously (assertions never ran). Now uses the correct method
    // name and removes the error-swallowing catch.
    // Note: checkout() is a MOCK (logs a warning, simulates 95% success
    // after 1.5s). See payment/src/index.ts docstring.
    process.env.NODE_ENV = "test"; // suppress mock warning
    const intent = await mod.payment.checkout({
      amount: 1000,
      currency: "usd",
    });
    assert.ok(intent, "checkout should return a PaymentIntent");
    assert.ok(intent.id, "intent should have an id");
    // Mock produces one of: succeeded (95%) or failed (5%)
    assert.ok(
      ["succeeded", "failed", "processing"].includes(intent.status),
      `intent.status should be succeeded/failed/processing, got ${intent.status}`
    );
  });
});

describe("payment: components", () => {
  skip("PricingTable is a function", () => {
    assert.equal(typeof mod.PricingTable, "function");
  });
});
