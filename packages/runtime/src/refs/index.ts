/**
 * Elmoorx Runtime — Refs + ForwardRef
 * ============================================
 * Direct DOM element references without breaking encapsulation.
 *
 *   // Local ref
 *   const inputRef = useRef<HTMLInputElement>();
 *   <input ref={inputRef} />
 *   inputRef.current.focus();  // direct DOM access
 *
 *   // Forward ref (for library components)
 *   const FancyInput = forwardRef<HTMLInputElement, Props>(
 *     (props, ref) => h('input', { ref, ...props })
 *   );
 *
 * Bundle impact: ~140 bytes gzipped
 *
 * CAVEAT (alpha): The alpha renderer does not yet call `ref.__set`
 * on mount/unmount. As a result:
 *   - `useRef().current` stays null after mount (use onMount with a
 *     querySelector fallback instead, or wait for the renderer upgrade).
 *   - `useRefList.all` always returns [] (the renderer never populates it).
 *   - `useImperativeHandle` factory runs once but the parent's ref
 *     never receives the handle (because __set isn't called by the
 *     renderer; it IS called here directly, but the parent's ref must
 *     be the same Ref object passed in).
 *
 * The Ref interface is designed for the future renderer; the methods
 * below are correct in isolation but depend on renderer wiring that
 * doesn't exist yet. Use the `ref` callback pattern in island.ts
 * (which DOES support `ref` as a function prop) for direct DOM access
 * in the alpha.
 */

import { $state } from "../signals";
import { onMount } from "../lifecycle";
import type { ElmoorxNode } from "../island";

export interface Ref<T = unknown> {
  current: T | null;
  // Internal — set by the renderer when the element mounts.
  // Also called by useImperativeHandle to set the handle on the parent's ref.
  __set: (v: T | null) => void;
}

/**
 * Create a ref. The .current property is reactive — reading it
 * inside an effect tracks the element's lifecycle.
 *
 *   const btnRef = useRef<HTMLButtonElement>();
 *   onMount(() => btnRef.current?.focus());
 */
export function useRef<T = unknown>(): Ref<T> {
  const internal = $state<T | null>(null);
  return {
    get current() { return internal(); },
    set current(v: T | null) { internal.set(v); },
    __set: (v: T | null) => internal.set(v),
  } as Ref<T>;
}

/**
 * Forward a ref through a component. Lets parent components
 * access child DOM nodes.
 *
 *   const FancyInput = forwardRef<HTMLInputElement>((props, ref) =>
 *     h('input', { ref, class: 'fancy', ...props })
 *   );
 *
 *   // Parent
 *   const inputRef = useRef<HTMLInputElement>();
 *   <FancyInput ref={inputRef} />
 */
export function forwardRef<T, P = Record<string, unknown>>(
  render: (props: P, ref: Ref<T>) => ElmoorxNode
): (props: P & { ref?: Ref<T> }) => ElmoorxNode {
  const Forwarded = (props: P & { ref?: Ref<T> }): ElmoorxNode => {
// @ts-expect-error — TS2339: Property 'ref' does not exist on type 'unknown'.
    const { ref, ...rest } = props as unknown;
    // Use useRef() as fallback so the ref has a real __set method
    // (previously fell back to a plain object with no __set, which
    // would crash useImperativeHandle with TypeError).
    const targetRef: Ref<T> = ref || useRef<T>();
    return render(rest as P, targetRef);
  };
// @ts-expect-error — TS2571: Object is of type 'unknown'.
  (Forwarded as unknown).__forwarded = true;
  return Forwarded;
}

/**
 * Imperative handle — expose a custom API to the parent instead of the raw DOM node.
 *
 *   const Input = forwardRef((props, ref) => {
 *     const realRef = useRef<HTMLInputElement>();
 *     useImperativeHandle(ref, () => ({
 *       focus: () => realRef.current?.focus(),
 *       clear: () => { if (realRef.current) realRef.current.value = ''; },
 *     }));
 *     return h('input', { ref: realRef });
 *   });
 *
 * The factory is re-invoked when any dep changes (shallow equality).
 * The handle is pushed to the parent's ref via `ref.__set(handle)`.
 */
export function useImperativeHandle<T>(
  ref: Ref<T>,
  factory: () => T,
  deps: unknown[] = []
): void {
  let lastDeps: unknown[] | null = null;
  let lastHandle: T | null = null;

  const update = () => {
    if (lastDeps !== null && shallowEqualArray(lastDeps, deps)) {
      // Deps unchanged — keep existing handle
      return;
    }
    lastDeps = [...deps];
    lastHandle = factory();
    // Defensive: ref may be a plain object without __set (e.g. from
    // an older forwardRef fallback). Use optional chaining.
    ref?.__set?.(lastHandle);
  };

  // Run once on mount. Subsequent updates happen when the caller
  // re-invokes useImperativeHandle with new deps (the caller is
  // expected to call this hook on every render, just like React).
  onMount(() => {
    update();
  });

  // Also run immediately so the handle is set before the parent's
  // first read (in case onMount hasn't fired yet).
  update();
}

function shallowEqualArray(a: unknown[], b: unknown[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!Object.is(a[i], b[i])) return false;
  }
  return true;
}

/**
 * Multi-ref — track a list of elements (for v-for lists).
 *
 *   const itemRefs = useRefList<HTMLLIElement>();
 *   <ul>{items.map((item, i) => h('li', { ref: itemRefs.at(i) }, item.text))}</ul>
 *   itemRefs.all[0]?.focus();
 *
 * CAVEAT: `all` returns the current snapshot of mounted elements.
 * The renderer must call `ref.__set(el)` on mount and `ref.__set(null)`
 * on unmount for the snapshot to be populated. See file-level CAVEAT.
 */
export function useRefList<T = unknown>(): {
  at: (index: number) => Ref<T>;
  all: T[];
} {
  const refs = new Map<number, Ref<T>>();
  const elements = $state<T[]>([]);

  const at = (index: number): Ref<T> => {
    if (!refs.has(index)) {
      const ref: Ref<T> = {
        current: null as T | null,
        __set: (v: T | null) => {
          ref.current = v;
          // Update the elements array reactively. Snapshot the current
          // state, mutate, then set — so subscribers see a fresh array.
          const snap = [...elements()];
          if (v === null) {
            delete snap[index];
          } else {
            snap[index] = v;
          }
          elements.set(snap);
        },
      };
      refs.set(index, ref);
    }
    return (refs.get(index) as NonNullable<ReturnType<typeof refs.get>>);
  };

  return { at, get all() { return elements(); } };
}
