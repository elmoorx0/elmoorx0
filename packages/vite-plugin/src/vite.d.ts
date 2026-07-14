/**
 * Minimal type declarations for Vite plugin compatibility.
 * Avoids requiring `vite` as a hard dependency for type-checking.
 */
declare module "vite" {
  export interface Plugin {
    name: string;
    enforce?: "pre" | "post";
    apply?: "build" | "serve";
    config?: (config: Record<string, unknown>, env: { command: string; mode: string }) => Record<string, unknown> | void;
    configResolved?: (config: Record<string, unknown>) => void;
    configureServer?: (server: unknown) => void | (() => void);
    transformIndexHtml?: (html: string, ctx: unknown) => string | void;
    transform?: (code: string, id: string) => { code: string; map?: unknown } | null | void;
    resolveId?: (source: string, importer?: string) => string | null | void;
    load?: (id: string) => string | null | void;
    handleHotUpdate?: (ctx: unknown) => void | unknown[];
  }
  export type PluginOption = Plugin | Plugin[] | false | null | undefined;
  export const defineConfig: (config: unknown) => unknown;
}
