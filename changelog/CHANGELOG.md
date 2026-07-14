# Changelog — Elmoorx Framework

All notable changes to Elmoorx Framework are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
