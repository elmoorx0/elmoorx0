/**
 * Elmoorx Runtime — Context API
 * ============================================
 * Dependency injection for component trees.
 * Avoids prop drilling without the re-render storms of React Context.
 *
 *   // Provider
 *   const ThemeCtx = createContext('dark');
 *   provide(ThemeCtx, 'light');
 *
 *   // Consumer (any descendant)
 *   const theme = inject(ThemeCtx);  // → 'light'
 *
 * Bundle impact: ~180 bytes gzipped
 */

export interface Context<T> {
  __elmoorx_context: true;
  default: T;
  id: string;
}

const contextStack: Map<Context<unknown>, unknown>[] = [new Map()];

/**
 * Create a typed context with a default value.
 */
export function createContext<T>(defaultValue: T, id?: string): Context<T> {
  return {
    __elmoorx_context: true,
    default: defaultValue,
    id: id || `ctx_${Math.random().toString(36).slice(2, 9)}`,
  };
}

/**
 * Provide a value to all descendant components.
 * Must be called synchronously within a component setup.
 */
export function provide<T>(context: Context<T>, value: T): void {
  const top = contextStack[contextStack.length - 1];
  top.set(context, value);
}

/**
 * Inject the nearest provided value, or the default if none exists.
 */
export function inject<T>(context: Context<T>): T {
  for (let i = contextStack.length - 1; i >= 0; i--) {
    const layer = contextStack[i];
    if (layer.has(context)) {
      return layer.get(context) as T;
    }
  }
  return context.default;
}

/**
 * Internal: push a new context scope. Called by the renderer when
 * entering a component that called provide().
 */
export function pushContextScope(): Map<Context<unknown>, unknown> {
  const layer = new Map();
  contextStack.push(layer);
  return layer;
}

/**
 * Internal: pop a context scope. Called when leaving a component.
 */
export function popContextScope(): void {
  contextStack.pop();
}

/**
 * Higher-order helper: wraps a component so it can use provide/inject.
 * The renderer automatically wraps every component, but you can use
 * this explicitly for testing.
 */
export function withContext<T extends (...args: unknown[]) => unknown>(fn: T): T {
  const wrapped = ((...args: unknown[]) => {
    pushContextScope();
    try {
      return fn(...args);
    } finally {
      popContextScope();
    }
  }) as T;
  return wrapped;
}
