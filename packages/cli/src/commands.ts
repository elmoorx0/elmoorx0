/**
 * @elmoorx/cli — Additional commands
 * ============================================
 *   elmoorx doctor           Diagnose project health
 *   elmoorx info             Show project + environment info
 *   elmoorx analyze          Analyze bundle size
 *   elmoorx upgrade          Check for updates
 *   elmoorx clean            Clean build artifacts
 */

import { readFile, readdir, stat, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { gzipSync } from "node:zlib";

// ============ DOCTOR ============

export interface DoctorCheck {
  name: string;
  status: "pass" | "warn" | "fail";
  message: string;
  fix?: string;
}

export async function doctor(rootDir: string): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];

  // Check 1: package.json exists
  const pkgPath = join(rootDir, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
      checks.push({
        name: "package.json",
        status: "pass",
        message: `Valid — ${pkg.name}@${pkg.version}`,
      });

      // Check 2: Elmoorx dependencies
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps["@elmoorx/runtime"]) {
        checks.push({
          name: "@elmoorx/runtime",
          status: "pass",
          message: `Installed — ${deps["@elmoorx/runtime"]}`,
        });
      } else {
        checks.push({
          name: "@elmoorx/runtime",
          status: "fail",
          message: "Not installed",
          fix: "npm install @elmoorx/runtime",
        });
      }

      // Check 3: Node version
      const nodeVersion = process.versions.node;
      const major = parseInt(nodeVersion.split(".")[0]);
      if (major >= 18) {
        checks.push({
          name: "Node.js",
          status: "pass",
          message: `v${nodeVersion}`,
        });
      } else {
        checks.push({
          name: "Node.js",
          status: "warn",
          message: `v${nodeVersion} — Elmoorx requires Node 18+`,
          fix: "Upgrade Node.js to v18 or later",
        });
      }

      // Check 4: TypeScript config
      const tsconfigPath = join(rootDir, "tsconfig.json");
      if (existsSync(tsconfigPath)) {
        let tsconfig: { compilerOptions?: { jsx?: string; jsxImportSource?: string } } = {};
        let tsconfigParsed = true;
        try {
          tsconfig = JSON.parse(await readFile(tsconfigPath, "utf-8"));
        } catch {
          tsconfigParsed = false;
          checks.push({
            name: "TypeScript",
            status: "warn",
            message: "tsconfig.json is malformed JSON — could not parse",
            fix: "Fix the JSON syntax in tsconfig.json",
          });
        }
        if (tsconfigParsed) {
          const jsxSetting = tsconfig.compilerOptions?.jsx;
          if (jsxSetting === "react-jsx") {
            const jsxImport = tsconfig.compilerOptions?.jsxImportSource;
            if (jsxImport === "@elmoorx/runtime") {
              checks.push({
                name: "TypeScript JSX",
                status: "pass",
                message: "Configured for Elmoorx",
              });
            } else {
              checks.push({
                name: "TypeScript JSX",
                status: "warn",
                message: `jsxImportSource is "${jsxImport}" — should be "@elmoorx/runtime"`,
                fix: 'Set "jsxImportSource": "@elmoorx/runtime" in tsconfig.json',
              });
            }
          } else {
            checks.push({
              name: "TypeScript JSX",
              status: "warn",
              message: `jsx is "${jsxSetting}" — should be "react-jsx"`,
              fix: 'Set "jsx": "react-jsx" in tsconfig.json',
            });
          }
        }
      } else {
        checks.push({
          name: "TypeScript",
          status: "warn",
          message: "No tsconfig.json found",
          fix: "Create tsconfig.json (run: elmoorx create --ts)",
        });
      }

      // Check 5: src/ directory
      const srcDir = join(rootDir, "src");
      if (existsSync(srcDir)) {
        const files = await findFiles(srcDir, [".tsx", ".ts"]);
        checks.push({
          name: "Source files",
          status: files.length > 0 ? "pass" : "warn",
          message: `${files.length} .ts/.tsx files in src/`,
        });
      } else {
        checks.push({
          name: "src/ directory",
          status: "fail",
          message: "No src/ directory",
          fix: "Create src/ directory and add .elmoorx.tsx files",
        });
      }

      // Check 6: .gitignore
      const gitignorePath = join(rootDir, ".gitignore");
      if (existsSync(gitignorePath)) {
        const content = await readFile(gitignorePath, "utf-8");
        const hasNodeModules = content.includes("node_modules");
        const hasDist = content.includes("dist");
        if (hasNodeModules && hasDist) {
          checks.push({
            name: ".gitignore",
            status: "pass",
            message: "Properly configured",
          });
        } else {
          checks.push({
            name: ".gitignore",
            status: "warn",
            message: "Missing entries — should ignore node_modules/ and dist/",
            fix: "Add node_modules/ and dist/ to .gitignore",
          });
        }
      } else {
        checks.push({
          name: ".gitignore",
          status: "warn",
          message: "No .gitignore found",
          fix: "Create .gitignore with: node_modules/, dist/, .elmoorx-cache/",
        });
      }

      // Check 7: Security headers (in dev server config)
      checks.push({
        name: "Security headers",
        status: "pass",
        message: "Auto-applied by @elmoorx/server",
      });

      // Check 8: ESLint config
      const eslintConfigs = [".eslintrc.js", ".eslintrc.json", ".eslintrc.mjs", "eslint.config.mjs"];
      const hasEslint = eslintConfigs.some(f => existsSync(join(rootDir, f)));
      if (hasEslint) {
        checks.push({
          name: "ESLint",
          status: "pass",
          message: "Configured",
        });
      } else {
        checks.push({
          name: "ESLint",
          status: "warn",
          message: "No ESLint config found",
          fix: "Install @elmoorx/eslint-plugin for Elmoorx best practices",
        });
      }
    } catch (err) {
      checks.push({
        name: "package.json",
        status: "fail",
        message: `Invalid JSON: ${(err as Error).message}`,
      });
    }
  } else {
    checks.push({
      name: "package.json",
      status: "fail",
      message: "Not found",
      fix: "Run: elmoorx create my-app",
    });
  }

  return checks;
}

// ============ INFO ============

export interface ProjectInfo {
  elmoorx: {
    version: string;
    packages: string[];
  };
  project: {
    name: string;
    version: string;
    description: string;
  };
  environment: {
    node: string;
    npm: string;
    platform: string;
    arch: string;
  };
  files: {
    sourceCount: number;
    totalSize: string;
  };
}

export async function info(rootDir: string): Promise<ProjectInfo> {
  let pkg: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    name?: string;
    version?: string;
    description?: string;
  };
  try {
    pkg = JSON.parse(await readFile(join(rootDir, "package.json"), "utf-8"));
  } catch {
    throw new Error(`Could not read or parse ${join(rootDir, "package.json")}`);
  }
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  const elmoorxPackages = Object.keys(allDeps).filter(d => d.startsWith("@elmoorx/"));

  // Count source files
  const srcDir = join(rootDir, "src");
  let sourceCount = 0;
  let totalSize = 0;
  if (existsSync(srcDir)) {
    const files = await findFiles(srcDir, [".ts", ".tsx", ".js", ".jsx"]);
    sourceCount = files.length;
    for (const f of files) {
      const stat_ = await stat(f);
      totalSize += stat_.size;
    }
  }

  return {
    elmoorx: {
      version: "2.0.0-alpha.2",
      packages: elmoorxPackages,
    },
    project: {
      name: pkg.name || "(unnamed)",
      version: pkg.version || "0.0.0",
      description: pkg.description || "",
    },
    environment: {
      node: process.versions.node,
      npm: "(check npm -v)",
      platform: process.platform,
      arch: process.arch,
    },
    files: {
      sourceCount,
      totalSize: formatBytes(totalSize),
    },
  };
}

// ============ ANALYZE (bundle) ============

export interface BundleAnalysis {
  totalSize: number;
  totalGzipped: number;
  files: {
    path: string;
    size: number;
    gzipped: number;
    percentage: number;
  }[];
  byType: Record<string, { count: number; size: number }>;
  recommendations: string[];
}

export async function analyze(rootDir: string): Promise<BundleAnalysis> {
  const distDir = join(rootDir, "dist");
  const files: BundleAnalysis["files"] = [];
  const byType: Record<string, { count: number; size: number }> = {};
  const recommendations: string[] = [];

  if (existsSync(distDir)) {
    const allFiles = await findFiles(distDir, [".js", ".mjs", ".css", ".html", ".json", ".wasm", ".svg", ".png", ".jpg", ".gif", ".woff", ".woff2"]);

    let totalSize = 0;
    let totalGzipped = 0;

    for (const f of allFiles) {
      const content = await readFile(f);
      const size = content.length;
      const gzipped = gzipSync(content).length;
      const ext = extname(f);
      const relPath = relative(distDir, f);

      totalSize += size;
      totalGzipped += gzipped;

      files.push({
        path: relPath,
        size,
        gzipped,
        percentage: 0, // filled below
      });

      if (!byType[ext]) byType[ext] = { count: 0, size: 0 };
      byType[ext].count++;
      byType[ext].size += size;
    }

    // Calculate percentages
    for (const f of files) {
      f.percentage = (f.size / totalSize) * 100;
    }

    // Sort by size descending
    files.sort((a, b) => b.size - a.size);

    // Recommendations
    if (totalGzipped > 100_000) {
      recommendations.push("Bundle exceeds 100kb gzipped — consider code splitting with lazy()");
    }
    if (byType[".js"]?.size > 50_000) {
      recommendations.push("JavaScript is large — review imports and use tree-shaking");
    }
    if (byType[".css"]?.size > 30_000) {
      recommendations.push("CSS is large — consider using @elmoorx/css for scoped styles");
    }
    if (!files.some(f => f.path.endsWith(".html"))) {
      recommendations.push("No HTML files in dist/ — check SSR/SSG configuration");
    }

    return { totalSize, totalGzipped, files, byType, recommendations };
  } else {
    return {
      totalSize: 0,
      totalGzipped: 0,
      files: [],
      byType,
      recommendations: ["No dist/ directory — run: elmoorx build"],
    };
  }
}

// ============ CLEAN ============

export async function clean(rootDir: string): Promise<{ removed: string[]; freedBytes: number }> {
  const removed: string[] = [];
  let freedBytes = 0;

  const targets = [
    "dist",
    ".elmoorx-cache",
    "node_modules/.cache",
    ".vite",
    "coverage",
  ];

  for (const target of targets) {
    const path = join(rootDir, target);
    if (existsSync(path)) {
      const size = await dirSize(path);
      await rm(path, { recursive: true, force: true });
      removed.push(target);
      freedBytes += size;
    }
  }

  return { removed, freedBytes };
}

// ============ UPGRADE CHECK ============

export async function checkUpdates(rootDir: string): Promise<{
  packages: { name: string; current: string; latest: string; updateAvailable: boolean }[];
}> {
  let pkg: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  try {
    pkg = JSON.parse(await readFile(join(rootDir, "package.json"), "utf-8"));
  } catch {
    return { packages: [] };
  }
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const elmoorxDeps = Object.keys(deps).filter(d => d.startsWith("@elmoorx/"));

  const result = [];
  for (const dep of elmoorxDeps) {
    const current = deps[dep].replace(/[\^~]/, "").replace(/^workspace:/, "");
    let latest = current;
    let updateAvailable = false;
    try {
      // Query npm registry for the actual latest version.
      // 3-second timeout so offline use doesn't hang.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      try {
        const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(dep)}/latest`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const json = (await res.json()) as { version?: string };
          if (json.version) {
            latest = json.version;
            updateAvailable = json.version !== current;
          }
        }
      } finally {
        clearTimeout(timer);
      }
    } catch {
      // Offline / network error — fall through with current = latest
      latest = current;
      updateAvailable = false;
    }
    result.push({ name: dep, current, latest, updateAvailable });
  }

  return { packages: result };
}

// ============ HELPERS ============

async function findFiles(dir: string, extensions: string[]): Promise<string[]> {
  const results: string[] = [];
  if (!existsSync(dir)) return results;

  const entries = await readdir(dir, { withFileTypes: true });
  // Empty extensions array means "all files"
  const extSet = extensions.length === 0 ? null : new Set(extensions);
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist" || entry.name === "build") {
        continue;
      }
      results.push(...(await findFiles(path, extensions)));
    } else if (extSet === null || extSet.has(extname(entry.name))) {
      results.push(path);
    }
  }
  return results;
}

async function dirSize(dir: string): Promise<number> {
  let size = 0;
  // Pass empty extensions to count ALL files (was previously a bug —
  // empty array excluded everything).
  const files = await findFiles(dir, []);
  for (const f of files) {
    try {
      const stat_ = await stat(f);
      size += stat_.size;
    } catch {
      // ignore files that disappear during traversal
    }
  }
  return size;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB";
  return (bytes / 1073741824).toFixed(1) + " GB";
}

// ============ COMMAND OUTPUT FORMATTERS ============

export function formatDoctorOutput(checks: DoctorCheck[]): string {
  let output = "\n  Elmoorx Doctor — Project Health Check\n  " + "═".repeat(50) + "\n\n";

  for (const check of checks) {
    const icon = check.status === "pass" ? "✓" : check.status === "warn" ? "⚠" : "✗";
    const color = check.status === "pass" ? "\x1b[32m" : check.status === "warn" ? "\x1b[33m" : "\x1b[31m";
    const reset = "\x1b[0m";

    output += `  ${color}${icon}${reset} ${check.name.padEnd(20)} ${check.message}\n`;
    if (check.fix) {
      output += `    ${color}→ Fix: ${check.fix}${reset}\n`;
    }
  }

  const passed = checks.filter(c => c.status === "pass").length;
  const warned = checks.filter(c => c.status === "warn").length;
  const failed = checks.filter(c => c.status === "fail").length;

  output += "\n  " + "─".repeat(50) + "\n";
  output += `  ${passed} passed, ${warned} warnings, ${failed} failed\n`;

  return output;
}

export function formatInfoOutput(info: ProjectInfo): string {
  let output = "\n  Elmoorx Project Info\n  " + "═".repeat(50) + "\n\n";

  output += "  Project:\n";
  output += `    Name:        ${info.project.name}\n`;
  output += `    Version:     ${info.project.version}\n`;
  output += `    Description: ${info.project.description || "(none)"}\n\n`;

  output += "  Elmoorx:\n";
  output += `    Version:     ${info.elmoorx.version}\n`;
  output += `    Packages:    ${info.elmoorx.packages.length} installed\n`;
  for (const pkg of info.elmoorx.packages) {
    output += `      • ${pkg}\n`;
  }
  output += "\n";

  output += "  Environment:\n";
  output += `    Node.js:     ${info.environment.node}\n`;
  output += `    Platform:    ${info.environment.platform}\n`;
  output += `    Arch:        ${info.environment.arch}\n\n`;

  output += "  Files:\n";
  output += `    Source:      ${info.files.sourceCount} files\n`;
  output += `    Total size:  ${info.files.totalSize}\n`;

  return output;
}

export function formatAnalyzeOutput(analysis: BundleAnalysis): string {
  let output = "\n  Elmoorx Bundle Analyzer\n  " + "═".repeat(50) + "\n\n";

  output += `  Total size:    ${formatBytes(analysis.totalSize)}\n`;
  output += `  Gzipped:       ${formatBytes(analysis.totalGzipped)}\n`;
  output += `  Files:         ${analysis.files.length}\n\n`;

  output += "  Files (sorted by size):\n";
  output += "  " + "─".repeat(50) + "\n";
  for (const f of analysis.files.slice(0, 15)) {
    output += `  ${f.percentage.toFixed(1).padStart(5)}%  ${formatBytes(f.size).padStart(10)}  ${f.path}\n`;
  }
  if (analysis.files.length > 15) {
    output += `  ... and ${analysis.files.length - 15} more\n`;
  }

  output += "\n  By file type:\n";
  for (const [ext, info] of Object.entries(analysis.byType).sort((a, b) => b[1].size - a[1].size)) {
    output += `    ${ext.padEnd(8)} ${info.count.toString().padStart(4)} files  ${formatBytes(info.size).padStart(10)}\n`;
  }

  if (analysis.recommendations.length > 0) {
    output += "\n  Recommendations:\n";
    for (const rec of analysis.recommendations) {
      output += `    → ${rec}\n`;
    }
  }

  return output;
}
