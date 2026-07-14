# Elmoorx Framework — Documentation

> **Elmoorx** — Build fast. Run anywhere. Stay secure.

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Core Concepts](#core-concepts)
4. [API Reference](#api-reference)
5. [Guides](#guides)
6. [Migration](#migration)

---

## Introduction

Elmoorx is a next-generation full-stack framework engineered for **performance, security, and developer experience**. It combines:

- **Zero-hydration islands** — only interactive components ship JavaScript
- **Reactive store** — proxy-based, deep mutation tracking
- **Auto-security** — sanitization, CSRF, CSP, HSTS built-in
- **Edge-ready runtime** — small footprint, runs anywhere

### Why Elmoorx?

| Feature | Elmoorx | Next.js | Remix | SvelteKit |
|---------|---------|---------|-------|-----------|
| Hydration | Zero (islands only) | Full | Full | Full |
| Reactive primitive | Signals (built-in) | Hooks | Hooks | Stores |

> **Note:** Bundle size, cold start, and security grade comparisons were
> removed because they were not measured against real deployments. Run
> your own benchmarks (Lighthouse, `node scripts/benchmark.js`) to
> compare for your specific use case.

---

## Getting Started

### Installation

```bash
# Create a new project
npx @elmoorx/cli create my-app
cd my-app
npm install

# Start dev server
npm run dev
# → http://localhost:3000
```

### Manual setup

```bash
npm install @elmoorx/runtime @elmoorx/router @elmoorx/server
```

### Your first component

```tsx
// src/Counter.elmoorx.tsx
import { $state, island, h } from "@elmoorx/runtime";

export const Counter = island(() => {
  const count = $state(0);
  return h("button",
    { onClick: () => count.set(c => c + 1) },
    "Count: ", () => count()
  );
});
```

---

## Core Concepts

### 1. Signals

Signals are the foundation of Elmoorx reactivity. Reads track dependencies; writes trigger surgical DOM updates.

```tsx
import { $state, $computed, $effect } from "@elmoorx/runtime";

const count = $state(0);
const doubled = $computed(() => count() * 2);

$effect(() => {
  console.log(`Count is ${count()}`);
});

count.set(1);          // logs "Count is 1"
count.set(c => c + 1); // logs "Count is 2"
```

### 2. Reactive Store

For complex state, use `$store` — a proxy-based deep reactive container.

```tsx
import { $store } from "@elmoorx/runtime";

const store = $store({
  user: { name: "Alice", todos: [] },
  theme: "dark",
});

store.user.name = "Bob";          // reactive
store.user.todos.push("task");    // reactive
store.user.todos[0].done = true;  // reactive (nested array element)
```

### 3. Islands

Islands are the only components that ship JavaScript to the client.

```tsx
import { island, h } from "@elmoorx/runtime";

const LikeButton = island(() => {
  const likes = $state(0);
  return h("button",
    { onClick: () => likes.set(l => l + 1) },
    "♥ ", () => likes()
  );
});
```

### 4. Auto-Security

```tsx
import { $html, h } from "@elmoorx/runtime";

h("div", null, userInput)         // ❌ auto-escaped
h("div", null, $html(trusted))    // ✅ explicit, auto-sanitized
```

### 5. Routing

File-based routing with dynamic segments.

```
src/index.elmoorx.tsx          →  /
src/about.elmoorx.tsx          →  /about
src/users/[id].elmoorx.tsx     →  /users/:id
src/blog/[slug].elmoorx.tsx    →  /blog/:slug
src/[...catch].elmoorx.tsx     →  /* (catch-all)
src/api/hello.ts               →  /api/hello (server route)
```

---

## API Reference

### Signals

- `$state<T>(initial: T): Signal<T>` — create reactive signal
- `$computed<T>(fn: () => T): Computed<T>` — derived value
- `$effect(fn: () => void | (() => void)): () => void` — side-effect + dispose
- `$batch(fn: () => void): void` — batch writes

### Store

- `$store<T>(initial: T): Store<T>` — deep reactive proxy

### Rendering

- `h(tag, props, ...children): ElmoorxNode` — JSX factory
- `renderToString(node): string` — SSR
- `mount(node, parent): void` — client mount
- `hydrateIslands(registry): void` — boot islands only

### Security

- `sanitize(input: string): string` — strip dangerous HTML
- `$html(input: string): { __html: string }` — explicit trusted HTML
- `generateCsrfToken(): string` — 64-char hex token
- `SECURITY_HEADERS: Record<string, string>` — CSP, HSTS, etc.

### Lifecycle

- `onMount(fn: () => void | (() => void)): void`
- `onCleanup(fn: () => void): void`
- `onError(fn: (err: unknown) => void): void`

### Context

- `createContext<T>(defaultValue: T): Context<T>`
- `provide<T>(ctx: Context<T>, value: T): void`
- `inject<T>(ctx: Context<T>): T`

### Async Hooks

- `useFetch<T>(url, opts): FetchResult<T>`
- `useSWR<T>(key, fetcher, config): SWRResult<T>`
- `useMutation<T, P>(url, opts): MutationResult<T, P>`

---

## Migration

### From React

```bash
npx @elmoorx/codemod react-to-elmoorx ./src
```

### From Vue

```bash
npx @elmoorx/codemod vue-to-elmoorx ./src
```

### From Wafra (old name)

```bash
npx @elmoorx/codemod rename-wafra ./src
```

See [MIGRATION.md](./MIGRATION.md) for the full guide.

---

## Community

- **GitHub**: https://github.com/elmoorx0/elmoorx0
- **npm**: https://www.npmjs.com/org/elmoorx
- **License**: MIT

---

Built by developers, for developers. Free forever, open source, community-driven.
