#!/usr/bin/env node
/**
 * Build all workspace packages in dependency order.
 *
 * - Builds @elmoorx/runtime first (no deps)
 * - Then packages that depend on runtime
 * - Then packages that depend on those
 *
 * Each package gets its own tsconfig.json (generated if missing)
 * that extends the root tsconfig.build.json.
 *
 * Output: packages/<name>/dist/ with .js + .d.ts + .d.ts.map files.
 *
 * After build, each package's main/types/exports are updated to point
 * to ./dist/index.js + ./dist/index.d.ts so published packages are
 * usable by Node consumers.
 *
 * Usage:
 *   node scripts/build-all.cjs              # build all
 *   node scripts/build-all.cjs runtime auth  # build specific packages
 */
"use strict";

const { execSync } = require("node:child_process");
const { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } = require("node:fs");
const { join, dirname } = require("node:path");

const ROOT = join(__dirname, "..");
const PACKAGES_DIR = join(ROOT, "packages");

// ─── Dependency order ──────────────────────────────────────────────────────

// Build order: runtime has no deps, then everything else.
// For simplicity, we build runtime first, then all others alphabetically.
// A more sophisticated approach would topologically sort based on
// package.json dependencies, but for this monorepo the simple approach
// works because all inter-package deps go through @elmoorx/runtime.
const BUILD_ORDER_FIRST = ["runtime"];

function getAllPackageDirs() {
  return readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => d.name)
    .filter((name) => existsSync(join(PACKAGES_DIR, name, "package.json")))
    .sort();
}

function getBuildOrder(targets) {
  if (targets && targets.length > 0) return targets;
  const all = getAllPackageDirs();
  // runtime first, then the rest alphabetically
  const rest = all.filter((name) => !BUILD_ORDER_FIRST.includes(name));
  return [...BUILD_ORDER_FIRST, ...rest];
}

// ─── Per-package tsconfig generation ───────────────────────────────────────

function ensureTsConfig(pkgDir, pkgName) {
  const tsconfigPath = join(pkgDir, "tsconfig.json");
  // Don't overwrite existing per-package tsconfig (e.g. runtime has one)
  if (existsSync(tsconfigPath)) return false;

  const tsconfig = {
    extends: "../../tsconfig.build.json",
    compilerOptions: {
      outDir: "./dist",
      rootDir: "./src",
    },
    include: ["src/**/*.ts", "src/**/*.tsx"],
    exclude: ["node_modules", "dist", "tests", "**/*.test.ts", "**/*.test.mjs"],
  };
  writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + "\n");
  return true; // created
}

// ─── Per-package package.json update ───────────────────────────────────────

function updatePackageJsonForDist(pkgDir) {
  const pkgJsonPath = join(pkgDir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));

  // Update main/types/exports to point to dist/
  pkg.main = "./dist/index.js";
  pkg.types = "./dist/index.d.ts";
  if (pkg.exports) {
    if (pkg.exports["."]) {
      pkg.exports["."] = {
        types: "./dist/index.d.ts",
        default: "./dist/index.js",
      };
    }
  } else {
    pkg.exports = {
      ".": {
        types: "./dist/index.d.ts",
        default: "./dist/index.js",
      },
    };
  }

  // Ensure build script exists
  if (!pkg.scripts) pkg.scripts = {};
  if (!pkg.scripts.build) pkg.scripts.build = "tsc";

  // Ensure prepublishOnly builds before publish
  pkg.scripts.prepublishOnly = "npm run build";

  writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + "\n");
}

// ─── Build a single package ────────────────────────────────────────────────

function buildPackage(pkgName) {
  const pkgDir = join(PACKAGES_DIR, pkgName);
  if (!existsSync(pkgDir)) {
    console.error(`  ✗ Package not found: ${pkgName}`);
    return false;
  }

  const created = ensureTsConfig(pkgDir, pkgName);
  if (created) console.log(`  📝 Generated tsconfig.json for @elmoorx/${pkgName}`);

  // Run tsc
  try {
    execSync("npx tsc --project tsconfig.json", {
      cwd: pkgDir,
      stdio: "pipe",
      env: { ...process.env },
    });
    console.log(`  ✓ @elmoorx/${pkgName}`);
    return true;
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString() : err.message;
    console.error(`  ✗ @elmoorx/${pkgName}`);
    console.error(`    ${stderr.split("\n").slice(0, 5).join("\n    ")}`);
    return false;
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

const targets = process.argv.slice(2);
const order = getBuildOrder(targets.length > 0 ? targets : null);

console.log(`\n📦 Building ${order.length} packages...\n`);

let succeeded = 0;
let failed = 0;
const failedPackages = [];

for (const pkgName of order) {
  if (buildPackage(pkgName)) {
    succeeded++;
    // Update package.json to point to dist/
    const pkgDir = join(PACKAGES_DIR, pkgName);
    updatePackageJsonForDist(pkgDir);
  } else {
    failed++;
    failedPackages.push(pkgName);
  }
}

console.log(`\n${"─".repeat(50)}`);
console.log(`  Built: ${succeeded} ✓  Failed: ${failed} ✗`);
if (failedPackages.length > 0) {
  console.log(`  Failed packages: ${failedPackages.join(", ")}`);
  console.log(`\n  Note: Some packages may fail to build due to:`);
  console.log(`    - Imports from packages that haven't been built yet`);
  console.log(`    - JSX types not available (install @types/react or add jsx types)`);
  console.log(`    - Missing dependencies (check package.json deps)`);
  console.log(`  The runtime + core packages should build successfully.`);
  process.exit(failed > 0 ? 1 : 0);
}
