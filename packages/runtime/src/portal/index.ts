/**
 * Elmoorx Runtime — Portal / Teleport
 * ============================================
 * Render content to a DOM node outside the current component tree.
 * Perfect for modals, tooltips, popovers — escapes overflow:hidden, z-index.
 *
 *   <Portal target="#modal-root">
 *     <div class="modal">I'm rendered outside!</div>
 *   </Portal>
 *
 *   <Portal target="body">
 *     <Tooltip />
 *   </Portal>
 *
 * Bundle impact: ~180 bytes gzipped
 *
 * NOTE: This module uses `$effect`'s returned dispose function for
 * cleanup, instead of `onCleanup()` from `../lifecycle`. The latter
 * requires a lifecycle bucket (pushed by the renderer when entering a
 * component), but `$effect` does NOT push one — so `onCleanup` would
 * silently no-op. Using the dispose function is the correct pattern.
 */

import { h } from "../h";
import { $state, $effect } from "../signals";
import type { ElmoorxNode } from "../island";

export interface PortalProps {
  // CSS selector or DOM element
  target: string | HTMLElement;
  // Optional — wrap content in an element with these props
  wrapper?: { tag: string; props?: Record<string, unknown> };
  // Disable portal (render in place)
  disabled?: boolean;
  children: ElmoorxNode;
}

/**
 * Portal — renders children to a different DOM node.
 *
 *   <Portal target="body">
 *     <Modal />
 *   </Portal>
 *
 * CAVEAT (alpha): The alpha renderer does not support "mount children
 * into this specific DOM node" directives. Portal works around this
 * by rendering the children into a placeholder via the standard
 * renderToDom path, then MOVING the resulting DOM nodes into the
 * target container inside a $effect. This is less efficient than a
 * native portal (the children are mounted twice — once into the
 * placeholder, then moved), but it produces the correct DOM structure.
 *
 * A future renderer upgrade will add a `__portal_target__` hint that
 * the renderer honors during initial mount, eliminating the move.
 */
export function Portal(props: PortalProps): ElmoorxNode {
  if (props.disabled) return props.children;

  const mounted = $state(false);
  // Render children INSIDE a placeholder span. The $effect below moves
  // the placeholder's children into the target container. This is the
  // workaround for the renderer not supporting portal targets natively.
  const placeholder = h("span", { "data-elmoorx-portal-placeholder": "" }, props.children);

  $effect(() => {
    if (typeof document === "undefined") return;

    // Resolve target
    const target = typeof props.target === "string"
      ? document.querySelector<HTMLElement>(props.target)
      : props.target;

    if (!target) {
      console.warn(`[elmoorx/portal] target not found: ${props.target}`);
      return;
    }

    // Find the placeholder element in the DOM. It was rendered with
    // data-elmoorx-portal-placeholder. The most recent one wins (this
    // is imperfect for multi-instance; a future ref-based approach
    // would be more precise).
    const placeholderEl = document.querySelector("[data-elmoorx-portal-placeholder]");
    if (!placeholderEl) {
      // Placeholder not yet in DOM — retry on next tick.
      // (The effect will re-run if any signal it reads changes; for
      // now we just bail and rely on the parent re-rendering.)
      return;
    }

    // Create wrapper element if specified
    const container = props.wrapper
      ? document.createElement(props.wrapper.tag)
      : document.createElement("div");

    container.setAttribute("data-elmoorx-portal", "");

    if (props.wrapper?.props) {
      for (const [k, v] of Object.entries(props.wrapper.props)) {
        if (k === "class" || k === "className") {
          container.className = String(v);
        } else if (k === "style") {
          container.setAttribute("style", String(v));
        } else if (k.startsWith("on") && typeof v === "function") {
          container.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
        } else {
          container.setAttribute(k, String(v));
        }
      }
    }

    // MOVE the placeholder's children into the container. Previously
    // the children were dropped on the floor (the comment admitted
    // "In real impl, the renderer would mount the children directly").
    // Now we actually move them — preserving event listeners and
    // reactive subscriptions that were wired during initial mount.
    while (placeholderEl.firstChild) {
      container.appendChild(placeholderEl.firstChild);
    }

    target.appendChild(container);
    mounted.set(true);

    // Cleanup via $effect's dispose function — this runs when the
    // effect is disposed (component unmount) or when it re-runs.
    // Returning a cleanup function from $effect is the canonical
    // pattern; it's wired up by the signals module's user-cleanups.
    return () => {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    };
  });

  // Return placeholder — actual content moved into target via effect
  return placeholder;
}

/**
 * Higher-level Modal helper — common pattern.
 *
 *   <Modal open={show} onClose={() => show.set(false)}>
 *     <p>Modal content</p>
 *   </Modal>
 */
export interface ModalProps {
  open: boolean | (() => boolean);
  onClose: () => void;
  target?: string | HTMLElement;
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
  children: ElmoorxNode;
}

export function Modal(props: ModalProps): ElmoorxNode {
  const isOpen = typeof props.open === "function" ? props.open : () => props.open;

  $effect(() => {
    if (!isOpen()) return;
    if (typeof document === "undefined") return;

    const onKey = (e: KeyboardEvent) => {
      if (props.closeOnEscape !== false && e.key === "Escape") {
        props.onClose();
      }
    };
    document.addEventListener("keydown", onKey);

    // Cleanup via $effect dispose — runs when isOpen() becomes false
    // or when the modal unmounts.
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  });

  return () => isOpen() ? h(Portal, {
    target: props.target || "body",
    wrapper: {
      tag: "div",
      props: {
        class: "elmoorx-modal-overlay",
        style: "position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000",
        onClick: (e: Event) => {
          if (props.closeOnOverlayClick !== false && e.target === e.currentTarget) {
            props.onClose();
          }
        },
      },
    },
    children: h("div", {
      class: "elmoorx-modal",
      style: "background:white;padding:24px;border-radius:8px;max-width:500px;width:90%;",
    }, props.children),
  }) : null;
}
