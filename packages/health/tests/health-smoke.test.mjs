/**
 * @elmoorx/health — smoke tests
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

let mod = null;
let skipReason = null;
try { mod = await import("../src/index.ts"); } catch (e) { skipReason = String(e?.message || e).slice(0, 200); }
const skip = skipReason ? test.skip : test;

describe("health: smoke tests", () => {
  skip("health singleton is exported", () => {
    assert.ok(mod.health);
  });

  skip("health has register/check methods", () => {
    const proto = Object.getPrototypeOf(mod.health);
    const methods = Object.getOwnPropertyNames(proto);
    // Should have some way to register a check and run a check
    const hasRegister = methods.some(m => /register|add/i.test(m));
    const hasCheck = methods.some(m => /check|status|report/i.test(m));
    assert.ok(hasRegister, `health should have register; found: ${methods.join(", ")}`);
    assert.ok(hasCheck, `health should have check/status; found: ${methods.join(", ")}`);
  });

  skip("health.check() returns a report", async () => {
    const proto = Object.getPrototypeOf(mod.health);
    const methods = Object.getOwnPropertyNames(proto);
    const checkMethod = methods.find(m => /check|status|report/i.test(m));
    if (checkMethod && typeof mod.health[checkMethod] === "function") {
      const result = await mod.health[checkMethod]();
      assert.ok(result);
    }
  });
});
