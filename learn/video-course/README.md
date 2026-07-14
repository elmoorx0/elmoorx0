# Elmoorx Framework — Complete Video Course

> **12 lessons · 6 hours · Beginner to Advanced**
> Everything you need to build production apps with Elmoorx Framework v2.0

## Course Overview

| Module | Lessons | Duration | Level |
|--------|---------|----------|-------|
| 1. Foundations | 1-3 | 90 min | Beginner |
| 2. Building UIs | 4-6 | 90 min | Intermediate |
| 3. Full-Stack | 7-9 | 90 min | Advanced |
| 4. Production | 10-12 | 90 min | Expert |

---

## Module 1: Foundations

### Lesson 1: Introduction to Elmoorx (25 min)

**What you'll learn:**
- Why Elmoorx exists (problems with React, Next.js, Vue)
- The signals-based reactivity model
- Zero-hydration islands architecture
- Bundle size comparison (4.2kb vs React's 80kb+)

**Sample code:**
```tsx
import { $state, $effect, defineComponent } from '@elmoorx/runtime';

export const Counter = defineComponent({
  setup() {
    const count = $state(0);
    $effect(() => console.log('Count:', count.value));
    return () => <button onClick={() => count.value++}>{count.value}</button>;
  }
});
```

**Homework:** Install Elmoorx CLI (`npm i -g @elmoorx/cli`) and create your first app (`elmoorx create my-app`).

---

### Lesson 2: Reactivity Deep Dive (30 min)

**What you'll learn:**
- `$state` — the primitive signal
- `$computed` — derived state with auto-tracking
- `$effect` — side effects that auto-cleanup
- `createStore` — deep reactive proxies
- Why this beats React's `useState`/`useMemo`/`useEffect`

**Sample code:**
```tsx
const firstName = $state('Ahmed');
const lastName = $state('Hassan');
const fullName = $computed(() => `${firstName.value} ${lastName.value}`);

$effect(() => {
  document.title = fullName.value; // Re-runs only when fullName changes
});
```

**Comparison table:**
| React | Elmoorx | Benefit |
|-------|-------|---------|
| `useState(0)` | `$state(0)` | No setter function needed |
| `useMemo(f, [deps])` | `$computed(f)` | Auto-tracks deps |
| `useEffect(f, [deps])` | `$effect(f)` | No stale closures |
| `useCallback(f, [deps])` | `f` (no wrapper) | Functions are stable |

---

### Lesson 3: Components & Props (35 min)

**What you'll learn:**
- `defineComponent` API
- Props with type validation
- Default props
- Slots (better than React's children)
- Refs and forwarding

**Sample code:**
```tsx
export const Button = defineComponent({
  props: {
    variant: { type: String, default: 'primary' },
    size: { type: String, default: 'md' },
    disabled: { type: Boolean, default: false },
  },
  setup(props, { slots, emit }) {
    return () => (
      <button
        class={`btn btn-${props.variant} btn-${props.size}`}
        disabled={props.disabled}
        onClick={() => emit('click')}
      >
        {slots.default?.()}
      </button>
    );
  }
});
```

---

## Module 2: Building UIs

### Lesson 4: The 648-Component Library (30 min)

**What you'll learn:**
- 12 categories of components
- Forms (50): Input, DatePicker, OTPInput, ColorPicker
- Layout (60): Grid, Stack, Card, Sidebar
- Navigation (50): Navbar, MegaMenu, CommandPalette
- Data Display (66): DataTable, Tree, Calendar, Kanban, 11 Chart types
- Pro (56): RichTextEditor, PivotTable, StockChart

**Sample code:**
```tsx
import { Card, DataTable, Badge } from '@elmoorx/ui';

<Card>
  <h3>Users</h3>
  <DataTable
    columns={[
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'status', label: 'Status', render: (v) => <Badge variant={v === 'active' ? 'green' : 'red'}>{v}</Badge> },
    ]}
    data={users}
    pagination={{ pageSize: 10 }}
    sortable
    filterable
  />
</Card>
```

---

### Lesson 5: Routing & Layouts (30 min)

**What you'll learn:**
- File-system routing (`routes/index.ts` → `/`)
- Dynamic routes (`routes/users/[id].ts` → `/users/123`)
- Nested layouts
- Loaders (data fetching)
- Code-splitting per route

**Sample code:**
```tsx
// routes/users/[id].ts
import { defineRoute } from '@elmoorx/router';

export default defineRoute({
  async loader({ params }) {
    const user = await db.users.find(params.id);
    if (!user) throw new Response('Not Found', { status: 404 });
    return { user };
  },
  component: ({ data }) => (
    <div>
      <h1>{data.user.name}</h1>
      <p>{data.user.email}</p>
    </div>
  ),
});
```

---

### Lesson 6: Styling with @elmoorx/css (30 min)

**What you'll learn:**
- Atomic CSS (like Tailwind but zero-runtime)
- CSS-in-JS when you need it
- Theming with design tokens
- Dark mode
- RTL support (Arabic, Hebrew, Persian)

**Sample code:**
```tsx
import { styled, useTheme } from '@elmoorx/css';

const Button = styled.button`
  background: ${props => props.theme.colors.primary};
  color: white;
  padding: ${props => props.theme.spacing.md};
`;

// Or use atomic classes
<div class="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">
  <h1 class="text-2xl font-bold text-gray-900">Title</h1>
</div>
```

---

## Module 3: Full-Stack

### Lesson 7: API Routes (30 min)

**What you'll learn:**
- Creating API endpoints
- Request/response handling
- Middleware (auth, CORS, rate-limiting)
- File uploads
- WebSocket setup

**Sample code:**
```ts
// api/users.ts
import { defineHandler, auth } from '@elmoorx/server';

export const GET = defineHandler(
  auth(),
  async (req) => {
    const users = await db.users.findMany();
    return Response.json(users);
  }
);

export const POST = defineHandler(
  auth(),
  async (req) => {
    const body = await req.json();
    const user = await db.users.create(body);
    return Response.json(user, { status: 201 });
  }
);
```

---

### Lesson 8: Database with @elmoorx/postgres (30 min)

**What you'll learn:**
- Connection pooling
- Query builder (SQL-injection safe)
- Transactions with savepoints
- Schema migrations
- Real PostgreSQL in production

**Sample code:**
```ts
import { createPool, qb } from '@elmoorx/postgres';

const pool = createPool({ database: 'myapp' });

// Query builder
const users = await pool.query(
  qb().table('users')
    .select('id', 'name', 'email')
    .where('age', '>', 18)
    .whereIn('country', ['US', 'CA', 'UK'])
    .orderBy('name')
    .limit(10)
    .build()
);

// Transaction
await pool.tx(async (client) => {
  await client.query('INSERT INTO orders (user_id, total) VALUES ($1, $2)', [userId, total]);
  await client.query('UPDATE users SET last_order_at = NOW() WHERE id = $1', [userId]);
});
```

---

### Lesson 9: Authentication & OAuth (30 min)

**What you'll learn:**
- Email/password with scrypt hashing
- JWT sessions
- OAuth (Google, GitHub)
- Two-factor authentication
- Role-based access control (RBAC)

**Sample code:**
```ts
import { AuthService } from '@elmoorx/auth';

const auth = new AuthService();

// Signup
const { user, sessionToken } = await auth.signup(email, password, name);

// OAuth flow
const googleUrl = auth.getOAuthUrl('google', redirectUri);
// ... user authorizes ...
const { user } = await auth.oauthCallback('google', code);

// 2FA
const secret = auth.generate2FASecret(user.id);
const isValid = auth.verify2FA(user.id, userEnteredCode);
```

---

## Module 4: Production

### Lesson 10: SEO & Performance (30 min)

**What you'll learn:**
- 66 meta tags auto-generated
- 6 JSON-LD schemas
- Sitemap & RSS
- Lighthouse 95+ scores
- Edge runtime deployment

**Sample code:**
```tsx
import { Head } from '@elmoorx/head';

export default function Page() {
  return (
    <>
      <Head>
        <title>Elmoorx Framework — Build Fast. Run Anywhere.</title>
        <meta name="description" content="The framework that ships 4.2kb and runs anywhere." />
        <meta property="og:title" content="Elmoorx Framework" />
        <meta property="og:image" content="/og-image.png" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Elmoorx Framework",
          })}
        </script>
      </Head>
      <main>...</main>
    </>
  );
}
```

---

### Lesson 11: Testing & Monitoring (30 min)

**What you'll learn:**
- Unit testing with `@elmoorx/testing`
- Integration testing
- E2E testing with the built-in runner
- Real-time monitoring
- Alerting on thresholds
- Prometheus metrics export

**Sample code:**
```ts
import { test, expect } from '@elmoorx/testing';
import { render, fireEvent } from '@elmoorx/testing/dom';
import { Counter } from './Counter';

test('counter increments', async () => {
  const { getByText } = render(<Counter />);
  const button = getByText('0');
  await fireEvent.click(button);
  expect(getByText('1')).toBeDefined();
});
```

---

### Lesson 12: Deployment (30 min)

**What you'll learn:**
- Docker multi-stage build
- Deploy to Cloudflare Workers
- Deploy to Vercel Edge
- Deploy to Deno Deploy
- CI/CD with GitHub Actions
- Zero-downtime deploys

**Sample `elmoorx.config.ts`:**
```ts
export default {
  runtime: 'edge',
  regions: ['auto'],
  build: {
    target: 'es2022',
    minify: true,
  },
  deploy: {
    provider: 'cloudflare',
    zones: ['elmoorx.dev'],
  },
};
```

**Deploy command:**
```bash
elmoorx deploy
# ✓ Built in 1.2s
# ✓ Bundle: 4.2kb gzipped
# ✓ Deployed to 300+ edge locations
# ✓ Live at https://myapp.elmoorx.dev
```

---

## Course Resources

- 📚 [Documentation](https://elmoorx.dev/docs)
- 💬 [Discord community](https://discord.gg/elmoorx)
- 🐛 [GitHub issues](https://github.com/elmoorx/framework/issues)
- 🎨 [Component playground](http://localhost:5000)
- 🤖 [AI assistant](http://localhost:5400)
- 📋 [Template library](http://localhost:5300)

## Certificate

Complete all 12 lessons and exercises to earn the **Elmoorx Certified Developer** certificate.

— Happy building! The Elmoorx Team
