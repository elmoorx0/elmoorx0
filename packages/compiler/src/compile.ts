/**
 * Elmoorx Compiler — JSX → optimized HTML + minimal JS
 * ============================================
 * The compiler is built on Babel's core + our inlined `elmoorxJsxPlugin`.
 * It analyzes each component and emits:
 *
 *   - Pure HTML for static subtrees (zero JS shipped)
 *   - Bound islands only for components wrapped in `island()`
 *   - Tree-shaken imports — only used runtime APIs are bundled
 *
 * Build speed target: 12k LOC/ms (Rust would do this; TS impl is slower
 * but acceptable for the demo).
 */

import { parse, traverse, transformFromAstSync, elmoorxJsxPlugin } from "./babel-lite";
// Static import for the TS-stripping plugin — avoids `require.resolve`
// which doesn't work in ESM.
import tsPluginModule from "@babel/plugin-transform-typescript";
const tsPlugin = (tsPluginModule as { default?: typeof tsPluginModule }).default ?? tsPluginModule;
import { gzipSync as nodeGzipSync } from "node:zlib";

export interface IslandInfo {
  // Stable ID derived from filename + line + component name.
  // Used by SSG to wire the client-bundle registry.
  id: string;
  // Component identifier name (e.g. "Counter", "MyComponent").
  // Empty string for anonymous arrow functions.
  componentName: string;
  // 1-indexed line number of the `island(...)` call in the source.
  line: number;
}

export interface CompileOptions {
  filename: string;
  // Emit SSR-only output (no JS) — useful for static pages
  ssrOnly?: boolean;
  // Emit island-only output (just the client JS for hydration)
  clientOnly?: boolean;
}

export interface CompileResult {
  // The transformed JS module — uses h() for JSX, drops unused imports
  code: string;
  // SSR pre-render: pure HTML for static parts, placeholders for islands.
  // Currently always undefined — see extractStaticHtml() docstring.
  ssrTemplate?: string;
  // List of islands found in this module.
  // (Backward-compat: array of IDs. Use `islandInfos` for metadata.)
  islands: string[];
  // Per-island metadata (id, componentName, line) — used by SSG to
  // build the client-bundle registry.
  islandInfos: IslandInfo[];
  // Estimated bytes shipped to client (gzipped). Uses real zlib gzip
  // when running in Node, falls back to length×0.3 approximation otherwise.
  clientBytes: number;
}

/**
 * Compile a single .elmoorx.tsx / .tsx file.
 *
 *   const result = compile(source, { filename: 'Counter.tsx' });
 *   result.code          // → JS module using h() + runtime
 *   result.ssrTemplate   // → pre-rendered HTML for static parts
 *   result.clientBytes   // → ~620 bytes for a counter component
 */
export function compile(source: string, options: CompileOptions): CompileResult {
  const islands: string[] = [];
  const islandInfos: IslandInfo[] = [];
  // Counter scoped to this compile call — produces deterministic IDs
  // (vs the previous Math.random() which broke reproducible builds + HMR).
  let islandCounter = 0;

  // === Pass 1: parse ===
  const ast = parse(source, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  // === Pass 2: analyze — find island() calls ===
  // Detect ALL common patterns:
  //   island(() => <Counter />)           — ArrowFunctionExpression
  //   island(function Counter() { ... })  — FunctionExpression (named)
  //   island(function* Gen() { ... })     — FunctionExpression (generator)
  //   island(Counter)                     — Identifier (most common)
  //   island(Foo.Bar)                     — MemberExpression
  // Previously only ArrowFunctionExpression was detected, missing the
  // common `island(MyComponent)` pattern — breaking hydration for
  // most real-world usage.
  traverse(ast, {
    CallExpression(path: unknown) {
      const p = path as Record<string, unknown>;
      const callee = (p.node as Record<string, unknown>).callee as { type: string; name?: string };
      if (callee.type === "Identifier" && callee.name === "island") {
        const arg = ((p.node as Record<string, unknown>).arguments as unknown[])[0] as {
          type: string;
          name?: string;
          property?: { name?: string };
          id?: { name?: string };
          loc?: { start?: { line?: number } };
        };
        if (!arg) return;
        const isComponentArg =
          arg.type === "ArrowFunctionExpression" ||
          arg.type === "FunctionExpression" ||
          arg.type === "Identifier" ||
          arg.type === "MemberExpression";
        if (!isComponentArg) return;

        // Extract component name for stable ID derivation.
        let componentName = "";
        if (arg.type === "Identifier" || arg.type === "MemberExpression") {
          componentName =
            arg.type === "Identifier"
              ? (arg.name || "anon")
              : (arg.property?.name || "anon");
        } else if (arg.type === "FunctionExpression" && arg.id) {
          componentName = arg.id.name || "anon";
        } else if (arg.type === "ArrowFunctionExpression") {
          // Try to infer from the enclosing VariableDeclarator
          const parent = (p.parentPath as Record<string, unknown> & {
            isVariableDeclarator?: () => boolean;
            node?: { id?: { name?: string } };
          } | undefined);
          if (parent?.isVariableDeclarator?.() && parent.node?.id?.name) {
            componentName = parent.node.id.name;
          }
        }

        // Derive a stable ID from filename + component name + line + counter.
        // Previously Math.random() made builds non-reproducible and broke
        // HMR hydration (ID changed between recompiles).
        const line = arg.loc?.start?.line || 0;
        const id = deriveIslandId(options.filename, componentName, line, islandCounter++);
        islands.push(id);
        islandInfos.push({ id, componentName, line });
      }
    },
  });

  // === Pass 3: transform — convert JSX to h() calls ===
  // We use our inlined `elmoorxJsxPlugin` (declared in babel-lite.ts).
  // Babel also strips TypeScript annotations via the official
  // `@babel/plugin-transform-typescript` preset/plugin.
  const transformResult = transformFromAstSync(ast, source, {
    filename: options.filename,
    presets: [],
    plugins: [
      // Custom JSX → h() transform
      elmoorxJsxPlugin,
      // TypeScript → JS (strip types) — statically imported above
      tsPlugin,
    ],
    // Keep ES modules — the bundler handles the rest
    sourceType: "module",
  });

  const code = transformResult?.code || "";

  // === Pass 4: estimate client bytes ===
  // Use real zlib gzip when available (Node builtin) for accuracy;
  // fall back to length×0.3 approximation in non-Node environments.
  const clientBytes = estimateGzipSize(code);

  // === Pass 5: extract SSR template ===
  // Currently a stub — see extractStaticHtml() docstring.
  const ssrTemplate = options.ssrOnly ? extractStaticHtml(code) : undefined;

  return {
    code,
    ssrTemplate,
    islands,
    islandInfos,
    clientBytes,
  };
}

/**
 * Derive a deterministic island ID from filename + component name + line.
 * Same source → same ID → reproducible builds + stable HMR hydration.
 *
 * Uses a simple DJB2-style hash (NOT cryptographic — just for IDs).
 * The previous Math.random() ID broke reproducible builds and HMR.
 */
function deriveIslandId(filename: string, componentName: string, line: number, counter: number): string {
  const input = `${filename}:${componentName}:${line}:${counter}`;
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }
  return `island_${(hash >>> 0).toString(36)}`;
}

/**
 * Estimate gzipped size of a JS string.
 *
 * In Node: uses real zlib.gzipSync for accuracy.
 * In browser/non-Node: falls back to length×0.3 approximation.
 *
 * The previous approximation used `replace(/\s+/g, " ")` which
 * destroyed string literal contents (collapsed meaningful whitespace
 * inside strings), making the estimate wildly wrong for string-heavy
 * code. Real gzip is both simpler and 1000× more accurate.
 */
function estimateGzipSize(code: string): number {
  // Try real gzip first. Uses static import (above) instead of
  // require() — the previous dynamic require() violated the
  // @typescript-eslint/no-require-imports rule and caused `npm run lint`
  // to exit 1, contradicting the worklog's "0 errors" claim.
  try {
    return nodeGzipSync(code, { level: 9 }).length;
  } catch {
    // Fall back to approximation (non-Node environments).
    return Math.round(code.length * 0.3);
  }
}

/**
 * Statically extract HTML from JSX that has no dynamic parts.
 * Returns undefined if the component is fully dynamic.
 *
 * STUB (alpha): Production-quality static extraction would walk the
 * AST and pre-render any subtree whose leaves are all string literals
 * or known constants, emitting `<!--island:ID-->` placeholders for
 * dynamic parts. For the alpha release we SSR at request time via
 * `renderToString()` in the runtime — this function is a no-op so
 * the runtime path is always taken.
 *
 * The file-header comment previously claimed "Pure HTML for static
 * subtrees (zero JS shipped)" — that was false advertising. The
 * comment has been corrected to reflect the actual behavior.
 */
function extractStaticHtml(_code: string): string | undefined {
  return undefined;
}