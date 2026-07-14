# Contributing to Elmoorx Framework

First off, thank you for considering contributing to Elmoorx! 🎉

This document outlines how to contribute to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Community](#community)

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:

- **Be respectful** — treat everyone with respect
- **Be inclusive** — welcome newcomers and diverse perspectives
- **Be patient** — remember that everyone has different experience levels
- **Be constructive** — provide helpful feedback, not just criticism

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Git

### Setup

```bash
# Fork the repo on GitHub, then:
git clone https://github.com/elmoorx0/elmoorx0.git
cd elmoorx0

# Install dependencies
npm install --legacy-peer-deps --ignore-scripts

# Verify everything works
npm run typecheck    # should pass with 0 errors
npm test             # 43 smoke tests (node:test)
npm run test:integration  # 415+ integration tests (tsx --test)
```

### Project Structure

```
elmoorx0/
├── packages/           # 78 npm packages (workspaces)
│   ├── runtime/        # Core runtime: signals, store, islands, security
│   ├── router/         # File-based routing
│   ├── server/         # HTTP server + middleware
│   ├── compiler/       # JSX → h() compiler
│   ├── cli/            # `elmoorx` CLI tool
│   ├── ui/             # 648 UI components
│   ├── auth/           # JWT, OAuth, sessions, RBAC, MFA
│   ├── postgres/       # PostgreSQL adapter + query builder
│   ├── i18n/           # Internationalization + RTL
│   ├── codemod/        # Migration codemods
│   └── ... (68 more)
├── examples/           # Example apps
├── website/            # Documentation website
├── docs/               # Markdown documentation
├── scripts/            # Build/utility scripts
└── .github/            # CI workflows + templates
```

## Development Workflow

### 1. Create a branch

```bash
git checkout -b feat/your-feature-name
# or
git checkout -b fix/issue-number-description
```

### 2. Make changes

- Follow the [coding standards](#coding-standards)
- Add tests for new features
- Update documentation if needed
- Keep changes focused — one feature/fix per PR

### 3. Test locally

```bash
# Type check (must pass with 0 errors)
npm run typecheck

# Run tests
npm test                    # smoke + integration tests
npm run test:integration    # integration tests

# Lint
npm run lint
```

### 4. Commit

We use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git commit -m "feat(auth): add OAuth provider for Discord"
git commit -m "fix(runtime): hydrateIslands preserves SSR HTML"
git commit -m "docs(api): add $store examples"
git commit -m "test(server): add CSRF middleware tests"
git commit -m "refactor(compiler): use static imports for babel"
```

### 5. Push and create PR

```bash
git push origin feat/your-feature-name
```

Then create a Pull Request on GitHub using the PR template.

## Pull Request Process

1. **Fill out the PR template** — describe what changed and why
2. **Link related issues** — `Closes #123` or `Relates to #456`
3. **Ensure CI passes** — all checks must be green
4. **Request review** — from a maintainer
5. **Address feedback** — make changes based on review
6. **Squash commits** if asked — keep history clean

### PR Checklist

- [ ] My code follows the TypeScript strict mode conventions
- [ ] I have run `npm run typecheck` and there are no new errors
- [ ] I have run `npm run lint` and addressed all errors
- [ ] I have added tests that prove my fix/feature works
- [ ] All tests pass locally (`npm test` + `npm run test:integration`)
- [ ] I have NOT added any `data/*.json` files (they are gitignored)
- [ ] If I added a new package, I registered it in root `package.json` workspaces
- [ ] If I changed a public API, I updated the package's README + docs/DOCUMENTATION.md
- [ ] All `@elmoorx/*` dependencies use `"*"` (npm workspace range).
      CI verify job accepts this — do NOT change to `workspace:^`
      without updating `.github/workflows/ci.yml` first.

## Coding Standards

### TypeScript

- **Strict mode** is enabled — no `any` without justification
- **No `// @ts-ignore`** — fix the type issue instead
- **Export types explicitly** — `export interface`, `export type`
- **Use `unknown` over `any`** when the type is truly unknown

### Code Style

- **2-space indentation**
- **Semicolons required**
- **Single quotes for strings** — `'hello'` not `"hello"`
- **Trailing commas** in multi-line arrays/objects
- **Functions before classes** — prefer functional style when possible

### Naming

- **PascalCase** for types, interfaces, classes, components
- **camelCase** for functions, variables, properties
- **UPPER_SNAKE_CASE** for constants
- **kebab-case** for file names (except component files which are PascalCase)

### File Organization

- One export per file when possible
- Group related functions in a single file
- Tests live in `tests/` directory next to `src/`
- Test files end in `.test.ts` or `.test.mjs`

## Testing

### Test Structure

```
packages/
  auth/
    src/
      index.ts
    tests/
      auth.test.ts        ← integration tests (use tsx)
```

### Writing Tests

Use `node:test` + `node:assert/strict`:

```ts
import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("feature: name", () => {
  test("does X when Y", () => {
    const result = myFunction(input);
    assert.equal(result, expected);
  });

  test("handles edge case", () => {
    assert.throws(() => myFunction(badInput));
  });
});
```

### Test Categories

1. **Contract tests** (`.test.mjs`) — verify API surface without TS loader
2. **Integration tests** (`.test.ts`) — load real source via `tsx`
3. **Security tests** — XSS vectors, CSRF, sanitization
4. **Performance tests** — benchmark critical paths

## Reporting Bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md).

Include:
- Elmoorx version
- Node.js version
- OS
- Minimal reproduction code
- Expected vs actual behavior
- Stack trace (if applicable)

## Suggesting Features

Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md).

Include:
- Problem you're trying to solve
- Proposed solution / API sketch
- Alternatives considered
- Willingness to contribute

## Community

- **GitHub Discussions** — ask questions, share ideas
- **Discord** — real-time chat with the community
- **Issues** — bug reports and feature requests only

### Getting Help

1. Check the [documentation](docs/DOCUMENTATION.md)
2. Search [existing discussions](https://github.com/elmoorx0/elmoorx0/discussions)
3. Ask in [Discord](https://discord.gg/elmoorx)
4. Open a new discussion

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Elmoorx! ⚡
