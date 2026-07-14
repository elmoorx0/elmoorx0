/**
 * @elmoorx/plugin-system — Extensible Plugin Architecture
 * ============================================
 * Build plugins that extend Elmoorx's capabilities.
 *
 *   // my-plugin.ts
 *   export const myPlugin: ElmoorxPlugin = {
 *     name: "my-plugin",
 *     version: "1.0.0",
 *     install(app) {
 *       app.component("MyWidget", MyWidgetComponent);
 *       app.directive("focus", FocusDirective);
 *       app.hook("beforeRender", beforeRenderHook);
 *     },
 *   };
 *
 *   // app.ts
 *   import { myPlugin } from "./my-plugin";
 *   app.use(myPlugin);
 */

import { $state, type ElmoorxNode } from "@elmoorx/runtime";

// ============ PLUGIN INTERFACE ============

export interface ElmoorxApp {
  // Register a component globally
  component(name: string, component: (props: unknown) => ElmoorxNode): void;
  // Register a directive
  directive(name: string, directive: Directive): void;
  // Register a hook
  hook(name: HookName, handler: HookHandler): void;
  // Provide a service
  provide(name: string, service: unknown): void;
  // Inject a service
  inject<T = unknown>(name: string): T | null;
  // Access app config
  config: Record<string, unknown>;
}

export interface ElmoorxPlugin {
  name: string;
  version: string;
  install: (app: ElmoorxApp) => void | Promise<void>;
  // Optional: cleanup on uninstall
  uninstall?: (app: ElmoorxApp) => void;
  // Optional: dependencies
  dependencies?: string[];
  // Optional: author info
  author?: string;
  description?: string;
}

export interface Directive {
  mounted?: (el: HTMLElement, binding: DirectiveBinding) => void;
  updated?: (el: HTMLElement, binding: DirectiveBinding) => void;
  unmounted?: (el: HTMLElement) => void;
}

export interface DirectiveBinding {
  value: unknown;
  oldValue?: unknown;
  arg?: string;
  modifiers: Record<string, boolean>;
}

export type HookName =
  | "beforeRender"
  | "afterRender"
  | "beforeMount"
  | "afterMount"
  | "beforeUpdate"
  | "afterUpdate"
  | "beforeUnmount"
  | "errorCaptured"
  | "routeChange";

export type HookHandler = (payload?: unknown) => void | Promise<void>;

// ============ PLUGIN MANAGER ============

class PluginManager {
  private plugins = new Map<string, ElmoorxPlugin>();
  private components = new Map<string, (props: unknown) => ElmoorxNode>();
  private directives = new Map<string, Directive>();
  private hooks = new Map<HookName, Set<HookHandler>>();
  private services = new Map<string, unknown>();
  private config: Record<string, unknown> = {};
  private installed = $state<string[]>([]);

  use(plugin: ElmoorxPlugin): void {
    if (this.plugins.has(plugin.name)) {
      console.warn(`[plugin] ${plugin.name} is already installed`);
      return;
    }

    // Check dependencies
    if (plugin.dependencies) {
      for (const dep of plugin.dependencies) {
        if (!this.plugins.has(dep)) {
          console.error(`[plugin] ${plugin.name} requires ${dep} to be installed first`);
          return;
        }
      }
    }

    // Create app interface
    const app: ElmoorxApp = {
      component: (name, comp) => {
        this.components.set(name, comp);
        console.warn(`[plugin:${plugin.name}] registered component: ${name}`);
      },
      directive: (name, dir) => {
        this.directives.set(name, dir);
        console.warn(`[plugin:${plugin.name}] registered directive: ${name}`);
      },
      hook: (name, handler) => {
        if (!this.hooks.has(name)) this.hooks.set(name, new Set());
        (this.hooks.get(name) as NonNullable<ReturnType<typeof this.hooks.get>>).add(handler);
        console.warn(`[plugin:${plugin.name}] registered hook: ${name}`);
      },
      provide: (name, service) => {
        this.services.set(name, service);
        console.warn(`[plugin:${plugin.name}] provided service: ${name}`);
      },
      inject: <T>(name: string): T | null => {
        return (this.services.get(name) as T) || null;
      },
      config: this.config,
    };

    plugin.install(app);
    this.plugins.set(plugin.name, plugin);
    this.installed.set([...this.installed(), plugin.name]);
    console.warn(`[plugin] installed: ${plugin.name}@${plugin.version}`);
  }

  uninstall(name: string): void {
    const plugin = this.plugins.get(name);
    if (!plugin) return;

    if (plugin.uninstall) {
      const app: ElmoorxApp = {
        component: () => {},
        directive: () => {},
        hook: () => {},
        provide: () => {},
        inject: () => null,
        config: this.config,
      };
      plugin.uninstall(app);
    }

    this.plugins.delete(name);
    this.installed.set(this.installed().filter(n => n !== name));
    console.warn(`[plugin] uninstalled: ${name}`);
  }

  getComponent(name: string): ((props: unknown) => ElmoorxNode) | null {
    return this.components.get(name) || null;
  }

  getDirective(name: string): Directive | null {
    return this.directives.get(name) || null;
  }

  async runHook(name: HookName, payload?: unknown): Promise<void> {
    const handlers = this.hooks.get(name);
    if (!handlers) return;
    for (const handler of handlers) {
      await handler(payload);
    }
  }

  getInstalled(): string[] {
    return this.installed();
  }

  getPlugins(): ElmoorxPlugin[] {
    return [...this.plugins.values()];
  }
}

export const plugins = new PluginManager();

// ============ BUILT-IN PLUGINS ============

// Analytics plugin
export const analyticsPlugin: ElmoorxPlugin = {
  name: "analytics",
  version: "1.0.0",
  author: "Elmoorx Team",
  description: "Built-in analytics tracking",
  install(app) {
    app.hook("afterMount", () => {
      console.warn("[analytics] page mounted");
    });
    app.hook("routeChange", (to: unknown) => {
      console.warn("[analytics] route change:", to);
    });
    app.provide("analytics", {
      track: (name: string, props?: Record<string, unknown>) => {
        console.warn("[analytics] track:", name, props);
      },
    });
  },
};

// Error tracking plugin
export const errorTrackingPlugin: ElmoorxPlugin = {
  name: "error-tracking",
  version: "1.0.0",
  author: "Elmoorx Team",
  description: "Automatic error capturing and reporting",
  install(app) {
    app.hook("errorCaptured", (err: unknown) => {
      console.error("[error-tracking] captured:", err);
    });

    if (typeof window !== "undefined") {
      window.addEventListener("error", (e) => {
        console.error("[error-tracking] uncaught:", e.error);
      });
      window.addEventListener("unhandledrejection", (e) => {
        console.error("[error-tracking] unhandled promise:", e.reason);
      });
    }

    app.provide("errorTracker", {
      capture: (err: Error, context?: Record<string, unknown>) => {
        console.error("[error-tracking] capture:", err, context);
      },
    });
  },
};

// SEO plugin
export const seoPlugin: ElmoorxPlugin = {
  name: "seo",
  version: "1.0.0",
  author: "Elmoorx Team",
  description: "Automatic SEO optimization",
  install(app) {
    app.hook("beforeRender", () => {
      console.warn("[seo] optimizing meta tags");
    });

    app.provide("seo", {
      setTitle: (title: string) => {
        if (typeof document !== "undefined") document.title = title;
      },
      setMeta: (name: string, content: string) => {
        if (typeof document === "undefined") return;
        let el = document.querySelector(`meta[name="${name}"]`);
        if (!el) {
          el = document.createElement("meta");
          el.setAttribute("name", name);
          document.head.appendChild(el);
        }
        el.setAttribute("content", content);
      },
    });
  },
};

// Performance monitoring plugin
export const perfPlugin: ElmoorxPlugin = {
  name: "performance",
  version: "1.0.0",
  author: "Elmoorx Team",
  description: "Real-time performance monitoring",
  install(app) {
    app.hook("afterRender", () => {
      if (typeof performance !== "undefined") {
        const timing = performance.now();
        app.provide("renderTime", timing);
      }
    });

    app.provide("perf", {
      mark: (name: string) => {
        if (typeof performance !== "undefined") performance.mark(name);
      },
      measure: (name: string, start: string, end: string) => {
        if (typeof performance !== "undefined") {
          performance.measure(name, start, end);
          const entry = performance.getEntriesByName(name)[0];
          return entry?.duration || 0;
        }
        return 0;
      },
    });
  },
};
