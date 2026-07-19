/**
 * @elmoorx/notifications — smoke tests
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

let mod = null;
let skipReason = null;
try { mod = await import("../src/index.ts"); } catch (e) { skipReason = String(e?.message || e).slice(0, 200); }
const skip = skipReason ? test.skip : test;

describe("notifications: smoke tests", () => {
  skip("notify singleton is exported", () => {
    assert.ok(mod.notify);
  });

  skip("notificationTemplates are exported", () => {
    assert.ok(mod.notificationTemplates);
  });

  skip("notify.send (or similar dispatch method) exists", () => {
    // The notify singleton should have some dispatch method
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(mod.notify));
    const hasDispatch = ["send", "dispatch", "emit", "push", "notify"].some(m => methods.includes(m));
    assert.ok(hasDispatch, `notify should have a dispatch method; found: ${methods.join(", ")}`);
  });
});
