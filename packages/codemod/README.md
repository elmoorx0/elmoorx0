# @elmoorx/codemod

> Codemods for migrating code to the Elmoorx Framework

Part of the [Elmoorx Framework](https://github.com/elmoorx0/elmoorx0) — Build fast. Run anywhere. Stay secure.

## Installation

```bash
npm install @elmoorx/codemod
# or use it directly without installing:
npx @elmoorx/codemod <command> <path>
```

## Available codemods

| Command | Description |
| --- | --- |
| `rename-wafra` | Rename `Wafra*` identifiers to `Elmoorx*` (Wafra was the pre-release name; v3.0.0 unified the name with the `@elmoorx/*` scope). |
| `react-to-elmoorx` | Migrate React component files to Elmoorx syntax (`useState` → `$state`, `useEffect` → `$effect`, JSX factory, lifecycle hooks). |
| `vue-to-elmoorx` | Migrate Vue 3 SFC `<script setup>` blocks to Elmoorx component files. |

## Usage

```bash
# Dry-run first to preview the changes:
npx @elmoorx/codemod rename-wafra ./src --dry-run

# Apply the changes:
npx @elmoorx/codemod rename-wafra ./src
```

## Programmatic API

```ts
import {
  renameWafraToElmoorx,
  reactToElmoorx,
  vueToElmoorx,
} from "@elmoorx/codemod";

const result = await renameWafraToElmoorx("./src", {
  dryRun: false,
  onFile: (file, count) => console.log(`${file}: ${count} replacements`),
  onRename: (oldPath, newPath) => console.log(`rename ${oldPath} → ${newPath}`),
});

console.log(`Modified ${result.filesModified} of ${result.filesScanned} files.`);
```

## Safety

Every codemod:

- Reads the source file as UTF-8 text and parses it with a lightweight TypeScript-aware tokenizer (no full type-check).
- Only writes a file when at least one replacement was made.
- Skips files inside `node_modules/`, `dist/`, `build/`, `.git/`, and other ignored directories.
- Reports a `filesScanned` / `filesModified` / `filesRenamed` / `totalReplacements` summary that callers can assert on.

Always run with `--dry-run` first and review the printed diff before applying to a production codebase. Commit a clean working tree before running the codemod so you can `git restore` if anything goes wrong.

## License

MIT © Elmoorx Foundation
