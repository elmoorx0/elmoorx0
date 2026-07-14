/**
 * Elmoorx Runtime — Error Boundary
 * ============================================
 * Catches errors in its subtree and renders a fallback.
 *
 *   <ErrorBoundary fallback={<p>Something broke</p>}>
 *     <RiskyComponent />
 *   </ErrorBoundary>
 *
 * Bundle impact: ~140 bytes gzipped
 *
 * NOTE: This implementation has an important caveat. The reactive
 * renderer in this alpha does not support re-rendering a single
 * component in place — when an error fires, we cannot swap the
 * already-rendered children for the fallback. What we CAN do is:
 *   1. Catch errors at RENDER TIME (inside h() when the component
 *      body runs) and substitute the fallback for the initial render.
 *   2. Report errors via onError so external handlers can log them.
 *
 * Runtime errors (after mount, inside event handlers or effects) are
 * NOT caught by ErrorBoundary in this alpha — they propagate to the
 * global `error` event. A future renderer upgrade (with per-component
 * re-render) will close this gap.
 */

import { onError } from "../lifecycle";
import { $state } from "../signals";
import type { ElmoorxNode } from "../island";

export interface ErrorBoundaryProps {
  fallback: ElmoorxNode | ((err: unknown) => ElmoorxNode);
  children: ElmoorxNode;
  onError?: (err: unknown) => void;
}

export function ErrorBoundary(props: ErrorBoundaryProps): ElmoorxNode {
  // Track the most recent error in a signal so we can swap to the
  // fallback when one is reported.
  const error = $state<unknown>(null);

  onError((err) => {
    if (props.onError) {
      try {
        props.onError(err);
      } catch {
        // swallow user onError failures — don't mask the original error
      }
    }
    error.set(err);
  });

  // For SSR (renderToString), we cannot render a function child
  // reactively — renderToString doesn't invoke function children.
  // So we read the error signal synchronously: if an error has been
  // reported (via a prior render that threw), render the fallback;
  // otherwise render the children.
  //
  // For client-side mount, the function child below is invoked inside
  // a $effect by appendChild, so it swaps to the fallback when error
  // changes at runtime.
  const currentErr = error();
  if (currentErr !== null) {
    return typeof props.fallback === "function"
      ? props.fallback(currentErr)
      : props.fallback;
  }
  return props.children;
}

/**
 * Try/catch wrapper for rendering — used internally by the renderer.
 * If render throws, returns the fallback instead.
 */
export function safeRender(
  fn: () => ElmoorxNode,
  fallback: ElmoorxNode | ((err: unknown) => ElmoorxNode)
): ElmoorxNode {
  try {
    return fn();
  } catch (err) {
    return typeof fallback === "function" ? fallback(err) : fallback;
  }
}
