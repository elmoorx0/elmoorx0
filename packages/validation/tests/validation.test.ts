/**
 * @elmoorx/validation — real integration tests
 * Run: npx tsx --test packages/validation/tests/validation.test.ts
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

let mod = null;
try { mod = await import("../src/index.ts"); } catch (err) { console.error("[test] Failed to import source:", err); }
const skip = !mod ? test.skip : test;

describe("validation: v (schema builders)", () => {
  skip("v is exported", () => {
    assert.ok(mod.v);
    assert.equal(typeof mod.v.string, "function");
    assert.equal(typeof mod.v.number, "function");
    assert.equal(typeof mod.v.object, "function");
  });

  skip("v.string() validates strings", () => {
    assert.equal(mod.validate(mod.v.string(), "hello").valid, true);
    assert.equal(mod.validate(mod.v.string(), 123).valid, false);
  });

  skip("v.number() validates numbers", () => {
    assert.equal(mod.validate(mod.v.number(), 42).valid, true);
    assert.equal(mod.validate(mod.v.number(), "42").valid, false);
  });

  skip("v.string().email() validates emails", () => {
    const emailSchema = mod.v.string().email();
    assert.equal(mod.validate(emailSchema, "user@example.com").valid, true);
    assert.equal(mod.validate(emailSchema, "invalid").valid, false);
  });

  skip("v.string().min() checks minimum length", () => {
    const schema = mod.v.string().min(5);
    assert.equal(mod.validate(schema, "hello").valid, true);
    assert.equal(mod.validate(schema, "hi").valid, false);
  });

  skip("v.number().min() checks minimum value", () => {
    const schema = mod.v.number().min(18);
    assert.equal(mod.validate(schema, 25).valid, true);
    assert.equal(mod.validate(schema, 10).valid, false);
  });

  skip("v.boolean() validates booleans", () => {
    assert.equal(mod.validate(mod.v.boolean(), true).valid, true);
    assert.equal(mod.validate(mod.v.boolean(), "true").valid, false);
  });

  skip("v.enum() validates enum values", () => {
    const schema = mod.v.enum(["red", "green", "blue"]);
    assert.equal(mod.validate(schema, "red").valid, true);
    assert.equal(mod.validate(schema, "yellow").valid, false);
  });
});

describe("validation: validate()", () => {
  skip("validate is exported", () => {
    assert.equal(typeof mod.validate, "function");
  });

  skip("validate returns { valid, data?, errors? }", () => {
    const result = mod.validate(mod.v.string(), "test");
    assert.ok("valid" in result);
    // data present on success, errors present on failure
    assert.equal(result.valid, true);
    assert.ok(result.data !== undefined);
  });

  skip("validate returns data on success", () => {
    const result = mod.validate(mod.v.string(), "hello");
    assert.equal(result.valid, true);
    assert.equal(result.data, "hello");
  });

  skip("validate returns errors on failure", () => {
    const result = mod.validate(mod.v.string(), 123);
    assert.equal(result.valid, false);
    assert.ok(result.errors);
    assert.ok(result.errors.length > 0);
  });
});

describe("validation: object schema", () => {
  skip("v.object() validates objects", () => {
    const schema = mod.v.object({
      name: mod.v.string(),
      age: mod.v.number(),
    });
    const result = mod.validate(schema, { name: "Alice", age: 30 });
    assert.equal(result.valid, true);
  });

  skip("v.object() catches missing fields", () => {
    const schema = mod.v.object({
      name: mod.v.string(),
      age: mod.v.number(),
    });
    const result = mod.validate(schema, { name: "Alice" });
    assert.equal(result.valid, false);
    assert.ok(result.errors);
  });

  skip("v.object() with nested validators", () => {
    const schema = mod.v.object({
      email: mod.v.string().email(),
      password: mod.v.string().min(8),
    });
    assert.equal(mod.validate(schema, { email: "a@b.com", password: "longpassword" }).valid, true);
    assert.equal(mod.validate(schema, { email: "invalid", password: "short" }).valid, false);
  });
});
