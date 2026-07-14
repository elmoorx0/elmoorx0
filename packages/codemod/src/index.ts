/**
 * @elmoorx/codemod — Migration codemods for Elmoorx Framework
 * ============================================
 * Programmatic transforms that help users migrate their code to
 * Elmoorx. The main transforms are:
 *
 *   1. renameWafraToElmoorx() — renames Wafra → Elmoorx across a
 *      codebase (types, identifiers, file extensions, data attributes).
 *   2. reactToElmoorx() — converts React hooks/components to Elmoorx
 *      equivalents (useState → $state, useEffect → $effect, etc.).
 *   3. vueToElmoorx() — converts Vue Composition API to Elmoorx.
 *
 *   import { renameWafraToElmoorx, reactToElmoorx } from "@elmoorx/codemod";
 *
 *   await renameWafraToElmoorx("./src", { dryRun: true });
 *   await reactToElmoorx("./src/components");
 */

import { readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { rename as renameFile } from "node:fs/promises";

// ─── Types ────────────────────────────────────────────────────────────

export interface CodemodOptions {
  /** Preview changes without writing files. */
  dryRun?: boolean;
  /** File extensions to process (default: .ts, .tsx, .js, .jsx, .mjs). */
  extensions?: string[];
  /** Directories to skip. */
  ignoreDirs?: string[];
  /** Called for each file processed. */
  onFile?: (path: string, changes: number) => void;
  /** Called when a file is renamed. */
  onRename?: (oldPath: string, newPath: string) => void;
}

export interface CodemodResult {
  filesScanned: number;
  filesModified: number;
  filesRenamed: number;
  totalReplacements: number;
  changes: Array<{ file: string; type: "modify" | "rename"; detail: string }>;
}

// ─── Wafra → Elmoorx rename codemod ──────────────────────────────────

type Replacement = string | ((match: string, ...args: string[]) => string);
type CodemodPattern = [RegExp, Replacement, string];

const RENAME_PATTERNS: CodemodPattern[] = [
  // Display name
  [/\bWafra Framework\b/g, "Elmoorx Framework", "Display name"],
  [/\bWafra Foundation\b/g, "Elmoorx Foundation", "Org name"],
  // Types
  [/\bWafraNode\b/g, "ElmoorxNode", "Type: WafraNode"],
  [/\bWafraElement\b/g, "ElmoorxElement", "Type: WafraElement"],
  [/\bWafraApp\b/g, "ElmoorxApp", "Type: WafraApp"],
  [/\bWafraPlugin\b/g, "ElmoorxPlugin", "Type: WafraPlugin"],
  // Code identifiers
  [/\bWafraNative\b/g, "ElmoorxNative", "Code: WafraNative"],
  [/\bWafraServer\b/g, "ElmoorxServer", "Type: WafraServer"],
  [/\bWafraResponse\b/g, "ElmoorxResponse", "Type: WafraResponse"],
  // Data attributes
  [/data-wafra-island/g, "data-elmoorx-island", "Data attr: island"],
  [/data-wafra-portal/g, "data-elmoorx-portal", "Data attr: portal"],
  [/data-wafra-lazy/g, "data-elmoorx-lazy", "Data attr: lazy"],
  [/data-wafra-suspense/g, "data-elmoorx-suspense", "Data attr: suspense"],
  [/data-wafra-keepalive/g, "data-elmoorx-keepalive", "Data attr: keepalive"],
  // File extensions in strings
  [/\.wafra\.tsx/g, ".elmoorx.tsx", "File extension"],
  [/\.wafra\.ts/g, ".elmoorx.ts", "File extension"],
  // CLI command
  [/\bwafra\s+create\b/g, "elmoorx create", "CLI: create"],
  [/\bwafra\s+dev\b/g, "elmoorx dev", "CLI: dev"],
  [/\bwafra\s+build\b/g, "elmoorx build", "CLI: build"],
  [/\bwafra\s+deploy\b/g, "elmoorx deploy", "CLI: deploy"],
  [/\bwafra\s+generate\b/g, "elmoorx generate", "CLI: generate"],
  // Codemod functions
  [/\breactToWafra\b/g, "reactToElmoorx", "Code: reactToWafra"],
  [/\bvueToWafra\b/g, "vueToElmoorx", "Code: vueToWafra"],
  [/\bsvelteToWafra\b/g, "svelteToElmoorx", "Code: svelteToWafra"],
  // URLs
  [/\bwafra\.dev\b/g, "elmoorx.dev", "Domain"],
  // Internal markers
  [/__wafra_context\b/g, "__elmoorx_context", "Internal marker"],
  [/__WAFRA_ISLANDS__/g, "__ELMOORX_ISLANDS__", "Internal marker"],
  // Prose (last — most aggressive)
  [/\bWafra\b(?!\s*(Framework|Foundation))/g, "Elmoorx", "Prose: Wafra → Elmoorx"],
  [/(?<![.@/])\bwafra\b(?!-framework|\.dev|\.framework)/g, "elmoorx", "Lowercase wafra → elmoorx"],
];

export async function renameWafraToElmoorx(
  rootDir: string,
  options: CodemodOptions = {}
): Promise<CodemodResult> {
  const {
    dryRun = false,
    extensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".json", ".md", ".html", ".css"],
    ignoreDirs = ["node_modules", "dist", "build", ".git", ".next"],
    onFile,
    onRename,
  } = options;

  const result: CodemodResult = {
    filesScanned: 0,
    filesModified: 0,
    filesRenamed: 0,
    totalReplacements: 0,
    changes: [],
  };

  await walkAndTransform(rootDir, rootDir, extensions, ignoreDirs, async (filePath) => {
    result.filesScanned++;
    const ext = extname(filePath);
    if (!extensions.includes(ext)) return;

    let content: string;
    try {
      content = await readFile(filePath, "utf-8");
    } catch {
      return;
    }

    let updated = content;
    let fileReplacements = 0;
    for (const [pattern, replacement, _desc] of RENAME_PATTERNS) {
      const before = updated;
      // String.replace accepts string or function — cast for TS union
      updated = updated.replace(pattern, replacement as unknown as string);
      const count = (before.match(pattern) || []).length;
      fileReplacements += count;
    }

    if (updated !== content) {
      result.filesModified++;
      result.totalReplacements += fileReplacements;
      result.changes.push({
        file: relative(rootDir, filePath),
        type: "modify",
        detail: `${fileReplacements} replacements`,
      });
      if (!dryRun) {
        await writeFile(filePath, updated, "utf-8");
      }
      onFile?.(filePath, fileReplacements);
    }

    // Rename .wafra.tsx → .elmoorx.tsx
    if (filePath.includes(".wafra.")) {
      const newPath = filePath.replace(/\.wafra\./, ".elmoorx.");
      result.filesRenamed++;
      result.changes.push({
        file: relative(rootDir, filePath),
        type: "rename",
        detail: `→ ${relative(rootDir, newPath)}`,
      });
      onRename?.(filePath, newPath);
      if (!dryRun) {
        await renameFile(filePath, newPath);
      }
    }
  });

  return result;
}

// ─── React → Elmoorx codemod ─────────────────────────────────────────

const REACT_PATTERNS: CodemodPattern[] = [
  // Imports
  [/import\s+React\s*,\s*\{\s*useState\s*\}\s*from\s+['"]react['"];?/g,
    'import { $state } from "@elmoorx/runtime";', "Import: useState → $state"],
  [/import\s+\{\s*useState\s*\}\s*from\s+['"]react['"];?/g,
    'import { $state } from "@elmoorx/runtime";', "Import: useState → $state"],
  [/import\s+\{\s*useEffect\s*\}\s*from\s+['"]react['"];?/g,
    'import { $effect } from "@elmoorx/runtime";', "Import: useEffect → $effect"],
  [/import\s+\{\s*useMemo\s*\}\s*from\s+['"]react['"];?/g,
    'import { useMemo } from "@elmoorx/runtime";', "Import: useMemo"],
  // Hooks usage
  [/useState\s*</g, "$state<", "useState<T> → $state<T>"],
  [/useState\s*\(/g, "$state(", "useState() → $state()"],
  [/useEffect\s*\(/g, "$effect(", "useEffect() → $effect()"],
  // State setter pattern: const [x, setX] = useState(0) → const x = $state(0)
  // (This is a simplified transform — production codemod would handle edge cases)
  [/const\s+\[(\w+),\s*set(\w+)\]\s*=\s*\$state\s*\(([^)]*)\)/g,
    "const $1 = $state($3)", "Destructured state → $state"],
  // setX(v) → x.set(v) — lowercase the first letter of X
  [/set(\w+)\s*\(([^)]*)\)/g, (match, name, val) => {
    const lowerName = name.charAt(0).toLowerCase() + name.slice(1);
    return `${lowerName}.set(${val})`;
  }, "setX(v) → x.set(v)"],
  // dangerouslySetInnerHTML → $html
  [/dangerouslySetInnerHTML\s*=\s*\{\{\s*__html:\s*([^}]+)\s*\}\}/g, "$html($1)", "dangerouslySetInnerHTML → $html"],
];

export async function reactToElmoorx(
  rootDir: string,
  options: CodemodOptions = {}
): Promise<CodemodResult> {
  return transformWithPatterns(rootDir, REACT_PATTERNS, options);
}

// ─── Vue → Elmoorx codemod ───────────────────────────────────────────

const VUE_PATTERNS: CodemodPattern[] = [
  // ref() → $state()
  [/import\s+\{\s*ref\s*\}\s*from\s+['"]vue['"];?/g,
    'import { $state } from "@elmoorx/runtime";', "Import: ref → $state"],
  [/ref\s*\(/g, "$state(", "ref() → $state()"],
  // computed() → $computed()
  [/import\s+\{\s*computed\s*\}\s*from\s+['"]vue['"];?/g,
    'import { $computed } from "@elmoorx/runtime";', "Import: computed → $computed"],
  [/computed\s*\(/g, "$computed(", "computed() → $computed()"],
  // watch() → $effect()
  [/import\s+\{\s*watch\s*\}\s*from\s+['"]vue['"];?/g,
    'import { $effect } from "@elmoorx/runtime";', "Import: watch → $effect"],
  // onMounted() → onMount()
  [/onMounted\s*\(/g, "onMount(", "onMounted → onMount"],
  // onUnmounted() → onCleanup()
  [/onUnmounted\s*\(/g, "onCleanup(", "onUnmounted → onCleanup"],
];

export async function vueToElmoorx(
  rootDir: string,
  options: CodemodOptions = {}
): Promise<CodemodResult> {
  return transformWithPatterns(rootDir, VUE_PATTERNS, options);
}

// ─── Internal helpers ────────────────────────────────────────────────

async function transformWithPatterns(
  rootDir: string,
  patterns: CodemodPattern[],
  options: CodemodOptions
): Promise<CodemodResult> {
  const {
    dryRun = false,
    extensions = [".ts", ".tsx", ".js", ".jsx", ".mjs"],
    ignoreDirs = ["node_modules", "dist", "build", ".git"],
    onFile,
  } = options;

  const result: CodemodResult = {
    filesScanned: 0,
    filesModified: 0,
    filesRenamed: 0,
    totalReplacements: 0,
    changes: [],
  };

  await walkAndTransform(rootDir, rootDir, extensions, ignoreDirs, async (filePath) => {
    result.filesScanned++;
    let content: string;
    try {
      content = await readFile(filePath, "utf-8");
    } catch {
      return;
    }

    let updated = content;
    let fileReplacements = 0;
    for (const [pattern, replacement, _desc] of patterns) {
      const before = updated;
      updated = updated.replace(pattern, replacement as unknown as string);
      const count = (before.match(pattern) || []).length;
      fileReplacements += count;
    }

    if (updated !== content) {
      result.filesModified++;
      result.totalReplacements += fileReplacements;
      result.changes.push({
        file: relative(rootDir, filePath),
        type: "modify",
        detail: `${fileReplacements} replacements`,
      });
      if (!dryRun) {
        await writeFile(filePath, updated, "utf-8");
      }
      onFile?.(filePath, fileReplacements);
    }
  });

  return result;
}

async function walkAndTransform(
  rootDir: string,
  currentDir: string,
  extensions: string[],
  ignoreDirs: string[],
  callback: (filePath: string) => Promise<void>
): Promise<void> {
  if (!existsSync(currentDir)) return;
  const entries = await readdir(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    if (ignoreDirs.includes(entry.name)) continue;
    const fullPath = join(currentDir, entry.name);
    if (entry.isDirectory()) {
      await walkAndTransform(rootDir, fullPath, extensions, ignoreDirs, callback);
    } else if (entry.isFile()) {
      const ext = extname(entry.name);
      if (extensions.includes(ext)) {
        await callback(fullPath);
      }
    }
  }
}

export const VERSION = "3.0.0-alpha.2";
