# Elmoorx Framework — Pull Request Checklist

## Description

<!-- Brief description of what this PR changes and why. Link to the
     issue this addresses using "Fixes #123" or "Closes #123" so the
     issue auto-closes when the PR is merged. -->

Fixes #

## Type of change

- [ ] 🐛 Bug fix (non-breaking change that fixes an issue)
- [ ] 🚀 New feature (non-breaking change that adds functionality)
- [ ] ⚠️ Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update
- [ ] ♻️ Refactor / code quality (no functional changes)
- [ ] 🧪 Test addition / fix
- [ ] ⚡ Performance improvement
- [ ] 🔒 Security improvement
- [ ] 🔧 CI/CD / build infrastructure

## Affected packages

<!-- Check all packages that this PR modifies -->

- [ ] `@elmoorx/runtime` (signals, store, islands, security)
- [ ] `@elmoorx/router`
- [ ] `@elmoorx/server` (HTTP server, middleware)
- [ ] `@elmoorx/compiler` (JSX → JS)
- [ ] `@elmoorx/cli`
- [ ] `@elmoorx/ui`
- [ ] `@elmoorx/auth`
- [ ] `@elmoorx/postgres`
- [ ] `@elmoorx/i18n`
- [ ] Other: ___
- [ ] None (CI/CD, docs, scripts only)

## Checklist

- [ ] My code follows the project's TypeScript strict mode conventions
- [ ] I have run `npm run typecheck` and there are no new errors
- [ ] I have run `npm run lint` and there are **0 errors and 0 warnings** (we use `--max-warnings=0`)
- [ ] I have added tests that prove my fix is effective or my feature works
- [ ] New and existing unit tests pass locally with `npm test` (currently 885 tests)
- [ ] If I added a new package, I:
  - [ ] Registered it in root `package.json` workspaces
  - [ ] Added a smoke test at `packages/<name>/tests/<name>-smoke.test.mjs`
  - [ ] Added the test file path to the `test` script (or ran `node scripts/generate_test_command.cjs`)
  - [ ] Set its version to match other packages (currently `3.0.0-alpha.3`)
  - [ ] All `@elmoorx/*` dependencies use `"*"` (workspace wildcard)
- [ ] If I changed a public API, I updated:
  - [ ] The package's `README.md`
  - [ ] `changelog/CHANGELOG.md` under an `## [Unreleased]` section
  - [ ] The TypeScript types in `src/index.ts`
- [ ] I have NOT added any `data/*.json` files (they are gitignored — runtime data only)
- [ ] If I touched security-sensitive code (sanitizer, CSRF, auth, headers, crypto), I:
  - [ ] Added a test that demonstrates the security property holds
  - [ ] Considered whether the change affects the SECURITY.md documentation
  - [ ] Did NOT introduce any `eval()`, `new Function()`, or `dangerouslySetInnerHTML`

## Security considerations

<!-- If this PR touches security-sensitive code, describe what you
     considered and how you tested it. Otherwise write "N/A". -->

## Performance considerations

<!-- If this PR touches a hot path (signals, store, sanitize, renderToString,
     middleware), describe the performance impact and any benchmarks you ran.
     Run `NODE_ENV=test npx tsx --test packages/runtime/tests/benchmark-regression.test.mjs`
     to verify no regression. Otherwise write "N/A". -->

## Test plan

<!-- How did you verify this change works as expected? Be specific —
     "tested it" is not enough. -->

1.
2.
3.

## Screenshots / output

<!-- If applicable, add screenshots or log output demonstrating the change. -->

## Release notes

<!-- A 1-2 sentence summary suitable for inclusion in the GitHub Release
     notes. Will be auto-extracted by the release-drafter bot based on
     the PR's labels. If you don't add labels, a maintainer will.

     Example:
     - Fixed `validateField()` TypeError in @elmoorx/forms
     - Added `setError()` method on the Field interface
-->

---

Thanks for contributing! 🎉 A maintainer will review within 48 hours.
