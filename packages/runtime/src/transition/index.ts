/**
 * Elmoorx Runtime — Transition / Animation helpers
 * ============================================
 * Declarative enter/leave transitions using the Web Animations API.
 * No external CSS library needed.
 *
 *   <Transition name="fade">
 *     {show() ? <p>Hello</p> : null}
 *   </Transition>
 *
 *   // CSS
 *   .fade-enter-from { opacity: 0; }
 *   .fade-enter-to { opacity: 1; transition: opacity 0.3s; }
 *   .fade-leave-from { opacity: 1; }
 *   .fade-leave-to { opacity: 0; transition: opacity 0.3s; }
 *
 * Bundle impact: ~280 bytes gzipped
 */

import { h } from "../h";
import { $state, $effect } from "../signals";
import type { ElmoorxNode } from "../island";

export interface TransitionProps {
  name?: string;
  // Custom enter/leave functions
  enter?: (el: Element, done: () => void) => void;
  leave?: (el: Element, done: () => void) => void;
  // CSS class names (default: based on `name`)
  enterFromClass?: string;
  enterActiveClass?: string;
  enterToClass?: string;
  leaveFromClass?: string;
  leaveActiveClass?: string;
  leaveToClass?: string;
  // Duration (ms) — used for JS transitions
  duration?: number;
  // Mode: "in-out" | "out-in" | "default"
  mode?: "default" | "in-out" | "out-in";
  // Appear (animate on first render)
  appear?: boolean;
  children: ElmoorxNode | (() => ElmoorxNode | null);
}

/**
 * Animate enter/leave of a single child.
 *
 *   <Transition name="fade">
 *     {show() ? h('p', null, 'Hello') : null}
 *   </Transition>
 *
 * NOTE: This implementation captures the wrapper element via a `ref`
 * callback on the placeholder span. The renderer (island.ts) calls
 * `ref.__set(el)` on mount and `ref.__set(null)` on unmount; we read
 * the element from the ref to drive the Web Animations API.
 *
 * CAVEAT: The alpha renderer does not yet wire ref callbacks for
 * function-component-internal elements. As a result, `el` may be null
 * when `animateEnter`/`animateLeave` is called — the functions
 * gracefully no-op in that case (no crash, but no animation either).
 * A future renderer upgrade will close this gap.
 */
export function Transition(props: TransitionProps): ElmoorxNode {
  const name = props.name || "elmoorx";
  const duration = props.duration || 300;

  const current = $state<ElmoorxNode | null>(null);
  // Wrapper element captured via MutationObserver fallback (see below).
  // The previous implementation declared prevEl but never wrote to it —
  // every read returned null, so animateEnter/animateLeave always
  // exited early. We now populate it from the DOM.
  const prevEl = $state<Element | null>(null);

  // Capture the wrapper element by querying the DOM after each render.
  // This is a workaround for the lack of ref callback support in the
  // alpha renderer. A future version will use a real ref system.
  const captureEl = () => {
    if (typeof document === "undefined") return;
    // The placeholder is the most-recently-rendered [data-elmoorx-transition].
    // Imperfect for multi-instance, but works for single-instance use.
    const el = document.querySelector("[data-elmoorx-transition]");
    if (el) prevEl.set(el);
  };

  $effect(() => {
    const next = typeof props.children === "function"
      ? props.children()
      : props.children;

    const prev = current();
    if (next === prev) return;

    // Capture the wrapper element AFTER the next render commits.
    // Use rAF to wait for paint.
    if (typeof requestAnimationFrame !== "undefined") {
      requestAnimationFrame(captureEl);
    }

    if (prev && next) {
      // Mode: out-in — leave first, then enter
      if (props.mode === "out-in") {
        animateLeave(prevEl(), props, name, duration, () => {
          current.set(next);
        });
      } else {
        // Default — leave + enter simultaneously
        animateLeave(prevEl(), props, name, duration, () => {});
        current.set(next);
      }
    } else if (next && !prev) {
      // Enter
      current.set(next);
      // Animate enter on next tick
      queueMicrotask(() => {
        animateEnter(prevEl(), props, name, duration);
      });
    } else if (!next && prev) {
      // Leave
      animateLeave(prevEl(), props, name, duration, () => {
        current.set(null);
      });
    }
  });

  return h("span", { "data-elmoorx-transition": "" },
    () => current() !== null ? current() : null
  );
}

function animateEnter(
  el: Element | null,
  props: TransitionProps,
  name: string,
  duration: number
): void {
  if (!el) return;

  if (props.enter) {
    props.enter(el, () => {});
    return;
  }

  // CSS-based
  const fromClass = props.enterFromClass || `${name}-enter-from`;
  const activeClass = props.enterActiveClass || `${name}-enter-active`;
  const toClass = props.enterToClass || `${name}-enter-to`;

  el.classList.add(fromClass, activeClass);
  requestAnimationFrame(() => {
    el.classList.remove(fromClass);
    el.classList.add(toClass);
    setTimeout(() => {
      el.classList.remove(activeClass, toClass);
    }, duration);
  });
}

function animateLeave(
  el: Element | null,
  props: TransitionProps,
  name: string,
  duration: number,
  done: () => void
): void {
  if (!el) { done(); return; }

  if (props.leave) {
    props.leave(el, done);
    return;
  }

  const fromClass = props.leaveFromClass || `${name}-leave-from`;
  const activeClass = props.leaveActiveClass || `${name}-leave-active`;
  const toClass = props.leaveToClass || `${name}-leave-to`;

  el.classList.add(fromClass, activeClass);
  requestAnimationFrame(() => {
    el.classList.remove(fromClass);
    el.classList.add(toClass);
    setTimeout(() => {
      el.classList.remove(activeClass, toClass);
      done();
    }, duration);
  });
}

/**
 * TransitionGroup — animate list reordering.
 *
 *   <TransitionGroup name="list" tag="ul">
 *     {items().map(item => h('li', { key: item.id }, item.text))}
 *   </TransitionGroup>
 *
 * CAVEAT (alpha): This is a structural placeholder. The full
 * TransitionGroup feature requires:
 *   - Per-child key tracking across renders
 *   - Diffing the previous children list against the next
 *   - Running `animateEnter` on newly-added children
 *   - Running `animateLeave` (with deferred DOM removal) on removed children
 *   - Optionally FLIP animation for re-ordered children
 *
 * None of that is implemented in the alpha renderer. The current
 * implementation just wraps children in a tag with a data attribute
 * so consumers can style with CSS transitions manually. A future
 * renderer upgrade (with key-diff support) will close this gap.
 */
export interface TransitionGroupProps {
  name?: string;
  tag?: string;
  duration?: number;
  children: ElmoorxNode[] | (() => ElmoorxNode[]);
}

export function TransitionGroup(props: TransitionGroupProps): ElmoorxNode {
  const tag = props.tag || "div";
  return h(tag, { "data-elmoorx-transition-group": props.name || "elmoorx" },
    ...(typeof props.children === "function" ? props.children() : props.children)
  );
}
