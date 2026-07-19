# 0004 — Monorepo with 78 packages

## Status

Accepted — 2026-07-15

## Context

Elmoorx is a full-stack framework with many independent features:
runtime, router, server, compiler, CLI, UI library, auth, postgres,
i18n, web3, AR/VR, and 60+ more. We needed to decide how to organize
the codebase:

1. **Single package** — everything in one npm package. Simplest, but
   users must install the whole framework even if they only use
   signals. Bundle size would be huge.

2. **Polyrepo** — each package in its own git repo. Maximum isolation,
   but cross-package changes require coordinated releases and version
   drift is a constant problem.

3. **Monorepo with workspaces** — all packages in one git repo, but
   each is independently published to npm. Users install only what
   they need. Cross-package changes are atomic (one PR).

## Decision

Option 3: monorepo with npm workspaces. Each package is published
separately to npm under the `@elmoorx/*` scope.

The monorepo currently contains 78 packages:

- 7 core (runtime, router, server, compiler, cli, adapters, vite-plugin)
- 4 storage/data (postgres, edge-db, storage, migration)
- 5 auth/security (auth, crypto, secrets, security-pro, validation)
- 5 UI (ui, theme-studio, visual-builder, head, css)
- 4 i18n/accessibility (i18n, a11y, gesture, voice)
- 4 realtime (realtime, pubsub, queue, webhooks)
- 4 monitoring (monitoring, observability, telemetry, web-vitals)
- 4 dev tools (devtools, testing, testing-pro, code-review)
- 4 AI (ai-chat, ai-copilot, ai-dev, perf-ai)
- 4 specialized (web3, ar, ar-vr, blockchain)
- 38 more across various categories

## Consequences

**Easier:**

- Atomic cross-package changes (one PR can update runtime + auth + cli)
- Shared dev dependencies (eslint, tsx, typescript) installed once
- Consistent versioning (all packages at `3.0.0-alpha.3`)
- Easy local development with `npm link` or workspace protocol
- Test infrastructure is shared (`scripts/build-all.cjs`, etc.)

**Harder:**

- Tooling overhead — `npm install` for the whole repo takes 2 minutes
  on a fresh checkout
- Build order matters (we use topological sort, see ADR-0005)
- Test command is long (lists all 86 test files explicitly)
- IDE may be slow indexing 78 packages — recommend VS Code with
  TypeScript Server's `tsserver.experimental.enableProjectDiagnostics`
  set to false for unrelated packages
- npm publish is all-or-nothing — must publish all 78 packages
  together (or use `--workspace` to publish one)

**Trade-offs:**

- We use npm workspaces (not pnpm or yarn workspaces) because npm
  is the most widely-installed package manager. Users can use pnpm
  or yarn for their own apps without issue.
- We DON'T use Lerna — npm 7+ workspaces handle everything we need
  (symlinks, scripts, versioning).
- Each package's `@elmoorx/*` dependencies use `"*"` (workspace
  wildcard) — this resolves to the local version, so changes to one
  package are immediately visible to others without re-publishing.
