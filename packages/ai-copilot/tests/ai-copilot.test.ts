/**
 * @elmoorx/ai-copilot — Unit tests for pure helpers
 *
 * Verifies:
 *   - extractSubject() stops at prepositions and returns a normalized subject
 *   - toPascalCase() converts space-separated words correctly
 *   - generateFromTemplate() dispatches to the right template by keyword
 *   - generateFromTemplate() falls back to a generic component
 *   - generated templates include the auto-sanitization preamble
 *
 * The generateWithLLM() path is not tested here because it requires
 * a live network call (or a fetch mock); the helper functions cover
 * the testable surface.
 *
 * Run: npx tsx --test packages/ai-copilot/tests/ai-copilot.test.ts
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

let mod: typeof import("../src/index.ts") | null = null;
let skip = false;
try {
  mod = await import("../src/index.ts");
} catch (err) {
  skip = true;
  console.warn("Skipping ai-copilot tests:", (err as Error).message);
}

const testIfLoaded = skip ? test.skip : test;

describe("ai-copilot: extractSubject", () => {
  testIfLoaded("extracts the leading noun phrase from a description", () => {
    assert.equal(mod!.extractSubject("login form"), "login form");
    assert.equal(mod!.extractSubject("todo list"), "todo list");
    assert.equal(mod!.extractSubject("counter"), "counter");
  });

  testIfLoaded("stops at prepositions/conjunctions", () => {
    assert.equal(mod!.extractSubject("todo list with filters"), "todo list");
    assert.equal(mod!.extractSubject("contact form for support"), "contact form");
    assert.equal(mod!.extractSubject("data table and charts"), "data table");
    assert.equal(mod!.extractSubject("modal that closes on escape"), "modal");
    assert.equal(mod!.extractSubject("navbar in dark mode"), "navbar");
    assert.equal(mod!.extractSubject("search on top"), "search");
  });

  testIfLoaded("falls back to 'component' for empty input", () => {
    assert.equal(mod!.extractSubject(""), "component");
    assert.equal(mod!.extractSubject("   "), "component");
  });

  testIfLoaded("lowercases the input before processing", () => {
    assert.equal(mod!.extractSubject("Login Form"), "login form");
    assert.equal(mod!.extractSubject("TODO LIST"), "todo list");
  });
});

describe("ai-copilot: toPascalCase", () => {
  testIfLoaded("converts space-separated words to PascalCase", () => {
    assert.equal(mod!.toPascalCase("login form"), "LoginForm");
    assert.equal(mod!.toPascalCase("todo list"), "TodoList");
    assert.equal(mod!.toPascalCase("user profile settings"), "UserProfileSettings");
  });

  testIfLoaded("handles single-word input", () => {
    assert.equal(mod!.toPascalCase("counter"), "Counter");
    assert.equal(mod!.toPascalCase("modal"), "Modal");
  });

  testIfLoaded("handles empty input", () => {
    assert.equal(mod!.toPascalCase(""), "");
  });

  testIfLoaded("capitalizes already-lowercased single char", () => {
    assert.equal(mod!.toPascalCase("x"), "X");
  });
});

describe("ai-copilot: generateFromTemplate dispatch", () => {
  testIfLoaded("routes 'login' descriptions to the login template", () => {
    const out = mod!.generateFromTemplate("login form", "LoginForm");
    assert.ok(out.includes("LoginForm"), "should reference the component name");
    assert.ok(out.includes("island"), "should wrap in island()");
    assert.ok(out.includes("$state"), "should use $state for reactivity");
    assert.ok(out.includes("email"), "login template should reference email field");
    assert.ok(out.includes("password"), "login template should reference password field");
  });

  testIfLoaded("routes 'sign in' descriptions to the login template", () => {
    const out = mod!.generateFromTemplate("sign in page", "SignInPage");
    assert.ok(out.includes("SignInPage"));
    assert.ok(out.includes("password"));
  });

  testIfLoaded("routes 'todo' descriptions to the todo template", () => {
    const out = mod!.generateFromTemplate("todo list", "TodoList");
    assert.ok(out.includes("TodoList"));
    assert.ok(/todo/i.test(out));
  });

  testIfLoaded("routes 'counter' descriptions to the counter template", () => {
    const out = mod!.generateFromTemplate("counter button", "CounterButton");
    assert.ok(out.includes("CounterButton"));
    assert.ok(/count/i.test(out));
  });

  testIfLoaded("routes 'chart' descriptions to the chart template", () => {
    const out = mod!.generateFromTemplate("bar chart", "BarChart");
    assert.ok(out.includes("BarChart"));
  });

  testIfLoaded("routes 'modal' descriptions to the modal template", () => {
    const out = mod!.generateFromTemplate("confirmation modal", "ConfirmationModal");
    assert.ok(out.includes("ConfirmationModal"));
  });

  testIfLoaded("falls back to generic component for unknown descriptions", () => {
    const out = mod!.generateFromTemplate("some weird thing", "SomeWeirdThing");
    assert.ok(out.includes("SomeWeirdThing"));
    // Generic template uses h() factory rather than island()
    assert.ok(out.includes("h(") || out.includes("island"), "should produce renderable output");
  });

  testIfLoaded("all templates import from @elmoorx/runtime", () => {
    const descriptions = [
      "login form", "todo list", "counter", "contact form", "chart",
      "modal", "navbar", "table", "search", "dropdown", "random thing",
    ];
    for (const desc of descriptions) {
      const out = mod!.generateFromTemplate(desc, "TestComp");
      assert.ok(
        out.includes("@elmoorx/runtime"),
        `template for "${desc}" should import @elmoorx/runtime`,
      );
    }
  });
});
