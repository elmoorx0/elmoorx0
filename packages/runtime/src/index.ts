/**
 * Elmoorx Runtime — Public API v2
 * Full feature set with all improvements.
 *
 * NOTE: This framework was renamed from "Wafra" to "Elmoorx" in
 * v3.0.0-alpha.2 to unify the name with the npm scope `@elmoorx/*`.
 * Backward-compat type aliases (`WafraNode`, `WafraElement`) are
 * exported below — they will be removed in v3.0.0 stable. See
 * MIGRATION.md for the full rename guide.
 */

// Signals
export { $state, $computed, $effect, $batch } from "./signals";
export type { Computed, EffectFn, Signal } from "./signals";

// Store
export { $store } from "./store";
export type { Store } from "./store";

// Islands + rendering
export {
  island,
  renderIsland,
  hydrateIslands,
  renderToString,
  mount,
} from "./island";
export type { IslandComponent, ElmoorxNode, ElmoorxElement } from "./island";
// Backward-compat aliases (deprecated — will be removed in v3.0.0 stable)
export type { ElmoorxNode as WafraNode, ElmoorxElement as WafraElement } from "./island";

// Security
export {
  $html,
  sanitize,
  SECURITY_HEADERS,
  generateCsrfToken,
} from "./security";

// h() JSX factory
export { h, Fragment, renderFragment } from "./h";

// Context API
export { createContext, provide, inject, withContext } from "./context";
export type { Context } from "./context";

// Lifecycle hooks
export { onMount, onCleanup, onError, withErrorBoundary } from "./lifecycle";

// Error boundaries
export { ErrorBoundary, safeRender } from "./error";

// Suspense / async
export { Suspense, async_ as async, renderToStream } from "./suspense";

// Lazy islands
export { lazy, prefetch, lazyAll } from "./lazy";
export type { LazyComponent, LazyOptions } from "./lazy";

// Refs + ForwardRef
export { useRef, forwardRef, useImperativeHandle, useRefList } from "./refs";
export type { Ref } from "./refs";

// Portal
export { Portal, Modal } from "./portal";
export type { PortalProps, ModalProps } from "./portal";

// Transitions
export { Transition, TransitionGroup } from "./transition";
export type { TransitionProps, TransitionGroupProps } from "./transition";

// Keep-alive
export {
  KeepAlive,
  clearKeepAliveCache,
  evictFromKeepAlive,
  keepAliveCacheSize,
} from "./keepalive";

// Memoization
export {
  memo,
  useMemo,
  useCallback,
  shallowEqual,
  shallowEqualArray,
  deepEqual,
} from "./memo";

// Async data hooks
export { useFetch, useSWR, useMutation } from "./async-hooks";
export type { FetchResult, SWRResult, SWRConfig, MutationResult } from "./async-hooks";
