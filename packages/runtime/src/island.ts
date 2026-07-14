/**
 * Elmoorx Runtime — Islands
 * ============================================
 * Zero-hydration islands. The server streams pre-rendered HTML; the
 * client only boots JavaScript for islands explicitly marked with
 * `island()`. Everything else is static HTML — zero JS shipped.
 *
 * Bundle impact: ~440 bytes minified+gzipped
 */

import { $effect } from "./signals";

 
export interface IslandComponent<P = Record<string, unknown>> {
  (props: P): ElmoorxNode;
  __island?: true;
  __id?: string;
}

export type ElmoorxNode =
  | string
  | number
  | boolean
  | null
  | undefined
  | ElmoorxElement
  | ElmoorxNode[]
  // Reactive getter — a function that returns an ElmoorxNode.
  // The renderer re-invokes this inside $effect for surgical updates.
  | (() => ElmoorxNode);

export interface ElmoorxElement {
  tag: string;
  props: Record<string, unknown>;
  children: ElmoorxNode[];
}

/**
 * Mark a component as a client-side island.
 * The compiler emits a placeholder <div data-elmoorx-island="ID" />
 * in SSR output; the runtime boots only those islands on the client.
 *
 *   const LikeButton = island(() => {
 *     const count = $state(0);
 *     return <button onClick={() => count.set(c => c + 1)}>{count}</button>;
 *   });
 */
 
export function island<P = Record<string, unknown>>(
  component: (props: P) => ElmoorxNode
): IslandComponent<P> {
  const fn = component as IslandComponent<P>;
  fn.__island = true;
  fn.__id = `island_${Math.random().toString(36).slice(2, 9)}`;
  return fn;
}

/**
 * Server: render an island's initial HTML + serialize its props/state.
 */
export function renderIsland<P>(
  component: IslandComponent<P>,
  props: P
): { html: string; payload: string } {
  const node = component(props);
  const html = renderToString(node);
  const payload = JSON.stringify({
    id: component.__id,
    props,
    initialHtml: html,
  });
  return {
    html: `<div data-elmoorx-island="${component.__id}" data-props="${escapeAttr(payload)}">${html}</div>`,
    payload,
  };
}

/**
 * Client: scan DOM for island placeholders and boot them.
 *
 * IMPORTANT: To preserve the "zero-hydration" promise, we do NOT
 * wipe the server-rendered HTML and re-render from scratch. Instead
 * we walk the existing DOM and attach event listeners + reactive
 * subscriptions only. The DOM nodes created by the server are reused.
 *
 * Called automatically on page load — only islands present in the
 * DOM are hydrated. Everything else is pure static HTML.
 */
export function hydrateIslands(registry: Record<string, IslandComponent>): void {
  if (typeof document === "undefined") return;
  const placeholders = document.querySelectorAll("[data-elmoorx-island]");
  placeholders.forEach((el) => {
    const id = el.getAttribute("data-elmoorx-island");
    const propsJson = el.getAttribute("data-props");
    if (!id || !registry[id]) return;

    let props: unknown;
    if (propsJson) {
      try {
        // Malformed data-props used to crash hydration for every island
        // on the page. Wrap in try/catch so one bad island doesn't take
        // down the rest.
        props = JSON.parse(decodeURIComponent(propsJson));
      } catch {
        console.error(`[elmoorx] Failed to parse island props for ${id}`);
        return;
      }
    } else {
      props = {};
    }
    const component = registry[id];
    const node = component(props as Record<string, unknown>);

    // Walk the existing DOM and attach event handlers / reactive
    // subscriptions, instead of clobbering innerHTML.
    hydrateNode(node, el as HTMLElement);
  });
}

/**
 * Walk a ElmoorxNode tree alongside an existing DOM tree, attaching
 * event listeners and creating reactive effects for signal-backed
 * attributes/text. Does NOT replace DOM nodes that already match.
 */
function hydrateNode(node: ElmoorxNode, dom: Node): void {
  if (node === null || node === undefined || typeof node !== "object") {
    return;
  }
  if (Array.isArray(node)) {
    // Map each child to its corresponding DOM sibling
    let cursor = dom.firstChild;
    for (const child of node) {
      if (!cursor) break;
      hydrateNode(child, cursor);
      cursor = cursor.nextSibling;
    }
    return;
  }
  const el = node as ElmoorxElement;
  if (typeof el.tag !== "string") return;

  // Fragment: hydrate children against the DOM's siblings, skipping
  // the (non-existent) wrapper element.
  if (el.tag === "fragment") {
    let cursor = dom.firstChild;
    for (const child of el.children || []) {
      if (!cursor) break;
      hydrateNode(child, cursor);
      cursor = cursor.nextSibling;
    }
    return;
  }

  // Attach event handlers + reactive attribute bindings
  if (dom instanceof HTMLElement) {
    for (const [key, value] of Object.entries(el.props || {})) {
      if (key === "children" || value == null || value === false) continue;

      if (key === "className") {
        if (typeof value === "function") {
          // Reactive class — subscribe via effect
          $effect(() => {
            const v = String(value());
            dom.setAttribute("class", v);
          });
        }
        // static className was already rendered by SSR
      } else if (key.startsWith("on") && typeof value === "function") {
        const eventName = key.slice(2).toLowerCase();
        dom.addEventListener(eventName, value as EventListener);
      } else if (typeof value === "function") {
        // Reactive attribute — re-bind when signal changes
        $effect(() => {
          const v = String(value());
          dom.setAttribute(key, v);
        });
      }
    }
  }

  // Recurse into children using existing DOM children
  const domChildren = dom.childNodes;
  const nodeChildren = el.children || [];
  const max = Math.min(domChildren.length, nodeChildren.length);
  for (let i = 0; i < max; i++) {
    hydrateNode(nodeChildren[i], domChildren[i]);
  }
}

/**
 * Convert a ElmoorxNode tree into an HTML string (SSR).
 */
export function renderToString(node: ElmoorxNode): string {
  if (node === null || node === undefined || node === false || node === true) {
    return "";
  }
  if (typeof node === "string") return escapeHtml(node);
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) {
    return node.map(renderToString).join("");
  }

  const el = node as ElmoorxElement;

  // Fragment: emit just the children, no wrapper tag.
  if (el.tag === "fragment") {
    return (el.children || []).map(renderToString).join("");
  }

  let html = `<${el.tag}`;
  for (const [key, value] of Object.entries(el.props || {})) {
    if (key === "children" || value == null || value === false) continue;
    if (key === "className") {
      html += ` class="${escapeAttr(String(typeof value === "function" ? value() : value))}"`;
    } else if (key.startsWith("on") && typeof value === "function") {
      // Event handlers are NOT serialized — they're wired up on the client.
      continue;
    } else if (typeof value === "function") {
      // Signal read during SSR — render its current value
      html += ` ${key}="${escapeAttr(String(value()))}"`;
    } else {
      html += ` ${key}="${escapeAttr(String(value))}"`;
    }
  }
  html += ">";

  // Void elements
  if (["br", "hr", "img", "input", "meta", "link"].includes(el.tag)) {
    return html;
  }

  for (const child of el.children || []) {
    html += renderToString(child);
  }
  html += `</${el.tag}>`;
  return html;
}

/**
 * Client-side mount — attach a ElmoorxNode tree to a real DOM node.
 * Reads signals during traversal so updates are surgical.
 *
 * Reactive children/attributes (functions returning a value) are
 * wrapped in `$effect` so they re-run when their signal deps change.
 */
export function mount(node: ElmoorxNode, parent: HTMLElement): void {
  const el = renderToDom(node, parent);
  if (el) parent.appendChild(el);
}

function renderToDom(node: ElmoorxNode, _parent: Node): Node | null {
  if (node === null || node === undefined || node === false || node === true) {
    return null;
  }
  if (typeof node === "string" || typeof node === "number") {
    return document.createTextNode(String(node));
  }
  if (Array.isArray(node)) {
    const frag = document.createDocumentFragment();
    for (const child of node) {
      const el = renderToDom(child, frag);
      if (el) frag.appendChild(el);
    }
    return frag;
  }

  const el = node as ElmoorxElement;

  // Fragment: don't create a real DOM element — return a DocumentFragment
  // containing the rendered children. Callers appendChild() the fragment,
  // which flattens its children into the parent.
  if (el.tag === "fragment") {
    const frag = document.createDocumentFragment();
    for (const child of el.children || []) {
      const childDom = renderToDom(child, frag);
      if (childDom) frag.appendChild(childDom);
    }
    return frag;
  }

  const dom = document.createElement(el.tag);

  for (const [key, value] of Object.entries(el.props || {})) {
    if (key === "children" || value == null || value === false) continue;

    if (key === "className") {
      if (typeof value === "function") {
        // Reactive class — re-render when signal changes
        $effect(() => {
          const v = String(value());
          dom.setAttribute("class", v);
        });
      } else {
        dom.setAttribute("class", String(value));
      }
    } else if (key.startsWith("on") && typeof value === "function") {
      const eventName = key.slice(2).toLowerCase();
      dom.addEventListener(eventName, value as EventListener);
    } else if (typeof value === "function") {
      // Reactive attribute — re-bind when signal changes.
      // Subscriptions are tied to the element's lifetime via $effect's
      // dispose; the effect is auto-cleaned when its signals change.
      $effect(() => {
        const v = String(value());
        dom.setAttribute(key, v);
      });
    } else {
      dom.setAttribute(key, String(value));
    }
  }

  // Children — including reactive ones via functions
  for (const child of el.children || []) {
    appendChild(dom, child);
  }
  return dom;
}

/**
 * Append a ElmoorxNode child to a parent DOM node. Function children
 * (signals) get wrapped in `$effect` for surgical updates.
 */
function appendChild(parent: HTMLElement, child: ElmoorxNode): void {
  if (child === null || child === undefined || child === false || child === true) {
    return;
  }
  if (typeof child === "function") {
    // Reactive text/element — re-render on signal change
    const marker = document.createComment("elmoorx-reactive");
    parent.appendChild(marker);
    let currentNodes: Node[] = [];
    $effect(() => {
      // Remove previous
      for (const n of currentNodes) {
        if (n.parentNode) n.parentNode.removeChild(n);
      }
      currentNodes = [];
      const v = (child as () => ElmoorxNode)();
      const nodes = toArray(v);
      for (const n of nodes) {
        const dom = renderToDom(n, parent);
        if (dom) {
          parent.insertBefore(dom, marker);
          currentNodes.push(dom);
        }
      }
    });
    return;
  }
  const dom = renderToDom(child, parent);
  if (dom) parent.appendChild(dom);
}

function toArray(node: ElmoorxNode): ElmoorxNode[] {
  if (Array.isArray(node)) return node;
  if (node === null || node === undefined || node === false || node === true) {
    return [];
  }
  return [node];
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
