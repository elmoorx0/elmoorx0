# 0002 — Zero-hydration islands

## Status

Accepted — 2026-07-15

## Context

SSR frameworks traditionally hydrate the entire page on the client —
meaning the client re-renders the whole tree to attach event handlers
and reconcile state. This ships ~45kb of JS (React) just to hydrate,
even for static pages.

Frameworks like Astro and Marko pioneered "islands" — only the
interactive parts of the page get JavaScript. The static parts are
pure HTML.

Elmoorx needed to decide:

1. **Full hydration** (Next.js, Remix) — re-render everything on the
   client. Simpler mental model, larger JS bundle.

2. **Zero-hydration islands** (Astro, Marko) — server renders HTML,
   client only boots `island()` components. Smaller JS, requires
   developers to mark interactive components explicitly.

## Decision

Use zero-hydration islands. The server renders the full tree to
HTML via `renderToString()` / `renderToStream()`. Components wrapped
in `island()` get a placeholder `<div data-elmoorx-island="ID">` in
SSR output, and the client only boots those islands via
`hydrateIslands()`.

Everything outside `island()` is pure static HTML — zero JS shipped.

## Consequences

**Easier:**

- Tiny client JS — only islands need code
- Faster initial page load (no hydration blocking)
- Better Core Web Vitals (LCP, FCP)
- Static HTML works without JS at all (progressive enhancement)

**Harder:**

- Developers must wrap interactive components in `island()` — easy to
  forget, leading to dead-looking UI
- `island()` components can't use Context from the SSR tree (each
  island is its own reactive scope)
- Props passed to islands must be JSON-serializable (functions get
  stripped at the SSR boundary)
- The compiler must track island boundaries to emit the right
  placeholder + client bundle

**Trade-offs:**

- The `island()` boundary is implicit — there's no `<Island>`
  component to wrap JSX with. This makes the syntax lighter but
  can confuse newcomers.
- We DON'T support partial hydration (like Marko's `<await>`) —
  async islands suspend at the server boundary, not at the client.
  This is simpler but means a slow data fetch blocks the whole
  Suspense boundary.
