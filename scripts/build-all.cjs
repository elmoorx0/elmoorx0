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

// Build order is computed via topological sort based on @elmoorx/*
// dependencies declared in each package's package.json. Packages with
// no @elmoorx/* deps build first; packages that depend on them build
// later. Within the same "level", packages are sorted alphabetically
// for deterministic builds.
//
// Previously this used a fixed [runtime, ...rest alphabetical] order,
// which broke the cli package (it depends on @elmoorx/compiler and
// @elmoorx/ai-copilot, but those built AFTER cli alphabetically, so
// cli's imports resolved to nothing on a fresh CI checkout).

function getAllPackageDirs() {
  return readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => d.name)
    .filter((name) => existsSync(join(PACKAGES_DIR, name, "package.json")))
    .sort();
}

/**
 * Read a package's @elmoorx/* dependencies from its package.json.
 * Returns an array of package names (without the @elmoorx/ prefix).
 */
function getPackageDeps(pkgName) {
  const pkgJsonPath = join(PACKAGES_DIR, pkgName, "package.json");
  if (!existsSync(pkgJsonPath)) return [];
  const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
  const deps = new Set();
  for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
    const fieldDeps = pkg[field] || {};
    for (const depName of Object.keys(fieldDeps)) {
      if (depName.startsWith("@elmoorx/")) {
        deps.add(depName.slice("@elmoorx/".length));
      }
    }
  }
  return [...deps];
}

/**
 * Topologically sort packages so that dependencies build before dependents.
 * Uses Kahn's algorithm with alphabetical tie-breaking for determinism.
 */
function topologicalSort(pkgNames) {
  // Build adjacency: deps[pkg] = set of @elmoorx/* deps it needs
  const deps = new Map();
  const allSet = new Set(pkgNames);
  for (const p of pkgNames) {
    const d = getPackageDeps(p).filter(dep => allSet.has(dep));
    deps.set(p, new Set(d));
  }

  // inDegree[pkg] = number of unbuilt deps
  const inDegree = new Map();
  for (const p of pkgNames) {
    inDegree.set(p, deps.get(p).size);
  }

  // Queue of packages with no unbuilt deps (sorted alphabetically)
  const queue = pkgNames.filter(p => inDegree.get(p) === 0).sort();
  const result = [];
  const built = new Set();

  while (queue.length > 0) {
    const p = queue.shift();
    result.push(p);
    built.add(p);
    // For each package that depends on p, decrement its inDegree
    for (const other of pkgNames) {
      if (built.has(other)) continue;
      if (deps.get(other).has(p)) {
        const newDegree = inDegree.get(other) - 1;
        inDegree.set(other, newDegree);
        if (newDegree === 0) {
          // Insert alphabetically
          const insertIdx = queue.findIndex(q => q > other);
          if (insertIdx === -1) queue.push(other);
          else queue.splice(insertIdx, 0, other);
        }
      }
    }
  }

  // Detect cycles (shouldn't happen in a healthy monorepo)
  if (result.length !== pkgNames.length) {
    const cycle = pkgNames.filter(p => !result.includes(p));
    console.warn(`⚠️  Dependency cycle detected involving: ${cycle.join(", ")}`);
    // Append cyclic packages at the end so they still build
    result.push(...cycle.sort());
  }

  return result;
}

function getBuildOrder(targets) {
  if (targets && targets.length > 0) return targets;
  const all = getAllPackageDirs();
  return topologicalSort(all);
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
