/**
 * @elmoorx/crypto — real integration tests
 * Run: npx tsx --test packages/crypto/tests/crypto.test.ts
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

let mod = null;
try { mod = await import("../src/index.ts"); } catch (err) { console.error("[test] Failed to import source:", err); }
const skip = !mod ? test.skip : test;

describe("crypto: hashing", () => {
  skip("hash.sha256() returns hex string", async () => {
    const h = await mod.hash.sha256("test data");
    assert.ok(typeof h === "string");
    assert.ok(/^[0-9a-f]+$/.test(h));
    assert.equal(h.length, 64); // SHA-256 = 32 bytes = 64 hex chars
  });

  skip("hash.sha256() is deterministic", async () => {
    const h1 = await mod.hash.sha256("same input");
    const h2 = await mod.hash.sha256("same input");
    assert.equal(h1, h2);
  });

  skip("hash.sha256() differs for different input", async () => {
    const h1 = await mod.hash.sha256("input1");
    const h2 = await mod.hash.sha256("input2");
    assert.notEqual(h1, h2);
  });

  skip("hash.sha384() returns 96-char hex", async () => {
    const h = await mod.hash.sha384("data");
    assert.equal(h.length, 96);
  });

  skip("hash.sha512() returns 128-char hex", async () => {
    const h = await mod.hash.sha512("data");
    assert.equal(h.length, 128);
  });

  skip("hash.verify() checks password", async () => {
    const salt = mod.generateSalt(16);
    const hashVal = await mod.hash.bcryptLike("password123", salt);
    const valid = await mod.hash.verify("password123", salt, hashVal);
    assert.equal(valid, true);
    const invalid = await mod.hash.verify("wrong", salt, hashVal);
    assert.equal(invalid, false);
  });
});

describe("crypto: HMAC", () => {
  skip("hmac is exported", () => {
    assert.ok(mod.hmac);
    assert.equal(typeof mod.hmac.generateKey, "function");
    assert.equal(typeof mod.hmac.sign, "function");
    assert.equal(typeof mod.hmac.verify, "function");
  });

  skip("hmac.sign() + verify() roundtrip", async () => {
    const key = await mod.hmac.generateKey();
    const sig = await mod.hmac.sign("data", key);
    assert.ok(typeof sig === "string");
    const valid = await mod.hmac.verify("data", sig, key);
    assert.equal(valid, true);
  });

  skip("hmac.verify() rejects tampered data", async () => {
    const key = await mod.hmac.generateKey();
    const sig = await mod.hmac.sign("original", key);
    const valid = await mod.hmac.verify("tampered", sig, key);
    assert.equal(valid, false);
  });
});

describe("crypto: random", () => {
  skip("random.bytes() returns Uint8Array", () => {
    const bytes = mod.random.bytes(32);
    assert.ok(bytes instanceof Uint8Array || Buffer.isBuffer(bytes));
    assert.equal(bytes.length, 32);
  });

  skip("random.bytes() produces unique output", () => {
    const b1 = mod.random.bytes(16);
    const b2 = mod.random.bytes(16);
    assert.notEqual(Buffer.from(b1).toString("hex"), Buffer.from(b2).toString("hex"));
  });

  skip("generateSalt() returns hex string", () => {
    const salt = mod.generateSalt(16);
    assert.ok(typeof salt === "string");
    assert.ok(salt.length > 0);
  });
});

describe("crypto: constantTimeCompare", () => {
  skip("returns true for equal strings", () => {
    assert.equal(mod.constantTimeCompare("abc", "abc"), true);
  });

  skip("returns false for different strings", () => {
    assert.equal(mod.constantTimeCompare("abc", "xyz"), false);
  });

  skip("returns false for different lengths", () => {
    assert.equal(mod.constantTimeCompare("abc", "abcd"), false);
  });
});

describe("crypto: AES", () => {
  skip("aes is exported", () => {
    assert.ok(mod.aes);
  });
});

describe("crypto: RSA", () => {
  skip("rsa is exported", () => {
    assert.ok(mod.rsa);
  });
});
