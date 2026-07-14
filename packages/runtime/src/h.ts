/**
 * Elmoorx Runtime — h() createElement helper
 * ============================================
 * Tiny JSX-compatible factory. The compiler converts JSX to h() calls.
 *
 *   <div className="x" onClick={fn}>{children}</div>
 * becomes:
 *   h('div', { className: 'x', onClick: fn }, children)
 */

import type { ElmoorxNode, ElmoorxElement } from "./island";
import { pushLifecycle, popLifecycle, runMount, handleError } from "./lifecycle";
import { pushContextScope, popContextScope } from "./context";

/**
 * Sentinel tag value for Fragments. JSX `<></>` compiles to
 * `h(Fragment, null, ...children)`. The renderer special-cases this
 * tag: instead of emitting `<fragment>...</fragment>` (invalid HTML),
 * it emits just the children concatenated.
 */
export const Fragment = "fragment";

// ComponentTag is intentionally permissive — function components accept
// any props object. Tighter typing would break callers like
// `(props: { stats: Stats }) => ElmoorxNode` that narrow the props.
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
type ComponentTag = string | Function;

export function h(
  tag: ComponentTag,
  props: Record<string, unknown> | null,
  ...children: ElmoorxNode[]
): ElmoorxNode {
  if (typeof tag === "function") {
    // Function component — call it with props.
    // Push a fresh lifecycle/context scope so any onMount/onCleanup/
    // provide/inject calls inside the component are bucketed correctly.
    //
    // JSX: <Comp {...props}>{child1}{child2}</Comp>
    //   → h(Comp, props, child1, child2)
    //   → rest args `children` = [child1, child2]
    //   → props.children is set from rest args
    //
    // Direct call: h(Comp, { children: singleChild })
    //   → rest args `children` = []
    //   → must NOT overwrite props.children with []
    const flatRest = flattenChildren(children);
    const merged = (flatRest.length > 0)
      ? { ...(props || {}), children: flatRest }
      : { ...(props || {}) };
    pushLifecycle();
    pushContextScope();
    try {
      const result = (tag as (p: Record<string, unknown>) => ElmoorxNode)(merged);
      // After the component body returns, run any onMount callbacks
      // it registered. (In a real streaming SSR renderer we'd defer
      // these to after DOM mount; in the current sync renderer we run
      // them eagerly so they at least fire.)
      runMount();
      return result;
    } catch (err) {
      // If the component threw, give the lifecycle a chance to handle it
      // (via onError). If no handler catches, re-throw.
      try {
        handleError(err);
        // Handler recovered — return null so the slot stays empty.
        return null;
      } catch (reThrow) {
        throw reThrow;
      }
    } finally {
      // Pop the scope but DON'T run cleanup yet — cleanup runs when
      // the component is unmounted (currently approximated by the
      // parent effect's cleanup, which is imperfect but better than
      // the prior behavior of dropping cleanups entirely).
      popContextScope();
      popLifecycle();
    }
  }
  const flatChildren = flattenChildren(children);
  const el: ElmoorxElement = {
    tag: tag as string,
    props: props || {},
    children: flatChildren,
  };
  return el;
}

/**
 * Render a Fragment's children directly. Used by the renderer when
 * it encounters `tag === Fragment`.
 *
 *   renderFragmentChildren(children) → string
 *
 * The actual HTML/DOM emission is handled by the renderer (island.ts),
 * which special-cases the Fragment tag.
 */
export function renderFragment(
  props: { children: ElmoorxNode[] }
): ElmoorxNode {
  return props.children;
}

/**
 * Recursively flatten nested arrays of children into a single array.
 * Filters out null/undefined/true/false (boolean JSX conditionals).
 *
 *   flattenChildren([1, [2, [3, null]], false]) → [1, 2, 3]
 */
function flattenChildren(children: ElmoorxNode[]): ElmoorxNode[] {
  const out: ElmoorxNode[] = [];
  const walk = (c: ElmoorxNode) => {
    if (c === null || c === undefined || c === false || c === true) return;
    if (Array.isArray(c)) {
      for (const item of c) walk(item);
      return;
    }
    out.push(c);
  };
  for (const c of children) walk(c);
  return out;
}
