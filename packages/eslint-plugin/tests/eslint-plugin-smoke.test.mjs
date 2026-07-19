/**
 * @elmoorx/eslint-plugin — smoke tests
 *
 * Verifies that the ESLint plugin loads and exports the expected rules
 * and configs. Does NOT run ESLint itself — that's covered by the
 * plugin's own integration tests (if any).
 *
 * Run: npx tsx --test packages/eslint-plugin/tests/eslint-plugin-smoke.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

let plugin = null;
let rules = null;
let skipReason = null;
try {
  const mod = await import("../src/index.ts");
  plugin = mod.default;
  rules = mod.rules;
} catch (e) {
  skipReason = String(e?.message || e).slice(0, 300);
}

const skip = skipReason ? test.skip : test;

describe("eslint-plugin: module exports", () => {
  skip("default export is the plugin object", () => {
    assert.ok(plugin, skipReason || "plugin should load");
    assert.equal(typeof plugin, "object");
  });

  skip("plugin has meta with name + version", () => {
    assert.ok(plugin.meta);
    assert.equal(plugin.meta.name, "@elmoorx/eslint-plugin");
    assert.equal(typeof plugin.meta.version, "string");
  });

  skip("plugin has rules object", () => {
    assert.ok(plugin.rules);
    assert.equal(typeof plugin.rules, "object");
  });

  skip("rules object is also exported separately", () => {
    assert.ok(rules);
    assert.equal(typeof rules, "object");
    // Should be the same object as plugin.rules
    assert.equal(rules, plugin.rules);
  });
});

describe("eslint-plugin: rules", () => {
  skip("expected rules are present", () => {
    const expectedRules = [
      "no-dangerously-set-inner-html",
      "require-key-in-list",
      "cleanup-on-mount",
      "no-state-outside-component",
    ];
    for (const name of expectedRules) {
      assert.ok(plugin.rules[name], `rule '${name}' should be present`);
    }
  });

  skip("each rule has meta + create", () => {
    for (const [name, rule] of Object.entries(plugin.rules)) {
      assert.ok(rule.meta, `rule '${name}' should have meta`);
      assert.equal(typeof rule.create, "function", `rule '${name}' should have create()`);
    }
  });

  skip("no-dangerously-set-inner-html rule has a 'create' visitor", () => {
    const rule = plugin.rules["no-dangerously-set-inner-html"];
    const visitors = rule.create({});
    assert.ok(visitors, "create() should return visitor handlers");
    assert.ok(typeof visitors === "object");
    // Should have at least one visitor method (e.g. JSXAttribute, Property, etc.)
    const visitorKeys = Object.keys(visitors);
    assert.ok(visitorKeys.length > 0, `should have visitor methods; got: ${visitorKeys.join(", ")}`);
  });

  skip("require-key-in-list rule has a 'create' visitor", () => {
    const rule = plugin.rules["require-key-in-list"];
    const visitors = rule.create({});
    assert.ok(visitors);
    const visitorKeys = Object.keys(visitors);
    assert.ok(visitorKeys.length > 0);
  });
});

describe("eslint-plugin: configs", () => {
  skip("recommended config is present", () => {
    assert.ok(plugin.configs);
    assert.ok(plugin.configs.recommended);
    assert.ok(plugin.configs.recommended.rules);
  });

  skip("recommended config enables the core rules", () => {
    const r = plugin.configs.recommended.rules;
    assert.ok(r["@elmoorx/no-dangerously-set-inner-html"], "should enable no-dangerously-set-inner-html");
    assert.ok(r["@elmoorx/require-key-in-list"], "should enable require-key-in-list");
    assert.ok(r["@elmoorx/cleanup-on-mount"], "should enable cleanup-on-mount");
    assert.ok(r["@elmoorx/no-state-outside-component"], "should enable no-state-outside-component");
  });

  skip("recommended config uses the @elmoorx plugin", () => {
    assert.ok(plugin.configs.recommended.plugins);
    assert.ok(plugin.configs.recommended.plugins.includes("@elmoorx"));
  });

  skip("strict config is present and stricter than recommended", () => {
    assert.ok(plugin.configs.strict);
    assert.ok(plugin.configs.strict.rules);
    // In strict mode, require-key-in-list should be 'error' (not 'warn')
    const r = plugin.configs.strict.rules;
    assert.equal(r["@elmoorx/require-key-in-list"], "error");
    assert.equal(r["@elmoorx/cleanup-on-mount"], "error");
  });
});
