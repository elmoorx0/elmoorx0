# Changelog — Elmoorx Framework

All notable changes to Elmoorx Framework are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0-alpha.3] — 2026-07-19

### 🐛 Critical Bug Fixes

#### forms — `validateField()` TypeError
- **Bug:** `validateField()` tried to assign to `field.error`, a getter-only property — threw `TypeError` in strict mode on every validation call.
- **Fix:** Added a new `setError(e: string | null)` method on the `Field` interface and replaced all `(field as Field).error = ...` assignments with `field.setError(...)`.
- **Tests:** Added 6 new `useForm` regression tests covering required, custom-validate, reset, and submit flows.

#### runtime/signals — dead code in `$computed`
- **Bug:** `$computed` declared `_compute()`, `dirty`, and `cached` but the `wrapped` reader never used them — pure dead code that inflated the bundle.
- **Fix:** Removed dead code entirely; simplified the lazy-effect registration path.

#### runtime/async-hooks — broken `subscribers` registry in `useFetch`
- **Bug:** The `subscribers` Map was declared and `notifySubscribers()` was called on cache writes, but nothing ever populated the Map — cross-instance cache notifications never fired.
- **Fix:** Added an internal `subscribe()` helper and wired `useFetch` to subscribe on mount (auto-unsubscribe on cleanup). Exported three new public APIs:
  - `peekCache(url, ttlMs?)` — read cached value without fetching
  - `onCacheChange(url, cb)` — subscribe to cache writes for a URL
  - `invalidateCache(url?)` — invalidate one URL or the whole cache

#### server/middleware — `compressionMiddleware` was a no-op
- **Bug:** The middleware was documented as `CAVEAT (alpha): no-op` — it didn't compress anything despite its name.
- **Fix:** Implemented real compression with full feature set:
  - Supports `br`, `gzip`, `deflate` based on `Accept-Encoding` (priority order)
  - Configurable `threshold` (default 1024 bytes — smaller bodies pass through)
  - Configurable `level` (default 6)
  - Preserves status code and all other headers
  - Sets `Content-Encoding`, `Content-Length`, and `Vary: Accept-Encoding`
  - Skips already-encoded responses
- **Tests:** Added 6 new tests using a real HTTP server with raw requests (no Node-fetch auto-decompression), covering gzip, brotli, deflate, threshold, no-Accept-Encoding, and header preservation.

### 🔧 Quality Improvements

#### server — public `MiddlewareStack.size` getter
- Replaced `middleware["middlewares"]?.length` (private-field access) with a clean public `size` getter on `MiddlewareStack`.

#### runtime/h — simplified error handling
- Removed redundant `try { handleError(err); return null; } catch (reThrow) { throw reThrow; }` — `handleError` already re-throws when no handler catches, so the outer try/catch was dead code.

#### runtime/context — safer `popContextScope`
- `popContextScope` now refuses to pop the bottom (default) layer, so a stray pop can never empty the context stack and crash `inject()`.

#### runtime/lifecycle — `setSilent(bool)` API
- Added a public `setSilent(value: boolean)` API to suppress dev-only warnings (e.g. `onCleanup` outside a component). Exported from `@elmoorx/runtime`.
- `onCleanup` and the secrets manager now respect `NODE_ENV=test` — `npm test` no longer prints dev warnings.

### 🧪 Test Coverage Expansion

#### New integration test
- `packages/runtime/tests/integration.test.mjs` — 8 end-to-end tests that compile JSX via `@elmoorx/compiler`, render via `@elmoorx/runtime`'s `renderToString`, serve through `@elmoorx/server`'s HTTP server with the new `compressionMiddleware`, fetch via raw `http.request` (no auto-decompression), gunzip, and verify the roundtrip.

#### Smoke tests for 47 previously-untested packages
- `a11y`, `ai-chat`, `ai-dev`, `analyzer`, `ar`, `ar-vr`, `auto-test`, `cli`, `cli-pro`, `code-review`, `collab`, `cron`, `edge-db`, `edge-functions`, `eslint-plugin`, `experiments`, `gesture`, `graphql`, `health`, `image`, `marketplace`, `monitoring`, `native`, `notifications`, `observability`, `perf-ai`, `plugin-system`, `pubsub`, `push`, `search`, `security-pro`, `state-utils`, `store-pro`, `templates`, `telemetry`, `testing`, `testing-pro`, `theme-studio`, `time-travel`, `ui`, `virtual`, `visual-builder`, `vite-plugin`, `voice`, `wasm`, `web-vitals`, `web3`, `logger` (cache integration).

#### New `compressionMiddleware` tests
- 6 tests using a real HTTP server with raw requests, covering all three encodings, threshold, no-Accept-Encoding, and header preservation.

#### New `useForm` tests
- 6 tests covering the `validateField` bug fix: required, custom-validate, reset, submit-invalid, submit-valid, exports.

### 📊 Final Stats

| Metric | Before | After |
|---|---|---|
| typecheck errors | 0 | 0 |
| lint errors | 0 | 0 |
| lint warnings | 0 | 0 |
| test files | 36 | 85 |
| tests passing | 607 | 874 |
| tests failing | 0 | 0 |
| packages with tests | 31/78 | 78/78 |
| console warnings during tests | 3 | 0 |

### ♿ Infrastructure

- `package.json`: unified `test` script uses `NODE_ENV=test npx tsx --test` for all 85 test files (no more split between `node --test` and `tsx --test`).
- `package.json`: added `test:gen` helper script that regenerates the test command when new test files are added.
- `.github/workflows/ci.yml`: added a `Test summary` step to the test job.

## [3.0.0] — 2026-07-15

### 🎉 Major Release

Full-stack framework with 78 npm packages, 648 UI components, 100 page templates, and 415 passing tests.

### Added — Core Framework
- **78 npm packages** under `@elmoorx/*` scope
- **648 UI components** across 12 categories (Forms, Layout, Navigation, Data Display, Feedback, Media, Inputs, Overlays, Typography, Utility, Pro, Specialty)
- **100 page templates** (Landing, Auth, Dashboard, E-commerce, Blog, Profile, SaaS, Marketing, Admin, Social, Education, Healthcare, Finance)
- **14 backend services** with full monitoring, chat, admin, and AI tooling
- **15 AR/VR components** using WebXR, hand tracking, spatial audio
- **13 Web3 components** for wallets, NFT, smart contracts, DeFi

### Added — Runtime
- Signals: `$state`, `$computed`, `$effect`, `$batch`
- Reactive store with deep proxy tracking
- Zero-hydration islands architecture
- Auto-security: sanitization, CSRF, CSP, HSTS
- Context API with `createContext`, `provide`, `inject`
- Lifecycle hooks: `onMount`, `onCleanup`, `onError`
- Error boundaries and Suspense for async
- Lazy loading with `lazy()`, `prefetch()`, `lazyAll()`
- Refs: `useRef`, `forwardRef`, `useImperativeHandle`
- Portal and Modal components
- Transitions and TransitionGroup
- KeepAlive caching
- Memoization: `memo`, `useMemo`, `useCallback`
- Async hooks: `useFetch`, `useSWR`, `useMutation`

### Added — Compiler
- JSX → `h()` transformer using Babel
- Static JSX → HTML at build time
- Island components → client JS bundles
- File extension: `.elmoorx.tsx`

### Added — CLI
- `elmoorx create` — scaffold new projects
- `elmoorx dev` — development server with HMR
- `elmoorx build` — production build
- `elmoorx generate` — AI-powered component generation
- `elmoorx deploy` — deploy to Cloudflare, Vercel, Deno, Node

### Added — Edge Adapters
- Cloudflare Workers (285 edge locations)
- Vercel Edge
- Deno Deploy
- Node.js

### Added — Packages
- `@elmoorx/runtime` — signals, store, islands, security (~1.2kb gz)
- `@elmoorx/compiler` — JSX → optimized HTML + minimal JS
- `@elmoorx/router` — file-based routing with dynamic segments
- `@elmoorx/server` — HTTP server, middleware, WebSocket
- `@elmoorx/ui` — 648 UI components
- `@elmoorx/auth` — sessions, JWT, OAuth, 2FA, RBAC
- `@elmoorx/postgres` — PostgreSQL adapter, query builder, migrations
- `@elmoorx/i18n` — internationalization with RTL support
- `@elmoorx/web3` — wallets, NFT, smart contracts
- `@elmoorx/ar-vr` — WebXR, hand tracking, spatial audio
- `@elmoorx/monitoring` — metrics, alerting, tracing
- `@elmoorx/observability` — logging, metrics, tracing, health checks
- `@elmoorx/security-pro` — security headers, rate limiting, CSRF, audit
- `@elmoorx/testing` — test utilities for Elmoorx apps
- `@elmoorx/testing-pro` — E2E testing, snapshots, visual regression
- ... and 63 more packages

### Performance
- Runtime: ~1.2kb gzipped (signals + islands + store)
- Signal read: 675K ops/s
- Signal write: 657K ops/s
- Store read: 1.24M ops/s
- Store write: 555K ops/s
- Sanitization: 1.98M ops/s (clean HTML)

### Security
- No `dangerouslySetInnerHTML` in framework code
- No `eval()` / `new Function()` in framework code
- Auto-applied security headers: CSP, HSTS, X-Frame-Options
- Per-request CSRF tokens with constant-time compare
- Password hashing: PBKDF2-SHA256, 210k iterations
- Sanitization throughput: 1.98M ops/s

### Testing
- 415 tests passing (node:test + tsx)
- 115 test suites
- Covers: signals, store, islands, security, router, compiler, server, i18n, postgres, auth, forms, cache, queue, scheduler, feature-flags, webhooks, realtime, email, payment, storage, crypto, validation, analytics

### Documentation
- Comprehensive README with quick start guide
- API documentation
- 12-lesson video course (6 hours)
- Migration playbook for React/Vue/Svelte → Elmoorx
- Deployment guide for Docker, Cloudflare, Vercel, Deno, Node
