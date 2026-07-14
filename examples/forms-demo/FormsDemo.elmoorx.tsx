/**
 * FormsDemo.elmoorx.tsx — Form handling with @elmoorx/forms
 */

import { $state, h, type ElmoorxNode } from "@elmoorx/runtime";
import { useForm, validators, validate } from "@elmoorx/forms";

function RegistrationForm() {
  const form = useForm({
    name: {
      initialValue: "",
      required: true,
      validate: validate(
        validators.required("Name is required"),
        validators.minLength(2),
      ),
    },
    email: {
      initialValue: "",
      required: true,
      validate: validate(
        validators.required(),
        validators.email(),
      ),
    },
    password: {
      initialValue: "",
      required: true,
      validate: validate(
        validators.required(),
        validators.minLength(8, "Password must be at least 8 characters"),
      ),
    },
    confirmPassword: {
      initialValue: "",
      required: true,
      validate: validate(
        validators.required(),
        validators.matches("password", "Passwords must match"),
      ),
    },
    age: {
      initialValue: 0,
      validate: (v) => Number(v) >= 18 || "Must be 18+",
    },
  });

  const submit = () => form.submit(async (values) => {
    console.log("Form submitted:", values);
    alert("Registration successful!");
    form.reset();
  });

  return h("form", { onSubmit: (e: Event) => { e.preventDefault(); submit(); }, class: "form" },
    h("h2", null, "Register"),

    // Name
    h("div", { class: "field" },
      h("label", null, "Name"),
      h("input", {
        type: "text",
        value: () => form.fields.name.value as string,
        onInput: (e: Event) => form.fields.name.setValue((e.target as HTMLInputElement).value),
        onBlur: () => form.fields.name.setTouched(),
      }),
      () => form.fields.name.error ? h("span", { class: "error" }, form.fields.name.error) : null,
    ),

    // Email
    h("div", { class: "field" },
      h("label", null, "Email"),
      h("input", {
        type: "email",
        value: () => form.fields.email.value as string,
        onInput: (e: Event) => form.fields.email.setValue((e.target as HTMLInputElement).value),
        onBlur: () => form.fields.email.setTouched(),
      }),
      () => form.fields.email.error ? h("span", { class: "error" }, form.fields.email.error) : null,
    ),

    // Password
    h("div", { class: "field" },
      h("label", null, "Password"),
      h("input", {
        type: "password",
        value: () => form.fields.password.value as string,
        onInput: (e: Event) => form.fields.password.setValue((e.target as HTMLInputElement).value),
        onBlur: () => form.fields.password.setTouched(),
      }),
      () => form.fields.password.error ? h("span", { class: "error" }, form.fields.password.error) : null,
    ),

    // Confirm password
    h("div", { class: "field" },
      h("label", null, "Confirm password"),
      h("input", {
        type: "password",
        value: () => form.fields.confirmPassword.value as string,
        onInput: (e: Event) => form.fields.confirmPassword.setValue((e.target as HTMLInputElement).value),
        onBlur: () => form.fields.confirmPassword.setTouched(),
      }),
      () => form.fields.confirmPassword.error
        ? h("span", { class: "error" }, form.fields.confirmPassword.error)
        : null,
    ),

    // Age
    h("div", { class: "field" },
      h("label", null, "Age"),
      h("input", {
        type: "number",
        value: () => String(form.fields.age.value),
        onInput: (e: Event) => form.fields.age.setValue(Number((e.target as HTMLInputElement).value)),
      }),
      () => form.fields.age.error ? h("span", { class: "error" }, form.fields.age.error) : null,
    ),

    h("button", {
      type: "submit",
      disabled: () => form.isSubmitting(),
    }, () => form.isSubmitting() ? "Submitting..." : "Register"),

    h("div", { class: "summary" },
      () => `Form valid: ${form.isValid() ? "✓" : "✗"}`,
    ),
  );
}

export default function Page(): ElmoorxNode {
  return h("main", null,
    h("style", null, `
      .form { max-width: 400px; margin: 40px auto; padding: 20px; }
      .field { margin-bottom: 14px; }
      .field label { display: block; margin-bottom: 4px; font-weight: 600; }
      .field input { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
      .error { color: #EF4444; font-size: 12px; margin-top: 4px; display: block; }
      .summary { margin-top: 16px; padding: 8px; background: #f4f4f4; }
    `),
    h(RegistrationForm, {}),
  );
}
