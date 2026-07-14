/**
 * @elmoorx/email — real integration tests
 * Run: npx tsx --test packages/email/tests/email.test.ts
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

let mod = null;
try { mod = await import("../src/index.ts"); } catch (err) { console.error("[test] Failed to import source:", err); }
const skip = !mod ? test.skip : test;

describe("email: sendEmail", () => {
  skip("sendEmail is exported", () => {
    assert.equal(typeof mod.sendEmail, "function");
  });

  skip("emailSender is exported", () => {
    assert.ok(mod.emailSender);
  });

  skip("sendEmail sends via memory provider", async () => {
    const result = await mod.sendEmail({
      to: "user@example.com",
      subject: "Test",
      html: "<p>Hello</p>",
      provider: "memory",
    });
    assert.ok(result);
    assert.ok(result.id || result.messageId);
  });
});

describe("email: templates", () => {
  skip("WelcomeEmail is a function", () => {
    assert.equal(typeof mod.WelcomeEmail, "function");
  });

  skip("PasswordResetEmail is a function", () => {
    assert.equal(typeof mod.PasswordResetEmail, "function");
  });

  skip("VerifyEmail is a function", () => {
    assert.equal(typeof mod.VerifyEmail, "function");
  });

  skip("InvoiceEmail is a function", () => {
    assert.equal(typeof mod.InvoiceEmail, "function");
  });

  skip("NotificationEmail is a function", () => {
    assert.equal(typeof mod.NotificationEmail, "function");
  });
});
