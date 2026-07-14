/**
 * Elmoorx Testing — Test utilities for components
 * ============================================
 * Lightweight helpers for testing Elmoorx components in isolation.
 *
 *   import { render, $ } from "@elmoorx/testing";
 *
 *   test('counter increments', () => {
 *     const { container, getByText } = render(h(Counter, {}));
 *     expect(getByText('Count: 0')).toBeDefined();
 *     $('button', container).click();
 *     expect(getByText('Count: 1')).toBeDefined();
 *   });
 *
 * Works with Node.js's built-in test runner or any framework (Jest, Vitest, etc.)
 */

import { renderToString, mount, type ElmoorxNode } from "@elmoorx/runtime";
import { JSDOM } from "jsdom";

export interface RenderResult {
  container: HTMLElement;
  html: string;
  getByText: (text: string) => HTMLElement | null;
  getByRole: (role: string) => HTMLElement | null;
  getByTestId: (id: string) => HTMLElement | null;
  querySelector: (selector: string) => HTMLElement | null;
  querySelectorAll: (selector: string) => HTMLElement[];
  cleanup: () => void;
}

/**
 * Render a Elmoorx component into a JSDOM container.
 */
export function render(node: ElmoorxNode): RenderResult {
  const dom = new JSDOM("<!DOCTYPE html><html><body><div id='test-root'></div></body></html>", {
    url: "http://localhost/",
    pretendToBeVisual: true,
  });

  // @ts-expect-error — jsdom globals don't perfectly match Node's DOM types
  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;

  const container = (dom.window.document.getElementById("test-root") as NonNullable<ReturnType<typeof dom.window.document.getElementById>>);
  mount(node, container);

  const html = container.innerHTML;

  return {
    container,
    html,
    getByText: (text: string) => {
      const all = container.querySelectorAll("*");
      for (const el of all) {
        if (el.textContent === text) return el as HTMLElement;
      }
      return null;
    },
    getByRole: (role: string) =>
      container.querySelector(`[role="${role}"]`) as HTMLElement | null,
    getByTestId: (id: string) =>
      container.querySelector(`[data-testid="${id}"]`) as HTMLElement | null,
    querySelector: (selector: string) =>
      container.querySelector(selector) as HTMLElement | null,
    querySelectorAll: (selector: string) =>
      Array.from(container.querySelectorAll(selector)) as HTMLElement[],
    cleanup: () => {
      container.innerHTML = "";
      dom.window.close();
    },
  };
}

/**
 * Render to string only — useful for SSR tests.
 */
export function renderToString_(node: ElmoorxNode): string {
  return renderToString(node);
}

/**
 * Simulate a DOM event on an element.
 */
export function fire(
  event: "click" | "input" | "change" | "submit" | "keydown" | "keyup" | "keypress",
  element: HTMLElement,
  opts?: Record<string, unknown>
): void {
  const EventClass =
    event === "keydown" || event === "keyup" || event === "keypress"
      ? window.KeyboardEvent
      : event === "input" || event === "change"
      ? window.Event
      : window.Event;
  const ev = new EventClass(event, { bubbles: true, ...opts });
  element.dispatchEvent(ev);
}

/**
 * Wait for all pending effects to flush.
 */
export async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Assert that a signal's value matches expected.
 */
export function expectSignal<T>(
  signal: () => T,
  expected: T
): void {
  const actual = signal();
  if (actual !== expected) {
    throw new Error(`Signal expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

/**
 * Wait for a signal to match a predicate.
 */
export async function waitFor<T>(
  signal: () => T,
  predicate: (v: T) => boolean,
  timeoutMs = 1000
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate(signal())) return;
    await flush();
  }
  throw new Error(`Signal did not satisfy predicate within ${timeoutMs}ms`);
}

/**
 * Mock fetch for testing data-fetching components.
 */
export function mockFetch(responses: Record<string, unknown>): () => void {
  const original = global.fetch;
  global.fetch = (async (url: string | URL | Request) => {
    const key = typeof url === "string" ? url : url.toString();
    const response = responses[key];
    if (!response) {
      return new Response(JSON.stringify({ error: "Not mocked" }), { status: 404 });
    }
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof global.fetch;

  return () => {
    global.fetch = original;
  };
}

/**
 * Snapshot testing — compare HTML output.
 */
export function toMatchSnapshot(html: string, snapshot: string): void {
  if (html !== snapshot) {
    console.error("Snapshot mismatch:");
    console.error("  Expected:", snapshot);
    console.error("  Got:     ", html);
    throw new Error("Snapshot did not match");
  }
}
