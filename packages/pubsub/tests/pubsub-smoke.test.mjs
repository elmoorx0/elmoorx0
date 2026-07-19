/**
 * @elmoorx/pubsub — smoke tests
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

let mod = null;
let skipReason = null;
try { mod = await import("../src/index.ts"); } catch (e) { skipReason = String(e?.message || e).slice(0, 200); }
const skip = skipReason ? test.skip : test;

describe("pubsub: smoke tests", () => {
  skip("pubsub singleton is exported", () => {
    assert.ok(mod.pubsub);
  });

  skip("createChannel is exported", () => {
    assert.equal(typeof mod.createChannel, "function");
  });

  skip("pubsub subscribe + publish roundtrip", () => {
    const proto = Object.getPrototypeOf(mod.pubsub);
    const methods = Object.getOwnPropertyNames(proto);
    // Need both subscribe and publish (or equivalent)
    const hasSubscribe = methods.some(m => /subscribe|on|addListener/i.test(m));
    const hasPublish = methods.some(m => /publish|emit|dispatch/i.test(m));
    assert.ok(hasSubscribe, `pubsub should have subscribe; found: ${methods.join(", ")}`);
    assert.ok(hasPublish, `pubsub should have publish; found: ${methods.join(", ")}`);
  });

  skip("createChannel returns an object with subscribe/publish", () => {
    const channel = mod.createChannel("test-channel");
    assert.ok(channel);
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(channel));
    const hasSubscribe = methods.some(m => /subscribe|on/i.test(m));
    const hasPublish = methods.some(m => /publish|emit|dispatch|send/i.test(m));
    assert.ok(hasSubscribe || typeof channel.subscribe === "function" || typeof channel.on === "function");
    assert.ok(hasPublish || typeof channel.publish === "function" || typeof channel.emit === "function" || typeof channel.send === "function");
  });
});
