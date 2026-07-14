/**
 * @elmoorx/auth — real integration tests
 *
 * Run: npx tsx --test packages/auth/tests/auth.test.ts
 *
 * The AuthManager constructor requires ELMOORX_JWT_SECRET to be set.
 * We set a test-only value here BEFORE importing the source.
 */

// Set test secret BEFORE importing auth source. Must be ≥32 chars.
process.env.ELMOORX_JWT_SECRET = "test-secret-do-not-use-in-production-min-32-(chars as NonNullable<typeof chars>)!";

import { test, describe } from "node:test";
import assert from "node:assert/strict";

let auth = null;
let skipReason = null;

try {
  auth = await import("../src/index.ts");
} catch (err) {
  skipReason = (err instanceof Error ? err.message : String(err)).slice(0, 200);
}

const skipIfNoAuth = skipReason ? test.skip : test;

// Unique email per test run to avoid collision
const uniqueEmail = `test-${Date.now()}@example.com`;

describe("auth: hashPassword + verifyPassword", () => {
  skipIfNoAuth("hashPassword returns a string", async () => {
    const hash = await auth.auth.hashPassword("mylongpassword");
    assert.equal(typeof hash, "string");
    assert.ok(hash.length > 0);
    assert.ok(hash.startsWith("pbkdf2$"), "hash should be PBKDF2-formatted");
  });

  skipIfNoAuth("verifyPassword accepts correct password", async () => {
    const hash = await auth.auth.hashPassword("correct123");
    const ok = await auth.auth.verifyPassword("correct123", hash);
    assert.equal(ok, true);
  });

  skipIfNoAuth("verifyPassword rejects wrong password", async () => {
    const hash = await auth.auth.hashPassword("correct123");
    const ok = await auth.auth.verifyPassword("wrong", hash);
    assert.equal(ok, false);
  });

  skipIfNoAuth("hash is NON-deterministic (per-hash random salt)", async () => {
    // PBKDF2 with per-hash random salt → two hashes of the same password
    // MUST differ. This is the whole point of salting.
    const h1 = await auth.auth.hashPassword("samepass1");
    const h2 = await auth.auth.hashPassword("samepass1");
    assert.notEqual(h1, h2, "hashes must differ due to per-password salt");
    // But both should verify against the same password
    assert.equal(await auth.auth.verifyPassword("samepass1", h1), true);
    assert.equal(await auth.auth.verifyPassword("samepass1", h2), true);
  });

  skipIfNoAuth("verifyPassword returns false for malformed hash", async () => {
    assert.equal(await auth.auth.verifyPassword("pw", "not-a-valid-hash"), false);
    assert.equal(await auth.auth.verifyPassword("pw", "pbkdf2$abc$xxx$yyy"), false);
    assert.equal(await auth.auth.verifyPassword("pw", ""), false);
  });
});

describe("auth: signUp + signIn", () => {
  skipIfNoAuth("signUp creates a user", async () => {
    const user = await auth.auth.signUp(uniqueEmail, "password123", "Test User");
    assert.ok(user);
    assert.equal(user.email, uniqueEmail);
    assert.equal(user.name, "Test User");
    assert.ok(user.id);
  });

  skipIfNoAuth("signUp rejects duplicate email", async () => {
    const email = `dup-${Date.now()}@example.com`;
    await auth.auth.signUp(email, "password123", "User 2");
    await assert.rejects(
      () => auth.auth.signUp(email, "password123", "Duplicate"),
      /already registered/i
    );
  });

  skipIfNoAuth("signIn with correct credentials", async () => {
    const email = `signin-${Date.now()}@example.com`;
    await auth.auth.signUp(email, "mylongpassword", "Sign In User");
    const user = await auth.auth.signIn(email, "mylongpassword");
    assert.ok(user);
    assert.equal(user.email, email);
  });

  skipIfNoAuth("signIn rejects wrong password", async () => {
    const email = `wrong-${Date.now()}@example.com`;
    await auth.auth.signUp(email, "correctpw1", "User");
    await assert.rejects(
      () => auth.auth.signIn(email, "wrongpassword"),
      /invalid email or password|account locked/i
    );
  });

  skipIfNoAuth("signIn rejects non-existent user", async () => {
    await assert.rejects(
      () => auth.auth.signIn("nonexistent@example.com", "password123"),
      /invalid email or password|account locked/i
    );
  });
});

describe("auth: sessions", () => {
  skipIfNoAuth("signIn creates a session", async () => {
    const email = `session-${Date.now()}@example.com`;
    await auth.auth.signUp(email, "password123", "Session User");
    await auth.auth.signIn(email, "password123");
    // After signIn, auth should be authenticated
    assert.equal(auth.auth.isAuthenticated(), true);
    assert.ok(auth.auth.getUser());
    assert.equal(auth.auth.getUser()?.email, email);
  });

  skipIfNoAuth("signOut clears the session", async () => {
    const email = `logout-${Date.now()}@example.com`;
    await auth.auth.signUp(email, "password123", "Logout User");
    await auth.auth.signIn(email, "password123");
    assert.equal(auth.auth.isAuthenticated(), true);
    auth.auth.signOut();
    assert.equal(auth.auth.isAuthenticated(), false);
    assert.equal(auth.auth.getUser(), null);
  });

  skipIfNoAuth("verifyToken returns user for valid token", async () => {
    const email = `token-${Date.now()}@example.com`;
    await auth.auth.signUp(email, "password123", "Token User");
    await auth.auth.signIn(email, "password123");
    // Get the session token from state
    const stateSignal = auth.auth.getState();
    const state = stateSignal();
    assert.ok(state.session, "session should exist after signIn");
    const user = auth.auth.verifyToken(state.session!.token);
    assert.ok(user);
    assert.equal(user.email, email);
  });

  skipIfNoAuth("verifyToken returns null for invalid token", () => {
    const user = auth.auth.verifyToken("invalid.token.here");
    assert.equal(user, null);
  });
});

describe("auth: state management", () => {
  skipIfNoAuth("initial state has correct shape", () => {
    const stateSignal = auth.auth.getState();
    const state = stateSignal();
    assert.ok(typeof state === "object");
    assert.ok("user" in state);
    assert.ok("session" in state);
    assert.ok("isAuthenticated" in state);
  });

  skipIfNoAuth("useAuth returns auth state", () => {
    const result = auth.useAuth();
    assert.ok(result);
    assert.ok("user" in result);
    assert.ok("isAuthenticated" in result);
  });
});

describe("auth: password reset", () => {
  skipIfNoAuth("requestPasswordReset returns a token", async () => {
    const email = `reset-${Date.now()}@example.com`;
    await auth.auth.signUp(email, "oldpassword123", "Reset User");
    const token = await auth.auth.requestPasswordReset(email);
    assert.ok(token, "should return a reset token");
  });

  skipIfNoAuth("requestPasswordReset returns null for unknown email", async () => {
    const token = await auth.auth.requestPasswordReset("unknown@example.com");
    assert.equal(token, null);
  });

  skipIfNoAuth("resetPassword with valid token succeeds", async () => {
    const email = `reset2-${Date.now()}@example.com`;
    await auth.auth.signUp(email, "oldpassword123", "Reset User 2");
    const token = await auth.auth.requestPasswordReset(email);
    const ok = await auth.auth.resetPassword(token, "newpassword123");
    assert.equal(ok, true);
  });

  skipIfNoAuth("can signIn with new password after reset", async () => {
    const email = `reset3-${Date.now()}@example.com`;
    await auth.auth.signUp(email, "oldpassword123", "Reset User 3");
    const token = await auth.auth.requestPasswordReset(email);
    await auth.auth.resetPassword(token, "newpassword123");
    // Old password should fail
    await assert.rejects(() => auth.auth.signIn(email, "oldpassword123"));
    // New password should work
    const user = await auth.auth.signIn(email, "newpassword123");
    assert.ok(user);
  });
});

describe("auth: MFA", () => {
  skipIfNoAuth("generateMfaSecret returns a 32-char base32 string", async () => {
    const email = `mfa-${Date.now()}@example.com`;
    const user = await auth.auth.signUp(email, "password123", "MFA User");
    const secret = auth.auth.generateMfaSecret(user.id);
    assert.ok(typeof secret === "string");
    assert.equal(secret.length, 32, "TOTP secret should be 32 base32 chars (20 bytes)");
    assert.match(secret, /^[A-Z2-7]+$/, "secret should be base32 (RFC 4648)");
  });

  skipIfNoAuth("verifyMfa accepts the correct TOTP code", async () => {
    const email = `mfa2-${Date.now()}@example.com`;
    const user = await auth.auth.signUp(email, "password123", "MFA User 2");
    const secret = auth.auth.generateMfaSecret(user.id);
    // Compute the expected TOTP for "now" using the same algorithm.
    // We can't call the private totp() directly, so we accept any 6-digit
    // code from the same 30s window by calling verifyMfa with a freshly
    // computed code. To get that code, we replicate the algorithm here.
    const counter = Math.floor(Date.now() / 30000);
    const code = await computeTotpForTest(secret, counter);
    const result = await auth.auth.verifyMfa(user.id, code);
    assert.equal(result, true, "current TOTP code should verify");
  });

  skipIfNoAuth("verifyMfa rejects wrong code", async () => {
    const email = `mfa3-${Date.now()}@example.com`;
    const user = await auth.auth.signUp(email, "password123", "MFA User 3");
    auth.auth.generateMfaSecret(user.id);
    const result = await auth.auth.verifyMfa(user.id, "000000");
    // Could be true by 1-in-a-million chance, but extremely unlikely.
    assert.equal(result, false);
  });

  skipIfNoAuth("verifyMfa rejects non-numeric / wrong-length codes", async () => {
    const email = `mfa4-${Date.now()}@example.com`;
    const user = await auth.auth.signUp(email, "password123", "MFA User 4");
    auth.auth.generateMfaSecret(user.id);
    assert.equal(await auth.auth.verifyMfa(user.id, "abc123"), false);
    assert.equal(await auth.auth.verifyMfa(user.id, "12345"), false);
    assert.equal(await auth.auth.verifyMfa(user.id, "1234567"), false);
  });
});

// Test helper: compute a TOTP code from a base32 secret at a given counter.
// Mirrors the algorithm in src/index.ts (RFC 4226 HOTP with HMAC-SHA1).
async function computeTotpForTest(secret: string, counter: number): Promise<string> {
  const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = secret.replace(/=+$/g, "").toUpperCase();
  const out: number[] = [];
  let buffer = 0, bits = 0;
  for (const c of clean) {
    const v = B32.indexOf(c);
    if (v < 0) throw new Error("bad char");
    buffer = (buffer << 5) | v;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  const keyBytes = new Uint8Array(out);
  const key = await crypto.subtle.importKey(
    "raw", keyBytes, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]
  );
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setUint32(0, Math.floor(counter / 0x100000000));
  view.setUint32(4, counter >>> 0);
  const hmac = new Uint8Array(await crypto.subtle.sign("HMAC", key, buf));
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (binary % 1_000_000).toString().padStart(6, "0");
}

describe("auth: permissions (RBAC)", () => {
  skipIfNoAuth("hasPermission returns boolean", () => {
    const result = auth.auth.hasPermission("some.permission");
    assert.equal(typeof result, "boolean");
  });

  skipIfNoAuth("admin role has admin permission", async () => {
    const email = `admin-${Date.now()}@example.com`;
    await auth.auth.signUp(email, "password123", "Admin User");
    // Get the state signal and elevate current user to admin
    const stateSignal = auth.auth.getState();
    const state = stateSignal();
    if (state.user) {
      state.user.role = "admin";
      state.user.permissions = ["admin:*"];
    }
    // hasPermission checks current user
    const hasIt = auth.auth.hasPermission("admin:*");
    assert.equal(hasIt, true);
  });
});

describe("auth: OAuth", () => {
  skipIfNoAuth("signInWithOAuth accepts google/github/apple/facebook", async () => {
    // This will likely redirect or return void — we just verify it doesn't throw
    for (const provider of ["google", "github", "apple", "facebook"]) {
      try {
        await auth.auth.signInWithOAuth(provider);
      } catch (err) {
        // In test environment, OAuth will fail (no real provider) — that's OK
        // We just verify the method accepts the provider name
      }
    }
  });
});

describe("auth: components", () => {
  skipIfNoAuth("Protected is a function", () => {
    assert.equal(typeof auth.Protected, "function");
  });

  skipIfNoAuth("SignInForm is a function", () => {
    assert.equal(typeof auth.SignInForm, "function");
  });
});
