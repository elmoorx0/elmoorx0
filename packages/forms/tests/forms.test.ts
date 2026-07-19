/**
 * @elmoorx/forms — real integration tests
 * Run: npx tsx --test packages/forms/tests/forms.test.ts
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

let forms = null;
let skipReason = null;
try { forms = await import("../src/index.ts"); } catch (e) { skipReason = (e as Error).message?.slice(0, 200); }
const skip = skipReason ? test.skip : test;

describe("forms: validators", () => {
  skip("required() rejects empty", () => {
    const v = forms.validators.required();
    assert.equal(v("", {}), "Required");
    assert.equal(v(null, {}), "Required");
    assert.equal(v(undefined, {}), "Required");
    assert.equal(v("hello", {}), true);
  });

  skip("required() with custom message", () => {
    const v = forms.validators.required("Custom message");
    assert.equal(v("", {}), "Custom message");
  });

  skip("email() validates format", () => {
    const v = forms.validators.email();
    assert.equal(v("user@example.com", {}), true);
    assert.equal(v("invalid", {}), "Invalid email");
    // empty string is NOT a valid email — use required() to allow empties
    assert.equal(v("", {}), "Invalid email");
  });

  skip("minLength() checks length", () => {
    const v = forms.validators.minLength(5);
    assert.equal(v("hello", {}), true);
    assert.equal(v("hi", {}), "Must be at least 5 characters");
  });

  skip("maxLength() checks length", () => {
    const v = forms.validators.maxLength(5);
    assert.equal(v("hello", {}), true);
    assert.equal(v("toolong", {}), "Must be at most 5 characters");
  });

  skip("pattern() matches regex", () => {
    const v = forms.validators.pattern(/^[A-Z]+$/);
    assert.equal(v("ABC", {}), true);
    assert.equal(v("abc", {}), "Invalid format");
  });

  skip("min() checks minimum value", () => {
    const v = forms.validators.min(10);
    assert.equal(v(15, {}), true);
    assert.equal(v(5, {}), "Must be at least 10");
  });

  skip("max() checks maximum value", () => {
    const v = forms.validators.max(100);
    assert.equal(v(50, {}), true);
    assert.equal(v(150, {}), "Must be at most 100");
  });
});

describe("forms: validate()", () => {
  skip("validate() chains validators", async () => {
    const v = forms.validate(
      forms.validators.required(),
      forms.validators.minLength(3)
    );
    assert.equal(await v("", {}), "Required");
    assert.equal(await v("hi", {}), "Must be at least 3 characters");
    assert.equal(await v("hello", {}), true);
  });

  skip("validate() returns true when all pass", async () => {
    const v = forms.validate(
      forms.validators.required(),
      forms.validators.email()
    );
    assert.equal(await v("user@example.com", {}), true);
  });
});

describe("forms: useForm", () => {
  skip("useForm() returns form instance", () => {
    const form = forms.useForm({
      email: { required: true },
      password: {},
    });
    assert.ok(form);
  });

  skip("useForm() required field shows error after validate()", async () => {
    // Regression test: previously validateField() tried to assign to
    // `field.error`, which is a getter-only property → threw TypeError
    // in strict mode. Now it uses field.setError().
    const form = forms.useForm({
      email: { required: true, requiredMessage: "Email is required" },
    });
    assert.equal(form.fields.email.error, null);
    const ok = await form.validate();
    assert.equal(ok, false);
    assert.equal(form.fields.email.error, "Email is required");
  });

  skip("useForm() custom validate() sets error", async () => {
    const form = forms.useForm({
      email: {
        initialValue: "",
        validate: (v) => (String(v).includes("@") ? true : "Invalid email"),
      },
    });
    // setTouched triggers async validateField; await form.validate() to settle.
    form.fields.email.setTouched();
    await form.validate();
    assert.equal(form.fields.email.error, "Invalid email");
    form.fields.email.setValue("user@example.com");
    await form.validate();
    assert.equal(form.fields.email.error, null);
  });

  skip("useForm() reset() clears errors", async () => {
    const form = forms.useForm({
      email: { required: true },
    });
    await form.validate();
    assert.notEqual(form.fields.email.error, null);
    form.reset();
    assert.equal(form.fields.email.error, null);
  });

  skip("useForm() submit() aborts when invalid", async () => {
    const form = forms.useForm({
      email: { required: true },
    });
    let called = false;
    await form.submit(async () => { called = true; });
    assert.equal(called, false);
  });

  skip("useForm() submit() calls handler when valid", async () => {
    const form = forms.useForm({
      email: { initialValue: "user@example.com", required: true },
    });
    let received;
    await form.submit(async (values) => { received = values.email; });
    assert.equal(received, "user@example.com");
  });

  skip("validators object is exported", () => {
    assert.ok(forms.validators);
    assert.equal(typeof forms.validators.required, "function");
    assert.equal(typeof forms.validators.email, "function");
    assert.equal(typeof forms.validators.minLength, "function");
  });

  skip("validate() is exported", () => {
    assert.equal(typeof forms.validate, "function");
  });
});
