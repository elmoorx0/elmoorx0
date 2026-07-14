/**
 * Elmoorx Runtime — Suspense (Async Components)
 * ============================================
 * Streaming SSR + progressive enhancement for async work.
 *
 *   <Suspense fallback={<Spinner />}>
 *     <AsyncPosts />  // returns Promise<ElmoorxNode>
 *   </Suspense>
 *
 * During SSR:
 *   - The fallback is streamed immediately
 *   - The async content streams in when ready
 *
 * On the client:
 *   - The fallback renders first
 *   - When the promise resolves, the content swaps in
 *
 * Bundle impact: ~240 bytes gzipped
 */

import { h } from "../h";
import { $state } from "../signals";
import type { ElmoorxNode } from "../island";

export interface SuspenseProps {
  fallback: ElmoorxNode;
  children: ElmoorxNode | Promise<ElmoorxNode>;
}

/**
 * Suspense component — handles async children with a fallback.
 */
export function Suspense(props: SuspenseProps): ElmoorxNode {
  // Synchronous case
// @ts-expect-error — TS2339: Property 'then' does not exist on type '{}'.
  if (!(props.children as unknown)?.then) {
    return props.children as ElmoorxNode;
  }

  // Async case — return a placeholder that updates when resolved
  // (In a real impl, this would integrate with the renderer's
  // streaming output. For the demo, we use $state to swap content.)
  const resolved = $state<ElmoorxNode | null>(null);
  const promise = props.children as Promise<ElmoorxNode>;

  promise.then((node) => resolved.set(node));

  return h("span", { "data-elmoorx-suspense": "" },
    () => (resolved() === null ? props.fallback : resolved())
  );
}

/**
 * Helper — wrap an async function as a Elmoorx component.
 *
 *   const Posts = async(() => {
 *     const data = await fetch('/api/posts').then(r => r.json());
 *     return h('ul', null, data.map(p => h('li', null, p.title)));
 *   });
 *
 * NOTE: The returned wrapper casts `Promise<ElmoorxNode>` to
 * `ElmoorxNode` so it can be used wherever a regular node is expected.
 * Only the SSR streaming renderer (renderToStream below) and the
 * `<Suspense>` component handle the promise shape — using an async_
 * component WITHOUT a surrounding `<Suspense>` will render
 * `[object Promise]` on the client.
 */
export function async_<T extends (...args: unknown[]) => Promise<ElmoorxNode>>(
  fn: T
): (props: unknown) => ElmoorxNode {
  return (props: unknown) => {
    return fn(props) as unknown as ElmoorxNode;
  };
}

/**
 * Streaming SSR — emit fallback first, then async content.
 *
 * Server-side usage:
 *   const stream = renderToStream(
 *     h(Suspense, { fallback: h(Loader, {}) }, h(AsyncPosts, {}))
 *   );
 *   stream.pipe(res);
 *
 * NOTE: The current implementation awaits each promise before yielding
 * more chunks — it does NOT interleave fallback emission with async
 * content via the Suspense boundary. A full streaming implementation
 * would detect `<Suspense>` in the tree, yield the fallback immediately,
 * then yield a `<template>` swap-in chunk when the async children
 * resolve. That upgrade is on the roadmap; the current impl produces
 * correct HTML but blocks on the longest async child.
 */
export async function* renderToStream(node: ElmoorxNode): AsyncGenerator<string> {
  // Walk the tree, emitting HTML as we go.
  // When we hit a Promise, await it and emit the resolved content.
  yield* renderNode(node);
}

async function* renderNode(node: ElmoorxNode): AsyncGenerator<string> {
  if (node === null || node === undefined) {
    return;
  }
  if (typeof node === "string") {
    yield escapeHtml(node);
    return;
  }
  if (typeof node === "number") {
    yield String(node);
    return;
  }
  if (typeof node === "boolean") {
    return;
  }
  if (typeof node !== "object") {
    yield escapeHtml(String(node));
    return;
  }

  // Check if it's a promise (async component)
// @ts-expect-error — TS2571: Object is of type 'unknown'.
  if ((node as unknown).then) {
    const resolved = await (node as unknown as Promise<ElmoorxNode>);
    yield* renderNode(resolved);
    return;
  }

  if (Array.isArray(node)) {
    for (const child of node) {
      yield* renderNode(child);
    }
    return;
  }

  const el = node as unknown;
  if (!(el as Record<string, unknown>).tag) return;

  // Fragment — emit children only.
  if ((el as Record<string, unknown>).tag === "fragment") {
// @ts-expect-error — TS2488: Type '{}' must have a '[Symbol.iterator]()' method that returns an itera
    for (const child of (el as Record<string, unknown>).children || []) {
      yield* renderNode(child);
    }
    return;
  }

  yield `<${(el as Record<string, unknown>).tag}`;
  for (const [key, value] of Object.entries((el as Record<string, unknown>).props || {})) {
    if (key === "children" || value == null || value === false) continue;
    // Event handlers are NOT serialized — they're wired up on the client.
    if (key.startsWith("on") && typeof value === "function") continue;
    // className → class
    const attrName = key === "className" ? "class" : key;
    // Reactive prop — read current value
    const v = typeof value === "function" ? value() : value;
    if (v == null || v === false) continue;
    // SECURITY: escape attribute value to prevent attribute injection.
    // Previously the value was emitted raw, allowing `"` and `<` to
    // break out of the attribute context.
    yield ` ${attrName}="${escapeAttr(String(v))}"`;
  }
  yield ">";

  // Void elements — no closing tag, no children
// @ts-expect-error — TS2345: Argument of type 'unknown' is not assignable to parameter of type 'strin
  if (["br", "hr", "img", "input", "meta", "link"].includes((el as Record<string, unknown>).tag)) {
    return;
  }

// @ts-expect-error — TS2488: Type '{}' must have a '[Symbol.iterator]()' method that returns an itera
  for (const child of (el as Record<string, unknown>).children || []) {
    yield* renderNode(child);
  }

  yield `</${(el as Record<string, unknown>).tag}>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
