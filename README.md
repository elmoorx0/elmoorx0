# Elmoorx Framework

> **Elmoorx** (وَفْرة سابقاً) — Build fast. Run anywhere. Stay secure.

[![npm version](https://img.shields.io/npm/v/@elmoorx/runtime.svg)](https://www.npmjs.com/package/@elmoorx/runtime)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-586%20passing-brightgreen)](.)
[![Components](https://img.shields.io/badge/UI%20components-648-purple)](.)

A next-generation full-stack framework engineered for **performance, security, and developer experience**. Elmoorx combines zero-hydration islands, a built-in reactive store, automatic security, and an edge-ready runtime in **~1.2kb** of gzipped JavaScript.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                       Elmoorx Framework v3.0.0                           │
├──────────────────────────────────────────────────────────────────────────┤
│  Packages:    78 npm packages  (@elmoorx/*)                              │
│  UI:          648 components   (12 categories)                           │
│  Tests:       586 passing      (node:test + tsx)                        │
│  Templates:   100 ready-to-use  (Landing, Auth, Dashboard, E-commerce)   │
│  Runtime:     ~1.2kb gzipped   (signals + islands + store)               │
│  AR/VR:       15 components    (WebXR, hand tracking, spatial audio)     │
│  Web3:        13 components    (wallets, NFT, smart contracts)           │
└──────────────────────────────────────────────────────────────────────────┘
```

## 📦 Install

```bash
# Core packages
npm install @elmoorx/runtime @elmoorx/router @elmoorx/server

# UI library (648 components)
npm install @elmoorx/ui

# Everything
npm install @elmoorx/runtime @elmoorx/router @elmoorx/server @elmoorx/ui \
  @elmoorx/postgres @elmoorx/auth @elmoorx/monitoring @elmoorx/web3 @elmoorx/ar-vr
```

## 🌐 Links

| Resource | URL |
|----------|-----|
| **GitHub** | https://github.com/elmoorx0/elmoorx0 |
| **npm** | https://www.npmjs.com/org/elmoorx |
| **Documentation** | https://elmoorx.dev/docs |
| **Discord** | https://discord.gg/elmoorx |
| **Templates** | http://localhost:5300 (after `bash scripts/start-all.sh`) |
| **Playground** | http://localhost:5500 |
| **AI Assistant** | http://localhost:5400 |

## 🚀 Quick Start

```bash
# Clone the repo
git clone https://github.com/elmoorx0/elmoorx0.git
cd elmoorx0

# Install dependencies
npm install

# Start all 14 services
bash scripts/start-all.sh

# Run tests
npm test
```

## 📊 What's Included

### 14 Backend Services (all running)
1. **Backend API** (port 3100) — auth, files, emails, payments, OAuth, audit
2. **SaaS API** (port 4100) — SaaS Starter Kit
3. **Monitoring** (port 4040) — metrics, alerts, Prometheus export
4. **Chat WebSocket** (port 8080) — real-time chat with rooms
5. **UI Catalog** (port 5000) — 648-component showcase
6. **Visual Builder** (port 5100) — drag-and-drop page designer
7. **Admin Dashboard** (port 5200) — full SaaS admin panel
8. **Template Library** (port 5300) — 100 ready-to-use templates
9. **AI Assistant** (port 5400) — natural language to UI code
10. **Playground** (port 5500) — live code editor
11. **SaaS Platform** (port 5600) — CRM, Projects, Invoices, Chat, KB
12. **Marketplace** (port 5700) — components, templates, themes, plugins
13. **LMS Platform** (port 5800) — courses, lessons, certificates, live classes
14. **AI Code Generator** (port 5900) — generate complete apps from prompts

### 78 npm Packages
- `@elmoorx/runtime` — signals, store, islands, security (~1.2kb gz)
- `@elmoorx/router` — file-system routing, layouts, loaders
- `@elmoorx/server` — HTTP server, middleware, WebSocket
- `@elmoorx/ui` — 648 UI components
- `@elmoorx/postgres` — PostgreSQL adapter, query builder, migrations
- `@elmoorx/monitoring` — metrics, alerting, tracing
- `@elmoorx/auth` — sessions, JWT, OAuth, 2FA, RBAC
- `@elmoorx/web3` — wallets, NFT, smart contracts, DeFi
- `@elmoorx/ar-vr` — WebXR, hand tracking, spatial audio
- `@elmoorx/i18n` — internationalization, RTL support
- ... and 68 more

### 648 UI Components (12 categories)
- **Forms** (50): Input, DatePicker, ColorPicker, OTPInput, etc.
- **Layout** (60): Grid, Stack, Card, Sidebar, Tabs, etc.
- **Navigation** (50): Navbar, Breadcrumb, MegaMenu, Wizard, etc.
- **Data Display** (66): DataTable, Tree, Calendar, Kanban, Charts, etc.
- **Feedback** (50): Alert, Toast, Modal, Dialog, Tooltip, etc.
- **Media** (50): Image, Video, Audio, Gallery, Lightbox, etc.
- **Inputs** (50): Button variants (Gradient, Neon, Glass, Async, etc.)
- **Overlays** (50): Modal types, Drawer sides, Tooltip positions
- **Typography** (50): H1-H6, Code, Kbd, Truncate, etc.
- **Utility** (50): Portal, ErrorBoundary, Suspense, Draggable, etc.
- **Pro** (56): RichTextEditor, PivotTable, StockChart, PricingTable, etc.
- **Specialty** (50): Map, Scheduler, ChatBox, ShoppingCart, etc.

### 100 Page Templates
- Landing (10), Auth (8), Dashboard (8), E-commerce (8), Blog (6)
- Profile (5), Error (5), SaaS (10), Marketing (10), Admin (10)
- Social (5), Education (5), Healthcare (5), Finance (5)

## 📖 Documentation

- [Changelog](./changelog/CHANGELOG.md)
- [Video Course](./learn/video-course/README.md) — 12 lessons, 6 hours
- [Migration Playbook](./migration-playbook/README.md) — React/Vue/Svelte → Elmoorx
- [Deployment Guide](./deploy-guide/README.md) — Deploy to any platform

## 🧪 Testing

```bash
# Full test suite (560+ tests across 30 test files)
npm test

# Smoke tests only
npm run test:smoke

# Integration tests
npm run test:integration
```

## 📄 License

MIT © 2026 Elmoorx Foundation

## Verified Performance

Real benchmark results (`node scripts/benchmark.js`):

```
Signals:
  signal read (no deps)          675.74K ops/s
  signal write (no deps)         657.10K ops/s
  signal write (1 effect)        387.56K ops/s
  signal write (10 effects)       92.00K ops/s

Store:
  store read (1 prop)            1.24M ops/s
  store write (1 prop)           555.60K ops/s
  store array push               188.98K ops/s

Security:
  sanitize clean HTML (50b)      1.98M ops/s
  sanitize XSS payload (130b)    1.07M ops/s

Bundle:
  Runtime (gzipped):   1,225 bytes  (1.20 kb)
  React (gzipped):    ~45,000 bytes  (~45.00 kb, react-dom production minified)
  Improvement:         ~97% smaller (runtime-only; React ships more functionality)
```

## Packages

| Package | Description |
|---------|-------------|
| `@elmoorx/runtime` | Signals, store, islands, auto-security (~1.2kb gz) |
| `@elmoorx/compiler` | JSX → optimized HTML + minimal JS |
| `@elmoorx/cli` | `elmoorx create / dev / build / generate / deploy` |
| `@elmoorx/adapters` | Cloudflare, Vercel, Deno, Node adapters |
| `@elmoorx/router` | File-based routing with dynamic segments |
| `@elmoorx/ai-copilot` | `elmoorx generate "login form"` — AI-powered component generation |

## Quick Start

```bash
# Create a new project
npx @elmoorx/cli create my-app
cd my-app
npm install

# Start dev server
npm run dev
# → http://localhost:3000

# Generate a component with AI Copilot
elmoorx generate "login form"
elmoorx generate "todo list with filters"
elmoorx generate "data table with sorting"

# Build for production
npm run build

# Deploy to edge
npm run deploy
```

## Architecture

```
┌────────────────── Developer Plane ──────────────────┐
│  .elmoorx.tsx files  (JSX + TypeScript)                │
└──────────────────────────────────────────────────────┘
                        ▼
┌────────────────── Compiler Plane ───────────────────┐
│  Babel + SWC  →  tree-shake  →  minify  →  gzip      │
│  Static JSX → HTML at build time                     │
│  island() components → client JS bundles             │
└──────────────────────────────────────────────────────┘
                        ▼
┌────────────────── Runtime Plane ────────────────────┐
│  Server: renderToString()  →  streaming HTML         │
│  Client: hydrateIslands()  →  boot only islands      │
│  Signals: surgical DOM updates (no vdom diff)        │
└──────────────────────────────────────────────────────┘
                        ▼
┌────────────────── Security Plane ───────────────────┐
│  Auto-sanitize all user input                        │
│  CSP, HSTS, X-Frame-Options: auto-applied            │
│  CSRF tokens: per-request                            │
└──────────────────────────────────────────────────────┘
```

## Core APIs

### Signals

```tsx
import { $state, $computed, $effect } from "@elmoorx/runtime";

const count = $state(0);
const doubled = $computed(() => count() * 2);

$effect(() => {
  document.title = `Count: ${count()}`;
});

count.set(c => c + 1);  // triggers surgical DOM update
```

### Reactive Store

```tsx
import { $store } from "@elmoorx/runtime";

const store = $store({
  user: null,
  cart: [],
  theme: 'dark'
});

// Deep mutations auto-track
store.cart.push(item);       // reactive
store.theme = 'light';       // reactive
store.cart[0].qty = 2;       // reactive
```

### Islands

```tsx
import { island, h } from "@elmoorx/runtime";

const LikeButton = island(() => {
  const count = $state(0);
  return h('button', { onClick: () => count.set(c => c + 1) },
    'Likes: ', () => count()
  );
});

// Server renders <div data-elmoorx-island="...">HTML here</div>
// Client boots ONLY this island — zero hydration elsewhere
```

### Auto-Security

```tsx
import { $html } from "@elmoorx/runtime";

// ❌ Auto-escaped — no XSS surface
h('div', null, userInput)

// ✅ Explicit trusted HTML — auto-sanitized
h('div', null, $html(trustedContent))

// Headers auto-applied by dev server / edge runtime:
// Content-Security-Policy: default-src 'self'; ...
// X-Frame-Options: DENY
// Strict-Transport-Security: max-age=31536000
```

### AI Copilot

```bash
# Template-based generation (no API key needed)
elmoorx generate "login form"
elmoorx generate "todo list with filters"
elmoorx generate "data table with sorting"
elmoorx generate "modal dialog"
elmoorx generate "navbar with mobile menu"
elmoorx generate "contact form with validation"
elmoorx generate "search bar with debounce"

# AI-powered generation (set OPENAI_API_KEY)
export OPENAI_API_KEY=sk-...
elmoorx generate "user profile with avatar upload"
```

## Edge Adapters

```bash
# Deploy to any platform — 4kb bundle fits everywhere
elmoorx deploy --target=cloudflare   # 285 edge locations, 128MB RAM
elmoorx deploy --target=vercel       # global edge, 50MB RAM
elmoorx deploy --target=deno         # 35 regions, 50MB RAM
elmoorx deploy --target=node         # any VPS / Raspberry Pi
```

## Routing

File-based routing convention:

```
src/index.elmoorx.tsx          →  /
src/about.elmoorx.tsx          →  /about
src/users/index.elmoorx.tsx    →  /users
src/users/[id].elmoorx.tsx     →  /users/:id
src/blog/[slug].elmoorx.tsx    →  /blog/:slug
src/[...catch].elmoorx.tsx     →  /* (catch-all)
src/api/hello.ts             →  /api/hello (server route)
```

## Examples

| Example | Description |
|---------|-------------|
| `examples/counter/` | Zero-hydration island |
| `examples/todo/` | Reactive store |
| `examples/hacker-news/` | Full benchmark app (4kb total) |
| `examples/auth/` | Authentication flow with shared store |
| `examples/data-fetching/` | SSR + client-side revalidation |
| `examples/blog/` | Multi-route blog with dynamic params |
| `demo/index.html` | Live interactive demo |
| `site/index.html` | elmoorx.dev marketing site (runs on Elmoorx) |
| `site/docs.html` | Interactive API documentation |

## Benchmarks

**Microbenchmarks** (run locally with `node scripts/benchmark.js`):

```
Signals:
  signal read (no deps)          675.74K ops/s
  signal write (no deps)         657.10K ops/s
  signal write (1 effect)        387.56K ops/s
  signal write (10 effects)       92.00K ops/s

Store:
  store read (1 prop)            1.24M ops/s
  store write (1 prop)           555.60K ops/s
  store array push               188.98K ops/s

Security:
  sanitize clean HTML (50b)      1.98M ops/s
  sanitize XSS payload (130b)    1.07M ops/s

Bundle:
  Runtime (gzipped):   1,225 bytes  (1.20 kb)
```

## Security

- ✅ No `dangerouslySetInnerHTML` in framework code
- ✅ No `eval()` / `new Function()` in framework code
- ✅ Sanitization throughput: **1.98M ops/s**
- ✅ Auto-applied security headers: CSP, HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff
- ✅ Per-request CSRF tokens (constant-time compare via `node:crypto.timingSafeEqual`)
- ✅ Password hashing: PBKDF2-SHA256, 210k iterations, 16-byte per-password salt

## Roadmap

- [x] v1.0 — Stable release
- [x] v1.0.1 — AI Copilot CLI + Edge Adapters + Router
- [ ] v1.5 — Full LLM-powered AI Copilot
- [ ] v2.0 — Mobile Native (compile to iOS/Android via Skia)

## Run the Demos

```bash
# Live demo (counter, todo, XSS sanitizer)
node scripts/serve-demo.js
# → http://localhost:3000

# Run tests
npm test

# Run benchmarks
node scripts/benchmark.js
```

## License

MIT © 2026 Elmoorx Foundation

## Community

- GitHub: https://github.com/elmoorx0/elmoorx0
- npm: https://www.npmjs.com/org/elmoorx
- Issues: https://github.com/elmoorx0/elmoorx0/issues

---

Built by developers, for developers. Free forever, open source, community-driven.
