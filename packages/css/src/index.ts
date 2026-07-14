/**
 * Elmoorx CSS — Scoped styles + CSS Modules
 * ============================================
 * Two approaches, zero runtime cost:
 *
 *   1. Scoped <style> in components (auto-scoped by attribute)
 *
 *     <style scoped>
 *       .btn { background: purple; }
 *     </style>
 *     <button class="btn">Click</button>
 *
 *     → Compiles to:
 *     <style>.btn[data-elmoorx-abc123] { background: purple; }</style>
 *     <button class="btn" data-elmoorx-abc123>Click</button>
 *
 *   2. CSS Modules (className hashing)
 *
 *     import styles from './Button.module.css';
 *     <button class={styles.btn}>Click</button>
 *
 *     → styles.btn = "Button_btn_abc123"
 */

import { readFileSync, existsSync } from "node:fs";
import { basename, extname } from "node:path";
import { createHash } from "node:crypto";

export interface CompiledCss {
  // The transformed CSS — class names hashed, selectors scoped
  css: string;
  // Map of original className → hashed className
  mappings: Record<string, string>;
}

/**
 * Compile a CSS Module file.
 * Hashes class names so they're unique per file.
 *
 *   const { css, mappings } = compileCssModule('./Button.module.css');
 *   // mappings: { btn: 'Button_btn_a1b2c3', card: 'Button_card_d4e5f6' }
 */
export function compileCssModule(filePath: string): CompiledCss {
  if (!existsSync(filePath)) {
    return { css: "", mappings: {} };
  }

  const source = readFileSync(filePath, "utf-8");
  const baseName = basename(filePath, extname(filePath));
  const fileHash = createHash("md5")
    .update(source)
    .digest("hex")
    .slice(0, 6);

  const mappings: Record<string, string> = {};

  // Find all class names
  const classRegex = /\.([a-zA-Z_][a-zA-Z0-9_-]*)/g;
  const classNames = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = classRegex.exec(source)) !== null) {
    classNames.add(match[1]);
  }

  // Build mappings
  for (const cls of classNames) {
    mappings[cls] = `${baseName}_${cls}_${fileHash}`;
  }

  // Replace .className with .hashedName
  let css = source;
  for (const [original, hashed] of Object.entries(mappings)) {
    css = css.replace(
      new RegExp(`\\.${original}\\b`, "g"),
      `.${hashed}`
    );
  }

  return { css, mappings };
}

/**
 * Compile scoped CSS — auto-scoped by a unique data attribute.
 * Used internally by the compiler when it encounters <style scoped>.
 */
export function compileScopedCss(
  source: string,
  componentId: string
): string {
  // Add [data-elmoorx-<id>] to every selector
  // Simple approach: split on `{` and modify each selector
  return source.replace(
    /([^{}]+)\{/g,
    (_, selectors: string) => {
      const scoped = selectors
        .split(",")
        .map((s) => {
          const trimmed = s.trim();
          if (!trimmed) return trimmed;
          // Don't scope :global() selectors
          if (trimmed.startsWith(":global")) {
            return trimmed.replace(/^:global\(/, "").replace(/\)$/, "");
          }
          // Don't scope @keyframes, @media, etc.
          if (trimmed.startsWith("@")) return trimmed;
          // Add data attribute to the last selector
          return `${trimmed}[data-elmoorx-${componentId}]`;
        })
        .join(", ");
      return `  ${scoped} {`;
    }
  );
}

/**
 * Generate a unique component ID for scoped CSS.
 */
export function generateComponentId(filePath: string): string {
  return createHash("md5")
    .update(filePath)
    .digest("hex")
    .slice(0, 8);
}

/**
 * Bundle all CSS into a single file.
 */
export function bundleCss(cssFiles: string[]): string {
  return cssFiles.join("\n\n/* === next file === */\n\n");
}

/**
 * Minify CSS (very simplified — production would use lightningcss).
 */
export function minifyCss(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")  // comments
    .replace(/\s+/g, " ")               // whitespace
    .replace(/\s*([{}:;,])\s*/g, "$1")  // around punctuation
    .replace(/;}/g, "}")                // trailing semicolons
    .trim();
}

/**
 * Process a Elmoorx component file with <style scoped> blocks.
 * Extracts the CSS, scopes it, and replaces the block with nothing
 * (the CSS gets bundled into the global stylesheet).
 */
export function processComponentStyles(
  source: string,
  filePath: string
): { code: string; css: string } {
  const componentId = generateComponentId(filePath);
  let extractedCss = "";
  let code = source;

  // Extract <style scoped>...</style> blocks
  const styleRegex = /<style\s+scoped>([\s\S]*?)<\/style>/g;
  code = code.replace(styleRegex, (_, css: string) => {
    const scoped = compileScopedCss(css, componentId);
    extractedCss += scoped + "\n";
    return "";
  });

  // Also extract regular <style> blocks (not scoped)
  const plainStyleRegex = /<style>([\s\S]*?)<\/style>/g;
  code = code.replace(plainStyleRegex, (_, css: string) => {
    extractedCss += css + "\n";
    return "";
  });

  // Inject data-elmoorx-<id> attribute on the root element
  // (In a real impl, the compiler would do this automatically)
  code = code.replace(
    /return\s+h\s*\(\s*['"](\w+)['"]\s*,\s*\{/,
    (match, _tag) => `${match} 'data-elmoorx-${componentId}': '',`
  );

  return { code, css: extractedCss };
}
