/* eslint-disable no-console */
/**
 * Scan a single package's src/ for exported symbols that are never
 * referenced anywhere else in the workspace. Useful for surfacing
 * dead exports; results need manual review (some symbols are public
 * API surface even if internally unused).
 *
 * Usage: node scripts/find-dead-exports.cjs <package-name>
 */
const fs = require('node:fs');
const path = require('node:path');

const pkgName = process.argv[2];
if (!pkgName) {
  console.error('Usage: node find-dead-exports.cjs <package-name>');
  process.exit(1);
}

const pkgDir = path.resolve(__dirname, '..', 'packages', pkgName);
const srcDir = path.join(pkgDir, 'src');
if (!fs.existsSync(srcDir)) {
  console.error(`No src/ directory at ${srcDir}`);
  process.exit(1);
}

// Collect all source files across the entire workspace so we can detect
// references from anywhere, not just inside the same package.
function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) out.push(full);
  }
}

const allFiles = [];
walk(path.resolve(__dirname, '..', 'packages'), allFiles);
walk(path.resolve(__dirname, '..', 'scripts'), allFiles);

// Extract exported identifiers from the target package's src files.
function extractExports(file) {
  const txt = fs.readFileSync(file, 'utf8');
  const exports = new Set();
  // export function foo / export const foo / export class foo
  const re = /\bexport\s+(?:async\s+)?(?:function|const|class|let)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
  let m;
  while ((m = re.exec(txt)) !== null) exports.add(m[1]);
  // export type Foo / export interface Foo
  const reType = /\bexport\s+(?:type|interface)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
  while ((m = reType.exec(txt)) !== null) exports.add(m[1]);
  return exports;
}

const targetExports = new Map(); // name -> file
for (const file of allFiles.filter((f) => f.startsWith(srcDir + path.sep))) {
  for (const name of extractExports(file)) {
    targetExports.set(name, file);
  }
}

// For each exported name, check if it appears anywhere outside its own file.
const dead = [];
for (const [name, file] of targetExports) {
  let found = false;
  for (const f of allFiles) {
    if (f === file) continue;
    const txt = fs.readFileSync(f, 'utf8');
    // Word-boundary match; ignore comments heuristically.
    const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    if (re.test(txt)) {
      found = true;
      break;
    }
  }
  if (!found) dead.push({ name, file: path.relative(pkgDir, file) });
}

if (dead.length === 0) {
  console.log(`(${pkgName}) no obviously-dead exports found`);
} else {
  console.log(`(${pkgName}) possibly-dead exports:`);
  for (const { name, file } of dead) console.log(`  ${name}  (${file})`);
}
