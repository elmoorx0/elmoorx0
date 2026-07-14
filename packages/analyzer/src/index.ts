/**
 * @elmoorx/analyzer — Static analysis utilities for Elmoorx projects
 * ============================================
 * Inspects a project's source tree and reports:
 *   - Bundle size estimates per module
 *   - Unused exports
 *   - Island count + payload estimate
 *   - Security surface (raw $html / dangerouslySetInnerHTML usage)
 *
 *   import { analyzeProject } from "@elmoorx/analyzer";
 *   const report = await analyzeProject("./src");
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative } from "node:path";

export interface AnalysisReport {
  rootDir: string;
  totalFiles: number;
  totalBytes: number;
  gzippedBytesEstimate: number;
  islands: number;
  rawHtmlUsages: number;
  largestFiles: Array<{ path: string; bytes: number; gzEstimate: number }>;
  unusedExports: string[];
}

export async function analyzeProject(rootDir: string): Promise<AnalysisReport> {
  const files: Array<{ path: string; bytes: number }> = [];
  await walk(rootDir, rootDir, files);

  let totalBytes = 0;
  let islands = 0;
  let rawHtmlUsages = 0;
  const unusedExports: string[] = [];
  const unusedExportCandidates: Array<{ name: string; definedIn: string }> = [];

  for (const f of files) {
    totalBytes += f.bytes;
    if (!/\.(tsx?|jsx?|mjs|cjs)$/.test(f.path)) continue;
    const src = await readFile(f.path, "utf-8").catch(() => "");
    // Count islands
    const islandMatches = src.match(/\bisland\s*\(/g);
    if (islandMatches) islands += islandMatches.length;
    // Count raw HTML injection points (security surface)
    const htmlMatches = src.match(/\$html\s*\(/g);
    if (htmlMatches) rawHtmlUsages += htmlMatches.length;
    // Heuristic: top-level `export function/const X` never referenced
    // elsewhere in the project → candidate unused export.
    // FIXED: the previous implementation used files.some(cb) where cb
    // returned a Promise (always truthy), so `elsewhere` was always
    // true and unusedExports was never populated. Now we collect
    // candidates synchronously and check references in a second pass.
    for (const m of src.matchAll(
      /^export\s+(?:async\s+)?(?:function|const)\s+([A-Za-z_$][\w$]*)/gm
    )) {
      const name = m[1];
      if (!name) continue;
      unusedExportCandidates.push({ name, definedIn: f.path });
    }
  }

  // Second pass: for each candidate, check if it's referenced in any
  // OTHER file. Read all files once into a Map to avoid redundant I/O.
  const fileContents = new Map<string, string>();
  for (const f of files) {
    if (/\.(tsx?|jsx?)$/.test(f.path)) {
      try {
        fileContents.set(f.path, await readFile(f.path, "utf-8"));
      } catch {
        // skip unreadable files
      }
    }
  }
  for (const candidate of unusedExportCandidates) {
    let referencedElsewhere = false;
    for (const [path, content] of fileContents) {
      if (path === candidate.definedIn) continue;
      // Cheap word-boundary check. False positives possible (e.g. the
      // name appears in a comment or string), but acceptable for a
      // heuristic. A real implementation would use a scope-aware AST walk.
      const re = new RegExp(`\\b${candidate.name}\\b`);
      if (re.test(content)) {
        referencedElsewhere = true;
        break;
      }
    }
    if (!referencedElsewhere) {
      unusedExports.push(candidate.name);
    }
  }

  const largestFiles = files
    .slice()
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 10)
    .map((f) => ({
      path: relative(rootDir, f.path),
      bytes: f.bytes,
      gzEstimate: Math.round(f.bytes * 0.3),
    }));

  return {
    rootDir,
    totalFiles: files.length,
    totalBytes,
    gzippedBytesEstimate: Math.round(totalBytes * 0.3),
    islands,
    rawHtmlUsages,
    largestFiles,
    unusedExports,
  };
}

async function walk(
  root: string,
  dir: string,
  out: Array<{ path: string; bytes: number }>
): Promise<void> {
  if (!existsSync(dir)) return;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") {
      continue;
    }
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(root, full, out);
    } else if (entry.isFile()) {
      const s = await stat(full);
      out.push({ path: full, bytes: s.size });
    }
  }
}

export const VERSION = "3.0.0-alpha.2";
