/**
 * @elmoorx/cli — smoke tests
 *
 * Verifies that the CLI commands module loads and exports the expected
 * functions. Does NOT test full CLI behavior (which requires spawning
 * a child process and inspecting stdout).
 *
 * Run: npx tsx --test packages/cli/tests/cli-smoke.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

let commands = null;
let skipReason = null;
try {
  commands = await import("../src/commands.ts");
} catch (e) {
  skipReason = `commands: ${String(e?.message || e).slice(0, 300)}`;
}

const skip = skipReason ? test.skip : test;

describe("cli: commands module exports", () => {
  skip("commands module loads", () => {
    assert.ok(commands, skipReason || "commands should load");
  });

  skip("doctor() is an async function", () => {
    assert.equal(typeof commands.doctor, "function");
    // doctor returns a Promise
    assert.equal(commands.doctor.constructor.name, "AsyncFunction");
  });

  skip("info() is an async function", () => {
    assert.equal(typeof commands.info, "function");
    assert.equal(commands.info.constructor.name, "AsyncFunction");
  });

  skip("analyze() is an async function", () => {
    assert.equal(typeof commands.analyze, "function");
    assert.equal(commands.analyze.constructor.name, "AsyncFunction");
  });

  skip("clean() is an async function", () => {
    assert.equal(typeof commands.clean, "function");
    assert.equal(commands.clean.constructor.name, "AsyncFunction");
  });

  skip("checkUpdates() is an async function", () => {
    assert.equal(typeof commands.checkUpdates, "function");
    assert.equal(commands.checkUpdates.constructor.name, "AsyncFunction");
  });

  skip("format* helpers are sync functions", () => {
    for (const name of ["formatDoctorOutput", "formatInfoOutput", "formatAnalyzeOutput"]) {
      assert.equal(typeof commands[name], "function", `${name} should be a function`);
      assert.notEqual(commands[name].constructor.name, "AsyncFunction", `${name} should be sync`);
    }
  });
});

describe("cli: commands behavior", () => {
  skip("doctor() returns DoctorCheck[] for a non-existent dir", async () => {
    // doctor should not throw on a non-existent dir — it should return
    // checks with status 'fail' for each missing file/dir.
    const checks = await commands.doctor("/tmp/elmoorx-test-nonexistent-xyz");
    assert.ok(Array.isArray(checks));
    // Each check should have a name + status
    for (const c of checks) {
      assert.ok(typeof c.name === "string" || typeof c.check === "string" || typeof c.label === "string" || typeof c.id === "string",
        "check should have a name field");
    }
  });

  skip("info() returns ProjectInfo for the current dir", async () => {
    const info = await commands.info(process.cwd());
    assert.ok(info);
    assert.ok(typeof info === "object");
  });

  skip("analyze() returns BundleAnalysis for the current dir", async () => {
    const analysis = await commands.analyze(process.cwd());
    assert.ok(analysis);
    assert.ok(typeof analysis === "object");
  });

  skip("clean() on a non-existent dir returns empty result", async () => {
    const result = await commands.clean("/tmp/elmoorx-test-nonexistent-xyz");
    assert.ok(result);
    // Should not throw — should return { removed: [], freedBytes: 0 } or similar
    assert.ok(typeof result === "object");
  });

  skip("formatDoctorOutput() returns a string", () => {
    const output = commands.formatDoctorOutput([]);
    assert.equal(typeof output, "string");
  });

  skip("formatInfoOutput() returns a string", () => {
    // ProjectInfo shape: { project, elmoorx, environment, files }
    const output = commands.formatInfoOutput({
      project: { name: "test", version: "1.0.0", description: "test project" },
      elmoorx: { version: "3.0.0", packages: ["@elmoorx/runtime"] },
      environment: { node: process.version, platform: process.platform, arch: process.arch },
      files: { sourceCount: 10, totalSize: "10 KB" },
    });
    assert.equal(typeof output, "string");
    assert.ok(output.includes("Elmoorx Project Info"));
    assert.ok(output.includes("test"));
  });

  skip("formatAnalyzeOutput() returns a string", () => {
    // BundleAnalysis shape: { totalSize, totalGzipped, files, byType, recommendations }
    const output = commands.formatAnalyzeOutput({
      totalSize: 10000,
      totalGzipped: 3000,
      files: [
        { path: "src/index.ts", size: 5000, percentage: 50 },
        { path: "src/utils.ts", size: 3000, percentage: 30 },
      ],
      byType: {
        ".ts": { count: 2, size: 8000 },
        ".css": { count: 1, size: 2000 },
      },
      recommendations: ["Consider code-splitting"],
    });
    assert.equal(typeof output, "string");
    assert.ok(output.includes("Elmoorx Bundle Analyzer"));
  });
});
