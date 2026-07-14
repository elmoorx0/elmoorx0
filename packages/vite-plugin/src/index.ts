/**
 * @elmoorx/vite-plugin — Vite integration for Elmoorx Framework
 * ============================================
 * Drop-in Vite plugin that handles:
 *   - JSX transformation (using Elmoorx's h() factory)
 *   - HMR (hot module replacement)
 *   - SSR (server-side rendering)
 *   - Dev server with auto security headers
 *   - Production build optimization
 *
 *   // vite.config.ts
 *   import { defineConfig } from 'vite';
 *   import { elmoorx } from '@elmoorx/vite-plugin';
 *
 *   export default defineConfig({
 *     plugins: [elmoorx()],
 *   });
 */

import type { Plugin, PluginOption } from "vite";

export interface ElmoorxViteOptions {
  // Project root (defaults to cwd)
  root?: string;
  // Auto-apply security headers in dev
  security?: boolean;
  // Enable HMR (default: true in dev)
  hmr?: boolean;
  // Source directory (default: 'src')
  srcDir?: string;
  // Islands directory (default: 'src/islands')
  islandsDir?: string;
  // SSR enabled (default: true)
  ssr?: boolean;
}

export function elmoorx(opts: ElmoorxViteOptions = {}): Plugin {
  const security = opts.security !== false;
  const _ssr = opts.ssr !== false;
  const _srcDir = opts.srcDir || "src";

  return {
    name: "elmoorx",

    config(config: Record<string, unknown>, { command }: { command: string }) {
      // Inject Elmoorx JSX settings
      config.esbuild = config.esbuild || {};
      const esbuild = config.esbuild as Record<string, unknown>;
      esbuild.jsx = "automatic";
      esbuild.jsxImportSource = "@elmoorx/runtime";

      // Define SSR flag
      config.define = {
        ...config.define as Record<string, unknown>,
        "import.meta.env.SSR": command === "build" ? "true" : "false",
      };

      // Optimize deps
      config.optimizeDeps = config.optimizeDeps || {};
      const optimizeDeps = config.optimizeDeps as { include?: string[] };
      optimizeDeps.include = [
        ...(optimizeDeps.include || []),
        "@elmoorx/runtime",
      ];
    },

    configResolved(_config: unknown) {
      // Store resolved config for later use
    },

    transformIndexHtml(html: string) {
      // Inject security headers as meta tags (dev only — real headers come from server)
      if (!security) return html;
      const cspMeta = `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';" />`;
      return html.replace("<head>", `<head>\n    ${cspMeta}`);
    },

    transform(code: string, id: string) {
      // Only process .elmoorx.tsx / .tsx files
      if (!/\.(elmoorx\.)?tsx?$/.test(id)) return null;

      // Transform JSX → h() calls
      // In real impl, would use esbuild's JSX transform with custom factory
      // Vite's esbuild already handles this via jsxImportSource setting

      // Inject HMR boundary for components
      if (opts.hmr !== false && id.includes("/islands/")) {
        const hmrCode = `
import.meta.hot.accept(() => {
  console.warn('[elmoorx] HMR: ${id}');
  // Re-hydrate island
  import('@elmoorx/runtime').then(({ hydrateIslands }) => {
    hydrateIslands(globalThis.__ELMOORX_ISLANDS__ || {});
  });
});
`;
        return { code: code + hmrCode, map: null };
      }

      return null;
    },

    configureServer(server: unknown) {
      if (!security) return;

      const serverRecord = server as { middlewares: { use: (handler: (req: unknown, res: { setHeader: (name: string, value: string) => void }, next: () => void) => void) => unknown } };
      // Auto-apply security headers
      serverRecord.middlewares.use((req: unknown, res: { setHeader: (name: string, value: string) => void }, next: () => void) => {
        res.setHeader("Content-Security-Policy",
          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' ws: wss:; frame-ancestors 'none';");
        res.setHeader("X-Frame-Options", "DENY");
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
        res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
        next();
      });
    },

    handleHotUpdate(ctx: unknown): unknown[] | void {
      const ctxRecord = ctx as { file: string; server: { ws: { send: (msg: unknown) => void } } };
      // Custom HMR for .elmoorx.tsx files
      if (ctxRecord.file.endsWith(".elmoorx.tsx")) {
        console.warn(`[elmoorx] HMR update: ${ctxRecord.file}`);
        // Send full-reload signal — real impl would do surgical updates
        ctxRecord.server.ws.send({ type: "full-reload" });
        return [];
      }
    },
  };
}

/**
 * Elmoorx preset for Vite — combines elmoorx() with sensible defaults.
 */
export function elmoorxPreset(opts: ElmoorxViteOptions = {}): PluginOption[] {
  return [
    elmoorx(opts),
    // Could add more plugins here (e.g., image optimization, SSG)
  ];
}

export default elmoorx;
