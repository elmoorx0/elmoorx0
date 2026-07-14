#!/usr/bin/env node
/**
 * Elmoorx Codemod CLI
 * ============================================
 *   npx @elmoorx/codemod rename-wafra <path>
 *   npx @elmoorx/codemod react-to-elmoorx <path>
 *   npx @elmoorx/codemod vue-to-elmoorx <path>
 *   npx @elmoorx/codemod --help
 */

import { renameWafraToElmoorx, reactToElmoorx, vueToElmoorx } from "./index.js";

const [command, ...args] = process.argv.slice(2);

async function main() {
  const pathArg = args.find((a) => !a.startsWith("--"));
  const dryRun = args.includes("--dry-run") || args.includes("-n");

  if (!pathArg && command !== "--help" && command !== "-h") {
    console.error("Error: path argument required");
    console.error("Usage: elmoorx-codemod <command> <path> [--dry-run]");
    process.exit(1);
  }

  const path: string = pathArg ?? ".";

  switch (command) {
    case "rename-wafra":
    case "rename-wafra-to-elmoorx": {
      console.warn(`\n  Elmoorx Codemod: rename Wafra → Elmoorx\n`);
      console.warn(`  Path: ${path}`);
      console.warn(`  Mode: ${dryRun ? "DRY RUN (no changes)" : "APPLY"}\n`);
      const result = await renameWafraToElmoorx(path, {
        dryRun,
        onFile: (f, n) => console.warn(`  ${dryRun ? "[DRY] " : ""}✓ ${f} (${n} replacements)`),
        onRename: (o, n) => console.warn(`  ${dryRun ? "[DRY] " : ""}→ rename ${o} → ${n}`),
      });
      console.warn(`\n  Files scanned:    ${result.filesScanned}`);
      console.warn(`  Files modified:   ${result.filesModified}`);
      console.warn(`  Files renamed:    ${result.filesRenamed}`);
      console.warn(`  Total changes:    ${result.totalReplacements}\n`);
      break;
    }

    case "react-to-elmoorx": {
      console.warn(`\n  Elmoorx Codemod: React → Elmoorx\n`);
      const result = await reactToElmoorx(path, { dryRun });
      console.warn(`\n  Files scanned:  ${result.filesScanned}`);
      console.warn(`  Files modified: ${result.filesModified}`);
      console.warn(`  Total changes:  ${result.totalReplacements}\n`);
      break;
    }

    case "vue-to-elmoorx": {
      console.warn(`\n  Elmoorx Codemod: Vue → Elmoorx\n`);
      const result = await vueToElmoorx(path, { dryRun });
      console.warn(`\n  Files scanned:  ${result.filesScanned}`);
      console.warn(`  Files modified: ${result.filesModified}`);
      console.warn(`  Total changes:  ${result.totalReplacements}\n`);
      break;
    }

    case "--help":
    case "-h":
    case undefined:
      printHelp();
      break;

    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

function printHelp() {
  console.warn(`
  Elmoorx Codemod v3.0.0-alpha.2

  Usage:
    elmoorx-codemod <command> <path> [options]

  Commands:
    rename-wafra          Rename Wafra → Elmoorx across a codebase
    react-to-elmoorx      Convert React hooks to Elmoorx equivalents
    vue-to-elmoorx        Convert Vue Composition API to Elmoorx

  Options:
    --dry-run, -n         Preview changes without writing files
    --help, -h            Show this help

  Examples:
    elmoorx-codemod rename-wafra ./src --dry-run
    elmoorx-codemod rename-wafra ./src
    elmoorx-codemod react-to-elmoorx ./src/components
    elmoorx-codemod vue-to-elmoorx ./src
`);
}

main().catch((err) => {
  console.error("Codemod failed:", err);
  process.exit(1);
});
