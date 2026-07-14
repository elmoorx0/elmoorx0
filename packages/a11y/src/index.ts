/**
 * Elmoorx A11y — Accessibility helpers
 * ============================================
 * Building blocks for accessible components:
 *   - Focus management
 *   - Focus trap (for modals)
 *   - Screen reader announcements
 *   - Reduced motion detection
 *   - Keyboard navigation helpers
 *   - ARIA helpers
 *
 * Bundle impact: ~420 bytes gzipped
 */

import { $state, onMount, onCleanup, useRef } from "@elmoorx/runtime";

/**
 * useFocusTrap — trap focus within an element (for modals, dialogs).
 *
 *   const trap = useFocusTrap();
 *   <div ref={trap.ref} onKeyDown={trap.onKeyDown}>...</div>
 *   // or programmatically:
 *   trap.activate();
 *   trap.deactivate();
 */
export function useFocusTrap() {
  const ref = useRef<HTMLElement>();
  let previouslyFocused: HTMLElement | null = null;

  const activate = () => {
    if (!ref.current) return;
    previouslyFocused = document.activeElement as HTMLElement;
    const focusable = getFocusableElements(ref.current);
    if (focusable.length > 0) focusable[0].focus();
  };

  const deactivate = () => {
    previouslyFocused?.focus();
    previouslyFocused = null;
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Tab" || !ref.current) return;
    const focusable = getFocusableElements(ref.current);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  onMount(() => {
    activate();
    onCleanup(deactivate);
  });

  return { ref, onKeyDown, activate, deactivate };
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
  ].join(", ");
  return Array.from(container.querySelectorAll<HTMLElement>(selector))
    .filter((el) => el.offsetParent !== null); // visible
}

/**
 * useFocusReturn — return focus to a previous element on unmount.
 */
export function useFocusReturn(): void {
  let previouslyFocused: HTMLElement | null = null;
  onMount(() => {
    previouslyFocused = document.activeElement as HTMLElement;
    onCleanup(() => {
      previouslyFocused?.focus();
    });
  });
}

/**
 * useLiveRegion — announce changes to screen readers.
 *
 *   const announce = useLiveRegion();
 *   announce('Item added to cart');  // screen reader reads this
 */
export function useLiveRegion(opts: { polite?: boolean } = {}): (msg: string) => void {
  const region = document.createElement("div");
  region.setAttribute("aria-live", opts.polite !== false ? "polite" : "assertive");
  region.setAttribute("aria-atomic", "true");
  region.style.cssText = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;";

  onMount(() => {
    document.body.appendChild(region);
    onCleanup(() => document.body.removeChild(region));
  });

  return (msg: string) => {
    region.textContent = msg;
  };
}

/**
 * usePrefersReducedMotion — react to user's motion preference.
 *
 *   const reduced = usePrefersReducedMotion();
 *   <Transition duration={reduced() ? 0 : 300}>...</Transition>
 */
export function usePrefersReducedMotion() {
  const prefers = $state(false);

  onMount(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefers.set(mq.matches);
    const handler = (e: MediaQueryListEvent) => prefers.set(e.matches);
    mq.addEventListener("change", handler);
    onCleanup(() => mq.removeEventListener("change", handler));
  });

  return prefers;
}

/**
 * usePrefersDarkScheme — react to system color scheme.
 */
export function usePrefersDarkScheme() {
  const prefers = $state(false);

  onMount(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    prefers.set(mq.matches);
    const handler = (e: MediaQueryListEvent) => prefers.set(e.matches);
    mq.addEventListener("change", handler);
    onCleanup(() => mq.removeEventListener("change", handler));
  });

  return prefers;
}

/**
 * useKeyboard — keyboard shortcut handler.
 *
 *   useKeyboard({
 *     'cmd+k': () => openSearch(),
 *     'esc': () => closeModal(),
 *     'arrowdown': (e) => navigateDown(),
 *   });
 */
export function useKeyboard(
  handlers: Record<string, (e: KeyboardEvent) => void>,
  opts: { global?: boolean; preventDefault?: boolean } = {}
): void {
  onMount(() => {
    const handler = (e: KeyboardEvent) => {
      // Build key combo
      const parts: string[] = [];
      if (e.metaKey) parts.push("cmd");
      if (e.ctrlKey) parts.push("ctrl");
      if (e.shiftKey) parts.push("shift");
      if (e.altKey) parts.push("alt");
      const key = e.key.toLowerCase();
      if (!["meta", "control", "shift", "alt"].includes(key)) {
        parts.push(key);
      }
      const combo = parts.join("+");

      if (handlers[combo]) {
        if (opts.preventDefault !== false) e.preventDefault();
        handlers[combo](e);
      } else if (handlers[key]) {
        if (opts.preventDefault !== false) e.preventDefault();
        handlers[key](e);
      }
    };

    const target = opts.global ? window : window;
    target.addEventListener("keydown", handler);
    onCleanup(() => target.removeEventListener("keydown", handler));
  });
}

/**
 * useOutsideClick — fire callback when clicking outside an element.
 *
 *   const ref = useRef();
 *   useOutsideClick(ref, () => closeMenu());
 */
export function useOutsideClick(
  ref: { current: HTMLElement | null },
  handler: (e: MouseEvent) => void
): void {
  onMount(() => {
    const listener = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        handler(e);
      }
    };
    // Use mousedown so we catch the event before the element is hidden
    document.addEventListener("mousedown", listener);
    onCleanup(() => document.removeEventListener("mousedown", listener));
  });
}

/**
 * useId — generate a unique ID for ARIA wiring.
 *
 *   const id = useId();
 *   <input id={id} />
 *   <label for={id}>Name</label>
 */
let idCounter = 0;
export function useId(prefix = "elmoorx"): string {
  return `${prefix}-${++idCounter}`;
}

/**
 * ARIA attribute helpers.
 */
export const aria = {
  // Build ARIA props for a button that controls another element
  controls: (id: string) => ({ "aria-controls": id }),
  // Build ARIA props for a labeled element
  labeledBy: (id: string) => ({ "aria-labelledby": id }),
  // Build ARIA props for a described element
  describedBy: (id: string) => ({ "aria-describedby": id }),
  // Build ARIA props for an expanded element
  expanded: (is: boolean) => ({ "aria-expanded": String(is) }),
  // Build ARIA props for a hidden element
  hidden: (is: boolean) => ({ "aria-hidden": String(is) }),
  // Build ARIA props for a disabled element
  disabled: (is: boolean) => ({ "aria-disabled": String(is) }),
  // Build ARIA props for a selected element
  selected: (is: boolean) => ({ "aria-selected": String(is) }),
  // Build ARIA props for a busy element
  busy: (is: boolean) => ({ "aria-busy": String(is) }),
  // Build role
  role: (r: string) => ({ role: r }),
};

/**
 * Skip link — keyboard accessibility helper.
 *   <SkipLink target="#main">Skip to main content</SkipLink>
 */
export function SkipLink(props: { target: string; children: string }) {
  return {
    tag: "a",
    props: {
      href: props.target,
      class: "elmoorx-skip-link",
      style: "position:absolute;left:-9999px;top:0;z-index:9999;padding:8px 16px;background:#000;color:#fff;",
      onFocus: "this.style.left='0'",
      onBlur: "this.style.left='-9999px'",
    },
    children: [props.children],
  };
}
