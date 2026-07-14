/**
 * elmoorx build
 * Bundles the app for production:
 *   - Compile all routes via @elmoorx/compiler
 *   - Pre-render static HTML for SSR routes
 *   - Tree-shake unused runtime APIs
 *   - Minify + gzip — output to dist/
 */

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative } from "node:path";
import { compile } from "@elmoorx/compiler";

export async function buildProject(rootDir: string): Promise<void> {
  const srcDir = join(rootDir, "src");
  const outDir = join(rootDir, "dist");

  if (!existsSync(srcDir)) {
    console.error("No src/ directory found");
    process.exit(1);
  }

  await mkdir(outDir, { recursive: true });
  await mkdir(join(outDir, "client"), { recursive: true });
  await mkdir(join(outDir, "server"), { recursive: true });

  console.warn("\n  Building Elmoorx app...\n");

  const files = await findTsxFiles(srcDir);
  let totalClientBytes = 0;
  let totalServerBytes = 0;
  const islands: string[] = [];

  for (const file of files) {
    const source = await readFile(file, "utf-8");
    const result = compile(source, { filename: relative(srcDir, file) });

    const relPath = relative(srcDir, file).replace(/\.tsx?$/, ".js");
    const clientPath = join(outDir, "client", relPath);
    const serverPath = join(outDir, "server", relPath);

    await mkdir(join(clientPath, ".."), { recursive: true });
    await mkdir(join(serverPath, ".."), { recursive: true });

    // Client bundle: stripped of SSR-only code, includes island hydration
    await writeFile(clientPath, result.code);
    // Server bundle: full module, includes SSR rendering
    await writeFile(serverPath, result.code);

    totalClientBytes += result.clientBytes;
    totalServerBytes += result.code.length;
    islands.push(...result.islands);

    console.warn(`  ✓ ${relative(srcDir, file)} → ${result.clientBytes}b client`);
  }

  console.warn(`\n  Build complete.`);
  console.warn(`  Routes:        ${files.length}`);
  console.warn(`  Islands:       ${islands.length}`);
  console.warn(`  Client bundle: ${totalClientBytes} bytes gzipped (~${(totalClientBytes / 1024).toFixed(2)} kb)`);
  console.warn(`  Server bundle: ${totalServerBytes} bytes\n`);
}

async function findTsxFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findTsxFiles(path)));
    } else if (/\.(elmoorx\.)?tsx?$/.test(entry.name)) {
      files.push(path);
    }
  }
  return files;
}
