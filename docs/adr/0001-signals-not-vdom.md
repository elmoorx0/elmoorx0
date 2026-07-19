# 0001 — Use signals instead of vdom

## Status

Accepted — 2026-07-15

## Context

Elmoorx needed a reactive primitive for surgical DOM updates. The
two main options were:

1. **Virtual DOM diffing** (React, Vue, Svelte pre-5) — render the
   whole component tree to a vdom, diff with the previous vdom, apply
   patches to the real DOM. Simple mental model but O(tree size) per
   update.

2. **Signals** (SolidJS, Angular, Svelte 5, Vue 3.4+) — track
   property-level dependencies at read time; on write, only the exact
   DOM nodes that read the signal re-render. O(changed properties)
   per update.

Benchmarks (real, run locally with `node scripts/benchmark.js`) showed:

- Signal read: 675K ops/s
- Signal write (no deps): 657K ops/s
- Signal write (1 effect): 387K ops/s
- Signal write (10 effects): 92K ops/s

For the typical Elmoorx app (a few dozen reactive values, mostly
independent), signals are 10-100× faster than vdom diffing.

The framework's "~1.2kb gzipped" claim depends on this — a vdom
implementation would be ~5-10kb minified+gzipped.

## Decision

Use signals (`$state`, `$computed`, `$effect`, `$batch`) as the
reactive primitive. No vdom. The renderer walks the ElmoorxNode tree
once at mount time and wires up reactive subscriptions via `$effect`.

## Consequences

**Easier:**

- Tiny runtime (~1.2kb gzipped)
- Surgical updates — only the changed DOM nodes re-render
- No reconciliation algorithm to maintain
- Mental model is close to vanilla JS (read = subscribe, write = notify)

**Harder:**

- Developers coming from React must learn that reads track deps
  (calling `count()` inside an `$effect` subscribes; calling it
  outside doesn't)
- No automatic `key` prop diffing for lists — list reordering
  requires explicit `key` and the renderer handles insertions
  manually
- Async rendering requires Suspense + islands (no concurrent mode
  like React 18)
- Time-travel debugging requires a separate package
  (`@elmoorx/time-travel`) because signals don't preserve history

**Trade-offs:**

- We adopted SolidJS's "fine-grained" mental model but DID NOT adopt
  Solid's compile-time JSX transform. Elmoorx uses runtime
  `$effect()` wrapping, which is slower than Solid's compiled output
  but simpler to debug.
- The `$store` proxy adds ~480 bytes gzipped but enables the ergonomic
  `store.user.name = "Bob"` syntax. Without it, users would write
  `user.set(u => ({ ...u, name: "Bob" }))` which is verbose.
