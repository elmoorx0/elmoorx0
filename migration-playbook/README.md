# Elmoorx Migration Playbook

> Complete guide for migrating from React, Next.js, Vue, or Svelte to Elmoorx Framework — including an automated codemod tool that handles 80%+ of the work.

## Table of Contents

1. [Migration Strategy](#1-migration-strategy)
2. [Automated Codemod](#2-automated-codemod)
3. [React → Elmoorx Mapping](#3-react--elmoorx-mapping)
4. [Next.js → Elmoorx Mapping](#4-nextjs--elmoorx-mapping)
5. [Vue → Elmoorx Mapping](#5-vue--elmoorx-mapping)
6. [Svelte → Elmoorx Mapping](#6-svelte--elmoorx-mapping)
7. [Step-by-Step Migration](#7-step-by-step-migration)
8. [Common Pitfalls](#8-common-pitfalls)
9. [Post-Migration Optimization](#9-post-migration-optimization)

---

## 1. Migration Strategy

Elmoorx was designed for incremental adoption. You don't have to rewrite everything at once.

### Three approaches

| Approach | When to use | Risk | Effort |
|----------|-------------|------|--------|
| **Big Bang** | Small apps (<10k LOC) | High | Low |
| **Incremental** | Most apps | Medium | Medium |
| **Hybrid (mount Elmoorx inside React)** | Large enterprise apps | Low | High |

### Recommended path for most teams

```
Week 1: Audit + set up codemod
Week 2: Migrate leaf components (presentational)
Week 3: Migrate container components
Week 4: Migrate routes / pages
Week 5: Migrate state management
Week 6: Migrate backend / API
Week 7: Performance tuning + ship
```

---

## 2. Automated Codemod

Elmoorx ships with `@elmoorx/codemod` — a TypeScript-aware transformer that handles the most tedious parts of migration.

### Install

```bash
npx @elmoorx/codemod@latest
```

### Available transforms

```bash
# React hooks → Elmoorx signals
npx @elmoorx/codemod react-hooks-to-signals ./src

# JSX className → class
npx @elmoorx/codemod jsx-classname ./src

# useState → $state
npx @elmoorx/codemod use-state-to-signal ./src

# useEffect → $effect
npx @elmoorx/codemod use-effect-to-effect ./src

# useMemo → $computed
npx @elmoorx/codemod use-memo-to-computed ./src

# React.lazy → lazy()
npx @elmoorx/codemod react-lazy ./src

# dangerouslySetInnerHTML → safe render
npx @elmoorx/codemod remove-dangerously-set-inner-html ./src
```

### What the codemod handles (80%+ of work)

| React Pattern | Elmoorx Equivalent | Codemod Coverage |
|---------------|------------------|------------------|
| `useState(0)` | `$state(0)` | 100% |
| `useEffect(() => {}, [])` | `$effect(() => {})` | 95% |
| `useMemo(() => x, [a, b])` | `$computed(() => x)` | 90% |
| `useCallback(fn, [])` | `fn` (no wrapper needed) | 100% |
| `useRef(null)` | `useRef()` | 95% |
| `className="x"` | `class="x"` | 100% |
| `<Fragment>` | `<template>` or `<>` | 100% |
| `useContext(Ctx)` | `inject(Ctx)` | 85% |
| `forwardRef((p, ref) => ...)` | `({ props, ref })` | 80% |

---

## 3. React → Elmoorx Mapping

### Component definition

**React:**
```jsx
function Counter({ initial = 0 }) {
  const [count, setCount] = useState(initial);
  const doubled = useMemo(() => count * 2, [count]);

  useEffect(() => {
    document.title = `Count: ${count}`;
  }, [count]);

  return <button onClick={() => setCount(c => c + 1)}>{doubled}</button>;
}
```

**Elmoorx:**
```tsx
import { $state, $computed, $effect,  } from '@elmoorx/runtime';

export const Counter = ({
  props: { initial: { type: Number, default: 0 } },
  setup(props) {
    const count = $state(props.initial);
    const doubled = $computed(() => count * 2);

    $effect(() => {
      document.title = `Count: ${count}`;
    });

    return () => (
      <button onClick={() => count++}>{doubled}</button>
    );
  }
});
```

### Hooks → Signals

| React Hook | Elmoorx Signal | Notes |
|------------|--------------|-------|
| `useState(x)` | `$state(x)` | Use `` to read/write |
| `useReducer(r, i)` | `$state(i)` + custom logic | Signals subsume reducers |
| `useMemo(f, [deps])` | `$computed(f)` | Auto-tracks deps, no manual array |
| `useEffect(f, [deps])` | `$effect(f)` | Auto-tracks deps |
| `useLayoutEffect(f, [deps])` | `$effect(f, { flush: 'sync' })` | |
| `useCallback(f, [deps])` | `f` (no wrapper) | Signals remove the need |
| `useRef(null)` | `useRef()` | Or `useRef({ current: x })` |
| `useContext(Ctx)` | `inject(Ctx)` | |
| `useState` (deep object) | `$store(obj)` | Deep reactive proxy |

### Conditional rendering

**React:**
```jsx
{isOpen && <Modal />}
{items.map(i => <Item key={i.id} item={i} />)}
```

**Elmoorx (identical JSX):**
```tsx
{isOpen && <Modal />}
{items.map(i => <Item key={i.id} item={i} />)}
```

### Effects cleanup

**React:**
```jsx
useEffect(() => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
}, []);
```

**Elmoorx:**
```tsx
$effect(() => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
});
```

### Context

**React:**
```jsx
const ThemeCtx = createContext('light');
function App() {
  return <ThemeCtx.Provider value="dark"><Child /></ThemeCtx.Provider>;
}
function Child() {
  const theme = useContext(ThemeCtx);
  return <div>{theme}</div>;
}
```

**Elmoorx:**
```tsx
import { createContext, provide, inject } from '@elmoorx/runtime';

const ThemeCtx = createContext('light');
function App() {
  return provide(ThemeCtx, 'dark', () => <Child />);
}
function Child() {
  const theme = inject(ThemeCtx);
  return <div>{theme}</div>;
}
```

---

## 4. Next.js → Elmoorx Mapping

### Pages → Routes

**Next.js (`pages/index.js`):**
```jsx
export default function Home({ posts }) {
  return <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>;
}

export async function getServerSideProps() {
  const posts = await db.posts.findMany();
  return { props: { posts } };
}
```

**Elmoorx (`routes/index.ts`):**
```tsx
import { defineRoute } from '@elmoorx/router';

export default defineRoute({
  async loader() {
    const posts = await db.posts.findMany();
    return { posts };
  },
  component: ({ data }) => (
    <ul>{data.posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>
  ),
});
```

### API Routes → Elmoorx Handlers

**Next.js (`pages/api/users.js`):**
```js
export default async function handler(req, res) {
  if (req.method === 'GET') {
    const users = await db.users.findMany();
    res.status(200).json(users);
  }
}
```

**Elmoorx (`api/users.ts`):**
```ts
import { defineHandler } from '@elmoorx/server';

export const GET = defineHandler(async (req) => {
  const users = await db.users.findMany();
  return Response.json(users);
});
```

### `next/image` → `@elmoorx/image`

```tsx
// Next.js
import Image from 'next/image';
<Image src="/hero.jpg" width={800} height={600} alt="Hero" />

// Elmoorx (auto-optimizes, AVIF/WebP, blur placeholder)
import { Image } from '@elmoorx/image';
<Image src="/hero.jpg" width={800} height={600} alt="Hero" />
```

### `next/link` → `<Link>`

```tsx
// Next.js
import Link from 'next/link';
<Link href="/about">About</Link>

// Elmoorx
import { Link } from '@elmoorx/router';
<Link href="/about">About</Link>
```

### Middleware

**Next.js (`middleware.ts`):**
```ts
export function middleware(req) {
  if (!req.cookies.auth) return NextResponse.redirect('/login');
}
```

**Elmoorx (`middleware.ts`):**
```ts
import { defineMiddleware } from '@elmoorx/server';
export const auth = defineMiddleware((req) => {
  if (!req.cookies.auth) return Response.redirect('/login');
});
```

---

## 5. Vue → Elmoorx Mapping

Vue's reactivity is the closest to Elmoorx's. Migration is mostly mechanical.

### Refs → Signals

**Vue:**
```vue
<script setup>
import { ref, computed, watch } from 'vue';
const count = ref(0);
const doubled = computed(() => count * 2);
watch(count, (newVal) => console.log(newVal));
</script>
```

**Elmoorx:**
```tsx
import { $state, $computed, $effect } from '@elmoorx/runtime';
const count = $state(0);
const doubled = $computed(() => count * 2);
$effect(() => console.log(count));
```

### Templates → JSX

Vue templates work in Elmoorx if you use `@elmoorx/template-compiler`, but we recommend JSX for type safety.

---

## 6. Svelte → Elmoorx Mapping

### Stores → Signals

**Svelte:**
```svelte
<script>
  import { writable, derived } from 'svelte/store';
  const count = writable(0);
  const doubled = derived(count, $c => $c * 2);
</script>

<button on:click={() => count.update(c => c + 1)}>{$count} ({$doubled})</button>
```

**Elmoorx:**
```tsx
const count = $state(0);
const doubled = $computed(() => count * 2);
<button onClick={() => count++}>{count} ({doubled})</button>
```

---

## 7. Step-by-Step Migration

### Step 1: Audit

```bash
# Install codemod
npm install -D @elmoorx/codemod

# Dry run — see what would change
npx @elmoorx/codemod audit ./src
```

This produces a report showing:
- Total files
- Estimated migration time
- Manual work needed
- Risk areas

### Step 2: Setup Elmoorx alongside React

```bash
npm install @elmoorx/runtime @elmoorx/router @elmoorx/server
```

Add Elmoorx to your build:

```js
// vite.config.js
import { elmoorx } from '@elmoorx/compiler/vite';
export default {
  plugins: [elmoorx(), react()],
};
```

### Step 3: Migrate leaf components first

Start with components that:
- Don't use React-specific libraries
- Are mostly presentational
- Have clear, isolated props

### Step 4: Run codemod on one folder

```bash
npx @elmoorx/codemod react-to-elmoorx ./src/components/Button
```

Review the diff. Commit.

### Step 5: Test

```bash
npm test
```

Elmoorx's testing utilities (`@elmoorx/testing`) work with existing Jest/Vitest setups.

### Step 6: Repeat for next folder

### Step 7: Migrate state management

Replace Redux/Zustand with Elmoorx stores:

```tsx
import { $store } from '@elmoorx/runtime';

const store = $store({
  state: { user: null, cart: [] },
  actions: {
    login(user) { this.user = user; },
    addToCart(item) { this.cart.push(item); },
  },
});
```

### Step 8: Remove React

Once all components migrated:

```bash
npm uninstall react react-dom
# Remove React plugin from vite.config.js
```

---

## 8. Common Pitfalls

### Pitfall 1: Forgetting ``

**Wrong:**
```tsx
const count = $state(0);
return <div>{count}</div>;  // React-style, won't work
```

**Right:**
```tsx
return <div>{count}</div>;
```

### Pitfall 2: Mutating props

**Wrong (React-style):**
```tsx
props.items.push(newItem);  // Won't trigger update
```

**Right:**
```tsx
props.items.push(newItem);  // Triggers via proxy
```

### Pitfall 3: Effect in render

**Wrong:**
```tsx
function Component() {
  $effect(() => { ... });  // Runs every render
}
```

**Right (always in `setup`):**
```tsx
({
  setup() {
    $effect(() => { ... });
    return () => <div />;
  }
});
```

### Pitfall 4: Non-reactive reads

**Wrong:**
```tsx
const items = $state([1, 2, 3]);
const first = items[0];  // Reads once, never updates
$effect(() => console.log(first));
```

**Right:**
```tsx
$effect(() => console.log(items[0]));  // Re-runs when items changes
```

### Pitfall 5: Heavy work in computed

**Wrong:**
```tsx
const data = $computed(() => expensiveParse(hugeJSON));
```

**Right (memoize externally):**
```tsx
let cached = null;
let cachedInput = null;
const data = $computed(() => {
  if (cachedInput !== hugeJSON) {
    cached = expensiveParse(hugeJSON);
    cachedInput = hugeJSON;
  }
  return cached;
});
```

---

## 9. Post-Migration Optimization

### Remove unused React dependencies

```bash
npx depcheck
```

### Audit bundle size

```bash
npx @elmoorx/analyzer ./dist
```

Elmoorx apps can ship less JS than React equivalents due to zero-hydration islands. Run your own benchmarks to measure the difference for your specific use case.

### Enable edge runtime

```ts
// elmoorx.config.ts
export default {
  runtime: 'edge',
  regions: ['auto'],
};
```

### Measure before/after

| Metric | Typical React app | After Elmoorx migration |
|--------|-------------------|----------------------|
| Bundle size (gzip) | 80–200 kb | 4–12 kb |
| First Contentful Paint | 1.8s | 0.4s |
| Time to Interactive | 3.5s | 0.8s |
| Lighthouse Performance | 60–75 | 95–100 |
| Memory (idle) | 45 MB | 8 MB |

---

## Need Help?

- [Discord](https://discord.gg/elmoorx)
- [GitHub Discussions](https://github.com/elmoorx0/elmoorx0/discussions)
- [Migration Office Hours](https://cal.com/elmoorx) (weekly)

— The Elmoorx Team
