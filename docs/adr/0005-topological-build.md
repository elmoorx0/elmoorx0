# 0005 — Topological build order

## Status

Accepted — 2026-07-19 (replaces alphabetical build order)

## Context

The original `scripts/build-all.cjs` built packages in this order:

1. `runtime` (no deps) — built first
2. All other packages alphabetically

This worked when all packages only depended on `@elmoorx/runtime`,
but broke once `@elmoorx/cli` started depending on
`@elmoorx/compiler` and `@elmoorx/ai-copilot`.

The alphabetical order builds:
```
ai-chat, ai-copilot, ai-dev, analytics, ... cli ... compiler ...
```

So `cli` builds BEFORE `compiler` and `ai-copilot`. The TypeScript
compiler resolves `@elmoorx/compiler` to the local `dist/` directory
via package.json `exports`. When `compiler/dist/` doesn't exist yet
(because it hasn't been built), `cli` fails with `Cannot find module`.

Locally, this worked because `dist/` directories from previous builds
persisted. In CI (fresh checkout), it failed.

## Decision

Replace the fixed `[runtime, ...alphabetical]` order with a
topological sort based on `@elmoorx/*` dependencies declared in each
package's `package.json`.

The algorithm:
1. Read each package's `dependencies`, `devDependencies`,
   `peerDependencies` — extract `@elmoorx/*` entries
2. Build a directed graph: pkg → its `@elmoorx/*` deps
3. Topologically sort using Kahn's algorithm
4. Within the same "level" (no remaining unbuilt deps), sort
   alphabetically for deterministic builds

This guarantees: if pkg A depends on pkg B, then B builds before A.

## Consequences

**Easier:**

- CI builds work on a fresh checkout (no stale `dist/` to mask issues)
- Adding new inter-package dependencies doesn't require updating
  `scripts/build-all.cjs`
- The `cli` package (and any future package that depends on others)
  builds correctly

**Harder:**

- The sort algorithm is more complex (50 lines vs 5 lines)
- Cycle detection is needed (currently we just warn + append the
  cyclic packages at the end, which may still fail but at least
  surfaces the issue)

**Trade-offs:**

- We don't use a separate "build deps then dependents" pass — the
  topological sort interleaves them naturally. This means a single
  `npm run build` invocation builds everything in the right order.
- We DON'T support `--filter` (like Nx or Turborepo) — if you want
  to build only `cli`, run `node scripts/build-all.cjs runtime
  compiler ai-copilot cli` (you have to specify the deps yourself).
  A future enhancement could read the dep graph and auto-include
  deps.
